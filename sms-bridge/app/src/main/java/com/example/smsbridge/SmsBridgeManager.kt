package com.example.smsbridge

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import android.telephony.SubscriptionManager
import android.telephony.SmsManager
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.UUID

private const val PRODUCTION_BILLING_URL = "https://jqmgobcptjnedublfprr.supabase.co/functions/v1/billing-api"

class SmsBridgeManager private constructor(private val context: Context) {
  companion object {
    @Volatile private var INSTANCE: SmsBridgeManager? = null

    fun getInstance(context: Context): SmsBridgeManager = INSTANCE ?: synchronized(this) {
      INSTANCE ?: SmsBridgeManager(context.applicationContext).also { INSTANCE = it }
    }
  }

  private val sharedPrefs = context.getSharedPreferences("SmsBridgePrefs", Context.MODE_PRIVATE)
  private val scope = CoroutineScope(Dispatchers.IO)
  private val pairingSecret = SupabasePairingSecret(context)
  private var supabaseJob: Job? = null
  private val supabaseTransport by lazy {
    SupabaseBridgeTransport(context, { serverUrl }, { supabasePairingKey }, {
      JSONObject().put("battery", getBatteryPercentage()).put("sim", getSimOperator())
    }, { online -> _connectionState.value = if (online) "Connected" else "Connecting" },
      { message -> addLog(message) }, { id, phone, message -> sendSMS(id, phone, message) })
  }

  private val _logs = MutableStateFlow<List<String>>(emptyList())
  val logs = _logs.asStateFlow()
  private val _connectionState = MutableStateFlow("Disconnected")
  val connectionState = _connectionState.asStateFlow()
  private val _registrationState = MutableStateFlow("Unregistered")
  val registrationState = _registrationState.asStateFlow()

  var serverUrl: String
    get() {
      val saved = sharedPrefs.getString("server_url", null)
      // Upgrade old installs from their saved Render/local API URL without clearing pairing data.
      if (saved.isNullOrBlank() || !saved.contains(".supabase.co/functions/v1/billing-api")) {
        sharedPrefs.edit().putString("server_url", PRODUCTION_BILLING_URL).apply()
        return PRODUCTION_BILLING_URL
      }
      return saved
    }
    set(value) {
      sharedPrefs.edit().putString("server_url", value.trim()).apply()
      addLog("Supabase billing URL updated.")
    }

  var supabasePairingKey: String
    get() = pairingSecret.read()
    set(value) { pairingSecret.write(value.trim()) }

  var deviceUuid: String
    get() = sharedPrefs.getString("device_uuid", "") ?: ""
    private set(value) = sharedPrefs.edit().putString("device_uuid", value).apply()

  var deviceName: String
    get() = sharedPrefs.getString("device_name", Build.MODEL) ?: Build.MODEL
    set(value) = sharedPrefs.edit().putString("device_name", value).apply()

  init {
    if (deviceUuid.isEmpty()) deviceUuid = UUID.randomUUID().toString()
    if (sharedPrefs.getBoolean("is_registered", false)) _registrationState.value = "Registered"
  }

  fun generateNewUuid() {
    disconnect()
    deviceUuid = UUID.randomUUID().toString()
    sharedPrefs.edit().putBoolean("is_registered", false).apply()
    _registrationState.value = "Unregistered"
    addLog("Generated new Device UUID: $deviceUuid")
  }

  fun addLog(msg: String) {
    val timestamp = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())
    Log.d("SmsBridge", msg)
    _logs.value = (listOf("[$timestamp] $msg") + _logs.value).take(200)
  }

  fun registerDevice(onResult: (Boolean) -> Unit = {}) {
    scope.launch {
      try {
        supabaseTransport.heartbeat()
        _registrationState.value = "Registered"
        sharedPrefs.edit().putBoolean("is_registered", true).apply()
        addLog("Connected to the paired Supabase device.")
        onResult(true)
      } catch (_: Exception) {
        addLog("Pair this device on the website, then paste its private key.")
        onResult(false)
      }
    }
  }

  fun connect() {
    if (supabaseJob?.isActive == true) return
    supabaseJob = scope.launch { supabaseTransport.run() }
  }

  fun disconnect() {
    supabaseJob?.cancel()
    supabaseJob = null
    _connectionState.value = "Disconnected"
    addLog("Disconnected manually.")
  }

  private fun sendSMS(smsId: String, phone: String, messageText: String) {
    scope.launch {
      addLog("Submitting SMS (ID: $smsId)...")
      try {
        val smsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          context.getSystemService(SmsManager::class.java)
        } else {
          @Suppress("DEPRECATION")
          SmsManager.getDefault()
        }
        val parts = smsManager.divideMessage(messageText)
        if (parts.size > 1) smsManager.sendMultipartTextMessage(phone, null, parts, null, null)
        else smsManager.sendTextMessage(phone, null, messageText, null, null)
        addLog("SMS submitted to the phone (ID: $smsId).")
        reportSmsResult(smsId, "Sent")
      } catch (e: Exception) {
        addLog("Error sending SMS: ${e.message}")
        reportSmsResult(smsId, "Failed", e.message ?: "Unknown error")
      }
    }
  }

  private fun reportSmsResult(smsId: String, status: String, error: String = "") {
    try { supabaseTransport.report(smsId, status, error) }
    catch (_: Exception) { addLog("SMS acknowledgement could not be retained. Check the queue before retrying.") }
  }

  private fun getBatteryPercentage(): Int {
    val batteryStatus = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
    val level = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
    val scale = batteryStatus?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
    return if (level >= 0 && scale > 0) ((level.toFloat() / scale.toFloat()) * 100).toInt() else 100
  }

  private fun getSimOperator(): String = try {
    val manager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager
    val active = manager.activeSubscriptionInfoList
    if (!active.isNullOrEmpty()) active.joinToString(", ") { it.carrierName.toString() } else "Mobile SIM"
  } catch (_: Exception) { "Mobile SIM" }
}

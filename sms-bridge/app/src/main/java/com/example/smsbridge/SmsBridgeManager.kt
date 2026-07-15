package com.example.smsbridge

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import android.util.Log
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import org.json.JSONObject
import java.io.IOException
import java.util.UUID
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class SmsBridgeManager private constructor(private val context: Context) {
  companion object {
    @Volatile
    private var INSTANCE: SmsBridgeManager? = null

    fun getInstance(context: Context): SmsBridgeManager {
      return INSTANCE ?: synchronized(this) {
        val instance = SmsBridgeManager(context.applicationContext)
        INSTANCE = instance
        instance
      }
    }
  }

  private var isManuallyDisconnected = false
  private val sharedPrefs = context.getSharedPreferences("SmsBridgePrefs", Context.MODE_PRIVATE)
  private val client = OkHttpClient.Builder()
    .readTimeout(0, TimeUnit.MILLISECONDS)
    .pingInterval(60, TimeUnit.SECONDS)
    .build()
  private var webSocket: WebSocket? = null
  private val scope = CoroutineScope(Dispatchers.IO)

  private val _logs = MutableStateFlow<List<String>>(emptyList())
  val logs = _logs.asStateFlow()

  private val _connectionState = MutableStateFlow("Disconnected")
  val connectionState = _connectionState.asStateFlow()

  private val _registrationState = MutableStateFlow("Unregistered")
  val registrationState = _registrationState.asStateFlow()

  var serverUrl: String
    get() = sharedPrefs.getString("server_url", "http://10.0.2.2:8000") ?: "http://10.0.2.2:8000"
    set(value) {
      sharedPrefs.edit().putString("server_url", value).apply()
      addLog("Server URL updated to $value")
    }

  var deviceUuid: String
    get() = sharedPrefs.getString("device_uuid", "") ?: ""
    private set(value) = sharedPrefs.edit().putString("device_uuid", value).apply()

  var deviceName: String
    get() = sharedPrefs.getString("device_name", Build.MODEL) ?: Build.MODEL
    set(value) = sharedPrefs.edit().putString("device_name", value).apply()

  init {
    if (deviceUuid.isEmpty()) {
      deviceUuid = UUID.randomUUID().toString()
    }
    checkRegistrationStatus()
  }

  fun generateNewUuid() {
    disconnect()
    deviceUuid = UUID.randomUUID().toString()
    _registrationState.value = "Unregistered"
    addLog("Generated new Device UUID: $deviceUuid")
  }

  fun addLog(msg: String) {
    val timestamp = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())
    val formattedMsg = "[$timestamp] $msg"
    Log.d("SmsBridge", msg)
    val current = _logs.value.toMutableList()
    current.add(0, formattedMsg)
    if (current.size > 200) current.removeAt(current.size - 1)
    _logs.value = current
  }

  fun registerDevice(onResult: (Boolean) -> Unit = {}) {
    scope.launch {
      addLog("Attempting registration to server...")
      val battery = getBatteryPercentage()
      val simOperator = getSimOperator()

      val json = JSONObject().apply {
        put("id", deviceUuid)
        put("name", deviceName)
        put("model", Build.MODEL)
        put("battery", battery)
        put("sim", simOperator)
      }

      val requestBody = RequestBody.create(
        "application/json; charset=utf-8".toMediaType(),
        json.toString()
      )

      val registerUrl = if (serverUrl.endsWith("/")) "${serverUrl}api/v1/devices/register" else "$serverUrl/api/v1/devices/register"
      val request = Request.Builder()
        .url(registerUrl)
        .post(requestBody)
        .build()

      client.newCall(request).enqueue(object : Callback {
        override fun onFailure(call: Call, e: IOException) {
          addLog("Registration failed: ${e.message}")
          _registrationState.value = "Unregistered"
          onResult(false)
        }

        override fun onResponse(call: Call, response: Response) {
          if (response.isSuccessful) {
            addLog("Successfully registered device on server!")
            _registrationState.value = "Registered"
            onResult(true)
          } else {
            addLog("Server rejected registration: Code ${response.code}")
            _registrationState.value = "Unregistered"
            onResult(false)
          }
          response.close()
        }
      })
    }
  }

  fun connect() {
    if (_connectionState.value == "Connected") {
      addLog("Already connected.")
      return
    }

    isManuallyDisconnected = false
    _connectionState.value = "Connecting"
    addLog("Connecting to WebSocket...")

    // Convert http/https server url to ws/wss
    var wsUrl = serverUrl.replace("http://", "ws://").replace("https://", "wss://")
    if (wsUrl.endsWith("/")) {
      wsUrl = "${wsUrl}ws/v1/sms-bridge?device_uuid=$deviceUuid"
    } else {
      wsUrl = "$wsUrl/ws/v1/sms-bridge?device_uuid=$deviceUuid"
    }

    val request = Request.Builder()
      .url(wsUrl)
      .build()

    webSocket = client.newWebSocket(request, object : WebSocketListener() {
      override fun onOpen(webSocket: WebSocket, response: Response) {
        _connectionState.value = "Connected"
        addLog("WebSocket Connection opened!")
        sendDeviceStatus()
      }

      override fun onMessage(webSocket: WebSocket, text: String) {
        addLog("Received raw message: $text")
        try {
          val json = JSONObject(text)
          if (json.optString("type") == "sms_job") {
            val job = json.getJSONObject("data")
            val smsId = job.getString("smsId")
            val phone = job.getString("phone")
            val message = job.getString("message")
            sendSMS(smsId, phone, message)
          }
        } catch (e: Exception) {
          addLog("Failed to parse message: ${e.message}")
        }
      }

      override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
        webSocket.close(1000, null)
        _connectionState.value = "Disconnected"
        addLog("WebSocket closing: $reason (Code $code)")
      }

      override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
        _connectionState.value = "Disconnected"
        addLog("WebSocket closed. Attempting reconnect...")
        attemptReconnect()
      }

      override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
        _connectionState.value = "Disconnected"
        addLog("WebSocket Error: ${t.message}. Attempting reconnect...")
        attemptReconnect()
      }
    })
  }

  fun disconnect() {
    isManuallyDisconnected = true
    webSocket?.close(1000, "User manual disconnect")
    webSocket = null
    _connectionState.value = "Disconnected"
    addLog("Disconnected manually.")
  }

  private fun attemptReconnect() {
    if (isManuallyDisconnected) return
    scope.launch {
      addLog("Reconnecting in 5 seconds...")
      kotlinx.coroutines.delay(5000)
      if (!isManuallyDisconnected) {
        connect()
      }
    }
  }

  private fun sendDeviceStatus() {
    val ws = webSocket ?: return
    try {
      val battery = getBatteryPercentage()
      val sim = getSimOperator()

      val payload = JSONObject().apply {
        put("type", "device_status")
        put("data", JSONObject().apply {
          put("battery", battery)
          put("sim", sim)
        })
      }
      ws.send(payload.toString())
      addLog("Reported status: Battery=$battery%, SIM=$sim")
    } catch (e: Exception) {
      addLog("Failed to report status: ${e.message}")
    }
  }

  private fun sendSMS(smsId: String, phone: String, messageText: String) {
    scope.launch {
      addLog("Sending SMS to $phone (ID: $smsId)...")
      try {
        val smsManager: SmsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          context.getSystemService(SmsManager::class.java)
        } else {
          @Suppress("DEPRECATION")
          SmsManager.getDefault()
        }

        val parts = smsManager.divideMessage(messageText)
        if (parts.size > 1) {
          smsManager.sendMultipartTextMessage(phone, null, parts, null, null)
        } else {
          smsManager.sendTextMessage(phone, null, messageText, null, null)
        }

        addLog("SMS successfully sent to $phone!")
        reportSmsResult(smsId, "Sent")
      } catch (e: Exception) {
        addLog("Error sending SMS: ${e.message}")
        reportSmsResult(smsId, "Failed", e.message ?: "Unknown error")
      }
    }
  }

  private fun reportSmsResult(smsId: String, status: String, error: String = "") {
    val ws = webSocket ?: return
    try {
      val payload = JSONObject().apply {
        put("type", "sms_result")
        put("data", JSONObject().apply {
          put("smsId", smsId)
          put("status", status)
          if (error.isNotEmpty()) {
            put("error", error)
          }
        })
      }
      ws.send(payload.toString())
      addLog("Reported result: SMS=$smsId, Status=$status")
    } catch (e: Exception) {
      addLog("Failed to report SMS result: ${e.message}")
    }
  }

  private fun checkRegistrationStatus() {
    // If we have a stored register status, start with it
    val isRegistered = sharedPrefs.getBoolean("is_registered", false)
    if (isRegistered) {
      _registrationState.value = "Registered"
    }
  }

  private fun getBatteryPercentage(): Int {
    val batteryStatus: Intent? = context.registerReceiver(
      null,
      IntentFilter(Intent.ACTION_BATTERY_CHANGED)
    )
    val level: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
    val scale: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
    return if (level >= 0 && scale > 0) ((level.toFloat() / scale.toFloat()) * 100).toInt() else 100
  }

  private fun getSimOperator(): String {
    try {
      val subscriptionManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        val activeList = subscriptionManager.activeSubscriptionInfoList
        if (!activeList.isNullOrEmpty()) {
          val carriers = activeList.map { it.carrierName.toString() }
          return carriers.joinToString(", ")
        }
      }
    } catch (e: SecurityException) {
      // Permission not granted
    } catch (e: Exception) {
      // General error
    }
    return "Mobile SIM"
  }
}

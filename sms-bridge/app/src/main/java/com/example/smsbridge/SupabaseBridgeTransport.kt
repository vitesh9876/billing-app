package com.example.smsbridge

import android.content.Context
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.ensureActive
import kotlin.coroutines.coroutineContext
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.MediaType.Companion.toMediaType
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/** Claims each SMS once; uncertain phone submissions stay in-flight for manual review. */
class SupabaseBridgeTransport(
  context: Context,
  private val url: () -> String,
  private val secret: () -> String,
  private val status: () -> JSONObject,
  private val connected: (Boolean) -> Unit,
  private val log: (String) -> Unit,
  private val send: (String, String, String) -> Unit,
) {
  private val prefs = context.getSharedPreferences("SupabaseSmsResults", Context.MODE_PRIVATE)
  private val client = OkHttpClient.Builder().connectTimeout(15, TimeUnit.SECONDS)
    .readTimeout(15, TimeUnit.SECONDS).writeTimeout(15, TimeUnit.SECONDS).build()
  @Volatile private var waitingForSubmission = false

  private fun request(action: String, payload: JSONObject): JSONObject {
    val token = secret()
    require(token.matches(Regex("[a-f0-9]{64}"))) { "Pair the phone before connecting." }
    val base = url().trimEnd('/')
    val uri = java.net.URI(base)
    require(uri.scheme == "https" && uri.host.endsWith(".supabase.co") &&
      uri.path == "/functions/v1/billing-api" && uri.rawQuery == null) { "Use the Supabase billing function URL." }
    val req = Request.Builder().url("$base/bridge/$action")
      .header("Authorization", "Bearer $token").header("x-region", "ap-south-1")
      .post(payload.toString().toRequestBody("application/json; charset=utf-8".toMediaType())).build()
    client.newCall(req).execute().use { response ->
      val data = JSONObject(response.body?.string() ?: "{}")
      if (!response.isSuccessful) throw IllegalStateException("Bridge request failed (${response.code}).")
      return data
    }
  }

  fun heartbeat() { request("heartbeat", status()) }

  @Synchronized fun report(id: String, status: String, error: String) {
    // SmsManager accepting a request does not prove carrier delivery.
    val result = JSONObject().put("smsId", id).put("status", if (status == "Sent") "Submitted" else "Failed")
      .put("error", if (status == "Sent") "" else "Phone could not submit the SMS.")
    check(prefs.edit().putString("pending_result", result.toString()).commit()) { "Could not retain SMS acknowledgement." }
  }

  suspend fun run() {
    while (coroutineContext.isActive) {
      var waitMillis = 15000L
      try {
        val pending = prefs.getString("pending_result", null)
        if (pending != null) {
          request("result", JSONObject(pending))
          prefs.edit().remove("pending_result").commit()
          waitingForSubmission = false
        }
        if (!waitingForSubmission) {
          val job = request("claim", status()).optJSONObject("job")
          coroutineContext.ensureActive()
          connected(true)
          if (job != null) {
            waitMillis = 1000L
            waitingForSubmission = true
            send(job.getString("smsId"), job.getString("phone"), job.getString("message"))
          }
        } else { waitMillis = 1000L }
      } catch (_: Exception) {
        connected(false)
        log("Connection interrupted. Retaining SMS state before retrying.")
      }
      delay(waitMillis)
    }
  }
}

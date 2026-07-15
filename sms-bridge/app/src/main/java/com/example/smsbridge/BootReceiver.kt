package com.example.smsbridge

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            val sharedPrefs = context.getSharedPreferences("SmsBridgePrefs", Context.MODE_PRIVATE)
            val serverUrl = sharedPrefs.getString("server_url", "")
            val deviceUuid = sharedPrefs.getString("device_uuid", "")
            
            // Auto start the foreground service if the device is already registered
            if (!serverUrl.isNullOrEmpty() && !deviceUuid.isNullOrEmpty()) {
                val serviceIntent = Intent(context, SmsBridgeService::class.java)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }
            }
        }
    }
}

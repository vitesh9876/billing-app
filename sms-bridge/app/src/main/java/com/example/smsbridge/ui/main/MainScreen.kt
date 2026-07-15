package com.example.smsbridge.ui.main

import android.Manifest
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.smsbridge.SmsBridgeManager

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
  modifier: Modifier = Modifier
) {
  val context = LocalContext.current
  val bridgeManager = remember { SmsBridgeManager(context.applicationContext) }

  val connectionState by bridgeManager.connectionState.collectAsState()
  val registrationState by bridgeManager.registrationState.collectAsState()
  val logs by bridgeManager.logs.collectAsState()

  var serverUrlInput by remember { mutableStateOf(bridgeManager.serverUrl) }
  var deviceNameInput by remember { mutableStateOf(bridgeManager.deviceName) }

  // Permission launcher
  var hasSmsPermission by remember { mutableStateOf(false) }
  val launcher = rememberLauncherForActivityResult(
    contract = ActivityResultContracts.RequestPermission(),
    onResult = { granted ->
      hasSmsPermission = granted
      if (granted) {
        bridgeManager.addLog("SMS permission granted.")
      } else {
        bridgeManager.addLog("SMS permission denied. Cannot send SMS.")
      }
    }
  )

  // Request permission on start
  LaunchedEffect(Unit) {
    launcher.launch(Manifest.permission.SEND_SMS)
  }

  Scaffold(
    topBar = {
      TopAppBar(
        title = {
          Text(
            "SmartShop SMS Bridge",
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onPrimaryContainer
          )
        },
        colors = TopAppBarDefaults.topAppBarColors(
          containerColor = MaterialTheme.colorScheme.primaryContainer
        )
      )
    }
  ) { paddingValues ->
    Column(
      modifier = modifier
        .fillMaxSize()
        .padding(paddingValues)
        .padding(16.dp),
      verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
      // Permission Banner
      if (!hasSmsPermission) {
        Card(
          colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
          modifier = Modifier.fillMaxWidth()
        ) {
          Column(modifier = Modifier.padding(16.dp)) {
            Text(
              "SMS Permission Required",
              fontWeight = FontWeight.Bold,
              color = MaterialTheme.colorScheme.onErrorContainer
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
              "This app requires SEND_SMS permission to forward incoming messages from the server to customers.",
              fontSize = 12.sp,
              color = MaterialTheme.colorScheme.onErrorContainer
            )
            Spacer(modifier = Modifier.height(8.dp))
            Button(
              onClick = { launcher.launch(Manifest.permission.SEND_SMS) },
              colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
            ) {
              Text("Grant Permission")
            }
          }
        }
      }

      // Status Overview Card
      Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
      ) {
        Column(
          modifier = Modifier.padding(16.dp),
          verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
          ) {
            Text("Connection Status:", fontWeight = FontWeight.Bold, fontSize = 14.sp)
            StatusBadge(
              status = connectionState,
              activeColor = Color(0xFF2E7D32),
              inactiveColor = Color(0xFFC62828),
              connectingColor = Color(0xFFEF6C00)
            )
          }

          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
          ) {
            Text("Registration status:", fontWeight = FontWeight.Bold, fontSize = 14.sp)
            StatusBadge(
              status = registrationState,
              activeColor = Color(0xFF2E7D32),
              inactiveColor = Color(0xFFC62828),
              connectingColor = Color(0xFF757575)
            )
          }
        }
      }

      // Server Config Card
      Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
      ) {
        Column(
          modifier = Modifier.padding(16.dp),
          verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
          Text("Server Settings", fontWeight = FontWeight.Bold, fontSize = 16.sp)

          OutlinedTextField(
            value = serverUrlInput,
            onValueChange = {
              serverUrlInput = it
              bridgeManager.serverUrl = it
            },
            label = { Text("Server URL") },
            placeholder = { Text("http://192.168.1.10:8000") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
          )

          OutlinedTextField(
            value = deviceNameInput,
            onValueChange = {
              deviceNameInput = it
              bridgeManager.deviceName = it
            },
            label = { Text("Device Name") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
          )

          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
          ) {
            Button(
              onClick = {
                bridgeManager.registerDevice { success ->
                  scopeLaunchToast(context, if (success) "Registration Successful!" else "Registration Failed")
                }
              },
              modifier = Modifier.weight(1f)
            ) {
              Text("Register Device")
            }

            if (connectionState == "Connected") {
              Button(
                onClick = { bridgeManager.disconnect() },
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                modifier = Modifier.weight(1f)
              ) {
                Text("Disconnect")
              }
            } else {
              Button(
                onClick = { bridgeManager.connect() },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                modifier = Modifier.weight(1f)
              ) {
                Text("Connect")
              }
            }
          }
        }
      }

      // Device Details Card
      Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
      ) {
        Column(
          modifier = Modifier.padding(16.dp),
          verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
          Text("Device Details", fontWeight = FontWeight.Bold, fontSize = 16.sp)

          Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
          ) {
            Column(modifier = Modifier.weight(1f)) {
              Text("Device UUID", fontSize = 11.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
              Text(
                bridgeManager.deviceUuid,
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold
              )
            }
            IconButton(
              onClick = {
                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                val clip = ClipData.newPlainText("Device UUID", bridgeManager.deviceUuid)
                clipboard.setPrimaryClip(clip)
                Toast.makeText(context, "UUID copied to clipboard!", Toast.LENGTH_SHORT).show()
              }
            ) {
              Text("📋", fontSize = 16.sp)
            }
            IconButton(
              onClick = {
                bridgeManager.generateNewUuid()
                Toast.makeText(context, "New UUID generated!", Toast.LENGTH_SHORT).show()
              }
            ) {
              Text("🔄", fontSize = 16.sp)
            }
          }
        }
      }

      // Instructions Guide Card
      Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
      ) {
        Column(
          modifier = Modifier.padding(12.dp),
          verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
          Text("How to Connect to Laptop", fontWeight = FontWeight.Bold, fontSize = 13.sp)
          Text("1. Find your laptop's Local IP address (run 'ipconfig' on Windows).", fontSize = 11.sp)
          Text("2. Enter Server URL above (e.g. http://192.168.1.15:8000).", fontSize = 11.sp)
          Text("3. Enter Device Name and click 'Register Device'.", fontSize = 11.sp)
          Text("4. Once registered, click the green 'Connect' button.", fontSize = 11.sp)
        }
      }

      // Logs panel
      Text("Activity Logs", fontWeight = FontWeight.Bold, fontSize = 14.sp)

      Box(
        modifier = Modifier
          .fillMaxWidth()
          .weight(1f)
          .clip(RoundedCornerShape(8.dp))
          .background(Color(0xFF1E1E1E))
          .border(1.dp, Color.Gray.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
          .padding(8.dp)
      ) {
        LazyColumn(
          modifier = Modifier.fillMaxSize(),
          reverseLayout = false
        ) {
          items(logs) { log ->
            Text(
              text = log,
              color = if (log.contains("Error") || log.contains("failed", true) || log.contains("rejected", true)) Color(0xFFE57373)
              else if (log.contains("Successful") || log.contains("successfully", true) || log.contains("opened", true)) Color(0xFF81C784)
              else Color(0xFFECEFF1),
              fontSize = 11.sp,
              fontFamily = FontFamily.Monospace,
              modifier = Modifier.padding(vertical = 2.dp)
            )
          }
        }
      }
    }
  }
}

@Composable
fun StatusBadge(
  status: String,
  activeColor: Color,
  inactiveColor: Color,
  connectingColor: Color
) {
  val color = when (status) {
    "Connected", "Registered" -> activeColor
    "Connecting" -> connectingColor
    else -> inactiveColor
  }

  Box(
    modifier = Modifier
      .clip(RoundedCornerShape(4.dp))
      .background(color.copy(alpha = 0.15f))
      .border(1.dp, color, RoundedCornerShape(4.dp))
      .padding(horizontal = 8.dp, vertical = 2.dp)
  ) {
    Text(
      text = status.uppercase(),
      color = color,
      fontSize = 10.sp,
      fontWeight = FontWeight.Bold
    )
  }
}

private fun scopeLaunchToast(context: Context, msg: String) {
  val mainHandler = android.os.Handler(context.mainLooper)
  mainHandler.post {
    Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
  }
}

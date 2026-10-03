package com.example.smsbridge

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** The device pairing key is encrypted using Android Keystore, never logged. */
class SupabasePairingSecret(context: Context) {
  private val prefs = context.getSharedPreferences("SupabasePairing", Context.MODE_PRIVATE)
  private val alias = "billing-supabase-pairing"

  private fun key(): SecretKey {
    val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    (store.getKey(alias, null) as? SecretKey)?.let { return it }
    return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
      init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
    }.generateKey()
  }

  @Synchronized fun read(): String = try {
    val saved = prefs.getString("secret", null)
    if (saved == null) "" else {
      val parts = saved.split(":")
      val cipher = Cipher.getInstance("AES/GCM/NoPadding")
      cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)))
      String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), Charsets.UTF_8)
    }
  } catch (_: Exception) { "" } // Restored preferences without Keystore require re-pairing.

  @Synchronized fun write(value: String) {
    if (value.isBlank()) { prefs.edit().remove("secret").apply(); return }
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.ENCRYPT_MODE, key())
    val encrypted = cipher.doFinal(value.toByteArray(Charsets.UTF_8))
    prefs.edit().putString("secret", Base64.encodeToString(cipher.iv, Base64.NO_WRAP) + ":" +
      Base64.encodeToString(encrypted, Base64.NO_WRAP)).apply()
  }
}

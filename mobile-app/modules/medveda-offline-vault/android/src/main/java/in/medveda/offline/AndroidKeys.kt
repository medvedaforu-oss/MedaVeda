package `in`.medveda.offline

import android.app.KeyguardManager
import android.content.Context
import android.os.Build
import android.os.UserManager
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey

/** Namespace contains only Phase 1B keys. No enumeration/deletion/replacement API. */
class AndroidKeys(private val context:Context):WrappingKeys {
  private fun store()=KeyStore.getInstance("AndroidKeyStore").apply {load(null)}
  private fun admitted() {
    requireVault(Build.VERSION.SDK_INT>=28)
    requireVault(context.getSystemService(UserManager::class.java).isUserUnlocked)
    requireVault(!context.getSystemService(KeyguardManager::class.java).isDeviceLocked)
  }
  private fun alias(id:String):String {
    requireVault(id=="registry" || Regex("[0-9a-f]{32}").matches(id))
    return "medveda.phase1b.$id"
  }
  @Synchronized override fun create(alias:String)=safely {
    admitted();val name=alias(alias);requireVault(!store().containsAlias(name))
    val builder=KeyGenParameterSpec.Builder(name,KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
      .setKeySize(256).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
      .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setRandomizedEncryptionRequired(true)
    if(Build.VERSION.SDK_INT>=28)builder.setUnlockedDeviceRequired(true)
    KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore").apply {init(builder.build())}.generateKey()
    // Prove readback and AEAD functionality before a reference may be published.
    val challenge=ByteArray(32).also(java.security.SecureRandom()::nextBytes)
    try {
      val key=lookup(alias);val aad="MVKEYCHECK001".toByteArray(Charsets.US_ASCII)
      val recovered=Envelope.open(key,Envelope.seal(key,challenge,aad),aad)
      try {requireVault(java.security.MessageDigest.isEqual(challenge,recovered))} finally {recovered.fill(0)}
    } finally {challenge.fill(0)}
  }
  @Synchronized override fun lookup(alias:String):SecretKey=safely {
    admitted();val key=store().getKey(alias(alias),null)
    requireVault(key is SecretKey && key.algorithm=="AES" && key.encoded==null)
    key as SecretKey
  }
}

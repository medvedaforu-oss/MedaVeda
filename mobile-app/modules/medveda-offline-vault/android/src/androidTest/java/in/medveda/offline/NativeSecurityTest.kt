package `in`.medveda.offline

import android.os.Build
import android.test.AndroidTestCase
import java.nio.file.Files
import java.util.UUID

/** Isolated instrumentation only. Never run against an installed user's vault.
 * Generates unique test Keystore aliases and synthetic no-backup journal dirs;
 * deliberately retains them rather than providing a destructive cleanup API.
 */
@Suppress("DEPRECATION")
class NativeSecurityTest:AndroidTestCase() {
  private fun denied(block:()->Unit) {
    try {block()} catch(e:VaultFailure) {assertNull(e.cause);return};fail("Expected safe denial")
  }
  fun testKeystoreReadbackMissingAndNoReplacement() {
    val keys=AndroidKeys(context)
    val alias=UUID.randomUUID().toString().replace("-","")
    if(Build.VERSION.SDK_INT<28) {denied {keys.create(alias)};return}
    denied {keys.lookup(alias)};keys.create(alias)
    assertNull(keys.lookup(alias).encoded);denied {keys.create(alias)}
    val aad="native-test".toByteArray();val plain="synthetic-canary".toByteArray()
    val sealed=Envelope.seal(keys.lookup(alias),plain,aad)
    assertTrue(Envelope.open(keys.lookup(alias),sealed,aad).contentEquals(plain))
    sealed[sealed.lastIndex]=(sealed.last().toInt() xor 1).toByte()
    denied {safely {Envelope.open(keys.lookup(alias),sealed,aad)}}
  }
  fun testNativeJournalOwnerIsolationReopenAndRetirement() {
    if(Build.VERSION.SDK_INT<28)return
    val keys=AndroidKeys(context);val alias=UUID.randomUUID().toString().replace("-","")
    keys.create(alias)
    val dir=context.noBackupFilesDir.toPath().toRealPath().resolve("vault-test-${UUID.randomUUID()}")
    val store=DurableGenerations.create(dir)
    val registry=EncryptedRegistry.initialize(store,keys.lookup(alias));val owners=OwnerKeys(registry,keys)
    owners.provision("synthetic-A",1);owners.provision("synthetic-B",1)
    val a=owners.key("synthetic-A",1).encoded
    assertFalse(a.contentEquals(owners.key("synthetic-B",1).encoded))
    val reopened=OwnerKeys(EncryptedRegistry.open(DurableGenerations.open(dir),keys.lookup(alias)),keys)
    assertTrue(a.contentEquals(reopened.key("synthetic-A",1).encoded))
    owners.retire("synthetic-A",1)
    denied {OwnerKeys(EncryptedRegistry.open(DurableGenerations.open(dir),keys.lookup(alias)),keys).key("synthetic-A",1)}
    val interrupted=object:WrappingKeys {
      override fun create(alias:String) {keys.create(alias);throw java.io.IOException("synthetic interruption")}
      override fun lookup(alias:String)=keys.lookup(alias)
    }
    denied {OwnerKeys(registry,interrupted).provision("synthetic-C",1)}
    val pending=EncryptedRegistry.open(DurableGenerations.open(dir),keys.lookup(alias))
    assertEquals(KeyState.PENDING,pending.entries().single {it.owner=="synthetic-C"}.state)
    denied {OwnerKeys(pending,keys).key("synthetic-C",1)}
    denied {OwnerKeys(pending,keys).provision("synthetic-C",1)}
    Files.newDirectoryStream(dir).use { files->for(file in files) {
      val bytes=Files.readAllBytes(file)
      assertFalse(String(bytes,Charsets.ISO_8859_1).contains("synthetic-A"))
    }}
  }
}

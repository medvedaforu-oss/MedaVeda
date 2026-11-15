package `in`.medveda.offline

import android.os.Build
import android.test.AndroidTestCase
import java.io.ByteArrayOutputStream
import java.nio.file.Files
import java.security.MessageDigest
import java.util.UUID

/** Synthetic instrumentation harness only. Not executed/accepted by host tests.
 * Creates a fresh namespace and random test aliases, never the application's vault.
 */
@Suppress("DEPRECATION")
class ContentSecurityTest:AndroidTestCase() {
 private fun denied(block:()->Unit) {
  try {block()}catch(e:VaultFailure){assertNull(e.cause);return};fail("Expected safe denial")
 }
 private fun pdf():ByteArray {
  val out=ByteArrayOutputStream();val offsets=mutableListOf<Int>()
  fun write(text:String){out.write(text.toByteArray(Charsets.US_ASCII))}
  write("%PDF-1.4\n")
  for(body in listOf("<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
   "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>")) {
   offsets.add(out.size());write("${offsets.size} 0 obj\n$body\nendobj\n")
  }
  val xref=out.size();write("xref\n0 4\n0000000000 65535 f \n")
  for(offset in offsets)write("%010d 00000 n \n".format(java.util.Locale.ROOT,offset))
  write("trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n$xref\n%%EOF\n");return out.toByteArray()
 }
 fun testKeystoreContentLegacyRendererReopenAndRevocation() {
  if(Build.VERSION.SDK_INT<28)return // vault policy unsupported, never software fallback
  val root=context.noBackupFilesDir.toPath().toRealPath().resolve("content-test-${UUID.randomUUID()}")
  Files.createDirectory(root)
  val keys=AndroidKeys(context);val registryAlias=UUID.randomUUID().toString().replace("-","")
  keys.create(registryAlias)
  val registry=EncryptedRegistry.initialize(DurableGenerations.create(root.resolve("keys")),keys.lookup(registryAlias))
  val owners=OwnerKeys(registry,keys);owners.provision("test-A",1)
  val session=OwnerSession();val leases=NativeLeases(session);val ticket=leases.claim("test-A")
  val vault=AtomicVault.create(root.resolve("content"),owners,session)
  val journal=ContentJournal.create(DurableGenerations.create(root.resolve("catalog")),keys.lookup(registryAlias))
  val coordinator=ContentCoordinator(vault,journal,session,leases)
  val bytes=pdf();val hash=MessageDigest.getInstance("SHA-256").digest(bytes).joinToString(""){"%02x".format(it)}
  val metadata=PdfMetadata("test-A","test-note",1,bytes.size.toLong(),1,"sha256:$hash")
  val permit=AcquisitionPermit(metadata,hash,System.currentTimeMillis()+60_000)
  val original=root.resolve("legacy.pdf");Files.write(original,bytes)
  val entry=coordinator.importLegacy(original,permit,ticket)
  assertTrue(Files.readAllBytes(original).contentEquals(bytes))
  val workspace=ViewWorkspace.create(root.resolve("views"));var renderer:AndroidPdfResource?=null
  val resource=coordinator.openView(entry,permit,ticket,workspace) {path->AndroidPdfResource.open(path,ticket,session).also {renderer=it}}
  assertEquals(1,renderer!!.pageCount());renderer!!.render(0,100,100).recycle()
  leases.invalidate();assertEquals(0,workspace.pending());denied {renderer!!.pageCount()}
  val next=leases.claim("test-A");coordinator.revoke(entry,next)
  val reopened=ContentCoordinator(AtomicVault.open(root.resolve("content"),owners,session),
   ContentJournal.open(DurableGenerations.open(root.resolve("catalog")),keys.lookup(registryAlias)),session)
  val fresh=leases.claim("test-A")
  denied {reopened.openView(entry,permit,fresh,workspace){error("Must not attach renderer")}}
  assertTrue(Files.readAllBytes(original).contentEquals(bytes));assertTrue(Files.exists(root.resolve("content/${entry.fileId}.mvp")))
 }
}

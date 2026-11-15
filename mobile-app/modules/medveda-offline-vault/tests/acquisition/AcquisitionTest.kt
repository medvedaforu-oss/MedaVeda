package `in`.medveda.offline
import java.io.*
import java.nio.file.*
import java.security.MessageDigest
import javax.crypto.spec.SecretKeySpec
private fun rejected(block:()->Unit) { try {block()} catch(e:VaultFailure) {return};error("Expected vault denial") }
fun main() {
 val root=Files.createTempDirectory("audit008-");val session=OwnerSession()
 val key=SecretKeySpec(ByteArray(32){0x45},"AES");var missing=false
 val vault=AtomicVault.create(root.resolve("content"),OwnerKeyProvider {owner,epoch->if(missing||owner!="owner"||epoch!=1)throw VaultFailure();key},session)
 val bytes=ByteArray(1048581){0x41};"%PDF-".toByteArray().copyInto(bytes)
 val digest=MessageDigest.getInstance("SHA-256").digest(bytes).joinToString(""){"%02x".format(it)}
 val meta=PdfMetadata("owner","note",1,bytes.size.toLong(),1,"sha256:$digest")
 val ticket=session.claim("owner");val acquire=VaultAcquisition(vault,session){100L}
 val permit=AcquisitionPermit(meta,digest,200L)
 var closed=false
 val input=object:ByteArrayInputStream(bytes){override fun close(){closed=true;super.close()}}
 val id=acquire.receive(input,permit,ticket);check(closed);check(vault.verify(id,meta,ticket).sha256==digest)
 val files=Files.list(root.resolve("content")).use {it.toList()};check(files.none {it.fileName.toString().endsWith(".pdf")})
 for(file in files.filter {it.fileName.toString().endsWith(".mvp")}) {
  val stored=Files.readAllBytes(file);check(!String(stored).contains("%PDF-"));check(!String(stored).contains("owner"))
 }
 val before=Files.list(root.resolve("content")).use {it.filter {p->p.toString().endsWith(".mvp")}.count()}
 fun denied(permit2:AcquisitionPermit=permit,data:ByteArray=bytes) {rejected {acquire.receive(ByteArrayInputStream(data),permit2,ticket)};check(Files.list(root.resolve("content")).use {it.filter {p->p.toString().endsWith(".mvp")}.count()}==before)}
 denied(permit.copy(expiresAtMillis=100));denied(permit.copy(sha256="0".repeat(64)))
 denied(data=bytes.copyOf(bytes.size-1));denied(data=bytes+byteArrayOf(1));denied(data=bytes.copyOf().also {it[100]=0x42})
 missing=true;denied();missing=false
 val revoked=object:ByteArrayInputStream(bytes){override fun read(b:ByteArray,off:Int,len:Int):Int {val n=super.read(b,off,len);session.revoke();return n}}
 rejected {acquire.receive(revoked,permit,ticket)}
 check(Files.exists(root.resolve("content/$id.mvp"))) // preserve previously committed downloads
 println("PASS AUD-008 dormant native streaming acquisition: authenticated ciphertext only, digest/length/expiry/key/revocation denial, input close and existing-file preservation")
}

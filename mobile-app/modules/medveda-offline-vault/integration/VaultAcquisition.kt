package `in`.medveda.offline

import java.io.InputStream
import java.security.MessageDigest

/** Trusted native authorization snapshot; never accept these claims from JS alone.
 * Transport, signed-license verification and native view leases remain activation gates.
 */
data class AcquisitionPermit(val metadata:PdfMetadata,val sha256:String,val expiresAtMillis:Long)

/** Dormant acquisition boundary: plaintext flows directly from native transport into
 * the existing authenticated container writer. No persistent plaintext or path/URL API.
 * Digest and expiry are checked BEFORE AtomicVault's immutable publication.
 */
class VaultAcquisition(private val vault:AtomicVault,private val session:OwnerSession,
                       private val now:()->Long=System::currentTimeMillis) {
  fun receive(input:InputStream,permit:AcquisitionPermit,ticket:Ticket,checkSource:()->Unit={}):String = safely {
    input.use {source ->
      requireVault(Regex("[a-f0-9]{64}").matches(permit.sha256))
      requireVault(permit.metadata.identity=="sha256:${permit.sha256}")
      requireVault(now()<permit.expiresAtMillis)
      session.check(ticket);checkSource()
      val digest=MessageDigest.getInstance("SHA-256")
      var bytes=0L
      fun checkAdmission() {session.check(ticket);checkSource();requireVault(now()<permit.expiresAtMillis)}
      fun complete() {
        checkAdmission();requireVault(bytes==permit.metadata.length)
        val expected=permit.sha256.chunked(2).map {it.toInt(16).toByte()}.toByteArray()
        requireVault(MessageDigest.isEqual(digest.digest(),expected))
      }
      val verifiedInput=object:InputStream() {
        override fun read():Int {
          checkAdmission();val value=source.read()
          if(value<0)complete() else {bytes++;requireVault(bytes<=permit.metadata.length);digest.update(value.toByte())}
          return value
        }
        override fun read(b:ByteArray,off:Int,len:Int):Int {
          checkAdmission();val count=source.read(b,off,len)
          if(count<0)complete() else if(count>0) {
            bytes+=count;requireVault(bytes<=permit.metadata.length);digest.update(b,off,count)
          }
          return count
        }
      }
      vault.seal(verifiedInput,permit.metadata,ticket)
    }
  }
}

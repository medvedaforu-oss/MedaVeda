package `in`.medveda.offline

import java.io.InputStream
import java.net.URI
import javax.net.ssl.HttpsURLConnection

/** One-shot native stream: no DownloadManager, disk cache, redirects, resume
 * state, URL logging or cleartext fallback. Allowed origin is trusted native config.
 * A signed URL is transport only; it does NOT issue an AcquisitionPermit.
 * Call off the UI thread. close() cancels a blocked read; cancellation is permanent.
 */
class NativeHttpsSource(private val allowedHost:String,
 private val connect:(URI)->HttpsURLConnection={it.toURL().openConnection() as HttpsURLConnection}):AutoCloseable {
 private var active:HttpsURLConnection?=null
 private var cancelled=false
 private var started=false
 fun receive(url:String,permit:AcquisitionPermit,ticket:Ticket,coordinator:ContentCoordinator):ContentEntry=safely {
  val uri=URI(url)
  requireVault(uri.scheme=="https" && uri.host==allowedHost && uri.rawUserInfo==null && uri.rawFragment==null && (uri.port==-1 || uri.port==443))
  val connection=synchronized(this) {
   requireVault(!cancelled && !started);started=true
   connect(uri).also {active=it}
  }
  try {
   connection.instanceFollowRedirects=false;connection.useCaches=false;connection.setRequestProperty("Cookie", "");connection.setRequestProperty("Cookie2", "")
   connection.connectTimeout=10_000;connection.readTimeout=10_000
   connection.requestMethod="GET";connection.setRequestProperty("Accept-Encoding","identity")
   connection.setRequestProperty("Cache-Control","no-store")
   requireVault(connection.responseCode==200)
   val encoding=connection.getHeaderField("Content-Encoding")
   requireVault(encoding==null || encoding.equals("identity",ignoreCase=true))
   val length=connection.getHeaderField("Content-Length")
   requireVault(length==null || length.toLongOrNull()==permit.metadata.length)
   connection.inputStream.use {input->
    val guarded=object:InputStream() {
     private fun admitted() {synchronized(this@NativeHttpsSource){requireVault(!cancelled)}}
     override fun read():Int {admitted();val value=input.read();admitted();return value}
     override fun read(b:ByteArray,off:Int,len:Int):Int {admitted();val value=input.read(b,off,len);admitted();return value}
    }
    coordinator.receive(guarded,permit,ticket,
     checkSource={synchronized(this){requireVault(!cancelled)}},
     // Same lock as close(): cancellation and final publication are ordered.
     // Lock order is OwnerSession -> source; close never takes OwnerSession.
     commitSource={commit->synchronized(this){requireVault(!cancelled);commit()}})
   }
  }finally {synchronized(this){active=null};connection.disconnect()}
 }
 override fun close() {
  val connection=synchronized(this){cancelled=true;active.also {active=null}}
  connection?.disconnect()
 }
}

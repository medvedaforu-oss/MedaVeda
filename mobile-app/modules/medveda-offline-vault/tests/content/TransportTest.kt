package `in`.medveda.offline
import java.io.ByteArrayInputStream
import java.net.URI
import java.security.Principal
import java.security.cert.Certificate
import javax.net.ssl.HttpsURLConnection

internal class FixtureConnection(private val status:Int,private val length:String?,private val data:ByteArray):HttpsURLConnection(URI("https://fixture.invalid/pdf").toURL()) {
 var disconnected=false;var opened=false
 override fun disconnect(){disconnected=true}
 override fun usingProxy()=false
 override fun connect(){}
 override fun getCipherSuite()="TLS_AES_256_GCM_SHA384"
 override fun getLocalCertificates():Array<Certificate>?=null
 override fun getServerCertificates():Array<Certificate> = emptyArray()
 override fun getPeerPrincipal():Principal?=null
 override fun getLocalPrincipal():Principal?=null
 override fun getResponseCode()=status
 override fun getHeaderField(name:String):String?=if(name=="Content-Length")length else null
 override fun getInputStream():ByteArrayInputStream {opened=true;return ByteArrayInputStream(data)}
}

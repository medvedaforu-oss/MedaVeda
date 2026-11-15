package `in`.medveda.offline

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import java.nio.file.Path

/** Native-only renderer: no path, decrypted bytes, URI or descriptor crosses JS.
 * A controller must attach this resource to NativeLeases before exposing a page.
 * Existing react-native-pdf is NOT wired to this renderer.
 */
class AndroidPdfResource private constructor(private val descriptor:ParcelFileDescriptor,
 private val renderer:PdfRenderer,private val ticket:Ticket,private val session:OwnerSession):AutoCloseable {
 private var closed=false
 private var rendererClosed=false
 private var descriptorClosed=false
 companion object {
  fun open(path:Path,ticket:Ticket,session:OwnerSession):AndroidPdfResource=safely {
   session.check(ticket)
   val fd=ParcelFileDescriptor.open(path.toFile(),ParcelFileDescriptor.MODE_READ_ONLY)
   try {AndroidPdfResource(fd,PdfRenderer(fd),ticket,session)}catch(e:Exception){fd.close();throw e}
  }
 }
 @Synchronized fun pageCount():Int=safely {requireVault(!closed);session.check(ticket);renderer.pageCount}
 /** Bounded bitmap; caller owns and recycles successful results. No retained page cache. */
 @Synchronized fun render(index:Int,width:Int,height:Int):Bitmap=safely {
  requireVault(!closed && width in 1..2048 && height in 1..2048)
  session.check(ticket);requireVault(index in 0 until renderer.pageCount)
  val bitmap=Bitmap.createBitmap(width,height,Bitmap.Config.ARGB_8888)
  try {
   bitmap.eraseColor(Color.WHITE)
   renderer.openPage(index).use {it.render(bitmap,null,null,PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)}
   session.check(ticket);bitmap
  }catch(e:Exception){bitmap.recycle();throw e}
 }
 @Synchronized override fun close()=safely {
  if(!closed) {
   // Keep a failed resource retryable; native lease blocks all new admissions.
   if(!rendererClosed){renderer.close();rendererClosed=true}
   if(!descriptorClosed){descriptor.close();descriptorClosed=true}
   closed=true
  }
 }
}

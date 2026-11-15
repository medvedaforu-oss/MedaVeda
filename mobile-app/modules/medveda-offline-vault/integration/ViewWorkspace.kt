package `in`.medveda.offline

import java.nio.channels.FileChannel
import java.nio.channels.Channels
import java.nio.file.*
import java.nio.file.LinkOption.NOFOLLOW_LINKS
import java.nio.file.StandardOpenOption.*
import java.nio.file.attribute.PosixFilePermissions
import java.util.UUID

interface ViewWorkspaceIO {fun force(channel:FileChannel)}
private object ViewIO:ViewWorkspaceIO {override fun force(channel:FileChannel)=channel.force(true)}

/** Dedicated no-backup native workspace ONLY. Never open a legacy/cache/root directory.
 * The controller holds its OS lock throughout recovery/use. No path is exported to JS.
 */
class ViewWorkspace private constructor(private val root:Path,private val io:ViewWorkspaceIO):AutoCloseable {
 private var activePath:Path?=null
 private var activeRenderer:AutoCloseable?=null
 companion object {
  private val marker="MEDVEDA-VIEW-WORKSPACE-1".toByteArray(Charsets.US_ASCII)
  fun create(root:Path):ViewWorkspace=safely {
   requireVault(root.isAbsolute && root.normalize()==root && root.parent.toRealPath()==root.parent)
   Files.createDirectory(root,PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rwx------")))
   FileChannel.open(root.resolve("VIEWS1"),CREATE_NEW,WRITE,NOFOLLOW_LINKS).use {channel->
    val buffer=java.nio.ByteBuffer.wrap(marker);while(buffer.hasRemaining())requireVault(channel.write(buffer)>0);channel.force(true)
   }
   JvmDurability.forceDirectory(root);JvmDurability.forceDirectory(root.parent);open(root)
  }
  fun open(root:Path,io:ViewWorkspaceIO=ViewIO):ViewWorkspace=safely {
   requireVault(root.isAbsolute && root.normalize()==root && root.toRealPath()==root && !Files.isSymbolicLink(root))
   FileChannel.open(root.resolve("VIEWS1"),READ,NOFOLLOW_LINKS).use {channel->
    requireVault(channel.size()==marker.size.toLong())
    val buffer=java.nio.ByteBuffer.allocate(marker.size)
    while(buffer.hasRemaining())requireVault(channel.read(buffer)>0)
    requireVault(buffer.array().contentEquals(marker))
   }
   ViewWorkspace(root,io)
  }
 }
 private fun files():List<Path> {
  requireVault(root.toRealPath()==root && !Files.isSymbolicLink(root))
  return Files.newDirectoryStream(root).use {stream->mutableListOf<Path>().also {paths->
   for(path in stream){requireVault(paths.size<1025);paths.add(path)}
   for(p in paths)requireVault(Files.isRegularFile(p,NOFOLLOW_LINKS) &&
    (p.fileName.toString()=="VIEWS1" || Regex("[0-9a-f]{32}\\.view").matches(p.fileName.toString())))
  }}.filter {it.fileName.toString()!="VIEWS1"}
 }
 @Synchronized fun pending():Int=safely {files().size}
 /** Startup runs before any lease/admission. Failure blocks opening the controller. */
 @Synchronized fun recover()=safely {
  requireVault(activePath==null && activeRenderer==null)
  for(p in files())Files.delete(p);JvmDurability.forceDirectory(root)
 }
 /** Kept by NativeLeases BEFORE plaintext creation, including failed attachment.
  * Clear each stage only after success, so disposal is idempotent and retryable.
  */
 @Synchronized override fun close():Unit=safely {
  activeRenderer?.close();activeRenderer=null
  activePath?.let {Files.deleteIfExists(it);JvmDurability.forceDirectory(root);activePath=null}
  Unit
 }
 @Synchronized internal fun materialize(write:(java.io.OutputStream)->Unit,render:(Path)->AutoCloseable):AutoCloseable=safely {
  requireVault(activePath==null && activeRenderer==null && files().isEmpty())
  val path=root.resolve(UUID.randomUUID().toString().replace("-","")+".view")
  try {
   FileChannel.open(path,setOf(CREATE_NEW,WRITE,NOFOLLOW_LINKS),PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rw-------"))).use {c->
    activePath=path;write(Channels.newOutputStream(c));io.force(c)
   }
   activeRenderer=render(path)
   AutoCloseable {close()}
  }catch(e:Exception) {
   // Cleanup failure leaves the workspace blocked; startup recovery retries it.
   close();throw e
  }
 }
}

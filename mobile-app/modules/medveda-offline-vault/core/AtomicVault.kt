package `in`.medveda.offline

import java.io.InputStream
import java.nio.channels.Channels
import java.nio.channels.FileChannel
import java.nio.file.*
import java.nio.file.StandardOpenOption.*
import java.nio.file.LinkOption.NOFOLLOW_LINKS
import java.util.UUID

/** Platform durability boundary; unsupported operations must throw, never degrade. */
interface Durability {
  fun forceFile(channel:FileChannel)
  fun linkNew(part:Path,target:Path)
  fun forceDirectory(path:Path)
}
object JvmDurability:Durability {
  override fun forceFile(channel:FileChannel)=channel.force(true)
  override fun linkNew(part:Path,target:Path) { Files.createLink(target,part) }
  override fun forceDirectory(path:Path) { FileChannel.open(path,READ,NOFOLLOW_LINKS).use {it.force(true)} }
}

/** Dedicated, explicitly created vault only. Not registered with Expo or imported by app. */
class AtomicVault private constructor(private val root:Path,private val keys:OwnerKeyProvider,
                                      private val session:OwnerSession,private val io:Durability) {
  companion object {
    private val marker="MEDVEDA-ISOLATED-VAULT-1".toByteArray(Charsets.US_ASCII)
    fun create(path:Path,keys:OwnerKeyProvider,session:OwnerSession,io:Durability=JvmDurability):AtomicVault = safely {
      requireVault(path.isAbsolute && path==path.normalize())
      val parent=path.parent.toRealPath();requireVault(parent==path.parent)
      Files.createDirectory(path)
      // These files are new and have no relationship to existing app storage.
      Files.setPosixFilePermissions(path,java.nio.file.attribute.PosixFilePermissions.fromString("rwx------"))
      FileChannel.open(path.resolve("VAULT1"),CREATE_NEW,WRITE,NOFOLLOW_LINKS).use { channel ->
        val bytes=java.nio.ByteBuffer.wrap(marker)
        while(bytes.hasRemaining())requireVault(channel.write(bytes)>0)
        io.forceFile(channel)
      }
      io.forceDirectory(path)
      io.forceDirectory(parent) // persist the new root directory entry, not only its contents.
      open(path,keys,session,io)
    }
    fun open(path:Path,keys:OwnerKeyProvider,session:OwnerSession,io:Durability=JvmDurability):AtomicVault = safely {
      requireVault(path.isAbsolute && path==path.normalize() && !Files.isSymbolicLink(path))
      requireVault(path.toRealPath()==path && Files.isDirectory(path,NOFOLLOW_LINKS))
      FileChannel.open(path.resolve("VAULT1"),READ,NOFOLLOW_LINKS).use { channel ->
        requireVault(channel.size()==marker.size.toLong())
        val b=java.nio.ByteBuffer.allocate(marker.size)
        while(b.hasRemaining()) requireVault(channel.read(b)>0)
        requireVault(b.array().contentEquals(marker))
      }
      AtomicVault(path,keys,session,io)
    }
  }
  private fun checkRoot() { requireVault(!Files.isSymbolicLink(root) && root.toRealPath()==root) }
  @Synchronized fun seal(input:InputStream,metadata:PdfMetadata,ticket:Ticket):String = safely {
    metadata.encoded();session.check(ticket);requireVault(ticket.owner==metadata.owner);checkRoot()
    val key=keys.key(metadata.owner,metadata.keyEpoch) // no replacement key on failure
    val id=UUID.randomUUID().toString().replace("-","")
    val part=root.resolve("$id.part");val target=root.resolve("$id.mvp")
    FileChannel.open(part,CREATE_NEW,WRITE,NOFOLLOW_LINKS).use { channel ->
      Files.setPosixFilePermissions(part,java.nio.file.attribute.PosixFilePermissions.fromString("rw-------"))
      PdfContainer.write(input,Channels.newOutputStream(channel),metadata,key,ticket,session)
      io.forceFile(channel)
    }
    FileChannel.open(part,READ,NOFOLLOW_LINKS).use {
      PdfContainer.verify(Channels.newInputStream(it),metadata,key,ticket,session)
    }
    session.commit(ticket) {
      checkRoot();io.linkNew(part,target);io.forceDirectory(root)
      // Only this invocation's new temporary hard link. Never scan/delete existing files.
      Files.delete(part);io.forceDirectory(root)
    }
    id
  }
  @Synchronized fun verify(id:String,metadata:PdfMetadata,ticket:Ticket):VerifiedPdf = safely {
    metadata.encoded();requireVault(Regex("[0-9a-f]{32}").matches(id));session.check(ticket)
    requireVault(ticket.owner==metadata.owner);checkRoot()
    FileChannel.open(root.resolve("$id.mvp"),READ,NOFOLLOW_LINKS).use {
      PdfContainer.verify(Channels.newInputStream(it),metadata,keys.key(metadata.owner,metadata.keyEpoch),ticket,session)
    }
  }
  /** Plaintext only to a newly created private native workspace, never JS or a URL.
   * Caller performs full verification first and attaches renderer only after this
   * second authenticated pass succeeds. Any failure removes/blocks the workspace.
   */
  @Synchronized internal fun extract(id:String,metadata:PdfMetadata,ticket:Ticket,output:java.io.OutputStream):Unit=safely {
    metadata.encoded();requireVault(Regex("[0-9a-f]{32}").matches(id));session.check(ticket)
    requireVault(ticket.owner==metadata.owner);checkRoot()
    FileChannel.open(root.resolve("$id.mvp"),READ,NOFOLLOW_LINKS).use {
      PdfContainer.verifyAndCopy(Channels.newInputStream(it),metadata,keys.key(metadata.owner,metadata.keyEpoch),ticket,session,output)
    };Unit
  }

}

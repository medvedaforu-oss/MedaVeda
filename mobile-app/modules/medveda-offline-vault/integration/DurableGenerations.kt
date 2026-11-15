package `in`.medveda.offline

import java.nio.ByteBuffer
import java.nio.channels.FileChannel
import java.nio.file.*
import java.nio.file.LinkOption.NOFOLLOW_LINKS
import java.nio.file.StandardOpenOption.*
import java.nio.file.attribute.PosixFilePermissions
import java.util.UUID

/** API 26+ on Android. Single controller must hold an OS file lock for its lifetime.
 * Generation files are ciphertext only; incomplete parts retained, never replayed.
 */
class DurableGenerations private constructor(private val root:Path,private val io:Durability):GenerationStore {
  companion object {
    fun create(root:Path,io:Durability=JvmDurability):DurableGenerations=safely {
      requireVault(root.isAbsolute && root.normalize()==root && root.parent.toRealPath()==root.parent)
      Files.createDirectory(root,PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rwx------")))
      io.forceDirectory(root);io.forceDirectory(root.parent)
      open(root,io)
    }
    fun open(root:Path,io:Durability=JvmDurability):DurableGenerations=safely {
      requireVault(root.isAbsolute && root.normalize()==root && root.toRealPath()==root && !Files.isSymbolicLink(root))
      requireVault(Files.isDirectory(root,NOFOLLOW_LINKS))
      DurableGenerations(root,io)
    }
  }
  private fun checkRoot() {requireVault(root.toRealPath()==root && !Files.isSymbolicLink(root))}
  private fun name(g:Long):String {requireVault(g in 1..EncryptedRegistry.MAX_GENERATIONS);return "%08d.reg".format(java.util.Locale.ROOT,g)}
  override fun generations():List<Long> = safely {
    checkRoot()
    Files.newDirectoryStream(root).use {stream->
      val found=mutableListOf<Long>()
      var count=0
      for(p in stream) {
        requireVault(++count<=16384 && Files.isRegularFile(p,NOFOLLOW_LINKS))
        val n=p.fileName.toString()
        if(Regex("[0-9]{8}\\.reg").matches(n))found.add(n.substringBefore('.').toLong())
        else requireVault(Regex("[0-9a-f]{32}\\.part").matches(n))
      }
      requireVault(found.size<=EncryptedRegistry.MAX_GENERATIONS)
      found.sorted()
    }
  }
  override fun read(generation:Long):ByteArray=safely {
    checkRoot()
    FileChannel.open(root.resolve(name(generation)),READ,NOFOLLOW_LINKS).use {c->
      requireVault(c.size() in 80..EncryptedRegistry.MAX_BYTES.toLong())
      val b=ByteBuffer.allocate(c.size().toInt())
      while(b.hasRemaining())requireVault(c.read(b)>0)
      requireVault(c.read(ByteBuffer.allocate(1)) == -1);b.array()
    }
  }
  override fun publish(generation:Long,bytes:ByteArray)=safely {
    checkRoot();requireVault(bytes.size in 80..EncryptedRegistry.MAX_BYTES)
    val target=root.resolve(name(generation));val part=root.resolve(UUID.randomUUID().toString().replace("-","")+".part")
    FileChannel.open(part,setOf(CREATE_NEW,WRITE,NOFOLLOW_LINKS),
      PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rw-------"))).use {c->
      val b=ByteBuffer.wrap(bytes);while(b.hasRemaining())requireVault(c.write(b)>0);io.forceFile(c)
    }
    io.linkNew(part,target);io.forceDirectory(root)
    // Retain this encrypted part too: no deletion API in the Phase 1B journal.
  }
}

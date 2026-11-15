package `in`.medveda.offline

import android.content.Context
import android.os.Build
import java.nio.channels.FileChannel
import java.nio.channels.FileLock
import java.nio.file.Files
import java.nio.file.LinkOption.NOFOLLOW_LINKS
import java.nio.file.StandardOpenOption.*

/** Trusted native harness entry only. Never instantiated by the bridge or app startup.
 * Content preparation is harness-only. Lifetime lock prevents concurrent coordinators.
 */
class AndroidVaultControl private constructor(private val channel:FileChannel,private val lock:FileLock,
  private val owners:OwnerKeys,private val context:Context,private val root:java.nio.file.Path,private val keys:AndroidKeys):AutoCloseable {
  private val leases=AndroidVaultLifecycle.leases
  private var closed=false
  private var content:AndroidContentControl?=null
  companion object {
    fun open(context:Context,initializeNew:Boolean=false):AndroidVaultControl=safely {
      requireVault(Build.VERSION.SDK_INT>=28)
      val parent=context.noBackupFilesDir.toPath().toRealPath()
      val root=parent.resolve("medveda-phase1b")
      val keys=AndroidKeys(context)
      val newRoot=initializeNew
      if(newRoot) {
        requireVault(!Files.exists(root,NOFOLLOW_LINKS))
        Files.createDirectory(root,java.nio.file.attribute.PosixFilePermissions.asFileAttribute(
          java.nio.file.attribute.PosixFilePermissions.fromString("rwx------")))
        JvmDurability.forceDirectory(root);JvmDurability.forceDirectory(parent)
      }
      requireVault(!Files.isSymbolicLink(root) && root.toRealPath()==root)
      val ch=FileChannel.open(root.resolve("control.lock"),CREATE,WRITE,NOFOLLOW_LINKS)
      var held:FileLock?=null
      try {
        held=ch.tryLock()?:throw VaultFailure()
        val path=root.resolve("registry")
        val registry=if(newRoot) {
          val store=DurableGenerations.create(path)
          keys.create("registry") // crash leaves a blocked namespace, never silently reset
          EncryptedRegistry.initialize(store,keys.lookup("registry"))
        } else EncryptedRegistry.open(DurableGenerations.open(path),keys.lookup("registry"))
        AndroidVaultControl(ch,held,OwnerKeys(registry,keys),context.applicationContext,root,keys)
      } catch(e:Exception) {held?.release();ch.close();throw e}
    }
  }
  @Synchronized fun provisionForHarness(owner:String,epoch:Int)=safely {
    requireVault(!closed);leases.invalidate();owners.provision(owner,epoch)
  }
  @Synchronized fun claimForHarness(owner:String,epoch:Int):Ticket=safely {
    requireVault(!closed);leases.invalidate();owners.key(owner,epoch);leases.claim(owner)
  }
  @Synchronized fun prepareContentForHarness(initializeNew:Boolean=false):AndroidContentControl=safely {
    requireVault(!closed && content==null)
    AndroidContentControl(context,root,keys,owners,initializeNew).also {content=it}
  }
  @Synchronized fun invalidate() {if(content!=null)content!!.invalidate() else leases.invalidate()}
  @Synchronized override fun close()=safely {
    invalidate();content?.close();content=null
    if(!closed) {closed=true;lock.release();channel.close()}
  }
}

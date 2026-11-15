package `in`.medveda.offline

import java.io.InputStream
import java.nio.channels.Channels
import java.nio.channels.FileChannel
import java.nio.file.Path
import java.nio.file.LinkOption.NOFOLLOW_LINKS
import java.nio.file.StandardOpenOption.READ

/** Trusted native coordinator, deliberately not exported by the Expo bridge.
 * Permits MUST come from a native authenticated authorizer, never JS metadata.
 * Current server lacks that contract: this implementation is harness-only.
 * All operations share the owner's session and exclusive controller OS lock.
 */
class ContentCoordinator(private val vault:AtomicVault,private val journal:ContentJournal,
 private val session:OwnerSession,private val leases:NativeLeases=NativeLeases(session),
 private val now:()->Long=System::currentTimeMillis) {
 private fun admission(permit:AcquisitionPermit,ticket:Ticket) {
  session.check(ticket);requireVault(ticket.owner==permit.metadata.owner && now()<permit.expiresAtMillis)
  requireVault(Regex("[a-f0-9]{64}").matches(permit.sha256) && permit.metadata.identity=="sha256:${permit.sha256}")
 }
 @Synchronized fun receive(input:InputStream,permit:AcquisitionPermit,ticket:Ticket,checkSource:()->Unit={},commitSource:(()->Unit)->Unit={it()}):ContentEntry=safely {
  // Acquisition owns/always closes input, even for malformed admission.
  val id=VaultAcquisition(vault,session,now).receive(input,permit,ticket,checkSource)
  val entry=ContentEntry(id,permit.metadata)
  // Expiry/revocation between blob publication and catalog commit leaves only an
  // encrypted orphan. Never mark completed before durable catalog publication.
  admission(permit,ticket);checkSource()
  session.commit(ticket) {admission(permit,ticket);commitSource {checkSource();journal.commit(entry)}}
  entry
 }
 /** Explicit revalidation only. No owner inference, in-place rewrite, removal or
  * old timestamp trust. A current trusted permit must match ALL original bytes.
  * Symlinks deny. Original stays byte-identical on success and every failure.
  */
 @Synchronized fun importLegacy(source:Path,permit:AcquisitionPermit,ticket:Ticket):ContentEntry=safely {
  admission(permit,ticket)
  requireVault(source.isAbsolute && source.normalize()==source && source.toRealPath()==source)
  FileChannel.open(source,READ,NOFOLLOW_LINKS).use {channel->
   requireVault(channel.size()==permit.metadata.length)
   receive(Channels.newInputStream(channel),permit,ticket)
  }
 }
 @Synchronized fun openView(entry:ContentEntry,permit:AcquisitionPermit,ticket:Ticket,
  workspace:ViewWorkspace,render:(Path)->AutoCloseable):AutoCloseable=safely {
  admission(permit,ticket)
  requireVault(entry.metadata==permit.metadata && !entry.revoked && journal.entries().any {it==entry})
  // Verify entire container and digest before any plaintext is materialized.
  requireVault(vault.verify(entry.fileId,entry.metadata,ticket).sha256==permit.sha256)
  // Retain the entire workspace BEFORE any plaintext/renderer can exist.
  // Revocation racing creation waits for workspace disposal; failed disposal
  // remains retained by NativeLeases and blocks all subsequent owner claims.
  leases.attach(ticket,workspace)
  try {
   workspace.materialize({out->vault.extract(entry.fileId,entry.metadata,ticket,out)}, {path->
    admission(permit,ticket);render(path)
   })
   admission(permit,ticket)
   AutoCloseable {leases.release(ticket,workspace)}
  }catch(e:Exception){leases.release(ticket,workspace);throw e}
 }
 @Synchronized fun revoke(entry:ContentEntry,ticket:Ticket)=safely {
  session.check(ticket);requireVault(ticket.owner==entry.metadata.owner)
  // Invalidate admission first, including on a failed durable tombstone write.
  try {session.revoke();journal.revoke(entry)}finally {leases.invalidate()}
 }
}

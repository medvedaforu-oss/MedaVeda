package `in`.medveda.offline
import java.io.*
import java.nio.file.*
import java.security.MessageDigest
import javax.crypto.spec.SecretKeySpec
private fun denied(block:()->Unit) {try {block()}catch(e:VaultFailure){return};error("Expected denial")}
fun main() {
 val root=Files.createTempDirectory("aud008-content-");val session=OwnerSession()
 val key=SecretKeySpec(ByteArray(32){0x51},"AES");val provider=OwnerKeyProvider {owner,_->if(owner!="A")throw VaultFailure();key}
 val vault=AtomicVault.create(root.resolve("vault"),provider,session)
 val store=DurableGenerations.create(root.resolve("catalog"));val journal=ContentJournal.create(store,key)
 var now=100L
 val leases=NativeLeases(session)
 val coordinator=ContentCoordinator(vault,journal,session,leases){now}
 val bytes="%PDF-synthetic-private-canary".toByteArray()
 val digest=MessageDigest.getInstance("SHA-256").digest(bytes).joinToString(""){"%02x".format(it)}
 val meta=PdfMetadata("A","note",1,bytes.size.toLong(),1,"sha256:$digest")
 val permit=AcquisitionPermit(meta,digest,200)
 val ticket=session.claim("A")
 val original=root.resolve("legacy.pdf");Files.write(original,bytes)
 val entry=coordinator.importLegacy(original,permit,ticket)
 check(Files.readAllBytes(original).contentEquals(bytes))
 check(ContentJournal.open(DurableGenerations.open(root.resolve("catalog")),key).entries().single()==entry)
 denied {coordinator.importLegacy(original,permit.copy(sha256="0".repeat(64)),ticket)}
 check(Files.readAllBytes(original).contentEquals(bytes));check(journal.entries().size==1)
 val workspace=ViewWorkspace.create(root.resolve("views"))
 var rendered=0;var closed=0
 fun render(path:Path):AutoCloseable {rendered++;check(Files.readAllBytes(path).contentEquals(bytes));return AutoCloseable {closed++}}
 // Use the same owner session in every layer; switching owners invalidates old tickets.
 val lease=coordinator.openView(entry,permit,ticket,workspace,::render)
 check(rendered==1)
 leases.invalidate();check(closed==1);check(workspace.pending()==0)
 denied {coordinator.openView(entry,permit,ticket,workspace,::render)}
 val b=session.claim("B");denied {coordinator.openView(entry,permit,b,workspace,::render)}
 var a=session.claim("A");now=200
 denied {coordinator.openView(entry,permit,a,workspace,::render)};now=100
 val target=root.resolve("vault/${entry.fileId}.mvp");val valid=Files.readAllBytes(target)
 Files.write(target,valid.copyOf().also {it[it.lastIndex]=(it.last().toInt() xor 1).toByte()})
 denied {coordinator.openView(entry,permit,a,workspace,::render)}
 check(rendered==1);check(workspace.pending()==0);Files.write(target,valid)
 // Expiry during plaintext extraction must not reach the renderer.
 val expiryWorkspace=ViewWorkspace.open(root.resolve("views"),object:ViewWorkspaceIO {
  override fun force(channel:java.nio.channels.FileChannel){now=200}
 })
 denied {coordinator.openView(entry,permit,a,expiryWorkspace,::render)}
 check(rendered==1 && workspace.pending()==0);now=100;a=leases.claim("A")
 // An interrupted source leaves only an encrypted orphan/part, never completed content.
 val interrupted=object:ByteArrayInputStream(bytes) {
  override fun read(b:ByteArray,off:Int,len:Int):Int {throw IOException("interrupted")}
 }
 denied {coordinator.receive(interrupted,permit,a)}
 check(journal.entries()==listOf(entry))
 // Foreign/unknown workspace content is never swept automatically.
 val foreign=root.resolve("views/foreign.pdf");Files.write(foreign,bytes)
 denied {workspace.recover()};check(Files.readAllBytes(foreign).contentEquals(bytes));Files.delete(foreign)
 // Failed temp writes never reach the renderer and do not affect committed ciphertext.
 val full=object:ViewWorkspaceIO {override fun force(channel:java.nio.channels.FileChannel){throw IOException("ENOSPC")}}
 val failed=ViewWorkspace.open(root.resolve("views"),full)
 denied {coordinator.openView(entry,permit,a,failed,::render)}
 check(rendered==1);check(Files.readAllBytes(target).contentEquals(valid));check(failed.pending()==0);a=leases.claim("A")
 // Restart sweeps ONLY marked view workspace files. Legacy originals and vault survive.
 Files.write(root.resolve("views/"+"a".repeat(32)+".view"),bytes)
 ViewWorkspace.open(root.resolve("views")).recover();check(workspace.pending()==0)
 check(Files.readAllBytes(original).contentEquals(bytes))
 // Native HTTP rejects redirects, altered length/origin and cancellation without
 // exposing response bodies to acquisition or persisting transport capabilities.
 for(status in listOf(301,302,401,403,206,500)) {
  val connection=FixtureConnection(status,bytes.size.toString(),bytes)
  val http=NativeHttpsSource("fixture.invalid"){connection}
  denied {http.receive("https://fixture.invalid/pdf?capability=synthetic",permit,a,coordinator)}
  check(connection.disconnected && !connection.opened)
 }
 val badLength=FixtureConnection(200,"999",bytes)
 denied {NativeHttpsSource("fixture.invalid"){badLength}.receive("https://fixture.invalid/pdf",permit,a,coordinator)}
 check(badLength.disconnected && !badLength.opened)
 val cancelled=NativeHttpsSource("fixture.invalid"){error("must not connect")};cancelled.close()
 denied {cancelled.receive("https://fixture.invalid/pdf",permit,a,coordinator)}
 for(url in listOf("http://fixture.invalid/pdf","https://evil.invalid/pdf","https://user@fixture.invalid/pdf","https://fixture.invalid:444/pdf"))
  denied {NativeHttpsSource("fixture.invalid"){error("must not connect")}.receive(url,permit,a,coordinator)}
 val connection=FixtureConnection(200,bytes.size.toString(),bytes)
 val nativeEntry=NativeHttpsSource("fixture.invalid"){connection}.receive("https://fixture.invalid/pdf",permit,a,coordinator)
 check(connection.disconnected && connection.opened && !connection.useCaches && !connection.instanceFollowRedirects)
 check(vault.verify(nativeEntry.fileId,meta,a).sha256==digest)
 // Cancel after the network EOF but before durable publication must never
 // produce a completed catalog record (ciphertext orphan is safe to preserve).
 lateinit var lateCancel:NativeHttpsSource;var armed=false
 val cancelIO=object:Durability by JvmDurability {
  override fun forceFile(channel:java.nio.channels.FileChannel) {JvmDurability.forceFile(channel);if(armed)lateCancel.close()}
 }
 val cancelVault=AtomicVault.create(root.resolve("cancel-vault"),provider,session,cancelIO)
 val cancelCoordinator=ContentCoordinator(cancelVault,journal,session){now}
 val beforeCancel=journal.entries()
 lateCancel=NativeHttpsSource("fixture.invalid"){FixtureConnection(200,bytes.size.toString(),bytes)};armed=true
 denied {lateCancel.receive("https://fixture.invalid/pdf",permit,a,cancelCoordinator)}
 check(journal.entries()==beforeCancel)
 // Cleanup errors retain the native resource and block a second owner until retry.
 val blockedSession=OwnerSession();val blockedLeases=NativeLeases(blockedSession)
 val blockedTicket=blockedLeases.claim("A");var cleanupFails=true
 blockedLeases.attach(blockedTicket,AutoCloseable {if(cleanupFails)throw IOException("busy")})
 denied {blockedLeases.invalidate()};denied {blockedLeases.claim("B")}
 cleanupFails=false;blockedLeases.invalidate();blockedLeases.claim("B")
 // Failed catalog writes preserve the original current completed entry and source.
 val noSpace=object:GenerationStore by store {override fun publish(generation:Long,bytes:ByteArray){throw IOException("ENOSPC")}}
 val noSpaceJournal=ContentJournal.open(noSpace,key)
 val noSpaceCoordinator=ContentCoordinator(vault,noSpaceJournal,session){now}
 denied {noSpaceCoordinator.importLegacy(original,permit,a)}
 check(ContentJournal.open(store,key).entries()==listOf(entry,nativeEntry));check(Files.readAllBytes(original).contentEquals(bytes))
 // Renderer cleanup failing AFTER a late admission denial must be retained by
 // leases, block new owners and be retryable without losing the plaintext path.
 var closeFails=true
 denied {coordinator.openView(entry,permit,a,workspace) {path->
  check(Files.readAllBytes(path).contentEquals(bytes));now=200
  AutoCloseable {if(closeFails)throw IOException("busy descriptor")}
 }}
 denied {leases.claim("B")};check(workspace.pending()==1)
 closeFails=false;leases.invalidate();check(workspace.pending()==0);now=100
 val afterCleanup=leases.claim("A")
 // A normal native caller close must dispose the workspace and permit another view.
 val normal=coordinator.openView(entry,permit,afterCleanup,workspace,::render)
 normal.close();check(workspace.pending()==0)
 val aAgain=leases.claim("A")
 val another=coordinator.openView(entry,permit,aAgain,workspace,::render)
 normal.close() // stale close must not revoke or close a newer lease
 session.check(aAgain);check(workspace.pending()==1)
 another.close();check(workspace.pending()==0)
 val finalTicket=leases.claim("A")
 // Revoke is an authenticated durable tombstone; no content or original deletion.
 coordinator.revoke(entry,finalTicket)
 val reopened=ContentCoordinator(vault,ContentJournal.open(store,key),session){now}
 denied {reopened.openView(entry,permit,finalTicket,workspace,::render)}
 check(Files.exists(target));check(Files.exists(original))
 // Ambiguous catalog publication poisons live state; reopen recovers complete generation.
 var fail=true
 val ambiguous=object:GenerationStore by store {override fun publish(generation:Long,bytes:ByteArray){store.publish(generation,bytes);if(fail)throw IOException("ack lost")}}
 val j=ContentJournal.open(ambiguous,key)
 denied {j.commit(entry.copy(fileId="b".repeat(32)))};denied {j.entries()}
 check(ContentJournal.open(store,key).entries().any {it.fileId=="b".repeat(32)})
 // Corrupt journal never falls back to an earlier usable snapshot.
 val finals=Files.list(root.resolve("catalog")).use {it.filter {p->p.toString().endsWith(".reg")}.sorted().toList()}
 val last=finals.last();Files.write(last,Files.readAllBytes(last).also {it[it.lastIndex]=0})
 denied {ContentJournal.open(store,key)}
 println("PASS content: legacy original conservation, digest/owner/expiry/tamper denial, authenticated reopen/revoke, ambiguous commit, temp storage failure, renderer disposal and restart sweep")
}

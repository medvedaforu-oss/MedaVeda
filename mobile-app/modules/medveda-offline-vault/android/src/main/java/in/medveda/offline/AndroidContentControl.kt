package `in`.medveda.offline

import android.content.Context
import android.content.BroadcastReceiver
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import java.nio.file.Path
import java.util.concurrent.atomic.AtomicReference

/** Acceptance-harness controller only: requires the existing control OS lock.
 * No JS/Expo factory exports this type. Current app cannot issue trusted permits.
 */
class AndroidContentControl internal constructor(context:Context,root:Path,keys:AndroidKeys,
 owners:OwnerKeys,initializeNew:Boolean):AutoCloseable {
 private val app=context.applicationContext
 private val session=AndroidVaultLifecycle.session
 private val leases=AndroidVaultLifecycle.leases
 private val source=AtomicReference<NativeHttpsSource?>()
 private val workspace:ViewWorkspace
 private val coordinator:ContentCoordinator
 private var closed=false
 private val receiver=object:BroadcastReceiver() {
  override fun onReceive(context:Context,intent:Intent) {
   // Device broadcast is native and continues when the JS thread is stalled.
   // Keep failed lease cleanup retained/blocked for retry, never crash receiver.
   if(intent.action==Intent.ACTION_SCREEN_OFF)runCatching {invalidate()}
  }
 }
 init {
  val content=root.resolve("content");val catalog=root.resolve("content-catalog");val views=root.resolve("view-workspace")
  val vault=if(initializeNew)AtomicVault.create(content,owners,session) else AtomicVault.open(content,owners,session)
  val journal=if(initializeNew)ContentJournal.create(DurableGenerations.create(catalog),keys.lookup("registry"))
    else ContentJournal.open(DurableGenerations.open(catalog),keys.lookup("registry"))
  workspace=if(initializeNew)ViewWorkspace.create(views) else ViewWorkspace.open(views)
  workspace.recover() // never scan legacy or unrelated cache/download paths
  coordinator=ContentCoordinator(vault,journal,session,leases)
  val filter=IntentFilter(Intent.ACTION_SCREEN_OFF)
  if(Build.VERSION.SDK_INT>=33)app.registerReceiver(receiver,filter,Context.RECEIVER_NOT_EXPORTED)
  else { @Suppress("DEPRECATION") app.registerReceiver(receiver,filter) }
 }
 /** Call from a native worker. Host/origin is pinned by trusted native configuration. */
 fun receiveForHarness(url:String,allowedHost:String,permit:AcquisitionPermit,ticket:Ticket):ContentEntry=safely {
  requireVault(!closed);val transport=NativeHttpsSource(allowedHost)
  requireVault(source.compareAndSet(null,transport))
  try {transport.receive(url,permit,ticket,coordinator)}finally {transport.close();source.compareAndSet(transport,null)}
 }
 fun importLegacyForHarness(path:Path,permit:AcquisitionPermit,ticket:Ticket):ContentEntry=safely {
  requireVault(!closed);coordinator.importLegacy(path,permit,ticket)
 }
 fun viewForHarness(entry:ContentEntry,permit:AcquisitionPermit,ticket:Ticket):AndroidViewLease=safely {
  requireVault(!closed);var renderer:AndroidPdfResource?=null
  val resource=coordinator.openView(entry,permit,ticket,workspace) {path->
   AndroidPdfResource.open(path,ticket,session).also {renderer=it}
  }
  AndroidViewLease(renderer?:throw VaultFailure(),resource)
 }
 fun revokeForHarness(entry:ContentEntry,ticket:Ticket)=safely {
  try {coordinator.revoke(entry,ticket)}finally {invalidate()}
 }
 fun invalidate() {
  session.revoke() // admission denied BEFORE transport/renderer cleanup
  source.getAndSet(null)?.close()
  leases.invalidate()
 }
 override fun close() {
  invalidate()
  if(!closed){app.unregisterReceiver(receiver);closed=true}
 }
}

/** Close always disposes the complete native workspace lease, including its file. */
class AndroidViewLease internal constructor(private val renderer:AndroidPdfResource,private val lease:AutoCloseable):AutoCloseable {
 fun pageCount()=renderer.pageCount()
 fun render(index:Int,width:Int,height:Int)=renderer.render(index,width,height)
 override fun close()=lease.close()
}

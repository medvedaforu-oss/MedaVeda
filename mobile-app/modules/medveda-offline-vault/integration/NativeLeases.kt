package `in`.medveda.offline

/** Owns a native renderer/resource closure, never a caller-provided path or JS callback.
 * A failed close remains retained for retry; no new owner admission until cleanup succeeds.
 * No plaintext materialization is enabled by this foundation.
 */
class NativeLeases(private val session:OwnerSession) {
  private var resource:AutoCloseable?=null
  private var blocked=false
  private var leaseTicket:Ticket?=null
  @Synchronized fun claim(owner:String):Ticket=safely {
    requireVault(!blocked && resource==null);session.claim(owner)
  }
  @Synchronized fun attach(ticket:Ticket,resource:AutoCloseable)=safely {
    requireVault(!blocked && this.resource==null);session.check(ticket);this.resource=resource;leaseTicket=ticket
  }
  /** A late close from an old view must never dispose a newer owner's lease. */
  @Synchronized fun release(ticket:Ticket,resource:AutoCloseable) {
    if(leaseTicket===ticket && this.resource===resource)invalidate()
  }
  @Synchronized fun invalidate()=safely {
    session.revoke();blocked=true // revoke BEFORE renderer/descriptor cleanup
    resource?.close();resource=null;leaseTicket=null;blocked=false
  }
}

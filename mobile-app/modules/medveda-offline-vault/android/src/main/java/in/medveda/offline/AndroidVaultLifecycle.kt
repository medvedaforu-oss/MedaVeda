package `in`.medveda.offline

/** Shared native lifecycle gate; no persistent initialization. */
internal object AndroidVaultLifecycle {
  internal val session=OwnerSession()
  val leases=NativeLeases(session)
  fun invalidate() { leases.invalidate() }
}

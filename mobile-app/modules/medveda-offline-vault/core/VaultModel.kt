package `in`.medveda.offline

import java.io.ByteArrayOutputStream
import java.io.DataOutputStream
import javax.crypto.SecretKey

/** Deliberately contains no original exception, metadata, URL, path or key. */
class VaultFailure : Exception("Offline vault unavailable")

internal inline fun <T> safely(block: () -> T): T = try { block() } catch (_: Exception) { throw VaultFailure() }
internal fun requireVault(ok: Boolean) { if (!ok) throw VaultFailure() }

fun interface OwnerKeyProvider {
  /** Lookup only: must not provision/replace a missing, locked or lost key. */
  fun key(owner: String, epoch: Int): SecretKey
}

data class PdfMetadata(val owner: String, val note: String, val version: Long,
                       val length: Long, val keyEpoch: Int, val identity: String) {
  internal fun encoded(): ByteArray = safely {
    requireVault(IDENTIFIER.matches(owner) && IDENTIFIER.matches(note))
    requireVault(IDENTITY.matches(identity) && version > 0 && keyEpoch > 0)
    requireVault(length in 5..MAX_PDF_BYTES)
    ByteArrayOutputStream().also { bytes ->
      DataOutputStream(bytes).use { out ->
        for (text in listOf(owner,note)) { val b=text.toByteArray(Charsets.UTF_8);out.writeShort(b.size);out.write(b) }
        out.writeLong(version);out.writeLong(length);out.writeInt(keyEpoch)
        val b=identity.toByteArray(Charsets.UTF_8);out.writeShort(b.size);out.write(b)
      }
    }.toByteArray()
  }
}

internal val IDENTIFIER = Regex("[A-Za-z0-9_.:-]{1,128}")
internal val IDENTITY = Regex("[A-Za-z0-9_.:-]{1,256}")
const val CHUNK_BYTES = 262144
const val MAX_PDF_BYTES = 104857600L
data class VerifiedPdf(val metadata: PdfMetadata, val fileId: String, val sha256: String)

class Ticket internal constructor(internal val source: Any, internal val epoch: Long, internal val owner: String)

/** Native admission primitive. Future auth integration must bind claim to trusted auth. */
class OwnerSession {
  private val identity = Any()
  private var epoch = 0L
  private var owner: String? = null

  @Synchronized fun claim(owner: String): Ticket {
    requireVault(IDENTIFIER.matches(owner) && epoch < Long.MAX_VALUE)
    epoch++;this.owner=owner
    return Ticket(identity,epoch,owner)
  }
  @Synchronized fun revoke() { owner=null; if(epoch<Long.MAX_VALUE) epoch++ }
  @Synchronized fun check(ticket: Ticket) {
    requireVault(ticket.source === identity && ticket.epoch == epoch && ticket.owner == owner)
  }
  /** Revocation and final publication cannot pass each other. No network/crypto in lock. */
  @Synchronized internal fun <T> commit(ticket: Ticket, action: () -> T): T { check(ticket);return action() }
}

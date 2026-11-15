package `in`.medveda.offline

import java.security.SecureRandom
import java.util.UUID
import javax.crypto.SecretKey
import javax.crypto.spec.SecretKeySpec

interface WrappingKeys {
  /** Explicit creation only. Refuse any existing alias; never replace on lookup failure. */
  fun create(alias:String)
  fun lookup(alias:String):SecretKey
}

/** One serialized coordinator per registry; no JS authorization is inferred here. */
class OwnerKeys(private val registry:EncryptedRegistry,private val wrapping:WrappingKeys):OwnerKeyProvider {
  private fun aad(r:KeyRecord)="MVOWNER001:${r.owner}:${r.epoch}:${r.alias}:${r.directory}".toByteArray(Charsets.US_ASCII)
  @Synchronized fun provision(owner:String,epoch:Int)=safely {
    requireVault(IDENTIFIER.matches(owner) && epoch>0)
    val old=registry.entries();requireVault(old.none {it.owner==owner && it.epoch==epoch})
    val r=KeyRecord(owner,epoch,UUID.randomUUID().toString().replace("-",""),
      UUID.randomUUID().toString().replace("-",""),KeyState.PENDING,ByteArray(0))
    registry.append(old+r) // durable intent BEFORE any key-store creation
    wrapping.create(r.alias)
    val bytes=ByteArray(32);SecureRandom().nextBytes(bytes)
    try {
      val envelope=Envelope.seal(wrapping.lookup(r.alias),bytes,aad(r))
      val verified=Envelope.open(wrapping.lookup(r.alias),envelope,aad(r))
      try {requireVault(MessageDigestEqual(bytes,verified))} finally {verified.fill(0)}
      registry.append(old+r.copy(state=KeyState.ACTIVE,wrapped=envelope))
    } finally {bytes.fill(0)}
  }
  @Synchronized override fun key(owner:String,epoch:Int):SecretKey=safely {
    val r=registry.entries().singleOrNull {it.owner==owner && it.epoch==epoch}?:throw VaultFailure()
    requireVault(r.state==KeyState.ACTIVE)
    val bytes=Envelope.open(wrapping.lookup(r.alias),r.wrapped,aad(r))
    try {requireVault(bytes.size==32);SecretKeySpec(bytes,"AES")} finally {bytes.fill(0)}
  }
  /** Durable deny tombstone only. Secure key deletion requires a later cleanup protocol. */
  @Synchronized fun retire(owner:String,epoch:Int)=safely {
    val entries=registry.entries();val r=entries.singleOrNull {it.owner==owner && it.epoch==epoch}?:throw VaultFailure()
    requireVault(r.state==KeyState.ACTIVE)
    registry.append(entries.map {if(it===r)it.copy(state=KeyState.RETIRED) else it})
  }
  private fun MessageDigestEqual(a:ByteArray,b:ByteArray)=java.security.MessageDigest.isEqual(a,b)
}

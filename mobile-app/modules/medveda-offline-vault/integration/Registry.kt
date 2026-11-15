package `in`.medveda.offline

import java.io.*
import java.nio.ByteBuffer
import java.security.MessageDigest
import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Store must publish immutably, force the file and containing directory, or throw. */
interface GenerationStore {
  fun generations():List<Long>
  fun read(generation:Long):ByteArray
  fun publish(generation:Long,bytes:ByteArray)
}
enum class KeyState { PENDING, ACTIVE, RETIRED }
data class KeyRecord(val owner:String,val epoch:Int,val alias:String,val directory:String,
                     val state:KeyState,val wrapped:ByteArray)

internal object Envelope {
  fun seal(key:SecretKey,plain:ByteArray,aad:ByteArray):ByteArray {
    val c=Cipher.getInstance("AES/GCM/NoPadding")
    // Provider generates the nonce, including Android Keystore randomized encryption.
    c.init(Cipher.ENCRYPT_MODE,key);requireVault(c.iv.size==12)
    c.updateAAD(aad);return c.iv+c.doFinal(plain)
  }
  fun open(key:SecretKey,bytes:ByteArray,aad:ByteArray):ByteArray {
    requireVault(bytes.size>=28)
    val c=Cipher.getInstance("AES/GCM/NoPadding")
    c.init(Cipher.DECRYPT_MODE,key,GCMParameterSpec(128,bytes.copyOfRange(0,12)))
    c.updateAAD(aad);return c.doFinal(bytes,12,bytes.size-12)
  }
}

/** Immutable full-state journal. No automatic reset, rollback fallback, compaction or deletion. */
class EncryptedRegistry private constructor(private val store:GenerationStore,private val key:SecretKey) {
  private var sequence=0L
  private var digest=ByteArray(32)
  private var records=listOf<KeyRecord>()
  private var healthy=true
  companion object {
    const val MAX_GENERATIONS=4096L
    const val MAX_BYTES=1048576
    private val magic="MVREG001".toByteArray(Charsets.US_ASCII)
    fun initialize(store:GenerationStore,key:SecretKey):EncryptedRegistry=safely {
      requireVault(store.generations().isEmpty())
      EncryptedRegistry(store,key).also {it.append(emptyList())}
    }
    fun open(store:GenerationStore,key:SecretKey):EncryptedRegistry=safely {
      val generations=store.generations();requireVault(generations.isNotEmpty() && generations.size<=MAX_GENERATIONS)
      val r=EncryptedRegistry(store,key)
      for(g in generations) {
        requireVault(g==r.sequence+1)
        val b=store.read(g);requireVault(b.size in 80..MAX_BYTES)
        val header=b.copyOfRange(0,48)
        requireVault(header.copyOfRange(0,8).contentEquals(magic))
        requireVault(ByteBuffer.wrap(header,8,8).long==g && header.copyOfRange(16,48).contentEquals(r.digest))
        val plain=Envelope.open(key,b.copyOfRange(48,b.size),header)
        try {r.records=decode(plain)} finally {plain.fill(0)}
        r.sequence=g;r.digest=MessageDigest.getInstance("SHA-256").digest(b)
      }
      r
    }
    private fun validate(records:List<KeyRecord>) {
      requireVault(records.size<=1024 && records.map {it.owner to it.epoch}.distinct().size==records.size)
      requireVault(records.map {it.alias}.distinct().size==records.size && records.map {it.directory}.distinct().size==records.size)
      for(r in records) {
        requireVault(IDENTIFIER.matches(r.owner) && r.epoch>0)
        requireVault(Regex("[0-9a-f]{32}").matches(r.alias) && Regex("[0-9a-f]{32}").matches(r.directory))
        requireVault(if(r.state==KeyState.PENDING)r.wrapped.isEmpty() else r.wrapped.size==60)
      }
    }
    private fun encode(records:List<KeyRecord>):ByteArray {
      validate(records)
      return ByteArrayOutputStream().also {b->DataOutputStream(b).use {o->
        o.writeInt(records.size)
        for(r in records) {o.writeUTF(r.owner);o.writeInt(r.epoch);o.writeUTF(r.alias);o.writeUTF(r.directory)
          o.writeByte(r.state.ordinal);o.writeInt(r.wrapped.size);o.write(r.wrapped)}
      }}.toByteArray()
    }
    private fun decode(bytes:ByteArray):List<KeyRecord> = DataInputStream(ByteArrayInputStream(bytes)).use {i->
      val count=i.readInt();requireVault(count in 0..1024)
      val result=(0 until count).map {
        val owner=i.readUTF();val epoch=i.readInt();val alias=i.readUTF();val dir=i.readUTF()
        val state=i.readUnsignedByte();requireVault(state in 0..2)
        val size=i.readInt();requireVault(size==0 || size==60)
        val wrapped=ByteArray(size);i.readFully(wrapped)
        KeyRecord(owner,epoch,alias,dir,KeyState.entries[state],wrapped)
      }
      requireVault(i.read()==-1);validate(result);result
    }
  }
  @Synchronized fun entries():List<KeyRecord> = safely {
    requireVault(healthy);records.map {it.copy(wrapped=it.wrapped.copyOf())}
  }
  /** Internal trusted coordinator only. Caller serializes read/modify/write transactions. */
  @Synchronized internal fun append(next:List<KeyRecord>) = safely {
    requireVault(healthy && sequence<MAX_GENERATIONS)
    val plain=encode(next)
    try {
      val g=sequence+1
      val h=ByteBuffer.allocate(48).put(magic).putLong(g).put(digest).array()
      val bytes=h+Envelope.seal(key,plain,h);requireVault(bytes.size<=MAX_BYTES)
      // Once publication starts, any uncertainty requires a fresh authenticated reopen.
      healthy=false;store.publish(g,bytes)
      records=next.map {it.copy(wrapped=it.wrapped.copyOf())};sequence=g
      digest=MessageDigest.getInstance("SHA-256").digest(bytes);healthy=true
    } finally {plain.fill(0)}
  }
}

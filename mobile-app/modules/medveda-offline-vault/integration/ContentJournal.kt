package `in`.medveda.offline

import java.io.*
import java.nio.ByteBuffer
import java.security.MessageDigest
import javax.crypto.SecretKey

data class ContentEntry(val fileId:String,val metadata:PdfMetadata,val revoked:Boolean=false)

/** Ciphertext-only immutable catalog. Must share the controller's exclusive OS lock.
 * Complete generations are authoritative after ambiguous acknowledgement; parts are
 * ignored. Missing/corrupt finals deny, never roll back to an earlier snapshot.
 * This is not protection against whole-directory rollback by a privileged attacker.
 */
class ContentJournal private constructor(private val store:GenerationStore,private val key:SecretKey) {
 private var sequence=0L
 private var digest=ByteArray(32)
 private var content=listOf<ContentEntry>()
 private var healthy=true
 companion object {
  private val magic="MVCAT001".toByteArray(Charsets.US_ASCII)
  fun create(store:GenerationStore,key:SecretKey):ContentJournal=safely {
   requireVault(store.generations().isEmpty());ContentJournal(store,key).also {it.publish(emptyList())}
  }
  fun open(store:GenerationStore,key:SecretKey):ContentJournal=safely {
   val result=ContentJournal(store,key);val generations=store.generations()
   requireVault(generations.isNotEmpty() && generations.size<=EncryptedRegistry.MAX_GENERATIONS)
   for(g in generations) {
    requireVault(g==result.sequence+1)
    val bytes=store.read(g);requireVault(bytes.size in 80..EncryptedRegistry.MAX_BYTES)
    val header=bytes.copyOfRange(0,48)
    requireVault(header.copyOfRange(0,8).contentEquals(magic))
    requireVault(ByteBuffer.wrap(header,8,8).long==g && header.copyOfRange(16,48).contentEquals(result.digest))
    val plain=Envelope.open(key,bytes.copyOfRange(48,bytes.size),header)
    try {result.content=decode(plain)}finally {plain.fill(0)}
    result.sequence=g;result.digest=MessageDigest.getInstance("SHA-256").digest(bytes)
   };result
  }
  private fun validate(entries:List<ContentEntry>) {
   requireVault(entries.size<=1024 && entries.map {it.fileId}.distinct().size==entries.size)
   for(e in entries) {requireVault(Regex("[a-f0-9]{32}").matches(e.fileId));e.metadata.encoded()}
  }
  private fun encode(entries:List<ContentEntry>):ByteArray {
   validate(entries)
   return ByteArrayOutputStream().also {buffer->DataOutputStream(buffer).use {out->
    out.writeInt(entries.size)
    for(e in entries) {val m=e.metadata;out.writeUTF(e.fileId);out.writeUTF(m.owner);out.writeUTF(m.note)
     out.writeLong(m.version);out.writeLong(m.length);out.writeInt(m.keyEpoch);out.writeUTF(m.identity);out.writeBoolean(e.revoked)}
   }}.toByteArray()
  }
  private fun decode(bytes:ByteArray):List<ContentEntry> = DataInputStream(ByteArrayInputStream(bytes)).use {input->
   val count=input.readInt();requireVault(count in 0..1024)
   val entries=(0 until count).map {ContentEntry(input.readUTF(),PdfMetadata(input.readUTF(),input.readUTF(),input.readLong(),input.readLong(),input.readInt(),input.readUTF()),input.readBoolean())}
   requireVault(input.read()==-1);validate(entries);entries
  }
 }
 @Synchronized fun entries():List<ContentEntry> = safely {requireVault(healthy);content.toList()}
 @Synchronized fun commit(entry:ContentEntry)=safely {
  requireVault(healthy && content.none {it.fileId==entry.fileId});publish(content+entry)
 }
 @Synchronized fun revoke(entry:ContentEntry)=safely {
  requireVault(healthy && content.any {it==entry});publish(content.map {if(it==entry)it.copy(revoked=true) else it})
 }
 private fun publish(next:List<ContentEntry>) {
  requireVault(healthy && sequence<EncryptedRegistry.MAX_GENERATIONS)
  val plain=encode(next)
  try {
   val g=sequence+1;val h=ByteBuffer.allocate(48).put(magic).putLong(g).put(digest).array()
   val bytes=h+Envelope.seal(key,plain,h);requireVault(bytes.size<=EncryptedRegistry.MAX_BYTES)
   healthy=false;store.publish(g,bytes)
   content=next.toList();sequence=g;digest=MessageDigest.getInstance("SHA-256").digest(bytes);healthy=true
  }finally {plain.fill(0)}
 }
}

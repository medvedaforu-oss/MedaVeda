package `in`.medveda.offline
import java.nio.file.*
import java.nio.channels.FileChannel
import javax.crypto.spec.SecretKeySpec
fun main(args:Array<String>) {
 val path=Path.of(args[1]);val key=SecretKeySpec(ByteArray(32){0x61},"AES")
 val entry=ContentEntry("c".repeat(32),PdfMetadata("A","note",1,5,1,"sha256:"+"d".repeat(64)))
 when(args[0]) {
  "init"->ContentJournal.create(DurableGenerations.create(path),key)
  "kill"->{
   val boundary=args[2].toInt();var stage=0
   val io=object:Durability {
    private fun halt(){if(++stage==boundary)Runtime.getRuntime().halt(73)}
    override fun forceFile(channel:FileChannel){JvmDurability.forceFile(channel);halt()}
    override fun linkNew(part:Path,target:Path){JvmDurability.linkNew(part,target);halt()}
    override fun forceDirectory(path:Path){JvmDurability.forceDirectory(path);halt()}
   }
   ContentJournal.open(DurableGenerations.open(path,io),key).commit(entry)
  }
  "reopen"->{val entries=ContentJournal.open(DurableGenerations.open(path),key).entries()
   check(entries==if(args[2].toInt()==1)emptyList<ContentEntry>() else listOf(entry))
   println("PASS content journal halt/reopen boundary ${args[2]}")}
 }
}

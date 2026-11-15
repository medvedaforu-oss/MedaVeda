package `in`.medveda.offline

import javax.crypto.KeyGenerator
import javax.crypto.SecretKey

private fun key():SecretKey=KeyGenerator.getInstance("AES").apply {init(256)}.generateKey()
private fun deny(block:()->Unit) { try {block()} catch(e:VaultFailure) {check(e.cause==null);return};error("Expected denial") }
private class MemoryStore:GenerationStore {
  val files=linkedMapOf<Long,ByteArray>();var fail=false
  override fun generations()=files.keys.sorted()
  override fun read(generation:Long)=files.getValue(generation).copyOf()
  override fun publish(generation:Long,bytes:ByteArray) {check(!files.containsKey(generation));files[generation]=bytes.copyOf();if(fail)throw java.io.IOException("secret path")}
}
private class TestKeys:WrappingKeys {
  val keys=mutableMapOf<String,SecretKey>();var crash=false
  override fun create(alias:String) {check(!keys.containsKey(alias));keys[alias]=key();if(crash)throw java.io.IOException("keystore unavailable")}
  override fun lookup(alias:String)=keys[alias]?:throw VaultFailure()
}
fun main(args:Array<String>) {
  if(args.isNotEmpty()) {
    val path=java.nio.file.Path.of(args[2]);val root=javax.crypto.spec.SecretKeySpec(ByteArray(32){0x53},"AES")
    if(args[0]=="crash") {
      val store=DurableGenerations.create(path);EncryptedRegistry.initialize(store,root)
      java.nio.file.Files.write(path.parent.resolve("baseline"),java.nio.file.Files.readAllBytes(path.resolve("00000001.reg")))
      val io=object:Durability {
        override fun forceFile(c:java.nio.channels.FileChannel) {JvmDurability.forceFile(c);if(args[1]=="file")Runtime.getRuntime().halt(91)}
        override fun linkNew(p:java.nio.file.Path,t:java.nio.file.Path) {JvmDurability.linkNew(p,t);if(args[1]=="link")Runtime.getRuntime().halt(91)}
        override fun forceDirectory(p:java.nio.file.Path) {JvmDurability.forceDirectory(p);if(args[1]=="directory")Runtime.getRuntime().halt(91)}
      }
      val r=EncryptedRegistry.open(DurableGenerations.open(path,io),root)
      OwnerKeys(r,TestKeys()).provision("pending-A",1)
      error("Crash boundary not reached")
    } else {
      check(java.nio.file.Files.readAllBytes(path.parent.resolve("baseline")).contentEquals(java.nio.file.Files.readAllBytes(path.resolve("00000001.reg"))))
      val r=EncryptedRegistry.open(DurableGenerations.open(path),root)
      if(args[1]=="file")check(r.entries().isEmpty()) else check(r.entries().single().state==KeyState.PENDING)
      println("PASS journal process-halt/reopen ${args[1]}: previous generation preserved; pending never ready")
    }
    return
  }
  var passed=0
  fun test(name:String,block:()->Unit) {block();passed++;println("PASS $name")}
  test("registry authenticates chained generations and owner key isolation") {
    val store=MemoryStore();val root=key();val registry=EncryptedRegistry.initialize(store,root)
    val keys=TestKeys();val owners=OwnerKeys(registry,keys)
    owners.provision("A",1);owners.provision("B",1)
    val a=owners.key("A",1).encoded;check(!a.contentEquals(owners.key("B",1).encoded))
    val reopened=OwnerKeys(EncryptedRegistry.open(store,root),keys)
    check(a.contentEquals(reopened.key("A",1).encoded));deny {reopened.key("A",2)}
    deny {reopened.provision("A",1)};check(keys.keys.size==2)
  }
  test("missing keys never regenerate and retired owner stays denied after restart") {
    val s=MemoryStore();val root=key();val r=EncryptedRegistry.initialize(s,root);val k=TestKeys();val o=OwnerKeys(r,k)
    o.provision("A",1);o.provision("B",1);k.keys.remove(r.entries().first {it.owner=="A"}.alias)
    deny {o.key("A",1)};check(k.keys.size==1);o.retire("B",1);deny {o.key("B",1)}
    check(k.keys.size==1) // retirement is a durable tombstone, never destructive deletion
    deny {OwnerKeys(EncryptedRegistry.open(s,root),k).key("B",1)}
    o.provision("B",2);check(o.key("B",2).encoded.size==32)
    deny {o.key("B",1)} // new epoch never revives retired owner keys
  }
  test("interrupted provisioning remains pending and cannot silently replace a key") {
    val s=MemoryStore();val root=key();val r=EncryptedRegistry.initialize(s,root);val k=TestKeys();k.crash=true
    deny {OwnerKeys(r,k).provision("A",1)}
    val reopened=EncryptedRegistry.open(s,root);check(reopened.entries().single().state==KeyState.PENDING)
    k.crash=false;val o=OwnerKeys(reopened,k);deny {o.provision("A",1)};deny {o.key("A",1)};check(k.keys.size==1)
    o.provision("B",1);check(o.key("B",1).encoded.size==32)
  }
  test("corrupt missing wrong-key and discontinuous registry fail closed") {
    val s=MemoryStore();val root=key();val r=EncryptedRegistry.initialize(s,root);val k=TestKeys();OwnerKeys(r,k).provision("A",1)
    deny {EncryptedRegistry.open(s,key())};val original=s.files.getValue(2).copyOf()
    s.files[2]!![20]=(s.files[2]!![20].toInt() xor 1).toByte();deny {EncryptedRegistry.open(s,root)}
    s.files[2]=original;s.files.remove(1);deny {EncryptedRegistry.open(s,root)}
    deny {EncryptedRegistry.open(MemoryStore(),root)}
  }
  test("uncertain publication poisons live state and reopens authenticated orphan") {
    val s=MemoryStore();val root=key();val r=EncryptedRegistry.initialize(s,root);s.fail=true
    deny {OwnerKeys(r,TestKeys()).provision("A",1)};deny {r.entries()}
    check(EncryptedRegistry.open(s,root).entries().single().state==KeyState.PENDING)
  }
  test("native resource leases revoke epoch before cleanup and retry failures") {
    val session=OwnerSession();val leases=NativeLeases(session);val a=leases.claim("A")
    var attempts=0;leases.attach(a,AutoCloseable {attempts++;deny {session.check(a)};if(attempts==1)throw java.io.IOException()})
    deny {leases.invalidate()};deny {leases.claim("B")};deny {session.check(a)}
    leases.invalidate();val b=leases.claim("B");session.check(b);check(attempts==2)
    deny {leases.attach(a,AutoCloseable {})};leases.invalidate();deny {session.check(b)}
  }
  test("foreign session and duplicate active lease denied") {
    val s=OwnerSession();val leases=NativeLeases(s);val a=leases.claim("A")
    deny {leases.attach(OwnerSession().claim("A"),AutoCloseable {})}
    leases.attach(a,AutoCloseable {});deny {leases.attach(a,AutoCloseable {})};leases.invalidate()
  }
  test("durable journal reopens, preserves finals, denies collisions and symlinks") {
    val parent=java.nio.file.Files.createTempDirectory("medveda-phase1b-durable-")
    val path=parent.resolve("registry")
    val store=DurableGenerations.create(path);val root=key()
    EncryptedRegistry.initialize(store,root)
    val original=java.nio.file.Files.readAllBytes(path.resolve("00000001.reg"))
    deny {store.publish(1,ByteArray(80))}
    check(original.contentEquals(java.nio.file.Files.readAllBytes(path.resolve("00000001.reg"))))
    check(EncryptedRegistry.open(DurableGenerations.open(path),root).entries().isEmpty())
    java.nio.file.Files.createSymbolicLink(path.resolve("00000002.reg"),path.resolve("00000001.reg"))
    deny {EncryptedRegistry.open(DurableGenerations.open(path),root)}
  }
  test("owner envelope substitution and registry tail corruption deny") {
    val s=MemoryStore();val root=key();val r=EncryptedRegistry.initialize(s,root);val k=TestKeys();val o=OwnerKeys(r,k)
    o.provision("A",1);o.provision("B",1)
    val entries=r.entries();val a=entries.first {it.owner=="A"}
    r.append(entries.map {if(it.owner=="B")it.copy(wrapped=a.wrapped) else it})
    deny {o.key("B",1)};check(o.key("A",1).encoded.size==32)
    val last=s.files.keys.max();s.files[last]=s.files.getValue(last).dropLast(1).toByteArray()
    deny {EncryptedRegistry.open(s,root)}
  }
  test("every byte mutation and truncation of first registry generation denies reopen") {
    val s=MemoryStore();val root=key();EncryptedRegistry.initialize(s,root)
    val original=s.files.getValue(1).copyOf()
    for(index in original.indices) {
      val changed=original.copyOf();changed[index]=(changed[index].toInt() xor 1).toByte()
      s.files[1]=changed;deny {EncryptedRegistry.open(s,root)}
    }
    for(length in original.indices) {s.files[1]=original.copyOf(length);deny {EncryptedRegistry.open(s,root)}}
    s.files[1]=original;check(EncryptedRegistry.open(s,root).entries().isEmpty())
  }
  test("directory flush failure preserves prior journal and requires reopen") {
    val parent=java.nio.file.Files.createTempDirectory("medveda-phase1b-fsync-")
    val path=parent.resolve("registry");val root=key()
    EncryptedRegistry.initialize(DurableGenerations.create(path),root)
    val old=java.nio.file.Files.readAllBytes(path.resolve("00000001.reg"))
    val io=object:Durability {
      override fun forceFile(channel:java.nio.channels.FileChannel)=JvmDurability.forceFile(channel)
      override fun linkNew(part:java.nio.file.Path,target:java.nio.file.Path)=JvmDurability.linkNew(part,target)
      override fun forceDirectory(path:java.nio.file.Path) {throw java.io.IOException("private path")}
    }
    val r=EncryptedRegistry.open(DurableGenerations.open(path,io),root)
    deny {OwnerKeys(r,TestKeys()).provision("A",1)};deny {r.entries()}
    check(old.contentEquals(java.nio.file.Files.readAllBytes(path.resolve("00000001.reg"))))
    check(EncryptedRegistry.open(DurableGenerations.open(path),root).entries().single().state==KeyState.PENDING)
  }
  println("$passed Phase 1B shared-control groups passed; NOT native platform acceptance")
}

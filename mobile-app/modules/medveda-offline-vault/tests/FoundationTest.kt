package `in`.medveda.offline

import java.io.*
import java.nio.ByteBuffer
import java.nio.file.*
import java.security.SecureRandom
import javax.crypto.SecretKey
import javax.crypto.spec.SecretKeySpec

private var passed = 0
private fun test(name: String, body: () -> Unit) { body(); passed++; println("PASS $name") }
private inline fun denied(body: () -> Unit) {
  try { body() } catch (e: VaultFailure) {
    check(e.message == "Offline vault unavailable" && e.cause==null && e.suppressed.isEmpty()); return
  }
  error("Expected safe failure")
}
private val keys = OwnerKeyProvider { owner, epoch ->
  if (owner != "owner-a" || epoch != 1) throw VaultFailure()
  SecretKeySpec(ByteArray(32) { 0x42 }, "AES")
}
private fun meta(n: Long = 262151) = PdfMetadata("owner-a", "note-1", 3, n, 1, "sha256:synthetic-v3")
private class Synthetic(private val length: Long, private val session: OwnerSession? = null) : InputStream() {
  private var at = 0L
  override fun read(): Int {
    if (at == length) return -1
    val i = at++
    return if (i < 5) "%PDF-"[i.toInt()].code else (i % 251).toInt()
  }
  override fun read(b: ByteArray, off: Int, len: Int): Int {
    check(len <= 262144) // catches full-response reads, including verification.
    if (at == length) return -1
    val n = minOf(len.toLong(), length - at).toInt()
    repeat(n) { b[off + it] = read().toByte() }
    if (session != null && at >= 262144) session.revoke()
    return n
  }
}
private fun bytes(m: PdfMetadata, s: OwnerSession, t: Ticket): ByteArray = ByteArrayOutputStream().also {
  PdfContainer.write(Synthetic(m.length), it, m, keys.key(m.owner, m.keyEpoch), t, s)
}.toByteArray()
private fun verify(b: ByteArray, m: PdfMetadata, s: OwnerSession, t: Ticket) =
  PdfContainer.verify(ByteArrayInputStream(b), m, keys.key(m.owner, m.keyEpoch), t, s)
private fun intAt(b: ByteArray, at: Int) = ByteBuffer.wrap(b, at, 4).int
private fun dataAt(b: ByteArray) = 96 + intAt(b, 92)
private fun deleteTestTree(root: Path) {
  check(root.toString().startsWith(System.getProperty("java.io.tmpdir")))
  Files.walk(root).use { it.sorted(Comparator.reverseOrder()).forEach(Files::delete) }
}

private fun crashCase(stage:String,root:Path) {
  check(root.toString().startsWith(System.getProperty("java.io.tmpdir")))
  val s=OwnerSession();val t=s.claim("owner-a")
  val io=object:Durability by JvmDurability {
    var armed=false;var dirCalls=0
    override fun forceFile(channel:java.nio.channels.FileChannel) {
      JvmDurability.forceFile(channel);if(armed && stage=="file")Runtime.getRuntime().halt(91)
    }
    override fun linkNew(part:Path,target:Path) {
      JvmDurability.linkNew(part,target);if(armed && stage=="link")Runtime.getRuntime().halt(91)
    }
    override fun forceDirectory(path:Path) {
      JvmDurability.forceDirectory(path)
      if(armed) {
        dirCalls++
        if((stage=="directory" && dirCalls==1)||(stage=="cleanup" && dirCalls==2))Runtime.getRuntime().halt(91)
      }
    }
  }
  val v=AtomicVault.create(root,keys,s,io);val id=v.seal(Synthetic(5),meta(5),t)
  val digest=java.security.MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(root.resolve("$id.mvp")))
  Files.writeString(root.parent.resolve("${root.fileName}.baseline"),id+"\n"+digest.joinToString(""){"%02x".format(it)})
  io.armed=true;v.seal(Synthetic(5),meta(5),t)
  error("crash stage never reached")
}

fun main(args:Array<String>) {
  if(args.firstOrNull()=="crash") {crashCase(args[1],Path.of(args[2]));return}
  if(args.firstOrNull()=="recover") {
    val root=Path.of(args[1]);val ss=OwnerSession();val tt=ss.claim("owner-a");val v=AtomicVault.open(root,keys,ss)
    Files.list(root).use { it.filter { p->p.toString().endsWith(".mvp") }.forEach {
      check(v.verify(it.fileName.toString().removeSuffix(".mvp"),meta(5),tt).metadata==meta(5))
    } }
    println("PASS restart authenticates committed/orphan ciphertext and ignores partials");return
  }
  val s = OwnerSession(); val t = s.claim("owner-a"); val m = meta(); val valid = bytes(m, s, t)
  test("independent Node-generated wire fixture authenticates with native codec") {
    val fixture=Path.of(args.single()).resolve("reference.mvp")
    val reference=Files.readAllBytes(fixture)
    val r=verify(reference,meta(5),s,t)
    check(r.fileId=="11".repeat(16))
    Files.write(fixture.parent.resolve("kotlin.mvp"),bytes(meta(5),s,t),StandardOpenOption.CREATE_NEW)
  }
  test("roundtrip verifies complete authenticated identity and exact digest") {
    val r = verify(valid, m, s, t)
    check(r.metadata == m && r.sha256.length == 64 && r.fileId.length == 32)
    val digest = java.security.MessageDigest.getInstance("SHA-256")
    Synthetic(m.length).use { input -> val b = ByteArray(8192); while (true) {
      val n = input.read(b); if (n < 0) break; digest.update(b, 0, n)
    } }
    check(r.sha256 == digest.digest().joinToString("") { "%02x".format(it) })
  }
  test("all authenticated header regions reject mutation") {
    for (offset in listOf(0, 7, 8, 24, 28, 32, 44, 80, 92, 96, dataAt(valid) - 1)) {
      val changed = valid.clone(); changed[offset] = (changed[offset].toInt() xor 1).toByte()
      denied { verify(changed, m, s, t) }
    }
  }
  test("wrong owner note version length epoch and content identity fail closed") {
    for (other in listOf(m.copy(owner="owner-b"), m.copy(note="note-2"), m.copy(version=4),
      m.copy(length=m.length+1), m.copy(keyEpoch=2), m.copy(identity="changed"))) {
      denied { PdfContainer.verify(ByteArrayInputStream(valid), other,
        SecretKeySpec(ByteArray(32) { 0x42 }, "AES"), t, s) }
    }
    denied { PdfContainer.verify(ByteArrayInputStream(valid), m, SecretKeySpec(ByteArray(32), "AES"), t, s) }
  }
  test("chunk order lengths ciphertext tags and completion are authenticated") {
    val first = dataAt(valid); val second = first + 13 + 262144 + 16
    for (offset in listOf(first, first+8, first+9, first+13, second-1, second, valid.size-1)) {
      val b = valid.clone(); b[offset] = (b[offset].toInt() xor 1).toByte(); denied { verify(b,m,s,t) }
    }
    val b = valid.clone(); ByteBuffer.wrap(b,first+9,4).putInt(Int.MAX_VALUE)
    denied { verify(b,m,s,t) }
    // Omit first chunk, duplicate first chunk, and put final record first.
    val one = valid.copyOfRange(first,second)
    denied { verify(valid.copyOfRange(0,first)+valid.copyOfRange(second,valid.size),m,s,t) }
    denied { verify(valid.copyOfRange(0,second)+one+valid.copyOfRange(second,valid.size),m,s,t) }
    val final = second + 13 + 7 + 16
    denied { verify(valid.copyOfRange(0,first)+valid.copyOfRange(final,valid.size)+valid.copyOfRange(first,final),m,s,t) }
  }
  test("equal-size reordered chunks and another file's valid chunks cannot substitute") {
    val mm=meta(524293);val a=bytes(mm,s,t);val b=bytes(mm,s,t)
    val at=dataAt(a);val bAt=dataAt(b);val size=13+262144+16
    val swapped=a.copyOfRange(0,at)+a.copyOfRange(at+size,at+size*2)+
      a.copyOfRange(at,at+size)+a.copyOfRange(at+size*2,a.size)
    denied {verify(swapped,mm,s,t)}
    val substituted=a.copyOfRange(0,at)+b.copyOfRange(bAt,bAt+size)+a.copyOfRange(at+size,a.size)
    denied {verify(substituted,mm,s,t)}
  }
  test("truncation at structural boundaries and trailing bytes are rejected") {
    val first=dataAt(valid)
    for (end in listOf(0,7,31,43,91,95,first-1,first,first+12,first+13,valid.size-1))
      denied { verify(valid.copyOf(end),m,s,t) }
    denied { verify(valid+byteArrayOf(0),m,s,t) }
  }
  test("every truncation and single-byte mutation of minimal container fails closed") {
    val mm=meta(5);val b=bytes(mm,s,t)
    for(at in b.indices) {
      denied {verify(b.copyOf(at),mm,s,t)}
      val changed=b.clone();changed[at]=(changed[at].toInt() xor 1).toByte()
      denied {verify(changed,mm,s,t)}
    }
  }
  test("untrusted bounds invalid identities short long and nonPDF input reject") {
    for (bad in listOf(m.copy(length=0),m.copy(length=104857601),m.copy(version=0),
      m.copy(keyEpoch=0),m.copy(owner="../escape"),m.copy(identity="a".repeat(257))))
      denied { bytes(bad,s,t) }
    for (n in listOf(m.length-1,m.length+1)) denied {
      PdfContainer.write(Synthetic(n), ByteArrayOutputStream(),m,keys.key(m.owner,1),t,s)
    }
    denied { PdfContainer.write(ByteArrayInputStream(ByteArray(m.length.toInt())),
      ByteArrayOutputStream(),m,keys.key(m.owner,1),t,s) }
    val b=valid.clone(); ByteBuffer.wrap(b,92,4).putInt(Int.MAX_VALUE)
    denied { verify(b,m,s,t) }
  }
  test("fresh attempts use different wrapped keys file IDs and nonce material") {
    val fileIds=HashSet<String>();val wrapNonces=HashSet<String>();val dataKeys=HashSet<String>()
    fun hx(b:ByteArray)=b.joinToString(""){"%02x".format(it)}
    repeat(200) {
      val b=bytes(meta(5),s,t)
      check(fileIds.add(hx(b.copyOfRange(8,24))))
      check(wrapNonces.add(hx(b.copyOfRange(32,44))))
      // Recover only the synthetic test DEK independently to catch a constant/reused DEK.
      val cipher=javax.crypto.Cipher.getInstance("AES/GCM/NoPadding")
      cipher.init(javax.crypto.Cipher.DECRYPT_MODE,keys.key(m.owner,1),
        javax.crypto.spec.GCMParameterSpec(128,b.copyOfRange(32,44)))
      cipher.updateAAD("MVPDF/1/wrap".toByteArray()+b.copyOfRange(0,32)+meta(5).encoded())
      val dek=cipher.doFinal(b.copyOfRange(44,92))
      try {check(dataKeys.add(hx(dek)))}finally{dek.fill(0)}
    }
  }
  test("owner session revocation foreign sessions and stale tickets deny") {
    val local=OwnerSession();val a=local.claim("owner-a")
    local.claim("owner-b");denied { bytes(m,local,a) }
    denied { bytes(m,OwnerSession(),t) }
    val fresh=local.claim("owner-a")
    denied { PdfContainer.write(Synthetic(m.length,local),ByteArrayOutputStream(),m,keys.key(m.owner,1),fresh,local) }
  }
  val parent=Files.createTempDirectory("medveda-foundation-fixture-")
  try {
    val root=parent.resolve("vault");val vault=AtomicVault.create(root,keys,s)
    val sentinel=parent.resolve("existing.pdf");Files.writeString(sentinel,"existing-PDF-do-not-touch")
    test("dedicated vault publishes ciphertext only and preserves unrelated existing data") {
      val id=vault.seal(Synthetic(m.length),m,t)
      check(vault.verify(id,m,t).metadata==m)
      val content=Files.readAllBytes(root.resolve("$id.mvp"))
      check(content.copyOfRange(0,8).decodeToString()=="MVPDF001")
      check(!content.decodeToString().contains("%PDF-"))
      check(Files.readString(sentinel)=="existing-PDF-do-not-touch")
      denied { AtomicVault.create(root,keys,s) }
      denied { vault.verify("../existing",m,t) }
      denied { vault.verify("A".repeat(32),m,t) }
    }
    test("missing key short stream and write exception never publish final") {
      val bad=AtomicVault.create(parent.resolve("missing"),OwnerKeyProvider { _,_->throw VaultFailure() },s)
      denied { bad.seal(Synthetic(m.length),m,t) }
      check(Files.list(parent.resolve("missing")).use { it.count() }==1L) // marker only
      val failing=AtomicVault.create(parent.resolve("short"),keys,s)
      denied { failing.seal(Synthetic(12),m,t) }
      check(Files.list(parent.resolve("short")).use { it.noneMatch { p->p.toString().endsWith(".mvp") } })
      val boom=object:InputStream(){override fun read():Int=throw IOException("secret signed URL")}
      denied { failing.seal(boom,m,t) }
      val id=vault.seal(Synthetic(5),meta(5),t);val path=root.resolve("$id.mvp")
      val before=Files.readAllBytes(path)
      val locked=AtomicVault.open(root,OwnerKeyProvider { _,_->throw IOException("locked key details") },s)
      denied {locked.verify(id,meta(5),t)}
      check(before.contentEquals(Files.readAllBytes(path)))
    }
    test("foreign-owner metadata is rejected before any foreign key lookup") {
      var lookups=0
      val id=vault.seal(Synthetic(m.length),m,t)
      val guarded=AtomicVault.open(root,OwnerKeyProvider { owner,epoch ->lookups++;keys.key(owner,epoch) },s)
      denied { guarded.verify(id,m.copy(owner="owner-b"),t) }
      check(lookups==0)
    }
    test("A to B to A permits only the active owner's independently keyed files") {
      val session=OwnerSession()
      val separate=OwnerKeyProvider {owner,epoch ->
        if(epoch!=1 || owner !in listOf("owner-a","owner-b"))throw VaultFailure()
        SecretKeySpec(ByteArray(32){if(owner=="owner-a")0x42 else 0x43},"AES")
      }
      val v=AtomicVault.create(parent.resolve("two-owners"),separate,session)
      val a=meta(5);val b=a.copy(owner="owner-b")
      val ta=session.claim("owner-a");val idA=v.seal(Synthetic(5),a,ta)
      val tb=session.claim("owner-b");val idB=v.seal(Synthetic(5),b,tb)
      check(v.verify(idB,b,tb).metadata==b)
      denied {v.verify(idA,a,tb)};denied {v.verify(idA,b,tb)};denied {v.verify(idA,a,ta)}
      val ta2=session.claim("owner-a");check(v.verify(idA,a,ta2).metadata==a)
      denied {v.verify(idB,b,ta2)};denied {v.verify(idB,a,ta2)}
    }
    test("revocation at durable-file boundary prevents publication and old ticket reuse") {
      val session=OwnerSession();val ticket=session.claim("owner-a")
      val io=object:Durability by JvmDurability {
        var armed=false
        override fun forceFile(channel:java.nio.channels.FileChannel) {
          JvmDurability.forceFile(channel);if(armed)session.revoke()
        }
      }
      val dir=parent.resolve("revoke");val v=AtomicVault.create(dir,keys,session,io);io.armed=true
      denied { v.seal(Synthetic(m.length),m,ticket) }
      check(Files.list(dir).use { it.noneMatch { p->p.toString().endsWith(".mvp") } })
      denied { v.seal(Synthetic(m.length),m,ticket) }
    }
    test("fsync and publication failures retain only ciphertext and cannot report success") {
      for (stage in listOf("file","link","directory","cleanup")) {
        val dir=parent.resolve("fault-$stage")
        val io=object:Durability by JvmDurability {
          var armed=false;var directoryCalls=0
          override fun forceFile(channel:java.nio.channels.FileChannel) {
            if(armed && stage=="file") throw IOException("full"); JvmDurability.forceFile(channel)
          }
          override fun linkNew(part:Path,target:Path) {
            if(armed && stage=="link") throw IOException("full");JvmDurability.linkNew(part,target)
          }
          override fun forceDirectory(path:Path) {
            if(armed)directoryCalls++
            if(armed && (stage=="directory" || (stage=="cleanup" && directoryCalls==2))) throw IOException("full")
            JvmDurability.forceDirectory(path)
          }
        }
        val v=AtomicVault.create(dir,keys,s,io);io.armed=true
        denied { v.seal(Synthetic(m.length),m,t) }
        Files.list(dir).use { paths->paths.filter { it.fileName.toString()!="VAULT1" }.forEach {
          val b=Files.readAllBytes(it);check(!b.decodeToString().contains("%PDF-"))
        } }
      }
    }
    test("existing target is never clobbered by atomic publication") {
      val dir=parent.resolve("collision")
      val io=object:Durability by JvmDurability {
        override fun linkNew(part:Path,target:Path) {
          Files.writeString(target,"prior-committed-sentinel",StandardOpenOption.CREATE_NEW)
          JvmDurability.linkNew(part,target)
        }
      }
      val v=AtomicVault.create(dir,keys,s,io);denied { v.seal(Synthetic(m.length),m,t) }
      Files.list(dir).use { it.filter { p->p.toString().endsWith(".mvp") }.forEach {
        check(Files.readString(it)=="prior-committed-sentinel")
      } }
    }
    test("symlink roots and source entries cannot escape vault") {
      val link=parent.resolve("link");Files.createSymbolicLink(link,root)
      denied { AtomicVault.open(link,keys,s) }
      val fake="0".repeat(32);Files.createSymbolicLink(root.resolve("$fake.mvp"),sentinel)
      denied { vault.verify(fake,m,t) }
      check(Files.readString(sentinel)=="existing-PDF-do-not-touch")
    }
    test("new vault root parent must be durably flushed before creation reports success") {
      val io=object:Durability by JvmDurability {
        override fun forceDirectory(path:Path) {
          if(path==parent)throw IOException("parent directory sync failed")
          JvmDurability.forceDirectory(path)
        }
      }
      denied { AtomicVault.create(parent.resolve("parent-sync-failure"),keys,s,io) }
    }
    test("threaded revocation serializes after admitted commit and denies subsequent work") {
      val session=OwnerSession();val ticket=session.claim("owner-a")
      val entered=java.util.concurrent.CountDownLatch(1);val release=java.util.concurrent.CountDownLatch(1)
      val attempted=java.util.concurrent.CountDownLatch(1);val revoked=java.util.concurrent.CountDownLatch(1)
      val result=java.util.concurrent.atomic.AtomicReference<String>()
      val failure=java.util.concurrent.atomic.AtomicReference<Throwable>()
      val io=object:Durability by JvmDurability {
        var armed=false
        override fun linkNew(part:Path,target:Path) {
          if(armed) {entered.countDown();check(release.await(5,java.util.concurrent.TimeUnit.SECONDS))}
          JvmDurability.linkNew(part,target)
        }
        override fun forceDirectory(path:Path) {
          if(armed)check(revoked.count==1L) // revoker cannot cross current publication lock.
          JvmDurability.forceDirectory(path)
        }
      }
      val v=AtomicVault.create(parent.resolve("thread-race"),keys,session,io);io.armed=true
      val worker=Thread {try {result.set(v.seal(Synthetic(5),meta(5),ticket))}catch(e:Throwable){failure.set(e)}}
      worker.start();check(entered.await(5,java.util.concurrent.TimeUnit.SECONDS))
      val revoker=Thread {attempted.countDown();session.revoke();revoked.countDown()}
      revoker.start();check(attempted.await(5,java.util.concurrent.TimeUnit.SECONDS));release.countDown()
      worker.join(5000);revoker.join(5000);check(!worker.isAlive && !revoker.isAlive)
      failure.get()?.let {throw it};check(result.get()!=null && revoked.count==0L)
      denied {v.seal(Synthetic(5),meta(5),ticket)}
      check(v.verify(result.get(),meta(5),session.claim("owner-a")).metadata==meta(5))
    }
    test("stream 1 10 50 100 MiB under 48 MiB host heap without plaintext spooling") {
      for(size in listOf(1,10,50,100)) {
        val mm=meta(size*1048576L);val start=System.nanoTime();val id=vault.seal(Synthetic(mm.length),mm,t)
        check(vault.verify(id,mm,t).metadata==mm)
        println("HOST_DIAGNOSTIC sizeMiB=$size sealAndVerifyMs=${(System.nanoTime()-start)/1000000}")
      }
    }
  } finally { deleteTestTree(parent) }
  println("$passed focused foundation tests passed; no Android/iOS/device acceptance claimed")
}

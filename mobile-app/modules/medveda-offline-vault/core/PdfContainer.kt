package `in`.medveda.offline

import java.io.*
import java.nio.ByteBuffer
import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/** MVPDF/1. All payload I/O is native and bounded. No plaintext consumer API. */
object PdfContainer {
  private val magic="MVPDF001".toByteArray(Charsets.US_ASCII)
  private val random=SecureRandom()
  private fun entropy(size:Int)=ByteArray(size).also(random::nextBytes)
  private fun hash(b:ByteArray)=MessageDigest.getInstance("SHA-256").digest(b)
  private fun domain(s:String)=s.toByteArray(Charsets.US_ASCII)
  private fun hex(b:ByteArray)=b.joinToString(""){ "%02x".format(it) }
  private fun nonce(prefix:ByteArray,counter:Long)=ByteBuffer.allocate(12).put(prefix).putLong(counter).array()
  private fun record(kind:Int,index:Long,length:Int)=ByteBuffer.allocate(13).put(kind.toByte()).putLong(index).putInt(length).array()
  private fun crypt(mode:Int,key:SecretKey,nonce:ByteArray,aad:ByteArray,data:ByteArray):ByteArray {
    val cipher=Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(mode,key,GCMParameterSpec(128,nonce));cipher.updateAAD(aad)
    return cipher.doFinal(data)
  }
  private fun keyCheck(key:SecretKey) {
    requireVault(key.algorithm=="AES")
    val material=key.encoded
    if(material!=null) { try {requireVault(material.size==32)} finally {material.fill(0)} }
  }
  private fun exact(input:InputStream,n:Int):ByteArray {
    requireVault(n in 0..(CHUNK_BYTES+16))
    val b=ByteArray(n)
    try {
      var at=0
      while(at<n) {
        val read=input.read(b,at,n-at)
        if(read<0) throw VaultFailure()
        if(read==0) {val one=input.read();requireVault(one>=0);b[at++]=one.toByte()}
        else at+=read
      }
      return b
    } catch(e:Exception) {b.fill(0);throw e}
  }
  private fun admitted(meta:PdfMetadata,ticket:Ticket,session:OwnerSession) {
    session.check(ticket);requireVault(meta.owner==ticket.owner)
  }

  fun write(input:InputStream,output:OutputStream,meta:PdfMetadata,ownerKey:SecretKey,
            ticket:Ticket,session:OwnerSession):Unit = safely {
    val metadata=meta.encoded();admitted(meta,ticket,session);keyCheck(ownerKey)
    val fileId=entropy(16);val prefix=entropy(4);val wrapNonce=entropy(12);val dekBytes=entropy(32)
    try {
      val dek=SecretKeySpec(dekBytes,"AES")
      val p=magic+fileId+ByteBuffer.allocate(4).putInt(meta.keyEpoch).array()+prefix
      val wrapped=crypt(Cipher.ENCRYPT_MODE,ownerKey,wrapNonce,domain("MVPDF/1/wrap")+p+metadata,dekBytes)
      val outer=p+wrapNonce+wrapped
      val encryptedMeta=crypt(Cipher.ENCRYPT_MODE,dek,nonce(prefix,0),domain("MVPDF/1/meta")+outer,metadata)
      val header=outer+ByteBuffer.allocate(4).putInt(encryptedMeta.size).array()+encryptedMeta
      output.write(header)
      val headerHash=hash(header);val digest=MessageDigest.getInstance("SHA-256")
      var total=0L;var count=0L;var last=0
      while(total<meta.length) {
        admitted(meta,ticket,session)
        val n=minOf(CHUNK_BYTES.toLong(),meta.length-total).toInt()
        val plaintext=exact(input,n)
        try {
          if(total==0L) requireVault(plaintext.copyOfRange(0,5).contentEquals(domain("%PDF-")))
          digest.update(plaintext)
          val rec=record(1,++count,n)
          val sealed=crypt(Cipher.ENCRYPT_MODE,dek,nonce(prefix,count),domain("MVPDF/1/data")+headerHash+metadata+rec,plaintext)
          admitted(meta,ticket,session)
          output.write(rec);output.write(sealed)
        } finally {plaintext.fill(0)}
        total+=n;last=n
      }
      requireVault(input.read()==-1);admitted(meta,ticket,session)
      val manifest=ByteBuffer.allocate(52).putLong(count).putLong(total).putInt(last).put(digest.digest()).array()
      val rec=record(2,count+1,52)
      val sealed=crypt(Cipher.ENCRYPT_MODE,dek,nonce(prefix,count+1),domain("MVPDF/1/final")+headerHash+metadata+rec,manifest)
      output.write(rec);output.write(sealed);output.flush();admitted(meta,ticket,session)
    } finally {dekBytes.fill(0)}
  }

  fun verify(input:InputStream,expected:PdfMetadata,ownerKey:SecretKey,
             ticket:Ticket,session:OwnerSession):VerifiedPdf = verifyAndCopy(input,expected,ownerKey,ticket,session,null)

  /** Native private workspace only. Caller never attaches renderer until return. */
  internal fun verifyAndCopy(input:InputStream,expected:PdfMetadata,ownerKey:SecretKey,
             ticket:Ticket,session:OwnerSession,output:OutputStream?):VerifiedPdf = safely {
    val metadata=expected.encoded();admitted(expected,ticket,session);keyCheck(ownerKey)
    val outer=exact(input,92)
    requireVault(outer.copyOfRange(0,8).contentEquals(magic))
    requireVault(ByteBuffer.wrap(outer,24,4).int==expected.keyEpoch)
    val p=outer.copyOfRange(0,32);val prefix=outer.copyOfRange(28,32)
    val dekBytes=crypt(Cipher.DECRYPT_MODE,ownerKey,outer.copyOfRange(32,44),
      domain("MVPDF/1/wrap")+p+metadata,outer.copyOfRange(44,92))
    try {
      requireVault(dekBytes.size==32);val dek=SecretKeySpec(dekBytes,"AES")
      val encodedLen=exact(input,4);val metaLen=ByteBuffer.wrap(encodedLen).int
      requireVault(metaLen==metadata.size+16 && metaLen<=65536)
      val encryptedMeta=exact(input,metaLen)
      val actualMeta=crypt(Cipher.DECRYPT_MODE,dek,nonce(prefix,0),domain("MVPDF/1/meta")+outer,encryptedMeta)
      try {requireVault(MessageDigest.isEqual(actualMeta,metadata))} finally {actualMeta.fill(0)}
      val headerHash=hash(outer+encodedLen+encryptedMeta);val digest=MessageDigest.getInstance("SHA-256")
      var total=0L;var count=0L;var last=0
      while(total<expected.length) {
        admitted(expected,ticket,session)
        val n=minOf(CHUNK_BYTES.toLong(),expected.length-total).toInt()
        val rec=exact(input,13)
        requireVault(rec.contentEquals(record(1,++count,n)))
        val ciphertext=exact(input,n+16)
        val plaintext=crypt(Cipher.DECRYPT_MODE,dek,nonce(prefix,count),domain("MVPDF/1/data")+headerHash+metadata+rec,ciphertext)
        try {
          requireVault(plaintext.size==n)
          if(total==0L) requireVault(plaintext.copyOfRange(0,5).contentEquals(domain("%PDF-")))
          digest.update(plaintext)
          admitted(expected,ticket,session);output?.write(plaintext)
        } finally {plaintext.fill(0)}
        total+=n;last=n
      }
      val rec=exact(input,13);requireVault(rec.contentEquals(record(2,count+1,52)))
      val actual=crypt(Cipher.DECRYPT_MODE,dek,nonce(prefix,count+1),domain("MVPDF/1/final")+headerHash+metadata+rec,exact(input,68))
      val digestBytes=digest.digest()
      val wanted=ByteBuffer.allocate(52).putLong(count).putLong(total).putInt(last).put(digestBytes).array()
      try {requireVault(MessageDigest.isEqual(actual,wanted))} finally {actual.fill(0)}
      requireVault(input.read()==-1);admitted(expected,ticket,session)
      VerifiedPdf(expected,hex(outer.copyOfRange(8,24)),hex(digestBytes))
    } finally {dekBytes.fill(0)}
  }
}

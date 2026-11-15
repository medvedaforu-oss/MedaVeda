// Host-only independent wire implementation using Node's built-in crypto.
// Synthetic fixed keys/nonces ONLY for reproducible vectors. Never imported by app.
const fs = require('node:fs');
const path = require('node:path');
const {createCipheriv, createDecipheriv, createHash} = require('node:crypto');
const assert = require('node:assert/strict');
const dir = process.argv[3];
assert(path.isAbsolute(dir) && path.basename(dir).startsWith('medveda-vault-host-'));
const u32 = n => {const b=Buffer.alloc(4);b.writeUInt32BE(n);return b;};
const u64 = n => {const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(n));return b;};
const text = t => {const b=Buffer.from(t);const n=Buffer.alloc(2);n.writeUInt16BE(b.length);return Buffer.concat([n,b]);};
const cat = (...v) => Buffer.concat(v.map(x=>typeof x==='string'?Buffer.from(x):x));
const hash = b => createHash('sha256').update(b).digest();
const m = cat(text('owner-a'),text('note-1'),u64(3),u64(5),u32(1),text('sha256:synthetic-v3'));
const root=Buffer.alloc(32,0x42);
function seal(key,nonce,aad,plain) {
  const c=createCipheriv('aes-256-gcm',key,nonce);c.setAAD(aad);
  return cat(c.update(plain),c.final(),c.getAuthTag());
}
function open(key,nonce,aad,sealed) {
  const c=createDecipheriv('aes-256-gcm',key,nonce);c.setAAD(aad);c.setAuthTag(sealed.subarray(-16));
  return cat(c.update(sealed.subarray(0,-16)),c.final());
}
if(process.argv[2]==='generate') {
  const dek=Buffer.alloc(32,0x22), prefix=Buffer.from('33443344','hex');
  const p=cat('MVPDF001',Buffer.alloc(16,0x11),u32(1),prefix), wn=Buffer.alloc(12,0x55);
  const outer=cat(p,wn,seal(root,wn,cat('MVPDF/1/wrap',p,m),dek));
  const em=seal(dek,cat(prefix,u64(0)),cat('MVPDF/1/meta',outer),m);
  const header=cat(outer,u32(em.length),em), h=hash(header), plain=Buffer.from('%PDF-');
  const rec=cat(Buffer.from([1]),u64(1),u32(5));
  const data=seal(dek,cat(prefix,u64(1)),cat('MVPDF/1/data',h,m,rec),plain);
  const fin=cat(Buffer.from([2]),u64(2),u32(52));
  const manifest=cat(u64(1),u64(5),u32(5),hash(plain));
  const final=seal(dek,cat(prefix,u64(2)),cat('MVPDF/1/final',h,m,fin),manifest);
  fs.writeFileSync(path.join(dir,'reference.mvp'),cat(header,rec,data,fin,final),{flag:'wx',mode:0o600});
} else {
  const b=fs.readFileSync(path.join(dir,'kotlin.mvp'));
  assert.equal(b.subarray(0,8).toString(),'MVPDF001');
  const prefix=b.subarray(28,32);
  const dek=open(root,b.subarray(32,44),cat('MVPDF/1/wrap',b.subarray(0,32),m),b.subarray(44,92));
  const n=b.readUInt32BE(92), end=96+n;
  assert.deepEqual(open(dek,cat(prefix,u64(0)),cat('MVPDF/1/meta',b.subarray(0,92)),b.subarray(96,end)),m);
  const h=hash(b.subarray(0,end)), rec=b.subarray(end,end+13), dEnd=end+13+5+16;
  assert.deepEqual(rec,cat(Buffer.from([1]),u64(1),u32(5)));
  const plain=open(dek,cat(prefix,u64(1)),cat('MVPDF/1/data',h,m,rec),b.subarray(end+13,dEnd));
  assert.equal(plain.toString(),'%PDF-');
  const fin=b.subarray(dEnd,dEnd+13);
  assert.deepEqual(fin,cat(Buffer.from([2]),u64(2),u32(52)));
  assert.deepEqual(open(dek,cat(prefix,u64(2)),cat('MVPDF/1/final',h,m,fin),b.subarray(dEnd+13)),
    cat(u64(1),u64(5),u32(5),hash(plain)));
  assert.equal(b.length,dEnd+13+68);
  console.log('PASS independent Node AES-GCM codec authenticates Kotlin output');
}

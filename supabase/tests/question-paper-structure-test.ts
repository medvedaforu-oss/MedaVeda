import { PDFDocument, PDFName, PDFRef, PDFNumber } from "npm:pdf-lib@1.17.1";
import { handleAccess } from "../functions/question-paper-access/handler.ts";
let bytes: Uint8Array, receipts = 0;
const user = { auth: { getUser: () => Promise.resolve({data:{user:{id:"admin"}}}) }, rpc: () => Promise.resolve({data:true}) };
const server = { storage: { from: () => ({ download: () => Promise.resolve({ data: new Blob([bytes as BlobPart],{type:"application/pdf"}) }) }) }, from: () => ({insert: () => {receipts++;return Promise.resolve({error:null});}}) };
async function status() { return (await handleAccess(new Request("https://fixture.invalid",{method:"POST",headers:{Authorization:"Bearer fixture"},body:JSON.stringify({action:"validate",object_path:"11111111-1111-4111-8111-111111111111.pdf"})}),user,server)).status; }
Deno.test("invalid structure never issues a publication receipt",async()=>{
 const doc=await PDFDocument.create();doc.addPage();const valid=await doc.save({useObjectStreams:false});
 for(const invalid of [new TextEncoder().encode("%PDF-x"),valid.subarray(0,valid.length-12),new TextEncoder().encode("%PDF-1.7\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\nstartxref\n0\n%%EOF"),new TextEncoder().encode(new TextDecoder().decode(valid).replace(/startxref\s+\d+/,"startxref\n1"))]){
 bytes=invalid;const before=receipts;if(await status()!==422||receipts!==before)throw Error("Corrupt PDF received a receipt");
 }
});
Deno.test("single/multiple/scanned PDFs and object-stream PDFs retain individual validation",async()=>{
 for(const compressed of [false,true]){
  const doc=await PDFDocument.create();doc.addPage([200,200]);doc.addPage([200,200]);
  // One pixel image embedded on a page: scanned content need not contain text.
  const image=await doc.embedPng(Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII="),c=>c.charCodeAt(0)));
  doc.getPage(0).drawImage(image,{x:0,y:0,width:200,height:200});bytes=await doc.save({useObjectStreams:compressed});if(await status()!==200)throw Error("Valid scanned PDF rejected");
 }
 const empty=await PDFDocument.create();bytes=await empty.save({addDefaultPage:false});if(await status()!==422)throw Error("Empty page tree accepted");
 bytes=new Uint8Array(52428801);if(await status()!==422)throw Error("Oversize accepted");
});

Deno.test("missing page content references cannot receive receipts",async()=>{
 const doc=await PDFDocument.create();doc.addPage().node.set(PDFName.of("Contents"),PDFRef.of(9999));bytes=await doc.save();if(await status()!==422)throw Error("Missing page contents accepted");
});

Deno.test("invalid content types, missing terminators and wrong xref offsets fail",async()=>{
 const doc=await PDFDocument.create();doc.addPage().node.set(PDFName.of("Contents"),PDFNumber.of(42));bytes=await doc.save();if(await status()!==422)throw Error("Numeric Contents accepted");
 const clean=await PDFDocument.create();clean.addPage();const valid=await clean.save({useObjectStreams:false});
 for(const input of [new TextDecoder().decode(valid).replace("endobj","      "),new TextDecoder().decode(valid).replace(/(xref\s+0 \d+\s+0000000000 65535 f\s+)\d{10}/,"$10000000001")]){bytes=new TextEncoder().encode(input);if(await status()!==422)throw Error("Malformed terminator/xref accepted");}
});
Deno.test("compressed object streams have a pre-allocation expansion bound",async()=>{
 const doc=await PDFDocument.create();doc.addPage();doc.context.register(doc.context.flateStream(new Uint8Array(9*1024*1024).fill(32),{Type:"ObjStm",N:1,First:4}));bytes=await doc.save({useObjectStreams:false});
 if(await status()!==422)throw Error("Structural expansion limit bypassed");
});

Deno.test("large image streams with forward indirect Length retain scanned PDF support",async()=>{
 const doc=await PDFDocument.create();const page=doc.addPage();const stream=doc.context.stream(new Uint8Array(4*1024*1024).fill(120));const length=doc.context.register(PDFNumber.of(stream.getContents().length));stream.dict.set(PDFName.of("Length"),length);const ref=doc.context.register(stream);page.node.set(PDFName.of("Contents"),ref);
 // PDFRawStream serialization normalizes Length; substitute same-width indirect
 // syntax and rebuild offsets by emitting a small explicit classic PDF instead.
 const payload=new Uint8Array(4*1024*1024).fill(120),parts: Uint8Array[]=[],offsets=[0];let size=0;
 const put=(text:string|Uint8Array)=>{const value=typeof text==="string"?new TextEncoder().encode(text):text;parts.push(value);size+=value.length;};
 put("%PDF-1.7\n");const obj=(id:number,text:string)=>{offsets[id]=size;put(`${id} 0 obj\n${text}\nendobj\n`);};
 obj(1,"<< /Type /Catalog /Pages 2 0 R >>");obj(2,"<< /Type /Pages /Count 1 /Kids [3 0 R] >>");obj(3,"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>");offsets[4]=size;put("4 0 obj\n<< /Length 5 0 R >>\nstream\n");put(payload);put("\nendstream\nendobj\n");obj(5,String(payload.length));const xref=size;put("xref\n0 6\n0000000000 65535 f \n");for(let i=1;i<6;i++)put(`${String(offsets[i]).padStart(10,"0")} 00000 n \n`);put(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);bytes=new Uint8Array(size);let at=0;for(const part of parts){bytes.set(part,at);at+=part.length;}
 if(await status()!==200)throw Error("Valid indirect-Length scan rejected");
});

Deno.test("incremental PDF cross-references must link their previous revision",async()=>{
 const doc=await PDFDocument.create();doc.addPage();const original=await doc.save({useObjectStreams:false});const text=new TextDecoder().decode(original);const previous=/startxref\s+(\d+)/.exec(text)![1],root=/\/Root (\d+ \d+ R)/.exec(text)![1];
 for(const linked of [false,true]){
  const addition="\n9999 0 obj\n<< /Producer (fixture) >>\nendobj\n",offset=original.length+new TextEncoder().encode(addition).length;
  const tail=`xref\n9999 1\n${String(original.length+1).padStart(10,"0")} 00000 n \ntrailer\n<< /Size 10000 /Root ${root} /Info 9999 0 R ${linked?`/Prev ${previous}`:""} >>\nstartxref\n${offset}\n%%EOF`;
  const extra=new TextEncoder().encode(addition+tail);bytes=new Uint8Array(original.length+extra.length);bytes.set(original);bytes.set(extra,original.length);if(await status()!==(linked?200:422))throw Error("Incorrect incremental chain validation");
 }
});

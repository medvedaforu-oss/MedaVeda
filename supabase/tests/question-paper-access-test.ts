import assert from "node:assert/strict";
import { handleAccess } from "../functions/question-paper-access/handler.ts";
import { PDFDocument } from "npm:pdf-lib@1.17.1";
const document=await PDFDocument.create();document.addPage();const valid=await document.save();
let anonymous=false,authenticated=true;let admin=false,visible=true,bytes=valid,mime='application/pdf',signs: any[]=[],receipts: unknown[]=[];
const query={select(){return this;},eq(){return this;},single:async()=>({data:visible?{id:'p',object_path:'11111111-1111-4111-8111-111111111111.pdf'}:null,error:null}),insert:async (data: unknown)=>{receipts.push(data);return {error:null};}};
const user={auth:{getUser:async()=>({data:{user:authenticated?{id:'u',is_anonymous:anonymous}:null},error:null})},rpc:async()=>({data:admin,error:null}),from:()=>query};
const server={from:()=>query,storage:{from:()=>({download:async()=>({data:new Blob([bytes as BlobPart],{type:mime}),error:null}),createSignedUrl:async(...args: unknown[])=>{signs.push(args);return {data:{signedUrl:'signed'},error:null};}})}};
const call=(body: unknown)=>handleAccess(new Request('https://test',{method:'POST',headers:{Authorization:'Bearer user'},body:JSON.stringify(body)}),user,server);
Deno.test("Question Paper signing and private validation boundaries",async()=>{
 anonymous=true;assert.equal((await call({action:'sign',id:'p'})).status,401);anonymous=false;
 authenticated=false;assert.equal((await call({action:'sign',id:'p'})).status,401);authenticated=true;
 assert.equal((await call({action:'sign',id:'p',expiresIn:999999})).status,200);assert.equal(signs[0][1],120);
 visible=false;assert.equal((await call({action:'sign',id:'p'})).status,403);assert.equal(signs.length,1);visible=true;
 const object_path='11111111-1111-4111-8111-111111111111.pdf';
 assert.equal((await call({action:'validate',object_path})).status,403);admin=true;
 const validated=await call({action:'validate',object_path});assert.equal(validated.status,200);assert.equal(receipts.length,1);assert.equal((await validated.json()).validated,true);
 for(const bad of [new Uint8Array(),new TextEncoder().encode('<html'),new Uint8Array(52428801)]) {bytes=bad;assert.equal((await call({action:'validate',object_path})).status,422);}
 bytes=valid;mime='text/html';assert.equal((await call({action:'validate',object_path})).status,422);assert.equal(receipts.length,1);
 console.log('PASS isolated server signing cap, visibility authorization and PDF byte validation');
});

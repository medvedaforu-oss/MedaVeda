const assert = require('node:assert/strict');
const {load} = require('./ui-harness.cjs');
let calls=[], rows=[], failure=null, identity='student', pages=null, switchOnResponse=false;
const q = new Proxy({}, {get:(_,k)=> k==='then' ? resolve=>{if(switchOnResponse)identity='other';resolve({data: rows, error: failure});} : (...args)=>{calls.push([k,...args]);if(k==='range'&&pages)rows=pages[Math.floor(args[0]/100)];return q;}});
const service = load('mobile-app/src/features/question-papers/service.ts',{
 '../../config/supabase':{supabase:{functions:{invoke:async(name,options)=>{calls.push(['invoke',name,options]);return {data:failure?null:{signedUrl:'https://example.test/paper'},error:failure};}},from:t=>{assert.equal(t,'question_papers');return q;},storage:{from:b=>{assert.equal(b,'question-papers');return {createSignedUrl:async(...args)=>{calls.push(['sign',...args]);return {data:{signedUrl:'https://example.test/paper'},error:null};}};}}}},
 '../../services/authState':{getCurrentUser:()=>identity?{id:identity}:null},
});
(async()=>{
 await assert.rejects(service.listPapers(''),/subject/i);
 identity='';await assert.rejects(service.listPapers('subject'),/sign in/i);identity='student';
 const data=Array.from({length:225},(_,n)=>({id:String(n),exam_year:2025,exam_month:n%2?6:12}));
 // Each range resolves a different page; verify no server row limit truncation.
 pages=[data.slice(0,100),data.slice(100,200),data.slice(200)];
 // Proxy response uses range argument to choose rows via mutable range hook below.
 rows=pages[0];
 assert.equal((await service.listPapers('subject')).length,225);
 assert(calls.some(c=>c[0]==='range'&&c[1]===200&&c[2]===299));
 pages=null;
 const groups=service.groupSessions(data);
 assert.equal(groups.length,2); assert.equal(groups[0].exam_month,12); assert.equal(groups[0].papers.length,113);
 rows=[];await service.listPapers('s');assert(calls.some(c=>c[0]==='eq'&&c[1]==='published'&&c[2]===true));
 calls=[];rows=null;failure=Error('not visible');await assert.rejects(service.getPaperUrl('11111111-1111-4111-8111-111111111111'));assert(!calls.some(c=>c[0]==='sign'));
 failure=null;rows={id:'p',object_path:'private.pdf',published:true};calls=[];
 await service.getPaperUrl('11111111-1111-4111-8111-111111111111',true);
 assert(calls.some(c=>c[0]==='invoke'&&c[1]==='question-paper-access'&&c[2].body.download===true));
 calls=[];await assert.rejects(service.getPaperUrl('https://untrusted.test/p.pdf'),/paper/i);assert.equal(calls.length,0);
 switchOnResponse=true;await assert.rejects(service.listPapers('subject'),/account changed/i);
 console.log('PASS student free published-only reads, grouping, authorized signing, download disposition and ID validation');
})().catch(e=>{console.error(e);process.exitCode=1});

const assert=require('node:assert/strict');
const {load}=require('./ui-harness.cjs');
let owner='A', row={id:'11111111-1111-4111-8111-111111111111',title:'Anatomy'},error=null,switchOwner=false,queries=[];
const query=new Proxy({}, {get:(_,key)=>key==='then'?resolve=>{if(switchOwner)owner='B';resolve({data:row,error});}:(...args)=>{queries.push([key,...args]);return query;}});
const service=load('mobile-app/src/features/question-papers/service.ts',{
 '../../config/supabase':{supabase:{from:table=>{assert.equal(table,'question_papers');return query;},functions:{invoke:()=>{throw Error('Resolver must leave signing to existing viewer');}}}},
 '../../services/authState':{getCurrentUser:()=>owner?{id:owner}:null},
});
assert.equal(typeof service.getPaperDestination,'function','Direct paper resolution must use the RLS protected record');
(async()=>{
 const id=row.id;assert.equal((await service.getPaperDestination(id)).paperId,id);
 assert(queries.some(q=>q[0]==='eq'&&q[1]==='published'&&q[2]===true));
 assert(!queries.some(q=>q[0]==='select'&&q[1].includes('object_path')),'Navigation needs no storage path');
 row=null;for(const reason of ['deleted','unpublished','wrong course']) await assert.rejects(service.getPaperDestination(id), e=>e.definitive===true,reason);
 error={code:'NETWORK',status:0};await assert.rejects(service.getPaperDestination(id),e=>!e.definitive);
 error=null;row={id,title:'A'};switchOwner=true;await assert.rejects(service.getPaperDestination(id),/account changed/i);
 switchOwner=false;owner=null;await assert.rejects(service.getPaperDestination(id),/sign in/i);
 owner='A';await assert.rejects(service.getPaperDestination('invalid'),e=>e.definitive===true);
 console.log('PASS direct record resolution, publication/RLS denial, transient network handling and account response isolation');
})().catch(e=>{console.error(e);process.exitCode=1;});

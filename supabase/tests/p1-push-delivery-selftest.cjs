const assert=require('node:assert/strict');
const {load}=require('../../mobile-app/scripts/ui-harness.cjs');
async function run(tickets, {http=200,insertFailure=false,throwAt=0,tokenCount=2}={}) {
 let handler,sends=0,deleted=[];
 const tokens=tokenCount===2?['ExponentPushToken[synthetic_11111]','ExponentPushToken[synthetic_22222]']:Array.from({length:tokenCount},(_,i)=>`ExponentPushToken[synthetic_${String(i).padStart(5,'0')}]`);
 const db={rpc:async()=>{if(insertFailure)return{error:{code:"offline"}};return{data:{reserved:true},error:null}},from:table=>({update(){return this},select(){return this},eq(){return this},order(){return this},range(){return this},delete(){return this},in(_,values){deleted=values;return this},
 maybeSingle:async()=>({data:table==='admins'?{id:'admin'}:{require_mfa:true},error:null}),
 insert:async()=>({error:insertFailure?{code:'offline'}:null}),then(resolve){resolve({data:table==='push_tokens'&&deleted.length===0?tokens.map(expo_push_token=>({expo_push_token})):[],error:null})}})};
 load(`${process.env.AUDIT_PUSH_ROOT||'supabase'}/functions/send-push-notification/index.ts`,{
 '../_shared/cors.ts':{handleOptions:()=>null,jsonResponse:(b,s=200)=>Response.json(b,{status:s})},
 '../_shared/supabaseAdmin.ts':{supabaseAdmin:db,getUserFromAuthHeader:async()=>({id:'admin'}),aalFromAuthHeader:()=> 'aal2'},
 '../_shared/rateLimit.ts':{withinLimit:async()=>true},
 },{Deno:{serve:f=>handler=f},fetch:async()=>{sends++;if(sends===throwAt)throw new DOMException('timeout','TimeoutError');return Response.json({data:tickets},{status:http});}});
 const res=await handler(new Request('https://synthetic.invalid',{method:'POST',body:JSON.stringify({requestId:'11111111-1111-4111-8111-111111111111',title:'Broadcast',body:'Synthetic public content'})}));
 return {status:res.status,body:await res.json(),sends,deleted};
}
(async()=>{
 let r=await run([{status:'ok',id:'ticket-1'},{status:'error',details:{error:'DeviceNotRegistered'}}]);
 assert.equal(r.body.pushed,1,'HTTP 200 must not count rejected tickets');assert.equal(r.body.failed,1);assert.equal(r.deleted.length,1);assert.equal(r.deleted[0],'ExponentPushToken[synthetic_22222]');
 r=await run([{status:'error',details:{error:'MessageRateExceeded'}},{status:'error',details:{error:'InvalidCredentials'}}]);assert.equal(r.body.pushed,0);assert.equal(r.body.failed,2);assert.equal(r.deleted.length,0);
 r=await run([]);assert.equal(r.body.pushed,0);assert.equal(r.body.failed,2);
 r=await run([], {http:503});assert.equal(r.body.pushed,0);assert.equal(r.body.failed,2);
 r=await run([{status:'ok',id:''},{status:'ok',id:'valid'}]);assert.equal(r.body.pushed,1);assert.equal(r.body.failed,1);
 r=await run(Array.from({length:100},(_,i)=>({status:'ok',id:'ticket-'+i})),{throwAt:2,tokenCount:101});assert.equal(r.status,200);assert.equal(r.body.pushed,100);assert.equal(r.body.failed,1);assert.equal(r.body.unknown,1);assert.equal(r.sends,2,'never blindly retry an ambiguous batch');
 r=await run([], {insertFailure:true});assert.equal(r.status,503);assert.equal(r.sends,0);
 console.log('PASS push tickets count acceptance only, partial/malformed/provider rejection, dead-token cleanup, and fail before send on feed persistence failure; no device delivery claim');
})().catch(e=>{console.error(e);process.exitCode=1});

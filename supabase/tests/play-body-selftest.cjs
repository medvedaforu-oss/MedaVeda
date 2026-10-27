const assert=require('node:assert/strict');const {load}=require('../../mobile-app/scripts/ui-harness.cjs');
(async()=>{
 for(const name of ['create-play-order','verify-play-purchase']){
  let handler,calls=0;
  load(`supabase/functions/${name}/index.ts`,{
   '../_shared/cors.ts':{handleOptions:()=>null,jsonResponse:(body,status=200)=>Response.json(body,{status})},
   '../_shared/supabaseAdmin.ts':{getUserFromAuthHeader:async()=>({id:'buyer'}),supabaseAdmin:{rpc:()=>{calls++;throw Error('unexpected mutation');}}},
   '../_shared/rateLimit.ts':{withinLimit:()=>{calls++;throw Error('unexpected rate-limit write');}},
   '../_shared/googlePlay.ts':{},'../_shared/playPurchaseValidation.ts':{},
  },{Deno:{serve:fn=>handler=fn},Response});
  for(const body of ['null','[]','"text"','3','true','{broken','{}']){
   const response=await handler(new Request('https://fixture.invalid',{method:'POST',body}));assert.equal(response.status,400,name+body);
  }
  assert.equal(calls,0);
 }
 console.log('PASS malformed/null Play request bodies return 400 before rate-limit, order, verification or provider work');
})().catch(e=>{console.error(e);process.exitCode=1;});

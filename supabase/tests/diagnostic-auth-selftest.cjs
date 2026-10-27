const assert=require('node:assert/strict');
const fs=require('node:fs');
const {load}=require('../../mobile-app/scripts/ui-harness.cjs');
(async()=>{
 const {createHandler}=load('supabase/functions/diagnose-play-matrix/handler.ts',{'../_shared/cors.ts':{corsHeaders:{}}},{Response,Request,AbortSignal,URLSearchParams});
 for(const [user,admin,aal,status]of [[false,true,'aal2',401],[true,false,'aal2',403],[true,true,'aal1',403],[true,true,'',403],[true,true,'aal2',200]]){
  let tokens=0,google=0;
  const handler=createHandler({getUser:async()=>user?{id:'admin'}:null,getAdmin:async()=>admin,getAal:()=>aal,getToken:async()=>{tokens++;return 'synthetic';},getPackageName:()=> 'fixture',fetchGoogle:async()=>{google++;return Response.json({});}});
  const response=await handler(new Request('https://fixture.invalid',{method:'POST'}));assert.equal(response.status,status);assert.equal(tokens,status===200?1:0);assert.equal(google,status===200?4:0);
 }
 for(const name of ['diagnose-play-matrix','diagnose-play-pricing','diagnose-play-service-account'])assert.match(fs.readFileSync(`supabase/functions/${name}/index.ts`,'utf8'),/REMOVE_AFTER_INVESTIGATION/);
 console.log('PASS diagnostic matrix requires verified user + admin + AAL2 before credential/network access; retirement notes present');
})().catch(e=>{console.error(e);process.exitCode=1;});

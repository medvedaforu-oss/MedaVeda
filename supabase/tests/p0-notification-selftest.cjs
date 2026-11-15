const assert=require('node:assert/strict');
const {load}=require('../../mobile-app/scripts/ui-harness.cjs');
async function run(targetUserIds,authorized=true) {
  let handler,inserts=0,tokenReads=0;
  const db={rpc:async()=>{inserts++;return{data:{reserved:true},error:null}},from:table=>({update(){return this},select(){return this},eq(){return this},order(){return this},range(){return this},in(){return this},
    maybeSingle:async()=>({data:table==='admins'?(authorized?{id:'admin'}:null):{require_mfa:true},error:null}),
    insert:async()=>{inserts++;return {error:null}},then(resolve){tokenReads++;resolve({data:[],error:null})}})};
  load(`${process.env.P0_RELEASE_ROOT || 'supabase'}/functions/send-push-notification/index.ts`,{
    '../_shared/cors.ts':{handleOptions:()=>null,jsonResponse:(b,s=200)=>Response.json(b,{status:s})},
    '../_shared/supabaseAdmin.ts':{supabaseAdmin:db,getUserFromAuthHeader:async()=>({id:'admin'}),aalFromAuthHeader:()=> 'aal2'},
    '../_shared/rateLimit.ts':{withinLimit:async()=>true},
  },{Deno:{serve:fn=>handler=fn}});
  const r=await handler(new Request('https://fixture.invalid',{method:'POST',body:JSON.stringify({requestId:'11111111-1111-4111-8111-111111111111',title:'Synthetic',body:'Private fixture',targetUserIds})}));
  return {status:r.status,inserts,tokenReads};
}
(async()=>{
  for(const target of [['11111111-1111-4111-8111-111111111111'],[],['invalid'],'invalid',{},null,0,false]) {
    const r=await run(target);assert.equal(r.status,400);assert.equal(r.inserts,0);assert.equal(r.tokenReads,0);
  }
  const r=await run(undefined);assert.equal(r.status,200);assert.equal(r.inserts,1);
  assert.equal((await run(undefined,false)).status,403);
  console.log('PASS targeted requests cannot persist globally readable content or read tokens; authorized broadcast and admin gate preserved');
})().catch(e=>{console.error(e);process.exitCode=1});

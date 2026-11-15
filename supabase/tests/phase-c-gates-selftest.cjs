// Actual entrypoints + actual production gate, synthetic Auth/SQL transport only.
const assert = require('node:assert/strict');
const {load} = require('../../mobile-app/scripts/ui-harness.cjs');
(async () => {
 for (const entry of ['create-play-order','attach-external-token']) {
  for (const mode of ['default','no-enrollment','no-acceptance','no-enable','wrong-package','no-version','anonymous','approved']) {
   const env = {APP_ENV:'production',SUPABASE_URL:'https://fixture.invalid',PLAY_INDIA_UCB_ENROLLED:'true',PLAY_CHOICE_TEST_ACCEPTED:'true',ENABLE_PLAY_CHOICE_CHECKOUT:'true'};
   if(mode==='default') Object.keys(env).forEach(k=>delete env[k]);
   for (const [m,k] of [['no-enrollment','PLAY_INDIA_UCB_ENROLLED'],['no-acceptance','PLAY_CHOICE_TEST_ACCEPTED'],['no-enable','ENABLE_PLAY_CHOICE_CHECKOUT']]) if(mode===m) delete env[k];
   let handler, writes=0;
   const Deno={env:{get:k=>env[k]},serve:fn=>{handler=fn}};
   const gate=load('supabase/functions/_shared/notesChoiceGate.ts',{}, {Deno});
   load(`supabase/functions/${entry}/index.ts`,{
    '../_shared/cors.ts':{handleOptions:()=>null,jsonResponse:(b,s=200)=>Response.json(b,{status:s})},
    '../_shared/notesChoiceGate.ts':gate,
    '../_shared/rateLimit.ts':{withinLimit:async()=>true},
    '../_shared/supabaseAdmin.ts':{getUserFromAuthHeader:async()=>mode==='anonymous'?null:{id:'owner'},supabaseAdmin:{
     from:()=>{writes++; const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{scope:'chapter',active:true,product_type:'notes'},error:null})};return q},
     rpc:async(name,args)=>{writes++;assert.equal(args.p_user_id,'owner');return {data:{ok:false,code:'synthetic_rejection'},error:null}},
    }},
   },{Deno,Response,Request,console});
   const headers={'x-medveda-application-id':mode==='wrong-package'?'other':'in.medveda.app','x-medveda-app-version':mode==='no-version'?'':'1.2.2'};
   const response=await handler(new Request('https://fixture.invalid',{method:'POST',headers,body:JSON.stringify({productId:'notes',userId:'forged',internalOrderId:'11111111-1111-4111-8111-111111111111',externalTransactionToken:'synthetic_choice_token'})}));
   if(mode==='approved'){assert.ok(writes>0);assert.equal(response.status,entry==='create-play-order'?400:409)}
   else {assert.equal(writes,0);assert.equal(response.status,mode==='anonymous'?401:403)}
  }
  console.log(`PASS ${entry}: defaults and each approval/header/Auth gate deny before SQL; approved synthetic call derives owner from Auth`);
 }
})();

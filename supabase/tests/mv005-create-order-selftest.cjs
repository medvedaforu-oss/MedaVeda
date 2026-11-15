// Execute all four actual order-creation failure branches, with synthetic transport.
const assert=require('node:assert/strict');
const {load}=require('../../mobile-app/scripts/ui-harness.cjs');
async function run(branch,terminal){
 let state=terminal,failures=0;
 const choice='11111111-1111-4111-8111-111111111111';
 const db={rpc:async name=>name==='create_priced_order'?{data:{ok:true,order_id:'synthetic',amount:branch==='price'?0:49}}:{error:{code:'SYNTHETIC'}},
 from(table){let changes=null;const filters=[];const q={select(){return q},eq(k,v){filters.push([k,v]);return q},is(){return q},update(v){changes=v;return q},
 maybeSingle:async()=>({data:table==='profiles'?{course_id:'bams',blocked:false}:table==='products'?{id:'notes',course_id:'bams',active:true}:{id:choice,user_id:'buyer',product_id:'notes',provider:'play',status:'created',external_transaction_token:'synthetic'}}),
 then(resolve){if(changes?.status==='failed'){failures++;assert.ok(filters.some(([k,v])=>k==='status'&&v==='created'));if(state==='created')state='failed';}
 resolve({error:changes?.razorpay_order_id&&branch==='attach'?{code:'SYNTHETIC'}:null});}};return q;}};
 const api=load('supabase/functions/_shared/createOrderHandler.ts',{
 './newOrderGate.ts':{newOrdersEnabled:async()=>true},
 './cors.ts':{handleOptions:()=>null,jsonResponse:(b,status=200)=>Response.json(b,{status})},
 './supabaseAdmin.ts':{supabaseAdmin:db,getUserFromAuthHeader:async()=>({id:'buyer'})},
 './razorpay.ts':{createRazorpayOrder:async()=>{if(branch==='provider')throw Error('synthetic');return{id:'order_synthetic'}},getRazorpayKeyId:()=> 'synthetic',isLiveMode:()=>true},
 './rateLimit.ts':{withinLimit:async()=>true},'./ucbStates.ts':{INDIA_ADMINISTRATIVE_AREAS:new Set(['KERALA'])},
 './paymentGate.ts':{paymentGate:async()=> 'allow'},'./notesChoiceGate.ts':{notesChoiceAllowed:()=>true},'./nonPlayTestCheckout.ts':{},
 },{Deno:{env:{get:()=> 'https://fixture.invalid'}},console:{error(){}}});
 const r=await api.handleCreateOrder(new Request('https://fixture.invalid',{method:'POST',body:JSON.stringify({productId:'notes',...(branch==='bind'?{ucbOrderId:choice,buyerState:'KERALA'}:{})})}));
 assert.equal(r.status,{price:400,provider:502,attach:500,bind:409}[branch]);assert.equal(failures,1);assert.equal(state,terminal==='created'?'failed':terminal);
}
(async()=>{for(const branch of ['price','provider','attach','bind'])for(const terminal of ['created','paid','refunded'])await run(branch,terminal);console.log('PASS all four actual create-order failure branches condition on created; paid/refunded states preserved (12 cases)')})().catch(e=>{console.error(e);process.exitCode=1});

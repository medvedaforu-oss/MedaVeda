const assert=require('node:assert/strict');
const {load}=require('../../mobile-app/scripts/ui-harness.cjs');
const choice='11111111-1111-4111-8111-111111111111';
function setup({allow=true,user='buyer',providerFailure=false,recoverable=false,providerMismatch=false,rowChanges={}}={}) {
 let creates=0,reserves=0;
 let row=null,claimed=false,providerOrder=null; let recoveryReads=0;
 // In-memory production-policy fixture only; no environment file or network.
 const env={APP_ENV:'production',SUPABASE_URL:'https://fixture.invalid',PLAY_INDIA_UCB_ENROLLED:'true',ENABLE_PLAY_CHOICE_CHECKOUT:'true',PLAY_CHOICE_TEST_ACCEPTED:'true'};
 const gate=load('supabase/functions/_shared/notesChoiceGate.ts',{}, {Deno:{env:{get:k=>env[k]}}});
 function query(table){const q={select(){return q;},eq(){return q;},is(){return q;},update(value){q.changes=value;return q;},
  single:async()=>({data:row,error:null}),maybeSingle:async()=>({data:{name:'Student'},error:null}),then(resolve){if(table==='orders'&&q.changes)Object.assign(row,q.changes);resolve({error:null});}};return q;}
 const mocks={
 './newOrderGate.ts':{newOrdersEnabled:async()=>true},
  './cors.ts':{handleOptions:()=>null,jsonResponse:(body,status=200)=>Response.json(body,{status})},
  './supabaseAdmin.ts':{getUserFromAuthHeader:async()=>user?{id:user}:null,supabaseAdmin:{from:query,rpc:async(_name,args)=>{reserves++;assert.equal(args.p_user_id,user);assert.equal(args.p_product_id,'notes');
   const first=!claimed;claimed=true;row??={id:'reserved-id',user_id:user,product_id:'notes',provider:'razorpay',status:'created',amount:350,list_price:500,referral_discount:50,wallet_amount:100,expires_at:new Date(Date.now()+1800000).toISOString(),products:{title:'Notes'},profiles:{name:'Student'},...rowChanges};
   return{data:{ok:true,claimed:first,order_id:row.id},error:null};}}},
  './razorpay.ts':{findRazorpayOrderByReceipt:async()=>{recoveryReads++;return recoverable?providerOrder:null},fetchRazorpayOrder:async()=>providerOrder,getRazorpayKeyId:()=> 'rzp_test_fixture',isLiveMode:()=>false,createRazorpayOrder:async args=>{creates++;providerOrder={id:'order_fixture',amount:providerMismatch?1:Math.round(Number(row.amount)*100),currency:'INR',status:'created',receipt:args.receipt,notes:args.notes};assert.equal(args.amountPaise,Math.round(Number(row.amount)*100));assert.equal(args.receipt,row.id);if(providerFailure)throw Error('ambiguous timeout');return{id:'order_fixture'};}},
  './rateLimit.ts':{withinLimit:async()=>true},'./ucbStates.ts':{INDIA_ADMINISTRATIVE_AREAS:new Set(['KERALA'])},
  './notesChoiceGate.ts':{notesChoiceAllowed:(req,id)=>allow&&gate.notesChoiceAllowed(req,id)},'./paymentGate.ts':{paymentGate:async()=> 'allow'},
 };
 const api=load('supabase/functions/_shared/notesChoiceOrder.ts',mocks,{Deno:{env:{get:k=>env[k]}},Request,Response});
 return{env,gate,counts:()=>({creates,reserves,recoveryReads}),invoke:(change={},headers={})=>api.handleNotesChoiceOrder(new Request('https://fixture.invalid',{method:'POST',headers:{'x-medveda-app-version':'1.2.2','x-medveda-application-id':'in.medveda.app',...headers},body:JSON.stringify({productId:'notes',ucbOrderId:choice,buyerState:'KERALA',useWallet:true,...change})}))};
}
(async()=>{
 for(const option of [{allow:false},{user:null}]){const s=setup(option);assert.equal((await s.invoke()).status,option.user===null?401:403);assert.equal(s.counts().reserves,0);}
 for(const change of [{buyerState:'INVALID'},{ucbOrderId:'invalid'},{productId:''}]){const s=setup();assert.equal((await s.invoke(change)).status,400);assert.equal(s.counts().creates,0);}
 const s=setup();const first=await s.invoke({amount:1,userId:'stranger'});assert.equal(first.status,200);assert.equal((await first.json()).amountPaise,35000);
 const repeat=await s.invoke();assert.equal((await repeat.json()).razorpayOrderId,'order_fixture');assert.equal(s.counts().creates,1);
 console.log('PASS authenticated Notes choice endpoint denies before writes when disabled/invalid; server price/user win; repeat request returns same provider order');
 const t=setup({providerFailure:true});assert.equal((await t.invoke()).status,503);assert.equal((await t.invoke()).status,503);assert.equal(t.counts().creates,1);
 console.log('PASS ambiguous provider creation never repeats CREATE for the same choice');
 const recovered=setup({providerFailure:true,recoverable:true});
 assert.equal((await recovered.invoke()).status,503);
 const recovery=await recovered.invoke();assert.equal(recovery.status,200);assert.equal((await recovery.json()).razorpayOrderId,'order_fixture');
 assert.equal(recovered.counts().creates,1);assert.equal(recovered.counts().recoveryReads,1);
 const wrong=setup({providerMismatch:true});assert.equal((await wrong.invoke()).status,503);assert.equal(wrong.counts().creates,1);
 console.log('PASS ambiguous creation recovers one exactly bound receipt with no second CREATE; mismatched provider snapshots cannot open checkout');
 const headers={'x-medveda-app-version':'1.2.2','x-medveda-application-id':'in.medveda.app'};
 for(const name of ['PLAY_INDIA_UCB_ENROLLED','ENABLE_PLAY_CHOICE_CHECKOUT','PLAY_CHOICE_TEST_ACCEPTED']){const v=setup();v.env[name]='';assert.equal(v.gate.notesChoiceAllowed(new Request('https://fixture.invalid',{headers}),'buyer'),false);}
 const prod=setup();prod.env.PLAY_CHOICE_TEST_ACCEPTED='';assert.equal(prod.gate.notesChoiceAllowed(new Request('https://fixture.invalid',{headers}),'buyer'),false);
 prod.env.PLAY_CHOICE_TEST_ACCEPTED='true';assert.equal(prod.gate.notesChoiceAllowed(new Request('https://fixture.invalid',{headers}),'buyer'),true);
 await authorization();
 for(const rowChanges of [{status:'paid'},{status:'pending'},{status:'failed'},{status:'cancelled'},{status:'refunded'},
  {expires_at:'invalid'},{expires_at:new Date(0).toISOString()},{user_id:'other'},{product_id:'other'},{provider:'play'},
  {amount:1.001},{amount:'NaN'},{list_price:501},{wallet_amount:-1},{referral_discount:Infinity}]) {
  const invalid=setup({rowChanges});assert.notEqual((await invalid.invoke()).status,200);assert.equal(invalid.counts().creates,0);
 }
 for(const amount of [1,2,5]) {
  const price=setup({rowChanges:{amount,list_price:amount,referral_discount:0,wallet_amount:0}});
  const response=await price.invoke({amount:999999});assert.equal(response.status,200);
  assert.equal((await response.json()).amountPaise,amount*100);
 }
 console.log('PASS production approval gates; stale/terminal/foreign/malformed reservations rejected before provider CREATE; testing prices unchanged');
})().catch(e=>{console.error(e);process.exitCode=1;});

async function authorization() {
 let grants=0,reports=0,provider=0,token='choice-token';
 let payment={id:'pay_fixture',order_id:'order_fixture',amount:35000,currency:'INR',status:'authorized',created_at:1794150000};
 const query={select(){return this;},eq(){return this;},maybeSingle:async()=>({data:{id:'reserved',amount:350,external_transaction_token:token},error:null})};
 const helper=load('supabase/functions/_shared/notesChoiceAuthorization.ts',{
  './supabaseAdmin.ts':{supabaseAdmin:{from:()=>query,rpc:async name=>{assert.equal(name,'record_notes_choice_authorization');grants++;return{error:null};}}},
  './razorpay.ts':{fetchPayment:async()=>{provider++;return payment;}},'./externalReporting.ts':{reportExternalOrder:async()=>{reports++;}},
 });
 await helper.reportNotesChoiceAuthorization('pay_fixture','order_fixture');assert.equal(grants,1);assert.equal(reports,1);
 for(const change of [{status:'failed'},{currency:'USD'},{amount:1},{order_id:'other'},{created_at:undefined}]){
  const original=payment;payment={...payment,...change};await assert.rejects(helper.reportNotesChoiceAuthorization('pay_fixture','order_fixture'),/mismatch/);payment=original;
 }
 payment={...payment,status:'refunded'};
 await helper.reportNotesChoiceAuthorization('pay_fixture','order_fixture');assert.equal(grants,2);
 token=null;const count=provider;
 await helper.reportNotesChoiceAuthorization('pay_fixture','order_fixture');assert.equal(provider,count,'website authorization remains inert');
 console.log('PASS verified authorization queues reporting only, rejects provider mismatches, skips website orders and never calls settlement');
}

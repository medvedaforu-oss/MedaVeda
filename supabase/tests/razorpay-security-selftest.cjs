// Regression harness: actual handlers/HMAC/settlement; synthetic Auth, provider HTTP and database transport.
// Run from repository root. No network request or real payment is made.
const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');
const {createHmac,webcrypto}=require('node:crypto');
const ts=require('../../mobile-app/node_modules/typescript');
const secret='audit_synthetic_secret';
let handler,grants,captures,lookups,payment,rzpOrder,dbOrder;
let configuredKeyId='rzp_test_audit';
const oid='11111111-1111-4111-8111-111111111111';
function reset(){grants=0;captures=0;lookups=0;
 payment={id:'pay_audit0001',order_id:'order_audit0001',status:'captured',amount:4900,currency:'INR',created_at:1800000000};
 rzpOrder={id:'order_audit0001',amount:4900,currency:'INR'};
 dbOrder={id:oid,user_id:'buyer',product_id:'notes',amount:49,status:'created',razorpay_order_id:'order_audit0001',external_transaction_token:null};
}
const db={from(table){return {select(){return this},eq(){return this},update(){return this},is(){return this},
 upsert:async()=>({error:null}),then(resolve){resolve({error:null})},
 maybeSingle:async()=>({data:table==='orders'?dbOrder:{status:'granted'},error:null})}},
 rpc:async(name)=>{if(name==='settle_razorpay_payment')grants++;if(name==='record_payment_capture')captures++;return {error:null}}};
const admin={supabaseAdmin:db,getUserFromAuthHeader:async(req)=>{const t=req.headers.get('authorization');return t?{id:t.slice(7)}:null}};
function load(path,mocks,extra={}){const module={exports:{}};
 const source=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{module,exports:module.exports,require:id=>{assert.ok(id in mocks,id);return mocks[id]},console,Request,Response,TextEncoder,Uint8Array,AbortSignal,Date,crypto:webcrypto,btoa,...extra});return module.exports;}
const razorpay=load('supabase/functions/_shared/razorpay.ts',{}, {
 Deno:{env:{get:k=>({APP_ENV:'staging',RAZORPAY_KEY_ID:configuredKeyId,RAZORPAY_KEY_SECRET:secret})[k]}},
 fetch:async(url)=>{lookups++;let body;if(url.endsWith('/payments'))body={items:[payment]};else if(url.includes('/payments/'))body=payment;else body=rzpOrder;
 return new Response(JSON.stringify(body),{status:200})}});
const settle=load('supabase/functions/_shared/settle.ts',{'./supabaseAdmin.ts':admin,'./razorpay.ts':razorpay,
 './externalReporting.ts':{},'./ucbAlert.ts':{alertUcb:async()=>{}}});
load('supabase/functions/verify-payment/index.ts',{'../_shared/supabaseAdmin.ts':admin,'../_shared/razorpay.ts':razorpay,
 '../_shared/settle.ts':settle,'../_shared/paymentGate.ts':{paymentGate:async()=>'upgrade'},
 '../_shared/rateLimit.ts':{clientIp:()=>'unknown',withinLimit:async()=>true},
 '../_shared/cors.ts':{handleOptions:()=>null,jsonResponse:(b,status=200)=>new Response(JSON.stringify(b),{status})}},
 {Deno:{serve:h=>handler=h}});
function payload(){return {internalOrderId:oid,razorpay_order_id:rzpOrder.id,razorpay_payment_id:payment.id,
 razorpay_signature:createHmac('sha256',secret).update(`${rzpOrder.id}|${payment.id}`).digest('hex')}}
async function call(body,owner){return handler(new Request('https://fixture.invalid/verify-payment',{method:'POST',headers:owner?{authorization:'Bearer '+owner}:{},body:JSON.stringify(body)}))}
(async()=>{
 configuredKeyId='rzp_live_synthetic';assert.throws(()=>razorpay.isLiveMode());console.log('PASS staging rejects live-mode key before provider request');configuredKeyId='rzp_test_audit';
 reset();assert.equal(await razorpay.verifyPaymentSignature({razorpayOrderId:rzpOrder.id,razorpayPaymentId:payment.id,razorpaySignature:payload().razorpay_signature}),true);
 for(const sig of ['0'.repeat(64),'not-hex','a'.repeat(63)])assert.equal(await razorpay.verifyPaymentSignature({razorpayOrderId:rzpOrder.id,razorpayPaymentId:payment.id,razorpaySignature:sig}),false);
 console.log('PASS actual HMAC implementation accepts authentic and rejects forged/malformed signatures');
 const cases=[
  ['missing callback signature',()=>({...payload(),razorpay_signature:''}),()=>{},400,0],
  ['forged callback signature',()=>({...payload(),razorpay_signature:'0'.repeat(64)}),()=>{},400,0],
  ['callback order swapped',payload,()=>{dbOrder.razorpay_order_id='order_other'},400,0],
  ['authorized payment cannot unlock',payload,()=>{payment.status='authorized'},400,0],
  ['wrong payment currency cannot unlock',payload,()=>{payment.currency='USD'},400,0],
  ['provider payment/order mismatch cannot unlock',payload,()=>{payment.order_id='order_other'},400,0],
  ['provider amount mismatch cannot unlock',payload,()=>{rzpOrder.amount=5000},400,0],
  ['stored amount mismatch cannot unlock',payload,()=>{dbOrder.amount=50},400,0],
  ['valid captured callback reaches server settlement',payload,()=>{},200,1],
 ];
 for(const [name,body,mutate,status,wantGrants] of cases){reset();mutate();const r=await call(body());assert.equal(r.status,status,name);assert.equal(grants,wantGrants,name);if(name==='authorized payment cannot unlock')assert.equal((await r.json()).pending,true);console.log('PASS '+name)}
 reset();dbOrder.status='refunded';const refunded=await call({internalOrderId:oid,recover:true},'buyer');assert.equal((await refunded.json()).pending,false);assert.equal(grants,0);assert.equal(lookups,0);console.log('PASS refunded recovery is terminal without provider call or regrant');
 for(const [owner,status] of [[undefined,401],['other',403],['buyer',200]]){reset();const r=await call({internalOrderId:oid,recover:true},owner);assert.equal(r.status,status);assert.equal(grants,owner==='buyer'?1:0);console.log('PASS recovery owner='+String(owner)+' status='+status)}
})().catch(e=>{console.error(e);process.exitCode=1});

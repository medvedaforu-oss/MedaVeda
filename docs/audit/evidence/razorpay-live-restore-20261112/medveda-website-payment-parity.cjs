// Differential tests of exact downloaded deployed code and the review candidate.
// Real handler/HMAC code; synthetic provider and database transport; no network.
const fs=require('fs'), vm=require('vm'), assert=require('assert/strict');
const {createHmac,webcrypto}=require('crypto');
const ts=require('/home/ganeshp8545/AyurPulse/mobile-app/node_modules/typescript');
const oid='11111111-1111-4111-8111-111111111111',secret='synthetic-only';
function setup(root,change={}) {
 const state={committed:true,commitmentError:null,grants:0,status:'captured',amount:100,orderAmount:100,currency:'INR',providerOrder:'order_synthetic',dbAmount:1,orderMissing:false,providerFailure:false,settlementError:false,refund:'partial',dispute:'won',...change};
 const db={from(){return {select(){return this},eq(){return this},maybeSingle:async()=>({data:state.orderMissing?null:{id:oid,user_id:'buyer',product_id:'notes',amount:state.dbAmount,status:'paid',razorpay_order_id:'order_synthetic'},error:null})}},
 rpc:async(name)=>{if(name==='settle_razorpay_payment') {state.grants++;return {data:null,error:state.settlementError?{code:'fixture'}:null};}
 if(name==='razorpay_entitlement_committed')return {data:state.committed,error:state.commitmentError};
 return {data:{status:'fixture'},error:null};}};
 function load(file,mocks,extra={}){const module={exports:{}};const source=ts.transpileModule(fs.readFileSync(root+'/'+file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{module,exports:module.exports,require:id=>{assert.ok(id in mocks,id);return mocks[id]},console:{log(){},warn(){},error(){}},Request,Response,TextEncoder,Uint8Array,AbortSignal,Date,crypto:webcrypto,btoa,...extra});return module.exports;}
 const env={RAZORPAY_KEY_ID:'rzp_live_synthetic',RAZORPAY_KEY_SECRET:secret,RAZORPAY_WEBHOOK_SECRET:secret,RAZORPAY_WEBHOOK_PREVIOUS_SECRET:'synthetic-previous'};
 const razorpay=load('_shared/razorpay.ts',{}, {Deno:{env:{get:k=>env[k]}},fetch:async(url,init)=>{assert.ok(!init.method||init.method==='GET');if(state.providerFailure)throw Error('synthetic transport error');const payment={id:'pay_synthetic',order_id:state.providerOrder,amount:state.amount,currency:state.currency,status:state.status,created_at:1800000000,refund_status:state.refund,amount_refunded:state.refund==='full'?100:10};
 return Response.json(url.endsWith('/payments')?{items:state.status==='captured'?[payment]:[]}:url.includes('/payments/')?payment:url.includes('/disputes/')?{id:'disp_synthetic',payment_id:'pay_synthetic',status:state.dispute}:{id:'order_synthetic',amount:state.orderAmount,currency:'INR'});}});
 const admin={supabaseAdmin:change.databaseTransport??db};const settle=load('_shared/settle.ts',{'./supabaseAdmin.ts':admin,'./razorpay.ts':razorpay});let callback,webhook;
 load('verify-payment/index.ts',{'../_shared/supabaseAdmin.ts':admin,'../_shared/razorpay.ts':razorpay,'../_shared/settle.ts':settle,'../_shared/rateLimit.ts':{clientIp:()=>'unknown',withinLimit:async()=>true},'../_shared/cors.ts':{handleOptions:req=>req.method==='OPTIONS'?new Response(null,{status:204}):null,jsonResponse:(b,status=200)=>Response.json(b,{status})}},{Deno:{serve:h=>callback=h}});
 load('razorpay-webhook/index.ts',{'../_shared/supabaseAdmin.ts':admin,'../_shared/settle.ts':settle},{Deno:{serve:h=>webhook=h,env:{get:k=>env[k]}}});
 return {callback,webhook,state};
}
const sign=(s,key=secret)=>createHmac('sha256',key).update(s).digest('hex');
const payload=()=>({internalOrderId:oid,razorpay_order_id:'order_synthetic',razorpay_payment_id:'pay_synthetic',razorpay_signature:sign('order_synthetic|pay_synthetic')});
const cb=(changes={},method='POST')=>new Request('https://fixture.invalid',{method,...(method==='POST'?{body:JSON.stringify({...payload(),...changes})}:{})});
function event(type='payment.captured',signature=true,key=secret){const body=JSON.stringify({event:type,payload:{payment:{entity:{id:'pay_synthetic',order_id:'order_synthetic',amount:100,currency:'INR',status:'captured',captured:true}},refund:{entity:{id:'rfnd_synthetic',payment_id:'pay_synthetic'}},dispute:{entity:{id:'disp_synthetic',payment_id:'pay_synthetic'}}}});return new Request('https://fixture.invalid',{method:'POST',headers:{'x-razorpay-event-id':'evt_synthetic',...(signature?{'x-razorpay-signature':sign(body,key)}:{})},body});}
const roots=['/tmp/medveda-live-backend-rollback/supabase/functions','/tmp/medveda-live-backend-review/supabase/functions'];
async function result(response){return {status:response.status,body:await response.text()};}
module.exports={setup,cb,event,result};
if(require.main===module)(async()=>{
 const cases=[
 ['valid signed website callback without JWT',{},'callback',()=>cb()],
 ['legacy recovery request',{},'callback',()=>cb({recover:true})],
 ['valid capture webhook',{},'webhook',()=>event()],
 ['previous-secret webhook',{},'webhook',()=>event('payment.captured',true,'synthetic-previous')],
 ['callback missing signature',{},'callback',()=>cb({razorpay_signature:''})],
 ['callback forged signature',{},'callback',()=>cb({razorpay_signature:'0'.repeat(64)})],
 ['callback invalid order UUID',{},'callback',()=>cb({internalOrderId:'invalid'})],
 ['callback swapped provider order',{},'callback',()=>cb({razorpay_order_id:'order_other'})],
 ['callback GET method',{},'callback',()=>cb({},'GET')],
 ['callback CORS preflight',{},'callback',()=>cb({},'OPTIONS')],
 ['uncaptured callback',{status:'authorized'},'callback',()=>cb()],
 ['uncaptured recovery',{status:'authorized'},'callback',()=>cb({recover:true})],
 ['wrong amount',{amount:101},'callback',()=>cb()],
 ['wrong currency',{currency:'USD'},'callback',()=>cb()],
 ['wrong provider order',{providerOrder:'order_other'},'callback',()=>cb()],
 ['missing local order',{orderMissing:true},'callback',()=>cb()],
 ['provider outage',{providerFailure:true},'callback',()=>cb()],
 ['settlement exception',{settlementError:true},'callback',()=>cb()],
 ['unsigned webhook',{},'webhook',()=>event('payment.captured',false)],
 ['unrelated authentic webhook',{},'webhook',()=>event('subscription.activated')],
 ['partial refund webhook',{refund:'partial'},'webhook',()=>event('refund.processed')],
 ['full refund webhook',{refund:'full'},'webhook',()=>event('refund.processed')],
 ['won dispute webhook',{dispute:'won'},'webhook',()=>event('payment.dispute.won')],
 ['lost dispute webhook',{dispute:'lost'},'webhook',()=>event('payment.dispute.lost')],
 ];
 for(const [label,change,fn,request] of cases){const a=setup(roots[0],change),b=setup(roots[1],change);const expected=await result(await a[fn](request()));const actual=await result(await b[fn](request()));assert.deepEqual(actual,expected,label);assert.equal(b.state.grants,a.state.grants,label+' settlement count');console.log('PASS unchanged '+label);}
 for(const root of roots){const api=setup(root);const first=await result(await api.callback(cb()));assert.deepEqual(await result(await api.callback(cb())),first);assert.equal((await api.webhook(event())).status,204);assert.equal((await api.webhook(event())).status,204);}
 console.log('PASS duplicate callback/webhook response compatibility (SQL idempotency checked separately)');
 for(const change of [{committed:false},{commitmentError:{code:'PGRST202'}},{commitmentError:{code:'XX000'}}]){const api=setup(roots[1],change);const response=await api.callback(cb());assert.equal(response.status,500);assert.equal((await response.json()).success,false);assert.equal((await api.webhook(event())).status,500);}
 console.log('PASS only intended post-settlement difference: false/errored commitment fails closed in both functions');
})().catch(error=>{console.error(error);process.exitCode=1});

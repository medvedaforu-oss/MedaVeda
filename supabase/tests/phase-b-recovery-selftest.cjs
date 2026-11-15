// Executes actual recovery handler, Auth-header helper, HMAC and webhook code.
// Auth service/provider/SQL transports are isolated synthetic fixtures; no HTTP.
const assert=require('node:assert/strict');
const {createHmac,webcrypto}=require('node:crypto');
const {load}=require('../../mobile-app/scripts/ui-harness.cjs');
const id='00400000-0000-4000-8000-000000000001', missing='00400000-0000-4000-8000-000000000002';
const secret='synthetic-mv004-hmac', authSecret='synthetic-auth-key';
let authCalls=0,reads=0,providers=0,settlements=0,inbox=0,limiterDown=false,filters=[],authThrows=false;
const order={id,user_id:'owner',status:'paid',razorpay_order_id:'order_Fixture004',external_transaction_token:null};
const sign=(data,key)=>createHmac('sha256',key).update(data).digest('hex');
function jwt(sub,exp=2000000000,key=authSecret){const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),p=Buffer.from(JSON.stringify({sub,exp})).toString('base64url');return `${h}.${p}.${createHmac('sha256',key).update(`${h}.${p}`).digest('base64url')}`;}
const db={auth:{getUser:async token=>{
 authCalls++;if(authThrows)throw Error('synthetic auth outage');
 const [h,p,s]=token.split('.');let claims;
 try{claims=JSON.parse(Buffer.from(p,'base64url'));}catch{return {data:{user:null},error:{code:'invalid'}};}
 const valid=s===createHmac('sha256',authSecret).update(`${h}.${p}`).digest('base64url')&&claims.exp>1900000000;
 return {data:{user:valid?{id:claims.sub}:null},error:valid?null:{code:'invalid'}};
}},from:table=>{assert.equal(table,'orders');const where={};return {
 select(){return this},eq(k,v){where[k]=v;return this},async maybeSingle(){reads++;filters.push(where);return {data:where.id===id&&(!where.user_id||where.user_id===order.user_id)?order:null,error:null};}
}},rpc:async(name)=>{assert.equal(name,'record_provider_event');inbox++;return {error:null};}};
const admin=load('supabase/releases/phase-b-20261111/functions/_shared/supabaseAdmin.ts',{'npm:@supabase/supabase-js@2.118.0':{createClient:()=>db}}, {Deno:{env:{get:()=> 'synthetic'}}});
const razorpay=load('supabase/releases/phase-b-20261111/functions/_shared/razorpay.ts',{}, {crypto:webcrypto,TextEncoder,Uint8Array,btoa,Deno:{env:{get:k=>({APP_ENV:'production',RAZORPAY_KEY_ID:'rzp_live_SYNTHETIC',RAZORPAY_KEY_SECRET:secret})[k]}},fetch:async(url,init)=>{
 providers++;assert.ok(!init.method||init.method==='GET');assert.ok(init.signal);assert.ok(filters.at(-1).user_id==='owner');
 return Response.json({items:[{id:'pay_Fixture004',status:'captured',amount:4900}]});
}});
const settle={settleCapturedPayment:async()=>{settlements++;return {ok:true,orderId:id,amountRupees:49}}};
let handler,webhook;
load('supabase/releases/phase-b-20261111/functions/verify-payment/index.ts',{'../_shared/supabaseAdmin.ts':admin,'../_shared/razorpay.ts':razorpay,'../_shared/settle.ts':settle,'../_shared/cors.ts':{handleOptions:()=>null,jsonResponse:(b,status=200)=>Response.json(b,{status})},'../_shared/rateLimit.ts':{clientIp:()=>'fixture-ip',withinLimit:async(_k,_m,_s,closed)=>!limiterDown||!closed}}, {Request,Response,Deno:{serve:h=>handler=h}});
load('supabase/releases/phase-b-20261111/functions/razorpay-webhook/index.ts',{'../_shared/supabaseAdmin.ts':admin,'../_shared/settle.ts':settle,'../_shared/notesChoiceAuthorization.ts':{}},{Request,Response,crypto:webcrypto,TextEncoder,Uint8Array,Deno:{serve:h=>webhook=h,env:{get:()=>secret}}});
async function recover(token,orderId=id,extra={},header){return handler(new Request('https://fixture.invalid/verify-payment',{method:'POST',headers:header?{Authorization:header}:token?{Authorization:`Bearer ${token}`}:{},body:JSON.stringify({internalOrderId:orderId,recover:true,user_id:'owner',...extra})}));}
const count=()=>[reads,providers,settlements];
(async()=>{
 for(const [name,token,header]of [['missing',null],['expired',jwt('owner',1)],['forged',jwt('owner',2000000000,'forged')],['raw token',null,jwt('owner')],['Basic scheme',null,'Basic synthetic']]){
  const before=count(),r=await recover(token,id,{},header);assert.equal(r.status,401);assert.deepEqual(count(),before);assert.equal((await r.json()).code,'AUTH_REQUIRED');console.log('PASS '+name+' authentication denied before order/provider/settlement');
 }
 authThrows=true;assert.equal((await recover(jwt('owner'))).status,401);authThrows=false;
 const before=[providers,settlements];
 const wrong=await recover(jwt('other')),absent=await recover(jwt('owner'),missing);
 assert.equal(wrong.status,404);assert.equal(absent.status,404);assert.equal(await wrong.text(),await absent.text());
 assert.deepEqual([providers,settlements],before);assert.deepEqual(filters.at(-2),{id,user_id:'other'});assert.deepEqual(filters.at(-1),{id:missing,user_id:'owner'});
 console.log('PASS wrong owner and missing order use verified identity filters and identical non-disclosing responses; body user ID ignored');
 const invalid=count();assert.equal((await recover(jwt('owner'),'not-a-uuid')).status,400);assert.deepEqual(count(),invalid);
 limiterDown=true;assert.equal((await recover(jwt('owner'))).status,429);assert.deepEqual(count(),invalid);limiterDown=false;
 console.log('PASS invalid UUID and failed recovery limiter never reach provider/settlement');
 const owner=await recover(jwt('owner'));assert.equal(owner.status,200);assert.equal((await owner.json()).success,true);assert.deepEqual(filters.at(-1),{id,user_id:'owner'});
 await Promise.all([recover(jwt('owner')),recover(jwt('owner'))]);assert.equal(providers,3);assert.equal(settlements,3);
 console.log('PASS valid owner and duplicate recovery deliveries reach settlement (SQL idempotency covered by MV003)');
 const payload={internalOrderId:id,razorpay_order_id:order.razorpay_order_id,razorpay_payment_id:'pay_Fixture004'};
 async function callback(signature){return handler(new Request('https://fixture.invalid/verify-payment',{method:'POST',body:JSON.stringify({...payload,razorpay_signature:signature})}));}
 const prior=authCalls;assert.equal((await callback(sign(`${payload.razorpay_order_id}|${payload.razorpay_payment_id}`,secret))).status,200);assert.equal(authCalls,prior);
 const beforeBad=count();assert.equal((await callback('0'.repeat(64))).status,400);assert.deepEqual(count(),beforeBad);
 assert.equal((await callback('')).status,400);assert.deepEqual(count(),beforeBad);
 console.log('PASS valid signed callback without JWT reaches shared helper; invalid/missing signature rejected before order lookup');
 const raw=' { "event": "payment.captured", "payload": {"payment":{"entity":{"id":"pay_Fixture004","order_id":"order_Fixture004","status":"captured","amount":4900}}}}\n';
 const wh=(body,sig)=>webhook(new Request('https://fixture.invalid/razorpay-webhook',{method:'POST',headers:{'x-razorpay-event-id':'evt_mv004','x-razorpay-signature':sig},body}));
 assert.equal((await wh(raw,sign(raw,secret))).status,204);const n=[inbox,settlements];assert.equal((await wh(raw+' ',sign(raw,secret))).status,401);assert.deepEqual([inbox,settlements],n);
 assert.equal((await wh(raw,'0'.repeat(64))).status,401);assert.deepEqual([inbox,settlements],n);
 console.log('PASS valid raw-body webhook HMAC; modified body/invalid HMAC rejected before inbox/settlement');
 console.log('PASS MV004 backend isolated fixtures; zero real HTTP requests');
})().catch(e=>{console.error(e);process.exitCode=1});

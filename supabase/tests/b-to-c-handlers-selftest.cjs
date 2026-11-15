// Actual settlement helper, callback/webhook HMAC and production-baseline SQL.
// Provider HTTP is synthetic; all SQL goes to an explicit disposable /tmp socket.
const releaseRoot=process.env.BC_RELEASE_ROOT || 'supabase/releases/phase-b-20261111';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {execFileSync,execFile}=require('node:child_process');
const {promisify}=require('node:util');
const {createHmac,webcrypto}=require('node:crypto');
const ts=require('../../mobile-app/node_modules/typescript');
assert.ok(process.env.PGHOST?.startsWith('/tmp/'));
assert.match(process.env.PGDATABASE,/^mv003_[0-9a-f]+$/);
const args=['-XqAt','-v','ON_ERROR_STOP=1'];
const sql=s=>execFileSync('psql',[...args,'-c',s],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const lit=v=>v==null?'null':typeof v==='boolean'?String(v):`'${String(v).replace(/'/g,"''")}'`;
let createResponseOverride=null,attachFailure=false;
let rpcFailure=null,skipGrant=false,afterGrant=null,settlements=0,providerCalls=0;
const serviceSql=q=>sql("set role service_role; set request.jwt.claim.role='service_role'; "+q);
const db={from(table){assert.ok(['orders','profiles','products','purchases','payment_captures','payment_compensations','provider_events','ucb_external_refunds'].includes(table));
 let cols='*',filters=[],changes=null;
 const q={select(c){cols=c;return q},eq(k,v){assert.match(k,/^[a-z_]+$/);filters.push(`${k}=${lit(v)}`);return q},
 neq(k,v){filters.push(`${k}<>${lit(v)}`);return q},
 is(k,v){filters.push(`${k} is ${lit(v)}`);return q},update(v){changes=v;return q},
 async upsert(v){try{serviceSql(`insert into public.${table} (${Object.keys(v)}) values (${Object.values(v).map(lit)}) on conflict do nothing`);return {error:null}}catch(e){return {error:{code:'SQL'}}}},
 async maybeSingle(){try{const r=serviceSql(`select row_to_json(r) from (select ${cols} from public.${table} where ${filters.join(' and ')} limit 1) r`);return {data:r?JSON.parse(r):null,error:null}}catch{ return {data:null,error:{code:'SQL'}}}},
 then(resolve){if(attachFailure&&changes?.razorpay_order_id)return resolve({error:{code:'synthetic_attach_failure'}});try{if(changes?.status==='failed')assert.ok(filters.includes("status='created'"));if(changes)serviceSql(`update public.${table} set ${Object.entries(changes).map(([k,v])=>`${k}=${lit(v)}`)} where ${filters.join(' and ')}`);resolve({error:null})}catch{resolve({error:{code:'SQL'}})}}};return q},
 async rpc(name,params){
 if(name==='create_priced_order'&&createResponseOverride)return {data:createResponseOverride,error:null};
 if(name==='razorpay_entitlement_committed'&&rpcFailure)return {data:null,error:{code:rpcFailure}};
 if(name==='settle_razorpay_payment'){settlements++;if(skipGrant)return {data:null,error:null}}
 try{const r=serviceSql(`select public.${name}(${Object.entries(params).map(([k,v])=>`${k}=>${lit(v)}`).join(',')})::text`);
 if(name==='settle_razorpay_payment'&&afterGrant){const f=afterGrant;afterGrant=null;f()}
 return {data:r==='true'?true:r==='false'?false:r?.startsWith('{')?JSON.parse(r):r||null,error:null};
 }catch(e){return {data:null,error:{code:'SQL',message:String(e.stderr)}}}
 }};
const authSecret='phase-b-synthetic-auth-secret';
function jwt(sub,exp=Math.floor(Date.now()/1000)+3600,key=authSecret){
 const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
 const p=Buffer.from(JSON.stringify({sub,exp})).toString('base64url');
 return `${h}.${p}.${createHmac('sha256',key).update(`${h}.${p}`).digest('base64url')}`;
}
db.auth={getUser:async token=>{try{const [h,p,s]=token.split('.'),c=JSON.parse(Buffer.from(p,'base64url'));
 const valid=s===createHmac('sha256',authSecret).update(`${h}.${p}`).digest('base64url')&&c.exp>Math.floor(Date.now()/1000);
 return {data:{user:valid?{id:c.sub}:null},error:valid?null:{code:'invalid'}};
 }catch{return {data:{user:null},error:{code:'invalid'}}}}};
const admin=load(releaseRoot+'/functions/_shared/supabaseAdmin.ts',
 {'npm:@supabase/supabase-js@2.118.0':{createClient:()=>db}}, {Deno:{env:{get:()=> 'synthetic'}}});
const secret='mv003_synthetic_secret';let fixture,n=0,createMode='success';
const payments=new Map(),orders=new Map(),refunds=new Map(),disputes=new Map();
const network=async(url,init)=>{providerCalls++;if(init?.method==='POST'){
 assert.equal(url,'https://api.razorpay.com/v1/orders');
 const body=JSON.parse(init.body);assert.equal(body.currency,'INR');
 assert.equal(body.amount,Number(sql(`select round(amount*100) from orders where id=${lit(body.receipt)}`)));
 if(createMode==='provider')throw Error('synthetic timeout');
 return Response.json({id:'order_Create'+String(n).padStart(6,'0')});
 }
 assert.ok(!init?.method||init.method==='GET','unexpected provider method');
 let body;if(url.endsWith('/payments'))body={items:[fixture.payment]};else body=payments.get(url.split('/').pop())??orders.get(url.split('/').pop())??refunds.get(url.split('/').pop())??disputes.get(url.split('/').pop());assert.ok(body,'unexpected provider request');return Response.json(body)};
function load(path,mocks,extra={}){const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,require:id=>{assert.ok(id in mocks,id);return mocks[id]},console:{log(){},warn(){},error(){}},Request,Response,TextEncoder,Uint8Array,AbortSignal,Date,crypto:webcrypto,btoa,fetch:()=>{throw Error('network prohibited')},...extra});return module.exports}
const razorpay=load(releaseRoot+'/functions/_shared/razorpay.ts',{}, {fetch:network,Deno:{env:{get:k=>({APP_ENV:'production',RAZORPAY_KEY_ID:'rzp_live_SYNTHETIC',RAZORPAY_KEY_SECRET:secret})[k]}}});
const limiter=load(releaseRoot+'/functions/_shared/rateLimit.ts',{'./supabaseAdmin.ts':admin});
const cors=load(releaseRoot+'/functions/_shared/cors.ts',{});
const alerts=load(releaseRoot+'/functions/_shared/ucbAlert.ts',{}, {Deno:{env:{get:()=>undefined}}});
const reports=new Map();let googleCreates=0;
class GoogleApiError extends Error{constructor(status){super('synthetic Google '+status);this.status=status}}
const reporting=process.env.BC_CHOICE_TEST==='1'?load('supabase/releases/b-to-c-compatible-20261111/functions/_shared/externalReporting.ts',{
 './supabaseAdmin.ts':admin,'./ucbStates.ts':{INDIA_ADMINISTRATIVE_AREAS:new Set(['KERALA'])},
 './googlePlay.ts':{GoogleApiError,packageName:()=> 'in.medveda.app',
 getExternalTransaction:async id=>{if(!reports.has(id))throw new GoogleApiError(404);return reports.get(id)},
 createExternalTransaction:async(id,body)=>{googleCreates++;const r={...body,externalTransactionId:id,packageName:'in.medveda.app',transactionState:'TRANSACTION_REPORTED'};reports.set(id,r);return r},
 refundExternalTransaction:async()=>{throw Error('unexpected synthetic refund')},refundExternalTransactionPartially:async()=>{throw Error('unexpected synthetic refund')}}
},{Deno:{env:{get:k=>k==='APP_ENV'?'production':undefined}}}):{reportExternalOrder:async()=>{},reportExternalRefundEvent:async()=>{}};
const authorization=process.env.BC_CHOICE_TEST==='1'?load('supabase/releases/b-to-c-compatible-20261111/functions/_shared/notesChoiceAuthorization.ts',{'./supabaseAdmin.ts':admin,'./razorpay.ts':razorpay,'./externalReporting.ts':reporting}):{reportNotesChoiceAuthorization:async()=>{}};
const settle=load(releaseRoot+'/functions/_shared/settle.ts',{'./supabaseAdmin.ts':admin,'./razorpay.ts':razorpay,'./ucbAlert.ts':alerts,'./externalReporting.ts':reporting});
let callback,webhook,createOrder;
load(releaseRoot+'/functions/verify-payment/index.ts',{'../_shared/supabaseAdmin.ts':admin,'../_shared/razorpay.ts':razorpay,'../_shared/settle.ts':settle,'../_shared/rateLimit.ts':limiter,'../_shared/cors.ts':cors}, {Deno:{serve:h=>callback=h}});
load(releaseRoot+'/functions/razorpay-webhook/index.ts',{'../_shared/supabaseAdmin.ts':admin,'../_shared/settle.ts':settle,'../_shared/notesChoiceAuthorization.ts':authorization},{Deno:{serve:h=>webhook=h,env:{get:k=>k==='RAZORPAY_WEBHOOK_SECRET'?secret:undefined}}});
load(releaseRoot+'/functions/create-order/index.ts',{
 '../_shared/supabaseAdmin.ts':admin,'../_shared/razorpay.ts':razorpay,
 '../_shared/rateLimit.ts':limiter,
 '../_shared/cors.ts':cors},
 {Deno:{serve:h=>createOrder=h,env:{get:()=> 'https://fixture.invalid'}}});
function fresh(product='seed_product'){n++;rpcFailure=null;skipGrant=false;afterGrant=null;
 const user=`b0030000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 sql(`insert into auth.users(id,email) values (${lit(user)},'mv003_${n}@example.invalid')`);
 const r=JSON.parse(sql(`select public.create_priced_order(${lit(user)},${lit(product)},false)`));assert.ok(r.ok);
 const oid=`order_PhaseB${String(n).padStart(6,'0')}`,pid=`pay_PhaseB${String(n).padStart(6,'0')}`;
 sql(`update public.orders set razorpay_order_id=${lit(oid)} where id=${lit(r.order_id)}`);
 const amount=Number(sql(`select round(amount*100) from public.orders where id=${lit(r.order_id)}`));
 const payment={id:pid,order_id:oid,status:'captured',currency:'INR',amount,created_at:Math.floor(Date.now()/1000)};
 const order={id:oid,amount,currency:'INR'};payments.set(pid,payment);orders.set(oid,order);
 fixture={id:r.order_id,user,pid,oid,payment,order};return fixture}
const params=()=>({eventId:`evt_phaseb_${n}`,razorpayOrderId:fixture.oid,razorpayPaymentId:fixture.pid});
const call=()=>settle.settleCapturedPayment(params());
const committed=()=>sql(`select public.razorpay_entitlement_committed(${lit(fixture.id)},${lit(fixture.pid)})`)==='t';
const hmac=s=>createHmac('sha256',secret).update(s).digest('hex');
async function cb({signature,owner,recover=false}={}){const body=recover?{internalOrderId:fixture.id,recover:true}:{internalOrderId:fixture.id,razorpay_order_id:fixture.oid,razorpay_payment_id:fixture.pid,razorpay_signature:signature??hmac(`${fixture.oid}|${fixture.pid}`)};
 return callback(new Request('https://fixture.invalid/verify-payment',{method:'POST',headers:owner?{authorization:`Bearer ${jwt(fixture.user)}`}:{},body:JSON.stringify(body)}))}
async function wh(){const raw=JSON.stringify({event:'payment.captured',created_at:fixture.payment.created_at,payload:{payment:{entity:fixture.payment}}});
 return webhook(new Request('https://fixture.invalid/razorpay-webhook',{method:'POST',headers:{'x-razorpay-event-id':`evt_phaseb_${n}`,'x-razorpay-signature':hmac(raw)},body:raw}))}
const pass=s=>console.log('PASS '+s);
(async()=>{
 if(process.env.BC_CHOICE_ONLY!=='1'){
 fresh();assert.equal((await call()).ok,true);assert.ok(committed());pass('valid captured payment has committed entitlement');
 for(const scope of ['chapter','subject','year','bundle']){
  sql(`insert into public.products(id,title,scope,price,chapter_id,subject_id,year_id,year_ids,course_id,active,product_type)
    values('phaseb_${scope}','Fixture',${lit(scope)},49,${scope==='chapter'?"'seed_c'":'null'},${scope==='subject'?"'seed_s'":'null'},${scope==='year'?"'seed_y'":'null'},${scope==='bundle'?"array['seed_y']":'null'},'bams',true,'notes')`);
  fresh('phaseb_'+scope);assert.equal((await call()).ok,true);assert.ok(committed());pass('valid '+scope+' scope commits from immutable order snapshot');
 }
 fresh();assert.equal((await call()).ok,true);
 const original=fixture;
 // Corrupt only synthetic rows in rollback transactions to test the proof independently.
 const corruptions=[['missing purchase',`delete from public.purchases where order_id=${lit(original.id)}`],
 ...['user_id','product_id','amount','course_id','scope','chapter_id','subject_id','year_id','year_ids','razorpay_order_id'].map(k=>{
 const value={user_id:'b0030000-0000-4000-8000-000000000099',product_id:'other',amount:999,course_id:'other',scope:'subject',chapter_id:'other',subject_id:'other',year_id:'other',year_ids:'{other}',razorpay_order_id:'order_other'}[k];
 return ['purchase '+k,`update public.purchases set ${k}=${lit(value)} where order_id=${lit(original.id)}`]}),
 ...['user_id','product_id','amount','provider','razorpay_order_id','razorpay_payment_id','status'].map(k=>['payment '+k,`update public.payments set ${k}=${lit({user_id:'b0030000-0000-4000-8000-000000000099',product_id:'other',amount:999,provider:'play',razorpay_order_id:'order_other',razorpay_payment_id:'pay_other',status:'failed'}[k])} where order_id=${lit(original.id)}`])];
 for(const [name,mutation]of corruptions){const r=sql(`begin;set local session_replication_role=replica;${name==='payment provider'?`alter table public.payments drop constraint payments_ucb_provider_check;`:''}${mutation};select public.razorpay_entitlement_committed(${lit(original.id)},${lit(original.pid)});rollback;`);assert.equal(r,'f',name);pass(name+' cannot prove commitment')}
 for(const state of ['compensation_pending','compensated','reversal_pending','reversed']){assert.equal(sql(`begin;update public.payment_captures set status=${lit(state)} where payment_id=${lit(fixture.pid)};select public.razorpay_entitlement_committed(${lit(fixture.id)},${lit(fixture.pid)});rollback;`),'f');pass(state+' cannot prove commitment')}
 for(const state of ['pending','processing','refunded','parked']){assert.equal(sql(`begin;insert into public.payment_compensations(payment_id,order_id,amount_paise,reason,refund_request_id,status) values(${lit(fixture.pid)},${lit(fixture.id)},4900,'fixture','fixture',${lit(state)});select public.razorpay_entitlement_committed(${lit(fixture.id)},${lit(fixture.pid)});rollback;`),'f');pass('compensation '+state+' cannot prove commitment')}
 for(const status of ['pending','parked']){assert.equal(sql(`begin;insert into public.provider_events(event_id,event_type,payment_id,payload_hash,status) values('reversal','refund.processed',${lit(fixture.pid)},repeat('a',64),${lit(status)});select public.razorpay_entitlement_committed(${lit(fixture.id)},${lit(fixture.pid)});rollback;`),'f');pass(status+' reversal blocks commitment')}
 // Callback must fail even with a granted capture and a void, non-error RPC.
 fresh();assert.equal((await call()).ok,true);sql(`delete from public.purchases where order_id=${lit(fixture.id)}`);skipGrant=true;
 assert.equal((await cb()).status,500);assert.equal((await wh()).status,500);assert.ok(!committed());pass('false-success reproduction: granted marker + missing purchase + normal void return retries callback/webhook');
 for(const [column,value]of [['user_id','b0030000-0000-4000-8000-000000000099'],['product_id','foreign'],['amount',999],['scope','subject'],['course_id','foreign']]){
  fresh();assert.equal((await call()).ok,true);
  sql(`begin;set local session_replication_role=replica;update purchases set ${column}=${lit(value)} where order_id=${lit(fixture.id)};commit;`);skipGrant=true;
  assert.equal((await cb()).status,500);assert.equal((await wh()).status,500);pass('callback/webhook reject purchase '+column+' mismatch despite normal void settlement');
 }
 fresh();sql(`update public.orders set user_id=null where id=${lit(fixture.id)}`);
 assert.equal((await cb()).status,400);assert.equal((await wh()).status,204);assert.ok(!committed());assert.equal(sql(`select status from payment_captures where payment_id=${lit(fixture.pid)}`),'compensation_pending');pass('actual SQL compensation returns void; callback never unlocks; webhook acknowledges durable refund queue');
 // Exercise genuinely missing and throwing SQL functions, not only transport errors.
 fresh();sql('alter function public.razorpay_entitlement_committed(text,text) rename to mv003_saved_commitment');
 try {
  assert.equal((await cb()).status,500);assert.equal((await wh()).status,500);pass('actual missing SQL RPC fails closed; webhook retries');
  sql(`create function public.razorpay_entitlement_committed(p_order_id text,p_payment_id text) returns boolean language plpgsql as $$ begin raise exception 'synthetic SQL failure'; end $$`);
  assert.equal((await cb()).status,500);assert.equal((await wh()).status,500);pass('actual SQL exception during commitment check fails closed; webhook retries');
 } finally { sql('drop function if exists public.razorpay_entitlement_committed(text,text)');sql('alter function public.mv003_saved_commitment(text,text) rename to razorpay_entitlement_committed') }
 for(const error of ['PGRST202','XX000']){fresh();rpcFailure=error;assert.equal((await cb()).status,500);assert.equal((await wh()).status,500);pass(error+' missing/errored commitment RPC fails closed and webhook retries')}
 fresh();assert.equal((await cb()).status,200);assert.equal((await wh()).status,204);assert.equal(sql(`select status from provider_events where event_id=${lit(params().eventId)}`),'applied');assert.equal((await cb()).status,200);assert.equal(sql(`select count(*) from purchases where order_id=${lit(fixture.id)}`),'1');pass('duplicate signed callback/webhook is idempotent');
 fresh();const grant=`select public.settle_razorpay_payment('concurrent',${lit(fixture.oid)},${lit(fixture.pid)},${fixture.payment.amount},now())`;
 const run=promisify(execFile);await Promise.all([run('psql',[...args,'-c',`begin;${grant};select pg_sleep(0.2);commit;`]),run('psql',[...args,'-c',grant])]);assert.ok(committed());assert.equal(sql(`select count(*) from purchases where order_id=${lit(fixture.id)}`),'1');pass('independent PostgreSQL sessions serialize concurrent settlement');
 fresh();assert.equal((await call()).ok,true);sql(`begin;set local session_replication_role=replica;delete from payment_captures where payment_id=${lit(fixture.pid)};update orders set referral_discount=1,list_price=list_price+1,expires_at=now()-interval '2 days' where id=${lit(fixture.id)};commit;`);assert.ok(committed());const before=settlements;
 assert.equal((await cb()).status,200);assert.equal(settlements,before);assert.ok(committed());pass('historical purchase without capture marker stays valid and skips destructive replay');
 fresh();sql(`select record_payment_capture(${lit(fixture.pid)},${lit(fixture.oid)},${fixture.payment.amount},null)`);assert.equal((await cb({recover:true,owner:true})).status,200);assert.ok(committed());pass('interrupted capture-only settlement recovers through owner callback');
 fresh();afterGrant=()=>{rpcFailure='XX000'};assert.equal((await cb()).status,500);rpcFailure=null;assert.ok(committed());assert.equal((await cb()).status,200);pass('interruption after SQL commit retries without duplicate purchase');
 fresh();assert.equal((await cb()).status,200);pass('valid signed callback without JWT succeeds');
 fresh();const calls=providerCalls;assert.equal((await cb({signature:'0'.repeat(64)})).status,400);assert.equal(providerCalls,calls);assert.ok(!committed());pass('invalid signature rejected before provider/settlement');
 for(const mutate of [()=>fixture.payment.status='authorized',()=>fixture.payment.currency='USD',()=>fixture.payment.order_id='order_other',()=>fixture.order.amount++]){fresh();mutate();assert.equal((await cb()).status,400);assert.ok(!committed())}pass('captured status, provider order, currency and amount checks retained');
 fresh();assert.equal((await call()).ok,true);sql(`select public.handle_payment_refund(${lit(fixture.pid)},true)`);fixture.payment.status='refunded';fixture.payment.refund_status='full';fixture.payment.amount_refunded=fixture.payment.amount;assert.equal((await cb()).status,400);assert.ok(!committed());pass('full refund/reversal cannot regrant or return success');
 assert.equal(sql("select has_function_privilege('anon','public.razorpay_entitlement_committed(text,text)','execute') or has_function_privilege('authenticated','public.razorpay_entitlement_committed(text,text)','execute')"),'f');
 assert.equal(sql("select has_function_privilege('service_role','public.razorpay_entitlement_committed(text,text)','execute')"),'t');
 assert.equal(sql(`set role service_role;select public.razorpay_entitlement_committed(${lit(fixture.id)},${lit(fixture.pid)})`),'f');pass('service-role-only ACL and SECURITY DEFINER execution');

 fresh();const originalCalls=providerCalls;
 const recover=async(token,id=fixture.id)=>callback(new Request('https://fixture.invalid/verify-payment',{
 method:'POST',headers:token?{authorization:`Bearer ${token}`}:{},body:JSON.stringify({recover:true,internalOrderId:id,user_id:fixture.user})}));
 for(const token of [null,jwt(fixture.user,1),jwt(fixture.user,undefined,'forged')])assert.equal((await recover(token)).status,401);
 assert.equal((await recover(jwt('b0030000-0000-4000-8000-000000000099'))).status,404);
 assert.equal(providerCalls,originalCalls);assert.ok(!committed());
 assert.equal((await recover(jwt(fixture.user))).status,200);assert.ok(committed());
 pass('real Auth-header helper and synthetic signed JWT: owner succeeds; missing/expired/forged/wrong owner fail before provider');
 // Synthetic provider responses; actual webhook, HMAC, settlement helper and SQL.
 const replayBodies=new Map();
 const event=async(type,entity,id='evt_extra_'+n)=>{
 const raw=replayBodies.get(id)??(' '+JSON.stringify({event:type,created_at:Math.floor(Date.now()/1000),payload:entity})+'\n');
 replayBodies.set(id,raw);
 return webhook(new Request('https://fixture.invalid/razorpay-webhook',{method:'POST',
 headers:{'x-razorpay-event-id':id,'x-razorpay-signature':hmac(raw)},body:raw}));};
 const refund=async(full)=>{
 const rid='rfnd_PhaseB'+n;fixture.payment.refund_status=full?'full':'partial';
 fixture.payment.amount_refunded=full?fixture.payment.amount:100;
 if(full)fixture.payment.status='refunded';
 refunds.set(rid,{id:rid,payment_id:fixture.pid,status:'processed',currency:'INR',amount:full?fixture.payment.amount:100,created_at:Math.floor(Date.now()/1000)});
 return event('refund.processed',{refund:{entity:{id:rid,payment_id:fixture.pid}}});};
 fresh();assert.equal((await cb()).status,200);assert.equal((await refund(false)).status,204);assert.ok(committed());
 assert.equal((await refund(false)).status,204);assert.ok(committed());
 pass('actual partial refund webhook and duplicate preserve entitlement');
 fresh();assert.equal((await cb()).status,200);assert.equal((await refund(true)).status,204);assert.ok(!committed());
 assert.equal((await refund(true)).status,204);assert.equal((await cb()).status,400);
 pass('actual full refund webhook and duplicate revoke exact entitlement; callback cannot regrant');
 fresh();assert.equal((await cb()).status,200);
 const disputeId='disp_PhaseB'+n;
 const dispute=async(status)=>{disputes.set(disputeId,{id:disputeId,payment_id:fixture.pid,status});
 return event('payment.dispute.'+({open:'created',won:'won',lost:'lost'}[status]),{dispute:{entity:{id:disputeId,payment_id:fixture.pid}}},'evt_dispute_'+n+'_'+status);};
 assert.equal((await dispute('open')).status,204);assert.ok(!committed());
 assert.equal((await dispute('won')).status,204);assert.ok(committed());
 assert.equal((await dispute('won')).status,204);assert.ok(committed());
 assert.equal((await dispute('lost')).status,204);assert.ok(!committed());
 pass('actual dispute open/won/duplicate/lost webhook transitions and exact proof');
 fresh();const calls0=providerCalls;
 const raw=JSON.stringify({event:'payment.captured',payload:{payment:{entity:fixture.payment}}});
 for(const [body,signature]of [[raw+' ',hmac(raw)],[raw,'0'.repeat(64)]]){
 assert.equal((await webhook(new Request('https://fixture.invalid/razorpay-webhook',{method:'POST',headers:{'x-razorpay-event-id':'evt_bad','x-razorpay-signature':signature},body}))).status,401);}
 assert.equal(providerCalls,calls0);pass('actual webhook HMAC rejects tampered raw body before provider or SQL settlement');
 fresh();fixture.payment.currency='USD';assert.equal((await wh()).status,500);assert.ok(!committed());
 pass('unresolved provider mismatch is retryable; no false acknowledgement');
 fresh();fixture.payment.amount_refunded=fixture.payment.amount;fixture.payment.refund_status='full';fixture.payment.status='refunded';
 assert.equal((await refund(true)).status,500);
 assert.equal(sql(`select status from provider_events where payment_id=${lit(fixture.pid)}`),'pending');
 pass('refund arriving before settlement stays pending and retryable');
 // Actual create-order handler against the same baseline+A schema. Body amount
 // cannot override create_priced_order. No real provider network is available.
 const create=async(body,headers={})=>createOrder(new Request('https://fixture.invalid/create-order',{method:'POST',
 headers:{authorization:`Bearer ${jwt(fixture.user)}`,...headers},body:JSON.stringify(body)}));
 for(const price of [1,2,5]){
 fresh();sql(`update products set price=${price} where id='seed_product'`);
 const r=await create({productId:'seed_product',amount:1,amountPaise:1,useWallet:false});assert.equal(r.status,200);
 const b=await r.json();assert.equal(b.amountPaise,price*100);assert.equal(b.breakdown.amount,price);
 assert.deepEqual(Object.keys(b).sort(),['keyId','isLiveMode','razorpayOrderId','amountPaise','productTitle','internalOrderId','breakdown','timeoutSeconds','verifyUrl','prefillName','prefillEmail'].sort());
 }
 sql(`update products set price=49 where id='seed_product'`);
 pass('website create-order response contract and server-authoritative ₹1/₹2/₹5 pricing preserved');
 fresh();const countBefore=sql('select count(*) from orders');
 assert.equal((await create({productId:'seed_product'},{'x-medveda-app-version':'1.0'})).status,403);
 assert.equal((await create({productId:'seed_product',ucbOrderId:'future-choice'})).status,403);
 assert.equal(sql('select count(*) from orders'),countBefore);
 assert.equal((await createOrder(new Request('https://fixture.invalid',{method:'POST',body:'{}'}))).status,401);
 pass('Android routing and future choice route blocked; create-order requires verified JWT');
 fresh();createMode='provider';assert.equal((await create({productId:'seed_product'})).status,502);createMode='success';
 assert.equal(sql(`select count(*) from orders where user_id=${lit(fixture.user)} and status='failed'`),'1');
 pass('actual provider failure uses created-only SQL update');

 for(const branch of ['price','provider','attach'])for(const terminal of ['created','paid','refunded']){
 fresh();
 if(terminal!=='created')assert.equal((await cb()).status,200);
 if(terminal==='refunded')sql(`select public.handle_payment_refund(${lit(fixture.pid)},true)`);
 const before=sql(`select row_to_json(o) from orders o where id=${lit(fixture.id)}`);
 createResponseOverride={ok:true,order_id:fixture.id,amount:branch==='price'?0:49};
 createMode=branch==='provider'?'provider':'success';attachFailure=branch==='attach';
 assert.equal((await create({productId:'seed_product'})).status,{price:400,provider:502,attach:500}[branch]);
 assert.equal(sql(`select status from orders where id=${lit(fixture.id)}`),terminal==='created'?'failed':terminal);
 if(terminal!=='created')assert.equal(sql(`select row_to_json(o) from orders o where id=${lit(fixture.id)}`),before);
 createResponseOverride=null;createMode='success';attachFailure=false;
 }
 pass('all three candidate failure branches use real conditional SQL; paid/refunded rows byte-identical (9 cases)');
 }
 if(process.env.BC_CHOICE_TEST==='1'){
  fresh();const uid=fixture.user,choice='bc_choice_'+n,token='LOCAL_SYNTHETIC_TOKEN_'+n;
  sql(`insert into orders(id,user_id,product_id,scope,chapter_id,course_id,amount,list_price,provider,play_sku,status,expires_at)
   values(${lit(choice)},${lit(uid)},'seed_product','chapter','seed_c','bams',49,49,'play','local_sku','created',now()+interval '30 minutes')`);
  let a=JSON.parse(serviceSql(`select attach_ucb_external_token(${lit(uid)},${lit(choice)},${lit(token)})`));assert.equal(a.ok,true);
  a=JSON.parse(serviceSql(`select prepare_notes_choice_checkout(${lit(uid)},${lit(choice)},'seed_product',false,'KERALA')`));assert.equal(a.ok,true);
  fixture.oid='order_BCChoice'+String(n).padStart(6,'0');fixture.payment.order_id=fixture.oid;orders.set(fixture.oid,fixture.order);fixture.id=a.order_id;sql(`update orders set razorpay_order_id=${lit(fixture.oid)} where id=${lit(fixture.id)}`);

  fixture.payment.status='authorized';
  const raw=JSON.stringify({event:'payment.authorized',payload:{payment:{entity:fixture.payment}}});
  const authDelivery=()=>webhook(new Request('https://fixture.invalid/razorpay-webhook',{method:'POST',headers:{'x-razorpay-event-id':'evt_bc_authorized','x-razorpay-signature':hmac(raw)},body:raw}));
  assert.equal((await authDelivery()).status,204);
  const legacy=releaseRoot.includes('phase-b-20261111');
  assert.equal(sql(`select count(*) from payment_jobs where kind='reports' and target_id=${lit(fixture.id)}`),legacy?'0':'1');
  assert.equal(sql(`select count(*) from purchases where order_id=${lit(fixture.id)}`),'0');
  assert.equal(googleCreates,legacy?0:1);
  await authDelivery();assert.equal(googleCreates,legacy?0:1);
  fixture.payment.status='captured';assert.equal((await cb({recover:true,owner:true})).status,200);assert.ok(committed());
  if(!legacy){assert.equal(sql(`select external_report_status from orders where id=${lit(fixture.id)}`),'reported');assert.equal(googleCreates,1)}
  pass(legacy?'REPRODUCED retained B ignores choice authorization and does not queue reporting':'upgrade authorization durably queues without entitlement; actual reporting binds exact token/time/amount; duplicate authorization and owner capture create one report');
 }
 pass('Phase B actual-handler integration complete; all provider/Auth HTTP synthetic; only local PostgreSQL');
 pass('all MV003 SQL/helper/callback/webhook scenarios; zero real HTTP requests');
})().catch(e=>{console.error(e);process.exitCode=1});

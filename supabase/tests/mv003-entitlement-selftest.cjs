// Actual settlement helper, callback/webhook HMAC and production-baseline SQL.
// Provider HTTP is synthetic; all SQL goes to an explicit disposable /tmp socket.
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
let rpcFailure=null,skipGrant=false,afterGrant=null,settlements=0,providerCalls=0;
const db={from(table){assert.ok(['orders','purchases','payment_captures','payment_compensations','provider_events'].includes(table));
 let cols='*',filters=[],changes=null;
 const q={select(c){cols=c;return q},eq(k,v){assert.match(k,/^[a-z_]+$/);filters.push(`${k}=${lit(v)}`);return q},
 update(v){changes=v;return q},
 async upsert(v){try{sql(`insert into public.${table} (${Object.keys(v)}) values (${Object.values(v).map(lit)}) on conflict do nothing`);return {error:null}}catch(e){return {error:{code:'SQL'}}}},
 async maybeSingle(){try{const r=sql(`select row_to_json(r) from (select ${cols} from public.${table} where ${filters.join(' and ')} limit 1) r`);return {data:r?JSON.parse(r):null,error:null}}catch{ return {data:null,error:{code:'SQL'}}}},
 then(resolve){try{if(changes)sql(`update public.${table} set ${Object.entries(changes).map(([k,v])=>`${k}=${lit(v)}`)} where ${filters.join(' and ')}`);resolve({error:null})}catch{resolve({error:{code:'SQL'}})}}};return q},
 async rpc(name,params){
 if(name==='razorpay_entitlement_committed'&&rpcFailure)return {data:null,error:{code:rpcFailure}};
 if(name==='settle_razorpay_payment'){settlements++;if(skipGrant)return {data:null,error:null}}
 try{const r=sql(`select public.${name}(${Object.entries(params).map(([k,v])=>`${k}=>${lit(v)}`).join(',')})::text`);
 if(name==='settle_razorpay_payment'&&afterGrant){const f=afterGrant;afterGrant=null;f()}
 return {data:r==='true'?true:r==='false'?false:r||null,error:null};
 }catch(e){return {data:null,error:{code:'SQL',message:String(e.stderr)}}}
 }};
const admin={supabaseAdmin:db,getUserFromAuthHeader:async r=>r.headers.get('authorization')==='Bearer fixture-owner'?{id:fixture.user}:null};
const secret='mv003_synthetic_secret';let fixture,n=0;
const payments=new Map(),orders=new Map();
const network=async(url,init)=>{providerCalls++;assert.ok(!init?.method||init.method==='GET','provider writes prohibited');
 let body;if(url.endsWith('/payments'))body={items:[fixture.payment]};else body=payments.get(url.split('/').pop())??orders.get(url.split('/').pop());assert.ok(body,'unexpected provider request');return Response.json(body)};
function load(path,mocks,extra={}){const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,require:id=>{assert.ok(id in mocks,id);return mocks[id]},console:{log(){},warn(){},error(){}},Request,Response,TextEncoder,Uint8Array,AbortSignal,Date,crypto:webcrypto,btoa,fetch:()=>{throw Error('network prohibited')},...extra});return module.exports}
const razorpay=load('supabase/functions/_shared/razorpay.ts',{}, {fetch:network,Deno:{env:{get:k=>({APP_ENV:'production',RAZORPAY_KEY_ID:'rzp_live_SYNTHETIC',RAZORPAY_KEY_SECRET:secret})[k]}}});
const settle=load('supabase/functions/_shared/settle.ts',{'./supabaseAdmin.ts':admin,'./razorpay.ts':razorpay,'./externalReporting.ts':{},'./ucbAlert.ts':{alertUcb:async()=>{}}});
let callback,webhook;
load('supabase/functions/verify-payment/index.ts',{'../_shared/supabaseAdmin.ts':admin,'../_shared/razorpay.ts':razorpay,'../_shared/settle.ts':settle,'../_shared/rateLimit.ts':{clientIp:()=>'unknown',withinLimit:async()=>true},'../_shared/cors.ts':{handleOptions:()=>null,jsonResponse:(b,status=200)=>Response.json(b,{status})}}, {Deno:{serve:h=>callback=h}});
load('supabase/functions/razorpay-webhook/index.ts',{'../_shared/supabaseAdmin.ts':admin,'../_shared/settle.ts':settle,'../_shared/notesChoiceAuthorization.ts':{}},{Deno:{serve:h=>webhook=h,env:{get:k=>k==='RAZORPAY_WEBHOOK_SECRET'?secret:undefined}}});
function fresh(product='seed_product'){n++;rpcFailure=null;skipGrant=false;afterGrant=null;
 const user=`00300000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 sql(`insert into auth.users(id,email) values (${lit(user)},'mv003_${n}@example.invalid')`);
 const r=JSON.parse(sql(`select public.create_priced_order(${lit(user)},${lit(product)},false)`));assert.ok(r.ok);
 const oid=`order_Mv003${String(n).padStart(6,'0')}`,pid=`pay_Mv003${String(n).padStart(6,'0')}`;
 sql(`update public.orders set razorpay_order_id=${lit(oid)} where id=${lit(r.order_id)}`);
 const amount=Number(sql(`select round(amount*100) from public.orders where id=${lit(r.order_id)}`));
 const payment={id:pid,order_id:oid,status:'captured',currency:'INR',amount,created_at:Math.floor(Date.now()/1000)};
 const order={id:oid,amount,currency:'INR'};payments.set(pid,payment);orders.set(oid,order);
 fixture={id:r.order_id,user,pid,oid,payment,order};return fixture}
const params=()=>({eventId:`evt_mv003_${n}`,razorpayOrderId:fixture.oid,razorpayPaymentId:fixture.pid});
const call=()=>settle.settleCapturedPayment(params());
const committed=()=>sql(`select public.razorpay_entitlement_committed(${lit(fixture.id)},${lit(fixture.pid)})`)==='t';
const hmac=s=>createHmac('sha256',secret).update(s).digest('hex');
async function cb({signature,owner,recover=false}={}){const body=recover?{internalOrderId:fixture.id,recover:true}:{internalOrderId:fixture.id,razorpay_order_id:fixture.oid,razorpay_payment_id:fixture.pid,razorpay_signature:signature??hmac(`${fixture.oid}|${fixture.pid}`)};
 return callback(new Request('https://fixture.invalid/verify-payment',{method:'POST',headers:owner?{authorization:'Bearer fixture-owner'}:{},body:JSON.stringify(body)}))}
async function wh(){const raw=JSON.stringify({event:'payment.captured',created_at:fixture.payment.created_at,payload:{payment:{entity:fixture.payment}}});
 return webhook(new Request('https://fixture.invalid/razorpay-webhook',{method:'POST',headers:{'x-razorpay-event-id':`evt_mv003_${n}`,'x-razorpay-signature':hmac(raw)},body:raw}))}
const pass=s=>console.log('PASS '+s);
(async()=>{
 fresh();assert.equal((await call()).ok,true);assert.ok(committed());pass('valid captured payment has committed entitlement');
 for(const scope of ['chapter','subject','year','bundle']){
  sql(`insert into public.products(id,title,scope,price,chapter_id,subject_id,year_id,year_ids,course_id,active,product_type)
    values('mv003_${scope}','Fixture',${lit(scope)},49,${scope==='chapter'?"'seed_c'":'null'},${scope==='subject'?"'seed_s'":'null'},${scope==='year'?"'seed_y'":'null'},${scope==='bundle'?"array['seed_y']":'null'},'bams',true,'notes')`);
  fresh('mv003_'+scope);assert.equal((await call()).ok,true);assert.ok(committed());pass('valid '+scope+' scope commits from immutable order snapshot');
 }
 fresh();assert.equal((await call()).ok,true);
 const original=fixture;
 // Corrupt only synthetic rows in rollback transactions to test the proof independently.
 const corruptions=[['missing purchase',`delete from public.purchases where order_id=${lit(original.id)}`],
 ...['user_id','product_id','amount','course_id','scope','chapter_id','subject_id','year_id','year_ids','razorpay_order_id'].map(k=>{
 const value={user_id:'00300000-0000-4000-8000-000000000099',product_id:'other',amount:999,course_id:'other',scope:'subject',chapter_id:'other',subject_id:'other',year_id:'other',year_ids:'{other}',razorpay_order_id:'order_other'}[k];
 return ['purchase '+k,`update public.purchases set ${k}=${lit(value)} where order_id=${lit(original.id)}`]}),
 ...['user_id','product_id','amount','provider','razorpay_order_id','razorpay_payment_id','status'].map(k=>['payment '+k,`update public.payments set ${k}=${lit({user_id:'00300000-0000-4000-8000-000000000099',product_id:'other',amount:999,provider:'play',razorpay_order_id:'order_other',razorpay_payment_id:'pay_other',status:'failed'}[k])} where order_id=${lit(original.id)}`])];
 for(const [name,mutation]of corruptions){const r=sql(`begin;set local session_replication_role=replica;${name==='payment provider'?`alter table public.payments drop constraint payments_ucb_provider_check;`:''}${mutation};select public.razorpay_entitlement_committed(${lit(original.id)},${lit(original.pid)});rollback;`);assert.equal(r,'f',name);pass(name+' cannot prove commitment')}
 for(const state of ['compensation_pending','compensated','reversal_pending','reversed']){assert.equal(sql(`begin;update public.payment_captures set status=${lit(state)} where payment_id=${lit(fixture.pid)};select public.razorpay_entitlement_committed(${lit(fixture.id)},${lit(fixture.pid)});rollback;`),'f');pass(state+' cannot prove commitment')}
 for(const state of ['pending','processing','refunded','parked']){assert.equal(sql(`begin;insert into public.payment_compensations(payment_id,order_id,amount_paise,reason,refund_request_id,status) values(${lit(fixture.pid)},${lit(fixture.id)},4900,'fixture','fixture',${lit(state)});select public.razorpay_entitlement_committed(${lit(fixture.id)},${lit(fixture.pid)});rollback;`),'f');pass('compensation '+state+' cannot prove commitment')}
 for(const status of ['pending','parked']){assert.equal(sql(`begin;insert into public.provider_events(event_id,event_type,payment_id,payload_hash,status) values('reversal','refund.processed',${lit(fixture.pid)},repeat('a',64),${lit(status)});select public.razorpay_entitlement_committed(${lit(fixture.id)},${lit(fixture.pid)});rollback;`),'f');pass(status+' reversal blocks commitment')}
 // Callback must fail even with a granted capture and a void, non-error RPC.
 fresh();assert.equal((await call()).ok,true);sql(`delete from public.purchases where order_id=${lit(fixture.id)}`);skipGrant=true;
 assert.equal((await cb()).status,500);assert.equal((await wh()).status,500);assert.ok(!committed());pass('false-success reproduction: granted marker + missing purchase + normal void return retries callback/webhook');
 for(const [column,value]of [['user_id','00300000-0000-4000-8000-000000000099'],['product_id','foreign'],['amount',999],['scope','subject'],['course_id','foreign']]){
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
 // Historical runners stop before the current helper's refund RPC prerequisite.
 // Install its exact production migration definition in this disposable fixture;
 // keep the original terminal-response and entitlement assertions unchanged.
 const refundMigration=fs.readFileSync('supabase/migrations/20261112104610_audit_batch1_refund_revocation.sql','utf8');
 const refundSupport=refundMigration.match(/create or replace function public\.reverse_refunded_capture\(p_payment_id text\)[\s\S]*?grant execute on function public\.reverse_refunded_capture\(text\) to service_role;/);
 assert.ok(refundSupport,'current refund RPC fixture definition required');
 sql('alter table public.provider_events add column if not exists blocks_entitlement boolean');
 sql(refundSupport[0]);
 fresh();assert.equal((await call()).ok,true);sql(`select public.handle_payment_refund(${lit(fixture.pid)},true)`);fixture.payment.status='refunded';fixture.payment.refund_status='full';fixture.payment.amount_refunded=fixture.payment.amount;assert.equal((await cb()).status,400);assert.ok(!committed());pass('full refund/reversal cannot regrant or return success');
 assert.equal(sql("select has_function_privilege('anon','public.razorpay_entitlement_committed(text,text)','execute') or has_function_privilege('authenticated','public.razorpay_entitlement_committed(text,text)','execute')"),'f');
 assert.equal(sql("select has_function_privilege('service_role','public.razorpay_entitlement_committed(text,text)','execute')"),'t');
 assert.equal(sql(`set role service_role;select public.razorpay_entitlement_committed(${lit(fixture.id)},${lit(fixture.pid)})`),'f');pass('service-role-only ACL and SECURITY DEFINER execution');
 pass('all MV003 SQL/helper/callback/webhook scenarios; zero real HTTP requests');
})().catch(e=>{console.error(e);process.exitCode=1});

// Actual release handlers + settlement helper, real PostgreSQL; provider/Auth/Expo are synthetic.
// AUDIT_BATCH1_ROOT points at a bundle's functions directory. Requires a seeded scratch WH_DB.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { createHmac, webcrypto } = require('node:crypto');
const { load } = require('../../mobile-app/scripts/ui-harness.cjs');
assert.ok(process.env.PGHOST?.startsWith('/tmp/') || ['127.0.0.1','localhost'].includes(process.env.PGHOST), 'local host required');
assert.match(process.env.WH_DB || '', /^audit_batch1_/);
const root = process.env.AUDIT_BATCH1_ROOT || 'supabase/releases/audit-batch1-20261112/candidate/razorpay-webhook/functions';
const lit = v => v == null ? 'null' : typeof v === 'boolean' ? String(v) : "'" + String(v).replaceAll("'", "''") + "'";
const sql = q => execFileSync('psql', ['-XqAt','-v','ON_ERROR_STOP=1','-d',process.env.WH_DB,'-c',q], {encoding:'utf8'});
const scalar = q => sql(q).trim();
let failWrite = null, reversalResult, calls = [], handler, serial = 0, afterOrderRead;
const db = {
  from(table) {
    let columns='*', filters=[], changes, inserted, conflict;
    const run = () => {
      calls.push(table);
      if (failWrite === table && (changes || inserted)) return {data:null,error:{code:'INJECTED'}};
      if (inserted) {
        const keys=Object.keys(inserted), vals=keys.map(k=>lit(inserted[k]));
        scalar('insert into public.'+table+'('+keys.join(',')+') values('+vals.join(',')+')'+(conflict?' on conflict('+conflict+') do nothing':''));
      } else if (changes) scalar('update public.'+table+' set '+Object.entries(changes).map(([k,v])=>k+'='+lit(v)).join(',')+(filters.length?' where '+filters.join(' and '):''));
      else {
        const raw=scalar('select coalesce(jsonb_agg(to_jsonb(x)),\'[]\'::jsonb) from (select '+columns+' from public.'+table+(filters.length?' where '+filters.join(' and '):'')+') x');
        return {data:JSON.parse(raw),error:null};
      }
      return {data:null,error:null};
    };
    const q = {
      select(v){columns=v;return q}, eq(k,v){filters.push(k+'='+lit(v));return q},
      update(v){changes=v;return q}, upsert(v,o){inserted=v;conflict=o.onConflict;return q},
      async maybeSingle(){const r=run();if(table==='orders' && afterOrderRead){const hook=afterOrderRead;afterOrderRead=null;await hook()}return {...r,data:r.data?.[0]??null}},
      then(resolve,reject){return Promise.resolve().then(run).then(resolve,reject)},
    };return q;
  },
  async rpc(name,args) {
    calls.push(name);
    if(failWrite===name || (name==='queue_capture_compensation' && failWrite==='payment_compensations'))return {data:null,error:{code:'INJECTED'}};
    if(reversalResult!==undefined && ['handle_payment_refund','handle_payment_dispute'].includes(name))
      return {data:reversalResult,error:null};
    try {const raw=scalar('select public.'+name+'('+Object.entries(args).map(([k,v])=>k+'=>'+lit(v)).join(',')+')::text');
      let data=null;if(raw){try{data=JSON.parse(raw)}catch{data=raw}}return {data,error:null};
    } catch(e) {return {data:null,error:{code:'PSQL',message:String(e.stderr)}}}
  },
};
const payments={},orders={},disputes={},refunds={};
const provider = load(root+'/_shared/razorpay.ts',{},{
  Deno:{env:{get:k=>({APP_ENV:'production',RAZORPAY_KEY_ID:'rzp_live_synthetic',RAZORPAY_KEY_SECRET:'synthetic_secret'})[k]}},
  btoa,Response,TextEncoder,crypto:webcrypto,
  fetch:async(url,init)=>{
    assert.ok(!init?.method || init.method==='GET','provider writes prohibited');
    const parts=new URL(url).pathname.split('/'), id=parts.at(-1), kind=parts.at(-2);
    const value=id==='payments'?{items:Object.values(payments).filter(p=>p.order_id===parts.at(-2))}:
      ({payments,orders,disputes,refunds}[kind]||{})[id];
    assert.ok(value,'unexpected provider GET '+url);
    return Response.json(value);
  },
});
const helper=load(root+'/_shared/settle.ts',{
  './supabaseAdmin.ts':{supabaseAdmin:db},
  './razorpay.ts':provider,
  './externalReporting.ts':{reportExternalOrder:async()=>{},reportExternalRefundEvent:async()=>{}},
  './ucbAlert.ts':{alertUcb:async()=>{}},
});
function restartWebhook(){load(root+'/razorpay-webhook/index.ts',{'../_shared/settle.ts':helper,'../_shared/supabaseAdmin.ts':{supabaseAdmin:db},
  '../_shared/notesChoiceAuthorization.ts':{reportNotesChoiceAuthorization:async()=>{}}},
  {Deno:{serve:h=>handler=h,env:{get:k=>k==='RAZORPAY_WEBHOOK_SECRET'?'synthetic_secret':undefined}},crypto:webcrypto,TextEncoder,Response});}
restartWebhook();
async function send(event,id='evt_batch_'+(++serial),badSignature=false) {
  const body=JSON.stringify(event);
  return (await handler(new Request('https://fixture.invalid',{method:'POST',headers:{
    'x-razorpay-event-id':id,'x-razorpay-signature':badSignature?'0'.repeat(64):createHmac('sha256','synthetic_secret').update(body).digest('hex')},body}))).status;
}
function fixture(n,{linked=true,price=4900}={}) {
  const suffix=String(n).padStart(12,'0'), user='ab100000-0000-4000-8000-'+suffix;
  scalar("insert into auth.users(id,email) values("+lit(user)+","+lit('batch'+n+'@example.invalid')+"); update public.profiles set course_id='bams' where id="+lit(user));
  const priced=JSON.parse(scalar("select public.create_priced_order("+lit(user)+",'seed_product',false)"));assert.equal(priced.ok,true);
  const oid='order_Batch'+suffix,pid='pay_Batch'+suffix, did='disp_Batch'+suffix,rid='rfnd_Batch'+suffix;
  if(linked)scalar("update public.orders set razorpay_order_id="+lit(oid)+" where id="+lit(priced.order_id));
  payments[pid]={id:pid,order_id:oid,status:'captured',amount:price,currency:'INR',created_at:Math.floor(Date.now()/1000)};
  orders[oid]={id:oid,amount:price,currency:'INR'};
  const capture={event:'payment.captured',created_at:Math.floor(Date.now()/1000),payload:{payment:{entity:payments[pid]}}};
  const access=()=>scalar("select public.user_can_access_note("+lit(user)+",'seed_note')")==='t';
  return {user,id:priced.order_id,oid,pid,did,rid,capture,access};
}
let failures=0;
async function test(name,fn){try{calls=[];await fn();console.log('PASS '+name)}catch(e){failures++;console.error('FAIL '+name+': '+e.message)}finally{failWrite=null;reversalResult=undefined;afterOrderRead=null}}
(async()=>{
 await test('AUD-009 early full refund persists; later capture never grants',async()=>{
  const f=fixture(1);payments[f.pid]={...payments[f.pid],status:'refunded',refund_status:'full',amount_refunded:4900};
  refunds[f.rid]={id:f.rid,payment_id:f.pid,status:'processed',currency:'INR',amount:4900,created_at:Math.floor(Date.now()/1000)};
  const event={event:'refund.processed',payload:{refund:{entity:refunds[f.rid]}}};
  assert.ok(await send(event)>=500);assert.equal(scalar("select count(*) from public.provider_events where payment_id="+lit(f.pid)+" and status='pending'"),'1');
  assert.equal(await send(f.capture),204);assert.equal(f.access(),false);
  assert.equal(await send(event),204);assert.equal(await send(event),204);assert.equal(f.access(),false);
 });
 for(const state of ['open','lost']) await test('AUD-009 early '+state+' dispute survives duplicate/restart and capture',async()=>{
  const f=fixture(state==='open'?2:3);disputes[f.did]={id:f.did,payment_id:f.pid,status:state};
  const e={event:state==='open'?'payment.dispute.created':'payment.dispute.lost',payload:{dispute:{entity:disputes[f.did]}}};
  const eid='evt_early_'+state;assert.ok(await send(e,eid)>=500);assert.ok(await send(e,eid)>=500);
  restartWebhook();
  assert.equal(scalar("select count(*) from public.provider_events where event_id="+lit(eid)),'1');
  await send(f.capture);assert.equal(f.access(),false);assert.equal(await send(e,eid),204);assert.equal(f.access(),false);
  if(state==='open'){disputes[f.did].status='won';assert.equal(await send({...e,event:'payment.dispute.won'}),204);assert.equal(await send(f.capture),204);assert.equal(f.access(),true);}
 });
 for(const outcome of [null,{}, {status:'unknown_payment'},{status:'unexpected'}]) await test('AUD-009 unrecognized SQL result retries '+JSON.stringify(outcome),async()=>{
  const f=fixture(10+serial);disputes[f.did]={id:f.did,payment_id:f.pid,status:'open'};reversalResult=outcome;
  assert.ok(await send({event:'payment.dispute.created',payload:{dispute:{entity:disputes[f.did]}}})>=500);
 });
 for(const linked of [false,true]) await test('AUD-010 '+(linked?'amount mismatch':'unknown order')+' captures durably once',async()=>{
  const f=fixture(linked?5:4,{linked,price:linked?5000:4900});
  assert.equal(await send(f.capture,'evt_mismatch_'+linked),204);assert.equal(await send(f.capture,'evt_mismatch_'+linked),204);
  assert.equal(scalar("select count(*) from public.payment_captures where payment_id="+lit(f.pid)),'1');
  assert.equal(scalar("select count(*) from public.payment_compensations where payment_id="+lit(f.pid)),'1');
  assert.equal(f.access(),false);
 });
 for(const failed of ['record_provider_event','record_payment_capture','payment_compensations']) await test('AUD-010 '+failed+' outage is retryable',async()=>{
  const f=fixture(100+serial,{linked:false});failWrite=failed;assert.ok(await send(f.capture)>=500);
 });
 await test('AUD-012 missed refund fallback revokes paid PDF; repeated fallback cannot restore it',async()=>{
  const f=fixture(6);assert.equal(await send(f.capture),204);assert.equal(f.access(),true);
  payments[f.pid]={...payments[f.pid],status:'refunded',refund_status:'full',amount_refunded:4900};
  assert.equal(await send(f.capture),204);assert.equal(f.access(),false);
  assert.equal(scalar("select status from public.purchases where order_id="+lit(f.id)),'refunded');
  assert.equal(await send(f.capture),204);assert.equal(f.access(),false);
 });
 await test('signature rejects before any durable write',async()=>{
  const f=fixture(7);calls=[];assert.equal(await send(f.capture,undefined,true),401);assert.equal(calls.length,0);
 });
 await test('AUD-010 attach/settle race never compensates a committed grant',async()=>{
  const f=fixture(8,{linked:false});
  afterOrderRead=async()=>{
   scalar("update public.orders set razorpay_order_id="+lit(f.oid)+" where id="+lit(f.id));
   assert.equal(await send(f.capture),204);
  };
  assert.ok(await send(f.capture)>=500);
  assert.equal(f.access(),true);
  assert.equal(scalar("select count(*) from public.payment_compensations where payment_id="+lit(f.pid)),'0');
  assert.equal(scalar("select status from public.payment_captures where payment_id="+lit(f.pid)),'granted');
 });
 await test('AUD-012 full-refund fallback after chargeback never restores buyer wallet',async()=>{
  const f=fixture(9);
  scalar("select set_config('app.trusted_order_write','true',false);insert into public.wallet_ledger(user_id,entry_type,status,amount,source) values("+lit(f.user)+",'credit','available',10,'admin_adjustment')");
  // Debit fixture reproduces the accounting fact of an order using wallet.
  assert.equal(await send(f.capture),204);
  scalar("select set_config('app.trusted_order_write','true',false);insert into public.wallet_ledger(user_id,entry_type,status,amount,source,order_id) values("+lit(f.user)+",'debit','available',10,'order_payment',"+lit(f.id)+")");
  scalar("select public.handle_payment_dispute("+lit(f.pid)+",'lost')");
  payments[f.pid]={...payments[f.pid],status:'refunded',refund_status:'full',amount_refunded:4900};
  assert.equal(await send(f.capture),204);
  assert.equal(scalar("select count(*) from public.wallet_ledger where order_id="+lit(f.id)+" and source='order_refund' and entry_type='credit'"),'0');
 });
 await test('AUD-012 classified lost fact retains chargeback precedence after reversal RPC failure',async()=>{
  const f=fixture(2100);
  scalar("select set_config('app.trusted_order_write','true',false);insert into public.wallet_ledger(user_id,entry_type,status,amount,source) values("+lit(f.user)+",'credit','available',10,'admin_adjustment')");
  assert.equal(await send(f.capture),204);
  scalar("select set_config('app.trusted_order_write','true',false);insert into public.wallet_ledger(user_id,entry_type,status,amount,source,order_id) values("+lit(f.user)+",'debit','available',10,'order_payment',"+lit(f.id)+")");
  disputes[f.did]={id:f.did,payment_id:f.pid,status:'lost'};
  failWrite='handle_payment_dispute';
  assert.ok(await send({event:'payment.dispute.lost',payload:{dispute:{entity:disputes[f.did]}}})>=500);
  failWrite=null;
  payments[f.pid]={...payments[f.pid],status:'refunded',refund_status:'full',amount_refunded:4900};
  assert.equal(await send(f.capture),204);
  assert.equal(scalar("select status from public.purchases where order_id="+lit(f.id)),'chargeback');
  assert.equal(scalar("select count(*) from public.wallet_ledger where order_id="+lit(f.id)+" and source='order_refund' and entry_type='credit'"),'0');
 });
 await test('deployed verifier signed website callback and mobile recovery stay compatible',async()=>{
  const f=fixture(2000);let callback;
  const callbackRoot=root.replace('/razorpay-webhook/functions','/verify-payment/functions');
  load(callbackRoot+'/verify-payment/index.ts',{
    '../_shared/settle.ts':helper,'../_shared/razorpay.ts':provider,
    '../_shared/supabaseAdmin.ts':{supabaseAdmin:db,getUserFromAuthHeader:async()=>({id:f.user})},
    '../_shared/rateLimit.ts':{clientIp:()=> 'unknown',withinLimit:async()=>true},
    '../_shared/cors.ts':{handleOptions:()=>null,jsonResponse:(body,status=200)=>Response.json(body,{status})},
  },{Deno:{serve:h=>callback=h}});
  const payload={internalOrderId:f.id,razorpay_order_id:f.oid,razorpay_payment_id:f.pid,
    razorpay_signature:createHmac('sha256','synthetic_secret').update(f.oid+'|'+f.pid).digest('hex')};
  const call=body=>callback(new Request('https://fixture.invalid',{method:'POST',
    headers:body.recover?{Authorization:'Bearer synthetic-owner'}:{},body:JSON.stringify(body)}));
  assert.equal((await call({...payload,razorpay_signature:'0'.repeat(64)})).status,400);
  assert.equal(f.access(),false);
  for(let n=0;n<2;n++){const res=await call(payload);assert.equal(res.status,200);assert.equal((await res.json()).success,true);}
  assert.equal((await call({internalOrderId:f.id,recover:true})).status,200);
  assert.equal(f.access(),true);
  assert.equal(scalar("select count(*) from public.purchases where order_id="+lit(f.id)),'1');
 });
 console.log(failures+' failing batch regression groups');process.exitCode=failures?1:0;
})().catch(e=>{console.error(e);process.exitCode=1});

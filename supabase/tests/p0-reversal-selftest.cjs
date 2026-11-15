// Actual settlement helper, webhook and worker; all transports synthetic.
const assert = require('node:assert/strict');
const { load } = require('../../mobile-app/scripts/ui-harness.cjs');
const sourceRoot=process.env.P0_RELEASE_ROOT || 'supabase';
async function scenario(kind, result, entry = 'helper', providerStatus) {
  let handler, applied = 0, finished;
  const event = {event_type: kind === 'capture' ? 'payment.captured' : kind === 'refund' ? 'refund.processed' : 'payment.dispute.created',
    payment_id: 'pay_fixture', provider_object_id: kind === 'refund' ? 'rfnd_fixture' : 'disp_fixture'};
  const db = {from: table => ({select(){return this},eq(){return this},upsert(){return this},
    update(v){if(table === 'provider_events' && v.status === 'applied') applied++; return this},
    maybeSingle: async()=>({data:table === 'provider_events' ? event : null,error:null}),
    then(resolve){resolve({data:null,error:null})}}),rpc:async(name,args)=>{
    if(name === 'claim_payment_jobs')return {data:[{target_id:'evt_fixture',lease_id:'lease'}],error:null};
    if(name === 'finish_payment_job'){finished=args;return {data:'pending',error:null}};
    if(name === 'record_provider_event')return {data:'new',error:null};
    return {data:result,error:null};
  }};
  const helper = load(`${sourceRoot}/functions/_shared/settle.ts`, {
    './supabaseAdmin.ts':{supabaseAdmin:db},
    './razorpay.ts':{
      fetchPayment:async()=>({id:'pay_fixture',amount:100,currency:'INR',refund_status:'full',amount_refunded:100}),
      fetchRefund:async()=>({id:'rfnd_fixture',payment_id:'pay_fixture',status:'processed',amount:100,currency:'INR',created_at:1}),
      fetchDispute:async()=>({id:'disp_fixture',payment_id:'pay_fixture',status:providerStatus ?? 'open'}),
    }, './externalReporting.ts':{}, './ucbAlert.ts':{alertUcb:async()=>{}},
  });
  if(kind === 'capture')helper.settleCapturedPayment=async()=>result;
  const invoke = () => kind === 'refund'
    ? helper.settleRefund({razorpayPaymentId:'pay_fixture',razorpayRefundId:'rfnd_fixture',eventId:'evt_fixture'})
    : helper.settleDispute({disputeId:'disp_fixture',eventId:'evt_fixture'});
  if(entry === 'helper')return {result:await invoke(),applied};
  const mocks = {
    '../_shared/cors.ts':{jsonResponse:(b,s=200)=>Response.json(b,{status:s}),handleOptions:()=>null},
    '../_shared/supabaseAdmin.ts':{supabaseAdmin:db},
    '../_shared/settle.ts':helper,
    '../_shared/razorpay.ts':{verifyWebhookSignature:async()=>true},
    '../_shared/notesChoiceAuthorization.ts':{},
    '../_shared/externalReporting.ts':{}, '../_shared/googlePlay.ts':{},
    '../_shared/ucbAlert.ts':{alertUcb:async()=>{}},
    '../_shared/paymentQueue.ts':{WORK_BATCH_SIZE:40,WORK_CONCURRENCY:4,runBounded:async(xs,n,fn)=>{for(const x of xs)await fn(x)}},
  };
  const file = entry === 'webhook' ? 'razorpay-webhook' : 'report-external-transaction';
  load(`${sourceRoot}/functions/${file}/index.ts`,mocks,
    {Response,TextEncoder,crypto:require('node:crypto').webcrypto,Deno:{serve:fn=>handler=fn,env:{get:()=> 's'.repeat(40)}}});
  const payload = kind === 'capture'
    ? {payment:{entity:{id:'pay_fixture',order_id:'order_fixture',amount:100,status:'captured'}}}
    : kind === 'refund'
    ? {refund:{entity:{id:'rfnd_fixture',payment_id:'pay_fixture'}},payment:{entity:{id:'pay_fixture'}}}
    : {dispute:{entity:{id:'disp_fixture',payment_id:'pay_fixture'}}};
  const body=JSON.stringify(entry === 'webhook' ? {event:event.event_type,payload} : {phase:'events'});
  const signature=require('node:crypto').createHmac('sha256','s'.repeat(40)).update(body).digest('hex');
  const response = await handler(new Request('https://fixture.invalid',{method:'POST',
    headers:{'x-ucb-cron-secret':'s'.repeat(40),'x-razorpay-signature':signature,'x-razorpay-event-id':'evt_fixture'},body}));
  return {status:response.status,applied,finished};
}
(async()=>{
  for(const kind of ['refund','dispute'])for(const result of [null,{}, {status:'unknown_payment'}, {status:'unknown'}, {status:'unexpected'}, {status:123}]) {
    const r=await scenario(kind,result);assert.equal(r.result.ok,false);assert.equal(r.result.status,503);assert.equal(r.applied,0);
    for(const entry of ['webhook','worker']) {
      const r=await scenario(kind,result,entry);assert.ok(r.status>=500,`${kind}/${entry}: ${r.status}`);
      assert.equal(r.applied,0);if(entry === 'worker')assert.equal(r.finished.p_success,false);
    }
  }
  console.log('PASS unresolved/null/unrecognized refund and dispute results retain inbox and webhook/worker retries (36 paths)');
  for(const status of ['no_referral_credit','already_cancelled','credit_cancelled','already_reversed','referrer_gone','credit_expired','credit_reversed']) {
    for(const [kind,provider] of [['refund',undefined],['dispute','lost']]) {
      const r=await scenario(kind,{status},'helper',provider);assert.equal(r.result.ok,true);assert.equal(r.applied,1);
    }
  }
  for(const [provider,statuses] of [['open',['access_suspended','nothing_to_suspend']],['won',['access_restored','nothing_to_restore']]])
    for(const status of statuses)assert.equal((await scenario('dispute',{status},'helper',provider)).result.ok,true);
  assert.equal((await scenario('dispute',{},'helper','closed')).result.ok,true);
  for(const provider of [undefined,'new_provider_state']) {
    const r=await scenario('dispute',{},'helper',provider);assert.equal(r.result.ok,false);
  }
  console.log('PASS recognized idempotent reversal outcomes and closed manual hold preserved; unfamiliar states fail closed');
  for(const status of [400,404,409,503]) {
    const r=await scenario('capture',{ok:false,status,reason:'provider mismatch'},'webhook');assert.equal(r.status,500);
  }
  for(const reason of ['payment captured; refund queued','payment already refunded','payment reversed']) {
    const r=await scenario('capture',{ok:false,status:409,reason},'webhook');assert.equal(r.status,204);
  }
  console.log('PASS unresolved capture mismatches retain webhook retries; only durable compensation/reversal outcomes acknowledge');
})().catch(e=>{console.error(e);process.exitCode=1});

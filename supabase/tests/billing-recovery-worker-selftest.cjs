// Real worker handler; synthetic DB/provider transport. No external transaction.
const assert=require('node:assert/strict');
const {load}=require('../../mobile-app/scripts/ui-harness.cjs');
async function run({phase='events',target='capture:pay_fixture',report='reported',refund='reported',
 settlement={ok:true},authorizationError=false,captureWriteError=false,leaseLost=false}={}) {
 let handler,finished,settles=0,authorizations=0;
 const row={payment_id:'pay_fixture',razorpay_order_id:'order_fixture',provider_time:null,
  event_type:'payment.authorized',order_id:'fixture',amount_paise:4900,refund_request_id:'fixed',provider_refund_id:'rfnd_fixture'};
 const query=table=>({select(){return this},eq(){return this},update(){return this},
  maybeSingle:async()=>({data:table==='payment_queue_metrics'?null:row,error:null}),
  then(resolve){resolve({error:captureWriteError&&table==='payment_captures'?{code:'fixture'}:null})}});
 const db={from:query,rpc:async(name,args)=>{
  if(name==='claim_payment_jobs')return {data:[{target_id:target,lease_id:'fixture-lease'}],error:null};
  if(name==='finish_payment_job'){finished=args;return {data:leaseLost?'lease_lost':'done',error:null}};
  return {data:null,error:null};
 }};
 load('supabase/functions/report-external-transaction/index.ts',{
  '../_shared/cors.ts':{jsonResponse:(body,status=200)=>Response.json(body,{status})},
  '../_shared/supabaseAdmin.ts':{supabaseAdmin:db},
  '../_shared/externalReporting.ts':{reportExternalOrder:async()=>report,reportExternalRefundEvent:async()=>refund},
  '../_shared/playPurchaseValidation.ts':load('supabase/functions/_shared/playPurchaseValidation.ts',{}),
  '../_shared/googlePlay.ts':{},'../_shared/ucbAlert.ts':{alertUcb:async()=>{}},
  '../_shared/settle.ts':{settleCapturedPayment:async()=>{settles++;return settlement},settleRefund:async()=>({ok:true}),settleDispute:async()=>({ok:true})},
  '../_shared/notesChoiceAuthorization.ts':{reportNotesChoiceAuthorization:async()=>{authorizations++;if(authorizationError)throw Error('retry');}},
  '../_shared/razorpay.ts':{refundCapturedPayment:async()=>({id:'rfnd_fixture'})},
  '../_shared/paymentQueue.ts':{WORK_BATCH_SIZE:40,WORK_CONCURRENCY:4,runBounded:async(xs,_n,fn)=>{for(const x of xs)await fn(x)}},
 },{Deno:{serve:fn=>handler=fn,env:{get:()=> 'x'.repeat(32)}}});
 const response=await handler(new Request('https://fixture.invalid',{method:'POST',headers:{'x-ucb-cron-secret':'x'.repeat(32)},body:JSON.stringify({phase})}));
 return {status:response.status,finished,settles,authorizations};
}
(async()=>{
 for(const phase of ['reports','refunds']) {
  const r=await run({phase,report:'skipped',refund:'skipped'});
  assert.equal(r.status,503);assert.equal(r.finished.p_success,false);
 }
 console.log('PASS skipped reports/refunds cannot finish durable jobs successfully');
 let r=await run({settlement:{ok:false,status:503,reason:'entitlement pending'}});
 assert.equal(r.status,503);assert.equal(r.finished.p_success,false);assert.equal(r.settles,1);
 r=await run();assert.equal(r.status,200);assert.equal(r.finished.p_success,true);
 console.log('PASS capture-only crash recovery retries until authoritative settlement commits');
 r=await run({target:'evt_authorized',authorizationError:true});assert.equal(r.status,503);assert.equal(r.finished.p_success,false);
 r=await run({target:'evt_authorized'});assert.equal(r.status,200);assert.equal(r.authorizations,1);
 console.log('PASS authorization inbox retries reporting without granting Notes');
 r=await run({phase:'compensate',captureWriteError:true});assert.equal(r.status,503);assert.equal(r.finished.p_success,false);
 r=await run({leaseLost:true});assert.equal(r.status,503);
 console.log('PASS compensation persistence errors and lost worker leases cannot return job success');
})().catch(error=>{console.error(error);process.exitCode=1});

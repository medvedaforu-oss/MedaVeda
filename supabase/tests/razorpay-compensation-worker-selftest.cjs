const assert=require('node:assert/strict');
const {load}=require('../../mobile-app/scripts/ui-harness.cjs');
let handler,calls=[],mode='empty',refunds=0;
const lease='11111111-1111-4111-8111-111111111111';
const env={RAZORPAY_COMPENSATION_WORKER_SECRET:'s'.repeat(64),RAZORPAY_COMPENSATION_ENABLED:'true',RAZORPAY_COMPENSATION_AFTER:'2026-11-26T00:00:00.000Z'};
load('supabase/functions/razorpay-compensation-worker/index.ts',{
 '../_shared/cors.ts':{jsonResponse:(body,status=200)=>Response.json(body,{status})},
 '../_shared/supabaseAdmin.ts':{supabaseAdmin:{rpc:async(name,args)=>{
  calls.push({name,args});
  if(mode==='db-fail')return {data:null,error:{code:'fixture'}};
  if(name==='claim_razorpay_compensation')return {data:mode==='empty'?null:{payment_id:'pay_fixture',worker_lease_id:lease},error:null};
  if(name==='prepare_razorpay_compensation')return {data:mode==='ineligible'?null:{payment_id:'pay_fixture'},error:null};
  return {data:mode!=='finish-fail',error:null};
 }}},
 '../_shared/razorpayCompensation.ts':{recoverCompensationRefund:async(item,fence)=>{
  refunds++;assert(await fence());if(mode==='ambiguous')throw Error('lost response');return {id:'rfnd_fixture'};
 }},
},{Deno:{serve:h=>handler=h,env:{get:k=>env[k]}},Request,Response});
const send=(secret=env.RAZORPAY_COMPENSATION_WORKER_SECRET,body='{}',method='POST')=>handler(new Request('https://local',{method,
 headers:{'x-razorpay-compensation-secret':secret},...(method==='POST'?{body}:{})}));
(async()=>{
 assert.equal((await send('wrong')).status,401);assert.equal(calls.length,0);
 assert.equal((await send('')).status,401);assert.equal((await send(undefined,'{}','GET')).status,405);
 for(const body of ['null','[]','{"phase":"reports"}','{"orderId":"historical"}','{'])assert.equal((await send(undefined,body)).status,400);
 assert.equal(calls.length,0);
 env.RAZORPAY_COMPENSATION_ENABLED='false';assert.equal((await send()).status,503);assert.equal(calls.length,0);
 env.RAZORPAY_COMPENSATION_ENABLED='true';env.RAZORPAY_COMPENSATION_AFTER='bad';assert.equal((await send()).status,503);assert.equal(calls.length,0);
 env.RAZORPAY_COMPENSATION_AFTER='2026-11-26T00:00:00.000Z';
 assert.equal((await send()).status,200);assert.equal(refunds,0);
 mode='ineligible';assert.equal((await send()).status,503);assert.equal(refunds,0);
 mode='success';assert.equal((await send()).status,200);assert.equal(refunds,1);
 mode='ambiguous';assert.equal((await send()).status,503);
 assert.equal(calls.at(-1).args.p_refund_id,null);
 mode='finish-fail';assert.equal((await send()).status,503);
 mode='db-fail';assert.equal((await send()).status,503);
 assert(calls.every(c=>['claim_razorpay_compensation','prepare_razorpay_compensation','finish_razorpay_compensation'].includes(c.name)));
 console.log('PASS compensation worker: auth, disabled gate, cutoff, input, eligibility, recovery/finalization failures, no unrelated payment phases');
})().catch(e=>{console.error(e);process.exitCode=1});

const assert=require('node:assert/strict');
process.chdir('/home/ganeshp8545/AyurPulse');
const {load}=require('/home/ganeshp8545/AyurPulse/mobile-app/scripts/ui-harness.cjs');
async function test(path){
 let applied=0;
 const db={from:()=>({update(){applied++;return this},eq(){return this},select(){return this},maybeSingle:async()=>({data:null,error:null}),then:r=>r({error:null})}),rpc:async()=>({data:{status:'unknown_payment'},error:null})};
 const api=load(path,{'./supabaseAdmin.ts':{supabaseAdmin:db},'./razorpay.ts':{fetchPayment:async()=>({id:'pay_fixture',amount:100,currency:'INR',refund_status:'full',amount_refunded:100}),fetchRefund:async()=>({id:'rfnd_fixture',payment_id:'pay_fixture',status:'processed',currency:'INR',amount:100,created_at:1800000000}),fetchDispute:async()=>({id:'disp_fixture',payment_id:'pay_fixture',status:'lost'})},'./externalReporting.ts':{},'./ucbAlert.ts':{alertUcb:async()=>{}}});
 const refund=await api.settleRefund({razorpayPaymentId:'pay_fixture',razorpayRefundId:'rfnd_fixture',eventId:'evt_fixture'});
 const dispute=await api.settleDispute({disputeId:'disp_fixture',eventId:'evt_fixture2'});
 console.log(JSON.stringify({path,refund,dispute}));return {refund,dispute};
}
(async()=>{
 const current=await test('supabase/functions/_shared/settle.ts');
 const candidate=await test('supabase/releases/b-to-c-compatible-20261111/functions/_shared/settle.ts');
 assert.equal(current.refund.ok,true);assert.equal(current.dispute.ok,true);assert.equal(candidate.refund.ok,false);assert.equal(candidate.dispute.ok,false);
 console.log('REPRODUCED: workspace acknowledges unknown reversals; isolated compatible candidate refuses them');
})().catch(e=>{console.error(e);process.exitCode=1});

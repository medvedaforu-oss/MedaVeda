const assert=require('node:assert/strict');const {load}=require('../../../../mobile-app/scripts/ui-harness.cjs');
(async()=>{let result={data:{success:true,pushed:1}},sent;
const service=load('admin-panel/src/services/notificationService.ts',{'../config/supabase':{supabase:{auth:{getSession:async()=>({data:{session:{access_token:'synthetic'}}})},functions:{invoke:async(name,args)=>{assert.equal(name,'send-push-notification');sent=args.body;return result}}}}});
const payload={title:'Synthetic',body:'Fixture',type:'announcement',requestId:'11111111-1111-4111-8111-111111111111'};
assert.equal((await service.sendPushNotification(payload)).pushed,1);assert.equal(sent.requestId,payload.requestId);
for(const data of [{code:'unknown_outcome'},{code:'enumeration_failed'},{unknown:1},{success:false}]){result={data};await assert.rejects(()=>service.sendPushNotification(payload),/check the notification feed before retrying/i)}
let called=0;const analytics=load('admin-panel/src/services/analyticsService.ts',{'../config/supabase':{supabase:{rpc:async(name,args)=>{called++;assert.equal(name,'get_admin_analytics');assert.equal(args.p_course_id,'bams');return{data:{totalOrders:1,topProducts:[]}}}}}});
assert.equal((await analytics.getAnalytics({courseId:'bams'})).totalOrders,1);assert.equal(called,1);
console.log('PASS ADM-03 requestId preserved, unknown/enumeration outcomes explicitly require feed reconciliation; ADM-08 uses one course-bound snapshot RPC')})().catch(e=>{console.error(e);process.exitCode=1});

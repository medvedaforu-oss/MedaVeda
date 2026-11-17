const assert=require('node:assert/strict');
const {load,jsx,nodes}=require('../../mobile-app/scripts/ui-harness.cjs');
// Aggregation and >1000-row completeness are exercised against actual SQL in
// supabase/tests/admin_analytics_checks.sql. Here test the client RPC boundary.
let fail=false, snapshot;
const db={rpc:async(name,args)=>{
 assert.equal(name,'get_admin_analytics');
 assert.equal(Object.keys(args).join(','),'p_course_id');
 if(fail)return {data:null,error:Error('snapshot denied')};
 return {data:args.p_course_id==='another'?{...snapshot,totalOrders:0}:snapshot,error:null};
}};
(async()=>{
 const api=load('admin-panel/src/services/analyticsService.ts',{'../config/supabase':{supabase:db}});
 snapshot={totalOrders:1003,totalRevenue:1001,paidOrders:1001,refundedOrders:1,pendingOrders:1,failedOrders:0,totalUsers:5,totalProducts:2,topProducts:[]};
 const result=await api.getAnalytics({courseId:'bams',yearId:'ignored'});
 assert.equal(result.totalOrders,1003);assert.equal(result.totalRevenue,1001);assert.equal(result.paidOrders,1001);assert.equal(result.refundedOrders,1);assert.equal(result.pendingOrders,1);
 assert.equal((await api.getAnalytics({courseId:'another'})).totalOrders,0);
 fail=true;await assert.rejects(api.getAnalytics(),/snapshot denied/);fail=false;
 for(const invalid of [null,{}, {totalOrders:1,topProducts:null},{totalOrders:1.5,topProducts:[]},{totalOrders:Number.MAX_SAFE_INTEGER+1,topProducts:[]}]){
  snapshot=invalid;await assert.rejects(api.getAnalytics(),/snapshot unavailable/i);
 }
 const Table=load('admin-panel/src/components/OrdersTable.tsx',{'react/jsx-runtime':jsx}).default;
 let changes=0;
 for(const status of ['paid','refunded','failed','cancelled','authorized','chargeback']){
  const tree=Table({orders:[{id:'o',status}],onStatusChange:()=>changes++});assert.equal(nodes(tree).filter(n=>n.type==='select'&&!n.props.disabled).length,0,status);
 }
 const tree=Table({orders:[{id:'o',status:'created'}],onStatusChange:()=>changes++});
 const select=nodes(tree).find(n=>n.type==='select');const options=nodes(select).filter(n=>n.type==='option'&&!n.props.disabled).map(n=>n.props.value);
 assert.equal(options.join(','),'failed,cancelled');select.props.onChange({target:{value:'paid'}});assert.equal(changes,0);select.props.onChange({target:{value:'cancelled'}});assert.equal(changes,1);
 console.log('PASS admin analytics RPC snapshots, course filter, denial and malformed snapshot propagation; provider states read-only and unpaid fail/cancel only');
})().catch(e=>{console.error(e);process.exitCode=1});

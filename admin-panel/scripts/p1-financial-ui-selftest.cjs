const assert=require('node:assert/strict');
const {load,jsx,nodes}=require('../../mobile-app/scripts/ui-harness.cjs');
const filters=load('admin-panel/src/utils/filters.ts',{});
const rows=Array.from({length:1001},(_,i)=>({id:String(i).padStart(5,'0'),product_id:i%2?'b':'a',amount:1,status:'paid',course_id:'bams',products:{title:'Notes'}}));
rows.push({id:'extra',status:'refunded',amount:99,course_id:'bams'},{id:'pending',status:'created',amount:2,course_id:'bams'});
let fail=false;
const calls=[];
const db={rpc:async(name,args)=>{
 assert.equal(name,'get_admin_analytics');calls.push(args);
 if(fail)return {data:null,error:Error('snapshot denied')};
 const scoped=rows.filter(row=>!args.p_course_id||row.course_id===args.p_course_id);
 const paid=scoped.filter(row=>row.status==='paid');
 return {data:{totalOrders:scoped.length,totalRevenue:paid.reduce((sum,row)=>sum+row.amount,0),paidOrders:paid.length,
  refundedOrders:scoped.filter(row=>row.status==='refunded').length,pendingOrders:scoped.filter(row=>row.status==='created').length,
  totalUsers:5,totalProducts:2,topProducts:[]},error:null};
}};
(async()=>{
 const api=load('admin-panel/src/services/analyticsService.ts',{'../config/supabase':{supabase:db},'../utils/filters':filters});
 let result=await api.getAnalytics({courseId:'bams',yearId:'ignored'});
 assert.equal(result.totalOrders,1003);assert.equal(result.totalRevenue,1001);assert.equal(result.paidOrders,1001);assert.equal(result.refundedOrders,1);assert.equal(result.pendingOrders,1);
 assert.equal(calls[0].p_course_id,'bams');
 assert.equal((await api.getAnalytics({courseId:'another'})).totalOrders,0);
 fail=true;await assert.rejects(api.getAnalytics(),/snapshot denied/);fail=false;
 const Table=load('admin-panel/src/components/OrdersTable.tsx',{'react/jsx-runtime':jsx}).default;
 let changes=0;
 for(const status of ['paid','refunded','failed','cancelled','authorized','chargeback']){
  const tree=Table({orders:[{id:'o',status}],onStatusChange:()=>changes++});assert.equal(nodes(tree).filter(n=>n.type==='select'&&!n.props.disabled).length,0,status);
 }
 const tree=Table({orders:[{id:'o',status:'created'}],onStatusChange:()=>changes++});
 const select=nodes(tree).find(n=>n.type==='select');const options=nodes(select).filter(n=>n.type==='option'&&!n.props.disabled).map(n=>n.props.value);
 assert.equal(options.join(','),'failed,cancelled');select.props.onChange({target:{value:'paid'}});assert.equal(changes,0);select.props.onChange({target:{value:'cancelled'}});assert.equal(changes,1);
 console.log('PASS admin snapshot RPC contract, >1000 orders, exact revenue, course filter, snapshot failures; provider states read-only and unpaid fail/cancel only');
})().catch(e=>{console.error(e);process.exitCode=1});

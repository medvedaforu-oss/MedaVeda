const assert=require('node:assert/strict');
const {load,jsx,nodes}=require('../../mobile-app/scripts/ui-harness.cjs');
const filters=load('admin-panel/src/utils/filters.ts',{});
const rows=Array.from({length:1001},(_,i)=>({id:String(i).padStart(5,'0'),product_id:i%2?'b':'a',amount:1,status:'paid',course_id:'bams',products:{title:'Notes'}}));
rows.push({id:'extra',status:'refunded',amount:99,course_id:'bams'},{id:'pending',status:'created',amount:2,course_id:'bams'});
const orders=[];
let fail=false;
const db={from:table=>{
 let course,from=0,to=999;
 return {select(){return this},eq(k,v){assert.equal(k,'course_id');course=v;return this},order(k){orders.push(k);return this},range(a,b){from=a;to=b;return this},then(resolve){
 if(table==='orders')return resolve({data:rows.filter(r=>!course||r.course_id===course).slice(from,to+1),error:fail&&from>0?Error('page denied'):null});
 return resolve({count:table==='profiles'?5:2,error:null});
 }};
}};
(async()=>{
 const api=load('admin-panel/src/services/analyticsService.ts',{'../config/supabase':{supabase:db},'../utils/filters':filters});
 let result=await api.getAnalytics({courseId:'bams',yearId:'ignored'});
 assert.equal(result.totalOrders,1003);assert.equal(result.totalRevenue,1001);assert.equal(result.paidOrders,1001);assert.equal(result.refundedOrders,1);assert.equal(result.pendingOrders,1);
 assert.ok(orders.includes('id'),'pages must have stable unique ordering');
 assert.equal((await api.getAnalytics({courseId:'another'})).totalOrders,0);
 fail=true;await assert.rejects(api.getAnalytics(),/page denied/);fail=false;
 const Table=load('admin-panel/src/components/OrdersTable.tsx',{'react/jsx-runtime':jsx}).default;
 let changes=0;
 for(const status of ['paid','refunded','failed','cancelled','authorized','chargeback']){
  const tree=Table({orders:[{id:'o',status}],onStatusChange:()=>changes++});assert.equal(nodes(tree).filter(n=>n.type==='select'&&!n.props.disabled).length,0,status);
 }
 const tree=Table({orders:[{id:'o',status:'created'}],onStatusChange:()=>changes++});
 const select=nodes(tree).find(n=>n.type==='select');const options=nodes(select).filter(n=>n.type==='option'&&!n.props.disabled).map(n=>n.props.value);
 assert.equal(options.join(','),'failed,cancelled');select.props.onChange({target:{value:'paid'}});assert.equal(changes,0);select.props.onChange({target:{value:'cancelled'}});assert.equal(changes,1);
 console.log('PASS admin >1000 orders, exact revenue, course filter, page failures, stable pagination; provider states read-only and unpaid fail/cancel only');
})().catch(e=>{console.error(e);process.exitCode=1});

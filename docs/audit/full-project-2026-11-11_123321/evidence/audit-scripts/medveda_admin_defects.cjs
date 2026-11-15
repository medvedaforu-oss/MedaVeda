const assert=require('node:assert/strict');process.chdir('/home/ganeshp8545/AyurPulse');const {load}=require('/home/ganeshp8545/AyurPulse/mobile-app/scripts/ui-harness.cjs');
(async()=>{
 const rows=Array.from({length:1001},(_,i)=>({id:String(i),status:'paid',amount:1,product_id:'fixture',products:{title:'Notes'}}));let reads=0;
 const service=load('admin-panel/src/services/analyticsService.ts',{'../config/supabase':{supabase:{from:table=>({select:(_c,opts)=>{if(table==='orders'){reads++;return Promise.resolve({data:rows.slice(0,1000),error:null})}return Promise.resolve({count:1,error:null})}})}},'../utils/filters':{applyContentFilters:q=>q}});
 const totals=await service.getAnalytics();assert.equal(totals.totalRevenue,1000);assert.equal(totals.totalOrders,1000);assert.equal(reads,1);console.log('REPRODUCED bounded API response: 1001 paid orders of INR 1 -> displayed revenue/order count 1000; only one orders read; omitted final page');
 const fs=require('node:fs');const menu=fs.readFileSync('admin-panel/src/components/OrdersTable.tsx','utf8');const sql=fs.readFileSync('supabase/migrations/20260924110000_critical2_orders_server_only.sql','utf8');
 for(const status of ['created','paid','refunded'])assert.ok(menu.includes(`value="${status}"`));assert.ok(sql.includes("p_status not in ('cancelled', 'failed')"));console.log('CONFIRMED UI/API mismatch: menu offers created/paid/refunded writes; SQL RPC permits only cancelled/failed');
})().catch(e=>{console.error(e);process.exitCode=1});

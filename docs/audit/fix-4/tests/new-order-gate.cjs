const assert=require('node:assert/strict');
const fs=require('node:fs');
const {load}=require('../../../../mobile-app/scripts/ui-harness.cjs');
const {newOrdersEnabled}=load('supabase/functions/_shared/newOrderGate.ts',{});
(async()=>{
 for(const response of [{data:{new_orders_enabled:false}},{data:null},{error:{code:'missing'}},{data:{new_orders_enabled:'true'}}]) {
  let queries=0; const client={from(t){assert.equal(t,'purchase_settings');queries++;return{select(){return this},eq(){return this},maybeSingle:async()=>response}}};
  assert.equal(await newOrdersEnabled(client),false);assert.equal(queries,1);
 }
 assert.equal(await newOrdersEnabled({from(){throw Error('network')}}),false);
 assert.equal(await newOrdersEnabled({from(){return{select(){return this},eq(){return this},maybeSingle:async()=>({data:{new_orders_enabled:true}})}}}),true);
 for(const path of ['supabase/functions/_shared/createOrderHandler.ts','supabase/functions/_shared/notesChoiceOrder.ts','supabase/functions/create-play-order/index.ts']){
  const source=fs.readFileSync(path,'utf8'); assert.ok(source.indexOf('if (!await newOrdersEnabled(supabaseAdmin))')>0);
  assert.ok(source.indexOf('if (!await newOrdersEnabled(supabaseAdmin))')<source.indexOf('await req.json()'));
 }
 console.log('PASS default/missing/invalid/error denied; explicit enable only; all new-order entrypoints gate before request/provider/order work');
})().catch(e=>{console.error(e);process.exitCode=1});

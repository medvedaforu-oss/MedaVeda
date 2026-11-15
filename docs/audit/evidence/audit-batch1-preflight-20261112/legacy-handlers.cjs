// Exact deployed v69/v51 handlers + HMAC/provider validation; real scratch SQL, GET-only mock transport.
const path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');const {createHmac,webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'../../../..');const {load}=require(root+'/mobile-app/scripts/ui-harness.cjs');
assert.ok(process.env.PGHOST?.startsWith('/tmp/'));assert.match(process.env.WH_DB||'',/^audit_batch1_preflight_/);
const lit=v=>v==null?'null':typeof v==='boolean'?String(v):"'"+String(v).replaceAll("'","''")+"'";
const sql=q=>execFileSync('psql',['-XqAt','-v','ON_ERROR_STOP=1','-d',process.env.WH_DB,'-c',q],{encoding:'utf8'}).trim();
const user='ab140000-0000-4000-8000-000000000001';
sql("insert into auth.users(id,email) values('"+user+"','preflight-legacy@example.invalid');update profiles set course_id='bams' where id='"+user+"'");
const priced=JSON.parse(sql("select create_priced_order('"+user+"','seed_product',false)"));assert.ok(priced.ok);
const id=priced.order_id,oid='order_PfLegacy123',pid='pay_PfLegacy123',secret='preflight_synthetic';
sql("update orders set razorpay_order_id='"+oid+"' where id='"+id+"'");
let payment={id:pid,order_id:oid,status:'captured',amount:4900,currency:'INR',created_at:Math.floor(Date.now()/1000)};
const db={from(table){let cols='*',where=[];const q={select(v){cols=v;return q},eq(k,v){where.push(k+'='+lit(v));return q},async maybeSingle(){const out=sql('select row_to_json(x) from (select '+cols+' from public.'+table+' where '+where.join(' and ')+' limit 1)x');return {data:out?JSON.parse(out):null,error:null}}};return q},async rpc(name,args){try{const out=sql('select '+name+'('+Object.entries(args).map(([k,v])=>k+'=>'+lit(v)).join(',')+')::text');return {data:out?JSON.parse(out):null,error:null}}catch(e){return {data:null,error:{code:'SQL'}}}}};
const base=root+'/supabase/releases/audit-batch1-20261112/baseline';
const globals={TextEncoder,Response,crypto:webcrypto,btoa,Deno:{env:{get:k=>({RAZORPAY_KEY_ID:'rzp_live_synthetic',RAZORPAY_KEY_SECRET:secret,RAZORPAY_WEBHOOK_SECRET:secret,RAZORPAY_WEBHOOK_PREVIOUS_SECRET:'previous_synthetic'})[k]}},fetch:async(url,init)=>{assert.ok(!init.method||init.method==='GET');return Response.json(url.endsWith('/payments')?{items:[payment]}:url.includes('/payments/')?payment:{id:oid,amount:4900,currency:'INR'})}};
const provider=load(base+'/verify-payment/functions/_shared/razorpay.ts',{},globals);
const helper=load(base+'/verify-payment/functions/_shared/settle.ts',{'./supabaseAdmin.ts':{supabaseAdmin:db},'./razorpay.ts':provider});let callback,webhook;
load(base+'/verify-payment/functions/verify-payment/index.ts',{'../_shared/supabaseAdmin.ts':{supabaseAdmin:db},'../_shared/razorpay.ts':provider,'../_shared/settle.ts':helper,'../_shared/rateLimit.ts':{clientIp:()=> 'unknown',withinLimit:async()=>true},'../_shared/cors.ts':{handleOptions:()=>null,jsonResponse:(b,status=200)=>Response.json(b,{status})}},{Deno:{serve:h=>callback=h}});
load(base+'/razorpay-webhook/functions/razorpay-webhook/index.ts',{'../_shared/settle.ts':helper},{...globals,Deno:{...globals.Deno,serve:h=>webhook=h}});
const sign=(v,key=secret)=>createHmac('sha256',key).update(v).digest('hex');
const body={internalOrderId:id,razorpay_order_id:oid,razorpay_payment_id:pid,razorpay_signature:sign(oid+'|'+pid)};
const call=v=>callback(new Request('https://fixture.invalid',{method:'POST',body:JSON.stringify(v)}));
let serial=0;async function send(event,key=secret){const raw=JSON.stringify(event);return webhook(new Request('https://fixture.invalid',{method:'POST',headers:{'x-razorpay-event-id':'evt_pf_legacy_'+(++serial),'x-razorpay-signature':sign(raw,key)},body:raw}));}
const access=()=>sql("select user_can_access_note('"+user+"','seed_note')")==='t';
(async()=>{
 assert.equal((await call({...body,razorpay_signature:'0'.repeat(64)})).status,400);assert.equal(access(),false);console.log('PASS exact deployed verifier rejects forged callback before entitlement');
 assert.equal((await call(body)).status,200);assert.equal(access(),true);assert.equal((await call(body)).status,200);assert.equal((await call({internalOrderId:id,recover:true})).status,200);console.log('PASS exact deployed website signed callback and legacy mobile recovery succeed after migration');
 const event={event:'payment.captured',payload:{payment:{entity:payment}}};assert.equal((await send(event)).status,204);assert.equal((await send(event,'previous_synthetic')).status,204);
 assert.equal(sql("select count(*) from purchases where order_id='"+id+"'"),'1');assert.equal(sql("select count(*) from payments where order_id='"+id+"'"),'1');console.log('PASS exact deployed webhook/current and previous HMAC secrets preserve one grant on duplicates');
 payment={...payment,amount_refunded:100,refund_status:'partial'};const refund={event:'refund.processed',payload:{refund:{entity:{payment_id:pid}}}};assert.equal((await send(refund)).status,204);assert.equal(access(),true);console.log('PASS exact deployed partial-refund path preserves legitimate paid access');
 payment={...payment,status:'refunded',amount_refunded:4900,refund_status:'full'};assert.equal((await send(refund)).status,204);assert.equal(access(),false);assert.equal((await call(body)).status,400);console.log('PASS exact deployed full-refund path revokes access and callback cannot regrant');
})().catch(e=>{console.error(e);process.exitCode=1});

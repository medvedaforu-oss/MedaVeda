const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),{execFileSync}=require('child_process');
const ts=require('/home/ganeshp8545/AyurPulse/mobile-app/node_modules/typescript');
const {setup,cb,event}=require('/tmp/medveda-website-payment-parity.cjs');
assert.equal(process.env.PGHOST,'/tmp/medveda-live-payment-pg');
const template=fs.readFileSync('/tmp/medveda-website-template-name','utf8').trim();
assert.match(template,/^website_review_[a-f0-9]+$/);
const sql=(db,s)=>execFileSync('psql',['-XqAt','-v','ON_ERROR_STOP=1','-d',db,'-c',s],{encoding:'utf8'}).trim();
const roots=['/tmp/medveda-live-backend-rollback/supabase/functions','/tmp/medveda-live-backend-review/supabase/functions'];
(async()=>{
for(let i=0;i<roots.length;i++){
 const dbname=template+'_stage'+i;sql('postgres',`create database ${dbname} template ${template}`);
 try {
 process.env.WH_DB=dbname;
 sql(dbname,"insert into auth.users(id,email) values ('11111111-1111-4111-8111-111111111111','website-fixture@example.invalid')");
 const priced=JSON.parse(sql(dbname,"select public.create_priced_order('11111111-1111-4111-8111-111111111111','seed_product',false)"));assert.equal(priced.ok,true);
 const id=priced.order_id;assert.match(id,/^[a-f0-9-]+$/);
 sql(dbname,`update public.orders set razorpay_order_id='order_synthetic' where id='${id}'`);
 const paise=Number(sql(dbname,`select round(amount*100) from public.orders where id='${id}'`));
 const mod={exports:{}};const source=fs.readFileSync('/home/ganeshp8545/AyurPulse/supabase/tests/webhook-harness/supabaseAdmin.mock.ts','utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:mod,exports:mod.exports,require,process,console});
 const api=setup(roots[i],{databaseTransport:mod.exports.supabaseAdmin,amount:paise,orderAmount:paise});
 for(let attempt=0;attempt<2;attempt++){
 const response=await api.callback(cb({internalOrderId:id}));assert.equal(response.status,200);assert.equal((await response.json()).success,true);
 assert.equal((await api.webhook(event())).status,204);
 }
 assert.equal(sql(dbname,`select count(*) from public.purchases where order_id='${id}' and status='success'`),'1');
 assert.equal(sql(dbname,`select public.razorpay_entitlement_committed('${id}','pay_synthetic')`),'t');
 sql(dbname,"delete from public.payment_captures where payment_id='pay_synthetic'");
 assert.equal(sql(dbname,`select public.razorpay_entitlement_committed('${id}','pay_synthetic')`),'t');
 assert.equal((await api.callback(cb({internalOrderId:id}))).status,200);
 console.log('PASS '+(i?'candidate':'deployed baseline')+' actual SQL: fresh callback, duplicate callbacks/webhooks, one durable purchase, historical missing capture marker');
 // Reproduce the real normal-void/no-purchase condition in this disposable DB.
 sql(dbname,`delete from public.purchases where order_id='${id}'`);
 const broken=await api.callback(cb({internalOrderId:id}));
 assert.equal(broken.status,i?500:200);assert.equal((await broken.json()).success,i?false:true);
 console.log('PASS '+(i?'candidate refuses':'deployed baseline reproduces')+' false success using actual void SQL settlement');
 } finally {sql('postgres','drop database '+dbname);}
}
})().catch(error=>{console.error(error);process.exitCode=1});

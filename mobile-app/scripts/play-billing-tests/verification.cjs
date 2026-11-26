// Run current real handler tests against the isolated standalone copy. Only
// synthetic fixture account IDs and Deno environment injection are adapted.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../../..'),mobile=path.join(root,'mobile-app');
let source=fs.readFileSync(path.join(root,'supabase/tests/play-verification-selftest.cjs'),'utf8');
source=source.replaceAll('buyer','11111111-1111-4111-8111-111111111111');
source=source.replace("purchase: { purchaseStateContext:","purchase: { testPurchaseContext: {}, purchaseStateContext:");
source=source.replace('Deno: { serve: fn => { handler=fn; } }',`Deno: { env: { get: key => key === 'PLAY_STANDALONE_TEST_ENABLED' ? (state.testEnabled === false ? 'false' : 'true') : state.testAllowed === false ? '' : '11111111-1111-4111-8111-111111111111' }, serve: fn => { handler=fn; } }`);
source=source.replace('  let t=setup(), result=await t.invoke();',`  for (const mode of ['real','disabled','foreign']) {
    const fixture=setup();
    if(mode==='real')delete fixture.state.purchase.testPurchaseContext;
    if(mode==='disabled')fixture.state.testEnabled=false;
    if(mode==='foreign')fixture.state.testAllowed=false;
    const response=await fixture.invoke();assert.equal(response.status,403);assert.equal(fixture.state.settled,0);assert.equal(fixture.state.consumed,0);
  }
  console.log('PASS standalone verifier rejects real receipts, disabled testing and non-allowlisted users before settlement');
  let t=setup(), result=await t.invoke();`);
// Both current verifiers re-read committed identity; exercise standalone as well.
source=source.replace('  for (const [label, change, status]', `  for (const duplicate of [false, true]) {
    for (const effects of [
      { omitSettlementEffects: true },
      ...Object.entries({ status: 'created', purchase_token: null }).map(([key, value]) =>
        ({ settlementOverride: { [key]: value } })),
      ...Object.entries({ id: 'foreign-order', user_id: 'foreign-owner', product_id: 'foreign-product',
        provider: 'razorpay', purchase_token: 'foreign-token', play_sku: 'foreign-sku',
        play_purchase_option_id: 'foreign-option', amount: 99,
        external_transaction_token: 'foreign-external-token', external_choice_bound_order_id: 'foreign-external-order' })
        .map(([key, value]) => ({ settlementOverride: { [key]: value } })),
    ]) {
      t=setup(); Object.assign(t.state, { duplicate, ...effects }); result=await t.invoke();
      const label=JSON.stringify({ duplicate, ...effects });
      assert.equal(result.status,503,label); assert.equal(result.body.pending,true,label);
      assert.equal(t.state.settled,1,label); assert.equal(t.state.consumed,0,label);
      assert.equal(t.state.updates.length,0,label + ': must not mark consumption');
    }
    t=setup();Object.assign(t.state,{duplicate,committed:false});result=await t.invoke();
    assert.equal(result.status,503);assert.equal(t.state.consumed,0);assert.equal(t.state.updates.length,0);
  }
  console.log('PASS 26 missing/mismatched settlement effects and both uncommitted proof paths remain pending without consumption');
  for (const [label, change, status]`);
const proxyFs={readFileSync(file,...args){
 if(file==='supabase/functions/verify-play-purchase/index.ts')return fs.readFileSync(path.join(root,'supabase/functions/verify-standalone-play-purchase/index.ts'),...args);
 return fs.readFileSync(path.resolve(root,file),...args);
}};
vm.runInNewContext(source,{require:id=>id==='node:fs'?proxyFs:id==='../../mobile-app/node_modules/typescript'?require('typescript'):require(id),process,console,Request,Response,Date},{filename:'standalone-verification-fixtures.cjs'});

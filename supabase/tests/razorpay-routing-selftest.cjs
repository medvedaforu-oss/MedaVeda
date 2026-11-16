// Actual standard/staging entrypoints and shared handler; no hosted payment.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../../mobile-app/node_modules/typescript');
const staging = 'https://nsmsqsogedzohwboripd.supabase.co';
function setup({test = false, environment = {}, user = 'buyer', gate = 'allow', sales = true, profile = {}, product = {}} = {}) {
  let handler, providerCalls=0, writes=0;
  const env = {SUPABASE_URL:staging, APP_ENV:'staging', ENABLE_NONPLAY_TEST_CHECKOUT:'true',
    NONPLAY_TEST_USER_IDS:'buyer', RAZORPAY_KEY_ID:'rzp_test_fixture', RAZORPAY_KEY_SECRET:'synthetic', ...environment};
  const mocks = {
 './newOrderGate.ts':{newOrdersEnabled:async()=>sales},
    './cors.ts': { handleOptions: () => null, jsonResponse: (body,status=200) => Response.json(body,{status}) },
    './rateLimit.ts': { withinLimit: async () => true },
    './notesChoiceGate.ts': { notesChoiceAllowed: () => false },
    './ucbStates.ts': { INDIA_ADMINISTRATIVE_AREAS: new Set() },
    './paymentGate.ts': { paymentGate: async () => gate },
    './razorpay.ts': {
      createRazorpayOrder: async params => { providerCalls++; assert.equal(params.amountPaise, 4900); return { id:'order_fixture' }; },
      getRazorpayKeyId: () => 'rzp_test_fixture', isLiveMode: () => false,
    },
    './supabaseAdmin.ts': {
      getUserFromAuthHeader: async () => user ? {id:user} : null,
      supabaseAdmin: {
        rpc: async (name,args) => { writes++; assert.equal(name,'create_priced_order'); assert.equal(args.p_product_id,'notes');
          return {data:{ok:true,order_id:'fixture-order',amount:49,title:'Notes'}}; },
        from: table => ({ select() { return this; }, eq() { return this; }, is() { return this; },
          update() { writes++; return this; },
          maybeSingle: async () => ({data: table === 'profiles' ? { course_id:'bams',blocked:false,...profile } : { id:'notes',course_id:'bams',active:true,...product }}),
          then(resolve) { resolve({error:null}); },
        }),
      },
    },
  };
  const deno = {serve:fn=>{handler=fn;},env:{get:key=>env[key]}};
  function load(file) {
    const module={exports:{}};
    const code=ts.transpileModule(fs.readFileSync(file,'utf8'), {
      compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
    }).outputText;
    vm.runInNewContext(code, {module,exports:module.exports,Date,console,Deno:deno,
      require:key=>{
        if (key in mocks) return mocks[key];
        if (key === '../_shared/createOrderHandler.ts') return load('supabase/functions/_shared/createOrderHandler.ts');
        if (key === './nonPlayTestCheckout.ts') return load('supabase/functions/_shared/nonPlayTestCheckout.ts');
        throw Error('Unexpected import '+key);
      }});
    return module.exports;
  }
  load(`supabase/functions/${test?'create-order-nonplay-test':'create-order'}/index.ts`);
  return {invoke:(headers={},body={productId:'notes'})=>handler(new Request(staging,{method:'POST',headers,body:JSON.stringify(body)})),counts:()=>({providerCalls,writes})};
}
(async()=>{
  for(const version of ['1.2.2','1.1.0','']) {
    const t=setup(), response=await t.invoke({'x-medveda-app-version':version,'x-medveda-application-id':'in.medveda.app'});
    assert.equal(response.status,200);assert.equal((await response.json()).razorpayOrderId,'order_fixture');
    assert.equal(t.counts().providerCalls,1);
  }
  const t=setup(), response=await t.invoke({});
  assert.equal(response.status,200);assert.equal((await response.json()).razorpayOrderId,'order_fixture');
  assert.equal(t.counts().providerCalls,1);
  console.log('PASS standard entrypoint: authenticated native Razorpay and website checkout accepted');
  for (const options of [{sales:false}, {user:null}, {gate:'choice'}, {gate:'unavailable'}]) {
    const blocked=setup(options);
    const result=await blocked.invoke({'x-medveda-app-version':'1.2.2','x-medveda-application-id':'in.medveda.app'});
    assert.ok(result.status>=400);
    assert.deepEqual(blocked.counts(),{providerCalls:0,writes:0});
  }
  console.log('PASS sales switch, authentication and remote gate failures block provider calls');
  const legacyChoice=setup();assert.equal((await legacyChoice.invoke({}, {productId:'notes',ucbOrderId:'11111111-1111-4111-8111-111111111111',buyerState:'KERALA'})).status,403);
  assert.deepEqual(legacyChoice.counts(),{providerCalls:0,writes:0});
  console.log('PASS ordinary website route cannot bypass programme gates by attaching a legacy UCB body');
  const testSource=fs.readFileSync('supabase/functions/create-order-nonplay-test/index.ts','utf8');
  assert.ok(testSource.includes('nonplayTestHandlers.create'));
  assert.ok(!testSource.includes('createOrderHandler'));
  console.log('PASS isolated test entrypoint does not import the live pricing handler; actual test handlers covered by nonplay-test-integration.ts');
})().catch(error=>{console.error(error);process.exitCode=1;});

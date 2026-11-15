const assert = require('node:assert/strict');
const { load } = require('../../../../mobile-app/scripts/ui-harness.cjs');
const config = load('supabase/functions/_shared/nonplayTestConfig.ts', {});
const gate = load('supabase/functions/_shared/newOrderGate.ts', {});
const uid = 'd9510000-0000-4000-8000-000000000001';
const product = 'npt_product_d9510000-0000-4000-8000-000000000010';
const env = { SUPABASE_URL: config.NONPLAY_TEST_URL, NONPLAY_TEST_ENVIRONMENT: config.NONPLAY_TEST_ENVIRONMENT,
  NONPLAY_TEST_CHECKOUT_ENABLED: 'true', NONPLAY_TEST_RAZORPAY_KEY_ID: 'rzp_test_fixture',
  NONPLAY_TEST_RAZORPAY_KEY_SECRET: 'synthetic_test_secret_12345678', NONPLAY_TEST_RAZORPAY_WEBHOOK_SECRET: 'synthetic_webhook_secret_1234567890',
  NONPLAY_TEST_USER_IDS: uid, NONPLAY_TEST_PRODUCT_IDS: product };
async function run(mode, method = 'POST', signedIn = true) {
  let provider = 0, rpc = 0, parsed = 0, settingReads = 0;
  const db = { from(table) {
    assert.equal(table, 'purchase_settings', 'no order/table reads before gate'); settingReads++;
    if (mode === 'throw') throw Error('synthetic unavailable');
    return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({
      data: mode === 'missing' ? null : { new_orders_enabled: mode === 'enabled' }, error: mode === 'error' ? { code: 'offline' } : null,
    }) };
  }, async rpc() { rpc++; return { data: true }; } };
  const handlers = load('supabase/functions/_shared/nonplayTestHandlers.ts', {
    './nonplayTestConfig.ts': config, './newOrderGate.ts': gate,
    './nonplayTestProvider.ts': { testProvider: () => { provider++; throw Error('unexpected provider'); }, testSignature() {} },
  }, { Response, Request, Headers }).createNonplayTestHandlers({ db, authenticate: async () => signedIn ? { id: uid } : null, env: k => env[k], fetcher: () => { provider++; throw Error('network forbidden'); } });
  const request = new Request('https://fixture.invalid', { method, headers: {
    'x-medveda-application-id': config.NONPLAY_TEST_PACKAGE, 'x-medveda-app-version': '1.2.2',
    'x-medveda-build-profile': 'razorpay-internal-test', 'x-medveda-test-environment': config.NONPLAY_TEST_ENVIRONMENT,
  } });
  request.text = async () => { parsed++; return 'null'; };
  const response = await handlers.create(request);
  return { response, body: response.status === 204 ? null : await response.json(), provider, rpc, parsed, settingReads };
}
(async () => {
  for (const mode of ['false', 'missing', 'error', 'throw']) {
    const r = await run(mode); assert.equal(r.response.status, 403, mode); assert.equal(r.body.code, 'sales_disabled', mode);
    assert.equal(r.rpc + r.provider + r.parsed, 0, mode + ': no eligibility/rate-limit/order/provider/body work');
    console.log('PASS fail closed:', mode);
  }
  for (const [method, signedIn, status] of [['OPTIONS', true, 204], ['GET', true, 405], ['POST', false, 401]]) {
    const r = await run('false', method, signedIn); assert.equal(r.response.status, status); assert.equal(r.settingReads + r.rpc + r.provider + r.parsed, 0);
  }
  const enabled = await run('enabled'); assert.equal(enabled.response.status, 400); assert.equal(enabled.parsed, 1); assert.equal(enabled.rpc, 1);
  console.log('PASS method/auth ordering and explicitly enabled fake setting reaches original validation');
})().catch(e => { console.error(e); process.exitCode = 1; });

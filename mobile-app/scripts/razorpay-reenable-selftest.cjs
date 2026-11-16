// Regressions: standard Android builds must reach live Razorpay without Play
// choice or isolated-test routes; disabled and wrong-key responses stay closed.
const assert = require('node:assert/strict');
const { load } = require('./ui-harness.cjs');
const app = require('../app.json').expo;
const { build } = require('../eas.json');
const configure = require('../app.config.js');
const url = 'https://xbvenkfmesugrbjuufyw.supabase.co';
function configFor(profile) {
  const saved = { ...process.env };
  for (const key of Object.keys(process.env)) if (/^(MEDVEDA_|EAS_BUILD_|EXPO_PUBLIC_SUPABASE_)/.test(key)) delete process.env[key];
  Object.assign(process.env, build[profile].env, { EAS_BUILD_PROFILE: profile, EAS_BUILD_PLATFORM: 'android' });
  try { return configure({ config: app }); }
  finally { process.env = saved; }
}
function providerFor(config, applicationId = 'in.medveda.app') {
  return load('mobile-app/src/config/paymentProvider.ts', {
    'expo-constants': { __esModule: true, default: { expoConfig: config } },
    'react-native': { Platform: { OS: 'android' } },
    'expo-application': { applicationId },
    'expo-updates': { channel: 'production', runtimeVersion: config.android.runtimeVersion },
  }, { process: { env: { EXPO_PUBLIC_SUPABASE_URL: url } } });
}
(async () => {
  for (const profile of ['production', 'internal-testing', 'preview', 'razorpay-live-testing']) {
    const config = configFor(profile);
    const provider = providerFor(config);
    assert.equal(provider.paymentProvider, 'razorpay', profile + ' must enable Notes checkout');
    assert.equal(provider.userChoiceBillingEnabled, false);
    assert.equal(provider.playRestorationEnabled, false, 'Razorpay builds must not connect to removed Play billing');
    assert.equal(provider.isNonplayTestBuild, false);
    let destination;
    const hook = load('mobile-app/src/hooks/usePurchase.ts', {
      '@react-navigation/native': { useNavigation: () => ({ navigate: (...args) => { destination = args; } }) },
      'react-native': { Platform: { OS: 'android' }, Alert: { alert() { throw Error('checkout blocked'); } } },
      '../config/paymentProvider': provider,
    }).default();
    hook.buy({ id: 'notes', title: 'Notes' });
    assert.equal(destination[0], 'OrderSummary');
    let request;
    const session = { access_token: 'synthetic', user: { id: 'buyer' } };
    let response = { keyId: 'rzp_live_fixture', isLiveMode: true, amountPaise: 4900,
      internalOrderId: '11111111-1111-4111-8111-111111111111', razorpayOrderId: 'order_fixture',
      productTitle: 'Notes', verifyUrl: url + '/functions/v1/verify-payment' };
    const service = load('mobile-app/src/services/paymentService.ts', {
      '../config/supabase': { supabase: { auth: { getSession: async () => ({ data: { session } }) } } },
      'react-native': { Platform: { OS: 'android' } },
      'expo-application': { applicationId: 'in.medveda.app', nativeApplicationVersion: '1.2.2' },
      '../config/paymentProvider': provider, './authState': { getCurrentUser: () => session.user },
    }, { process: { env: { EXPO_PUBLIC_SUPABASE_URL: url } }, fetch: async (endpoint, init) => {
      request = { endpoint, init }; return Response.json(response);
    } });
    assert.equal((await service.purchaseProduct('notes', true)).amountPaise, 4900);
    assert.equal(request.endpoint, url + '/functions/v1/create-order');
    assert.deepEqual(JSON.parse(request.init.body), { productId: 'notes', useWallet: true });
    assert.equal(request.init.headers.Authorization, 'Bearer synthetic');
    response = { ...response, keyId: 'rzp_test_fixture', isLiveMode: false };
    await assert.rejects(service.purchaseProduct('notes'), /Invalid checkout/);
  }
  const testConfig = configFor('razorpay-internal-test');
  const isolated = providerFor(testConfig, 'in.medveda.razorpaytest');
  assert.equal(isolated.paymentProvider, 'razorpay');
  assert.equal(isolated.isNonplayTestBuild, true);
  const disabled = providerFor({ ...app, extra: { medvedaPaymentProvider: 'disabled' } });
  assert.equal(disabled.paymentProvider, 'disabled');
  const stalePlay = providerFor({ ...app, extra: { medvedaPaymentProvider: 'play', medvedaIndiaUcbEnrolled: true, medvedaUcbTestAccepted: true } });
  assert.equal(stalePlay.paymentProvider, 'disabled');
  console.log('PASS standard builds: Notes → summary → live create-order; no Play; wrong key rejected; isolated test preserved');
})().catch(error => { console.error(error); process.exitCode = 1; });

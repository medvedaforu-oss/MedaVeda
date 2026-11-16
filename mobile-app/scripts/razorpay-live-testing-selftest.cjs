// Actual configuration, provider gate and payment service; all HTTP is synthetic.
const assert = require('node:assert/strict');
const { load } = require('./ui-harness.cjs');
const { build, submit } = require('../eas.json');
const app = require('../app.json').expo;
const appConfig = require('../app.config.js');
const { checkStagingBuild } = require('./check-staging-build.cjs');
const name = 'razorpay-live-testing';
const profile = build[name];
assert.ok(profile, 'dedicated live APK profile must exist');
const env = { ...profile.env, EAS_BUILD_PROFILE: name, EAS_BUILD_PLATFORM: 'android' };
function configFor(values) {
  const previous = process.env;
  process.env = { ...values };
  try { return appConfig({ config: app }); }
  finally { process.env = previous; }
}
const config = configFor(env);
function providerFor({ extra = config.extra, channel = name, runtimeVersion = config.android.runtimeVersion,
  applicationId = app.android.package, url = profile.env.EXPO_PUBLIC_SUPABASE_URL, os = 'android' } = {}) {
  return load('mobile-app/src/config/paymentProvider.ts', {
    'expo-constants': { __esModule: true, default: { expoConfig: { ...config, extra } } },
    'react-native': { Platform: { OS: os } },
    'expo-application': { applicationId },
    'expo-updates': { channel, runtimeVersion },
  }, { process: { env: { EXPO_PUBLIC_SUPABASE_URL: url } } });
}
assert.equal(profile.android.buildType, 'apk');
assert.equal(profile.distribution, 'internal');
assert.equal(profile.developmentClient, undefined);
assert.equal(profile.channel, name);
assert.equal(profile.environment, 'production');
assert.equal(profile.autoIncrement, undefined);
assert.equal(submit[name], undefined);
assert.equal(config.android.package, app.android.package);
assert.equal(config.android.googleServicesFile, configFor({ EAS_BUILD_PROFILE: 'production' }).android.googleServicesFile);
assert.equal(config.android.runtimeVersion, `${app.version}-${name}`);
assert.equal(config.updates.requestHeaders['expo-channel-name'], name);
const enabled = providerFor();
assert.equal(enabled.paymentProvider, 'razorpay');
assert.equal(enabled.isStandaloneRazorpayLiveBuild, true);
assert.equal(enabled.isNonplayTestBuild, false, 'must use real catalog and entitlements');
for (const change of [
  { applicationId: 'in.medveda.razorpaytest' }, { applicationId: null },
  { url: 'https://other.invalid' },
  ...['medvedaBuildTarget', 'medvedaPaymentProvider'].map(key => ({ extra: { ...config.extra, [key]: 'wrong' } })),
]) assert.equal(providerFor(change).paymentProvider, 'disabled', JSON.stringify(change));
for (const change of [
  { EAS_BUILD_PROFILE: 'production' }, { EAS_BUILD_PROFILE: 'internal-testing' },
  { EAS_BUILD_PLATFORM: 'ios' }, { MEDVEDA_BUILD_TARGET: 'staging' },
  { MEDVEDA_PAYMENT_PROVIDER: 'disabled' }, { MEDVEDA_DISTRIBUTION: 'standard' },
  { EXPO_PUBLIC_SUPABASE_URL: 'https://other.invalid' },
  { EXPO_PUBLIC_SUPABASE_ANON_KEY: 'wrong' }, { RAZORPAY_KEY_SECRET: 'synthetic' },
  { EXPO_PUBLIC_RAZORPAY_KEY_SECRET: 'synthetic' },
]) assert.throws(() => checkStagingBuild({ ...env, ...change }));
assert.equal(configFor({ ...env, EAS_BUILD_PROFILE: undefined }).android.runtimeVersion, config.android.runtimeVersion);
for (const existing of ['production', 'internal-testing', 'preview', 'development', 'screenshots', 'shrink-test']) {
  const other = configFor({ ...build[existing].env, EAS_BUILD_PROFILE: existing, EAS_BUILD_PLATFORM: 'android' });
  assert.equal(other.extra.medvedaPaymentProvider, 'razorpay', existing);
  assert.equal(providerFor({ extra: other.extra, channel: existing }).paymentProvider, 'razorpay', existing);
}
console.log('PASS dedicated live APK; exact build guards; standard live profiles supported; existing Firebase/package retained');

let response, calls = [];
const session = { access_token: 'synthetic-session', user: { id: 'buyer' } };
const service = load('mobile-app/src/services/paymentService.ts', {
  '../config/supabase': { supabase: { auth: { getSession: async () => ({ data: { session } }) } } },
  'react-native': { Platform: { OS: 'android' } },
  'expo-application': { applicationId: app.android.package, nativeApplicationVersion: app.version },
  '../config/paymentProvider': enabled,
  './authState': { getCurrentUser: () => session.user },
}, { process: { env: { EXPO_PUBLIC_SUPABASE_URL: env.EXPO_PUBLIC_SUPABASE_URL } },
  fetch: async (url, init) => { calls.push({ url, init }); return Response.json(response); } });
const valid = { keyId: 'rzp_live_synthetic', isLiveMode: true, amountPaise: 100,
  internalOrderId: '11111111-1111-4111-8111-111111111111', razorpayOrderId: 'order_synthetic',
  productTitle: 'Notes', verifyUrl: `${env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/verify-payment` };
(async () => {
  response = valid;
  assert.equal((await service.purchaseProduct('notes')).amountPaise, 100);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-order`);
  assert.deepEqual(JSON.parse(calls[0].init.body), { productId: 'notes', useWallet: false });
  assert.equal(calls[0].init.headers.Authorization, 'Bearer synthetic-session');
  assert.equal(calls[0].init.headers['x-medveda-app-version'], app.version, 'never hide native routing headers');
  for (const change of [{ keyId: 'rzp_test_synthetic', isLiveMode: false }, { isLiveMode: false },
    { amountPaise: 99 }, { verifyUrl: 'https://foreign.invalid/verify' }]) {
    response = { ...valid, ...change };
    await assert.rejects(service.purchaseProduct('notes'), /Invalid/);
  }
  response = { success: false, pending: true };
  assert.equal((await service.verifyPayment(valid.verifyUrl, {
    internalOrderId: valid.internalOrderId, razorpay_order_id: valid.razorpayOrderId,
    razorpay_payment_id: 'pay_synthetic', razorpay_signature: 'synthetic',
  })).success, false, 'checkout callback never grants access locally');
  console.log('PASS authenticated existing live order route; server-priced ₹1; test keys/foreign verify URLs rejected; backend verdict required');
})().catch(error => { console.error(error); process.exitCode = 1; });

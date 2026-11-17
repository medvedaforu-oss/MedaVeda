// Local routing acceptance. HTTP/Auth and native controls are fixtures, not a payment.
const assert = require('node:assert/strict');
const { harness, load, jsx, nodes, tick } = require('./ui-harness.cjs');
const { build, submit } = require('../eas.json');
const appConfig = require('../app.config.js');
const app = require('../app.json').expo;
const { checkStagingBuild } = require('./check-staging-build.cjs');
const profile = build['razorpay-internal-test'];
const productionUrl = build.production.env.EXPO_PUBLIC_SUPABASE_URL;
const testPackage = 'in.medveda.razorpaytest';
const env = { ...profile.env, EAS_BUILD_PROFILE: 'razorpay-internal-test', EAS_BUILD_PLATFORM: 'android' };
const plain = value => JSON.parse(JSON.stringify(value));
// Config evaluation uses a synthetic Firebase client; never depend on an owner
// secret file or read an ambient GOOGLE_SERVICES_JSON value in this harness.
const fixtureFs = require('node:fs'), fixtureOs = require('node:os'), fixturePath = require('node:path');
const firebaseDir = fixtureFs.mkdtempSync(fixturePath.join(fixtureOs.tmpdir(), 'medveda-internal-firebase-'));
const firebaseFile = fixturePath.join(firebaseDir, 'client.json');
process.on('exit', () => fixtureFs.rmSync(firebaseDir, {recursive:true,force:true}));
function resolvedProfile(name) {
 const current=build[name];
 const parent=current.extends?resolvedProfile(current.extends):{};
 return {...parent,...current,env:{...parent.env,...current.env}};
}
function configFor(values) {
  const previous = process.env;
  const packageName=values.MEDVEDA_DISTRIBUTION==='non-play-internal-test'?testPackage:'in.medveda.app';
  fixtureFs.writeFileSync(firebaseFile,JSON.stringify({configuration_version:'1',
    project_info:{project_id:'synthetic-project',project_number:'123456'},
    client:[{client_info:{mobilesdk_app_id:'1:123456:android:synthetic',android_client_info:{package_name:packageName}},api_key:[{current_key:'synthetic-not-a-key'}]}]}));
  process.env = { ...values, GOOGLE_SERVICES_JSON: firebaseFile };
  try { return appConfig({ config: app }); }
  finally { process.env = previous; }
}
function providerFor(config, applicationId = testPackage, url = productionUrl) {
  return load('mobile-app/src/config/paymentProvider.ts', {
    'expo-constants': { __esModule: true, default: { expoConfig: config } },
    'react-native': { Platform: { OS: 'android' } },
    'expo-application': { applicationId },
  }, { process: { env: { EXPO_PUBLIC_SUPABASE_URL: url } } }).paymentProvider;
}
const config = configFor(env);
const provider = providerFor(config);
assert.equal(profile.distribution, 'internal');
assert.equal(profile.android.buildType, 'apk');
assert.equal(profile.channel, 'razorpay-internal-test');
assert.equal(profile.environment, 'development');
assert.equal(profile.extends, undefined);
assert.equal(profile.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, build.production.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
assert.equal(submit['razorpay-internal-test'], undefined);
assert.equal(config.name, 'MedVeda Razorpay Test');
assert.equal(config.scheme, 'medveda-razorpay-test');
assert.equal(config.android.package, testPackage);
assert.equal(config.android.runtimeVersion, `${app.version}-razorpay-internal-test`);
assert.equal(provider, 'razorpay');
for (const change of [
  { MEDVEDA_BUILD_TARGET: 'same-project' }, { MEDVEDA_DISTRIBUTION: undefined },
  { MEDVEDA_PAYMENT_PROVIDER: 'disabled' }, { EAS_BUILD_PROFILE: 'production' },
  { EAS_BUILD_PROFILE: 'internal-testing' }, { EAS_BUILD_PROFILE: 'preview' },
  { EXPO_PUBLIC_SUPABASE_URL: 'https://other.invalid' },
  { MEDVEDA_NONPLAY_TEST_ENVIRONMENT: undefined },
  { EXPO_PUBLIC_SUPABASE_ANON_KEY: '' }, { EXPO_PUBLIC_SUPABASE_ANON_KEY: 'REPLACE_WITH_STAGING_PUBLISHABLE_KEY' },
]) assert.throws(() => checkStagingBuild({ ...env, ...change }));
// OTA configuration resolves without EAS_BUILD_PROFILE, but still requires explicit test settings.
const ota = { ...env }; delete ota.EAS_BUILD_PROFILE;
assert.equal(configFor(ota).android.runtimeVersion, config.android.runtimeVersion);
for (const nativeId of ['in.medveda.app', 'in.medveda.staging', null]) {
  assert.equal(providerFor(config, nativeId), 'disabled', 'test extra flags cannot enable another installed package');
}
assert.equal(providerFor(config, testPackage, 'https://other.invalid'), 'disabled');
assert.equal(providerFor({ ...config, extra: { ...config.extra, medvedaDistribution: 'standard' } }), 'disabled');
for (const name of ['production', 'internal-testing', 'development', 'preview', 'screenshots', 'shrink-test', 'staging-validation']) {
  const values = { ...resolvedProfile(name).env, EAS_BUILD_PROFILE: name, EAS_BUILD_PLATFORM: 'android' };
  if (name === 'staging-validation') continue;
  const other = configFor(values);
  assert.equal(other.extra.medvedaPaymentProvider, 'razorpay', name);
  assert.equal(providerFor(other, other.android.package, values.EXPO_PUBLIC_SUPABASE_URL), 'razorpay', name);
}
console.log('PASS dedicated non-Play APK/package/channel/runtime; production-isolated configuration; standard live profiles enabled; isolated test settings cannot activate another package');

const native = { View: 'View', Text: 'Text', TouchableOpacity: 'Button', ScrollView: 'Scroll',
  Switch: 'Switch', ActivityIndicator: 'Spinner', StyleSheet: { create: x => x },
  Platform: { OS: 'android' }, Alert: { alert() {} } };
function themes(prefix) {
  return Object.fromEntries([['colors', 'COLORS'], ['fonts', 'FONT'], ['spacing', 'SPACING'],
    ['radius', 'RADIUS'], ['shadows', 'SHADOW']].map(([file, key]) =>
    [prefix + file, { [key]: file === 'colors' ? { yearAccents: ['green'] } : {} }]));
}
async function buyToCheckout() {
  const product = { id: 'npt_product_d9510000-0000-4000-8000-000000000010', title: '[TEST] Chapter 42 Notes', price: 49 };
  let summaryRoute, checkoutRoute, requests = 0, finish;
  const buy = load('mobile-app/src/hooks/usePurchase.ts', {
    '@react-navigation/native': { useNavigation: () => ({ navigate: (name, params) => { summaryRoute = { name, params }; } }) },
    'react-native': native, '../config/paymentProvider': { paymentProvider: provider },
  }).default().buy;
  const Card = load('mobile-app/src/components/ProductPosterCard.tsx', {
    react: {}, 'react/jsx-runtime': jsx, 'react-native': native,
    '../config/paymentProvider': { paymentProvider: provider }, ...themes('../theme/'),
  }).default;
  const props = { title: product.title, price: product.price, onPress() {}, onBuyPress: () => buy(product) };
  const owned = Card({ ...props, owned: true });
  assert.match(JSON.stringify(owned), /Owned/);
  const ownedButtons = nodes(owned).filter(n => n.type === 'Button');
  assert.equal(ownedButtons.length, 1, 'owned Notes expose only content browsing');
  ownedButtons[0].props.onPress();
  assert.equal(summaryRoute, undefined); assert.equal(requests, 0);
  const paid = Card(props);
  assert.match(JSON.stringify(paid), /Buy Now/);
  nodes(paid).filter(n => n.type === 'Button')[1].props.onPress();
  nodes(paid).filter(n => n.type === 'Button')[1].props.onPress();
  assert.deepEqual(plain(summaryRoute), { name: 'OrderSummary', params: { productId: product.id, productTitle: product.title } });
  assert.equal(requests, 0, 'duplicate Buy Now taps only navigate; Pay creates the order');
  const stored=new Map();
  const testService=load('mobile-app/src/services/nonplayTestService.ts', {
    '@react-native-async-storage/async-storage':{__esModule:true,default:{getItem:async k=>stored.get(k),setItem:async(k,v)=>stored.set(k,v),removeItem:async k=>stored.delete(k)}},
    'expo-application':{nativeApplicationVersion:app.version,applicationId:testPackage},
    '../config/supabase':{supabase:{auth:{getSession:async()=>({data:{session:{user:{id:'buyer'},access_token:'fixture'}}})}}},
    '../config/paymentProvider':{paymentProvider:provider,isNonplayTestBuild:true},
    '../utils/caseConvert':{toCamelCase:x=>x},
  },{process:{env:{EXPO_PUBLIC_SUPABASE_URL:productionUrl}},crypto:require('node:crypto').webcrypto,
    fetch:async(url,init)=>{
      requests++;assert.equal(url,`${productionUrl}/functions/v1/create-order-nonplay-test`);
      assert.deepEqual(JSON.parse(init.body),{productId:product.id,useWallet:false});
      assert.equal(init.headers['x-medveda-application-id'],testPackage);
      assert.equal(init.headers['x-medveda-build-profile'],'razorpay-internal-test');
      assert.match(init.headers['idempotency-key'],/^[0-9a-f-]{36}$/);
      return new Promise(resolve=>{finish=value=>resolve({ok:true,json:async()=>value});});
    }});
  const service={purchaseProduct:testService.createTestOrder};
  const h = harness();
  const summaryNavigation={isFocused:()=>true,addListener:()=>()=>{},replace:(name,params)=>{checkoutRoute={name,params}}};
  const Summary = load('mobile-app/src/screens/payment/OrderSummaryScreen.tsx', {
    react: h.react, 'react/jsx-runtime': jsx, 'react-native': native,
    '@react-navigation/native': { useRoute: () => ({ params: summaryRoute.params }),
      useNavigation: () => summaryNavigation },
    '../../components/CustomButton': { __esModule: true, default: 'PayButton' },
    '../../components/ErrorState': { __esModule: true, default: 'Error' },
    '../../services/referralsService': { fetchOrderQuote: async id => {
      assert.equal(id, product.id); return { ok: true, amount: 49 };
    }, fetchReferralSettings: async () => ({ enabled: false }), formatRupees: String, walletProductsText: () => '' },
    '../../services/playBillingService': {}, '../../config/supabase': {},
    '../../services/indiaBillingStates': { INDIA_ADMINISTRATIVE_AREAS: [] },
    '../../services/authState':{getCurrentUser:()=>({id:'buyer'}),getAuthEpoch:()=>0,subscribeAuthUser:()=>()=>{}},'../../services/paymentService': service, '../../config/paymentProvider': { paymentProvider: provider, isNonplayTestBuild: true },
    '../../utils/logger': { logError() {} }, ...themes('../../theme/'),
  }).default;
  h.render(Summary); await tick();
  const pay = nodes(h.render(Summary)).find(n => n.type === 'PayButton');
  const first = pay.props.onPress(), duplicate = pay.props.onPress();
  await tick(); assert.equal(requests, 1, 'duplicate Pay taps create only one order');
  const checkoutData = { keyId: 'rzp_test_fixture', isLiveMode: false, razorpayOrderId: 'order_fixture',
    amountPaise: 4900, productTitle: product.title, internalOrderId: 'd9510000-0000-4000-8000-000000000040', verifyUrl: `${productionUrl}/functions/v1/verify-payment-nonplay-test` };
  finish(checkoutData); await Promise.all([first, duplicate]);
  assert.deepEqual(plain(checkoutRoute), { name: 'PaymentCheckout', params: checkoutData });
  h.unmount();
  console.log('PASS paid Notes pass the exact product ID to summary/server; Pay forwards server checkout data; owned Notes create no order; duplicate Pay creates once');
}
async function checkoutEvent(type, verdict, expected) {
  const h = harness(); let back = 0, destination, verifies = 0;
  const Screen = load('mobile-app/src/screens/payment/PaymentCheckoutScreen.tsx', {
    react: h.react, 'react/jsx-runtime': jsx,
    'react-native': { ...native, BackHandler: { addEventListener: () => ({ remove() {} }) },
      AppState: { addEventListener: () => ({ remove() {} }) }, Linking: {} },
    'react-native-webview': { WebView: 'WebView' },
    '@react-navigation/native': { useRoute: () => ({ params: { keyId: 'rzp_test_fixture', isLiveMode: false, razorpayOrderId: 'order_fixture',
      amountPaise: 4900, productTitle: 'Notes', internalOrderId: 'fixture', verifyUrl: `${productionUrl}/functions/v1/verify-payment-nonplay-test` } }),
      useNavigation: () => ({ dispatch: value => { destination = value.routes[1]; }, goBack: () => back++ }),
      useFocusEffect() {}, CommonActions: { reset: value => value } },
    '../../config/paymentProvider': { paymentProvider: provider, isNonplayTestBuild: true },
    '../../services/authState':{getCurrentUser:()=>({id:'buyer'}),getAuthEpoch:()=>0,subscribeAuthUser:()=>()=>{}},'../../services/paymentService': { verifyPayment: async () => { verifies++; return verdict; }, recoverPaymentWithRetry: async () => ({ success: false, pending: true }) },
    '../../services/ordersService': { markOrderStatus: async () => {} },
    './checkoutHtmlTemplate': { buildCheckoutHtml: p => JSON.stringify(p) },
    './checkoutNavigation': { CHECKOUT_ORIGIN_WHITELIST: [], isAllowedCheckoutWebUrl: () => true },
    ...themes('../../theme/'),
  }, {crypto:require('node:crypto').webcrypto,process:{env:{EXPO_PUBLIC_SUPABASE_URL:productionUrl}}}).default;
  const tree = h.render(Screen().type);
  const web = nodes(tree).find(n => n.type === 'WebView');
  await web.props.onMessage({ nativeEvent: { url:'about:blank',data: JSON.stringify({callbackNonce:JSON.parse(web.props.source.html).callbackNonce,type, reason: 'fixture failure',
    razorpay_order_id: 'order_fixture', razorpay_payment_id: 'pay_fixture', razorpay_signature: 'a'.repeat(64) }) } });
  if (expected === 'back') { assert.equal(back, 1); assert.equal(destination, undefined); }
  else { assert.equal(destination.name, expected); assert.equal(destination.params.pending === true, verdict?.pending === true); }
  assert.equal(verifies, type === 'success' ? 1 : 0);
  h.unmount();
}
(async () => {
  await buyToCheckout();
  await checkoutEvent('cancelled', undefined, 'back');
  await checkoutEvent('failed', undefined, 'PaymentFailed');
  await checkoutEvent('success', { success: false, pending: true }, 'PaymentFailed');
  await checkoutEvent('success', { success: true, amount: 49 }, 'PaymentSuccess');
  console.log('PASS existing checkout cancel/failure/pending/server-confirmed-success behavior remains intact');
})().catch(error => { console.error(error); process.exitCode = 1; });

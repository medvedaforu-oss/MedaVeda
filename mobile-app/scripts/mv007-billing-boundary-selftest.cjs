const assert = require('node:assert/strict');
const { load } = require('./ui-harness.cjs');
for (const provider of ['play', 'razorpay', 'disabled']) {
 for (const enrolled of [false, true]) {
  const actual = load('mobile-app/src/config/paymentProvider.ts', {
   'expo-constants': { __esModule: true, default: { expoConfig: { extra: {
    medvedaPaymentProvider: provider, medvedaBuildTarget: 'production',
    medvedaIndiaUcbEnrolled: enrolled, medvedaUcbTestAccepted: enrolled,
   } } } },
   'react-native': { Platform: { OS: 'android' } },
   'expo-application': { applicationId: 'in.medveda.app' },
  }, { process: { env: { EXPO_PUBLIC_SUPABASE_URL: 'https://xbvenkfmesugrbjuufyw.supabase.co' } } });
  assert.equal(actual.paymentProvider, provider === 'razorpay' ? 'razorpay' : 'disabled');
  assert.equal(actual.userChoiceBillingEnabled, false);
  assert.equal(actual.playRestorationEnabled, false);
 }
}
console.log('PASS legacy enrollment flags cannot activate Play Billing or restoration; production Razorpay retained');

const assert = require('node:assert/strict');
const { load, harness, jsx, tick } = require('./ui-harness.cjs');
const productionUrl = 'https://xbvenkfmesugrbjuufyw.supabase.co';
function flags(extra, id = 'in.medveda.app') {
  return load('mobile-app/src/config/paymentProvider.ts', {
    'expo-constants': { __esModule: true, default: { expoConfig: { extra } } },
    'react-native': { Platform: { OS: 'android' } },
    'expo-application': { applicationId: id },
  }, { process: { env: { EXPO_PUBLIC_SUPABASE_URL: productionUrl } } });
}
(async () => {
  for (const extra of [
    { medvedaPaymentProvider: 'play' },
    { medvedaPaymentProvider: 'play', medvedaIndiaUcbEnrolled: true },
    { medvedaPaymentProvider: 'play', medvedaUcbTestAccepted: true },
    { medvedaPaymentProvider: 'razorpay' },
    { medvedaPaymentProvider: 'disabled' },
  ]) {
    const actual = flags(extra);
    assert.equal(actual.paymentProvider, 'disabled');
    assert.equal(actual.userChoiceBillingEnabled, false);
    assert.equal(actual.playRestorationEnabled, true);
  }
  // Synthetic approval is a local fixture, never evidence of owner enrollment.
  const approved = { medvedaPaymentProvider: 'play', medvedaIndiaUcbEnrolled: true, medvedaUcbTestAccepted: true };
  assert.equal(flags(approved).userChoiceBillingEnabled, true);
  assert.equal(flags(approved, 'unrelated.package').paymentProvider, 'disabled');
  console.log('PASS unapproved standalone Play sales disabled; required UCB APIs and historical restoration remain separate');

  // Execute the actual history focus callback with sales disabled. Historical
  // restoration must refresh only for the same account and mounted screen.
  for (const outcome of ['same', 'switched', 'unmounted']) {
    const h = harness(); let focus, resolveRestore, restores = 0, reads = 0, user = 'alice';
    const mocks = {
      react: h.react, 'react/jsx-runtime': jsx,
      'react-native': { View: 'View', Text: 'Text', FlatList: 'List', ActivityIndicator: 'Spinner', StyleSheet: { create: x => x } },
      '@react-navigation/native': { useFocusEffect(fn) { focus = fn; } },
      '../../hooks/usePurchaseResource': { __esModule: true, default: () => ({ value: [], loading: false, error: null, refresh() { reads++; } }) },
      '../../config/paymentProvider': flags({ medvedaPaymentProvider: 'disabled' }),
      '../../services/purchasesService': {},
      '../../services/playBillingService': { restorePlayPurchases() { restores++; return new Promise(resolve => { resolveRestore = resolve; }); } },
      '../../services/paymentService': { recoverMyPendingPayments: async () => false },
      '../../services/authState': { getCurrentUser: () => ({ id: user }) },
      '../../components/BottomNav': {}, '../../components/ErrorState': {}, '../../components/EmptyState': {},
    };
    for (const [file, key] of [['colors','COLORS'],['fonts','FONT'],['spacing','SPACING'],['radius','RADIUS'],['shadows','SHADOW']]) mocks['../../theme/' + file] = { [key]: {} };
    const Screen = load('mobile-app/src/screens/purchases/MyPurchasesScreen.tsx', mocks).default;
    h.render(Screen); const cleanup = focus();
    assert.equal(restores, 1); assert.equal(reads, 1);
    if (outcome === 'switched') user = 'bob';
    if (outcome === 'unmounted') cleanup();
    resolveRestore({ confirmed: 1 }); await tick();
    assert.equal(reads, outcome === 'same' ? 2 : 1);
    cleanup(); h.unmount();
  }
  console.log('PASS historical Play restore refreshes disabled-sales history; account switch and unmount cannot refresh obsolete history');
})().catch(error => { console.error(error); process.exitCode = 1; });

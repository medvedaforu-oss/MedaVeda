const assert = require('node:assert/strict');
const { harness, load, tick, jsx } = require('./ui-harness.cjs');

const orderId = '11111111-1111-4111-8111-111111111111';
function fixture({ isolated = false, hangAuth = false } = {}) {
  const h = harness(), listeners = new Set(), reads = [], timers = new Map();
  let uid = 'alice', nextTimer = 0;
  const auth = { getCurrentUser: () => uid ? { id: uid } : null,
    subscribeAuthUser(fn) { listeners.add(fn); return () => listeners.delete(fn); } };
  const supabase = { auth: { getUser: () => hangAuth ? new Promise(() => {}) : Promise.resolve({ data: { user: { id: uid } } }) },
    from(table) {
      const filters = {};
      return { select() { return this; }, eq(key, value) { filters[key] = value; return this; },
        maybeSingle() { return new Promise(resolve => reads.push({ table, filters, resolve })); } };
    } };
  const mocks = { react: h.react, 'react/jsx-runtime': jsx,
    'react-native': { View: 'View', Text: 'Text', TouchableOpacity: 'Button', ActivityIndicator: 'Spinner', StyleSheet: { create: x => x } },
    '@react-navigation/native': { useRoute: () => ({ params: { orderId, title: 'Forged title', amount: 1 } }), useNavigation: () => ({}) },
    '../../config/supabase': { supabase }, '../../config/paymentProvider': { isNonplayTestBuild: isolated },
    '../../services/authState': auth,
    '../../services/nonplayTestService': { confirmedTestPurchase: () => new Promise(resolve => reads.push({ table: 'isolated', resolve })) } };
  for (const [file, key] of [['colors','COLORS'],['fonts','FONT'],['spacing','SPACING'],['radius','RADIUS'],['shadows','SHADOW']]) mocks['../../theme/' + file] = { [key]: {} };
  const Screen = load('mobile-app/src/screens/payment/PaymentSuccessScreen.tsx', mocks, {
    setTimeout(fn) { const id = ++nextTimer; timers.set(id, fn); return id; }, clearTimeout(id) { timers.delete(id); },
  }).default;
  const render = () => JSON.stringify(h.render(Screen));
  render();
  return { reads, render, changeUser(value) { uid = value; listeners.forEach(fn => fn()); },
    expire() { [...timers.values()].forEach(fn => fn()); timers.clear(); },
    unmount() { h.unmount(); assert.equal(listeners.size, 0); assert.equal(timers.size, 0); } };
}
const paid = { data: { status: 'paid', amount: 5 } };
const success = { data: { product_title: 'Alice private Notes', amount: 5 } };
(async () => {
  const valid = fixture(); await tick();
  assert.equal(valid.reads[0].filters.user_id, 'alice'); valid.reads[0].resolve(paid); await tick();
  assert.equal(valid.reads[1].filters.user_id, 'alice'); assert.equal(valid.reads[1].filters.order_id, orderId);
  valid.reads[1].resolve(success); await tick();
  assert.match(valid.render(), /Payment Successful!/); assert.doesNotMatch(valid.render(), /Forged title/);
  valid.changeUser('bob'); assert.doesNotMatch(valid.render(), /Alice private Notes|Payment Successful!/); valid.unmount();
  console.log('PASS owner-bound readback, untrusted route fields ignored, confirmed details cleared on account switch');

  for (const during of ['orders', 'purchases']) {
    const f = fixture(); await tick();
    if (during === 'purchases') { f.reads[0].resolve(paid); await tick(); }
    const pending = f.reads.at(-1);
    // Even returning to the original account cannot revive an old request.
    f.changeUser('bob'); f.changeUser('alice'); f.render();
    pending.resolve(during === 'orders' ? paid : success); await tick();
    assert.doesNotMatch(f.render(), /Alice private Notes|Payment Successful!/); f.unmount();
  }
  console.log('PASS delayed order/purchase replies ignored across account changes, including A to B to A');

  const isolated = fixture({ isolated: true }); await tick(); isolated.changeUser(null); isolated.render();
  isolated.reads[0].resolve({ title: 'Alice private Notes', amount: 5, orderId }); await tick();
  assert.doesNotMatch(isolated.render(), /Alice private Notes|Payment Successful!/); isolated.unmount();
  console.log('PASS isolated purchase proof cannot survive sign-out');

  for (const hangAuth of [true, false]) {
    const f = fixture({ hangAuth }); await tick(); f.expire();
    assert.match(f.render(), /Purchase not confirmed/); assert.doesNotMatch(f.render(), /Payment Successful!/);
    if (!hangAuth) { f.reads[0].resolve(paid); await tick(); assert.equal(f.reads.length, 1); }
    f.unmount();
  }
  console.log('PASS stalled Auth/readback stops loading and late replies cannot confirm success');

  for (const status of ['created', 'refunded']) {
    const f = fixture(); await tick(); f.reads[0].resolve({ data: { status, amount: 5 } }); await tick();
    assert.match(f.render(), /Purchase not confirmed/); assert.equal(f.reads.length, 1); f.unmount();
  }
  const mismatch = fixture(); await tick(); mismatch.reads[0].resolve(paid); await tick();
  mismatch.reads[1].resolve({ data: { product_title: 'Wrong amount', amount: 2 } }); await tick();
  assert.match(mismatch.render(), /Purchase not confirmed/); mismatch.unmount();
  console.log('PASS unpaid/refunded orders and mismatched purchase amounts cannot display success');
})().catch(error => { console.error(error); process.exitCode = 1; });

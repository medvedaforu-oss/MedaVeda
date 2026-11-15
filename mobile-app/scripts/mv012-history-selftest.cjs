const assert = require('node:assert/strict');
const { harness, load, tick, jsx, nodes } = require('./ui-harness.cjs');
let passed = 0;
const ids = rows => Array.from(rows, row => row.id);
const row = (id, createdAt, extra = {}) => ({ id, createdAt, scope: 'chapter', status: 'success', amount: 5, ...extra });
function serviceFor(getPurchasesByUser, auth = { getCurrentUser: () => ({ id: 'alice' }) }) {
  return load('mobile-app/src/services/purchasesService.ts', {
    './authState': auth, '../repositories/purchasesRepository': { getPurchasesByUser },
  });
}
const history = rows => serviceFor(async () => rows).fetchMyPurchases();
async function test(name, fn) { await fn(); passed++; console.log('PASS ' + name); }
function screenFor(resource, react, auth, recovery = async () => false, provider = 'disabled') {
  const mocks = {
    react, 'react/jsx-runtime': jsx,
    'react-native': { View: 'View', Text: 'Text', FlatList: 'List', ActivityIndicator: 'Spinner', StyleSheet: { create: x => x } },
    '@react-navigation/native': { useFocusEffect: fn => react.useEffect(fn, [fn]) },
    '../../hooks/usePurchaseResource': { __esModule: true, default: resource }, '../../services/authState': auth,
    '../../services/purchasesService': {}, '../../services/playBillingService': { restorePlayPurchases() { throw Error('unexpected Play restore'); } },
    '../../config/paymentProvider': { paymentProvider: provider }, '../../services/paymentService': { recoverMyPendingPayments: recovery },
  };
  for (const name of ['EmptyState', 'ErrorState', 'BottomNav']) mocks['../../components/' + name] = { __esModule: true, default: name };
  for (const [file, key] of [['colors', 'COLORS'], ['fonts', 'FONT'], ['spacing', 'SPACING'], ['radius', 'RADIUS'], ['shadows', 'SHADOW']]) mocks['../../theme/' + file] = { [key]: {} };
  return load('mobile-app/src/screens/purchases/MyPurchasesScreen.tsx', mocks).default;
}
function liveScreen() {
  const h = harness(), requests = [], listeners = new Set(), courseListeners = new Set();
  let user = { id: 'alice' }, resume, focused = true;
  const auth = { getCurrentUser: () => user, subscribeAuthUser(fn) { listeners.add(fn); return () => listeners.delete(fn); } };
  const service = serviceFor(uid => new Promise(resolve => requests.push({ uid, resolve })), auth);
  const resource = load('mobile-app/src/hooks/usePurchaseResource.ts', {
    react: h.react, 'react-native': { AppState: { addEventListener(_, fn) { resume = fn; return { remove() { resume = null; } }; } } },
    '../services/authState': auth, '../services/courseState': { getCourseYear: () => ({ courseId: 'course', yearId: 'year' }),
      subscribeCourseYear(fn) { courseListeners.add(fn); return () => courseListeners.delete(fn); } }, '../utils/logger': { logError() {} },
  }).default;
  // A focus-dependent wrapper permits blur/refocus on the actual screen effect.
  const react = { ...h.react, useEffect(fn, deps) { return h.react.useEffect(() => focused ? fn() : undefined, [...deps, focused]); } };
  const Screen = screenFor(() => resource(service.fetchMyPurchases), react, auth);
  const render = () => h.render(Screen);
  return { requests, render, list: () => nodes(render()).find(n => n.type === 'List'),
    focus(value) { focused = value; render(); }, resume: () => resume('active'),
    user(value) { user = value; listeners.forEach(fn => fn()); },
    unmount() { h.unmount(); assert.equal(listeners.size, 0); assert.equal(courseListeners.size, 0); assert.equal(resume, null); },
  };
}
(async () => {
  await test('two ISO purchases: newest first, numeric output', async () => {
    const result = await history([row('old', '2026-01-01T00:00:00Z'), row('new', '2026-11-11T00:00:00Z')]);
    assert.deepEqual(ids(result), ['new', 'old']); assert.equal(result[0].purchasedAt, Date.parse('2026-11-11T00:00:00Z'));
  });
  await test('multiple dates and subsecond precision', async () => {
    assert.deepEqual(ids(await history([row('b', '2025-12-31T23:59:59Z'), row('d', '2026-11-11T00:00:00.001Z'),
      row('a', '2024-01-01T00:00:00Z'), row('c', '2026-11-11T00:00:00.000Z')])), ['d', 'c', 'b', 'a']);
  });
  await test('offsets compare instants rather than wall time or ISO text', async () => {
    assert.deepEqual(ids(await history([row('older', '2026-11-11T10:00:00+05:30'), row('newer', '2026-11-11T01:00:00-04:00')])), ['newer', 'older']);
  });
  await test('equal instants across offsets use ascending purchase ID', async () => {
    assert.deepEqual(ids(await history([row('b', '2026-11-11T10:30:00+05:30'), row('a', '2026-11-11T05:00:00Z')])), ['a', 'b']);
  });
  await test('ties repeat across reversed server responses and refreshes', async () => {
    const input = ['c', 'a', 'b'].map(id => row(id, '2026-11-11T00:00:00Z'));
    assert.deepEqual(ids(await history(input)), ['a', 'b', 'c']); assert.deepEqual(ids(await history([...input].reverse())), ['a', 'b', 'c']);
  });
  for (const [name, value] of [['null', null], ['missing', undefined], ['invalid', 'not-a-date'], ['empty', ''], ['NaN', NaN], ['infinity', Infinity], ['out of Date range', 9e15]]) {
    await test(`${name} timestamp is undated and follows valid pre-epoch dates`, async () => {
      const result = await history([row('undated', value), row('valid', '1969-12-31T23:59:59Z')]);
      assert.deepEqual(ids(result), ['valid', 'undated']); assert.equal(result[1].purchasedAt, undefined);
    });
  }
  await test('all undated rows have deterministic ID order', async () => {
    assert.deepEqual(ids(await history([row('c', null), row('a'), row('b', 'invalid')])), ['a', 'b', 'c']);
  });
  await test('empty and single purchase', async () => {
    assert.equal((await history([])).length, 0); assert.deepEqual(ids(await history([row('one', 123)])), ['one']);
  });
  await test('createdAt precedence, purchasedAt fallback, numeric and legacy toMillis', async () => {
    const result = await history([row('legacy', { toMillis: () => 300 }), row('numeric', 200),
      row('fallback', null, { purchasedAt: '1970-01-01T00:00:00.100Z' }), row('precedence', 50, { purchasedAt: 999 })]);
    assert.deepEqual(ids(result), ['legacy', 'numeric', 'fallback', 'precedence']);
    assert.deepEqual(Array.from(result, p => p.purchasedAt), [300, 200, 100, 50]);
  });
  await test('frozen input array and records, amounts, identities and statuses unchanged; no new duplicates', async () => {
    const input = Object.freeze([Object.freeze(row('a', 100, { amount: 1, orderId: 'oa' })), Object.freeze(row('b', 300, { amount: 2, orderId: 'ob' })),
      Object.freeze(row('c', 200, { amount: 5, orderId: 'oc' })), Object.freeze(row('d', 400, { amount: 149.5, orderId: 'od' }))]);
    const before = JSON.stringify(input), result = await history(input);
    assert.equal(JSON.stringify(input), before); assert.deepEqual(ids(result), ['d', 'b', 'c', 'a']);
    assert.equal(new Set(ids(result)).size, input.length);
    for (const output of result) { const original = input.find(p => p.id === output.id); assert.equal(output.amount, original.amount); assert.equal(output.orderId, original.orderId); assert.equal(output.status, original.status); assert.notEqual(output, original); }
  });
  await test('distinct historical purchases for the same product are both retained', async () => {
    const result = await history([row('old-order-purchase', 100, { productId: 'same-product', orderId: 'old-order' }),
      row('new-order-purchase', 200, { productId: 'same-product', orderId: 'new-order' })]);
    assert.deepEqual(ids(result), ['new-order-purchase', 'old-order-purchase']);
    assert.deepEqual(Array.from(result, p => p.orderId), ['new-order', 'old-order']);
  });
  await test('repository user/success filters, snake_case dates, refunded/failed/pending exclusion, one read', async () => {
    const input = ['success', 'refunded', 'failed', 'pending'].flatMap((status, i) => ['alice', 'bob'].map(uid => ({
      id: `${uid}-${status}`, user_id: uid, status, created_at: `2026-11-${10 + i}T00:00:00Z`, scope: 'chapter', amount: 2,
    })));
    let reads = 0; const filters = [];
    const supabase = { from(table) { assert.equal(table, 'purchases'); reads++; const where = [];
      return { select(columns) { assert.equal(columns, '*'); return this; }, eq(key, value) { where.push([key, value]); filters.push([key, value]); return this; },
        then(resolve) { resolve({ data: input.filter(p => where.every(([k, v]) => p[k] === v)), error: null }); } }; } };
    const repository = load('mobile-app/src/repositories/purchasesRepository.ts', {
      '../config/supabase': { supabase }, '../config/paymentProvider': { isNonplayTestBuild: false },
      '../utils/caseConvert': load('mobile-app/src/utils/caseConvert.ts', {}),
    });
    const service = serviceFor(repository.getPurchasesByUser);
    const a = await service.fetchMyPurchases(); assert.equal(reads, 1); assert.deepEqual(ids(a), ['alice-success']);
    assert.equal(a[0].purchasedAt, Date.parse('2026-11-10T00:00:00Z'));
    assert.deepEqual(filters, [['user_id', 'alice'], ['status', 'success']]);
    assert.deepEqual(ids(await service.fetchMyPurchases('bob')), ['bob-success']);
  });
  await test('no user means empty history without repository reads', async () => {
    const service = serviceFor(() => { throw Error('unexpected query'); }, { getCurrentUser: () => null });
    assert.equal((await service.fetchMyPurchases()).length, 0); assert.equal((await service.fetchOwnedScopes()).length, 0);
  });
  await test('all ownership scopes unchanged by history sorting; revoked states never unlock', async () => {
    const chapter = { id: 'chapter', subjectId: 'subject', yearId: 'year' };
    for (const scope of ['chapter', 'subject', 'year', 'bundle']) {
      const owned = row(scope, '2026-11-11T00:00:00Z', { scope, chapterId: 'chapter', subjectId: 'subject', yearId: 'year', yearIds: ['year'], courseId: 'course' });
      const service = serviceFor(async () => [owned]); const before = JSON.stringify(owned);
      const scopes = await service.fetchOwnedScopes(); await service.fetchMyPurchases(); assert.equal(JSON.stringify(owned), before);
      assert.equal(service.isChapterUnlocked(scopes, chapter), true); assert.equal(service.isProductOwned(scopes, { scope: 'chapter', chapterId: 'chapter', subjectId: 'subject', yearId: 'year' }), true);
      for (const status of ['refunded', 'failed', 'pending']) assert.equal(service.isChapterUnlocked([{ ...owned, status }], chapter), false);
    }
  });
  await test('service preserves refunded/failed/pending states if supplied; screen retains existing status/date/amount formatting', async () => {
    const input = ['success', 'pending', 'failed', 'refunded'].map((status, i) => row(status, `2026-11-1${i}T12:00:00+05:30`, { status, amount: [1, 2, 5, 149.5][i] }));
    const purchases = await history(input);
    const h = harness(), Screen = screenFor(() => ({ value: purchases, loading: false, error: null, refresh() {} }), h.react, { getCurrentUser: () => ({ id: 'alice' }) });
    const list = nodes(h.render(Screen)).find(n => n.type === 'List');
    assert.deepEqual(ids(list.props.data), ['refunded', 'failed', 'pending', 'success']);
    for (const item of purchases) {
      const texts = nodes(list.props.renderItem({ item })).map(n => n.props?.children);
      assert.ok(texts.some(t => Array.isArray(t) && t[0] === '₹' && t[1] === item.amount));
      assert.ok(texts.includes(new Date(input.find(p => p.id === item.id).createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })));
      // Refunded is filtered by the repository; its existing fallback is preserved, not expanded by MV012.
      assert.ok(texts.includes({ success: '✅ Paid', pending: '⏳ Pending', failed: '❌ Failed', refunded: '✅ Paid' }[item.status]));
    }
    h.unmount();
  });
  await test('actual My Purchases receives sorted rows, unique keys and undated placeholder', async () => {
    const s = liveScreen(); s.render(); assert.equal(s.requests.length, 2);
    s.requests[1].resolve([row('undated'), row('old', '2026-01-01T00:00:00Z'), row('new', '2026-11-11T00:00:00Z')]); await tick();
    s.requests[0].resolve([]); await tick(); const list = s.list();
    assert.deepEqual(ids(list.props.data), ['new', 'old', 'undated']);
    assert.equal(new Set(Array.from(list.props.data, list.props.keyExtractor)).size, 3);
    assert.ok(nodes(list.props.renderItem({ item: list.props.data[2] })).some(n => n.props?.children === '—')); s.unmount();
  });
  await test('navigation refocus and app resume refresh preserve newest-first ordering', async () => {
    const s = liveScreen(); s.render(); s.requests[1].resolve([row('old', 1)]); await tick(); s.requests[0].resolve([]); await tick();
    s.focus(false); s.focus(true); assert.equal(s.requests.length, 3);
    s.requests[2].resolve([row('old', 1), row('new', 2)]); await tick(); assert.deepEqual(ids(s.list().props.data), ['new', 'old']);
    s.resume(); s.requests[3].resolve([row('old', 1), row('newest', 3), row('new', 2)]); await tick(); assert.deepEqual(ids(s.list().props.data), ['newest', 'new', 'old']); s.unmount();
  });
  await test('account switch clears history and ignores stale sorted response', async () => {
    const s = liveScreen(); s.render(); s.user({ id: 'bob' }); assert.equal(s.requests[2].uid, 'bob');
    s.requests[2].resolve([row('bob-old', 1), row('bob-new', 2)]); await tick();
    s.requests[0].resolve([row('alice', 999)]); s.requests[1].resolve([row('alice', 999)]); await tick();
    assert.deepEqual(ids(s.list().props.data), ['bob-new', 'bob-old']); s.user(null); assert.equal(s.list().props.data.length, 0); s.unmount();
  });
  console.log(`MV012: ${passed} PASS, 0 FAIL`);
})().catch(error => { console.error(error); process.exitCode = 1; });

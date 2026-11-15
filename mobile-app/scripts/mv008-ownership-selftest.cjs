const assert = require('node:assert/strict');
const { harness, load, tick, jsx, nodes } = require('./ui-harness.cjs');
let passed = 0;
const chapter = { id: 'chapter', subjectId: 'subject', yearId: 'year' };
const scope = (kind = 'chapter', courseId = 'course') => ({ status: 'success', scope: kind, courseId,
  chapterId: 'chapter', subjectId: 'subject', yearId: 'year', yearIds: ['year', 'year2'] });
function setup(history = false) {
  const h = harness(), requests = [], listeners = new Set(), courses = new Set(), timers = new Set();
  let user = { id: 'alice' }, course = { courseId: 'course', yearId: 'year' }, resume, writes = 0;
  const react = { ...h.react, useState(initial) {
    const [value, set] = h.react.useState(initial);
    return [value, next => { writes++; set(next); }];
  }};
  const auth = { getCurrentUser: () => user, subscribeAuthUser(fn) { listeners.add(fn); return () => listeners.delete(fn); } };
  const courseState = { getCourseYear: () => course, subscribeCourseYear(fn) { courses.add(fn); return () => courses.delete(fn); } };
  const service = load('mobile-app/src/services/purchasesService.ts', {
    './authState': auth, '../repositories/purchasesRepository': { getPurchasesByUser(uid) {
      return new Promise((resolve, reject) => requests.push({ uid, resolve, reject }));
    } },
  });
  const resource = load('mobile-app/src/hooks/usePurchaseResource.ts', {
    react, 'react-native': { AppState: { addEventListener(event, fn) { resume = fn; return { remove() { resume = null; } }; } } },
    '../services/authState': auth, '../services/courseState': courseState, '../utils/logger': { logError() {} },
  }, { setTimeout(fn, ms) { assert.equal(ms, 15000); const timer = { fn }; timers.add(timer); return timer; }, clearTimeout(timer) { timers.delete(timer); } }).default;
  const hook = history ? () => resource(service.fetchMyPurchases) : load('mobile-app/src/hooks/usePurchases.ts', {
    react, './usePurchaseResource': { __esModule: true, default: resource }, '../services/courseState': courseState,
    '../services/purchasesService': service,
  }).default;
  return { requests, timers, react, resource, hook, auth, render: fn => h.render(fn), read: () => h.render(hook),
    user(next) { user = next; listeners.forEach(fn => fn()); },
    course(next) { course = next; courses.forEach(fn => fn(course)); },
    resume() { resume?.('active'); }, timeout() { [...timers].forEach(t => t.fn()); },
    unmount() { h.unmount(); assert.equal(listeners.size, 0); assert.equal(courses.size, 0); assert.equal(resume, null); assert.equal(timers.size, 0); },
    writes: () => writes,
  };
}
async function test(name, fn) { await fn(); passed++; console.log('PASS ' + name); }
(async () => {
  await test('actual auth state notifies startup/login/logout/account switch; ignores late bootstrap session', async () => {
    function authFixture() {
      let event, bootstrap;
      const api = load('mobile-app/src/services/authState.ts', {
        '../config/supabase': { supabase: { auth: {
          getSession: () => new Promise(resolve => { bootstrap = resolve; }),
          onAuthStateChange: fn => { event = fn; }, signOut: async () => ({ error: null }),
        }, from: () => ({ select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: null }) }) } },
        '@react-native-async-storage/async-storage': { __esModule: true, default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} } },
        './pushNotifications': { setPushNotificationUser() {}, registerForPushNotifications() {}, unregisterCurrentDeviceToken: async () => {} },
        '../utils/downloadManager': { clearAllDownloads: async () => {} }, '../utils/logger': { logDebug() {} },
      });
      const observed = [];
      const unsubscribe = api.subscribeAuthUser(() => observed.push(api.getCurrentUser()?.id ?? null));
      return { api, observed, unsubscribe, bootstrap: uid => bootstrap({ data: { session: { user: { id: uid } } } }),
        emit: (name, uid) => event(name, uid ? { user: { id: uid } } : null) };
    }
    const a = authFixture(); a.bootstrap('alice'); await tick(); assert.equal(a.observed[0], 'alice');
    a.emit('TOKEN_REFRESHED', 'alice'); assert.equal(a.observed.length, 1);
    a.emit('SIGNED_OUT'); a.emit('SIGNED_IN', 'bob'); await tick(); assert.deepEqual(a.observed, ['alice', null, 'bob']);
    await a.api.performSignOut(); assert.equal(a.observed.at(-1), null); a.unsubscribe();
    const b = authFixture(); b.emit('SIGNED_IN', 'bob'); b.bootstrap('alice'); await tick();
    assert.equal(b.api.getCurrentUser().id, 'bob'); assert.deepEqual(b.observed, ['bob']); b.unsubscribe();
  });
  await test('A slow / B fast: late A cannot erase newly confirmed purchase', async () => {
    const s = setup(); s.read(); const b = s.read().refresh();
    s.requests[1].resolve([scope()]); await b;
    s.requests[0].resolve([]); await tick();
    assert.equal(s.read().isChapterOwned(chapter), true); assert.equal(s.read().loading, false); s.unmount();
  });
  await test('B slow / A fast: obsolete A cannot grant ownership or end B loading', async () => {
    const s = setup(); s.read(); const b = s.read().refresh();
    s.requests[0].resolve([scope()]); await tick();
    assert.equal(s.read().isChapterOwned(chapter), false); assert.equal(s.read().loading, true);
    s.requests[1].resolve([]); await b; assert.equal(s.read().loading, false); s.unmount();
  });
  await test('multiple concurrent refreshes: latest generation alone wins', async () => {
    const s = setup(); s.read(); const api = s.read(); const pending = [api.refresh(), api.refresh(), api.refresh()];
    s.requests[3].resolve([scope()]); await tick();
    s.requests[2].reject(new Error('obsolete')); s.requests[0].resolve([]); s.requests[1].resolve([]);
    await Promise.all(pending); await tick(); assert.equal(s.read().isChapterOwned(chapter), true); assert.equal(s.read().error, null); s.unmount();
  });
  await test('logout during load and login ownership initialization', async () => {
    const s = setup(); s.read(); s.user(null); assert.equal(s.read().loading, false);
    s.requests[0].resolve([scope()]); await tick(); assert.equal(s.read().ownedScopes.length, 0);
    s.user({ id: 'bob' }); assert.equal(s.requests[1].uid, 'bob'); assert.equal(s.read().loading, true);
    s.requests[1].resolve([scope()]); await tick(); assert.equal(s.read().isChapterOwned(chapter), true); s.unmount();
  });
  await test('account switch invalidates pending and previously confirmed ownership', async () => {
    const s = setup(); s.read(); s.requests[0].resolve([scope()]); await tick();
    void s.read().refresh(); s.user({ id: 'bob' }); assert.equal(s.read().ownedScopes.length, 0);
    s.requests[1].resolve([scope()]); s.requests[2].reject(new Error('bob offline')); await tick();
    assert.equal(s.read().ownedScopes.length, 0); assert.ok(s.read().error); s.unmount();
  });
  await test('same account logout/login cannot revive requests from previous session', async () => {
    const s = setup(); s.read(); s.user(null); s.user({ id: 'alice' });
    s.requests[1].resolve([]); s.requests[0].resolve([scope()]); await tick();
    assert.equal(s.read().ownedScopes.length, 0); s.unmount();
  });
  await test('course/year switch clears old scopes and filters cross-course results', async () => {
    const s = setup(); s.read(); s.course({ courseId: 'other', yearId: 'other-year' });
    s.requests[1].resolve([scope(), scope('chapter', 'other')]); await tick();
    s.requests[0].resolve([scope()]); await tick();
    assert.equal(s.read().ownedScopes.length, 1); assert.equal(s.read().ownedScopes[0].courseId, 'other');
    s.course({ courseId: 'other', yearId: 'year2' }); assert.equal(s.read().ownedScopes.length, 0);
    s.requests[2].resolve([scope('bundle', 'other')]); await tick(); assert.equal(s.read().isChapterOwned(chapter), true); s.unmount();
  });
  for (const failure of ['timeout', 'API failure']) await test(`${failure}: retain same-context confirmed purchase, show error, recover`, async () => {
    const s = setup(); s.read(); s.requests[0].resolve([scope()]); await tick();
    const pending = s.read().refresh();
    if (failure === 'timeout') s.timeout(); else s.requests[1].reject(new Error('network failure'));
    await pending; assert.ok(s.read().error); assert.equal(s.read().loading, false); assert.equal(s.read().isChapterOwned(chapter), true);
    const retry = s.read().refresh(); assert.equal(s.read().error, null); s.requests[2].resolve([]); await retry;
    assert.equal(s.read().isChapterOwned(chapter), false);
    if (failure === 'timeout') { s.requests[1].resolve([scope()]); await tick(); assert.equal(s.read().ownedScopes.length, 0); }
    s.unmount();
  });
  await test('initial failure is explicit and cannot fabricate ownership', async () => {
    const s = setup(); s.read(); s.requests[0].reject(new Error('unavailable')); await tick();
    assert.ok(s.read().error); assert.equal(s.read().loading, false); assert.equal(s.read().isChapterOwned(chapter), false); s.unmount();
  });
  await test('unmount ignores success/error/finally and clears listeners and timers', async () => {
    for (const reject of [false, true]) {
      const s = setup(); s.read(); s.unmount(); const before = s.writes();
      if (reject) s.requests[0].reject(new Error('late')); else s.requests[0].resolve([scope()]);
      await tick(); assert.equal(s.writes(), before); await s.read().refresh(); assert.equal(s.writes(), before);
    }
  });
  await test('payment confirmation, navigation focus refresh, resume, and revocation', async () => {
    const s = setup(); s.read(); s.requests[0].resolve([]); await tick();
    const confirmed = s.read().refresh(); s.requests[1].resolve([scope()]); await confirmed;
    const focus = s.read().refresh(); s.requests[2].resolve([scope()]); await focus;
    assert.equal(s.read().isChapterOwned(chapter), true);
    s.resume(); s.requests[3].resolve([]); await tick(); assert.equal(s.read().isChapterOwned(chapter), false); s.unmount();
  });
  for (const kind of ['chapter', 'subject', 'year', 'bundle']) await test(`${kind} purchase owns covered chapter/product only`, async () => {
    const s = setup(); s.read(); s.requests[0].resolve([scope(kind)]); await tick();
    assert.equal(s.read().isChapterOwned(chapter), true);
    assert.equal(s.read().isOwned({ scope: 'chapter', chapterId: 'chapter', subjectId: 'subject', yearId: 'year' }), true);
    assert.equal(s.read().isChapterOwned({ id: 'unpaid', subjectId: 'unpaid', yearId: 'unpaid' }), false); s.unmount();
  });
  await test('purchase history shares ordering/account/unmount guards', async () => {
    const s = setup(true); s.read(); const newest = s.read().refresh();
    s.requests[1].resolve([{ ...scope(), id: 'new' }]); await newest;
    s.requests[0].resolve([{ ...scope(), id: 'old' }]); await tick(); assert.equal(s.read().value[0].id, 'new');
    s.user({ id: 'bob' }); assert.equal(s.read().value.length, 0); s.unmount();
    const before = s.writes(); s.requests[2].resolve([{ ...scope(), id: 'alice' }]); await tick(); assert.equal(s.writes(), before);
  });
  await test('actual Notes screen refreshes ownership on focus; route cannot grant/deny paid access; signer still denies', async () => {
    const s = setup(); let routeUnlocked = false, reads = 0, opens = 0, alerts = 0, denied = false;
    const note = { id: 'paid', title: 'Paid Notes', isFreePreview: false };
    class NoteAccessError extends Error { status = 403; }
    const mocks = { react: s.react, 'react/jsx-runtime': jsx,
      'react-native': { View: 'View', Text: 'Text', FlatList: 'List', ActivityIndicator: 'Spinner', StyleSheet: { create: x => x }, Alert: { alert() { alerts++; } } },
      '@react-navigation/native': { useRoute: () => ({ params: { chapterId: 'chapter', subjectId: 'subject', yearId: 'year', unlocked: routeUnlocked } }),
        useNavigation: () => ({ navigate() { opens++; } }), useFocusEffect: fn => s.react.useEffect(fn, [fn]) },
      '../../hooks/usePurchases': { __esModule: true, default: s.hook },
      '../../navigation/withRouteValidation': { withRouteValidation: screen => screen },
      '../../hooks/useLoadResource': { __esModule: true, default: () => ({ value: [note], loading: false, error: false, retry() {} }) },
      '../../hooks/useDownloads': { __esModule: true, default: () => ({ isDownloaded: () => false, getItem: () => null }) },
      '../../services/notesService': {}, '../../services/authState': s.auth, '../../utils/logger': { logError() {} },
      '../../services/secureNotesService': { NoteAccessError, async getSecureNoteUrl() { reads++; if (denied) throw new NoteAccessError(); return 'https://synthetic.invalid/authorized'; } },
    };
    for (const name of ['PurchaseOwnershipStatus', 'LoadError', 'NoteCard', 'EmptyState', 'SearchBar', 'UnlockOptionsPanel']) mocks['../../components/' + name] = { __esModule: true, default: name };
    for (const [file, key] of [['colors', 'COLORS'], ['fonts', 'FONT'], ['spacing', 'SPACING']]) mocks['../../theme/' + file] = { [key]: {} };
    const Screen = load('mobile-app/src/screens/notes/NotesScreen.tsx', mocks).default;
    const card = () => nodes(s.render(Screen)).find(n => n.type === 'List').props.renderItem({ item: note });
    card(); assert.equal(s.requests.length, 2, 'mount and navigation focus both refresh ownership');
    s.requests[1].resolve([scope()]); await tick(); s.requests[0].resolve([]); await tick();
    assert.equal(card().props.locked, false, 'fresh ownership overrides stale locked route');
    await card().props.onPress(); assert.equal(reads, 1); assert.equal(opens, 1);
    denied = true; await card().props.onPress(); assert.equal(reads, 2); assert.equal(opens, 1); assert.equal(alerts, 1);
    routeUnlocked = true; s.user({ id: 'bob' }); s.requests[2].resolve([]); await tick();
    assert.equal(card().props.locked, true, 'unlocked route cannot grant another account access');
    await card().props.onPress(); assert.equal(reads, 2); assert.equal(opens, 1); s.unmount();
  });
  await test('actual My Purchases recovery refresh wins over pre-confirmation history; old-account recovery ignored', async () => {
    for (const switchAccount of [false, true]) {
      const s = setup(true); let recovered;
      const service = load('mobile-app/src/services/purchasesService.ts', { './authState': s.auth,
        '../repositories/purchasesRepository': { getPurchasesByUser: uid => new Promise((resolve, reject) => s.requests.push({ uid, resolve, reject })) } });
      const mocks = { react: s.react, 'react/jsx-runtime': jsx,
        'react-native': { View: 'View', Text: 'Text', FlatList: 'List', ActivityIndicator: 'Spinner', StyleSheet: { create: x => x } },
        '@react-navigation/native': { useFocusEffect: fn => s.react.useEffect(fn, [fn]) },
        '../../hooks/usePurchaseResource': { __esModule: true, default: s.resource }, '../../services/authState': s.auth,
        '../../services/purchasesService': service, '../../services/playBillingService': {}, '../../config/paymentProvider': { paymentProvider: 'disabled' },
        '../../services/paymentService': { recoverMyPendingPayments: () => new Promise(resolve => { recovered = resolve; }) },
      };
      for (const name of ['EmptyState', 'ErrorState', 'BottomNav']) mocks['../../components/' + name] = { __esModule: true, default: name };
      for (const [file, key] of [['colors', 'COLORS'], ['fonts', 'FONT'], ['spacing', 'SPACING'], ['radius', 'RADIUS'], ['shadows', 'SHADOW']]) mocks['../../theme/' + file] = { [key]: {} };
      const Screen = load('mobile-app/src/screens/purchases/MyPurchasesScreen.tsx', mocks).default;
      s.render(Screen); assert.equal(s.requests.length, 2);
      if (switchAccount) {
        s.user({ id: 'bob' }); const count = s.requests.length; recovered(true); await tick();
        assert.equal(s.requests.length, count, 'old account confirmation cannot initiate new account refresh');
        s.requests[2].resolve([]);
      } else {
        recovered(true); await tick(); assert.equal(s.requests.length, 3);
        s.requests[2].resolve([{ ...scope(), id: 'confirmed' }]);
      }
      s.requests[0].resolve([]); s.requests[1].resolve([]); await tick();
      const list = nodes(s.render(Screen)).find(n => n.type === 'List');
      assert.equal(list.props.data.length, switchAccount ? 0 : 1);
      if (!switchAccount) assert.equal(list.props.data[0].id, 'confirmed');
      s.unmount();
    }
  });
  console.log(`MV008: ${passed} PASS, 0 FAIL`);
})().catch(error => { console.error(error); process.exitCode = 1; });

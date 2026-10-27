// Offline boundary probe: real screen Hooks/services/repositories, fake native UI,
// Supabase and SQLite. Counts are fixture-specific, never device TTI/FPS or React
// Profiler results. Protected auth/referral/billing entrypoints are opaque mocks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../mobile-app/node_modules/typescript');
const root = path.resolve(__dirname, '../mobile-app');
const changed = (a, b) => !a || !b || a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]));

async function probe(screen, { firstInstall = false } = {}) {
  const counters = { requests: [], sqlite: [], storageReads: 0, storageWrites: 0, renders: 0, opaque: [] };
  const slots = [], effects = [], timers = new Map();
  let cursor = 0, dirty = true, lastTree, timerId = 0;
  const slot = (kind, create) => {
    const index = cursor++;
    if (!slots[index]) slots[index] = { kind, ...create() };
    assert.equal(slots[index].kind, kind, 'Hook order');
    return slots[index];
  };
  const element = (type, props, ...children) => ({ type, props: { ...props, children } });
  const react = {
    createElement: element,
    useState(initial) {
      const s = slot('state', () => ({ value: typeof initial === 'function' ? initial() : initial }));
      s.set ??= value => { const next = typeof value === 'function' ? value(s.value) : value; if (!Object.is(s.value, next)) { s.value = next; dirty = true; } };
      return [s.value, s.set];
    },
    useRef(initial) { return slot('ref', () => ({ value: { current: initial } })).value; },
    useMemo(fn, deps) { const s = slot('memo', () => ({})); if (changed(s.deps, deps)) { s.value = fn(); s.deps = deps; } return s.value; },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const s = slot('effect', () => ({})); if (changed(s.deps, deps)) { s.deps = deps; effects.push(() => { s.cleanup?.(); s.cleanup = fn(); }); } },
  };
  const storage = new Map(firstInstall ? [] : [['medveda:answer-free-quiz-downloads:v1', '1']]);
  const asyncStorage = {
    getItem: async key => { counters.storageReads++; return storage.get(key) ?? null; },
    setItem: async (key, value) => { counters.storageWrites++; storage.set(key, value); },
    removeItem: async key => { counters.storageWrites++; storage.delete(key); },
    getAllKeys: async () => [...storage.keys()],
  };
  const sql = (method, statement) => { counters.sqlite.push({ method, statement: statement.replace(/\s+/g, ' ').trim() }); };
  const db = {
    execSync: statement => sql('execSync', statement), runSync: statement => sql('runSync', statement),
    getAllSync: statement => { sql('getAllSync', statement); return statement.startsWith('PRAGMA') && !firstInstall ? [{ name: 'course_id' }, { name: 'verification_status' }] : []; },
    getFirstSync: statement => { sql('getFirstSync', statement); return null; },
  };
  const common = { active: true, course_id: 'bams', year_id: 'y1', subject_id: 's1', subjects: { title: 'Anatomy' }, years: { title: 'First year' } };
  const rows = {
    years: Array.from({ length: 4 }, (_, i) => ({ ...common, id: `y${i + 1}`, title: `Year ${i + 1}`, order: i })),
    subjects: [{ ...common, id: 's1', title: 'Anatomy' }],
    chapters: [{ ...common, id: 'c1', title: 'Anatomy chapter' }],
    notes: [{ ...common, id: 'n1', chapter_id: 'c1', title: 'Anatomy note', is_free_preview: true }],
    videos: [{ ...common, id: 'v1', title: 'Anatomy video', youtube_url: 'https://youtu.be/dQw4w9WgXcQ' }],
    notifications: [{ id: 'notification', title: 'Update', body: 'Fixture', active: true }],
    products: [], purchases: [], verified_quiz_attempts: [], quiz_scores: [], quiz_tests: [],
    app_config: [{ key: 'min_app_version', value: '1.2.1' }],
  };
  function query(table, rpc = false) {
    const filters = []; let operation = 'select', head = false;
    const q = new Proxy({}, { get: (_, key) => {
      if (key === 'then') return (resolve, reject) => {
        counters.requests.push({ table, operation, filters: [...filters] });
        return Promise.resolve({ data: rpc ? false : head || operation !== 'select' ? null : structuredClone(rows[table] ?? []), count: 0, error: null }).then(resolve, reject);
      };
      return (...args) => {
        if (['insert', 'upsert', 'delete', 'update'].includes(key)) operation = key;
        if (key === 'select') head = args[1]?.head === true;
        if (['eq', 'in', 'gt'].includes(key)) filters.push([key, ...args]);
        return q;
      };
    } });
    return q;
  }
  const supabase = { from: table => query(table), rpc: name => query(name, true),
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), getSession: async () => ({ data: { session: { user: { id: 'fixture' } } } }) } };
  const navigation = { navigate() {}, replace() {}, goBack() {} };
  const course = { status: 'ready', ready: true, courseId: 'bams', yearId: 'y1', courseTitle: 'BAMS', yearTitle: 'First year' };
  const native = new Proxy({ Platform: { OS: 'android' }, StyleSheet: { create: x => x, absoluteFill: {} },
    AppState: { addEventListener: () => ({ remove() {} }) }, Alert: { alert() {} },
    InteractionManager: { runAfterInteractions: fn => { const id = ++timerId; timers.set(id, fn); return { cancel: () => timers.delete(id) }; } },
  }, { get: (obj, key) => key in obj ? obj[key] : key });
  const mocks = {
    react: { __esModule: true, default: react, ...react }, 'react-native': native,
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    '@react-navigation/native': { useNavigation: () => navigation, useRoute: () => ({ params: { chapterId: 'c1', chapterTitle: 'Anatomy', subjectId: 's1', subjectTitle: 'Anatomy', yearId: 'y1', yearTitle: 'First year' } }), useFocusEffect: fn => react.useEffect(fn, [fn]) },
    '@react-native-async-storage/async-storage': { __esModule: true, default: asyncStorage },
    '@react-native-community/netinfo': { __esModule: true, default: { fetch: async () => ({ isConnected: true, isInternetReachable: true }), addEventListener: () => () => {} } },
    'expo-sqlite': { openDatabaseSync: () => db },
    'expo-file-system/legacy': { documentDirectory: 'file:///fixture/', deleteAsync: async () => {} },
    'expo-application': { nativeApplicationVersion: '1.2.1', nativeBuildVersion: 'fixture' },
    'expo-web-browser': {},
    'expo-clipboard': {},
    'src/config/supabase': { supabase },
    'src/config/paymentProvider': { paymentProvider: 'play' },
    'src/services/authState': { getCurrentUser: () => ({ id: 'fixture', email: 'fixture@example.invalid' }), getCurrentUserDisplayName: () => 'Fixture' },
    'src/services/courseState': { getCourseYear: () => course, onCourseChange: () => () => {}, needsCourseYearSelection: () => false },
    'src/hooks/useCourseYear': { __esModule: true, default: () => course },
    'src/hooks/usePurchase': { __esModule: true, default: () => ({ buy() {}, purchasing: false }) },
    'src/services/referralsService': { applyPendingReferralCode: async () => { counters.opaque.push('referral'); return null; } },
    'src/services/playBillingService': { restorePlayPurchases: async () => { counters.opaque.push('play-restore'); } },
    'src/services/pushNotifications': { registerForPushNotifications: async () => { counters.opaque.push('push-registration'); } },
    'src/utils/logger': { logError: (...args) => { throw new Error(args.map(String).join(' ')); }, logDebug() {} },
    'src/utils/videoDiagnostics': { traceVideo() {} },
  };
  const cache = new Map();
  function load(file) {
    const key = path.relative(root, file).replace(/\.(tsx?|js)$/, '');
    if (key in mocks) return mocks[key];
    if (key.includes('/components/') || key.startsWith('src/components/') || key.startsWith('src/navigation/') || (screen === 'App' && key.startsWith('src/screens/'))) return { __esModule: true, default: key };
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} }; cache.set(file, mod);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(code, { exports: mod.exports, module: mod, __DEV__: false, console,
      AbortController, AbortSignal,
      setTimeout: (fn, ms) => { const id = ++timerId; timers.set(id, { fn, ms }); return id; }, clearTimeout: id => timers.delete(id),
      setInterval: () => 1, clearInterval() {},
      require: name => {
        if (name in mocks) return mocks[name];
        if (!name.startsWith('.')) {
          if (['expo-status-bar', 'react-native-safe-area-context'].includes(name)) return {};
          throw new Error(`Unmocked external module ${name}`);
        }
        const base = path.resolve(path.dirname(file), name);
        const resolved = ['.ts', '.tsx', '.js'].map(ext => base + ext).find(fs.existsSync);
        assert.ok(resolved, name); return load(resolved);
      },
    }, { filename: file });
    return mod.exports;
  }
  const file = screen === 'App' ? 'App.tsx' : screen === 'Search' ? 'src/hooks/useGlobalSearch.ts' : `src/screens/${screen.toLowerCase()}/${screen}Screen.tsx`;
  const component = load(path.join(root, file)).default;
  async function settle() {
    let quiet = 0;
    for (let tick = 0; tick < 50 && quiet < 3; tick++) {
      if (dirty) { dirty = false; cursor = 0; counters.renders++; lastTree = component(); quiet = 0; }
      effects.splice(0).forEach(fn => fn());
      await new Promise(resolve => setImmediate(resolve));
      quiet = dirty || effects.length ? 0 : quiet + 1;
    }
    assert.ok(!dirty && !effects.length, 'Fixture did not settle');
  }
  await settle();
  const openingRequests = counters.requests.length;
  if (screen === 'Search') {
    lastTree.setQuery('anatomy'); await settle();
    for (const [id, timer] of timers) if (timer.ms === 300) { timers.delete(id); timer.fn(); }
    await settle();
  }
  slots.forEach(s => s.cleanup?.());
  return { ...counters, openingRequests, requestCount: counters.requests.length, sqliteCalls: counters.sqlite.length };
}

module.exports = { probe };
if (require.main === module) (async () => {
  const result = {};
  for (const screen of ['App', 'Home', 'Notes', 'Videos', 'Chapters', 'Search']) result[screen] = await probe(screen);
  result.firstInstall = await probe('App', { firstInstall: true });
  console.log(JSON.stringify(result, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });

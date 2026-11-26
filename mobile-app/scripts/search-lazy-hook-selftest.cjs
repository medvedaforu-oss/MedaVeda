const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../node_modules/typescript');
const { load } = require('./ui-harness.cjs');
const auth = {getCurrentUser:()=>({id:'fixture'}),getAuthEpoch:()=>0,subscribeAuthUser:()=>()=>{}};
const ownerStorage = load('mobile-app/src/utils/ownerStorage.ts', {'@react-native-async-storage/async-storage':{},'../services/authState':auth});
const discoveryRequests = []; let delayDiscovery = false;
const slots = [], effects = []; let cursor = 0, builds = 0;
const changed = (a, b) => !a || a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]));
const react = {
  useState(value) { const i = cursor++; slots[i] ??= { value }; return [slots[i].value, next => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; }]; },
  useRef(value) { const i = cursor++; slots[i] ??= { value: { current: value } }; return slots[i].value; },
  useMemo(fn, deps) { const i = cursor++; if (!slots[i] || changed(slots[i].deps, deps)) slots[i] = { value: fn(), deps }; return slots[i].value; },
  useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
  useEffect(fn, deps) { const i = cursor++; if (!slots[i] || changed(slots[i].deps, deps)) { slots[i]?.cleanup?.(); slots[i] = { deps }; effects.push(() => { slots[i].cleanup = fn(); }); } },
};
const empty = { years: [], subjects: [], chapters: [], notes: [], videos: [], quizzes: [], products: [], purchases: [], notifications: [], builtAt: 1 };
const stable = { ownedScopes: [], downloads: [], refresh() {} };
const mocks = {
  react, 'react-native': { Platform: { OS: 'android' }, Alert: {} },
  '@react-navigation/native': { useNavigation: () => ({}), useFocusEffect() {} },
  './useDebounce': { __esModule: true, default: value => value },
  './useCourseYear': { __esModule: true, default: () => ({ ready: true, courseId: 'c' }) },
  './useNetworkStatus': { __esModule: true, default: () => true },
  './usePurchases': { __esModule: true, default: () => stable },
  './useDownloads': { __esModule: true, default: () => stable },
  './usePurchase': { __esModule: true, default: () => ({ purchasing: false }) },
  '../services/searchService': {
    getCachedSearchIndex: async () => null,
    getSearchIndex: async () => { builds++; return empty; },
    applyOwnership: () => [], searchResults: () => [], getDiscoverySections: () => delayDiscovery ? new Promise(resolve => discoveryRequests.push(resolve)) : Promise.resolve([]),
  },
  '../services/quizService': {},
  '../utils/recentSearches': { getRecentSearches: async () => [] },
  '../services/authState': auth, '../utils/ownerStorage': ownerStorage,
  '../types/search': { DEFAULT_FILTERS: { types: [], pricing: 'all', downloadedOnly: false, sort: 'relevance' } },
  '../utils/logger': { logError() {} },
};
const exports_ = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(__dirname + '/../src/hooks/useGlobalSearch.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: exports_, require: name => { assert.ok(name in mocks, name); return mocks[name]; } });
const render = () => { cursor = 0; const result = exports_.default(); effects.splice(0).forEach(fn => fn()); return result; };
const tick = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  let state = render(); await tick(); state = render();
  assert.equal(builds, 0, 'opening an empty Search must not build the index');
  assert.equal(state.loading, false);
  state.setQuery('anatomy'); render(); await tick(); state = render();
  assert.equal(builds, 1); assert.equal(state.loading, false);
  state.setQuery('anatomy chapter'); render(); await tick(); state = render();
  assert.equal(builds, 1, 'additional keystrokes reuse the index');
  await state.onRefresh(); render(); assert.equal(builds, 2);
  state.setQuery(''); delayDiscovery = true;
  stable.ownedScopes = [{ status: 'success', scope: 'year', yearId: 'y' }]; render();
  stable.ownedScopes = []; state = render();
  assert.equal(state.sections.length, 0, 'discovery from previous ownership must be masked');
  discoveryRequests[1]([{ title: 'current', data: [], totalCount: 0 }]); await tick(); state = render();
  assert.equal(state.sections[0].title, 'current');
  discoveryRequests[0]([{ title: 'obsolete', data: [], totalCount: 0 }]); await tick(); state = render();
  assert.equal(state.sections[0].title, 'current', 'late discovery cannot restore old ownership badges');
  console.log('PASS search discovery masks previous ownership and rejects obsolete async completion');
  slots.filter(slot => slot.cleanup).forEach(slot => slot.cleanup());
  console.log('PASS actual search hook opens without build, lazily builds on first query, reuses on typing and explicitly refreshes');
})().catch(error => { console.error(error); process.exitCode = 1; });

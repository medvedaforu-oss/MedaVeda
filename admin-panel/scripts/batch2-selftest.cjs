// Run directly with node scripts/batch2-selftest.cjs; no live services or writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const tick = () => new Promise(resolve => setImmediate(resolve));
const def = value => ({ __esModule: true, default: value });
const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };

function load(file, mocks, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, console: { error() {} },
    require(name) {
      if (name === 'react/jsx-runtime') return jsx;
      assert.ok(name in mocks, `Missing mock for ${name}`);
      return mocks[name];
    }, ...globals });
  return module.exports;
}

function harness() {
  const slots = []; let cursor = 0, effects = [], updates = 0;
  const equal = (a, b) => a && b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { updates++; slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useMemo(fn, deps) {
      const i = cursor++;
      if (!slots[i] || !equal(slots[i].deps, deps)) slots[i] = { deps, value: fn() };
      return slots[i].value;
    },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!slots[i] || !equal(slots[i].deps, deps)) effects.push(() => {
        slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() };
      });
    },
  };
  return { react, get updates() { return updates; },
    render(fn) { cursor = 0; effects = []; const value = fn(); effects.forEach(fn => fn()); return value; },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}

function setup(name, getter, extra = {}) {
  const h = harness(), reads = [];
  const guard = load('hooks/useRequestGuard.ts', { react: h.react }).default;
  const service = { ...extra, [getter]: () => new Promise((resolve, reject) => reads.push({ resolve, reject })) };
  const serviceName = { Quiz: 'quiz', Analytics: 'analytics', Referrals: 'referral' }[name] ?? name.slice(0, -1).toLowerCase();
  const hook = load(`hooks/use${name}.ts`, { react: h.react, './useRequestGuard': def(guard),
    [`../services/${serviceName}Service`]: service }).default;
  const render = scope => h.render(() => name === 'Referrals' ? hook(scope) : hook({ courseId: scope }));
  return { h, reads, render };
}

function find(node, type) {
  if (Array.isArray(node)) return node.map(child => find(child, type)).find(Boolean);
  if (!node || typeof node !== 'object') return;
  return node.type === type ? node : find(node.props?.children, type);
}

function pageMocks(file, h) {
  const mocks = { react: h.react };
  const source = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
  for (const match of source.matchAll(/import (\w+) from "([^"]+)"/g)) {
    if (match[2].includes('/components/')) mocks[match[2]] = def(match[1]);
  }
  mocks['../hooks/useRequestGuard'] = def(load('hooks/useRequestGuard.ts', { react: h.react }).default);
  return mocks;
}

(async () => {
  for (const [name, getter, rows] of [
    ['Notes', 'getNotes', 'notes'], ['Videos', 'getVideos', 'videos'], ['Quiz', 'getQuizTests', 'tests'],
    ['Products', 'getProducts', 'products'], ['Orders', 'getOrders', 'orders'], ['Users', 'getUsers', 'users'],
  ]) {
    const { h, reads, render } = setup(name, getter);
    assert.equal(render('a').hasLoaded, false);
    reads.shift().resolve([{ id: 'a' }]); await tick();
    let state = render('a'); assert.equal(state.hasLoaded, true);
    let refresh = state.reload(); state = render('a');
    assert.equal(state.loading, true); assert.equal(state.hasLoaded, true); assert.equal(state[rows][0].id, 'a');
    reads.shift().resolve([]); await refresh;
    refresh = render('a').reload(); assert.equal(render('a').hasLoaded, true, `${name}: empty success remains loaded`);
    reads.shift().reject(Error('offline')); await refresh;
    assert.equal(render('a').hasLoaded, true); assert.ok(render('a').error);
    state = render('b');
    assert.equal(state.loading, true); assert.equal(state.hasLoaded, false); assert.equal(state[rows].length, 0); assert.equal(state.error, null);
    reads.shift().reject(Error('new scope failed')); await tick();
    state = render('b'); assert.equal(state.loading, false); assert.equal(state.hasLoaded, false); assert.equal(state[rows].length, 0);
    refresh = state.reload(); reads.shift().resolve([{ id: 'b' }]); await refresh;
    assert.equal(render('b')[rows][0].id, 'b');
    refresh = render('b').reload(); h.unmount(); const updates = h.updates;
    reads.shift().resolve([{ id: 'late' }]); await refresh; assert.equal(h.updates, updates);
    console.log(`PASS ${name}: first/empty load, same-scope refresh, scope error/retry and unmount`);
  }

  for (const [name, getter, actions] of [
    ['Courses', 'getCourses', ['createCourse', 'editCourse', 'removeCourse']],
    ['Years', 'getYears', ['createYear', 'editYear', 'removeYear']],
    ['Subjects', 'getSubjects', ['createSubject', 'editSubject', 'removeSubject']],
    ['Chapters', 'getChapters', ['createChapter', 'editChapter', 'removeChapter']],
    ['Products', 'getProducts', ['createProduct', 'editProduct', 'removeProduct']],
  ]) {
    let writes = 0; const entity = name.slice(0, -1), extra = {};
    for (const verb of ['add', 'update', 'delete']) extra[verb + entity] = async () => { writes++; };
    const { reads, render } = setup(name, getter, extra);
    render('a'); reads.shift().resolve([]); await tick();
    for (const action of actions) {
      const before = writes, save = render('a')[action]('id', {}); await tick();
      reads.shift().reject(Error('follow-up read failed')); await save;
      assert.match(render('a').error, /Saved, but the list could not refresh/); assert.equal(writes, before + 1);
      const retry = render('a').reload(); reads.shift().resolve([]); await retry;
      assert.equal(writes, before + 1, `${name}: retry must not repeat a write`); assert.equal(render('a').error, null);
    }
    console.log(`PASS ${name}: create/edit/delete refresh failures and read-only Retry`);
  }

  for (const [name, getter, field, extra, payload] of [
    ['Courses', 'getCourses', 'courses', {}, [{ id: 'latest' }]],
    ['Analytics', 'getAnalytics', 'data', {}, { id: 'latest' }],
    ['Referrals', 'getReferrals', 'referrals', { getReferralSettings: async () => ({}), getReferralSettingsAudit: async () => [] }, [{ id: 'latest' }]],
  ]) {
    const { h, reads, render } = setup(name, getter, extra);
    render('a'); const latest = render('a').reload();
    reads[0].reject(Error('stale failure')); await tick();
    assert.equal(render('a').loading, true); assert.equal(render('a').error, null);
    reads[1].resolve(payload); await latest;
    assert.equal(JSON.stringify(render('a')[field]), JSON.stringify(payload));
    const late = render('a').reload(); h.unmount(); const updates = h.updates;
    reads[2].resolve(payload); await late; assert.equal(h.updates, updates);
    console.log(`PASS ${name}: overlapping reads, stale error/loading and unmount`);
  }

  {
    const h = harness(), reads = [], mocks = pageMocks('pages/ReviewFlags.tsx', h);
    mocks['../services/reviewFlagService'] = { getReviewFlags: () => new Promise((resolve, reject) => reads.push({ resolve, reject })) };
    const Page = load('pages/ReviewFlags.tsx', mocks).default, render = () => h.render(() => Page());
    find(render(), 'input').props.onChange({ target: { checked: true } }); render();
    reads[0].reject(Error('stale scope')); await tick();
    assert.doesNotMatch(JSON.stringify(render()), /Could not load review flags/);
    reads[1].resolve([{ id: 'latest', reason: 'Latest flag', createdAt: '2026-11-07T00:00:00Z' }]); await tick();
    assert.match(JSON.stringify(render()), /Latest flag/);
    find(render(), 'input').props.onChange({ target: { checked: false } }); render();
    h.unmount(); const updates = h.updates; reads[2].resolve([]); await tick(); assert.equal(h.updates, updates);
    console.log('PASS ReviewFlags: scope race, stale error and unmount');
  }

  {
    const h = harness(), reads = [], mocks = pageMocks('pages/Products.tsx', h); let poll;
    for (const [name, field] of [['Courses', 'courses'], ['Years', 'years'], ['Subjects', 'subjects'], ['Chapters', 'chapters']]) {
      mocks[`../hooks/use${name}`] = def(() => ({ [field]: [], loading: false, error: null }));
    }
    mocks['../hooks/useProducts'] = def(() => ({ products: [], loading: false, hasLoaded: true, error: null }));
    mocks['../services/playBillingSyncService'] = { getBillingStatuses: () => new Promise((resolve, reject) => reads.push({ resolve, reject })) };
    const Page = load('pages/Products.tsx', mocks, { setInterval: fn => { poll = fn; return 1; }, clearInterval() {} }).default;
    const render = () => h.render(() => Page());
    render(); poll(); reads[0].reject(Error('stale poll')); await tick();
    assert.doesNotMatch(JSON.stringify(render()), /Could not load Google Play Billing status/);
    reads[1].resolve({ p: { marker: 'latest' } }); await tick();
    assert.equal(find(render(), 'ProductTable').props.billing.p.marker, 'latest');
    poll(); h.unmount(); const updates = h.updates; reads[2].resolve({}); await tick(); assert.equal(h.updates, updates);
    console.log('PASS Products billing: overlapping polls, stale error and unmount');
  }

  {
    let retries = 0;
    const Status = load('components/LookupStatus.tsx', {}).default;
    const tree = Status({ label: 'years', loading: true, error: 'Read failed', onRetry: async () => { retries++; } });
    assert.equal(find(tree, 'p').props.children.join(''), 'Loading years...');
    assert.match(JSON.stringify(tree), /Read failed/);
    find(tree, 'button').props.onClick(); assert.equal(retries, 1);
    console.log('PASS lookup status: visible loading/error and read Retry');
  }

  for (const [page, entity] of [['Years', 'Year'], ['Subjects', 'Subject'], ['Chapters', 'Chapter'],
    ['Notes', 'Note'], ['Videos', 'Video'], ['Quiz', 'Quiz'], ['Products', 'Product']]) {
    const h = harness(), mocks = pageMocks(`pages/${page}.tsx`, h);
    let lookup = { loading: true, error: null };
    const main = { loading: false, hasLoaded: true, error: null,
      years: [], subjects: [], chapters: [], notes: [], videos: [], tests: [], products: [] };
    for (const [name, field] of [['Courses', 'courses'], ['Years', 'years'], ['Subjects', 'subjects'], ['Chapters', 'chapters']]) {
      mocks[`../hooks/use${name}`] = def(filters => name === page && filters ? main : { [field]: [], ...lookup });
    }
    if (!['Years', 'Subjects', 'Chapters'].includes(page)) mocks[`../hooks/use${page}`] = def(() => main);
    mocks['../services/noteService'] = {};
    mocks['../services/playBillingSyncService'] = { getBillingStatuses: async () => ({}) };
    const Page = load(`pages/${page}.tsx`, mocks, { setInterval: () => 1, clearInterval() {} }).default;
    const render = () => h.render(() => Page());
    for (const state of [{ loading: true, error: null }, { loading: false, error: 'Lookup failed' }]) {
      lookup = state; const tree = render();
      assert.doesNotMatch(JSON.stringify(tree), /Create at least one/);
      assert.equal(find(tree, `${entity}FormModal`).props.lookupsReady, false);
      assert.equal(find(tree, 'LookupStatus').props.error, state.error);
    }
    lookup = { loading: false, error: null };
    assert.equal(find(render(), `${entity}FormModal`).props.lookupsReady, true);
    h.unmount();
    console.log(`PASS ${page}: loading/failed lookups never report missing prerequisites`);
  }

  for (const name of ['Subject', 'Chapter']) {
    const h = harness(); let selectedId = 'selected', items = [];
    const Picker = load(`components/${name}Picker.tsx`, { react: h.react, './CoursePicker': def('CoursePicker') }).default;
    const props = { courses: [{ id: 'old-course' }, { id: 'new-course' }], years: [{ id: 'year', courseId: 'old-course' }],
      subjects: [], chapters: [], onChange: id => { selectedId = id; } };
    const render = () => h.render(() => Picker({ ...props, [name === 'Subject' ? 'subjects' : 'chapters']: items,
      [name === 'Subject' ? 'subjectId' : 'chapterId']: selectedId }));
    render();
    items = [{ id: 'selected', courseId: 'old-course', yearId: 'year', subjectId: 'subject' }];
    render(); let tree = render();
    assert.equal(find(tree, 'CoursePicker').props.value, 'old-course'); assert.equal(find(tree, 'select').props.value, 'year');
    find(tree, 'CoursePicker').props.onChange('new-course'); tree = render();
    assert.equal(find(tree, 'CoursePicker').props.value, 'new-course'); assert.equal(find(tree, 'select').props.value, '');
    items = items.map(item => ({ ...item })); tree = render();
    assert.equal(find(tree, 'CoursePicker').props.value, 'new-course', 'late lookup must not undo intentional reset');
    console.log(`PASS ${name}Picker: late parent synchronization and intentional reset`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

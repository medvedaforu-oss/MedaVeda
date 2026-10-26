const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../node_modules/typescript');
let slots = [], cursor = 0, effects = [];
const react = {
  useState(value) {
    const index = cursor++;
    if (!slots[index]) slots[index] = { value };
    return [slots[index].value, next => { slots[index].value = typeof next === 'function' ? next(slots[index].value) : next; }];
  },
  useEffect(effect, deps) {
    const index = cursor++;
    const old = slots[index];
    if (!old || deps.some((v, i) => !Object.is(v, old.deps[i]))) {
      old?.cleanup?.();
      slots[index] = { deps };
      effects.push(() => { slots[index].cleanup = effect(); });
    }
  },
};
const mocks = { react, '../utils/logger': { logError() {} } };
function load(file, extra = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(__dirname + '/../src/' + file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => ({ ...mocks, ...extra })[name] });
  return exports.default;
}
const hook = load('hooks/useLoadResource.ts');
const render = (fetch, enabled = true) => { cursor = 0; const result = hook(fetch, [], enabled); effects.splice(0).forEach(fn => fn()); return result; };
const tick = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  let shouldFail = true;
  const fetch = async () => { if (shouldFail) throw Error('network'); return []; };
  render(fetch);
  await tick();
  let state = render(fetch);
  assert.equal(state.error, true); assert.equal(state.loading, false);
  shouldFail = false; state.retry(); render(fetch); await tick(); state = render(fetch);
  assert.equal(state.error, false, 'successful retry clears error even for an empty result');
  assert.equal(state.value.length, 0);
  let finishOld, finishNew;
  render(() => new Promise(resolve => { finishOld = resolve; }));
  const newFetch = () => new Promise(resolve => { finishNew = resolve; });
  render(newFetch);
  finishNew(['new']); await tick(); finishOld(['stale']); await tick();
  assert.equal(render(newFetch).value[0], 'new', 'old route request cannot replace new data');
  slots.filter(slot => slot.cleanup).forEach(slot => slot.cleanup());
  slots = []; effects = [];
  let requested = 0;
  render(async () => { requested++; return []; }, false); await tick();
  assert.equal(requested, 0, 'waits for course readiness');
  let online = false;
  const errorView = load('components/LoadError.tsx', {
    '../hooks/useNetworkStatus': { default: () => online, __esModule: true },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { View: 'View', Text: 'Text', TouchableOpacity: 'Button', StyleSheet: { create: v => v } },
    '../theme/colors': { COLORS: {} }, '../theme/spacing': { SPACING: {} },
  });
  let retried = 0;
  const props = { content: 'notes', retry: () => retried++ };
  assert.match(errorView(props).props.children[0].props.children, /offline/);
  online = true;
  const view = errorView(props);
  assert.match(view.props.children[0].props.children, /Could not load notes/);
  view.props.children[1].props.onPress(); assert.equal(retried, 1);
  console.log('PASS load error/empty distinction, retry success, stale response cleanup, course readiness and offline UI');
})().catch(error => { console.error(error); process.exitCode = 1; });

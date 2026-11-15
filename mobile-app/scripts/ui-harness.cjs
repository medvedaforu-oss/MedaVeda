const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function harness() {
  let slots = [], cursor = 0, pending = [];
  const react = {
    useState(value) { const i = cursor++; slots[i] ??= { value }; return [slots[i].value, next => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; }]; },
    useRef(value) { return react.useState({ current: value })[0]; },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useMemo(fn, deps) {
      const i = cursor++, old = slots[i];
      if (!old || !deps || deps.some((v,j) => !Object.is(v,old.deps[j]))) {
        slots[i] = { deps, value: fn() };
      }
      return slots[i].value;
    },
    useEffect(effect, deps) { const i = cursor++; const old = slots[i]; if (!old || !deps || deps.some((v,j) => !Object.is(v,old.deps[j]))) { old?.cleanup?.(); slots[i] = { deps }; pending.push(() => { slots[i].cleanup = effect(); }); } },
  };
  return { react, render(fn) { cursor = 0; const value = fn(); pending.splice(0).forEach(fn => fn()); return value; }, unmount() { slots.forEach(slot => slot.cleanup?.()); } };
}
function load(relative, mocks, globals = {}) {
  const mod = { exports: {} };
  const source = fs.readFileSync(
  path.resolve(__dirname, '../..', relative),
  'utf8'
);
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { exports: mod.exports, module: mod, console, Error, AbortController, AbortSignal, TextEncoder, TextDecoder, setTimeout, clearTimeout, ...globals,
      require: id => { assert.ok(id in mocks, `Unexpected import ${id}`); return mocks[id]; } });
  return mod.exports;
}
const jsx = { jsx: (type,props) => ({type,props}), jsxs: (type,props) => ({type,props}) };
function nodes(tree) { if (!tree || typeof tree !== 'object') return []; return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)]; }
const tick = () => new Promise(resolve => setImmediate(resolve));
module.exports = { harness, load, jsx, nodes, tick };

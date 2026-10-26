const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../node_modules/typescript');
let resolveInitial, listener, removed = 0, fail = false;
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(__dirname + '/../src/features/auth/deepLinkStore.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText, { exports: mod.exports, require: () => ({ Linking: {
  getInitialURL: () => fail ? Promise.reject(Error('native read failed')) : new Promise(resolve => { resolveInitial = resolve; }),
  addEventListener: (_, fn) => { listener = fn; return { remove: () => removed++ }; }
} }) });
const store = mod.exports;
(async () => {
 const cold = 'medveda://reset-password#type=recovery&access_token=cold';
 let pending = store.getInitialDeepLinkUrl(); resolveInitial(cold);
 assert.equal(await pending, cold); assert.equal(store.getLastDeepLinkUrl(), cold);
 const warm = 'medveda://reset-password#type=recovery&access_token=warm';
 const unsubscribe = store.subscribeDeepLinks(url => assert.equal(store.getLastDeepLinkUrl(), url));
 pending = store.getInitialDeepLinkUrl(); listener({ url: warm }); resolveInitial(cold);
 assert.equal(await pending, warm); assert.equal(store.getLastDeepLinkUrl(), warm);
 pending = store.getInitialDeepLinkUrl(); store.clearLastDeepLinkUrl(); resolveInitial(cold);
 assert.equal(await pending, null); assert.equal(store.getLastDeepLinkUrl(), null);
 unsubscribe(); assert.equal(removed, 1);
 fail = true; assert.equal(await store.getInitialDeepLinkUrl(), null);
 console.log('Cold/warm link ordering, delayed initial read, cleanup and rejection passed');
})().catch(e => { console.error(e); process.exitCode = 1; });

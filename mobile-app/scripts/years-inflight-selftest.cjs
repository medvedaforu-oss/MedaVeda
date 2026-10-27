const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../node_modules/typescript');
function load(file, mocks) {
  const mod = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports: mod.exports, module: mod, require: name => { assert.ok(name in mocks, name); return mocks[name]; } });
  return mod.exports;
}
let user = 'a'; const reads = [], cache = new Map();
const localCache = load('utils/localCache.ts', {
  '@react-native-async-storage/async-storage': { getItem: async key => cache.get(key) ?? null, setItem: async (key, value) => cache.set(key, value) },
  './logger': { logDebug() {} },
});
const service = load('services/yearsService.ts', {
  '../utils/localCache': localCache, './authState': { getCurrentUser: () => ({ id: user }) },
  '../repositories/yearsRepository': { getActiveYears: course => new Promise((resolve, reject) => reads.push({ course, user, resolve, reject })) },
});
(async () => {
  const a = service.fetchYears('bams'), b = service.fetchYears('bams');
  assert.equal(reads.length, 1, 'Concurrent Home sections share one live read');
  reads[0].resolve([{ id: 'second', order: 2 }, { id: 'first', order: 1 }]);
  assert.equal((await a)[0].id, 'first'); assert.equal((await b)[0].id, 'first');
  const later = service.fetchYears('bams'); assert.equal(reads.length, 2, 'No freshness TTL/result cache added');
  reads[1].resolve([]); await later;

  const oldAccount = service.fetchYears('bams');
  user = 'b'; const nextAccount = service.fetchYears('bams');
  const nextCourse = service.fetchYears('bhms');
  assert.equal(reads.length, 5, 'Neither account nor course shares pending requests');
  assert.deepEqual(reads.slice(2).map(({ user, course }) => [user, course]), [['a', 'bams'], ['b', 'bams'], ['b', 'bhms']]);
  reads.slice(2).forEach(read => read.resolve([])); await Promise.all([oldAccount, nextAccount, nextCourse]);

  cache.clear(); let fallbacks = 0;
  const failA = service.fetchYears('bams'), failB = service.fetchYears('bams');
  const failure = Error('offline'); reads[5].reject(failure);
  const failed = await Promise.allSettled([failA, failB]); assert.ok(failed.every(result => result.reason === failure));
  cache.set('medveda:cache:years:bams', JSON.stringify([{ id: 'saved' }]));
  const cachedA = service.fetchYears('bams', () => fallbacks++), cachedB = service.fetchYears('bams', () => fallbacks++);
  assert.equal(reads.length, 7, 'Rejected request was removed; retry starts a new read');
  reads[6].reject(failure);
  assert.equal((await cachedA)[0].id, 'saved'); assert.equal((await cachedB)[0].id, 'saved');
  assert.equal(fallbacks, 2, 'Every caller retains its offline/error banner signal');
  console.log('PASS shared pending years read, fresh subsequent reads, account/course separation and independent error/offline fallback');
})().catch(error => { console.error(error); process.exitCode = 1; });

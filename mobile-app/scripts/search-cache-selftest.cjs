const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../node_modules/typescript');
let now = 1_000_000, calls = 0, user = 'student-a', course = 'course-a', onCourseChange;
const cache = new Map();
const rows = Array.from({ length: 550 }, (_, i) => ({ id: String(i).padStart(5, '0'), title: `Anatomy ${i}`, chapterId: String(i).padStart(5, '0'), subjectId: 's', yearId: 'y', yearTitle: 'First', subjectTitle: 'Anatomy', purchasedAt: 1 }));
const read = async () => { calls++; return rows; };
const repo = () => new Proxy({}, { get: () => read });
const mocks = {
  '../utils/localCache': {
    readCache: async key => cache.get(key) ?? null,
    fetchWithCacheFallback: async (key, fn) => { const result = await fn(); cache.set(key, result); return result; },
  },
  './authState': { getCurrentUser: () => ({ id: user }) },
  './courseState': { getCourseYear: () => ({ courseId: course }), onCourseChange: cb => { onCourseChange = cb; } },
  './purchasesService': { fetchMyPurchases: read, isChapterUnlocked: () => false, isProductOwned: () => false },
  './notificationsService': { fetchNotifications: read },
  '../utils/recentActivity': { getRecentChapters: async () => [] },
  '../utils/textMatch': {}, '../types/search': {},
  // Search service uses seven paged catalog sources after the fix. These mocks
  // isolate cache/rebuild counts; real cursor/page behavior is tested separately.
  '../repositories/searchPagination': { readAllSearchPages: fn => fn({ size: 250 }) },
};
const exports_ = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(__dirname + '/../src/services/searchService.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, {
  exports: exports_, Date: class extends Date { static now() { return now; } },
  require: name => name.startsWith('../repositories/') && !(name in mocks) ? repo() : (assert.ok(name in mocks, name), mocks[name]),
});
(async () => {
  const baseline = process.argv.includes('--baseline');
  if (exports_.getCachedSearchIndex) await exports_.getCachedSearchIndex();
  else await exports_.getSearchIndex(); // old hook eagerly called this on open
  const opening = calls;
  const first = await exports_.getSearchIndex();
  const firstSearch = calls;
  now += 3 * 60_000;
  await exports_.getSearchIndex();
  const reopen = calls;
  await exports_.getSearchIndex(true);
  const forced = calls;
  onCourseChange();
  cache.clear();
  const beforeConcurrent = calls;
  await Promise.all([exports_.getSearchIndex(), exports_.getSearchIndex()]);
  const concurrent = calls - beforeConcurrent;
  const result = { openingSourceReads: opening, firstSearchCumulativeReads: firstSearch,
    reopenAfter3MinutesCumulativeReads: reopen, forcedRefreshCumulativeReads: forced,
    concurrentColdSourceReads: concurrent, indexedRows: Object.values(first).filter(Array.isArray).reduce((n, a) => n + a.length, 0),
    indexBytes: Buffer.byteLength(JSON.stringify(first)) };
  console.log(JSON.stringify(result));
  if (!baseline) {
    assert.equal(opening, 0); assert.equal(firstSearch, 9); assert.equal(reopen, 9);
    assert.equal(forced, 18); assert.equal(concurrent, 9);
    user = 'student-b'; await exports_.getSearchIndex(); assert.equal(calls, forced + concurrent + 9);
    course = 'course-b'; onCourseChange(); assert.equal(await exports_.getCachedSearchIndex(), null);
    console.log('PASS lazy cache read, 15-minute reuse, explicit refresh, single-flight and account/course isolation');
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

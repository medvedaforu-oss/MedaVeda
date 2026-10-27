const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../node_modules/typescript');
let user = 'a', preferenceReads = 0;
const reads = [], storage = new Map();
const prefs = { offer: false };
const rows = [{ id: 'offer', title: 'Sale', type: 'offer' }, { id: 'read', title: 'Video', type: 'new_video' }, { id: 'archived', title: 'Reminder' }];
const mocks = {
  '@react-native-async-storage/async-storage': { getItem: async key => storage.get(key) ?? null },
  '../config/supabase': { supabase: { from: () => ({ select: () => ({ eq: () => ({ order: () => new Promise((resolve, reject) => reads.push({ user, resolve, reject })) }) }) }) } },
  './authState': { getCurrentUser: () => ({ id: user }) },
  '../utils/notificationPreferences': { getNotificationPreferences: async () => { preferenceReads++; return prefs; } },
  '../utils/logger': { logDebug() {} },
};
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(__dirname + '/../src/services/notificationsService.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: mod.exports, require: name => { assert.ok(name in mocks, name); return mocks[name]; } });
const service = mod.exports;
(async () => {
  storage.set('medveda:notifications:readIds', JSON.stringify(['read']));
  storage.set('medveda:notifications:archivedIds', JSON.stringify(['archived']));
  const list = service.fetchNotifications(), badgeA = service.getUnreadNotificationCount(), badgeB = service.getUnreadNotificationCount();
  assert.equal(reads.length, 1, 'Home list and unread badges share one outstanding server read');
  reads[0].resolve({ data: rows });
  assert.deepEqual(Array.from(await list, row => row.id), ['read', 'archived']);
  assert.equal(await badgeA, 0); assert.equal(await badgeB, 0);
  assert.equal(preferenceReads, 3, 'Preferences are not cached with the shared raw rows');

  storage.clear(); prefs.offer = true;
  const freshBadge = service.getUnreadNotificationCount();
  assert.equal(reads.length, 2, 'Later request is fresh');
  reads[1].resolve({ data: rows }); assert.equal(await freshBadge, 3, 'Updated preferences/read/archive state applies');

  const old = service.fetchNotifications(); user = 'b'; const next = service.fetchNotifications();
  assert.equal(reads.length, 4); assert.deepEqual(reads.slice(2).map(read => read.user), ['a', 'b']);
  reads[2].resolve({ data: [{ id: 'old' }] }); reads[3].resolve({ data: [{ id: 'new' }] });
  assert.equal((await old)[0].id, 'old'); assert.equal((await next)[0].id, 'new');

  const failedA = service.fetchNotifications(), failedB = service.fetchNotifications();
  assert.equal(reads.length, 5); reads[4].resolve({ error: Error('server error') });
  assert.equal((await failedA).length, 0); assert.equal((await failedB).length, 0);
  const retry = service.fetchNotifications(); assert.equal(reads.length, 6); reads[5].reject(Error('offline'));
  assert.equal((await retry).length, 0, 'Thrown failures retain soft-empty behavior and release pending state');
  const recovered = service.fetchNotifications(); reads[6].resolve({ data: rows }); assert.equal((await recovered).length, 3);
  console.log('PASS concurrent notification reads, fresh subsequent state, account isolation, errors/retry, mute/read/archive semantics');
})().catch(error => { console.error(error); process.exitCode = 1; });

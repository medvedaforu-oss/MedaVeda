const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
const ts = require('../node_modules/typescript');
let now = 1_800_000_000_000;
class TestDate extends Date { static now() { return now; } }
function fixture(os = 'android') {
  const plain = new Map(), secure = new Map();
  let failRead = false, failWrite = false, failDelete = false;
  const mocks = {
    'react-native': { Platform: { OS: os } },
    'js-sha256': { sha256: value => createHash('sha256').update(value).digest('hex') },
    'expo-secure-store': {
      WHEN_UNLOCKED_THIS_DEVICE_ONLY: 7,
      getItemAsync: async key => { if (failRead) throw Error('locked'); return secure.get(key) ?? null; },
      setItemAsync: async (key, value, options) => {
        if (failWrite) throw Error('disk full');
        assert.equal(options.keychainAccessible, 7);
        assert.match(key, /^[a-zA-Z0-9._-]+$/);
        secure.set(key, value);
      },
      deleteItemAsync: async key => { if (failDelete) throw Error('delete failed'); secure.delete(key); },
    },
    '@react-native-async-storage/async-storage': { __esModule: true, default: {
      getItem: async key => plain.get(key) ?? null,
      setItem: async (key, value) => { plain.set(key, value); },
      removeItem: async key => { plain.delete(key); },
      getAllKeys: async () => [...plain.keys()],
    } },
  };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services/offlineNoteVerification.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(code, { module: mod, exports: mod.exports, Date: TestDate, require: id => {
    assert.ok(id in mocks, id); return mocks[id];
  } });
  return { api: mod.exports, plain, secure,
    failRead: value => { failRead = value; }, failWrite: value => { failWrite = value; }, failDelete: value => { failDelete = value; } };
}
const marker = 'medveda:note-verified:buyer:note';
(async () => {
  let f = fixture();
  await f.api.recordNoteVerification('buyer', 'note');
  assert.ok(![...f.plain.values()].some(value => value.includes('checkedAt')), 'License timestamps must never persist in plaintext');
  assert.equal(await f.api.hasRecentNoteVerification('buyer', 'note'), true);
  assert.equal(await f.api.hasRecentNoteVerification('other', 'note'), false);
  f = fixture(); f.plain.set(marker, JSON.stringify({ checkedAt: now, lastSeenAt: now }));
  assert.equal(await f.api.hasRecentNoteVerification('buyer', 'note'), false, 'Legacy plaintext cannot bootstrap trusted grace');
  await f.api.recordNoteVerification('buyer', 'note');
  assert.equal(await f.api.hasRecentNoteVerification('buyer', 'note'), true, 'Online check recovers legacy download');
  f.secure.clear();
  assert.equal(await f.api.hasRecentNoteVerification('buyer', 'note'), false, 'Lost key/value must deny access');
  for (const value of ['{bad json', JSON.stringify({ version: 1, owner: 'other', noteId: 'note', checkedAt: now, lastSeenAt: now })]) {
    f = fixture(); await f.api.recordNoteVerification('buyer', 'note');
    for (const key of f.secure.keys()) f.secure.set(key, value);
    assert.equal(await f.api.hasRecentNoteVerification('buyer', 'note'), false, 'Corrupt or swapped records denied');
  }
  f = fixture(); f.failWrite(true);
  await assert.rejects(f.api.recordNoteVerification('buyer', 'note'), /disk full/);
  assert.equal(await f.api.hasRecentNoteVerification('buyer', 'note'), false);
  assert.ok(![...f.plain.values()].some(value => value.includes('checkedAt')));
  f.failWrite(false); await f.api.recordNoteVerification('buyer', 'note');
  const before = [...f.secure.values()]; f.failRead(true);
  assert.equal(await f.api.hasRecentNoteVerification('buyer', 'note'), false);
  assert.deepEqual([...f.secure.values()], before, 'Transient keystore failure must preserve recoverable license');
  f.failRead(false); assert.equal(await f.api.hasRecentNoteVerification('buyer', 'note'), true);
  f.failWrite(true); now++;
  assert.equal(await f.api.hasRecentNoteVerification('buyer', 'note'), false, 'Failure to persist lastSeenAt denies access');
  f.failWrite(false);
  f.failDelete(true); await assert.rejects(f.api.clearNoteVerification('buyer', 'note'), /delete failed/);
  f.failDelete(false); await f.api.clearNoteVerification('buyer', 'note');
  assert.equal(f.secure.size, 0); assert.equal(f.plain.has(marker), false);
  f = fixture(); now = 1_800_000_000_000; await f.api.recordNoteVerification('buyer', 'note');
  now += 7 * 86400000; assert.equal(await f.api.hasRecentNoteVerification('buyer', 'note'), true);
  now++; assert.equal(await f.api.hasRecentNoteVerification('buyer', 'note'), false);
  now--; assert.equal(await f.api.hasRecentNoteVerification('buyer', 'note'), false, 'Expiry cannot revive after time moves back');
  await f.api.recordNoteVerification('buyer', 'note'); now++;
  assert.equal(await f.api.hasRecentNoteVerification('buyer', 'note'), true); now--;
  assert.equal(await f.api.hasRecentNoteVerification('buyer', 'note'), false);
  now++; assert.equal(await f.api.hasRecentNoteVerification('buyer', 'note'), false, 'Rollback denial persists');
  f = fixture(); now = 1_800_000_000_000; await f.api.recordNoteVerification('buyer', 'note');
  now--; f.failDelete(true);
  assert.equal(await f.api.hasRecentNoteVerification('buyer', 'note'), false);
  now++; f.failDelete(false);
  assert.equal(await f.api.hasRecentNoteVerification('buyer', 'note'), false, 'Failed deletion after rollback must never revive grace');
  await f.api.recordNoteVerification('buyer', 'note');
  now--; f.failDelete(true); await f.api.hasRecentNoteVerification('buyer', 'note'); now++;
  f.failWrite(true);
  await assert.rejects(f.api.recordNoteVerification('buyer', 'note'), /disk full/);
  f.failWrite(false); f.failDelete(false);
  assert.equal(await f.api.hasRecentNoteVerification('buyer', 'note'), false, 'Failed replacement cannot authenticate an older invalidated license');
  f = fixture(); await Promise.all([f.api.recordNoteVerification('buyer', 'note'), f.api.clearNoteVerification('buyer', 'note')]);
  assert.equal(await f.api.hasRecentNoteVerification('buyer', 'note'), false, 'Overlapping cleanup must not revive license');
  await f.api.recordNoteVerification('buyer', 'note'); await f.api.recordNoteVerification('other', 'note');
  f.plain.set('unrelated', 'retain'); f.plain.set('medveda:note-verified:legacy:n', '{legacy}');
  await f.api.clearAllNoteVerifications();
  assert.equal(f.secure.size, 0); assert.deepEqual([...f.plain.entries()], [['unrelated', 'retain']]);
  f = fixture('web'); await f.api.recordNoteVerification('buyer', 'note');
  assert.equal(await f.api.hasRecentNoteVerification('buyer', 'note'), false);
  assert.equal(f.secure.size, 0); assert.equal(f.plain.size, 0);
  console.log('PASS native-only secure license persistence, legacy recheck, owner binding, missing/corrupt records, storage failures, grace/rollback, concurrent and bulk cleanup');
})().catch(error => { console.error(error); process.exitCode = 1; });

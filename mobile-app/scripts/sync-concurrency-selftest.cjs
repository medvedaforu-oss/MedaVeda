const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../node_modules/typescript');
let resolveNetwork, calls = 0, reads = 0, fail = false;
const mocks = {
 '@react-native-community/netinfo': { __esModule: true, default: { fetch: () => { calls++; return fail ? Promise.reject(Error('offline')) : new Promise(r => { resolveNetwork = r; }); } } },
 '../config/database': { OFFLINE_DB_SUPPORTED: true, getDb: () => ({ getAllSync: () => { reads++; return []; } }) },
 '../config/supabase': { supabase: {auth:{getSession:async()=>({data:{session:{user:{id:'student'},access_token:'fixture'}}})}} }, '../utils/logger': { logDebug: () => {} }, '../services/authState': {},
 './authState': { getCurrentUser: () => ({ id: 'student' }),getAuthEpoch:()=>0 }
};
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(__dirname + '/../src/services/syncEngine.ts', 'utf8'), {
 compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText, { exports: mod.exports, require: name => { assert.ok(name in mocks, name); return mocks[name]; } });
(async () => {
 const first = mod.exports.drainQueue(); const second = mod.exports.drainQueue();
 assert.equal(calls, 1); resolveNetwork({ isConnected: true, isInternetReachable: true });
 await Promise.all([first, second]); assert.equal(reads, 1);
 fail = true; await mod.exports.drainQueue(); // rejected connectivity check must not escape
 fail = false; const retry = mod.exports.drainQueue(); resolveNetwork({ isConnected: true, isInternetReachable: true });
 await retry; assert.equal(reads, 2); assert.equal(calls, 3);
 console.log('Concurrent drain is single-flight; connectivity rejection releases guard for retry');
})().catch(e => { console.error(e); process.exitCode = 1; });

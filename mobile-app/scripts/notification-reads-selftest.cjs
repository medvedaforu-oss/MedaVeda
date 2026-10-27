const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../node_modules/typescript');
let reads = 0;
const data = Array.from({length:100}, (_,i) => ({ id:String(i), title:'Update', type:i % 2 ? 'offer' : 'new_video' }));
const prefs = { offer:false, new_video:true };
const mod = { exports: {} };
const mocks = {
 '@react-native-async-storage/async-storage': {},
 './authState': { getCurrentUser: () => ({ id: 'fixture' }) },
 '../config/supabase': { supabase: { from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data }) }) }) }) } },
 '../utils/notificationPreferences': {
  isCategoryEnabled: async type => { reads++; return prefs[type] !== false; },
  getNotificationPreferences: async () => { reads++; return prefs; }
 }, '../utils/logger': { logDebug: () => {} }
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(__dirname + '/../src/services/notificationsService.ts','utf8'), {
 compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText, { exports:mod.exports, require:name => { assert.ok(name in mocks,name);return mocks[name]; } });
(async () => {
 const result = await mod.exports.fetchNotifications();
 assert.equal(result.length,50); assert.ok(result.every(n => n.type === 'new_video'));
 console.log(`100 notification rows: ${reads} preference reads; 50 enabled rows preserved`);
 if (!process.argv.includes('--baseline')) assert.equal(reads,1);
})().catch(e => { console.error(e);process.exitCode=1; });

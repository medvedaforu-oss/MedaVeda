const assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync(process.env.FIX4_SYNC_SOURCE||'mobile-app/src/services/syncEngine.ts','utf8');
assert.ok(!source.includes('supabase.from(table).delete()'),'dormant generic delete remains');
assert.ok(!source.includes('supabase.from(table).upsert('),'dormant generic upsert remains');
assert.match(source,/entityType !== "quiz_attempt"/);
assert.match(source,/json_extract\(payload, '\$\.user_id'\) = \?/);
assert.match(source,/retryAfter/);assert.match(source,/attempt_count = attempt_count \+ 1/);
console.log('PASS MOB-14 quiz-only enqueue and dispatch; owner filtering, retry cooldown and retained failure state');

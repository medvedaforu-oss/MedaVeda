const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const script = path.join(root, 'supabase/scripts/list-scheduling-migrations.sh');
for (const cwd of [root, '/tmp']) {
  const r = spawnSync('bash', [script], { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /20261114050400_fix4_identity_retention_schedule\.sql:\d+:/);
  assert.match(r.stdout, /cron\.schedule/);
  assert.doesNotMatch(r.stdout, /20261114090000/);
}
console.log('PASS scanner finds retention scheduling with filename/line from root and another cwd; wallet migration does not schedule jobs');

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../../mobile-app/node_modules/typescript');
let handler, ipAllowed = true, userAllowed = true, deleted = 0, erased = 0, authCalls = 0;
let userError = null, eraseError = null, deleteError = null;
const limits = [];
const mocks = {
  '../_shared/cors.ts': {
    handleOptions: req => req.method === 'OPTIONS' ? new Response('ok') : null,
    jsonResponse: (body, status = 200) => new Response(JSON.stringify(body), { status }),
  },
  '../_shared/supabaseAdmin.ts': { supabaseAdmin: {
    auth: {
      getUser: async () => { authCalls++; return { data: { user: userError ? null : { id: 'caller' } }, error: userError }; },
      admin: { deleteUser: async id => { assert.equal(id, 'caller'); deleted++; return { error: deleteError }; } },
    },
    rpc: async (name, args) => { assert.equal(name, 'erase_user_data'); assert.equal(args.p_user_id, 'caller'); erased++; return { data: {}, error: eraseError }; },
  } },
  '../_shared/rateLimit.ts': {
    clientIp: () => 'test-ip',
    withinLimit: async (...args) => { limits.push(args); return args[0].includes(':ip:') ? ipAllowed : userAllowed; },
  },
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(__dirname + '/../functions/delete-account/index.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: {}, require: name => { assert.ok(name in mocks, name); return mocks[name]; }, Deno: { serve: fn => { handler = fn; } }, console: { error() {} } });
const call = (method = 'POST', token = true) => handler(new Request('https://example.test/delete-account', {
  method, headers: token ? { Authorization: 'Bearer example' } : {},
  ...(method === 'POST' ? { body: JSON.stringify({ user_id: 'other-account' }) } : {}),
}));
(async () => {
  assert.equal((await call('OPTIONS')).status, 200);
  assert.equal((await call('GET')).status, 405);
  assert.equal((await call('POST', false)).status, 401);
  assert.equal(limits.length, 0);
  ipAllowed = false;
  const blocked = await call();
  assert.equal(blocked.status, 429); assert.equal(blocked.headers.get('Retry-After'), '900');
  assert.equal(authCalls, 0); assert.equal(erased, 0);
  ipAllowed = true; userAllowed = false;
  assert.equal((await call()).status, 429); assert.equal(erased, 0); assert.equal(deleted, 0);
  assert.equal(JSON.stringify(limits.at(-1)), JSON.stringify(['delete-account:user:caller', 3, 900, true]));
  assert.equal(JSON.stringify(limits[0]), JSON.stringify(['delete-account:ip:test-ip', 20, 900, true]));
  userAllowed = true; eraseError = { code: 'mock' };
  assert.equal((await call()).status, 500); assert.equal(deleted, 0);
  eraseError = null; deleteError = { status: 503 };
  assert.equal((await call()).status, 500);
  deleteError = null;
  assert.equal((await call()).status, 200);
  userError = { status: 404 };
  const before = erased;
  assert.equal((await call()).status, 200); assert.equal(erased, before);
  console.log('PASS deletion-only IP/account limits, fail-closed flags, no mutation on denial, caller binding and partial failure retry');
})().catch(error => { console.error(error); process.exitCode = 1; });

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync(__dirname + '/../plugins/withOptionalSentry.cjs', 'utf8');
function run(env) {
  const module = { exports: {} }; let calls = 0;
  vm.runInNewContext(code, { module, process: { env }, require: name => {
    assert.equal(name, '@sentry/react-native/expo');
    return { withSentry: (config, props) => { calls++; return { ...config, options: props }; } };
  } });
  const config = { name: 'MedVeda' };
  return { result: module.exports(config), config, calls };
}
const local = run({});
assert.equal(local.result, local.config); assert.equal(local.calls, 0);
const upload = run({ SENTRY_AUTH_TOKEN: 'PRIVATE_FIXTURE', SENTRY_ORG: 'org', SENTRY_PROJECT: 'project' });
assert.equal(upload.calls, 1); assert.equal(upload.result.options.organization, 'org');
assert.equal(upload.result.options.authToken, undefined);
assert.ok(!JSON.stringify(upload.result).includes('PRIVATE_FIXTURE'));
assert.throws(() => run({ SENTRY_AUTH_TOKEN: 'PRIVATE_FIXTURE' }), /SENTRY_ORG and SENTRY_PROJECT/);
const metro = fs.readFileSync(__dirname + '/../metro.config.js', 'utf8');
assert.ok(metro.includes('getSentryExpoConfig'));
assert.ok(metro.includes('assetExts.push("wasm")'));
console.log('PASS Sentry supported plugin, token-free no-op, upload configuration and secret exclusion');

const assert = require('node:assert/strict');
const { checkStagingBuild } = require('./check-staging-build.cjs');
const { build } = require('../eas.json');
assert.equal(build['internal-testing'].env.MEDVEDA_BUILD_TARGET, 'production');
assert.equal(build['internal-testing'].env.MEDVEDA_PAYMENT_PROVIDER, 'razorpay');
// Retain validation of the explicitly disabled legacy same-project target.
const env = { ...build['internal-testing'].env, MEDVEDA_BUILD_TARGET: 'same-project', MEDVEDA_PAYMENT_PROVIDER: 'disabled' };
assert.equal(env.MEDVEDA_BUILD_TARGET, 'same-project');
assert.doesNotThrow(() => checkStagingBuild(env));
for (const change of [
  { EXPO_PUBLIC_SUPABASE_URL: 'https://other.supabase.co' },
  { EXPO_PUBLIC_SUPABASE_ANON_KEY: '' },
  { MEDVEDA_PAYMENT_PROVIDER: 'razorpay' },
]) assert.throws(() => checkStagingBuild({ ...env, ...change }));
console.log('PASS same-project build and wrong-project/missing-key/wrong-provider rejection');

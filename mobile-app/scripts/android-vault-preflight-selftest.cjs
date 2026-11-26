const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { inspect } = require('./android-vault-preflight.cjs');
const root = path.resolve(__dirname, '..');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-preflight-'));
try {
  const missing = inspect({ env: { ANDROID_HOME: path.join(work, 'missing') } });
  assert.equal(missing.localSdkComplete, false);
  assert.equal(missing.contentEnabled, false);
  assert.equal(missing.nativeAccepted, false);
  assert.equal(missing.signing, 'UNVERIFIED_NO_CREDENTIAL_READ');
  assert.equal(missing.nativeCompilation, 'NOT_PERFORMED_BY_PREFLIGHT');
  const versions = missing.versions;
  for (const file of ['cmdline-tools/latest/bin/sdkmanager', 'platform-tools/adb',
    `platforms/android-${versions.compileSdk}/android.jar`, `build-tools/${versions.buildTools}/aapt2`,
    `ndk/${versions.ndk}/source.properties`, 'cmake/3.22.1/bin/cmake']) {
    const target = path.join(work, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, 'synthetic input');
  }
  const fixture = inspect({ env: { ANDROID_HOME: work } });
  assert.equal(fixture.localSdkComplete, true);
  assert.equal(fixture.nativeCompilation, 'NOT_PERFORMED_BY_PREFLIGHT', 'presence never certifies compilation');
  assert.equal(fixture.deviceAcceptance, 'PENDING');
  assert.throws(() => inspect({ env: { GOOGLE_SERVICES_JSON: path.join(work, 'absent.json') } }));
  assert.throws(() => inspect({ env: { MEDVEDA_PAYMENT_PROVIDER: 'disabled' } }));
  assert.throws(() => inspect({ env: { RAZORPAY_KEY_SECRET: 'synthetic forbidden credential' } }));
  const profile = require('../eas.json').build;
  assert.equal(profile.production.env.MEDVEDA_PAYMENT_PROVIDER, 'razorpay');
  assert.equal(profile['internal-testing'].env.MEDVEDA_PAYMENT_PROVIDER, 'razorpay');
  const bridge = fs.readFileSync(path.join(root, 'modules/medveda-offline-vault/android/src/main/java/expo/modules/medvedaoffline/MedvedaOfflineVaultModule.kt'), 'utf8');
  assert.match(bridge, /"contentEnabled" to false/); assert.match(bridge, /"nativeAccepted" to false/);
  assert.doesNotMatch(bridge, /Function\("(?:receive|view|import|enable|provision)/);
  console.log('PASS preflight separates SDK file presence, native compilation, signing and device acceptance; malformed inputs reject; content and Play guards stay closed');
} finally { fs.rmSync(work, { recursive: true, force: true }); }

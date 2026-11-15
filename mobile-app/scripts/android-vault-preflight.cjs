const fs = require('node:fs');
const path = require('node:path');
const { checkStagingBuild } = require('./check-staging-build.cjs');
const { validateFirebaseConfig } = require('./firebase-config.cjs');

/** Read-only local input inspection. Does not authenticate EAS, read signing secrets,
 * compile native code, install SDKs, upload, or mistake config resolution for acceptance.
 */
function inspect({ env = process.env, root = path.resolve(__dirname, '..') } = {}) {
  const profile = require(path.join(root, 'eas.json')).build['razorpay-live-testing'];
  const values = { ...profile.env, ...env, EAS_BUILD_PROFILE: 'razorpay-live-testing', EAS_BUILD_PLATFORM: 'android' };
  checkStagingBuild(values);
  const versions = fs.readFileSync(path.join(root, 'node_modules/react-native/gradle/libs.versions.toml'), 'utf8');
  const version = name => {
    const match = versions.match(new RegExp(`^${name} = "([^"]+)"`, 'm'));
    if (!match) throw new Error(`Missing installed Android version: ${name}`);
    return match[1];
  };
  const sdk = values.ANDROID_HOME || values.ANDROID_SDK_ROOT || null;
  const required = [
    ['cmdline-tools', 'cmdline-tools/latest/bin/sdkmanager'],
    ['platform-tools', 'platform-tools/adb'],
    [`platforms;android-${version('compileSdk')}`, `platforms/android-${version('compileSdk')}/android.jar`],
    [`build-tools;${version('buildTools')}`, `build-tools/${version('buildTools')}/aapt2`],
    [`ndk;${version('ndkVersion')}`, `ndk/${version('ndkVersion')}/source.properties`],
    ['cmake;3.22.1', 'cmake/3.22.1/bin/cmake'],
  ].map(([name, file]) => ({ name, present: !!sdk && fs.existsSync(path.join(sdk, file)) }));
  const firebaseFile = values.GOOGLE_SERVICES_JSON || path.join(root, 'google-services.json');
  let firebase = 'MISSING';
  if (fs.existsSync(firebaseFile)) {
    validateFirebaseConfig(firebaseFile, 'in.medveda.app');
    firebase = values.GOOGLE_SERVICES_JSON ? 'EXPLICIT_FILE_VALIDATED_LOCALLY' : 'LOCAL_FALLBACK_VALIDATED_CLOUD_DELIVERY_UNVERIFIED';
  } else if (values.GOOGLE_SERVICES_JSON) throw new Error('Explicit GOOGLE_SERVICES_JSON is unreadable.');
  return {
    profile: 'razorpay-live-testing', distribution: profile.distribution, artifact: profile.android.buildType,
    package: 'in.medveda.app', channel: profile.channel, environment: profile.environment,
    paymentProvider: profile.env.MEDVEDA_PAYMENT_PROVIDER,
    sdkRoot: sdk, sdkPackages: required, localSdkComplete: required.every(p => p.present),
    versions: { compileSdk: version('compileSdk'), targetSdk: version('targetSdk'), minSdk: version('minSdk'),
      buildTools: version('buildTools'), ndk: version('ndkVersion'), kotlin: version('kotlin'), agp: version('agp') },
    firebase, cloudEnvironment: 'UNVERIFIED', signing: 'UNVERIFIED_NO_CREDENTIAL_READ',
    nativeCompilation: 'NOT_PERFORMED_BY_PREFLIGHT', deviceAcceptance: 'PENDING',
    contentEnabled: false, nativeAccepted: false,
    command: 'eas build --platform android --profile razorpay-live-testing',
  };
}
module.exports = { inspect };
if (require.main === module) {
  try {
    const result = inspect();
    console.log(JSON.stringify(result, null, 2));
    if (!result.localSdkComplete) process.exitCode = 2;
  } catch { console.error('Android preflight rejected build inputs. Check profile environment, SDK and genuine Firebase input.'); process.exitCode = 1; }
}

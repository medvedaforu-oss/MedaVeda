const { build } = require('../eas.json');

function assertPlayBuild(env) {
  const play = env.MEDVEDA_PAYMENT_PROVIDER === 'play' ||
    env.MEDVEDA_DISTRIBUTION === 'google-play-testing' || env.EAS_BUILD_PROFILE === 'play-billing-testing';
  if (!play) return false;
  const expected = build['play-billing-testing'].env;
  if (Object.entries(expected).some(([key, value]) => env[key] !== value) ||
      (env.EAS_BUILD_PROFILE && env.EAS_BUILD_PROFILE !== 'play-billing-testing') ||
      (env.EAS_BUILD_PLATFORM && env.EAS_BUILD_PLATFORM !== 'android') ||
      env.MEDVEDA_NONPLAY_TEST_ENVIRONMENT ||
      Object.entries(env).some(([key,value]) => value && /^(?:EXPO_PUBLIC_)?(?:RAZORPAY_|SUPABASE_SERVICE_ROLE_KEY$|SUPABASE_SECRET_KEY$|GOOGLE_PLAY_SERVICE_ACCOUNT)/.test(key))) {
    throw new Error('Play Billing is retired in other profiles; standalone Play requires the exact isolated testing configuration and public credentials only.');
  }
  return true;
}
module.exports = { assertPlayBuild };

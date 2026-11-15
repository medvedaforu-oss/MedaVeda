const { build } = require('../eas.json');
function checkStagingBuild(env) {
  const liveTesting = env.MEDVEDA_DISTRIBUTION === 'non-play-live-testing';
  if (env.EAS_BUILD_PROFILE === 'razorpay-live-testing' || liveTesting) {
    if (!liveTesting || env.MEDVEDA_BUILD_TARGET !== 'production' ||
        env.MEDVEDA_PAYMENT_PROVIDER !== 'razorpay' ||
        (env.EAS_BUILD_PROFILE && env.EAS_BUILD_PROFILE !== 'razorpay-live-testing') ||
        (env.EAS_BUILD_PLATFORM && env.EAS_BUILD_PLATFORM !== 'android') ||
        env.EXPO_PUBLIC_SUPABASE_URL !== build.production.env.EXPO_PUBLIC_SUPABASE_URL ||
        env.EXPO_PUBLIC_SUPABASE_ANON_KEY !== build.production.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
        env.MEDVEDA_NONPLAY_TEST_ENVIRONMENT ||
        Object.keys(env).some(name => /^(?:EXPO_PUBLIC_)?(?:NONPLAY_TEST_|RAZORPAY_|SUPABASE_SERVICE_ROLE_KEY$|SUPABASE_SECRET_KEY$)/.test(name) && !!env[name])) {
      throw new Error('Live Razorpay APK requires its exact standalone production configuration and public client key only.');
    }
    return;
  }
  const razorpayTest = env.MEDVEDA_DISTRIBUTION === 'non-play-internal-test';
  const playValidation = env.MEDVEDA_DISTRIBUTION === 'play-alpha-validation';
  if (env.EAS_BUILD_PROFILE === 'razorpay-internal-test' || razorpayTest) {
    if (!razorpayTest || env.MEDVEDA_BUILD_TARGET !== 'production-isolated-test' ||
        env.MEDVEDA_NONPLAY_TEST_ENVIRONMENT !== 'production-isolated-razorpay-test-v1' ||
        env.MEDVEDA_PAYMENT_PROVIDER !== 'razorpay' ||
        (env.EAS_BUILD_PROFILE && env.EAS_BUILD_PROFILE !== 'razorpay-internal-test') ||
        env.EXPO_PUBLIC_SUPABASE_URL !== build.production.env.EXPO_PUBLIC_SUPABASE_URL ||
        env.EXPO_PUBLIC_SUPABASE_ANON_KEY !== build.production.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
        Object.keys(env).some(name => /^(NONPLAY_TEST_|RAZORPAY_|SUPABASE_SERVICE_ROLE_KEY$|SUPABASE_SECRET_KEY$)/.test(name) && !!env[name])) {
      throw new Error('Razorpay test APK requires its exact production-isolated configuration and public client key only.');
    }
    return;
  }
  if (playValidation && (env.MEDVEDA_BUILD_TARGET !== 'staging' ||
      env.MEDVEDA_PAYMENT_PROVIDER !== 'play' || env.MEDVEDA_INDIA_UCB_ENROLLED !== 'true' ||
      (env.EAS_BUILD_PROFILE && env.EAS_BUILD_PROFILE !== 'alpha-payment-validation'))) {
    throw new Error('Alpha payment validation requires confirmed India enrolment and its isolated staging profile.');
  }
  if (env.EAS_BUILD_PROFILE === 'staging-validation' && env.MEDVEDA_BUILD_TARGET !== 'staging') {
    throw new Error('Staging profile requires MEDVEDA_BUILD_TARGET=staging.');
  }
  // Same-project test builds use the owner's existing backend. Building is
  // not authorization to create records, purchase, or deploy remote changes.
  if (env.MEDVEDA_BUILD_TARGET === 'same-project') {
    if (env.EXPO_PUBLIC_SUPABASE_URL !== build.production.env.EXPO_PUBLIC_SUPABASE_URL ||
        !env.EXPO_PUBLIC_SUPABASE_ANON_KEY || env.MEDVEDA_PAYMENT_PROVIDER !== 'disabled') {
      throw new Error('Same-project testing requires the existing MedVeda URL, publishable key and disabled payments.');
    }
    return;
  }
  if (env.MEDVEDA_BUILD_TARGET !== 'staging') return;
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const production = build.production.env;
  if (url !== 'https://nsmsqsogedzohwboripd.supabase.co' ||
      !key || key === 'REPLACE_WITH_STAGING_PUBLISHABLE_KEY' ||
      key === production.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
      !key.startsWith('sb_publishable_') ||
      env.MEDVEDA_PAYMENT_PROVIDER !== (razorpayTest ? 'razorpay' : playValidation ? 'play' : 'disabled') ||
      ['GOOGLE_SERVICES_JSON', 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON',
        'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'PLAY_CATALOG_CRON_SECRET',
        'PLAY_PAYMENT_CRON_SECRET', 'SUPABASE_SERVICE_ROLE_KEY',
        'EXPO_PUBLIC_SENTRY_DSN'].some((name) => !!env[name]) ||
      (env.EAS_BUILD_PROFILE && env.EAS_BUILD_PROFILE !==
        (razorpayTest ? 'razorpay-internal-test' : playValidation ? 'alpha-payment-validation' : 'staging-validation'))) {
    throw new Error(razorpayTest
      ? 'Razorpay test staging requires its exact Supabase URL and a distinct staging publishable key.'
      : 'Staging requires its exact Supabase URL, a distinct publishable key, and disabled payments.');
  }
}
module.exports = { checkStagingBuild };
if (require.main === module) checkStagingBuild(process.env);

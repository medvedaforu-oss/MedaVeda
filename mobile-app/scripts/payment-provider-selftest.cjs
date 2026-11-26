const assert = require("node:assert/strict");
const appConfig = require("../app.config");
const app = require("../app.json").expo;
const eas = require("../eas.json").build;

function configFor(profile, provider, platform) {
  const names = ["EAS_BUILD_PROFILE", "MEDVEDA_PAYMENT_PROVIDER", "MEDVEDA_BUILD_TARGET", "EAS_BUILD_PLATFORM"];
  const previous = new Map(names.map((name) => [name, process.env[name]]));
  for (const name of names) delete process.env[name];
  if (profile) process.env.EAS_BUILD_PROFILE = profile;
  if (provider) process.env.MEDVEDA_PAYMENT_PROVIDER = provider;
  if (platform) process.env.EAS_BUILD_PLATFORM = platform;
  try {
    return appConfig({ config: app });
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

assert.equal(app.android.package, "in.medveda.app");
assert.equal(app.ios.bundleIdentifier, "com.medveda.app");
assert.equal(app.scheme, "medveda");
assert.equal(app.slug, "ayurpulse");
for (const profile of ["production", "internal-testing", "preview"]) {
  assert.equal(configFor(profile).extra.medvedaPaymentProvider, "razorpay");
  assert.equal(configFor(profile).android.runtimeVersion, `${app.version}-razorpay-no-iap-v1`);
  assert.equal(configFor(profile, "disabled").extra.medvedaPaymentProvider, "disabled");
  assert.notEqual(configFor(profile, "disabled").android.runtimeVersion,
    configFor(profile).android.runtimeVersion, "disabled binaries retain a separate OTA runtime");
}
assert.equal(eas.production.env.MEDVEDA_PAYMENT_PROVIDER, "razorpay");
assert.equal(eas["internal-testing"].env.MEDVEDA_PAYMENT_PROVIDER, "razorpay");
assert.throws(() => configFor("preview", "unexpected"), /MEDVEDA_PAYMENT_PROVIDER must be/);
assert.throws(() => configFor("production", "play"), /Play Billing is retired/);
console.log("PASS Razorpay build configuration; explicit disabled mode; retired Play rejected");

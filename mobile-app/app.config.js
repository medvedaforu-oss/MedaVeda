// Wraps app.json and adds two things that need a file only the owner can create. Each turns on
// automatically the moment the file exists; without the file the build is exactly app.json.
//
// 1. Android push (FCM): ./google-services.json, or the EAS file variable GOOGLE_SERVICES_JSON.
//    Firebase Console -> Project settings -> Your apps -> Android `in.medveda.app`.
//    Without it Expo push tokens cannot be issued on Android.
//
// 2. OTA update code signing: ./code-signing/certificate.pem. Once enabled, the installed app
//    only runs an OTA update that is signed with the matching private key, so a compromised
//    Expo account / update channel alone cannot push code to students' phones.
//      npx expo-updates codesigning:generate --key-output-directory code-signing-keys \
//        --certificate-output-directory code-signing --certificate-validity-duration-years 10 \
//        --certificate-common-name "MedVeda"
//      keep code-signing-keys/ OUT of git and out of the repo folder (it is the private key);
//      publish updates with:  eas update --private-key-path <path to private-key.pem>
//    Builds made before the certificate was added do not check signatures, so ship a new
//    store build first; only then does signing protect that build.
const fs = require("fs");
const path = require("path");

module.exports = ({ config }) => {
  const configuredProvider = process.env.MEDVEDA_PAYMENT_PROVIDER || "razorpay";
  if (!["razorpay", "disabled", "play"].includes(configuredProvider)) {
    throw new Error("MEDVEDA_PAYMENT_PROVIDER must be razorpay, disabled or isolated testing play.");
  }
  const playTesting = process.env.MEDVEDA_DISTRIBUTION === "google-play-testing";
  require("./scripts/play-build-config.cjs").assertPlayBuild(process.env);
  const paymentProvider = configuredProvider;
  require("./scripts/check-staging-build.cjs").checkStagingBuild(process.env);
  const razorpayTest = process.env.MEDVEDA_DISTRIBUTION === "non-play-internal-test";
  const razorpayLiveTesting = process.env.MEDVEDA_DISTRIBUTION === "non-play-live-testing";
  const next = { ...config };
  next.extra = { ...next.extra, medvedaPaymentProvider: paymentProvider,
    medvedaDistribution: playTesting ? "google-play-testing" : razorpayLiveTesting ? "non-play-live-testing" : razorpayTest ? "non-play-internal-test" : "standard",
    ...(playTesting ? { medvedaBuildProfile: "play-billing-testing" } : {}),
    ...(razorpayLiveTesting ? { medvedaBuildProfile: "razorpay-live-testing" } : {}),
    ...(razorpayTest ? { medvedaNonplayTestEnvironment: process.env.MEDVEDA_NONPLAY_TEST_ENVIRONMENT,
      medvedaBuildProfile: "razorpay-internal-test" } : {}),
    medvedaBuildTarget: process.env.MEDVEDA_BUILD_TARGET || "production" };
  if (process.env.MEDVEDA_BUILD_TARGET === "staging") {
    next.name = "MedVeda Staging";
    next.scheme = "medveda-staging";
  }
  if (razorpayTest) {
    next.name = "MedVeda Razorpay Test";
    next.scheme = "medveda-razorpay-test";
  }
  next.extra.medvedaRecoveryScheme = next.scheme;
  // Keep the standalone testing IAP runtime separate from existing Razorpay binaries.
  // EAS Update does not supply EAS_BUILD_PROFILE, so the profile check above
  // cannot protect an update published to the wrong channel by itself.
  next.android = {
    ...next.android,
    ...(process.env.MEDVEDA_BUILD_TARGET === "staging" ? { package: "in.medveda.staging" } : {}),
    ...(razorpayTest ? { package: "in.medveda.razorpaytest" } : {}),
    runtimeVersion: playTesting ? `${next.version}-standalone-play-testing-v1` : razorpayLiveTesting ? `${next.version}-razorpay-live-testing-no-iap-v1` : razorpayTest ? `${next.version}-razorpay-internal-test-no-iap-v1` : `${next.version}-${paymentProvider}-no-iap-v1`,
  };
  if (playTesting) next.updates = { ...next.updates, enabled: false };
  if (razorpayLiveTesting) {
    next.updates = { ...next.updates, requestHeaders: {
      ...next.updates?.requestHeaders, "expo-channel-name": "razorpay-live-testing",
    } };
  }

  const local = path.join(__dirname, "google-services.json");
  if (process.env.MEDVEDA_BUILD_TARGET === "staging" && fs.existsSync(local)) {
    throw new Error("Staging build cannot include the local production Google services file.");
  }
  // EAS supplies GOOGLE_SERVICES_JSON as a file path on the builder. Secret file
  // variables are unavailable to local `eas config`, even for the production profile.
  // Omit the field when neither input exists so local config evaluation stays safe.
  // The test file is genuine local input and ignored by git. Cloud builds still
  // require the matching GOOGLE_SERVICES_JSON EAS file variable; never package
  // a production client as the isolated test app.
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON || (razorpayTest ? "./firebase-test/google-services.json" : fs.existsSync(local) ? "./google-services.json" : undefined);
  if (googleServicesFile) {
    require("./scripts/firebase-config.cjs").validateFirebaseConfig(
      path.resolve(__dirname, googleServicesFile), next.android.package
    );
    next.android = { ...next.android, googleServicesFile };
  }

  // Prebuild is the source of the release Gradle configuration (android/ is generated).
  // R8 optimizes/shrinks/obfuscates DEX; resource shrinking removes unused Android resources.
  // Dependency consumer rules protect RN modules, JNI and SDK reflection. Do not keep entire SDKs.
  const android = {
    usesCleartextTraffic: false,
    enableMinifyInReleaseBuilds: true,
    enableShrinkResourcesInReleaseBuilds: true,
    extraProguardRules: fs.readFileSync(path.join(__dirname, "release-rules.pro"), "utf8"),
  };
  next.plugins = [...(next.plugins || []), ...(playTesting ? ["expo-iap"] : []), ["expo-build-properties", { android }], "./plugins/withAndroidRelease.js", "./plugins/withOptionalSentry.cjs"];

  const cert = path.join(__dirname, "code-signing", "certificate.pem");
  if (fs.existsSync(cert)) {
    next.updates = {
      ...next.updates,
      codeSigningCertificate: "./code-signing/certificate.pem",
      codeSigningMetadata: { keyid: "main", alg: "rsa-v1_5-sha256" },
    };
  }
  return next;
};

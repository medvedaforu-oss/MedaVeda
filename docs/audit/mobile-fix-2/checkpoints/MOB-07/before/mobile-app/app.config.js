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
  const configuredProvider = process.env.MEDVEDA_PAYMENT_PROVIDER || "disabled";
  if (!["play", "razorpay", "disabled"].includes(configuredProvider)) {
    throw new Error("MEDVEDA_PAYMENT_PROVIDER must be play, razorpay or disabled.");
  }
  const paymentProvider = configuredProvider;
  // MV007: paid Play distribution remains closed pending owner-specific policy
  // verification. Environment overrides must not activate either provider.
  if (["production", "internal-testing", "shrink-test"].includes(process.env.EAS_BUILD_PROFILE) &&
      paymentProvider !== "disabled") {
    throw new Error("Production Play profiles require disabled payments pending policy verification. Direct Razorpay checkout requires the isolated non-Play test profile.");
  }
  require("./scripts/check-staging-build.cjs").checkStagingBuild(process.env);
  const razorpayTest = process.env.MEDVEDA_DISTRIBUTION === "non-play-internal-test";
  const razorpayLiveTesting = process.env.MEDVEDA_DISTRIBUTION === "non-play-live-testing";
  const playValidation = process.env.MEDVEDA_DISTRIBUTION === "play-alpha-validation";
  if (paymentProvider === "razorpay" &&
      (["production", "internal-testing"].includes(process.env.EAS_BUILD_PROFILE) ||
       (process.env.EAS_BUILD_PLATFORM === "android" && !razorpayTest && !razorpayLiveTesting))) {
    throw new Error("Direct Razorpay checkout requires the isolated non-Play test profile.");
  }
  const next = { ...config };
  next.extra = { ...next.extra, medvedaPaymentProvider: paymentProvider,
    medvedaIndiaUcbEnrolled: process.env.MEDVEDA_INDIA_UCB_ENROLLED === "true",
    medvedaUcbTestAccepted: process.env.MEDVEDA_UCB_TEST_ACCEPTED === "true",
    medvedaDistribution: razorpayLiveTesting ? "non-play-live-testing" : razorpayTest ? "non-play-internal-test" : playValidation ? "play-alpha-validation" : "standard",
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
  // Keep this native build separate from earlier Play Billing and Razorpay runtimes.
  // EAS Update does not supply EAS_BUILD_PROFILE, so the profile check above
  // cannot protect an update published to the wrong channel by itself.
  next.android = {
    ...next.android,
    ...(process.env.MEDVEDA_BUILD_TARGET === "staging" && !playValidation ? { package: "in.medveda.staging" } : {}),
    ...(razorpayTest ? { package: "in.medveda.razorpaytest" } : {}),
    runtimeVersion: razorpayLiveTesting ? `${next.version}-razorpay-live-testing` : razorpayTest ? `${next.version}-razorpay-internal-test` : playValidation ? `${next.version}-play-alpha-validation` : `${next.version}-${paymentProvider}-notes-choice-v1`,
  };
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
  next.plugins = [...(next.plugins || []), ["expo-build-properties", { android }], "./plugins/withAndroidRelease.js", "./plugins/withOptionalSentry.cjs"];
  if (paymentProvider === "play") next.plugins.push("expo-iap");

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

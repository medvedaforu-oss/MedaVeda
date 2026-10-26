// expo-sqlite's web worker imports a .wasm file; Metro must treat it as an
// asset or the web bundle fails to resolve it. No effect on Android/iOS.
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname, {
  includeWebReplay: false,
  enableSourceContextInDevelopment: false,
  injectReleaseForWeb: false,
});
config.resolver.assetExts.push("wasm");

module.exports = config;

const { withAndroidManifest, withAppBuildGradle } = require("expo/config-plugins");

module.exports = function withAndroidRelease(config) {
  config = withAppBuildGradle(config, (next) => {
    // The SDK 57 template uses proguard-android.txt, which disables optimization.
    // Configure the generated release artifact, not an ignored native checkout.
    if (!next.modResults.contents.includes('proguard-android-optimize.txt')) {
      if (!next.modResults.contents.includes('proguard-android.txt')) {
        throw new Error("Review the Android release ProGuard template before building.");
      }
      next.modResults.contents = next.modResults.contents.replaceAll(
        'proguard-android.txt', 'proguard-android-optimize.txt'
      );
    }
    return next;
  });
  return withAndroidManifest(config, (next) => {
    const app = next.modResults.manifest.application?.[0];
    const activity = app?.activity?.find((entry) => entry.$["android:name"] === ".MainActivity");
    if (!activity) throw new Error("Cannot configure Android MainActivity resizing.");
    activity.$["android:resizeableActivity"] = "true";
    return next;
  });
};

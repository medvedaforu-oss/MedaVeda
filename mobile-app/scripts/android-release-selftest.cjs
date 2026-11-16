const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
const base=require('../app.json').expo;const profiles=require('../eas.json');
const configure=require('../app.config.js');
for(const name of ['production','internal-testing','shrink-test']){
 const before={...process.env};Object.assign(process.env,profiles.build[name].env,{EAS_BUILD_PROFILE:name,EAS_BUILD_PLATFORM:'android'});
 const config=configure({config:base});const android=config.plugins.find(p=>Array.isArray(p)&&p[0]==='expo-build-properties')[1].android;
 assert.equal(android.enableMinifyInReleaseBuilds,true);assert.equal(android.enableShrinkResourcesInReleaseBuilds,true);
 assert.ok(!/-dont(?:optimize|obfuscate|shrink)|-keep class (?:io\.sentry|com\.ReactNativeBlobUtil|com\.github\.barteksc)\.\*\*/.test(android.extraProguardRules));
 assert.equal(config.android.package,'in.medveda.app');assert.equal(config.extra.medvedaPaymentProvider,'razorpay');
 assert.ok(profiles.build[name].buildArtifactPaths.some(p=>p.includes('mapping/release')));
 for(const key of Object.keys(process.env)) if(!(key in before))delete process.env[key];Object.assign(process.env,before);
}
assert.equal(base.orientation,'default');assert.equal(base.android.softwareKeyboardLayoutMode,'resize');
assert.equal(base.version,require('../package.json').version);
if(fs.existsSync(path.join(root,'android/app/build.gradle'))){
 const gradle=fs.readFileSync(path.join(root,'android/app/build.gradle'),'utf8');
 const manifest=fs.readFileSync(path.join(root,'android/app/src/main/AndroidManifest.xml'),'utf8');
 assert.match(gradle,/proguard-android-optimize\.txt/);assert.match(gradle,/minifyEnabled enableMinifyInReleaseBuilds/);
 assert.match(manifest,/android:screenOrientation="unspecified"/);assert.match(manifest,/android:resizeableActivity="true"/);
 assert.match(manifest,/android:windowSoftInputMode="adjustResize"/);assert.match(manifest,/orientation\|screenSize\|screenLayout/);
 assert.ok(!manifest.includes('com.android.vending.BILLING'));
}
console.log('PASS release profiles enable R8 + resource shrinking, narrow JNI rules, retained mapping, Razorpay enabled/package retained, adaptive orientation and generated release config');

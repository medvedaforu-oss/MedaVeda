const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {validateFirebaseConfig} = require('./firebase-config.cjs');
const configure = require('../app.config.js'), base = require('../app.json').expo;
const production = require('../eas.json').build.production;
const dir = fs.mkdtempSync(path.join(os.tmpdir(),'medveda-firebase-fixture-'));
const file = path.join(dir,'client.json');
const fixture = {configuration_version:'1',project_info:{project_id:'synthetic-project',project_number:'123456'},client:[{client_info:{mobilesdk_app_id:'1:123456:android:synthetic',android_client_info:{package_name:'in.medveda.app'}},api_key:[{current_key:'synthetic-not-a-key'}]}]};
const before = {...process.env};
try {
 delete process.env.GOOGLE_SERVICES_JSON;
 delete process.env.MEDVEDA_BUILD_TARGET;
 delete process.env.MEDVEDA_DISTRIBUTION;
 Object.assign(process.env,production.env,{EAS_BUILD_PROFILE:'production',EAS_BUILD_PLATFORM:'android'});
 assert.equal(production.environment,'production');
 assert.equal(production.android.buildType,'app-bundle');
 assert.equal(production.autoIncrement,true);
 const withoutSecret = configure({config:structuredClone(base)});
 assert.equal(withoutSecret.android.package,'in.medveda.app');
 assert.equal(withoutSecret.extra.medvedaPaymentProvider,'razorpay');
 // Missing genuine input is an explicit owner blocker, not a made-up replacement.
 if (!fs.existsSync(path.join(__dirname,'../google-services.json'))) assert.equal(configure({config:base}).android.googleServicesFile,undefined);
 process.env.GOOGLE_SERVICES_JSON=file;
 assert.throws(()=>configure({config:base}),/readable Firebase/);
 fs.writeFileSync(file,'not json');assert.throws(()=>configure({config:base}),/readable Firebase/);
 for (const mutate of [c=>c.project_info.project_number='bad',c=>c.client[0].client_info.android_client_info.package_name='in.medveda.other',c=>c.client[0].client_info.mobilesdk_app_id='1:999:android:wrong',c=>c.client[0].api_key=[],c=>c.client.push(c.client[0])]) {
  const c=structuredClone(fixture);mutate(c);fs.writeFileSync(file,JSON.stringify(c));assert.throws(()=>configure({config:base}),/Firebase Android client/);
 }
 fs.writeFileSync(file,JSON.stringify(fixture));
 const withSecret = configure({config:structuredClone(base)});
 assert.equal(withSecret.android.googleServicesFile,file);
 // Supplying the EAS file must change only the Firebase path, including when a
 // local fallback exists. Plugins, security, runtimes and payment flags survive.
 delete withSecret.android.googleServicesFile;
 const expected = structuredClone(withoutSecret);
 delete expected.android.googleServicesFile;
 assert.deepEqual(withSecret,expected);
 assert.equal(validateFirebaseConfig(file,'in.medveda.app').projectId,'synthetic-project');
 console.log('PASS production config with/without secret, EAS file path, unchanged release settings, and invalid Firebase input rejection');
} finally {
 fs.rmSync(dir,{recursive:true});for(const key of Object.keys(process.env))if(!(key in before))delete process.env[key];Object.assign(process.env,before);
}

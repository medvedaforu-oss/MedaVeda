const assert=require('node:assert/strict');
const {load}=require('./load.cjs');
const app=require('../../app.json').expo, config=require('../../app.config'), eas=require('../../eas.json');
const before={...process.env};
try {
 const profile=eas.build['play-billing-testing'];
 assert.ok(profile,'isolated Play testing profile exists');
 Object.assign(process.env,profile.env,{EAS_BUILD_PROFILE:'play-billing-testing',EAS_BUILD_PLATFORM:'android'});
 const c=config({config:app});
 assert.equal(c.android.package,'in.medveda.app');assert.equal(c.extra.medvedaPaymentProvider,'play');
 assert.equal(c.updates.enabled,false);assert.equal(profile.autoIncrement,false);assert.equal(profile.android.buildType,'app-bundle');assert.equal(profile.environment,'preview');assert.equal(profile.android.credentialsSource,'remote');assert.equal(eas.submit['play-billing-testing'],undefined);
 const provider=(patch={},os='android',id='in.medveda.app')=>load('src/config/paymentProvider.ts',{'expo-constants':{expoConfig:{extra:{...c.extra,...patch}}},'react-native':{Platform:{OS:os}},'expo-application':{applicationId:id}});
 // Loader supplies the same public deployment origin as Metro.
 assert.equal(provider().paymentProvider,'play');
 for(const p of [{medvedaDistribution:'standard'},{medvedaBuildProfile:'production'},{medvedaBuildTarget:'production'},{medvedaPaymentProvider:'razorpay'}]) assert.equal(provider(p).paymentProvider,'disabled');
 assert.equal(provider({},'web').paymentProvider,'disabled');assert.equal(provider({},'android','foreign.app').paymentProvider,'disabled');
 for(const name of ['production','internal-testing','razorpay-live-testing','razorpay-internal-test']) {
  process.env={...before,...eas.build[name].env,EAS_BUILD_PROFILE:name};const r=config({config:app});
  assert.equal(r.extra.medvedaPaymentProvider,'razorpay');assert.equal(r.plugins.some(p=>(Array.isArray(p)?p[0]:p)==='expo-iap'),false);
 }
 process.env={...before,MEDVEDA_PAYMENT_PROVIDER:'play',EAS_BUILD_PROFILE:'production'};
 assert.throws(()=>config({config:app}));
 console.log('PASS Play profile, identity, OTA isolation, distribution routing and preserved Razorpay profiles');
} finally {process.env=before}

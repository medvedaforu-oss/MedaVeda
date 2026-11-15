const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const configure=require('../app.config.js'),base=require('../app.json').expo,profile=require('../eas.json').build['razorpay-internal-test'];
const before={...process.env};
try{delete process.env.GOOGLE_SERVICES_JSON;Object.assign(process.env,profile.env,{EAS_BUILD_PROFILE:'razorpay-internal-test',EAS_BUILD_PLATFORM:'android'});
const configured=configure({config:structuredClone(base)});assert.equal(configured.android.package,'in.medveda.razorpaytest');assert.equal(configured.android.googleServicesFile,'./firebase-test/google-services.json');
// Explicit owner input still wins and is validated; no production fallback.
process.env.GOOGLE_SERVICES_JSON=path.join(os.tmpdir(),'missing-medveda-firebase.json');assert.throws(()=>configure({config:structuredClone(base)}),/readable Firebase/);
console.log('PASS AUD-018 isolated profile selects genuine matching test Firebase input; bad explicit input rejects');
}finally{for(const k of Object.keys(process.env))if(!(k in before))delete process.env[k];Object.assign(process.env,before)}

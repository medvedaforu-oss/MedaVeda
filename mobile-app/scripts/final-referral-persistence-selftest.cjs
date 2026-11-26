const assert=require('node:assert/strict');const {load}=require('./ui-harness.cjs');
(async()=>{
 const stored=new Map();let failure;const storage={setItem:async(k,v)=>{if(failure)throw failure;stored.set(k,v)},getItem:async k=>stored.get(k)??null,removeItem:async k=>stored.delete(k)};
 const pending=load('mobile-app/src/utils/pendingReferral.ts',{'@react-native-async-storage/async-storage':{__esModule:true,default:storage},'./logger':{logDebug(){}}});
 await pending.savePendingReferral('ABC234',' A@example.invalid ');assert.deepEqual(JSON.parse(JSON.stringify(await pending.getPendingReferral())),{code:'ABC234',email:'a@example.invalid'});
 for(const message of ['storage rejected','No space left on device']){failure=Error(message);await assert.rejects(pending.savePendingReferral('XYZ789','b@example.invalid'),new RegExp(message))}
 failure=null;let email='other@example.invalid',applied=0;
 const referrals=load('mobile-app/src/services/referralsService.ts',{'./authState':{getCurrentUser:()=>({email})},'../utils/pendingReferral':pending,'../repositories/referralsRepository':{applyReferralCode:async code=>{applied++;assert.equal(code,'ABC234');return {success:true}}},'../utils/logger':{logDebug(){}}});
 assert.equal(await referrals.applyPendingReferralCode(),null);assert.equal(applied,0);assert(await pending.getPendingReferral());
 email='a@example.invalid';await referrals.applyPendingReferralCode();assert.equal(applied,1);assert.equal(await pending.getPendingReferral(),null);await referrals.applyPendingReferralCode();assert.equal(applied,1);
 console.log('PASS referral success, rejected/low storage, matching recovery, foreign-account rejection, no duplicate');
})().catch(e=>{console.error(e);process.exitCode=1});

import assert from 'node:assert/strict';
import { validateReferralSettings } from '../src/utils/referralLimits.ts';
const valid = {friendDiscountPercent:10,friendDiscountMax:null,referrerCreditAmount:50,creditHoldDays:7,walletMaxPercent:50,applyWindowDays:2,maxReferralsPerUser:null,creditExpiryDays:null};
for (const creditExpiryDays of [-1,1.5,NaN,Infinity,36501,2147483647,2147483648]) {
 assert.ok(validateReferralSettings({...valid,creditExpiryDays}).creditExpiryDays, `expiry ${creditExpiryDays} must have a field error`);
}
for (const creditExpiryDays of [null,0,1,30,36500]) {
 assert.equal(validateReferralSettings({...valid,creditExpiryDays}).creditExpiryDays,undefined);
}
console.log('PASS expiry invalid ranges and null/0 no-expiry validation');

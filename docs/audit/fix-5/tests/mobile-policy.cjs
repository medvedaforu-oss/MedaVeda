const fs=require('fs'),assert=require('assert/strict');
const terms=fs.readFileSync('mobile-app/src/screens/referral/ReferralTermsScreen.tsx','utf8');
assert.ok(terms.includes('review or a dispute may delay availability'),'terms must disclose actual hold delay');
assert.ok(terms.includes('Existing credits keep their dates'),'terms must disclose existing dates');
const screen=fs.readFileSync('mobile-app/src/screens/referral/ReferralScreen.tsx','utf8');
assert.ok(!screen.includes('`available after ${settings.creditHoldDays} days`'),'pending earned credits must not use current hold setting');
console.log('PASS mobile hold and legacy policy copy');

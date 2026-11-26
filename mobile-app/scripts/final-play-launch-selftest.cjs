const {test}=require('node:test'),assert=require('node:assert/strict');
const {setup,receipt,attempt,tick}=require('./play-billing-tests/lifecycle.test.cjs');
const definitive=['billing-unavailable','not-prepared','activity-unavailable','empty-sku-list','sku-not-found','sku-offer-mismatch','query-product'];
for(const code of definitive)for(const channel of ['rejection','listener'])test('definitive '+code+' via '+channel+' allows subsequent purchase',async()=>{
 const s=setup();s.nativeRequest=async()=>{const error={code,message:'Synthetic launch failed'};if(channel==='listener')s.errored(error);else throw Object.assign(Error(error.message),error)};
 await s.api.startPlayPurchase(attempt,'offer');await tick();assert.equal(s.stored.size,0,code);assert.equal(s.events.at(-1).type,'error');
 s.nativeRequest=async()=>{};await s.api.startPlayPurchase({...attempt,internalOrderId:'22222222-2222-4222-8222-222222222222'},'offer');assert.equal(s.requests.length,2);
});
test('timeout before native dispatch clears own hint and never emits pending',async()=>{
 const s=setup();let saves=0;s.onSave=async()=>{saves++;s.ports.supabase.auth.getSession=()=>new Promise(()=>{})};
 const work=s.api.startPlayPurchase(attempt,'offer');await tick();assert.equal(saves,1);[...s.timers.values()][0].fn();
 await assert.rejects(work,/timed out/);assert.equal(s.requests.length,0);assert.equal(s.stored.size,0);assert.equal(s.events.length,0);
});
for(const code of ['network','service-timeout','service-disconnected','purchase-failed','billing-error','item-already-owned'])test('ambiguous '+code+' and empty restore retain hint across restart',async()=>{
 const s=setup();s.nativeRequest=async()=>{throw Object.assign(Error('Synthetic'),{code})};await s.api.startPlayPurchase(attempt,'offer');assert.equal(s.stored.size,1);
 s.purchases=[];await s.api.restorePlayPurchases();assert.equal(s.stored.size,1);await assert.rejects(s.api.startPlayPurchase(attempt,'offer'),/Another/);
 const restarted=setup();restarted.stored.set('medveda:play-attempt:owner',s.stored.get('medveda:play-attempt:owner'));await restarted.api.restorePlayPurchases();assert.equal(restarted.stored.size,1);await assert.rejects(restarted.api.createPlayOrder('notes','owner'),/awaiting/);
});
for(const state of ['pending','purchased'])test(state+' receipt outranks later launch error',async()=>{
 const s=setup();let rejectVerify;s.reply=()=>new Promise((_r,j)=>{rejectVerify=j});s.nativeRequest=async()=>{s.updated(receipt(state));await tick();throw Object.assign(Error('Late failure'),{code:'billing-unavailable'})};
 await s.api.startPlayPurchase(attempt,'offer');await tick();assert.equal(s.stored.size,1);if(rejectVerify){rejectVerify(Error('offline'));await tick()}
});
test('foreign receipt does not release or poison owned checkout',async()=>{
 const s=setup();s.nativeRequest=async()=>{s.updated(receipt('purchased',{obfuscatedAccountIdAndroid:'foreign'}));await tick();throw Object.assign(Error('unavailable'),{code:'billing-unavailable'})};
 await s.api.startPlayPurchase(attempt,'offer');await tick();assert.equal(s.stored.size,0);assert.equal(s.calls.length,0);
});
test('receipt arriving during failed-launch hint removal is retained durably',async()=>{
 const s=setup();s.ports.AsyncStorage.removeItem=async key=>{s.updated(receipt('pending'));await tick();s.stored.delete(key)};
 s.nativeRequest=async()=>{throw Object.assign(Error('unavailable'),{code:'billing-unavailable'})};
 await s.api.startPlayPurchase(attempt,'offer');await tick();assert.equal(s.stored.size,1);assert.equal(s.events.at(-1).type,'pending');
});
for(const state of ['pending','purchased'])test('native returned '+state+' receipt also prevents later error cleanup',async()=>{
 const s=setup();s.nativeRequest=async()=>[receipt(state)];await s.api.startPlayPurchase(attempt,'offer');s.errored({code:'billing-unavailable'});await tick();assert.equal(s.stored.size,1);assert.equal(s.events.at(-1).type,'pending');
});

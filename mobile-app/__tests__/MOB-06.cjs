const {assert,load,run,tick,deferred}=require('./audit-harness.cjs');const setup=require('./reset-harness.cjs');
run(async()=>{const s=setup();s.render();await tick();s.link('medveda://reset-password#second');s.render();await tick();assert.ok(s.controllers.some(c=>c.starts.includes('medveda://reset-password#second')),'fresh recovery link starts a new controller on mounted screen');s.h.unmount();
// Replacing a controller while an SDK write is pending must suppress its continuation.
const {createRecoveryFlow}=load('src/features/auth/recoveryFlow.js');
for(const blocked of ['setSession','updateUser']) {
 const gate=deferred();let signouts=0,assuranceCalls=0;
 const auth={setSession:()=>blocked==='setSession'?gate.promise:Promise.resolve({data:{session:{}}}),updateUser:()=>gate.promise,signOut:async()=>{signouts++;return{}},mfa:{getAuthenticatorAssuranceLevel:async()=>{assuranceCalls++;return{data:{currentLevel:'aal1',nextLevel:'aal1'}}}}};
 const old=createRecoveryFlow(auth);let pending;
 if(blocked==='setSession')pending=old.start({accessToken:'old',refreshToken:'old'});else{await old.start({accessToken:'old',refreshToken:'old'});pending=old.updatePassword('NewStrong1!')}
 const rejection=assert.rejects(pending,/expired/);await tick();const assuranceBefore=assuranceCalls;old.dispose();gate.resolve({data:{session:{}}});await rejection;await tick();assert.equal(signouts,0,'disposed '+blocked+' cannot sign out replacement owner');assert.equal(assuranceCalls,assuranceBefore,'disposed '+blocked+' cannot continue auth work');
}
console.log('DEVICE TEST PENDING: native same-route link replacement and MFA');});

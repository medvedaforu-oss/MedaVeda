const assert=require('node:assert/strict');const {load,harness,tick}=require('../../mobile-app/scripts/ui-harness.cjs');
(async()=>{for(const kind of ['success','empty','network','unauthorized']){
 const h=harness();let fail=['network','unauthorized'].includes(kind),calls=0;
 const guard=load('admin-panel/src/hooks/useRequestGuard.ts',{react:h.react}).default;
 const api=load('admin-panel/src/hooks/useReferrals.ts',{react:h.react,'./useRequestGuard':{__esModule:true,default:guard},'../services/referralService':{getReferrals:async()=>[],getReferralSettings:async()=>({enabled:true}),getReferralSettingsAudit:async()=>{calls++;if(fail)throw {status:kind==='unauthorized'?403:503};return kind==='empty'?[]:[{id:'audit',newValues:{enabled:true},oldValues:{enabled:false}}]}}}).default;
 const render=()=>h.render(api);let result=render();assert.equal(result.auditLoading,true);await tick();result=render();assert.equal(result.auditLoading,false);
 if(fail){assert(result.auditError);assert.equal(result.audit.length,0);assert.equal(result.settings.enabled,true);if(kind==='unauthorized')assert.match(result.auditError,/authoriz|access|sign in/i);fail=false;await result.reloadAudit();await tick();result=render();assert.equal(result.auditError,null);assert.equal(result.audit.length,1);assert.equal(calls,2)}
 else{assert.equal(result.auditError,null);assert.equal(result.audit.length,kind==='empty'?0:1)}
 h.unmount();console.log('PASS referral audit '+kind);
}})().catch(e=>{console.error(e);process.exitCode=1});

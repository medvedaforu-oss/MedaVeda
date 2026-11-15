const assert=require('node:assert/strict');
const {harness,load,tick}=require('../../mobile-app/scripts/ui-harness.cjs');
(async()=>{const h=harness();let fail=true,writes=0;
const Hook=load((process.env.AUDIT_BASELINE||'')+'admin-panel/src/hooks/useSettings.ts',{react:h.react,'../services/settingsService':{getSettings:async()=>{if(fail)throw Error('synthetic initial read failure');return {appName:'MedVeda',maintenanceMode:true}},updateSettings:async()=>{writes++}}}).default;
let state=h.render(Hook);await tick();state=h.render(Hook);assert.equal(state.hasLoaded,false);
await assert.rejects(state.saveSettings({appName:'',maintenanceMode:false}),'programmatic save must reject before a trusted baseline');assert.equal(writes,0);
fail=false;await state.reload();state=h.render(Hook);assert.equal(state.hasLoaded,true);assert.equal(state.settings.maintenanceMode,true);
fail=true;await state.reload();state=h.render(Hook);assert.equal(state.settings.maintenanceMode,true);await state.saveSettings(state.settings);assert.equal(writes,1);
console.log('PASS AUD-017 failed initial baseline cannot save, retry loads, failed refresh preserves known baseline');})().catch(e=>{console.error(e);process.exitCode=1});

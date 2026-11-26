const assert=require('node:assert/strict');const{load,harness,tick}=require('./ui-harness.cjs');
(async()=>{
 let account='A',epoch=1,failRead=false,failWrite=false,release;const store=new Map([['medveda:streak',JSON.stringify({currentStreak:99,longestStreak:99,lastActiveDate:'2026-11-24'})]]);
 const auth={getCurrentUser:()=>account?{id:account}:null,getAuthEpoch:()=>epoch,subscribeAuthUser:cb=>{notify=cb;return()=>{}}};let notify=()=>{};
 const storage={getItem:async key=>{if(failRead)throw Error('read failed');return store.get(key)??null},setItem:async(key,val)=>{if(failWrite)throw Error('disk full');if(release)await release;store.set(key,val)}};
 const tracker=load('mobile-app/src/utils/streakTracker.ts',{'@react-native-async-storage/async-storage':{__esModule:true,default:storage},'../services/authState':auth});
 const a=await tracker.recordActivityToday();assert.equal(a.currentStreak,1,'Unowned legacy progress must not be assigned');assert.equal((await tracker.recordActivityToday()).currentStreak,1);
 account='B';epoch++;assert.equal((await tracker.getStreak()).currentStreak,0,'B must not read A streak');await tracker.recordActivityToday();account='A';epoch++;assert.equal((await tracker.getStreak()).currentStreak,1);
 const h=harness();const hook=load('mobile-app/src/hooks/useStreak.ts',{react:h.react,'../utils/streakTracker':tracker,'../services/authState':auth}).default;const render=()=>h.render(hook);
 account='C';epoch++;failWrite=true;let rejections=[];const listener=e=>rejections.push(e);process.on('unhandledRejection',listener);render();await tick();await tick();let value=render();assert.equal(value.loading,false);assert.equal(value.currentStreak,0);assert(value.error);assert.equal(rejections.length,0);
 failWrite=false;account='B';epoch++;notify();render();await tick();value=render();assert.equal(value.currentStreak,1);assert.equal(value.error,null);
 failRead=true;account='D';epoch++;notify();render();await tick();await tick();value=render();assert(value.error);assert.equal(value.currentStreak,0);failRead=false;
 // A late write is permanently bound to its captured account key.
 let done;release=new Promise(r=>done=r);account='E';epoch++;const pending=tracker.recordActivityToday();await tick();account='F';epoch++;done();release=null;await pending;assert.equal((await tracker.getStreak()).currentStreak,0);
 h.unmount();process.off('unhandledRejection',listener);console.log('PASS streak account keys, unowned legacy quarantine, repeat activity, failed reads/writes and stale publication');
})().catch(e=>{console.error(e);process.exitCode=1});

const assert=require('node:assert/strict');const {load,tick}=require('../../../../mobile-app/scripts/ui-harness.cjs');
let calls=0,transfers=0,verified=0,rows=[];
const secure=load('mobile-app/src/services/secureNotesService.ts',{'../config/supabase':{supabase:{functions:{invoke:async()=>{calls++;return{data:{url:'https://synthetic.invalid/pdf'},error:null}}}}},'../config/paymentProvider':{isNonplayTestBuild:false}});
(async()=>{
 await assert.rejects(()=>secure.getSecureNoteUrl('paid','offline'),e=>e.status===409);
 assert.equal(calls,0);assert.equal(await secure.getSecureNoteUrl('paid'),'https://synthetic.invalid/pdf');assert.equal(calls,1);
 const fs={documentDirectory:'file:///docs/',deleteAsync:async()=>{},DownloadResumable:class{constructor(){transfers++;}downloadAsync(){return Promise.resolve({})}}};
 const row={id:'paid',content_type:'note',status:'paused',source_url:'https://old',local_uri:null};
 const manager=load('mobile-app/src/utils/downloadManager.ts',{'../services/courseState':{getCourseYear:()=>({})},'expo-file-system/legacy':fs,'@react-native-async-storage/async-storage':{__esModule:true,default:{getItem:async()=>null,removeItem:async()=>{}}},'../config/database':{OFFLINE_DB_SUPPORTED:true,getDb:()=>({getFirstSync:()=>row,runSync:(sql,args)=>rows.push([sql,args])})},'../services/secureNotesService':secure,'../services/authState':{getCurrentUser:()=>({id:'A'}),getAuthEpoch:()=>1,waitForOfflineStorage:async()=>true},'../services/offlineNoteVerification':{recordNoteVerification:async()=>verified++}});
 await manager.enqueueDownload({id:'paid',contentType:'note'});
 await assert.rejects(()=>manager.resumeDownload('paid'),e=>e.status===409);
 await assert.rejects(()=>manager.retryDownload('paid'),e=>e.status===409);
 assert.equal(transfers,0);assert.equal(verified,0);assert.equal(calls,1);
 assert.ok(!rows.some(([s,a])=>a.includes('completed')));
 console.log('PASS offline note URL acquisition, new transfer, paused/retry denied before PDF writes; online entitlement helper retained');
})().catch(e=>{console.error(e);process.exitCode=1});

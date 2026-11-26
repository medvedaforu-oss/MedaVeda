const assert=require('node:assert/strict');const {load,tick}=require('./ui-harness.cjs');
class NoteAccessError extends Error{constructor(status){super('access');this.status=status}}
class NoteOfflineError extends Error{}
(async()=>{for(const kind of ['signed-url','cached-grace']){
 const stored=new Map([['medveda:offline-owner','A']]);let policy='free',release,records=0;
 const api=load('mobile-app/src/services/offlineNoteAccess.ts',{
 '@react-native-async-storage/async-storage':{__esModule:true,default:{getItem:async k=>stored.get(k)??null,setItem:async(k,v)=>stored.set(k,v),removeItem:async k=>stored.delete(k)}},
 './authState':{getCurrentUser:()=>({id:'A'}),getAuthEpoch:()=>1},'../utils/downloadManager':{getDownload:()=>({isFreePreview:true})},
 '../config/supabase':{supabase:{from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>policy==='outage'?{data:null,error:{},status:503}:{data:{is_free_preview:policy==='free'},error:null,status:200}})}},
 './secureNotesService':{NoteAccessError,NoteOfflineError,getSecureNoteUrl:async()=>{if(kind==='cached-grace')throw Error('offline');await new Promise(r=>release=r);return 'signed'}},
 './offlineNoteVerification':{recordNoteVerification:async()=>{records++},clearNoteVerification:async()=>{},hasRecentNoteVerification:async()=>{if(kind==='cached-grace')return new Promise(r=>release=r);return true}},
 });
 const older=api.mayOpenOfflineNote('note');await tick();policy='paid';assert.equal(await api.mayOpenOfflineNote('note'),false);release(true);assert.equal(await older,false,'older '+kind+' must not undo newer paid denial');assert.equal(records,0);assert.equal(stored.get('medveda:note-denied:A:note'),'1');policy='outage';assert.equal(await api.mayOpenOfflineNote('note'),false);console.log('PASS newer denial defeats overlapping '+kind+' completion');
}})().catch(e=>{console.error(e);process.exitCode=1});
(async()=>{
 const stored=new Map([['medveda:offline-owner','A']]);let calls=0,release;
 const api=load('mobile-app/src/services/offlineNoteAccess.ts',{
 '@react-native-async-storage/async-storage':{__esModule:true,default:{getItem:async k=>stored.get(k)??null,setItem:async(k,v)=>stored.set(k,v),removeItem:async k=>stored.delete(k)}},
 './authState':{getCurrentUser:()=>({id:'A'}),getAuthEpoch:()=>1},'../utils/downloadManager':{getDownload:()=>({isFreePreview:true})},
 '../config/supabase':{supabase:{from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>{if(++calls===1)return new Promise(r=>release=r);return {data:null,error:{},status:503}}})}},
 './secureNotesService':{NoteAccessError,NoteOfflineError,getSecureNoteUrl:async()=> 'signed'},
 './offlineNoteVerification':{recordNoteVerification:async()=>{},clearNoteVerification:async()=>{},hasRecentNoteVerification:async()=>true},
 });
 const older=api.mayOpenOfflineNote('reverse');await tick();assert.equal(await api.mayOpenOfflineNote('reverse'),true);release({data:{is_free_preview:false},error:null,status:200});assert.equal(await older,false);assert.equal(stored.get('medveda:note-denied:A:reverse'),'1','newer outage cannot refute older authoritative denial');assert.equal(await api.mayOpenOfflineNote('reverse'),false);console.log('PASS later outage cannot suppress an in-flight authoritative denial');
})().catch(e=>{console.error(e);process.exitCode=1});

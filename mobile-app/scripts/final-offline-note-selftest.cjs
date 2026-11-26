const assert=require('node:assert/strict');
const {load}=require('./ui-harness.cjs');
class NoteAccessError extends Error {constructor(status){super('access');this.status=status}}
class NoteOfflineError extends Error {status=409}
async function scenario(kind){
 let owner='A',epoch=0,recent=true,cancelled=0,verified=0,cleared=0,calls=0;
 const stored=new Map([['medveda:offline-owner','A']]);
 const storage={getItem:async k=>stored.get(k)??null,setItem:async(k,v)=>stored.set(k,v),removeItem:async k=>stored.delete(k)};
 const response=kind==='paid'?{data:{is_free_preview:false},error:null,status:200}:kind==='missing'?{data:null,error:null,status:200}:kind.startsWith('meta-')?{data:null,error:{message:'lookup failed'},status:Number(kind.slice(5))}:{data:{is_free_preview:true},error:null,status:200};
 const query={select(){return this},eq(){return this},maybeSingle:async()=>response};
 const secure={NoteAccessError,NoteOfflineError,getSecureNoteUrl:async()=>{calls++;if(kind==='policy')throw new NoteOfflineError();if(kind==='roundtrip'){epoch+=2;throw Error('offline')}if(kind==='switch'){owner='B';epoch++;throw Error('offline')}if(kind==='network'||kind==='expired')throw Error('offline');if(/^\d/.test(kind))throw new NoteAccessError(Number(kind));return 'https://fixture.invalid'}};
 const api=load('mobile-app/src/services/offlineNoteAccess.ts',{'@react-native-async-storage/async-storage':{__esModule:true,default:storage},'./authState':{getCurrentUser:()=>owner?{id:owner}:null,getAuthEpoch:()=>epoch},'./secureNotesService':secure,'../config/supabase':{supabase:{from:()=>query}},'../utils/downloadManager':{getDownload:()=>({isFreePreview:kind!=='purchased'}),cancelDownload:async()=>{cancelled++}},'./offlineNoteVerification':{recordNoteVerification:async()=>{verified++},clearNoteVerification:async()=>{cleared++;recent=false},hasRecentNoteVerification:async()=>kind==='expired'?false:recent}});
 const result=await api.mayOpenOfflineNote('note');
 const allowed=['free','network','429','500','503','meta-429','meta-503'].includes(kind);
 assert.equal(result,allowed,kind);assert.equal(cancelled,0,'Authorization must not delete downloaded files');
 if(['paid','missing','policy','401','403','404','410','meta-401','meta-403'].includes(kind)){
  assert.equal(stored.get('medveda:note-denied:A:note'),'1',kind+' must persist denial');assert.equal(cleared,1);
  response.data=null;response.error={message:'offline'};response.status=503;secure.getSecureNoteUrl=async()=>{throw Error('offline')};
  assert.equal(await api.mayOpenOfflineNote('note'),false,'later outage cannot restore denied preview');
 }
 if(kind==='free')assert.equal(verified,1);
 if(kind==='purchased')assert.equal(calls,0,'paid offline stays unavailable; online paid service unchanged');
 console.log('PASS offline '+kind);
}
(async()=>{for(const kind of ['free','paid','policy','401','403','404','410','missing','network','429','500','503','meta-401','meta-403','meta-429','meta-503','expired','switch','roundtrip','purchased'])await scenario(kind)})().catch(e=>{console.error(e);process.exitCode=1});

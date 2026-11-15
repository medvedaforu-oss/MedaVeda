const assert=require('node:assert/strict');const {load}=require('../../../../mobile-app/scripts/ui-harness.cjs');
class OfflineError extends Error{status=409}
let owner='A',epoch=1,free=new Set(['free']),calls=0,writes=0,failDelete=false,switchDelete=false;
let rows=[],storage=new Map([['medveda:offline-owner','A']]),files=new Set();
const root='file:///docs/medveda/notes/';
const db={getAllSync:()=>rows,getFirstSync:(_,a)=>rows.find(r=>r.id===a[0])??null,runSync(sql,a){
 if(sql.startsWith('DELETE'))rows=rows.filter(r=>r.id!==a[0]);
 else if(sql.includes('is_free_preview =')){const r=rows.find(r=>r.id===(a.length===1?a[0]:a[1]));if(r)r.is_free_preview=a.length===1?1:a[0]}
 else if(sql.startsWith('UPDATE downloads SET')){const r=rows.find(r=>r.id===a.at(-1));if(r)Object.assign(r,{local_uri:a[0],status:a[3],error_message:a[5]})}
 else if(sql.startsWith('INSERT'))rows.push({id:a[0],content_type:a[1],status:a[13],source_url:a[9]});
 }};
const fs={documentDirectory:'file:///docs/',EncodingType:{Base64:'base64'},getInfoAsync:async uri=>({exists:uri===root||files.has(uri),size:20}),makeDirectoryAsync:async()=>{},readDirectoryAsync:async()=>[...files].filter(f=>f.startsWith(root)).map(f=>f.slice(root.length)),deleteAsync:async uri=>{assert.ok(uri.startsWith(root));if(failDelete)throw Error('disk busy');files.delete(uri);if(switchDelete){owner='B';epoch++;switchDelete=false}},readAsStringAsync:async()=> 'JVBERi0=',DownloadResumable:class{constructor(url,uri){calls++;this.uri=uri}async downloadAsync(){writes++;files.add(this.uri);return{status:200,uri:this.uri,headers:{}}}async resumeAsync(){return this.downloadAsync()}async cancelAsync(){}async pauseAsync(){return{fileUri:this.uri}}}};
const store={getItem:async k=>storage.get(k)??null,setItem:async(k,v)=>storage.set(k,v),removeItem:async k=>storage.delete(k)};
const manager=load('mobile-app/src/utils/downloadManager.ts',{'../services/courseState':{getCourseYear:()=>({})},'expo-file-system/legacy':fs,'@react-native-async-storage/async-storage':{__esModule:true,default:store},'../config/database':{OFFLINE_DB_SUPPORTED:true,getDb:()=>db},'../services/secureNotesService':{NoteOfflineError:OfflineError,NoteAccessError:class extends Error{},PAID_NOTES_OFFLINE_ALLOWED:false,isFreePreviewNote:async id=>free.has(id),getSecureNoteUrl:async(id,purpose,preview)=>{assert.equal(purpose,'offline');assert.ok(preview&&free.has(id));return'https://synthetic.invalid'}},'../services/authState':{getCurrentUser:()=>({id:owner}),getAuthEpoch:()=>epoch,waitForOfflineStorage:async()=>true},'../services/offlineNoteVerification':{recordNoteVerification:async()=>{},clearNoteVerification:async()=>{},clearAllNoteVerifications:async()=>{}}});
const row=(id,extra={})=>({id,content_type:'note',status:'paused',source_url:'https://old',...extra});
(async()=>{
 rows=[row('paid')];storage.set('medveda:resume:paid',JSON.stringify({fileUri:root+'paid.pdf'}));files.add(root+'paid.pdf');
 await manager.enqueueDownload({id:'paid',contentType:'note'});assert.equal(calls,0);assert.equal(writes,0);assert.equal(files.size,0);assert.ok(!storage.has('medveda:resume:paid'));
 await assert.rejects(()=>manager.resumeDownload('paid'),OfflineError);await assert.rejects(()=>manager.retryDownload('paid'),OfflineError);
 await manager.pauseDownload('paid');await manager.cancelDownload('paid');assert.equal(calls,0);
 await manager.enqueueDownload({id:'free',contentType:'note',isFreePreview:true});assert.equal(writes,1);
 await manager.pauseDownload('free');await manager.resumeDownload('free');assert.equal(writes,2);await manager.cancelDownload('free');
 await assert.rejects(()=>manager.enqueueDownload({id:'../escape',contentType:'note'}),/identifier/);
 rows=[row('paid',{status:'completed',local_uri:root+'paid.pdf'}),row('free',{local_uri:root+'free.pdf'})];files=new Set([root+'paid.pdf',root+'free.pdf']);failDelete=true;
 await manager.cleanupPaidNoteDownloads('A',1);assert.ok(files.has(root+'paid.pdf'));assert.ok(rows.some(r=>r.id==='paid'));
 failDelete=false;await manager.cleanupPaidNoteDownloads('A',1);await manager.cleanupPaidNoteDownloads('A',1);
 assert.ok(!files.has(root+'paid.pdf'));assert.ok(files.has(root+'free.pdf'));assert.deepEqual(rows.map(r=>r.id),['free']);assert.equal(manager.getAllDownloads().length,1);
 rows=[row('free',{local_uri:root+'free.pdf',is_free_preview:0})];files=new Set([root+'free.pdf']);await assert.rejects(()=>manager.resumeDownload('free'),OfflineError);assert.ok(files.has(root+'free.pdf'),'unknown legacy preview flag must not cause free file deletion');
 rows=[row('free',{local_uri:root+'free-1.pdf'})];files=new Set([root+'free-1.pdf']);await manager.cleanupPaidNoteDownloads('A',1);assert.ok(files.has(root+'free-1.pdf'),'row-bound free file must not be reclassified as another paid note during directory scan');
 rows=[row('paid',{local_uri:root+'free.pdf'})];files=new Set([root+'free.pdf']);await manager.cleanupPaidNoteDownloads('A',1);assert.ok(files.has(root+'free.pdf'),'corrupt paid pointer must preserve free note');assert.equal(rows.length,1);
 rows=[row('paid',{local_uri:'file:///docs/medveda/notes/../outside.pdf'})];await manager.cleanupPaidNoteDownloads('A',1);assert.equal(rows.length,1);
 rows=[row('paid',{local_uri:root+'paid.pdf'}),row('other',{local_uri:root+'other.pdf'})];files=new Set([root+'paid.pdf',root+'other.pdf']);switchDelete=true;
 await manager.cleanupPaidNoteDownloads('A',1);assert.equal(owner,'B');assert.ok(files.has(root+'other.pdf'));assert.equal(rows.length,2);
 console.log('PASS paid start/resume/retry/pause/cancel; free start/resume/cancel; legacy cleanup twice; deletion retry; traversal rejection; account-switch fencing');
})().catch(e=>{console.error(e);process.exitCode=1});

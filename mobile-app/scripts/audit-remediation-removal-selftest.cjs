'use strict';
// Audit-only reproduction harness. Loads repository source into isolated VM mocks.
// No network, native process, app files, repository writes, or payment calls.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createHash}=require('node:crypto');
const ROOT='/home/ganeshp8545/AyurPulse';
const {harness,load,tick}=require(ROOT+'/mobile-app/scripts/ui-harness.cjs');
const storagePort=map=>({__esModule:true,default:{getItem:async key=>map.get(key)??null,setItem:async(key,value)=>{map.set(key,value)},removeItem:async key=>{map.delete(key)},getAllKeys:async()=>[...map.keys()],multiRemove:async keys=>{for(const key of keys)map.delete(key)}}});
async function removeRace() {
 const {DatabaseSync}=require('node:sqlite');const sql=new DatabaseSync(':memory:');
 const source=fs.readFileSync(ROOT+'/mobile-app/src/config/database.ts','utf8');
 sql.exec(source.match(/CREATE TABLE IF NOT EXISTS downloads \([\s\S]*?\n    \);/)[0]);
 sql.exec("ALTER TABLE downloads ADD COLUMN is_free_preview INTEGER NOT NULL DEFAULT 0;ALTER TABLE downloads ADD COLUMN course_id TEXT DEFAULT '';");
 const db={runSync:(q,args=[])=>sql.prepare(q).run(...args),getFirstSync:(q,args=[])=>sql.prepare(q).get(...args),getAllSync:(q,args=[])=>sql.prepare(q).all(...args)};
 let user={id:'A'},epoch=1,releaseDelete,enteredDelete;const entered=new Promise(resolve=>enteredDelete=resolve);const delayed=new Promise(resolve=>releaseDelete=resolve);
 const storage=new Map(),files=new Map(),old='file:///documents/medveda/quizzes/same-quiz-old.json';files.set(old,'old');
 const manager=load('mobile-app/src/utils/downloadManager.ts',{
  '../services/courseState':{getCourseYear:()=>({courseId:'bams'})},'@react-native-async-storage/async-storage':storagePort(storage),
  '../config/database':{getDb:()=>db,OFFLINE_DB_SUPPORTED:true},
  '../services/secureNotesService':{NoteOfflineError:class extends Error{},NoteAccessError:class extends Error{},PAID_NOTES_OFFLINE_ALLOWED:false},
  '../services/authState':{getCurrentUser:()=>user,getAuthEpoch:()=>epoch,waitForOfflineStorage:async()=>true},
  '../services/offlineNoteVerification':{clearNoteVerification:async()=>{},clearAllNoteVerifications:async()=>{},recordNoteVerification:async()=>{}},
  'expo-file-system/legacy':{documentDirectory:'file:///documents/',getInfoAsync:async uri=>({exists:files.has(uri),size:10}),makeDirectoryAsync:async()=>{},
   writeAsStringAsync:async(uri,data)=>files.set(uri,data),deleteAsync:async uri=>{if(uri===old){enteredDelete();await delayed}for(const key of [...files.keys()])if(key.startsWith(uri))files.delete(key)}},
 });
 sql.prepare("INSERT INTO downloads(id,content_type,title,chapter_id,chapter_title,subject_id,subject_title,year_id,year_title,source_url,local_uri,status,updated_at,course_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run('same-quiz','quiz','A quiz','','','subject','subject','year','year','',old,'completed',1,'bams');
 const removal=manager.removeDownload('same-quiz');await entered;
 user=null;epoch++;let cleared=false;const clearing=manager.clearAllDownloads().then(()=>{cleared=true});await tick();assert.equal(cleared,false,'Clear must wait for the old removal');releaseDelete();await removal;await clearing;user={id:'B'};epoch++;
 await manager.saveQuizForOffline({id:'same-quiz',title:'B quiz',subjectId:'subject',subjectTitle:'subject',yearId:'year',yearTitle:'year',quizData:{id:'same-quiz',questions:[]}});
 const before=manager.getDownload('same-quiz');assert(before);assert.equal(before.title,'B quiz');
 const after=manager.getDownload('same-quiz');assert.equal(after.title,'B quiz');await manager.removeDownload('same-quiz');assert.equal(manager.getDownload('same-quiz'),null);await manager.removeDownload('same-quiz');
 const result={beforeOldRemovalCompleted:before.title,afterOldRemovalCompleted:after,remainingQuizFiles:[...files.keys()].filter(uri=>uri.endsWith('.json')).length};sql.close();return result;
}
removeRace().then(()=>console.log('PASS tracked removal, clear/account ordering and repeated deletion')).catch(e=>{console.error(e);process.exitCode=1});

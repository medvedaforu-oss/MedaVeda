const assert=require('node:assert/strict');const fs=require('node:fs');
const {load,tick}=require('./ui-harness.cjs');
let user='A',epoch=0,delayRead;const storage=new Map();
const auth={getCurrentUser:()=>user?{id:user}:null,getAuthEpoch:()=>epoch};
const asyncStorage={getItem:async key=>{const raw=storage.get(key)??null;if(delayRead){const delay=delayRead;delayRead=null;await delay;}return raw;},
 setItem:async(key,value)=>{storage.set(key,value);},removeItem:async key=>{storage.delete(key);}};
const logger={logDebug(){}};
const helper=fs.existsSync(__dirname+'/../src/utils/ownerStorage.ts')?load('mobile-app/src/utils/ownerStorage.ts',{
 '@react-native-async-storage/async-storage':asyncStorage,'../services/authState':auth}):{};
const common={'@react-native-async-storage/async-storage':asyncStorage,'./logger':logger,'../services/authState':auth,'./ownerStorage':helper};
const searches=load('mobile-app/src/utils/recentSearches.ts',common),activity=load('mobile-app/src/utils/recentActivity.ts',common);
const notification=load('mobile-app/src/services/notificationsService.ts',{
 '@react-native-async-storage/async-storage':asyncStorage,'./authState':auth,'../utils/ownerStorage':helper,
 '../utils/logger':logger,'../utils/notificationPreferences':{getNotificationPreferences:async()=>({})},
 '../config/supabase':{supabase:{from:()=>({select:()=>({eq:()=>({order:async()=>({data:[{id:'one'},{id:'two'}]})})})})}}
});
function switchTo(id){user=id;epoch++;}
const chapter={chapterId:'a',chapterTitle:'Anatomy',subjectId:'s',subjectTitle:'Subject',yearId:'y',yearTitle:'Year',courseId:'course-a'};
(async()=>{
 storage.set('medveda:recentSearches',JSON.stringify([{query:'legacy private',searchedAt:1}]));
 storage.set('medveda:recentChapters',JSON.stringify([chapter]));
 assert.equal((await searches.getRecentSearches()).length,0,'unowned legacy history cannot be claimed by the next account');
 assert.equal((await activity.getRecentChapters()).length,0);
 await searches.recordSearch('A private');await activity.recordChapterView(chapter);
 await notification.archiveNotification('one');await notification.markAllNotificationsRead(['two']);
 switchTo('B');assert.equal((await searches.getRecentSearches()).length,0);assert.equal((await activity.getRecentChapters('course-a')).length,0);
 let state=await notification.fetchNotificationsWithReadState();assert.deepEqual(Array.from(state.notifications,n=>[n.id,n.read]),[['one',false],['two',false]]);
 await searches.recordSearch('B private');await activity.recordChapterView({...chapter,chapterId:'b',courseId:'course-b'});
 switchTo('A');assert.equal((await searches.getRecentSearches())[0].query,'A private');assert.equal((await activity.getLastViewedChapter('course-a')).chapterId,'a');
 assert.equal((await activity.getRecentChapters('course-b')).length,0);
 state=await notification.fetchNotificationsWithReadState();assert.deepEqual(Array.from(state.notifications,n=>[n.id,n.read]),[['two',true]]);
 // Delay the actual storage read, then switch account while the mutation is waiting.
 let release;delayRead=new Promise(r=>{release=r;});const stale=searches.recordSearch('obsolete A');await tick();switchTo('B');release();await stale;
 assert.deepEqual(Array.from(await searches.getRecentSearches(),x=>x.query),['B private']);
 switchTo('A');assert.deepEqual(Array.from(await searches.getRecentSearches(),x=>x.query),['A private']);
 let finishRead;delayRead=new Promise(r=>{finishRead=r;});const oldRead=searches.getRecentSearches();
 switchTo('B');switchTo('A');finishRead();assert.equal((await oldRead).length,0,'A-to-B-to-A rejects the first session read');
 const oldNotifications=notification.fetchNotificationsWithReadState();switchTo('B');
 assert.equal((await oldNotifications).notifications.length,0,'mixed-owner notification reads return no rows');switchTo('A');
 await Promise.all([searches.recordSearch('first'),searches.recordSearch('second')]);
 assert.deepEqual(Array.from(await searches.getRecentSearches(),x=>x.query),['second','first','A private'],'concurrent writes retain both terms');
 await Promise.all([notification.markAllNotificationsRead(['one']),notification.markAllNotificationsRead(['two'])]);
 // A failed logout leaves the authenticated owner intact; no destructive history cleanup occurs.
 assert.equal((await searches.getRecentSearches()).length,3);
 switchTo(null);assert.equal((await searches.getRecentSearches()).length,0);await searches.recordSearch('anonymous');
 switchTo('A');assert.equal((await searches.getRecentSearches()).length,3);
 assert(storage.has('medveda:recentSearches'),'legacy remains quarantined rather than deleting unrelated offline content');
 console.log('PASS actual personal storage owner isolation, legacy quarantine, course filtering, async switches and serialized writes');
})().catch(e=>{console.error(e);process.exitCode=1;});

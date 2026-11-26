const assert=require('node:assert/strict');const {load}=require('./ui-harness.cjs');
let status=200,current=true,granted=true,calls=[],mime='application/pdf',size=12,signature='JVBERi0=',interrupted=false,declared='12';
const fs={cacheDirectory:'file:///cache/',EncodingType:{Base64:'base64'},downloadAsync:async()=>{if(interrupted)throw Error('interrupted');return {status,headers:{'Content-Type':mime,'Content-Length':declared}};},getInfoAsync:async()=>({exists:true,size}),deleteAsync:async()=>calls.push('cleanup'),readAsStringAsync:async(_,options)=>options.length===5?signature:'JVBERi0=full',writeAsStringAsync:async()=>calls.push('write'),StorageAccessFramework:{requestDirectoryPermissionsAsync:async()=>({granted,directoryUri:'content://dir'}),createFileAsync:async()=>{calls.push('create');return 'content://file';}}};
const platform={OS:'android'};
const native=load('mobile-app/src/features/question-papers/download.native.ts',{'expo-file-system/legacy':fs,'react-native':{Platform:platform},'react-native-blob-util':{__esModule:true,default:{ios:{presentOptionsMenu:()=>calls.push('menu')}}}});
(async()=>{
 assert.match(await native.downloadPaper('https://example.test/x','id',()=>current),/saved/i);assert(calls.includes('write'));assert(calls.includes('cleanup'));
 for(const invalid of [{mime:'text/html'},{size:0},{size:52428801},{signature:'PGh0bWw='},{declared:'100'},{interrupted:true}]) {
 const old={mime,size,signature,declared,interrupted};
 ({mime,size,signature,declared,interrupted}={...old,...invalid});calls=[];
 await assert.rejects(native.downloadPaper('https://example.test/x','id',()=>current),/valid|interrupted/i);
 assert(!calls.includes('create')&&!calls.includes('menu')&&!calls.includes('write'));assert(calls.includes('cleanup'));
 ({mime,size,signature,declared,interrupted}=old);
 }
 calls=[];status=403;await assert.rejects(native.downloadPaper('https://example.test/x','id',()=>current),/download|expired/i);assert(!calls.includes('write'));
 status=200;current=false;calls=[];await assert.rejects(native.downloadPaper('https://example.test/x','id',()=>current),/account|changed|cancel/i);assert(!calls.includes('write'));
 current=true;granted=false;calls=[];assert.match(await native.downloadPaper('https://example.test/x','id',()=>current),/cancel/i);assert(!calls.includes('write'));
 platform.OS='ios';calls=[];assert.match(await native.downloadPaper('https://example.test/x','id',()=>current),/menu/i);assert(calls.includes('menu'));assert(!calls.includes('cleanup'));
 const clicks=[];let webOk=true,webType='application/pdf',afterFetch=()=>{};const web=load('mobile-app/src/features/question-papers/download.web.ts',{}, {fetch:async()=>{afterFetch();return {ok:webOk,blob:async()=>({type:webType,size:10,slice:()=>({text:async()=>'%PDF-'})})};},URL:{createObjectURL:()=> 'blob:paper',revokeObjectURL(){}},setTimeout:fn=>fn(),document:{createElement:()=>({click(){clicks.push(this.href);},remove(){}}),body:{appendChild(){}}}});
 await web.downloadPaper('https://example.test/x','id',()=>true);assert.equal(clicks.length,1);
 await assert.rejects(web.downloadPaper('https://example.test/x','id',()=>false));assert.equal(clicks.length,1);
 webOk=false;await assert.rejects(web.downloadPaper('https://example.test/x','id',()=>true),/download|expired/i);assert.equal(clicks.length,1);
 webOk=true;webType='text/html';await assert.rejects(web.downloadPaper('https://example.test/x','id',()=>true),/valid/i);assert.equal(clicks.length,1);
 webType='application/pdf';afterFetch=()=>{current=false;};current=true;await assert.rejects(web.downloadPaper('https://example.test/x','id',()=>current),/changed/i);assert.equal(clicks.length,1);
 console.log('PASS Question Paper platform download success, expiry, cancellation, account changes and cleanup');
})().catch(e=>{console.error(e);process.exitCode=1});

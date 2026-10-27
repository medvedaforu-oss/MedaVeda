const assert=require('node:assert/strict');
const {harness,load}=require('./ui-harness.cjs');
(async()=>{
 const h=harness();let notices=0,fail=true,reads=0;
 const manager={getAllDownloads:()=>{reads++;return [];},getStorageStats:()=>({}),subscribeToDownloadEvents:()=>()=>{}};
 for(const name of ['pauseDownload','resumeDownload','retryDownload','cancelDownload','removeDownload','clearAllDownloads'])manager[name]=async()=>{if(fail)throw Error('storage full');};
 const hook=load('mobile-app/src/hooks/useDownloads.ts',{react:h.react,'react-native':{Alert:{alert:()=>notices++}},'../utils/downloadManager':manager,'../services/courseState':{getCourseYear:()=>({courseId:'course'})},'../utils/logger':{logError(){}}}).default;
 const api=h.render(hook);const initial=reads;
 for(const name of ['pause','resume','retry','cancel','remove','clearAll'])await api[name]('fixture');
 assert.equal(notices,6);assert.equal(reads,initial);
 fail=false;for(const name of ['pause','resume','retry','cancel','remove','clearAll'])await api[name]('fixture');
 assert.equal(notices,6);assert.equal(reads,initial+6);h.unmount();
 console.log('PASS storage/native failures from all six download actions handled; successful retry refreshes');
})().catch(e=>{console.error(e);process.exitCode=1;});

const assert=require('node:assert/strict');
const {harness,load,tick}=require('./ui-harness.cjs');
async function scenario(mode){
 const h=harness(),listeners=new Set();let account='A',epoch=1,course='c',result,creates=0,writes=0,deletes=[];
 const auth={getCurrentUser:()=>account?{id:account}:null,getAuthEpoch:()=>epoch,subscribeAuthUser:()=>()=>{}};
 const courseState={getCourseYear:()=>({courseId:course}),subscribeCourseYear:()=>()=>{}};
 const AppState={currentState:'active',addEventListener:(_,cb)=>{listeners.add(cb);return{remove:()=>listeners.delete(cb)}}};
 const event=s=>{AppState.currentState=s;for(const cb of listeners)cb(s);render()};
 const resource=load('mobile-app/src/features/question-papers/usePaperResource.ts',{react:h.react,'react-native':{AppState},'@react-navigation/native':{useFocusEffect:cb=>h.react.useEffect(cb,[cb])},'../../services/authState':auth}).default;
 const native=load('mobile-app/src/features/question-papers/download.native.ts',{'react-native':{Platform:{OS:'android'}},'react-native-blob-util':{__esModule:true,default:{ios:{}}},'expo-file-system/legacy':{
 cacheDirectory:'file:///cache/',EncodingType:{Base64:'base64'},downloadAsync:async()=>({status:200,headers:{'content-type':'application/pdf','content-length':'12'}}),getInfoAsync:async()=>({exists:true,isDirectory:false,size:12}),readAsStringAsync:async()=> 'JVBERi0=',deleteAsync:async uri=>{deletes.push(uri)},
 writeAsStringAsync:async()=>{writes++;if(mode==='write-fail')throw Error('Device storage is full');if(mode==='switch-write'){account='B';epoch++}},StorageAccessFramework:{
 requestDirectoryPermissionsAsync:async()=>{event('background');if(mode==='account'){account='B';epoch++}if(mode==='roundtrip'){epoch+=2}if(mode==='course')course='other';if(mode==='dispose')h.unmount();if(mode==='explicit')result.cancelDownload();event('active');return{granted:mode!=='cancel',directoryUri:'content://folder'}},
 createFileAsync:async()=>{creates++;return 'content://folder/paper.pdf'}
 }}});
 const hook=load('mobile-app/src/features/question-papers/usePaperPdf.ts',{react:h.react,'../../hooks/useCourseYear':{__esModule:true,default:()=>({courseId:course})},'../../services/courseState':courseState,'../../services/authState':auth,'./service':{getPaperUrl:async()=> 'https://fixture.invalid/p.pdf'},'./download':native,'./usePaperResource':{__esModule:true,default:resource}}).default;
 function render(){return result=h.render(()=>hook('paper','c'))}
 render();await tick();render();await result.download();await tick();render();
 if(mode==='success'){assert.equal(writes,1,'Normal folder picker lifecycle must export');assert.match(result.status,/saved/)}
 else if(mode==='cancel'){assert.equal(creates,0);assert.match(result.status,/cancelled/)}
 else if(mode==='write-fail'){assert.match(result.error,/storage is full/);assert(deletes.includes('content://folder/paper.pdf'),'Failed destination is cleaned up')}
 else if(mode==='switch-write'){assert(!/saved/.test(result.status));assert(deletes.includes('content://folder/paper.pdf'))}
 else {assert.equal(creates,0);assert(!/saved/.test(result.status))}
 if(mode!=='dispose')assert.equal(result.busy,false);h.unmount();console.log('PASS export integrated '+mode);
}
(async()=>{for(const mode of ['success','cancel','account','roundtrip','course','dispose','explicit','write-fail','switch-write'])await scenario(mode)})().catch(e=>{console.error(e);process.exitCode=1});

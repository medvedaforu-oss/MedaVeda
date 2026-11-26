const assert=require('node:assert/strict');
const {load,harness,tick}=require('./ui-harness.cjs');
const codec=require('../src/features/question-papers/questionPaperLinks.js');
const {PaperLinkQueue}=load('mobile-app/src/features/question-papers/paperLinkQueue.ts',{});
const deferred=load('mobile-app/src/features/question-papers/deferredPaperLink.ts',{'./questionPaperLinks':codec});
(async()=>{
 let clock=Date.now();const queue=new PaperLinkQueue(()=>clock);let owner=null,authListener,urlListener,initialResolve;let nativeReferrer=async()=>{throw Error('No Play Store')};
 const appListeners=new Set();const AppState={currentState:'active',addEventListener:(_,cb)=>{appListeners.add(cb);return {remove:()=>appListeners.delete(cb)}}};
 const runtime=load('mobile-app/src/features/question-papers/paperLinkRuntime.ts',{
  'react-native':{Platform:{OS:'android'},Linking:{addEventListener:(_,cb)=>{urlListener=cb;return {remove:()=>{urlListener=null}}},getInitialURL:()=>new Promise(r=>{initialResolve=r})}},
  'expo-application':{applicationId:'in.medveda.app',getInstallationTimeAsync:async()=>new Date(),getInstallReferrerAsync:()=>nativeReferrer()},
  '@react-native-async-storage/async-storage':{__esModule:true,default:{getItem:async()=>null,setItem:async()=>{}}},
  '../../services/authState':{getCurrentUser:()=>owner?{id:owner}:null,subscribeAuthUser:cb=>{authListener=cb;return()=>{authListener=null}}},
  './questionPaperLinks':codec,'./paperLinkQueue':{PaperLinkQueue:class {constructor(){return queue}}},'./deferredPaperLink':deferred,
 });
 const cleanup=runtime.capturePaperLinks();
 const id='11111111-1111-4111-8111-111111111111',second='22222222-2222-4222-8222-222222222222';
 urlListener({url:'https://www.medveda.in/question-paper/'+second});
 initialResolve('https://www.medveda.in/question-paper/'+id);await tick();assert.equal(queue.pending.intent.id,second,'Warm link wins delayed initial read');
 const h=harness();let route='Splash',course={status:'idle'},requests=[],opened=[],alerts=[];
 const navigation={isReady:()=>true,getCurrentRoute:()=>({name:route,params:opened.at(-1)}),navigate:(name,params)=>{route=name;opened.push(params)}};
 const routing=load('mobile-app/src/features/question-papers/useQuestionPaperRouting.ts',{
  react:h.react,'react-native':{AppState,Alert:{alert:(...args)=>alerts.push(args)}},
  '../../services/authState':{getCurrentUser:()=>owner?{id:owner}:null},
  '../../services/courseState':{getCourseYear:()=>course,subscribeCourseYear:()=>()=>{}},
  './service':{getPaperDestination:async id=>{requests.push(id);return {paperId:id,title:'Shared paper'}}},
  './paperLinkRuntime':{paperLinkQueue:queue},
 }).default;
 const render=()=>h.render(()=>routing(navigation,true,route));render();await tick();assert.equal(requests.length,0);
 route='Login';render();owner='A';authListener();course={status:'ready',courseId:'course'};render();await tick();assert.equal(requests.length,0,'Login retains control until its replace finishes');
 route='Home';render();await tick();assert.equal(opened.length,1);assert.equal(opened[0].paperId,second);
 assert.equal(opened[0].courseId,'course');assert.equal(queue.pending,null);
 clock+=2000;urlListener({url:'medveda://question-paper/'+second});render();await tick();
 assert.equal(opened.length,2,'Reopening the currently visible paper must request a fresh viewer resource');
 assert(opened[1].linkRevision>opened[0].linkRevision,'Current route refresh must change its resource scope');
 AppState.currentState='background';appListeners.forEach(cb=>cb('background'));
 urlListener({url:'medveda://question-paper/'+id});render();await tick();assert.equal(opened.length,2);
 AppState.currentState='active';appListeners.forEach(cb=>cb('active'));render();await tick();assert.equal(opened.length,3);assert.equal(opened.at(-1).paperId,id);
 urlListener({url:'medveda://question-paper/'+second});owner=null;authListener();owner='B';authListener();route='Home';render();await tick();assert.equal(opened.length,3,'Pending account A destination never resumes as B');
 assert.equal(alerts.length,0);h.unmount();cleanup();assert.equal(urlListener,null);assert.equal(authListener,null);assert.equal(appListeners.size,0);
 // A native cold-start read can outlive logout and another account's login.
 owner='A';const lateCleanup=runtime.capturePaperLinks();owner=null;authListener();owner='B';authListener();
 initialResolve('https://www.medveda.in/question-paper/'+id);await tick();
 assert.equal(queue.pending,null,'Delayed initial URL must never be reassigned to another account');lateCleanup();
 nativeReferrer=async()=>new URL(codec.paperPlayUrl(second)).searchParams.get('referrer');
 const refCleanup=runtime.capturePaperLinks();await tick();await tick();
 assert.equal(queue.pending,null,'Deferred destination waits for initial direct URL resolution');
 initialResolve('https://www.medveda.in/question-paper/'+id);await tick();await tick();
 assert.equal(queue.pending.intent.id,id,'Direct launch wins concurrent install referrer');refCleanup();
 owner=null;queue.accountChanged(null);const firstOpenCleanup=runtime.capturePaperLinks();
 initialResolve(null);await tick();await tick();
 assert.equal(queue.pending.intent.id,second,'Deferred referral recovers when there is no initial direct URL');firstOpenCleanup();
 console.log('PASS native URL capture before gates, delayed initial/warm race, normal login completion, background resume and real routing-hook account isolation');
})().catch(error=>{console.error(error);process.exitCode=1});

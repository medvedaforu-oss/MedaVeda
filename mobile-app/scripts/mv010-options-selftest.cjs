const assert = require('node:assert/strict');
const { harness, load, jsx, nodes, tick } = require('./ui-harness.cjs');
let passed = 0;
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };
const product = (scope='chapter', price=1, courseId='course') => ({id:scope,title:scope,scope,price,courseId,chapterId:'c',subjectId:'s',yearId:'y',yearIds:['y'],active:true});
function setup() {
  const h=harness(),requests=[],timers=new Set(),authListeners=new Set(),courseListeners=new Set();
  let user={id:'alice'},course={status:'ready',courseId:'course',yearId:'y'},route=['c','s','y'],writes=0,profile=null,profileReads=0;
  const react={...h.react,useState(initial){const [v,set]=h.react.useState(initial);return [v,next=>{writes++;set(next);}];}};
  const api=load('mobile-app/src/hooks/useBuyOptions.ts',{
    react,'../services/authState':{getCurrentUser:()=>user,subscribeAuthUser(fn){authListeners.add(fn);return()=>authListeners.delete(fn);}},
    '../services/courseState':{getCourseYear:()=>course,subscribeCourseYear(fn){courseListeners.add(fn);return()=>courseListeners.delete(fn);},loadCourseYear(force){assert.equal(force,true);profileReads++;return profile?.promise??Promise.resolve(course);}},
    '../services/productsService':{fetchBuyOptionsForChapter(...ids){const d=deferred();requests.push({...d,ids});return d.promise;}},
  },{setTimeout(fn,ms){assert.equal(ms,15000);const t={fn};timers.add(t);return t;},clearTimeout(t){timers.delete(t);}});
  const hook=()=>api.default(...route);
  return {react,hook,requests,read:()=>h.render(hook),render:fn=>h.render(fn),route(...ids){route=ids;return h.render(hook);},
    user(next){user=next;authListeners.forEach(fn=>fn());},course(next){course=next;courseListeners.forEach(fn=>fn());},
    timeout(){[...timers].forEach(t=>t.fn());},profile(){profile=deferred();return profile;},profileReads:()=>profileReads,writes:()=>writes,
    unmount(){h.unmount();assert.equal(timers.size,0);assert.equal(authListeners.size,0);assert.equal(courseListeners.size,0);}};
}
function service(overrides={}) {
  const calls=[];
  const repo={};
  for(const [fn,scope]of [['getProductsByChapter','chapter'],['getProductsBySubject','subject'],['getProductsByYear','year'],['getBundleProducts','bundle']])repo[fn]=async id=>{calls.push([fn,id]);return [product(scope,scope==='subject'?2:scope==='year'?5:1)];};
  return {calls,...load('mobile-app/src/services/productsService.ts',{'../repositories/productsRepository':{...repo,...overrides}})};
}
function panel(s, state, provider='disabled') {
  let buys=0;
  const mocks={react:s.react,'react/jsx-runtime':jsx,
    'react-native':{View:'View',Text:'Text',TouchableOpacity:'Button',ActivityIndicator:'Spinner',Platform:{OS:'android'},StyleSheet:{create:x=>x}},
    '../hooks/useBuyOptions':{__esModule:true,default:state||s.hook},'../hooks/usePurchase':{__esModule:true,default:()=>({buy:()=>buys++,purchasing:false})},'../config/paymentProvider':{paymentProvider:provider}};
  for(const [f,k]of [['colors','COLORS'],['fonts','FONT'],['spacing','SPACING'],['radius','RADIUS'],['shadows','SHADOW']])mocks['../theme/'+f]={[k]:{}};
  const Panel=load('mobile-app/src/components/UnlockOptionsPanel.tsx',mocks).default;
  return {read:()=>s.render(()=>Panel({chapterId:'c',subjectId:'s',yearId:'y',subjectTitle:'Subject',yearTitle:'Year'})),buys:()=>buys};
}
const textOf=tree=>nodes(tree).filter(n=>n.type==='Text').map(n=>[n.props.children].flat(Infinity).join('')).join(' ');
async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
(async()=>{
  await test('complete chapter/subject/year/bundle mapping preserves exact ₹1/₹2/₹5 prices and live calls',async()=>{
    const a=service(),r=await a.fetchBuyOptionsForChapter('c','s','y','course');
    assert.deepEqual(Array.from(r,p=>p.scope),['chapter','subject','year','bundle']);assert.deepEqual(Array.from(r,p=>p.price),[1,2,5,1]);
    assert.deepEqual(a.calls.map(c=>c[1]),['c','s','y','course']);await a.fetchBuyOptionsForChapter('c','s','y','course');assert.equal(a.calls.length,8);
  });
  await test('successful empty tiers, bundle membership and foreign course exclusion',async()=>{
    const empty=async()=>[];
    assert.equal((await service({getProductsByChapter:empty,getProductsBySubject:empty,getProductsByYear:empty,getBundleProducts:empty}).fetchBuyOptionsForChapter('c','s','y','course')).length,0);
    const r=await service({getProductsByChapter:async()=>[product('chapter',1,'old')],getBundleProducts:async()=>[{...product('bundle'),yearIds:['other']}]}).fetchBuyOptionsForChapter('c','s','y','course');
    assert.deepEqual(Array.from(r,p=>p.scope),['subject','year']);
  });
  for(const stage of ['getProductsByChapter','getProductsBySubject','getProductsByYear','getBundleProducts'])await test(stage+' failure rejects partial snapshot',async()=>{
    await assert.rejects(service({[stage]:async()=>{throw new Error('network');}}).fetchBuyOptionsForChapter('c','s','y','course'),/network/);
  });
  await test('malformed tier/row rejects incomplete response rather than fabricating empty options',async()=>{
    for(const data of [null,undefined,{},[null],[{id:'partial'}],[{...product(),chapterId:'wrong'}]])await assert.rejects(service({getProductsByChapter:async()=>data}).fetchBuyOptionsForChapter('c','s','y','course'),e=>e.code==='OPTIONS_INCOMPLETE');
  });
  await test('incomplete bundle memberships reject instead of disappearing as an empty bundle tier',async()=>{
    for(const yearIds of [undefined,null,[],[null],['']])await assert.rejects(service({getBundleProducts:async()=>[{...product('bundle'),yearIds}]}).fetchBuyOptionsForChapter('c','s','y','course'),e=>e.code==='OPTIONS_INCOMPLETE');
  });
  await test('actual repository distinguishes successful [], server error, null payload and HTTP partial content',async()=>{
    let response,reads=0;
    const builder={select(){return this;},eq(){return this;},then(a,b){return Promise.resolve(response).then(a,b);}};
    const repo=load('mobile-app/src/repositories/productsRepository.ts',{'../config/supabase':{supabase:{from(){reads++;return builder;}}},'../utils/caseConvert':{toCamelCase:x=>x},'../config/paymentProvider':{isNonplayTestBuild:false}});
    response={data:[],status:200};assert.equal((await repo.getProductsByChapter('c')).length,0);
    for(const r of [{data:null,status:200},{data:[product()],status:206},{data:[],error:{message:'server'},status:503}]){response=r;await assert.rejects(repo.getProductsByChapter('c'));}
    response={data:[product()],status:200};assert.equal((await repo.getProductsByChapter('c'))[0].price,1);assert.equal(reads,5);
  });
  await test('hook success, fresh complete replacement and successful empty status',async()=>{
    const s=setup();assert.equal(s.read().status,'loading');s.requests[0].resolve([product()]);await tick();assert.equal(s.read().status,'success');
    const p=s.read().refresh();s.requests[1].resolve([]);await p;assert.equal(s.read().status,'empty');assert.equal(s.read().options.length,0);s.unmount();
  });
  for(const [name,error,pattern]of [['network',new TypeError('Network request failed'),/connection/],['server',{status:503},/temporarily unavailable/],['API',{code:'PGRST002'},/temporarily unavailable/],['SQL',{code:'XX000'},/temporarily unavailable/],['expired JWT',{code:'PGRST301'},/Sign in/],['authentication',{status:401},/Sign in/],['forbidden',{status:403},/Sign in/],['API timeout',{code:'57014'},/timed out/],['partial',{code:'OPTIONS_INCOMPLETE'},/all purchase options/]])await test(name+' failure is error; genuinely new Retry recovers',async()=>{
    const s=setup();s.read();s.requests[0].reject(error);await tick();assert.equal(s.read().status,'error');assert.match(s.read().error,pattern);
    const p=s.read().refresh();assert.equal(s.read().status,'retrying');assert.equal(s.requests.length,2);s.requests[1].resolve([product()]);await p;assert.equal(s.read().status,'success');s.unmount();
  });
  await test('deadline releases hung request, duplicate taps coalesce, late timed-out success ignored',async()=>{
    const s=setup();s.read();await s.read().refresh();assert.equal(s.requests.length,1);s.timeout();await tick();assert.equal(s.read().status,'error');assert.match(s.read().error,/timed out/);
    const p=s.read().refresh();await s.read().refresh();await s.read().refresh();assert.equal(s.requests.length,2);s.requests[1].resolve([]);await p;s.requests[0].resolve([product()]);await tick();assert.equal(s.read().status,'empty');s.unmount();
  });
  await test('slow old / fast new and rapid chapter A-B-C-A navigation reject stale success/error',async()=>{
    const s=setup();s.read();assert.equal(s.route('b','s','y').options.length,0);s.requests[1].resolve([product('subject')]);await tick();s.requests[0].resolve([product()]);await tick();assert.equal(s.read().options[0].scope,'subject');
    s.route('cc','s','y');s.route('c','s','y');assert.equal(s.requests.length,4);s.requests[3].resolve([]);s.requests[2].reject(new Error('late'));await tick();assert.equal(s.read().status,'empty');s.unmount();
  });
  await test('fast old / slow new cannot populate new chapter or finish its loading',async()=>{
    const s=setup();s.read();s.route('b','s','y');s.requests[0].resolve([product()]);await tick();assert.equal(s.read().loading,true);assert.equal(s.read().options.length,0);s.requests[1].resolve([]);await tick();assert.equal(s.read().status,'empty');s.unmount();
  });
  await test('course/year switches clear complete snapshots and pin exact request context',async()=>{
    const s=setup();s.read();s.requests[0].resolve([product()]);await tick();s.course({status:'ready',courseId:'new',yearId:'new-y'});assert.equal(s.read().options.length,0);assert.deepEqual(s.requests[1].ids,['c','s','y','new']);
    s.course({status:'ready',courseId:'new',yearId:'next-y'});s.requests[1].resolve([product()]);await tick();assert.equal(s.read().loading,true);s.requests[2].reject(new Error('offline'));await tick();assert.equal(s.read().options.length,0);s.unmount();
  });
  await test('account switching/logout/login invalidate old session, including relogin to same ID',async()=>{
    const s=setup();s.read();s.user({id:'bob'});assert.equal(s.read().options.length,0);s.requests[0].resolve([product()]);await tick();assert.equal(s.read().loading,true);
    s.user(null);await tick();assert.equal(s.read().status,'error');assert.match(s.read().error,/Sign in/);s.user({id:'bob'});s.requests[2].resolve([]);s.requests[1].resolve([product()]);await tick();assert.equal(s.read().status,'empty');s.unmount();
  });
  await test('same-context cached complete data is explicitly stale on retry/failure and replaced on success',async()=>{
    const s=setup();s.read();s.requests[0].resolve([product()]);await tick();const p=s.read().refresh();assert.equal(s.read().options.length,1);assert.equal(s.read().status,'retrying');s.requests[1].reject(new Error('offline'));await p;assert.equal(s.read().status,'error');assert.equal(s.read().options.length,1);
    const q=s.read().refresh();s.requests[2].resolve([]);await q;assert.equal(s.read().status,'empty');s.unmount();
  });
  await test('unmount cancels timers/subscriptions and blocks late success/error writes',async()=>{
    for(const fail of [false,true]){const s=setup();s.read();s.unmount();const n=s.writes();fail?s.requests[0].reject(new Error('late')):s.requests[0].resolve([product()]);await tick();await s.read().refresh();assert.equal(s.writes(),n);}
  });
  await test('course initialization failure, missing course and timeout yield bounded error with fresh context Retry',async()=>{
    for(const mode of ['failure','missing','timeout']){const s=setup();s.course({status:mode==='missing'?'ready':'loading'});const old=s.profile();s.read();if(mode==='timeout')s.timeout();else old.resolve({status:'error'});await tick();assert.equal(s.read().status,'error');assert.equal(s.requests.length,0);old.resolve({status:'ready',courseId:'late'});await tick();assert.equal(s.requests.length,0);
      s.course({status:'ready',courseId:'recovered',yearId:'y'});s.requests[0].resolve([]);await tick();assert.equal(s.read().status,'empty');s.unmount();}
  });
  await test('actual panel + hook: network error -> accessible Retry -> fresh request -> genuine empty',async()=>{
    const s=setup(),ui=panel(s);ui.read();s.requests[0].reject(new Error('offline'));await tick();let tree=ui.read();assert.doesNotMatch(textOf(tree),/No purchase options/);assert.match(textOf(tree),/connection/);
    const retry=nodes(tree).find(n=>n.type==='Button');assert.equal(retry.props.accessibilityLabel,'Retry loading purchase options');retry.props.onPress();retry.props.onPress();tree=ui.read();assert.equal(s.requests.length,2);assert.ok(nodes(tree).some(n=>n.type==='Spinner'));assert.equal(nodes(tree).find(n=>n.type==='Button').props.disabled,true);
    s.requests[1].resolve([]);await tick();assert.match(textOf(ui.read()),/No purchase options set up/);s.unmount();
  });
  await test('actual panel stale warnings, labels, disabled Buy Now and price preservation',async()=>{
    const h=harness();let current,refreshes=0;const s={react:h.react,render:fn=>h.render(fn)};
    const ui=panel(s,()=>({...current,refresh:()=>refreshes++}));
    for(const status of ['loading','retrying','success','empty','error']){
      current={status,loading:['loading','retrying'].includes(status),options:status==='empty'||status==='loading'?[]:['chapter','subject','year','bundle'].map((scope,i)=>product(scope,[1,2,5,1][i])),error:'Offline'};
      const tree=ui.read();if(['retrying','error'].includes(status))assert.match(textOf(tree),/may be out of date/);if(status!=='empty')assert.doesNotMatch(textOf(tree),/No purchase options/);
      for(const n of nodes(tree).filter(n=>n.type==='Button'&&n.props.accessibilityLabel!=='Retry loading purchase options')){assert.equal(n.props.accessibilityRole,'button');assert.equal(n.props.disabled,true);assert.equal(n.props.accessibilityState.disabled,true);n.props.onPress();}assert.equal(ui.buys(),0);
      if(status==='error'){nodes(tree).find(n=>n.type==='Button').props.onPress();assert.equal(refreshes,1);}
    }
    current={status:'success',loading:false,options:[product('chapter',1),product('subject',2),product('year',5),product('bundle',5)],error:null};
    const active=panel(s,()=>({...current,refresh(){}}),'razorpay');const tree=active.read();assert.match(textOf(tree),/₹1/);assert.match(textOf(tree),/₹2/);assert.match(textOf(tree),/₹5/);assert.match(textOf(tree),/Full Subject: Subject/);assert.match(textOf(tree),/Full Year: Year/);assert.match(textOf(tree),/Multi-Year Bundle/);h.unmount();
  });
  await test('Chapter Details shares guarded panel, owned Notes indicator/focus refresh and free video/quiz navigation',async()=>{
    const h=harness();let owned=false,focus,refreshes=0;const navigations=[];
    const mocks={react:h.react,'react/jsx-runtime':jsx,'react-native':{View:'View',Text:'Text',Platform:{OS:'android'},StyleSheet:{create:x=>x}},
      '@react-navigation/native':{useRoute:()=>({params:{chapterId:'c',chapterTitle:'Chapter',subjectId:'s',subjectTitle:'Subject',yearId:'y',yearTitle:'Year'}}),useNavigation:()=>({navigate:(...args)=>navigations.push(args)}),useFocusEffect:fn=>{focus=fn;}},
      '../../navigation/withRouteValidation':{withRouteValidation:s=>s},'../../hooks/usePurchases':{__esModule:true,default:()=>({isChapterOwned:()=>owned,refresh:()=>refreshes++,loading:false,error:null})},
      '../../services/courseState':{getCourseYear:()=>({courseId:'course'})},'../../utils/recentActivity':{recordChapterView(){}},};
    for(const c of ['PurchaseOwnershipStatus','UnlockOptionsPanel','FeatureCard'])mocks['../../components/'+c]={__esModule:true,default:c};
    for(const [f,k]of [['colors','COLORS'],['fonts','FONT'],['spacing','SPACING']])mocks['../../theme/'+f]={[k]:{}};
    const Screen=load('mobile-app/src/screens/details/ChapterDetailsScreen.tsx',mocks).default;
    let tree=nodes(h.render(Screen));assert.ok(tree.some(n=>n.type==='UnlockOptionsPanel'&&n.props.chapterId==='c'));focus();assert.equal(refreshes,1);
    tree.find(n=>n.type==='FeatureCard'&&n.props.title==='Video Lectures').props.onPress();assert.equal(navigations.at(-1)[0],'Videos');tree.find(n=>n.type==='FeatureCard'&&n.props.title==='MCQ Quiz').props.onPress();assert.equal(navigations.at(-1)[0],'QuizTests');
    owned=true;tree=nodes(h.render(Screen));assert.ok(!tree.some(n=>n.type==='UnlockOptionsPanel'));tree.find(n=>n.type==='FeatureCard'&&n.props.title==='PDF Notes').props.onPress();assert.equal(navigations.at(-1)[1].unlocked,true);assert.ok(tree.some(n=>n.type==='PurchaseOwnershipStatus'));h.unmount();
  });
  console.log(`PASS MV010 ${passed} deterministic groups (synthetic fixtures only)`);
})().catch(e=>{console.error(e);process.exitCode=1;});

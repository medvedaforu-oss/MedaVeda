const assert=require('node:assert/strict');
const {harness,load,jsx,nodes,tick}=require('./ui-harness.cjs');
(async()=>{
 const h=harness();let app,auth,user='buyer',resolve,reject,requests=0,backs=0,deadline;
 const nav={goBack:()=>backs++}; const logs=[];
 const state={currentState:'active',addEventListener:(_,fn)=>{app=fn;return {remove(){}};}};
 const Screen=load('mobile-app/src/screens/pdf/PdfViewerScreen.native.tsx',{
  react:h.react,'react/jsx-runtime':jsx,'react-native':{AppState:state,StyleSheet:{create:x=>x},View:'View',Text:'Text',ActivityIndicator:'Spinner'},
  'react-native-pdf':{__esModule:true,default:'PDF'},'expo-file-system/legacy':{},
  '@react-navigation/native':{useRoute:()=>({params:{}}),useNavigation:()=>nav},
  '../../components/ErrorState':{__esModule:true,default:'Error'},'../../utils/downloadManager':{},'../../services/offlineNoteAccess':{},
  '../../config/supabase':{supabase:{auth:{onAuthStateChange:fn=>{auth=fn;return {data:{subscription:{unsubscribe(){}}}};}}}},
  '../../features/sharing/ContentShareButton':{__esModule:true,default:'ShareButton'},'../../services/authState':{getCurrentUser:()=>({id:user})},
  '../../services/secureNotesService':{getSecureNoteUrl:id=>{assert.equal(id,'note');requests++;return new Promise((yes,no)=>{resolve=yes;reject=no;});}},
  '../../theme/fonts':{FONT:{}},'../../utils/logger':{logError:(...args)=>logs.push(args)},
 },{setTimeout:fn=>{deadline=fn;return 1;},clearTimeout(){}}).PdfViewerSession;
 const render=()=>nodes(h.render(()=>Screen({pdfUrl:'https://private.invalid/expired?token=SECRET',noteId:'note'})));
 let tree=render();const original=tree.find(n=>n.type==='PDF');
 original.props.onError(Error('fetch failed https://private.invalid?token=SECRET'));tree=render();
 assert.equal(JSON.stringify(logs).includes('SECRET'),false);
 const retry=tree.find(n=>n.type==='Error').props.onRetry;retry();retry();assert.equal(requests,1);
 assert.ok(!render().some(n=>n.type==='PDF'));resolve('https://private.invalid/fresh');await tick();
 tree=render();assert.equal(tree.find(n=>n.type==='PDF').props.source.uri,'https://private.invalid/fresh');
 original.props.onError(Error('late old callback'));assert.ok(render().some(n=>n.type==='PDF'));
 // Native renderer never reports completion: bounded recovery, then a genuine access denial.
 deadline();tree=render();tree.find(n=>n.type==='Error').props.onRetry();reject(Error('403'));await tick();
 assert.ok(render().some(n=>n.type==='Error'));assert.equal(backs,0);
 // Background invalidates one refresh; resume starts a fresh authorization.
 render().find(n=>n.type==='Error').props.onRetry();const stale=resolve;
 state.currentState='background';app('background');stale('https://private.invalid/stale');await tick();
 assert.ok(!render().some(n=>n.type==='PDF'));
 state.currentState='active';app('active');resolve('https://private.invalid/resume');await tick();
 assert.equal(render().find(n=>n.type==='PDF').props.source.uri,'https://private.invalid/resume');
 user='other';auth('SIGNED_IN',{user:{id:'other'}});assert.ok(!render().some(n=>n.type==='PDF'));
 const before=requests;render().find(n=>n.type==='Error').props.onRetry();assert.equal(requests,before);
 h.unmount();
 console.log('PASS expired link → fresh authorized URL, retry single flight, stale render callbacks, render timeout, denial, background/resume and account switch; no signed URL logs');
})().catch(e=>{console.error(e);process.exitCode=1;});

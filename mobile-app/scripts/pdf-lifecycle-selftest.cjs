const assert=require('node:assert/strict');
const {harness,load,jsx,nodes,tick}=require('./ui-harness.cjs');
(async()=>{
 const h=harness();let app,auth,interval,cleaned=0,exists=true,resolveAccess;
 const state={currentState:'active',addEventListener:(_,fn)=>{app=fn;return {remove:()=>cleaned++};}};
 const Screen=load('mobile-app/src/screens/pdf/PdfViewerScreen.native.tsx',{
  react:h.react,'react/jsx-runtime':jsx,'react-native':{AppState:state,StyleSheet:{create:x=>x},View:'View',Text:'Text',ActivityIndicator:'Spinner'},
  'react-native-pdf':{__esModule:true,default:'PDF'},'expo-file-system/legacy':{getInfoAsync:async()=>({exists,size:100})},
  '@react-navigation/native':{useRoute:()=>({params:{pdfUrl:'file:///notes/fixture.pdf'}}),useNavigation:()=>({goBack(){}})},
  '../../components/ErrorState':{__esModule:true,default:'Error'},'../../utils/downloadManager':{getAllDownloads:()=>[{contentType:'note',isFreePreview:true,id:'note',localUri:'file:///notes/fixture.pdf'}]},
  '../../services/offlineNoteAccess':{mayOpenOfflineNote:()=>new Promise(r=>{resolveAccess=r;})},
  '../../config/supabase':{supabase:{auth:{onAuthStateChange:fn=>{auth=fn;return {data:{subscription:{unsubscribe:()=>cleaned++}}};}}}},
  '../../features/sharing/ContentShareButton':{__esModule:true,default:'ShareButton'},'../../services/authState':{getCurrentUser:()=>({id:'buyer'})},'../../services/secureNotesService':{},
  '../../theme/fonts':{FONT:{}},'../../utils/logger':{logError(){}},
 },{setInterval:fn=>{interval=fn;return 1;},clearInterval:()=>cleaned++}).PdfViewerSession;
 const render=()=>nodes(h.render(()=>Screen({pdfUrl:'file:///notes/fixture.pdf'})));
 render();const old=resolveAccess;state.currentState='background';app('background');old(true);await tick();
 assert.ok(!render().some(n=>n.type==='PDF'));
 state.currentState='active';app('active');resolveAccess(true);await tick();assert.ok(render().some(n=>n.type==='PDF'));
 interval();const stale=resolveAccess;auth();const current=resolveAccess;stale(true);await tick();assert.ok(!render().some(n=>n.type==='PDF'));
 current(false);await tick();assert.match(render().find(n=>n.type==='Error').props.message,/7 days.*revoked/);
 exists=false;app('active');resolveAccess(true);await tick();assert.match(render().find(n=>n.type==='Error').props.message,/missing or empty/);
 exists=true;app('active');resolveAccess(true);await tick();render().find(n=>n.type==='PDF').props.onError(Error('corrupt'));
 assert.match(render().find(n=>n.type==='Error').props.message,/damaged/);h.unmount();assert.equal(cleaned,3);
 console.log('PASS PDF background/auth races, expiry/revocation, deleted/corrupt file messages and listener cleanup');
})().catch(e=>{console.error(e);process.exitCode=1;});

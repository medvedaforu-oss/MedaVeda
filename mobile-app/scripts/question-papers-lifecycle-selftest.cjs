const assert=require('node:assert/strict');const {harness,load,jsx,nodes,tick}=require('./ui-harness.cjs');
(async()=>{
 const h=harness();let appListener,account='a',authListener;let loads=[];
 const AppState={currentState:'active',addEventListener:(_,cb)=>{appListener=cb;return {remove:()=>{appListener=null;}};}};
 const hook=load('mobile-app/src/features/question-papers/usePaperResource.ts',{react:h.react,'react-native':{AppState},'@react-navigation/native':{useFocusEffect:cb=>h.react.useEffect(cb,[cb])},'../../services/authState':{getCurrentUser:()=>({id:account}),subscribeAuthUser:cb=>{authListener=cb;return()=>{};}}}).default;
 const loader=()=>new Promise((resolve,reject)=>loads.push({resolve,reject}));const render=()=>h.render(()=>hook('paper',loader));
 render();loads[0].resolve('url1');await tick();const old=render();assert.equal(old.value,'url1');
 AppState.currentState='background';appListener('background');assert.equal(render().value,undefined);assert.equal(old.isCurrent(),false);
 AppState.currentState='active';appListener('active');render();loads[1].reject(Error('expired signed URL'));await tick();assert.match(render().error,/expired/);
 render().retry();render();loads[2].resolve('url2');await tick();assert.equal(render().value,'url2');
 account='b';authListener();assert.equal(render().value,undefined);loads[3].resolve('account b');await tick();assert.equal(render().value,'account b');
 h.unmount();assert.equal(appListener,null);
 const ph=harness();let valid=true;let resource={value:'url1',isCurrent:()=>valid,retry(){}};
 const pdfHook=load('mobile-app/src/features/question-papers/usePaperPdf.ts',{react:ph.react,'../../hooks/useCourseYear':{__esModule:true,default:()=>({courseId:'c'})},'../../services/courseState':{getCourseYear:()=>({courseId:'c'}),subscribeCourseYear:()=>()=>{}},'../../services/authState':{getCurrentUser:()=>({id:'b'}),getAuthEpoch:()=>1},'./service':{getPaperUrl:async()=> 'fresh'},'./download':{downloadPaper:async()=>{throw Error('interrupted');}},'./usePaperResource':{__esModule:true,default:()=>resource}}).default;
 const pdfRender=()=>ph.render(()=>pdfHook('p','c'));const stale=pdfRender().onViewerError;
 valid=false;resource={value:'url2',isCurrent:()=>true,retry(){}};pdfRender();stale();assert.equal(pdfRender().viewerError,'');
 pdfRender().onViewerError();assert.match(pdfRender().viewerError,/fresh link/);pdfRender().retry();assert.equal(pdfRender().viewerError,'');
 await pdfRender().download();assert.match(pdfRender().error,/interrupted/);ph.unmount();
 // Screen callbacks from detached viewers must not poison a newer resource.
 for(const platform of ['native','web']) {
  const events=[];let current={value:'old',loading:false,busy:false,retry(){},download(){},onViewerError:()=>events.push('old')};
  const component=load(`mobile-app/src/features/question-papers/screens/QuestionPaperPdfScreen.${platform}.tsx`,{react:{__esModule:true,default:{createElement:(type,props)=>({type,props})},useState:v=>[v,()=>{}]},'react/jsx-runtime':jsx,'react-native':{ActivityIndicator:'Spinner',Text:'Text',View:'View'},'react-native-pdf':{__esModule:true,default:'Pdf'},'../../../theme/spacing':{SPACING:{}},'../../../theme/colors':{COLORS:{}},'../PaperLayout':{paperStyles:{}},'../PaperReaderToolbar':{__esModule:true,default:'Toolbar',PaperReaderLoading:'Loading'},'../usePaperPdf':{__esModule:true,default:()=>current},'../usePaperWebPreview':{__esModule:true,default:()=>({value:'blob:validated',loading:false})}}).default;
  const screen=()=>component({route:{params:{paperId:'p',courseId:'c'}}});
  if(platform==='native'){const viewer=nodes(screen()).find(n=>n.props?.onError);viewer.props.onError();assert.equal(events.length,1);}
  else {assert(nodes(screen()).some(n=>n.type==='object'&&n.props.data==='blob:validated'));assert(!nodes(screen()).some(n=>n.type==='Text'&&String(n.props.children).includes('cannot embed')));}
 }
 console.log('PASS Question Paper background/foreground, expired URL retry, account switch and web/native error wiring');
})().catch(e=>{console.error(e);process.exitCode=1;});

const pageHarness=harness();let nativePdf={value:'first',isCurrent:()=>true,onViewerError(){}};
const NativeReader=load('mobile-app/src/features/question-papers/screens/QuestionPaperPdfScreen.native.tsx',{
 react:pageHarness.react,'react/jsx-runtime':jsx,'react-native':{View:'View',Text:'Text'},
 'react-native-pdf':{__esModule:true,default:'Pdf'},
 '../PaperLayout':{paperStyles:{}},'../PaperReaderToolbar':{__esModule:true,default:'Toolbar',PaperReaderLoading:'Loading'},
 '../usePaperPdf':{__esModule:true,default:()=>nativePdf},
}).default;
const renderPage=()=>pageHarness.render(()=>NativeReader({route:{params:{paperId:'p',courseId:'c'}},navigation:{goBack(){}}}));
assert(!nodes(renderPage()).some(n=>n.type==='Text'),'No invented page count before viewer events');
nodes(renderPage()).find(n=>n.type==='Pdf').props.onPageChanged(3,12);
assert(nodes(renderPage()).some(n=>n.props.accessibilityLabel==='Page 3 of 12'));
nativePdf={...nativePdf,value:'second'};
assert(!nodes(renderPage()).some(n=>n.type==='Text'),'A new source cannot show the previous page counter');
nodes(renderPage()).find(n=>n.type==='Pdf').props.onPageChanged(0,0);
assert(!nodes(renderPage()).some(n=>n.type==='Text'));
pageHarness.unmount();
console.log('PASS native page indicator uses viewer events and resets per PDF source');

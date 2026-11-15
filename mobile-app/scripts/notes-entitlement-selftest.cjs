const assert=require('node:assert/strict');
const {harness,load,jsx,nodes,tick}=require('./ui-harness.cjs');
(async()=>{
 for(const [unlocked,denied,expectedReads,expectedOpens] of [[false,false,0,0],[true,false,2,2],[true,true,1,0]]){
  const h=harness();let focus,reads=0;const opens=[],alerts=[];
  const note={id:'paid-note',title:'Paid Notes',isFreePreview:false};
  const secure=load('mobile-app/src/services/secureNotesService.ts',{'../config/paymentProvider':{isNonplayTestBuild:false},'../config/supabase':{supabase:{functions:{invoke:async(name,options)=>{
   reads++;assert.equal(name,'get-note-url');assert.equal(options.body.noteId,note.id);assert.ok(options.signal);
   return denied?{data:null,error:{context:{status:403}}}:{data:{url:`https://private.invalid/authorized-${reads}`},error:null};
  }}}}});
  const nav={navigate:(route,params)=>opens.push({route,params})};
  const mocks={react:h.react,'react/jsx-runtime':jsx,'react-native':{View:'View',Text:'Text',FlatList:'List',ActivityIndicator:'Spinner',Alert:{alert:(...args)=>alerts.push(args)},StyleSheet:{create:x=>x}},
  '@react-navigation/native':{useRoute:()=>({params:{chapterId:'c',subjectId:'s',yearId:'y',unlocked}}),useNavigation:()=>nav,useFocusEffect:fn=>{focus=fn;}},
  '../../navigation/withRouteValidation':{withRouteValidation:s=>s},'../../hooks/useLoadResource':{__esModule:true,default:()=>({value:[note],loading:false,error:false,retry(){}})},
  '../../components/PurchaseOwnershipStatus':{__esModule:true,default:'PurchaseOwnershipStatus'},
  '../../hooks/usePurchases':{__esModule:true,default:()=>({isChapterOwned:()=>unlocked,refresh(){},loading:false,error:null})},
  '../../hooks/useDownloads':{__esModule:true,default:()=>({isDownloaded:()=>false,getItem:()=>null})},'../../services/notesService':{},'../../services/authState':{getCurrentUser:()=>({id:'buyer'})},
  '../../services/secureNotesService':secure,'../../utils/logger':{logError(){}}};
  for(const name of ['LoadError','NoteCard','EmptyState','SearchBar','UnlockOptionsPanel'])mocks['../../components/'+name]={__esModule:true,default:name};
  for(const [file,key]of [['colors','COLORS'],['fonts','FONT'],['spacing','SPACING']])mocks['../../theme/'+file]={[key]:{}};
  const Screen=load('mobile-app/src/screens/notes/NotesScreen.tsx',mocks).default;
  const press=()=>nodes(h.render(Screen)).find(n=>n.type==='List').props.renderItem({item:note}).props.onPress;
  let tap=press();let blur=focus();await tap();await tick();
  if(unlocked&&!denied){blur();tap=press();blur=focus();await tap();await tick();assert.notEqual(opens[0].params.pdfUrl,opens[1].params.pdfUrl);assert.equal(opens[0].params.noteId,note.id);}
  assert.equal(reads,expectedReads);assert.equal(opens.length,expectedOpens);if(!expectedOpens)assert.equal(alerts.length,1);
  blur();h.unmount();
 }
 console.log('PASS paid note local restriction, authorized opening/reopening with fresh links, and authoritative server denial despite a stale unlocked route');
})().catch(e=>{console.error(e);process.exitCode=1;});

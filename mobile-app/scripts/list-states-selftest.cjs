const assert=require('node:assert/strict');
const {load,jsx,nodes}=require('./ui-harness.cjs');
const specs=[['years/YearsScreen','yearsService'],['subjects/SubjectsScreen','subjectsService'],['chapters/ChaptersScreen','chaptersService'],['notes/NotesScreen','notesService'],['quiz/TestListScreen','quizService'],['videos/VideosScreen','videosService']];
for(const [name,service] of specs) for(const state of ['loading','error','empty','rows']) {
 let retried=0, stateIndex=0;
 const row={id:'fixture',title:'Fixture',questions:[],isFreePreview:true};
 const videos=name.startsWith('videos/');
 const videoStates=['',state==='rows'?[row]:[],state==='loading',state==='error'?'Offline':null,0];
 const mocks={
  react:{useCallback:f=>f,useEffect:()=>{},useMemo:f=>f(),useState:v=>[videos?videoStates[stateIndex++]:v,()=>retried++],useRef:v=>({current:v})},
  'react/jsx-runtime':jsx,
  'react-native':{View:'View',Text:'Text',FlatList:'List',ActivityIndicator:'Spinner',Alert:{alert(){}},Platform:{OS:'android'},StyleSheet:{create:x=>x}},
  '@react-navigation/native':{useRoute:()=>({params:{mode:'notes',chapterId:'c',subjectId:'s',yearId:'y'}}),useNavigation:()=>({}),useFocusEffect:()=>{}},
  '../../navigation/withRouteValidation':{withRouteValidation:s=>s},
  '../../hooks/useLoadResource':{__esModule:true,default:()=>({value:state==='rows'?[row]:[],loading:state==='loading',error:state==='error',retry:()=>retried++})},
  '../../hooks/useCourseYear':{__esModule:true,default:()=>({ready:true,courseId:'course'})},
  '../../hooks/usePurchases':{__esModule:true,default:()=>({isChapterOwned:()=>false,refresh(){}})},
  '../../hooks/useDownloads':{__esModule:true,default:()=>({isDownloaded:()=>false,getItem:()=>null,refresh(){}})},
  '../../services/authState':{getCurrentUser:()=>null},'../../services/secureNotesService':{},'../../utils/videoLink':{},'../../utils/videoDiagnostics':{traceVideo(){}},'../../utils/logger':{logError(){}},
  ['../../services/'+service]:{},
 };
 for(const component of ['PurchaseOwnershipStatus','LoadError','YearCard','SubjectCard','ChapterCard','NoteCard','TestCard','VideoCard','EmptyState','ErrorState','SearchBar','UnlockOptionsPanel'])mocks['../../components/'+component]={__esModule:true,default:component};
 for(const [file,key]of [['colors','COLORS'],['fonts','FONT'],['spacing','SPACING']])mocks['../../theme/'+file]={[key]:{}};
 const Screen=load('mobile-app/src/screens/'+name+'.tsx',mocks).default;
 const tree=nodes(Screen());
 if(state==='loading') assert.ok(tree.some(n=>n.type==='Spinner'));
 else if(state==='error') {
  const error=tree.find(n=>['LoadError','ErrorState'].includes(n.type));assert.ok(error,name);
  (error.props.retry||error.props.onRetry)();assert.equal(retried,1);assert.ok(!tree.some(n=>n.type==='List'));
 } else {
  const list=tree.find(n=>n.type==='List');assert.ok(list,name);assert.equal(list.props.data.length,state==='rows'?1:0);
  assert.ok(list.props.ListEmptyComponent);assert.equal(list.props.refreshing,false);
  list.props.onRefresh();assert.equal(retried,1);
 }
}
console.log('PASS all six list screens: loading, error and Retry, genuine empty, populated and pull-to-refresh');

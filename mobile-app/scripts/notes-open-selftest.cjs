const assert=require('node:assert/strict');const {harness,load,jsx,nodes,tick}=require('./ui-harness.cjs');
(async()=>{
 const h=harness();let focus,blur,resolve,user='buyer',reads=0,opens=0;
 const note={id:'n',title:'Notes',isFreePreview:true};
 const mocks={react:h.react,'react/jsx-runtime':jsx,'react-native':{View:'View',Text:'Text',FlatList:'List',ActivityIndicator:'Spinner',Alert:{alert(){}},StyleSheet:{create:x=>x}},'@react-navigation/native':{useRoute:()=>({params:{chapterId:'c',subjectId:'s',yearId:'y'}}),useNavigation:()=>({navigate:()=>opens++}),useFocusEffect:fn=>{focus=fn;}},'../../navigation/withRouteValidation':{withRouteValidation:s=>s},'../../hooks/useLoadResource':{__esModule:true,default:()=>({value:[note],loading:false,error:false,retry(){}})},'../../hooks/useDownloads':{__esModule:true,default:()=>({isDownloaded:()=>false,getItem:()=>null})},'../../services/notesService':{},'../../services/authState':{getCurrentUser:()=>({id:user})},'../../services/secureNotesService':{NoteAccessError:class extends Error{},getSecureNoteUrl:()=>{reads++;return new Promise(r=>resolve=r);}},'../../utils/logger':{logError(){}}};
 for(const name of ['LoadError','NoteCard','EmptyState','SearchBar','UnlockOptionsPanel'])mocks['../../components/'+name]={__esModule:true,default:name};
 for(const [file,key]of [['colors','COLORS'],['fonts','FONT'],['spacing','SPACING']])mocks['../../theme/'+file]={[key]:{}};
 const Screen=load('mobile-app/src/screens/notes/NotesScreen.tsx',mocks).default;
 const render=()=>nodes(h.render(Screen)).find(n=>n.type==='List').props.renderItem({item:note}).props.onPress;
 let press=render();blur=focus();press();press();assert.equal(reads,1);blur();resolve('https://fixture.invalid');await tick();assert.equal(opens,0);
 press=render();blur=focus();press();user='other';resolve('https://fixture.invalid');await tick();assert.equal(opens,0);
 press=render();press();resolve('https://fixture.invalid');await tick();assert.equal(opens,1);blur();
 console.log('PASS note double tap, navigation blur and account switch cannot launch stale signed PDF');
})().catch(e=>{console.error(e);process.exitCode=1;});

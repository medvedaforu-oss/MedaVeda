const assert=require('node:assert/strict');const {harness,load,jsx,nodes,tick}=require('./ui-harness.cjs');
(async()=>{
 const h=harness();let focus,blur,resolve,user='buyer',reads=0,opens=0;
 const note={id:'n',title:'Notes',isFreePreview:true};
 const mocks={react:h.react,'react/jsx-runtime':jsx,'react-native':{View:'View',Text:'Text',FlatList:'List',ActivityIndicator:'Spinner',Alert:{alert(){}},StyleSheet:{create:x=>x}},'@react-navigation/native':{useRoute:()=>({params:{chapterId:'c',subjectId:'s',yearId:'y'}}),useNavigation:()=>({navigate:()=>opens++}),useFocusEffect:fn=>{focus=fn;}},'../../navigation/withRouteValidation':{withRouteValidation:s=>s},'../../hooks/useLoadResource':{__esModule:true,default:()=>({value:[note],loading:false,error:false,retry(){}})},'../../hooks/usePurchases':{__esModule:true,default:()=>({isChapterOwned:()=>false,refresh(){},loading:false,error:null})},'../../hooks/useDownloads':{__esModule:true,default:()=>({isDownloaded:()=>false,getItem:()=>null})},'../../services/notesService':{},'../../features/sharing/ContentShareButton':{__esModule:true,default:'ShareButton'},'../../services/authState':{getCurrentUser:()=>({id:user})},'../../services/secureNotesService':{NoteAccessError:class extends Error{},getSecureNoteUrl:()=>{reads++;return new Promise(r=>resolve=r);}},'../../utils/logger':{logError(){}}};
 for(const name of ['PurchaseOwnershipStatus','LoadError','NoteCard','EmptyState','SearchBar','UnlockOptionsPanel'])mocks['../../components/'+name]={__esModule:true,default:name};
 for(const [file,key]of [['colors','COLORS'],['fonts','FONT'],['spacing','SPACING']])mocks['../../theme/'+file]={[key]:{}};
 const Screen=load('mobile-app/src/screens/notes/NotesScreen.tsx',mocks).default;
 const render=()=>nodes(h.render(Screen)).find(n=>n.type==='List').props.renderItem({item:note}).props.onPress;
 let press=render();blur=focus();press();press();assert.equal(reads,1);blur();resolve('https://fixture.invalid');await tick();assert.equal(opens,0);
 press=render();blur=focus();press();user='other';resolve('https://fixture.invalid');await tick();assert.equal(opens,0);
 press=render();press();resolve('https://fixture.invalid');await tick();assert.equal(opens,1);blur();
 press=render();blur=focus();press();const stale=resolve;blur();
 press=render();blur=focus();press();const latest=resolve;const before=reads;
 stale('https://stale.invalid');await tick();assert.equal(opens,1);
 press();assert.equal(reads,before,'old finally must not release the new request guard');
 latest('https://latest.invalid');await tick();assert.equal(opens,2);blur();
 console.log('PASS note double tap, blur/refocus and account switch cannot launch stale signed PDF');
})().catch(e=>{console.error(e);process.exitCode=1;});

const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {harness,load,jsx,nodes,tick}=require('./ui-harness.cjs');
const root=path.resolve(__dirname,'../..');
// Original Question Papers entry remains in Home Quick Access.
const home=fs.readFileSync(path.join(root,'mobile-app/src/screens/home/HomeScreen.tsx'),'utf8');
assert.match(home, /title="Question Papers"/);
assert.match(home, /navigation\.navigate\("QuestionPaperYears"\)/);
let account='first',listener;const h=harness();
const hook=load('mobile-app/src/features/question-papers/usePaperResource.ts',{
 react:h.react,'react-native':{AppState:{currentState:'active',addEventListener:()=>({remove(){}})}},'@react-navigation/native':{useFocusEffect:cb=>h.react.useEffect(cb,[cb])},
 '../../services/authState':{getCurrentUser:()=>account?{id:account}:null,subscribeAuthUser:cb=>{listener=cb;return()=>{listener=null;};}},
}).default;
let scope='subject1',resolvers=[];const loader=()=>new Promise(resolve=>resolvers.push(resolve));
const render=()=>h.render(()=>hook(scope,loader));
(async()=>{
 render();resolvers[0]('old');await tick();assert.equal(render().value,'old');
 scope='subject2';assert.equal(render().value,undefined);resolvers[1]('new');await tick();assert.equal(render().value,'new');
 render().retry();render();scope='subject3';render();
 resolvers[2]('stale');await tick();assert.equal(render().value,undefined);
 resolvers[3]('third');await tick();assert.equal(render().value,'third');
 account='second';listener();assert.equal(render().value,undefined);
 account='';listener();render();assert.match(render().error,/sign in/i);
 h.unmount();assert.equal(listener,null);
 const navigated=[];const session=load('mobile-app/src/features/question-papers/screens/QuestionPaperSessionsScreen.tsx',{
 react:{useCallback:f=>f,useMemo:f=>f(),useState:v=>[v,()=>{}],memo:f=>f},'react/jsx-runtime':jsx,'react-native':{Text:'Text',SectionList:'List',Platform:{OS:'android'}},
 '../../../hooks/useCourseYear':{__esModule:true,default:()=>({courseId:'c'})},
 '../PaperLayout':{__esModule:true,default:'Layout',PaperCard:'PaperCard',PaperEmpty:'PaperEmpty',paperStyles:{}},'../usePaperResource':{__esModule:true,default:()=>({loading:false,value:[{exam_year:2025,exam_month:6,papers:[{id:'p',exam_year:2025,exam_month:6,paper_number:'ii',paper_type:'theory'}]}]})},
 '../presentation':load('mobile-app/src/features/question-papers/presentation.ts',{}),'../service':{groupSessions:()=>[],listPapers:async()=>[]},'../types':{MONTHS:['January','February','March','April','May','June']},
 }).default({route:{params:{subjectId:'s',subjectTitle:'Anatomy',courseId:'c'}},navigation:{navigate:(...args)=>navigated.push(args)}});
 const row=nodes(session).find(n=>n.type==='PaperCard');assert.ok(row);row.props.onPress();assert.equal(navigated[0][0],'QuestionPaperPdf');assert.equal(navigated[0][1].paperId,'p');
 console.log('PASS Question Papers Home entry, stale request/account invalidation, exam session → full PDF navigation');
})().catch(e=>{console.error(e);process.exitCode=1});

// Shared layout, states and reader actions (formerly the redesign suite).
{
const rn = Object.fromEntries(['ActivityIndicator','Text','View','ScrollView','TouchableOpacity'].map(n=>[n,n]));
rn.Platform = { OS: 'android' }; rn.StyleSheet = { create: s=>s };
let offline = false;
const ui = load('mobile-app/src/features/question-papers/PaperLayout.tsx', {
  'react/jsx-runtime': jsx, 'react-native': rn,
  '@react-native-community/netinfo':{useNetInfo:()=>({isConnected:!offline})},
  '@expo/vector-icons':{Ionicons:'Icon'},
  '../../theme/colors':{COLORS:{}}, '../../theme/spacing':load('mobile-app/src/theme/spacing.ts', {}),
  '../../theme/fonts':{FONT:{}}, '../../theme/radius':{RADIUS:{}},
});
let calls=0;
const props={title:'Question Papers',loading:false,retry:()=>calls++};
assert(nodes(ui.default({...props,title:'Academic years'})).some(n=>n.props.accessibilityRole==='header' && n.props.children==='Academic years'));
assert(!nodes(ui.default(props)).some(n=>n.type===ui.PaperButton),'Successful lists need no Refresh or Retry button');
assert.equal(ui.paperStyles.body.maxWidth,840,'Wide list content should have a readable maximum width');
assert.equal(ui.paperStyles.cardContent.minWidth,0,'Long subject names must shrink within the row');
const failure=nodes(ui.default({...props,error:'Network failure'}));
failure.find(n=>n.type===ui.PaperButton).props.onPress();assert.equal(calls,1);
assert(failure.some(n=>n.props.accessibilityRole==='alert' && n.props.children==='Network failure'));
assert(nodes(ui.default({...props,loading:true})).some(n=>n.type==='ActivityIndicator'));
assert.equal(ui.PaperOffline(),null);offline=true;
assert.equal(ui.PaperOffline().props.accessibilityLabel,'Offline');
const disabled=ui.PaperButton({title:'Download',onPress(){},disabled:true});
assert.equal(disabled.props.disabled,true);assert.equal(disabled.props.accessibilityState.disabled,true);
let opened=0;ui.PaperCard({title:'Paper',onPress:()=>opened++}).props.onPress();assert.equal(opened,1);

const h=harness();let value=[];const navigated=[];let retries=0;
const subjectUI=load('mobile-app/src/features/question-papers/screens/QuestionPaperSubjectsScreen.tsx',{
  react:h.react,'react/jsx-runtime':jsx,
  '../../../hooks/useCourseYear':{__esModule:true,default:()=>({courseId:'c'})},
  '../presentation':load('mobile-app/src/features/question-papers/presentation.ts',{}),'../../../services/subjectsService':{fetchSubjectsByYear:async()=>[]},
  '../PaperLayout':{__esModule:true,default:'Layout',PaperCard:'Card',PaperEmpty:'Empty'},
  '../usePaperResource':{__esModule:true,default:()=>({loading:false,value,retry:()=>retries++})},
});
const params={yearId:'y',yearTitle:'First year',courseId:'c'};
const navigation={goBack(){},navigate:(...args)=>navigated.push(args)};
const render=()=>h.render(()=>subjectUI.default({route:{params},navigation}));
let tree=render();assert(nodes(tree).some(n=>n.type==='Empty'));
tree.props.retry();assert.equal(retries,1);
value=[{id:'s',title:'Samhita Adhyayan — संहिता अध्ययन'}];
const row=nodes(render()).find(n=>n.type==='Card');row.props.onPress();
assert.equal(navigated[0][0],'QuestionPaperSessions');
assert.equal(navigated[0][1].subjectId,'s');assert.equal(navigated[0][1].yearId,'y');assert.equal(navigated[0][1].courseId,'c');
assert.equal(row.props.title,value[0].title);
h.unmount();
console.log('PASS restored loading/error/offline states, retry/buttons and exact subject navigation params');

(async()=>{
 let downloads=0,retried=0,shares=0,valid=true;
 rn.Platform.OS='android';rn.Share={share:async content=>{assert.equal(content.message,'Study Paper on MedVeda.\n\nOpen in MedVeda:\nhttps://www.medveda.in/question-paper/11111111-1111-4111-8111-111111111111');assert(!JSON.stringify(content).includes('signed-url'));shares++;}};rn.Alert={alert(){throw Error('Unexpected share failure');}};
 const Toolbar=load('mobile-app/src/features/question-papers/PaperReaderToolbar.tsx',{
  'react/jsx-runtime':jsx,'react-native':rn,'../../theme/colors':{COLORS:{}},
  './PaperLayout':{...ui},'./questionPaperLinks':require('../src/features/question-papers/questionPaperLinks.js'),
 }).default;
 const pdf={paperId:'11111111-1111-4111-8111-111111111111',value:'signed-url',loading:false,busy:false,download:()=>downloads++,retry:()=>retried++,isCurrent:()=>valid};
 const buttons=tree=>nodes(tree).filter(n=>n.type===ui.PaperButton);
 const toolbar=Toolbar({title:'Paper',pdf});
 assert(!nodes(toolbar).some(n=>n.props.accessibilityRole==='header'),'The native reader header owns the title');
 const tools=buttons(toolbar);
 assert(!tools.some(n=>n.props.title==='Back'),'The native header owns Back');
 tools.find(n=>n.props.title==='Download paper').props.onPress();assert.equal(downloads,1);
 const share=tools.find(n=>n.props.title==='Share paper link');
 share.props.onPress();await Promise.resolve();assert.equal(shares,1);
 valid=false;share.props.onPress();await Promise.resolve();assert.equal(shares,1,'Stale account/course links cannot be shared');
 const busy=buttons(Toolbar({title:'Paper',pdf:{...pdf,busy:true}}));
 assert(busy.every(action=>action.props.disabled));
 const error=nodes(Toolbar({title:'Paper',pdf:{...pdf,error:'Expired'}}));
 error.find(n=>n.type===ui.PaperButton && n.props.title==='Retry').props.onPress();assert.equal(retried,1);
 assert(error.some(n=>n.props.accessibilityRole==='alert' && n.props.children==='Expired'));
 rn.Platform.OS='web';
 assert.equal(buttons(Toolbar({title:'Paper',pdf})).find(n=>n.props.title==='Share paper link').props.disabled,true);
 console.log('PASS reader compact toolbar/download/retry/share actions, busy state and stale-share protection');
})().catch(error=>{console.error(error);process.exitCode=1;});

}

const assert = require('node:assert/strict');
const { harness, load, jsx, nodes } = require('./ui-harness.cjs');
let active = harness(), timer;
const attempts = [];
const react = Object.fromEntries(['useState','useRef','useCallback','useEffect'].map(name => [name, (...args) => active.react[name](...args)]));
const test = { id:'quiz', title:'Test', questionRevision:3, questions:[{question:'Q1',options:['A','B']},{question:'Q2',options:['C','D']}] };
const mocks = {
  react, 'react/jsx-runtime':jsx,
  'react-native':{View:'View',Text:'Text',ScrollView:'Scroll',TouchableOpacity:'Button',ActivityIndicator:'Spinner',StyleSheet:{create:x=>x}},
  '@react-navigation/native':{useRoute:()=>({params:{test,subjectId:'subject',subjectTitle:'Subject'}}),useNavigation:()=>({goBack(){}})},
  '../../services/authState':{getCurrentUser:()=>({id:'student'})}, '../../utils/logger':{logError(){}},
  '../../services/quizAttempts':{getLocalQuizAttempts:()=>[],recordQuizAttempt:input=>{attempts.push(input);return `attempt-${attempts.length}`;}},
  '../../config/database':{OFFLINE_DB_SUPPORTED:true}, '../../utils/downloadManager':{},
};
for(const name of ['EmptyState','OptionCard','ProgressBar','motion/SuccessBurst']) mocks['../../components/'+name]={__esModule:true,default:name};
for(const [file,key] of [['colors','COLORS'],['fonts','FONT'],['spacing','SPACING'],['radius','RADIUS']]) mocks['../../theme/'+file]={[key]:{}};
const Screen = load('mobile-app/src/screens/quiz/QuizScreen.tsx',mocks,{setInterval:()=>1,clearInterval(){},setTimeout:fn=>{timer=fn;return 1;},clearTimeout(){}}).default;
const session = active.render(Screen); active.unmount(); active=harness();
const render=()=>nodes(active.render(()=>session.type(session.props)));
const text = n => nodes(n).filter(x=>x.type==='Text').map(x=>[x.props.children].flat(Infinity).join('')).join(' ');
const button=(tree,label)=>tree.find(n=>n.type==='Button'&&text(n)===label).props.onPress;
const options=tree=>tree.filter(n=>n.type==='OptionCard');
let tree=render(); options(tree)[0].props.onPress(); tree=render();
assert.equal(options(tree)[1].props.disabled,false,'A must not lock B');
options(tree)[1].props.onPress(); tree=render(); button(tree,'Next')(); tree=render();
button(tree,'Previous')(); tree=render(); assert.equal(options(tree)[1].props.isSelected,true);
button(tree,'Next')(); tree=render(); const submit=button(tree,'Submit Test'); submit(); submit(); tree=render();
assert.ok(tree.some(n=>n.type==='Scroll'),'result actions remain scrollable in short windows');
assert.equal(attempts.length,1); assert.deepEqual(Array.from(attempts[0].answers),[1,null]); assert.equal(attempts[0].score,0);
// An old option callback after submission cannot mutate a submitted snapshot.
button(tree,'Restart Test')(); tree=render(); options(tree)[0].props.onPress();
// Immediate selection + navigation/submit must use the latest ref, even before another render.
button(tree,'Next')(); tree=render(); button(tree,'Submit Test')(); tree=render();
assert.equal(attempts.length,2); assert.deepEqual(Array.from(attempts[1].answers),[0,null]);
assert.deepEqual(Array.from(attempts[0].answers),[1,null]);
button(tree,'Restart Test')(); tree=render();
for(let i=0;i<30;i++){timer();tree=render();}
 tree=render(); assert.ok(tree.some(n=>n.type==='Text'&&n.props.children==='Q2'),'existing unanswered-question timeout advances');
active.unmount();
console.log('PASS A → B → next → previous → submit saves B once; restart submits a new immutable attempt; existing timer advances');

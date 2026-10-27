const assert=require('node:assert/strict');
const {harness,load,jsx,nodes}=require('./ui-harness.cjs');
for(const test of [null,{}, {id:'q'}, {id:'q',questions:[null]}, {id:'q',questions:[{}]}, {id:'q',questions:[{question:'Q',options:[null]}]}, {id:'q',questions:[]}, {id:'q',questions:[{question:'Q',options:['A','B']}]}]) {
 const h=harness();const mocks={react:h.react,'react/jsx-runtime':jsx,'react-native':{StyleSheet:{create:x=>x},View:'View',Text:'Text',TouchableOpacity:'Button',ActivityIndicator:'Spinner'},'@react-navigation/native':{useRoute:()=>({params:{test}}),useNavigation:()=>({goBack(){}})},'../../utils/logger':{},'../../services/authState':{},'../../services/quizAttempts':{},'../../config/database':{},'../../utils/downloadManager':{}};
 for(const name of ['EmptyState','OptionCard','ProgressBar','motion/SuccessBurst'])mocks['../../components/'+name]={__esModule:true,default:name};
 for(const [file,key]of [['colors','COLORS'],['fonts','FONT'],['spacing','SPACING'],['radius','RADIUS']])mocks['../../theme/'+file]={[key]:{}};
 const Screen=load('mobile-app/src/screens/quiz/QuizScreen.tsx',mocks).default;const tree=h.render(Screen);
 if(test?.questions?.[0]?.options?.[0]==='A')assert.equal(tree.type.name,'QuizSession');else assert.ok(nodes(tree).some(n=>n.type==='EmptyState'));
 h.unmount();
}
console.log('PASS malformed quiz questions/options show recovery; valid questions mount quiz');

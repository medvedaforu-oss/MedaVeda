const assert=require('node:assert/strict');const {load}=require('./ui-harness.cjs');
const service=load('mobile-app/src/features/question-papers/service.ts',{'../../config/supabase':{supabase:{}},'../../services/authState':{getCurrentUser:()=>({id:'student'})}});
const papers=[{id:'s1',exam_year:2023,exam_month:null,exam_session:'Summer',title:'Kriya Sharir - I'},{id:'s2',exam_year:2023,exam_month:null,exam_session:'Summer',title:'Kriya Sharir - II'},{id:'w',exam_year:2023,exam_month:null,exam_session:'Winter'},{id:'old',exam_year:2023,exam_month:6}];
const groups=service.groupSessions(papers);assert.equal(groups.length,3);assert.equal(groups.find(s=>s.exam_session==='Summer').papers.length,2);
assert.equal(groups.find(s=>s.exam_month===6).papers.length,1);
console.log('PASS Summer and Winter remain separate from each other and legacy months');
const presentation=load('mobile-app/src/features/question-papers/presentation.ts',{});
assert.equal(presentation.sessionLabel(papers[0]),'Summer 2023');
assert.equal(presentation.sessionLabel(papers[3]),'June 2023');
assert.equal(presentation.paperTitle(papers[0]),'Kriya Sharir - I');
const {jsx,nodes}=require('./ui-harness.cjs');
const sessionUI=load('mobile-app/src/features/question-papers/screens/QuestionPaperSessionsScreen.tsx',{
 react:{useCallback:f=>f},'react/jsx-runtime':jsx,'react-native':{Text:'Text',View:'View'},
 '../../../hooks/useCourseYear':{__esModule:true,default:()=>({courseId:'bams'})},
 '../PaperLayout':{__esModule:true,default:'Layout',PaperCard:'Card',PaperEmpty:'Empty',paperStyles:{}},
 '../usePaperResource':{__esModule:true,default:()=>({loading:false,value:service.groupSessions([{...papers[0],paper_type:'phase iii — section b',paper_number:'i'}])})},
 '../service':service,'../presentation':presentation,
}).default;
let destination;
const tree=sessionUI({route:{params:{subjectId:'k1',subjectTitle:'Kriya Sharir (Paper-1)',courseId:'bams'}},navigation:{navigate:(route,params)=>destination={route,params}}});
const card=nodes(tree).find(n=>n.type==='Card');assert.equal(card.props.title,'Kriya Sharir - I');card.props.onPress();assert.equal(destination.params.title,'Kriya Sharir - I · Summer 2023');
console.log('PASS exact student titles, Summer 2023 and existing preview navigation');

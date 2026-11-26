const assert=require('node:assert/strict');const {harness,load,jsx,nodes,tick}=require('../../mobile-app/scripts/ui-harness.cjs');
const h=harness();let validation,saveCount=0;
const Form=load('admin-panel/src/features/question-papers/QuestionPaperForm.tsx',{
 react:h.react,'react/jsx-runtime':jsx,'../../hooks/useDialogFocus':{__esModule:true,default:()=>({current:null})},
 '../../utils/pdfValidation':{validatePdf:()=>new Promise(r=>{validation=r;})},'./types':{MONTHS:['January']},
 './service':{listExamSessions:async()=>['Summer','Winter'],savePaper:async()=>{saveCount++;}},
},{URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}}}).default;
const props={paper:{id:'p',subject_id:'s',exam_year:2025,exam_month:1,paper_type:'',paper_number:'',published:false},
 courses:[{id:'c',name:'Course'}],years:[{id:'y',courseId:'c',title:'Year'}],subjects:[{id:'s',yearId:'y',title:'Subject'}],onClose(){},onSaved(){}};
let tree;const render=()=>tree=h.render(()=>Form(props));
(async()=>{
 render();nodes(tree).find(n=>n.type==='input'&&n.props.type==='file').props.onChange({target:{files:[{type:'application/pdf'}]}});render();
 assert.equal(nodes(tree).find(n=>n.type==='button'&&!n.props.type).props.disabled,true,'cannot save before replacement validation finishes');
 nodes(tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});await tick();assert.equal(saveCount,0);
 validation();await tick();render();render();assert(nodes(tree).some(n=>n.type==='iframe'));
 nodes(tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});await tick();assert.equal(saveCount,1);
 h.unmount();console.log('PASS Admin replacement validation waits before saving and selected PDF preview');
})().catch(e=>{console.error(e);process.exitCode=1});

// Named sessions use a separate examination year; no fabricated month is saved.
(async()=>{
 const state=harness();let saved;
 const SessionForm=load('admin-panel/src/features/question-papers/QuestionPaperForm.tsx',{
  react:state.react,'react/jsx-runtime':jsx,'../../hooks/useDialogFocus':{__esModule:true,default:()=>({current:null})},
  '../../utils/pdfValidation':{validatePdf:async()=>{}},'./types':{MONTHS:['January']},
  './service':{listExamSessions:async()=>['Summer','Winter','Supplementary'],savePaper:async input=>{saved=input;}},
 },{URL:{createObjectURL:()=>'',revokeObjectURL(){}}}).default;
 const paper={...props.paper,exam_month:null,exam_session:'Summer',title:'Kriya Sharir - I'};
 const render=()=>state.render(()=>SessionForm({...props,paper}));
 let tree=render();await tick();tree=render();
 const fields=nodes(tree).filter(n=>n.type==='input');
 const session=fields.find(n=>n.props.list==='qp-exam-sessions');assert.equal(session.props.value,'Summer');
 assert(nodes(tree).some(n=>n.type==='option'&&n.props.value==='Winter'));
 assert(nodes(tree).some(n=>n.type==='option'&&n.props.value==='Supplementary'));
 session.props.onChange({target:{value:'Supplementary'}});tree=render();
 nodes(tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});await tick();
 assert.equal(saved.exam_session,'Supplementary');assert.equal(saved.exam_month,null);assert.equal(saved.exam_year,2025);assert.equal(saved.title,'Kriya Sharir - I');
 state.unmount();console.log('PASS Admin session selection, saved additional sessions, title and separate exam year');
})().catch(e=>{console.error(e);process.exitCode=1});

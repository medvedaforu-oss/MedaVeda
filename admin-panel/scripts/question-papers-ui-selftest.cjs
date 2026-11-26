const assert=require('node:assert/strict');
const {harness,load,jsx,nodes,tick}=require('../../mobile-app/scripts/ui-harness.cjs');
const h=harness();
const paper={id:'paper',subject_id:'s',exam_year:2025,exam_month:6,paper_type:'theory',paper_number:'i',published:false};
let previewCalls=0, resolvePreview;let deferPreview=false;
const mod=load('admin-panel/src/features/question-papers/QuestionPapersPage.tsx',{
 react:h.react,'react/jsx-runtime':jsx,
 '../../services/courseService':{getCourses:async()=>[{id:'c',name:'BAMS'}]},
 '../../services/yearService':{getYears:async()=>[{id:'y',title:'Year',courseId:'c'}]},
 '../../services/subjectService':{getSubjects:async()=>[{id:'s',title:'Subject',yearId:'y'}]},
 './types':{MONTHS:['January','February','March','April','May','June']},
 './service':{listExamSessions:async()=>['Summer','Winter'],PAGE_SIZE:25,listPapers:async()=>({rows:[paper],count:1}),paperUrl:async()=>{previewCalls++;if(deferPreview)return new Promise(resolve=>{resolvePreview=resolve;});return 'https://example.test/qp.pdf';},deletePaper:async()=>{},setPublication:async()=>{}},
 './QuestionPaperForm':{default:'PaperForm'},
},{queueMicrotask,window:{confirm:()=>true}});
(async()=>{
 let tree=h.render(mod.default);await tick();tree=h.render(mod.default);
 const button=label=>nodes(tree).find(n=>n.type==='button'&&n.props.children===label);
 assert(button('Add paper'));assert(button('Preview'));
 button('Preview').props.onClick();button('Preview').props.onClick();await tick();tree=h.render(mod.default);
 assert.equal(previewCalls,1);
 assert(nodes(tree).some(n=>n.type==='iframe'&&n.props.src==='https://example.test/qp.pdf'),'preview must remain visible after signing');
 button('Edit / replace').props.onClick();tree=h.render(mod.default);
 assert(nodes(tree).some(n=>n.props?.paper?.id==='paper'), JSON.stringify(nodes(tree).map(n=>[n.type,n.props?.paper?.id])));
 nodes(tree).find(n=>n.props?.onSaved).props.onSaved();tree=h.render(mod.default);
 assert(!nodes(tree).some(n=>n.type==='iframe'),'replacement must clear old preview');
 deferPreview=true;button('Preview').props.onClick();button('Edit / replace').props.onClick();tree=h.render(mod.default);
 nodes(tree).find(n=>n.props?.onSaved).props.onSaved();resolvePreview('https://example.test/stale.pdf');await tick();tree=h.render(mod.default);
 assert(!nodes(tree).some(n=>n.type==='iframe'),'late preview response cannot restore pre-replacement PDF');
 h.unmount(); console.log('PASS Admin Question Paper page preview and edit integration');
})().catch(e=>{console.error(e);process.exitCode=1});

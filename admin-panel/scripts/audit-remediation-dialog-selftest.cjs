const assert=require('node:assert/strict'),fs=require('node:fs');const {harness,load,jsx,nodes}=require('../../mobile-app/scripts/ui-harness.cjs');
(async()=>{
 for(const [page,collection,remove]of [['Years','years','removeYear'],['Subjects','subjects','removeSubject'],['Chapters','chapters','removeChapter'],['Notes','notes','removeNote'],['Videos','videos','removeVideo'],['Quiz','tests','removeTest']]){
  const h=harness();const mocks={react:h.react,'react/jsx-runtime':jsx};let fail=true,calls=0;
  const data={id:'fixture',title:'Fixture',name:'Fixture',courseId:'c',yearId:'y',subjectId:'s',chapterId:'ch'};
  const result={courses:[],years:[],subjects:[],chapters:[],notes:[],videos:[],tests:[],loading:false,hasLoaded:true,error:null,reload(){},[collection]:[data],[remove]:async()=>{calls++;if(fail)throw Error('Synthetic delete denied')}};
  const source=fs.readFileSync(`admin-panel/src/pages/${page}.tsx`,'utf8');for(const [,id]of source.matchAll(/from ["']([^"']+)["']/g)){
   if(id in mocks)continue;
   if(id.includes('/hooks/'))mocks[id]={__esModule:true,default:()=>result};
   else if(id.includes('/components/'))mocks[id]={__esModule:true,default:id.split('/').pop()};
   else if(id.includes('/services/'))mocks[id]={saveNoteWithUpload(){}};
  }
  const Page=load(`admin-panel/src/pages/${page}.tsx`,mocks).default;const render=()=>nodes(h.render(Page));let tree=render();tree.find(n=>n.props?.onDelete).props.onDelete(data);tree=render();let dialog=tree.find(n=>n.type==='ConfirmDialog');assert(dialog.props.open);await dialog.props.onConfirm();tree=render();dialog=tree.find(n=>n.type==='ConfirmDialog');assert(dialog.props.open);assert.equal(dialog.props.error,'Synthetic delete denied',page);assert.equal(dialog.props.loading,false);fail=false;await dialog.props.onConfirm();assert.equal(render().find(n=>n.type==='ConfirmDialog').props.open,false);assert.equal(calls,2);h.unmount();console.log('PASS in-dialog rejection and successful retry '+page);
 }
})().catch(e=>{console.error(e);process.exitCode=1});

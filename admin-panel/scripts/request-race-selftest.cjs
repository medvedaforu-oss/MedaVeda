const assert=require('node:assert/strict');
const {harness,load,tick}=require('../../mobile-app/scripts/ui-harness.cjs');
(async()=>{
 for(const [name,getter,value]of [['Years','getYears','years'],['Subjects','getSubjects','subjects'],['Chapters','getChapters','chapters'],['Notes','getNotes','notes'],['Videos','getVideos','videos'],['Quiz','getQuizTests','tests'],['Users','getUsers','users'],['Orders','getOrders','orders'],['Products','getProducts','products']]) {
  const h=harness();
  // Preserve callbacks across equal dependencies just as React does.
  h.react.useCallback=(fn,deps)=>{const ref=h.react.useRef();if(!ref.current||deps.some((v,i)=>!Object.is(v,ref.current.deps[i])))ref.current={fn,deps};return ref.current.fn;};
  const guard=load('admin-panel/src/hooks/useRequestGuard.ts',{react:h.react}).default;
  const pending=[];const service={[getter]:()=>new Promise((resolve,reject)=>pending.push({resolve,reject}))};
  const serviceName=name==='Quiz'?'quiz':name.slice(0,-1).toLowerCase();
  const hook=load(`admin-panel/src/hooks/use${name}.ts`,{react:h.react,'./useRequestGuard':{__esModule:true,default:guard},[`../services/${serviceName}Service`]:service}).default;
  const render=courseId=>h.render(()=>hook({courseId}));
  render('old');render('new');assert.equal(pending.length,2,name);
  pending[1].resolve([{id:'new'}]);await tick();pending[0].resolve([{id:'old'}]);await tick();
  assert.equal(render('new')[value][0].id,'new',name);
  let state=render('new');const one=state.reload();const two=state.reload();
  pending[3].resolve([{id:'latest'}]);await two;pending[2].reject(Error('stale'));await one;
  state=render('new');assert.equal(state[value][0].id,'latest');assert.equal(state.error,null);
  const late=state.reload();h.unmount();pending[4].resolve([{id:'unmounted'}]);await late;
 }
 console.log('PASS nine admin list hooks ignore stale scope, overlapping and unmounted responses');
})().catch(e=>{console.error(e);process.exitCode=1;});

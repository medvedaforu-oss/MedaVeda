const assert=require('node:assert/strict');const {harness,load,tick}=require('./ui-harness.cjs');
(async()=>{
 const h=harness();let fetches=[],errors=0,revoked=[];let url='first';
 const hook=load('mobile-app/src/features/question-papers/usePaperWebPreview.ts',{react:h.react,'./download.web':{fetchPaperPdf:(...args)=>new Promise((resolve,reject)=>fetches.push({args,resolve,reject}))}},{URL:{createObjectURL:blob=>'blob:'+blob.name,revokeObjectURL:url=>revoked.push(url)}}).default;
 const render=()=>h.render(()=>hook(url,()=>errors++));
 render();url='second';assert.equal(render().value,undefined);fetches[0].resolve({name:'stale'});await tick();assert.equal(render().value,undefined);
 fetches[1].reject(Error('403'));await tick();assert.equal(errors,1);assert.equal(render().value,undefined);
 url='third';render();fetches[2].resolve({name:'valid'});await tick();assert.equal(render().value,'blob:valid');
 url='fourth';render();assert(revoked.includes('blob:valid'));h.unmount();fetches[3].reject(Error('interrupted'));await tick();assert.equal(errors,1);
 console.log('PASS controlled web preview: HTTP failure, interrupted request, stale response and Blob cleanup');
})().catch(e=>{console.error(e);process.exitCode=1;});

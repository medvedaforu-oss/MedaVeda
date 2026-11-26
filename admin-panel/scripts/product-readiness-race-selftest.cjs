// Run the real Products component and request guard with controlled network delays.
const assert=require('node:assert/strict');
const {harness,load,jsx,nodes,tick}=require('../../mobile-app/scripts/ui-harness.cjs');
const h=harness();
let products=[{id:'p',revision:1,title:'Notes',price:49,active:true,productType:'notes'}];
let reloads=0,timer;const pending=[];const reload=async()=>{reloads++;};
const componentNames=['LookupStatus','CoursePicker','ProductHeader','ProductFilter','ProductTable','ProductFormModal','ConfirmDialog','SearchBar'];
const mocks={'react':h.react,'react/jsx-runtime':jsx,
 '../utils/productCovers':load('admin-panel/src/utils/productCovers.ts',{}),
 '../hooks/useRequestGuard':load('admin-panel/src/hooks/useRequestGuard.ts',{'react':h.react}),
 '../services/playBillingSyncService':{getBillingStatuses:()=>new Promise((resolve,reject)=>pending.push({resolve,reject}))},
 '../hooks/useProducts':{__esModule:true,default:()=>({products,loading:false,hasLoaded:true,error:null,reload})}};
for(const name of componentNames)mocks['../components/'+name]={__esModule:true,default:name};
for(const [name,key] of [['Courses','courses'],['Years','years'],['Subjects','subjects'],['Chapters','chapters']])
 mocks['../hooks/use'+name]={__esModule:true,default:()=>({[key]:[],loading:false,error:null})};
const Products=load('admin-panel/src/pages/Products.tsx',mocks,{setInterval:fn=>{timer=fn;return 1;},clearInterval(){}}).default;
function render(){return nodes(h.render(()=>Products())).find(n=>n.type==='ProductTable').props;}
const status=revision=>({p:{productRevision:revision,status:'ready',message:null,lastSyncedAt:null}});
(async()=>{
 render();pending.shift().resolve(status(2));await tick();
 assert.equal(render().billing.p,undefined,'new server price revision paired with old displayed price');
 assert.equal(reloads,1,'revision mismatch must refresh products');
 products=[{...products[0],revision:2,price:99}];render();
 pending.shift().resolve(status(2));await tick();assert.equal(render().billing.p.status,'ready');
 timer();const old=pending.shift();
 products=[{...products[0],revision:3,active:false}];assert.equal(render().billing.p,undefined);
 old.resolve(status(2));await tick();assert.equal(render().billing.p,undefined,'delayed poll restored Ready after publication change');
 pending.shift().resolve({p:{...status(3).p,status:'catalog_inactive'}});await tick();
 assert.equal(render().billing.p.status,'catalog_inactive');
 timer();const earlier=pending.shift();timer();const later=pending.shift();
 later.resolve({p:{...status(3).p,status:'stale'}});await tick();render();
 earlier.resolve(status(3));await tick();assert.equal(render().billing.p.status,'stale','older poll overwrote newer result');
 timer();pending.shift().resolve(status(4));await tick();assert.equal(render().billing.p,undefined,'concurrent remote edit was accepted');
 timer();pending.shift().reject(new Error('offline'));await tick();assert.equal(render().billing.p,undefined);
 timer();const unmounted=pending.shift();h.unmount();unmounted.resolve(status(3));await tick();
 console.log('PASS readiness races: remote price edit, publication change, concurrent edit, out-of-order polling, failure and unmount');
})().catch(error=>{console.error(error);process.exitCode=1;});

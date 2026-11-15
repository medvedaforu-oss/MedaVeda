const {assert,load,hooks,run,tick,deferred}=require('../../../../mobile-app/__tests__/audit-harness.cjs');
const makeRows=(n,owner='A',percentage=40)=>Array.from({length:n},(_,i)=>({id:String(1000+i),user_id:owner,percentage,created_at:new Date(Date.UTC(2026,10,13)-i*1000).toISOString()}));
async function settle(){for(let i=0;i<12;i++)await tick()}
function setup(initialRows,options={}) {
  const h=hooks(),listeners=new Set();let uid='A',epoch=0,rows=initialRows,writes=0,dataReads=0,countReads=0;
  const react={...h.react,useState(initial){const [value,set]=h.react.useState(initial);return[value,next=>{writes++;set(next)}]}};
  const db={rpc:async()=>({data:null,error:{code:'PGRST202',message:'get_my_verified_quiz_stats missing'}}),from(table){let head=false,size=1000,after=null,max=null,orders=[],filters=[];
    const q={select(columns,opts){head=opts?.head===true;return q},eq(k,v){filters.push([k,v]);return q},order(k,o){orders.push([k,o]);return q},limit(v){size=v;return q},range(a,b){q.offset=a;size=b-a+1;return q},lt(k,v){after=[k,v,false];return q},gt(k,v){after=[k,v,true];return q},lte(k,v){max=[k,v];return q},or(){return q},then(resolve,reject){
      if(table==='quiz_scores')return Promise.resolve({count:3,error:null}).then(resolve,reject);
      let found=rows.filter(r=>filters.every(([k,v])=>r[k]===v));
      if(after)found=found.filter(r=>after[2]?r[after[0]]>after[1]:r[after[0]]<after[1]);
      if(max)found=found.filter(r=>r[max[0]]<=max[1]);
      if(head){countReads++;return Promise.resolve({count:options.count?.(countReads,found.length)??found.length,error:null,data:null}).then(resolve,reject)}
      for(const[k,o]of [...orders].reverse())found.sort((a,b)=>(a[k]<b[k]?-1:a[k]>b[k]?1:0)*(o?.ascending===false?-1:1));
      const result={data:found.slice(q.offset||0,(q.offset||0)+Math.min(size,250)),error:null};
      if(size!==1){dataReads++;return Promise.resolve(options.page?.(dataReads,result)??result).then(resolve,reject)}
      return Promise.resolve(result).then(resolve,reject);
    }};return q}};
  const hook=load('src/hooks/useQuizStats.ts',{'react':react,'../config/supabase':{supabase:db},'../services/authState':{getCurrentUser:()=>uid?{id:uid}:null,getAuthEpoch:()=>epoch,subscribeAuthUser:callback=>{listeners.add(callback);return()=>listeners.delete(callback)}},'../utils/logger':{logError(){}}}).default;
  const view=()=>h.render(hook);view();
  return {view,unmount:()=>h.unmount(),changeOwner(id){uid=id;epoch++;for(const callback of [...listeners])callback()},setRows(next){rows=next},reads:()=>dataReads,writes:()=>writes,listeners};
}
run(async()=>{const s=setup(makeRows(5001));await settle();assert.match(s.view().error,/Could not load/,'large lifetime scan must fail explicitly');assert.equal(s.reads(),0,'do not scan a large history');assert.equal(s.view().totalAttempts,0,'never claim capped history as lifetime');s.unmount();console.log('PASS MOB17 bounded large history fails explicitly before pages');});

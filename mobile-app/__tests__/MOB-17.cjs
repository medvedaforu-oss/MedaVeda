const {assert,load,hooks,run,tick,deferred}=require('./audit-harness.cjs');
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
const cases={
  async cap(){const rows=makeRows(601);rows[600].percentage=100;const s=setup(rows);await settle();const result=s.view();assert.equal(result.error,null);assert.equal(result.totalAttempts,601,'all verified rows count beyond 250-row backend cap');assert.equal(result.bestScore,100,'older best result included');assert.equal(result.averagePercentage,40);assert.equal(result.recentQuiz.length,5);assert.ok(s.reads()>=3,'stable paging spans backend cap');s.unmount()},
  async aba(){const held=deferred();const s=setup(makeRows(2),{page:(n,result)=>n===1?held.promise:result});await settle();assert.equal(s.reads(),1,'old owner page is deferred');assert.equal(s.listeners.size,1,'real auth subscription installed');s.changeOwner('B');await settle();assert.equal(s.view().totalAttempts,0,'owner callback clears previous statistics');s.setRows(makeRows(1,'A',90));s.changeOwner('A');await settle();assert.equal(s.view().bestScore,90);held.resolve({data:makeRows(2,'A',10),error:null});await settle();assert.equal(s.view().totalAttempts,1,'old lifetime cannot publish after A to B to A');assert.equal(s.view().bestScore,90);s.unmount();assert.equal(s.listeners.size,0,'unmount removes auth subscription')},
  async unmount(){const held=deferred();const s=setup(makeRows(2),{page:()=>held.promise});await settle();assert.equal(s.reads(),1);s.unmount();const writes=s.writes();held.resolve({data:makeRows(2),error:null});await settle();assert.equal(s.writes(),writes,'deferred page cannot set state after unmount');assert.equal(s.listeners.size,0)},
  async refresh(){const held=deferred();const s=setup(makeRows(2),{page:(n,result)=>n===1?held.promise:result});await settle();s.setRows(makeRows(1,'A',75));await s.view().refresh();assert.equal(s.view().bestScore,75);held.reject(Error('late old refresh failure'));await settle();assert.equal(s.view().totalAttempts,1);assert.equal(s.view().bestScore,75);assert.equal(s.view().error,null,'superseded request cannot publish late error');assert.equal(s.view().loading,false);s.unmount()},
  async pageError(){const s=setup(makeRows(251),{page:(n,result)=>n===2?{data:null,error:Error('page unavailable')}:result});await settle();assert.equal(s.reads(),2);assert.match(s.view().error,/Could not load/);assert.equal(s.view().totalAttempts,0,'partial scan never publishes lifetime total');assert.equal(s.view().loading,false);s.unmount()},
  async countMismatch(){const s=setup(makeRows(2),{count:(n,count)=>n===1?count:count+1});await settle();assert.match(s.view().error,/Could not load/);assert.equal(s.view().totalAttempts,0,'changed count fails closed');assert.equal(s.view().loading,false);s.unmount()},
  async shortScan(){const s=setup(makeRows(2),{count:()=>3});await settle();assert.match(s.view().error,/Could not load/);assert.equal(s.view().totalAttempts,0,'empty page before declared count fails closed');s.unmount()},
};
run(async()=>{const failures=[];for(const [name,test]of Object.entries(cases)){if(process.env.MOB17_CASE&&process.env.MOB17_CASE!==name)continue;try{await test();console.log('PASS MOB-17 '+name)}catch(error){console.error('FAIL MOB-17 '+name,error);failures.push(name)}}assert.deepEqual(failures,[])});

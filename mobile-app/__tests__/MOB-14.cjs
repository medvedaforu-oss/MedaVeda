const {assert,load,run,deferred,tick}=require('./audit-harness.cjs');
function setup(rows,fail=true,options={}) {
  let uid='B',epoch=0,now=Date.UTC(2026,10,13);const writes=[],remote=[];
  class Clock extends Date {static now(){return now}}
  const db={getAllSync:()=>rows,runSync:(sql,args)=>writes.push([sql,args])};
  const query=(table,op,payload)=>{const entry={table,op,payload,filters:[],headers:{}};
    const q={eq(k,v){entry.filters.push([k,v]);return q},setHeader(k,v){entry.headers[k]=v;return q},then(resolve,reject){
      remote.push(entry);options.onDispatch?.(()=>{uid='B';epoch++});
      return Promise.resolve({data:{status:'verified',score:1,total:1},error:fail?new Error('offline'):null}).then(resolve,reject);
    }};return q};
  const engine=load('src/services/syncEngine.ts',{'@react-native-community/netinfo':{default:{fetch:async()=>({isConnected:true,isInternetReachable:true})},__esModule:true},'../config/database':{getDb:()=>db,OFFLINE_DB_SUPPORTED:true},'../config/supabase':{supabase:{auth:{getSession:async()=>options.session?options.session():{data:{session:{user:{id:uid},access_token:'owner-'+uid}},error:null}},from:table=>({upsert:payload=>query(table,'upsert',payload),delete:()=>query(table,'delete')}),rpc:(name,payload)=>query(name,'rpc',payload)}},'../utils/logger':{logDebug(){}},'./authState':{getCurrentUser:()=>({id:uid}),getAuthEpoch:()=>epoch}},{Date:Clock});
  return{engine,writes,remote,owner(id){uid=id;epoch++},advanceDay(){now+=24*60*60*1000}};
}
const row=(entity,operation='upsert')=>({queue_id:'q-'+entity,entity_type:entity,operation,payload:JSON.stringify({id:'b',attempt_id:'b',user_id:'A',answers:[],question_revision:1}),created_at:1,attempt_count:4});
const synced=s=>s.writes.filter(([sql])=>sql.includes('SET synced_at'));
run(async()=>{
  const all=['bookmark','reading_progress','watch_history','quiz_attempt'];const foreign=setup(all.map(e=>row(e)));await foreign.engine.drainQueue();assert.equal(foreign.remote.length,0,'every entity rejects foreign owner');assert.equal(foreign.writes.length,0,'foreign rows remain untouched');
  for(const entity of ['quiz_attempt']) {
    const s=setup([row(entity)]);s.owner('A');await s.engine.drainQueue();await s.engine.drainQueue();assert.equal(s.remote.length,1,entity+' immediate drain respects cooldown');
    for(let attempt=1;attempt<6;attempt++){s.advanceDay();await s.engine.drainQueue()}
    assert.equal(s.remote.length,6,entity+' retries actual remote failures beyond five attempts after time advances');assert.equal(synced(s).length,0,entity+' never marks failed write synced');assert.equal(s.writes.filter(([sql])=>sql.includes('attempt_count = attempt_count + 1')).length,6,entity+' retains retry error');
    for(const entry of s.remote)assert.equal(entry.headers.Authorization,'Bearer owner-A',entity+' dispatch binds initiating bearer');
  }
  const progress=setup([row('reading_progress')],false);progress.owner('A');await progress.engine.drainQueue();assert.equal(progress.remote.length,0,'progress fails closed without non-atomic upsert');assert.ok(progress.writes.some(([sql,args])=>sql.includes('attempt_count')&&/Unsupported legacy/.test(args[0])),'progress remains pending with dependency error');
  for(const entity of ['bookmark','watch_history']){const s=setup([row(entity,'delete')],false);s.owner('A');await s.engine.drainQueue();assert.equal(s.remote.length,0,'removed legacy path never dispatches');assert.equal(synced(s).length,0,'unsupported row retained for repair');}
  const held=deferred();const stale=setup([row('bookmark')],false,{session:()=>held.promise});stale.owner('A');const drain=stale.engine.drainQueue();await tick();stale.owner('B');stale.owner('A');held.resolve({data:{session:{user:{id:'A'},access_token:'old-A'}},error:null});await drain;assert.equal(stale.remote.length,0,'ABA while session is pending cannot dispatch');assert.equal(stale.writes.length,0,'stale lifetime cannot acknowledge or alter queue');
  for(const entity of ['quiz_attempt'])for(const operation of entity==='quiz_attempt'?['upsert']:['upsert','delete']) {
    const s=setup([row(entity,operation)],false,{onDispatch:change=>change()});s.owner('A');await s.engine.drainQueue();assert.equal(s.remote.length,1);assert.equal(s.remote[0].headers.Authorization,'Bearer owner-A','dispatch retains captured bearer even when account changes before response');assert.equal(synced(s).length,0,'old owner response cannot acknowledge queue');
  }
});

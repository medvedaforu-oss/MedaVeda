const {assert,load,run}=require('./audit-harness.cjs');
run(async()=>{let rows=[],inTx=false,drains=0,fail=true;
 const db={withTransactionSync(fn){const saved=[...rows];inTx=true;try{fn()}catch(e){rows=saved;throw e}finally{inTx=false}},runSync(sql,args){if(sql.includes('sync_queue')&&fail)throw Error('injected outbox disk failure');rows.push(sql.includes('sync_queue')?'outbox':'attempt')}};
 const queue=(...args)=>{db.runSync('INSERT INTO sync_queue',args);if(!inTx)drains++};
 const m=load('src/services/quizAttempts.ts',{'../config/database':{OFFLINE_DB_SUPPORTED:true,getDb:()=>db},'./syncEngine':{queueForSync:queue,enqueueForSync:(...args)=>db.runSync('INSERT INTO sync_queue',args),drainQueue:async()=>{assert.equal(inTx,false,'drain must follow commit');drains++}},'../utils/logger':{logDebug(){}}});
 const input={quizId:'q',userId:'A',score:1,totalQuestions:1,answers:[0],questionRevision:1};
 assert.throws(()=>m.recordQuizAttempt(input),/injected/);assert.deepEqual(rows,[],'outbox failure must roll back the local attempt');
 fail=false;m.recordQuizAttempt(input);await Promise.resolve();assert.deepEqual(rows,['attempt','outbox']);assert.equal(drains,1);
});

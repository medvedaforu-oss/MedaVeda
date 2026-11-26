const assert = require('node:assert/strict');
const fs = require('node:fs');
const { load, tick } = require('./ui-harness.cjs');
const file = 'mobile-app/src/features/question-papers/paperLinkQueue.ts';
const queueModule = fs.existsSync(file) ? load(file, {}) : {};
assert.equal(typeof queueModule.PaperLinkQueue, 'function', 'Auth-gated Question Paper queue is required');
const { PaperLinkQueue } = queueModule;
const id = '11111111-1111-4111-8111-111111111111';
const second = '22222222-2222-4222-8222-222222222222';
let now = 100000, owner = null, ready = false, active = true, calls = [], errors = [], loads = [];
const q = new PaperLinkQueue(() => now);
const ports = {
 context: () => ({ owner, ready: ready && active, courseId: 'course' }),
 resolve: paperId => new Promise((resolve, reject) => loads.push({ paperId, resolve, reject })),
 open: destination => calls.push(destination),
 error: (message, retry) => errors.push({ message, retry }),
};
async function process() { const promise = q.process(ports); await tick(); return { promise }; }
(async () => {
 q.receive({id}, owner); await q.process(ports); assert.equal(loads.length, 0, 'Cold launch waits for initialization');
 ready = true; await q.process(ports); assert.equal(loads.length, 0, 'Logged-out destination waits for login');
 owner = 'A'; q.accountChanged(owner); const first = await process(); assert.equal(loads[0].paperId, id);
 q.receive({id}, owner); await q.process(ports); assert.equal(loads.length, 1, 'Repeated pending links coalesce');
 loads[0].resolve({paperId:id,title:'Paper'}); await first.promise;
 assert.equal(calls.length,1); assert.equal(calls[0].courseId,'course'); assert.equal(q.pending, null);
 now += 2000; q.receive({id}, owner); const stale = await process();
 owner = 'B'; q.accountChanged(owner); loads[1].resolve({paperId:id,title:'A only'}); await stale.promise;
 assert.equal(calls.length,1,'In-flight response never crosses accounts'); assert.equal(q.pending,null);
 now += 2000; q.receive({id},owner); const a = await process();
 now += 2000; q.receive({id:second},owner); loads[2].resolve({paperId:id,title:'Old'}); await a.promise;
 assert.equal(calls.length,1,'Superseded destination cannot navigate');
 const b = await process(); loads[3].resolve({paperId:second,title:'Newest'}); await b.promise; assert.equal(calls.at(-1).paperId,second);
 now += 2000; q.receive({id},owner); const denied = await process();
 const failure = Error('Question Paper unavailable'); failure.definitive = true; loads[4].reject(failure); await denied.promise;
 assert.equal(q.pending,null); assert.equal(errors.at(-1).retry,undefined);
 now += 2000; q.receive({id},owner); const network = await process(); loads[5].reject(Error('Check connection')); await network.promise;
 assert(q.pending); assert.equal(typeof errors.at(-1).retry,'function'); await q.process(ports); assert.equal(loads.length,6,'No retry loop');
 errors.at(-1).retry(); const retry = await process(); loads[6].resolve({paperId:id,title:'Retry'}); await retry.promise; assert.equal(q.pending,null);
 now += 2000; q.receive({invalid:true},owner); await q.process(ports); assert.equal(q.pending,null); assert.match(errors.at(-1).message,/invalid/i);
 now += 2000; q.receive({id},owner); owner=null; q.accountChanged(owner); assert.equal(q.pending,null,'Sign-out clears destination');
 q.receive({id},owner); owner='C'; q.accountChanged(owner); now += 86400001; await q.process(ports); assert.equal(q.pending,null,'Expired login intent is cleared');
 now += 2000; q.receive({id},owner); active=false; await q.process(ports); const count=loads.length; active=true;
 const resume=await process(); assert.equal(loads.length,count+1); loads.at(-1).resolve({paperId:id,title:'Resume'});await resume.promise;
 console.log('PASS cold/warm/background gating, login continuation, coalescing, account isolation, supersession, errors/retry and expiration');
})().catch(error => { console.error(error); process.exitCode = 1; });

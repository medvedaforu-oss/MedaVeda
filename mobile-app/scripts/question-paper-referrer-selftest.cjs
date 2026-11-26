const assert = require('node:assert/strict');
const fs = require('node:fs');
const { load } = require('./ui-harness.cjs');
const codec = require('../src/features/question-papers/questionPaperLinks.js');
const file = 'mobile-app/src/features/question-papers/deferredPaperLink.ts';
const implementation = fs.existsSync(file) ? load(file, {'./questionPaperLinks':codec}) : {};
assert.equal(typeof implementation.readDeferredPaperLink,'function','Existing native Install Referrer integration is required');
const read = implementation.readDeferredPaperLink;
const id='11111111-1111-4111-8111-111111111111', now=1800000000000;
const referral=new URL(codec.paperPlayUrl(id,now)).searchParams.get('referrer');
(async()=>{
 let marker=null, received=[],calls=0,current=true;
 const ports={now:()=>now, installedAt:async()=>new Date(now), referrer:async()=>{calls++;return referral;},
 getMarker:async()=>marker,setMarker:async value=>{marker=value;},isCurrent:()=>current,receive:id=>received.push(id)};
 await read(ports);assert.deepEqual(received,[id]);assert.equal(marker,String(now));
 await read(ports);assert.equal(calls,1,'Consumed referral never queried twice');
 marker=null;received=[];current=false;await read(ports);assert.equal(received.length,0,'Direct link or account change supersedes referral');
 marker=null;current=true;await read({...ports,setMarker:async()=>{throw Error('disk full');}});assert.equal(received.length,0,'No navigation without durable consumption');
 await read({...ports,referrer:async()=>{throw Error('Play unavailable');}});assert.equal(received.length,0);
 marker=null;await read({...ports,referrer:async()=> 'referral=REWARD'});assert.equal(received.length,0,'Reward referral is not a paper destination');
 marker=null;await read({...ports,installedAt:async()=>new Date(now-8*86400000)});assert.equal(received.length,0,'Old installs are not redirected');
 marker=null;await read(ports);assert.deepEqual(received,[id],'Fresh installation is independent of an earlier marker');
 console.log('PASS Install Referrer existing API, durable single consumption, unavailable/stale input and direct-link/account precedence');
})().catch(error=>{console.error(error);process.exitCode=1;});

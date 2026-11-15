// Actual mobile repository/service reloaded against synthetic durable server rows.
// No native runtime, network, Supabase Auth or provider requests.
const assert=require('node:assert/strict');
const {load}=require('../../mobile-app/scripts/ui-harness.cjs');
let account='owner';
const rows=[
 {id:'historical-a',user_id:'owner',product_id:'product',status:'success',scope:'chapter',chapter_id:'chapter',course_id:'bams',amount:49},
 {id:'historical-b',user_id:'owner',product_id:'product',status:'success',scope:'chapter',chapter_id:'chapter',course_id:'bams',amount:49},
 ...['refunded','duplicate','disputed','chargeback'].map(status=>({id:status,user_id:'owner',status,scope:'chapter',chapter_id:'denied'})),
 {id:'other-owner',user_id:'other',status:'success',scope:'chapter',chapter_id:'foreign'},
];
const db={from(table){assert.equal(table,'purchases');const filters=[];const q={select(){return q},eq(k,v){filters.push([k,v]);return q},then(resolve){assert.ok(filters.some(([k,v])=>k==='user_id'&&v===account));assert.ok(filters.some(([k,v])=>k==='status'&&v==='success'));resolve({data:rows.filter(r=>filters.every(([k,v])=>r[k]===v)),error:null})}};return q}};
function restart(){
 const convert=load('mobile-app/src/utils/caseConvert.ts',{});
 const repo=load('mobile-app/src/repositories/purchasesRepository.ts',{'../config/supabase':{supabase:db},'../config/paymentProvider':{isNonplayTestBuild:false},'../utils/caseConvert':convert});
 return load('mobile-app/src/services/purchasesService.ts',{'./authState':{getCurrentUser:()=>account?{id:account}:null},'../repositories/purchasesRepository':repo});
}
(async()=>{
 let app=restart(),scopes=await app.fetchOwnedScopes();
 assert.equal(scopes.length,2);assert.ok(app.isChapterUnlocked(scopes,{id:'chapter'}));
 assert.ok(!app.isChapterUnlocked(scopes,{id:'denied'}));assert.ok(!app.isChapterUnlocked(scopes,{id:'foreign'}));
 assert.equal((await app.fetchMyPurchases()).length,2,'financial purchase display retains historical rows');
 account=null;assert.equal((await restart().fetchOwnedScopes()).length,0);
 account='owner';app=restart();assert.equal((await app.fetchOwnedScopes()).length,2);
 rows[0].status='refunded';app=restart();scopes=await app.fetchOwnedScopes();assert.equal(scopes.length,1);assert.ok(app.isChapterUnlocked(scopes,{id:'chapter'}));
 rows[1].status='refunded';app=restart();scopes=await app.fetchOwnedScopes();assert.equal(scopes.length,0);assert.ok(!app.isChapterUnlocked(scopes,{id:'chapter'}));
 account='other';scopes=await restart().fetchOwnedScopes();assert.equal(scopes.length,1);assert.equal(scopes[0].id,'other-owner');
 console.log('PASS actual repository/service restores historic duplicates after logout/login and process reload; preserves display rows; one refund retains access, full refund denies, owner/status filtering holds');
})().catch(e=>{console.error(e);process.exitCode=1});

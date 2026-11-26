const assert=require('node:assert/strict');const {load}=require('../../mobile-app/scripts/ui-harness.cjs');
const {withProductCovers}=load('admin-panel/src/utils/productCovers.ts',{});
const years=[{id:'y1',title:'First Year'},{id:'y2',title:'Second Year'}],subjects=[{id:'s1',title:'Anatomy',yearId:'y1'}],chapters=[{id:'c1',title:'Bones',subjectId:'s1',yearId:'y1'}];
for(const product of [{scope:'chapter',chapterId:'c1'},{scope:'subject',subjectId:'s1'},{scope:'year',yearId:'y1'},{scope:'bundle',yearIds:['y2','y1']}]){
 const original={...product,id:'p',price:49,revision:7,active:true,courseId:'course'};
 const enriched=withProductCovers([original],years,subjects,chapters)[0];assert.equal(enriched.price,49);assert.equal(enriched.revision,7);assert.deepEqual(original,{...product,id:'p',price:49,revision:7,active:true,courseId:'course'});
 if(product.scope==='chapter'){assert.equal(enriched.chapterTitle,'Bones');assert.equal(enriched.subjectTitle,'Anatomy')}
 if(product.scope==='subject'){assert.equal(enriched.subjectTitle,'Anatomy');assert.equal(enriched.yearTitle,'First Year')}
 if(product.scope==='year')assert.equal(enriched.yearTitle,'First Year');
 if(product.scope==='bundle')assert.deepEqual(JSON.parse(JSON.stringify(enriched.yearTitles)),['Second Year','First Year']);
 assert.equal(withProductCovers([original],years,subjects,chapters)[0].revision,7,'reload/edit cancel is display only');
}
assert.equal(withProductCovers([{scope:'chapter',chapterId:'missing'}],years,subjects,chapters)[0].chapterTitle,'-');
assert.equal(withProductCovers([{scope:'year',yearId:'y1'}],[],[],[])[0].yearTitle,'-');
assert.equal(withProductCovers([],years,subjects,chapters).length,0);
console.log('PASS persisted relationships map all scopes, refresh, missing/failed lookups, immutable price/revision/IDs');

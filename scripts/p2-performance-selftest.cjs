const assert=require('node:assert/strict');
const {load,jsx,nodes}=require('../mobile-app/scripts/ui-harness.cjs');
const chapters=Array.from({length:1000},(_,i)=>({id:String(i),title:`Chapter ${i}`}));
const notes=chapters.map(c=>({id:c.id,chapterId:c.id,title:'Notes',active:true}));notes.push({id:'missing',chapterId:'missing',title:'Notes'});
let comparisons=0,indexed=0;
chapters.find=function(fn){return Array.prototype.find.call(this,(...args)=>{comparisons++;return fn(...args)})};
chapters.map=function(fn){return Array.prototype.map.call(this,(...args)=>{indexed++;return fn(...args)})};
const Table=load('admin-panel/src/components/NotesTable.tsx',{'react/jsx-runtime':jsx}).default;
const start=performance.now();const tree=Table({notes,chapters,onEdit(){},onDelete(){}});const ms=performance.now()-start;
const cells=nodes(tree).filter(n=>n.type==='td');
for(let i=0;i<1000;i++)assert.equal(cells[i*5+2].props.children,`Chapter ${i}`);
assert.equal(cells[1000*5+2].props.children,'-');
if(!process.argv.includes('--baseline')){assert.equal(comparisons,0);assert.equal(indexed,1000)}
console.log(JSON.stringify({fixture:'1001 Notes / 1000 Chapters; actual component render; synthetic only',linearSearchComparisons:comparisons,indexConstructionVisits:indexed,renderMs:ms,titleAssertions:1001}));

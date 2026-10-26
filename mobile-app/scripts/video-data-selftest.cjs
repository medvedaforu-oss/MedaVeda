// Round-trip the real admin write service and mobile read repository over an in-memory transport.
// This proves column mapping; it is not evidence from a live Supabase row or RLS policy.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('../node_modules/typescript');
let stored,stages=[];
const supabase={from:table=>{
 assert.equal(table,'videos');
 return {insert:payload=>{stored={id:'fixture',...payload};return {select:()=>({single:async()=>({data:{id:stored.id},error:null})})};},
 select:()=>{const q={eq:()=>q,then:(resolve,reject)=>Promise.resolve({data:[stored],error:null}).then(resolve,reject)};return q;}};
}};
function load(file){const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:mod.exports,require:name=>{
 if(name.endsWith('/supabase'))return {supabase};
 if(name.endsWith('/filters'))return {omitBlankIds:value=>value};
 if(name.endsWith('/videoDiagnostics'))return {traceVideo:(stage,detail)=>stages.push({stage,detail})};
 if(name.endsWith('/caseConvert'))return load(path.resolve(path.dirname(file),name+'.ts'));
 throw Error(name);
}});return mod.exports;}
(async()=>{
 const admin=load(path.resolve(__dirname,'../../admin-panel/src/services/videoService.ts'));
 const mobile=load(path.resolve(__dirname,'../src/repositories/videosRepository.ts'));
 const raw=' https://youtu.be/dQw4w9WgXcQ?si=fixture\n';
 await admin.addVideo({title:'Fixture',youtubeUrl:raw,subjectId:'s',yearId:'y',courseId:'c',order:1,active:true});
 assert.equal(stored.youtube_url,raw);assert.equal(stored.youtubeUrl,undefined);
 const videos=await mobile.getVideosBySubject('s');assert.equal(videos[0].youtubeUrl,stored.youtube_url);
 assert.equal(stages[0].detail.raw,stored.youtube_url);assert.equal(stages[0].detail.mapped,videos[0].youtubeUrl);
 console.log('PASS: admin youtubeUrl → stored youtube_url → mobile youtubeUrl, exact value preserved, with row diagnostics (mock transport)');
})().catch(e=>{console.error(e);process.exitCode=1;});

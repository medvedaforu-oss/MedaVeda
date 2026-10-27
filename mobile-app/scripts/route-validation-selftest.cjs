const assert = require('node:assert/strict');
const fs = require('node:fs');
const { load, jsx } = require('./ui-harness.cjs');
let params, backs=0, homes=0, canBack=false;
const withRouteValidation = load('mobile-app/src/navigation/withRouteValidation.tsx', {
  react:{},'react/jsx-runtime':jsx,'../components/ErrorState':{__esModule:true,default:'Error'},
  '@react-navigation/native':{useRoute:()=>({params}),useNavigation:()=>({canGoBack:()=>canBack,goBack:()=>backs++,navigate:screen=>{assert.equal(screen,'Home');homes++;}})},
}).withRouteValidation;
for(const [file, fields, modes, requireMode] of [
 ['years/YearsScreen',[],['notes','videos','quiz'],true],['subjects/SubjectsScreen',['yearId'],['notes','videos','quiz'],false],
 ['chapters/ChaptersScreen',['subjectId','yearId'],['notes'],false],['details/ChapterDetailsScreen',['chapterId','subjectId','yearId'],[],false],
 ['notes/NotesScreen',['chapterId','subjectId','yearId'],[],false],['videos/VideosScreen',['subjectId'],[],false],['quiz/TestListScreen',['subjectId'],[],false],
]) {
 const actual=fs.readFileSync(`mobile-app/src/screens/${file}.tsx`,'utf8');
 assert.ok(actual.includes(`export default withRouteValidation(${file.split('/')[1]}, ${JSON.stringify(fields).replaceAll(',', ', ')}, ${JSON.stringify(modes).replaceAll(',', ', ')}, ${requireMode})`));
 const Content=()=>{throw Error('guard must defer mounting');};const Screen=withRouteValidation(Content,fields,modes,requireMode);
 for(params of [undefined,null,[],{},42]) {const view=Screen();assert.equal(view.type,'Error');view.props.onRetry();}
 params=Object.fromEntries(fields.map(k=>[k,'fixture']));if(requireMode)params.mode='notes';assert.equal(Screen().type,Content);
 for(const field of fields) for(const invalid of [null,[],{},'', ' ', 3,'x'.repeat(201)]) {
   const old=params[field];params[field]=invalid;assert.equal(Screen().type,'Error');params[field]=old;
 }
 if(modes.length){params.mode='invalid';assert.equal(Screen().type,'Error');}
}
canBack=true;params=null;withRouteValidation(()=>{},[])().props.onRetry();assert.equal(backs,1);assert.ok(homes>0);
console.log('PASS malformed routes rejected before screen effects; valid routes retain component; back/home recovery');

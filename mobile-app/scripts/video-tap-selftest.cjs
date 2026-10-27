const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../node_modules/typescript');
let received=[],stages=[];
const url='https://youtu.be/dQw4w9WgXcQ?si=fixture';
const state=['',[{id:'fixture',title:'Free video',youtubeUrl:url}],false,null,0];
const react={__esModule:true,default:{createElement:(type,props,...children)=>({type,props:{...props,children}})},useState:()=>[state.shift(),()=>{}],useEffect:()=>{},useMemo:fn=>fn(),useCallback:fn=>fn};
const native={StyleSheet:{create:x=>x},View:'View',Text:'Text',TouchableOpacity:'TouchableOpacity',FlatList:'FlatList',ActivityIndicator:'ActivityIndicator'};
function load(relative){
 const file=path.resolve(__dirname,'..',relative),mod={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText,{exports:mod.exports,require:name=>{
  if(name==='react')return react;
  if(name.endsWith('/withRouteValidation'))return {withRouteValidation:screen=>screen};
  if(name==='react-native')return native;
  if(name==='@react-navigation/native')return {useRoute:()=>({params:{subjectId:'s',subjectTitle:'Subject'}})};
  if(name.endsWith('/VideoCard'))return {__esModule:true,default:load('src/components/VideoCard.tsx').default};
  if(name.endsWith('/videoLink'))return {openVideo:async value=>received.push(value)};
  if(name.endsWith('/videoDiagnostics'))return {traceVideo:stage=>stages.push(stage)};
  if(name.endsWith('/logger'))return {logError:()=>{}};
  if(name.endsWith('/videosService'))return {fetchVideosBySubject:async()=>[]};
  if(name.includes('/theme/'))return new Proxy({},{get:()=>new Proxy({},{get:()=>1})});
  if(/(EmptyState|ErrorState|SearchBar)$/.test(name))return {__esModule:true,default:name};
  throw Error(name);
 }});return mod.exports;
}
function find(node,type){if(node?.type===type)return node;for(const c of node?.props?.children||[]){const found=find(c,type);if(found)return found;}}
const screen=load('src/screens/videos/VideosScreen.tsx').default();
const list=find(screen,'FlatList');assert.ok(list);assert.equal(list.props.keyboardShouldPersistTaps,'handled');
const element=list.props.renderItem({item:{id:'fixture',title:'Free video',youtubeUrl:url}});
assert.equal(element.props.locked,false);
const card=element.type(element.props);assert.equal(card.type,'TouchableOpacity');assert.equal(card.props.disabled,undefined);
card.props.onPressIn();card.props.onPress();
assert.deepEqual(stages,['card.press-in','card.press']);assert.deepEqual(received,[url]);
// Even an old caller carrying a locked flag cannot show a paid-video message.
let legacyOpens=0;
const legacyCard=element.type({...element.props,locked:true,onPress:()=>legacyOpens++});
assert.ok(!JSON.stringify(legacyCard).includes('Purchase required'));
assert.ok(!JSON.stringify(legacyCard).includes('🔒'));
legacyCard.props.onPress();assert.equal(legacyOpens,1);
const testCard=load('src/components/TestCard.tsx').default({title:'Free MCQ',questionCount:2,locked:true,free:false,onPress:()=>{}});
assert.ok(JSON.stringify(testCard).includes('FREE'));
assert.ok(!JSON.stringify(testCard).includes('Purchase required'));
console.log('PASS: actual screen → card TouchableOpacity → onPress → opener; free card and keyboard tap forwarding (not a device gesture test)');

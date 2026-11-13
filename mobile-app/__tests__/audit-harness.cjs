const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../node_modules/typescript');
const root = process.env.MOBILE_FIX_ROOT || path.resolve(__dirname, '..');
const tick = () => new Promise(r => setImmediate(r));
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => {resolve=a;reject=b}); return {promise,resolve,reject}; };
function hooks() {
 let cursor=0, slots=[], effects=[];
 const react={
  useState(init) {const i=cursor++; if (!slots[i]) slots[i]={value:typeof init==='function'?init():init}; return [slots[i].value,v=>{slots[i].value=typeof v==='function'?v(slots[i].value):v}];},
  useRef(v){return react.useState(()=>({current:v}))[0]},
  useMemo(fn,deps){const i=cursor++,s=slots[i]; if(!s||!deps||deps.some((v,j)=>!Object.is(v,s.deps[j]))) slots[i]={value:fn(),deps};return slots[i].value},
  useCallback(fn,deps){return react.useMemo(()=>fn,deps)},
  useEffect(fn,deps){const i=cursor++,s=slots[i];if(!s||!deps||deps.some((v,j)=>!Object.is(v,s.deps[j]))){s?.cleanup?.(); slots[i]={deps};effects.push(()=>{slots[i].cleanup=fn()})}},
  useSyncExternalStore(sub,get){const [v,set]=react.useState(get);react.useEffect(()=>sub(()=>set(get())),[sub,get]);return v;},
 };
 react.default=react;react.__esModule=true;
 return {react,render(fn){cursor=0;const result=fn();effects.splice(0).forEach(fn=>fn());return result},unmount(){slots.forEach(s=>s.cleanup?.())}};
}
const jsx={jsx:(type,props,key)=>({type,props,key}),jsxs:(type,props,key)=>({type,props,key}),Fragment:'Fragment'};
const rn={View:'View',Text:'Text',ScrollView:'ScrollView',KeyboardAvoidingView:'KeyboardAvoidingView',TouchableOpacity:'TouchableOpacity',Pressable:'Pressable',ActivityIndicator:'ActivityIndicator',TextInput:'TextInput',Switch:'Switch',Modal:'Modal',Platform:{OS:'android'},StyleSheet:{create:s=>s,flatten:s=>Object.assign({},...[s].flat(Infinity).filter(Boolean))},Alert:{alert(){}},Linking:{openURL:async()=>{}}};
function load(file,mocks={},globals={}) {
 const mod={exports:{}};
 const source=fs.readFileSync(path.join(root,file),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const base={'react/jsx-runtime':jsx,'react-native':rn};
 vm.runInNewContext(code,{module:mod,exports:mod.exports,console,Error,URL,Date,Promise,AbortController,AbortSignal,process:{env:{}},setTimeout,clearTimeout,setInterval,clearInterval,...globals,require:id=>{if(id in mocks)return mocks[id];if(id in base)return base[id];throw Error('Unmocked import '+id+' in '+file)}},{filename:file});
 return mod.exports;
}
const nodes=tree=>!tree||typeof tree!=='object'?[]:[tree,...[tree.props?.children].flat(Infinity).flatMap(nodes)];
function run(work){Promise.resolve().then(work).then(()=>console.log('PASS '+path.basename(process.argv[1]))).catch(e=>{console.error(e);process.exitCode=1})}
module.exports={assert,load,hooks,rn,jsx,nodes,tick,deferred,run,root};

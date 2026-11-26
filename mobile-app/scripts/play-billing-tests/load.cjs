const fs=require('node:fs'), path=require('node:path'),vm=require('node:vm');
const ts=require('typescript');
const root=path.resolve(__dirname,'../..');
function load(rel,mocks={}) {
 const filename=path.join(root,rel);
 if(!fs.existsSync(filename)) return {};
 const mod={exports:{}};
 const source=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{exports:mod.exports,module:mod,process,Error,URL,AbortController,setTimeout,clearTimeout,console,
 require(id){if(!(id in mocks)) throw Error('Unexpected import '+id);return mocks[id];},
 fetch(){throw Error('Network forbidden in Phase A');}}, {filename});
 return mod.exports;
}
module.exports={load,root};

const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('../../mobile-app/node_modules/typescript');
for(const name of ['Years','Subjects','Chapters','Notes','Videos','Quiz','Orders','Users']) {
 const source=fs.readFileSync(`admin-panel/src/pages/${name}.tsx`,'utf8');
 const ast=ts.createSourceFile(name+'.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let retry;
 function visit(node){if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(ast)==='button'&&node.children.some(child=>ts.isJsxText(child)&&child.text.trim()==='Retry'))retry=node;ts.forEachChild(node,visit);}visit(ast);
 assert.ok(retry,`${name} has reachable Retry button`);
 const onClick=retry.openingElement.attributes.properties.find(p=>p.name?.getText(ast)==='onClick');
 const callback=onClick.initializer.expression;
 let reads=0;const vm=require('node:vm');vm.runInNewContext('('+callback.getText(ast)+')()', {reload:()=>{reads++;return Promise.resolve();}});
 assert.equal(reads,1);assert.match(source,/error && <div role="alert"/);
}
console.log('PASS eight admin error states expose Retry that calls the existing reload path');

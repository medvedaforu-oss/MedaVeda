'use strict';
// Independent verifier V designed this VM contract; root executes as transport.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const finding=process.argv[2];assert.ok(['WEB-01','WEB-02'].includes(finding));
function load(file,hash){
 const sinks=[],nav=[],replaced=[],elements=new Map();
 class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.listeners={};this._text='';this._html='';this.style={};this.classList={add(){},remove(){},toggle(){}};}
  set textContent(v){this._text=String(v??'');this._html='';this.children=[];}get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
  set innerHTML(v){this._html=String(v);this._text='';this.children=[];sinks.push(this._html);}get innerHTML(){return this._html;}
  set id(v){this.attributes.id=String(v);elements.set(String(v),this);}get id(){return this.attributes.id;}
  set href(v){this.attributes.href=String(v);}get href(){return this.attributes.href||'';}
  set className(v){this.attributes.class=String(v);}get className(){return this.attributes.class||'';}
  setAttribute(k,v){if(k==='id')this.id=v;else this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k]??null;}
  appendChild(c){this.children.push(c);return c;}append(...cs){cs.forEach(c=>this.appendChild(typeof c==='string'?Object.assign(new Element('#text'),{textContent:c}):c));}
  replaceChildren(...cs){this._text='';this._html='';this.children=[];this.append(...cs);}
  addEventListener(k,f){(this.listeners[k]||=[]).push(f);}click(){for(const f of this.listeners.click||[])f({preventDefault(){},target:this});}
 }
 const content=new Element();content.id='content';let url=new URL('https://medveda.example/reset-password.html'+hash);
 const location={get hash(){return url.hash;},get href(){return url.href;},set href(v){nav.push(String(v));},get pathname(){return url.pathname;},get search(){return url.search;},assign(v){nav.push(String(v));},replace(v){nav.push(String(v));}};
 const history={replaceState(s,t,v){replaced.push(String(v));url=new URL(String(v),url);}};
 const document={getElementById:k=>elements.get(k)||null,createElement:t=>new Element(t),createTextNode:t=>Object.assign(new Element('#text'),{textContent:t})};
 const context=vm.createContext({window:{location,history},location,history,document,URL,URLSearchParams,encodeURIComponent,decodeURIComponent,console});
 const html=fs.readFileSync(file,'utf8'),scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].filter(s=>!/\bsrc\s*=/i.test(s[1]));assert.ok(scripts.length);
 for(const s of scripts)vm.runInContext(s[2],context,{filename:file,timeout:1000});
 const snapshot=n=>[n._text,n._html,...Object.values(n.attributes),...n.children.map(snapshot)].join('\n');
 return {content,sinks,nav,replaced,location,snapshot:()=>snapshot(content)};
}
let fails=0;function check(name,f){try{f();console.log('PASS '+name);}catch(e){fails++;console.error('FAIL '+name+': '+e.message);}}
for(const file of ['reset-password.html','github-original-website/reset-password.html']){
 if(finding==='WEB-01'){
  const payload='<img src=x onerror="globalThis.__xss=true">',p=load(file,'#error_description='+encodeURIComponent(payload));
  check(file+' URL error never enters HTML sink',()=>assert.equal(p.sinks.some(v=>v.includes(payload)),false));
  check(file+' URL error literal text',()=>assert.ok(p.content.textContent.includes(payload)));
 }else{
  const access='TEST_ACCESS_SECRET_52a91',refresh='TEST_REFRESH_SECRET_f3872',p=load(file,`#access_token=${access}&refresh_token=${refresh}&type=recovery`);
  check(file+' no credentials in DOM',()=>{assert.ok(!p.snapshot().includes(access));assert.ok(!p.snapshot().includes(refresh));});
  check(file+' synchronous hash scrub',()=>{assert.ok(p.replaced.length);assert.equal(p.location.hash,'');});
  check(file+' no automatic navigation',()=>assert.deepEqual(p.nav,[]));
  check(file+' current scheme',()=>{const h=fs.readFileSync(file,'utf8');assert.ok(!h.includes('ayurpulse://'));assert.ok(h.includes('medveda://'));});
  if(process.env.TEST_HANDOFF==='1')check(file+' explicit tap carries exact tokens',()=>{const b=p.content.children.find(c=>c.tagName==='BUTTON');assert.ok(b);b.click();assert.equal(p.nav.length,1);assert.equal(new URL(p.nav[0]).protocol,'medveda:');const q=new URLSearchParams(new URL(p.nav[0]).hash.slice(1));assert.equal(q.get('access_token'),access);assert.equal(q.get('refresh_token'),refresh);});
 }
}
console.log(finding+': '+fails+' assertion failure(s)');process.exitCode=fails?1:0;

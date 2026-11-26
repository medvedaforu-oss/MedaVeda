const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const config=JSON.parse(fs.readFileSync(path.join(root,'vercel.json')));
assert(config.cleanUrls===true&&config.rewrites?.some(rule=>rule.source==='/question-paper/:paperId'&&rule.destination==='/question-paper'),'Permanent URLs must resolve to the extensionless public fallback with cleanUrls enabled');
const codec=require('../../mobile-app/src/features/question-papers/questionPaperLinks.js');
const id='11111111-1111-4111-8111-111111111111';
const PLAY='https://play.google.com/store/apps/details?id=in.medveda.app';
function page(pathname,ua='Android') {
 const open={hidden:true,href:null,hiddenByClass:true,classList:{remove:name=>{if(name==='hidden')open.hiddenByClass=false;}}},message={textContent:''},download={href:PLAY,addEventListener:(_,cb)=>{download.click=cb;}};
 const document={getElementById:id=>({'paper-open':open,'paper-message':message}[id]),querySelectorAll:()=>[download]};
 const window={location:{pathname},navigator:{userAgent:ua}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'assets/js/question-paper.js'),'utf8'),{window,document,MedvedaPaperLinks:codec,Date});
 return {open,message,download};
}
const valid=page('/question-paper/'+id);
assert.equal(valid.open.href,'medveda://question-paper/'+id);assert.equal(valid.open.hidden,false);assert.equal(valid.open.hiddenByClass,false,'App action must clear the design system hidden class');
const url=new URL(valid.download.href);assert.equal(url.origin,'https://play.google.com');assert.equal(url.searchParams.get('id'),'in.medveda.app');
assert.equal(codec.parsePaperReferrer(url.searchParams.get('referrer'),Date.now(),Date.now()).id,id);
assert.equal(typeof valid.download.click,'function');
for(const suffix of ['bad',id+'%3Fx=y','../'+id,id+'/extra']) {
 const invalid=page('/question-paper/'+suffix);assert.equal(invalid.open.hidden,true);assert.equal(invalid.download.href,PLAY);assert.match(invalid.message.textContent,/invalid/i);
}
assert.equal(page('/question-paper/'+id,'Desktop').open.hidden,true);
const html=fs.readFileSync(path.join(root,'question-paper.html'),'utf8');
assert.match(html,/name="robots" content="noindex/);assert(!html.includes('supabase.js'));assert(!/object_path|signedUrl|<object|<iframe/.test(html));
assert(!fs.readFileSync(path.join(root,'_src/static-sitemap.xml'),'utf8').includes('/question-paper'));
const assetlinks=JSON.parse(fs.readFileSync(path.join(root,'.well-known/assetlinks.json'),'utf8'));
for(const relation of assetlinks) {
 assert.deepEqual(relation.relation,['delegate_permission/common.handle_all_urls']);assert.equal(relation.target.package_name,'in.medveda.app');
 assert(relation.target.sha256_cert_fingerprints.every(f=>/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(f)));
}
const headers=config.headers.find(rule=>rule.source==='/.well-known/assetlinks.json');
assert(headers.headers.some(h=>h.key==='Content-Type'&&h.value==='application/json'));
console.log('PASS fallback rewrite, safe app action, encoded official Play destination, malformed links, private metadata exclusion, noindex and DAL JSON/headers');
console.log(assetlinks.length?'DAL certificate entries configured (owner must verify provenance)':'OWNER REQUIRED: verified Google Play App Signing certificate; empty DAL makes no verification claim');

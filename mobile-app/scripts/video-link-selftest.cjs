const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../node_modules/typescript');
let alerts = [], opened = [], browsers = [], copied = [], stages = [];
let rejects = new Set(), rejectBrowser = false, rejectCopy = false, browserType = 'opened';
const platform = { OS: 'android' };
const mocks = {
 'react-native': { Platform: platform, Alert: { alert: (...args) => alerts.push(args) }, Linking: {
  canOpenURL: () => { throw Error('must not query package visibility'); },
  openURL: async url => { opened.push(url); if (rejects.has(url.startsWith('vnd.') ? 'native' : 'https')) throw Error('no handler'); }
 } },
 'expo-web-browser': { openBrowserAsync: async url => { browsers.push(url); if (rejectBrowser) throw Error('no browser'); return { type: browserType }; } },
 'expo-clipboard': { setStringAsync: async url => { if (rejectCopy) throw Error('clipboard unavailable'); copied.push(url); } },
 './videoDiagnostics': { traceVideo: (stage) => stages.push(stage) }
};
const cache = new Map();
function load(file) {
 if (cache.has(file)) return cache.get(file);
 const mod = { exports: {} };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'), {
  compilerOptions: { module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022 }
 }).outputText, { exports:mod.exports, URL, URLSearchParams, require:name => {
  if (name in mocks) return mocks[name];
  if (name === './videoUrl') return load(path.join(path.dirname(file),'videoUrl.ts'));
  throw Error(name);
 } });
 cache.set(file,mod.exports);return mod.exports;
}
const { normalizeVideoUrl: normalize, parseVideoUrl } = load(path.join(__dirname,'../src/utils/videoUrl.ts'));
const { openVideo } = load(path.join(__dirname,'../src/utils/videoLink.ts'));
const tick = () => new Promise(setImmediate);
(async () => {
 const id = 'dQw4w9WgXcQ', canonical = `https://www.youtube.com/watch?v=${id}`, native = `vnd.youtube://${id}`;
 assert.equal(normalize('https://youtu.be/WDejVw7vLKE?si=AkGMGz8VPp0MLbcm'), 'https://www.youtube.com/watch?v=WDejVw7vLKE');
 const forms = [id, `youtube.com/watch?v=${id}`, `http://youtu.be/${id}`, `//www.youtube.com/embed/${id}`,
  `https://m.youtube.com/watch?v=${id}`, `https://youtube.com/shorts/${id}`, `https://youtube.com/live/${id}`,
  `https://www.youtube-nocookie.com/embed/${id}`, `https://youtube.com/v/${id}`, `https://music.youtube.com/watch?v=${id}`,
  `https://youtu.be/${id}?si=some-share-token`, `https://www.youtu.be/${id}`,
  `https://youtube.com/watch?feature=shared&v=${id}&si=share`, `\n \"https://youtu.be/${id}\" \r\n`,
  `“https://youtu.be/${id}”`, `'https://youtu.be/${id}'`, `https://you\u200btube.com/watch?v=${id}\ufeff`,
  `https://youtu.be/\n${id}`, `https://youtu.be/%64Qw4w9WgXcQ`, `https://youtube.com/watch?v=%64Qw4w9WgXcQ`,
  encodeURIComponent(canonical), encodeURIComponent(encodeURIComponent(canonical)), encodeURIComponent(`"${canonical}"`),
  `youtu.be%2F${id}`, `${canonical} `];
 for (const url of forms) { assert.equal(normalize(url),canonical,JSON.stringify(url));assert.equal(parseVideoUrl(url).youtubeId,id); }
 for (const bad of [null,undefined,3,'','garbage','javascript:alert(1)','intent://youtube','file:///a','https://user:pass@example.com/a',
  'https://youtube.com/watch','https://youtube.com/watch?v=x','https://youtube.com/playlist','https://youtube.com:444/watch?v='+id,'%zz']) assert.equal(normalize(bad),null,String(bad));
 for (const url of ['https://drive.google.com/file/d/abc/view?usp=sharing','https://vimeo.com/123/secret','https://player.vimeo.com/video/123?h=secret']) assert.equal(normalize(url),url);
 assert.equal(parseVideoUrl('https://youtube.com.evil.example/watch?v='+id).youtubeId,null);
 assert.equal(normalize(`youtu.be/${id}?t=30`),canonical+'&t=30');
 assert.equal(normalize(`https://youtube.com/embed/${id}?start=30`),canonical+'&t=30');
 assert.equal(normalize(`https://youtube.com/watch?v=${id}&list=PL_test&index=4`),canonical+'&list=PL_test');
 for (const url of ['https://youtube.com/playlist?list=PL_test','https://youtube.com/embed/videoseries?list=PL_test']) {
  assert.equal(normalize(url),'https://www.youtube.com/playlist?list=PL_test'); assert.equal(parseVideoUrl(url).youtubeId,null);
 }
 await openVideo(canonical);assert.deepEqual(opened,[native]);assert.equal(browsers.length,0);
 opened=[];rejects.add('native');await openVideo(canonical);assert.deepEqual(opened,[native,canonical]);
 opened=[];rejects.add('https');await openVideo(canonical);assert.deepEqual(opened,[native,canonical]);assert.deepEqual(browsers,[canonical]);assert.equal(alerts.length,0);
 rejectBrowser=true;await openVideo(canonical);assert.equal(alerts.at(-1)[0],"Couldn't open video");
 const actions=alerts.at(-1)[2];actions.find(b=>b.text==='Copy link').onPress();await tick();assert.deepEqual(copied,[canonical]);
 rejectCopy=true;actions.find(b=>b.text==='Copy link').onPress();await tick();assert.equal(alerts.at(-1)[0],"Couldn't copy link");
 rejects.clear();const count=opened.length;actions.find(b=>b.text==='Retry').onPress();await tick();assert.equal(opened.length,count+1);
 const before=opened.length;await openVideo(null);assert.equal(opened.length,before);assert.equal(alerts.at(-1)[0],'Video link unavailable');
 platform.OS='ios';opened=[];await openVideo(canonical);assert.deepEqual(opened,[canonical]);
 platform.OS='android';opened=[];await openVideo('https://youtube.com/playlist?list=PL_test');assert.deepEqual(opened,['https://www.youtube.com/playlist?list=PL_test']);
 rejects=new Set(['native','https']);rejectBrowser=false;browserType='locked';await openVideo(canonical);assert.equal(alerts.at(-1)[0],"Couldn't open video");
 const n=alerts.length;browserType='cancel';await openVideo(canonical);assert.equal(alerts.length,n);
 assert.ok(stages.includes('native.rejected') && stages.includes('https.rejected') && stages.includes('browser.attempt') && stages.includes('open.failed'));
 console.log(`PASS: ${forms.length} URL forms, invalid/signed/playlist links, native → HTTPS → browser order, retry, copy/failure, iOS and diagnostics`);
})().catch(e=>{console.error(e);process.exitCode=1;});

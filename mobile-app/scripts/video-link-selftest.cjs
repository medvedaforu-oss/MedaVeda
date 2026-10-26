const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../node_modules/typescript');
let alerts = [], opened = [], browsers = [], rejectOpen = false, rejectBrowser = false;
const moduleStub = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(__dirname + '/../src/utils/videoLink.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText, { exports: moduleStub.exports, URL, require: name => {
  if (name === 'react-native') return { Alert: { alert: (...args) => alerts.push(args) }, Linking: {
    canOpenURL: () => { throw Error('must not query package visibility'); },
    openURL: async url => { opened.push(url); if (rejectOpen) throw Error('no handler'); }
  } };
  if (name === 'expo-web-browser') return { openBrowserAsync: async url => { browsers.push(url); if (rejectBrowser) throw Error('no browser'); } };
  throw Error(name);
} });
const { normalizeVideoUrl: normalize, openVideoLink } = moduleStub.exports;
(async () => {
  const canonical = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  for (const url of [' youtube.com/watch?v=dQw4w9WgXcQ ', 'http://youtu.be/dQw4w9WgXcQ', '//www.youtube.com/embed/dQw4w9WgXcQ', 'https://m.youtube.com/shorts/dQw4w9WgXcQ', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', 'https://youtube.com/live/dQw4w9WgXcQ']) assert.equal(normalize(url), canonical);
  for (const bad of [null, undefined, '', 'garbage', 'javascript:alert(1)', 'intent://youtube', 'file:///a', 'https://user:pass@example.com/a', 'https://youtube.com/watch', 'https://youtube.com/watch?v=x']) assert.equal(normalize(bad), null);
  for (const url of ['https://drive.google.com/file/d/abc/view?usp=sharing', 'https://vimeo.com/123/secret', 'https://player.vimeo.com/video/123?h=secret']) assert.equal(normalize(url), url);
  assert.equal(normalize('youtu.be/dQw4w9WgXcQ?t=30'), canonical + '&t=30');
  await openVideoLink('youtu.be/dQw4w9WgXcQ'); assert.deepEqual(opened, [canonical]);
  await openVideoLink(null); assert.equal(opened.length, 1);
  rejectOpen = true; await openVideoLink(canonical);
  const actions = alerts.at(-1)[2];
  actions.find(b => b.text === 'Open in browser').onPress();
  await new Promise(setImmediate); assert.deepEqual(browsers, [canonical]);
  rejectBrowser = true; actions.find(b => b.text === 'Open in browser').onPress();
  await new Promise(setImmediate); assert.equal(alerts.at(-1)[0], 'Browser unavailable');
  rejectOpen = false; actions.find(b => b.text === 'Retry').onPress();
  await new Promise(setImmediate); assert.equal(opened.length, 3);
  console.log('Video normalization, Android visibility bypass, retry and browser fallback passed');
})().catch(e => { console.error(e); process.exitCode = 1; });

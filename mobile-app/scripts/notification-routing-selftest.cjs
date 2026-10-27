const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../node_modules/typescript');
function load(file, mocks = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(__dirname + '/../src/' + file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => { assert.ok(name in mocks, name); return mocks[name]; } });
  return exports;
}
const { notificationTarget, createNotificationRouter } = load('services/notificationRouting.ts');
const response = (id, data) => ({ notification: { request: { identifier: id, content: { data } } } });
const tick = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  const navigated = [];
  const router = createNotificationRouter(target => navigated.push(target));
  router.setReady(true, 'Home');
  router.receive(response('foreground', { screen: 'Store' }));
  router.receive(response('background', { screen: 'Notifications' }));
  assert.equal(navigated.map(t => t.screen).join(','), 'Store,Notifications');
  router.receive(response('background', { screen: 'Store' }));
  assert.equal(navigated.length, 2, 'same launch/live response only navigates once');
  for (const data of [null, [], { screen: 'Missing' }, { screen: 'PdfViewer', params: { pdfUrl: 'file:///etc/passwd' } },
    { screen: 'Chapters', params: {} }, { screen: 'Subjects', params: { yearId: 4, yearTitle: 'x' } },
    { screen: 'Years' }, { screen: 'Years', params: { mode: 'bad' } },
    { screen: 'Years', params: { mode: ['notes'] } },
    { screen: 'Chapters', params: { subjectId: 's', subjectTitle: 'S', yearId: 'y', yearTitle: 'Y', mode: 'videos' } },
    { screen: '__proto__' }]) {
    assert.equal(notificationTarget(data).screen, 'Notifications');
  }
  const validated = notificationTarget({ screen: 'Subjects', params: { yearId: 'a', yearTitle: 'First', mode: 'quiz', unlocked: true, screen: 'Quiz' } });
  assert.equal(validated.params.mode, 'quiz');
  assert.equal(validated.params.unlocked, undefined);
  assert.equal(notificationTarget({ screen: 'Years', params: { mode: 'quiz' } }).params.mode, 'quiz');
  router.setReady(false, 'Login');
  router.receive(response('logged-out', { screen: 'Store' }));
  assert.equal(navigated.length, 2);
  router.setReady(true, 'Login');
  router.setReady(true, 'SelectCourseYear');
  assert.equal(navigated.length, 2, 'auth/onboarding cannot be bypassed');
  router.setReady(true, 'Home');
  assert.equal(navigated.at(-1).screen, 'Store');
  assert.equal(navigated.length, 3);

  let callback, resolveLast, removed = 0, cleared = 0;
  const notifications = {
    addNotificationResponseReceivedListener: cb => { callback = cb; return { remove: () => removed++ }; },
    getLastNotificationResponseAsync: () => new Promise(resolve => { resolveLast = resolve; }),
    clearLastNotificationResponseAsync: async () => { cleared++; },
  };
  const push = load('services/pushNotifications.ts', {
    'react-native': { Platform: { OS: 'android' } },
    'expo-constants': { default: { executionEnvironment: 'standalone' }, ExecutionEnvironment: { StoreClient: 'store' } },
    'expo-notifications': notifications,
    '../config/supabase': { supabase: {} }, '../utils/logger': { logDebug() {}, logError() {} },
  });
  const stop = push.setupNotificationResponseListener(router.receive);
  resolveLast(response('killed-app', { screen: 'Search' }));
  await tick();
  assert.equal(navigated.at(-1).screen, 'Search');
  assert.equal(cleared, 1);
  stop();
  callback(response('after-unmount', { screen: 'Home' }));
  assert.equal(navigated.at(-1).screen, 'Search');
  assert.equal(removed, 1);

  const stopRace = push.setupNotificationResponseListener(router.receive);
  callback(response('new-tap', { screen: 'Profile' }));
  resolveLast(response('stale-launch', { screen: 'Store' }));
  await tick();
  assert.equal(navigated.at(-1).screen, 'Profile');
  stopRace();
  const stopPending = push.setupNotificationResponseListener(router.receive);
  stopPending();
  resolveLast(response('late-read', { screen: 'Home' }));
  await tick();
  assert.equal(navigated.at(-1).screen, 'Profile');
  console.log('PASS notification foreground/background/cold start, validation, login gate, deduplication, races and cleanup');
})().catch(error => { console.error(error); process.exitCode = 1; });

const assert = require('node:assert/strict');
const fs = require('node:fs');
const { load, harness, jsx, nodes, tick } = require('./ui-harness.cjs');
const links = require('../src/features/question-papers/questionPaperLinks.js');
const { PaperLinkQueue } = load('mobile-app/src/features/question-papers/paperLinkQueue.ts', {});
const id = '11111111-1111-4111-8111-111111111111', now = 1800000000000;
(async () => {
  for (const type of ['question-paper', 'note', 'quiz']) {
    const url = links.contentShareUrl(type, id);
    assert.equal(url, `https://www.medveda.in/${type}/${id}`);
    assert.equal(links.parseContentLink(url).type, type);
    assert.equal(links.parseContentLink(`medveda://${type}/${id}`).id, id);
    for (const bad of ['bad', id + '?token=SECRET', id + '#secret', id + '/extra', '%31' + id.slice(1), id + '\n', '../' + id]) {
      assert.throws(() => links.contentShareUrl(type, bad));
      assert.equal(links.parseContentLink(`https://www.medveda.in/${type}/${bad}`)?.id, undefined);
    }
    for (const url of [`http://www.medveda.in/${type}/${id}`, `https://www.medveda.in.evil/${type}/${id}`, `https://evil@www.medveda.in/${type}/${id}`]) assert.equal(links.parseContentLink(url), null);
    const message = links.contentShareMessage(type, id, 'Actual title');
    assert(message.includes(url)); assert(message.includes('Actual title'));
    if (type === 'quiz') assert(message.includes('Test duration: 15 minutes.'));
    const play = new URL(links.contentPlayUrl(type, id, now));
    assert.equal(play.origin, 'https://play.google.com'); assert.equal(play.searchParams.get('id'), 'in.medveda.app');
    const raw = play.searchParams.get('referrer');
    assert.deepEqual(links.parseContentReferrer(raw, now, now), { type, id });
    assert.equal(links.parseContentReferrer(raw, now + 8 * 86400000, now), null);
    assert.equal(links.parseContentReferrer(raw, now - 600000, now - 600000), null);
    const key = type === 'question-paper' ? 'mv_qp' : 'mv_content';
    assert.equal(links.parseContentReferrer(raw + '&' + key + '=duplicate', now, now), null);
    const deferred = load('mobile-app/src/features/question-papers/deferredPaperLink.ts', { './questionPaperLinks': links });
    let marker, received = [];
    const ports = { now: () => now, installedAt: async () => new Date(now), referrer: async () => raw,
      getMarker: async () => marker, setMarker: async value => { marker = value; }, isCurrent: () => true,
      receive: (id, type) => received.push({ type, id }) };
    await deferred.readDeferredPaperLink(ports); await deferred.readDeferredPaperLink(ports);
    assert.deepEqual(received, [{ type, id }]);
  }
  assert.equal(links.parseContentReferrer('referral=ABC234', now, now), null);
  const noteRef = new URL(links.contentPlayUrl('note', id, now)).searchParams.get('referrer');
  assert.equal(links.parseContentReferrer(noteRef + '&mv_qp=x', now, now), null);
  for (const url of ['medveda://reset-password#access_token=x', 'https://www.medveda.in/reset-password#type=recovery', 'medveda://referral/ABC234', 'https://www.medveda.in/profile/' + id]) assert.equal(links.parseContentLink(url), null);

  let owner = null, ready = false, calls = [], clock = now;
  const queue = new PaperLinkQueue(() => clock);
  const ports = { context: () => ({ owner, ready, courseId: 'course' }), resolve: async (id, type) => ({ id, type }),
    open: d => calls.push(d), error: () => assert.fail('unexpected routing error') };
  queue.receive({ type: 'note', id }, owner); await queue.process(ports); assert.equal(calls.length, 0);
  owner = 'A'; queue.accountChanged(owner); ready = true; await queue.process(ports); assert.equal(calls[0].type, 'note');
  queue.receive({ type: 'quiz', id }, owner); await queue.process(ports); assert.equal(calls[1].type, 'quiz', 'Different types with the same ID must remain independent');
  clock += 2000; ready = false; queue.receive({ type: 'note', id }, owner); await queue.process(ports); assert(queue.pending);
  owner = null; queue.accountChanged(owner); owner = 'B'; queue.accountChanged(owner); ready = true;
  await queue.process(ports); assert.equal(calls.length, 2);

  let rows = { notes: { id, title: 'Note', chapter_id: 'chapter', year_id: 'year', course_id: 'course' },
    chapters: { id: 'chapter', title: 'Chapter', subject_id: 'subject', year_id: 'year' },
    quiz_tests: { id, title: 'Quiz', subject_id: 'subject', year_id: 'year', course_id: 'course' } };
  let queryError = null, changeAccount = false, queries = [];
  const supabase = { from: table => {
    const query = new Proxy({}, { get: (_, key) => key === 'then' ? resolve => { if (changeAccount) owner = 'B'; resolve({ data: rows[table], error: queryError }); }
      : (...args) => { queries.push([table, key, ...args]); return query; } }); return query;
  } };
  const destination = load('mobile-app/src/features/sharing/contentDestination.ts', { '../../config/supabase': { supabase },
    '../../services/authState': { getCurrentUser: () => owner ? { id: owner } : null },
    '../question-papers/questionPaperLinks': links,
    '../question-papers/service': { getPaperDestination: async id => ({ paperId: id, title: 'Paper' }) } });
  owner = 'A'; let result = await destination.resolveContentDestination(id, 'note');
  assert.equal(result.screen, 'Notes'); assert.equal(result.params.noteId, id); assert.equal(result.params.chapterId, 'chapter');
  result = await destination.resolveContentDestination(id, 'quiz'); assert.equal(result.screen, 'QuizInfo'); assert.equal(result.params.quizId, id);
  assert.equal((await destination.resolveContentDestination(id, 'question-paper')).screen, 'QuestionPaperPdf');
  assert(queries.some(q => q[1] === 'eq' && q[2] === 'active' && q[3] === true));
  assert(!JSON.stringify(queries.filter(q => q[1] === 'select')).match(/pdf_url|questions|answer|object_path/));
  for (const type of ['note', 'quiz']) {
    const table = type === 'note' ? 'notes' : 'quiz_tests', saved = rows[table]; rows[table] = null;
    for (const reason of ['deleted', 'unpublished', 'wrong course', 'unauthorized']) await assert.rejects(destination.resolveContentDestination(id, type), e => e.definitive, reason);
    rows[table] = saved; queryError = Error('offline'); await assert.rejects(destination.resolveContentDestination(id, type), e => !e.definitive);
    queryError = null; owner = 'A'; changeAccount = true; await assert.rejects(destination.resolveContentDestination(id, type), /account changed/i); changeAccount = false;
  }
  owner = null; await assert.rejects(destination.resolveContentDestination(id, 'note'), /sign in/i);
  await assert.rejects(destination.resolveContentDestination('bad', 'quiz'), e => e.definitive);

  let sheetResolve, sheets = [], copied = [], alerts = [];
  const rn = { Platform: { OS: 'android' }, Alert: { alert: m => alerts.push(m) },
    Share: { share: data => { sheets.push(data); return new Promise(r => { sheetResolve = r; }); } } };
  const share = load('mobile-app/src/features/sharing/shareLink.ts', { 'react-native': rn, 'expo-clipboard': { setStringAsync: async value => copied.push(value) } });
  const first = share.shareLink('MedVeda', links.contentShareMessage('note', id, 'Title'), links.contentShareUrl('note', id));
  await share.shareLink('MedVeda', 'duplicate', links.contentShareUrl('quiz', id)); assert.equal(sheets.length, 1);
  assert.deepEqual(Object.keys(sheets[0]).sort(), ['message', 'title']); assert(sheets[0].message.includes('/note/' + id));
  sheetResolve({ action: 'dismissedAction' }); await first; assert.equal(alerts.length, 0);
  rn.Share.share = async () => { const e = new Error('cancelled'); e.name = 'AbortError'; throw e; };
  await share.shareLink('MedVeda', 'Quiz', links.contentShareUrl('quiz', id)); assert.equal(alerts.length, 0);
  await share.copyLink(links.contentShareUrl('quiz', id)); assert.equal(copied[0], links.contentShareUrl('quiz', id));
  const Button = load('mobile-app/src/features/sharing/ContentShareButton.tsx', { 'react/jsx-runtime': jsx,
    'react-native': { TouchableOpacity: 'Button', StyleSheet: { create: s => s } }, '@expo/vector-icons': { Ionicons: 'Icon' },
    '../../theme/colors': { COLORS: {} }, '../../theme/radius': { RADIUS: {} },
    '../question-papers/questionPaperLinks': links, './shareLink': share }).default;
  assert.equal(Button({ type: 'note', id: 'npt_private', title: 'test' }), null);
  const button = Button({ type: 'quiz', id, title: 'Real title' }); assert.equal(button.props.accessibilityRole, 'button');
  assert.match(button.props.accessibilityLabel, /Real title/); button.props.onLongPress(); await tick(); assert.equal(copied.length, 2);

  // Real routing hook retains a shared destination until an active Quiz has safely been left.
  const h = harness(); let route = 'Quiz', opened = [], activeOwner = 'A'; const routed = new PaperLinkQueue(() => now);
  routed.receive({ type: 'quiz', id }, activeOwner);
  const routing = load('mobile-app/src/features/question-papers/useQuestionPaperRouting.ts', { react: h.react,
    'react-native': { AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) }, Alert: { alert() {} } },
    '../../services/authState': { getCurrentUser: () => ({ id: activeOwner }) },
    '../../services/courseState': { getCourseYear: () => ({ status: 'ready', courseId: 'course' }), subscribeCourseYear: () => () => {} },
    '../sharing/contentDestination': { resolveContentDestination: async () => ({ screen: 'QuizInfo', params: { quizId: id } }) },
    './paperLinkRuntime': { paperLinkQueue: routed } }).default;
  const navigation = { isReady: () => true, getCurrentRoute: () => ({ name: route }), navigate: (...args) => opened.push(args) };
  h.render(() => routing(navigation, true, route)); await tick(); assert.equal(opened.length, 0); assert(routed.pending);
  route = 'Home'; h.render(() => routing(navigation, true, route)); await tick(); assert.equal(opened[0][0], 'QuizInfo'); assert.equal(opened[0][2].pop, true); h.unmount();
  // Exercise the installed stack router: repeated Note links return to one Notes screen before reopening its reader.
  const { StackRouter, CommonActions } = require('@react-navigation/routers');
  const router = StackRouter({ initialRouteName: 'Home' });
  const options = { routeNames: ['Home', 'Notes', 'PdfViewer'], routeParamList: {}, routeGetIdList: {} };
  let stack = router.getRehydratedState({ stale: true, routes: [{ name: 'Home' }, { name: 'Notes' }, { name: 'PdfViewer' }] }, options);
  for (let i = 0; i < 3; i++) {
    stack = router.getStateForAction(stack, CommonActions.navigate('Notes', { noteId: id, linkRevision: i }, { pop: true }), options);
    assert.equal(stack.routes.filter(r => r.name === 'Notes').length, 1);
    assert.equal(stack.routes.filter(r => r.name === 'PdfViewer').length, 0);
    stack = router.getStateForAction(stack, CommonActions.navigate('PdfViewer', { noteId: id }), options);
    assert.equal(stack.routes.filter(r => r.name === 'PdfViewer').length, 1);
  }
  console.log('PASS all content URL/message codecs, strict invalid/referral isolation, deferred single consumption, auth/account queues, metadata-only RLS resolvers, native share/cancel/copy single flight and active-Quiz routing protection');
})().catch(e => { console.error(e); process.exitCode = 1; });

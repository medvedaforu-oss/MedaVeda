const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { harness, load, jsx, nodes } = require('./ui-harness.cjs');
module.exports = function quizFixture({ blanks = false, count = 2 } = {}) {
  const state = { now: 1800000000000, monotonic: 0, owner: 'student', online: false, failWrite: false, calls: [], submitted: [], exits: [] };
  class ClockDate extends Date { static now() { return state.now; } }
  const globals = { Date: ClockDate, performance: { now: () => state.monotonic } };
  const sqlite = new DatabaseSync(':memory:');
  const db = {
    execSync: sql => sqlite.exec(sql),
    runSync(sql, params = []) { if (state.failWrite) throw Error('disk full'); return sqlite.prepare(sql).run(...params); },
    getFirstSync: (sql, params = []) => sqlite.prepare(sql).get(...params),
    getAllSync: (sql, params = []) => sqlite.prepare(sql).all(...params),
    withTransactionSync(fn) { sqlite.exec('BEGIN'); try { fn(); sqlite.exec('COMMIT'); } catch (e) { sqlite.exec('ROLLBACK'); throw e; } },
  };
  const database = load('mobile-app/src/config/database.ts', {
    'react-native': { Platform: { OS: 'android' } }, 'expo-sqlite': { openDatabaseSync: () => db },
  });
  database.initDatabase(); database.initDatabase(); // Compatible, idempotent local schema upgrade.
  const auth = { getCurrentUser: () => state.owner ? { id: state.owner } : null, getAuthEpoch: () => 0 };
  const sync = load('mobile-app/src/services/syncEngine.ts', {
    '../config/database': database, './authState': auth, '../utils/logger': { logDebug() {} },
    '@react-native-community/netinfo': { __esModule: true, default: { fetch: async () => ({ isConnected: state.online, isInternetReachable: state.online }) } },
    '../config/supabase': { supabase: {
      auth: { getSession: async () => ({ data: { session: { user: { id: state.owner }, access_token: 'fixture' } } }) },
      rpc: (name, params) => { state.calls.push({ name, params }); return { setHeader: async () => ({ data: { status: 'verified', score: 1, total: count } }) }; },
    } },
  }, globals);
  const model = load('mobile-app/src/services/quizSession.ts', {}, globals);
  const store = load('mobile-app/src/services/quizSessionStore.ts', { '../config/database': database, './authState': auth, './quizSession': model }, globals);
  const attempts = load('mobile-app/src/services/quizAttempts.ts', { '../config/database': database, './syncEngine': sync, '../utils/logger': { logDebug() {} } }, globals);
  const recovery = load('mobile-app/src/services/quizAttemptRecovery.ts', { 'react-native':{}, '../config/database':database, './authState':auth, './quizSession':model, './quizAttempts':attempts, '../utils/logger':{logError(){}} }, globals);
  const intervals = new Map(), appListeners = new Set(); let timerId = 0, h = harness(), session, tree;
  const test = { id: '11111111-1111-4111-8111-111111111111', title: 'Test', active: true, questionRevision: 3,
    questions: Array.from({ length: count }, (_, i) => ({ question: 'Q' + (i + 1), options: blanks && i === 0 ? ['A', '', 'B', '  '] : ['A', 'B'] })) };
  const mocks = {
    react: Object.fromEntries(['useState', 'useRef', 'useCallback', 'useEffect'].map(name => [name, (...args) => h.react[name](...args)])),
    'react/jsx-runtime': jsx,
    'react-native': { View: 'View', Text: 'Text', ScrollView: 'Scroll', TouchableOpacity: 'Button', ActivityIndicator: 'Spinner',
      StyleSheet: { create: x => x }, Alert: { alert: (...args) => state.exits.push(args) },
      AppState: { currentState: 'active', addEventListener: (_, fn) => { appListeners.add(fn); return { remove: () => appListeners.delete(fn) }; } } },
    '@react-navigation/native': { useRoute: () => ({ params: { test, subjectId: 'subject', subjectTitle: 'Subject' } }),
      useNavigation: () => ({ goBack() {} }), usePreventRemove: (enabled, callback) => { state.exitGuard = enabled ? callback : null; } },
    '../../services/authState': auth, '../../utils/logger': { logError() {} },
    '../../services/quizAttempts': { ...attempts, recordQuizAttempt: input => { const id = attempts.recordQuizAttempt(input); state.submitted.push(input); return id; } },
    '../../services/quizSession': model, '../../services/quizSessionStore': store,
    '../../config/database': database, '../../utils/downloadManager': { loadOfflineQuiz: async () => test },
  };
  for (const name of ['EmptyState', 'ErrorState', 'OptionCard', 'ProgressBar', 'motion/SuccessBurst']) mocks['../../components/' + name] = { __esModule: true, default: name };
  for (const [file, key] of [['colors', 'COLORS'], ['fonts', 'FONT'], ['spacing', 'SPACING'], ['radius', 'RADIUS']]) mocks['../../theme/' + file] = { [key]: {} };
  const screen = load('mobile-app/src/screens/quiz/QuizScreen.tsx', mocks, { ...globals,
    setInterval: fn => { const id = ++timerId; intervals.set(id, fn); return id; }, clearInterval: id => intervals.delete(id),
  });
  function start() { h.unmount(); h = harness(); session = store.openQuizDraft(test, 'subject', 'Subject'); return render(); }
  function render() { tree = nodes(h.render(() => screen.QuizSession({ initialDraft: session, navigation: { goBack() {}, dispatch() {} }, onRestart: start }))); return tree; }
  const text = n => nodes(n).filter(x => x.type === 'Text').map(x => [x.props.children].flat(Infinity).join('')).join(' ');
  const button = label => { const found = tree.find(n => n.type === 'Button' && text(n) === label); assert(found, label); return found.props.onPress; };
  const options = () => tree.filter(n => n.type === 'OptionCard');
  const advance = (ms, { fire = true, wall = ms } = {}) => { state.now += wall; state.monotonic += ms; if (fire) [...intervals.values()].forEach(fn => fn()); return render(); };
  const app = next => { mocks['react-native'].AppState.currentState = next; [...appListeners].forEach(fn => fn(next)); return render(); };
  return { state, db, model, store, attempts, sync, recovery, test, start, render, button, options, advance, app, text,
    get session() { return session; }, get tree() { return tree; }, unmount() { h.unmount(); }, close() { h.unmount(); sqlite.close(); } };
};

const assert = require('node:assert/strict');
const { harness, load, jsx, nodes, tick } = require('./ui-harness.cjs');
const id = '11111111-1111-4111-8111-111111111111';
(async () => {
  for (const [free, owned, denied, expected] of [[true, false, false, 1], [false, true, false, 1], [false, false, false, 0], [false, true, true, 0]]) {
    const h = harness(), opens = [], alerts = []; let requests = 0;
    const refresh = () => {}, getItem = () => null;
    const note = { id, title: 'Authorized title', isFreePreview: free };
    const params = { chapterId: 'chapter', chapterTitle: 'Chapter', subjectId: 'subject', yearId: 'year', noteId: id, linkRevision: 1 };
    const mocks = { react: h.react, 'react/jsx-runtime': jsx,
      'react-native': { View: 'View', Text: 'Text', FlatList: 'List', ActivityIndicator: 'Spinner', StyleSheet: { create: x => x }, Alert: { alert: (...args) => alerts.push(args) } },
      '@react-navigation/native': { useRoute: () => ({ params }), useNavigation: () => ({ navigate: (...args) => opens.push(args) }), useFocusEffect: cb => h.react.useEffect(cb, [cb]) },
      '../../navigation/withRouteValidation': { withRouteValidation: s => s },
      '../../hooks/useLoadResource': { __esModule: true, default: () => ({ value: [note], loading: false, error: false, retry() {} }) },
      '../../hooks/usePurchases': { __esModule: true, default: () => ({ isChapterOwned: () => owned, refresh, loading: false, error: null }) },
      '../../hooks/useDownloads': { __esModule: true, default: () => ({ isDownloaded: () => false, getItem }) },
      '../../features/sharing/ContentShareButton': { __esModule: true, default: 'Share' }, '../../services/notesService': {},
      '../../services/authState': { getCurrentUser: () => ({ id: 'recipient' }) }, '../../utils/logger': { logError() {} },
      '../../services/secureNotesService': { NoteAccessError: class extends Error {}, getSecureNoteUrl: async noteId => {
        requests++; assert.equal(noteId, id); if (denied) throw Error('denied'); return 'https://private.invalid/recipient-only';
      } },
    };
    for (const name of ['PurchaseOwnershipStatus', 'LoadError', 'NoteCard', 'EmptyState', 'SearchBar', 'UnlockOptionsPanel']) mocks['../../components/' + name] = { __esModule: true, default: name };
    for (const [file, key] of [['colors','COLORS'],['fonts','FONT'],['spacing','SPACING']]) mocks['../../theme/' + file] = { [key]: {} };
    const Screen = load('mobile-app/src/screens/notes/NotesScreen.tsx', mocks).default;
    h.render(Screen); await tick(); const tree = nodes(h.render(Screen));
    assert.equal(opens.length, expected); assert.equal(requests, free || owned ? 1 : 0);
    if (expected) { assert.equal(opens[0][0], 'PdfViewer'); assert.equal(opens[0][1].noteId, id); }
    if (!free && !owned) assert.equal(tree.find(n => n.type === 'List').props.ListFooterComponent.type, 'UnlockOptionsPanel');
    if (denied) assert.equal(alerts.length, 1);
    const card = tree.find(n => n.type === 'List').props.renderItem({ item: note });
    assert.equal(card.props.shareAction.props.id, id); assert.equal(card.props.shareAction.props.title, note.title);
    h.unmount();
  }
  // Quiz information may load metadata, but it cannot load questions, create an attempt or start a timer until Start.
  for (const switchAccount of [false, true]) {
    const h = harness(); let owner = 'recipient', fetches = 0, resolve; const opens = [];
    const Screen = load('mobile-app/src/screens/quiz/QuizInfoScreen.tsx', {
      react: h.react, 'react/jsx-runtime': jsx,
      'react-native': { View: 'View', Text: 'Text', TouchableOpacity: 'Button', ActivityIndicator: 'Spinner', StyleSheet: { create: x => x }, Alert: { alert() {} } },
      '@react-navigation/native': { useRoute: () => ({ params: { quizId: id } }), useNavigation: () => ({ navigate: (...args) => opens.push(args) }), useFocusEffect: cb => h.react.useEffect(cb, [cb]) },
      '../../hooks/useLoadResource': { __esModule: true, default: () => ({ value: { screen: 'QuizInfo', params: { title: 'Shared Quiz' } }, loading: false, error: false }) },
      '../../components/LoadError': { __esModule: true, default: 'Error' }, '../../components/EmptyState': { __esModule: true, default: 'Empty' },
      '../../features/sharing/ContentShareButton': { __esModule: true, default: 'Share' },
      '../../features/sharing/contentDestination': { resolveContentDestination() { throw Error('Only load callback may fetch metadata'); } },
      '../../services/quizService': { fetchQuizTestById: async quizId => { assert.equal(quizId, id); fetches++; return new Promise(r => { resolve = r; }); } },
      '../../services/authState': { getCurrentUser: () => ({ id: owner }) },
      '../../theme/colors': { COLORS: {} }, '../../theme/spacing': { SPACING: {} }, '../../theme/fonts': { FONT: {} },
    }).default;
    const tree = nodes(h.render(Screen)); await tick(); assert.equal(fetches, 0); assert.equal(opens.length, 0);
    assert(tree.some(n => n.type === 'Share' && n.props.id === id));
    const start = tree.find(n => n.type === 'Button').props.onPress; start(); start(); assert.equal(fetches, 1);
    if (switchAccount) owner = 'other';
    resolve({ id, title: 'Shared Quiz', active: true, questions: [{ question: 'Q', options: ['A', 'B'] }], subjectId: 'subject', subjectTitle: 'Subject', yearId: 'year', yearTitle: 'Year' });
    await tick(); assert.equal(opens.length, switchAccount ? 0 : 1);
    if (!switchAccount) {
      assert.equal(opens[0][0], 'Quiz'); assert.equal(opens[0][1].test.id, id);
      assert(!/attemptId|answers|remainingTime|score/.test(JSON.stringify(opens[0][1])));
    }
    h.unmount();
  }
  console.log('PASS shared free/purchased Notes open via recipient authorization; unpurchased Notes keep purchase flow; server denial is enforced; exact-ID sharing; Quiz info requires explicit independent Start, single flight and account isolation');
})().catch(e => { console.error(e); process.exitCode = 1; });

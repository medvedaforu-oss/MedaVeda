const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createClient } = require('../node_modules/@supabase/supabase-js');
const { harness, load, jsx, nodes, tick } = require('./ui-harness.cjs');

async function selectionScenario({ missingProfile = false, firstSaveNoop = false } = {}) {
  const courses = [{ id: 'bams', name: 'BAMS', active: true, display_order: 1 }];
  const years = [{ id: 'bams-1', course_id: 'bams', title: 'First Year', active: true, order: 1 }];
  let profile = missingProfile ? null : { id: 'student', course_id: 'bams', year_id: null };
  let writes = 0;
  const requests = [];
  const failures = [];
  // Only the HTTP boundary is simulated. Use Supabase's real PostgREST parser,
  // including the empty 204 response from the void set_my_course_year RPC.
  const client = createClient('https://selection.test', 'test-anon-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      const url = new URL(input);
      requests.push(url);
      if (url.pathname.endsWith('/rpc/set_my_course_year')) {
        const body = JSON.parse(init.body);
        assert.equal(body.p_course_id, 'bams');
        assert.equal(body.p_year_id, 'bams-1');
        writes++;
        // A void RPC still returns 204 when UPDATE matches no profile row.
        if (profile && !(firstSaveNoop && writes === 1)) {
          profile.course_id = body.p_course_id;
          profile.year_id = body.p_year_id;
        }
        return new Response(null, { status: 204 });
      }
      let data;
      if (url.pathname.endsWith('/courses')) data = courses;
      else if (url.pathname.endsWith('/years')) {
        assert.equal(url.searchParams.get('active'), 'eq.true');
        assert.equal(url.searchParams.get('course_id'), 'eq.bams');
        data = years;
      } else if (url.pathname.endsWith('/profiles')) {
        data = profile ? [{ ...profile, courses: { name: 'BAMS' }, years: profile.year_id ? { title: 'First Year' } : null }] : [];
      } else assert.fail(`Unexpected request: ${url}`);
      return Response.json(data);
    } },
  });
  const supabase = {
    from: client.from.bind(client), rpc: client.rpc.bind(client),
    auth: { onAuthStateChange() {}, getSession: async () => ({ data: { session: { user: { id: 'student' } } } }) },
  };
  const logger = { logDebug() {}, logError: (...args) => failures.push(args) };
  const storage = new Map();
  const cache = load('mobile-app/src/utils/localCache.ts', {
    '@react-native-async-storage/async-storage': {
      getItem: async key => storage.get(key) ?? null,
      setItem: async (key, value) => storage.set(key, value),
    }, './logger': logger,
  });
  const convert = load('mobile-app/src/utils/caseConvert.ts', {});
  const repository = name => load(`mobile-app/src/repositories/${name}Repository.ts`, {
    '../config/supabase': { supabase }, '../utils/caseConvert': convert,
  });
  const auth = { getCurrentUser: () => ({ id: 'student' }) };
  const users = load('mobile-app/src/services/usersService.ts', {
    '../repositories/usersRepository': repository('users'), '../config/supabase': { supabase }, './authState': auth,
  });
  const newCourseState = () => load('mobile-app/src/services/courseState.ts', {
    '../config/supabase': { supabase }, './authState': auth, './usersService': users,
    '../utils/recentActivity': { clearRecentChapters: async () => {} },
    '../utils/recentSearches': { clearRecentSearches: async () => {} },
    '../utils/localCache': cache, '../utils/logger': logger,
  });
  const state = newCourseState();
  await state.loadCourseYear();
  assert.equal(state.needsCourseYearSelection(), true);

  const h = harness();
  const rn = {
    View: 'View', Text: 'Text', ScrollView: 'ScrollView', Pressable: 'Pressable', TouchableOpacity: 'Button',
    ActivityIndicator: 'Spinner', StyleSheet: { create: x => x }, Alert: { alert: (...args) => failures.push(args) },
  };
  const theme = {
    '../theme/colors': load('mobile-app/src/theme/colors.ts', {}), '../theme/spacing': { SPACING: {} }, '../theme/fonts': { FONT: {} },
    '../theme/radius': { RADIUS: {} }, '../theme/shadows': { SHADOW: {} },
    '../theme/motion': { DURATIONS: {}, EASINGS: {}, PRESS_SCALE: 0.96, SPRINGS: {} },
  };
  const animation = {
    __esModule: true, default: { View: 'View', createAnimatedComponent: x => x },
    useSharedValue: value => ({ value }), useAnimatedStyle: fn => fn(),
    withTiming: value => value, withSequence: (...values) => values.at(-1), withSpring: value => value,
  };
  const pressable = load('mobile-app/src/components/motion/AnimatedPressable.tsx', {
    react: h.react, 'react/jsx-runtime': jsx, 'react-native': rn, 'react-native-reanimated': animation,
    '../../theme/motion': theme['../theme/motion'],
  });
  const card = load('mobile-app/src/components/OptionCard.tsx', {
    react: { useEffect() {} }, 'react/jsx-runtime': jsx, 'react-native': rn, 'react-native-reanimated': animation,
    './motion/AnimatedPressable': pressable, ...theme,
  });
  const button = load('mobile-app/src/components/CustomButton.tsx', {
    react: h.react, 'react/jsx-runtime': jsx, 'react-native': rn, ...theme,
  });
  const courseService = load('mobile-app/src/services/coursesService.ts', {
    '../utils/localCache': cache, '../repositories/coursesRepository': repository('courses'),
  });
  const yearService = load('mobile-app/src/services/yearsService.ts', {
    '../utils/localCache': cache, '../repositories/yearsRepository': repository('years'), './authState': auth,
  });
  const hook = load('mobile-app/src/hooks/useCourseYear.ts', { react: h.react, '../services/courseState': state });
  const destinations = [];
  const screen = load('mobile-app/src/screens/onboarding/SelectCourseYearScreen.tsx', {
    react: h.react, 'react/jsx-runtime': jsx, 'react-native': rn,
    '@react-navigation/native': { useRoute: () => ({}), useNavigation: () => ({ replace: name => destinations.push(name) }) },
    '../../components/OptionCard': card, '../../components/CustomButton': button,
    '../../components/EmptyState': { default: 'EmptyState' }, '../../components/ErrorState': { default: 'ErrorState' },
    '../../services/coursesService': courseService, '../../services/yearsService': yearService,
    '../../services/courseState': state, '../../hooks/useCourseYear': hook, '../../utils/logger': logger,
    ...Object.fromEntries(Object.entries(theme).map(([key, value]) => [`../${key}`, value])),
  }).default;
  let tree;
  const render = () => { tree = h.render(screen); };
  const settle = async () => { for (let i = 0; i < 8; i++) { await tick(); render(); } };
  const continueButton = () => button.default(nodes(tree).find(n => n.type === button.default).props);
  const tapCard = title => {
    const node = nodes(tree).find(n => n.type === card.default && n.props.title === title);
    assert.ok(node, `${title} appears`);
    const wrapper = card.default(node.props);
    pressable.default(wrapper.props).props.onPress();
    render();
  };
  const assertSelected = title => {
    const node = nodes(tree).find(n => n.type === card.default && n.props.title === title);
    const wrapper = card.default(node.props);
    const styles = Object.assign({}, ...wrapper.props.children.props.style);
    assert.equal(styles.borderColor, theme['../theme/colors'].COLORS.success, `${title} visibly selects`);
  };
  try {
    render();
    await settle();
    assert.equal(continueButton().props.disabled, true);
    assert.equal(nodes(tree).some(n => n.type === card.default && n.props.title === 'First Year'), false);
    tapCard('BAMS');
    assertSelected('BAMS');
    assert.equal(continueButton().props.disabled, true);
    await settle();
    tapCard('First Year');
    assertSelected('First Year');
    assert.equal(continueButton().props.disabled, false);
    continueButton().props.onPress();
    await settle();
    if (missingProfile || firstSaveNoop) {
      assert.deepEqual(destinations, [], 'Unconfirmed 204 must not navigate to Home');
      const error = nodes(tree).find(n => n.props?.accessibilityRole === 'alert');
      assert.ok(error, 'Save error is visible on web as well as native');
      assert.match(error.props.children, /could not confirm.*course.*year.*try again/i);
      assert.equal(nodes(tree).find(n => n.type === button.default).props.title, 'Try Again');
      assert.equal(continueButton().props.disabled, false);
      assertSelected('BAMS');
      assertSelected('First Year');
      assert.equal(failures.length, 1);
      // SQL tests exercise the real server-side repair. Here we model the row
      // being repaired before retry, to test the client without a hosted write.
      if (missingProfile) profile = { id: 'student', course_id: 'bams', year_id: null };
      continueButton().props.onPress();
      await settle();
      assert.equal(nodes(tree).some(n => n.props?.accessibilityRole === 'alert'), false);
    }
    assert.deepEqual(destinations, ['Home']);
    assert.equal(state.getCourseYear().yearId, 'bams-1');
    assert.equal(requests.filter(url => url.pathname.endsWith('/rpc/set_my_course_year')).length, missingProfile || firstSaveNoop ? 2 : 1);
    if (!missingProfile && !firstSaveNoop) assert.deepEqual(failures, []);
    // Recreate the shared state as on refresh; the simulated server retains
    // the saved profile. This does not claim a live database/browser check.
    const refreshed = newCourseState();
    assert.equal(await refreshed.resolvePostLoginRoute(), 'Home');
    assert.equal(refreshed.getCourseYear().courseId, 'bams');
    assert.equal(refreshed.getCourseYear().yearId, 'bams-1');
  } finally {
    h.unmount();
  }
}

test('course/year visibly select, save accepts 204, and state survives reload', () => selectionScenario());
test('204 with zero profile rows stays on the picker and can retry after server repair', () => selectionScenario({ missingProfile: true }));
test('204 with unchanged year stays on the picker and retry navigates only after confirmation', () => selectionScenario({ firstSaveNoop: true }));

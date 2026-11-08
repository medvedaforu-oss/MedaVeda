const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness, load, jsx, nodes, tick } = require('./ui-harness.cjs');

for (const oldResult of ['success', 'error']) {
  test(`course picker ignores ${oldResult} from the previously selected course`, async () => {
    const h = harness();
    const reads = [];
    const Screen = load('mobile-app/src/screens/onboarding/SelectCourseYearScreen.tsx', {
      react: h.react, 'react/jsx-runtime': jsx,
      'react-native': { View: 'View', Text: 'Text', ScrollView: 'ScrollView',
        ActivityIndicator: 'Spinner', Alert: {}, StyleSheet: { create: value => value } },
      '@react-navigation/native': { useNavigation: () => ({}), useRoute: () => ({}) },
      '../../components/OptionCard': { __esModule: true, default: 'Card' },
      '../../components/CustomButton': { __esModule: true, default: 'Button' },
      '../../components/EmptyState': { __esModule: true, default: 'Empty' },
      '../../components/ErrorState': { __esModule: true, default: 'Error' },
      '../../services/coursesService': { fetchCourses: async () => [
        { id: 'bams', name: 'BAMS' }, { id: 'bhms', name: 'BHMS' },
      ] },
      '../../services/yearsService': { fetchYears: courseId => new Promise((resolve, reject) => {
        reads.push({ courseId, resolve, reject });
      }) },
      '../../services/courseState': { getCourseYear: () => ({}), saveCourseYear: async () => {} },
      '../../hooks/useCourseYear': { __esModule: true, default: () => ({ ready: true }) },
      '../../theme/colors': { COLORS: {} }, '../../theme/fonts': { FONT: {} },
      '../../theme/spacing': { SPACING: {} }, '../../utils/logger': { logError() {} },
    }).default;
    let tree;
    const render = () => { tree = h.render(Screen); };
    const pick = title => {
      nodes(tree).find(node => node.type === 'Card' && node.props.title === title).props.onPress();
      render();
    };
    try {
      render(); await tick(); render();
      pick('BAMS');
      pick('BHMS');
      assert.deepEqual(reads.map(read => read.courseId), ['bams', 'bhms']);
      reads[1].resolve([{ id: 'bhms-1', title: 'BHMS First Year' }]);
      await tick(); render();
      assert.ok(nodes(tree).some(node => node.type === 'Card' && node.props.title === 'BHMS First Year'));
      if (oldResult === 'success') reads[0].resolve([{ id: 'bams-1', title: 'BAMS First Year' }]);
      else reads[0].reject(new Error('Old course request failed'));
      await tick(); render();
      const cards = nodes(tree).filter(node => node.type === 'Card');
      assert.ok(cards.some(node => node.props.title === 'BHMS First Year'), 'Selected course keeps its own years');
      assert.ok(!cards.some(node => node.props.title === 'BAMS First Year'), 'Old course years never replace current years');
      assert.ok(!nodes(tree).some(node => node.type === 'Error'), 'Old request failure cannot hide current years');
    } finally { h.unmount(); }
  });
}

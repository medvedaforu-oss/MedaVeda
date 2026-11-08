const assert = require('node:assert/strict');
const { load, jsx, nodes } = require('./ui-harness.cjs');

for (const provider of ['disabled', 'razorpay']) {
  let opened = 0, notices = 0, navigated = 0;
  const buy = load('mobile-app/src/hooks/usePurchase.ts', {
    '@react-navigation/native': { useNavigation: () => ({ navigate: () => navigated++ }) },
    'react-native': { Platform: { OS: 'android' }, Alert: { alert(title, message) {
      assert.equal(title, 'Purchases unavailable');
      assert.match(message, /Previously purchased Notes remain accessible/);
      notices++;
    } } },
    '../config/paymentProvider': { paymentProvider: provider },
  }).default().buy;
  const mocks = {
    react: {}, 'react/jsx-runtime': jsx,
    'react-native': { TouchableOpacity: 'Button', View: 'View', Text: 'Text', StyleSheet: { create: x => x } },
    '../config/paymentProvider': { paymentProvider: provider },
  };
  for (const [file, key] of [['colors', 'COLORS'], ['fonts', 'FONT'], ['spacing', 'SPACING'], ['radius', 'RADIUS'], ['shadows', 'SHADOW']]) {
    mocks['../theme/' + file] = { [key]: file === 'colors' ? { yearAccents: ['green'] } : {} };
  }
  const Card = load('mobile-app/src/components/ProductPosterCard.tsx', mocks).default;
  const props = { title: 'Notes', price: 49, originalPrice: 99, onPress: () => opened++, onBuyPress: () => buy({ id: 'notes', title: 'Notes' }) };
  const tree = Card(props);
  const buttons = nodes(tree).filter(n => n.type === 'Button');
  assert.equal(buttons.length, 2);
  buttons[0].props.onPress();
  assert.equal(opened, 1, 'Browsing content remains available');
  buttons[1].props.onPress();
  if (provider === 'disabled') {
    assert.match(JSON.stringify(tree), /Purchases unavailable/);
    assert.doesNotMatch(JSON.stringify(tree), /Buy Now|₹/);
    assert.equal(notices, 1);
    assert.equal(navigated, 0);
  } else {
    assert.match(JSON.stringify(tree), /Buy Now/);
    assert.equal(navigated, 1, 'Existing Razorpay hook behavior is preserved when explicitly mocked');
  }
  const owned = Card({ ...props, owned: true });
  assert.match(JSON.stringify(owned), /Owned/);
  assert.equal(nodes(owned).filter(n => n.type === 'Button').length, 1);
}

// Search products use the same unavailable state; owned records remain owned.
for (const owned of [false, true]) {
  const mocks = {
    react: {}, 'react/jsx-runtime': jsx,
    'react-native': { View: 'View', Text: 'Text', TouchableOpacity: 'Button', StyleSheet: { create: x => x } },
    '../../config/paymentProvider': { paymentProvider: 'disabled' },
    './HighlightedText': { __esModule: true, default: 'Highlight' },
    '../../types/search': { SECTION_META: { product: { icon: 'book' } } },
  };
  for (const [file, key] of [['colors', 'COLORS'], ['fonts', 'FONT'], ['spacing', 'SPACING'], ['radius', 'RADIUS']]) mocks['../../theme/' + file] = { [key]: {} };
  const Row = load('mobile-app/src/components/search/SearchResultRow.tsx', mocks).default;
  const row = Row({ result: { type: 'product', owned, price: 49, title: 'Notes' }, onPress() {} });
  assert.match(JSON.stringify(row), owned ? /Owned/ : /Purchases unavailable/);
}
console.log('PASS unavailable Buy/search UI, no checkout navigation, content browsing and owned state preserved');

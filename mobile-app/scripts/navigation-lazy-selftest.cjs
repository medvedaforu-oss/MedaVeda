const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.env.MEDVEDA_MOBILE_ROOT || path.resolve(__dirname, '..');
const ts = require(path.join(root, 'node_modules/typescript'));
const baseline = process.argv.includes('--baseline');
const element = (type, props, ...children) => ({ type, props: { ...props, children } });
const flatten = node => [node, ...(node?.props?.children ?? []).flat(Infinity).flatMap(child => child && typeof child === 'object' ? flatten(child) : [])];
function compile(file, require_) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports: mod.exports, module: mod, require: require_, React: { createElement: element }, __DEV__: false });
  return mod.exports;
}
for (const provider of ['disabled', 'razorpay', 'play']) {
  const loads = [], modules = new Map(); let fail = false, sentry = false;
  const react = { createElement: element, useState: value => [typeof value === 'function' ? value() : value, () => {}], useEffect() {} };
  const Stack = { Navigator: 'Navigator', Group: 'Group', Screen: 'Screen' };
  function require_(name) {
    if (name.includes('/screens/')) {
      loads.push(name);
      if (fail && name.endsWith('/PdfViewerScreen')) throw Error('fixture module load failure');
      if (!modules.has(name)) modules.set(name, { __esModule: true, default: function Screen() {} });
      return modules.get(name);
    }
    if (name === '../config/sentry') { sentry = true; return {}; }
    if (name === 'react-native') return { AppState: { addEventListener: () => ({ remove() {} }) } };
    if (name === 'react') return { __esModule: true, default: react, ...react };
    if (name === '@react-navigation/native') return { NavigationContainer: 'NavigationContainer', DefaultTheme: { colors: {} }, useNavigationContainerRef: () => ({}) };
    if (name === '@react-navigation/native-stack') return { createNativeStackNavigator: () => Stack };
    if (name === '../services/authState') return { getCurrentUser: () => ({ id: 'fixture' }), subscribeAuthUser() {} };
    if (name === '../utils/logger') return {logError(){}};
    if (name === '../theme/colors') return { COLORS: {} };
    if (name === '../theme/fonts') return { FONT: { subHeading: 18 } };
    if (name === '../config/paymentProvider') return { paymentProvider: provider };
    if (name === '../components/ErrorBoundary') return { __esModule: true, default: 'ErrorBoundary' };
    if (name.includes('/hooks/')) return { __esModule: true, default() {} };
    if (name.endsWith('/studyReminderService') || name.endsWith('/deepLinkStore')) return {};
    throw Error(name);
  }
  const Navigator = compile('src/navigation/AppNavigator.tsx', require_).default;
  assert.ok(sentry, 'Sentry still initializes eagerly');
  const eager = loads.length;
  const tree = Navigator();
  assert.equal(tree.type, 'ErrorBoundary', 'Existing load/render error boundary remains');
  const screens = flatten(tree).filter(n => n?.type === 'Screen');
  assert.equal(new Set(screens.map(n => n.props.name)).size, screens.length);
  assert.equal(screens.some(n => n.props.name === 'PlayBilling'), false);
  assert.equal(screens.some(n => n.props.name === 'PaymentCheckout'), provider === 'razorpay', 'Play distribution must not register Razorpay checkout');
  assert.equal(screens.some(n => n.props.name === 'OrderSummary'), provider !== 'disabled');
  const preferences = screens.find(n => n.props.name === 'NotificationPreferences');
  assert.ok(preferences, 'The notification center preferences destination must be registered');
  assert.equal(typeof preferences.props.getComponent, 'function', 'Preferences remain lazy');
  const pdf = screens.find(n => n.props.name === 'PdfViewer');
  if (!baseline) {
    assert.equal(eager, 7, 'Only startup/auth/onboarding screens remain eager');
    assert.equal(loads.length, eager, 'Registering routes does not load deferred screens');
    assert.equal(typeof preferences.props.getComponent(), 'function');
    assert.ok(loads.includes('../screens/notifications/NotificationPreferencesScreen'));
    const summary = screens.find(n => n.props.name === 'OrderSummary');
    if (summary) { summary.props.getComponent(); assert.ok(loads.includes(provider === 'play' ? '../screens/payment/PlayOrderSummaryScreen' : '../screens/payment/OrderSummaryScreen')); }
    fail = true; assert.throws(() => pdf.props.getComponent(), /fixture module load failure/); fail = false;
    const loaded = pdf.props.getComponent();
    assert.equal(pdf.props.getComponent(), loaded, 'Repeated navigation preserves component identity');
    for (const screen of screens) {
      const component = screen.props.component ?? screen.props.getComponent();
      assert.equal(typeof component, 'function', screen.props.name);
    }
  }
  console.log(JSON.stringify({ provider, registeredRoutes: screens.length, eagerScreenModules: eager, lazyRoutes: screens.filter(n => n.props.getComponent).length }));
}
// Exercise the existing boundary's actual error/retry presentation contract.
class Component { constructor(props) { this.props = props; } setState(next) { this.state = { ...this.state, ...next }; } }
const react = { Component, createElement: element };
const Boundary = compile('src/components/ErrorBoundary.tsx', name => {
  if (name === 'react') return { __esModule: true, default: react, ...react };
  if (name === 'react-native') return { View: 'View', Text: 'Text', StyleSheet: { create: x => x } };
  if (name.endsWith('/colors')) return { COLORS: {} };
  if (name.endsWith('/logger')) return { logError() {}, logDebug() {} };
  if (name.endsWith('/AnimatedPressable')) return { __esModule: true, default: 'Retry' };
  throw Error(name);
}).default;
const boundary = new Boundary({ children: 'screen' });
boundary.state = Boundary.getDerivedStateFromError(Error('fixture'));
assert.equal(boundary.render().type, 'View');
boundary.handleRetry(); assert.equal(boundary.render(), 'screen');
console.log('PASS route registration, provider gates, eager Sentry and existing error/retry fallback contract');

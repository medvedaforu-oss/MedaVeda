const assert = require('node:assert/strict');
const { harness, load, jsx, nodes, tick } = require('./ui-harness.cjs');

// Exercise the actual root render on both platforms while the availability
// request is unresolved. Native database/legacy cleanup remains a prerequisite.
async function check(platform) {
  const h = harness(); let mode = null, required = false, clean;
  let stopped = false;
  const App = load('mobile-app/App.tsx', {
    react: h.react, 'react/jsx-runtime': jsx,
    'react-native': { Platform: { OS: platform }, ActivityIndicator: 'Spinner', Text: 'Text', TouchableOpacity: 'Button', View: 'View' },
    'react-native-gesture-handler': { GestureHandlerRootView: 'GestureRoot' },
    'expo-status-bar': { StatusBar: 'Status' },
    'react-native-safe-area-context': { SafeAreaProvider: 'Provider', SafeAreaView: 'SafeArea' },
    './src/navigation/AppNavigator': { __esModule: true, default: 'Navigation' },
    './src/screens/update/UpdateRequiredScreen': { __esModule: true, default: 'Update' },
    './src/screens/maintenance/MaintenanceScreen': { __esModule: true, default: 'Maintenance' },
    './src/hooks/useMaintenanceMode': { __esModule: true, default: () => ({ enabled: mode, checking: true }) },
    './src/hooks/useForceUpdate': { __esModule: true, default: () => ({ required }) },
    './src/config/database': { initDatabase() {} },
    './src/utils/downloadManager': { removeLegacyOfflineQuizzes: () => new Promise(resolve => { clean = resolve; }), recoverInterruptedDownloads() {} },
    './src/services/syncEngine': { startSyncEngine() {}, stopSyncEngine() { stopped = true; } },
    './src/services/pushNotifications': { registerForPushNotifications: async () => {} },
    './src/services/authState': { getCurrentUser: () => null }, './src/utils/logger': { logError() {} },
  }).default;
  const types = () => nodes(h.render(App)).map(n => n.type);
  if (platform === 'android') {
    assert.ok(types().includes('Spinner')); assert.ok(!types().includes('Navigation'));
    clean(); await tick();
  }
  for (mode of [null, false]) { assert.ok(types().includes('Navigation')); assert.ok(!types().includes('Maintenance')); }
  mode = true; assert.ok(types().includes('Maintenance')); assert.ok(!types().includes('Navigation'));
  mode = false; required = true; assert.ok(types().includes('Update')); assert.ok(!types().includes('Navigation'));
  mode = null; assert.ok(types().includes('Update'), 'pending availability cannot mask mandatory updates');
  required = false; assert.ok(types().includes('Navigation'));
  h.unmount(); assert.equal(stopped, platform === 'android');
}
(async () => {
  await check('web'); await check('android');
  console.log('PASS web/Android root: pending/disabled availability opens navigation, confirmed maintenance and required updates gate; native offline preparation preserved');
  for (const [session, url, expected] of [
    [null, null, 'Login'], [{ user: { id: 'fixture' } }, null, 'Home'],
    [null, 'medveda://reset-password#type=recovery', 'ResetPassword'],
  ]) {
    const h = harness(); const routes = []; const navigation = { replace: route => routes.push(route) };
    const Splash = load('mobile-app/src/screens/auth/SplashScreen.tsx', {
      react: h.react, 'react/jsx-runtime': jsx,
      'react-native': { View: 'View', Text: 'Text', StyleSheet: { create: x => x }, ActivityIndicator: 'Spinner', Linking: { getInitialURL: async () => url } },
      '../../config/supabase': { supabase: { auth: { getSession: async () => ({ data: { session } }) } } },
      '../../services/courseState': { resolvePostLoginRoute: async () => 'Home' },
      '../../components/BrandLogo': { __esModule: true, default: 'Logo' },
      '../../components/ErrorState': { __esModule: true, default: 'Error' },
      '../../theme/colors': { COLORS: {} }, '../../theme/spacing': { SPACING: {} },
    }, { setTimeout: () => { throw Error('Splash must not schedule an artificial delay'); } }).default;
    h.render(() => Splash({ navigation })); await tick(); assert.deepEqual(routes, [expected]); h.unmount();
  }
  console.log('PASS splash routes restored/signed-out/recovery sessions without scheduling a delay');
})().catch(e => { console.error(e); process.exitCode = 1; });

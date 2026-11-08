const assert = require('node:assert/strict');
const { harness, load, jsx, nodes, tick } = require('./ui-harness.cjs');

const values = new Map();
const storage = {
  getItem: async key => values.get(key) ?? null,
  setItem: async (key, value) => { values.set(key, value); },
};
const preferences = load('mobile-app/src/utils/notificationPreferences.ts', {
  '@react-native-async-storage/async-storage': { __esModule: true, default: storage },
});
const native = {
  View: 'View', Text: 'Text', ScrollView: 'ScrollView', Switch: 'Switch',
  TouchableOpacity: 'Button', ActivityIndicator: 'Spinner', FlatList: 'List',
  StyleSheet: { create: value => value },
};
const theme = Object.fromEntries([
  ['colors', 'COLORS'], ['typography', 'FONT'], ['spacing', 'SPACING'],
  ['radius', 'RADIUS'], ['shadows', 'SHADOW'],
].map(([file, name]) => ['../../theme/' + file, { [name]: {} }]));

function mountPreferences() {
  const h = harness();
  const Screen = load('mobile-app/src/screens/notifications/NotificationPreferencesScreen.tsx', {
    react: h.react, 'react/jsx-runtime': jsx, 'react-native': native,
    ...theme, '../../utils/notificationPreferences': preferences,
  }).default;
  const render = () => nodes(h.render(Screen));
  return { h, render };
}

(async () => {
  // Exercise the real notification-center button's destination.
  let destination;
  const center = load('mobile-app/src/screens/notifications/NotificationsScreen.tsx', {
    react: { useState: value => [value, () => {}], useCallback: fn => fn },
    'react/jsx-runtime': jsx, 'react-native': native, ...theme,
    '@react-navigation/native': {
      useFocusEffect() {}, useNavigation: () => ({ navigate: name => { destination = name; } }),
    },
    '../../components/NotificationRow': { default: 'Row' },
    '../../components/EmptyState': { default: 'Empty' },
    '../../components/ErrorState': { default: 'Error' },
    '../../services/notificationsService': {}, '../../utils/logger': {},
  }).default;
  nodes(center()).find(node => node.type === 'Button').props.onPress();
  assert.equal(destination, 'NotificationPreferences');

  const mounted = mountPreferences();
  mounted.render();
  await tick();
  let switches = mounted.render().filter(node => node.type === 'Switch');
  assert.equal(switches.length, preferences.NOTIFICATION_CATEGORIES.length);
  assert.ok(switches.every(node => node.props.value));
  const offer = preferences.NOTIFICATION_CATEGORIES.findIndex(category => category.type === 'offer');
  await switches[offer].props.onValueChange(false);
  assert.equal(mounted.render().filter(node => node.type === 'Switch')[offer].props.value, false);
  mounted.h.unmount();

  // Preferences survive leaving the screen and feed the real list filter.
  const reopened = mountPreferences();
  reopened.render();
  await tick();
  switches = reopened.render().filter(node => node.type === 'Switch');
  assert.equal(switches[offer].props.value, false);
  const notifications = load('mobile-app/src/services/notificationsService.ts', {
    '@react-native-async-storage/async-storage': { __esModule: true, default: storage },
    '../utils/notificationPreferences': preferences,
    './authState': { getCurrentUser: () => ({ id: 'fixture' }) },
    '../utils/logger': { logDebug() {} },
    '../config/supabase': { supabase: { from: () => ({ select: () => ({ eq: () => ({
      order: async () => ({ data: [
        { id: 'offer', type: 'offer' }, { id: 'note', type: 'new_notes' },
      ] }),
    }) }) }) } },
  });
  assert.deepEqual(Array.from(await notifications.fetchNotifications(), item => item.id), ['note']);
  await switches[offer].props.onValueChange(true);
  assert.deepEqual(Array.from(await notifications.fetchNotifications(), item => item.id), ['offer', 'note']);
  reopened.h.unmount();
  console.log('PASS notification gear destination, persisted category switches, remount, mute and unmute filtering');
})().catch(error => { console.error(error); process.exitCode = 1; });

const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { load, harness, jsx, nodes } = require('../../../../mobile-app/scripts/ui-harness.cjs');

function sender() {
  let handler;
  const messages = [], requests = new Map(), feed = [];
  let reservations = 0;
  const db = {
    async rpc(name, args) {
      assert.equal(name, 'reserve_notification_request'); reservations++;
      const old = requests.get(args.p_request_id);
      if (old) {
        // PostgREST/jsonb crosses a JSON boundary; VM object prototypes do not.
        assert.deepEqual(JSON.parse(JSON.stringify(args.p_payload)), JSON.parse(JSON.stringify(old.payload)), 'replay payload identity retained');
        return { data: { reserved: false, result: old.result } };
      }
      requests.set(args.p_request_id, { payload: args.p_payload, result: {
        httpStatus: 200, body: { success: false, code: 'unknown_outcome', unknown: 1 },
      } });
      feed.push({ title: args.p_payload.title, body: args.p_payload.body, type: args.p_payload.type });
      return { data: { reserved: true } };
    },
    from(table) {
      const chain = {
        select() { return this; }, eq() { return this; }, order() { return this; }, range() { return this; },
        update(value) { this.value = value; return this; },
        async maybeSingle() { return { data: table === 'admins' ? { id: 'admin' } : { require_mfa: true } }; },
        then(resolve) {
          if (table === 'notification_requests') {
            [...requests.values()].at(-1).result = this.value.result;
            return Promise.resolve(resolve({ error: null }));
          }
          assert.equal(table, 'push_tokens');
          return Promise.resolve(resolve({ data: [{ expo_push_token: 'ExpoPushToken[synthetic_123456]' }] }));
        },
      };
      return chain;
    },
  };
  load(process.env.FIX6_SENDER_SOURCE || 'supabase/functions/send-push-notification/index.ts', {
    '../_shared/cors.ts': { handleOptions: () => null, jsonResponse: (b, status = 200) => Response.json(b, { status }) },
    '../_shared/supabaseAdmin.ts': { supabaseAdmin: db, getUserFromAuthHeader: async () => ({ id: 'admin' }), aalFromAuthHeader: () => 'aal2' },
    '../_shared/rateLimit.ts': { withinLimit: async () => true },
  }, { Deno: { serve: h => { handler = h; } }, TextEncoder, fetch: async (_url, init) => {
    const sent = JSON.parse(init.body); messages.push(...sent);
    return Response.json({ data: sent.map(() => ({ status: 'ok', id: 'synthetic-ticket' })) });
  } });
  const invoke = payload => handler(new Request('https://fixture.invalid', { method: 'POST', body: JSON.stringify(payload) }));
  return { invoke, messages, requests, feed, reservations: () => reservations };
}

function foreground() {
  let handler;
  const preferences = load('mobile-app/src/utils/notificationPreferences.ts', {
    '@react-native-async-storage/async-storage': { __esModule: true, default: { getItem: async () => JSON.stringify({ offer: false }) } },
  });
  load('mobile-app/src/services/studyReminderService.ts', {
    '@react-native-async-storage/async-storage': {}, 'react-native': { Platform: { OS: 'android' } },
    'expo-constants': { default: { executionEnvironment: 'standalone' }, ExecutionEnvironment: { StoreClient: 'go' } },
    'expo-notifications': { setNotificationHandler: h => { handler = h; } },
    './notificationRouting': load('mobile-app/src/services/notificationRouting.ts', {}),
    '../utils/logger': {}, '../utils/notificationPreferences': preferences,
  });
  let id = 0;
  return data => handler.handleNotification({ request: { identifier: String(++id), content: { data } } });
}

async function compose(s, type) {
  let submitted;
  const service = load('admin-panel/src/services/notificationService.ts', {
    '../config/supabase': { supabase: {
      auth: { getSession: async () => ({ data: { session: { access_token: 'synthetic-admin' } } }) },
      functions: { invoke: async (name, options) => {
        assert.equal(name, 'send-push-notification'); submitted = JSON.parse(JSON.stringify(options.body));
        const response = await s.invoke(submitted);
        assert.equal(response.status, 200);
        return { data: await response.json(), error: null };
      } },
    } },
  });
  const h = harness();
  const Screen = load('admin-panel/src/pages/Notifications.tsx', {
    react: h.react, 'react/jsx-runtime': jsx, '../services/notificationService': service,
  }, { crypto: webcrypto, alert: () => assert.fail('unexpected alert') }).default;
  const render = () => nodes(h.render(Screen));
  for (const [label, value] of [['Notification title', 'Public fixture'], ['Notification message', 'Synthetic broadcast'], ['Notification type', type]]) {
    render().find(n => n.props?.['aria-label'] === label).props.onChange({ target: { value } });
  }
  await render().find(n => n.type === 'button').props.onClick();
  assert.ok(submitted, 'actual composer must dispatch through actual service');
  return submitted;
}

const tests = {
  async composer() {
    const s = sender(), present = foreground();
    const payload = await compose(s, 'offer');
    assert.equal(payload.data, undefined, 'composer sends top-level category');
    const presentation = await present(s.messages[0].data);
    console.log('OBSERVED composer offer: pushed data.type=' + s.messages[0].data.type + ', foreground banner=' + presentation.shouldShowBanner);
    assert.equal(presentation.shouldShowBanner, false, 'muted offer suppressed');
    assert.equal(s.messages[0].data.type, 'offer', 'sender must supply foreground category');
    assert.equal(s.feed[0].type, 'offer');
    const before = s.messages.length, result = await s.invoke(payload);
    assert.equal(result.status, 200); assert.equal(s.messages.length, before); assert.equal(s.feed.length, 1);
  },
  async conflicts() {
    const s = sender();
    const payload = { requestId: webcrypto.randomUUID(), title: 'Public', body: 'Fixture', type: 'offer', data: { type: 'app_update', screen: 'Notifications' } };
    assert.equal((await s.invoke(payload)).status, 200);
    assert.equal(s.messages[0].data.type, 'offer', 'validated top-level category overwrites conflict');
    assert.equal(s.messages[0].data.screen, 'Notifications');
    assert.equal([...s.requests.values()][0].payload.data.type, 'app_update', 'reservation identity stays compatible with old requests');
    await s.invoke(payload); assert.equal(s.messages.length, 1);
  },
  async defaultsAndBroadcast() {
    const s = sender(), present = foreground();
    for (const type of ['announcement', 'quiz']) {
      await compose(s, type); assert.equal((await present(s.messages.at(-1).data)).shouldShowBanner, true);
    }
    for (const data of [{}, { type: 'future_category' }]) assert.equal((await present(data)).shouldShowBanner, true);
    const before = s.feed.length, reservations = s.reservations();
    const response = await s.invoke({ requestId: webcrypto.randomUUID(), title: 'Private fixture', body: 'Never persist', type: 'offer', targetUserIds: ['student'] });
    assert.equal(response.status, 400); assert.equal(s.feed.length, before); assert.equal(s.reservations(), reservations);
  },
  async legacyReplay() {
    const s = sender();
    const requestId = webcrypto.randomUUID();
    const payload = { title: 'Public', body: 'Fixture', type: 'offer', data: {} };
    s.requests.set(requestId, { payload, result: { httpStatus: 200, body: { success: true, pushed: 1 } } });
    const response = await s.invoke({ ...payload, requestId });
    assert.equal(response.status, 200); assert.equal((await response.json()).pushed, 1);
    assert.equal(s.messages.length, 0); assert.equal(s.feed.length, 0);
  },
  async size() {
    const s = sender();
    const response = await s.invoke({ requestId: webcrypto.randomUUID(), title: 'Public', body: 'Fixture', type: 'offer', data: { pad: 'x'.repeat(1010) } });
    assert.equal(response.status, 400, 'final pushed data including type must stay within 1024 bytes');
    assert.equal(s.feed.length, 0); assert.equal(s.messages.length, 0);
  },
  async wording() {
    const h = harness(), native = { ScrollView: 'ScrollView', View: 'View', Text: 'Text', Switch: 'Switch', StyleSheet: { create: x => x } };
    const themes = Object.fromEntries([['colors', 'COLORS'], ['typography', 'FONT'], ['spacing', 'SPACING'], ['radius', 'RADIUS'], ['shadows', 'SHADOW']].map(([n, value]) => ['../../theme/' + n, { [value]: {} }]));
    const Screen = load('mobile-app/src/screens/notifications/NotificationPreferencesScreen.tsx', {
      react: h.react, 'react/jsx-runtime': jsx, 'react-native': native, ...themes,
      '../../utils/notificationPreferences': { NOTIFICATION_CATEGORIES: [], getNotificationPreferences: async () => ({}) },
    }).default;
    const text = nodes(h.render(Screen)).filter(n => n.type === 'Text').map(n => n.props.children).join(' ');
    assert.match(text, /in-app feed/); assert.match(text, /app is open/); assert.match(text, /background or closed-app delivery/i);
  },
};
(async () => {
  let failures = 0;
  for (const [name, test] of Object.entries(tests)) { try { await test(); console.log('PASS', name); } catch (e) { failures++; console.error('FAIL', name, e); } }
  process.exitCode = failures ? 1 : 0;
})();

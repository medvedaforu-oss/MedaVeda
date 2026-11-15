const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRecoveryFlow } = require('../src/features/auth/recoveryFlow.js');
const root = path.resolve(__dirname, '../..');
const tokens = { accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh' };
const password = 'ExampleOnly123!';
const tick = () => new Promise(setImmediate);
const error = code => ({ code, message: 'Untrusted payload must never be displayed' });

function fixture(options = {}) {
  const calls = [];
  const config = { mfa: false, level: 'aal1', factors: [{ id: 'totp-1', status: 'verified', factor_type: 'totp' }], ...options };
  const result = data => ({ data, error: null });
  const invoke = (name, work) => async (...args) => {
    calls.push(name);
    if (config[name]) {
      const reply = await config[name](...args);
      if (reply) return reply;
    }
    return work(...args);
  };
  const auth = {
    setSession: invoke('setSession', () => result({ session: {} })),
    mfa: {
      getAuthenticatorAssuranceLevel: invoke('aal', () => result({ currentLevel: config.level, nextLevel: config.mfa ? 'aal2' : 'aal1' })),
      listFactors: invoke('listFactors', () => result({ all: config.factors })),
      challengeAndVerify: invoke('verify', ({ factorId, code }) => {
        assert.equal(factorId, 'totp-1');
        if (code !== '123456') return { error: error('mfa_verification_failed') };
        if (!config.noUpgrade) config.level = 'aal2';
        return result({});
      }),
    },
    updateUser: invoke('updateUser', args => { assert.equal(args.password, password); return result({ user: {} }); }),
    signOut: invoke('signOut', () => ({ error: null })),
  };
  return { auth, config, calls, flow: createRecoveryFlow(auth), count: name => calls.filter(c => c === name).length };
}

test('non-MFA recovery imports session, rechecks assurance, updates and signs out', async () => {
  const f = fixture();
  assert.equal((await f.flow.start(tokens)).phase, 'ready');
  assert.equal((await f.flow.updatePassword(password)).phase, 'done');
  assert.deepEqual(f.calls, ['setSession', 'aal', 'aal', 'updateUser', 'signOut']);
});

test('MFA recovery requires existing verified TOTP and uses one client/session', async () => {
  const f = fixture({ mfa: true, factors: [
    { id: 'unverified', status: 'unverified', factor_type: 'totp' },
    { id: 'phone', status: 'verified', factor_type: 'phone' },
    { id: 'totp-1', status: 'verified', factor_type: 'totp' },
  ] });
  const state = await f.flow.start(tokens);
  assert.equal(state.phase, 'mfa');
  assert.deepEqual(state.factors.map(f => f.id), ['totp-1']);
  await assert.rejects(f.flow.updatePassword(password), { code: 'mfa_required' });
  assert.equal(f.count('updateUser'), 0);
  assert.equal((await f.flow.verify('totp-1', '123456')).phase, 'ready');
  assert.equal((await f.flow.updatePassword(password)).phase, 'done');
  assert.equal(f.count('setSession'), 1);
  assert.equal(f.count('verify'), 1);
  assert.equal(f.count('updateUser'), 1);
});

test('incorrect and malformed OTPs are sanitized and can be retried', async () => {
  const f = fixture({ mfa: true });
  await f.flow.start(tokens);
  await assert.rejects(f.flow.verify('totp-1', 'bad'), { code: 'mfa_verification_failed' });
  assert.equal(f.count('verify'), 0);
  await assert.rejects(f.flow.verify('totp-1', '654321'), e => e.code === 'mfa_verification_failed' && !e.message.includes('Untrusted'));
  assert.equal(f.flow.snapshot().phase, 'mfa');
  assert.equal((await f.flow.verify('totp-1', '123456')).phase, 'ready');
});

test('successful verification response without actual AAL2 cannot unlock update', async () => {
  const f = fixture({ mfa: true, noUpgrade: true });
  await f.flow.start(tokens);
  await assert.rejects(f.flow.verify('totp-1', '123456'), { code: 'mfa_required' });
  await assert.rejects(f.flow.updatePassword(password), { code: 'mfa_required' });
  assert.equal(f.count('updateUser'), 0);
});

test('missing or unsupported factors block recovery with safe help', async () => {
  for (const factors of [[], [{ id: 'u', status: 'unverified', factor_type: 'totp' }], [{ id: 'p', status: 'verified', factor_type: 'phone' }]]) {
    const f = fixture({ mfa: true, factors });
    await assert.rejects(f.flow.start(tokens), e => e.code === 'mfa_unavailable' && e.message.includes('support'));
    assert.equal(f.flow.snapshot().phase, 'blocked');
    assert.equal(f.count('verify'), 0);
    assert.equal(f.count('updateUser'), 0);
  }
});

test('expired import and expired verification session block password changes', async () => {
  for (const stage of ['setSession', 'verify', 'updateUser']) {
    const f = fixture({ mfa: stage === 'verify', [stage]: () => ({ error: error('session_expired') }) });
    if (stage === 'setSession') await assert.rejects(f.flow.start(tokens), { code: 'recovery_expired' });
    else {
      await f.flow.start(tokens);
      await assert.rejects(stage === 'verify' ? f.flow.verify('totp-1', '123456') : f.flow.updatePassword(password), { code: 'recovery_expired' });
    }
    assert.equal(f.flow.snapshot().phase, 'expired');
    await assert.rejects(f.flow.updatePassword(password), { code: 'recovery_expired' });
    assert.equal(f.count('signOut'), 0);
  }
});

test('missing session, invalid JWT and revoked refresh token fail closed', async () => {
  for (const code of ['bad_jwt', 'refresh_token_not_found', 'refresh_token_already_used', 'otp_expired']) {
    const f = fixture({ setSession: () => ({ error: error(code) }) });
    await assert.rejects(f.flow.start(tokens), { code: 'recovery_expired' });
    assert.equal(f.count('updateUser'), 0);
  }
  await assert.rejects(fixture().flow.start(null), { code: 'recovery_expired' });
});

test('insufficient_aal enters MFA and only retries update after verification', async () => {
  const f = fixture();
  await f.flow.start(tokens);
  f.config.updateUser = () => ({ error: error('insufficient_aal') });
  assert.equal((await f.flow.updatePassword(password)).phase, 'mfa');
  await assert.rejects(f.flow.updatePassword(password), { code: 'mfa_required' });
  assert.equal(f.count('updateUser'), 1);
  await f.flow.verify('totp-1', '123456');
  f.config.updateUser = null;
  assert.equal((await f.flow.updatePassword(password)).phase, 'done');
});

test('insufficient_aal with stale AAL2 still requires a fresh challenge, including network retry', async () => {
  const f = fixture({ level: 'aal2', mfa: true });
  await f.flow.start(tokens);
  f.config.updateUser = () => ({ error: error('insufficient_aal') });
  f.config.listFactors = () => { throw new TypeError('secret request details'); };
  await assert.rejects(f.flow.updatePassword(password), { code: 'network_error' });
  assert.equal(f.flow.snapshot().phase, 'idle');
  f.config.listFactors = null;
  assert.equal((await f.flow.start(null)).phase, 'mfa');
  assert.equal(f.count('setSession'), 1);
});

test('network and rate-limit failures allow safe retry without reimporting recovery tokens', async () => {
  const f = fixture({ mfa: true, aal: () => { throw new TypeError('sensitive details'); } });
  await assert.rejects(f.flow.start(tokens), e => e.code === 'network_error' && !e.message.includes('sensitive'));
  f.config.aal = null;
  await f.flow.start(null);
  assert.equal(f.count('setSession'), 1);
  f.config.verify = () => ({ error: { status: 429 } });
  await assert.rejects(f.flow.verify('totp-1', '123456'), { code: 'over_request_rate_limit' });
  f.config.verify = null;
  await f.flow.verify('totp-1', '123456');
  f.config.updateUser = () => { throw new TypeError('network'); };
  await assert.rejects(f.flow.updatePassword(password), { code: 'network_error' });
  f.config.updateUser = null;
  assert.equal((await f.flow.updatePassword(password)).phase, 'done');
});

test('duplicate import, verification and password update are rejected while in flight', async () => {
  for (const stage of ['setSession', 'verify', 'updateUser']) {
    const f = fixture({ mfa: stage === 'verify' });
    if (stage !== 'setSession') await f.flow.start(tokens);
    let release;
    f.config[stage] = () => new Promise(resolve => { release = () => resolve(null); });
    const action = () => stage === 'setSession' ? f.flow.start(tokens) : stage === 'verify' ? f.flow.verify('totp-1', '123456') : f.flow.updatePassword(password);
    const first = action();
    await tick();
    await assert.rejects(action(), { code: 'busy' });
    release();
    await first;
    assert.equal(f.count(stage), 1);
  }
});

test('sign-out failure cannot repeat password mutation; cleanup is retried separately', async () => {
  const f = fixture({ signOut: () => ({ error: error('unexpected_failure') }) });
  await f.flow.start(tokens);
  await assert.rejects(f.flow.updatePassword(password), { code: 'cleanup_failed' });
  assert.equal(f.flow.snapshot().phase, 'cleanup');
  f.config.signOut = null;
  assert.equal((await f.flow.retryCleanup()).phase, 'done');
  assert.equal(f.count('updateUser'), 1);
  assert.equal(f.count('signOut'), 2);
});

test('AAL downgrade before submit returns to MFA without updating password', async () => {
  const f = fixture({ mfa: true });
  await f.flow.start(tokens);
  await f.flow.verify('totp-1', '123456');
  f.config.level = 'aal1';
  assert.equal((await f.flow.updatePassword(password)).phase, 'mfa');
  assert.equal(f.count('updateUser'), 0);
});

test('password policy errors are classified by code and raw server messages are hidden', async () => {
  for (const code of ['same_password', 'weak_password']) {
    const f = fixture({ updateUser: () => ({ error: error(code) }) });
    await f.flow.start(tokens);
    await assert.rejects(f.flow.updatePassword(password), e => e.code === code && !e.message.includes('Untrusted'));
    assert.equal(f.flow.snapshot().phase, 'ready');
  }
});

function browser(f, fragment = { type: 'recovery', ...tokens }) {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, { value: '', disabled: false, textContent: '', style: {}, children: [],
      classList: { add() {}, remove() {}, toggle() {} }, focus() {}, setAttribute() {},
      addEventListener(name, listener) { this[name] = listener; }, appendChild(child) { this.children.push(child); if (!this.value) this.value = child.value; } });
    return elements.get(id);
  };
  let visible;
  const sandbox = { window: {}, document: { getElementById: get, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}) }, location: {}, console: { log() { throw Error('No secret logging'); }, error() { throw Error('No secret logging'); } } };
  sandbox.window.MedVedaAuth = { cfg: {}, readFragment: () => ({ ...fragment, raw: 'synthetic' }), newClient: () => ({ auth: f.auth }),
    show: id => { visible = id; }, setText: (id, text) => { get(id).textContent = text; }, friendlyError: () => 'Link expired' };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'website/assets/js/recovery-flow.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'website/assets/js/reset-password.js'), 'utf8'), sandbox);
  const submit = id => get(id).submit({ preventDefault() {} });
  return { get, submit, visible: () => visible, password() { get('pw').value = get('pw2').value = password; return submit('reset-form'); } };
}

test('website actual script: TOTP form, wrong code, retry, duplicate verify and update, success cleanup', async () => {
  const f = fixture({ mfa: true });
  const ui = browser(f);
  await tick();
  assert.equal(ui.visible(), 'state-mfa');
  assert.equal(ui.get('submit-btn').disabled, true);
  ui.password();
  assert.equal(f.count('updateUser'), 0);
  ui.get('mfa-code').value = '654321'; ui.submit('mfa-form'); await tick();
  assert.match(ui.get('mfa-error').textContent, /fresh code/);
  assert.equal(ui.get('mfa-code').value, '');
  ui.get('mfa-code').value = '123456'; ui.submit('mfa-form'); ui.submit('mfa-form'); await tick();
  assert.equal(f.count('verify'), 2); // one incorrect attempt, one successful attempt
  assert.equal(ui.visible(), 'state-form');
  assert.equal(ui.get('submit-btn').disabled, false);
  ui.password(); ui.password(); await tick();
  assert.equal(f.count('updateUser'), 1);
  assert.equal(f.count('signOut'), 1);
  assert.equal(ui.visible(), 'state-done');
  assert.equal(ui.get('pw').value, '');
});

test('website actual script: non-MFA policy and success', async () => {
  const f = fixture(); const ui = browser(f); await tick();
  ui.get('pw').value = ui.get('pw2').value = 'weak'; ui.submit('reset-form'); await tick();
  assert.equal(f.count('updateUser'), 0);
  assert.match(ui.get('form-error').textContent, /8-32/);
  ui.password(); await tick(); assert.equal(ui.visible(), 'state-done');
});

test('website actual script: expired link/import, unavailable factor and network initialization retry', async () => {
  const link = fixture(); const expired = browser(link, { errorCode: 'otp_expired' }); await tick();
  assert.equal(expired.visible(), 'state-error'); assert.equal(link.count('setSession'), 0);
  for (const options of [{ setSession: () => ({ error: error('bad_jwt') }) }, { mfa: true, factors: [] }]) {
    const f = fixture(options); const ui = browser(f); await tick();
    assert.equal(ui.visible(), 'state-error'); assert.equal(ui.get('submit-btn').disabled, true);
  }
  const f = fixture({ setSession: () => { throw new TypeError('network'); } });
  const ui = browser(f); await tick(); assert.equal(ui.visible(), 'state-error');
  f.config.setSession = null; ui.get('recovery-retry').click(); await tick();
  assert.equal(ui.visible(), 'state-form');
});

test('website actual script: insufficient_aal requires MFA, cleanup failure has distinct retry', async () => {
  const f = fixture({ updateUser: () => ({ error: error('insufficient_aal') }) });
  const ui = browser(f); await tick(); ui.password(); await tick();
  assert.equal(ui.visible(), 'state-mfa');
  assert.equal(ui.get('pw').value, '');
  f.config.updateUser = null;
  ui.get('mfa-code').value = '123456'; ui.submit('mfa-form'); await tick();
  f.config.signOut = () => ({ error: error('unexpected_failure') });
  ui.password(); await tick(); assert.equal(ui.visible(), 'state-cleanup');
  f.config.signOut = null; ui.get('cleanup-retry').click(); await tick();
  assert.equal(ui.visible(), 'state-done'); assert.equal(f.count('updateUser'), 2);
});

test('website recovery controller is an exact generated copy of mobile controller', () => {
  assert.equal(fs.readFileSync(path.join(root, 'website/assets/js/recovery-flow.js'), 'utf8'), fs.readFileSync(path.join(root, 'mobile-app/src/features/auth/recoveryFlow.js'), 'utf8'));
});

// Run the actual mobile component with a tiny deterministic hook/native adapter.
// No native runtime or Supabase connection is required for these interaction tests.
function mobile(f, initialUrl = 'medveda://reset-password#type=recovery&access_token=a&refresh_token=r') {
  const ts = require('../node_modules/typescript');
  const transpile = filename => ts.transpileModule(fs.readFileSync(path.join(root, filename), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const service = { exports: {} };
  vm.runInNewContext(transpile('mobile-app/src/features/auth/authService.ts'), {
    module: service, exports: service.exports, URLSearchParams,
    require(name) {
      if (name === '../../config/supabase') return { supabase: { auth: f.auth } };
      if (name === './recoveryFlow') return require('../src/features/auth/recoveryFlow.js');
      throw Error('Unexpected dependency: ' + name);
    },
  });
  const slots = []; let cursor = 0; let pending = []; let link = initialUrl; const alerts = [];
  const changed = (a, b) => !a || a.length !== b.length || a.some((value, i) => value !== b[i]);
  const hooks = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }),
    Fragment: 'Fragment',
    useState(init) { const i = cursor++; if (!(i in slots)) slots[i] = typeof init === 'function' ? init() : init; return [slots[i], value => { slots[i] = value; }]; },
    useSyncExternalStore(subscribe, getSnapshot) { return getSnapshot(); },
    useRef(value) { const i = cursor++; if (!(i in slots)) slots[i] = { current: value }; return slots[i]; },
    useCallback(fn, deps) { const i = cursor++; if (!slots[i] || changed(slots[i].deps, deps)) slots[i] = { fn, deps }; return slots[i].fn; },
    useEffect(fn, deps) { const i = cursor++; if (changed(slots[i], deps)) { slots[i] = deps; pending.push(fn); } },
  };
  let resets = 0;
  const form = { control: {}, formState: { errors: {} }, reset() { resets++; }, handleSubmit: cb => () => cb({ password, confirmPassword: password }) };
  const navigation = { reset() {}, navigate() {} };
  const module = { exports: {} };
  vm.runInNewContext(transpile('mobile-app/src/screens/auth/ResetPasswordScreen.tsx'), {
    module, exports: module.exports, Error,
    require(name) {
      if (name === 'react') return hooks;
      if (name === 'react-native') return { ...Object.fromEntries(['ActivityIndicator', 'Text', 'TextInput', 'TouchableOpacity', 'View', 'ScrollView', 'KeyboardAvoidingView'].map(k => [k, k])), StyleSheet: { create: s => s }, Alert: { alert: (...a) => alerts.push(a) }, Platform: { OS: 'android' }, Linking: { openURL: async () => {} } };
      if (name === '@react-navigation/native') return { useNavigation: () => navigation };
      if (name === 'react-hook-form') return { Controller: 'Controller', useForm: () => form };
      if (name === '@hookform/resolvers/yup') return { yupResolver() {} };
      if (name.endsWith('/authService')) return service.exports;
      if (name.endsWith('/deepLinkStore')) return { getRecoveryLinkRevision: () => 0, subscribeRecoveryLinks: () => () => {}, getLastDeepLinkUrl: () => link, clearLastDeepLinkUrl: () => { link = null; } };
      if (name.endsWith('/resetPasswordSchema')) return { resetPasswordSchema: {} };
      for (const key of ['COLORS', 'RADIUS', 'SPACING']) if (name.toUpperCase().endsWith('/' + key)) return { [key]: {} };
      throw Error('Unexpected dependency: ' + name);
    },
  });
  let tree;
  function render() { cursor = 0; tree = module.exports.default(); const effects = pending; pending = []; effects.forEach(fn => fn()); }
  function flatten(node) { return node && typeof node === 'object' ? [node, ...(node.props.children || []).flatMap(flatten)] : []; }
  const text = node => (node.props.children || []).map(c => typeof c === 'object' ? text(c) : c).join('');
  const buttons = label => flatten(tree).filter(n => n.type === 'TouchableOpacity' && text(n) === label);
  render();
  return { render, alerts, resets: () => resets, buttons, hasPassword: () => flatten(tree).some(n => n.type === 'Controller'),
    otp: value => flatten(tree).find(n => n.type === 'TextInput' && n.props.accessibilityLabel === 'Authenticator code').props.onChangeText(value),
    press(label) { const nodes = buttons(label); assert.equal(nodes.length, 1, 'Button available: ' + label); return nodes[0].props.onPress(); },
    text: () => text(tree), link: () => link };
}

test('mobile actual screen: MFA blocks password form, invalid code retry, duplicate taps, successful cleanup', async () => {
  const f = fixture({ mfa: true }); const ui = mobile(f); await tick(); ui.render();
  assert.equal(ui.hasPassword(), false); assert.equal(ui.link(), null);
  ui.otp('654321'); ui.render(); await ui.press('Verify code'); ui.render();
  assert.match(ui.text(), /fresh code/); assert.equal(ui.hasPassword(), false);
  ui.otp('123456'); ui.render(); const verify = ui.press('Verify code'); const duplicate = ui.press('Verify code');
  await Promise.all([verify, duplicate]); ui.render(); assert.equal(ui.hasPassword(), true);
  const save = ui.press('Update Password'); const again = ui.press('Update Password'); await Promise.all([save, again]); ui.render();
  assert.equal(f.count('setSession'), 1); assert.equal(f.count('verify'), 2); assert.equal(f.count('updateUser'), 1);
  assert.equal(f.count('signOut'), 1); assert.equal(ui.hasPassword(), false); assert.equal(ui.alerts[0][0], 'Password Updated');
  assert(ui.resets() > 0);
});

test('mobile actual screen: non-MFA update and insufficient_aal transition', async () => {
  const f = fixture(); const ui = mobile(f); await tick(); ui.render(); assert.equal(ui.hasPassword(), true);
  f.config.updateUser = () => ({ error: error('insufficient_aal') });
  await ui.press('Update Password'); ui.render(); assert.equal(ui.hasPassword(), false);
  assert.equal(ui.buttons('Verify code').length, 1);
  ui.otp('123456'); ui.render(); await ui.press('Verify code'); ui.render();
  f.config.updateUser = null; await ui.press('Update Password'); ui.render(); assert.equal(ui.alerts.length, 1);
});

test('mobile actual screen: expired session and expired email fragment never expose password form', async () => {
  const f = fixture({ setSession: () => ({ error: error('session_expired') }) });
  const ui = mobile(f); await tick(); ui.render(); assert.equal(ui.hasPassword(), false); assert.match(ui.text(), /expired/);
  const next = fixture(); const expired = mobile(next, 'medveda://reset-password#error_code=otp_expired&error_description=untrusted');
  await tick(); expired.render(); assert.equal(expired.hasPassword(), false); assert.match(expired.text(), /expired/);
  assert.equal(next.count('setSession'), 0); assert.equal(expired.link(), null);
});

test('real installed Supabase SDK: verify stores upgraded JWT, update uses that JWT, expiry refresh works', async () => {
  const { createClient } = require('../node_modules/@supabase/supabase-js');
  for (const expired of [false, true]) {
    const user = { id: 'synthetic-user', aud: 'authenticated', role: 'authenticated', factors: [{ id: 'totp-1', status: 'verified', factor_type: 'totp' }] };
    const jwt = (aal, exp) => [
      { alg: 'HS256', typ: 'JWT' },
      { sub: user.id, aud: 'authenticated', role: 'authenticated', aal, exp: exp || Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000) },
    ].map(part => Buffer.from(JSON.stringify(part)).toString('base64url')).join('.') + '.c3ludGhldGlj';
    const firstToken = jwt('aal1', expired ? 1 : undefined); const verifiedToken = jwt('aal2');
    const response = data => new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
    const issuedSession = access_token => ({ access_token, refresh_token: 'synthetic-rotated-refresh', token_type: 'bearer', expires_in: 3600, user });
    const requests = [];
    const client = createClient('https://recovery.invalid', 'public-synthetic-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: async (url, init) => {
        const route = new URL(url); requests.push(route.pathname);
        const method = init.method;
        if (route.pathname.endsWith('/user') && method === 'GET') return response(user);
        if (route.pathname.endsWith('/token') && route.searchParams.get('grant_type') === 'refresh_token') return response(issuedSession(jwt('aal1')));
        if (route.pathname.endsWith('/factors/totp-1/challenge')) return response({ id: 'challenge-1', expires_at: Math.floor(Date.now() / 1000) + 300 });
        if (route.pathname.endsWith('/factors/totp-1/verify')) {
          assert.deepEqual(JSON.parse(init.body), { code: '123456', challenge_id: 'challenge-1' });
          return response(issuedSession(verifiedToken));
        }
        if (route.pathname.endsWith('/user') && method === 'PUT') {
          assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer ' + verifiedToken);
          assert.equal(JSON.parse(init.body).password, password);
          return response(user);
        }
        if (route.pathname.endsWith('/logout')) return response({});
        throw Error('Unexpected SDK request: ' + route.pathname);
      } },
    });
    const flow = createRecoveryFlow(client.auth);
    assert.equal((await flow.start({ accessToken: firstToken, refreshToken: 'synthetic-refresh' })).phase, 'mfa');
    assert.equal((await flow.verify('totp-1', '123456')).phase, 'ready');
    assert.equal((await flow.updatePassword(password)).phase, 'done');
    assert.equal(requests.includes('/auth/v1/token'), expired);
    assert.equal((await client.auth.getSession()).data.session, null);
  }
});

test('insufficient_aal remains mandatory when the first assurance request fails', async () => {
  const f = fixture({ level: 'aal2', mfa: true }); await f.flow.start(tokens);
  f.config.updateUser = () => { f.config.aal = () => { throw new TypeError('network'); }; return { error: error('insufficient_aal') }; };
  await assert.rejects(f.flow.updatePassword(password), { code: 'network_error' });
  f.config.aal = null;
  assert.equal((await f.flow.start(null)).phase, 'mfa');
  assert.equal(f.count('updateUser'), 1);
});

test('website actual script: expiry during submission blocks retrying the password update', async () => {
  const f = fixture({ updateUser: () => ({ error: error('session_not_found') }) });
  const ui = browser(f); await tick(); ui.password(); await tick();
  assert.equal(ui.visible(), 'state-error'); assert.equal(ui.get('submit-btn').disabled, true);
  assert.equal(ui.get('pw').value, ''); ui.password(); await tick(); assert.equal(f.count('updateUser'), 1);
});

test('mobile actual screen: network verification retry and sign-out retry do not repeat password mutation', async () => {
  const f = fixture({ mfa: true }); const ui = mobile(f); await tick(); ui.render();
  f.config.verify = () => { throw new TypeError('network'); };
  ui.otp('123456'); ui.render(); await ui.press('Verify code'); ui.render();
  assert.equal(ui.hasPassword(), false); assert.match(ui.text(), /connection/);
  f.config.verify = null; ui.otp('123456'); ui.render(); await ui.press('Verify code'); ui.render();
  f.config.signOut = () => ({ error: error('unexpected_failure') }); await ui.press('Update Password'); ui.render();
  assert.equal(ui.hasPassword(), false); assert.equal(ui.buttons('Retry sign-out').length, 1); assert.equal(ui.alerts.length, 0);
  f.config.signOut = null; await ui.press('Retry sign-out'); ui.render();
  assert.equal(ui.alerts.length, 1); assert.equal(f.count('updateUser'), 1);
});

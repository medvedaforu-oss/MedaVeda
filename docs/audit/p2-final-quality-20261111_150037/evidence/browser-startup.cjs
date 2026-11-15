// Run against Expo Web. All backend requests use synthetic fixtures; no real
// sessions, payments, or production data. Supply PLAYWRIGHT_MODULE if external.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = process.env.MEDVEDA_WEB_TEST_URL || 'http://localhost:8082/Home';
const uid = '11111111-1111-4111-8111-111111111111';
const project = 'xbvenkfmesugrbjuufyw';
const results = [];
async function check(browser, name, { mode = 'false', session = false, onboarding = false } = {}) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = []; let requested = false, responded = false, release;
  page.on('pageerror', error => errors.push(error.message));
  if (session) await context.addInitScript(({ uid, project }) => {
    const expires = Math.floor(Date.now() / 1000) + 3600;
    const token = [btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
      btoa(JSON.stringify({ sub: uid, exp: expires, role: 'authenticated', aud: 'authenticated' })), 'synthetic'].join('.');
    localStorage.setItem(`sb-${project}-auth-token`, JSON.stringify({ access_token: token,
      refresh_token: 'synthetic', expires_at: expires, expires_in: 3600, token_type: 'bearer',
      user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', user_metadata: { name: 'Fixture Student' } } }));
  }, { uid, project });
  await page.route('**/*.supabase.co/**', async route => {
    const requestUrl = route.request().url();
    if (requestUrl.includes('/rpc/get_maintenance_mode')) {
      requested = true;
      if (mode === 'delay' || mode === 'timeout') await new Promise(resolve => { release = resolve; });
      if (mode === 'failure') { responded = true; return route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"fixture unavailable"}' }); }
      responded = true;
      return route.fulfill({ status: 200, contentType: 'application/json', body: mode === 'true' ? 'true' : 'false' }).catch(() => {});
    }
    let body = [];
    if (requestUrl.includes('/profiles')) body = { id: uid, name: 'Fixture Student', email: 'fixture@example.invalid',
      course_id: onboarding ? null : 'course-fixture', year_id: onboarding ? null : 'year-fixture', blocked: false,
      courses: { name: 'BAMS' }, years: { title: 'First Year' } };
    if (requestUrl.includes('/rpc/')) body = null;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.route('**/*', route => { const u = new URL(route.request().url()); return u.hostname === '127.0.0.1' || u.hostname === 'localhost' || u.hostname.endsWith('.supabase.co') ? route.fallback() : route.abort(); });
  await page.routeWebSocket(/wss:\/\/.*/, ws => ws.close());
  try {
    await page.goto(url);
    if (mode === 'true') {
      await page.getByText('Down for maintenance', { exact: true }).waitFor();
      mode = 'failure'; await page.getByRole('button', { name: 'Retry', exact: true }).click();
      await page.getByRole('button', { name: 'Retry', exact: true }).waitFor();
      assert.equal(await page.getByText('Down for maintenance', { exact: true }).count(), 1);
      mode = 'false';
      await page.getByRole('button', { name: 'Retry', exact: true }).click();
      await page.getByPlaceholder('Email or mobile number', { exact: true }).waitFor();
    } else {
      if (session) await page.getByText(onboarding ? 'Choose Your Course' : 'Academic Years', { exact: true }).waitFor();
      else await page.getByPlaceholder('Email or mobile number', { exact: true }).waitFor();
      assert.equal(requested, true);
      if (mode === 'delay' || mode === 'timeout') {
        assert.equal(responded, false, 'navigation must render before maintenance completes');
        if (mode === 'timeout') await page.waitForTimeout(6500);
        assert.equal(await page.getByPlaceholder('Email or mobile number', { exact: true }).count(), 1);
        release();
      }
    }
    assert.equal(await page.getByText('Checking availability…', { exact: true }).count(), 0);
    assert.deepEqual(errors, []);
    results.push({ name, status: 'PASS', backend: 'intercepted synthetic fixtures', url: page.url() });
    console.log('PASS ' + name);
  } finally { release?.(); await context.close(); }
}
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    await check(browser, 'signed-out normal launch');
    await check(browser, 'signed-out delayed maintenance opens login before response', { mode: 'delay' });
    await check(browser, 'signed-out failed maintenance remains usable', { mode: 'failure' });
    await check(browser, 'signed-out maintenance timeout remains usable', { mode: 'timeout' });
    await check(browser, 'confirmed maintenance survives error and verified false reopens login', { mode: 'true' });
    await check(browser, 'restored signed-in session routes Home', { session: true });
    await check(browser, 'restored session with missing course routes onboarding', { session: true, onboarding: true });
    if (process.env.MEDVEDA_WEB_EVIDENCE) fs.writeFileSync(process.env.MEDVEDA_WEB_EVIDENCE, JSON.stringify({ environment: 'Expo Web production export / headless Chromium; backend transports mocked', results }, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

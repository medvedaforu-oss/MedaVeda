const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createClient } = require('../node_modules/@supabase/supabase-js');
const { load } = require('./ui-harness.cjs');

function fixture() {
  let profile = { id: 'student', course_id: 'bams', year_id: 'bams-1' };
  let readFails = false;
  const requests = [];
  const client = createClient('https://confirmation.test', 'test-anon-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      const url = new URL(input);
      requests.push(url.pathname);
      if (url.pathname.endsWith('/rpc/set_my_course_year')) {
        assert.deepEqual(JSON.parse(init.body), { p_course_id: 'bams', p_year_id: 'bams-1' });
        return new Response(null, { status: 204 });
      }
      assert.ok(url.pathname.endsWith('/profiles'));
      if (readFails) return Response.json({ message: 'Offline fixture' }, { status: 503 });
      return Response.json(profile ? [profile] : []);
    } },
  });
  const auth = { getCurrentUser: () => ({ id: 'student' }) };
  const supabase = { from: client.from.bind(client), rpc: client.rpc.bind(client), auth: { onAuthStateChange() {} } };
  const users = load('mobile-app/src/services/usersService.ts', {
    '../repositories/usersRepository': load('mobile-app/src/repositories/usersRepository.ts', {
      '../config/supabase': { supabase }, '../utils/caseConvert': load('mobile-app/src/utils/caseConvert.ts', {}),
    }), '../config/supabase': { supabase }, './authState': auth,
  });
  const state = load('mobile-app/src/services/courseState.ts', {
    '../config/supabase': { supabase }, './authState': auth, './usersService': users,
    '../utils/recentActivity': { clearRecentChapters: async () => {} },
    '../utils/recentSearches': { clearRecentSearches: async () => {} },
    '../utils/localCache': { clearCache: async () => {} }, '../utils/logger': { logDebug() {} },
  });
  return { state, requests, setProfile: value => { profile = value; }, failRead: () => { readFails = true; } };
}

for (const [description, profile] of [
  ['missing profile', null],
  ['missing year', { id: 'student', course_id: 'bams', year_id: null }],
  ['wrong year', { id: 'student', course_id: 'bams', year_id: 'bams-2' }],
  ['wrong course', { id: 'student', course_id: 'bhms', year_id: 'bams-1' }],
]) {
  test(`save rejects 204 followed by ${description}, even with matching cached state`, async () => {
    const f = fixture();
    await f.state.loadCourseYear();
    f.setProfile(profile);
    await assert.rejects(f.state.saveCourseYear('bams', 'bams-1'), /could not confirm.*course.*year.*try again/i);
    assert.deepEqual(f.requests.slice(-2), ['/rest/v1/rpc/set_my_course_year', '/rest/v1/profiles']);
  });
}

test('verification read failure cannot use a matching cached choice as proof of save', async () => {
  const f = fixture();
  await f.state.loadCourseYear();
  f.failRead();
  await assert.rejects(f.state.saveCourseYear('bams', 'bams-1'), /could not confirm.*try again/i);
});

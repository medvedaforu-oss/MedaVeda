const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load, tick } = require('./ui-harness.cjs');

// Deferred profile reads exercise the real shared-state service with controlled
// response ordering. This is a client regression, not a live browser/RPC test.
function fixture() {
  const reads = [];
  const state = load('mobile-app/src/services/courseState.ts', {
    '../config/supabase': { supabase: { auth: {
      onAuthStateChange() {},
      getSession: async () => ({ data: { session: { user: { id: 'student' } } } }),
    } } },
    './authState': { getCurrentUser: () => ({ id: 'student' }) },
    './usersService': {
      fetchUserProfile: () => new Promise((resolve, reject) => reads.push({ resolve, reject })),
      setMyCourseYear: async (courseId, yearId) => {
        assert.equal(courseId, 'bams');
        assert.equal(yearId, 'bams-1');
      },
    },
    '../utils/recentActivity': { clearRecentChapters: async () => {} },
    '../utils/recentSearches': { clearRecentSearches: async () => {} },
    '../utils/localCache': { clearCache: async () => {} },
    '../utils/logger': { logDebug() {} },
  });
  return { state, reads };
}

const saved = { courseId: 'bams', courseTitle: 'BAMS', yearId: 'bams-1', yearTitle: 'First Year' };

test('save fetches a new profile and ignores a pre-save response arriving after it', async () => {
  const { state, reads } = fixture();
  const initial = state.loadCourseYear();
  reads[0].resolve({ courseId: 'bams' });
  await initial;
  assert.equal(state.needsCourseYearSelection(), true);

  const older = state.loadCourseYear(true);
  const saving = state.saveCourseYear('bams', 'bams-1');
  await tick();
  assert.equal(reads.length, 3, 'Save must start a profile read after the RPC succeeds');
  reads[2].resolve(saved);
  await saving;
  assert.equal(state.getCourseYear().yearId, saved.yearId);

  const snapshots = [];
  const unsubscribe = state.subscribeCourseYear(snapshot => snapshots.push(snapshot));
  reads[1].resolve({ courseId: 'bams' });
  await older;
  unsubscribe();

  assert.equal(snapshots.length, 0, 'The old response must not publish stale state to route guards');
  assert.equal(state.getCourseYear().courseId, saved.courseId);
  assert.equal(state.getCourseYear().yearId, saved.yearId);
  assert.equal(state.getCourseYear().yearTitle, saved.yearTitle);
  assert.equal(state.needsCourseYearSelection(), false);
});

for (const outcome of ['success', 'error']) {
  test(`pre-save ${outcome} cannot publish state or clear the pending post-save read`, async () => {
    const { state, reads } = fixture();
    const older = state.loadCourseYear();
    const saving = state.saveCourseYear('bams', 'bams-1');
    await tick();
    assert.equal(reads.length, 2, 'Save must not reuse the pre-save read');

    const snapshots = [];
    const unsubscribe = state.subscribeCourseYear(snapshot => snapshots.push(snapshot));
    if (outcome === 'success') reads[0].resolve({ courseId: 'bams' });
    else reads[0].reject(new Error('Pre-save read failed'));
    await older;
    assert.equal(snapshots.length, 0, 'Superseded success/error must not reach subscribers');
    assert.equal(state.getCourseYear().status, 'loading');

    const shared = state.loadCourseYear();
    assert.equal(reads.length, 2, 'Old cleanup must not discard the newer pending read');
    reads[1].resolve(saved);
    await Promise.all([saving, shared]);
    unsubscribe();
    assert.equal(state.getCourseYear().status, 'ready');
    assert.equal(state.getCourseYear().courseId, saved.courseId);
    assert.equal(state.getCourseYear().yearId, saved.yearId);
    assert.equal(state.needsCourseYearSelection(), false);
  });
}

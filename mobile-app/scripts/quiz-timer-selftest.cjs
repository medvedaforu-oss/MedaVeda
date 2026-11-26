const assert = require('node:assert/strict');
const fixture = require('./quiz-screen-harness.cjs');
const { tick } = require('./ui-harness.cjs');
(async () => {
  for (const count of [1, 2, 20, 100]) {
    const f = fixture({ count }); f.start();
    assert.equal(f.session.deadlineAt - f.session.startedAt, 900000);
    assert(f.tree.some(n => n.type === 'Text' && n.props.children === '15:00'));
    f.unmount();
  }
  const f = fixture(); f.start(); const deadline = f.session.deadlineAt;
  f.options()[0].props.onPress(); f.render(); f.advance(30000);
  assert(f.tree.some(n => n.props.children === 'Q1'));
  f.button('Next')(); f.render(); f.advance(30000); f.options()[1].props.onPress(); f.render();
  f.button('Previous')(); f.render(); assert.equal(f.options()[0].props.isSelected, true);
  assert(f.tree.some(n => n.props.children === '14:00'));
  f.app('background'); f.advance(120000, { fire: false }); f.app('active');
  assert(f.tree.some(n => n.props.children === '12:00'));
  f.unmount(); f.advance(60000, { fire: false }); f.start();
  assert.equal(f.session.deadlineAt, deadline); assert.deepEqual(Array.from(f.session.answers), [0, 1]);
  assert(f.tree.some(n => n.props.children === '11:00'));
  // A wall-clock rollback cannot add time while the process clock advances.
  f.advance(60000, { wall: -60000 }); assert(f.tree.some(n => n.props.children === '10:00'));
  f.state.exitGuard({ data: { action: 'back' } }); assert.match(f.state.exits.at(-1)[1], /timer continues/);
  const staleAnswer = f.options()[1].props.onPress;
  f.advance(600000, { fire: false }); staleAnswer(); f.render();
  assert.equal(f.state.submitted.length, 1); assert.deepEqual(Array.from(f.state.submitted[0].answers), [0, 1]);
  assert(f.tree.some(n => f.text(n).includes('Server verification pending')));
  assert.equal(f.db.getFirstSync('SELECT COUNT(*) AS n FROM quiz_sessions_local').n, 0);
  assert.equal(f.db.getFirstSync('SELECT COUNT(*) AS n FROM quiz_attempts_local').n, 1);
  assert.equal(f.db.getFirstSync('SELECT COUNT(*) AS n FROM sync_queue').n, 1);
  // Retrying an identical completed submission cannot enqueue or score it twice.
  f.attempts.recordQuizAttempt(f.state.submitted[0]);
  assert.equal(f.db.getFirstSync('SELECT COUNT(*) AS n FROM quiz_attempts_local').n, 1);
  assert.equal(f.db.getFirstSync('SELECT COUNT(*) AS n FROM sync_queue').n, 1);
  await tick(); f.state.online = true; await f.sync.drainQueue(); f.advance(0);
  assert.equal(f.state.calls.length, 1); assert.equal(f.state.calls[0].name, 'submit_quiz_attempt');
  assert.equal(f.attempts.getLocalQuizAttempts()[0].verificationStatus, 'verified');
  assert.equal(f.attempts.getLocalQuizAttempts()[0].score, 1); f.unmount();

  const g = fixture(); g.start(); g.options()[1].props.onPress(); g.render();
  g.advance(900000); // Timer expiry itself submits without a user action.
  assert.equal(g.state.submitted.length, 1); assert.deepEqual(Array.from(g.state.submitted[0].answers), [1, null]);
  g.advance(1000); assert.equal(g.state.submitted.length, 1); g.unmount();

  const h = fixture(); h.start(); h.button('Next')(); h.render(); const manual = h.button('Submit Test');
  h.advance(900000); manual(); assert.equal(h.state.submitted.length, 1); h.unmount();

  const m = fixture(); m.start(); m.button('Next')(); m.render(); m.button('Submit Test')();
  m.advance(900000); assert.equal(m.state.submitted.length, 1); m.unmount();

  const j = fixture(); j.start(); j.options()[1].props.onPress(); j.render(); const id = j.session.attemptId;
  j.db.execSync("CREATE TEMP TRIGGER fail_quiz_queue BEFORE INSERT ON sync_queue BEGIN SELECT RAISE(ABORT, 'disk full'); END;"); j.advance(900000); assert.equal(j.state.submitted.length, 0);
  assert(j.tree.some(n => n.props.children === '00:00')); assert(j.options().every(n => n.props.disabled));
  assert.equal(j.db.getFirstSync('SELECT COUNT(*) AS n FROM quiz_attempts_local').n, 0);
  assert.equal(j.db.getFirstSync('SELECT COUNT(*) AS n FROM sync_queue').n, 0);
  assert.equal(j.db.getFirstSync('SELECT COUNT(*) AS n FROM quiz_sessions_local').n, 1);
  j.db.execSync('DROP TRIGGER fail_quiz_queue'); j.button('Retry submission')(); j.render();
  assert.equal(j.state.submitted[0].attemptId, id); assert.deepEqual(Array.from(j.state.submitted[0].answers), [1, null]); j.unmount();

  const k = fixture(); k.start(); const saved = k.session; k.unmount();
  k.state.owner = 'other'; k.start(); assert.notEqual(k.session.attemptId, saved.attemptId); k.unmount();
  k.state.owner = 'student'; k.advance(901000, { fire: false }); k.test.questionRevision = 4; k.start();
  assert.equal(k.session.attemptId, saved.attemptId); assert.equal(k.state.submitted[0].questionRevision, 3);
  k.unmount();
  const r = fixture(); r.start(); r.options()[1].props.onPress(); r.render(); const interrupted = r.session; r.unmount();
  r.advance(901000, { fire: false }); r.state.owner = 'other'; r.recovery.recoverExpiredQuizAttempts();
  assert.equal(r.db.getFirstSync('SELECT COUNT(*) AS n FROM quiz_attempts_local').n, 0);
  r.state.owner = 'student'; r.recovery.recoverExpiredQuizAttempts(); r.recovery.recoverExpiredQuizAttempts();
  assert.equal(r.db.getFirstSync('SELECT COUNT(*) AS n FROM quiz_attempts_local').n, 1);
  assert.equal(r.attempts.getLocalQuizAttempts()[0].attemptId, interrupted.attemptId);
  assert.deepEqual(Array.from(r.attempts.getLocalQuizAttempts()[0].answers), [1, null]);
  assert.equal(r.db.getFirstSync('SELECT COUNT(*) AS n FROM sync_queue').n, 1);
  console.log('PASS 900 seconds for all question counts; deadline/answer/navigation/background/restore/rollback; auto/manual race; SQLite atomic retry/outbox dedupe; offline pending → verified; account and revision isolation');
})().catch(e => { console.error(e); process.exitCode = 1; });

import { getDb, OFFLINE_DB_SUPPORTED } from '../config/database';
import { getCurrentUser } from './authState';
import type { QuizTest } from '../types/quiz';
import { newQuizDraft, validQuizDraft, type QuizDraft } from './quizSession';
const webDrafts = new Map<string, QuizDraft>(); // Web has no offline database in this app.
export function assertQuizOwner(draft: QuizDraft) {
  if (getCurrentUser()?.id !== draft.ownerId) throw new Error('Your account changed. Reopen the Quiz.');
}
export function saveQuizDraft(draft: QuizDraft) {
  assertQuizOwner(draft);
  if (!OFFLINE_DB_SUPPORTED) { webDrafts.set(`${draft.ownerId}:${draft.test.id}`, draft); return; }
  getDb().runSync(`INSERT INTO quiz_sessions_local (owner_id, quiz_id, attempt_id, snapshot) VALUES (?,?,?,?)
    ON CONFLICT(owner_id, quiz_id) DO UPDATE SET attempt_id=excluded.attempt_id, snapshot=excluded.snapshot;`,
    [draft.ownerId, draft.test.id, draft.attemptId, JSON.stringify(draft)]);
}
export function openQuizDraft(test: QuizTest, subjectId: string, subjectTitle: string): QuizDraft {
  const owner = getCurrentUser()?.id;
  if (!owner) throw new Error('Sign in before starting a Quiz.');
  const row = OFFLINE_DB_SUPPORTED ? getDb().getFirstSync<{ snapshot: string }>(
    `SELECT snapshot FROM quiz_sessions_local WHERE owner_id = ? AND quiz_id = ?;`, [owner, test.id]) : null;
  const previous = row ? JSON.parse(row.snapshot) : webDrafts.get(`${owner}:${test.id}`);
  if (previous) {
    if (!validQuizDraft(previous, owner, test.id)) throw new Error('This saved attempt could not be recovered. Please contact support.');
    // Retain its original question revision and answers, even if the catalog changed; the server can mark it stale.
    return previous;
  }
  const draft = newQuizDraft(test, owner, subjectId, subjectTitle, Date.now());
  saveQuizDraft(draft); // A failed durable start never starts a countdown.
  return draft;
}
export function forgetWebQuizDraft(draft: QuizDraft) {
  if (!OFFLINE_DB_SUPPORTED) webDrafts.delete(`${draft.ownerId}:${draft.test.id}`);
}

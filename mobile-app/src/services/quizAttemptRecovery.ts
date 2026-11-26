import { AppState } from 'react-native';
import { getDb, OFFLINE_DB_SUPPORTED } from '../config/database';
import { getCurrentUser, subscribeAuthUser } from './authState';
import { validQuizDraft, type QuizDraft } from './quizSession';
import { recordQuizAttempt } from './quizAttempts';
import { logError } from '../utils/logger';
/** Recover expired, durable attempts even when the student left the Quiz screen or restarted the app.
 * JS cannot run while the OS suspends/kills the app; the next launch/resume finishes the same attempt ID. */
export function recoverExpiredQuizAttempts() {
  const user = getCurrentUser();
  if (!OFFLINE_DB_SUPPORTED || !user) return;
  const rows = getDb().getAllSync<{ quiz_id: string; snapshot: string }>(`SELECT quiz_id, snapshot FROM quiz_sessions_local
    WHERE owner_id = ? AND json_valid(snapshot) AND
      (json_extract(snapshot, '$.deadlineAt') <= ? OR
       json_extract(snapshot, '$.observedAt') >= json_extract(snapshot, '$.deadlineAt'));`, [user.id, Date.now()]);
  for (const row of rows) {
    const draft: QuizDraft = JSON.parse(row.snapshot);
    if (!validQuizDraft(draft, user.id, row.quiz_id) || getCurrentUser()?.id !== user.id) continue;
    recordQuizAttempt({ attemptId: draft.attemptId, quizId: draft.test.id, quizTitle: draft.test.title,
      subjectId: draft.subjectId, subjectTitle: draft.subjectTitle, userId: user.id, userEmail: user.email,
      score: 0, totalQuestions: draft.test.questions.length, answers: draft.answers, questionRevision: draft.test.questionRevision });
  }
}
export function watchQuizAttemptRecovery(): () => void {
  if (!OFFLINE_DB_SUPPORTED) return () => {};
  const recover = () => { try { recoverExpiredQuizAttempts(); } catch { logError('Could not finalize a saved Quiz; retained for retry.'); } };
  recover();
  const auth = subscribeAuthUser(recover);
  const app = AppState.addEventListener('change', recover);
  const timer = setInterval(recover, 1000);
  return () => { auth(); app.remove(); clearInterval(timer); };
}

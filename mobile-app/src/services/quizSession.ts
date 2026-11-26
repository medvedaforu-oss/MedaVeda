import type { QuizTest } from '../types/quiz';
export const QUIZ_DURATION_SECONDS = 900;
export interface QuizDraft {
  version: 1;
  attemptId: string;
  ownerId: string;
  test: QuizTest;
  subjectId: string;
  subjectTitle: string;
  startedAt: number;
  deadlineAt: number;
  observedAt: number;
  currentQuestion: number;
  answers: (number | null)[];
}
export function newQuizDraft(test: QuizTest, ownerId: string, subjectId: string, subjectTitle: string, now: number): QuizDraft {
  // Strip legacy downloaded answer keys and unknown payload fields from the recovery snapshot.
  const snapshot: QuizTest = { id: test.id, title: test.title, subjectId: test.subjectId, subjectTitle: test.subjectTitle,
    yearId: test.yearId, yearTitle: test.yearTitle, order: test.order, active: test.active, courseId: test.courseId,
    questionRevision: test.questionRevision,
    questions: test.questions.map(q => ({ question: q.question, options: [...q.options] })) };
  return { version: 1, attemptId: `qa_${test.id}_${now}_${Math.random().toString(36).slice(2, 10)}`,
    ownerId, test: snapshot, subjectId, subjectTitle, startedAt: now, deadlineAt: now + QUIZ_DURATION_SECONDS * 1000,
    observedAt: now, currentQuestion: 0, answers: Array(test.questions.length).fill(null) };
}
export function validQuizDraft(value: QuizDraft, ownerId: string, quizId: string): boolean {
  return !!value && value.version === 1 && value.ownerId === ownerId && value.test?.id === quizId &&
    typeof value.attemptId === 'string' && value.attemptId.startsWith('qa_') &&
    Number.isSafeInteger(value.startedAt) && value.startedAt > 0 &&
    value.deadlineAt === value.startedAt + QUIZ_DURATION_SECONDS * 1000 &&
    Number.isFinite(value.observedAt) && value.observedAt >= value.startedAt &&
    Array.isArray(value.test.questions) && value.test.questions.length > 0 &&
    Number.isInteger(value.currentQuestion) && value.currentQuestion >= 0 && value.currentQuestion < value.test.questions.length &&
    Array.isArray(value.answers) && value.answers.length === value.test.questions.length &&
    value.test.questions.every((q, i) => q && typeof q.question === 'string' && Array.isArray(q.options) && q.options.length > 0 &&
      q.options.every(option => typeof option === 'string') && (value.answers[i] === null ||
        (Number.isInteger(value.answers[i]) && value.answers[i]! >= 0 && value.answers[i]! < q.options.length)));
}
/** Deadline survives JS suspension. A monotonic clock and persisted high-water mark avoid in-process clock rollback.
 * No existing server-issued attempt clock exists. Offline device time/storage are not tamper-proof. */
export function quizClock(draft: QuizDraft, wall: () => number = Date.now, monotonic: () => number = () => performance.now()) {
  let observed = Math.max(draft.observedAt, wall());
  const anchor = observed, started = monotonic();
  return {
    now() { observed = Math.max(observed, wall(), anchor + Math.max(0, monotonic() - started)); return observed; },
    remaining() { return Math.max(0, Math.ceil((draft.deadlineAt - this.now()) / 1000)); },
  };
}
export function formatQuizTime(seconds: number): string {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  AppState,
  Alert,
} from "react-native";

import ErrorState from "../../components/ErrorState";
import { quizClock, formatQuizTime, type QuizDraft } from "../../services/quizSession";
import { openQuizDraft, saveQuizDraft, assertQuizOwner, forgetWebQuizDraft } from "../../services/quizSessionStore";
import EmptyState from "../../components/EmptyState";

import { COLORS } from "../../theme/colors";
import { FONT } from "../../theme/fonts";
import { SPACING } from "../../theme/spacing";
import { RADIUS } from "../../theme/radius";

import { useRoute, useNavigation, usePreventRemove } from "@react-navigation/native";

import OptionCard from "../../components/OptionCard";
import ProgressBar from "../../components/ProgressBar";

import { getCurrentUser } from "../../services/authState";
import { logError } from "../../utils/logger";
import { QuizTest } from "../../services/quizService";
import { getLocalQuizAttempts, recordQuizAttempt } from "../../services/quizAttempts";
import { OFFLINE_DB_SUPPORTED } from "../../config/database";
import { loadOfflineQuiz } from "../../utils/downloadManager";
import SuccessBurst from "../../components/motion/SuccessBurst";

// Plays a single Test's questions (20 MCQs). Access has already been
// MedVeda 2.0: Quiz Tests are always free - plays whatever Test it's
// given, no purchase/lock checks anywhere in this flow.
//
// OFFLINE MODE: this screen now has two entry points -
//   1. Normal: navigated here with `test` already in route.params (from
//      TestListScreen, which already had the full data in memory).
//   2. Offline: navigated here from DownloadsScreen with only
//      `offlineFileUri` + `quizId` - the JSON is read off-device, no
//      network involved at all.
// Either way, answers are saved locally first. A score appears only after
// submit_quiz_attempt verifies the attempt on the server.
export default function QuizScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const { subjectId, subjectTitle, offlineFileUri } = route.params ?? {};

  const [test, setTest] = useState<QuizTest | undefined>(route.params?.test);
  const [loadingOffline, setLoadingOffline] = useState(!route.params?.test && !!offlineFileUri);

  useEffect(() => {
    if (test || !offlineFileUri) return;
    let isMounted = true;

    loadOfflineQuiz<QuizTest>(offlineFileUri)
      .then((data) => {
        if (isMounted) setTest(data);
      })
      .catch((err) => {
        logError("Failed to load offline quiz:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingOffline(false);
      });

    return () => {
      isMounted = false;
    };
  }, [offlineFileUri, test]);

  if (loadingOffline) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!test || typeof test.id !== "string" || !Array.isArray(test.questions) || test.questions.length === 0 ||
      test.questions.some(question => !question || typeof question.question !== "string" ||
        !Array.isArray(question.options) || question.options.length === 0 ||
        question.options.some(option => typeof option !== "string"))) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{subjectTitle ?? "Quiz"}</Text>
        <EmptyState title="This test couldn't be opened. Please go back and try again." />
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <QuizAttemptLoader key={test.id} test={test} subjectId={subjectId} subjectTitle={subjectTitle} navigation={navigation} />;
}

function QuizAttemptLoader({ test, subjectId, subjectTitle, navigation }: {
  test: QuizTest; subjectId: string; subjectTitle: string; navigation: any;
}) {
  const [draft, setDraft] = useState<QuizDraft | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    try { setError(''); setDraft(openQuizDraft(test, subjectId, subjectTitle)); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not save this Quiz. Please retry.'); }
  }, [test, subjectId, subjectTitle, revision]);
  if (error) return <View style={styles.container}><ErrorState message={error} onRetry={() => setRevision(v => v + 1)} /></View>;
  if (!draft) return <View style={styles.center}><ActivityIndicator color={COLORS.accent} /></View>;
  return <QuizSession key={draft.attemptId} initialDraft={draft} navigation={navigation}
    onRestart={() => { setDraft(null); setRevision(v => v + 1); }} />;
}

export function QuizSession({ initialDraft, navigation, onRestart }: {
  initialDraft: QuizDraft; navigation: any; onRestart: () => void;
}) {
  const { test, subjectId, subjectTitle } = initialDraft;
  const questions = test.questions;
  const draftRef = useRef(initialDraft);
  const clock = useRef<ReturnType<typeof quizClock> | null>(null);
  if (!clock.current) clock.current = quizClock(initialDraft);
  const [currentQuestion, setCurrentQuestion] = useState(initialDraft.currentQuestion);
  const [answers, setAnswers] = useState<(number | null)[]>(initialDraft.answers);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(clock.current.remaining());
  const submittedRef = useRef(false);
  const latestAnswers = useRef(answers);
  const retryAfter = useRef(0);
  const [saveError, setSaveError] = useState('');
  const [submissionFailed, setSubmissionFailed] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState("unverified");
  const [serverScore, setServerScore] = useState<number | null>(null);

  usePreventRemove(!finished && getCurrentUser()?.id === initialDraft.ownerId, ({ data }) => {
    Alert.alert('Leave this Quiz?', 'Your answers are saved. The 15-minute timer continues while you are away.', [
      { text: 'Stay', style: 'cancel' }, { text: 'Leave Quiz', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  const persist = useCallback((changes: Partial<QuizDraft> = {}) => {
    const next = { ...draftRef.current, ...changes, observedAt: clock.current!.now() };
    saveQuizDraft(next);
    draftRef.current = next;
  }, []);

  useEffect(() => {
    if (!finished || !attemptId) return;
    const refresh = () => {
      const attempt = getLocalQuizAttempts(test?.id).find((row) => row.attemptId === attemptId);
      if (attempt) {
        setVerificationStatus(attempt.verificationStatus);
        if (attempt.verificationStatus === "verified") setServerScore(attempt.score);
      }
    };
    refresh();
    const timer = setInterval(refresh, 2000);
    return () => clearInterval(timer);
  }, [finished, attemptId, test?.id]);

  const handleSubmit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    try {
      assertQuizOwner(draftRef.current);
      const user = getCurrentUser();
      const id = recordQuizAttempt({
        attemptId: draftRef.current.attemptId,
        quizId: test.id, quizTitle: test.title, subjectId, subjectTitle,
        userId: user?.id, userEmail: user?.email, score: 0, totalQuestions: questions.length,
        answers: [...latestAnswers.current], questionRevision: test.questionRevision,
      });
      forgetWebQuizDraft(draftRef.current);
      setVerificationStatus(OFFLINE_DB_SUPPORTED && user?.id && Number.isSafeInteger(test.questionRevision) &&
        (test.questionRevision ?? 0) > 0 ? 'unverified' : 'legacy');
      setAttemptId(id); setSaveError(''); setFinished(true);
    } catch (error) {
      // Keep the same ID and answers for retry. Do not report completion until the local transaction commits.
      submittedRef.current = false;
      retryAfter.current = Date.now() + 5000;
      setSubmissionFailed(true);
      setSaveError('Could not save your submission. Your answers are retained. Tap Retry submission.');
      logError('QuizScreen: saving quiz attempt failed', error);
    }
  }, [test, subjectId, subjectTitle, questions.length]);

  const goToQuestion = useCallback((index: number) => {
    if (submittedRef.current || finished) return;
    if (clock.current!.remaining() === 0) { handleSubmit(); return; }
    try { persist({ currentQuestion: index }); setCurrentQuestion(index); setSaveError(''); setSubmissionFailed(false); }
    catch { setSaveError('Could not save progress. Please retry before leaving this Quiz.'); }
  }, [finished, persist, handleSubmit]);
  const handleNext = () => currentQuestion + 1 < questions.length ? goToQuestion(currentQuestion + 1) : handleSubmit();
  const handlePrevious = () => { if (currentQuestion > 0) goToQuestion(currentQuestion - 1); };
  const handleAnswer = (index: number) => {
    if (submittedRef.current || finished || index < 0 || index >= questions[currentQuestion].options.length) return;
    if (clock.current!.remaining() === 0) { setTimeLeft(0); handleSubmit(); return; }
    const updated = [...latestAnswers.current]; updated[currentQuestion] = index;
    try { persist({ answers: updated }); latestAnswers.current = updated; setAnswers(updated); setSaveError(''); setSubmissionFailed(false); }
    catch { setSaveError('Could not save this answer. Please retry.'); }
  };
  const selectedAnswer = answers[currentQuestion] ?? null;

  useEffect(() => {
    if (finished) return;
    let lastSaved = clock.current!.now();
    const refresh = () => {
      if (submittedRef.current) return;
      const remaining = clock.current!.remaining();
      setTimeLeft(remaining);
      if (remaining === 0) { if (Date.now() >= retryAfter.current) handleSubmit(); return; }
      if (clock.current!.now() - lastSaved >= 5000) {
        try { persist(); lastSaved = clock.current!.now(); }
        catch { setSaveError('Could not save progress. Please retry before leaving this Quiz.'); }
      }
    };
    refresh();
    const timer = setInterval(refresh, 250);
    const subscription = AppState.addEventListener('change', () => {
      if (!submittedRef.current) {
        try { persist(); } catch { setSaveError('Could not save progress. Please retry before leaving this Quiz.'); }
        refresh();
      }
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [finished, handleSubmit, persist]);

  const question = questions[currentQuestion];
  const displayScore = verificationStatus === "verified" ? serverScore : null;
  const percentage = displayScore === null ? null : Math.round((displayScore / questions.length) * 100);
  const passed = percentage !== null && percentage >= 50;
  const isLastQuestion = currentQuestion === questions.length - 1;

  if (finished) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.resultContent}>
        <View style={styles.resultCard}>
          {passed && <SuccessBurst play={finished && passed} />}
          <Text style={styles.resultEmoji}>{passed ? "🏆" : "📚"}</Text>

          <Text style={styles.finish}>
            {percentage === null ? "Test completed" : passed ? "Congratulations!" : "Better Luck Next Time"}
          </Text>

          <Text style={styles.score}>
            {displayScore === null
              ? verificationStatus === "legacy" || verificationStatus === "rejected" || verificationStatus === "stale"
                ? "Score unavailable" : "Score pending"
              : `${displayScore} / ${questions.length}`}
          </Text>

          <Text style={{ color: COLORS.subtitle, textAlign: "center", marginTop: 6 }}>
            {verificationStatus === "verified" ? "Server-verified score" :
              verificationStatus === "stale" ? "Questions changed; score unavailable" :
              verificationStatus === "rejected" ? "Verification rejected; score unavailable" :
              verificationStatus === "legacy" ? "Offline submission saved; score unavailable" :
              "Server verification pending"}
          </Text>

          <Text style={styles.percentage}>{percentage === null ? "—" : `${percentage}%`}</Text>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: percentage === null ? COLORS.accent : passed ? COLORS.success : COLORS.error },
            ]}
          >
            <Text style={styles.statusText}>{percentage === null
              ? verificationStatus === "legacy" || verificationStatus === "rejected" || verificationStatus === "stale"
                ? "UNVERIFIED" : "PENDING"
              : passed ? "PASS" : "FAIL"}</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.button}
            onPress={onRestart}
          >
            <Text style={styles.buttonText}>Restart Test</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.secondaryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.previousButtonText}>Back to Tests</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.timerCard}>
        <Text style={styles.timerLabel}>Test time left</Text>
        <Text accessibilityLabel={`Test time left ${formatQuizTime(timeLeft)}`} style={styles.timer}>{formatQuizTime(timeLeft)}</Text>
      </View>
      {!!saveError && <View><Text accessibilityRole="alert" style={{ color: COLORS.error }}>{saveError}</Text>
        <TouchableOpacity accessibilityRole="button" style={styles.secondaryButton} onPress={submissionFailed ? handleSubmit : () => {
          try { persist(); setSaveError(''); } catch { setSaveError('Could not save progress. Please retry.'); }
        }}>
          <Text style={styles.previousButtonText}>{submissionFailed ? 'Retry submission' : 'Retry save'}</Text>
        </TouchableOpacity></View>}
      <ScrollView contentContainerStyle={styles.quizContent}>
      <Text style={styles.title}>{subjectTitle}</Text>
      <Text style={styles.subtitle}>{test.title}</Text>

      <Text style={styles.progressTitle}>Quiz Progress</Text>
      <Text style={styles.subtitle}>Complete test: 15 minutes. You can change answers and submit before time runs out.</Text>

      <ProgressBar
        progress={((currentQuestion + 1) / questions.length) * 100}
      />

      <Text style={styles.counter}>
        {currentQuestion + 1} / {questions.length}
      </Text>

      <View style={styles.questionCard}>
        <Text style={styles.questionNumber}>
          Question {currentQuestion + 1}
        </Text>
        <Text style={styles.question}>{question.question}</Text>
      </View>

      {question.options.map((option: string, index: number) => option.trim() ? (
        <OptionCard
          key={index}
          title={option}
          disabled={finished || timeLeft === 0}
          onPress={() => handleAnswer(index)}
          isSelected={selectedAnswer === index}
        />
      ) : null)}

      <View style={styles.navRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.navButton,
            styles.previousButton,
            currentQuestion === 0 && styles.navButtonDisabled,
          ]}
          onPress={handlePrevious}
          disabled={currentQuestion === 0}
        >
          <Text style={styles.previousButtonText}>Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.navButton, styles.nextButton]}
          onPress={isLastQuestion ? handleSubmit : handleNext}
        >
          <Text style={styles.buttonText}>
            {isLastQuestion ? "Submit Test" : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  resultContent: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingBottom: SPACING.xl },
  quizContent: { paddingBottom: SPACING.xl, maxWidth: 840, width: "100%", alignSelf: "center" },
  progressTitle: {
    fontSize: FONT.small,
    color: COLORS.subtitle,
    fontWeight: "600",
    marginBottom: SPACING.sm,
  },
  resultCard: {
    width: "100%",
    maxWidth: 840,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  resultEmoji: { fontSize: 60, marginBottom: SPACING.md },
  statusBadge: {
    maxWidth: "100%",
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
    borderRadius: 30,
  },
  statusText: { color: COLORS.white, fontSize: FONT.body, fontWeight: "700" },
  timerCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: SPACING.sm,
    alignItems: "center",
  },
  timerLabel: { fontSize: FONT.small, color: COLORS.subtitle },
  questionCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  questionNumber: {
    fontSize: FONT.small,
    color: COLORS.accent,
    fontWeight: "700",
    marginBottom: SPACING.sm,
  },
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: SPACING.screen, paddingTop: SPACING.md },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  title: { fontSize: FONT.title, fontWeight: "bold", color: COLORS.text },
  subtitle: {
    fontSize: FONT.body,
    color: COLORS.subtitle,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  counter: {
    textAlign: "center",
    fontSize: FONT.body,
    color: COLORS.subtitle,
    marginBottom: SPACING.md,
    fontWeight: "600",
  },
  timer: {
    fontSize: FONT.subHeading,
    fontWeight: "bold",
    color: COLORS.error,
    textAlign: "right",
  },
  question: {
    fontSize: FONT.subHeading,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  button: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    minHeight: 48,
    justifyContent: "center",
    borderRadius: RADIUS.md,
    alignItems: "center",
    width: "100%",
  },
  secondaryButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    minHeight: 48,
    justifyContent: "center",
    borderRadius: RADIUS.md,
    alignItems: "center",
    width: "100%",
  },
  buttonText: { color: COLORS.white, fontSize: FONT.body, fontWeight: "700" },
  navRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  navButton: {
    flex: 1,
    flexBasis: 120,
    minWidth: 0,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    minHeight: 48,
    justifyContent: "center",
    borderRadius: RADIUS.md,
    alignItems: "center",
  },
  previousButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previousButtonText: {
    color: COLORS.text,
    fontSize: FONT.body,
    fontWeight: "700",
  },
  nextButton: {
    backgroundColor: COLORS.accent,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  finish: {
    maxWidth: "100%",
    fontSize: FONT.heading,
    color: COLORS.accentLight,
    fontWeight: "700",
    textAlign: "center",
  },
  score: {
    maxWidth: "100%",
    fontSize: 44,
    fontWeight: "700",
    color: COLORS.accentLight,
    marginVertical: SPACING.lg,
  },
  percentage: {
    fontSize: FONT.heading,
    fontWeight: "700",
    color: COLORS.success,
    marginBottom: SPACING.md,
  },
});

import useRequestGuard from "./useRequestGuard";
import { useCallback, useEffect, useState } from "react";
import type { ContentFilters } from "../types/filters";

import {
  addQuizTest,
  deleteQuizTest,
  getQuizTests,
  updateQuizTest,
} from "../services/quizService";

import type { QuizTest, QuizTestInput } from "../types/quiz";

export default function useQuiz(filters: ContentFilters = {}) {
  const { courseId, yearId } = filters;
  const beginRequest = useRequestGuard(JSON.stringify([courseId, yearId]));
  const [tests, setTests] = useState<QuizTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTests = useCallback(async () => {
    const current = beginRequest();
    if (!current()) return;
    try {
      setLoading(true);
      const data = await getQuizTests({ courseId, yearId });
      if (!current()) return;
      setTests(data);
      setError(null);
    } catch (err) {
      if (!current()) return;
      console.error(err);
      setError("Could not load quiz tests. Please try again.");
    } finally {
      if (current()) setLoading(false);
    }
  }, [courseId, yearId, beginRequest]);

  useEffect(() => {
    void loadTests();
  }, [loadTests]);

  async function createTest(data: QuizTestInput) {
    await addQuizTest(data);
    await refreshAfterMutation();
  }

  async function editTest(id: string, data: QuizTestInput) {
    await updateQuizTest(id, data);
    await refreshAfterMutation();
  }

  async function removeTest(id: string) {
    await deleteQuizTest(id);
    await refreshAfterMutation();
  }

  async function refreshAfterMutation() {
    const current = beginRequest();
    if (!current()) return;
    try {
      const data = await getQuizTests(filters);
      if (!current()) return;
      setTests(data);
      setError(null);
    } catch {
      if (!current()) return;
      setError("The quiz change succeeded, but the list could not refresh. Reload this page before retrying.");
    }
  }

  return {
    tests,
    loading,
    error,
    reload: refreshAfterMutation,
    createTest,
    editTest,
    removeTest,
  };
}

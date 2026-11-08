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
  const scope = JSON.stringify([courseId, yearId]);
  const beginRequest = useRequestGuard(scope);
  const [tests, setTests] = useState<QuizTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readState, setReadState] = useState({ scope, hasLoaded: false });

  const loadTests = useCallback(async () => {
    const current = beginRequest();
    if (!current()) return;
    try {
      setLoading(true);
      const data = await getQuizTests({ courseId, yearId });
      if (!current()) return;
      setTests(data);
      setReadState({ scope, hasLoaded: true });
      setError(null);
    } catch (err) {
      if (!current()) return;
      setReadState((previous) => ({ scope, hasLoaded: previous.scope === scope && previous.hasLoaded }));
      console.error(err);
      setError("Could not load quiz tests. Please try again.");
    } finally {
      if (current()) setLoading(false);
    }
  }, [courseId, yearId, scope, beginRequest]);

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
      setLoading(true);
      const data = await getQuizTests(filters);
      if (!current()) return;
      setTests(data);
      setReadState({ scope, hasLoaded: true });
      setError(null);
    } catch {
      if (!current()) return;
      setReadState((previous) => ({ scope, hasLoaded: previous.scope === scope && previous.hasLoaded }));
      setError("The quiz change succeeded, but the list could not refresh. Reload this page before retrying.");
    } finally {
      if (current()) setLoading(false);
    }
  }

  const hasLoaded = readState.scope === scope && readState.hasLoaded;
  return {
    tests: hasLoaded ? tests : [],
    hasLoaded,
    loading: loading || readState.scope !== scope,
    error: readState.scope === scope ? error : null,
    reload: refreshAfterMutation,
    createTest,
    editTest,
    removeTest,
  };
}

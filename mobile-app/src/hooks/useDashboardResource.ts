import { useCallback, useEffect, useRef, useState } from "react";
import { getAuthEpoch, getCurrentUser, subscribeAuthUser } from "../services/authState";
import { getCourseYear, subscribeCourseYear } from "../services/courseState";
import { logError } from "../utils/logger";

export function dashboardContextKey(): string {
  const { status, courseId, yearId } = getCourseYear();
  return JSON.stringify([getCurrentUser()?.id, getAuthEpoch(), status, courseId, yearId]);
}

/** Each Home section owns a generation. Invalidate synchronously at context
 * boundaries, including A → B → A before React renders, and mask old values. */
export default function useDashboardResource<T>(load: () => Promise<T>, empty: T, enabled = true) {
  const key = dashboardContextKey();
  const initial = useRef(empty);
  const life = useRef({ mounted: false, generation: 0, key });
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ key: string; value: T; loading: boolean; error: unknown }>({ key, value: empty, loading: enabled, error: null });

  const refresh = useCallback(async () => {
    const run = life.current;
    if (!run.mounted || key !== dashboardContextKey()) return;
    const generation = ++run.generation;
    run.key = key;
    const current = () => run.mounted && generation === run.generation && key === dashboardContextKey();
    if (!enabled || !getCurrentUser()) {
      setState({ key, value: initial.current, loading: false, error: null });
      return;
    }
    setState(previous => ({ key, value: previous.key === key ? previous.value : initial.current, loading: true, error: null }));
    try {
      const value = await load();
      if (current()) setState({ key, value, loading: false, error: null });
    } catch (error) {
      if (current()) {
        logError("Failed to load dashboard section:", error);
        setState(previous => ({ ...previous, loading: false, error }));
      }
    }
  }, [key, enabled, load]);

  useEffect(() => {
    const run = life.current;
    run.mounted = true;
    const changed = () => {
      const nextKey = dashboardContextKey();
      if (nextKey === run.key) return;
      run.key = nextKey;
      run.generation++;
      setState({ key: nextKey, value: initial.current, loading: !!getCurrentUser(), error: null });
      setRevision(n => n + 1);
    };
    const auth = subscribeAuthUser(changed), course = subscribeCourseYear(changed);
    changed();
    return () => { run.mounted = false; run.generation++; auth(); course(); };
  }, []);
  useEffect(() => {
    const run = life.current;
    void refresh();
    return () => { run.generation++; };
  }, [refresh, revision]);

  const matches = state.key === key;
  return { value: matches ? state.value : initial.current, loading: matches ? state.loading : enabled,
    error: matches ? state.error : null, refresh };
}

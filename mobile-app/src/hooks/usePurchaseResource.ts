import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { getCurrentUser, subscribeAuthUser } from "../services/authState";
import { getCourseYear, subscribeCourseYear } from "../services/courseState";
import { logError } from "../utils/logger";

export const PURCHASE_TIMEOUT_MS = 15000;

function contextKey() {
  const { courseId, yearId } = getCourseYear();
  return JSON.stringify([getCurrentUser()?.id, courseId, yearId]);
}

/** Account/context isolation and latest-request-wins for read-only purchase data.
 * Keep last confirmed data on a same-context failure and explicitly report it.
 * A timeout/cancellation abandons the read; it never changes server ownership.
 */
export default function usePurchaseResource<T>(load: (uid: string) => Promise<T[]>) {
  const [state, setState] = useState({ key: contextKey(), value: [] as T[], loading: true, error: null as string | null });
  const lifecycle = useRef({ mounted: false, generation: 0, key: contextKey(), cancel: () => {} });

  const refresh = useCallback(async () => {
    const life = lifecycle.current;
    if (!life.mounted) return;
    const key = contextKey();
    const uid = getCurrentUser()?.id;
    const generation = ++life.generation;
    life.cancel();
    life.key = key;
    const current = () => life.mounted && life.generation === generation && key === contextKey();
    setState(previous => ({ key, value: previous.key === key ? previous.value : [], loading: !!uid, error: null }));
    if (!uid) {
      setState({ key, value: [], loading: false, error: null });
      return;
    }

    const cancelled = Symbol("cancelled");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const interruption = new Promise<typeof cancelled>((resolve, reject) => {
      timer = setTimeout(() => reject(new Error("Purchase request timed out")), PURCHASE_TIMEOUT_MS);
      life.cancel = () => { clearTimeout(timer); resolve(cancelled); };
    });
    try {
      const value = await Promise.race([load(uid), interruption]);
      if (value !== cancelled && current()) setState({ key, value, loading: false, error: null });
    } catch (error) {
      if (current()) {
        logError("Failed to refresh purchases:", error);
        setState(previous => ({ ...previous, loading: false, error: "Could not refresh purchases. Last confirmed ownership may be out of date. Retry to check your purchases." }));
      }
    } finally {
      clearTimeout(timer);
    }
  }, [load]);

  useEffect(() => {
    const life = lifecycle.current;
    life.mounted = true;
    const contextChanged = () => { if (contextKey() !== life.key) void refresh(); };
    const unsubscribeAuth = subscribeAuthUser(contextChanged);
    const unsubscribeCourse = subscribeCourseYear(contextChanged);
    const resume = AppState.addEventListener("change", state => { if (state === "active") void refresh(); });
    void refresh();
    return () => {
      life.mounted = false;
      life.generation++;
      life.cancel();
      unsubscribeAuth();
      unsubscribeCourse();
      resume.remove();
    };
  }, [refresh]);

  // Also mask old data in a render before the change subscription runs.
  const matches = state.key === contextKey();
  return { value: matches ? state.value : [], loading: matches ? state.loading : !!getCurrentUser(), error: matches ? state.error : null, refresh };
}

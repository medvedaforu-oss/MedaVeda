import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentUser, subscribeAuthUser } from "../services/authState";
import { getCourseYear, loadCourseYear, subscribeCourseYear } from "../services/courseState";
import { fetchBuyOptionsForChapter, Product } from "../services/productsService";

export const BUY_OPTIONS_TIMEOUT_MS = 15000;
type Status = "loading" | "retrying" | "success" | "empty" | "error";
type State = { key: string; options: Product[]; status: Status; error: string | null };

export function buyOptionsErrorMessage(error: unknown): string {
  const e = error as { status?: number; code?: string; message?: string } | null;
  if (e?.code === "OPTIONS_CONTEXT") return "Could not load your course. Select your course and academic year, then retry loading purchase options.";
  if (e?.status === 401 || e?.status === 403 || ["PGRST301", "PGRST302", "PGRST303", "42501"].includes(e?.code ?? "") || /jwt|unauthori[sz]ed|token.*expir/i.test(e?.message ?? "")) {
    return "Your session could not be authorized. Sign in again, then retry loading purchase options.";
  }
  if (/timeout|timed out|abort/i.test(e?.message ?? "") || e?.code === "57014") return "Loading purchase options timed out. Check your connection and retry.";
  if (e?.code === "OPTIONS_INCOMPLETE") return "Could not load all purchase options. Please retry.";
  if ((e?.status ?? 0) >= 500 || /^(PGRST00|08|53|57P|58|XX)/.test(e?.code ?? "")) return "The purchase options service is temporarily unavailable. Please retry.";
  return "Could not load purchase options. Check your connection and retry.";
}

/** Publish only complete snapshots for the mounted route/account/course. Retry
 * bypasses caches; obsolete transport reads may finish but cannot publish. */
export default function useBuyOptions(chapterId: string, subjectId: string, yearId: string, enabled = true) {
  const route = useRef([chapterId, subjectId, yearId]);
  route.current = [chapterId, subjectId, yearId];
  const contextKey = () => {
    const course = getCourseYear();
    return JSON.stringify([getCurrentUser()?.id, course.courseId, course.yearId, course.status === "ready", ...route.current]);
  };
  const [state, setState] = useState<State>({ key: contextKey(), options: [], status: "loading", error: null });
  const life = useRef({ mounted: false, key: contextKey(), generation: 0, pending: false, cancel: () => {} });
  const refresh = useCallback(async () => {
    const l = life.current, key = contextKey();
    if (!l.mounted || (l.pending && l.key === key)) return;
    l.cancel();
    l.key = key;
    l.pending = true;
    const generation = ++l.generation;
    const [chapter, subject, year] = route.current;
    let active = true;
    const current = () => active && l.mounted && l.generation === generation && contextKey() === key;
    setState(previous => ({ key, options: previous.key === key ? previous.options : [],
      status: previous.key === key && previous.status !== "loading" ? "retrying" : "loading", error: null }));
    const cancelled = Symbol("cancelled");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const interruption = new Promise<typeof cancelled>((resolve, reject) => {
      timer = setTimeout(() => reject(new Error("Purchase options request timed out")), BUY_OPTIONS_TIMEOUT_MS);
      l.cancel = () => { clearTimeout(timer); resolve(cancelled); };
    });
    try {
      const read = async () => {
        if (!getCurrentUser()) throw { status: 401 };
        const context = getCourseYear().status === "ready" ? getCourseYear() : await loadCourseYear(true);
        if (!current()) return cancelled;
        if (context.status !== "ready" || !context.courseId || !chapter || !subject || !year) throw { code: "OPTIONS_CONTEXT" };
        return fetchBuyOptionsForChapter(chapter, subject, year, context.courseId);
      };
      const options = await Promise.race([read(), interruption]);
      if (options !== cancelled && current()) setState({ key, options, status: options.length ? "success" : "empty", error: null });
    } catch (error) {
      if (current()) setState(previous => ({ ...previous, status: "error", error: buyOptionsErrorMessage(error) }));
    } finally {
      clearTimeout(timer);
      if (current()) l.pending = false;
      active = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const l = life.current;
    l.mounted = true;
    const changed = () => { if (contextKey() !== l.key) void refresh(); };
    const offAuth = subscribeAuthUser(changed);
    const offCourse = subscribeCourseYear(changed);
    void refresh();
    return () => { l.mounted = false; l.generation++; l.pending = false; l.cancel(); offAuth(); offCourse(); };
  }, [chapterId, subjectId, yearId, enabled, refresh]);

  const visible: State = state.key === contextKey() ? state : { key: contextKey(), options: [], status: "loading", error: null };
  return { ...visible, loading: visible.status === "loading" || visible.status === "retrying", refresh };
}

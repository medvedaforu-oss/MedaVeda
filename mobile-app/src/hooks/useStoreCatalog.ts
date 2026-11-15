import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentUser, subscribeAuthUser } from "../services/authState";
import { getCourseYear, loadCourseYear, subscribeCourseYear } from "../services/courseState";
import { fetchStoreCatalog, YearBlock } from "../services/storeCatalogService";

export const STORE_TIMEOUT_MS = 15000;
type Status = "loading" | "retrying" | "success" | "empty" | "error";
type State = { key: string; blocks: YearBlock[]; status: Status; error: string | null };
function contextKey() {
  const course = getCourseYear();
  return JSON.stringify([getCurrentUser()?.id, course.courseId, course.status === "ready"]);
}

export function storeErrorMessage(error: unknown): string {
  const e = error as { status?: number; code?: string; message?: string } | null;
  if (e?.code === "STORE_COURSE") return "Could not load your course. Please try again.";
  if (e?.code === "STORE_SELECTION") return "Select your course and academic year before browsing Notes.";
  if (e?.status === 401 || e?.status === 403 || ["PGRST301", "PGRST302", "PGRST303", "42501"].includes(e?.code ?? "") || /jwt|unauthori[sz]ed|token.*expir/i.test(e?.message ?? "")) {
    return "Your session could not be authorized. Sign in again, then retry loading Notes.";
  }
  if (/timeout|timed out|abort/i.test(e?.message ?? "") || e?.code === "57014") return "Loading Notes timed out. Check your connection and try again.";
  if ((e?.status ?? 0) >= 500 || /^(PGRST00|08|53|57P|58|XX)/.test(e?.code ?? "")) return "The Notes service is temporarily unavailable. Please try again.";
  return "Could not load Notes. Check your connection and try again.";
}

/** One bounded catalog attempt per account/course. Same-context refresh retains
 * only complete snapshots. Context changes invalidate synchronously; obsolete
 * transport reads may finish, but cannot publish data or end newer loading.
 */
export default function useStoreCatalog() {
  const [state, setState] = useState<State>({ key: contextKey(), blocks: [], status: "loading", error: null });
  const life = useRef({ mounted: false, key: contextKey(), generation: 0, pending: false, cancel: () => {} });
  const refresh = useCallback(async () => {
    const l = life.current, key = contextKey();
    if (!l.mounted || (l.pending && l.key === key)) return;
    l.cancel();
    l.key = key;
    l.pending = true;
    const generation = ++l.generation;
    let active = true;
    const current = () => active && l.mounted && l.generation === generation && contextKey() === key;
    setState(previous => ({ key, blocks: previous.key === key ? previous.blocks : [],
      status: previous.key === key && previous.status !== "loading" ? "retrying" : "loading", error: null }));
    const cancelled = Symbol("cancelled");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const interruption = new Promise<typeof cancelled>((resolve, reject) => {
      timer = setTimeout(() => reject(new Error("Store request timed out")), STORE_TIMEOUT_MS);
      l.cancel = () => { clearTimeout(timer); resolve(cancelled); };
    });
    try {
      const read = async () => {
        if (!getCurrentUser()) throw { status: 401 };
        const context = getCourseYear().status === "ready" ? getCourseYear() : await loadCourseYear(true);
        if (!current()) return cancelled;
        if (context.status !== "ready") throw { code: "STORE_COURSE" };
        if (!context.courseId) throw { code: "STORE_SELECTION" };
        return fetchStoreCatalog(context.courseId);
      };
      const blocks = await Promise.race([read(), interruption]);
      if (blocks !== cancelled && current()) setState({ key, blocks, status: blocks.length ? "success" : "empty", error: null });
    } catch (error) {
      if (current()) setState(previous => ({ ...previous, status: "error", error: storeErrorMessage(error) }));
    } finally {
      clearTimeout(timer);
      if (current()) l.pending = false;
      active = false;
    }
  }, []);

  useEffect(() => {
    const l = life.current;
    l.mounted = true;
    const changed = () => { if (contextKey() !== l.key) void refresh(); };
    const offAuth = subscribeAuthUser(changed);
    const offCourse = subscribeCourseYear(changed);
    void refresh();
    return () => { l.mounted = false; l.generation++; l.pending = false; l.cancel(); offAuth(); offCourse(); };
  }, [refresh]);

  const matches = state.key === contextKey();
  const visible: State = matches ? state : { key: contextKey(), blocks: [], status: "loading", error: null };
  return { ...visible, loading: visible.status === "loading" || visible.status === "retrying", refresh };
}

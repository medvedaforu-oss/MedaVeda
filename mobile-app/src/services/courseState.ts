// Single source of truth for the signed-in student's current Course + Year.
//
// The profile is loaded once after login (and re-loaded after a change) and
// shared by every screen through useCourseYear() - screens should not each
// fetch the profile just to learn the course. Server-side RLS is the real
// guard for what a student can see; this state only drives which course the
// client asks for and which screens to show (onboarding gate, headers).
import { supabase } from "../config/supabase";
import { getCurrentUser } from "./authState";
import { fetchUserProfile, setMyCourseYear } from "./usersService";
import { clearRecentChapters } from "../utils/recentActivity";
import { clearRecentSearches } from "../utils/recentSearches";
import { clearCache } from "../utils/localCache";
import { logDebug } from "../utils/logger";

export interface CourseYearState {
  // idle: not loaded yet / signed out. ready: profile loaded (course/year may still be unset).
  status: "idle" | "loading" | "ready" | "error";
  courseId?: string;
  courseTitle?: string;
  yearId?: string;
  yearTitle?: string;
}

const IDLE: CourseYearState = { status: "idle" };

let state: CourseYearState = IDLE;
let stateUserId: string | null = null;
let inFlight: Promise<CourseYearState> | null = null;

const listeners = new Set<(s: CourseYearState) => void>();
const courseChangeHandlers = new Set<() => void>();

function setState(next: CourseYearState) {
  state = next;
  listeners.forEach((fn) => fn(state));
}

export function getCourseYear(): CourseYearState {
  return state;
}

export function subscribeCourseYear(fn: (s: CourseYearState) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// In-memory caches that depend on the course (e.g. the search index)
// register here to drop themselves when the course changes.
export function onCourseChange(fn: () => void): () => void {
  courseChangeHandlers.add(fn);
  return () => courseChangeHandlers.delete(fn);
}

// True once the profile is known and the student still has to pick a
// course and/or year (new signups, and existing students who were
// backfilled to a course but never chose a year).
export function needsCourseYearSelection(s: CourseYearState = state): boolean {
  return s.status === "ready" && (!s.courseId || !s.yearId);
}

export function loadCourseYear(force = false): Promise<CourseYearState> {
  return readCourseYear(force);
}

const SAVE_UNCONFIRMED = "We could not confirm your saved course and year. Please try again.";

async function readCourseYear(
  force: boolean,
  expected?: { courseId: string; yearId: string }
): Promise<CourseYearState> {
  // authState's own session read may not have finished yet right after
  // launch/login, so fall back to asking Supabase directly.
  const user =
    getCurrentUser() ?? (await supabase.auth.getSession()).data.session?.user ?? null;
  if (!user) {
    stateUserId = null;
    setState(IDLE);
    if (expected) throw new Error(SAVE_UNCONFIRMED);
    return state;
  }

  if (!force && state.status === "ready" && stateUserId === user.id) return state;
  // A forced reload after saving must read the profile after the write,
  // rather than reuse a request that may contain the previous choice.
  if (!force && inFlight && stateUserId === user.id) return inFlight;

  stateUserId = user.id;
  if (state.status !== "ready") setState({ ...state, status: "loading" });

  const uid = user.id;
  const request: Promise<CourseYearState> = fetchUserProfile(uid)
    .then((profile) => {
      // Ignore results from a previous account or a superseded profile read.
      if (stateUserId !== uid || inFlight !== request) {
        if (expected) throw new Error(SAVE_UNCONFIRMED);
        return state;
      }
      // A successful void RPC can have updated zero rows. Only this fresh
      // profile response can confirm the write; cached state is insufficient.
      if (expected && (profile?.courseId !== expected.courseId || profile?.yearId !== expected.yearId)) {
        throw new Error(SAVE_UNCONFIRMED);
      }
      setState({
        status: "ready",
        courseId: profile?.courseId,
        courseTitle: profile?.courseTitle,
        yearId: profile?.yearId,
        yearTitle: profile?.yearTitle,
      });
      return state;
    })
    .catch((err) => {
      logDebug("loadCourseYear failed:", err);
      if (stateUserId === uid && inFlight === request) {
        setState({ ...state, status: state.courseId ? "ready" : "error" });
      }
      // Normal startup reads still fail open. Saves must never treat a failed
      // verification read (even with a matching cached choice) as success.
      if (expected) throw new Error(SAVE_UNCONFIRMED);
      return state;
    })
    .finally(() => {
      if (inFlight === request) inFlight = null;
    });

  inFlight = request;
  return request;
}

// Clears everything on this device that belongs to the previous course:
// Continue Learning, recent searches, cached catalog lists, and the
// in-memory search index. Downloaded files are deliberately NOT deleted -
// the Downloads screen just hides other courses' items.
async function clearCourseScopedLocalState(): Promise<void> {
  await Promise.all([clearRecentChapters(), clearRecentSearches(), clearCache()]);
  courseChangeHandlers.forEach((fn) => fn());
}

// Saves the student's choice through the validated set_my_course_year RPC
// (the only permitted write path), then confirms the exact pair from a fresh
// profile read. Navigation may proceed only after this promise resolves.
export async function saveCourseYear(courseId: string, yearId: string): Promise<void> {
  const previousCourseId = state.courseId;
  await setMyCourseYear(courseId, yearId);
  await readCourseYear(true, { courseId, yearId });

  if (previousCourseId && previousCourseId !== courseId) {
    await clearCourseScopedLocalState();
  }
}

// Where to send a student straight after login / on app start. If the
// profile can't be loaded (e.g. offline) we fall through to Home, whose own
// guard re-checks once the profile arrives.
export async function resolvePostLoginRoute(): Promise<"Home" | "SelectCourseYear"> {
  const s = await loadCourseYear(true);
  return needsCourseYearSelection(s) ? "SelectCourseYear" : "Home";
}

supabase.auth.onAuthStateChange((_event, session) => {
  const uid = session?.user?.id ?? null;
  if (uid !== stateUserId) {
    stateUserId = uid;
    inFlight = null;
    setState(IDLE);
  }
});

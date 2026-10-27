import { fetchWithCacheFallback } from "../utils/localCache";
import { getActiveYears } from "../repositories/yearsRepository";
import { getCurrentUser } from "./authState";
import type { Year } from "../types/year";

export type { Year } from "../types/year";

// Home requests years for two independent sections at the same time. Share only
// the live read while it is pending; each caller retains its own offline fallback
// notification, and a later call still goes to the server. Account/course keys
// keep a request started in another session from being reused. A stalled read
// stops being shared after one second so reopening/retrying can start a new one.
const pendingYears = new Map<string, Promise<Year[]>>();

function readYears(courseId?: string): Promise<Year[]> {
  const scope = JSON.stringify([getCurrentUser()?.id ?? null, courseId ?? null]);
  const pending = pendingYears.get(scope);
  if (pending) return pending;
  const request = getActiveYears(courseId).finally(() => {
    clearTimeout(expiry);
    if (pendingYears.get(scope) === request) pendingYears.delete(scope);
  });
  const expiry = setTimeout(() => {
    if (pendingYears.get(scope) === request) pendingYears.delete(scope);
  }, 1000);
  pendingYears.set(scope, request);
  return request;
}

// courseId scopes the list (and its offline cache entry) to one course;
// omit it only where a course isn't known yet.
export async function fetchYears(courseId?: string, onFallback?: () => void) {
  return fetchWithCacheFallback(courseId ? `years:${courseId}` : "years", async () => {
    const years = await readYears(courseId);

    // Sorted client-side (instead of Firestore orderBy) so this query
    // never needs a manual composite index to be created in the console.
    return years.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, onFallback);
}

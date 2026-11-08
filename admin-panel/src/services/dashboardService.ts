import { supabase } from "../config/supabase";
import { applyContentFilters } from "../utils/filters";
import type { ContentFilters } from "../types/filters";

export const dashboardStatKeys = ["courses", "years", "subjects", "products", "users", "notes", "videos", "quiz"] as const;
export type DashboardStatKey = typeof dashboardStatKeys[number];
export type DashboardStats = Record<DashboardStatKey, number | null>;
export type DashboardErrors = Partial<Record<DashboardStatKey, string>>;

// Tables that carry a course_id. "courses" itself is counted unfiltered.
async function countRows(table: string, courseId?: string) {
  const { count, error } = await applyContentFilters(
    supabase.from(table).select("id", { count: "exact", head: true }),
    { courseId }
  );
  if (error) throw error;
  return count ?? 0;
}

export async function getDashboardStats(filters: ContentFilters = {}) {
  const { courseId } = filters;
  const results = await Promise.allSettled([
    countRows("courses"),
    countRows("years", courseId),
    countRows("subjects", courseId),
    countRows("products", courseId),
    countRows("profiles", courseId),
    countRows("notes", courseId),
    countRows("videos", courseId),
    countRows("quiz_tests", courseId),
  ]);

  const stats = {} as DashboardStats;
  const errors: DashboardErrors = {};
  results.forEach((result, index) => {
    const key = dashboardStatKeys[index];
    stats[key] = result.status === "fulfilled" ? result.value : null;
    if (result.status === "rejected") {
      console.error(`Could not load dashboard count (${key}):`, result.reason);
      errors[key] = "Could not load this count.";
    }
  });
  return { stats, errors };
}

import { supabase } from "../config/supabase";
import { toCamelCase } from "../utils/caseConvert";
import { Chapter } from "../types/chapter";
import { isNonplayTestBuild } from "../config/paymentProvider";

// "chapters" only stores subject_id/year_id - subjectTitle/yearTitle are
// UI-only fields the admin panel strips before writing (see admin's
// chapterService.ts), so every read here must join "subjects"/"years"
// live to resolve them. Without this, every chapter card across the app
// (Home, Subjects list, Downloads...) shows a blank subject/year name.
const SELECT_WITH_TITLES = "*, subjects ( title ), years ( title )";

function mapRow(row: any): Chapter {
  const chapter = toCamelCase<Chapter>(row);
  return {
    ...chapter,
    subjectTitle: row.subjects?.title ?? "",
    yearTitle: row.years?.title ?? "",
  };
}

export async function getChaptersBySubject(subjectId: string): Promise<Chapter[]> {
  const { data, error } = await supabase
    .from("chapters")
    .select(SELECT_WITH_TITLES)
    .eq("subject_id", subjectId)
    .eq("active", true);
  if (error) throw error;
  const real=(data ?? []).map(mapRow);
  if (!isNonplayTestBuild) return real;
  const test=await import("../services/nonplayTestService");
  const catalog=await test.testCatalog().catch(() => test.EMPTY_TEST_CATALOG);
  return [...real,...catalog.chapters.filter(c => c.subjectId===subjectId)];
}

export async function getChaptersOrderedByCreatedAt(
  max: number,
  courseId?: string
): Promise<Chapter[]> {
  let query = supabase.from("chapters").select(SELECT_WITH_TITLES).eq("active", true);
  if (courseId) query = query.eq("course_id", courseId);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(max);
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function getActiveChapters(max: number, courseId?: string): Promise<Chapter[]> {
  let query = supabase.from("chapters").select(SELECT_WITH_TITLES).eq("active", true);
  if (courseId) query = query.eq("course_id", courseId);
  const { data, error } = await query.limit(max);
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

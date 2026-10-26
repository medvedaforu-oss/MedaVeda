import { supabase } from "../config/supabase";
import { toCamelCase } from "../utils/caseConvert";
import { readAllSearchPages } from "./searchPagination";

type CatalogTable = "years" | "subjects" | "chapters" | "notes" | "videos" | "quiz_tests" | "products";
const columns: Record<CatalogTable, string> = {
  years: "*",
  subjects: "*, years ( title )",
  chapters: "*, subjects ( title ), years ( title )",
  notes: "*",
  videos: "*, subjects ( title ), years ( title )",
  // Never fetch quiz answer keys/questions into the search index.
  quiz_tests: "id, title, subject_id, year_id, course_id, order, active, subjects ( title ), years ( title )",
  products: "*, subjects ( title ), years ( title )",
};

/** Search-only reads: ordinary browsing, entitlement and purchase queries keep
 * their existing contracts. Each source is ordered by its unique primary key. */
export async function getSearchCatalogRows<T>(table: CatalogTable, courseId?: string): Promise<T[]> {
  return readAllSearchPages(async ({ size, after }) => {
    let query = supabase.from(table).select(columns[table]).eq("active", true);
    if (courseId) query = query.eq("course_id", courseId);
    if (after) query = query.gt("id", after);
    const { data, error } = await query.order("id", { ascending: true }).limit(size);
    if (error) throw error;
    return (data ?? []).map((row: any) => {
      const mapped = toCamelCase<T>(row);
      return {
        ...mapped,
        id: row.id as string,
        ...(["chapters", "videos", "quiz_tests", "products"].includes(table)
          ? { subjectTitle: row.subjects?.title ?? (table === "products" ? undefined : "") } : {}),
        ...(["subjects", "chapters", "videos", "quiz_tests", "products"].includes(table)
          ? { yearTitle: row.years?.title ?? (table === "products" ? undefined : "") } : {}),
      };
    });
  });
}

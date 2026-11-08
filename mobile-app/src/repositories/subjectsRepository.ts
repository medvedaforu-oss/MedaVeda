import { supabase } from "../config/supabase";
import { toCamelCase } from "../utils/caseConvert";
import { Subject } from "../types/subject";

export async function getSubjectsByYear(yearId: string): Promise<Subject[]> {
  const { data, error } = await supabase
    .from("subjects")
    // "subjects" only stores year_id - yearTitle is a UI-only field the
    // admin panel never writes to the DB, so it must be joined live here
    // (otherwise every Subject card's year name shows blank).
    .select("*, years ( title )")
    .eq("year_id", yearId)
    .eq("active", true);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...toCamelCase<Subject>(row),
    yearTitle: row.years?.title ?? "",
  }));
}

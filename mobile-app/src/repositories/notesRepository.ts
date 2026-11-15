import { supabase } from "../config/supabase";
import { toCamelCase } from "../utils/caseConvert";
import { Note } from "../types/note";
import { isNonplayTestBuild } from "../config/paymentProvider";

export async function getNotesByChapter(chapterId: string): Promise<Note[]> {
  if (chapterId.startsWith("npt_")) {
    if (!isNonplayTestBuild) return [];
    return (await (await import("../services/nonplayTestService")).testCatalog()).notes.filter(n => n.chapterId===chapterId);
  }
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("chapter_id", chapterId)
    .eq("active", true);
  if (error) throw error;
  return (data ?? []).map((row) => toCamelCase<Note>(row));
}

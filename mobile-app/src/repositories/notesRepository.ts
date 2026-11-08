import { supabase } from "../config/supabase";
import { toCamelCase } from "../utils/caseConvert";
import { Note } from "../types/note";

export async function getNotesByChapter(chapterId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("chapter_id", chapterId)
    .eq("active", true);
  if (error) throw error;
  return (data ?? []).map((row) => toCamelCase<Note>(row));
}

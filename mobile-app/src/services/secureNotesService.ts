import { supabase } from "../config/supabase";
import { isNonplayTestBuild } from "../config/paymentProvider";

// The `notes` storage bucket is PRIVATE. The only way to read a PDF is the
// get-note-url Edge Function, which checks the caller's entitlement (free
// preview flag, or a purchase covering the chapter) and returns a signed URL
// that expires after ~2 minutes. Never cache the result and never build a
// storage URL from note.pdfUrl on the client - that URL no longer resolves.

export const PAID_NOTES_OFFLINE_ALLOWED = false;
export const ONLINE_ONLY_MESSAGE = "Paid notes are online-only in this release. Connect to open this note.";

export class NoteOfflineError extends Error {
  readonly status = 409;
  constructor() { super(ONLINE_ONLY_MESSAGE); }
}

/** Metadata only; an unavailable lookup never grants offline permission. */
export async function isFreePreviewNote(noteId: string): Promise<boolean> {
  const { data, error } = await supabase.from("notes").select("is_free_preview").eq("id", noteId).maybeSingle();
  if (error || !data || typeof data.is_free_preview !== "boolean") throw new Error("Preview metadata is unavailable. Try again online.");
  return data.is_free_preview;
}

export class NoteAccessError extends Error {
  constructor(public readonly status?: number) {
    super("This note is unavailable. Check your connection and access, then retry.");
  }
}

/**
 * Resolves a note into a fresh, short-lived signed URL. Call it right before
 * opening the viewer or starting a download.
 *
 * Throws when the user is not signed in, not entitled, or the file is missing -
 * callers show a locked / unavailable message.
 */
export async function getSecureNoteUrl(noteId: string, purpose: "online" | "offline" = "online", freePreview = false): Promise<string> {
  if (purpose === "offline" && !PAID_NOTES_OFFLINE_ALLOWED) {
    if (!freePreview || !await isFreePreviewNote(noteId)) throw new NoteOfflineError();
  }
  if (noteId.startsWith("npt_")) {
    if (!isNonplayTestBuild) throw new NoteAccessError(403);
    return (await import("./nonplayTestService")).testNoteUrl(noteId);
  }
  const { data, error } = await supabase.functions.invoke("get-note-url", {
    body: { noteId },
    signal: AbortSignal.timeout(10_000),
  });

  if (error || !data?.url) {
    throw new NoteAccessError(error?.context?.status);
  }

  return data.url as string;
}

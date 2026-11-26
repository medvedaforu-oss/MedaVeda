import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCurrentUser, getAuthEpoch } from "./authState";
import { getSecureNoteUrl, NoteAccessError, NoteOfflineError } from "./secureNotesService";
import { getDownload } from "../utils/downloadManager";
import { clearNoteVerification, hasRecentNoteVerification, recordNoteVerification } from "./offlineNoteVerification";
import { supabase } from "../config/supabase";

const deniedThisSession = new Set<string>();
const checkGenerations = new Map<string, number>();
const freshAuthorizations = new Map<string, number>();
const stateWrites = new Map<string, Promise<unknown>>();

function writeAuthorization<T>(key: string, write: () => Promise<T>): Promise<T> {
  const next = (stateWrites.get(key) ?? Promise.resolve()).catch(() => {}).then(write);
  stateWrites.set(key, next);
  void next.finally(() => { if (stateWrites.get(key) === next) stateWrites.delete(key); }).catch(() => {});
  return next;
}

export async function mayOpenOfflineNote(noteId: string): Promise<boolean> {
  if (getDownload(noteId)?.isFreePreview !== true) return false;
  const owner = getCurrentUser()?.id;
  const epoch = getAuthEpoch();
  if (!owner) return false;
  const key = `medveda:note-denied:${owner}:${noteId}`;
  const generation = (checkGenerations.get(key) ?? 0) + 1;
  checkGenerations.set(key, generation);
  const sameAccount = () => getCurrentUser()?.id === owner && getAuthEpoch() === epoch;
  const current = () => sameAccount() && checkGenerations.get(key) === generation;
  if (await AsyncStorage.getItem("medveda:offline-owner") !== owner || !current()) return false;
  try {
    // Keep authoritative policy/missing-content responses distinct from outages.
    // This replaces the shared offline helper's indistinguishable metadata read.
    const { data, error, status } = await supabase.from("notes")
      .select("is_free_preview").eq("id", noteId).maybeSingle();
    if (error) throw new NoteAccessError(status || undefined);
    if (!data) throw new NoteAccessError(404);
    if (data.is_free_preview !== true) throw new NoteOfflineError();
    if (!current()) return false;
    await getSecureNoteUrl(noteId, "online");
    if (!current()) return false;
    return await writeAuthorization(key, async () => {
      if (!current()) return false;
      await recordNoteVerification(owner, noteId);
      if (!current()) return false;
      await AsyncStorage.removeItem(key);
      if (!current()) return false;
      deniedThisSession.delete(key);
      freshAuthorizations.set(key, generation);
      return true;
    });
  } catch (error) {
    if (!sameAccount()) return false;
    const authoritativeDenial = error instanceof NoteOfflineError ||
      (error instanceof NoteAccessError && error.status !== undefined &&
        error.status >= 400 && error.status < 500 && error.status !== 429);
    if (authoritativeDenial) {
      // An outage in a newer request cannot refute an in-flight denial. Only a
      // completed newer server authorization can supersede that older response.
      if ((freshAuthorizations.get(key) ?? 0) > generation) return false;
      checkGenerations.set(key, (checkGenerations.get(key) ?? 0) + 1);
      deniedThisSession.add(key);
      await writeAuthorization(key, async () => {
        // Commit both revocation stores after any older renewal writes. Keep
        // downloaded bytes and rows available for a future legitimate recovery.
        await Promise.allSettled([
          AsyncStorage.setItem(key, "1"), clearNoteVerification(owner, noteId),
        ]);
      });
      return false;
    }
    if (!current()) return false;
    const denied = await AsyncStorage.getItem(key);
    const recent = !deniedThisSession.has(key) && denied !== "1" && await hasRecentNoteVerification(owner, noteId);
    return current() && recent;
  }
}

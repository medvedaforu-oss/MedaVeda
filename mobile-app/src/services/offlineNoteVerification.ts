import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { sha256 } from "js-sha256";

export const OFFLINE_NOTE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
// Only a nonsecret marker remains here, for logout/bulk cleanup discovery.
export const OFFLINE_NOTE_VERIFICATION_PREFIX = "medveda:note-verified:";
const MARKER = "secure-store:v1";
const keyFor = (owner: string, noteId: string) => `${OFFLINE_NOTE_VERIFICATION_PREFIX}${owner}:${noteId}`;
const secureKeyFor = (key: string) => `medveda.license.v1.${sha256(key)}`;
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

// Keep read/update and revoke/cleanup ordered across asynchronous native calls.
let pending: Promise<unknown> = Promise.resolve();
function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const next = pending.then(operation);
  pending = next.catch(() => {});
  return next;
}

async function invalidate(key: string): Promise<void> {
  // Retain a tombstone until deletion succeeds; storage recovery or restoring
  // the clock must not make a rejected record trusted again.
  await AsyncStorage.setItem(key, "invalid:v1");
  await erase(key);
}

async function erase(key: string): Promise<void> {
  if (Platform.OS !== "web") await SecureStore.deleteItemAsync(secureKeyFor(key));
  // Keep the discovery marker if secure deletion fails, so cleanup can retry.
  await AsyncStorage.removeItem(key);
}

export function recordNoteVerification(owner: string, noteId: string): Promise<void> {
  return serialize(async () => {
    if (Platform.OS === "web") return; // No native offline license on web.
    const key = keyFor(owner, noteId);
    const now = Date.now();
    // Write discovery first: interrupted/failed secure writes remain discoverable.
    // Existing plaintext is never read as a license or copied into SecureStore.
    await AsyncStorage.setItem(key, "pending:v1");
    await SecureStore.setItemAsync(secureKeyFor(key), JSON.stringify({
      version: 1, owner, noteId, checkedAt: now, lastSeenAt: now,
    }), options);
    await AsyncStorage.setItem(key, MARKER);
    await AsyncStorage.removeItem(`medveda:note-denied:${owner}:${noteId}`);
  });
}

export function clearNoteVerification(owner: string, noteId: string): Promise<void> {
  return serialize(() => erase(keyFor(owner, noteId)));
}

export function clearAllNoteVerifications(): Promise<void> {
  return serialize(async () => {
    const keys = await AsyncStorage.getAllKeys();
    for (const key of keys) {
      if (key.startsWith(OFFLINE_NOTE_VERIFICATION_PREFIX)) await erase(key);
    }
  });
}

export function hasRecentNoteVerification(owner: string, noteId: string): Promise<boolean> {
  return serialize(async () => {
    if (Platform.OS === "web") return false;
    const key = keyFor(owner, noteId);
    try {
      if (await AsyncStorage.getItem(key) !== MARKER) {
        // Legacy timestamps are unauthenticated. Preserve the PDF, require one
        // successful online check, and remove the old license on first use.
        await erase(key);
        return false;
      }
      const raw = await SecureStore.getItemAsync(secureKeyFor(key));
      if (!raw) { await erase(key); return false; }
      let record;
      try { record = JSON.parse(raw); } catch { await invalidate(key); return false; }
      const now = Date.now();
      if (!record || record.version !== 1 || record.owner !== owner || record.noteId !== noteId ||
          !Number.isSafeInteger(record.checkedAt) || !Number.isSafeInteger(record.lastSeenAt) ||
          record.checkedAt <= 0 || record.lastSeenAt < record.checkedAt || now < record.lastSeenAt ||
          now - record.checkedAt > OFFLINE_NOTE_GRACE_MS) {
        // Persist expiry/rollback denial before returning, never renew checkedAt.
        await invalidate(key);
        return false;
      }
      await SecureStore.setItemAsync(secureKeyFor(key), JSON.stringify({ ...record, lastSeenAt: now }), options);
      return true;
    } catch {
      // Locked/unavailable keystore and failed writes deny this open. Retain the
      // recoverable record for retry; never downgrade to plaintext storage.
      return false;
    }
  });
}

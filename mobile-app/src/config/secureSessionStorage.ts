// Encrypted session storage adapter for the Supabase client.
//
// WHY THIS FILE EXISTS (security fix):
//   The previous config used @react-native-async-storage/async-storage
//   directly as the Supabase `auth.storage`. AsyncStorage is UNENCRYPTED
//   on both platforms:
//     - Android: a plain SQLite DB / files under the app's sandbox,
//       trivially readable on a rooted device or from an adb backup.
//     - iOS: a plain plist/db file, readable from an unencrypted device
//       backup.
//   Supabase's session object contains the access_token (JWT) AND the
//   refresh_token. The refresh_token in particular is long-lived - anyone
//   who copies it off the device can mint fresh sessions indefinitely,
//   even after the user changes their password's session elsewhere.
//
// FIX: encrypt the session blob with a random AES key before it ever
// touches AsyncStorage, and keep ONLY the AES key in expo-secure-store
// (iOS Keychain / Android Keystore - hardware-backed on most devices).
// This is the pattern Supabase's own React Native/Expo guide recommends,
// because SecureStore alone has a ~2KB per-value limit and a Supabase
// session (JWT + refresh_token + user metadata) can exceed that.
//
// REQUIRED PACKAGES (add these - they are not yet in package.json):
//   npx expo install expo-secure-store react-native-get-random-values
//   npm install aes-js
//
// USAGE: in config/supabase.ts, replace
//   import AsyncStorage from "@react-native-async-storage/async-storage";
//   ...
//   auth: { storage: AsyncStorage, ... }
// with
//   import { secureSessionStorage } from "./secureSessionStorage";
//   ...
//   auth: { storage: secureSessionStorage, ... }

import "react-native-get-random-values";
import * as aesjs from "aes-js";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

// expo-secure-store is backed by the iOS Keychain / Android Keystore -
// neither exists in a browser, so the native module simply isn't there
// when this app runs on web (Expo Go "w", or `expo start --web`). That's
// fine: the actual shipped product here is the Android/iOS app (per the
// Play Store readiness requirements), web is just a dev-time convenience
// - so on web we fall back to plain AsyncStorage (same as before this
// fix) instead of crashing. Every native build still gets the full
// SecureStore + AES encryption below.
const isWeb = Platform.OS === "web";

// SecureStore keys must be alphanumeric/./-/_ only - Supabase storage keys
// already satisfy that (e.g. "sb-<project-ref>-auth-token"), but we prefix
// defensively in case that ever changes.
function keyFor(key: string) {
  return `secure-${key}`.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// A blob names an immutable key generation. Publishing the blob is the commit:
// a failed write never replaces the key needed by the previously durable blob.
const operations = new Map<string, Promise<unknown>>();
function serialized<T>(key: string, action: () => Promise<T>): Promise<T> {
  const pending = (operations.get(key) ?? Promise.resolve()).catch(() => {}).then(action);
  operations.set(key, pending);
  void pending.finally(() => { if (operations.get(key) === pending) operations.delete(key); }).catch(() => {});
  return pending;
}
function generationOf(blob: string): string | null {
  if (!blob.startsWith("{")) return null; // installed legacy ciphertext
  const value = JSON.parse(blob);
  if (value.version !== 2 || !/^[a-f0-9]{32}$/.test(value.generation) ||
      typeof value.ciphertext !== "string" || !/^(?:[a-f0-9]{2})*$/.test(value.ciphertext))
    throw new Error("Invalid session envelope");
  return value.generation;
}
function storedKey(key: string, generation: string | null) {
  return generation ? `${keyFor(key)}.${generation}` : keyFor(key);
}

export const secureSessionStorage = {
  getItem(key: string): Promise<string | null> {
    return serialized(key, async () => {
      const blob = await AsyncStorage.getItem(key);
      if (isWeb || !blob) return blob;
      let generation: string | null;
      try { generation = generationOf(blob); } catch { return null; }
      // Locked/unavailable keystore is not evidence of corrupt persisted data.
      const keyHex = await SecureStore.getItemAsync(storedKey(key, generation));
      if (!keyHex) return null;
      try {
        if (!/^[a-f0-9]{64}$/.test(keyHex)) return null;
        const ciphertext = generation ? JSON.parse(blob).ciphertext : blob;
        const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(keyHex), new aesjs.Counter(1));
        return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(ciphertext)));
      } catch { return null; }
    });
  },
  setItem(key: string, value: string): Promise<void> {
    return serialized(key, async () => {
      if (isWeb) { await AsyncStorage.setItem(key, value); return; }
      const previous = await AsyncStorage.getItem(key);
      const encryptionKey = crypto.getRandomValues(new Uint8Array(32));
      const generation = aesjs.utils.hex.fromBytes(crypto.getRandomValues(new Uint8Array(16)));
      const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
      const ciphertext = aesjs.utils.hex.fromBytes(cipher.encrypt(aesjs.utils.utf8.toBytes(value)));
      await SecureStore.setItemAsync(storedKey(key, generation), aesjs.utils.hex.fromBytes(encryptionKey));
      encryptionKey.fill(0);
      // On ambiguous storage failure retain both generations for restart recovery.
      await AsyncStorage.setItem(key, JSON.stringify({ version: 2, generation, ciphertext }));
      if (previous) {
        try { await SecureStore.deleteItemAsync(storedKey(key, generationOf(previous))); } catch { /* harmless orphan key */ }
      }
    });
  },
  removeItem(key: string): Promise<void> {
    return serialized(key, async () => {
      const blob = await AsyncStorage.getItem(key);
      // Delete publication first; interruption cannot leave a blob with a lost key.
      await AsyncStorage.removeItem(key);
      if (!isWeb && blob) {
        await SecureStore.deleteItemAsync(storedKey(key, generationOf(blob)));
      }
    });
  },
};

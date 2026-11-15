// Supabase doesn't expose a synchronous "auth.currentUser" like Firebase
// did. This tiny module recreates that convenience: it keeps an in-memory
// copy of the current user, kept fresh by Supabase's own auth listener,
// so screens that used to read `auth.currentUser` directly can just call
// `getCurrentUser()` instead with no other changes to their logic.
import type { User } from "@supabase/supabase-js";
import { supabase } from "../config/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerForPushNotifications, unregisterCurrentDeviceToken, resumePushAfterFailedLogout, setPushNotificationUser } from "./pushNotifications";
import { logDebug } from "../utils/logger";

let currentUser: User | null = null;
let receivedAuthEvent = false;
let authEpoch = 0;
let offlineReadyEpoch = -1;
let ownershipOperations: Promise<void> = Promise.resolve();
function serializeOwnership(action: () => Promise<void>): Promise<void> {
  const pending = ownershipOperations.catch(() => {}).then(action);
  ownershipOperations = pending;
  return pending;
}
export function getAuthEpoch(): number { return authEpoch; }
export async function waitForOfflineStorage(): Promise<boolean> {
  const epoch = authEpoch;
  await ownershipOperations;
  return !!currentUser && epoch === authEpoch && offlineReadyEpoch === epoch;
}
const userListeners = new Set<() => void>();
export function subscribeAuthUser(listener: () => void): () => void {
  userListeners.add(listener);
  return () => { userListeners.delete(listener); };
}
function updateCurrentUser(user: User | null): void {
  const previousId = currentUser?.id;
  if (previousId !== user?.id) {
    authEpoch++;
    offlineReadyEpoch = -1;
  }
  currentUser = user;
  setPushNotificationUser(user);
  if (previousId !== user?.id) userListeners.forEach(listener => listener());
}

// Paid notes are saved on the device for offline reading. They belong to whoever downloaded
// them: they are wiped on every sign-out (Logout, blocked, session ended, account deletion),
// and also when a DIFFERENT account signs in on a device that still has another account's
// files (e.g. after a reinstall-less session loss), so a second student on a shared phone
// can never open the first student's purchases.
const OFFLINE_OWNER_KEY = "medveda:offline-owner";

async function purgeOfflineContent(): Promise<boolean> {
  try {
    // Loaded lazily: downloadManager pulls in course state, which imports this module.
    const { clearAllDownloads } = await import("../utils/downloadManager");
    await clearAllDownloads();
    return true;
  } catch (err) {
    logDebug("purgeOfflineContent failed:", err);
    return false;
  }
}

function claimOfflineStorage(user: User): Promise<void> {
  const epoch = authEpoch;
  const current = () => epoch === authEpoch && currentUser?.id === user.id;
  return serializeOwnership(async () => {
    try {
      if (!current()) return;
      const owner = await AsyncStorage.getItem(OFFLINE_OWNER_KEY);
      if (!current()) return;
      if (owner && owner !== user.id) {
        if (!current() || !await purgeOfflineContent() || !current()) return;
      }
      if (!current()) return;
      if (owner !== user.id) await AsyncStorage.setItem(OFFLINE_OWNER_KEY, user.id);
      if (current()) offlineReadyEpoch = epoch;
    } catch {
      // Admission stays closed until a later successful claim.
    }
  });
}
function cleanupOfflineStorage(): Promise<void> {
  const epoch = authEpoch;
  return serializeOwnership(async () => {
    const current = () => epoch === authEpoch && currentUser === null;
    if (!current() || !await purgeOfflineContent() || !current()) return;
    await AsyncStorage.removeItem(OFFLINE_OWNER_KEY).catch(() => {});
  });
}

/**
 * The one way the app signs a student out: stops pushes to this device for them, ends the
 * session, then deletes the offline copies of paid content.
 */
export async function performSignOut(): Promise<void> {
  const initiatingUserId = currentUser?.id;
  const initiatingEpoch = authEpoch;
  let logoutHandle: Awaited<ReturnType<typeof unregisterCurrentDeviceToken>> | undefined;
  try {
    logoutHandle = await unregisterCurrentDeviceToken(); // needs the session, so before signOut
  } catch {
    // never block a logout on push cleanup
  }
  if (currentUser?.id !== initiatingUserId || authEpoch !== initiatingEpoch) return;
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    if (currentUser?.id === initiatingUserId && authEpoch === initiatingEpoch &&
        logoutHandle && resumePushAfterFailedLogout(logoutHandle)) {
      pushRegisteredForUserId = null;
      maybeRegisterForPush(currentUser);
    }
    throw error;
  }
  if (currentUser && (currentUser.id !== initiatingUserId || authEpoch !== initiatingEpoch)) return;
  updateCurrentUser(null);
  pushRegisteredForUserId = null;
  await cleanupOfflineStorage();
}

// BUG FIX: registerForPushNotifications() existed in pushNotifications.ts
// but was never actually called from anywhere in the app, so no device
// ever saved an Expo Push Token into the `push_tokens` table - hence the
// admin panel always showing "Notification sent to 0 device(s)". This
// module is the single place that already tracks every transition into
// a signed-in state (both "already logged in at app startup" via
// getSession() below, and "just logged in" via onAuthStateChange), so
// it's the correct place to trigger registration exactly once per user
// per app session. registerForPushNotifications() itself upserts on the
// unique `expo_push_token` column, so this is also safe against
// duplicate token rows even if called again later.
let pushRegisteredForUserId: string | null = null;
function maybeRegisterForPush(user: User | null): void {
  if (!user || pushRegisteredForUserId === user.id) return;
  pushRegisteredForUserId = user.id;
  // Leave Supabase's synchronous Auth callback before calling getSession.
  void new Promise<void>(resolve => { setTimeout(resolve, 0); }).then(() => registerForPushNotifications(user)).then(token => {
    if (!token && currentUser?.id === user.id) pushRegisteredForUserId = null;
  }).catch(() => { if (currentUser?.id === user.id) pushRegisteredForUserId = null; });
}

// BUG FIX: the admin panel has a "Block User" toggle (profiles.blocked)
// but nothing in the mobile app ever read that column - an admin
// blocking a problematic/abusive account did literally nothing, the
// student could keep browsing, downloading, and purchasing normally.
// This listener runs on every login and session restore; a blocked
// account is signed out immediately and every screen listening via
// onBlockedSignOut() gets a chance to show why.
type BlockedListener = () => void;
const blockedListeners = new Set<BlockedListener>();
export function onBlockedSignOut(fn: BlockedListener): () => void {
  blockedListeners.add(fn);
  return () => blockedListeners.delete(fn);
}

async function enforceNotBlocked(user: User): Promise<void> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("blocked")
    .eq("id", user.id)
    .maybeSingle();

  // Fail open on a network/lookup error - a transient failure here
  // should not lock a legitimate student out of the app. A genuinely
  // blocked user will be caught again on their next session refresh.
  if (error || !profile?.blocked || currentUser?.id !== user.id) return;

  await performSignOut();
  blockedListeners.forEach((fn) => fn());
}

supabase.auth
  .getSession()
  .then(({ data }) => {
    if (receivedAuthEvent) return;
    updateCurrentUser(data.session?.user ?? null);
    if (currentUser) {
      claimOfflineStorage(currentUser);
      enforceNotBlocked(currentUser).catch(() => {});
    }
    maybeRegisterForPush(currentUser);
  })
  .catch((err) => logDebug("getSession failed:", err));

supabase.auth.onAuthStateChange((event, session) => {
  receivedAuthEvent = true;
  updateCurrentUser(session?.user ?? null);
  if (event === "SIGNED_OUT") {
    pushRegisteredForUserId = null;
    void cleanupOfflineStorage();
  }
  if (currentUser) {
    claimOfflineStorage(currentUser);
    enforceNotBlocked(currentUser).catch(() => {});
  }
  maybeRegisterForPush(currentUser);
});

export function getCurrentUser(): User | null {
  return currentUser;
}

// Firebase's User had `.displayName`; Supabase stores that in
// `user_metadata.name` (set at signup - see RegisterScreen). This helper
// reads it the same way `.displayName` used to be read.
export function getCurrentUserDisplayName(): string | undefined {
  return currentUser?.user_metadata?.name;
}
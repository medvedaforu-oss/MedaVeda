// NOTIFICATIONS SYSTEM - push token registration.
//
// Gets this device's Expo push token and saves it against the signed-in
// user in Supabase, so a backend process (the send-push-notification
// Edge Function, or the admin panel once it has a broadcast composer)
// can reach this device even when the app is fully closed - the one
// thing the existing pull-based "notifications" table + local study
// reminder can't do.
//
// Same Expo Go guard as studyReminderService.ts: expo-notifications'
// Android push APIs are unavailable in Expo Go (SDK 53+), so this
// entire flow is skipped there and only runs in a real dev/production
// build. Safe to call unconditionally from App.tsx.

import { AppState, Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import type * as ExpoNotifications from "expo-notifications";

import { supabase } from "../config/supabase";
import type { User } from "@supabase/supabase-js";
import { logError } from "../utils/logger";

// Push is unsupported in Expo Go (SDK 53+) and on web (no vapidPublicKey).
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient || Platform.OS === "web";

let Notifications: typeof ExpoNotifications | null = null;
if (!isExpoGo) {
  // @ts-ignore - see studyReminderService.ts for why require() (not
  // `import`) is used here.
  Notifications = require("expo-notifications");
}

// Invalidate synchronously on every account transition, including A → B → A.
// Writes are serialized and carry the initiating session explicitly; the global
// Supabase client must never substitute the next student's bearer token.
let owner: User | null = null;
let generation = 0;
let loggingOut = false;
let token: string | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();
let listenersInstalled = false;
let registration: { generation: number; promise: Promise<string | null> } | null = null;

export function setPushNotificationUser(user: User | null): void {
  if (owner?.id !== user?.id) {
    generation++;
    loggingOut = false;
  }
  owner = user;
}

function installTokenListeners(): void {
  if (listenersInstalled || !Notifications) return;
  listenersInstalled = true;
  // A native FCM token change requires a fresh Expo token, not storing the FCM
  // token in the Expo-token table. Retry transient failures on foreground too.
  Notifications.addPushTokenListener(() => {
    if (owner && !loggingOut) {
      generation++; // supersede an in-flight read of the previous native token
      void registerForPushNotifications(owner);
    }
  });
  AppState.addEventListener("change", state => {
    if (state === "active" && owner && !loggingOut) void registerForPushNotifications(owner);
  });
}

async function deadline<T>(operation: PromiseLike<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Push operation timed out")), 10_000);
    })]);
  } finally { clearTimeout(timer); }
}

function serialized<T>(operation: () => Promise<T>): Promise<T> {
  const pending = writeQueue.then(operation, operation);
  writeQueue = pending.catch(() => {});
  return pending;
}

/** Optional registration; failures never block login or content access. */
export function registerForPushNotifications(user: User | null): Promise<string | null> {
  if (isExpoGo || !Notifications || !user || loggingOut || owner?.id !== user.id) return Promise.resolve(null);
  installTokenListeners();
  const epoch = generation;
  if (registration?.generation === epoch) return registration.promise;
  const current = () => generation === epoch && owner?.id === user.id && !loggingOut;
  const promise = (async () => {
    try {
      // Android 13 permission prompts need a channel first.
      if (Platform.OS === "android") await deadline(Notifications!.setNotificationChannelAsync("default", {
        name: "default", importance: Notifications!.AndroidImportance.DEFAULT,
      }));
      if (!current()) return null;
      let { status } = await deadline(Notifications!.getPermissionsAsync());
      if (!current()) return null;
      if (status !== "granted") ({ status } = await deadline(Notifications!.requestPermissionsAsync()));
      if (!current() || status !== "granted") return null;
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) return null;
      const response = await deadline(Notifications!.getExpoPushTokenAsync({ projectId }));
      if (!current()) return null;
      const session = (await deadline(supabase.auth.getSession())).data.session;
      if (!current() || session?.user.id !== user.id || !session.access_token) return null;
      token = response.data;
      return await serialized(async () => {
        if (!current()) return null;
        const { error } = await supabase.rpc("register_push_token", {
          p_token: response.data, p_platform: Platform.OS,
        }).setHeader("Authorization", `Bearer ${session.access_token}`).abortSignal(AbortSignal.timeout(10_000));
        if (error) throw error;
        // Logout waits for this write, then removes it with the original owner.
        return current() ? response.data : null;
      });
    } catch (err) {
      logError("Failed to register for push notifications:", err);
      return null;
    }
  })().finally(() => { if (registration?.promise === promise) registration = null; });
  registration = { generation: epoch, promise };
  return promise;
}

/** Cancel pending work immediately; delete only this owner's token before signOut. */
export async function unregisterCurrentDeviceToken(): Promise<void> {
  generation++;
  loggingOut = true;
  if (isExpoGo || !Notifications) return;
  const user = owner;
  try {
    const session = (await deadline(supabase.auth.getSession())).data.session;
    if (!user || session?.user.id !== user.id || !session.access_token) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const knownToken = token ?? (projectId
      ? (await deadline(Notifications.getExpoPushTokenAsync({ projectId }))).data : null);
    if (!knownToken) return;
    await serialized(async () => {
      const { error } = await supabase.from("push_tokens").delete()
        .eq("expo_push_token", knownToken).eq("user_id", user.id)
        .setHeader("Authorization", `Bearer ${session.access_token}`).abortSignal(AbortSignal.timeout(10_000));
      if (error) throw error;
    });
  } catch (err) { logError("Failed to unregister push token:", err); }
}

/**
 * Sets up a listener for taps on a push notification (including one
 * that launched the app from a killed state) and deep-links into the
 * relevant screen based on the notification's `data` payload.
 * Call once from App.tsx with the navigation ref.
 */
export function setupNotificationResponseListener(
  onResponse: (response: ExpoNotifications.NotificationResponse) => void
): () => void {
  if (isExpoGo || !Notifications) return () => {};
  let active = true;
  let liveResponseReceived = false;
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    if (!active) return;
    liveResponseReceived = true;
    onResponse(response);
    void Notifications?.clearLastNotificationResponseAsync().catch(() => {});
  });
  // Subscribe first so a tap during this asynchronous read cannot be lost or
  // replaced by an older launch response. The router also deduplicates IDs.
  void Notifications.getLastNotificationResponseAsync().then((response) => {
    if (!active || liveResponseReceived || !response) return;
    onResponse(response);
    void Notifications?.clearLastNotificationResponseAsync().catch(() => {});
  }).catch((err) => logError("Could not read notification launch response", err));

  return () => { active = false; subscription.remove(); };
}

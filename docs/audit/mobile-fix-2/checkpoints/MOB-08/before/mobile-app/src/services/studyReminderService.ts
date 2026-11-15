import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
// Type-only import: fully erased by the compiler, so this never triggers
// an actual `require("expo-notifications")` at runtime - safe to keep
// unconditional even though the value import below is not.
import type * as ExpoNotifications from "expo-notifications";
import { createNotificationPresentationGate } from "./notificationRouting";
import { logError } from "../utils/logger";

// Fully on-device: a daily repeating LOCAL notification scheduled by the
// OS itself (Notifications.scheduleNotificationAsync with a
// calendar-style repeating trigger). This is deliberately NOT a server /
// push notification - once scheduled, it fires at the chosen time every
// day even if the phone has no internet connection and the app is fully
// closed, because Android/iOS themselves own the schedule, not our app.
const STORAGE_KEY = "studyReminder:settings";
const NOTIFICATION_ID_KEY = "studyReminder:notificationId";

export interface StudyReminderSettings {
  enabled: boolean;
  hour: number; // 0-23
  minute: number; // 0-59
}

const DEFAULT_SETTINGS: StudyReminderSettings = {
  enabled: false,
  hour: 19,
  minute: 0,
};

// As of Expo SDK 53, Expo Go on Android throws
// "[runtime not ready]: Error: expo-notifications: Android Push
// notifications... removed from Expo Go" the moment the module
// initializes - NOT when a specific push function is called, but as a
// side effect of the module's own top-level setup code running during
// `require("expo-notifications")`. This happens purely from importing
// the module on Android in Expo Go, even though this file only ever
// uses LOCAL scheduled notifications and never touches push/remote APIs
// at all.
//
// A static `import * as Notifications from "expo-notifications"` is
// evaluated unconditionally the moment this file loads, which is exactly
// what crashed the whole app on launch. The fix is to make that load
// conditional: only `require()` the module (a lazy, in-place call) when
// we're NOT running inside classic Expo Go, so the crashing top-level
// code never executes there at all. Everything in this file that touches
// `Notifications` guards against it being null.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: typeof ExpoNotifications | null = null;
if (!isExpoGo) {
  // @ts-ignore - `require` is a real global provided by Metro at runtime;
  // this is only ever reached on native, never bundled for a context
  // without it. Using require() (not `import`) here is deliberate - see
  // the comment above.
  Notifications = require("expo-notifications");

  // Notifications must be configured to actually show a banner/alert
  // while the app is in the foreground too - by default Expo swallows
  // them silently in that case, which used to make it look "not
  // working" when tested with the app open.
  if (Notifications) {
    const shouldPresent = createNotificationPresentationGate();
    Notifications.setNotificationHandler({
      handleNotification: async notification => {
        const present = shouldPresent(notification.request.identifier, notification.request.content.data);
        return ({
        shouldShowBanner: present,
        shouldShowList: present,
        shouldPlaySound: present,
        shouldSetBadge: false,
      });
      },
    });
  }
}

// Lets the Study Reminder screen (and anywhere else) show "requires a
// development build" instead of a toggle that silently does nothing -
// this is a genuine Expo Go platform limitation, not something fixable
// from JS, until the app is run from a development build instead.
export function isStudyReminderSupported(): boolean {
  return !isExpoGo;
}

export async function getStudyReminderSettings(): Promise<StudyReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    logError("Failed to read study reminder settings:", err);
    throw err;
  }
}

async function saveSettings(settings: StudyReminderSettings) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

async function requestPermission(): Promise<boolean> {
  if (!Notifications) return false;

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

// Serialize time changes/restoration so two schedules cannot race publication.
let reminderOperation: Promise<unknown> = Promise.resolve();
function serialize<T>(action: () => Promise<T>): Promise<T> {
  const result = reminderOperation.catch(() => {}).then(action);
  reminderOperation = result;
  return result;
}
async function snapshot() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const settings: StudyReminderSettings & { notificationId?: string } = raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
  const id = settings.notificationId ?? await AsyncStorage.getItem(NOTIFICATION_ID_KEY);
  return { settings, id };
}
function schedule(hour: number, minute: number, identifier?: string) {
  if (!Notifications) throw new Error("Reminders unavailable");
  return Notifications.scheduleNotificationAsync({
    ...(identifier ? { identifier } : {}),
    content: {
      title: "📚 Time to study!",
      body: "A few minutes of revision now keeps everything fresh for the exam.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour, minute,
      ...(Platform.OS === "android" ? { channelId: "study-reminders" } : {}),
    },
  });
}

export function enableStudyReminder(
  hour: number, minute: number
): Promise<{ success: boolean; permissionDenied?: boolean; unsupported?: boolean }> {
  return serialize(() => enableReminderNow(hour, minute));
}

async function enableReminderNow(hour: number, minute: number) {
    if (!Notifications) return { success: false, unsupported: true };
    if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59)
      throw new Error("Invalid reminder time");
    if (!await requestPermission()) return { success: false, permissionDenied: true };
    const previous = await snapshot();
    // Schedule first: a rejected new trigger must not cancel the previous reminder.
    const id = await schedule(hour, minute);
    let cancelled = false;
    try {
      if (previous.id) {
        await Notifications.cancelScheduledNotificationAsync(previous.id);
        cancelled = true;
      }
      // Choice + schedule identity share one atomic storage publication.
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: true, hour, minute, notificationId: id }));
    } catch (error) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      if (cancelled && previous.settings.enabled && previous.id)
        await schedule(previous.settings.hour, previous.settings.minute, previous.id).catch(() => {});
      throw error;
    }
    return { success: true };
}

export function disableStudyReminder(): Promise<void> {
  return serialize(async () => {
    const previous = await snapshot();
    if (previous.id && Notifications) await Notifications.cancelScheduledNotificationAsync(previous.id);
    try {
      await saveSettings({ ...previous.settings, enabled: false });
    } catch (error) {
      if (previous.settings.enabled && previous.id && Notifications)
        await schedule(previous.settings.hour, previous.settings.minute, previous.id).catch(() => {});
      throw error;
    }
  });
}

// Called once on app launch. If the reminder was left "on" from a
// previous session, this re-schedules it - the actual daily trigger is
// owned by the OS and survives app restarts on its own, but re-applying
// it here is a cheap safety net against the rare cases (mainly Android
// after a device reboot) where the OS drops it.
export function restoreStudyReminderOnLaunch(): Promise<void> {
  return serialize(async () => {
    if (!Notifications) return;
    const { settings, id: existingId } = await snapshot();
    if (!settings.enabled) return;
    if (existingId) {
      const stillScheduled = (await Notifications.getAllScheduledNotificationsAsync())
        .some(n => n.identifier === existingId);
      if (stillScheduled) return;
    }
    await enableReminderNow(settings.hour, settings.minute);
  });
}

// Android requires a notification channel to be created before a
// notification can be shown on it (Android 8+).
export async function setupNotificationChannel() {
  if (Platform.OS !== "android" || !Notifications) return;

  await Notifications.setNotificationChannelAsync("study-reminders", {
    name: "Study Reminders",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
  });
}

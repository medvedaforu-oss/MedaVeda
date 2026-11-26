import { captureStorageOwner, isStorageOwnerCurrent, readOwnedList, updateOwnedList } from "../utils/ownerStorage";

import { supabase } from "../config/supabase";
import { getNotificationPreferences } from "../utils/notificationPreferences";
import { logDebug } from "../utils/logger";
import { getCurrentUser } from "./authState";

export type NotificationType =
  | "new_notes"
  | "new_video"
  | "offer"
  | "payment_success"
  | "exam_reminder"
  | "app_update";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type?: NotificationType;
  createdAt?: number;
}

// The Home section and its mount/focus unread badges ask for the same rows.
// Share only an outstanding server read for the same account. Preferences,
// read IDs and archived IDs stay per-call, and nothing is cached after settlement.
// Stop sharing after one second even if a read stalls, so retries remain usable.
const pendingNotifications = new Map<string, Promise<any[]>>();

function readNotificationRows(): Promise<any[]> {
  const account = getCurrentUser()?.id ?? "anonymous";
  const pending = pendingNotifications.get(account);
  if (pending) return pending;
  const request = (async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  })().finally(() => {
    clearTimeout(expiry);
    if (pendingNotifications.get(account) === request) pendingNotifications.delete(account);
  });
  const expiry = setTimeout(() => {
    if (pendingNotifications.get(account) === request) pendingNotifications.delete(account);
  }, 1000);
  pendingNotifications.set(account, request);
  return request;
}

// Reads the "notifications" table (rows with { title, body, active,
// created_at }) if the admin panel has created any. Fails soft - the
// Notifications section on the dashboard should never block the rest of
// the screen from loading.
export async function fetchNotifications(options: { strict?: boolean } = {}): Promise<AppNotification[]> {
  try {
    const data = await readNotificationRows();

    const all = (data ?? []).map((row: any) => ({
      id: row.id,
      title: row.title ?? "Update",
      body: row.body ?? "",
      type: row.type as NotificationType | undefined,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : undefined,
    }));

    // NOTIFICATIONS SYSTEM - respect per-category mute preferences. A
    // student who turned off "Offers" should never see them here, in
    // the unread count, or the bell badge.
    const preferences = await getNotificationPreferences();
    return all.filter(item => !item.type || preferences[item.type] !== false);
  } catch (error) {
    if (options.strict) throw error;
    logDebug("fetchNotifications: no notifications available yet", error);
    return [];
  }
}

// Read/archive state is local to the authenticated owner on this device.
const READ_IDS_KEY = "medveda:notifications:readIds";
// NOTIFICATIONS SYSTEM - archived (swiped away) notifications, also
// local-only. Archived items are permanently hidden from this owner's
// Notification Center, same mental model as archiving an email.
const ARCHIVED_IDS_KEY = "medveda:notifications:archivedIds";

async function getArchivedIds(owner: ReturnType<typeof captureStorageOwner>): Promise<Set<string>> {
  try {
    return new Set(await readOwnedList<string>(ARCHIVED_IDS_KEY, owner));
  } catch {
    return new Set();
  }
}

export async function archiveNotification(id: string): Promise<void> {
  await updateOwnedList<string>(ARCHIVED_IDS_KEY, items => [...new Set([...items, id])]);
}

async function getReadIds(owner: ReturnType<typeof captureStorageOwner>): Promise<Set<string>> {
  try {
    return new Set(await readOwnedList<string>(READ_IDS_KEY, owner));
  } catch (error) {
    logDebug("getReadIds failed:", error);
    return new Set();
  }
}

export async function fetchNotificationsWithReadState(options: { strict?: boolean } = {}): Promise<{
  notifications: (AppNotification & { read: boolean })[];
}> {
  const owner = captureStorageOwner();
  const [notifications, readIds, archivedIds] = await Promise.all([
    fetchNotifications(options),
    getReadIds(owner),
    getArchivedIds(owner),
  ]);

  if (!isStorageOwnerCurrent(owner)) return { notifications: [] };

  return {
    notifications: notifications
      .filter((item) => !archivedIds.has(item.id))
      .map((item) => ({
        ...item,
        read: readIds.has(item.id),
      })),
  };
}

export async function markAllNotificationsRead(ids: string[]): Promise<void> {
  await updateOwnedList<string>(READ_IDS_KEY, items => [...new Set([...items, ...ids])]);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { notifications } = await fetchNotificationsWithReadState();
  return notifications.filter((item) => !item.read).length;
}

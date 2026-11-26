import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuthEpoch, getCurrentUser } from "../services/authState";

const STORAGE_KEY = "medveda:streak";
export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}
export const EMPTY_STREAK: StreakData = { currentStreak: 0, longestStreak: 0, lastActiveDate: null };
function ownerSnapshot() { return { id: getCurrentUser()?.id, epoch: getAuthEpoch() }; }
function current(owner: ReturnType<typeof ownerSnapshot>) {
  return !!owner.id && owner.id === getCurrentUser()?.id && owner.epoch === getAuthEpoch();
}
function key(owner: ReturnType<typeof ownerSnapshot>) { return `${STORAGE_KEY}:owner:${encodeURIComponent(owner.id!)}`; }
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function parse(raw: string | null): StreakData | null {
  if (!raw) return null;
  const value = JSON.parse(raw);
  if (!value || !Number.isSafeInteger(value.currentStreak) || value.currentStreak < 0 ||
      !Number.isSafeInteger(value.longestStreak) || value.longestStreak < value.currentStreak ||
      (value.lastActiveDate !== null && (typeof value.lastActiveDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.lastActiveDate)))) return null;
  return { currentStreak: value.currentStreak, longestStreak: value.longestStreak, lastActiveDate: value.lastActiveDate };
}
async function read(owner: ReturnType<typeof ownerSnapshot>): Promise<StreakData> {
  if (!current(owner)) return { ...EMPTY_STREAK };
  const raw = await AsyncStorage.getItem(key(owner));
  if (!current(owner)) return { ...EMPTY_STREAK };
  if (raw) return parse(raw) ?? { ...EMPTY_STREAK };
  // Only an explicit owner binding can establish legacy ownership. Unowned
  // global data remains quarantined rather than being assigned to a new user.
  const legacy = await AsyncStorage.getItem(STORAGE_KEY);
  if (!current(owner) || !legacy) return { ...EMPTY_STREAK };
  const value = JSON.parse(legacy);
  return value?.ownerId === owner.id ? parse(legacy) ?? { ...EMPTY_STREAK } : { ...EMPTY_STREAK };
}
const writes = new Map<string, Promise<StreakData>>();
/** Serialize activity for each captured owner; publish only after persistence. */
export function recordActivityToday(): Promise<StreakData> {
  const owner = ownerSnapshot();
  if (!current(owner)) return Promise.resolve({ ...EMPTY_STREAK });
  const storageKey = key(owner);
  const pending = (writes.get(storageKey) ?? Promise.resolve()).catch(() => {}).then(async () => {
    const existing = await read(owner);
    if (!current(owner)) return { ...EMPTY_STREAK };
    const today = new Date(), yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate()-1);
    if (existing.lastActiveDate === dayKey(today)) return existing;
    const count = existing.lastActiveDate === dayKey(yesterday) ? existing.currentStreak+1 : 1;
    const updated = { currentStreak: count, longestStreak: Math.max(count,existing.longestStreak), lastActiveDate: dayKey(today) };
    await AsyncStorage.setItem(storageKey,JSON.stringify(updated));
    return current(owner) ? updated : { ...EMPTY_STREAK };
  });
  writes.set(storageKey,pending);
  void pending.finally(() => { if (writes.get(storageKey) === pending) writes.delete(storageKey); }).catch(() => {});
  return pending;
}
export function getStreak(): Promise<StreakData> { return read(ownerSnapshot()); }

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuthEpoch, getCurrentUser } from "../services/authState";

export function captureStorageOwner() {
  return { id: getCurrentUser()?.id, epoch: getAuthEpoch() };
}
type Owner = ReturnType<typeof captureStorageOwner>;
export function isStorageOwnerCurrent(owner: Owner): boolean {
  return !!owner.id && owner.id === getCurrentUser()?.id && owner.epoch === getAuthEpoch();
}
function ownedKey(key: string, owner: Owner): string {
  return `${key}:owner:${encodeURIComponent(owner.id!)}`;
}

// Unowned legacy keys cannot be attributed safely. Leave them quarantined:
// never read, migrate into an account, or purge unrelated offline content.
export async function readOwnedList<T>(key: string, owner = captureStorageOwner()): Promise<T[]> {
  if (!isStorageOwnerCurrent(owner)) return [];
  const raw = await AsyncStorage.getItem(ownedKey(key, owner));
  if (!isStorageOwnerCurrent(owner) || !raw) return [];
  const value: unknown = JSON.parse(raw);
  return Array.isArray(value) ? value : [];
}

const writes = new Map<string, Promise<void>>();
export function updateOwnedList<T>(key: string, update: (items: T[]) => T[]): Promise<void> {
  const owner = captureStorageOwner();
  if (!isStorageOwnerCurrent(owner)) return Promise.resolve();
  const scopedKey = ownedKey(key, owner);
  const request = (writes.get(scopedKey) ?? Promise.resolve()).catch(() => {}).then(async () => {
    if (!isStorageOwnerCurrent(owner)) return;
    const items = await readOwnedList<T>(key, owner);
    if (!isStorageOwnerCurrent(owner)) return;
    await AsyncStorage.setItem(scopedKey, JSON.stringify(update(items)));
  }).finally(() => { if (writes.get(scopedKey) === request) writes.delete(scopedKey); });
  writes.set(scopedKey, request);
  return request;
}

import { readOwnedList, updateOwnedList } from "./ownerStorage";
import { logDebug } from "./logger";

// Global Search System - recent search terms, local to the signed-in owner.
// Same model as utils/recentActivity.ts (no backend table, nothing to sync) -
// there's no student-facing reason this needs to survive a reinstall or
// show up on a second device.

const STORAGE_KEY = "medveda:recentSearches";
const MAX_ENTRIES = 12;

export interface RecentSearchEntry {
  query: string;
  searchedAt: number; // epoch ms
}

export async function getRecentSearches(): Promise<RecentSearchEntry[]> {
  try {
    return await readOwnedList<RecentSearchEntry>(STORAGE_KEY);
  } catch (error) {
    logDebug("getRecentSearches failed:", error);
    return [];
  }
}

export async function recordSearch(query: string): Promise<void> {
  const trimmed = query.trim();
  // Don't log every keystroke - only worth remembering once it looks
  // like an actual search term, same threshold the subsequence matcher
  // uses to start considering fuzzy hits.
  if (trimmed.length < 2) return;

  try {
    await updateOwnedList<RecentSearchEntry>(STORAGE_KEY, (existing) => {
      const withoutDuplicate = existing.filter(
        (entry) => entry.query.toLowerCase() !== trimmed.toLowerCase()
      );

      const updated: RecentSearchEntry[] = [
        { query: trimmed, searchedAt: Date.now() },
        ...withoutDuplicate,
      ].slice(0, MAX_ENTRIES);

      return updated;
    });
  } catch (error) {
    logDebug("recordSearch failed:", error);
  }
}

export async function removeRecentSearch(query: string): Promise<void> {
  try {
    await updateOwnedList<RecentSearchEntry>(STORAGE_KEY, existing => existing.filter(entry => entry.query !== query));
  } catch (error) {
    logDebug("removeRecentSearch failed:", error);
  }
}

export async function clearRecentSearches(): Promise<void> {
  try {
    await updateOwnedList(STORAGE_KEY, () => []);
  } catch (error) {
    logDebug("clearRecentSearches failed:", error);
  }
}

import { readOwnedList, updateOwnedList } from "./ownerStorage";
import { logDebug } from "./logger";

// Lightweight local (on-device) activity log used purely to power the
// "Continue Learning" and "Recently Viewed" dashboard sections. This is
// intentionally local to the authenticated owner, no backend
// changes needed, and costs nothing to read/write.
//
// NOTE: requires `@react-native-async-storage/async-storage`.
// If it isn't installed yet, run:
//   npx expo install @react-native-async-storage/async-storage

const STORAGE_KEY = "medveda:recentChapters";
const MAX_ENTRIES = 10;

export interface RecentChapterEntry {
  chapterId: string;
  chapterTitle: string;
  subjectId: string;
  subjectTitle: string;
  yearId: string;
  yearTitle: string;
  // Missing on entries recorded before multi-course support (those were
  // all BAMS) - treated as belonging to whichever course is current.
  courseId?: string;
  viewedAt: number; // epoch ms
}

export async function recordChapterView(
  entry: Omit<RecentChapterEntry, "viewedAt">
): Promise<void> {
  try {
    await updateOwnedList<RecentChapterEntry>(STORAGE_KEY, (existing) => {
      const withoutDuplicate = existing.filter(
        (item) => item.chapterId !== entry.chapterId
      );

      const updated: RecentChapterEntry[] = [
        { ...entry, viewedAt: Date.now() },
        ...withoutDuplicate,
      ].slice(0, MAX_ENTRIES);

      return updated;
    });
  } catch (error) {
    // Non-critical - never let activity tracking break navigation.
    logDebug("recordChapterView failed:", error);
  }
}

// courseId (when given) hides entries recorded under a different course.
export async function getRecentChapters(courseId?: string): Promise<RecentChapterEntry[]> {
  try {
    const parsed = await readOwnedList<RecentChapterEntry>(STORAGE_KEY);
    return courseId
      ? parsed.filter((e: RecentChapterEntry) => !e.courseId || e.courseId === courseId)
      : parsed;
  } catch (error) {
    logDebug("getRecentChapters failed:", error);
    return [];
  }
}

// Most recent entry, used for the single "Continue Learning" hero card.
export async function getLastViewedChapter(courseId?: string): Promise<RecentChapterEntry | null> {
  const list = await getRecentChapters(courseId);
  return list[0] ?? null;
}

export async function clearRecentChapters(): Promise<void> {
  try {
    await updateOwnedList(STORAGE_KEY, () => []);
  } catch (error) {
    logDebug("clearRecentChapters failed:", error);
  }
}

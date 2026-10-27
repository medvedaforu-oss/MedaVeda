import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";

import * as downloadManager from "../utils/downloadManager";
import { getCourseYear } from "../services/courseState";
import { DownloadItem, DownloadRequest, StorageStats } from "../types/offline";
import { logError } from "../utils/logger";

/**
 * OFFLINE MODE - replaces the old notes-only useDownloads. Backs onto
 * SQLite via downloadManager, supports notes + quizzes, and exposes
 * pause/resume/retry/cancel for a real download-manager UX.
 */
export default function useDownloads() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StorageStats>({
    totalBytes: 0,
    noteBytes: 0,
    quizBytes: 0,
    totalItems: 0,
    completedItems: 0,
    failedItems: 0,
  });

  const refresh = useCallback(() => {
    try {
      setDownloads(downloadManager.getAllDownloads(getCourseYear().courseId));
      setStats(downloadManager.getStorageStats());
    } catch (err) {
      logError("Failed to load downloads:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Live progress: any download event anywhere in the app refreshes
    // this list, so DownloadsScreen and a note card's inline progress
    // ring stay perfectly in sync without polling.
    const unsubscribe = downloadManager.subscribeToDownloadEvents(() => refresh());
    return unsubscribe;
  }, [refresh]);

  async function start(request: DownloadRequest) {
    try {
      await downloadManager.enqueueDownload(request);
    } catch (err: any) {
      Alert.alert("Download Failed", err?.message || "Could not download this item.");
    }
  }

  async function saveQuiz(params: {
    id: string;
    title: string;
    subjectId: string;
    subjectTitle: string;
    yearId: string;
    yearTitle: string;
    quizData: unknown;
  }) {
    try {
      await downloadManager.saveQuizForOffline(params);
    } catch (err: any) {
      Alert.alert("Download Failed", err?.message || "Could not save this quiz for offline use.");
    }
  }

  async function runAction(action: () => Promise<void>): Promise<void> {
    try {
      await action();
      refresh();
    } catch {
      Alert.alert("Download action unavailable", "Check available storage and try again. The action could not be completed.");
    }
  }
  const pause = (id: string) => runAction(() => downloadManager.pauseDownload(id));
  const resume = (id: string) => runAction(() => downloadManager.resumeDownload(id));
  const retry = (id: string) => runAction(() => downloadManager.retryDownload(id));
  const cancel = (id: string) => runAction(() => downloadManager.cancelDownload(id));
  const remove = (id: string) => runAction(() => downloadManager.removeDownload(id));
  const clearAll = () => runAction(() => downloadManager.clearAllDownloads());

  function getItem(id: string): DownloadItem | null {
    return downloads.find((d) => d.id === id) ?? null;
  }

  function isDownloaded(id: string): boolean {
    return getItem(id)?.status === "completed";
  }

  return {
    downloads,
    stats,
    loading,
    start,
    saveQuiz,
    pause,
    resume,
    retry,
    cancel,
    remove,
    clearAll,
    getItem,
    isDownloaded,
    refresh,
  };
}

import useRequestGuard from "./useRequestGuard";
import { useCallback, useEffect, useState } from "react";
import type { ContentFilters } from "../types/filters";

import {
  addChapter,
  deleteChapter,
  getChapters,
  updateChapter,
} from "../services/chapterService";

import type { Chapter, ChapterInput } from "../types/chapter";

export default function useChapters(filters: ContentFilters = {}) {
  const { courseId, yearId } = filters;
  const beginRequest = useRequestGuard(JSON.stringify([courseId, yearId]));
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadChapters = useCallback(async (afterMutation = false) => {
    const current = beginRequest();
    if (!current()) return;
    try {
      setLoading(true);
      const data = await getChapters({ courseId, yearId });
      if (!current()) return;
      setChapters(data);
      setError(null);
    } catch (err) {
      if (!current()) return;
      console.error(err);
      setError(afterMutation ? "Saved, but the list could not refresh. Please retry." : "Could not load chapters. Please try again.");
    } finally {
      if (current()) setLoading(false);
    }
  }, [courseId, yearId, beginRequest]);

  useEffect(() => {
    void loadChapters();
  }, [loadChapters]);

  async function createChapter(data: ChapterInput) {
    await addChapter(data);
    await loadChapters(true);
  }

  async function editChapter(id: string, data: ChapterInput) {
    await updateChapter(id, data);
    await loadChapters(true);
  }

  async function removeChapter(id: string) {
    await deleteChapter(id);
    await loadChapters(true);
  }

  return {
    chapters,
    loading,
    error,
    reload: loadChapters,
    createChapter,
    editChapter,
    removeChapter,
  };
}

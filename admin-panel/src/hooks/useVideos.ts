import useRequestGuard from "./useRequestGuard";
import { useCallback, useEffect, useState } from "react";
import type { ContentFilters } from "../types/filters";

import {
  addVideo,
  deleteVideo,
  getVideos,
  updateVideo,
} from "../services/videoService";

import type { Video, VideoInput } from "../types/video";

export default function useVideos(filters: ContentFilters = {}) {
  const { courseId, yearId } = filters;
  const beginRequest = useRequestGuard(JSON.stringify([courseId, yearId]));
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVideos = useCallback(async () => {
    const current = beginRequest();
    if (!current()) return;
    try {
      setLoading(true);
      const data = await getVideos({ courseId, yearId });
      if (!current()) return;
      setVideos(data);
      setError(null);
    } catch (err) {
      if (!current()) return;
      console.error(err);
      setError("Could not load videos. Please try again.");
    } finally {
      if (current()) setLoading(false);
    }
  }, [courseId, yearId, beginRequest]);

  useEffect(() => {
    void loadVideos();
  }, [loadVideos]);

  async function createVideo(data: VideoInput) {
    await addVideo(data);
    await refreshAfterMutation();
  }

  async function editVideo(id: string, data: VideoInput) {
    await updateVideo(id, data);
    await refreshAfterMutation();
  }

  async function removeVideo(id: string) {
    await deleteVideo(id);
    await refreshAfterMutation();
  }

  async function refreshAfterMutation() {
    const current = beginRequest();
    if (!current()) return;
    try {
      const data = await getVideos(filters);
      if (!current()) return;
      setVideos(data);
      setError(null);
    } catch {
      if (!current()) return;
      setError("The video change succeeded, but the list could not refresh. Reload this page before retrying.");
    }
  }

  return {
    videos,
    loading,
    error,
    reload: refreshAfterMutation,
    createVideo,
    editVideo,
    removeVideo,
  };
}

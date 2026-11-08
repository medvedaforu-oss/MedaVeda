import useRequestGuard from "./useRequestGuard";
import { useCallback, useEffect, useState } from "react";
import type { ContentFilters } from "../types/filters";

import {
  addYear,
  deleteYear,
  getYears,
  updateYear,
} from "../services/yearService";

import type { Year, YearInput } from "../types/year";

export default function useYears(filters: ContentFilters = {}) {
  const { courseId, yearId } = filters;
  const beginRequest = useRequestGuard(JSON.stringify([courseId, yearId]));
  const [years, setYears] = useState<Year[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadYears = useCallback(async (afterMutation = false) => {
    const current = beginRequest();
    if (!current()) return;
    try {
      setLoading(true);
      const data = await getYears({ courseId, yearId });
      if (!current()) return;
      setYears(data);
      setError(null);
    } catch (err) {
      if (!current()) return;
      console.error(err);
      setError(afterMutation ? "Saved, but the list could not refresh. Please retry." : "Could not load years. Please try again.");
    } finally {
      if (current()) setLoading(false);
    }
  }, [courseId, yearId, beginRequest]);

  useEffect(() => {
    void loadYears();
  }, [loadYears]);

  async function createYear(data: YearInput) {
    await addYear(data);
    await loadYears(true);
  }

  async function editYear(id: string, data: YearInput) {
    await updateYear(id, data);
    await loadYears(true);
  }

  async function removeYear(id: string) {
    await deleteYear(id);
    await loadYears(true);
  }

  return {
    years,
    loading,
    error,
    reload: loadYears,
    createYear,
    editYear,
    removeYear,
  };
}

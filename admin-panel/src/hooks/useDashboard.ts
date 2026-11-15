import { useCallback, useEffect, useState } from "react";
import type { ContentFilters } from "../types/filters";

import { dashboardStatKeys, getDashboardStats, type DashboardErrors, type DashboardStats } from "../services/dashboardService";
import useRequestGuard from "./useRequestGuard";

export default function useDashboard(filters: ContentFilters = {}) {
  const { courseId, yearId } = filters;
  const beginRequest = useRequestGuard(JSON.stringify([courseId, yearId]));
  const [errors, setErrors] = useState<DashboardErrors>({});
  const [stats, setStats] = useState<DashboardStats>({
    courses: 0,
    years: 0,
    subjects: 0,
    products: 0,
    users: 0,
    notes: 0,
    videos: 0,
    quiz: 0,
  });

  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const current = beginRequest();
    if (!current()) return;
    try {
      setLoading(true);
      const data = await getDashboardStats({ courseId, yearId });
      if (!current()) return;
      setStats(data.stats);
      setErrors(data.errors);
    } catch (err) {
      if (!current()) return;
      console.error("Could not load dashboard stats:", err);
      setErrors(Object.fromEntries(dashboardStatKeys.map((key) => [key, "Could not load this count."])));
    } finally {
      if (current()) setLoading(false);
    }
  }, [courseId, yearId, beginRequest]);

  useEffect(() => {
    void load();
  }, [load]);

  return { stats, errors, loading, reload: load };
}

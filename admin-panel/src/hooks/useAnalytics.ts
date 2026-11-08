import useRequestGuard from "./useRequestGuard";
import { useCallback, useEffect, useState } from "react";
import type { ContentFilters } from "../types/filters";

import { getAnalytics, type AnalyticsData } from "../services/analyticsService";

const emptyData: AnalyticsData = {
  totalRevenue: 0,
  totalOrders: 0,
  paidOrders: 0,
  pendingOrders: 0,
  failedOrders: 0,
  refundedOrders: 0,
  totalUsers: 0,
  totalProducts: 0,
  topProducts: [],
};

export default function useAnalytics(filters: ContentFilters = {}) {
  const { courseId, yearId } = filters;
  const beginRequest = useRequestGuard(JSON.stringify([courseId, yearId]));
  const [data, setData] = useState<AnalyticsData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const current = beginRequest();
    if (!current()) return;
    try {
      setLoading(true);
      const result = await getAnalytics({ courseId, yearId });
      if (!current()) return;
      setData(result);
      setError(null);
    } catch (err) {
      if (!current()) return;
      console.error(err);
      setError("Could not load analytics. Please try again.");
    } finally {
      if (current()) setLoading(false);
    }
  }, [courseId, yearId, beginRequest]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}

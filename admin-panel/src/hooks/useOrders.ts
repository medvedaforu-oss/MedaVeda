import useRequestGuard from "./useRequestGuard";
import { useCallback, useEffect, useState } from "react";
import type { ContentFilters } from "../types/filters";

import { getOrders, updateOrderStatus } from "../services/orderService";

import type { Order, OrderStatus } from "../types/order";

export default function useOrders(filters: ContentFilters = {}) {
  const { courseId, yearId } = filters;
  const beginRequest = useRequestGuard(JSON.stringify([courseId, yearId]));
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    const current = beginRequest();
    if (!current()) return;
    try {
      setLoading(true);
      const data = await getOrders({ courseId, yearId });
      if (!current()) return;
      setOrders(data);
      setError(null);
    } catch (err) {
      if (!current()) return;
      console.error(err);
      setError("Could not load orders. Please try again.");
    } finally {
      if (current()) setLoading(false);
    }
  }, [courseId, yearId, beginRequest]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  async function changeStatus(id: string, status: OrderStatus) {
    await updateOrderStatus(id, status);
    await loadOrders();
  }

  return {
    orders,
    loading,
    error,
    reload: loadOrders,
    changeStatus,
  };
}

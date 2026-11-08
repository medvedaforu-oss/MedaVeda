import useRequestGuard from "./useRequestGuard";
import { useCallback, useEffect, useState } from "react";
import type { ContentFilters } from "../types/filters";

import { getOrders, updateOrderStatus } from "../services/orderService";

import type { Order, OrderStatus } from "../types/order";

export default function useOrders(filters: ContentFilters = {}) {
  const { courseId, yearId } = filters;
  const scope = JSON.stringify([courseId, yearId]);
  const beginRequest = useRequestGuard(scope);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readState, setReadState] = useState({ scope, hasLoaded: false });

  const loadOrders = useCallback(async () => {
    const current = beginRequest();
    if (!current()) return;
    try {
      setLoading(true);
      const data = await getOrders({ courseId, yearId });
      if (!current()) return;
      setOrders(data);
      setReadState({ scope, hasLoaded: true });
      setError(null);
    } catch (err) {
      if (!current()) return;
      setReadState((previous) => ({ scope, hasLoaded: previous.scope === scope && previous.hasLoaded }));
      console.error(err);
      setError("Could not load orders. Please try again.");
    } finally {
      if (current()) setLoading(false);
    }
  }, [courseId, yearId, scope, beginRequest]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  async function changeStatus(id: string, status: OrderStatus) {
    await updateOrderStatus(id, status);
    await loadOrders();
  }

  const hasLoaded = readState.scope === scope && readState.hasLoaded;
  return {
    orders: hasLoaded ? orders : [],
    hasLoaded,
    loading: loading || readState.scope !== scope,
    error: readState.scope === scope ? error : null,
    reload: loadOrders,
    changeStatus,
  };
}

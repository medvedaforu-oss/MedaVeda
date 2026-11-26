import { useCallback, useEffect, useState } from "react";
import { getOrders } from "../services/orderService";
import useRequestGuard from "../hooks/useRequestGuard";
import { findOrderReference } from "../utils/orderReference";

export default function ReviewFlagOrderLookup({ reference }: { reference: string }) {
  const [order, setOrder] = useState<ReturnType<typeof findOrderReference> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const beginRequest = useRequestGuard(reference);
  const load = useCallback(async () => {
    const current = beginRequest();
    setLoading(true); setError(null); setOrder(null);
    try {
      // This reader preserves existing authorization, MFA and pagination. Read
      // across list filters so a flagged order is not hidden by another course.
      const rows = await getOrders();
      if (current()) setOrder(findOrderReference(rows, reference, "internal") ?? null);
    } catch (failure) {
      if (!current()) return;
      const status = (failure as { status?: number; code?: string })?.status;
      const code = (failure as { code?: string })?.code;
      setError(status === 401 || status === 403 || code === "42501"
        ? "Order access denied. Sign in with an authorized Admin account and complete any required MFA."
        : "Could not retrieve this order. Please retry.");
    } finally { if (current()) setLoading(false); }
  }, [beginRequest, reference]);
  useEffect(() => { void load(); }, [load]);
  if (loading) return <p role="status">Loading order...</p>;
  if (error) return <div role="alert"><p>{error}</p><button type="button" onClick={() => void load()}>Retry</button></div>;
  if (!order) return <p role="status">No accessible order was found for this internal reference.</p>;
  return <dl className="space-y-2 break-words text-sm">
    <dt className="font-medium">Internal order reference</dt><dd>{order.id}</dd>
    <dt className="font-medium">Provider order reference</dt><dd>{order.razorpayOrderId ?? order.playOrderId ?? "Unavailable"}</dd>
    <dt className="font-medium">Provider payment reference</dt><dd>{order.paymentId ?? "Unavailable"}</dd>
    <dt className="font-medium">Product</dt><dd>{order.productTitle}</dd>
    <dt className="font-medium">Student</dt><dd>{order.userName} {order.userEmail}</dd>
    <dt className="font-medium">Status</dt><dd>{order.status}</dd>
  </dl>;
}

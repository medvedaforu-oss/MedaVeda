import type { Order } from "../types/order";
type ReferencedOrder = Order & { razorpayOrderId?: string; playOrderId?: string };

/** Exact matching only within rows returned by the existing authorized reader. */
export function findOrderReference(
  orders: ReferencedOrder[], reference: string, kind: "internal" | "provider",
): ReferencedOrder | undefined {
  const value = reference.trim();
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(value)) return undefined;
  return orders.find(order => kind === "internal" ? order.id === value :
    [order.razorpayOrderId, order.playOrderId, order.paymentId].includes(value));
}

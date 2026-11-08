import { Order, OrderStatus } from "../types/order";

export type { Order, OrderStatus } from "../types/order";

// Orders are created by the create-order Edge Function and settled by the
// payment system only; clients have no write access to `orders`. Kept as a
// no-op so existing call sites (e.g. PaymentCheckoutScreen) need no change - an
// abandoned order simply stays "created".
export async function markOrderStatus(
  _orderId: string,
  _status: OrderStatus,
  _extra?: Partial<Pick<Order, "razorpayOrderId" | "razorpayPaymentId">>
): Promise<void> {}

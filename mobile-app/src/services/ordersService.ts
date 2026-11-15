import { Order, OrderStatus } from "../types/order";
import { isNonplayTestBuild } from "../config/paymentProvider";

export type { Order, OrderStatus } from "../types/order";

// Orders are created by the create-order Edge Function and settled by the
// payment system only; clients have no write access to `orders`. Kept as a
// no-op for the existing payment flow. The isolated APK can record an advisory
// checkout hint in test tables; it cannot alter a live order or a captured grant.
export async function markOrderStatus(
  _orderId: string,
  _status: OrderStatus,
  _extra?: Partial<Pick<Order, "razorpayOrderId" | "razorpayPaymentId">>
): Promise<void> {
  if (isNonplayTestBuild && (_status === "failed" || _status === "cancelled")) {
    await (await import("./nonplayTestService")).testCheckoutState(_orderId,_status);
  }
}

import {
  fetchPayment,
  fetchRazorpayOrder,
  fetchRefund,
  getRazorpayKeyId,
  type RazorpayRefund,
} from "./razorpay.ts";

export type Compensation = {
  payment_id: string;
  razorpay_order_id: string;
  amount_paise: number;
  refund_request_id: string;
  provider_refund_id: string | null;
  not_before: string;
};
type MarkedRefund = RazorpayRefund & { notes?: Record<string, string> };

// Dedicated recovery path: the existing checkout/refund/reporting helpers stay unchanged.
// A durable database fence permits at most ONE provider POST for this compensation.
// A lost response or crash after fencing can only reconcile, never silently repost.
export async function recoverCompensationRefund(
  item: Compensation,
  authorizeDispatch: () => Promise<boolean>,
): Promise<RazorpayRefund> {
  if (
    !/^pay_[a-zA-Z0-9]+$/.test(item.payment_id) ||
    !/^order_[a-zA-Z0-9]+$/.test(item.razorpay_order_id) ||
    !Number.isSafeInteger(item.amount_paise) || item.amount_paise <= 0 ||
    !item.refund_request_id
  ) {
    throw new Error("Invalid compensation identity");
  }
  const payment = await fetchPayment(item.payment_id);
  if (
    !Number.isFinite(Date.parse(item.not_before)) ||
    !Number.isSafeInteger(payment.created_at) ||
    (payment.created_at ?? 0) * 1000 < Date.parse(item.not_before)
  ) {
    throw new Error(
      "Historical payment requires separate reconciliation approval",
    );
  }
  const order = await fetchRazorpayOrder(item.razorpay_order_id);
  if (
    payment.id !== item.payment_id ||
    payment.order_id !== item.razorpay_order_id ||
    payment.amount !== item.amount_paise || payment.currency !== "INR" ||
    order.id !== item.razorpay_order_id || order.amount !== item.amount_paise ||
    order.currency !== "INR"
  ) {
    throw new Error("Compensation provider ownership mismatch");
  }
  const verify = (refund: RazorpayRefund) => {
    if (
      !/^rfnd_[a-zA-Z0-9]+$/.test(refund.id) ||
      refund.payment_id !== item.payment_id ||
      refund.amount !== item.amount_paise || refund.currency !== "INR" ||
      refund.status !== "processed" ||
      !Number.isSafeInteger(refund.created_at) || refund.created_at <= 0
    ) {
      throw new Error("Compensation refund requires reconciliation");
    }
    return refund;
  };
  if (item.provider_refund_id) {
    return verify(await fetchRefund(item.provider_refund_id));
  }
  const keyId = getRazorpayKeyId();
  const authorization = "Basic " +
    btoa(`${keyId}:${Deno.env.get("RAZORPAY_KEY_SECRET")}`);
  let exhausted = false;
  for (let skip = 0; skip < 300; skip += 100) {
    const response = await fetch(
      `https://api.razorpay.com/v1/payments/${
        encodeURIComponent(item.payment_id)
      }/refunds?count=100&skip=${skip}`,
      {
        signal: AbortSignal.timeout(15_000),
        headers: { Authorization: authorization },
      },
    );
    if (!response.ok) {
      throw new Error("Compensation reconciliation unavailable");
    }
    const page = await response.json() as { items?: MarkedRefund[] };
    if (!Array.isArray(page.items) || page.items.length > 100) {
      throw new Error("Invalid refund reconciliation page");
    }
    const matches = page.items.filter((refund) =>
      refund.notes?.medveda_refund_request_id === item.refund_request_id
    );
    if (matches.length > 1) {
      throw new Error("Duplicate compensation markers require review");
    }
    if (matches.length === 1) return verify(matches[0]);
    if (page.items.length < 100) {
      exhausted = true;
      break;
    }
  }
  if (!exhausted) {
    throw new Error("Refund history truncated; manual reconciliation required");
  }
  if (
    payment.status !== "captured" || (payment.amount_refunded ?? 0) !== 0 ||
    payment.refund_status
  ) {
    throw new Error("Payment not eligible for full compensation");
  }
  if (!await authorizeDispatch()) {
    throw new Error("Dispatch fenced; reconciliation only");
  }
  const response = await fetch(
    `https://api.razorpay.com/v1/payments/${
      encodeURIComponent(item.payment_id)
    }/refund`,
    {
      signal: AbortSignal.timeout(15_000),
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: item.amount_paise,
        notes: { medveda_refund_request_id: item.refund_request_id },
      }),
    },
  );
  if (!response.ok) {
    throw new Error("Compensation dispatch requires reconciliation");
  }
  return verify(await response.json() as RazorpayRefund);
}

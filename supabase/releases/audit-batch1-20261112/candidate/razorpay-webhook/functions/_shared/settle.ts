// One settlement path for BOTH verify-payment (client callback / recovery) and
// razorpay-webhook (payment.captured). Nothing here trusts the caller: every
// fact is re-fetched from Razorpay or read from our own database, and the
// grant itself happens inside settle_razorpay_payment() (service_role only,
// row-locked, idempotent on razorpay_payment_id). That one transaction also
// debits the wallet amount stored on the order and creates the referrer's
// pending credit, so a payment that never captures never moves any money in
// the wallet.
import { supabaseAdmin } from "./supabaseAdmin.ts";
import { fetchDispute, fetchPayment, fetchRazorpayOrder } from "./razorpay.ts";

export type SettleResult =
  | { ok: true; orderId: string; amountRupees: number }
  | { ok: false; status: number; reason: string };

export async function settleCapturedPayment(params: {
  eventId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  providerTime?: string | null;
}): Promise<SettleResult> {
  const { eventId, razorpayOrderId, razorpayPaymentId } = params;

  // 1. Verify the provider's payment and order, then record the capture even
  //    when our local order is missing or later entitlement checks refuse it.
  const payment = await fetchPayment(razorpayPaymentId);
  const alreadyRefunded = payment.status === "refunded"
    && (payment.refund_status === "full" || payment.amount_refunded === payment.amount);
  if (payment.status !== "captured" && !alreadyRefunded)
    return { ok: false, status: 409, reason: "payment not captured" };
  if (payment.order_id !== razorpayOrderId) return { ok: false, status: 400, reason: "payment/order mismatch" };
  if (payment.currency !== "INR") return { ok: false, status: 400, reason: "currency mismatch" };
  if (!Number.isSafeInteger(payment.amount) || payment.amount <= 0)
    return { ok: false, status: 400, reason: "invalid provider amount" };
  const rzpOrder = await fetchRazorpayOrder(razorpayOrderId);
  if (rzpOrder.amount !== payment.amount || rzpOrder.currency !== "INR") {
    return { ok: false, status: 400, reason: "razorpay order amount mismatch" };
  }

  // This independent write survives a later entitlement refusal. The provider
  // time comes only from the authenticated payment.captured event envelope.
  const { error: captureError } = await supabaseAdmin.rpc("record_payment_capture", {
    p_payment_id: razorpayPaymentId, p_razorpay_order_id: razorpayOrderId,
    p_amount_paise: payment.amount, p_provider_time: params.providerTime ?? null,
  });
  if (captureError) return { ok: false, status: 500, reason: "capture record failed" };
  if (alreadyRefunded) {
    // Revoke purchases and reverse wallet/referral effects in the SAME transaction
    // as the terminal marker. A marker alone does not protect PDF authorization.
    const { error: reversedError } = await supabaseAdmin.rpc("reverse_refunded_capture", {
      p_payment_id: razorpayPaymentId,
    });
    if (reversedError) return { ok: false, status: 500, reason: "capture reversal record failed" };
  }

  // 2. The local order supplies the immutable product and charged-price
  //    snapshot. A missing or mismatched row cannot be entitled.
  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .select("id, user_id, product_id, amount, status, razorpay_order_id, external_transaction_token")
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle();
  if (orderErr) return { ok: false, status: 500, reason: "order lookup failed" };
  // A successful historical purchase on an unpaid order is contradictory
  // evidence, not permission to replay accounting or queue compensation.
  // Preserve access and require provider evidence plus an approved repair.
  if (order && ["failed", "cancelled"].includes(order.status)) {
    const { data: historicalPurchase, error: historyError } = await supabaseAdmin.from("purchases")
      .select("id").eq("order_id", order.id).eq("status", "success").maybeSingle();
    if (historyError) return { ok: false, status: 503, reason: "purchase history unavailable" };
    if (historicalPurchase)
      return { ok: false, status: 503, reason: "historical payment inconsistency requires manual review" };
  }
  const expectedPaise = order ? Math.round(Number(order.amount) * 100) : null;
  if (!order || expectedPaise !== payment.amount) {
    if (!alreadyRefunded) {
      const { data: disposition, error: compensationError } = await supabaseAdmin.rpc(
        "queue_capture_compensation", { p_payment_id: razorpayPaymentId }
      );
      if (compensationError) return { ok: false, status: 503, reason: "compensation queue failed" };
      if (disposition === "reversed" || disposition === "compensated")
        return { ok: false, status: 409, reason: disposition === "reversed" ? "payment reversed" : "payment already refunded" };
      if (disposition !== "queued") return { ok: false, status: 503, reason: "capture disposition changed; retry settlement" };
    }
    return { ok: false, status: 409, reason: alreadyRefunded
      ? "payment already refunded" : "payment captured; refund queued" };
  }

  // A historical committed purchase may predate capture markers. Check it
  // before replaying settlement: replay must not compensate a legitimate grant
  // merely because its old discount reservation has since expired.
  const commitment = () => supabaseAdmin.rpc("razorpay_entitlement_committed", {
    p_order_id: order.id, p_payment_id: razorpayPaymentId,
  });
  const initialCommitment = await commitment();
  if (initialCommitment.error)
    return { ok: false, status: 503, reason: "entitlement verification unavailable" };
  if (initialCommitment.data !== true) {
    // 4. Atomic, idempotent grant of the product stored on the order row. The
    //    payment's own creation time (from Razorpay, not from the client) lets the
    //    database tell a payment started inside the order's 30-minute life from
    //    one started after it expired; in that case the wallet is not debited and
    //    the order is flagged for admin review (see settle_razorpay_payment).
    const paidAt = Number.isSafeInteger(payment.created_at)
      ? new Date((payment.created_at as number) * 1000).toISOString()
      : null;
    const { error } = await supabaseAdmin.rpc("settle_razorpay_payment", {
      p_event_id: eventId,
      p_razorpay_order_id: razorpayOrderId,
      p_razorpay_payment_id: razorpayPaymentId,
      p_amount_paise: payment.amount,
      p_paid_at: paidAt,
    });
    if (error) {
      console.error("settle: grant failed", { code: error.code });
      return { ok: false, status: 500, reason: "grant failed" };
    }
  }
  // A normal void settlement return includes compensation/reversal outcomes.
  // Only the independent, exact committed-entitlement proof permits success.
  const { data: committed, error: committedError } = await commitment();
  if (committedError)
    return { ok: false, status: 503, reason: "entitlement verification unavailable" };
  if (committed !== true) {
    const { data: capture, error: captureStatusError } = await supabaseAdmin.from("payment_captures")
      .select("status,failure_reason").eq("payment_id", razorpayPaymentId).maybeSingle();
    if (captureStatusError || !capture) return { ok: false, status: 500, reason: "capture status unavailable" };
    if (capture.status === "captured" || capture.status === "reversal_pending")
      return { ok: false, status: 503, reason: "entitlement pending" };
    if (["compensation_pending", "compensated", "reversed"].includes(capture.status)) {
      return { ok: false, status: 409, reason: capture.status === "reversed" ? "payment reversed"
        : capture.status === "compensated" ? "payment already refunded" : "payment captured; refund queued" };
    }
    return { ok: false, status: 503, reason: "entitlement pending" };
  }
  if (initialCommitment.data === true) {
    // The grant was already durable, so settlement was deliberately skipped.
    // Finish the capture marker recorded by this request without overwriting
    // any concurrent compensation/reversal state or changing financial rows.
    const { error: markerError } = await supabaseAdmin.from("payment_captures")
      .update({ status: "granted" }).eq("payment_id", razorpayPaymentId).eq("status", "captured");
    if (markerError) return { ok: false, status: 503, reason: "capture status update failed" };
    // Complete only this authenticated capture delivery's inbox entry; otherwise
    // duplicate webhooks would remain pending despite proven fulfillment.
    const { error: inboxError } = await supabaseAdmin.from("provider_events")
      .update({ status: "applied" }).eq("event_id", eventId).eq("event_type", "payment.captured");
    if (inboxError) return { ok: false, status: 503, reason: "capture inbox update failed" };
  }
  return { ok: true, orderId: order.id, amountRupees: Number(order.amount) };
}

export type RefundResult =
  | { ok: true; outcome: string }
  | { ok: false; status: number; reason: string };

// Closed vocabulary returned by reverse_payment(). Unknown SQL results must
// retain provider retries and durable jobs rather than acknowledge a reversal.
const REVERSAL_RESULTS = new Set([
  "no_referral_credit", "already_cancelled", "credit_cancelled", "already_reversed",
  "referrer_gone", "credit_expired", "credit_reversed",
]);

// refund.processed webhook -> cancel the referrer's still-pending credit.
// The event payload is NOT trusted: we re-fetch the payment from Razorpay and
// only act on a FULL refund (amount_refunded >= amount). handle_payment_refund()
// is idempotent and only cancels a credit that is still inside its hold window.
export async function settleRefund(params: { razorpayPaymentId: string; eventId?: string }): Promise<RefundResult> {
  const payment = await fetchPayment(params.razorpayPaymentId);
  const fullRefund = payment.refund_status === "full"
    || (Number.isSafeInteger(payment.amount_refunded) && (payment.amount_refunded as number) >= payment.amount);

  const { error: factError } = await supabaseAdmin.from("provider_events")
    .update({ blocks_entitlement: fullRefund }).eq("payment_id", params.razorpayPaymentId)
    .eq("event_type", "refund.processed");
  if (factError) return { ok: false, status: 503, reason: "Refund fact persistence failed" };
  const { data, error } = await supabaseAdmin.rpc("handle_payment_refund", {
    p_razorpay_payment_id: params.razorpayPaymentId,
    p_full_refund: fullRefund,
  });
  if (error) {
    console.error("settle: refund handling failed", { code: error.code });
    return { ok: false, status: 500, reason: "refund handling failed" };
  }
  const outcome = (data as { status?: unknown } | null)?.status;
  if (typeof outcome !== "string" || !(fullRefund ? REVERSAL_RESULTS.has(outcome) : outcome === "partial_refund_ignored"))
    return { ok: false, status: 503, reason: "reversal settlement pending" };
  if (params.eventId) {
    const { error: inboxError } = await supabaseAdmin.from("provider_events")
      .update({ status: "applied" }).eq("event_id", params.eventId);
    if (inboxError) return { ok: false, status: 500, reason: "refund inbox update failed" };
  }
  return { ok: true, outcome };
}

// payment.dispute.* webhooks -> suspend / restore / reverse access.
// As with refunds the event payload is NOT trusted beyond the dispute id: the
// dispute is re-fetched from Razorpay and ITS status decides what happens.
//   open / under_review  -> "opened": access suspended while the dispute is open
//   won                  -> "won":    access restored
//   lost                 -> "lost":   money gone - reversed like a full refund
//                                     (the student's wallet amount is NOT given back)
//   closed               -> nothing automatic; logged for a manual decision
//                           (an open dispute stays suspended until someone decides).
export function disputeOutcome(status: string | undefined): "opened" | "won" | "lost" | null {
  if (status === "open" || status === "under_review") return "opened";
  if (status === "won") return "won";
  if (status === "lost") return "lost";
  return null;
}

export async function settleDispute(params: { disputeId: string; eventId?: string }): Promise<RefundResult> {
  const dispute = await fetchDispute(params.disputeId);
  if (typeof dispute.payment_id !== "string" || !dispute.payment_id.startsWith("pay_")) {
    return { ok: false, status: 400, reason: "dispute has no payment" };
  }
  const outcome = disputeOutcome(dispute.status);
  if (outcome) {
    const { error: factError } = await supabaseAdmin.from("provider_events")
      .update({ blocks_entitlement: outcome !== "won" }).eq("payment_id", dispute.payment_id)
      .eq("provider_object_id", params.disputeId);
    if (factError) return { ok: false, status: 503, reason: "Dispute fact persistence failed" };
  }
  if (!outcome) {
    // Closed disputes require a manual decision; unfamiliar provider states
    // must remain retryable rather than silently completing their inbox job.
    if (dispute.status !== "closed")
      return { ok: false, status: 503, reason: "unrecognized dispute status" };
    if (params.eventId) {
      const { error: inboxError } = await supabaseAdmin.from("provider_events")
        .update({ status: "applied" }).eq("event_id", params.eventId);
      if (inboxError) return { ok: false, status: 500, reason: "dispute inbox update failed" };
    }
    return { ok: true, outcome: `no_change_status_${String(dispute.status)}` };
  }

  const { data, error } = await supabaseAdmin.rpc("handle_payment_dispute", {
    p_razorpay_payment_id: dispute.payment_id,
    p_outcome: outcome,
  });
  if (error) {
    console.error("settle: dispute handling failed", { code: error.code });
    return { ok: false, status: 500, reason: "dispute handling failed" };
  }
  const applied = (data as { status?: unknown } | null)?.status;
  const accepted = outcome === "lost" ? REVERSAL_RESULTS
    : new Set(outcome === "opened" ? ["access_suspended", "nothing_to_suspend"]
      : ["access_restored", "nothing_to_restore"]);
  if (typeof applied !== "string" || !accepted.has(applied))
    return { ok: false, status: 503, reason: "dispute settlement pending" };
  if (params.eventId) {
    const { error: inboxError } = await supabaseAdmin.from("provider_events")
      .update({ status: "applied" }).eq("event_id", params.eventId);
    if (inboxError) return { ok: false, status: 500, reason: "dispute inbox update failed" };
  }
  return { ok: true, outcome: applied };
}

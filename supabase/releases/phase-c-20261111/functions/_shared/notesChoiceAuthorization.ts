import { supabaseAdmin } from "./supabaseAdmin.ts";
import { fetchPayment } from "./razorpay.ts";
import { reportExternalOrder } from "./externalReporting.ts";

// Called only after raw-body webhook HMAC verification. Provider lookup remains
// authoritative; reporting an authorization never settles or grants Notes.
export async function reportNotesChoiceAuthorization(paymentId: string, orderId: string): Promise<void> {
  const { data: order, error } = await supabaseAdmin.from("orders")
    .select("id,amount,external_transaction_token").eq("razorpay_order_id", orderId).maybeSingle();
  if (error) throw new Error("Authorization order lookup failed");
  if (!order?.external_transaction_token) return; // Existing website behavior.
  const payment = await fetchPayment(paymentId);
  if (!["authorized", "captured", "refunded"].includes(payment.status) || payment.order_id !== orderId ||
      payment.currency !== "INR" || payment.amount !== Math.round(Number(order.amount) * 100) ||
      !Number.isSafeInteger(payment.created_at) || (payment.created_at ?? 0) <= 0)
    throw new Error("Provider authorization mismatch");
  const { error: recordError } = await supabaseAdmin.rpc("record_notes_choice_authorization", {
    p_order_id: order.id, p_provider_time: new Date(payment.created_at! * 1000).toISOString(),
  });
  if (recordError) throw new Error("Authorization queue failed");
  // Failure returns 5xx to Razorpay; the durable report job independently retries.
  await reportExternalOrder(order.id);
}

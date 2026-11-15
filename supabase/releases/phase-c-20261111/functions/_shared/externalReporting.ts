import { supabaseAdmin } from "./supabaseAdmin.ts";
import { createExternalTransaction, getExternalTransaction, GoogleApiError,
  packageName, refundExternalTransaction, refundExternalTransactionPartially,
  type ExternalTransaction } from "./googlePlay.ts";
import { INDIA_ADMINISTRATIVE_AREAS } from "./ucbStates.ts";

type ReportOrder = {
  id: string; provider: string; status: string; amount: number | string;
  external_transaction_token: string | null; external_transaction_id: string | null;
  external_report_status: string | null; tax_pre_amount: number | string | null;
  tax_amount: number | string | null; tax_region_code: string | null;
  tax_administrative_area: string | null; payment_completed_at: string | null;
  payment_provider_time: string | null; payment_time_fallback: boolean;
  ucb_transaction_time?: string | null;
  external_refund_at: string | null;
};

function micros(value: number | string): string {
  const number = Number(value);
  const paise = Math.round(number * 100);
  if (!Number.isSafeInteger(paise) || paise < 0 || Math.abs(number * 100 - paise) > 0.001)
    throw new Error("Invalid INR tax amount");
  return String(paise * 10000);
}

async function loadOrder(orderId: string): Promise<ReportOrder> {
  const { data, error } = await supabaseAdmin.from("orders")
    .select("id,provider,status,amount,external_transaction_token,external_transaction_id,external_report_status,tax_pre_amount,tax_amount,tax_region_code,tax_administrative_area,payment_completed_at,payment_provider_time,payment_time_fallback,external_refund_at,ucb_transaction_time")
    .eq("id", orderId).maybeSingle();
  if (error || !data) throw new Error("External report order unavailable");
  return data as ReportOrder;
}

async function updateReport(orderId: string, status: "failed" | "reported", error?: string, testPurchase?: boolean): Promise<void> {
  let update = supabaseAdmin.from("orders").update({
    external_report_status: status, external_report_error: error ?? null,
    ...(status === "reported" ? { external_reported_at: new Date().toISOString(), external_report_test_purchase: testPurchase } : {}),
    external_report_attempted_at: new Date().toISOString(),
  }).eq("id", orderId);
  // A slower failed attempt cannot overwrite a concurrent successful report.
  if (status === "failed") update = update.neq("external_report_status", "reported");
  const { error: dbError } = await update;
  if (dbError) throw new Error("External report state update failed");
}

// Same stable externalTransactionId on every attempt. A GET before CREATE and
// again after ambiguous errors prevents duplicate reports across concurrent jobs.
export async function reportExternalOrder(orderId: string): Promise<"skipped" | "reported"> {
  const order = await loadOrder(orderId);
  if (!order.external_transaction_token) return "skipped";
  if (order.provider !== "razorpay" || (!order.ucb_transaction_time && !["paid", "refunded"].includes(order.status)) || !order.external_transaction_id)
    throw new Error("External transaction is not settled");
  if (order.external_report_status === "reported") return "reported";
  const amount = Number(order.amount);
  const pre = Number(order.tax_pre_amount);
  const tax = Number(order.tax_amount);
  const transactionTime = order.ucb_transaction_time ?? order.payment_provider_time ?? order.payment_completed_at;
  if (order.tax_pre_amount === null || order.tax_amount === null || !Number.isFinite(amount)
      || !Number.isFinite(pre) || !Number.isFinite(tax) || pre < 0 || tax < 0
      || Math.round((pre + tax) * 100) !== Math.round(amount * 100)
      || order.tax_region_code !== "IN" || !order.tax_administrative_area
      || !INDIA_ADMINISTRATIVE_AREAS.has(order.tax_administrative_area)
      || (!order.ucb_transaction_time && !order.payment_completed_at)
      || !transactionTime || !Number.isFinite(Date.parse(transactionTime))) {
    await updateReport(orderId, "failed", "Missing authoritative tax, Indian buyer state or completion time");
    throw new Error("External transaction details incomplete");
  }
  const { error: attemptError } = await supabaseAdmin.rpc("mark_ucb_report_attempt", {
    p_order_id: orderId, p_refund: false,
  });
  if (attemptError) throw new Error("Cannot record external report attempt");
  const appEnv = Deno.env.get("APP_ENV");
  if (appEnv !== "staging" && appEnv !== "production") throw new Error("External reporting environment unavailable");
  const price = (value: number | string) => ({ currency: "INR", priceMicros: micros(value) });
  const body = {
    originalPreTaxAmount: price(order.tax_pre_amount), originalTaxAmount: price(order.tax_amount),
    transactionTime: new Date(transactionTime).toISOString(),
    oneTimeTransaction: { externalTransactionToken: order.external_transaction_token },
    userTaxAddress: { regionCode: "IN", administrativeArea: order.tax_administrative_area },
  };
  let existing: ExternalTransaction | undefined;
  try { existing = await getExternalTransaction(order.external_transaction_id); }
  catch (error) { if (!(error instanceof GoogleApiError) || error.status !== 404) throw error; }
  if (!existing) {
    try { existing = await createExternalTransaction(order.external_transaction_id, body); }
    catch (error) {
      try { existing = await getExternalTransaction(order.external_transaction_id); }
      catch { await updateReport(orderId, "failed", error instanceof GoogleApiError ? `Google API ${error.status}` : "Google API unavailable"); throw error; }
    }
  }
  if (existing?.externalTransactionId !== order.external_transaction_id
      || existing.packageName !== packageName()
      || (existing.transactionState !== "TRANSACTION_REPORTED"
          && !(order.status === "refunded" && existing.transactionState === "TRANSACTION_CANCELED"))
      || existing.originalPreTaxAmount?.currency !== "INR"
      || existing.originalPreTaxAmount?.priceMicros !== micros(order.tax_pre_amount)
      || existing.originalTaxAmount?.currency !== "INR"
      || existing.originalTaxAmount?.priceMicros !== micros(order.tax_amount)
      || existing.userTaxAddress?.regionCode !== "IN"
      || existing.userTaxAddress?.administrativeArea !== order.tax_administrative_area
      || !existing.oneTimeTransaction
      || !existing.transactionTime
      || Date.parse(existing.transactionTime) !== Date.parse(transactionTime)
      || (existing.oneTimeTransaction?.externalTransactionToken
          && existing.oneTimeTransaction.externalTransactionToken !== order.external_transaction_token)) {
    await updateReport(orderId, "failed", "Google returned mismatched external transaction");
    throw new Error("External transaction reconciliation mismatch");
  }
  // Google derives this OUTPUT-only marker from the authentic Play token.
  // Never manufacture a test token or send testPurchase as an input field.
  const testPurchase = existing.testPurchase != null;
  if (testPurchase !== (appEnv === "staging")) {
    await updateReport(orderId, "failed", "Google test purchase mode does not match server environment");
    throw new Error("External transaction test mode mismatch");
  }
  await updateReport(orderId, "reported", undefined, testPurchase);
  return "reported";
}

export async function reportExternalFullRefund(orderId: string): Promise<"skipped" | "reported"> {
  const order = await loadOrder(orderId);
  if (!order.external_transaction_token) return "skipped";
  if (order.status !== "refunded" || !order.external_transaction_id || order.external_report_status !== "reported")
    throw new Error("External refund awaits original report");
  if (!order.external_refund_at) throw new Error("External refund time unavailable");
  const { error: attemptError } = await supabaseAdmin.rpc("mark_ucb_report_attempt", {
    p_order_id: orderId, p_refund: true,
  });
  if (attemptError) throw new Error("Cannot record external refund attempt");
  const existing = await getExternalTransaction(order.external_transaction_id);
  if (existing.packageName !== packageName() || existing.externalTransactionId !== order.external_transaction_id)
    throw new Error("External refund transaction mismatch");
  if (existing.transactionState === "TRANSACTION_CANCELED") {
    const { error } = await supabaseAdmin.from("orders").update({ external_refund_status: "reported", external_refund_error: null })
      .eq("id", orderId);
    if (error) throw new Error("Cannot record external refund result");
    return "reported";
  }
  try {
    const result = await refundExternalTransaction(order.external_transaction_id, order.external_refund_at);
    if (result.transactionState !== "TRANSACTION_CANCELED") throw new Error("Google refund state mismatch");
    const { error } = await supabaseAdmin.from("orders").update({ external_refund_status: "reported", external_refund_error: null })
      .eq("id", orderId);
    if (error) throw new Error("Cannot record external refund result");
    return "reported";
  } catch (error) {
    const { error: stateError } = await supabaseAdmin.from("orders").update({ external_refund_status: "failed",
      external_refund_error: error instanceof GoogleApiError ? `Google API ${error.status}` : "Google refund unavailable" })
      .eq("id", orderId).neq("external_refund_status", "reported");
    if (stateError) throw new Error("Cannot record external refund failure");
    throw error;
  }
}

type RefundEvent = {
  refund_id: string; order_id: string; amount_paise: number; pre_tax_paise: number;
  refund_time: string; is_full: boolean; status: string;
};

async function markRefundEvent(refundId: string, status: "failed" | "reported", error?: string): Promise<void> {
  let update = supabaseAdmin.from("ucb_external_refunds").update({
    status, error: error ?? null,
    ...(status === "reported" ? { reported_at: new Date().toISOString() } : {}),
  }).eq("refund_id", refundId);
  if (status === "failed") update = update.neq("status", "reported");
  const { error: dbError } = await update;
  if (dbError) throw new Error("Cannot record external refund result");
}

// Google gives each partial refund a stable Razorpay refund ID. On an
// ambiguous response, reconcile the current pre-tax balance before retrying.
export async function reportExternalRefundEvent(refundId: string): Promise<"skipped" | "reported"> {
  const { data: claim, error: claimError } = await supabaseAdmin.rpc("claim_ucb_external_refund", {
    p_refund_id: refundId,
  });
  if (claimError) throw new Error("Cannot claim external refund");
  if (!claim?.ok) {
    const { data: current, error } = await supabaseAdmin.from("ucb_external_refunds")
      .select("status").eq("refund_id", refundId).maybeSingle();
    if (!error && current?.status === "reported") return "reported";
    throw new Error("External refund awaits its claim or earlier refund");
  }
  try {
    const { data, error } = await supabaseAdmin.from("ucb_external_refunds")
      .select("refund_id,order_id,amount_paise,pre_tax_paise,refund_time,is_full,status")
      .eq("refund_id", refundId).single();
    if (error || !data) throw new Error("External refund event unavailable");
    const event = data as RefundEvent;
    const order = await loadOrder(event.order_id);
    if (order.external_report_status !== "reported" || !order.external_transaction_id)
      throw new Error("Original external transaction report pending");
    const { data: prior, error: priorError } = await supabaseAdmin.from("ucb_external_refunds")
      .select("amount_paise,pre_tax_paise,is_full").eq("order_id", event.order_id).eq("status", "reported")
      .neq("refund_id", refundId);
    if (priorError) throw new Error("External refund history unavailable");
    const originalAmountPaise = Math.round(Number(order.amount) * 100);
    const originalPrePaise = Math.round(Number(order.tax_pre_amount) * 100);
    const priorPrePaise = (prior ?? []).reduce((sum: number, item: { pre_tax_paise: number; is_full: boolean }) =>
      sum + (item.is_full ? 0 : Number(item.pre_tax_paise)), 0);
    const priorRefundedPaise = (prior ?? []).reduce((sum: number, item: { amount_paise: number }) =>
      sum + Number(item.amount_paise), 0);
    const isFull = event.is_full || priorRefundedPaise + Number(event.amount_paise) >= originalAmountPaise;
    const afterPrePaise = originalPrePaise - priorPrePaise - Number(event.pre_tax_paise);
    if (!Number.isSafeInteger(originalAmountPaise) || originalAmountPaise <= 0 ||
        !Number.isSafeInteger(afterPrePaise) || (!isFull && afterPrePaise < 0) ||
        !Number.isSafeInteger(Number(event.pre_tax_paise)) || Number(event.pre_tax_paise) <= 0)
      throw new Error("External refund pre-tax amount invalid");
    let current = await getExternalTransaction(order.external_transaction_id);
    if (current.packageName !== packageName() || current.externalTransactionId !== order.external_transaction_id)
      throw new Error("External refund transaction mismatch");
    if (current.transactionState === "TRANSACTION_CANCELED") {
      await markRefundEvent(refundId, "reported");
      return "reported";
    }
    if (isFull) {
      try { current = await refundExternalTransaction(order.external_transaction_id, event.refund_time); }
      catch (error) {
        current = await getExternalTransaction(order.external_transaction_id);
        if (current.transactionState !== "TRANSACTION_CANCELED") throw error;
      }
      if (current.transactionState !== "TRANSACTION_CANCELED") throw new Error("Google full refund mismatch");
    } else {
      const expectedAfter = String(afterPrePaise * 10000);
      const googlePre = current.currentPreTaxAmount?.currency === "INR"
        ? current.currentPreTaxAmount.priceMicros : undefined;
      if (!googlePre || !/^\d+$/.test(googlePre)) throw new Error("Google current pre-tax missing");
      if (BigInt(googlePre) > BigInt(expectedAfter)) {
        try {
          current = await refundExternalTransactionPartially(order.external_transaction_id,
            refundId, String(Number(event.pre_tax_paise) * 10000), event.refund_time);
        } catch (error) {
          current = await getExternalTransaction(order.external_transaction_id);
          if (current.currentPreTaxAmount?.priceMicros !== expectedAfter) throw error;
        }
      }
      if (current.currentPreTaxAmount?.currency !== "INR" ||
          current.currentPreTaxAmount.priceMicros !== expectedAfter)
        throw new Error("Google partial refund balance mismatch");
    }
    await markRefundEvent(refundId, "reported");
    return "reported";
  } catch (error) {
    await markRefundEvent(refundId, "failed", error instanceof GoogleApiError
      ? `Google API ${error.status}` : "External refund report unavailable");
    throw error;
  }
}

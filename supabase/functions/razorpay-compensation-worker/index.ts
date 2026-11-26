import { jsonResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { recoverCompensationRefund } from "../_shared/razorpayCompensation.ts";

function authorized(req: Request): boolean {
  const expected = Deno.env.get("RAZORPAY_COMPENSATION_WORKER_SECRET") ?? "";
  const received = req.headers.get("x-razorpay-compensation-secret") ?? "";
  if (expected.length < 32 || expected.length !== received.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ received.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }
  if (!authorized(req)) return jsonResponse({ error: "Unauthorized." }, 401);
  const input: unknown = await req.json().catch(() => null);
  if (
    !input || typeof input !== "object" || Array.isArray(input) ||
    Object.keys(input).length
  ) {
    return jsonResponse({ error: "An empty sweep request is required." }, 400);
  }
  const after = Deno.env.get("RAZORPAY_COMPENSATION_AFTER") ?? "";
  if (
    Deno.env.get("RAZORPAY_COMPENSATION_ENABLED") !== "true" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(after) ||
    !Number.isFinite(Date.parse(after)) || Date.parse(after) > Date.now()
  ) {
    return jsonResponse({
      error: "Compensation activation prerequisites are not configured.",
    }, 503);
  }
  // A single bounded job per invocation; no broad enqueue RPC and no UCB/Play phases.
  const { data: job, error: claimError } = await supabaseAdmin.rpc(
    "claim_razorpay_compensation",
    { p_after: after },
  );
  if (claimError) {
    return jsonResponse({ error: "Compensation queue unavailable." }, 503);
  }
  if (!job) return jsonResponse({ ok: true, processed: 0 });
  const identity = {
    p_payment_id: job.payment_id,
    p_lease_id: job.worker_lease_id,
  };
  try {
    const { data: item, error } = await supabaseAdmin.rpc(
      "prepare_razorpay_compensation",
      { ...identity, p_dispatch: false },
    );
    if (error || !item || item.payment_id !== job.payment_id) {
      throw new Error("Eligibility or lease check failed");
    }
    const refund = await recoverCompensationRefund({
      ...item,
      not_before: after,
    }, async () => {
      const { data, error } = await supabaseAdmin.rpc(
        "prepare_razorpay_compensation",
        { ...identity, p_dispatch: true },
      );
      return !error && data?.payment_id === job.payment_id;
    });
    const { data: finished, error: finishError } = await supabaseAdmin.rpc(
      "finish_razorpay_compensation",
      {
        ...identity,
        p_refund_id: refund.id,
      },
    );
    if (finishError || finished !== true) {
      throw new Error("Finalization requires reconciliation");
    }
    return jsonResponse({ ok: true, processed: 1 });
  } catch {
    // Keep credentials/provider responses out of errors and logs. The dispatch
    // fence survives this retry and any process crash or lease replacement.
    await supabaseAdmin.rpc("finish_razorpay_compensation", {
      ...identity,
      p_refund_id: null,
    });
    return jsonResponse({
      error:
        "Compensation remains queued for recovery or manual reconciliation.",
    }, 503);
  }
});

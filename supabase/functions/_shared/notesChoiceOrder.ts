import { newOrdersEnabled } from "./newOrderGate.ts";
import { handleOptions, jsonResponse } from "./cors.ts";
import { getUserFromAuthHeader, supabaseAdmin } from "./supabaseAdmin.ts";
import { createRazorpayOrder, fetchRazorpayOrder, findRazorpayOrderByReceipt, getRazorpayKeyId, isLiveMode } from "./razorpay.ts";
import { withinLimit } from "./rateLimit.ts";
import { INDIA_ADMINISTRATIVE_AREAS } from "./ucbStates.ts";
import { notesChoiceAllowed } from "./notesChoiceGate.ts";
import { paymentGate } from "./paymentGate.ts";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function handleNotesChoiceOrder(req: Request): Promise<Response> {
  const preflight = handleOptions(req); if (preflight) return preflight;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
  try {
    const user = await getUserFromAuthHeader(req);
    if (!user) return jsonResponse({ error: "Please log in before purchasing." }, 401);
    if (!await newOrdersEnabled(supabaseAdmin)) return jsonResponse({ error: "New purchases are disabled in this release.", code: "sales_disabled" }, 403);
    if (!notesChoiceAllowed(req, user.id)) return jsonResponse({ error: "Play billing choice checkout is disabled." }, 403);
    const input = await req.json().catch(() => null);
    if (!input || typeof input !== "object" || Array.isArray(input)) return jsonResponse({ error: "Invalid checkout." }, 400);
    const { productId, ucbOrderId, buyerState } = input;
    const useWallet = input.useWallet === true;
    if (typeof productId !== "string" || !productId || productId.length > 100 ||
        typeof ucbOrderId !== "string" || !UUID.test(ucbOrderId) || !INDIA_ADMINISTRATIVE_AREAS.has(buyerState))
      return jsonResponse({ error: "Invalid Notes billing choice or Indian billing state." }, 400);
    if (await paymentGate(req, true) !== "allow") return jsonResponse({ error: "Billing configuration unavailable. Please update the app." }, 503);
    if (!await withinLimit(`notes-choice:${user.id}`, 20, 600)) return jsonResponse({ error: "Too many attempts." }, 429);
    // Validate credentials/mode BEFORE reserving the sole provider attempt.
    const keyId = getRazorpayKeyId();
    const live = isLiveMode();
    const { data: prepared, error } = await supabaseAdmin.rpc("prepare_notes_choice_checkout", {
      p_user_id: user.id, p_choice_id: ucbOrderId, p_product_id: productId,
      p_use_wallet: useWallet, p_buyer_state: buyerState,
    });
    if (error) return jsonResponse({ error: "Could not reserve Notes checkout." }, 503);
    if (!prepared?.ok) return jsonResponse({ error: prepared?.code ?? "Billing choice unavailable." }, 409);
    const { data: order, error: lookupError } = await supabaseAdmin.from("orders")
      .select("id,user_id,product_id,provider,status,amount,list_price,referral_discount,wallet_amount,razorpay_order_id,expires_at,products(title)")
      .eq("id", prepared.order_id).eq("user_id", user.id).eq("provider", "razorpay").single();
    if (lookupError || !order || order.user_id !== user.id || order.product_id !== productId || order.provider !== "razorpay")
      return jsonResponse({ error: "Reserved checkout unavailable. Retry this choice." }, 503);
    if (order.status !== "created" || !Number.isFinite(Date.parse(order.expires_at)) || Date.parse(order.expires_at) <= Date.now())
      return jsonResponse({ error: "This checkout is no longer payable. Check My Purchases before starting again.", code: "checkout_not_payable" }, 409);
    const amountPaise = Math.round(Number(order.amount) * 100);
    const amounts = [order.list_price, order.referral_discount, order.wallet_amount, order.amount].map(Number);
    const paise = amounts.map(value => Math.round(value * 100));
    if (amounts.some((value, i) => !Number.isFinite(value) || value < 0 ||
        !Number.isSafeInteger(paise[i]) || Math.abs(value * 100 - paise[i]) > 0.000001) ||
        amountPaise < 100 || paise[0] - paise[1] - paise[2] !== amountPaise)
      throw new Error("Invalid order amount");
    let razorpayId = order.razorpay_order_id;
    if (!razorpayId) {
      try {
        const notes = { uid: user.id, productId, orderId: order.id, choiceId: ucbOrderId };
        let provider;
        if (prepared.claimed === true) {
          const created = await createRazorpayOrder({ amountPaise, receipt: order.id, notes });
          if (!/^order_[a-zA-Z0-9_]+$/.test(created.id)) throw new Error("Invalid provider order");
          provider = await fetchRazorpayOrder(created.id);
          if (provider.id !== created.id) throw new Error("Provider order identity mismatch");
        } else {
          provider = await findRazorpayOrderByReceipt(order.id);
        }
        if (!provider || !/^order_[a-zA-Z0-9_]+$/.test(provider.id) || provider.receipt !== order.id ||
            provider.amount !== amountPaise || provider.currency !== "INR" ||
            !["created", "attempted", "paid"].includes(provider.status) ||
            Object.entries(notes).some(([key, value]) => provider.notes?.[key] !== value))
          throw new Error("Provider order snapshot unavailable or mismatched");
        razorpayId = provider.id;
        const { error: attachError } = await supabaseAdmin.from("orders")
          .update({ razorpay_order_id: razorpayId }).eq("id", order.id).is("razorpay_order_id", null);
        if (attachError) throw new Error("Provider order attachment failed");
        // A concurrent retry may have attached the same order already. Confirm
        // its canonical value before returning a payable provider order.
        const { data: canonical, error: canonicalError } = await supabaseAdmin.from("orders")
          .select("razorpay_order_id").eq("id", order.id).eq("user_id", user.id).single();
        if (canonicalError || canonical?.razorpay_order_id !== razorpayId) throw new Error("Provider order attachment conflict");
        const { error: readyError } = await supabaseAdmin.from("notes_choice_checkouts")
          .update({ state: "ready" }).eq("choice_id", ucbOrderId);
        if (readyError) throw new Error("Provider checkout state failed");
      } catch {
        // Safe retries search by receipt and verify the complete binding.
        // An empty/ambiguous search stays pending and NEVER issues another CREATE.
        await supabaseAdmin.from("notes_choice_checkouts").update({ state: "unknown" }).eq("choice_id", ucbOrderId);
        return jsonResponse({ error: "Order creation is being checked. Retry this choice; contact support if it remains pending.", code: "creation_pending" }, 503);
      }
    }
    // Supabase's untyped relationship inference may return arrays; normalize
    // both forms without trusting client-supplied title or contact information.
    const product = Array.isArray(order.products) ? order.products[0] : order.products;
    const { data: profile } = await supabaseAdmin.from("profiles")
      .select("name,email").eq("id", user.id).maybeSingle();
    return jsonResponse({ keyId, isLiveMode: live, razorpayOrderId: razorpayId, amountPaise,
      internalOrderId: order.id, productTitle: product?.title ?? "Notes",
      verifyUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/verify-payment`,
      prefillName: profile?.name ?? "", prefillEmail: profile?.email ?? "",
      timeoutSeconds: Math.max(1, Math.floor((Date.parse(order.expires_at) - Date.now()) / 1000)),
      breakdown: { listPrice: Number(order.list_price), referralDiscount: Number(order.referral_discount),
        walletAmount: Number(order.wallet_amount), amount: Number(order.amount) } });
  } catch {
    return jsonResponse({ error: "Could not start Notes checkout. Please retry." }, 503);
  }
}

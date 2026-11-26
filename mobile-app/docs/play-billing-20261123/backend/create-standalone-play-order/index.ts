import { newOrdersEnabled } from "../_shared/newOrderGate.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getUserFromAuthHeader, supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { withinLimit } from "../_shared/rateLimit.ts";
// Independent test gate. Client provider/distribution headers confer no authority.
function standaloneTesterAllowed(userId: string): boolean {
  if (Deno.env.get("PLAY_STANDALONE_TEST_ENABLED") !== "true") return false;
  const ids = (Deno.env.get("PLAY_STANDALONE_TEST_USER_IDS") ?? "").split(",").map(id => id.trim());
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) && ids.includes(userId);
}

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req); if (preflight) return preflight;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
  const user = await getUserFromAuthHeader(req);
  if (!user) return jsonResponse({ error: "Please log in before purchasing." }, 401);
    if (!await newOrdersEnabled(supabaseAdmin)) return jsonResponse({ error: "New purchases are disabled in this release.", code: "sales_disabled" }, 403);
  if (!standaloneTesterAllowed(user.id)) return jsonResponse({ error: "Standalone Play testing is disabled for this account." }, 403);
  const input: unknown = await req.json().catch(() => null);
  if (!input || typeof input !== "object" || Array.isArray(input))
    return jsonResponse({ error: "Invalid request body." }, 400);
  const body = input as { productId?: unknown };
  const productId = typeof body.productId === "string" ? body.productId : "";
  if (!productId || productId.length > 100) return jsonResponse({ error: "Invalid productId." }, 400);
  if (!(await withinLimit(`create-standalone-play-order:${user.id}`, 10, 600))) return jsonResponse({ error: "Too many attempts." }, 429);
  const { data: product, error: productError } = await supabaseAdmin.from("products")
    .select("scope,active,product_type").eq("id", productId).maybeSingle();
  if (productError || !product || !product.active ||
      !(product.scope === "bundle" ? product.product_type === "notes_bundle" :
        ["chapter", "subject", "year"].includes(product.scope) && product.product_type === "notes"))
    return jsonResponse({ error: "This Notes product is unavailable." }, 400);
  const { data, error } = await supabaseAdmin.rpc("create_play_order", { p_user_id: user.id, p_product_id: productId });
  if (error) { console.error("create-standalone-play-order failed", error.code); return jsonResponse({ error: "Unable to create Play order." }, 500); }
  if (!data?.ok) {
    if (data?.code === "price_tier_pending") {
      // Distinguish a parked provisioning failure from work that can complete
      // automatically. Never return the operator's Google diagnostic to buyers.
      const { data: current, error: lookupError } = await supabaseAdmin.from("products")
        .select("price").eq("id", productId).maybeSingle();
      if (lookupError || !current) return jsonResponse({ error: "Checkout status unavailable." }, 503);
      const { data: sync, error: syncError } = await supabaseAdmin.from("play_price_sync")
        .select("status").eq("price_inr", current.price).maybeSingle();
      if (syncError) return jsonResponse({ error: "Checkout status unavailable." }, 503);
      const code = sync?.status === "failed" ? "price_tier_failed" : "price_tier_pending";
      return jsonResponse({ error: code, code }, 400);
    }
    return jsonResponse({ error: data?.code ?? "order_unavailable", code: data?.code }, 400);
  }
  const { data: order, error: orderError } = await supabaseAdmin.from("orders")
    .select("amount,play_sku,play_purchase_option_id").eq("id", data.order_id).eq("user_id", user.id).eq("provider", "play").single();
  if (orderError || !order || order.play_sku !== data.play_sku ||
      order.play_purchase_option_id !== data.purchase_option_id || !Number.isFinite(Number(order.amount)))
    return jsonResponse({ error: "Unable to confirm Play order price." }, 503);
  return jsonResponse({ internalOrderId: data.order_id, playSku: data.play_sku,
    purchaseOptionId: data.purchase_option_id, amountInr: Number(order.amount) });
});

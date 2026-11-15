import type { SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";
import {
  type EnvReader,
  NONPLAY_TEST_ENVIRONMENT,
  NONPLAY_TEST_URL,
  TEST_PRODUCT,
  testClientAllowed,
  type TestConfig,
  testConfig,
  UUID,
} from "./nonplayTestConfig.ts";
import {
  type TestOrder,
  testProvider,
  testSignature,
} from "./nonplayTestProvider.ts";

type Dependencies = {
  db: SupabaseClient;
  authenticate: (req: Request) => Promise<{ id: string } | null>;
  env: EnvReader;
  fetcher?: typeof fetch;
};
class Refusal extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, idempotency-key, x-medveda-app-version, x-medveda-application-id, x-medveda-build-profile, x-medveda-test-environment",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
function fail(status: number, message: string): never {
  throw new Refusal(status, message);
}

export function createNonplayTestHandlers(
  { db, authenticate, env, fetcher }: Dependencies,
) {
  async function rpc<T>(
    name: string,
    args: Record<string, unknown>,
  ): Promise<T> {
    if (!name.startsWith("nonplay_test_")) {
      throw new Error("Invalid test operation");
    }
    const { data, error } = await db.rpc(name, args);
    if (error) {
      fail(
        409,
        "Test operation unavailable. Check the existing test attempt before retrying.",
      );
    }
    return data as T;
  }
  async function permitted(config: TestConfig, uid: string, product?: string) {
    if (
      !config.users.has(uid) || (product && !config.products.has(product)) ||
      !await rpc<boolean>(
        product ? "nonplay_test_product_allowed" : "nonplay_test_user_allowed",
        product ? { p_user: uid, p_product: product } : { p_user: uid },
      )
    ) fail(403, "Test checkout unavailable.");
  }
  async function client(req: Request, config: TestConfig) {
    if (!testClientAllowed(req)) {
      fail(403, "Test package configuration required.");
    }
    const user = await authenticate(req);
    if (!user) fail(401, "Please log in.");
    await permitted(config, user.id);
    return user.id;
  }
  async function body(req: Request): Promise<Record<string, unknown>> {
    const text = await req.text();
    if (text.length > 16384) fail(413, "Test request too large.");
    let value;
    try {
      value = JSON.parse(text);
    } catch {
      fail(400, "Invalid test request.");
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      fail(400, "Invalid test request.");
    }
    return value;
  }
  async function order(uid: string, id: unknown, config: TestConfig) {
    if (typeof id !== "string" || !UUID.test(id)) {
      fail(400, "Invalid test order.");
    }
    const { data, error } = await db.from("nonplay_test_orders").select("*").eq(
      "id",
      id,
    ).eq("user_id", uid).maybeSingle();
    if (error) fail(503, "Test order unavailable.");
    if (!data) fail(404, "Test order unavailable.");
    const o = data as TestOrder;
    await permitted(config, uid, o.product_id);
    if (o.key_id !== config.keyId) {
      fail(409, "Test order requires credential reconciliation.");
    }
    return o;
  }
  async function attach(
    o: TestOrder,
    uid: string,
    config: TestConfig,
    claimed = false,
  ) {
    if (o.razorpay_order_id) return o;
    if (Date.parse(o.expires_at) <= Date.now()) {
      fail(409, "Test checkout expired.");
    }
    const provider = testProvider(config, fetcher);
    // Only the committed first claimant can POST. Every ambiguous retry uses GET.
    const remote = claimed ? await provider.create(o) : await provider.find(o);
    if (!remote) {
      fail(
        409,
        "Test provider creation is pending reconciliation. No second order was created.",
      );
    }
    return rpc<TestOrder>("nonplay_test_attach_order", {
      p_user: uid,
      p_order: o.id,
      p_provider: remote.id,
    });
  }
  async function observe(
    o: TestOrder,
    paymentId: string,
    config: TestConfig,
    event?: string,
  ) {
    const provider = testProvider(config, fetcher);
    await provider.order(o);
    const p = await provider.payment(paymentId, o);
    if (
      event === "payment.captured" &&
      !["captured", "refunded"].includes(p.status)
    ) {
      fail(503, "Test capture is awaiting provider confirmation.");
    }
    if (
      event === "refund.processed" && p.status !== "refunded" &&
      !(p.amount_refunded && p.amount_refunded > 0)
    ) {
      fail(503, "Test refund is awaiting provider confirmation.");
    }
    return rpc<Record<string, unknown>>("nonplay_test_observe_payment", {
      p_order: o.id,
      p_payment: p.id,
      p_status: (p.amount_refunded ?? 0) > 0 ? "refunded" : p.status,
      p_amount: p.amount,
      p_currency: p.currency,
      p_provider: p.order_id,
      p_created: new Date(p.created_at * 1000).toISOString(),
    });
  }
  function wrap(
    action: (req: Request, c: TestConfig) => Promise<Response>,
    webhook = false,
  ) {
    return async (req: Request) => {
      if (!webhook && req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers });
      }
      if (req.method !== "POST") {
        return json({ error: "Method not allowed." }, 405);
      }
      let config: TestConfig;
      try {
        config = testConfig(env);
      } catch {
        return json(
          { error: "Test checkout is disabled or unconfigured." },
          403,
        );
      }
      try {
        return await action(req, config);
      } catch (e) {
        return json({
          error: e instanceof Refusal
            ? e.message
            : "Test operation could not be confirmed. Retry the same attempt.",
          success: false,
          pending: true,
        }, e instanceof Refusal ? e.status : 503);
      }
    };
  }
  const create = wrap(async (req, config) => {
    const uid = await client(req, config), input = await body(req);
    if (
      typeof input.productId !== "string" ||
      !TEST_PRODUCT.test(input.productId) || input.useWallet === true ||
      input.ucbOrderId !== undefined || Object.keys(input).some((k) =>
        !["productId", "useWallet"].includes(k)
      )
    ) fail(400, "Only synthetic Notes checkout is supported.");
    const key = req.headers.get("idempotency-key") ?? "";
    if (!UUID.test(key)) fail(400, "A test idempotency key is required.");
    await permitted(config, uid, input.productId);
    const reserved = await rpc<TestOrder & { claimed: boolean }>(
      "nonplay_test_prepare_order",
      {
        p_user: uid,
        p_product: input.productId,
        p_key: key,
        p_key_id: config.keyId,
      },
    );
    if (
      reserved.status === "expired" ||
      Date.parse(reserved.expires_at) <= Date.now()
    ) {
      return json({
        error: "Test checkout expired. Tap Pay to start a new attempt.",
        code: "test_checkout_expired",
      }, 409);
    }
    if (!["pending", "created"].includes(reserved.status)) {
      fail(
        409,
        "Test checkout is already completed.",
      );
    }
    const o = await attach(reserved, uid, config, reserved.claimed);
    return json({
      keyId: config.keyId,
      isLiveMode: false,
      razorpayOrderId: o.razorpay_order_id,
      amountPaise: o.amount_paise,
      internalOrderId: o.id,
      productTitle: o.title,
      verifyUrl: `${NONPLAY_TEST_URL}/functions/v1/verify-payment-nonplay-test`,
      timeoutSeconds: Math.max(
        1,
        Math.floor((Date.parse(o.expires_at) - Date.now()) / 1000),
      ),
      breakdown: {
        listPrice: o.amount_paise / 100,
        amount: o.amount_paise / 100,
        referralDiscount: 0,
        walletAmount: 0,
      },
    });
  });
  const verify = wrap(async (req, config) => {
    const uid = await client(req, config), input = await body(req);
    let o = await order(uid, input.internalOrderId, config);
    if (input.checkoutState !== undefined) {
      if (
        !["cancelled", "failed", "pending"].includes(
          String(input.checkoutState),
        )
      ) fail(400, "Invalid test checkout state.");
      // UI hints never grant/revoke a purchase and never cancel a provider capture.
      const { error } = await db.from("nonplay_test_checkouts").update({
        state: input.checkoutState,
        updated_at: new Date().toISOString(),
      })
        .eq("order_id", o.id).in("state", [
          "pending",
          "open",
          "cancelled",
          "failed",
        ]);
      if (error) fail(503, "Test checkout state unavailable.");
      const { error: auditError } = await db.from("nonplay_test_audit").insert({
        order_id: o.id,
        event: `checkout_${input.checkoutState}`,
      });
      if (auditError) fail(503, "Test audit unavailable.");
      return json({ success: false, pending: true });
    }
    o = await attach(o, uid, config);
    if (input.recover === true) {
      const provider = testProvider(config, fetcher);
      await provider.order(o);
      const payments = await provider.payments(o);
      // Re-fetch each candidate; never accept payment facts from the listing alone.
      const ranked = [...payments].sort((a, b) =>
        Number(b.status === "captured" || b.status === "refunded") -
        Number(a.status === "captured" || a.status === "refunded")
      );
      let verdict: Record<string, unknown> = {
        success: false,
        pending: Date.parse(o.expires_at) > Date.now(),
        message: "No captured test payment confirmed.",
      };
      for (const p of ranked) {
        verdict = await observe(o, p.id, config);
        if (verdict.success === true) return json(verdict);
      }
      return json(verdict);
    }
    if (
      input.razorpay_order_id !== o.razorpay_order_id ||
      typeof input.razorpay_payment_id !== "string" ||
      !await testSignature(
        config.keySecret,
        `${o.razorpay_order_id}|${input.razorpay_payment_id}`,
        input.razorpay_signature,
      )
    ) fail(400, "Invalid test payment signature.");
    return json(await observe(o, input.razorpay_payment_id, config));
  });
  const catalog = wrap(async (req, config) => {
    const uid = await client(req, config), input = await body(req);
    if (input.action === "quote") {
      if (typeof input.productId !== "string" || input.useWallet === true) {
        fail(400, "Test referral balance is unavailable.");
      }
      await permitted(config, uid, input.productId);
      return json(
        await rpc("nonplay_test_quote", {
          p_user: uid,
          p_product: input.productId,
        }),
      );
    }
    if (input.action === "pending") {
      const { data, error } = await db.from("nonplay_test_orders").select(
        "id,product_id",
      ).eq("user_id", uid).in("status", ["pending", "created"]).order(
        "created_at",
        { ascending: false },
      ).limit(20);
      if (error) fail(503, "Test attempts unavailable.");
      return json({
        orders: (data ?? []).filter((o) => config.products.has(o.product_id)),
      });
    }
    if (input.action !== "catalog") {
      fail(400, "Invalid test catalog operation.");
    }
    const { data: rows, error } = await db.from("nonplay_test_products").select(
      "id,title,price_paise,chapter_id,subject_id,year_id,course_id",
    ).eq("active", true).in("id", [...config.products]);
    if (error) fail(503, "Test catalog unavailable.");
    const products: {
      id: string;
      title: string;
      price_paise: number;
      chapter_id: string;
      subject_id: string;
      year_id: string;
      course_id: string;
    }[] = [];
    for (const row of rows ?? []) {
      if (
        await rpc<boolean>("nonplay_test_product_allowed", {
          p_user: uid,
          p_product: row.id,
        })
      ) products.push(row);
    }
    const ids = products.map((p) => p.id);
    const { data: notes, error: noteError } = await db.from(
      "nonplay_test_notes",
    ).select("id,title,product_id").eq("active", true).in("product_id", ids);
    const { data: ents, error: entError } = await db.from(
      "nonplay_test_entitlements",
    ).select("order_id,product_id,created_at").eq("user_id", uid).is(
      "revoked_at",
      null,
    ).in("product_id", ids);
    if (noteError || entError) fail(503, "Test catalog unavailable.");
    const { data: orders, error: orderError } = await db.from(
      "nonplay_test_orders",
    ).select("id,amount_paise,title").eq("user_id", uid).in(
      "id",
      (ents ?? []).map((e) => e.order_id),
    );
    if (orderError) fail(503, "Test catalog unavailable.");
    return json({
      products: products.map((p) => ({
        ...p,
        scope: "chapter",
        active: true,
        price: p.price_paise / 100,
        description: "Synthetic test Notes",
      })),
      chapters: products.map((p) => ({
        id: p.chapter_id,
        title: p.title,
        subject_id: p.subject_id,
        year_id: p.year_id,
        course_id: p.course_id,
        active: true,
        order: 9999,
      })),
      notes: (notes ?? []).map((n) => {
        const p = products.find((p) => p.id === n.product_id)!;
        return {
          ...n,
          chapter_id: p.chapter_id,
          year_id: p.year_id,
          course_id: p.course_id,
          pdf_url: "",
          is_free_preview: false,
          order: 0,
        };
      }),
      purchases: (ents ?? []).flatMap((e) => {
        const p = products.find((p) => p.id === e.product_id)!,
          o = (orders ?? []).find((o) => o.id === e.order_id);
        return o
          ? [{
            id: e.order_id,
            order_id: e.order_id,
            product_id: p.id,
            product_title: o.title,
            chapter_id: p.chapter_id,
            course_id: p.course_id,
            scope: "chapter",
            status: "success",
            amount: o.amount_paise / 100,
            created_at: Date.parse(e.created_at),
          }]
          : [];
      }),
    });
  });
  const noteUrl = wrap(async (req, config) => {
    const uid = await client(req, config), input = await body(req);
    if (
      typeof input.noteId !== "string" ||
      !/^npt_note_[0-9a-f-]{36}$/.test(input.noteId)
    ) fail(400, "Invalid synthetic note.");
    const { data: note, error } = await db.from("nonplay_test_notes").select(
      "product_id,object_path",
    ).eq("id", input.noteId).eq("active", true).maybeSingle();
    if (error || !note) fail(404, "Synthetic note unavailable.");
    await permitted(config, uid, note.product_id);
    const { data: ent, error: entError } = await db.from(
      "nonplay_test_entitlements",
    ).select("order_id").eq("user_id", uid).eq("product_id", note.product_id)
      .is("revoked_at", null).maybeSingle();
    if (entError || !ent) {
      fail(403, "A verified synthetic Notes entitlement is required.");
    }
    if (
      !/^synthetic\/[A-Za-z0-9/_-]+\.pdf$/.test(note.object_path) ||
      note.object_path.includes("..")
    ) fail(404, "Synthetic file unavailable.");
    const { data, error: signError } = await db.storage.from(
      "nonplay-test-notes",
    ).createSignedUrl(note.object_path, 120);
    if (signError || !data?.signedUrl) fail(404, "Synthetic file unavailable.");
    return json({ url: data.signedUrl, expiresIn: 120 });
  });
  const webhook = wrap(async (req, config) => {
    const raw = await req.text(),
      eventId = req.headers.get("x-razorpay-event-id");
    if (
      raw.length > 65536 || !eventId || eventId.length > 200 ||
      !await testSignature(
        config.webhookSecret,
        raw,
        req.headers.get("x-razorpay-signature"),
      )
    ) fail(401, "Invalid test webhook.");
    let event;
    try {
      event = JSON.parse(raw);
    } catch {
      fail(400, "Invalid test webhook.");
    }
    if (
      !event || typeof event !== "object" || Array.isArray(event) ||
      typeof event.event !== "string"
    ) fail(400, "Invalid test webhook.");
    const hash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw)),
      ),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("");
    const { error: insertError } = await db.from("nonplay_test_webhooks")
      .upsert({ event_id: eventId, payload_hash: hash }, {
        onConflict: "event_id",
        ignoreDuplicates: true,
      });
    if (insertError) fail(503, "Test webhook inbox unavailable.");
    const { data: stored, error: readError } = await db.from(
      "nonplay_test_webhooks",
    ).select("payload_hash,status").eq("event_id", eventId).single();
    if (readError || !stored) fail(503, "Test webhook inbox unavailable.");
    if (stored.payload_hash !== hash) {
      fail(409, "Test event identity conflict.");
    }
    if (stored.status === "processed") return json({ received: true });
    try {
      if (
        [
          "payment.captured",
          "payment.authorized",
          "payment.failed",
          "refund.processed",
        ].includes(event.event)
      ) {
        const entity = event.payload?.payment?.entity;
        const paymentId = entity?.id ??
          event.payload?.refund?.entity?.payment_id;
        // Refund payloads without an order binding stay retryable; no arbitrary
        // payment can choose an internal order via a caller-supplied UUID.
        let providerId = entity?.order_id;
        if (!providerId && typeof paymentId === "string") {
          const { data: attempt } = await db.from("nonplay_test_attempts")
            .select("order_id").eq("payment_id", paymentId).maybeSingle();
          if (attempt) {
            const { data: o } = await db.from("nonplay_test_orders").select(
              "razorpay_order_id",
            ).eq("id", attempt.order_id).maybeSingle();
            providerId = o?.razorpay_order_id;
          }
        }
        if (typeof providerId !== "string" || typeof paymentId !== "string") {
          fail(409, "Test event order not yet bound.");
        }
        const { data: rawOrder, error: orderError } = await db.from(
          "nonplay_test_orders",
        ).select("*").eq("razorpay_order_id", providerId).maybeSingle();
        if (orderError || !rawOrder) fail(409, "Test event order unavailable.");
        const o = await order(rawOrder.user_id, rawOrder.id, config);
        await observe(o, paymentId, config, event.event);
      }
      const { error: doneError } = await db.from("nonplay_test_webhooks")
        .update({ status: "processed" }).eq("event_id", eventId);
      if (doneError) fail(503, "Test webhook completion unavailable.");
    } catch (e) {
      // Do not overwrite a concurrent successful delivery or log raw provider data.
      await db.from("nonplay_test_webhooks").update({ status: "failed" }).eq(
        "event_id",
        eventId,
      ).neq("status", "processed");
      throw e;
    }
    return json({ received: true, environment: NONPLAY_TEST_ENVIRONMENT });
  }, true);
  return { create, verify, catalog, noteUrl, webhook };
}

import { createNonplayTestHandlers } from "../functions/_shared/nonplayTestHandlers.ts";
import {
  NONPLAY_TEST_ENVIRONMENT,
  NONPLAY_TEST_URL,
} from "../functions/_shared/nonplayTestConfig.ts";
import { testHmac } from "../functions/_shared/nonplayTestProvider.ts";
import { literal, sql, TestDatabase } from "./support/nonplay_test_db.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";
const uid = "d9510000-0000-4000-8000-000000000001",
  other = "d9510000-0000-4000-8000-000000000002";
const pid = "npt_product_d9510000-0000-4000-8000-000000000010",
  nid = "npt_note_d9510000-0000-4000-8000-000000000020";
const keySecret = "fixture_test_key_secret_12345678",
  webhookSecret = "fixture_test_webhook_secret_1234567890";
function assert(ok: unknown, label = "assertion") {
  if (!ok) throw new Error(label);
}
const env: Record<string, string> = {
  SUPABASE_URL: NONPLAY_TEST_URL,
  NONPLAY_TEST_ENVIRONMENT,
  NONPLAY_TEST_CHECKOUT_ENABLED: "true",
  NONPLAY_TEST_RAZORPAY_KEY_ID: "rzp_test_fixture",
  NONPLAY_TEST_RAZORPAY_KEY_SECRET: keySecret,
  NONPLAY_TEST_RAZORPAY_WEBHOOK_SECRET: webhookSecret,
  NONPLAY_TEST_USER_IDS: `${uid},${other}`,
  NONPLAY_TEST_PRODUCT_IDS: pid,
};
const clientHeaders = {
  "x-medveda-application-id": "in.medveda.razorpaytest",
  "x-medveda-app-version": "1.2.2",
  "x-medveda-build-profile": "razorpay-internal-test",
  "x-medveda-test-environment": NONPLAY_TEST_ENVIRONMENT,
};
async function setup() {
  await sql(
    `delete from public.nonplay_test_users; delete from public.nonplay_test_notes; delete from public.nonplay_test_products;delete from public.nonplay_test_webhooks;
    insert into auth.users(id,email,raw_app_meta_data) values(${
      literal(uid)
    },'nonplay-handler@example.invalid','{"medveda_nonplay_test":true}'),(${
      literal(other)
    },'nonplay-handler-other@example.invalid','{"medveda_nonplay_test":true}') on conflict(id) do nothing;
    update public.profiles set course_id='bams',blocked=false where id in (${
      literal(uid)
    },${literal(other)});
    insert into public.nonplay_test_users(user_id,active) values(${
      literal(uid)
    },true),(${literal(other)},true);
    update public.nonplay_test_config set enabled=true;
    insert into public.nonplay_test_products(id,title,price_paise,subject_id,year_id,course_id,active) values(${
      literal(pid)
    },'[TEST] Handler Notes',4900,'seed_s','seed_y','bams',true);
    insert into public.nonplay_test_notes(id,product_id,title,object_path,active) values(${
      literal(nid)
    },${literal(pid)},'[TEST] Synthetic PDF','synthetic/fixture.pdf',true);`,
  );
  const db = new TestDatabase();
  let creates = 0, gets = 0, loseCreate = false;
  const remoteOrders = new Map<string, any>(),
    payments = new Map<string, any>();
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    assert(
      url.startsWith("https://api.razorpay.com/v1/"),
      "unexpected provider host",
    );
    assert(
      new Headers(init?.headers).get("authorization") ===
        `Basic ${btoa(`rzp_test_fixture:${keySecret}`)}`,
      "non-test provider credential used",
    );
    const path = url.split("/v1/")[1];
    if (init?.method === "POST") {
      assert(path === "orders", "non-order provider mutation");
      creates++;
      const body = JSON.parse(String(init.body));
      const o = { ...body, id: "order_fixture" + creates, status: "created" };
      remoteOrders.set(o.id, o);
      if (loseCreate) throw new Error("Simulated lost response");
      return Response.json(o);
    }
    gets++;
    if (path.startsWith("orders?")) {
      return Response.json({
        items: [...remoteOrders.values()].filter((o) =>
          o.receipt === new URL(url).searchParams.get("receipt")
        ),
      });
    }
    if (path.startsWith("payments/")) {
      return payments.has(path.split("/")[1])
        ? Response.json(payments.get(path.split("/")[1]))
        : new Response(null, { status: 404 });
    }
    const id = path.split("/")[1];
    if (path.endsWith("/payments")) {
      return Response.json({
        items: [...payments.values()].filter((p) => p.order_id === id),
      });
    }
    return remoteOrders.has(id)
      ? Response.json(remoteOrders.get(id))
      : new Response(null, { status: 404 });
  };
  let overrides: Record<string, string | undefined> = {};
  const handlers = createNonplayTestHandlers({
    db: db as unknown as SupabaseClient,
    authenticate: async (req) => {
      const token = req.headers.get("authorization");
      return token === `Bearer ${uid}`
        ? { id: uid }
        : token === `Bearer ${other}`
        ? { id: other }
        : null;
    },
    env: (k) => k in overrides ? overrides[k] : env[k],
    fetcher,
  });
  function req(
    body: Record<string, unknown>,
    headers: Record<string, string> = {},
  ) {
    return new Request(NONPLAY_TEST_URL, {
      method: "POST",
      headers: {
        ...clientHeaders,
        authorization: `Bearer ${uid}`,
        "idempotency-key": crypto.randomUUID(),
        ...headers,
      },
      body: JSON.stringify(body),
    });
  }
  async function create(
    headers: Record<string, string> = {},
    body: Record<string, unknown> = { productId: pid, useWallet: false },
  ) {
    return handlers.create(req(body, headers));
  }
  async function buy() {
    const response = await create();
    assert(response.status === 200, await response.clone().text());
    return response.json();
  }
  function payment(
    o: any,
    status = "captured",
    patch: Record<string, unknown> = {},
  ) {
    const p = {
      id: "pay_fixture",
      order_id: o.razorpayOrderId,
      amount: 4900,
      currency: "INR",
      status,
      captured: status === "captured",
      created_at: Math.floor(Date.now() / 1000),
      amount_refunded: 0,
      ...patch,
    };
    payments.set(p.id, p);
    return p;
  }
  async function verify(
    o: any,
    p: any,
    headers: Record<string, string> = {},
    signature?: string,
  ) {
    return handlers.verify(req({
      internalOrderId: o.internalOrderId,
      razorpay_order_id: o.razorpayOrderId,
      razorpay_payment_id: p.id,
      razorpay_signature: signature ??
        await testHmac(keySecret, `${o.razorpayOrderId}|${p.id}`),
    }, headers));
  }
  async function hook(
    eventId: string,
    p: any,
    event = "payment.captured",
    secret = webhookSecret,
  ) {
    const raw = JSON.stringify({ event, payload: { payment: { entity: p } } });
    return handlers.webhook(
      new Request(NONPLAY_TEST_URL, {
        method: "POST",
        headers: {
          "x-razorpay-event-id": eventId,
          "x-razorpay-signature": await testHmac(secret, raw),
        },
        body: raw,
      }),
    );
  }
  return {
    db,
    handlers,
    req,
    create,
    buy,
    payment,
    verify,
    hook,
    remoteOrders,
    payments,
    configure: (patch: Record<string, string | undefined>) => overrides = patch,
    loseCreate: () => loseCreate = true,
    counts: () => ({ creates, gets }),
  };
}
const entCount = () =>
  sql(
    "select count(*) from public.nonplay_test_entitlements where revoked_at is null",
  );

Deno.test("nonplay configuration/package/profile/Auth/product guards fail before provider creation", async () => {
  const t = await setup();
  for (
    const patch of [
      { NONPLAY_TEST_CHECKOUT_ENABLED: undefined },
      { NONPLAY_TEST_CHECKOUT_ENABLED: "false" },
      { NONPLAY_TEST_ENVIRONMENT: "production" },
      { SUPABASE_URL: "https://other.invalid" },
      { NONPLAY_TEST_USER_IDS: other },
      { NONPLAY_TEST_PRODUCT_IDS: "" },
      { NONPLAY_TEST_RAZORPAY_KEY_ID: "rzp_live_fixture" },
      { NONPLAY_TEST_RAZORPAY_KEY_SECRET: "" },
      { NONPLAY_TEST_RAZORPAY_WEBHOOK_SECRET: "" },
    ]
  ) {
    t.configure(patch);
    assert((await t.create()).status === 403, JSON.stringify(patch));
  }
  t.configure({});
  for (
    const h of ([
      { "x-medveda-application-id": "in.medveda.app" },
      { "x-medveda-build-profile": "production" },
      { "x-medveda-test-environment": "" },
      { "x-medveda-app-version": "" },
    ] as Record<string, string>[])
  ) assert((await t.create(h)).status === 403);
  assert((await t.create({ authorization: "" })).status === 401);
  assert((await t.create({}, { productId: "seed_product" })).status === 400);
  assert((await t.create({}, { productId: pid, amount: 100 })).status === 400);
  assert(
    (await t.create({}, { productId: pid, useWallet: true })).status === 400,
  );
  assert((await t.create({ "idempotency-key": "" })).status === 400);
  await sql(`update public.nonplay_test_config set enabled=false`);
  assert((await t.create()).status === 403);
  await sql(
    `update public.nonplay_test_config set enabled=true;update auth.users set raw_app_meta_data='{}' where id=${
      literal(uid)
    }`,
  );
  assert((await t.create()).status === 403);
  assert(t.counts().creates === 0);
  await sql(
    `update auth.users set raw_app_meta_data='{"medveda_nonplay_test":true}' where id=${
      literal(uid)
    }`,
  );
});

Deno.test("one provider CREATE under concurrent requests; permanent receipt recovery after lost response", async () => {
  const t = await setup();
  const responses = await Promise.all([t.create(), t.create(), t.create()]);
  assert(t.counts().creates === 1, "duplicate provider CREATE");
  assert(responses.some((r) => r.status === 200));
  const retry = await t.buy();
  assert(t.counts().creates === 1);
  assert(retry.amountPaise === 4900);
  const other = await setup();
  other.loseCreate();
  assert((await other.create()).status === 503);
  assert(other.counts().creates === 1);
  assert((await other.create()).status === 200);
  assert(other.counts().creates === 1, "ambiguous CREATE repeated");
});

Deno.test("invalid ownership/signature/amount/currency/order/mode notes cannot create an entitlement", async () => {
  const t = await setup(), o = await t.buy(), p = t.payment(o);
  assert(
    (await t.verify(o, p, { authorization: `Bearer ${other}` })).status === 404,
  );
  assert((await t.verify(o, p, {}, "0".repeat(64))).status === 400);
  for (
    const patch of [
      { amount: 100 },
      { currency: "USD" },
      { order_id: "order_other" },
      { captured: false },
      { created_at: 0 },
    ]
  ) {
    const wrong = t.payment(o, "captured", patch);
    assert((await t.verify(o, wrong)).status === 503, JSON.stringify(patch));
  }
  t.payment(o);
  const remote = t.remoteOrders.get(o.razorpayOrderId);
  remote.notes.environment = "live";
  assert((await t.verify(o, p)).status === 503);
  assert(await entCount() === "0");
});

Deno.test("pending, failed and cancelled UI hints never grant; later authoritative capture recovers", async () => {
  const t = await setup(), o = await t.buy();
  let p = t.payment(o, "authorized"), r = await (await t.verify(o, p)).json();
  assert(!r.success && r.pending);
  p = t.payment(o, "failed");
  r = await (await t.verify(o, p)).json();
  assert(!r.success && r.pending === false);
  for (const checkoutState of ["cancelled", "failed", "pending"]) {
    assert(
      (await t.handlers.verify(
        t.req({ internalOrderId: o.internalOrderId, checkoutState }),
      )).status === 200,
    );
    assert(await entCount() === "0");
  }
  t.payment(o, "captured");
  r = await (await t.handlers.verify(
    t.req({ internalOrderId: o.internalOrderId, recover: true }),
  )).json();
  assert(r.success);
});

Deno.test("concurrent verification/callback/webhook replay grants exactly once and detects event identity conflict", async () => {
  const t = await setup(), o = await t.buy(), p = t.payment(o);
  const results = await Promise.all([
    t.verify(o, p),
    t.verify(o, p),
    t.hook("evt_concurrent", p),
    t.hook("evt_concurrent", p),
  ]);
  for (const r of results) assert(r.status === 200, await r.clone().text());
  assert(await entCount() === "1");
  assert(
    await sql("select count(*) from public.nonplay_test_attempts") === "1",
  );
  const before = t.counts().gets;
  assert((await t.hook("evt_concurrent", p)).status === 200);
  assert(t.counts().gets === before);
  assert(
    (await t.hook("evt_concurrent", { ...p, amount: 100 })).status === 409,
  );
  assert(
    (await t.hook(
      "evt_bad_signature",
      p,
      "payment.captured",
      "different-secret",
    )).status === 401,
  );
  t.payment(o, "refunded", { amount_refunded: 4900 });
  assert((await t.hook("evt_refund", p, "refund.processed")).status === 200);
  assert(await entCount() === "0");
  assert(
    !(await (await t.verify(o, t.payment(o))).json()).success,
    "stale capture regranted reversed entitlement",
  );
});

Deno.test("synthetic PDF access requires Auth/package/allowlists and captured entitlement; live PDF route never reached", async () => {
  const t = await setup();
  assert((await t.handlers.noteUrl(t.req({ noteId: nid }))).status === 403);
  assert(
    (await t.handlers.noteUrl(t.req({ noteId: "seed_note" }))).status === 400,
  );
  assert(
    (await t.handlers.noteUrl(
      t.req({ noteId: nid }, { "x-medveda-application-id": "in.medveda.app" }),
    )).status === 403,
  );
  const o = await t.buy();
  await t.verify(o, t.payment(o));
  assert((await t.handlers.noteUrl(t.req({ noteId: nid }))).status === 200);
  assert(t.db.signed[0] === "synthetic/fixture.pdf");
  assert(
    (await t.handlers.noteUrl(
      t.req({ noteId: nid }, { authorization: `Bearer ${other}` }),
    )).status === 403,
  );
  t.configure({
    NONPLAY_TEST_PRODUCT_IDS:
      "npt_product_d9510000-0000-4000-8000-000000000099",
  });
  assert((await t.handlers.noteUrl(t.req({ noteId: nid }))).status === 403);
});

Deno.test("test catalog/quote/history use synthetic records only; payment lane leaves live financial tables unchanged", async () => {
  const t = await setup();
  const fingerprint = async () =>
    sql(
      `select jsonb_build_object(${
        [
          "orders",
          "payments",
          "purchases",
          "products",
          "wallet_ledger",
          "referrals",
          "first_discount_reservations",
          "provider_events",
          "payment_captures",
        ].map((name) =>
          `'${name}',(select md5(coalesce(string_agg(to_jsonb(t)::text,'' order by to_jsonb(t)::text),'')) from public.${name} t)`
        ).join(",")
      })`,
    );
  const before = await fingerprint();
  const quote =
    await (await t.handlers.catalog(t.req({ action: "quote", productId: pid })))
      .json();
  assert(
    quote.amount === 49 && quote.walletAmount === 0 &&
      quote.referralDiscount === 0 && !quote.walletEligible,
  );
  const o = await t.buy();
  await t.verify(o, t.payment(o));
  const catalog = await (await t.handlers.catalog(t.req({ action: "catalog" })))
    .json();
  assert(
    catalog.products.length === 1 && catalog.purchases.length === 1 &&
      !JSON.stringify(catalog).includes("object_path"),
  );
  assert(catalog.chapters[0].id.startsWith("npt_chapter_"));
  assert(!catalog.notes[0].is_free_preview);
  assert((await fingerprint()) === before, "live financial tables changed");
  assert(
    await sql(
      `select public.user_can_access_note(${literal(uid)},'seed_note')`,
    ) === "f",
    "real paid Notes unlocked",
  );
});

Deno.test("capture/refund webhooks wait for authoritative provider state and retain retryable inbox records", async () => {
  const t = await setup(), o = await t.buy();
  const p = t.payment(o, "authorized");
  assert((await t.hook("evt_early_capture", p)).status === 503);
  assert(await entCount() === "0");
  assert(
    await sql(
      "select status from public.nonplay_test_webhooks where event_id='evt_early_capture'",
    ) === "failed",
  );
  t.payment(o, "captured");
  assert((await t.hook("evt_early_capture", p)).status === 200);
  assert(await entCount() === "1");
  assert(
    (await t.hook("evt_early_refund", p, "refund.processed")).status === 503,
  );
  t.payment(o, "refunded", { amount_refunded: 4900 });
  assert(
    (await t.hook("evt_early_refund", p, "refund.processed")).status === 200,
  );
  assert(await entCount() === "0");
});

Deno.test("expired test orders deny late payments but recover provider-confirmed payments started within the order lifetime", async () => {
  const t = await setup(), id = crypto.randomUUID();
  await sql(
    `insert into public.nonplay_test_orders(id,user_id,product_id,idempotency_key,key_id,amount_paise,title,status,razorpay_order_id,created_at,expires_at)
    values(${literal(id)},${literal(uid)},${literal(pid)},${
      literal(crypto.randomUUID())
    },'rzp_test_fixture',4900,'[TEST] Expired Notes','created','order_expiredfixture',now()-interval '31 minutes',now()-interval '1 minute');
    insert into public.nonplay_test_checkouts(order_id) values(${literal(id)})`,
  );
  const o = { internalOrderId: id, razorpayOrderId: "order_expiredfixture" };
  t.remoteOrders.set(o.razorpayOrderId, {
    id: o.razorpayOrderId,
    amount: 4900,
    currency: "INR",
    status: "paid",
    receipt: `npt_${id}`,
    notes: {
      environment: NONPLAY_TEST_ENVIRONMENT,
      user_id: uid,
      product_id: pid,
      order_id: id,
    },
  });
  const late = t.payment(o, "captured", { id: "pay_latefixture" });
  const result = await (await t.verify(o, late)).json();
  assert(!result.success && result.pending === false);
  assert(await entCount() === "0");
  const timely = t.payment(o, "captured", {
    id: "pay_timelyfixture",
    created_at: Math.floor(Date.now() / 1000) - 120,
  });
  assert((await (await t.verify(o, timely)).json()).success);
  assert(await entCount() === "1");
});

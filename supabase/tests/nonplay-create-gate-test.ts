// Real handlers/config/provider, synthetic Auth/database/HTTP. No network or env access.
import { createNonplayTestHandlers } from "../functions/_shared/nonplayTestHandlers.ts";
import {
  NONPLAY_TEST_ENVIRONMENT,
  NONPLAY_TEST_URL,
} from "../functions/_shared/nonplayTestConfig.ts";
import { testHmac } from "../functions/_shared/nonplayTestProvider.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";

const uid = "d9510000-0000-4000-8000-000000000001";
const pid = "npt_product_d9510000-0000-4000-8000-000000000010";
const oid = "d9510000-0000-4000-8000-000000000020";
function assert(ok: unknown, message: string) {
  if (!ok) throw new Error(message);
}
function fixture(value: string | undefined, unavailable = false) {
  const env: Record<string, string | undefined> = {
    SUPABASE_URL: NONPLAY_TEST_URL,
    NONPLAY_TEST_ENVIRONMENT,
    NONPLAY_TEST_CHECKOUT_ENABLED: "true",
    NONPLAY_TEST_NEW_ORDERS_ENABLED: value,
    NONPLAY_TEST_RAZORPAY_KEY_ID: "rzp_test_fixture",
    NONPLAY_TEST_RAZORPAY_KEY_SECRET: "fixture_test_key_secret_12345678",
    NONPLAY_TEST_RAZORPAY_WEBHOOK_SECRET:
      "fixture_test_webhook_secret_1234567890",
    NONPLAY_TEST_USER_IDS: uid,
    NONPLAY_TEST_PRODUCT_IDS: pid,
  };
  const counts = { body: 0, rpc: 0, provider: 0, production: 0 };
  const order = {
    id: oid,
    user_id: uid,
    product_id: pid,
    amount_paise: 4900,
    key_id: "rzp_test_fixture",
    title: "[TEST] Notes",
    status: "pending",
    expires_at: new Date(Date.now() + 600000).toISOString(),
    razorpay_order_id: null,
  };
  let remote: Record<string, unknown> = {};
  let paymentStatus = "captured";
  let gateUnavailable = unavailable;
  const inbox = new Map<string, Record<string, unknown>>();
  const db = {
    from(table: string) {
      if (table === "nonplay_test_orders") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: order, error: null }),
              }),
              maybeSingle: async () => ({ data: order, error: null }),
            }),
          }),
        };
      }
      if (table === "nonplay_test_webhooks") {
        return {
          upsert: async (row: Record<string, unknown>) => {
            const id = String(row.event_id);
            if (!inbox.has(id)) inbox.set(id, { ...row, status: "pending" });
            return { error: null };
          },
          select: () => ({
            eq: (_key: string, id: string) => ({
              single: async () => ({ data: inbox.get(id), error: null }),
            }),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: (_key: string, id: string) => {
              Object.assign(inbox.get(id)!, patch);
              return Promise.resolve({ error: null });
            },
          }),
        };
      }
      counts.production++;
      assert(table === "purchase_settings", "unexpected table access");
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { new_orders_enabled: false },
              error: null,
            }),
          }),
        }),
      };
    },
    async rpc(name: string, args: Record<string, unknown>) {
      counts.rpc++;
      assert(name.startsWith("nonplay_test_"), "production RPC reached");
      switch (name) {
        case "nonplay_test_user_allowed":
        case "nonplay_test_product_allowed":
          return { data: true, error: null };
        case "nonplay_test_observe_payment":
          assert(
            args.p_order === oid && args.p_payment === "pay_fixture",
            "payment binding",
          );
          return {
            data: { success: args.p_status === "captured", pending: false },
            error: null,
          };
        case "nonplay_test_prepare_order":
          assert(
            args.p_user === uid && args.p_product === pid,
            "reservation binding",
          );
          return { data: { ...order, claimed: true }, error: null };
        case "nonplay_test_attach_order":
          assert(
            args.p_order === oid && args.p_provider === "order_fixture",
            "attach binding",
          );
          Object.assign(order, { razorpay_order_id: "order_fixture" });
          return { data: order, error: null };
        default:
          throw new Error("unexpected RPC");
      }
    },
  };
  const handlers = createNonplayTestHandlers({
    db: db as unknown as SupabaseClient,
    authenticate: async () => ({ id: uid }),
    env: (key) => {
      if (gateUnavailable && key === "NONPLAY_TEST_NEW_ORDERS_ENABLED") {
        throw new Error("unavailable");
      }
      return env[key];
    },
    fetcher: async (input, init) => {
      counts.provider++;
      const path = String(input).split("/v1/")[1];
      const payment = {
        id: "pay_fixture",
        order_id: "order_fixture",
        amount: 4900,
        currency: "INR",
        status: paymentStatus,
        captured: paymentStatus === "captured",
        amount_refunded: paymentStatus === "refunded" ? 4900 : 0,
        created_at: Math.floor(Date.now() / 1000),
      };
      if (path === "orders/order_fixture") return Response.json(remote);
      if (path === "payments/pay_fixture") return Response.json(payment);
      if (path === "orders/order_fixture/payments") {
        return Response.json({ items: [payment] });
      }
      assert(init?.method === "POST", "unexpected provider request");
      const body = JSON.parse(String(init?.body));
      assert(body.amount === 4900 && body.currency === "INR", "server pricing");
      remote = { ...body, id: "order_fixture", status: "created" };
      return Response.json(remote);
    },
  });
  function request(
    body = JSON.stringify({ productId: pid, useWallet: false }),
  ) {
    const req = new Request(NONPLAY_TEST_URL, {
      method: "POST",
      headers: {
        "x-medveda-application-id": "in.medveda.razorpaytest",
        "x-medveda-build-profile": "razorpay-internal-test",
        "x-medveda-app-version": "1.2.2",
        "x-medveda-test-environment": NONPLAY_TEST_ENVIRONMENT,
        "idempotency-key": crypto.randomUUID(),
      },
      body,
    });
    const original = req.text.bind(req);
    req.text = () => {
      counts.body++;
      return original();
    };
    return req;
  }
  return {
    handlers,
    counts,
    request,
    disable: (value: string | undefined, unavailable = false) => {
      env.NONPLAY_TEST_NEW_ORDERS_ENABLED = value;
      gateUnavailable = unavailable;
    },
    refund: () => {
      paymentStatus = "refunded";
    },
  };
}

Deno.test("isolated create succeeds with shared production sales disabled and never reads production tables", async () => {
  const t = fixture("true");
  const response = await t.handlers.create(t.request());
  assert(response.status === 200, await response.clone().text());
  const result = await response.json();
  assert(
    result.amountPaise === 4900 && result.isLiveMode === false,
    "test-only server price",
  );
  assert(
    t.counts.provider === 1 && t.counts.production === 0,
    "isolated provider work only",
  );
});

for (
  const value of [
    undefined,
    "false",
    "",
    "TRUE",
    "True",
    " true",
    "true ",
    "1",
    "yes",
    "null",
  ]
) {
  Deno.test(`dedicated create gate ${JSON.stringify(value)} denies before all body/database/provider work`, async () => {
    const t = fixture(value);
    const response = await t.handlers.create(t.request("invalid JSON"));
    assert(
      response.status === 403,
      `expected gate refusal, got ${response.status}`,
    );
    assert(
      (await response.json()).code === "sales_disabled",
      "stable create refusal code",
    );
    assert(
      Object.values(t.counts).every((n) => n === 0),
      "disabled create performed work",
    );
  });
}
Deno.test("unavailable dedicated create gate fails closed before body/database/provider work", async () => {
  const t = fixture("true", true);
  const response = await t.handlers.create(t.request());
  assert(response.status === 403, "unavailable gate must refuse creation");
  assert(
    Object.values(t.counts).every((n) => n === 0),
    "unavailable gate performed work",
  );
});

for (const gate of [undefined, "false", "TRUE", " true ", "unavailable"]) {
  Deno.test(`create gate ${String(gate)} leaves existing verification/recovery/refund routes available`, async () => {
    const t = fixture("true");
    assert(
      (await t.handlers.create(t.request())).status === 200,
      "setup creation failed",
    );
    t.disable(gate, gate === "unavailable");
    assert(
      (await t.handlers.create(t.request())).status === 403,
      "creation not disabled",
    );
    const payload = {
      internalOrderId: oid,
      razorpay_order_id: "order_fixture",
      razorpay_payment_id: "pay_fixture",
      razorpay_signature: await testHmac(
        "fixture_test_key_secret_12345678",
        "order_fixture|pay_fixture",
      ),
    };
    const verify = await t.handlers.verify(t.request(JSON.stringify(payload)));
    assert(
      verify.status === 200 && (await verify.json()).success,
      "existing verification gated",
    );
    const recovery = await t.handlers.verify(
      t.request(JSON.stringify({ internalOrderId: oid, recover: true })),
    );
    assert(
      recovery.status === 200 && (await recovery.json()).success,
      "existing recovery gated",
    );
    t.refund();
    const raw = JSON.stringify({
      event: "refund.processed",
      payload: {
        payment: {
          entity: { id: "pay_fixture", order_id: "order_fixture" },
        },
      },
    });
    const hook = new Request(NONPLAY_TEST_URL, {
      method: "POST",
      body: raw,
      headers: {
        "x-razorpay-event-id": "evt_fixture",
        "x-razorpay-signature": await testHmac(
          "fixture_test_webhook_secret_1234567890",
          raw,
        ),
      },
    });
    const response = await t.handlers.webhook(hook);
    assert(
      response.status === 200 && (await response.json()).received,
      "existing refund gated",
    );
    assert(t.counts.production === 0, "production table reached");
  });
}

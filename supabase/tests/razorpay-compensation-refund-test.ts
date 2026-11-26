import { recoverCompensationRefund } from "../functions/_shared/razorpayCompensation.ts";
const input = {
  payment_id: "pay_fixture",
  razorpay_order_id: "order_fixture",
  amount_paise: 4900,
  refund_request_id: "medveda_comp_fixture",
  provider_refund_id: null,
  not_before: "2026-01-01T00:00:00.000Z",
};
const refund = {
  id: "rfnd_fixture",
  payment_id: input.payment_id,
  amount: 4900,
  currency: "INR",
  status: "processed",
  created_at: 1700000000,
  notes: { medveda_refund_request_id: input.refund_request_id },
};
function assert(ok: unknown, message = "assertion failed"): asserts ok {
  if (!ok) throw Error(message);
}
Deno.test("compensation: durable dispatch fence reconciles lost response and never posts twice", async () => {
  let dispatched = false, visible = false, posts = 0;
  const saved = globalThis.fetch;
  Deno.env.set("APP_ENV", "staging");
  Deno.env.set("RAZORPAY_KEY_ID", "rzp_test_fixture");
  Deno.env.set("RAZORPAY_KEY_SECRET", "fixture");
  globalThis.fetch = (url) => {
    if (String(url).includes("/refunds?")) {
      return Promise.resolve(Response.json({ items: visible ? [refund] : [] }));
    }
    if (String(url).endsWith("/refund")) {
      posts++;
      throw Error("lost provider response");
    }
    if (String(url).includes("/orders/")) {
      return Promise.resolve(
        Response.json({
          id: input.razorpay_order_id,
          amount: 4900,
          currency: "INR",
        }),
      );
    }
    return Promise.resolve(
      Response.json({
        id: input.payment_id,
        order_id: input.razorpay_order_id,
        amount: 4900,
        amount_refunded: 0,
        currency: "INR",
        status: "captured",
        created_at: 1795000000,
      }),
    );
  };
  const fence = () => {
    if (dispatched) return Promise.resolve(false);
    dispatched = true;
    return Promise.resolve(true);
  };
  try {
    await recoverCompensationRefund(input, fence).then(() => {
      throw Error("expected failure");
    }, () => {});
    await recoverCompensationRefund(input, fence).then(() => {
      throw Error("expected fence rejection");
    }, () => {});
    assert(posts === 1, "ambiguous response caused another refund");
    visible = true;
    assert((await recoverCompensationRefund(input, fence)).id === refund.id);
    assert(posts === 1);
  } finally {
    globalThis.fetch = saved;
    for (const name of ["APP_ENV", "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"]) {
      Deno.env.delete(name);
    }
  }
});
Deno.test("compensation: ownership, currency, pending refunds and truncated pages fail closed", async () => {
  const saved = globalThis.fetch;
  let fences = 0, posts = 0;
  Deno.env.set("APP_ENV", "staging");
  Deno.env.set("RAZORPAY_KEY_ID", "rzp_test_fixture");
  Deno.env.set("RAZORPAY_KEY_SECRET", "fixture");
  try {
    for (
      const mode of [
        "foreign-payment",
        "foreign-order",
        "currency",
        "pending",
        "unmatched",
        "truncated",
        "malformed",
        "foreign-refund",
        "historical",
      ]
    ) {
      globalThis.fetch = (url, init) => {
        if (init?.method === "POST") {
          posts++;
          return Promise.resolve(Response.json(refund));
        }
        if (String(url).includes("/refunds?")) {
          return Promise.resolve(Response.json(
            mode === "malformed" ? {} : {
              items: mode === "truncated"
                ? Array(100).fill({ ...refund, notes: {} })
                : mode === "pending"
                ? [{ ...refund, status: "pending" }]
                : mode === "foreign-refund"
                ? [{ ...refund, payment_id: "pay_foreign" }]
                : [],
            },
          ));
        }
        if (String(url).includes("/orders/")) {
          return Promise.resolve(Response.json({
            id: mode === "foreign-order"
              ? "order_foreign"
              : input.razorpay_order_id,
            amount: 4900,
            currency: "INR",
          }));
        }
        return Promise.resolve(
          Response.json({
            id: mode === "foreign-payment" ? "pay_foreign" : input.payment_id,
            order_id: input.razorpay_order_id,
            amount: 4900,
            amount_refunded: mode === "unmatched" ? 1 : 0,
            currency: mode === "currency" ? "USD" : "INR",
            status: "captured",
            created_at: mode === "historical" ? 1700000000 : 1795000000,
          }),
        );
      };
      let rejected = false;
      try {
        await recoverCompensationRefund(input, () => {
          fences++;
          return Promise.resolve(true);
        });
      } catch {
        rejected = true;
      }
      assert(rejected, mode + " accepted");
    }
    assert(
      fences === 0 && posts === 0,
      "unsafe fixture reached refund dispatch",
    );
  } finally {
    globalThis.fetch = saved;
    for (const name of ["APP_ENV", "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"]) {
      Deno.env.delete(name);
    }
  }
});

Deno.test("compensation: validated provider completion and known refund recovery", async () => {
  const savedFetch = globalThis.fetch;
  const names = ["APP_ENV", "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"];
  const savedEnv = names.map((name) => Deno.env.get(name));
  Deno.env.set("APP_ENV", "staging");
  Deno.env.set("RAZORPAY_KEY_ID", "rzp_test_fixture");
  Deno.env.set("RAZORPAY_KEY_SECRET", "fixture");
  let posts = 0;
  let fences = 0;
  globalThis.fetch = (url, init) => {
    if (init?.method === "POST") {
      posts++;
      const body = JSON.parse(String(init.body));
      assert(body.amount === input.amount_paise);
      assert(body.notes.medveda_refund_request_id === input.refund_request_id);
      return Promise.resolve(Response.json(refund));
    }
    if (String(url).endsWith("/refunds/rfnd_fixture")) {
      return Promise.resolve(Response.json(refund));
    }
    if (String(url).includes("/refunds?")) {
      return Promise.resolve(Response.json({ items: [] }));
    }
    if (String(url).includes("/orders/")) {
      return Promise.resolve(
        Response.json({
          id: input.razorpay_order_id,
          amount: 4900,
          currency: "INR",
        }),
      );
    }
    return Promise.resolve(
      Response.json({
        id: input.payment_id,
        order_id: input.razorpay_order_id,
        amount: 4900,
        amount_refunded: 0,
        currency: "INR",
        status: "captured",
        created_at: 1795000000,
      }),
    );
  };
  const fence = () => {
    fences++;
    return Promise.resolve(true);
  };
  try {
    assert((await recoverCompensationRefund(input, fence)).id === refund.id);
    assert(
      (await recoverCompensationRefund({
        ...input,
        provider_refund_id: refund.id,
      }, fence)).id === refund.id,
    );
    assert(
      posts === 1 && fences === 1,
      "known refund recovery dispatched again",
    );
  } finally {
    globalThis.fetch = savedFetch;
    names.forEach((name, i) =>
      savedEnv[i] === undefined
        ? Deno.env.delete(name)
        : Deno.env.set(name, savedEnv[i]!)
    );
  }
});

import {
  NONPLAY_TEST_ENVIRONMENT,
  type TestConfig,
} from "./nonplayTestConfig.ts";

export type TestOrder = {
  id: string;
  user_id: string;
  product_id: string;
  amount_paise: number;
  key_id: string;
  title: string;
  status: string;
  expires_at: string;
  razorpay_order_id: string | null;
};
export type ProviderOrder = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt: string;
  notes: Record<string, string>;
};
export type ProviderPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: number;
  captured?: boolean;
  amount_refunded?: number;
};

export async function testHmac(secret: string, input: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return Array.from(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function testSignature(
  secret: string,
  input: string,
  signature: unknown,
): Promise<boolean> {
  if (typeof signature !== "string" || !/^[0-9a-f]{64}$/i.test(signature)) {
    return false;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const bytes = Uint8Array.from(
    signature.match(/../g)!,
    (s) => parseInt(s, 16),
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    bytes,
    new TextEncoder().encode(input),
  );
}

export function testProvider(
  config: TestConfig,
  fetcher: typeof fetch = fetch,
) {
  // No caller-controlled hosts, modes, paths or credentials. A live resource is
  // inaccessible under this dedicated rzp_test_ credential pair.
  async function api<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetcher(`https://api.razorpay.com/v1/${path}`, {
      method: body === undefined ? "GET" : "POST",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: "Basic " + btoa(`${config.keyId}:${config.keySecret}`),
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw new Error("Test provider request unavailable");
    return await response.json() as T;
  }
  const notes = (o: TestOrder) => ({
    environment: NONPLAY_TEST_ENVIRONMENT,
    user_id: o.user_id,
    product_id: o.product_id,
    order_id: o.id,
  });
  function validateOrder(provider: ProviderOrder, o: TestOrder): ProviderOrder {
    if (
      !provider || !/^order_[A-Za-z0-9]+$/.test(provider.id) ||
      provider.amount !== o.amount_paise ||
      provider.currency !== "INR" ||
      !["created", "attempted", "paid"].includes(provider.status) ||
      provider.receipt !== `npt_${o.id}` ||
      Object.entries(notes(o)).some(([k, v]) => provider.notes?.[k] !== v) ||
      (o.razorpay_order_id && provider.id !== o.razorpay_order_id) ||
      o.key_id !== config.keyId
    ) {
      throw new Error("Provider order does not match test snapshot");
    }
    return provider;
  }
  return {
    validateOrder,
    async create(o: TestOrder) {
      return validateOrder(
        await api<ProviderOrder>("orders", {
          amount: o.amount_paise,
          currency: "INR",
          receipt: `npt_${o.id}`,
          notes: notes(o),
        }),
        o,
      );
    },
    async find(o: TestOrder) {
      const result = await api<{ items: ProviderOrder[] }>(
        `orders?receipt=${encodeURIComponent(`npt_${o.id}`)}&count=100`,
      );
      if (!Array.isArray(result.items) || result.items.length >= 100) {
        throw new Error("Ambiguous test order lookup");
      }
      const matches = result.items.filter((r) => r.receipt === `npt_${o.id}`);
      if (matches.length > 1) throw new Error("Conflicting test orders");
      return matches.length ? validateOrder(matches[0], o) : null;
    },
    async order(o: TestOrder) {
      if (
        !o.razorpay_order_id ||
        !/^order_[A-Za-z0-9]+$/.test(o.razorpay_order_id)
      ) throw new Error("Missing test order");
      return validateOrder(
        await api<ProviderOrder>(`orders/${o.razorpay_order_id}`),
        o,
      );
    },
    async payment(id: string, o: TestOrder) {
      if (!/^pay_[A-Za-z0-9]+$/.test(id)) {
        throw new Error("Invalid payment identity");
      }
      const p = await api<ProviderPayment>(`payments/${id}`);
      if (
        p.id !== id || p.order_id !== o.razorpay_order_id ||
        p.amount !== o.amount_paise || p.currency !== "INR" ||
        !["created", "authorized", "captured", "failed", "refunded"].includes(
          p.status,
        ) ||
        !Number.isSafeInteger(p.created_at) || p.created_at <= 0 ||
        (p.status === "captured" && p.captured !== true) ||
        (p.amount_refunded !== undefined &&
          (!Number.isSafeInteger(p.amount_refunded) || p.amount_refunded < 0 ||
            p.amount_refunded > p.amount))
      ) {
        throw new Error("Provider payment does not match test snapshot");
      }
      return p;
    },
    async payments(o: TestOrder) {
      const result = await api<{ items: ProviderPayment[] }>(
        `orders/${o.razorpay_order_id}/payments`,
      );
      if (
        !Array.isArray(result.items) || result.items.length >= 100 ||
        result.items.some((p) => !/^pay_[A-Za-z0-9]+$/.test(p.id))
      ) {
        throw new Error("Ambiguous test payment lookup");
      }
      return result.items;
    },
  };
}

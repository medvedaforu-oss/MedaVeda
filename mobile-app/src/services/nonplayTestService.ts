import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import { supabase } from "../config/supabase";
import { isNonplayTestBuild, paymentProvider } from "../config/paymentProvider";
import type { CheckoutData, VerifyResult } from "./paymentService";
import { toCamelCase } from "../utils/caseConvert";
import type { Product } from "../types/product";
import type { Chapter } from "../types/chapter";
import type { Note } from "../types/note";
import type { OrderQuote } from "../types/referral";

const BASE = "https://xbvenkfmesugrbjuufyw.supabase.co";
export const TEST_VERIFY_URL =
  `${BASE}/functions/v1/verify-payment-nonplay-test`;
const ENVIRONMENT = "production-isolated-razorpay-test-v1";
type Route =
  | "create-order-nonplay-test"
  | "verify-payment-nonplay-test"
  | "nonplay-test-catalog"
  | "get-note-url-nonplay-test";
const creates = new Map<string, Promise<CheckoutData>>();
const catalogs = new Map<string, Promise<TestCatalog>>();
export type TestCatalog = {
  products: Product[];
  chapters: Chapter[];
  notes: Note[];
  purchases: any[];
};
export const EMPTY_TEST_CATALOG: TestCatalog = {
  products: [],
  chapters: [],
  notes: [],
  purchases: [],
};

async function session() {
  if (
    !isNonplayTestBuild || paymentProvider !== "razorpay" ||
    process.env.EXPO_PUBLIC_SUPABASE_URL !== BASE
  ) {
    throw new Error("Test checkout is unavailable in this build.");
  }
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user?.id || !data.session.access_token) {
    throw new Error("Please log in.");
  }
  return data.session;
}
async function request(
  route: Route,
  body: Record<string, unknown>,
  expectedUser?: string,
  key?: string,
) {
  const current = await session();
  if (expectedUser && current.user.id !== expectedUser) {
    throw new Error("The signed-in account changed.");
  }
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 35000);
  try {
    const res = await fetch(`${BASE}/functions/v1/${route}`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${current.access_token}`,
        "x-medveda-application-id": Application.applicationId ?? "",
        "x-medveda-app-version": Application.nativeApplicationVersion ?? "",
        "x-medveda-build-profile": "razorpay-internal-test",
        "x-medveda-test-environment": ENVIRONMENT,
        ...(key ? { "idempotency-key": key } : {}),
      },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    if ((await session()).user.id !== current.user.id) {
      throw new Error("The signed-in account changed.");
    }
    if (!res.ok) {
      const error = new Error(result?.error ?? "Test operation unavailable.") as
        & Error
        & { code?: string };
      error.code = result?.code;
      throw error;
    }
    return result;
  } finally {
    clearTimeout(timer);
  }
}
function uuid() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const s = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${
    s.slice(16, 20)
  }-${s.slice(20)}`;
}
export async function createTestOrder(
  productId: string,
): Promise<CheckoutData> {
  if (!/^npt_product_[0-9a-f-]{36}$/.test(productId)) {
    throw new Error("Only synthetic Notes can use test checkout.");
  }
  const uid = (await session()).user.id, slot = `${uid}:${productId}`;
  const existing = creates.get(slot);
  if (existing) return existing;
  const work = (async () => {
    // Persist before sending. A timeout/process death keeps the same owner-bound
    // idempotency key; server claims also coalesce different-device/tap keys.
    const storageKey = `nonplay-test-order-v1:${slot}`;
    let key = await AsyncStorage.getItem(storageKey);
    if (!key || !/^[0-9a-f-]{36}$/.test(key)) {
      key = uuid();
      await AsyncStorage.setItem(storageKey, key);
    }
    let result;
    try {
      result = await request(
        "create-order-nonplay-test",
        { productId, useWallet: false },
        uid,
        key,
      );
    } catch (e) {
      if ((e as { code?: string }).code === "test_checkout_expired") {
        await AsyncStorage.removeItem(storageKey);
      }
      throw e;
    }
    if (
      !result || !/^rzp_test_[A-Za-z0-9]+$/.test(result.keyId) ||
      result.isLiveMode !== false ||
      result.verifyUrl !== TEST_VERIFY_URL ||
      !/^order_[A-Za-z0-9]+$/.test(result.razorpayOrderId) ||
      !/^[0-9a-f-]{36}$/.test(result.internalOrderId) ||
      !Number.isSafeInteger(result.amountPaise) || result.amountPaise < 100 ||
      typeof result.productTitle !== "string" ||
      !result.productTitle.startsWith("[TEST] ")
    ) throw new Error("Invalid test checkout order.");
    return result as CheckoutData;
  })();
  creates.set(slot, work);
  try {
    return await work;
  } finally {
    creates.delete(slot);
  }
}
export async function verifyTestPayment(
  url: string,
  payload: Record<string, unknown>,
): Promise<VerifyResult> {
  if (url !== TEST_VERIFY_URL) {
    throw new Error("Invalid payment verification endpoint.");
  }
  return request("verify-payment-nonplay-test", payload);
}
export async function testCheckoutState(
  orderId: string,
  state: "cancelled" | "failed" | "pending",
) {
  return request("verify-payment-nonplay-test", {
    internalOrderId: orderId,
    checkoutState: state,
  });
}
export async function testQuote(
  productId: string,
  useWallet: boolean,
): Promise<OrderQuote> {
  return request("nonplay-test-catalog", {
    action: "quote",
    productId,
    useWallet,
  });
}
export async function testCatalog(): Promise<TestCatalog> {
  const uid = (await session()).user.id;
  const old = catalogs.get(uid);
  if (old) return old;
  const work = (async () => {
    const data = await request(
      "nonplay-test-catalog",
      { action: "catalog" },
      uid,
    );
    if (
      !["products", "chapters", "notes", "purchases"].every((k) =>
        Array.isArray(data?.[k])
      )
    ) throw new Error("Invalid test catalog.");
    return {
      products: data.products.map((r: Record<string, unknown>) =>
        toCamelCase<Product>(r)
      ),
      chapters: data.chapters.map((r: Record<string, unknown>) =>
        toCamelCase<Chapter>(r)
      ),
      notes: data.notes.map((r: Record<string, unknown>) =>
        toCamelCase<Note>(r)
      ),
      purchases: data.purchases.map((r: Record<string, unknown>) =>
        toCamelCase(r)
      ),
    };
  })();
  catalogs.set(uid, work);
  try {
    return await work;
  } finally {
    catalogs.delete(uid);
  }
}
export async function testNoteUrl(noteId: string): Promise<string> {
  if (!/^npt_note_[0-9a-f-]{36}$/.test(noteId)) {
    throw new Error("Invalid synthetic note.");
  }
  const result = await request("get-note-url-nonplay-test", { noteId });
  if (
    typeof result.url !== "string" ||
    !result.url.startsWith(
      `${BASE}/storage/v1/object/sign/nonplay-test-notes/synthetic/`,
    )
  ) throw new Error("Invalid synthetic Notes URL.");
  return result.url;
}
export async function confirmedTestPurchase(
  orderId: string,
): Promise<{ title: string; amount: number; orderId: string } | null> {
  const purchase = (await testCatalog()).purchases.find((p) =>
    p.orderId === orderId && p.status === "success"
  );
  return purchase && typeof purchase.amount === "number"
    ? { title: purchase.productTitle, amount: purchase.amount, orderId }
    : null;
}
const recoveries = new Map<string, Promise<boolean>>();
export async function recoverTestPayments(): Promise<boolean> {
  const uid = (await session()).user.id;
  const previous = recoveries.get(uid);
  if (previous) return previous;
  const recovery = (async () => {
    const { orders } = await request("nonplay-test-catalog", {
      action: "pending",
    }, uid);
    if (!Array.isArray(orders)) throw new Error("Invalid test attempts.");
    const results = await Promise.allSettled(
      orders.map((o) =>
        request("verify-payment-nonplay-test", {
          internalOrderId: o.id,
          recover: true,
        }, uid)
      ),
    );
    return (await session()).user.id === uid &&
      results.some((r) => r.status === "fulfilled" && r.value.success === true);
  })();
  recoveries.set(uid, recovery);
  try {
    return await recovery;
  } finally {
    recoveries.delete(uid);
  }
}

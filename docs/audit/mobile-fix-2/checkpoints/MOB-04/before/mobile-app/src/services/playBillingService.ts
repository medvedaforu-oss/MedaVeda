import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Application from "expo-application";
import { sha256 } from "js-sha256";
import type { Purchase, PurchaseAndroid } from "expo-iap";

import { supabase } from "../config/supabase";
import { getOrdersByUser } from "../repositories/ordersRepository";
import { Order } from "../types/order";
import { selectStandardPlayOffer } from "./playOfferSelection";
import { userChoiceBillingEnabled } from "../config/paymentProvider";

const projectUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const attemptKey = (userId: string) => `medveda:play-attempt:${userId}`;

const BILLING_HTTP_TIMEOUT_MS = 15000;
class BillingTimeoutError extends Error {}

// MV007: retain the library for required user-choice APIs and historical
// receipt recovery. Standalone Google Play sales are no longer supported.
// Recovery intentionally does not use this gate: an old receipt can be paid.
function assertUserChoicePurchase(): void {
  if (!userChoiceBillingEnabled) {
    throw new Error("Standalone Google Play purchases are unavailable. Required alternative-billing integration is pending policy verification.");
  }
}

// Native billing calls cannot be cancelled. Stop awaiting them so a later
// restore can retry; no continuation after a timed-out read processes receipts.
async function withBillingDeadline<T>(operation: PromiseLike<T>, message = "Purchase recovery timed out. Please retry."): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new BillingTimeoutError(
        message
      )), BILLING_HTTP_TIMEOUT_MS);
    })]);
  } finally {
    clearTimeout(timer);
  }
}

class BillingApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export interface PlayOrder {
  internalOrderId: string;
  playSku: string;
  amountInr: number;
  purchaseOptionId: string;
}

export interface PlayAttempt extends Omit<PlayOrder, "amountInr" | "purchaseOptionId"> {
  userId: string;
  productId: string;
  productTitle: string;
  externalTransactionToken?: string;
  choiceContext?: { buyerState: string; useWallet: boolean };
}

export interface PlayVerifyResult {
  success: boolean;
  pending?: boolean;
  internalOrderId?: string;
  amount?: number;
  productTitle?: string;
  message?: string;
}

export type PlayBillingEvent =
  | { type: "alternative"; attempt: PlayAttempt }
  | { type: "success"; attempt: PlayAttempt; result: PlayVerifyResult }
  | { type: "pending"; attempt: PlayAttempt }
  | { type: "cancel"; attempt: PlayAttempt }
  | { type: "error"; attempt: PlayAttempt; message: string };

type Listener = (event: PlayBillingEvent) => void;
const listeners = new Set<Listener>();
const inFlightTokens = new Set<string>();
let activeAttempt: PlayAttempt | null = null;
let connection: Promise<typeof import("expo-iap")> | null = null;
const choiceInFlight = new Set<string>();
const seenChoiceTokens = new Set<string>();
let launching = false;

function emit(event: PlayBillingEvent): void {
  listeners.forEach((listener) => listener(event));
}

function isAndroidPurchase(purchase: Purchase): purchase is PurchaseAndroid {
  return purchase.platform === "android";
}

export function subscribePlayBilling(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function obfuscatedPlayId(value: string): string {
  return sha256(value);
}

async function authenticatedPost<T>(name: string, payload: Record<string, string>, expectedUserId?: string): Promise<T> {
  const { data } = await withBillingDeadline(supabase.auth.getSession());
  if (!data.session?.access_token) throw new Error("Please log in before purchasing.");
  if (expectedUserId && data.session.user.id !== expectedUserId)
    throw new Error("The signed-in account changed. Please check purchases again.");
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      // Reject first so even a fetch adapter that reports a generic abort error
      // is classified as a recoverable timeout. Cover response body reads too.
      reject(new BillingTimeoutError("Purchase confirmation timed out. Please retry."));
      controller.abort();
    }, BILLING_HTTP_TIMEOUT_MS);
  });
  try {
    return await Promise.race([(async () => {
      const response = await fetch(`${projectUrl}/functions/v1/${name}`, {
        signal: controller.signal,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
          "x-medveda-app-version": Application.nativeApplicationVersion ?? "",
          "x-medveda-application-id": Application.applicationId ?? "",
        },
        body: JSON.stringify(payload),
      });
      const body: unknown = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = typeof body === "object" && body !== null && "error" in body
          ? String(body.error)
          : "Could not confirm the purchase.";
        throw new BillingApiError(message, response.status);
      }
      return body as T;
    })(), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

export async function createPlayOrder(productId: string, expectedUserId?: string): Promise<PlayOrder> {
  assertUserChoicePurchase();
  try {
    return await authenticatedPost<PlayOrder>("create-play-order", { productId }, expectedUserId);
  } catch (error) {
    if (error instanceof BillingApiError && error.message === "price_tier_failed")
      throw new Error("Google Play checkout is unavailable for this item. Please contact MedVeda support. No new payment was started.");
    if (error instanceof BillingApiError && error.message === "price_tier_pending")
      throw new Error("Google Play checkout is being prepared for this price. Please try again shortly.");
    throw error;
  }
}

export async function verifyPlayPurchase(
  attempt: PlayAttempt,
  purchaseToken: string
): Promise<PlayVerifyResult> {
  try {
    return await authenticatedPost<PlayVerifyResult>("verify-play-purchase", {
      purchaseToken,
      productId: attempt.productId,
      internalOrderId: attempt.internalOrderId,
    }, attempt.userId);
  } catch (error) {
    if (error instanceof BillingTimeoutError) return { success: false, pending: true };
    throw error;
  }
}

export async function attachExternalToken(
  attempt: PlayAttempt,
  externalTransactionToken: string
): Promise<void> {
  const result = await authenticatedPost<{ ok: boolean }>("attach-external-token", {
    internalOrderId: attempt.internalOrderId,
    externalTransactionToken,
  }, attempt.userId);
  if (result.ok !== true) throw new Error("Could not attach the alternative payment token.");
}

async function saveAttempt(attempt: PlayAttempt): Promise<void> {
  activeAttempt = attempt;
  await AsyncStorage.setItem(attemptKey(attempt.userId), JSON.stringify(attempt));
}

export async function saveAlternativeContext(attempt: PlayAttempt, buyerState: string, useWallet: boolean): Promise<void> {
  const { data } = await withBillingDeadline(supabase.auth.getSession());
  if (data.session?.user.id !== attempt.userId) throw new Error("The signed-in account changed.");
  await saveAttempt({ ...attempt, choiceContext: { buyerState, useWallet } });
}

export async function finishAlternativeChoice(attempt: PlayAttempt): Promise<void> {
  await clearAttempt(attempt);
}

export async function resumeAlternativeChoice(productId: string): Promise<PlayAttempt | null> {
  if (!userChoiceBillingEnabled) return null;
  const { data } = await withBillingDeadline(supabase.auth.getSession());
  const uid = data.session?.user.id;
  if (!uid) return null;
  const stored = await withBillingDeadline(AsyncStorage.getItem(attemptKey(uid)));
  if (!stored) return null;
  let attempt: PlayAttempt;
  try { attempt = JSON.parse(stored) as PlayAttempt; }
  catch { await AsyncStorage.removeItem(attemptKey(uid)); return null; }
  if (!attempt || attempt.userId !== uid || attempt.productId !== productId || !attempt.externalTransactionToken) return null;
  const current = await withBillingDeadline(supabase.auth.getSession());
  if (current.data.session?.user.id !== uid) return null;
  activeAttempt = attempt;
  return attempt;
}

async function handleAlternativeChoice(details: import("expo-iap").UserChoiceBillingDetails): Promise<void> {
  const attempt = activeAttempt;
  if (!userChoiceBillingEnabled || !attempt || !details || seenChoiceTokens.has(details.externalTransactionToken) || choiceInFlight.has(attempt.internalOrderId) ||
      !Array.isArray(details.products) || details.products.length !== 1 || details.products[0] !== attempt.playSku ||
      typeof details.externalTransactionToken !== "string" || details.externalTransactionToken.length < 10) return;
  if (attempt.externalTransactionToken && attempt.externalTransactionToken !== details.externalTransactionToken) return;
  choiceInFlight.add(attempt.internalOrderId);
  try {
    const session = await withBillingDeadline(supabase.auth.getSession());
    if (session.data.session?.user.id !== attempt.userId || activeAttempt !== attempt) return;
    const selected = { ...attempt, externalTransactionToken: details.externalTransactionToken };
    // Persist before any HTTP request; retry the same choice after process death.
    await saveAttempt(selected);
    // A logout/switch during native delivery or storage must not open checkout
    // for the next account. Keep the owner's durable choice for later recovery.
    const current = await withBillingDeadline(supabase.auth.getSession());
    if (current.data.session?.user.id !== attempt.userId || activeAttempt !== selected) return;
    seenChoiceTokens.add(details.externalTransactionToken);
    emit({ type: "alternative", attempt: selected });
  } catch {
    emit({ type: "error", attempt, message: "Could not save your payment choice. Please try again." });
  } finally { choiceInFlight.delete(attempt.internalOrderId); }
}

async function clearAttempt(attempt: PlayAttempt): Promise<void> {
  if (activeAttempt?.internalOrderId === attempt.internalOrderId) activeAttempt = null;
  const key = attemptKey(attempt.userId);
  const stored = await withBillingDeadline(AsyncStorage.getItem(key));
  if (stored) {
    try {
      const current = JSON.parse(stored) as PlayAttempt;
      if (current.internalOrderId === attempt.internalOrderId) await withBillingDeadline(AsyncStorage.removeItem(key));
    } catch {
      await withBillingDeadline(AsyncStorage.removeItem(key));
    }
  }
}

async function lookupAttemptForPurchase(purchase: Purchase): Promise<PlayAttempt | null> {
  if (Platform.OS !== "android" || !isAndroidPurchase(purchase)) return null;
  const { data } = await withBillingDeadline(supabase.auth.getSession());
  const userId = data.session?.user.id;
  if (!userId) return null;
  const accountHash = obfuscatedPlayId(userId);
  if (purchase.obfuscatedAccountIdAndroid !== accountHash) return null;

  const stored = await withBillingDeadline(AsyncStorage.getItem(attemptKey(userId)));
  if (stored) {
    try {
      const attempt = JSON.parse(stored) as PlayAttempt;
      if (attempt.userId === userId && attempt.playSku === purchase.productId &&
          obfuscatedPlayId(attempt.internalOrderId) === purchase.obfuscatedProfileIdAndroid) {
        activeAttempt = attempt;
        return attempt;
      }
    } catch {
      await withBillingDeadline(AsyncStorage.removeItem(attemptKey(userId)));
    }
  }

  // A process death may remove local state. The order ID hash in the Play
  // receipt still identifies the server-created order without trusting the client.
  const orders = await withBillingDeadline(getOrdersByUser(userId));
  const order = orders.find((candidate: Order) =>
    candidate.provider === "play" && candidate.playSku === purchase.productId &&
    obfuscatedPlayId(candidate.id) === purchase.obfuscatedProfileIdAndroid
  );
  if (!order) return null;
  return {
    userId,
    internalOrderId: order.id,
    productId: order.productId,
    productTitle: order.productTitle ?? "MedVeda purchase",
    playSku: order.playSku!,
  };
}

type RestoreOutcome = "confirmed" | "pending" | "failed" | "skipped";
async function handlePurchase(purchase: Purchase): Promise<RestoreOutcome> {
  if (Platform.OS !== "android" || !purchase.purchaseToken) return "skipped";
  const token = purchase.purchaseToken;
  if (inFlightTokens.has(token)) return "skipped";
  inFlightTokens.add(token);
  try {
    const attempt = await lookupAttemptForPurchase(purchase);
    if (!attempt) return "skipped";
    if (purchase.purchaseState === "pending") {
      emit({ type: "pending", attempt });
      return "pending";
    }
    if (purchase.purchaseState !== "purchased") return "skipped";
    try {
      const result = await verifyPlayPurchase(attempt, token);
      if ((await withBillingDeadline(supabase.auth.getSession())).data.session?.user.id !== attempt.userId) return "skipped";
      if (result.success) {
        // Server consumes the reusable price-tier SKU only after its atomic
        // grant. Do not also call finishTransaction on the client.
        await clearAttempt(attempt);
        emit({ type: "success", attempt, result });
        return "confirmed";
      } else if (result.pending) {
        emit({ type: "pending", attempt });
        return "pending";
      } else {
        emit({ type: "error", attempt, message: result.message ?? "Payment verification failed." });
        return "failed";
      }
    } catch (error) {
      if ((await withBillingDeadline(supabase.auth.getSession())).data.session?.user.id !== attempt.userId) return "skipped";
      if (error instanceof BillingApiError && error.status >= 400 &&
          error.status < 500 && error.status !== 401 && error.status !== 429) {
        emit({ type: "error", attempt, message: error.message });
        return "failed";
      } else {
        // The purchase may already be paid. Keep it available for another
        // server verification on resume instead of showing a hard failure.
        emit({ type: "pending", attempt });
        return "pending";
      }
    }
  } finally {
    inFlightTokens.delete(token);
  }
}

export async function ensurePlayBilling(): Promise<typeof import("expo-iap")> {
  if (Platform.OS !== "android") throw new Error("Play Billing is available on Android only.");
  if (!connection) {
    connection = (async () => {
      const iap = await withBillingDeadline(import("expo-iap"));
      const subscriptions = [
        iap.userChoiceBillingListenerAndroid((details) => {
          void handleAlternativeChoice(details);
        }),
        iap.purchaseUpdatedListener((purchase) => {
          void handlePurchase(purchase).catch(() => {
            // A transient lookup failure leaves the unconsumed purchase for restore.
          });
        }),
        iap.purchaseErrorListener((error) => {
          const attempt = activeAttempt;
          if (!attempt || attempt.externalTransactionToken) return;
          if (error.code === "user-cancelled") {
            void clearAttempt(attempt).catch(() => {});
            emit({ type: "cancel", attempt });
          } else {
            emit({ type: "error", attempt, message: error.message || "Could not start Play payment." });
          }
        }),
      ];
      try {
        // Google checks Play country and package/market eligibility when it
        // launches the flow. Unsupported users receive standard Play Billing.
        const ready = await withBillingDeadline(iap.initConnection(userChoiceBillingEnabled
          ? { enableBillingProgramAndroid: "user-choice-billing" } : {}));
        if (!ready) throw new Error("Could not connect to Google Play Billing.");
      } catch (error) {
        subscriptions.forEach((subscription) => subscription.remove());
        throw error;
      }
      return iap;
    })().catch((error) => {
      connection = null;
      throw error;
    });
  }
  return connection;
}

export async function startPlayPurchase(attempt: PlayAttempt, offerToken: string): Promise<void> {
  assertUserChoicePurchase();
  if (launching || (activeAttempt && !activeAttempt.externalTransactionToken))
    throw new Error("Another Play purchase is awaiting confirmation. Check My Purchases first.");
  launching = true;
  try {
    const iap = await ensurePlayBilling();
    const { data } = await withBillingDeadline(supabase.auth.getSession());
    if (data.session?.user.id !== attempt.userId) throw new Error("The signed-in account changed.");
    await saveAttempt(attempt);
    const current = await withBillingDeadline(supabase.auth.getSession());
    if (current.data.session?.user.id !== attempt.userId || activeAttempt !== attempt)
      throw new Error("The signed-in account changed.");
    await withBillingDeadline(iap.requestPurchase({
      request: {
        google: {
          skus: [attempt.playSku],
          offerToken,
          obfuscatedAccountId: obfuscatedPlayId(attempt.userId),
          obfuscatedProfileId: obfuscatedPlayId(attempt.internalOrderId),
        },
      },
      type: "in-app",
    }), "Google Play confirmation timed out. Check My Purchases before paying again.");
  } catch (error) {
    if (error instanceof BillingTimeoutError) {
      emit({ type: "pending", attempt });
      return;
    }
    // A user-choice or purchase listener may already have handled the result.
    if (activeAttempt?.internalOrderId === attempt.internalOrderId && !activeAttempt.externalTransactionToken) {
      await clearAttempt(attempt);
      const code = typeof error === "object" && error !== null && "code" in error
        ? String(error.code) : "";
      if (code === "user-cancelled") {
        emit({ type: "cancel", attempt });
        return;
      }
      const message = error instanceof Error ? error.message : "Could not start Play payment.";
      emit({ type: "error", attempt, message });
    } else if (!activeAttempt) { throw error; }
  } finally { launching = false; }
}

export async function fetchMatchingPlayProduct(sku: string, priceInr: number): Promise<{ offerToken: string; formattedPrice: string }> {
  assertUserChoicePurchase();
  const iap = await ensurePlayBilling();
  const products = await withBillingDeadline(iap.fetchProducts({ skus: [sku], type: "in-app" }),
    "Google Play prices took too long to load. Check your connection and tap Try again.");
  const item = products?.find((product) => product.id === sku && product.platform === "android");
  if (!item || item.platform !== "android" ||
      !("oneTimePurchaseOfferDetailsAndroid" in item) || item.currency !== "INR") {
    throw new Error("The Play price does not match this product. Please contact support.");
  }
  const offer = selectStandardPlayOffer(item.oneTimePurchaseOfferDetailsAndroid, priceInr);
  if (!offer.formattedPrice) throw new Error("Google Play did not provide a display price.");
  return { offerToken: offer.offerToken, formattedPrice: offer.formattedPrice };
}

export type PlayRestoreSummary = Record<RestoreOutcome, number>;
const restores = new Map<string, Promise<PlayRestoreSummary>>();
export async function restorePlayPurchases(): Promise<PlayRestoreSummary> {
  const summary: PlayRestoreSummary = { confirmed: 0, pending: 0, failed: 0, skipped: 0 };
  if (Platform.OS !== "android") return summary;
  let userId: string | undefined;
  try {
    const { data } = await withBillingDeadline(supabase.auth.getSession());
    userId = data.session?.user.id;
  } catch {
    return { ...summary, pending: 1 };
  }
  if (!userId) return summary;
  const existing = restores.get(userId);
  if (existing) return existing;
  const restore = (async () => {
    try {
      const iap = await ensurePlayBilling();
      const purchases = await withBillingDeadline(iap.getAvailablePurchases());
      for (const purchase of purchases) {
        if ((await withBillingDeadline(supabase.auth.getSession())).data.session?.user.id !== userId) break;
        try { summary[await handlePurchase(purchase)]++; }
        catch (error) {
          // Leave timed-out receipts and persisted attempts available for retry.
          if (error instanceof BillingTimeoutError) summary.pending++;
          else summary.failed++;
        }
      }
    } catch {
      // Native/session failures do not establish that a payment failed.
      summary.pending++;
    }
    return summary;
  })();
  restores.set(userId, restore);
  try { return await restore; } finally { if (restores.get(userId) === restore) restores.delete(userId); }
}

export async function recheckPlayOrder(internalOrderId: string): Promise<PlayVerifyResult> {
  const { data } = await withBillingDeadline(supabase.auth.getSession());
  const userId = data.session?.user.id;
  if (!userId) return { success: false, pending: true };
  const orders = await withBillingDeadline(getOrdersByUser(userId));
  if ((await withBillingDeadline(supabase.auth.getSession())).data.session?.user.id !== userId)
    return { success: false, pending: true };
  const order = orders.find((candidate) => candidate.id === internalOrderId && candidate.provider === "play");
  if (!order) return { success: false, pending: true };
  if (order.status === "paid") {
    const { data: fulfillment, error } = await withBillingDeadline(supabase.rpc("get_my_play_fulfillment", {
      p_order_id: internalOrderId,
    }));
    if (error || (await withBillingDeadline(supabase.auth.getSession())).data.session?.user.id !== userId)
      return { success: false, pending: true };
    return fulfillment as PlayVerifyResult;
  }
  if (order.status === "refunded") {
    return { success: false, pending: false, message: "This payment was refunded." };
  }
  if (order.status === "failed") {
    return { success: false, pending: false, message: "Payment was not completed." };
  }
  const iap = await ensurePlayBilling();
  const purchases = await withBillingDeadline(iap.getAvailablePurchases());
  const purchase = purchases.find((candidate): candidate is PurchaseAndroid => isAndroidPurchase(candidate) &&
    candidate.obfuscatedAccountIdAndroid === obfuscatedPlayId(userId) &&
    candidate.obfuscatedProfileIdAndroid === obfuscatedPlayId(internalOrderId));
  // Opening another checkout cancels old local orders. A delayed Google
  // payment can still be valid and the settlement RPC intentionally accepts it.
  if (!purchase?.purchaseToken) return order.status === "cancelled"
    ? { success: false, pending: false, message: "Payment was not completed." }
    : { success: false, pending: true };
  const attempt = await lookupAttemptForPurchase(purchase);
  if (!attempt) return { success: false, pending: true };
  return verifyPlayPurchase(attempt, purchase.purchaseToken);
}

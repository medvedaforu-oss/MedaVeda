import type { PlayBillingPorts, NativeBilling, Purchase, PurchaseAndroid, Order } from "./ports";
import { selectStandardPlayOffer } from "./playOfferSelection";

/** Recovered lifecycle protections, adapted for standalone Play. Native and HTTP ports allow focused tests. */
export function createStandalonePlayBilling(ports: PlayBillingPorts) {
  const url = new URL(ports.projectUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash)
    throw new Error("Invalid billing endpoint.");
  const { AsyncStorage, Platform, Application, sha256, supabase, getOrdersByUser, purchasesEnabled, getAuthEpoch, fetch } = ports;
  const setTimeout = ports.setTimeout ?? globalThis.setTimeout;
  const clearTimeout = ports.clearTimeout ?? globalThis.clearTimeout;
const projectUrl = ports.projectUrl;
const attemptKey = (userId: string) => `medveda:play-attempt:${userId}`;

const BILLING_HTTP_TIMEOUT_MS = 15000;
class BillingTimeoutError extends Error {}

// Only the standalone testing distribution can create new orders.
function assertStandalonePurchase(): void {
  if (!purchasesEnabled) throw new Error("Standalone Google Play purchases are unavailable in this build.");
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

interface PlayOrder {
  internalOrderId: string;
  playSku: string;
  amountInr: number;
  purchaseOptionId: string;
}

interface PlayAttempt extends Omit<PlayOrder, "amountInr" | "purchaseOptionId"> {
  userId: string;
  productId: string;
  productTitle: string;
}

interface PlayVerifyResult {
  success: boolean;
  pending?: boolean;
  terminal?: boolean;
  outcome?: "duplicate" | "refunded";
  internalOrderId?: string;
  amount?: number;
  productTitle?: string;
  message?: string;
}

type PlayBillingEvent =
  | { type: "success"; attempt: PlayAttempt; result: PlayVerifyResult }
  | { type: "pending"; attempt: PlayAttempt }
  | { type: "cancel"; attempt: PlayAttempt }
  | { type: "error"; attempt: PlayAttempt; message: string };

type Listener = (event: PlayBillingEvent) => void;
function terminalForAttempt(result: PlayVerifyResult, attempt: PlayAttempt): boolean {
  return result.success === false && result.pending === false && result.terminal === true &&
    result.internalOrderId === attempt.internalOrderId &&
    (result.outcome === "duplicate" || result.outcome === "refunded");
}
const listeners = new Set<Listener>();
const inFlightTokens = new Set<string>();
// A receipt observed during this launch outranks a later native error. The
// durable hint remains across restart; existing hints are never relaunched.
const receiptAttempts = new Set<string>();
const receiptKey = (attempt: PlayAttempt) => `${attempt.userId}:${attempt.internalOrderId}`;
// Pinned expo-iap 3.4.4 / OpenIAP Google 1.3.26 contracts. These preflight
// errors occur before launchBillingFlow; BILLING_UNAVAILABLE is a definitive
// provider failure. Generic purchase-error/network/service errors are ambiguous.
const failedLaunchCodes = new Set([
  "billing-unavailable", "not-prepared", "activity-unavailable", "empty-sku-list",
  "sku-not-found", "sku-offer-mismatch", "query-product",
]);
let activeAttempt: PlayAttempt | null = null;
let activeAttemptEpoch = -1;
const currentAttempt = (): PlayAttempt | null => activeAttempt;
let connection: Promise<NativeBilling> | null = null;
let launching = false;

function emit(event: PlayBillingEvent): void {
  listeners.forEach((listener) => listener(event));
}

function isAndroidPurchase(purchase: Purchase): purchase is PurchaseAndroid {
  return purchase.platform === "android";
}

function subscribePlayBilling(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function obfuscatedPlayId(value: string): string {
  return sha256(value);
}

async function authenticatedPost<T>(name: string, payload: Record<string, string>, expectedUserId?: string): Promise<T> {
  const epoch = getAuthEpoch();
  const { data } = await withBillingDeadline(supabase.auth.getSession());
  if (getAuthEpoch() !== epoch) throw new Error("The signed-in account changed. Please check purchases again.");
  if (!data.session?.access_token) throw new Error("Please log in before purchasing.");
  if (expectedUserId && data.session.user.id !== expectedUserId)
    throw new Error("The signed-in account changed. Please check purchases again.");
  const accessToken = data.session.access_token;
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
          Authorization: `Bearer ${accessToken}`,
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

async function createPlayOrder(productId: string, expectedUserId?: string): Promise<PlayOrder> {
  assertStandalonePurchase();
  const epoch = getAuthEpoch();
  const { data } = await withBillingDeadline(supabase.auth.getSession());
  const userId = data.session?.user.id;
  if (!userId || (expectedUserId && expectedUserId !== userId) || getAuthEpoch() !== epoch)
    throw new Error("The signed-in account changed. Please sign in again.");
  if (await withBillingDeadline(AsyncStorage.getItem(attemptKey(userId))))
    throw new Error("A Play payment is awaiting confirmation. Check My Purchases before paying again.");
  if (getAuthEpoch() !== epoch) throw new Error("The signed-in account changed.");
  try {
    const order = await authenticatedPost<PlayOrder>("create-standalone-play-order", { productId }, userId);
    if (getAuthEpoch() !== epoch) throw new Error("The signed-in account changed.");
    if (!order || typeof order.internalOrderId !== "string" || !/^[0-9a-f-]{36}$/i.test(order.internalOrderId) ||
        typeof order.playSku !== "string" || !order.playSku ||
        typeof order.purchaseOptionId !== "string" || !order.purchaseOptionId ||
        typeof order.amountInr !== "number" || !Number.isFinite(order.amountInr) || order.amountInr <= 0)
      throw new Error("Invalid Google Play order. Please contact support.");
    return order;
  } catch (error) {
    if (error instanceof BillingApiError && error.message === "price_tier_failed")
      throw new Error("Google Play checkout is unavailable for this item. Please contact MedVeda support. No new payment was started.");
    if (error instanceof BillingApiError && error.message === "price_tier_pending")
      throw new Error("Google Play checkout is being prepared for this price. Please try again shortly.");
    throw error;
  }
}

async function verifyPlayPurchase(
  attempt: PlayAttempt,
  purchaseToken: string
): Promise<PlayVerifyResult> {
  try {
    return await authenticatedPost<PlayVerifyResult>("verify-standalone-play-purchase", {
      purchaseToken,
      productId: attempt.productId,
      internalOrderId: attempt.internalOrderId,
    }, attempt.userId);
  } catch (error) {
    if (error instanceof BillingTimeoutError) return { success: false, pending: true };
    throw error;
  }
}

async function saveAttempt(attempt: PlayAttempt): Promise<void> {
  activeAttempt = attempt;
  activeAttemptEpoch = getAuthEpoch();
  await AsyncStorage.setItem(attemptKey(attempt.userId), JSON.stringify(attempt));
}

async function clearAttempt(attempt: PlayAttempt, unpaidEpoch?: number): Promise<boolean> {
  const mayClear = () => unpaidEpoch === undefined ||
    (getAuthEpoch() === unpaidEpoch && !receiptAttempts.has(receiptKey(attempt)));
  if (!mayClear()) return false;
  const key = attemptKey(attempt.userId);
  const stored = await withBillingDeadline(AsyncStorage.getItem(key));
  if (!mayClear()) return false;
  if (stored) {
    try {
      const current = JSON.parse(stored) as PlayAttempt;
      if (current.internalOrderId === attempt.internalOrderId) await withBillingDeadline(AsyncStorage.removeItem(key));
    } catch {
      await withBillingDeadline(AsyncStorage.removeItem(key));
    }
  }
  // Native receipt/account callbacks may run while storage removal awaits.
  // Restore the binding if either made this unpaid resolution unsafe.
  if (!mayClear()) {
    await AsyncStorage.setItem(key, JSON.stringify(attempt));
    return false;
  }
  if (activeAttempt?.internalOrderId === attempt.internalOrderId) activeAttempt = null;
  return true;
}

async function lookupAttemptForPurchase(purchase: Purchase): Promise<PlayAttempt | null> {
  const epoch = getAuthEpoch();
  if (Platform.OS !== "android" || !isAndroidPurchase(purchase)) return null;
  const { data } = await withBillingDeadline(supabase.auth.getSession());
  const userId = data.session?.user.id;
  if (!userId || getAuthEpoch() !== epoch) return null;
  const accountHash = obfuscatedPlayId(userId);
  if (purchase.obfuscatedAccountIdAndroid !== accountHash) return null;

  const stored = await withBillingDeadline(AsyncStorage.getItem(attemptKey(userId)));
  if (getAuthEpoch() !== epoch) return null;
  if (stored) {
    try {
      const attempt = JSON.parse(stored) as PlayAttempt;
      if (attempt.userId === userId && attempt.playSku === purchase.productId &&
          obfuscatedPlayId(attempt.internalOrderId) === purchase.obfuscatedProfileIdAndroid) {
        activeAttempt = attempt;
        activeAttemptEpoch = epoch;
        return attempt;
      }
    } catch {
      await withBillingDeadline(AsyncStorage.removeItem(attemptKey(userId)));
    }
  }

  // A process death may remove local state. The order ID hash in the Play
  // receipt still identifies the server-created order without trusting the client.
  const orders = await withBillingDeadline(getOrdersByUser(userId));
  if (getAuthEpoch() !== epoch) return null;
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

function observeActiveReceipt(purchase: Purchase): void {
  const epoch = getAuthEpoch();
  const observed = activeAttempt;
  if (purchase.platform === "android" && purchase.purchaseToken && observed && activeAttemptEpoch === epoch &&
      (purchase.purchaseState === "pending" || purchase.purchaseState === "purchased") &&
      purchase.productId === observed.playSku &&
      purchase.obfuscatedAccountIdAndroid === obfuscatedPlayId(observed.userId) &&
      purchase.obfuscatedProfileIdAndroid === obfuscatedPlayId(observed.internalOrderId)) {
    receiptAttempts.add(receiptKey(observed));
  }
}

type RestoreOutcome = "confirmed" | "pending" | "failed" | "skipped";
async function handlePurchase(purchase: Purchase): Promise<RestoreOutcome> {
  const epoch = getAuthEpoch();
  if (Platform.OS !== "android" || !purchase.purchaseToken) return "skipped";
  observeActiveReceipt(purchase);
  const token = purchase.purchaseToken;
  if (inFlightTokens.has(token)) return "skipped";
  inFlightTokens.add(token);
  try {
    const attempt = await lookupAttemptForPurchase(purchase);
    if (!attempt || getAuthEpoch() !== epoch) return "skipped";
    if (purchase.purchaseState === "pending" || purchase.purchaseState === "purchased")
      receiptAttempts.add(receiptKey(attempt));
    if (purchase.purchaseState === "pending") {
      emit({ type: "pending", attempt });
      return "pending";
    }
    if (purchase.purchaseState !== "purchased") return "skipped";
    try {
      const result = await verifyPlayPurchase(attempt, token);
      if ((await withBillingDeadline(supabase.auth.getSession())).data.session?.user.id !== attempt.userId || getAuthEpoch() !== epoch) return "skipped";
      if (result.success === true) {
        // Server consumes the reusable price-tier SKU only after its atomic
        // grant. Do not also call finishTransaction on the client.
        await clearAttempt(attempt);
        if (getAuthEpoch() !== epoch) return "skipped";
        emit({ type: "success", attempt, result });
        return "confirmed";
      } else if (result.pending === true) {
        emit({ type: "pending", attempt });
        return "pending";
      } else {
        if (terminalForAttempt(result, attempt)) {
          await clearAttempt(attempt);
          if (getAuthEpoch() !== epoch) return "skipped";
        }
        emit({ type: "error", attempt, message: result.message ?? "Payment verification failed." });
        return "failed";
      }
    } catch (error) {
      if ((await withBillingDeadline(supabase.auth.getSession())).data.session?.user.id !== attempt.userId || getAuthEpoch() !== epoch) return "skipped";
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

async function ensurePlayBilling(): Promise<NativeBilling> {
  if (Platform.OS !== "android") throw new Error("Play Billing is available on Android only.");
  if (!connection) {
    connection = (async () => {
      const iap = await withBillingDeadline(ports.getNativeBilling());
      const subscriptions = [
        iap.purchaseUpdatedListener((purchase) => {
          void handlePurchase(purchase).catch(() => {
            // A transient lookup failure leaves the unconsumed purchase for restore.
          });
        }),
        iap.purchaseErrorListener((error) => {
          const attempt = activeAttempt;
          if (!attempt || activeAttemptEpoch !== getAuthEpoch()) return;
          const epoch = getAuthEpoch();
          if (error.code === "user-cancelled" || failedLaunchCodes.has(error.code ?? "")) {
            void clearAttempt(attempt, epoch).then(cleared => {
              if (getAuthEpoch() !== epoch) return;
              if (!cleared) { emit({ type: "pending", attempt }); return; }
              emit(error.code === "user-cancelled" ? { type: "cancel", attempt } :
                { type: "error", attempt, message: error.message || "Could not start Play payment. Please retry." });
            }).catch(() => { /* Retain an unresolved hint on storage failure. */ });
          } else {
            emit({ type: "pending", attempt });
          }
        }),
      ];
      try {
        const ready = await withBillingDeadline(iap.initConnection({}));
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

async function startPlayPurchase(attempt: PlayAttempt, offerToken: string, isCurrent: () => boolean = () => true): Promise<void> {
  const epoch = getAuthEpoch();
  const assertCurrent = () => {
    if (getAuthEpoch() !== epoch || !isCurrent())
      throw new Error("The checkout session changed. Check My Purchases before paying again.");
  };
  assertCurrent();
  assertStandalonePurchase();
  // Durable hints stay scoped to their original account. A stale in-memory
  // attempt must not prevent a different authenticated session from checking out.
  if (activeAttemptEpoch !== epoch) activeAttempt = null;
  if (launching || currentAttempt())
    throw new Error("Another Play purchase is awaiting confirmation. Check My Purchases first.");
  launching = true;
  let dispatched = false;
  try {
    // Persisted attempts survive process death. Never replace an unresolved
    // native checkout merely because its in-memory listener was lost.
    if (await withBillingDeadline(AsyncStorage.getItem(attemptKey(attempt.userId))))
      throw new Error("A Play payment is awaiting confirmation. Check My Purchases before paying again.");
    assertCurrent();
    const iap = await ensurePlayBilling();
    assertCurrent();
    const { data } = await withBillingDeadline(supabase.auth.getSession());
    assertCurrent();
    if (data.session?.user.id !== attempt.userId) throw new Error("The signed-in account changed.");
    await saveAttempt(attempt);
    assertCurrent();
    const current = await withBillingDeadline(supabase.auth.getSession());
    assertCurrent();
    if (current.data.session?.user.id !== attempt.userId || currentAttempt() !== attempt)
      throw new Error("The signed-in account changed.");
    dispatched = true;
    const result = await withBillingDeadline(iap.requestPurchase({
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
    // The pinned API also returns receipts. Even if its update event was lost,
    // a returned paid/pending receipt cannot be discarded by a later error.
    for (const returned of Array.isArray(result) ? result : [result]) {
      if (returned && typeof returned === "object") observeActiveReceipt(returned as Purchase);
    }
  } catch (error) {
    // Before requestPurchase is called, no native payment can exist for this
    // attempt. Even a session-read timeout after save must release that hint.
    if (!dispatched) {
      if (activeAttempt === attempt) await clearAttempt(attempt);
      throw error;
    }
    if (getAuthEpoch() !== epoch) return;
    if (currentAttempt()?.internalOrderId !== attempt.internalOrderId) return;
    const code = typeof error === "object" && error !== null && "code" in error
      ? String(error.code) : "";
    if (code === "user-cancelled" || failedLaunchCodes.has(code)) {
      const cleared = await clearAttempt(attempt, epoch);
      if (getAuthEpoch() !== epoch) return;
      if (cleared) {
        emit(code === "user-cancelled" ? { type: "cancel", attempt } :
          { type: "error", attempt, message: error instanceof Error ? error.message : "Could not start Play payment. Please retry." });
        return;
      }
    }
    // Timeouts, generic provider failures, empty native results and any
    // observed pending/paid receipt retain the original owner/order binding.
    emit({ type: "pending", attempt });
  } finally { launching = false; }
}

async function fetchMatchingPlayProduct(sku: string, priceInr: number): Promise<{ offerToken: string; formattedPrice: string }> {
  assertStandalonePurchase();
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

type PlayRestoreSummary = Record<RestoreOutcome, number>;
const restores = new Map<string, { epoch: number; promise: Promise<PlayRestoreSummary> }>();
async function restorePlayPurchases(): Promise<PlayRestoreSummary> {
  const epoch = getAuthEpoch();
  const summary: PlayRestoreSummary = { confirmed: 0, pending: 0, failed: 0, skipped: 0 };
  if (Platform.OS !== "android") return summary;
  let userId: string | undefined;
  try {
    const { data } = await withBillingDeadline(supabase.auth.getSession());
    userId = data.session?.user.id;
  } catch {
    return { ...summary, pending: 1 };
  }
  if (!userId || getAuthEpoch() !== epoch) return summary;
  const existing = restores.get(userId);
  if (existing) {
    if (existing.epoch === epoch) return existing.promise;
    // Let old token processing release its in-flight guard before retrying.
    await existing.promise;
    if (getAuthEpoch() !== epoch) return summary;
    if (restores.get(userId) === existing) restores.delete(userId);
    return restorePlayPurchases();
  }
  const restore = (async () => {
    try {
      // Google may have consumed a verified purchase while the response was lost.
      // A missing native receipt does not mean that order failed. Require the
      // owner-scoped committed-entitlement RPC before clearing its durable hint.
      const stored = await withBillingDeadline(AsyncStorage.getItem(attemptKey(userId!)));
      if (getAuthEpoch() !== epoch) return summary;
      if (stored) {
        let attempt: PlayAttempt | null = null;
        try { attempt = JSON.parse(stored) as PlayAttempt; } catch { /* preserve for support */ }
        if (attempt?.userId === userId) {
          const orders = await withBillingDeadline(getOrdersByUser(userId!));
          if (getAuthEpoch() !== epoch) return summary;
          if (orders.some(order => order.id === attempt.internalOrderId && order.provider === "play" &&
              (order.status === "paid" || order.status === "refunded"))) {
            const result = await recheckPlayOrder(attempt.internalOrderId);
            if (getAuthEpoch() !== epoch) return summary;
            if (result?.success === true) {
              await clearAttempt(attempt);
              if (getAuthEpoch() !== epoch) return summary;
              emit({ type: "success", attempt, result });
              summary.confirmed++;
            } else if (terminalForAttempt(result, attempt)) {
              await clearAttempt(attempt);
              if (getAuthEpoch() !== epoch) return summary;
              emit({ type: "error", attempt, message: result.message ?? "Contact MedVeda support about this payment." });
              summary.failed++;
            }
          }
        }
      }
      const iap = await ensurePlayBilling();
      const purchases = await withBillingDeadline(iap.getAvailablePurchases());
      for (const purchase of purchases) {
        if ((await withBillingDeadline(supabase.auth.getSession())).data.session?.user.id !== userId || getAuthEpoch() !== epoch) break;
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
  restores.set(userId, { epoch, promise: restore });
  try { return await restore; } finally { if (restores.get(userId)?.promise === restore) restores.delete(userId); }
}

async function recheckPlayOrder(internalOrderId: string): Promise<PlayVerifyResult> {
  const epoch = getAuthEpoch();
  const { data } = await withBillingDeadline(supabase.auth.getSession());
  const userId = data.session?.user.id;
  if (!userId || getAuthEpoch() !== epoch) return { success: false, pending: true };
  const orders = await withBillingDeadline(getOrdersByUser(userId));
  if ((await withBillingDeadline(supabase.auth.getSession())).data.session?.user.id !== userId || getAuthEpoch() !== epoch)
    return { success: false, pending: true };
  const order = orders.find((candidate) => candidate.id === internalOrderId && candidate.provider === "play");
  if (!order) return { success: false, pending: true };
  if (order.status === "paid") {
    const { data: fulfillment, error } = await withBillingDeadline(supabase.rpc("get_my_play_fulfillment", {
      p_order_id: internalOrderId,
    }));
    if (error || (await withBillingDeadline(supabase.auth.getSession())).data.session?.user.id !== userId || getAuthEpoch() !== epoch)
      return { success: false, pending: true };
    return fulfillment as PlayVerifyResult;
  }
  if (order.status === "refunded") {
    return { success: false, pending: false, terminal: true, outcome: "refunded",
      internalOrderId, message: "This payment was refunded." };
  }
  if (order.status === "failed") {
    return { success: false, pending: false, message: "Payment was not completed." };
  }
  const iap = await ensurePlayBilling();
  const purchases = await withBillingDeadline(iap.getAvailablePurchases());
  if (getAuthEpoch() !== epoch) return { success: false, pending: true };
  const purchase = purchases.find((candidate): candidate is PurchaseAndroid => isAndroidPurchase(candidate) &&
    candidate.obfuscatedAccountIdAndroid === obfuscatedPlayId(userId) &&
    candidate.obfuscatedProfileIdAndroid === obfuscatedPlayId(internalOrderId));
  // Opening another checkout cancels old local orders. A delayed Google
  // payment can still be valid and the settlement RPC intentionally accepts it.
  if (!purchase?.purchaseToken) return order.status === "cancelled"
    ? { success: false, pending: false, message: "Payment was not completed." }
    : { success: false, pending: true };
  const attempt = await lookupAttemptForPurchase(purchase);
  if (!attempt || getAuthEpoch() !== epoch) return { success: false, pending: true };
  const result = await verifyPlayPurchase(attempt, purchase.purchaseToken);
  return getAuthEpoch() === epoch ? result : { success: false, pending: true };
}

return { subscribePlayBilling, obfuscatedPlayId, createPlayOrder, verifyPlayPurchase, ensurePlayBilling, startPlayPurchase, fetchMatchingPlayProduct, restorePlayPurchases, recheckPlayOrder };
}

import type { ProductPurchase, ProductPurchaseV2 } from "./googlePlay.ts";

export type PurchaseCheck =
  | { status: "pending" }
  | { status: "invalid" }
  | { status: "valid"; paidMillis: number; consumed: boolean };

export function validatePlayPurchaseV1(purchase: ProductPurchase, expected: {
  sku: string; token: string; accountHash: string; orderHash: string; now: number;
}): PurchaseCheck {
  if (purchase.purchaseState === 2) return { status: "pending" };
  const paidMillis = Number(purchase.purchaseTimeMillis);
  if (purchase.purchaseState !== 0 || purchase.refundableQuantity === 0 ||
      (purchase.productId && purchase.productId !== expected.sku) ||
      (purchase.purchaseToken && purchase.purchaseToken !== expected.token) ||
      purchase.regionCode !== "IN" || (purchase.quantity ?? 1) !== 1 ||
      purchase.obfuscatedExternalAccountId !== expected.accountHash ||
      purchase.obfuscatedExternalProfileId !== expected.orderHash ||
      !Number.isSafeInteger(paidMillis) || paidMillis <= 0 || paidMillis > expected.now + 300_000)
    return { status: "invalid" };
  return { status: "valid", paidMillis, consumed: purchase.consumptionState === 1 };
}

export function validatePlayPurchaseV2(purchase: ProductPurchaseV2, expected: {
  sku: string; optionId: string; accountHash: string; orderHash: string; now: number;
}): PurchaseCheck {
  if (purchase.purchaseStateContext?.purchaseState === "PENDING") return { status: "pending" };
  const line = purchase.productLineItem?.[0];
  const details = line?.productOfferDetails;
  const paidMillis = Date.parse(purchase.purchaseCompletionTime ?? "");
  if (purchase.purchaseStateContext?.purchaseState !== "PURCHASED" || purchase.productLineItem?.length !== 1 ||
      line?.productId !== expected.sku || details?.purchaseOptionId !== expected.optionId ||
      !!details?.offerId || (details?.quantity ?? 1) !== 1 || details?.refundableQuantity === 0 ||
      purchase.regionCode !== "IN" || purchase.obfuscatedExternalAccountId !== expected.accountHash ||
      purchase.obfuscatedExternalProfileId !== expected.orderHash || !Number.isSafeInteger(paidMillis) ||
      paidMillis <= 0 || paidMillis > expected.now + 300_000) return { status: "invalid" };
  return { status: "valid", paidMillis,
    consumed: details?.consumptionState === "CONSUMPTION_STATE_CONSUMED" };
}

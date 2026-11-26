export type BillingState = "ready" | "pending" | "running" | "failed" | "stale" |
  "catalog_inactive" | "tier_inactive" | "not_billable_notes" | "free" | "unsupported_price";

export interface BillingStatus {
  productRevision: number;
  status: BillingState;
  message: string | null;
  lastSyncedAt: string | null;
}

export type BillingStatuses = Record<string, BillingStatus>;

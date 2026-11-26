import { supabase } from "../config/supabase";
import { fetchAllPages } from "../utils/filters";
import type { BillingState, BillingStatuses } from "../types/playBilling";

type StatusRow = {
  product_id: string;
  product_revision: number;
  billing_status: string;
  last_error: string | null;
  last_synced_at: string | null;
};

const states = new Set<string>(["ready", "pending", "running", "failed", "stale",
  "catalog_inactive", "tier_inactive", "not_billable_notes", "free", "unsupported_price"]);

// Render fixed summaries only, including against a server predating the sanitized
// view. Raw Google responses can contain tokens or credential-shaped diagnostics.
function safeFailure(error: string | null): string | null {
  if (!error) return null;
  if (/403|permission|access denied/i.test(error))
    return "Google Play catalog access denied. Review package and service account permissions.";
  if (/401|unauthenticated|credential|configuration/i.test(error))
    return "Google Play catalog authentication needs administrator review.";
  if (/429|quota|rate limit/i.test(error))
    return "Google Play catalog request limit reached. A later recheck is required.";
  return "Catalog verification failed. Review the server diagnostics before retrying.";
}

// Limits come from the server policy. Project only its numeric summary; never
// render arbitrary stored/provider text, even for an unsupported-price row.
function safePriceSummary(error: string | null): string {
  const summary = error?.match(/^Google Play India paid prices must be INR [0-9,]+\.\d{2} to INR [0-9,]+\.\d{2} with at most two decimal places\./)?.[0];
  return (summary ?? "Price is outside the supported India INR range for Google Play.") +
    " Choose a supported price explicitly; free products and Razorpay prices are unchanged.";
}

// Authenticated, admin-only SELECT. Provisioning and retries remain server work.
export async function getBillingStatuses(): Promise<BillingStatuses> {
  const rows = await fetchAllPages<StatusRow>(() => supabase.from("admin_play_billing_status")
    .select("product_id,product_revision,billing_status,last_error,last_synced_at").order("product_id"));
  if (rows.some(row => !Number.isSafeInteger(row.product_revision) || row.product_revision <= 0)) {
    throw new Error("Billing readiness revision unavailable. Reload after the coordinated Admin migration.");
  }
  return Object.fromEntries(rows.map(row => [row.product_id, {
    productRevision: row.product_revision,
    status: states.has(row.billing_status) ? row.billing_status as BillingState : "pending",
    message: row.billing_status === "unsupported_price"
      ? safePriceSummary(row.last_error)
      : safeFailure(row.last_error),
    lastSyncedAt: row.last_synced_at,
  }]));
}

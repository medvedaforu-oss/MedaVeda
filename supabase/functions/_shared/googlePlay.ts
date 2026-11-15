// Google Play Developer API. References:
// https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products
// https://developers.google.com/android-publisher/api-ref/rest/v3/externaltransactions
const SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const API = "https://androidpublisher.googleapis.com/androidpublisher/v3";
const encoder = new TextEncoder();
let cached: { token: string; until: number } | null = null;

export type ProductPurchase = {
  purchaseState?: number;
  consumptionState?: number;
  acknowledgementState?: number;
  purchaseTimeMillis?: string;
  productId?: string;
  purchaseToken?: string;
  quantity?: number;
  regionCode?: string;
  refundableQuantity?: number;
  obfuscatedExternalAccountId?: string;
  obfuscatedExternalProfileId?: string;
};

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function packageName(): string {
  const value = env("GOOGLE_PLAY_PACKAGE_NAME");
  if (value !== "in.medveda.app") throw new Error("GOOGLE_PLAY_PACKAGE_NAME must match in.medveda.app");
  return value;
}

function b64url(bytes: Uint8Array): string {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function serviceAccountToken(): Promise<string> {
  if (cached && Date.now() < cached.until - 60_000) return cached.token;
  let serviceAccount: { client_email?: string; private_key?: string };
  try {
    serviceAccount = JSON.parse(env("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"));
  } catch { throw new Error("Invalid GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"); }
  if (!serviceAccount.client_email || !serviceAccount.private_key) throw new Error("Incomplete Google service account");
  const pem = serviceAccount.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const binary = atob(pem);
  const keyBytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", keyBytes, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(encoder.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = b64url(encoder.encode(JSON.stringify({ iss: serviceAccount.client_email, scope: SCOPE,
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })));
  const input = `${header}.${payload}`;
  const signature = b64url(new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(input))));
  let response: Response;
  try { response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", signal: AbortSignal.timeout(15_000), headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${input}.${signature}` }),
  }); } catch { throw new GoogleApiError(0, "oauth.token"); }
  if (!response.ok) throw await googleError(response, "oauth.token");
  const value = await response.json().catch(() => null) as { access_token?: string; expires_in?: number } | null;
  if (!value?.access_token || !Number.isFinite(value.expires_in)) throw new Error("Google OAuth response invalid");
  cached = { token: value.access_token, until: Date.now() + Math.min(value.expires_in as number, 3600) * 1000 };
  return cached.token;
}

// Only bounded, sanitized diagnostic projections reach logs, never request paths,
// unrestricted responses, or credentials. Persisted Error.message stays generic.
export type GoogleOperation = "api.request" | "oauth.token" | "catalog.get" |
  "catalog.readback.created" | "catalog.readback.activated" | "catalog.price-conversion" |
  "catalog.patch" | "catalog.activate" | "purchase.get" | "purchase.get-v2" |
  "purchase.consume" | "voids.list" | "external.create" | "external.get" | "external.refund";
const safeReasons = new Set([
  "accessNotConfigured", "insufficientPermissions", "permissionDenied", "forbidden",
  "rateLimitExceeded", "userRateLimitExceeded", "quotaExceeded", "backendError",
  "PERMISSION_DENIED", "RESOURCE_EXHAUSTED", "INTERNAL", "UNAVAILABLE", "INVALID_ARGUMENT",
  "UNAUTHENTICATED", "NOT_FOUND", "invalid_grant", "invalid_client", "unauthorized_client",
]);
const safeDetailReasons = new Set([
  "SERVICE_DISABLED", "SERVICE_ACCESS_DENIED", "CONSUMER_INVALID", "BILLING_DISABLED",
  "ACCESS_TOKEN_SCOPE_INSUFFICIENT", "IAM_PERMISSION_DENIED", "USER_PROJECT_DENIED",
  "RATE_LIMIT_EXCEEDED", "RESOURCE_QUOTA_EXCEEDED", "SECURITY_POLICY_VIOLATED",
  "API_KEY_INVALID", "API_KEY_SERVICE_BLOCKED", "API_KEY_IP_ADDRESS_BLOCKED",
  "API_KEY_HTTP_REFERRER_BLOCKED", "CREDENTIALS_MISSING", "ACCOUNT_STATE_INVALID",
]);
const safeDomains = new Set(["googleapis.com", "androidpublisher.googleapis.com", "serviceusage.googleapis.com"]);
// Legacy/detail messages retain their exact reviewed projection. The top-level
// PATCH message and BadRequest descriptions additionally use bounded redaction.
const safeMessages = new Set([
  "The caller does not have permission", "The caller does not have permission.",
  "Request had insufficient authentication scopes.",
  "The current user has insufficient permissions to perform the requested operation.",
  "Permission denied", "Permission denied.", "Insufficient Permission",
]);
type GoogleMessageDiagnostic = {
  state: "absent" | "preserved" | "redacted" | "omitted";
  text?: string;
  truncated?: true;
};
const MAX_DIAGNOSTIC_TEXT = 512;
const MAX_DIAGNOSTIC_INPUT = 16_384;
const sensitiveKey = /token|secret|password|authorization|credential|private[_ -]?key|api[_ -]?key|assertion/i;
const invisibleDiagnosticCharacters = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f\p{Cf}]/gu;

// Find opaque secrets in structured fields before selecting diagnostic text.
// Exhausting the budget suppresses free text rather than using incomplete masks.
function diagnosticSecrets(value: unknown): string[] | null {
  const secrets: string[] = [];
  let budget = 256;
  function visit(item: unknown, sensitive = false, depth = 0): boolean {
    if (--budget < 0 || depth > 8) return false;
    if (typeof item === "string") {
      if (sensitive && item) {
        if (item.length > MAX_DIAGNOSTIC_INPUT || secrets.length >= 64) return false;
        secrets.push(item);
      }
      return true;
    }
    if (item === null || typeof item !== "object") return true;
    if (Array.isArray(item)) {
      for (const entry of item) if (!visit(entry, sensitive, depth + 1)) return false;
    } else {
      for (const [key, entry] of Object.entries(item))
        if (!visit(entry, sensitive || sensitiveKey.test(key), depth + 1)) return false;
    }
    return true;
  }
  return visit(value) ? secrets : null;
}

function safeGoogleMessage(value: unknown, secrets: readonly string[] | null,
  reviewedOnly = false): GoogleMessageDiagnostic {
  if (typeof value !== "string" || !value) return { state: "absent" };
  if (secrets === null || value.length > MAX_DIAGNOSTIC_INPUT ||
      (reviewedOnly && !safeMessages.has(value))) return { state: "omitted" };
  // Remove invisible characters before matching credentials, so an embedded
  // formatting/control character cannot split a known token or its label.
  let text = value.replace(invisibleDiagnosticCharacters, "");
  // Mask before truncating so a credential crossing the output boundary cannot
  // leave a prefix behind. Include JSON-escaped and URL-encoded known values.
  const masks = new Set<string>();
  for (const secret of secrets.filter(Boolean)) {
    if (secret.length > MAX_DIAGNOSTIC_INPUT) return { state: "omitted" };
    for (const variant of [secret, secret.replace(invisibleDiagnosticCharacters, "")].filter(Boolean)) {
      masks.add(variant);
      masks.add(JSON.stringify(variant).slice(1, -1));
      try { masks.add(encodeURIComponent(variant)); }
      catch { return { state: "omitted" }; } // Malformed Unicode must not change queue behavior.
    }
  }
  for (const secret of [...masks].sort((a, b) => b.length - a.length))
    text = text.replaceAll(secret, "[redacted]");
  text = text
    .replace(/-----BEGIN[ A-Z]*PRIVATE KEY-----[\s\S]*?(?:-----END[ A-Z]*PRIVATE KEY-----|$)/gi, "[redacted]")
    .replace(/\b(?:Bearer|Basic)\s+[^\s,;"'}]+/gi, "[redacted]")
    .replace(/["']?\b(?:proxy[-_ ]?)?authorization\b["']?\s*[:=][^\r\n]*/gi, "[redacted]")
    .replace(/["']?\b[\w-]*(?:token|secret|password|credential|private[_ -]?key|api[_ -]?key|assertion)[\w-]*\b["']?\s*[:=]\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s,;}\]]+)/gi, "[redacted]")
    .replace(/\bya29\.[A-Za-z0-9._~-]+|\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/https?:\/\/[^\s<>"']+|\/tokens\/[^\s/?#<>"']+/gi, "[redacted]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted]")
    .replace(/\b[A-Za-z0-9_+\/=~-]{40,}\b/g, "[redacted]")
    .replace(/[\x00-\x1f\x7f-\x9f]/g, " ");
  return { state: text === value ? "preserved" : "redacted", text: text.slice(0, MAX_DIAGNOSTIC_TEXT),
    ...(text.length > MAX_DIAGNOSTIC_TEXT ? { truncated: true as const } : {}) };
}
function errorRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}
const safeViolationFields = new Set([
  "oneTimeProduct", "regionsVersion", "version", "updateMask", "allowMissing", "latencyTolerance",
  "packageName", "productId", "listings", "languageCode", "title", "description",
  "purchaseOptions", "purchaseOptionId", "buyOption", "legacyCompatible", "multiQuantityEnabled",
  "regionalPricingAndAvailabilityConfigs", "regionCode", "price", "currencyCode", "units", "nanos", "availability",
]);
function safeViolationField(value: unknown): string | undefined {
  if (typeof value !== "string" || !value || value.length > 200) return undefined;
  // Only schema field names and bounded array indices, never arbitrary subjects,
  // product identifiers, dictionary keys, or credential-bearing field strings.
  return value.split(".").every((part) => {
    const match = /^([A-Za-z_]+)(?:\[[0-9]{1,3}\])?$/.exec(part);
    return match && safeViolationFields.has(match[1].replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()));
  }) ? value : undefined;
}
function catalogPatchDiagnostic(raw: unknown, knownSecrets: readonly string[] | null) {
  const error = errorRecord(errorRecord(raw).error);
  const legacy = Array.isArray(error.errors) ? error.errors : [];
  const details = Array.isArray(error.details) ? error.details : [];
  const structuredSecrets = diagnosticSecrets(raw);
  const secrets = knownSecrets === null || structuredSecrets === null ? null : [...knownSecrets, ...structuredSecrets];
  return {
    bodyFormat: raw === null ? "unavailable" : "json",
    googleStatus: typeof error.status === "string" && safeReasons.has(error.status) ? error.status : undefined,
    googleCode: Number.isInteger(error.code) && (error.code as number) >= 100 && (error.code as number) <= 599
      ? error.code as number : undefined,
    message: safeGoogleMessage(error.message, secrets),
    legacyErrors: legacy.slice(0, 4).map((value: unknown) => {
      const entry = errorRecord(value);
      return {
        reason: typeof entry.reason === "string" && safeReasons.has(entry.reason) ? entry.reason : undefined,
        reasonOmitted: typeof entry.reason === "string" && !safeReasons.has(entry.reason),
        message: safeGoogleMessage(entry.message, secrets, true),
      };
    }),
    legacyErrorsTruncated: legacy.length > 4,
    // Preserve the presence and size of Google's original details, even when
    // safeErrorDetails filters every entry. Never copy subjects or metadata.
    detailEntryCount: details.length,
    detailReasonsOmitted: details.slice(0, 8).some((value: unknown) => {
      const entry = errorRecord(value);
      return typeof entry.reason === "string" && !safeDetailReasons.has(entry.reason);
    }),
    detailMessages: details.slice(0, 8).map((value: unknown) => safeGoogleMessage(errorRecord(value).message, secrets, true)),
    detailsTruncated: details.length > 8,
    badRequests: details.slice(0, 8).map(errorRecord)
      .filter((entry) => entry["@type"] === "type.googleapis.com/google.rpc.BadRequest")
      .map((entry) => {
        const violations = Array.isArray(entry.fieldViolations) ? entry.fieldViolations : [];
        return { fieldViolationCount: violations.length, fieldViolationsTruncated: violations.length > 4,
          fieldViolations: violations.slice(0, 4).map((value: unknown) => {
            const violation = errorRecord(value);
            const field = safeViolationField(violation.field);
            return { field, fieldOmitted: typeof violation.field === "string" && field === undefined,
              description: safeGoogleMessage(violation.description, secrets) };
          }) };
      }),
  };
}
export type GoogleErrorDetail = {
  type: "ErrorInfo" | "QuotaFailure" | "PreconditionFailure" | "RetryInfo";
  reason?: string;
  domain?: string;
  service?: string;
  consumer?: string;
};
// ErrorInfo metadata is untrusted. Preserve only known labels and project-number
// resource names; never copy arbitrary metadata, messages, links or credentials.
function safeErrorDetails(value: unknown): GoogleErrorDetail[] {
  if (!Array.isArray(value)) return [];
  const result: GoogleErrorDetail[] = [];
  for (const entry of value.slice(0, 8)) {
    if (!entry || typeof entry !== "object") continue;
    if (entry["@type"] === "type.googleapis.com/google.rpc.ErrorInfo") {
      const detail: GoogleErrorDetail = { type: "ErrorInfo" };
      if (typeof entry.reason === "string" && safeDetailReasons.has(entry.reason)) detail.reason = entry.reason;
      if (typeof entry.domain === "string" && safeDomains.has(entry.domain)) detail.domain = entry.domain;
      if (entry.metadata?.service === "androidpublisher.googleapis.com") detail.service = entry.metadata.service;
      const consumer = entry.metadata?.consumer;
      if (typeof consumer === "string" && (/^projects\/[0-9]{6,20}$/.test(consumer) ||
          consumer === "projects/medveda-play-billing")) detail.consumer = consumer;
      result.push(detail);
    } else {
      for (const type of ["QuotaFailure", "PreconditionFailure", "RetryInfo"] as const) {
        if (entry["@type"] === `type.googleapis.com/google.rpc.${type}`) result.push({ type });
      }
    }
    if (result.length === 4) break;
  }
  return result;
}
export class GoogleApiError extends Error {
  readonly retryable: boolean;
  readonly reason: string;
  readonly details: readonly GoogleErrorDetail[];
  readonly catalogPatchDiagnostic?: ReturnType<typeof catalogPatchDiagnostic>;
  constructor(public readonly status: number, public readonly operation: GoogleOperation = "api.request",
    reason = "unclassified", public readonly requestId = crypto.randomUUID(), details: unknown = [], raw?: unknown,
    diagnosticRedactions: readonly string[] | null = []) {
    const safeReason = safeReasons.has(reason) ? reason : "unclassified";
    super(`Google API operation=${operation} status=${status} reason=${safeReason} request=${requestId}`);
    this.reason = safeReason;
    this.details = safeErrorDetails(details);
    if (operation === "catalog.patch" && raw !== undefined)
      this.catalogPatchDiagnostic = catalogPatchDiagnostic(raw, diagnosticRedactions);
    // Permanent OAuth permission/credential failures need operator correction,
    // just like Publisher 403s. Only transport/conflict/quota/server failures retry.
    this.retryable = status === 0 || status === 409 || status === 429 || status >= 500;
  }
}
async function googleError(response: Response, operation: GoogleOperation,
  diagnosticRedactions: readonly string[] | null = []): Promise<GoogleApiError> {
  const value = await response.json().catch(() => null);
  const candidates = [value?.error?.errors?.[0]?.reason, value?.error?.status, value?.error];
  const reason = candidates.find((entry) => typeof entry === "string" && safeReasons.has(entry));
  return new GoogleApiError(response.status, operation, reason, undefined, value?.error?.details, value, diagnosticRedactions);
}
export async function googleRequest<T>(method: "GET" | "POST" | "PATCH", path: string,
  body?: unknown, operation: GoogleOperation = "api.request"): Promise<T> {
  const token = await serviceAccountToken();
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      method, signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch { throw new GoogleApiError(0, operation); }
  if (!response.ok) {
    const secrets = operation === "catalog.patch" ? diagnosticSecrets(body) : [];
    throw await googleError(response, operation, secrets === null ? null : [token, ...secrets]);
  }
  const text = await response.text();
  if (!text) return {} as T;
  try { return JSON.parse(text) as T; } catch { throw new Error("Google Play API response invalid"); }
}

function productPath(sku: string, token: string): string {
  return `/applications/${encodeURIComponent(packageName())}/purchases/products/${encodeURIComponent(sku)}/tokens/${encodeURIComponent(token)}`;
}

export function getProductPurchase(sku: string, token: string): Promise<ProductPurchase> {
  return googleRequest<ProductPurchase>("GET", productPath(sku, token), undefined, "purchase.get");
}

export type ProductPurchaseV2 = {
  purchaseStateContext?: { purchaseState?: string };
  productLineItem?: { productId?: string; productOfferDetails?: {
    purchaseOptionId?: string; offerId?: string; quantity?: number;
    refundableQuantity?: number; consumptionState?: string;
  } }[];
  regionCode?: string;
  purchaseCompletionTime?: string;
  obfuscatedExternalAccountId?: string;
  obfuscatedExternalProfileId?: string;
};

export function getProductPurchaseV2(token: string): Promise<ProductPurchaseV2> {
  return googleRequest<ProductPurchaseV2>("GET",
    `/applications/${encodeURIComponent(packageName())}/purchases/productsv2/tokens/${encodeURIComponent(token)}`, undefined, "purchase.get-v2");
}

export function consumeProductPurchase(sku: string, token: string): Promise<Record<string, never>> {
  return googleRequest<Record<string, never>>("POST", `${productPath(sku, token)}:consume`, undefined, "purchase.consume");
}

export type VoidedPurchase = { purchaseToken?: string; voidedTimeMillis?: string };
export type VoidedPurchasesPage = {
  voidedPurchases?: VoidedPurchase[];
  tokenPagination?: { nextPageToken?: string };
};

export function getVoidedPurchasesPage(startTime: number, pageToken?: string, endTime?: number,
  maxResults = 200): Promise<VoidedPurchasesPage> {
  if (!Number.isSafeInteger(maxResults) || maxResults < 1 || maxResults > 200) throw new Error("Invalid void page size");
  const query = new URLSearchParams({
    startTime: String(startTime), type: "0", "pageSelection.maxResults": String(maxResults),
  });
  if (endTime) query.set("endTime", String(endTime));
  if (pageToken) query.set("pageSelection.token", pageToken);
  return googleRequest<VoidedPurchasesPage>("GET",
    `/applications/${encodeURIComponent(packageName())}/purchases/voidedpurchases?${query}`, undefined, "voids.list");
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export type ExternalTransaction = {
  testPurchase?: Record<string, never>;
  externalTransactionId?: string;
  packageName?: string;
  transactionState?: string;
  oneTimeTransaction?: { externalTransactionToken?: string };
  originalPreTaxAmount?: { currency?: string; priceMicros?: string };
  originalTaxAmount?: { currency?: string; priceMicros?: string };
  currentPreTaxAmount?: { currency?: string; priceMicros?: string };
  currentTaxAmount?: { currency?: string; priceMicros?: string };
  userTaxAddress?: { regionCode?: string; administrativeArea?: string };
  transactionTime?: string;
};

function externalPath(id?: string): string {
  const base = `/applications/${encodeURIComponent(packageName())}/externalTransactions`;
  return id ? `${base}/${encodeURIComponent(id)}` : base;
}

export function createExternalTransaction(id: string, data: Record<string, unknown>): Promise<ExternalTransaction> {
  return googleRequest<ExternalTransaction>("POST", `${externalPath()}?externalTransactionId=${encodeURIComponent(id)}`, data, "external.create");
}

export function getExternalTransaction(id: string): Promise<ExternalTransaction> {
  return googleRequest<ExternalTransaction>("GET", externalPath(id), undefined, "external.get");
}

export function refundExternalTransaction(id: string, refundTime: string): Promise<ExternalTransaction> {
  return googleRequest<ExternalTransaction>("POST", `${externalPath(id)}:refund`, { refundTime, fullRefund: {} }, "external.refund");
}

export function refundExternalTransactionPartially(id: string, refundId: string,
  preTaxMicros: string, refundTime: string): Promise<ExternalTransaction> {
  return googleRequest<ExternalTransaction>("POST", `${externalPath(id)}:refund`, {
    refundTime,
    partialRefund: { refundId, refundPreTaxAmount: { currency: "INR", priceMicros: preTaxMicros } },
  }, "external.refund");
}

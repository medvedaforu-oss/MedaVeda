**Copy-and-paste correction packet — review only**

These changes are proposals, not installed application changes. SQL and the HTTP wrapper were exercised locally; mobile/web integration snippets still require a build and device/browser validation. Apply to a review branch/staging first. Do not paste SQL into production merely because a local test passed.

**F01 / F02 / F05 / F07 — database changes**

Run [proposed-database-fixes.sql](proposed-database-fixes.sql), then [proposed-quiz-submission.sql](proposed-quiz-submission.sql). Both are complete SQL files. Record actual quiz/product mappings before enabling quiz sales:

```sql
-- Run with a verified admin or server role. Replace the two actual identifiers.
insert into public.quiz_product_entitlements(quiz_id,product_id)
values ('ACTUAL_QUIZ_ID','ACTUAL_PRODUCT_ID')
on conflict do nothing;
```

The placeholders are required business data, not deployable defaults. No product mapping was guessed.

**F02 — retain the intended notification audience**

In `supabase/functions/send-push-notification/index.ts`, replace the target parsing block at lines 69–76 with:

```ts
let targets: string[] | null = null;
if (input.targetUserIds !== undefined && input.targetUserIds !== null) {
  const ids = input.targetUserIds;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > MAX_TARGETS ||
      !ids.every((id) => typeof id === "string" && UUID.test(id))) {
    return jsonResponse({ error: "Provide between 1 and 1000 valid recipient IDs." }, 400);
  }
  targets = [...new Set(ids as string[])];
}
```

Replace the notification insert/error handling at lines 92–95 with:

```ts
const { error: insertError } = await supabaseAdmin.from("notifications").insert({
  title, body, type, active: true,
  recipient_ids: targets,
  created_by: user.id,
});
if (insertError) {
  console.error("notification_insert_failed", { code: insertError.code });
  return jsonResponse({ error: "Notification could not be saved." }, 500);
}
```

For the strict “no personal data in push payloads” requirement, replace the Expo request's body at line 123 with:

```ts
body: JSON.stringify(chunk.map((to) => ({
  to,
  title: "MedVeda",
  body: "You have a new update. Open MedVeda to view it.",
  data: { screen: "Notifications" },
  sound: "default",
}))),
```

The private text is fetched in-app under the new audience RLS. A device push token remains necessary addressing data for Expo. Do not send student IDs, email, payment details or arbitrary `params` in the notification payload.

**F03 — keep recovery credentials on the HTTPS page**

In `website/assets/js/reset-password.js`, remove `originalFragment`, every assignment to it, `openInApp()`, and the `data-open-app-with-token` event wiring. At initialization, remove the obsolete buttons:

```js
document.querySelectorAll("[data-open-app-with-token]").forEach(function (button) {
  button.remove();
});
var fallback = document.getElementById("error-inapp");
if (fallback) fallback.remove();
```

The already-implemented `client.auth.setSession()` and password form remain on HTTPS. Make `fail()` independent of the removed fallback:

```js
function fail(message) {
  A.setText("error-msg", message);
  A.show("state-error");
}
```

Replace errors saying “reset inside the app” with “Request a new link if the page cannot be loaded.” Remove `data-open-app-with-token` elements from `website/_src/pages/reset-password.html` too, then run `node website/scripts/build.mjs` so generated HTML matches. The existing `href="medveda://"` post-success links are safe to retain because they contain no credentials.

Disable the obsolete native token-parser entry path in `mobile-app/src/features/auth/authService.ts`:

```ts
export function parseRecoveryTokensFromUrl(
  _url: string
): { accessToken: string; refreshToken: string } | null {
  return null;
}

export async function completePasswordReset(_url: string, _newPassword: string) {
  throw new Error("Complete the password reset on the secure page from your email.");
}
```

Existing already-sent `medveda://reset-password#...` links cannot be made safe retroactively. The release should request fresh HTTPS reset links; do not introduce another custom-scheme token fallback. Restrict Auth's recovery redirect allowlist to the actual HTTPS endpoint. A native HTTPS App Link implementation needs the actual signing fingerprint and a PKCE design and is a separate alternative.

**F04 — complete logout cleanup**

In `mobile-app/src/utils/downloadManager.ts`, add `resetDatabase` to the import from `../config/database`. In `clearAllDownloads()`, replace `getDb().runSync("DELETE FROM downloads;")` with:

```ts
resetDatabase();
await AsyncStorage.multiRemove([
  "medveda:recentChapters",
  "medveda:recentSearches",
  "medveda:notifications:readIds",
  "medveda:notifications:archivedIds",
]);
```

This makes the existing logout/account-switch purge erase answers/outbox rows as well as downloads. In an offline-preserving implementation, also stop/drain or invalidate the sync worker on account change so in-flight work cannot repopulate another account's local tables. The per-user server checks must remain.

Replace the import of AsyncStorage in `mobile-app/src/utils/pendingReferral.ts` with:

```ts
import { secureSessionStorage as AsyncStorage } from "../config/secureSessionStorage";
```

Its existing get/set/remove interface continues to work on native. Delete the old plaintext `medveda:pendingReferral` record during the one-time cleanup below; it cannot be decoded as new encrypted data. This storage adapter deliberately falls back to plaintext on web, so this correction applies to the shipped native app. Do not deploy the Expo web client as a protected app without replacing that fallback.

**F04 — concrete online-only containment while encrypted offline mode is unfinished**

This option deliberately removes persistent offline reading and durable offline quiz sync. It is a temporary security boundary, not a feature-equivalent encrypted implementation.

1. In `mobile-app/src/config/database.ts:36`, use `SQLite.openDatabaseSync(":memory:")`. Retain the schema creation. On logout `resetDatabase()` clears the memory database. Nothing from its answers/outbox tables is written to `medveda_offline.db`.
2. Replace bodies of `enqueueDownload`, `resumeDownload`, `retryDownload` and `saveQuizForOffline` in `downloadManager.ts` with `throw new Error("Offline downloads are unavailable in this release.");`. Keep signatures so callers still compile. Remove/disable the corresponding download buttons and offline claims in the release UI.
3. Replace `loadOfflineQuiz` and `mayOpenOfflineNote` with the functions below. This denies old local-file routes even if navigation passes one.

```ts
// downloadManager.ts
export async function loadOfflineQuiz<T = unknown>(_localUri: string): Promise<T> {
  throw new Error("Connect to the internet to open this quiz.");
}

// offlineNoteAccess.ts — complete replacement
export async function mayOpenOfflineNote(_noteId: string): Promise<boolean> {
  return false;
}
```

4. Purge legacy disk data before exposing navigation. Add `mobile-app/src/components/LegacyOfflineCleanup.tsx`:

```tsx
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Button, Platform, Text, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as SQLite from "expo-sqlite";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LegacyOfflineCleanup({ children }: React.PropsWithChildren) {
  const [ready, setReady] = useState(Platform.OS === "web");
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (Platform.OS === "web") return;
    let alive = true;
    const run = async () => {
      // The release uses :memory:; the legacy disk DB must never be opened first.
      const base = SQLite.defaultDatabaseDirectory.replace(/\/$/, "");
      const paths = [
        `${FileSystem.documentDirectory}medveda/`,
        `${base}/medveda_offline.db`,
        `${base}/medveda_offline.db-wal`,
        `${base}/medveda_offline.db-shm`,
        `${base}/medveda_offline.db-journal`,
      ];
      for (const path of paths) await FileSystem.deleteAsync(path, { idempotent: true });
      const keys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove(keys.filter((key) =>
        key.startsWith("medveda:resume:") ||
        key.startsWith("medveda:note-verified:") ||
        key.startsWith("medveda:note-denied:") ||
        key === "medveda:pendingReferral" ||
        key === "medveda:offline-owner"
      ));
      if (alive) setReady(true);
    };
    setFailed(false);
    void run().catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [attempt]);
  if (ready) return <>{children}</>;
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
    {failed ? <>
      <Text>Local data cleanup could not finish.</Text>
      <Button title="Retry" onPress={() => setAttempt((value) => value + 1)} />
    </> : <ActivityIndicator />}
  </View>;
}
```

Wrap App.tsx's returned `SafeAreaProvider` in `<LegacyOfflineCleanup>...</LegacyOfflineCleanup>` and import it. The first installed upgrade deletes old downloads/unsynced disk attempts, so disclose that loss to users before rollout. This wrapper executes only on mount/retry and does not erase a newly saved SecureStore referral during normal navigation. It must be validated on the release device filesystem; this audit did not run React Native.

The existing online PDF viewer already uses `cache:false`. Its native renderer can still use temporary plaintext files while displaying a PDF; validate cleanup on unmount/crash on a device. Do not claim that this containment supplies encrypted offline PDFs or absolute DRM. If persistent offline reading is required for launch, F04 stays unresolved until that implementation exists.

**F05 — fail-closed limits and diagnostic quota**

In `_shared/rateLimit.ts`, change the default to:

```ts
failClosed = true,
```

Also replace both explicit `recover` arguments to `withinLimit` in `verify-payment/index.ts:68–69` with `true`; otherwise the signed-callback path still opts into fail-open.

Add this helper to a new `_shared/diagnosticRateLimit.ts`:

```ts
import { getUserFromAuthHeader } from "./supabaseAdmin.ts";
import { withinLimit } from "./rateLimit.ts";
import { jsonResponse } from "./cors.ts";
export function withDiagnosticLimit(
  handler: (request: Request) => Response | Promise<Response>,
  name: string,
) {
  return async (request: Request): Promise<Response> => {
    const user = await getUserFromAuthHeader(request);
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
    if (!await withinLimit(`${name}:${user.id}`, 10, 600, true))
      return jsonResponse({ error: "Too many requests" }, 429);
    return await handler(request); // Keep its existing admin + aal2 checks.
  };
}
```

Wrap all three `diagnose-play-*` handlers with this helper **inside** the HTTP wrapper described below. The outer wrapper handles OPTIONS before user lookup. For example:

```ts
Deno.serve(secureEndpoint(
  withDiagnosticLimit(createHandler(dependencies), "diagnose-play-pricing"),
  { origins: OWN_WEB_ORIGINS },
));
```

`dependencies` above means the existing object already passed to `createHandler`, unchanged. For `diagnose-play-service-account`, wrap its existing anonymous handler instead.

Enable `public.enforce_password_lockout` as the project's Password Verification hook. Confirm the setting is available for the project's plan and export the resulting configuration. Test direct `/auth/v1/token?grant_type=password` requests against test accounts, not just the mobile screen. No application proxy can enforce this globally while the direct public password endpoint remains outside its control.

**F06 / F10 — shared HTTP boundary**

Copy [proposed-httpSecurity.ts](proposed-httpSecurity.ts) to `supabase/functions/_shared/httpSecurity.ts`. Import `secureEndpoint` into each function entrypoint. Define approved origins once in `_shared/origins.ts`:

```ts
const configured = (Deno.env.get("MEDVEDA_WEB_ORIGINS") ?? "")
  .split(",").map((value) => value.trim()).filter(Boolean);
export const OWN_WEB_ORIGINS = [
  "https://www.medveda.in",
  "https://medveda.in",
  ...configured,
];
for (const value of OWN_WEB_ORIGINS) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || parsed.origin !== value)
    throw new Error("Invalid approved web origin configuration");
}
```

`MEDVEDA_WEB_ORIGINS` must contain the **actual admin origin**, including its scheme and port if any; it is not a wildcard. No secret is needed for origin strings. Local development may use a separate nonproduction allowlist.

For all normal browser/native functions:

```ts
// Before:
// Deno.serve(async (req: Request) => { ... });
// After: keep the entire original handler body.
Deno.serve(secureEndpoint(async (req: Request) => {
  // Original handler body, unchanged.
}, { origins: OWN_WEB_ORIGINS, maxBodyBytes: 16 * 1024 }));
```

This is a wrapping instruction, not a replacement empty handler. It works with the existing `jsonResponse` helper because it removes inherited wildcard CORS. Use 64 KiB for `send-push-notification` because up to 1000 UUIDs exceed 16 KiB. `upload-note-pdf` keeps its current bounded multipart implementation; its JSON reserve/status body is still limited to 2048 bytes internally.

For `razorpay-webhook`, wrap with `{ jsonObject:false, maxBodyBytes:256*1024 }` and no browser origins. Signed bytes are preserved exactly. Set no browser origins for the three cron-only handlers as well. Retain existing cron-secret/HMAC verification.

For `diagnose-play-matrix`, add the missing explicit deployment stanza:

```toml
[functions.diagnose-play-matrix]
verify_jwt = true
```

Do not change legitimate webhook/cron `verify_jwt=false` settings simply to silence an audit.

**F08 — minimize production log payloads**

In `_shared/razorpay.ts`, replace the three blocks that read `res.text()` solely for an exception with:

```ts
// createRazorpayOrder:
if (!res.ok) throw new Error(`razorpay.order.create:${res.status}`);
// fetchCapturedPaymentForOrder:
if (!res.ok) throw new Error(`razorpay.order.payments:${res.status}`);
// razorpayGet:
if (!res.ok) throw new Error(`razorpay.read:${res.status}`);
```

Do not include the response body, path IDs or Authorization header. For catches currently logging raw exceptions, use:

```ts
export function safeServerError(operation: string, error: unknown): void {
  const candidate = error as { code?: unknown; status?: unknown } | null;
  const code = typeof candidate?.code === "string" && /^[A-Z0-9]{5}$/.test(candidate.code)
    ? candidate.code : undefined;
  const status = typeof candidate?.status === "number" &&
    Number.isInteger(candidate.status) && candidate.status >= 400 && candidate.status <= 599
    ? candidate.status : undefined;
  // operation is a developer-written constant, never request input.
  console.error(operation, { code, status });
}
```

Use fixed operation literals at `create-order:122/173`, `verify-payment:41/111`, `get-note-url:64`, `get-video-url:41`, `delete-account:49/58` and other raw-object/message catches. Payment identifiers may be retained in a restricted billing audit table if needed, rather than spread through general logs.

Replace `logError` in `mobile-app/src/utils/logger.ts`:

```ts
export function logError(label: string, error?: unknown): void {
  if (__DEV__) console.error(label, error);
  Sentry.captureException(new Error("Application operation failed"));
}
```

For a strict safe projection, replace the Sentry callbacks:

```ts
beforeBreadcrumb() {
  return null;
},
beforeSend(event) {
  return {
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: event.platform,
    level: event.level,
    release: event.release,
    environment: event.environment,
    exception: {
      values: [{ type: "ApplicationError", value: "Application operation failed" }],
    },
  };
},
```

This sacrifices error detail to meet the strict privacy requirement. Add only reviewed static event codes/stack fields later, with tests using names, emails, opaque tokens and signed URLs. Regex removal of emails alone is insufficient.

**F09 — operate the existing identity-retention function**

The following is deployment SQL for a project where `pg_cron` is already installed. It does not run during this review:

```sql
begin;
do $$
begin
  if not exists(select 1 from pg_extension where extname='pg_cron') then
    raise exception 'pg_cron is required; retention has not been scheduled';
  end if;
end $$;
select cron.schedule(
  'first-purchase-identity-retention',
  '0 * * * *',
  'select public.purge_expired_first_purchase_identities();'
);
commit;
```

Verify the job after its next run:

```sql
select j.jobname,j.schedule,r.status,r.return_message,r.start_time,r.end_time
from cron.job j
left join lateral (
  select * from cron.job_run_details d where d.jobid=j.jobid
  order by start_time desc limit 1
) r on true
where j.jobname='first-purchase-identity-retention';
select count(*) as overdue_identities
from public.first_purchase_identities
where first_purchase_at < now()-interval '180 days 1 hour';
```

Alert on a failed/missing run or overdue rows. Hourly execution enforces 180 days **plus up to an hour and any outage**, not an exact instantaneous deletion promise. Set the published policy to the operated deadline. If the owner chooses immediate deletion instead, explicitly add a delete for `first_purchase_identities.account_id` to `erase_user_data` and accept the impact on the anti-re-signup discount guard.

**F11 — CAPTCHA plumbing and missing challenge component**

Supabase must have CAPTCHA enabled with a provider secret configured server-side. Obtain a fresh token from the provider challenge in the native UI and pass it on each protected auth request. Do not store the token or the provider secret in the app.

The SDK changes in `authService.ts` are:

```ts
function requireCaptcha(value: string): string {
  if (!value || value.length > 8192) throw new Error("Complete the verification challenge.");
  return value;
}
// Extend registerWithEmailAndMobile's params type:
// captchaToken: string;
// Within its existing options object:
// captchaToken: requireCaptcha(params.captchaToken),

export async function sendEmailOtp(email: string, captchaToken: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, captchaToken: requireCaptcha(captchaToken) },
  });
}

export async function requestPasswordReset(
  identifier: AuthIdentifier, captchaToken: string
) {
  const token = requireCaptcha(captchaToken);
  if (identifier.kind === "email") {
    return supabase.auth.resetPasswordForEmail(identifier.value, {
      redirectTo: PASSWORD_RESET_REDIRECT_URL, captchaToken: token,
    });
  }
  return supabase.functions.invoke("request-password-reset-by-mobile", {
    body: { mobileNumber: identifier.value, captchaToken: token },
  });
}

export async function signInWithIdentifier(
  identifier: AuthIdentifier, password: string, captchaToken: string
) {
  const token = requireCaptcha(captchaToken);
  if (identifier.kind === "email") {
    return supabase.auth.signInWithPassword({
      email: identifier.value, password, options: { captchaToken: token },
    });
  }
  const { data, error } = await supabase.functions.invoke("login-with-mobile", {
    body: { mobileNumber: identifier.value, password, captchaToken: token },
  });
  if (error || !data?.session)
    return { data: { user: null, session: null }, error: error ?? new Error("Invalid credentials") };
  return supabase.auth.setSession({
    access_token: data.session.access_token, refresh_token: data.session.refresh_token,
  });
}
```

The phone proxy handlers must read/validate `captchaToken` and pass it to their existing provider calls:

```ts
// login-with-mobile, after bounded JSON parsing and the existing rate gate:
const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken : "";
if (!captchaToken || captchaToken.length > 8192) return invalid();
const { data, error } = await authClient.auth.signInWithPassword({
  email, password, options: { captchaToken },
});

// request-password-reset-by-mobile: retain parsed input instead of reading only
// mobileNumber, validate input.captchaToken, then use:
const send = authClient.auth.resetPasswordForEmail(profile.email, {
  redirectTo: PASSWORD_RESET_REDIRECT_URL,
  captchaToken,
});
```

Extend the request types with `captchaToken?: unknown`. For the reset endpoint, preserve its generic public response and `waitUntil` handling. Update Register/Login/ForgotPassword callers to pass the fresh token. These snippets supply exact server/SDK integration, but cannot produce a real CAPTCHA token: the provider/site key and token-producing UI are missing. F11 remains open until those are configured and direct API rejection without CAPTCHA is demonstrated.

**F12 — authenticate the callback before reading an order**

In `verify-payment/index.ts`, keep UUID validation, recovery JWT validation and the rate gate. Move this block to immediately **before** the `orders` SELECT:

```ts
const callbackOrderId = typeof body.razorpay_order_id === "string" ? body.razorpay_order_id : "";
const callbackPaymentId = typeof body.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
const callbackSignature = typeof body.razorpay_signature === "string" ? body.razorpay_signature : "";
const invalidPayment = () => jsonResponse({ error: "Payment verification failed." }, 400);
if (!recover) {
  if (!/^order_[A-Za-z0-9]{6,32}$/.test(callbackOrderId) ||
      !/^pay_[A-Za-z0-9]{6,32}$/.test(callbackPaymentId) ||
      !/^[a-f0-9]{64}$/i.test(callbackSignature)) return invalidPayment();
  if (!await verifyPaymentSignature({
    razorpayOrderId: callbackOrderId,
    razorpayPaymentId: callbackPaymentId,
    razorpaySignature: callbackSignature,
  })) return invalidPayment();
}
```

Immediately after the SELECT, replace the old distinct not-found/owner branches with:

```ts
if (orderError) return jsonResponse({ error: "Verification temporarily unavailable." }, 503);
if (!order ||
    (recover && order.user_id !== recoveryUser?.id) ||
    (!recover && order.razorpay_order_id !== callbackOrderId)) return invalidPayment();
```

Retain the payment gate and recovery provider lookup. Delete the original callback parsing/signature-check block at lines 96–107 and replace the final callback settlement call with:

```ts
return settle(callbackOrderId, callbackPaymentId);
```

This retains provider re-fetch, exact amount checks and idempotent settlement. Unknown and mismatched UUIDs have the same callback error.

**F13 — dependency remediation without breaking Expo**

The admin fix is a compatible lockfile update:

```bash
cd admin-panel
npm update source-map-js
npm ls source-map-js
npm audit
npm test
npm run build
```

Require a resolved version of at least 1.2.2 before accepting the change. If another range blocks resolution, add `"source-map-js": "1.2.2"` to the admin package's `overrides` and run `npm install`, then repeat verification.

For mobile, neither root advisory lists a patched release. The safe commands are inspection/gating, **not** `npm audit fix --force`:

```bash
cd mobile-app
npm explain braces
npm explain node-forge
npm audit --omit=dev --audit-level=high
```

This gate currently fails and should stay visible. A reviewed upstream patch or pinned maintained fork must be supplied before a version-only correction can honestly be given. Verify the actual native/runtime dependency graph separately: npm's prod/dev classification includes Expo tooling in `dependencies` and is not proof that vulnerable code ships to the device.

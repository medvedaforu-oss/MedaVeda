# Admin and website source audit — completed scoped review

Read-only application audit. Only evidence files are written. Historic reports read first in full using git show. Complete reviewed-file ledger: admin-web-reviewed.txt. No live configuration, deployment, or user data inspected; no product changes.

Prior F06/F07: scoped request guards and generation-based admin checks are present in current source. F11 retry wiring requires remaining page review. Admin authorization uses server am_i_admin, not decoded claims. Diagnostics separately verify Auth identity, admin membership and AAL2.


## Confirmed findings (source evidence; proposed patches ONLY)

### WEB-01 — High — legacy password-reset DOM XSS

`reset-password.html:113,120–124,139–140` and byte-identical `github-original-website/reset-password.html`:
```js
const errorDescription = params.get("error_description");
content.innerHTML = '<div class="error-box">' + message + "</div>" + ...;
renderError(errorDescription.replace(/\+/g, " "));
```
Root cause: attacker-controlled URL fragment becomes HTML without escaping. A synthetic local URL ending `#error_description=%3Cimg%20src=x%20onerror=alert(1)%3E` reaches an event-handler sink. If either legacy deployment serves this page without an effective CSP, code runs under its origin and can replace the recovery UI or read any fragment credentials supplied with the malicious message. This is a confirmed source sink, not a demonstrated production takeover. Current `website/assets/js/auth-common.js:42` uses `textContent`, so the modern fix did not cover these copies.

Proposed smallest patch in BOTH copies (or replace both with a fixed-origin redirect to the current bridge after owner confirms legacy routing):
```diff
 function renderError(message) {
   content.innerHTML =
-    '<div class="error-box">' + message + "</div>" +
+    '<div class="error-box" id="reset-error"></div>' +
     '<a class="btn" href="ayurpulse://reset-password">Open MedVeda App</a>' + ...;
+  document.getElementById("reset-error").textContent = message;
 }
```
Manual exposure check: enumerate Vercel project root/output, custom domain aliases and any GitHub Pages deployment; open each legacy `/reset-password(.html)` with an inert HTML marker on a staging/local copy, inspect DOM, then check actual CSP headers. Do not send real reset tokens in a security test.

### WEB-02 — Medium — legacy recovery links retain credentials and target a retired scheme

Both legacy reset pages `:108–116,123,130,136,143` read the hash without `history.replaceState`, inject tokens into an anchor and automatically navigate to `ayurpulse://reset-password`; current production website config uses `medveda://`. A returning user landing on an older hosted URL can be stranded; credentials remain in browser history and DOM. Tokens in fragments are not HTTP referrers, so this does NOT claim a referrer leak.
```diff
 const params = new URLSearchParams(hash);
+history.replaceState(null, "", location.pathname + location.search);
-"ayurpulse://reset-password#access_token="
+"medveda://reset-password#access_token="
-'<a class="btn" href="ayurpulse://reset-password">Open MedVeda App</a>'
+'<a class="btn" href="medveda://reset-password">Open MedVeda App</a>'
-window.location.href = appUrl;
+// Keep the visible explicit user-tap action; do not auto-launch.
```
Preferred reviewed replacement: retire the duplicated bridge in favor of the current fixed-origin bridge, preserving only the in-memory fragment during the redirect. Verify every old redirect URL and installed production/staging scheme before deployment. Live legacy exposure is UNVERIFIED.

### WEB-03 — Medium — conflicting purchase instructions on the current site

`website/_src/pages/index.html:52` says `Buy notes ... and read them instantly`; `download.html:7,10` says browse and buy/unlock notes. But `terms.html:17`, `features.html:17`, `how-it-works.html:9` and `_src/faq.mjs:26` say `New purchases are unavailable in this Android app version`. Generated pages exactly reproduce this disagreement. Users following Google Play download CTA receive mutually incompatible instructions. Product channel status is a live/release fact to reconcile with the release owner; the source inconsistency itself is confirmed.
```diff
-<li><h3>Unlock premium notes</h3><p>Buy notes per chapter, subject, year or bundle and read them instantly.</p></li>
+<li><h3>Open your purchased notes</h3><p>Previously purchased Notes remain available in your account. See the payments FAQ for purchase availability in your app version.</p></li>
-<li>An internet connection to sign in, browse and buy (downloaded notes and quizzes work offline)</li>
+<li>An internet connection to sign in and browse; downloaded notes and quizzes work offline within the app's access limits</li>
```
Apply equivalent wording to download after-install step; regenerate committed HTML. This is a copy proposal, not permission to enable payments.

### WEB-04 — Medium — legacy privacy promises contradict current disclosure

`privacy.html:49,52,55` and byte-identical GitHub copy claim Mumbai hosting, sharing only with Razorpay/Supabase, and deletion of purchase history. Root/GitHub `index.html:452` repeats Mumbai. Current `website/_src/pages/privacy-policy.html:34,36–39,45–47` states Seoul hosting, Expo/Sentry/email providers and retained transaction/fraud records. Source copies provide conflicting declarations; actual hosted region/retention is UNVERIFIED here. Older refunds/terms also omit Play and disagree with current refund windows and response time.
```diff
-<p>Data is stored using Supabase (... Mumbai region) ...</p>
+<p>Read the current <a href="https://www.medveda.in/privacy-policy">MedVeda Privacy Policy</a> for hosting, processors, retention and deletion information.</p>
```
Preferred: static host 308 mappings `/privacy(.html)` → fixed `https://www.medveda.in/privacy-policy`, `/refunds(.html)` → `/refund-policy`, `/terms(.html)` → `/terms`; preserve old incoming links. Validate the hosting inventory first; do not delete legacy files assuming they are unreachable.

### ADM-01 — Medium — clearing product MRP does not clear the stored discount

`admin-panel/src/components/ProductFormModal.tsx:465–470` writes `originalPrice: undefined` when the field is blank. `services/productService.ts:57–60` sends the result through `toSnakeCase` to `.update`. JSON serialization omits undefined properties, leaving the previous `original_price` intact. The types say blank/0 hides discount (`types/product.ts:27–31`), but baseline DB constraint `supabase/migrations/20260701000000_baseline_live_schema.sql:484–485` requires null or original_price >= price, so entering zero for a positive-price product is rejected. Repro: edit a product with MRP > price, clear MRP, save/reload; discount returns.
```diff
 // services/productService.ts updateProduct
-const { chapterTitle, subjectTitle, yearTitle, yearTitles, courseTitle, ...payload } = data;
+const { chapterTitle, subjectTitle, yearTitle, yearTitles, courseTitle, ...rest } = data;
+const payload = { ...rest, originalPrice: rest.originalPrice == null || rest.originalPrice === 0 ? null : rest.originalPrice };
```
Apply consistent normalization on insert and validation; use `originalPrice?: number | null` if storing null in the form. Verify against a synthetic product in staging; no live write was performed.

### ADM-02 — Medium — four content forms can be closed during save, allowing a stale completion to close another editor

`CourseFormModal.tsx:67–90,95–98`, `YearFormModal.tsx:75–91,96–99`, `SubjectFormModal.tsx:100–116,121–124`, `ChapterFormModal.tsx:125–141,146–149` pass no `closeDisabled={saving}` and have no synchronous submission ref. `Modal.tsx:12–25` defaults it to false, and `useDialogFocus.ts:16–18` honors Escape. Repro: throttle save A, close with X/Escape, open B, let A complete; old `onClose()` closes B and can discard B's unsaved edits. Rapid/programmatic submission can also insert duplicates. Current Note/Product/Quiz/Video forms already protect closing and have synchronous guards, demonstrating the intended pattern.
```diff
-import { useEffect, useState } from "react";
+import { useEffect, useRef, useState } from "react";
+const saveBusy = useRef(false);
 async function handleSubmit() {
-  if (!validate()) return;
+  if (saveBusy.current || !validate()) return;
+  saveBusy.current = true;
   try { setSaving(true); await onSubmit(form); onClose(); }
-  finally { setSaving(false); }
+  finally { saveBusy.current = false; setSaving(false); }
 }
 <Modal open={open} onClose={onClose}
+  closeDisabled={saving}
```
Apply to all four forms, retaining existing `useMemo` imports where needed. A lifetime/generation check is also needed if route navigation should remain possible during a mutation.

### ADM-03 — Medium — global notification sends are not idempotent

`pages/Notifications.tsx:11–25,34–39` sets React `loading` but has no synchronous guard or persistent request ID; `services/notificationService.ts:22–29` submits title/body/type only. `supabase/functions/send-push-notification/index.ts:86–102` inserts a new broadcast before token enumeration; enumeration error returns 500 after persistence. Repro: successful insert followed by token query error; admin sees failure, retries, creating duplicate feed rows. A double handler invocation before rerender also starts two broadcasts. The 10/hour server throttle is not deduplication.
```diff
-import { useState } from "react";
+import { useRef, useState } from "react";
+const sending = useRef(false);
 const sendNotification = async () => {
+  if (sending.current) return;
   if (!title.trim() || !message.trim()) { ...; return; }
+  sending.current = true;
   try { ... }
-  finally { setLoading(false); }
+  finally { sending.current = false; setLoading(false); }
```
This only closes same-render duplicates. Complete proposal: generate one request UUID per composed notification, retain it across ambiguous failures, extend service/handler body with `requestId`, and reserve/upsert a server-side delivery record with a unique `(admin_id, request_id)` before persistence/dispatch. Return existing result on replay; mark provider-unknown batches and prohibit blind retry. This requires a separately reviewed schema/worker change. Until then, explicitly distinguish `notification saved, push not completed` from unsaved failure and direct admin to reconcile feed before retrying.

### ADM-04 — Medium — billing status is truncated while product list is fully paginated

`services/playBillingSyncService.ts:15–18` uses `.select("*")` without range/order. `productService.ts:11–16` pages every product, and `components/ProductTable.tsx:97,106–108` labels missing status `Pending` and hides Retry sync when no billing row exists. View `20261016100000_play_catalog_sync.sql:262–275` emits one row per product. For a catalog above Data API max rows, products past the cap always appear pending even if ready/failed and cannot be retried. The exact deployed max row setting/count is UNVERIFIED.
```diff
+import { fetchAllPages } from "../utils/filters";
-const { data, error } = await supabase.from("admin_play_billing_status").select("*");
-if (error) throw error;
-return Object.fromEntries(((data ?? []) as BillingStatus[]).map(...));
+const data = await fetchAllPages<BillingStatus>(() =>
+  supabase.from("admin_play_billing_status").select("*").order("product_id"));
+return Object.fromEntries(data.map((row) => [row.product_id, row]));
```
Use a query scoped to visible product IDs as a more scalable alternative. Manual check: read aggregate product count/max_rows, then synthetic >cap fixtures in staging; compare first/last billing statuses.

### ADM-05 — Low — Retry falsely reports a successful mutation

`hooks/useNotes.ts:75,87`, `useVideos.ts:75,87`, `useQuiz.ts:75,87` expose `reload: refreshAfterMutation`. Their list Retry buttons invoke it after an initial read failure. A second failed read then says `The note/video/quiz change succeeded` even though no mutation happened. This partially undermines historic F11's otherwise present Retry action.
```diff
-reload: refreshAfterMutation,
+reload: loadNotes,
```
Use loadVideos/loadTests for the equivalent hooks. Notes upload path `pages/Notes.tsx:72–73` should invoke an explicitly exposed `refreshAfterMutation` so genuine upload-save refresh failures remain truthful.

### ADM-06 — Low — Referrals and Review Flags errors have no Retry action

`pages/Referrals.tsx:75` does not destructure hook `reload`; error at :376 is text only. `pages/ReviewFlags.tsx:91` is also text only despite a guarded `load` function. On transient read failure, users must leave/reload the route; Review Flags additionally says `Nothing needs review` at :112–115 while error is present.
```diff
-const { referrals, settings, audit, loading, error, saveSettings, reject } = useReferrals(...);
+const { referrals, settings, audit, loading, error, reload, saveSettings, reject } = useReferrals(...);
-{error && <p className="text-red-500">{error}</p>}
+{error && <div role="alert"><p>{error}</p><button onClick={() => void reload()}>Retry</button></div>}
```
ReviewFlags uses `load()` and guards its empty row with `!error`. Dashboard similarly drops `reload` at :13 and has no retry for failed count cards; add an aggregate retry using the existing hook function.

### ADM-07 — Medium — referral filter reload silently destroys unsaved settings

`hooks/useReferrals.ts:28–46` refetches settings/audit on every status change and installs a new settings object. `pages/Referrals.tsx:95–97` unconditionally copies it to form. Repro: edit referral reward/discount without saving, select Pending/Rewarded to inspect referrals, wait for read; all unsaved settings revert without warning. The same coupling allows a response begun before settings save to replace form data during a network race.
```diff
 // Split settings bootstrap/explicit refresh from status-dependent referral list reads.
-const [list, s, log] = await Promise.all([getReferrals(status), getReferralSettings(), ...]);
+const list = await getReferrals(status);
 setReferrals(list);
-setSettings(s);
-setAudit(log);
```
Add a separate guarded `loadSettings` called on mount and after successful save, and copy into the form only on initial load/explicit reset/save confirmation. Preserve edited fields using a dirty flag and bind the confirmation dialog to a saved payload snapshot.

### ADM-08 — Medium — offset pagination is unstable under concurrent inserts/deletes

`utils/filters.ts:21–28` issues independent offset/range requests; notes/orders/products/users/referrals are ordered newest-first and paged. A new newest row after page 1 shifts the boundary, repeating an existing row on page 2; a deletion skips one. `analyticsService.ts:40–76` sums repeated paid rows, so this can overstate revenue and top products. This is distinct from the old >1000-row truncation fix, which is present. Repro with 501 synthetic rows: read first 500, insert one at the front, then offset 500; last old row repeats.
```diff
 // Financial analytics: compute the complete aggregate in one authenticated DB snapshot.
-const orders = await fetchAllPages<any>(() => ...);
+const { data, error } = await supabase.rpc("get_admin_analytics", { p_course_id: filters.courseId ?? null });
+if (error) throw error;
+return data;
```
The proposed RPC must check `am_i_admin()` and use one statement/snapshot. For lists use stable keyset `(created_at,id)` pagination with an initial upper-bound cursor; an ID Map also prevents duplicated rendering/counting but cannot repair skipped records. No schema/RPC was added in this audit.

### ADM-09 — Medium — referral settings UPDATE can report success after writing zero rows

`services/referralService.ts:28–35` checks only `.error` from `.update(...).eq("id",true)` and does not ask for a returned row. PostgreSQL RLS can hide the row without an error (for example admin membership/AAL authorization changed after the form loaded). `pages/Referrals.tsx:129–130` subsequently reports `Referral settings saved.` A missing singleton has the same behavior. Most other admin mutation services now use `.select("id").single()`; this older path was missed.
```diff
 .update(toSnakeCase(payload))
-.eq("id", true);
+.eq("id", true).select("id").single();
 if (error) throw error;
```
Do not silently upsert a missing financial-settings row. Test with a mocked zero-row update and with AAL1/staging RLS denial; no production authorization was changed.

## Prior-fix verification and non-findings

- Historic reports read FIRST in full: `git show 5460921:docs/audit/MEDVEDA_AUDIT_FIX_1_20261026.md`; final report via `git show 8a6161f^:docs/audit/MEDVEDA_BUGFIX_FINAL_2026-10-27.md` (requested old path did not exist in the checkout).
- F06: current `useRequestGuard` binds reads to filter scope, lifetime, and newest request; all list hooks except Settings use it. The original listed content/order/user hooks contain the fix. This is source verification; parent runs regression suites. Request cancellation is absent, but obsolete results are discarded. Remaining offset consistency is ADM-08, not recurrence of the filter-response overwrite bug.
- F07: AuthContext invalidates old identity/AAL checks with generation and clears authorization on blocking identity/AAL changes; auth-event bootstrap precedence is present. Same-user background transport errors preserve existing UI permission by design; RLS remains authoritative. Comment claiming admin-by-email at :68–70 is outdated: migration uses `admins.id = auth.uid()`.
- F11: Retry exists on Years/Subjects/Chapters/Notes/Videos/Quiz/Orders/Users, and Courses/Analytics. Three hook Retry messages remain wrong (ADM-05); Referrals/ReviewFlags/Dashboard lack equivalent controls (ADM-06).
- Financial write boundaries: order status uses narrow `admin_set_order_status` RPC and rejects paid/refunded status locally; source RPC checks admin and updates only created/unpaid rows. No client paid-grant control found. Referral rewards are server-owned; admin only rejects referrals.
- Quiz answer boundary: admin reads use `get_admin_quiz_tests` with server `am_i_admin()` guard; direct quiz writes return only permitted `id`. Current source RPC/column grants match the admin service contract. Hosted migration parity is unverified.
- Upload security: notes uploads go through trusted Edge validation, use a stable request UUID, and atomic `save_note_with_upload`; final SQL checks admin, owner, ready upload and repeated payload, including deleted-note retry repair. Form closes are disabled while saving. Direct upload does not expose a service-role key. Admin-only signed preview is distinct from mobile entitlement checks. External-URL fallback accepts old persisted identifiers; no untrusted write path was established in this scoped review, so no new exploit is claimed for it.
- Diagnostic controls discard results on account change; services call Auth `getUser` on the exact bearer token, `am_i_admin`, and AAL2 before Edge invocation; fixed error messages/redaction bound exposure. The pricing Vercel rewrite targets a fixed Supabase endpoint. No token persistence or arbitrary destination was found.
- Current auth bridge uses memory-only clients (`persistSession:false`, `autoRefreshToken:false`, `detectSessionInUrl:false`), immediately strips URL hash once auth-common runs, uses textContent for errors/verified email, and challenges verified TOTP factors without enrolling replacements. Recovery controller is copied from mobile by the build. Account-verification current source verifies token with Auth and requires `email_confirmed_at` before success, so older apparent-success issue is fixed in source.
- Website home fragment routing allows only fixed `/reset-password` or `/account-verified`; admin protected route saves only `location.pathname` as return route. No independently attacker-controlled open redirect was confirmed. URL fragments are not sent in HTTP Referer headers; legacy risks are DOM/history/scheme behavior, not a demonstrated referrer leak.
- Public website config contains a publishable key, not a server credential. No environment-file contents were printed or copied. `.vercel/project.json` files expose no rootDirectory/build/output fields, so they do not establish the actual deployed root.
- Current website/generated privacy explicitly discloses Google Fonts, Expo, Sentry when configured, Seoul hosting, local study-cache remnants, unencrypted downloaded PDFs and unqualified retention cleanup. Actual release encryption behavior is with the mobile reviewer; do not infer hosted/device truth from this copy.

## UNVERIFIED operational gates — do not label these deployed defects or completed fixes

### ADM-10 — High acceptance gate: required admin MFA

`supabase/migrations/20261001100000_admin_mfa_aal2.sql:13–16,27–30` seeds `require_mfa=false`; Login explicitly permits skipping enrollment if am_i_admin allows it (`Login.tsx:88–90,210–213`). This is a rollout switch, not proof that production still has MFA off. Source alone cannot establish enforced AAL2.

Owner read-only checks (do not select secrets or MFA secret columns):
```sql
select id, require_mfa from public.admin_settings where id = true;
select count(*) as admins_without_verified_totp
from public.admins a
where not exists (select 1 from auth.mfa_factors f
  where f.user_id = a.id and f.factor_type = 'totp' and f.status = 'verified');
select pg_get_functiondef('public.am_i_admin()'::regprocedure);
```
Then use synthetic staging admin AAL1/AAL2 sessions: AAL1 must fail direct sensitive table/RPC/Edge calls, AAL2 succeed, and non-admin AAL2 fail. Test from a clean session and after sign-out/account-switch. Enrollment recovery and owner rollout are separate operational decisions; no flag update was executed.

### WEB-05 — High acceptance gate: deployed bridges and security headers

`website/DEPLOYMENT_CHECKLIST.md:8–9` explicitly says headers were not live on its historic check date. This is old evidence, not a current result. Current Vercel source has restrictive CSP, HSTS, frame-ancestors none, no-sniff; auth routes have no-referrer/no-store. Check actual production and all aliases with HEAD/GET for `/`, `/reset-password`, `/account-verified`, `.html` aliases, and unknown paths; verify no stale assets/old roots are served. Check Supabase Auth redirect allowlist/Site URL/email sender and reset/verification emails on synthetic staging accounts, expired/used link, MFA, network failure and custom-scheme handoff in Gmail/Chrome. Never paste real tokens into logs or audit evidence.

Proposed deployment configuration adjustment only if legacy aliases remain reachable: explicitly map their fixed paths to current bridges/policies and apply equivalent no-store/no-referrer to both clean and `.html` auth paths. This is not a deployment action.

### WEB-06 — Medium acceptance gate: privacy/data-safety promises

Check actual DB region, processors/SDK release configuration, export/erasure/local-cache behavior, retention job active state/last success/overdue aggregate, provider retention, backup rotation, purchase channel and Store data-safety declarations. Current source openly marks several settings unverified; no operational claim can be closed without evidence. Legacy contradictory copies are separately confirmed as WEB-04. This audit offers no legal opinion about the cited statutes or provider timelines.

## Complete coverage and verification method

All 122 files under `admin-panel/src` were read in complete batches: entrypoints/layout, auth/config, 41 components, 16 hooks, 17 pages, 21 services, types and utilities, CSS and declarations. Truncated middle sections in the first hooks output were re-read in a smaller complete batch (`useNotes/useOrders/useProducts/useQuiz`); the other shown hook files were intact. Admin build/hosting configs, TS configs, public redirects and README also reviewed. Parent performs build/test checks; they were not duplicated here.

All website JavaScript, generator, link checker, test source, complete `_src` page fragments/FAQ/icons, CSS, manifest, robots/sitemap, deployment docs and Vercel config were read. A first combined page output clipped the shipping/features boundary; both were re-read in full separately. The 17 actual committed generated HTML files were read by an in-memory interception of the fully reviewed generator, capturing every output byte and comparing against every committed actual file: ALL 17 matched exactly (no changed/truncated/ignored sections). The generator's `writeFileSync` dependency was replaced with an in-memory collector; no product file was written. This composition review accounts for every actual generated byte through its completely reviewed layout/page/FAQ/icon sources and substitutions; it is not a claim to have manually re-read 17 repeated layout copies line by line.

All five root legacy HTML files were read in full, including reset and legal pages. All five GitHub originals were read/byte-compared; they exactly equal the corresponding root copies (including index SHA-256 `483cd4817f5b21982bf55eff5708e46000920b3d48c51016fd96029d6f4bebb8`). Other four original legal/reset pages were also displayed separately. No unrelated duplicate was deleted.

Migration review was focused on admin/service contracts: full files for MFA, legacy policy retirement, order RPC, referral limits/audit, note-upload retry RPC, quiz answer boundary, admin signed-link MFA, and maintenance RPC; excerpts for Play status view and baseline product MRP constraint. Full migration coverage belongs to the backend reviewer. No live queries, emails, pushes, billing, schema writes, deployment or application changes occurred.

## Parent public HTTP verification received after source review

Parent performed read-only public GET/header checks retained in `public-pages.json`: canonical `www.medveda.in` home, reset-password, reset-password.html (redirecting clean), account-verified, privacy-policy and delete-account serve 200 modern pages. Tested bridges contain no retired scheme. CSP/HSTS/DENY/nosniff are present; reset/account-verified carry no-store/no-referrer. All six tested `medveda-website.vercel.app` URLs returned 404. Accordingly WEB-01/WEB-02/WEB-04 remain confirmed legacy SOURCE issues, **not exposed at the canonical/alias paths tested**. WEB-05 security-header/modern-bridge portion is verified by that public evidence; synthetic auth/email/MFA/device lifecycle, other deployment roots and dashboard allowlist/sender remain unverified. Earlier historic checklist statement about missing live headers is superseded for these tested paths.

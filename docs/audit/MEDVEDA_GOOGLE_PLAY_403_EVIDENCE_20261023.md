# MedVeda Google Play 403: evidence and unresolved cause

Investigation date: 23 October 2026 UTC. Package: `in.medveda.app`. Supabase: `xbvenkfmesugrbjuufyw`.

## 1. Executive summary

**The root cause of Google's `convertRegionPrices` denial is still UNPROVEN. No authorization fix or production deployment has been performed.** The retained event proves the catalog stopped at price conversion with HTTP 403; it does not identify the missing permission or account prerequisite. A fresh read-only production snapshot at **2026-10-23 22:46:33 UTC** confirms that both INR 1 and INR 2 catalog jobs remain failed, there are **zero verified active tiers**, and all four Play cron jobs are **disabled**. The deployed `sync-play-catalog` v3 bundle is byte-for-byte identical to the October 20 bundle and still calls conversion before PATCH. The local explicit-India workaround is not deployed. The user confirmed during this investigation that no saved matrix output exists and will run the MFA-protected diagnostic and provide its redacted JSON. Until that result or equivalent primary evidence arrives, a specific root cause would be speculation.

Evidence: [current production state](evidence/play-403-investigation-20261023/catalog-state.json), [deployed function inventory](evidence/play-403-investigation-20261023/functions.json), [bundle fingerprints](evidence/play-403-investigation-20261023/deployed-source-checks.json), [actual deployed creation function](evidence/play-403-investigation-20261023/sync-play-catalog-source-excerpt.txt), [historical Google diagnostic](evidence/play-403-focused-20261020/google-diagnostics.json).

**One previously unknown prerequisite is now established:** the actual EAS production AAB with **versionCode 4** contains `com.android.vending.BILLING` and BillingClient metadata **8.3.0** in its compiled base manifest. Missing BILLING in that build is eliminated. Whether this exact artifact is the one Play accepted, and on which track, remains unverified. See the [decoded manifest](evidence/play-403-investigation-20261023/aab-v4-base-manifest.xml) and [artifact verification](evidence/play-403-investigation-20261023/aab-v4-manifest-verification.json).

The user's previously verified account, merchant setup, permissions, API enablement, configured identity MATCH, and successful OAuth checks are accepted as supplied facts. They were not repeated. The owner-account Console failure is also accepted as a reported observation, but its exact request, response, screenshot, and timestamp are not available locally. A simultaneous owner failure would make an account/app restriction more plausible; it would not by itself prove that the API denial has the same cause or exclude a concurrent service-account issue.

## 2. Hypothesis table

“ELIMINATED” applies only to the narrow statement in its row. “INCONCLUSIVE” means UNPROVEN; the last column describes a discriminating test, not a finding.

| Hypothesis | Test performed | Raw evidence | Verdict / next discriminating test |
| --- | --- | --- | --- |
| The observed failure occurs during product PATCH or activation. | Read persisted error and inspect deployed creation sequence. | INR 1 error says `catalog.price-conversion status=403`; conversion precedes PATCH in downloaded v3 source. | **ELIMINATED for this event.** Authorization for subsequent operations remains unknown because execution did not reach them. |
| The conversion request builder uses the wrong documented route, method, or Money field types. | Compare downloaded deployed source with current conversion and Money references. | Exact request reconstructed in section 3; `units` is a string and `nanos` an integer. | **ELIMINATED as a source-level mismatch.** This is not a wire capture; a same-token independent client remains needed to eliminate transport differences. |
| The legacy migration error proves this identity cannot use the new catalog API. | Compare the legacy and current resources; review retained records. | The user reports an expected legacy migration 403; no same-token raw matrix is yet supplied. | **INCONCLUSIVE; legacy denial is not evidence of new-API denial.** Evaluate the new endpoint directly. |
| A Google GET 204 establishes product-list authorization and a usable empty catalog. | Search retained evidence and compare list response contract. | Only related retained 204 is Supabase diagnostic `OPTIONS`, not Google GET. This does not contradict the user's separate observation. | **INCONCLUSIVE.** Require actual method, URL, Google status, headers, body format and body. Do not silently turn 204 into an empty list. |
| The stated service account lacks an effective operation permission. | Accept supplied permission checks; inspect diagnostic capabilities and official permission definitions. | Source uses `androidpublisher`; the current matrix uses one token for four calls. No fresh matrix or Google grant response is available. | **INCONCLUSIVE.** Compare same-token reads and approved catalog writes. Successful reads do not prove writes; generic 403 does not name the denied permission. |
| The configured JSON identity MATCH proves the actual OAuth identity and active key ID. | Inspect the existing diagnostic and JWT builder. | Identity diagnostic compares `client_email`; it does not call tokeninfo. JWT builder ignores `private_key_id` and has no `kid`. | **ELIMINATED as an inference.** Accept the reported MATCH; tokeninfo and IAM key metadata are separate evidence. Absence of `kid` alone is not identified as a defect. |
| INR 1/2 price range or a tax-related input causes the denial. | Check documented Money/request schema; inspect INR 1 request. | No fresh INR 49 API conversion has been run; Console INR 49 failure is user-reported. | **INCONCLUSIVE.** Compare INR 49 then INR 1 using the same token. Neither a conventional price nor generic 403 proves input validity. |
| Merchant/account/app eligibility blocks both Console and API. | Read current setup/merchant requirements; search for retained Console evidence. | No primary owner-session response/screenshot, payment status, or monetization banner is available. | **INCONCLUSIVE.** Capture owner failure and exact account/app status at the same time; compare owner-authorized API behavior if available. |
| VersionCode 4 was built without the BILLING permission. | Download the exact EAS v4 artifact, validate ZIP/hash, decode its compiled manifest with official bundletool 1.18.3. | Manifest package `in.medveda.app`, versionCode `4`, one unconditional `com.android.vending.BILLING`, BillingClient metadata `8.3.0`. | **ELIMINATED for this exact build.** It does not establish Play-uploaded artifact identity or accepted/published track state. |
| Codes `747033DA` / `6BD69E70` identify a known public root cause. | Exact-code web search and Issue Tracker search. | No relevant indexed results found for either code; no retained screenshots. | **INCONCLUSIVE.** Treat as opaque support identifiers, not a permission or merchant-status mapping. Ask Google to resolve them. |
| Linking Play Console to a Cloud project is mandatory for API access. | Read current official Getting Started page. | Google explicitly says developer-account/Cloud-project linkage is no longer needed. | **ELIMINATED as a general prerequisite.** This is distinct from Cloud Billing linkage and merchant profile linkage. |
| An unlinked Cloud Billing account causes this method's 403. | Read official API setup and quota documentation. | Those pages do not state Cloud Billing linkage as a prerequisite. No `BILLING_DISABLED` response or Cloud account-state evidence is available. | **INCONCLUSIVE for this incident.** Absence from a setup checklist is not a controlled experiment. Do not attach billing speculatively. Obtain ErrorInfo/support confirmation or an authorized controlled comparison. |
| API restrictions, organization policy, VPC-SC, quota, or consumer-project mismatch cause the denial. | Inspect request code and published quota guidance. | Builder sends no API key or explicit `x-goog-user-project`; no Cloud audit/metrics evidence is available. | **INCONCLUSIVE.** No API-key restriction is evidenced by this bearer-only request; broader project restrictions remain untested. |
| Catalog cron is currently active and repeatedly reproducing the error. | SELECT-only production snapshot inside READ ONLY transaction, then ROLLBACK. | All four Play cron rows have `active:false`. | **ELIMINATED at capture time.** This does not exclude manual calls. Historical active/inactive reports refer to different times. |
| The explicit-India workaround is already running in production. | Download deployed v3 bundle; compare hash and source. | SHA-256 matches October 20; deployed creation still invokes conversion and lacks `PLAY_CATALOG_REGIONS_VERSION`. | **ELIMINATED.** Local code is a different version; it cannot explain current hosted behavior. |
| Removing conversion has already proven PATCH/activation/checkout works. | Inspect local implementation and run existing offline tests. | 17 Deno tests and 122 mocked worker scenarios pass; no real catalog writes or purchase occurred. | **ELIMINATED as a success claim.** Workaround contract is plausible, runtime success unproven. |

Source references: [conversion](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization/convertRegionPrices), [Money](https://developers.google.com/android-publisher/api-ref/rest/v3/Money), [new product list](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization.onetimeproducts/list), [Users and permissions](https://support.google.com/googleplay/android-developer/answer/9844686?hl=en), [API access setup](https://developers.google.com/android-publisher/getting_started), [quotas](https://developers.google.com/android-publisher/quotas). All were fetched during this investigation. No cited source maps this generic 403 to one specific permission.

## 3. Raw evidence appendix, with boundaries

### A. Retained failure, not the complete Google response

The October 20 evidence file contains a read of this **October 19** event:

```json
{
  "timestamp": "2026-10-19T13:31:36.942000",
  "operation": "catalog.price-conversion",
  "http_status": 403,
  "reason": "PERMISSION_DENIED",
  "requestId": "b96214d9-ab84-439b-a1d0-a1a07dfcb739",
  "details": []
}
```

`requestId` is an **application-generated correlation UUID**, not a Google request ID. The shared error parser selects known reason labels and structured detail fields, discards free-form messages, and captures no response headers. Therefore `details: []` does not prove Google's original response lacked details. Original `error.errors[]`, arbitrary `error.details[]`, ErrorInfo metadata, complete headers, and Google's request identifier cannot be recovered from this event. The wording “The caller does not have permission” comes from the user's diagnostic observation, not this retained JSON.

The fresh log query returned no rows and no query error. It does not erase the retained event or prove that no later requests occurred. The fresh database snapshot still contains the same INR 1 correlation UUID. Reported reproductions on October 20–23 remain user-supplied observations until their captures are available.

### B. Exact reconstructed production request

Derived from the freshly downloaded v3 source plus INR 1 catalog row; **not a retained outgoing wire capture**:

```http
POST https://androidpublisher.googleapis.com/androidpublisher/v3/applications/in.medveda.app/pricing:convertRegionPrices
Authorization: Bearer [REDACTED]
Content-Type: application/json

{"price":{"currencyCode":"INR","units":"1","nanos":0}}
```

The configured package is locked to `in.medveda.app` in the shared helper. The colon is literal. The URL contains no region query parameter; `regionVersion` is a conversion response field. No optional `productTaxCategoryCode` is sent. This matches the current [conversion request](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization/convertRegionPrices) and [Money types](https://developers.google.com/android-publisher/api-ref/rest/v3/Money). The INR 49 control substitutes `"units":"49"`; the exact INR 2 body substitutes `"units":"2"`.

### C. Fresh production snapshot

```text
2026-10-23T22:46:33.271823+00:00
sync-play-catalog: ACTIVE, version 3
deployed bundle SHA-256:
25eeb7fc54b95113d93703376563d6d673f2bb4a3ce5f06655fbcd3265a1d23f

play-catalog-sync  active=false
play-consume       active=false
play-reconcile     active=false
play-voids         active=false

verified_active_tiers=0
INR 1: failed, attempts=2, last_synced_at=null
INR 2: failed, attempts=1, last_synced_at=null
```

The original “active” catalog snapshot was taken October 19 at 05:11:03 UTC; a later snapshot at 05:25:46 has `active:false`, as do October 20 and today's snapshots. See [before](evidence/play-403-execution-20261019T0510/preflight-before.json), [after](evidence/play-403-execution-20261019T0510/preflight-final.json), and [October 20](evidence/play-billing-forensic-20261020/hosted-state.json). Disabled cron explains why scheduled provisioning will not resume automatically, but **does not explain Google's 403**.

The [corrected provider count](evidence/play-403-investigation-20261023/play-order-counts-correction.json), captured at **22:55:32 UTC**, reports **0 Play orders, 0 Play payments and 0 successful Play payments**. The initial order-count predicate used `google_play`; source review showed the actual provider label is `play`, so that initial count must not be relied on. The corrected query uses `play` and leaves the original evidence intact. These counts do not prove an external tester's Google purchase history. A licensed purchase, receipt verification, entitlement unlock and refund/void reversal remain unverified.

### D. What the deployed matrix can actually establish

`diagnose-play-matrix` v2 is deployed and uses one freshly obtained/cached token for tokeninfo, legacy products GET, new one-time products GET, and INR 1 conversion. Its outer HTTP 200 only means the diagnostic returned a matrix; use each element's `http_status`. It preserves redacted JSON/text and marks empty bodies explicitly.

It captures only `x-goog-request-id`, `x-guploader-uploadid`, `www-authenticate`, `server`, and `date`, plus content type. It does **not** capture every header, INR 49, subscriptions/reviews/orders, active key metadata, or outgoing body/headers. A missing header in its JSON can mean it was not collected. Tokeninfo verifies the token used by that diagnostic run, not the expired token of an October 19 request or another function isolate.

Downloaded-source evidence: [header capture and redaction](evidence/play-403-investigation-20261023/diagnose-play-matrix-source-excerpt.txt), [four exact request definitions](evidence/play-403-investigation-20261023/diagnose-play-matrix-steps.txt). No claim that all requested Phase 1/2 fields are collected is made.

No MFA bypass, user impersonation, production-secret retrieval or worker invocation was attempted. The user will supply this diagnostic's redacted result from their own session. If it remains generic, the remaining read-only ladder must run in one credential-holding process, capturing all available headers and redacted complete bodies:

| Operation | Method/path | Status in this investigation |
| --- | --- | --- |
| Token identity | `GET https://oauth2.googleapis.com/tokeninfo` for the exact token | Pending user's matrix |
| Current product list | `GET /applications/in.medveda.app/oneTimeProducts?pageSize=1` | Pending user's matrix |
| Subscriptions list | `GET /applications/in.medveda.app/subscriptions?pageSize=1` | Not run |
| Reviews list | `GET /applications/in.medveda.app/reviews?maxResults=1` | Not run |
| Financial read | `GET /applications/in.medveda.app/orders/{knownRealOrderId}` | Not run; requires an actual known order, not a fabricated ID |
| Price control | `POST /applications/in.medveda.app/pricing:convertRegionPrices`, INR 49 | Not run |
| Production price | Same conversion, INR 1 and INR 2 | Fresh runs pending/not run |
| Draft edit insert/delete | `POST /applications/in.medveda.app/edits`, then delete only returned edit | Not run; a write experiment requiring approval |
| Test product PATCH/activate | Exact requests in section 4 | Not run; requires approval |

Read methods: [subscriptions](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization.subscriptions/list), [reviews](https://developers.google.com/android-publisher/api-ref/rest/v3/reviews/list), [orders.get](https://developers.google.com/android-publisher/api-ref/rest/v3/orders/get). A 404 for a fake order cannot demonstrate access to financial records. `edits.insert` is a draft mutation and is not a pure test of all store-presence permissions. [Google's edit workflow](https://developers.google.com/android-publisher/edits) also documents interactions with Console changes; it should not run concurrently with release editing.

### E. VersionCode 4 compiled-artifact evidence

Fresh EAS `build:view` identified existing completed production build `50890688-cbf8-4e69-833e-1c801dd4743c`, created October 18 at 16:15:21.762 UTC, completed 16:30:21.030 UTC. Its application archive was downloaded, without rebuilding, to `/tmp/medveda-versioncode-4.aab`. Initial Python downloads failed with DNS/HTTP errors; a subsequent download through the installed EAS HTTP implementation succeeded with HTTP 200. Those artifact-transfer failures are unrelated to the Google Publisher 403.

```text
AAB bytes: 91065334
AAB SHA-256: 11eb7ebdb20eb92ea2886377e10a150fc77ff6a85254c46259273dcf698be5a3
ZIP integrity: PASS
Base manifest: decoded by official google/bundletool 1.18.3
package: in.medveda.app
versionCode: 4
versionName: 1.2.0
uses-permission: com.android.vending.BILLING (exactly one; no maxSdkVersion restriction)
com.google.android.play.billingclient.version: 8.3.0
targetSdkVersion: 36
```

Reproducible local command:

```bash
java -jar /tmp/medveda-bundletool.jar dump manifest \
  --bundle=/tmp/medveda-versioncode-4.aab --module=base
```

Evidence: [EAS metadata](evidence/play-403-investigation-20261023/eas-v4-metadata.json), [artifact hash](evidence/play-403-investigation-20261023/eas-v4-artifact.json), [ZIP result](evidence/play-403-investigation-20261023/aab-v4-zip-validation.json), [manifest](evidence/play-403-investigation-20261023/aab-v4-base-manifest.xml), [structured manifest verification](evidence/play-403-investigation-20261023/aab-v4-manifest-verification.json), [official bundletool URL and hash](evidence/play-403-investigation-20261023/bundletool.json). Google's [bundletool documentation](https://developer.android.com/tools/bundletool) links to its official repository. The old `MEDVEDA_AAB_FINAL_VERIFICATION.md` describes versionCode 2 and was not used to certify v4.

**Attempt to disprove the missing-permission hypothesis:** inspect the binary rather than app.json or Gradle declarations. The compiled permission disproves its absence in this EAS build. The narrower remaining hypothesis is that Play has a different/missing artifact or an unaccepted/unpublished release; that requires Console evidence and remains open.

## 4. Exact next steps and conditional fixes

**No root-cause fix is justified yet.** Keep the evidence-driven sequence below; do not change permissions, link Cloud Billing, rotate keys, retry catalog jobs, or deploy the workaround merely because a hypothesis is plausible.

1. Evaluate the pending matrix. Record tokeninfo email/authorized-party or audience/scope **if present**, each operation's actual HTTP status, full redacted error object and available Google request identifiers. Missing tokeninfo fields must remain missing, not inferred. Compare the configured key ID privately with **Cloud Console → IAM & Admin → Service Accounts → medveda-play-billing → Keys**; record only a match/status result. Do not paste the key or token.
2. As owner, inspect **Play Console → in.medveda.app → Monetize with Play → Products → One-time products**, and the app's setup/dashboard. Record blocking text and the exact step that failed. An approved reproduction should use a reserved test SKU, distinguish Save/Draft from Activate, and record UTC time, screenshot, and the failing network response with cookies/authorization removed. The current [one-time-product guide](https://support.google.com/googleplay/android-developer/answer/16430488?hl=en) distinguishes saved DRAFT purchase options from ACTIVE ones returned by Billing Library.
3. Inspect **Play Console → Settings → Monetization → Payments profile → How you get paid** and its verification messages; also inspect **Developer account → About you**, linked profile identity status, merchant country and tax tasks. Record the displayed status rather than treating “profile exists” as “all verification complete.” Google separately documents [merchant linkage](https://support.google.com/googleplay/android-developer/answer/3092739?hl=en) and [identity/payment-method verification](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en). Neither page proves that a pending payout step is the cause of this conversion 403.
4. Inspect the uploaded **versionCode 4** in **Test and release → App bundle explorer/Latest releases and bundles**, its permissions, and its actual testing-track release state. Match its package/version/digest to the EAS artifact described below. A completed EAS build is not evidence of Play ingestion or track publication. Google requires a Billing-enabled published build to enable Console billing features; an internal test track can satisfy that requirement. [Billing setup](https://developer.android.com/google/play/billing/getting-ready). The manifest permission requirement is stated in [Play Console Help](https://support.google.com/googleplay/android-developer/answer/1153481?hl=en).
5. Inspect **Cloud Console → APIs & Services → Google Play Android Developer API → Metrics / Quotas**, scoped to the service-account project, method and captured interval; inspect available denied-request logs and organization/VPC service controls. A missing log is not proof of no restriction. User-supplied API enablement is already accepted. Inspect, rather than broaden, effective app/account permissions if the matrix gives contrary evidence. The [permission guide](https://support.google.com/googleplay/android-developer/answer/9844686?hl=en) lists product/pricing editing under Manage store presence; it does not name an exclusive permission for conversion.
6. If a specific blocking condition is found, attempt to disprove the proposed cause using the same method/body with a suitable control before changing it. After an approved correction, repeat the identical failing request and the relevant control. A successful isolated API call is necessary evidence, not an end-to-end purchase result.

### Explicit India pricing: contract review and prepared write experiment

The current [PATCH reference](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization.onetimeproducts/patch) requires `updateMask` and `regionsVersion`; `allowMissing=true` permits creation. [Batch update](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization.onetimeproducts/batchUpdate) supplies these fields per request. Neither requires conversion output as the exclusive source of a version. [RegionsVersion](https://developers.google.com/android-publisher/api-ref/rest/v3/RegionsVersion) points to published supported-location information and describes compatibility with older region configurations.

The [resource schema](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization.onetimeproducts) allows explicit region/price/availability entries. Omitting `newRegionsConfig` prevents automatic availability in future regions. Thus an explicit India/INR body is supported structurally; successful acceptance for this app is **UNPROVEN**. The local `2022/02` allowlist comes from historical documentation. The [current supported-locations help](https://support.google.com/googleplay/android-developer/answer/10532353?hl=en) delegates to a dynamic portal that this browser could not retrieve. Current acceptance of that configured version was not verified.

The following concrete candidate is **prepared for review only, NOT RUN and NOT approved**. Before execution, establish an accepted documented version and perform GET on the exact test SKU; proceed only on a genuine Google 404 and with no concurrent creation of that ID. PATCH with `allowMissing` can update an existing product. Use a new reserved diagnostic ID if it already exists. Do not overwrite a customer SKU.

```http
PATCH https://androidpublisher.googleapis.com/androidpublisher/v3/applications/in.medveda.app/onetimeproducts/zz_diag_test_20261023?allowMissing=true&updateMask=listings%2CpurchaseOptions&regionsVersion.version=2022%2F02
Authorization: Bearer [REDACTED]
Content-Type: application/json

{
  "packageName": "in.medveda.app",
  "productId": "zz_diag_test_20261023",
  "listings": [{
    "languageCode": "en-US",
    "title": "MedVeda diagnostic test",
    "description": "Reserved diagnostic product for an approved billing test."
  }],
  "purchaseOptions": [{
    "purchaseOptionId": "buy",
    "buyOption": {"legacyCompatible": true, "multiQuantityEnabled": false},
    "regionalPricingAndAvailabilityConfigs": [{
      "regionCode": "IN",
      "price": {"currencyCode": "INR", "units": "49", "nanos": 0},
      "availability": "AVAILABLE"
    }]
  }]
}
```

Read back with `GET /androidpublisher/v3/applications/in.medveda.app/oneTimeProducts/zz_diag_test_20261023`. Inspect identity, price, region, version and DRAFT state. Only after approval explicitly covering activation:

```http
POST https://androidpublisher.googleapis.com/androidpublisher/v3/applications/in.medveda.app/oneTimeProducts/zz_diag_test_20261023/purchaseOptions:batchUpdateStates
Authorization: Bearer [REDACTED]
Content-Type: application/json

{"requests":[{"activatePurchaseOptionRequest":{"packageName":"in.medveda.app","productId":"zz_diag_test_20261023","purchaseOptionId":"buy"}}]}
```

This is the documented [purchase-option activation method](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization.onetimeproducts.purchaseOptions/batchUpdateStates); there is no invented standalone product `activate` endpoint. Then perform an independent GET. Activation makes the diagnostic purchase option available subject to Play distribution conditions, so it is a distinct production write.

The local workaround already exists in `_shared/playCatalog.ts`; this investigation made no changes to it. It must not be deployed as a proven fix unless the evidence justifies it. If authorized later, validate creation → activation → independent read-back → catalog ready → app BUY → licensed test purchase → `verify-play-purchase` → notes access → refund/void reversal, retaining before/after evidence at every step. Cron enablement is a separate action; all four jobs are currently off.

## 5. Remaining risks and unverified work

- Google's complete current 403, actual diagnostic token identity, active key comparison, INR 49 comparison, and full same-token permission ladder are pending.
- Actual PATCH, activation and read-back permissions are unknown. Local tests cannot settle them.
- Owner Console error details, merchant verification/tax status, uploaded-artifact match, track publication, and any app/account eligibility restriction are unknown.
- No Google Cloud account access is available through current tools. No connected Play/Cloud integration was found in the plugin search. Private account state was not inferred from public documentation.
- No real licensed purchase, receipt verification, entitlement unlock, refund or void test was run. There is no before/after fix evidence because no root-cause fix has been established or applied.
- The matrix response captures only selected headers; absent Google IDs may require expanded diagnostic capture or a Google-side trace.

Local verification: [test log](evidence/play-403-investigation-20261023/local-test.log): **17 Deno tests passed**, **122 mocked worker scenarios passed**, zero failures. Tests use fixtures and no live Google/database requests. No application code, deployment, secret, product, permission, cron setting or production row was changed. Local additions are this report and evidence files. The [read-only collector](evidence/play-403-investigation-20261023/collect_readonly.py) records its SELECT-only transaction and downloaded-source fingerprints for reproducibility.

## 6. Google Play Developer Support ticket and minimal repro

This text is ready to copy, with the explicitly marked fields completed from the next capture. It has **not been sent**.

> Subject: in.medveda.app — pricing:convertRegionPrices returns 403; owner also reports one-time-product Console failures
>
> We need the precise backend denial reason and the corrective action for Google Play Developer API `monetization.convertRegionPrices`.
>
> Package: in.medveda.app  
> Service account: medveda-play-billing@medveda-play-billing.iam.gserviceaccount.com  
> Service-account Cloud project: medveda-play-billing  
> Hosting project: Supabase xbvenkfmesugrbjuufyw  
> Method: POST https://androidpublisher.googleapis.com/androidpublisher/v3/applications/in.medveda.app/pricing:convertRegionPrices  
> OAuth scope: https://www.googleapis.com/auth/androidpublisher  
> Request body: {"price":{"currencyCode":"INR","units":"1","nanos":0}}
>
> Retained failure timestamp: 2026-10-19 13:31:36.942 UTC. The application recorded HTTP 403 / PERMISSION_DENIED at catalog.price-conversion. The owner reports additional reproductions October 20–23 and a diagnostic message, “The caller does not have permission.” The original complete Google response for the October 19 event was not retained.
>
> Google request ID: NOT AVAILABLE in the retained event. Application correlation ID b96214d9-ab84-439b-a1d0-a1a07dfcb739 is locally generated and is NOT a Google request ID.  
> Latest diagnostic UTC time / Google request ID / response headers / ErrorInfo: [attach the next redacted capture; currently pending].  
> Same-token endpoint matrix and tokeninfo identity: [attach next diagnostic JSON; currently pending].
>
> The owner has confirmed an active developer account, existing app and India merchant profile, enabled Android Publisher API, correct configured service-account email, successful OAuth token acquisition with the stated scope, and accepted/non-expiring app access including financial data, orders/subscriptions and store-presence permissions. The error persisted beyond 48 hours. We are not treating those checks as proof of app-level monetization eligibility or operation-level effective access.
>
> The account owner also reports failures saving/activating an INR 49 one-time product in Play Console with codes 747033DA and 6BD69E70. Exact Console UTC timestamps, screenshot and sanitized failing network response: [pending]. Please resolve those codes and determine whether they share a cause with the API failure.
>
> Please identify: (1) the specific denied permission or precondition and effective principal/consumer project; (2) any app monetization, merchant, verification, policy, or publishing-state block; (3) whether this method has a Cloud Billing requirement affecting this project; and (4) the supported remediation. We have not changed permissions, linked Cloud Billing, rotated credentials, or modified products merely to test guesses.
>
> The retained INR 1 catalog execution stopped before PATCH; the INR 2 record contains only a generic 403. No product PATCH/activation success is established. Please provide a traceable explanation rather than assuming successful OAuth or a product-list response proves monetization-write eligibility.
>
> We independently inspected the EAS production versionCode 4 AAB (build 50890688-cbf8-4e69-833e-1c801dd4743c, SHA-256 11eb7ebdb20eb92ea2886377e10a150fc77ff6a85254c46259273dcf698be5a3). Its compiled base manifest contains com.android.vending.BILLING and BillingClient metadata 8.3.0. Matching that digest/build to the artifact accepted by Play and its active track remains pending.

Minimum standalone curl control, **prepared, not executed**. Run on an authorized credential-holding machine. The header file must contain a short-lived `Authorization: Bearer …` line, be readable only by its owner, and never be shared. This avoids putting the token in curl's command-line arguments. Do not use verbose/trace mode. It is the *same-token* control only if the credential-holding diagnostic process supplies the exact same token; minting another token cannot establish that fact.

```bash
umask 077
curl --silent --show-error --max-time 30 \
  --request POST \
  --header @/secure/path/google-oauth-header.txt \
  --header 'Content-Type: application/json' \
  --data-binary '{"price":{"currencyCode":"INR","units":"49","nanos":0}}' \
  --dump-header medveda-google-inr49.headers \
  --output medveda-google-inr49.body \
  --write-out 'HTTP %{http_code}\n' \
  'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/in.medveda.app/pricing:convertRegionPrices'
```

Repeat with `units:"1"` and separate output filenames using the same token. Keep complete response files private until redacted; attach their redacted contents, UTC timestamps and actual Google request identifiers to the ticket. A response with no Google request-ID header should be reported as such, never filled with the application's UUID.

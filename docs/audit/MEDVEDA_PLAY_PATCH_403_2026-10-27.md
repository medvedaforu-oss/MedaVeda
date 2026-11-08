# MedVeda One-time Products PATCH 403

Investigated 2026-10-27 UTC. **The cause of Google's PATCH denial is not provable from retained evidence. A diagnostic information-loss defect is confirmed and corrected locally.** No deployment, worker invocation, job retry, price change, Cron change, or Google Play catalog write was performed. Existing uncommitted India-pricing changes were preserved.

Read-only production evidence confirms ACTIVE worker **v5** and the failed ₹2 job in both `play_price_sync` and `play_price_sync_logs`, recorded at **2026-10-27 18:42:57.283597 UTC**. The retained error is:

```text
Google API operation=catalog.patch status=403 reason=PERMISSION_DENIED request=7ef24be0-59aa-4a4e-a62b-6d94db8cbb5c
```

The `request=` value is an **application correlation ID**: `GoogleApiError` generates it with `crypto.randomUUID()`. It was not read from a Google response header or `google.rpc.RequestInfo`. Do not submit it as a confirmed Google request ID.

Evidence: [production-readonly.json](evidence/play-patch-403-20261027/production-readonly.json). The worker source download SHA-256 is recorded there. Source inspection confirms the explicit India pricing builder and the lossy error parser. No production secret value or runtime token was retrieved. A follow-up source read failed with a network error; this does not invalidate the successful earlier reads.

## Reconstructed production request and contract comparison

The deployed `createOneTimeProduct()` was inspected. Combining that builder with the persisted job produces the following request. This is a reconstruction, not a wire capture; the runtime regions-version value was not recovered.

```http
PATCH https://androidpublisher.googleapis.com/androidpublisher/v3/applications/in.medveda.app/onetimeproducts/notes_2_00_v_d93112f242a94a9b83d5bb2c31ef11a3?updateMask=listings%2CpurchaseOptions&allowMissing=true&regionsVersion.version=<configured-version>
Authorization: Bearer <omitted>
Content-Type: application/json
```

```json
{
  "packageName": "in.medveda.app",
  "productId": "notes_2_00_v_d93112f242a94a9b83d5bb2c31ef11a3",
  "listings": [{
    "languageCode": "en-US",
    "title": "MedVeda content INR 2",
    "description": "One purchase of MedVeda digital content selected in the app."
  }],
  "purchaseOptions": [{
    "purchaseOptionId": "buy",
    "buyOption": { "legacyCompatible": true, "multiQuantityEnabled": false },
    "regionalPricingAndAvailabilityConfigs": [{
      "regionCode": "IN",
      "price": { "currencyCode": "INR", "units": "2", "nanos": 0 },
      "availability": "AVAILABLE"
    }]
  }]
}
```

| Component | Finding |
| --- | --- |
| HTTP method/path | Matches Google's **lowercase** `/onetimeproducts/{productId}` PATCH path. The mixed-case GET route is not grounds for changing this PATCH path. |
| Query | `updateMask=listings,purchaseOptions`, `allowMissing=true`, and nested `regionsVersion.version` are the expected update/create inputs. When creating a missing product, Google ignores the update mask. |
| Product identity | Package/path/body agree. The retained SKU and `buy` option ID meet the documented identifier syntax. |
| Listing | One `en-US` listing; title and description satisfy documented limits. |
| Purchase option | One BUY option with documented legacy compatibility and multi-quantity flags. India availability and INR Money fields use the documented structure. |
| Output-only fields | Resource `regionsVersion` and purchase-option `state` are absent from the body. The required version is supplied in the query. |
| Future regions | `newRegionsConfig` is optional and omitted. This does not make the body structurally invalid. |
| Authentication helper | Local shared code signs a service-account assertion with scope `https://www.googleapis.com/auth/androidpublisher`, exchanges it at `https://oauth2.googleapis.com/token`, and sends the resulting bearer token. This matches the PATCH scope. No token introspection or general permission audit was performed. |
| Regions version | Deployed builder requires configuration. Local reviewed allowlist accepts only `2022/02`, serialized as `2022%2F02`. The event's actual runtime value and Google's app-specific acceptance were not independently established. |

Compared against Google's current [PATCH reference](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization.onetimeproducts/patch), [OneTimeProduct schema](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization.onetimeproducts), and [RegionsVersion documentation](https://developers.google.com/android-publisher/api-ref/rest/v3/RegionsVersion). No structural request defect was found. A 403 does not prove that Google completed all payload validation or accepted this app's version, pricing, or eligibility.

## What the parser loses and what diagnostics can recover

The deployed parser reads JSON once and selects the first allowlisted value from `error.errors[0].reason`, `error.status`, or the OAuth string `error`. It retains a filtered projection of `error.details` and constructs a generic `Error.message`. It **discards `error.message`**, legacy error messages and subsequent legacy reasons, unreviewed detail reasons/metadata, violation contents, unrecognized detail types, and upstream response headers. It also loses whether filtered details were absent or present. Non-JSON bodies and JSON-read failures collapse to `null`.

The worker writes the generic message to the job/history and logs the filtered `details`. Therefore the database error cannot reveal whether Google's original response had a more specific message. The targeted read-only log query returned no matching structured event; this is limited to that query/window and is not proof that all log stores lack the event. No original Google response was recovered. `PERMISSION_DENIED` is a broad denial label, not proof of a particular missing grant or eligibility restriction.

Existing diagnostics do not recover this historical response:

- `diagnose-play-pricing` makes a new price-conversion request and returns a sanitized conversion error.
- `diagnose-play-matrix` makes token inspection, legacy list, One-time Products list, and conversion requests. Its broader error capture applies only to those new responses.
- Neither reads an original PATCH response or offers a non-writing PATCH validation operation. Their results cannot establish PATCH authorization or eligibility. Neither was invoked here.

## Safe local change and validation

Changed [googlePlay.ts](../../supabase/functions/_shared/googlePlay.ts) and the structured log in [sync-play-catalog/index.ts](../../supabase/functions/sync-play-catalog/index.ts). Only `catalog.patch` receives the additional diagnostic projection:

- Separately preserves allowlisted Google status, numeric error code, reviewed exact denial messages, and up to four legacy error reasons/messages.
- Keeps the existing safe structured details. Records original detail count, unreviewed-detail-reason presence, and up to eight reviewed detail-message projections.
- Distinguishes absent messages from deliberately omitted messages and marks truncated legacy errors.
- Labels the logged UUID source as `application`.

Arbitrary message text, identifiers, URLs, credentials, metadata, and violation subjects/descriptions are not copied. Exact reviewed phrases are preserved; unreviewed messages are represented by `state: "omitted"`. This is deliberately conservative: it improves evidence while **not claiming to retain Google's complete error response or every possible denial explanation**. The raw response is not retained on the error object. Persisted errors, retry classification, catalog requests, and job behavior are unchanged. The fix is local and has not been deployed; it cannot restore this event's discarded text.

Passed checks:

```sh
deno test --no-remote --deny-net --allow-env supabase/tests/play_catalog_patch_diagnostic_test.ts supabase/tests/play_diagnostic_sanitization_review_test.ts supabase/tests/play_catalog_api_test.ts
node supabase/tests/play-catalog-worker-selftest.cjs
node supabase/tests/play-catalog-creation-selftest.cjs
git diff --check
```

All three Deno tests passed. Worker checks passed across 20 status/operation cases plus diagnostic log/persistence checks; the full mocked creation worker passed 126 scenarios. Tests use fixture credentials and mocked network/database boundaries; Deno network access was denied. Secret/user-data cases cover opaque short tokens, private keys, names, email addresses, purchase tokens, arbitrary metadata, long text, and malformed/non-JSON responses.

**Missing evidence:** the original PATCH `error.message`, complete legacy/structured error details, actual upstream request identifier, and runtime regions-version value. The current evidence cannot distinguish Google-side write authorization from app/account eligibility or another endpoint-specific restriction. The logging defect is proven; it is not the cause of the 403.

**One safe next action:** submit this exact event to Google Play Developer Support for server-side denial analysis, using package `in.medveda.app`, SKU `notes_2_00_v_d93112f242a94a9b83d5bb2c31ef11a3`, and UTC failure time `2026-10-27 18:42:57.283597`. Ask for the PATCH denial's specific reason/details. Identify the supplied UUID as an application correlation ID. This requires no catalog replay or production change. No support message was sent as part of this task.

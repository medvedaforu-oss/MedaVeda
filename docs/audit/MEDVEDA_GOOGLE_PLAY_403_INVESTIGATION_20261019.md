# MedVeda Google Play catalog 403 investigation

Investigation date: 19 October 2026 UTC. Production project: `xbvenkfmesugrbjuufyw`.

**Finding: the underlying Google rejection cause is not established.** Live source inspection confirms that production still runs the old status-only error handling. It discarded the operation and Google's error response. Missing Play Console permissions are not established and must not be assumed.

The user confirmed these intended identifiers and an Active Play Console service account with six app permissions:

- Service account: `medveda-play-billing@medveda-play-billing.iam.gserviceaccount.com`
- Google Cloud project: `medveda-play-billing`
- Android package: `in.medveda.app`

## Confirmed production evidence

Authenticated Supabase Management API reads retrieved function metadata, the deployed catalog bundle, secret metadata, and database evidence. The database query explicitly used `BEGIN TRANSACTION READ ONLY` and `ROLLBACK`; it selected catalog state and sanitized diagnostic strings only. No worker was invoked.

The database snapshot at **2026-10-19 03:20:59 UTC** shows:

| INR price | Status | Attempts | Last update UTC | Retained diagnostic |
|---|---|---|---|---|
| 1.00 | failed | 1 | 2026-10-18 16:55:04.668537 | `Google Play API 403` |
| 2.00 | failed | 1 | 2026-10-19 03:09:01.348036 | `Google Play API 403` |

Both jobs have no successful sync timestamp. There are **zero active verified tiers**. The queue log records claimed/failed events, but neither failure retains an operation or Google reason. One job attempt can contain several Google requests; `attempts=1` does not identify the failed request.

A read of the unified runtime logs (`logs`, filtered to `source='function_logs'`, from 18 October UTC) returned no entries matching `Google` or `play_catalog_failure`. This supplies no additional historical error detail; it does not establish that requests never failed or that all historical logs remain retained.

`sync-play-catalog` is ACTIVE, **version 2**, updated **2026-10-17 17:45:25.241 UTC**. Its deployed ESZIP bundle contains:

```ts
if (!response.ok) throw new Error(`Google OAuth returned ${response.status}`);
// ...
super(`Google Play API returned ${status}`);
// ...
const reason = status ? `Google Play API ${status}` : /* other failure */;
```

The deployed bundle does not contain `play_catalog_failure` or the new `catalog.readback.created` label. **The existing local diagnostics changes have not been deployed to this function.** This is confirmed from source, not inferred solely from version timestamps. The downloaded bundle's SHA-256 is `a7e299ca54793bae4d83187599b2212849ac73ca34243d7fba2e86f735069a69`.

Under this deployed implementation, the retained `Google Play API 403` identifies a catalog Android Publisher HTTP failure after a token was available. An OAuth exchange failure would have produced a different error string. This does not establish that the account behind that token was the intended account, or that any particular app permission was absent.

## Endpoint and operation mapping

The client uses OAuth scope `https://www.googleapis.com/auth/androidpublisher` and API base `https://androidpublisher.googleapis.com/androidpublisher/v3`.

| Local diagnostic operation | Method and path relative to API base | Purpose |
|---|---|---|
| `catalog.get` | `GET /applications/in.medveda.app/oneTimeProducts/{sku}` | Initial product lookup; also lookup after a reserved-SKU rotation |
| `catalog.price-conversion` | `POST /applications/in.medveda.app/pricing:convertRegionPrices` | Calculate regional prices/version |
| `catalog.patch` | `PATCH /applications/in.medveda.app/onetimeproducts/{sku}?updateMask=listings%2CpurchaseOptions&allowMissing=true&regionsVersion.version={version}` | Create/update a product |
| `catalog.readback.created` | Same product GET | Verify creation |
| `catalog.activate` | `POST /applications/in.medveda.app/oneTimeProducts/{sku}/purchaseOptions:batchUpdateStates` | Activate BUY option |
| `catalog.readback.activated` | Same product GET | Verify active state and INR price |

The first Google catalog request for the latest failed job is:

```text
GET https://androidpublisher.googleapis.com/androidpublisher/v3/applications/in.medveda.app/oneTimeProducts/notes_2_00_v_d93112f242a94a9b83d5bb2c31ef11a3
```

**This is a candidate failing endpoint, not a confirmed failing stage.** If the initial GET returned 404, the worker could proceed to conversion, PATCH, activation and readback; any of those could return the retained 403. No evidence selects one of these stages.

The path casing matches Google's current documentation, including mixed-case `oneTimeProducts` for GET/activation and lowercase `onetimeproducts` for PATCH: [GET](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization.onetimeproducts/get), [conversion](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization/convertRegionPrices), [PATCH](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization.onetimeproducts/patch), [activation](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization.onetimeproducts.purchaseOptions/batchUpdateStates). Matching the reference does not prove this account can access an endpoint.

Relevant local source: `supabase/functions/_shared/googlePlay.ts:29`, `:41`, `:72`, `:93`; `supabase/functions/_shared/playCatalog.ts:39`, `:57`, `:83`; `supabase/functions/sync-play-catalog/index.ts:24`, `:58`, `:71`.

## Package and credentials verification

**Package verified:** the live `GOOGLE_PLAY_PACKAGE_NAME` secret digest equals SHA-256 of the exact string `in.medveda.app`. Both the deployed client and local client reject other package values. `mobile-app/app.json` also declares `in.medveda.app`.

**Configured account/project match remains unverified:** `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` exists, last updated **2026-10-17 15:58:27.792 UTC**. The Management API supplies a 64-character SHA-256 digest, not the JSON plaintext. That digest cannot reveal `client_email` or `project_id`. There is no corresponding Google credential entry in the checked Vault names, no Google credential in the relevant local environment files, and no Google Cloud CLI/environment credentials available for an independent authenticated Google check.

The client uses the JSON's `client_email` as the OAuth JWT issuer and signs with its private key. It does **not** validate or otherwise use `project_id`. The Supabase project ID is not a Google Cloud project identity. The intended account/project identifiers provided by the user cannot establish the identity contained in the deployed secret.

No JSON key, private key, token, cron secret or raw secret digest was printed or added to this report.

## Diagnostic capability and remaining evidence

The existing local diagnostics capture a static operation, HTTP status, allowlisted Google reason, a locally generated correlation UUID, and job/lease context. HTTP 403 remains terminal. The UUID is not a Google-supplied request ID.

The parser considers `error.errors[0].reason`, `error.status`, and the OAuth `error` string. It does not examine `error.details` / `google.rpc.ErrorInfo`. Consequently, a generic `PERMISSION_DENIED` or `unclassified` reason may still be insufficient to distinguish API disablement from other denials. No speculative change was made to this implementation.

| Possible cause | Current evidence |
|---|---|
| Missing Play authorization | Not established. User reports the intended account is Active with app permissions. Runtime identity and Google's specific denial are unavailable. |
| Android Publisher API disabled | Not established. No authenticated enablement read for Google project `medveda-play-billing` is available, and the old client discarded Google's reason/details. |
| Wrong configured credentials | Neither confirmed nor excluded. The deployed credential's identity is not readable through secret metadata. |
| Wrong package | Current configuration mismatch excluded by exact secret-digest comparison and deployed package guard. |
| Incorrect endpoint spelling/casing | No mismatch found against Google's published references. Account-specific endpoint access remains unverified. |
| OAuth exchange rejection | The retained error class points to an Android Publisher response, rather than the deployed OAuth error branch. |
| Other Google policy, quota, app/account or endpoint restriction | Not established; Google's response details were discarded. |

The specific missing evidence needed to continue without production changes is:

1. **Secure verification of the actual configured JSON identity:** extract only `client_email` and `project_id` in an authorized environment and compare them with the two intended identifiers. If checking a separately held key file, first establish that its exact bytes match the deployed secret digest. Do not send or publish the JSON key.
2. **A direct read-only product GET using those same verified credentials**, outside the catalog worker. Retain only method/operation, HTTP status, sanitized reason, and safe structured error details needed to identify service/consumer/project. A successful GET proves that read operation at that time; it does not prove PATCH/activation access or reconstruct a previous failure. Do not invoke `sync-play-catalog` as a probe because its handler claims jobs and can write products.
3. **Android Publisher API enablement status in the verified consumer project**, or a Google response that specifically identifies disablement. Enablement must not be inferred from service-account Active status in Play Console. Google's [setup guide](https://developers.google.com/android-publisher/getting_started) treats Cloud API enablement and service-account setup as separate steps.
4. **The historical failed operation and Google reason/details**, if retained elsewhere. If those were never captured, the exact historical rejection cannot be recovered from the current database strings. Deploying diagnostics or making a write-capable catalog attempt would require separate explicit approval and was not done.

## Verification and changes

- `deno test --allow-env supabase/tests/play_catalog_api_test.ts supabase/tests/play_catalog_unit_test.ts`: **4 passed**. Fetch is intercepted; no Google request is sent.
- `node supabase/tests/play-catalog-worker-selftest.cjs`: **PASS** for worker authentication, diagnostics and 403/429/500/503 behavior, using mocks.
- Production verification consisted of read-only Management API requests and a read-only SQL transaction. No Google verification call was made because the actual runtime credential was unavailable.
- No deployments, permission changes, product modifications, catalog-job retries, worker invocations or production configuration changes were performed.

## Focused continuation

See [the diagnostic release and rollback plan](MEDVEDA_PLAY_403_DIAGNOSTIC_RELEASE_PLAN.md) for the subsequent credential-access checks, sanitizer review, frozen candidate and downloaded production rollback artifacts. The original key file was not located. Further read-only checks found no corresponding Vault credential copy or relevant local configuration value. Identity, API enablement and the actual Google rejection cause remain unverified. No credential was generated, rotated or replaced; no diagnostic deployment or job retry was performed.

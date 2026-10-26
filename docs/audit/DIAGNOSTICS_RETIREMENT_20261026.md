# Diagnostic surface and later retirement

All diagnostic functions remain available in source for the unresolved Play 403
investigation. Nothing was deployed or removed from Supabase.

| Function | Current handler authorization | Local gateway |
| --- | --- | --- |
| diagnose-play-service-account | Auth getUser, admin membership, unconditional AAL2 | verify_jwt=false |
| diagnose-play-pricing | Verified Auth, admin membership, AAL2 | verify_jwt=true |
| diagnose-play-matrix | Auth getUser, admin membership, unconditional AAL2 | verify_jwt=false, now explicit |

Matrix handles OPTIONS and returns CORS on handler errors. Its explicit gateway
setting follows the service-account diagnostic design; false does not bypass
the handler's Auth/admin/MFA checks. Deployment settings remain unverified.

After the investigation is closed and sanitized evidence is retained, review:

1. Remove the three diagnostic function directories and their config stanzas.
2. Remove admin diagnostic panels/actions, services
   `playServiceAccountDiagnostic.ts` and `playPricingDiagnostic.ts`, their callers,
   and the `/api/diagnose-play-pricing` rewrite in `admin-panel/vercel.json`.
3. Retire diagnostic-only tests alongside their removed code; retain historical
   audit evidence. Review any separately maintained invocation scripts.
4. Separately approve removal of the hosted functions/proxy deployment, verify
   old URLs are unavailable, and review access to retained diagnostic evidence.
   Keep credentials used by operational billing unless independently retired.

The deletion endpoint alone now uses the existing hashed-key rate limiter:
20 requests/IP/15 minutes before Auth lookup and 3 requests/verified account/15
minutes before erasing data. Both fail closed on a limiter RPC error. A 429
includes `Retry-After: 900`; a failed partial deletion can be retried within the
account allowance or after that window. The IP guard depends on trusted gateway
forwarding headers; the verified-account guard is independent of those headers.
Provider webhooks, workers and shared limiter defaults were not changed.

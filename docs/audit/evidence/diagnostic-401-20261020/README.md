# Admin diagnostic 401 release snapshot

This source snapshot starts from the isolated Admin Panel snapshot whose unmodified
build produced the **same SHA-256** as the live `index-C2NsJ0MC.js` and
`Settings-CbyKiEd1.js` assets on 20 October 2026 UTC. Only the diagnostic
service, its regression test, and the package test script differ from that
baseline. The snapshot is linked to Vercel project `admin_panel-medveda`, whose
root directory is `admin-panel`. No deployment has been made.

Production evidence: the active Supabase function is version 1 with
`verify_jwt=false`; its three deployed TypeScript sources match the repository.
Function invocation logs show GET 401, and the immediately preceding Auth
`/user` request returned 403 with error code `session_not_found`. The Admin RPC
returned 200 shortly before the failed invocation. PostgREST's JWT acceptance
did not prove that Auth still held the session. The client now validates the
exact token with Auth, passes it to the function, and clears a revoked local
session. The Edge function still verifies the user, admin membership, and AAL2.

## Before deployment

From `/home/ganeshp8545/AyurPulse`:

```sh
sha256sum docs/audit/evidence/diagnostic-401-20261020/admin-source.tar.gz
sha256sum docs/audit/evidence/diagnostic-401-20261020/admin-rollback-source.tar.gz
mkdir -p /tmp/medveda-admin-401-approved
tar -xzf docs/audit/evidence/diagnostic-401-20261020/admin-source.tar.gz -C /tmp/medveda-admin-401-approved
npm ci --prefix /tmp/medveda-admin-401-approved/admin-panel
npm test --prefix /tmp/medveda-admin-401-approved/admin-panel
```

Compare the two printed hashes with `manifest.json`. Check the linked Vercel
project in `/tmp/medveda-admin-401-approved/.vercel/project.json`; it must be
`admin_panel-medveda` with project ID `prj_aa6oG0V0hruQHmDEn3GSfnw19IHG`.
The production Vercel project already has `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` configured. Do not put any service role key in Vercel
client build variables.

## Deploy only after explicit approval

Run from the extracted snapshot root so Vercel uses the linked project and its
`admin-panel` root directory:

```sh
vercel deploy --prod --yes --cwd /tmp/medveda-admin-401-approved
```

Confirm the resulting production deployment belongs to `admin_panel-medveda`.
In the browser, sign out, sign back in, finish MFA, then open Settings from the
Admin Panel navigation and run the diagnostic once. Expected result: HTTP 200
and only the boolean `service_account_matches_expected`. If the session has
been revoked again, the panel clears it and requires another MFA sign-in;
investigate the session revocation before retrying. This release does not alter
the Edge function, Google Play configuration, billing, prices, or secrets.

If the new Admin deployment has an unexpected regression, extract
`admin-rollback-source.tar.gz` into a **different fresh directory**, verify its
hash in `manifest.json`, and deploy from that directory with the same Vercel
command, replacing `--cwd` with the rollback directory. The rollback source
reproduced the live Admin assets before this change. Do not deploy either
archive automatically.

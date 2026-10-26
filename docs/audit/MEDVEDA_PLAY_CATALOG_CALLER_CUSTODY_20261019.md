# MedVeda catalog caller and cron-secret custody check

Focused read-only investigation, **19 October 2026**, final production guard **12:59:28 UTC**. No deployment, rollback, cron change, worker invocation, catalog retry, secret rotation, credential creation, or authentication bypass occurred. No cron-secret value or digest was printed or saved. The expired Admin Panel JWT was not used.

**Decision: caller isolation remains incomplete; controlled diagnostic execution is not yet ready under the agreed isolation gate.** No second active catalog schedule was found. Remaining gaps concern externally stored credentials, hosted configuration we cannot read, and the identities of people/systems with invocation capability.

## Scope and source search

Searched 875 current repository text files, including ignored environment/configuration files where readable, GitHub Actions, linked deployment configuration, Supabase source/setup SQL, prepared operator files, tests, and available documentation. The safe reference index records paths and line numbers, never matching values. It found 76 reference-bearing files, mostly current/historical evidence and documents. Eleven deployment/build configuration files were indexed.

Search terms were `sync-play-catalog`, `PLAY_CATALOG_CRON_SECRET` (case-insensitive, including historical lowercase names), `x-play-catalog-cron-secret`, and `play-catalog-sync`. Exclusions: Git object/history storage, dependency directories, generated build/cache directories, binary files and files over 3 MB. Archived release bundles were not re-audited. Literal-reference absence does not exclude a computed endpoint, renamed variable, copy in another repository, or configuration held by an external provider.

No local non-example environment file assignment for the named catalog secret was found. This is not proof that no equivalent value exists under another name or outside this workspace.

## Identified callers, consumers, and references

| Location/system | Role | Current finding |
|---|---|---|
| Supabase `cron.job` 8, `play-catalog-sync` | Actual scheduled caller, POST through `net.http_post`, Vault-sourced authentication header | **Paused**; original every-minute schedule retained |
| `docs/audit/evidence/play-403-single-job-20261019/control.py invoke-one` and `invoke-one.sql` | Prepared manual caller using the same existing Vault secret | Requires its explicit write guard; no autonomous trigger; not executed here |
| `supabase/play_catalog_cron_setup.sql` | Schedule installer/definition | Describes job 8; a file is not an additional running schedule; not executed |
| `supabase/functions/sync-play-catalog/index.ts:10–11` | Secret consumer, not an autonomous caller | Reads the named secret and checks the header before queue RPCs |
| `supabase/config.toml:28–30` | Function authentication configuration | Declares custom-secret authentication with `verify_jwt=false`; no schedule |
| `supabase/functions/.env.example:28–29` | Placeholder/documentation | Named key placeholder, no local live assignment identified |
| `supabase/tests/play-cron-config-selftest.cjs` | Local scratch-database cron/net stubs | Fixture authentication values and local `net.requests`; not a production scheduler |
| `supabase/tests/play-catalog-worker-selftest.cjs` and production-v2 fixture | Mock worker/authentication tests | Uses an intercepted handler and fixture URLs/secrets; not a production caller |
| App/admin product edits, paid-PDF triggers, `retry_play_price_sync` | Queue producers | Can queue jobs; no direct HTTP catalog invocation found in current source |
| Audit/setup/release documentation | Instructions and historical references | Not running services; older lowercase Vault-name instructions are historical and do not prove additional configured secrets |

Known prior GET 405 / unauthenticated POST 401 probes were rejected before queue work and do not establish possession of the cron secret. No new endpoint probe was made.

## Supabase live scheduling verification

All seven cron definitions and active/schedule settings were refreshed and compared with the preceding recovery evidence. Command fingerprints were unchanged. Active helper source fingerprints were also unchanged, so the preceding focused review of their behavior still applies.

| Job | Name | Active | Catalog caller? |
|---|---|---|---|
| 1 | `purge-analytics-events-12m` | Yes | No identified endpoint/secret/header reference; retention helper unchanged |
| 2 | `purge-payment-sessions-30d` | Yes | No identified endpoint/secret/header reference; retention helper unchanged |
| 5 | `release-wallet-credits` | Yes | No identified endpoint/secret/header reference; wallet/helper sources unchanged |
| 8 | `play-catalog-sync` | **No** | The sole identified scheduled catalog caller |
| 9 | `play-consume` | No | Separate payment worker/secret |
| 10 | `play-reconcile` | No | Separate payment worker/secret |
| 11 | `play-voids` | No | Separate payment worker/secret |

Fresh scans found no stored function or database webhook trigger containing the catalog endpoint/secret/header. This verifies that **no other identified active Supabase scheduled job invokes the catalog function** within the inspected definitions. It does not prove absence of an independently operated external caller.

The final guard confirmed ACTIVE v3, `verify_jwt=false`, cron 8 paused, ₹1 pending/attempts 1/no lease, ₹2 failed/attempts 1/no lease with unchanged timestamps, zero queued catalog HTTP and zero running catalog cron SQL. No queue state changed during this task.

## GitHub Actions and deployment configurations

The existing GitHub session has read/pull access to `ganeshp8545/MedaVeda`. The live repository exposes one enabled workflow, `CI`, at `.github/workflows/ci.yml`; its current default-branch YAML was safely parsed. Actual triggers are **push** and **pull_request**, with no scheduled trigger, manual-dispatch trigger or reusable-workflow-call trigger. It contains no catalog/secret/header literal and no `secrets.NAME` reference. The local workflow also has no catalog caller. The two recent returned runs were already completed push runs; no workflow was triggered by this investigation.

However, listing **repository secret names** returned **403**, as did secret-name inventory for the existing **Production** GitHub environment. Their contents and aliases are unverified, not absent. This inspection does not cover workflows/secrets in other repositories, externally managed runners, or out-of-band integrations.

Local `admin-panel/vercel.json` and `website/vercel.json` contain no cron schedule or catalog reference. `mobile-app/eas.json` contains no catalog-secret reference or scheduled invocation. Root/admin links identify one Vercel project, and the website link identifies a second. The existing Vercel session returned **403** when reading each linked project, so **live Vercel Cron settings and hosted environment-variable names could not be verified**. No environment value was decrypted or downloaded.

The current user has no installed crontab. Readable `/etc/crontab` and `/etc/cron.d` files contain no literal catalog endpoint/secret/header reference; no matching current-user systemd service/timer file was found. Other users, wrappers that assemble the URL dynamically, and other machines are outside this check.

## Cron-secret custody and possible sharing

The authorized Supabase Management API lists **one Edge secret entry named `PLAY_CATALOG_CRON_SECRET`**, among 14 entries. Digest metadata was compared only in memory: **no other Edge secret name has the same digest**. No digest was printed or persisted. This rules out an identified duplicate alias in the inspected project Edge-secret inventory, including same-value reuse under a listed different name. It does not identify every holder or copy.

No other current repository Edge Function consumer references the catalog key by name. Supabase production secrets are project configuration read by deployed functions, rather than proof of function-exclusive custody; see [Supabase environment-variable documentation](https://supabase.com/docs/guides/functions/secrets#production-secrets). Other deployed function bundles were not re-audited in this focused task, so dynamic/environment-wide reads by code differing from this checkout are not certified absent.

The cron command and prepared manual SQL reference the named Vault entry. Read-only attempts to verify its current count/length and compare aliases/equality were denied by the database. The combined query returned HTTP 400; narrowed queries confirmed a **permission-denied** response. No role switch, root-key request, decryption workaround, grant change, or impersonation was attempted. **Current Vault-to-Edge equality and other Vault aliases therefore remain unverified in this task.** Earlier matching-value evidence is historical, not a fresh result.

Role metadata shows Vault schema usage and SELECT privileges for `postgres`, `service_role`, `supabase_admin`, and `supabase_read_only_user`; `anon`, `authenticated`, and `supabase_auth_admin` did not show those capabilities. These are potential read capabilities from catalog metadata, **not proof that any particular human can decrypt the view**: actual reads through the current management execution path were denied despite reported SELECT metadata. The owners of database/service-role credentials and project management/deployment credentials remain part of custody confirmation. [Supabase Vault documentation](https://supabase.com/docs/guides/database/vault#viewing-secrets) explains why access to the decrypted view requires careful custody.

## What available access cannot establish

- GitHub repository/Production environment secret inventories and possible aliases: 403.
- Live Vercel Cron and hosted environment settings for both linked projects: 403.
- Fresh Vault equality, length, count, and duplicate-name/value comparisons: permission denied.
- All external copies in other repositories, Google Cloud Scheduler, AWS/EventBridge, CI/CD services, automation tools, servers, developer machines, historical files, or human-held material: no verified account/configuration coverage. No configured access to those systems was established here.
- Identities of every past/current holder of the cron secret or credentials capable of reading/using it: no complete custody inventory. The preceding owner answer was **Unknown**; no later confirmation has resolved it.

The secret is shared-secret authentication, not a caller identity. A successful caller holding it is not uniquely attributable from the secret alone. An expired Admin Panel JWT does not disable this endpoint. Cron pause is a scheduler setting, not an endpoint-wide lock: a secret-holding external caller can still consume pending ₹1 work. No read-only check can revoke an unknown copied secret or enforce silence by an uncontrolled holder.

## Minimum safe path without rotation or production modification

Use a **custodian-confirmed, coordinated no-call window**, supported by read-only preflight and monitoring, rather than treating lack of references or traffic as a lock. A named owner/admin must review the blocked GitHub and Vercel settings in their existing authorized dashboards, identify all known copies/operators and external schedules, and confirm that no other caller will invoke the function during that window. Only names, yes/no findings, evidence timestamps and responsible owners are needed; **never supply the secret value**.

This is an administrative isolation procedure whose assurance depends on the completeness of that inventory and cooperation of all identified holders. Monitoring can detect activity; it cannot prevent a race from an unknown caller. If custody cannot be established, leave the current paused state and do not proceed to controlled execution. No secret rotation, production change, new credential, permission change, worker probe, catalog retry, cron resume, or rollback is necessary to complete the requested owner review.

**Single next action:** the owner/admin completes the custody confirmation below. No production execution is recommended until it is complete, fresh preflight conditions pass, and the diagnostic execution itself is separately authorized.

### Ready-to-complete custody confirmation

```text
Reviewing owner/admin (name or role):
Review timestamp (UTC):
GitHub repository and Production environment secret-name inventories reviewed:
  Catalog secret or equivalent alias present? If yes, name/location only:
Both linked Vercel projects' Cron and hosted environment settings reviewed:
  Catalog invoker or secret alias present? If yes, name/location only:
Other external schedules/services and human operators with invocation capability:
Known authorized storage locations/copies and responsible custodians:
Any remaining unknown holder/caller? (must be resolved before isolation is claimed):
Agreed no-call window (UTC) and confirmation from all identified custodians:
```

[Sanitized evidence and summary](evidence/play-403-custody-readonly-20261019/custody-summary.json). Existing frozen release/operator artifacts and earlier audit reports were preserved.

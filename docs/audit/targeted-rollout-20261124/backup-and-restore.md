# Production backup and isolated recovery preparation — HOLD

No production database records, Auth records, Storage objects, credentials or secret values were exported. No production restore, migration, deployment, cron or payment activation occurred. Code bundles and nonsecret schema/grant definitions were captured for the changed boundaries. A recoverable production backup does **not** yet exist in this work product.

## Method and sizing

Existing account read-only evidence on 2026-11-24: `pitr_enabled=false`, `backups=[]`, `walg_enabled=true`. WAL-G being enabled does not prove an owner-accessible recovery point. Do not purchase an upgrade or enable PITR. Safest currently available owner-controlled method: a native PostgreSQL custom-format logical dump using the existing database credentials, a roles inventory without database-role password hashes, a separate Storage object copy, and separate function/deployment/configuration preservation. Installed clients: pg_dump/pg_restore/psql 18.7; source PostgreSQL 17.6; a disposable local PostgreSQL 17 fixture is available. This method does not require installing Docker images or a paid plan. Database connection credentials/access must still be supplied through the owner's existing secure mechanism; management-tool access alone does not prove native database connectivity.

Measured database allocation: 21,245,075 bytes (20.3 MiB). Storage metadata: 62 objects totaling 333,503,431 bytes (318.1 MiB), no missing size fields: notes 61, question-papers 1; thumbnails/note-quarantine/nonplay-test-notes empty. These are metadata sizes, not verified downloaded checksums. Catalog can change: repeat sizing immediately before backup. Native dump size is not exactly pg_database_size: reserve 100 MiB for database/roles/schema, 400 MiB for objects, 100 MiB for code/configuration/metadata. Budget **0.6–1 GiB per backup**, roughly **1–2 GiB with a separately encrypted copy**, and **at least 5 GiB free persistent encrypted storage for backup plus isolated restore workspace** (more if images/extensions must be fetched). These are planning estimates, not guarantees. Current filesystem has only about 1.7 GB free; /tmp has about 2.9 GB but is volatile. Use an owner-approved persistent encrypted destination with >=5 GiB free; do not use /tmp for the only backup.

## Exact owner commands after explicit sensitive-export approval

Run in a private shell with tracing disabled. Configure the existing `medveda-production` libpq service in the owner's protected service/passfile, using Dashboard Connect's direct connection or **session** pooler on port 5432, TLS and existing password. Do not put the connection URI/password in a command, transcript or repository. Do not reset any credentials. `PGSERVICE` below names that protected entry; it is not a credential. Confirm it selects project xbvenkfmesugrbjuufyw before export. Destination below must be replaced with the approved encrypted mount. Stop on any failure; partial files are not backups.

```bash
set -euo pipefail
set +x
umask 077
SB=/home/ganeshp8545/.npm/_npx/aa8e5c70f9d8d161/node_modules/@supabase/cli-linux-x64/bin/supabase
BACKUP=/mnt/OWNER_APPROVED_ENCRYPTED_VOLUME/medveda-20261124
# Confirm the approved mount is present; do not create a lookalike path on /.
test -d /mnt/OWNER_APPROVED_ENCRYPTED_VOLUME
df -h /mnt/OWNER_APPROVED_ENCRYPTED_VOLUME
test "$(df -Pk /mnt/OWNER_APPROVED_ENCRYPTED_VOLUME | awk 'NR==2 {print $4}')" -ge 5242880
test ! -e "$BACKUP"
mkdir -m 700 "$BACKUP"
export PGSERVICE=medveda-production
export PGOPTIONS='-c default_transaction_read_only=on'
pg_dump --format=custom --file="$BACKUP/database.dump"
pg_dump --schema-only --file="$BACKUP/schema.sql"
pg_dumpall --roles-only --no-role-passwords --file="$BACKUP/roles.sql"
pg_restore --list "$BACKUP/database.dump" > "$BACKUP/database.toc"
psql -XqAt -v ON_ERROR_STOP=1 -c "select jsonb_build_object('buckets',(select jsonb_agg(to_jsonb(b)) from storage.buckets b),'objects',(select jsonb_agg(to_jsonb(o)) from storage.objects o));" > "$BACKUP/storage-inventory.json"
# This inventory is confidential: object paths/owners/metadata must stay private.
mkdir -m 700 "$BACKUP/objects"
for bucket in notes question-papers thumbnails note-quarantine nonplay-test-notes; do
  mkdir -m 700 "$BACKUP/objects/$bucket"
  "$SB" storage cp --remote=xbvenkfmesugrbjuufyw --recursive "ss:///$bucket/" "$BACKUP/objects/$bucket/" > "$BACKUP/storage-$bucket.log" 2>&1
done
mkdir -m 700 "$BACKUP/deployed"
"$SB" functions list --remote=xbvenkfmesugrbjuufyw --output-format=json > "$BACKUP/functions.json"
python3 - "$BACKUP/functions.json" "$BACKUP/deployed" "$SB" <<'PYFUNCTIONS'
import json, re, subprocess, sys
from pathlib import Path
inventory = json.loads(Path(sys.argv[1]).read_text())
functions = inventory if isinstance(inventory, list) else inventory["functions"]
for function in functions:
    name = function.get("slug") or function["name"]
    assert re.fullmatch(r"[a-zA-Z0-9_-]+", name)
    destination = Path(sys.argv[2]) / name
    (destination / "supabase").mkdir(parents=True)
    with (destination / "download.log").open("w") as log:
        subprocess.run([sys.argv[3], "functions", "download", name,
                        "--remote=xbvenkfmesugrbjuufyw", "--use-api",
                        "--workdir", str(destination)], check=True,
                       stdout=log, stderr=log)
PYFUNCTIONS
"$SB" backups list --remote=xbvenkfmesugrbjuufyw --output-format=json > "$BACKUP/hosted-backups.json"
vercel inspect admin.medveda.in --json > "$BACKUP/admin-production.json"
find "$BACKUP" -type f ! -name SHA256SUMS -exec sha256sum {} + > "$BACKUP/SHA256SUMS"
sha256sum -c "$BACKUP/SHA256SUMS" > "$BACKUP/checksum-validation.log"
```

The main custom archive is a single consistent PostgreSQL snapshot covering schema, records, Auth schema data, policies, grants, RPCs, triggers, financial records and entitlement dependencies visible to the database role. Do not use `--no-acl` or `--no-owner` for the backup. Extension-owned internals/provider-managed catalogs are not a complete platform backup. Separately inspect the TOC/schema and verify auth.users/identities/MFA data, financial/entitlement tables and application schemas are actually included; an access-denied/incomplete dump fails the gate. Role password hashes deliberately stay out of roles.sql; existing role credentials remain in the owner's vault. The extra schema dump and object inventory are separate snapshots: record times and reconcile changes. Storage has no transaction shared with PostgreSQL; coordinate an owner-approved no-upload/catalog-edit window or perform pre/post inventory and checksum comparisons and repeat changed objects until stable. Re-enumerate buckets and include any added after sizing. Empty buckets should have no copy errors except a documented empty-source result. Inspect recursive copy layout against every inventory key; do not assume CLI success means all objects were copied.

Protect raw archive and logs on encrypted storage with restricted permissions. Make a second encrypted copy on another owner-controlled medium and verify decryptability/checksums. No plaintext archive in Git, public cloud links or this chat. Do not delete partial or raw backups automatically; owner retention/disposal policy applies.

## External configuration and bundles

Archive **all 25 currently deployed function bundles** independently with their versions, bundle hashes and `verify_jwt` values from functions.json; never substitute local source for deployed code. This session saved the five relevant deployed bundles in `deployed/` as predeployment evidence, not a complete project backup. The commands above download each function into its own empty workdir so differing deployed helper versions cannot overwrite each other. Compare each captured source/hash with management metadata before treating it as a rollback bundle. Deployed JWT values for the rollout: standalone verifier=true, legacy verifier=true, Play worker=false; diagnostic=false with its own verified session/admin/aal2 checks. `report-external-transaction` is not deployed and is excluded from this release.

The database dump does **not** include Storage object bodies, Edge Function environment values, signing/encryption secrets, Google/IAM/Play settings, Razorpay webhooks/credentials, Auth provider/SMTP/redirect/URL/MFA service settings, JWT signing settings/JWKS history, API settings, DNS/custom domains or Vercel deployment settings. Preserve these through the existing owner vault and provider dashboards without exposing values here. Database Vault ciphertext may also require its original external encryption material; merely dumping ciphertext does not prove decryptability. Do not create replacements. MFA secrets/session portability and existing JWT validity need explicit validation in the isolated environment; do not assume a cross-project restore preserves them.

Current Admin is `dpl_GD4eQfZLfUdo7cxY3L2VeUvdFexF`, immutable URL `adminpanel-medveda-rk5xon95x-med-veda1.vercel.app`, alias `admin.medveda.in`, source commit `d5536ed075422ccb54c7cfd609dfc829f9757fe1`. Retain this deployment, exported build settings/configuration and the exact owner-held source/artifact, public assets and secure environment references. Metadata alone is not an independently recoverable artifact. Verify retention and rollback permission before rollout. The new Admin candidate is a different artifact and cannot serve as the old deployment backup.

## Isolated restore validation gate

Before restoring any production records, owner approval and >=5 GiB persistent encrypted workspace are mandatory. Use a disposable local Supabase/PostgreSQL 17 environment, never the production project or a shared student staging database. Deny outbound traffic to production Supabase, Google, Razorpay, SMTP and push endpoints **before loading cron/job tables**; no production signing material in runnable services. Keep schedulers, webhooks, queue workers, mail and payments disabled. Review extensions and provider-owned roles from the archive before choosing the compatible target. Do not replay roles.sql blindly into Supabase-managed roles.

For a fresh isolated database with matching extensions and reviewed role definitions already created, the native rehearsal command is:

```bash
# PGSERVICE points only to the disposable local restore environment here.
export PGSERVICE=medveda-isolated-restore
unset PGOPTIONS
pg_restore --exit-on-error --single-transaction --dbname=medveda_restore "$BACKUP/database.dump" > "$BACKUP/restore.log" 2>&1
```

A bare PostgreSQL server without matching extensions/roles is insufficient. A managed/local Supabase instance with existing auth/storage objects needs a reviewed archive TOC and managed-schema restore procedure instead of blindly replaying the full archive. Any ownership/extension/ACL/collision error fails validation: do not ignore it or use `--clean` against an existing database. Exact target initialization depends on the chosen isolated environment and remains an owner prerequisite, so this command is not claimed tested with production data.

Validate all application/Auth table counts and owner identifiers privately, foreign-key integrity, orders/payments/purchases/refunds/ledger totals and order snapshots, and entitlement uniqueness/commitment/reversal invariants against the same dump. No new grants or access can be inferred from the presence of a paid order alone. Compare RLS enabled/forced flags, policy expressions, object/function/table grants, owners, SECURITY DEFINER/search_path, triggers, constraints and view definitions with captured schema. Check anonymous/student/Admin/MFA permission denials using synthetic identities, and use fake billing providers for receipt/recovery cases. Test Auth linking, identities, profile triggers and MFA recovery dependencies without emailing or signing in as students.

Restore Storage files to an isolated Storage backend through supported object APIs at the original bucket/key paths, retaining MIME/cache settings, private/public bucket state and ownership semantics. Validate every inventory object, byte size and SHA-256; verify 62 baseline objects plus any later inventory additions, authenticated entitlements and anonymous/foreign-user denials. Restored metadata rows alone cannot pass object recovery. Compare/reconcile metadata IDs and owners after API uploads, because new object rows may have different IDs. Test a private Notes PDF and question-paper recovery without exposing contents.

Recover old function code/config in an isolated project or mocked function runtime; compare bundle hashes/JWT settings and reject unauthenticated calls. Validate Admin artifact/SPA assets and safe authorization against the clone. Keep all external side effects disabled. Rehearse pending migration compatibility and both compensating scripts only in this isolated environment with an authorized operator. Record counts, hashes, permissions, checksums, logs, elapsed recovery time, operator and recovery point privately. Only successful record/object/configuration recovery satisfies the backup gate; synthetic SQL rehearsal performed here is **not** production-data restore validation.

## Compensation prepared, independently reviewed, and synthetically rehearsed

`predeployment.json` contains the actual live fulfillment definition, invoker view, owners and grants before rollout; live products has no revision column/RPC/trigger yet. `compensate-terminal.sql` restores the exact captured fulfillment function and EXECUTE ACL. It leaves the additive service-only helper installed so calls cannot break. `compensate-admin-fail-closed.sql` withholds Ready while keeping sanitized errors, revision column/trigger/RPC, authorization/MFA and captured view ACL. These scripts contain no financial DML. Do not restore old direct authenticated UPDATE privileges or drop revisions to make an old Admin edit form work. Keep product editing unavailable until the compatible Admin returns. Neither script edits migration history; the safe default is forward repair, with explicit restoration DDL reviewed when needed.

Both scripts compiled in a synthetic disposable local clone and preserved order/purchase hashes, product grants and revision enforcement. That is only a code-level rehearsal, not a production backup restore. Production execution is separately approval-required. A full database restore would discard post-backup financial events unless provider reconciliation is designed; targeted forward compensation is preferred over a production point-in-time rollback.

References: [Supabase backup limitations](https://supabase.com/docs/guides/platform/backups), [backup/restore and separate managed-schema/Storage/configuration recovery](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore.md). Installed v3.1.0 help evidence is saved beside this file; v2 commands are not substituted.

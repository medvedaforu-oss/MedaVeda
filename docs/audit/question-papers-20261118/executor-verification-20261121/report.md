# Question Paper isolated executor verification

2026-11-21 UTC. **NO-GO for the tested execution mechanism and for production migration.** Supabase CLI 2.75.0 preserves the requested version on a successful local run, but rejects a one-file package against an existing historical ledger. With this SQL file's explicit COMMIT, it can also commit the module without recording its version. No safe production executor was established by this verification.

No production connection, staging, deployment, migration history repair, commit or push occurred. Every database mutation and fault injection was confined to a new disposable native PostgreSQL cluster. Production project `xbvenkfmesugrbjuufyw` was never supplied to the executor. The historical ledger inventory was read from the existing November 19 audit file, not refreshed from production.

## Executor and exact artifact

The candidate is the official **Supabase CLI 2.75.0**, Linux amd64, command `migration up --db-url … --workdir … --yes`. The released command and its flags were verified with `--help`. This is a pinned official implementation of a supported CLI command, not a claim of a current vendor maintenance guarantee for this older release. No custom migration executor was substituted.

| Artifact | SHA-256 |
| --- | --- |
| `20261118172019_question_papers.sql` | `6811f8573487c4d0e4f55716a7cbb1051f2ac2d0f8189165178a585b54ce9359` |
| Official Linux amd64 release archive | `e5597462f865d5ac72af0453358e37ecb0d85962ad6914a114a53de847303bde` |
| Extracted CLI executable | `ede7713ac26a4e8bd8ebdfad93676d9652b254d4d6bc163a003a6493f4b3302b` |

The archive matched the checksum published with the official release. The harness also verifies the executable's hash and reported version. [Official release](https://github.com/supabase/cli/releases/tag/v2.75.0).

The SQL copy is byte-identical to the current repository migration and matches the requested checksum. The complete isolated execution package contains exactly these two regular files:

```text
package/supabase/config.toml
package/supabase/migrations/20261118172019_question_papers.sql
```

There is **exactly one migration**, no historical SQL, seeds, functions directory, project link, credentials or unrelated deployment artifacts. Seeding is disabled. [Package manifest](package-manifest.json) contains both file hashes. Fixtures, the harness and evidence live outside `package/`. The harness runs a temporary copy so CLI cache writes cannot contaminate the retained package.

## Disposable local evidence

[rehearse.py](rehearse.py) ran with native **PostgreSQL 17.12, Debian 17.12-1.pgdg13+1**, on literal `127.0.0.1` and a temporary Unix socket. It creates a fresh trust-authenticated loopback-only cluster, an empty temporary HOME, and an allowlisted child environment containing no inherited credentials. It accepts a CLI binary path only; there is no target URL or project argument. The cluster stopped successfully and its temporary directory was removed.

The local prerequisite fixture uses the existing `supabase_stub.sql` plus minimal synthetic catalog tables and an Admin predicate. No historical migration SQL or application seed was executed. The 85 historical version/name rows used for the history test were inserted into a fresh local fixture only. They are not a reconstruction of production data or proof of hosted compatibility.

All **11 scenario assertions passed**. Expected executor failures below are verified failure behavior, not successful migrations. Full CLI output and observed database states: [results.json](results.json).

| Scenario | CLI exit | Module objects after disconnect/exit | New ledger row |
| --- | --- | --- | --- |
| Exact SQL, empty historical ledger | 0 | Present; private bucket present | 1 |
| Repeat successful execution | 0 | Preserved, no reapplication | Still 1 |
| SQL failure: pre-existing bucket collision near end | 1 | Both new tables rolled back; fixture bucket preserved | 0 |
| BEFORE INSERT ledger trigger raises exception | 1 | Both tables and bucket **committed** | **0** |
| Remove local fault trigger and retry that split state | 1 | Preserved; fails on existing receipt table | 0 |
| Terminate backend during CREATE POLICY, before COMMIT | 1 | Rolled back, bucket absent | 0 |
| Terminate backend during ledger insert, after SQL COMMIT | 1 | Both tables and bucket **committed** | **0** |
| Proxy withholds COMMIT acknowledgement and later responses | 1, unexpected EOF | Committed | **1** |
| Repeat after lost acknowledgement | 0 | Preserved, no reapplication | Still 1 |
| One-file package with 85 historical ledger versions | 1 | No module objects | 0; historical 85 unchanged |
| Same history with `--include-all` | 1 | No module objects | 0; historical 85 unchanged |

Connection interruptions were injected at observed server barriers, not arbitrary sleep timing. The precommit test terminates a backend paused by an event trigger. The postcommit test terminates a backend paused inside a ledger trigger. The acknowledgement proxy forwards client requests unchanged, suppresses server messages starting with the explicit COMMIT response, and closes after receiving the subsequent ReadyForQuery. The CLI sees failure while an independent connection verifies both commits. Thus connection failure alone cannot determine whether a migration committed.

## Transactions and migration ledger

The successful ledger entry has version **`20261118172019`**, name **`question_papers`**, and **30 parsed SQL statements**. The first includes `begin`; the last is `commit`. The executor stores parsed statements rather than a raw-file checksum. The external package hash remains essential. A repeat with this ledger row is skipped; the mechanism is not a general checksum validation or a demonstrated concurrent-run lock.

The CLI parses the filename version, batches the SQL statements, and appends its ledger INSERT. Its source describes that batch as implicitly transactional, but the file's explicit COMMIT commits the module before the appended INSERT. Local injection proves that ledger failure cannot roll back those already committed objects. [Pinned parser and execution source](https://github.com/supabase/cli/blob/v2.75.0/pkg/migration/file.go), [ledger schema and insert source](https://github.com/supabase/cli/blob/v2.75.0/pkg/migration/history.go).

SQL failure before the explicit COMMIT rolled back the earlier module DDL. Connection loss before that COMMIT also rolled it back. Connection loss during the later ledger insert left the module committed without history. Losing the success response can instead leave both module and ledger committed. These are tested distinct outcomes; the CLI error text and statement number are insufficient to choose a recovery action.

## Historical isolation

The one-file package is physically isolated, but **the CLI's history comparison rejects it** when historical ledger versions have no matching local files. Both default behavior and `--include-all` returned “Remote migration versions not found in local migrations directory.” The 85 simulated historical rows were byte-for-byte unchanged before/after both attempts. No historical files, placeholder migrations, alternate ledger, repairs or history edits were used to bypass the comparison. [Pinned pending-migration source](https://github.com/supabase/cli/blob/v2.75.0/internal/migration/up/up.go).

Raw CLI output includes an automatically suggested history-repair command. **That suggestion was not executed and must not be used under this task's rules.** The historical name discrepancy documented in the previous preflight was not changed.

The Supabase changelog and command documentation were checked. The changelog recommends pinning v2 when avoiding CLI v3 workflow changes; that does not resolve either demonstrated failure. [CLI changelog](https://supabase.com/changelog/supabase-cli-v3), [migration command reference](https://supabase.com/docs/reference/cli/supabase-migration-up).

## Preservation

[preservation.json](preservation.json), [baseline-file-states.json](baseline-file-states.json) and [git-status-before.txt](git-status-before.txt) record the session baseline and comparison. All **3,148 original file states** retain their exact contents, absence or symlink target and regular-file permissions. Original Git status entries remain present and the Git index is byte-identical. Only this new verification directory was added. Existing migration SQL, historical files, payments, authentication/security and application feature source were not edited. Existing deleted files stayed absent.

In the successful disposable fixture, before/after fingerprints match for existing columns, relation ACL/RLS settings, function definitions/ACLs, existing policy definitions, non-module buckets and payment sentinel data. This covers the synthetic prerequisites, not the full production schema or payment/Auth flows. Applying this migration necessarily adds its bucket-specific policies to shared `storage.objects` and FK dependency triggers for the new child table; it does not leave every shared catalog entry literally identical. No production database objects were changed at all.

## Recovery procedure

These are decision rules for a future separately authorized operation. No production recovery action is authorized or performed here.

1. On any executor error or lost connection, stop execution and prevent another operator/job from retrying. Do not infer rollback from a nonzero exit. Do not repair history, delete objects, change SQL or replay automatically.
2. Establish a fresh connection with read-only access to the explicitly verified intended database. Wait until the original session/transaction has ended; if it remains active or cannot be identified, keep the result unresolved. Inspect the exact ledger version/name/statements and the complete module object definitions, policy/grant set and bucket configuration against the approved artifact. Table existence alone is insufficient.
3. **Ledger absent and module absent:** confirmed rollback permits correction and a separately authorized retry only after the executor's isolation gate is resolved. In this rehearsal the disposable database can simply be discarded and recreated.
4. **Ledger present and complete expected module present:** treat execution as committed despite client error. Verify the full state; do not replay. The local lost-acknowledgement test demonstrates that the CLI skips a later repeat when the ledger exists.
5. **Module present but ledger absent:** quarantine the split state. A direct retry is demonstrated to fail. Under the no-repair/no-production-write constraints there is no permitted automatic recovery. Retain evidence and require a separately reviewed, explicitly authorized reconciliation or recovery plan. Do not mark applied, drop objects or restore the whole database as part of this task.
6. **Ledger present but objects missing/mismatched, partial objects, or unreadable state:** keep NO-GO and investigate read-only. A changed artifact requires a fresh approval and rehearsal; it cannot inherit this checksum's evidence.

## Remaining blockers and recommendation

1. **Executor isolation fails:** the pinned candidate cannot accept this one-file package alongside the historical ledger without prohibited workarounds.
2. **SQL and ledger are not atomic together:** the exact artifact's explicit COMMIT creates a proven split-state failure window. A different supported executor or execution mechanism must be independently established and subjected to the same faults; an untested version upgrade is not a solution.
3. **Recovery for committed SQL without a ledger is unresolved within scope:** no repair is authorized, and unchanged replay fails. Operator serialization and concurrent execution behavior also remain unverified.
4. Native PostgreSQL fixtures do not certify hosted event triggers, Storage HTTP behavior, poolers, RLS behavior against real production prerequisites, or application acceptance. This rehearsal did not rerun the historical SQL suite or close that previous preflight gate.
5. The earlier preflight's backup/restore, MFA, gateway/runtime and browser/device gates were not reassessed or closed. Those November 19 findings remain prior evidence, not newly verified production facts.

**GO for retaining and reproducing this local verification package. NO-GO for using the tested CLI/package combination to execute the production migration.** No execution permission is requested; the evidence does not establish a safe production mechanism.

## Reproduction

On Linux amd64 with PostgreSQL 17 binaries in `/usr/lib/postgresql/17/bin`, download the pinned official archive and published checksum file into a temporary directory, verify the archive hash above, and extract only the CLI executable. No installation into the repository or project linking is needed.

```text
https://github.com/supabase/cli/releases/download/v2.75.0/supabase_linux_amd64.tar.gz
https://github.com/supabase/cli/releases/download/v2.75.0/supabase_2.75.0_checksums.txt
```

From the repository root, run:

```bash
python3 docs/audit/question-papers-20261118/executor-verification-20261121/rehearse.py /absolute/path/to/supabase
```

The harness rejects other binary hashes, checks both migration copies and the package file allowlist, creates only a disposable local cluster, and overwrites only `results.json` in this new evidence directory. It requires permission to open loopback sockets. Reproduction consumes the existing local prerequisite stub and retained historical version inventory; their checksums and the harness checksum are recorded in [reproduction-manifest.json](reproduction-manifest.json).

During setup, the initial sandbox blocked sockets. A native loopback run then exposed CLI URL reconstruction discarding `sslmode=disable`; matching the temporary config's port to the loopback endpoint selected the CLI's local connector. Observer filtering and explicit proxy socket shutdown were corrected before the complete successful assertion run. These setup iterations were confined to disposable environments. [Pinned connection source](https://github.com/supabase/cli/blob/v2.75.0/internal/utils/connect.go).

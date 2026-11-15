# Verification limits

- Local root owns execution because child agents lack tools. Independent test design and semantic review are available; independent filesystem/source execution is not.
- Before/after evidence for already-fixed current handlers passes in both phases; deployment differences remain staging pending.
- Original run-all baseline failed byte-string ACL equality when identical entries were ordered differently. New fix3-audit-batch1-local.py compares exact sorted entries (role, privilege and grantor preserved). No ACL check is disabled.
- New fix3-account_deletion_checks.sql changes only the legacy RPC expectation from authenticated EXECUTE to revoked EXECUTE, consistent with BACK-17. Other deletion tests remain intact.
- New fix3-run-all.sh is the full existing suite with those two new-file harness substitutions. Original backend files and applied migrations remain untouched. Canonical old runner retains its historical expectations.
- Interrupted /tmp cluster/snapshots were lost. Safety pre-work.patch/status and durable logs survive. Do not call reconstructed source images original pre-execution observations.
- Full mobile sweep initially 101/103: closed-testing child spawnSync EPERM plus attempted note guard resume regression. Raw failures retained. Supplemental reruns after permitted local execution/restoration determine final acceptance; do not erase the original sweep.
- MOB-02 failed broader verification twice; attempted source changes reverted under the owner's cap. Its final regression test intentionally remains red, so the finding is BLOCKED.
- No native/browser/provider/hosted acceptance is claimed; none was executed. All deployment/runbook operations are future owner-reviewed instructions.

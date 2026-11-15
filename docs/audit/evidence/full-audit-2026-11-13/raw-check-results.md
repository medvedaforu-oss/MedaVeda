# Raw audit check results — 13 November 2026

Complete retained outputs, including initial infrastructure failures and final reruns. No product source was edited. Credential-pattern values were redacted before log persistence.

## admin-node-tsc.log

````text
$ ./node_modules/.bin/tsc --noEmit --incremental false -p tsconfig.node.json
CWD: admin-panel

EXIT_CODE=0
DURATION_SECONDS=10.12

````

## admin-npm-audit.log

````text
$ npm audit --json
CWD: admin-panel
{
  "auditReportVersion": 2,
  "vulnerabilities": {},
  "metadata": {
    "vulnerabilities": {
      "info": 0,
      "low": 0,
      "moderate": 0,
      "high": 0,
      "critical": 0,
      "total": 0
    },
    "dependencies": {
      "prod": 17,
      "dev": 156,
      "optional": 80,
      "peer": 0,
      "peerOptional": 0,
      "total": 172
    }
  }
}

EXIT_CODE=0
DURATION_SECONDS=2.89

````

## admin-tests.log

````text
$ npm test
CWD: admin-panel

> ayurpulse-admin-panel@1.0.0 test
> node --experimental-strip-types scripts/pdf-validation-selftest.mjs && node --experimental-strip-types scripts/upload-error-selftest.mjs && node scripts/mutation-selftest.cjs && node scripts/pagination-selftest.cjs && node scripts/play-service-account-diagnostic-selftest.cjs && node scripts/play-pricing-diagnostic-selftest.cjs

PDF validation checks passed.
Video URL validation checks passed.
Quiz option validation checks passed.
Upload error message checks passed.
PASS updateCourse: zero-row rejection / one-row success
PASS setCourseActive: zero-row rejection / one-row success
PASS deleteCourse: zero-row rejection / one-row success
PASS updateYear: zero-row rejection / one-row success
PASS deleteYear: zero-row rejection / one-row success
PASS updateSubject: zero-row rejection / one-row success
PASS deleteSubject: zero-row rejection / one-row success
PASS updateChapter: zero-row rejection / one-row success
PASS deleteChapter: zero-row rejection / one-row success
PASS updateProduct: zero-row rejection / one-row success
PASS deleteProduct: zero-row rejection / one-row success
PASS setUserBlocked: zero-row rejection / one-row success
PASS admin pagination: 1001 rows and later-page errors
PASS admin service-account diagnostic (50 cases; admin/AAL2, concurrency, safe output, visibility)
PASS admin pricing diagnostic (28 cases; synthetic only)

EXIT_CODE=0
DURATION_SECONDS=11.12

````

## admin-tsc.log

````text
$ ./node_modules/.bin/tsc --noEmit --incremental false -p tsconfig.app.json
CWD: admin-panel

EXIT_CODE=0
DURATION_SECONDS=45.93

````

## database-local-final.log

````text
$ bash supabase/tests/run-all.sh
CWD: .
NOTICE:  database "ap_ci_16844" does not exist, skipping
== build: stub + migrations + seed
PASS  play_catalog_queue_regression_checks
PASS  play_catalog_failure_access_checks
PASS  play_duplicate_settlement_checks
PASS  f7_checks                            0FAIL,25PASS
PASS  f8_checks                            0FAIL,17PASS
PASS  batch1_checks                        0FAIL,78PASS
PASS  batch3_checks                        0FAIL,30PASS
PASS  batch3b_checks                       0FAIL,31PASS
PASS  phase2_referral_wallet_checks        0FAIL,125PASS
PASS  referral_limits_checks               0FAIL,65PASS
PASS  referral_off_wallet_checks           0FAIL,19PASS
PASS  high_phone_and_notes_checks          0FAIL,23PASS
PASS  medium_db_checks                     0FAIL,34PASS
PASS  low_grants_checks                    0FAIL,19PASS
PASS  admin_mfa_checks                     0FAIL,23PASS
PASS  ucb_checks                           0FAIL,28PASS
PASS  verified_content_checks              0FAIL,53PASS
PASS  account_deletion_checks
PASS  critical_fixes_checks
PASS  app_config_checks
PASS  null_year_fallback_checks
PASS  course_wide_browsing_checks
PASS  course_year_profile_checks
PASS  readiness_validation
PASS  content_publication_checks
PASS  quiz_answer_and_admin_mfa_checks
PASS  payment_queue_checks
PASS  referral_switch_off_paths
PASS  play_catalog_sync_checks
PASS  play_payment_pg_checks
PASS  play_entitlement_snapshot_checks
PASS  razorpay_snapshot_retry_checks
PASS  notes-choice-checkout
PASS  billing-settlement-recovery
PASS  nonplay-test-isolation
PASS  phase-c-contracts
PASS  phase-c-play-duplicates
PASS  p0-classified-reversal
PASS  fk-index-coverage
PASS  audit-checkout-publication
== edge-function harnesses
PASS pre-migration RPC definitions/ACLs match fresh deployed metadata (8 functions)
PASS repeat migration preserves financial/catalog rows
PASS AUD-009 early full refund persists; later capture never grants
PASS AUD-009 early open dispute survives duplicate/restart and capture
PASS AUD-009 early lost dispute survives duplicate/restart and capture
PASS AUD-009 unrecognized SQL result retries null
PASS AUD-009 unrecognized SQL result retries {}
PASS AUD-009 unrecognized SQL result retries {"status":"unknown_payment"}
PASS AUD-009 unrecognized SQL result retries {"status":"unexpected"}
PASS AUD-010 unknown order captures durably once
PASS AUD-010 amount mismatch captures durably once
PASS AUD-010 record_provider_event outage is retryable
PASS AUD-010 record_payment_capture outage is retryable
PASS AUD-010 payment_compensations outage is retryable
PASS AUD-012 missed refund fallback revokes paid PDF; repeated fallback cannot restore it
PASS signature rejects before any durable write
PASS AUD-010 attach/settle race never compensates a committed grant
PASS AUD-012 full-refund fallback after chargeback never restores buyer wallet
PASS AUD-012 classified lost fact retains chargeback precedence after reversal RPC failure
PASS deployed verifier signed website callback and mobile recovery stay compatible
PASS batch refund SQL: atomic failure rollback, wallet restored once, referral cancelled, legacy marker revoked, lost dispute no wallet restoration, service-only ACL
PASS  isolated non-Play test actual-handler/PostgreSQL integration
PASS  Play catalog unit + API regressions
PASS  pdf-validation + upload-body + note-pdf-hash (9 cases)
PASS F01 no underfunded grant across independent settlement sessions
PASS F01 failure and expiry release wallet reservations
PASS F02 concurrent replacement orders retain discount; only live reservation grants; stale capture compensated
PASS real concurrent retry/settlement create_first: no deadlock, single discount grant, correct late capture/retry price
PASS real concurrent retry/settlement settle_first: no deadlock, single discount grant, correct late capture/retry price
PASS concurrent real PostgreSQL sessions: one provider-creation claim/order; concurrent capture callbacks grant once
PASS F10 parallel Play token settlements grant once
PASS F10 parallel webhook/client Razorpay settlement grants once
PASS preexisting legacy migration, catalog, payment, and entitlement SQL checks
PASS skipped reports/refunds cannot finish durable jobs successfully
PASS capture-only crash recovery retries until authoritative settlement commits
PASS authorization inbox retries reporting without granting Notes
PASS compensation persistence errors and lost worker leases cannot return job success
PASS authenticated Notes choice endpoint denies before writes when disabled/invalid; server price/user win; repeat request returns same provider order
PASS ambiguous provider creation never repeats CREATE for the same choice
PASS ambiguous creation recovers one exactly bound receipt with no second CREATE; mismatched provider snapshots cannot open checkout
PASS verified authorization queues reporting only, rejects provider mismatches, skips website orders and never calls settlement
PASS production approval gates; stale/terminal/foreign/malformed reservations rejected before provider CREATE; testing prices unchanged
PASS F05 missing settlement receipt cannot return success
PASS F05 authoritative capture timestamp persisted separately from receipt
PASS B01 granted marker without committed purchase stays pending
PASS B01 uncommitted capture is retryable rather than compensation
PASS F03 UCB wallet shortfall capture is reported despite refused entitlement
PASS F03 verified capture for an unknown local order is recorded and compensated
PASS F10 independent Play and Razorpay sessions
PASS F10 mocked Google reporting scenarios
PASS F10 mocked Play consumption failure
PASS F10 missing completion time prevents Google call
PASS F10 transient rejection records failed state
PASS F10 retry then success
PASS F10 F05 Google transactionTime is provider capture time, 25h before receipt
PASS F10 permanent Google rejection stays failed
PASS F10 Google amount mismatch rejected
PASS F10 test server rejects an unmarked real Google report result
PASS F10 license-test Google result persists its authoritative test marker
PASS F10 first partial refund
PASS F10 second partial refund uses prior reported amount
PASS F10 busy refund claim throws for durable retry rather than returning skipped success
PASS F10 already reported refund replay returns confirmed completion
PASS F10 Google success cannot return reported when persistence fails
PASS F10 lost persistence result reconciles on retry
PASS F10 a slower failed attempt cannot downgrade a concurrent reported result
PASS F10 Google consumption failure recorded for retry after grant
PASS unsigned recover denied: 401
PASS wrong owner denied: 404
PASS recovery limiter fails closed before provider lookup: 429, lookups=0
PASS F04 eleventh refunded token checked despite ten permanent mock Google failures (11 unique tokens)
PASS F03 full automatic compensation retries and queues Google refund with stable request id
PASS F08 rejects missing both
PASS F08 rejects blank URL
PASS F08 rejects blank secret
PASS F08 rejects invalid URL
PASS F08 rejects short secret
PASS F08 rejects duplicate URL rows
PASS F08 rejects duplicate secret rows
PASS F08 accepts valid configuration
PASS successful Play consumption
PASS failed consumption and retry
PASS duplicate token/job does not consume twice
PASS concurrent worker claim
PASS expired lease reclaimed
PASS retry limit parks failed job
PASS Google API failure retried without false check timestamp
PASS refunded purchase reverses entitlement
PASS voided token deduplicated and reversed
PASS void observed before settlement reverses later entitlement
PASS stale lease cannot finish job
PASS stale lease cannot advance void cursor
PASS void API failure releases cursor for retry
PASS direct verification consumption race
PASS concurrent direct consume 409 confirmed with fresh Google read
PASS Razorpay paths untouched
PASS dedicated cron authentication
PASS Play-only migration dependencies and SQL lease fences
PASS Play Cron configuration, idempotency, authentication, and secret safety
PASS worker auth, safe logs, Publisher retry parity and terminal OAuth permission failures across 20 cases
PASS catalog failure persistence errors and expired leases return 503
PASS PATCH diagnostic reaches structured log; persisted error and retry behavior remain unchanged
PASS real catalog creation worker: 126 scenarios; exact INR/India, explicit version, auth, failures, retries, idempotency, rotation and lease fences
PASS play service-account diagnostic (43 cases; auth/MFA, exact match, safe output, read-only)
PASS checkout distinguishes terminal catalog failures from pending/stale tiers and fails closed on lookup errors
PASS real verification handler validates v2 receipt then settles and consumes
PASS paid Play RPC without committed Notes entitlement remains pending and unconsumed
PASS invalid ownership/token/SKU/option/refund/cancellation/pending/API/network cases cannot settle
PASS failed settlement never consumes; duplicate conflicts; paid replay and concurrent consumption remain idempotent
PASS AUD-019 malformed/nonobject JSON returns generic credentials failure before Auth/DB
PASS AUD-015 AAL1/AAL2, MFA on/off, missing/bad/error policy and nonadmin side-effect denial
PASS push tickets count acceptance only, partial/malformed/provider rejection, dead-token cleanup, and fail before send on feed persistence failure; no device delivery claim
PASS missing authentication denied before order/provider/settlement
PASS expired authentication denied before order/provider/settlement
PASS forged authentication denied before order/provider/settlement
PASS raw token authentication denied before order/provider/settlement
PASS Basic scheme authentication denied before order/provider/settlement
PASS wrong owner and missing order use verified identity filters and identical non-disclosing responses; body user ID ignored
PASS invalid UUID and failed recovery limiter never reach provider/settlement
PASS valid owner and duplicate recovery deliveries reach settlement (SQL idempotency covered by MV003)
PASS valid signed callback without JWT reaches shared helper; invalid/missing signature rejected before order lookup
PASS valid raw-body webhook HMAC; modified body/invalid HMAC rejected before inbox/settlement
PASS MV004 backend isolated fixtures; zero real HTTP requests
PASS standard entrypoint: native requests denied before writes; website checkout retained
PASS ordinary website route cannot bypass programme gates by attaching a legacy UCB body
PASS isolated test entrypoint does not import the live pricing handler; actual test handlers covered by nonplay-test-integration.ts
PASS malformed callback bodies return 400 without settlement
PASS production rejects test-mode key before provider request
PASS actual HMAC implementation accepts authentic and rejects forged/malformed signatures
PASS missing callback signature
PASS forged callback signature
PASS callback order swapped
PASS authorized payment cannot unlock
PASS wrong payment currency cannot unlock
PASS provider payment/order mismatch cannot unlock
PASS provider amount mismatch cannot unlock
PASS stored amount mismatch cannot unlock
PASS valid captured callback reaches server settlement
PASS refunded recovery is terminal without provider call or regrant
PASS recovery owner=undefined status=401
PASS recovery owner=other status=404
PASS recovery owner=buyer status=200
PASS content URL publication handlers: 45 cases with real service-role SQL authorization; Auth/Storage mocked
PASS unresolved/null/unrecognized refund and dispute results retain inbox and webhook/worker retries (36 paths)
PASS recognized idempotent reversal outcomes and closed manual hold preserved; unfamiliar states fail closed
PASS unresolved capture mismatches retain webhook retries; only durable compensation/reversal outcomes acknowledge
PASS targeted requests cannot persist globally readable content or read tokens; authorized broadcast and admin gate preserved
PASS rollout disabled keeps legacy checkout
PASS enabled rejects missing version
PASS enabled rejects old version
PASS enabled rejects absent choice
PASS enabled accepts supported choice
PASS malformed config fails closed
PASS disabled rollout still requires valid config
PASS missing rollout fails closed
PASS F07 production rejects test key with ALLOW_TEST_MODE=true
PASS F07 unset marker rejects test key with ALLOW_TEST_MODE=true
PASS F07 staging accepts intentional test key
PASS F07 production accepts live key
PASS F07 staging rejects mismatched/unknown key mode
PASS F07 staging rejects mismatched/unknown key mode
PASS F07 production rejects mismatched/unknown key mode
PASS F03 ambiguous Razorpay refund response recovered by stable marker without second POST
PASS receipt reconciliation uses GET only, exact receipt match, and rejects duplicates/truncated/malformed provider results
PASS F06 1,500 mocked Google jobs drained in 41 minutes; 1575 calls, 1.5s modeled latency, 5% first-attempt failure
PASS  webhook-harness (25 checks)
ALL SUITES PASSED

EXIT_CODE=0
DURATION_SECONDS=172.17

````

## database-local.log

````text
NOTICE:  database "ap_ci_7157" does not exist, skipping
== build: stub + migrations + seed
PASS  play_catalog_queue_regression_checks
PASS  play_catalog_failure_access_checks
PASS  play_duplicate_settlement_checks
PASS  f7_checks                            0FAIL,25PASS
PASS  f8_checks                            0FAIL,17PASS
PASS  batch1_checks                        0FAIL,78PASS
PASS  batch3_checks                        0FAIL,30PASS
PASS  batch3b_checks                       0FAIL,31PASS
PASS  phase2_referral_wallet_checks        0FAIL,125PASS
PASS  referral_limits_checks               0FAIL,65PASS
PASS  referral_off_wallet_checks           0FAIL,19PASS
PASS  high_phone_and_notes_checks          0FAIL,23PASS
PASS  medium_db_checks                     0FAIL,34PASS
PASS  low_grants_checks                    0FAIL,19PASS
PASS  admin_mfa_checks                     0FAIL,23PASS
PASS  ucb_checks                           0FAIL,28PASS
PASS  verified_content_checks              0FAIL,53PASS
PASS  account_deletion_checks
PASS  critical_fixes_checks
PASS  app_config_checks
PASS  null_year_fallback_checks
PASS  course_wide_browsing_checks
PASS  course_year_profile_checks
PASS  readiness_validation
PASS  content_publication_checks
PASS  quiz_answer_and_admin_mfa_checks
PASS  payment_queue_checks
PASS  referral_switch_off_paths
PASS  play_catalog_sync_checks
PASS  play_payment_pg_checks
PASS  play_entitlement_snapshot_checks
PASS  razorpay_snapshot_retry_checks
PASS  notes-choice-checkout
PASS  billing-settlement-recovery
PASS  nonplay-test-isolation
PASS  phase-c-contracts
PASS  phase-c-play-duplicates
PASS  p0-classified-reversal
PASS  fk-index-coverage
PASS  audit-checkout-publication
== edge-function harnesses
PASS pre-migration RPC definitions/ACLs match fresh deployed metadata (8 functions)
PASS repeat migration preserves financial/catalog rows
PASS AUD-009 early full refund persists; later capture never grants
PASS AUD-009 early open dispute survives duplicate/restart and capture
PASS AUD-009 early lost dispute survives duplicate/restart and capture
PASS AUD-009 unrecognized SQL result retries null
PASS AUD-009 unrecognized SQL result retries {}
PASS AUD-009 unrecognized SQL result retries {"status":"unknown_payment"}
PASS AUD-009 unrecognized SQL result retries {"status":"unexpected"}
PASS AUD-010 unknown order captures durably once
PASS AUD-010 amount mismatch captures durably once
PASS AUD-010 record_provider_event outage is retryable
PASS AUD-010 record_payment_capture outage is retryable
PASS AUD-010 payment_compensations outage is retryable
PASS AUD-012 missed refund fallback revokes paid PDF; repeated fallback cannot restore it
PASS signature rejects before any durable write
PASS AUD-010 attach/settle race never compensates a committed grant
PASS AUD-012 full-refund fallback after chargeback never restores buyer wallet
PASS AUD-012 classified lost fact retains chargeback precedence after reversal RPC failure
PASS deployed verifier signed website callback and mobile recovery stay compatible
PASS batch refund SQL: atomic failure rollback, wallet restored once, referral cancelled, legacy marker revoked, lost dispute no wallet restoration, service-only ACL

````

## database-suites.log

````text
$ bash supabase/tests/run-all.sh
CWD: .
Password for user postgres: 
psql: error: connection to server at "127.0.0.1", port 5432 failed: fe_sendauth: no password supplied
cannot create database

EXIT_CODE=2
DURATION_SECONDS=0.25

````

## db-run-mv003-local.py.log

````text
$ python3 supabase/tests/run-mv003-local.py
CWD: .
PASS standalone production-baseline migration applied twice; existing rows unchanged
PASS valid captured payment has committed entitlement
PASS valid chapter scope commits from immutable order snapshot
PASS valid subject scope commits from immutable order snapshot
PASS valid year scope commits from immutable order snapshot
PASS valid bundle scope commits from immutable order snapshot
PASS missing purchase cannot prove commitment
PASS purchase user_id cannot prove commitment
PASS purchase product_id cannot prove commitment
PASS purchase amount cannot prove commitment
PASS purchase course_id cannot prove commitment
PASS purchase scope cannot prove commitment
PASS purchase chapter_id cannot prove commitment
PASS purchase subject_id cannot prove commitment
PASS purchase year_id cannot prove commitment
PASS purchase year_ids cannot prove commitment
PASS purchase razorpay_order_id cannot prove commitment
PASS payment user_id cannot prove commitment
PASS payment product_id cannot prove commitment
PASS payment amount cannot prove commitment
PASS payment provider cannot prove commitment
PASS payment razorpay_order_id cannot prove commitment
PASS payment razorpay_payment_id cannot prove commitment
PASS payment status cannot prove commitment
PASS compensation_pending cannot prove commitment
PASS compensated cannot prove commitment
PASS reversal_pending cannot prove commitment
PASS reversed cannot prove commitment
PASS compensation pending cannot prove commitment
PASS compensation processing cannot prove commitment
PASS compensation refunded cannot prove commitment
PASS compensation parked cannot prove commitment
PASS pending reversal blocks commitment
PASS parked reversal blocks commitment
PASS false-success reproduction: granted marker + missing purchase + normal void return retries callback/webhook
PASS callback/webhook reject purchase user_id mismatch despite normal void settlement
PASS callback/webhook reject purchase product_id mismatch despite normal void settlement
PASS callback/webhook reject purchase amount mismatch despite normal void settlement
PASS callback/webhook reject purchase scope mismatch despite normal void settlement
PASS callback/webhook reject purchase course_id mismatch despite normal void settlement
PASS actual SQL compensation returns void; callback never unlocks; webhook acknowledges durable refund queue
PASS actual missing SQL RPC fails closed; webhook retries
PASS actual SQL exception during commitment check fails closed; webhook retries
PASS PGRST202 missing/errored commitment RPC fails closed and webhook retries
PASS XX000 missing/errored commitment RPC fails closed and webhook retries
PASS duplicate signed callback/webhook is idempotent
PASS independent PostgreSQL sessions serialize concurrent settlement
PASS historical purchase without capture marker stays valid and skips destructive replay
PASS interrupted capture-only settlement recovers through owner callback
PASS interruption after SQL commit retries without duplicate purchase
PASS valid signed callback without JWT succeeds
PASS invalid signature rejected before provider/settlement
PASS captured status, provider order, currency and amount checks retained
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

500 !== 400

    at /home/ganeshp8545/AyurPulse/supabase/tests/mv003-entitlement-selftest.cjs:108:249 {
  generatedMessage: true,
  code: 'ERR_ASSERTION',
  actual: 500,
  expected: 400,
  operator: 'strictEqual',
  diff: 'simple'
}
Traceback (most recent call last):
  File "/home/ganeshp8545/AyurPulse/supabase/tests/run-mv003-local.py", line 46, in <module>
    run(['node', 'supabase/tests/mv003-entitlement-selftest.cjs'])
    ~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/ganeshp8545/AyurPulse/supabase/tests/run-mv003-local.py", line 18, in run
    return subprocess.run(args, cwd=root, env=env, check=True, **kwargs)
           ~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/lib/python3.13/subprocess.py", line 577, in run
    raise CalledProcessError(retcode, process.args,
                             output=stdout, stderr=stderr)
subprocess.CalledProcessError: Command '['node', 'supabase/tests/mv003-entitlement-selftest.cjs']' returned non-zero exit status 1.

EXIT_CODE=1
DURATION_SECONDS=56.26

````

## db-run-phase-b-local.py.log

````text
$ python3 supabase/tests/run-phase-b-local.py
CWD: .
PASS standalone production-baseline migration applied twice; existing rows unchanged
PASS PRE-FIX reproduced privileged paid -> failed with successful payment/purchase and preserved Notes access
psql:supabase/migrations/20261110120000_mv005_razorpay_order_transitions.sql:32: NOTICE:  trigger "orders_03_razorpay_transition" for relation "public.orders" does not exist, skipping
PASS MV005 migration twice: historical financial fingerprints unchanged
PASS all eight inspected live function definitions match retained local baseline
PASS PRE-FIX excluded purchase permits second successful ownership with distinct financial references
PASS PRE-FIX refund of indexed historical purchase permits fresh duplicate beside exempt purchase
psql:supabase/migrations/20261110130000_mv006_purchase_ownership_guard.sql:60: NOTICE:  trigger "purchases_zz_success_ownership" for relation "public.purchases" does not exist, skipping
PASS MV006 twice over historical duplicates: existing financial fingerprints unchanged
PASS 37 reachable SQL/trigger/reader definitions match production baseline plus exactly Phase A
PASS historical duplicate rows retained; trusted Notes authorization preserved
PASS existing duplicate metadata update does not revoke or canonicalize history
PASS refund of one historic row keeps other purchase access; exception no longer permits new grant
PASS conflicting restoration transaction rolled back
PASS fully refunded ownership loses backend Notes authorization
PASS concurrent exempt restore then insert: waiting statement sees committed ownership
PASS concurrent insert then exempt restore: one authoritative success
PASS multi-row conflicting grants roll back atomically
PASS two captured orders settle concurrently: exactly one ownership, second never proves commitment
PASS already-owned new capture durably queued for compensation; no fictional entitlement
PASS separate provider reference retained as compensation evidence
PASS duplicate delivery of both payments remains idempotent
PASS same user/product checkout blocked before another order
PASS different users buy same product
PASS same user buys different products
PASS valid purchase without capture marker restores backend Notes access
PASS unsuccessful disputed ownership does not authorize Notes
PASS legitimate dispute restoration still works
PASS fully refunded purchase plus compensated capture never authorize Notes
PASS refunded/compensated deliveries never regrant access
PASS legacy scope-based success without product retains Notes access
PASS legacy NULL-product restore preserved without guessing a product
PASS ownership violation rolls back financial write in same transaction
PASS guard service-definer function has no client execution grant
PASS provider-payment and purchase-order uniqueness retained
PASS legacy same-order replay remains idempotent
PASS concurrent same-order INSERT ON CONFLICT replays coalesce without ownership errors
PASS historical contradiction retained; entitlement reader remains accessible; proof fails closed
PASS unpaid created grants no entitlement
PASS verified capture settles created -> paid
PASS late failure/cancellation rejected; conditional handler update harmless; Notes preserved
PASS duplicate settlement idempotent
PASS partial refund keeps legitimate access
PASS open dispute suspends access
PASS won dispute restores access
PASS full refund remains terminal on replay
PASS unpaid pending grants no entitlement
PASS verified capture settles pending -> paid
PASS late failure/cancellation rejected; conditional handler update harmless; Notes preserved
PASS duplicate settlement idempotent
PASS partial refund keeps legitimate access
PASS open dispute suspends access
PASS won dispute restores access
PASS full refund remains terminal on replay
PASS unpaid failed grants no entitlement
PASS verified capture settles failed -> paid
PASS late failure/cancellation rejected; conditional handler update harmless; Notes preserved
PASS duplicate settlement idempotent
PASS partial refund keeps legitimate access
PASS open dispute suspends access
PASS won dispute restores access
PASS full refund remains terminal on replay
PASS unpaid cancelled grants no entitlement
PASS verified capture settles cancelled -> paid
PASS late failure/cancellation rejected; conditional handler update harmless; Notes preserved
PASS duplicate settlement idempotent
PASS partial refund keeps legitimate access
PASS open dispute suspends access
PASS won dispute restores access
PASS full refund remains terminal on replay
PASS capture fact without purchase never proves entitlement
PASS captured fact can finish missing settlement
PASS lost dispute cannot regrant
PASS settlement first: waiting failed writer sees paid row and cannot overwrite it
PASS failure first: later legitimate capture settles atomically
PASS concurrent settlement creates one consistent purchase
PASS SQL exception rolls back payment, purchase, capture and order transaction
PASS retry after transaction rollback succeeds
PASS guard has no client execution grant
PASS historical failed/success helper returns manual review on duplicates; lookup errors fail closed; financial rows/access preserved; no settlement/compensation
PASS historical failed/success helper returns manual review on duplicates; lookup errors fail closed; financial rows/access preserved; no settlement/compensation
PASS valid captured payment has committed entitlement
PASS valid chapter scope commits from immutable order snapshot
PASS valid subject scope commits from immutable order snapshot
PASS valid year scope commits from immutable order snapshot
PASS valid bundle scope commits from immutable order snapshot
PASS missing purchase cannot prove commitment
PASS purchase user_id cannot prove commitment
PASS purchase product_id cannot prove commitment
PASS purchase amount cannot prove commitment
PASS purchase course_id cannot prove commitment
PASS purchase scope cannot prove commitment
PASS purchase chapter_id cannot prove commitment
PASS purchase subject_id cannot prove commitment
PASS purchase year_id cannot prove commitment
PASS purchase year_ids cannot prove commitment
PASS purchase razorpay_order_id cannot prove commitment
PASS payment user_id cannot prove commitment
PASS payment product_id cannot prove commitment
PASS payment amount cannot prove commitment
PASS payment provider cannot prove commitment
PASS payment razorpay_order_id cannot prove commitment
PASS payment razorpay_payment_id cannot prove commitment
PASS payment status cannot prove commitment
PASS compensation_pending cannot prove commitment
PASS compensated cannot prove commitment
PASS reversal_pending cannot prove commitment
PASS reversed cannot prove commitment
PASS compensation pending cannot prove commitment
PASS compensation processing cannot prove commitment
PASS compensation refunded cannot prove commitment
PASS compensation parked cannot prove commitment
PASS pending reversal blocks commitment
PASS parked reversal blocks commitment
PASS false-success reproduction: granted marker + missing purchase + normal void return retries callback/webhook
PASS callback/webhook reject purchase user_id mismatch despite normal void settlement
PASS callback/webhook reject purchase product_id mismatch despite normal void settlement
PASS callback/webhook reject purchase amount mismatch despite normal void settlement
PASS callback/webhook reject purchase scope mismatch despite normal void settlement
PASS callback/webhook reject purchase course_id mismatch despite normal void settlement
PASS actual SQL compensation returns void; callback never unlocks; webhook acknowledges durable refund queue
PASS actual missing SQL RPC fails closed; webhook retries
PASS actual SQL exception during commitment check fails closed; webhook retries
PASS PGRST202 missing/errored commitment RPC fails closed and webhook retries
PASS XX000 missing/errored commitment RPC fails closed and webhook retries
PASS duplicate signed callback/webhook is idempotent
PASS independent PostgreSQL sessions serialize concurrent settlement
PASS historical purchase without capture marker stays valid and skips destructive replay
PASS interrupted capture-only settlement recovers through owner callback
PASS interruption after SQL commit retries without duplicate purchase
PASS valid signed callback without JWT succeeds
PASS invalid signature rejected before provider/settlement
PASS captured status, provider order, currency and amount checks retained
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

500 !== 400

    at /home/ganeshp8545/AyurPulse/supabase/tests/mv003-entitlement-selftest.cjs:108:249 {
  generatedMessage: true,
  code: 'ERR_ASSERTION',
  actual: 500,
  expected: 400,
  operator: 'strictEqual',
  diff: 'simple'
}
Traceback (most recent call last):
  File "/home/ganeshp8545/AyurPulse/supabase/tests/run-phase-b-local.py", line 78, in <module>
    run(['node', 'supabase/tests/mv003-entitlement-selftest.cjs'])
    ~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/ganeshp8545/AyurPulse/supabase/tests/run-phase-b-local.py", line 18, in run
    return subprocess.run(args, cwd=root, env=env, check=True, **kwargs)
           ~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/lib/python3.13/subprocess.py", line 577, in run
    raise CalledProcessError(retcode, process.args,
                             output=stdout, stderr=stderr)
subprocess.CalledProcessError: Command '['node', 'supabase/tests/mv003-entitlement-selftest.cjs']' returned non-zero exit status 1.

EXIT_CODE=1
DURATION_SECONDS=103.18

````

## db-run-phase-c-local.py.log

````text
$ python3 supabase/tests/run-phase-c-local.py
CWD: .
PASS PRE-FIX reproduced privileged paid -> failed with successful payment/purchase and preserved Notes access
PASS PRE-FIX excluded purchase permits second successful ownership with distinct financial references
PASS PRE-FIX refund of indexed historical purchase permits fresh duplicate beside exempt purchase
PASS Phase A -> Notes choice -> recovery -> final override twice; weaker overwrite reproduced; history preserved
psql:supabase/tests/notes-choice-checkout.sql:66: NOTICE:  PASS token/account/product binding, authoritative discounts/wallet/tax, one reserved order, stable reporting deadline, no access before capture, one entitlement/debit after repeated capture, historical Notes preserved
PASS real SQL notes-choice-checkout
psql:supabase/tests/billing-settlement-recovery.sql:41: NOTICE:  PASS capture crash recovery, committed entitlement proof, replay, additional-capture compensation, partial-refund replay and disputed denial
 record_provider_event 
-----------------------
 
(1 row)

 enqueue_payment_jobs 
----------------------
 
(1 row)

psql:supabase/tests/billing-settlement-recovery.sql:55: NOTICE:  PASS authorization-only failed reports and pending authorization inbox are queued without granting access
psql:supabase/tests/billing-settlement-recovery.sql:73: NOTICE:  PASS void/no-op settlement cannot mark capture granted
psql:supabase/tests/billing-settlement-recovery.sql:89: NOTICE:  PASS long opaque token, global reuse denial and null-expiry rejection
              set_config              
--------------------------------------
 d9500000-0000-4000-8000-000000000001
(1 row)

psql:supabase/tests/billing-settlement-recovery.sql:112: NOTICE:  PASS Play fulfillment proof, account-bound restore and least-privilege RPC access
PASS real SQL billing-settlement-recovery
psql:supabase/tests/razorpay_snapshot_retry_checks.sql:57: NOTICE:  PASS immutable chapter scope/course/amount, duplicate callbacks, partial/full refunds and post-refund replay
psql:supabase/tests/razorpay_snapshot_retry_checks.sql:57: NOTICE:  PASS immutable subject scope/course/amount, duplicate callbacks, partial/full refunds and post-refund replay
psql:supabase/tests/razorpay_snapshot_retry_checks.sql:57: NOTICE:  PASS immutable year scope/course/amount, duplicate callbacks, partial/full refunds and post-refund replay
psql:supabase/tests/razorpay_snapshot_retry_checks.sql:57: NOTICE:  PASS immutable bundle scope/course/amount, duplicate callbacks, partial/full refunds and post-refund replay
psql:supabase/tests/razorpay_snapshot_retry_checks.sql:123: NOTICE:  PASS failed/cancelled retry discount, late captures, account binding, amount check, duplicate debit and refund
psql:supabase/tests/razorpay_snapshot_retry_checks.sql:143: NOTICE:  PASS expired reservation retries safely and late expired capture is compensated
 settle_razorpay_payment 
-------------------------
 
(1 row)

psql:supabase/tests/razorpay_snapshot_retry_checks.sql:151: NOTICE:  PASS incomplete legacy order is compensated without inferring entitlement from catalog
PASS real SQL razorpay_snapshot_retry_checks
psql:supabase/tests/phase-c-contracts.sql:41: NOTICE:  PASS expired reservation, token digest/external-ID uniqueness, RLS/service ACLs, one lease, stable deadline/backoff, stale-finisher denial and done-job idempotency
psql:supabase/tests/phase-c-contracts.sql:89: NOTICE:  PASS real service-role create Play order/verified SKU-option price, catalog drift immutable grant, replay/refund, alternative selection excludes Play, Razorpay exact commitment and Notes unlock
PASS real SQL phase-c-contracts
psql:supabase/tests/payment_queue_checks.sql:50: NOTICE:  PASS F04 fair claim, failed-token backoff, lease expiry recovery
psql:supabase/tests/payment_queue_checks.sql:50: NOTICE:  PASS F06 deadline priority, permanent parking and backlog metric
psql:supabase/tests/payment_queue_checks.sql:50: NOTICE:  PASS F05 provider-time correction advances queued report deadline
PASS real SQL payment_queue_checks
psql:supabase/tests/play_payment_pg_checks.sql:119: NOTICE:  PASS Play enqueue, leases, retries, parking, reconciliation, void cursor, entitlement reversal and Razorpay isolation
psql:supabase/tests/play_payment_pg_checks.sql:147: NOTICE:  PASS Play queue, token, cursor, metrics and RPC privilege checks
PASS real SQL play_payment_pg_checks
psql:supabase/tests/play_entitlement_snapshot_checks.sql:23: NOTICE:  PASS Play entitlement uses immutable order snapshot
psql:supabase/tests/play_entitlement_snapshot_checks.sql:37: NOTICE:  PASS Razorpay entitlement insert uses order snapshot
PASS real SQL play_entitlement_snapshot_checks
PASS real SQL phase-c-play-duplicates
PASS real SQL play_catalog_queue_regression_checks
PASS real SQL play_catalog_failure_access_checks
PASS historical contradiction retained; entitlement reader remains accessible; proof fails closed
PASS unpaid created grants no entitlement
PASS verified capture settles created -> paid
PASS late failure/cancellation rejected; conditional handler update harmless; Notes preserved
PASS duplicate settlement idempotent
PASS partial refund keeps legitimate access
PASS open dispute suspends access
PASS won dispute restores access
PASS full refund remains terminal on replay
PASS unpaid pending grants no entitlement
PASS verified capture settles pending -> paid
PASS late failure/cancellation rejected; conditional handler update harmless; Notes preserved
PASS duplicate settlement idempotent
PASS partial refund keeps legitimate access
PASS open dispute suspends access
PASS won dispute restores access
PASS full refund remains terminal on replay
PASS unpaid failed grants no entitlement
PASS verified capture settles failed -> paid
PASS late failure/cancellation rejected; conditional handler update harmless; Notes preserved
PASS duplicate settlement idempotent
PASS partial refund keeps legitimate access
PASS open dispute suspends access
PASS won dispute restores access
PASS full refund remains terminal on replay
PASS unpaid cancelled grants no entitlement
PASS verified capture settles cancelled -> paid
PASS late failure/cancellation rejected; conditional handler update harmless; Notes preserved
PASS duplicate settlement idempotent
PASS partial refund keeps legitimate access
PASS open dispute suspends access
PASS won dispute restores access
PASS full refund remains terminal on replay
PASS capture fact without purchase never proves entitlement
PASS captured fact can finish missing settlement
PASS lost dispute cannot regrant
PASS settlement first: waiting failed writer sees paid row and cannot overwrite it
PASS failure first: later legitimate capture settles atomically
PASS concurrent settlement creates one consistent purchase
PASS SQL exception rolls back payment, purchase, capture and order transaction
PASS retry after transaction rollback succeeds
PASS guard has no client execution grant
PASS historical duplicate rows retained; trusted Notes authorization preserved
PASS existing duplicate metadata update does not revoke or canonicalize history
PASS refund of one historic row keeps other purchase access; exception no longer permits new grant
PASS conflicting restoration transaction rolled back
PASS fully refunded ownership loses backend Notes authorization
PASS concurrent exempt restore then insert: waiting statement sees committed ownership
PASS concurrent insert then exempt restore: one authoritative success
PASS multi-row conflicting grants roll back atomically
PASS two captured orders settle concurrently: exactly one ownership, second never proves commitment
PASS already-owned new capture durably queued for compensation; no fictional entitlement
PASS separate provider reference retained as compensation evidence
PASS duplicate delivery of both payments remains idempotent
PASS same user/product checkout blocked before another order
PASS different users buy same product
PASS same user buys different products
PASS valid purchase without capture marker restores backend Notes access
PASS unsuccessful disputed ownership does not authorize Notes
PASS legitimate dispute restoration still works
PASS fully refunded purchase plus compensated capture never authorize Notes
PASS refunded/compensated deliveries never regrant access
PASS legacy scope-based success without product retains Notes access
PASS legacy NULL-product restore preserved without guessing a product
PASS ownership violation rolls back financial write in same transaction
PASS guard service-definer function has no client execution grant
PASS provider-payment and purchase-order uniqueness retained
PASS legacy same-order replay remains idempotent
PASS concurrent same-order INSERT ON CONFLICT replays coalesce without ownership errors
PASS valid captured payment has committed entitlement
PASS valid chapter scope commits from immutable order snapshot
PASS valid subject scope commits from immutable order snapshot
PASS valid year scope commits from immutable order snapshot
PASS valid bundle scope commits from immutable order snapshot
PASS missing purchase cannot prove commitment
PASS purchase user_id cannot prove commitment
PASS purchase product_id cannot prove commitment
PASS purchase amount cannot prove commitment
PASS purchase course_id cannot prove commitment
PASS purchase scope cannot prove commitment
PASS purchase chapter_id cannot prove commitment
PASS purchase subject_id cannot prove commitment
PASS purchase year_id cannot prove commitment
PASS purchase year_ids cannot prove commitment
PASS purchase razorpay_order_id cannot prove commitment
PASS payment user_id cannot prove commitment
PASS payment product_id cannot prove commitment
PASS payment amount cannot prove commitment
PASS payment provider cannot prove commitment
PASS payment razorpay_order_id cannot prove commitment
PASS payment razorpay_payment_id cannot prove commitment
PASS payment status cannot prove commitment
PASS compensation_pending cannot prove commitment
PASS compensated cannot prove commitment
PASS reversal_pending cannot prove commitment
PASS reversed cannot prove commitment
PASS compensation pending cannot prove commitment
PASS compensation processing cannot prove commitment
PASS compensation refunded cannot prove commitment
PASS compensation parked cannot prove commitment
PASS pending reversal blocks commitment
PASS parked reversal blocks commitment
PASS false-success reproduction: granted marker + missing purchase + normal void return retries callback/webhook
PASS callback/webhook reject purchase user_id mismatch despite normal void settlement
PASS callback/webhook reject purchase product_id mismatch despite normal void settlement
PASS callback/webhook reject purchase amount mismatch despite normal void settlement
PASS callback/webhook reject purchase scope mismatch despite normal void settlement
PASS callback/webhook reject purchase course_id mismatch despite normal void settlement
PASS actual SQL compensation returns void; callback never unlocks; webhook acknowledges durable refund queue
PASS actual missing SQL RPC fails closed; webhook retries
PASS actual SQL exception during commitment check fails closed; webhook retries
PASS PGRST202 missing/errored commitment RPC fails closed and webhook retries
PASS XX000 missing/errored commitment RPC fails closed and webhook retries
PASS duplicate signed callback/webhook is idempotent
PASS independent PostgreSQL sessions serialize concurrent settlement
PASS historical purchase without capture marker stays valid and skips destructive replay
PASS interrupted capture-only settlement recovers through owner callback
PASS interruption after SQL commit retries without duplicate purchase
PASS valid signed callback without JWT succeeds
PASS invalid signature rejected before provider/settlement
PASS captured status, provider order, currency and amount checks retained
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

500 !== 400

    at /home/ganeshp8545/AyurPulse/supabase/tests/mv003-entitlement-selftest.cjs:108:249 {
  generatedMessage: true,
  code: 'ERR_ASSERTION',
  actual: 500,
  expected: 400,
  operator: 'strictEqual',
  diff: 'simple'
}
Traceback (most recent call last):
  File "/home/ganeshp8545/AyurPulse/supabase/tests/run-phase-c-local.py", line 63, in <module>
    run(['node',f'supabase/tests/{name}-selftest.cjs'])
    ~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/ganeshp8545/AyurPulse/supabase/tests/run-phase-c-local.py", line 13, in run
    def run(args,**kw):return subprocess.run(args,cwd=root,env=env,check=True,**kw)
                              ~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/lib/python3.13/subprocess.py", line 577, in run
    raise CalledProcessError(retcode, process.args,
                             output=stdout, stderr=stderr)
subprocess.CalledProcessError: Command '['node', 'supabase/tests/mv003-entitlement-selftest.cjs']' returned non-zero exit status 1.

EXIT_CODE=1
DURATION_SECONDS=102.62

````

## db-run-remaining-audit-local.py.log

````text
$ python3 supabase/tests/run-remaining-audit-local.py
CWD: .
PASS all 78 migrations applied in fresh disposable PostgreSQL
PASS publication migration repeatability: unchanged financial/catalog/content rows
PASS publication/pricing/Play RPC client denial and service-only ACL
PASS AUD-013 published scopes, all ancestors, second bundle year, no rejected insert, existing payment recovery


EXIT_CODE=0
DURATION_SECONDS=17.93

````

## deno-check.log

````text
$ deno check --cached-only --config supabase/deno.json supabase/functions/attach-external-token/index.ts supabase/functions/create-order/index.ts supabase/functions/create-order-nonplay-test/index.ts supabase/functions/create-order-play-choice/index.ts supabase/functions/create-play-order/index.ts supabase/functions/delete-account/index.ts supabase/functions/diagnose-play-matrix/index.ts supabase/functions/diagnose-play-pricing/index.ts supabase/functions/diagnose-play-service-account/index.ts supabase/functions/get-note-url/index.ts supabase/functions/get-note-url-nonplay-test/index.ts supabase/functions/get-video-url/index.ts supabase/functions/login-with-mobile/index.ts supabase/functions/nonplay-test-catalog/index.ts supabase/functions/play-payment-worker/index.ts supabase/functions/razorpay-webhook/index.ts supabase/functions/razorpay-webhook-nonplay-test/index.ts supabase/functions/report-external-transaction/index.ts supabase/functions/request-password-reset-by-mobile/index.ts supabase/functions/send-push-notification/index.ts supabase/functions/sync-play-catalog/index.ts supabase/functions/upload-note-pdf/index.ts supabase/functions/verify-payment/index.ts supabase/functions/verify-payment-nonplay-test/index.ts supabase/functions/verify-play-purchase/index.ts supabase/workers/validate-note-pdf.ts
CWD: .
Download https://registry.npmjs.org/@supabase%2fsupabase-js
Download https://registry.npmjs.org/pdf-lib
Download https://registry.npmjs.org/pdf-lib/-/pdf-lib-1.17.1.tgz
Download https://registry.npmjs.org/@supabase/supabase-js/-/supabase-js-2.118.0.tgz
Download https://registry.npmjs.org/@pdf-lib/upng/-/upng-1.0.1.tgz
Download https://registry.npmjs.org/tslib/-/tslib-1.14.1.tgz
Download https://registry.npmjs.org/@pdf-lib/standard-fonts/-/standard-fonts-1.0.0.tgz
Download https://registry.npmjs.org/pako/-/pako-1.0.11.tgz
Download https://registry.npmjs.org/@supabase/storage-js/-/storage-js-2.118.0.tgz
Download https://registry.npmjs.org/@supabase/functions-js/-/functions-js-2.118.0.tgz
Download https://registry.npmjs.org/@supabase/auth-js/-/auth-js-2.118.0.tgz
Download https://registry.npmjs.org/@supabase/postgrest-js/-/postgrest-js-2.118.0.tgz
Download https://registry.npmjs.org/@supabase/realtime-js/-/realtime-js-2.118.0.tgz
Download https://registry.npmjs.org/iceberg-js/-/iceberg-js-0.8.1.tgz
Download https://registry.npmjs.org/tslib/-/tslib-2.8.1.tgz
Download https://registry.npmjs.org/@supabase/phoenix/-/phoenix-0.4.5.tgz
Check supabase/functions/attach-external-token/index.ts
Check supabase/functions/create-order/index.ts
Check supabase/functions/create-order-nonplay-test/index.ts
Check supabase/functions/create-order-play-choice/index.ts
Check supabase/functions/create-play-order/index.ts
Check supabase/functions/delete-account/index.ts
Check supabase/functions/diagnose-play-matrix/index.ts
Check supabase/functions/diagnose-play-pricing/index.ts
Check supabase/functions/diagnose-play-service-account/index.ts
Check supabase/functions/get-note-url/index.ts
Check supabase/functions/get-note-url-nonplay-test/index.ts
Check supabase/functions/get-video-url/index.ts
Check supabase/functions/login-with-mobile/index.ts
Check supabase/functions/nonplay-test-catalog/index.ts
Check supabase/functions/play-payment-worker/index.ts
Check supabase/functions/razorpay-webhook/index.ts
Check supabase/functions/razorpay-webhook-nonplay-test/index.ts
Check supabase/functions/report-external-transaction/index.ts
Check supabase/functions/request-password-reset-by-mobile/index.ts
Check supabase/functions/send-push-notification/index.ts
Check supabase/functions/sync-play-catalog/index.ts
Check supabase/functions/upload-note-pdf/index.ts
Check supabase/functions/verify-payment/index.ts
Check supabase/functions/verify-payment-nonplay-test/index.ts
Check supabase/functions/verify-play-purchase/index.ts
Check supabase/workers/validate-note-pdf.ts

EXIT_CODE=0
DURATION_SECONDS=19.92

````

## deno-payment-backlog-load-selftest.log

````text
$ deno run --cached-only --config supabase/deno.json --allow-read --allow-env supabase/tests/payment-backlog-load-selftest.ts
CWD: .
PASS F06 1,500 mocked Google jobs drained in 41 minutes; 1575 calls, 1.5s modeled latency, 5% first-attempt failure

EXIT_CODE=0
DURATION_SECONDS=0.71

````

## deno-payment-gate-selftest.log

````text
$ deno run --cached-only --config supabase/deno.json --allow-read --allow-env supabase/tests/payment-gate-selftest.ts
CWD: .
PASS rollout disabled keeps legacy checkout
PASS enabled rejects missing version
PASS enabled rejects old version
PASS enabled rejects absent choice
PASS enabled accepts supported choice
PASS malformed config fails closed
PASS disabled rollout still requires valid config
PASS missing rollout fails closed

EXIT_CODE=0
DURATION_SECONDS=0.14

````

## deno-razorpay-env-selftest.log

````text
$ deno run --cached-only --config supabase/deno.json --allow-read --allow-env supabase/tests/razorpay-env-selftest.ts
CWD: .
PASS F07 production rejects test key with ALLOW_TEST_MODE=true
PASS F07 unset marker rejects test key with ALLOW_TEST_MODE=true
[razorpay] RUNNING IN STAGING TEST MODE. Real payments will NOT be processed.
PASS F07 staging accepts intentional test key
PASS F07 production accepts live key
PASS F07 staging rejects mismatched/unknown key mode
PASS F07 staging rejects mismatched/unknown key mode
PASS F07 production rejects mismatched/unknown key mode

EXIT_CODE=0
DURATION_SECONDS=0.33

````

## deno-razorpay-order-recovery-selftest.log

````text
$ deno run --cached-only --config supabase/deno.json --allow-read --allow-env supabase/tests/razorpay-order-recovery-selftest.ts
CWD: .
[razorpay] RUNNING IN STAGING TEST MODE. Real payments will NOT be processed.
[razorpay] RUNNING IN STAGING TEST MODE. Real payments will NOT be processed.
[razorpay] RUNNING IN STAGING TEST MODE. Real payments will NOT be processed.
[razorpay] RUNNING IN STAGING TEST MODE. Real payments will NOT be processed.
[razorpay] RUNNING IN STAGING TEST MODE. Real payments will NOT be processed.
[razorpay] RUNNING IN STAGING TEST MODE. Real payments will NOT be processed.
PASS receipt reconciliation uses GET only, exact receipt match, and rejects duplicates/truncated/malformed provider results

EXIT_CODE=0
DURATION_SECONDS=0.26

````

## deno-razorpay-refund-selftest.log

````text
$ deno run --cached-only --config supabase/deno.json --allow-read --allow-env supabase/tests/razorpay-refund-selftest.ts
CWD: .
[razorpay] RUNNING IN STAGING TEST MODE. Real payments will NOT be processed.
[razorpay] RUNNING IN STAGING TEST MODE. Real payments will NOT be processed.
[razorpay] RUNNING IN STAGING TEST MODE. Real payments will NOT be processed.
[razorpay] RUNNING IN STAGING TEST MODE. Real payments will NOT be processed.
PASS F03 ambiguous Razorpay refund response recovered by stable marker without second POST

EXIT_CODE=0
DURATION_SECONDS=0.15

````

## deno-unit.log

````text
$ deno test --cached-only --config supabase/deno.json --allow-read --allow-env supabase/tests/pdf-validation-test.ts supabase/tests/upload-body-test.ts supabase/tests/quarantine-worker-test.ts supabase/tests/note-pdf-hash-test.ts supabase/tests/play_catalog_unit_test.ts supabase/tests/play_diagnostic_sanitization_review_test.ts supabase/tests/upload-note-pdf-test.ts supabase/tests/play_catalog_api_test.ts supabase/tests/play_catalog_patch_diagnostic_test.ts supabase/functions/diagnose-play-pricing/handler_test.ts supabase/functions/diagnose-play-pricing/sanitize_test.ts
CWD: .
Check supabase/functions/diagnose-play-pricing/handler_test.ts
Check supabase/functions/diagnose-play-pricing/sanitize_test.ts
Check supabase/tests/pdf-validation-test.ts
Check supabase/tests/upload-body-test.ts
Check supabase/tests/quarantine-worker-test.ts
Check supabase/tests/note-pdf-hash-test.ts
Check supabase/tests/play_catalog_unit_test.ts
Check supabase/tests/play_diagnostic_sanitization_review_test.ts
Check supabase/tests/upload-note-pdf-test.ts
Check supabase/tests/play_catalog_api_test.ts
Check supabase/tests/play_catalog_patch_diagnostic_test.ts
running 7 tests from ./supabase/functions/diagnose-play-pricing/handler_test.ts
requires a verified Auth user before admin, credential, or Google access ... ok (339ms)
requires admin membership before credential or Google access ... ok (2ms)
admin lookup failure fails closed before credential access ... ok (4ms)
requires AAL2 unconditionally before credential or Google access ... ok (1ms)
only POST is allowed and no browser CORS access is granted ... ok (41ms)
authorized invocation makes exactly one fixed Google call and sanitizes the response ... ok (61ms)
successful conversion returns status without prices ... ok (5ms)
running 4 tests from ./supabase/functions/diagnose-play-pricing/sanitize_test.ts
keeps actionable Google denial fields and redacts identifiers ... ok (3ms)
uses Google status when no detailed reason is present ... ok (834µs)
redacts credential fields in a Google message ... ok (488µs)
redacts exact opaque credentials even without recognizable prefixes ... ok (434µs)
running 2 tests from ./supabase/tests/pdf-validation-test.ts
complete PDF with a page passes ... ok (396ms)
header spoof, false structure, and truncated PDFs fail ... ok (43ms)
running 6 tests from ./supabase/tests/upload-body-test.ts
valid multipart preserves request and file ... ok (123ms)
declared oversized ... ok (7ms)
lying length bounded ... ok (10ms)
missing length bounded ... ok (4ms)
malformed multipart ... ok (20ms)
wrong content type ... ok (424µs)
running 8 tests from ./supabase/tests/quarantine-worker-test.ts
valid ...
------- post-test output -------
{"requestId":"local-id","outcome":"complete"}
----- post-test output end -----
valid ... ok (250ms)
corrupt ...
------- post-test output -------
{"requestId":"local-id","outcome":"rejected","errorClass":"Error"}
{"requestId":"local-id","outcome":"rejected"}
----- post-test output end -----
corrupt ... ok (18ms)
wrong-hash ...
------- post-test output -------
{"requestId":"local-id","outcome":"rejected","errorClass":"Error"}
{"requestId":"local-id","outcome":"rejected"}
----- post-test output end -----
wrong-hash ... ok (16ms)
wrong-size ...
------- post-test output -------
{"requestId":"local-id","outcome":"rejected"}
{"requestId":"local-id","outcome":"rejected","errorClass":"Error"}
----- post-test output end -----
wrong-size ... ok (8ms)
download-fails ...
------- post-test output -------
{"requestId":"local-id","outcome":"pending"}
{"requestId":"local-id","outcome":"pending","errorClass":"Error"}
----- post-test output end -----
download-fails ... ok (16ms)
lost-promotion-response ...
------- post-test output -------
{"requestId":"local-id","outcome":"complete"}
----- post-test output end -----
lost-promotion-response ... ok (20ms)
wrong-existing-object ...
------- post-test output -------
{"requestId":"local-id","outcome":"pending"}
{"requestId":"local-id","outcome":"pending","errorClass":"Error"}
----- post-test output end -----
wrong-existing-object ... ok (16ms)
expired-lease ... ok (14ms)
running 1 test from ./supabase/tests/note-pdf-hash-test.ts
ambiguous PDF upload retries require exact stored bytes ... ok (34ms)
running 4 tests from ./supabase/tests/play_catalog_unit_test.ts
arbitrary exact INR prices and Play money precision ... ok (3ms)
malformed or ambiguous catalog responses cannot activate or become ready ... ok (2ms)
only an active, exact-price India BUY option is verified ... ok (394µs)
purchase verification binds SKU, BUY option, user, order and refund state ... ok (31ms)
running 1 test from ./supabase/tests/play_diagnostic_sanitization_review_test.ts
catalog diagnostics omit credentials, URLs, raw bodies and structured secret fields ... ok (712ms)
running 6 tests from ./supabase/tests/upload-note-pdf-test.ts
valid multipart PDF and UUID pass upload validation ... ok (150ms)
missing file is rejected ... ok (5ms)
malformed UUID ... ok (2ms)
invalid PDF ... ok (12ms)
PDF above 10 MB uses quarantine flow ... ok (277ms)
oversized multipart request is rejected before parsing ... ok (38ms)
running 1 test from ./supabase/tests/play_catalog_api_test.ts
Google catalog create, activate and read-back use the supported APIs ... ok (2s)
running 6 tests from ./supabase/tests/play_catalog_patch_diagnostic_test.ts
PATCH 403 preserves version-validation messages and safe BadRequest fields ... ok (340ms)
PATCH permission-denial projection and operation scope stay unchanged ... ok (3ms)
PATCH malformed error containers and violations never expose raw values ... ok (2ms)
PATCH messages and field descriptions redact credentials before bounding output ... ok (28ms)
PATCH diagnostic sizes are bounded and incomplete secret scans omit free text ... ok (9ms)
real PATCH parser masks request bearer/body secrets and handles malformed HTTP responses offline ... ok (454ms)

ok | 46 passed | 0 failed (1m29s)


EXIT_CODE=0
DURATION_SECONDS=97.76

````

## eas-config.log

````text
$ npx --yes eas-cli config --platform android --profile production --non-interactive
CWD: mobile-app
★ eas-cli@27.7.2 is now available.
To upgrade, run:
npm install -g eas-cli
Proceeding with outdated version.

No environment variables with visibility "Plain text" and "Sensitive" found for the "production" environment on EAS.
Environment variables loaded from the "production" build profile "env" configuration: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, MEDVEDA_PAYMENT_PROVIDER.

app.config.js or app.json

{
  "name": "MedVeda",
  "slug": "ayurpulse",
  "version": "1.2.2",
  "orientation": "default",
  "icon": "./assets/icon.png",
  "userInterfaceStyle": "dark",
  "scheme": "medveda",
  "assetBundlePatterns": [
    "**/*"
  ],
  "android": {
    "package": "in.medveda.app",
    "adaptiveIcon": {
      "foregroundImage": "./assets/adaptive-icon.png",
      "backgroundColor": "#2E7D32"
    },
    "permissions": [
      "INTERNET",
      "POST_NOTIFICATIONS"
    ],
    "allowBackup": false,
    "blockedPermissions": [
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.DOWNLOAD_WITHOUT_NOTIFICATION"
    ],
    "softwareKeyboardLayoutMode": "resize",
    "runtimeVersion": "1.2.2-disabled-notes-choice-v1",
    "googleServicesFile": "./google-services.json"
  },
  "plugins": [
    "@react-native-community/datetimepicker",
    "expo-notifications",
    "expo-secure-store",
    [
      "expo-splash-screen",
      {
        "image": "./assets/icon.png",
        "imageWidth": 200,
        "resizeMode": "contain",
        "backgroundColor": "#100C0A"
      }
    ],
    "expo-status-bar",
    "expo-web-browser",
    "expo-sqlite",
    "./plugins/withAndroidQueries.js",
    "expo-font",
    [
      "expo-build-properties",
      {
        "android": {
          "usesCleartextTraffic": false,
          "enableMinifyInReleaseBuilds": true,
          "enableShrinkResourcesInReleaseBuilds": true,
          "extraProguardRules": "# React Native and dependencies supply consumer rules for bridge/reflection/JNI.\n# PdfiumAndroidKt loads this class and its native entry points by name. Keep\n# only that JNI surface, rather than all PDF viewer, BlobUtil and Sentry code.\n-keep,includedescriptorclasses class io.legere.pdfiumandroid.PdfiumCore {\n    native <methods>;\n}\n-keepclasseswithmembernames,includedescriptorclasses class io.legere.pdfiumandroid.** {\n    native <methods>;\n}\n"
        }
      }
    ],
    "./plugins/withAndroidRelease.js",
    "./plugins/withOptionalSentry.cjs"
  ],
  "extra": {
    "eas": {
      "projectId": "2d642c70-8ec1-4d7b-a388-2f2f99e8a8df"
    },
    "medvedaPaymentProvider": "disabled",
    "medvedaIndiaUcbEnrolled": false,
    "medvedaUcbTestAccepted": false,
    "medvedaDistribution": "standard",
    "medvedaBuildTarget": "production"
  },
  "runtimeVersion": {
    "policy": "appVersion"
  },
  "updates": {
    "url": "https://u.expo.dev/2d642c70-8ec1-4d7b-a388-2f2f99e8a8df"
  },
  "owner": "ganeshp0305",
  "ios": {
    "bundleIdentifier": "com.medveda.app"
  },
  "sdkVersion": "57.0.0",
  "platforms": [
    "ios",
    "android",
    "web"
  ]
}


🤖 Build profile "production"

{
  "credentialsSource": "remote",
  "distribution": "store",
  "environment": "production",
  "autoIncrement": true,
  "env": {
    "EXPO_PUBLIC_SUPABASE_URL": "https://xbvenkfmesugrbjuufyw.supabase.co",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY": "sb_p[REDACTED]",
    "MEDVEDA_PAYMENT_PROVIDER": "disabled"
  },
  "channel": "production",
  "buildArtifactPaths": [
    "android/app/build/outputs/mapping/release/**/*",
    "android/app/build/outputs/logs/manifest-merger-release-report.txt"
  ],
  "buildType": "app-bundle"
}

EXIT_CODE=0
DURATION_SECONDS=31.33

````

## eslint.log

````text
$ npm run lint --prefix tooling
CWD: .

> lint
> cd .. && tooling/node_modules/.bin/eslint mobile-app/App.tsx mobile-app/src admin-panel/src


EXIT_CODE=0
DURATION_SECONDS=49.69

````

## expo-dependencies.log

````text
$ npx --no-install expo install --check
CWD: mobile-app
The following packages should be updated for best compatibility with the installed expo version:
  expo@57.0.32 - expected version: ~57.0.33
  expo-constants@57.0.23 - expected version: ~57.0.24
  expo-sqlite@57.0.4 - expected version: ~57.0.5
  expo-updates@57.0.27 - expected version: ~57.0.28
Your project may not work correctly until you install the expected versions of the packages.
Found outdated dependencies

EXIT_CODE=1
DURATION_SECONDS=7.01

````

## expo-doctor.log

````text
$ npx --yes expo-doctor
CWD: mobile-app
Running 21 checks on your project...
20/21 checks passed. 1 checks failed. Possible issues detected:
Use the --verbose flag to see more details about passed checks.

✖ Check that packages match versions required by installed Expo SDK

🔧 Patch version mismatches
package         expected  found    
expo            ~57.0.33  57.0.32  
expo-constants  ~57.0.24  57.0.23  
expo-sqlite     ~57.0.5   57.0.4   
expo-updates    ~57.0.28  57.0.27  

Changelogs:
- expo-constants → https://github.com/expo/expo/blob/sdk-57/packages/expo-constants/CHANGELOG.md
- expo-sqlite → https://github.com/expo/expo/blob/sdk-57/packages/expo-sqlite/CHANGELOG.md
- expo-updates → https://github.com/expo/expo/blob/sdk-57/packages/expo-updates/CHANGELOG.md

4 packages out of date.
Advice:
Use 'npx expo install --check' to review and upgrade your dependencies.
To ignore specific packages, add them to "expo.install.exclude" in package.json. Learn more: https://expo.fyi/dependency-validation

1 check failed, indicating possible issues with the project.

EXIT_CODE=1
DURATION_SECONDS=52.96

````

## expo-prebuild-config.log

````text
$ npx --no-install expo config --type prebuild --json
CWD: mobile-app
{"name":"MedVeda","slug":"ayurpulse","version":"1.2.2","orientation":"default","icon":"./assets/icon.png","userInterfaceStyle":"dark","scheme":"medveda","assetBundlePatterns":["**/*"],"android":{"package":"in.medveda.app","adaptiveIcon":{"foregroundImage":"./assets/adaptive-icon.png","backgroundColor":"#2E7D32"},"permissions":["android.permission.INTERNET","android.permission.POST_NOTIFICATIONS","android.permission.INTERNET"],"allowBackup":false,"blockedPermissions":["android.permission.SYSTEM_ALERT_WINDOW","android.permission.READ_EXTERNAL_STORAGE","android.permission.WRITE_EXTERNAL_STORAGE","android.permission.READ_MEDIA_IMAGES","android.permission.DOWNLOAD_WITHOUT_NOTIFICATION"],"softwareKeyboardLayoutMode":"resize","runtimeVersion":"1.2.2-disabled-notes-choice-v1","googleServicesFile":"./google-services.json"},"plugins":["@react-native-community/datetimepicker","expo-notifications","expo-secure-store",["expo-splash-screen",{"image":"./assets/icon.png","imageWidth":200,"resizeMode":"contain","backgroundColor":"#100C0A"}],"expo-status-bar","expo-web-browser","expo-sqlite","./plugins/withAndroidQueries.js","expo-font",["expo-build-properties",{"android":{"usesCleartextTraffic":false,"enableMinifyInReleaseBuilds":true,"enableShrinkResourcesInReleaseBuilds":true,"extraProguardRules":"# React Native and dependencies supply consumer rules for bridge/reflection/JNI.\n# PdfiumAndroidKt loads this class and its native entry points by name. Keep\n# only that JNI surface, rather than all PDF viewer, BlobUtil and Sentry code.\n-keep,includedescriptorclasses class io.legere.pdfiumandroid.PdfiumCore {\n    native <methods>;\n}\n-keepclasseswithmembernames,includedescriptorclasses class io.legere.pdfiumandroid.** {\n    native <methods>;\n}\n"}}],"./plugins/withAndroidRelease.js","./plugins/withOptionalSentry.cjs"],"extra":{"eas":{"projectId":"2d642c70-8ec1-4d7b-a388-2f2f99e8a8df"},"medvedaPaymentProvider":"disabled","medvedaIndiaUcbEnrolled":false,"medvedaUcbTestAccepted":false,"medvedaDistribution":"standard","medvedaBuildTarget":"production"},"runtimeVersion":{"policy":"appVersion"},"updates":{"url":"https://u.expo.dev/2d642c70-8ec1-4d7b-a388-2f2f99e8a8df"},"owner":"ganeshp0305","ios":{"bundleIdentifier":"com.medveda.app"},"_internal":{"isDebug":false,"projectRoot":"/home/ganeshp8545/AyurPulse/mobile-app","dynamicConfigPath":"/home/ganeshp8545/AyurPulse/mobile-app/app.config.js","staticConfigPath":"/home/ganeshp8545/AyurPulse/mobile-app/app.json","packageJsonPath":"/home/ganeshp8545/AyurPulse/mobile-app/package.json","pluginHistory":{"expo-notifications":{"name":"expo-notifications","version":"57.0.25"},"expo-secure-store":{"name":"expo-secure-store","version":"57.0.4"},"expo-splash-screen":{"name":"expo-splash-screen","version":"57.0.11"},"expo-status-bar":{"name":"expo-status-bar","version":"57.0.1"},"expo-web-browser":{"name":"expo-web-browser","version":"57.0.3"},"expo-sqlite":{"name":"expo-sqlite","version":"57.0.4"},"expo-font":{"name":"expo-font","version":"57.0.4"},"react-native-maps":{"name":"react-native-maps","version":"UNVERSIONED"},"expo-apple-authentication":{"name":"expo-apple-authentication","version":"UNVERSIONED"},"expo-contacts":{"name":"expo-contacts","version":"UNVERSIONED"},"expo-updates":{"name":"expo-updates","version":"57.0.27"},"expo-document-picker":{"name":"expo-document-picker","version":"UNVERSIONED"},"expo-system-ui":{"name":"expo-system-ui","version":"57.0.4"},"expo-file-system":{"name":"expo-file-system","version":"57.0.7"}},"autolinkedModules":["@expo/dom-webview","@expo/log-box","expo","expo-application","expo-asset","expo-clipboard","expo-constants","expo-eas-client","expo-file-system","expo-font","expo-iap","expo-json-utils","expo-keep-awake","expo-manifests","expo-modules-core","expo-modules-jsi","expo-notifications","expo-screen-capture","expo-secure-store","expo-splash-screen","expo-sqlite","expo-status-bar","expo-structured-headers","expo-system-ui","expo-updates","expo-updates-interface","expo-web-browser","medveda-offline-vault"]},"sdkVersion":"57.0.0","platforms":["ios","android","web"],"mods":{"android":{},"ios":{}}}
EXIT_CODE=0
DURATION_SECONDS=4.05

````

## expo-public-config.log

````text
$ npx --no-install expo config --type public --json
CWD: mobile-app
{"name":"MedVeda","slug":"ayurpulse","version":"1.2.2","orientation":"default","icon":"./assets/icon.png","userInterfaceStyle":"dark","scheme":"medveda","assetBundlePatterns":["**/*"],"android":{"package":"in.medveda.app","adaptiveIcon":{"foregroundImage":"./assets/adaptive-icon.png","backgroundColor":"#2E7D32"},"permissions":["INTERNET","POST_NOTIFICATIONS"],"allowBackup":false,"blockedPermissions":["android.permission.SYSTEM_ALERT_WINDOW","android.permission.READ_EXTERNAL_STORAGE","android.permission.WRITE_EXTERNAL_STORAGE","android.permission.READ_MEDIA_IMAGES","android.permission.DOWNLOAD_WITHOUT_NOTIFICATION"],"softwareKeyboardLayoutMode":"resize","runtimeVersion":"1.2.2-disabled-notes-choice-v1","googleServicesFile":"./google-services.json"},"plugins":["@react-native-community/datetimepicker","expo-notifications","expo-secure-store",["expo-splash-screen",{"image":"./assets/icon.png","imageWidth":200,"resizeMode":"contain","backgroundColor":"#100C0A"}],"expo-status-bar","expo-web-browser","expo-sqlite","./plugins/withAndroidQueries.js","expo-font",["expo-build-properties",{"android":{"usesCleartextTraffic":false,"enableMinifyInReleaseBuilds":true,"enableShrinkResourcesInReleaseBuilds":true,"extraProguardRules":"# React Native and dependencies supply consumer rules for bridge/reflection/JNI.\n# PdfiumAndroidKt loads this class and its native entry points by name. Keep\n# only that JNI surface, rather than all PDF viewer, BlobUtil and Sentry code.\n-keep,includedescriptorclasses class io.legere.pdfiumandroid.PdfiumCore {\n    native <methods>;\n}\n-keepclasseswithmembernames,includedescriptorclasses class io.legere.pdfiumandroid.** {\n    native <methods>;\n}\n"}}],"./plugins/withAndroidRelease.js","./plugins/withOptionalSentry.cjs"],"extra":{"eas":{"projectId":"2d642c70-8ec1-4d7b-a388-2f2f99e8a8df"},"medvedaPaymentProvider":"disabled","medvedaIndiaUcbEnrolled":false,"medvedaUcbTestAccepted":false,"medvedaDistribution":"standard","medvedaBuildTarget":"production"},"runtimeVersion":{"policy":"appVersion"},"updates":{"url":"https://u.expo.dev/2d642c70-8ec1-4d7b-a388-2f2f99e8a8df"},"owner":"ganeshp0305","ios":{"bundleIdentifier":"com.medveda.app"},"sdkVersion":"57.0.0","platforms":["ios","android","web"]}
EXIT_CODE=0
DURATION_SECONDS=7.22

````

## mobile-npm-audit.log

````text
$ npm audit --json
CWD: mobile-app
{
  "auditReportVersion": 2,
  "vulnerabilities": {
    "@expo/fingerprint": {
      "name": "@expo/fingerprint",
      "severity": "moderate",
      "isDirect": false,
      "via": [
        "glob",
        "minimatch"
      ],
      "effects": [],
      "range": ">=0.11.12-canary-20250303-4dba60e",
      "nodes": [
        "node_modules/@expo/fingerprint"
      ],
      "fixAvailable": true
    },
    "glob": {
      "name": "glob",
      "severity": "moderate",
      "isDirect": false,
      "via": [
        {
          "source": 1244013,
          "name": "glob",
          "dependency": "glob",
          "title": "Glob: AbortSignal cancellation bypass allows post-timeout filesystem traversal",
          "url": "https://github.com/advisories/GHSA-3g3m-2fjr-6pw4",
          "severity": "moderate",
          "cwe": [
            "CWE-400"
          ],
          "cvss": {
            "score": 0,
            "vectorString": null
          },
          "range": ">=9.0.0 <=14.0.1"
        },
        "minimatch"
      ],
      "effects": [
        "@expo/fingerprint",
        "react-native-blob-util"
      ],
      "range": "9.0.0 - 14.0.1",
      "nodes": [
        "node_modules/glob"
      ],
      "fixAvailable": true
    },
    "minimatch": {
      "name": "minimatch",
      "severity": "moderate",
      "isDirect": false,
      "via": [
        {
          "source": 1244623,
          "name": "minimatch",
          "dependency": "minimatch",
          "title": "minimatch has potential denial of service via globparts amplification",
          "url": "https://github.com/advisories/GHSA-g3hv-75wg-m249",
          "severity": "moderate",
          "cwe": [
            "CWE-405"
          ],
          "cvss": {
            "score": 0,
            "vectorString": null
          },
          "range": ">=7.0.0 <11.0.1"
        }
      ],
      "effects": [
        "@expo/fingerprint",
        "glob"
      ],
      "range": "7.0.0 - 11.0.0",
      "nodes": [
        "node_modules/minimatch"
      ],
      "fixAvailable": true
    },
    "react-native-blob-util": {
      "name": "react-native-blob-util",
      "severity": "moderate",
      "isDirect": true,
      "via": [
        "glob"
      ],
      "effects": [],
      "range": "0.19.5 - 0.24.10",
      "nodes": [
        "node_modules/react-native-blob-util"
      ],
      "fixAvailable": true
    }
  },
  "metadata": {
    "vulnerabilities": {
      "info": 0,
      "low": 0,
      "moderate": 4,
      "high": 0,
      "critical": 0,
      "total": 4
    },
    "dependencies": {
      "prod": 642,
      "dev": 1,
      "optional": 19,
      "peer": 9,
      "peerOptional": 0,
      "total": 670
    }
  }
}

EXIT_CODE=1
DURATION_SECONDS=5.6

````

## mobile-tsc.log

````text
$ ./node_modules/.bin/tsc --noEmit
CWD: mobile-app

EXIT_CODE=0
DURATION_SECONDS=59.88

````

## password-tests.log

````text
$ npm run test:password-recovery
CWD: mobile-app

> ayurpulse-mobile@1.2.2 test:password-recovery
> node scripts/password-recovery.test.cjs && node --experimental-strip-types scripts/password-policy-selftest.mjs

TAP version 13
# Subtest: non-MFA recovery imports session, rechecks assurance, updates and signs out
ok 1 - non-MFA recovery imports session, rechecks assurance, updates and signs out
  ---
  duration_ms: 9.174561
  type: 'test'
  ...
# Subtest: MFA recovery requires existing verified TOTP and uses one client/session
ok 2 - MFA recovery requires existing verified TOTP and uses one client/session
  ---
  duration_ms: 3.492238
  type: 'test'
  ...
# Subtest: incorrect and malformed OTPs are sanitized and can be retried
ok 3 - incorrect and malformed OTPs are sanitized and can be retried
  ---
  duration_ms: 1.28753
  type: 'test'
  ...
# Subtest: successful verification response without actual AAL2 cannot unlock update
ok 4 - successful verification response without actual AAL2 cannot unlock update
  ---
  duration_ms: 1.051552
  type: 'test'
  ...
# Subtest: missing or unsupported factors block recovery with safe help
ok 5 - missing or unsupported factors block recovery with safe help
  ---
  duration_ms: 1.479745
  type: 'test'
  ...
# Subtest: expired import and expired verification session block password changes
ok 6 - expired import and expired verification session block password changes
  ---
  duration_ms: 2.272676
  type: 'test'
  ...
# Subtest: missing session, invalid JWT and revoked refresh token fail closed
ok 7 - missing session, invalid JWT and revoked refresh token fail closed
  ---
  duration_ms: 4.908463
  type: 'test'
  ...
# Subtest: insufficient_aal enters MFA and only retries update after verification
ok 8 - insufficient_aal enters MFA and only retries update after verification
  ---
  duration_ms: 1.008405
  type: 'test'
  ...
# Subtest: insufficient_aal with stale AAL2 still requires a fresh challenge, including network retry
ok 9 - insufficient_aal with stale AAL2 still requires a fresh challenge, including network retry
  ---
  duration_ms: 1.624001
  type: 'test'
  ...
# Subtest: network and rate-limit failures allow safe retry without reimporting recovery tokens
ok 10 - network and rate-limit failures allow safe retry without reimporting recovery tokens
  ---
  duration_ms: 4.190257
  type: 'test'
  ...
# Subtest: duplicate import, verification and password update are rejected while in flight
ok 11 - duplicate import, verification and password update are rejected while in flight
  ---
  duration_ms: 43.32704
  type: 'test'
  ...
# Subtest: sign-out failure cannot repeat password mutation; cleanup is retried separately
ok 12 - sign-out failure cannot repeat password mutation; cleanup is retried separately
  ---
  duration_ms: 3.329629
  type: 'test'
  ...
# Subtest: AAL downgrade before submit returns to MFA without updating password
ok 13 - AAL downgrade before submit returns to MFA without updating password
  ---
  duration_ms: 0.431212
  type: 'test'
  ...
# Subtest: password policy errors are classified by code and raw server messages are hidden
ok 14 - password policy errors are classified by code and raw server messages are hidden
  ---
  duration_ms: 0.727429
  type: 'test'
  ...
# Subtest: website actual script: TOTP form, wrong code, retry, duplicate verify and update, success cleanup
ok 15 - website actual script: TOTP form, wrong code, retry, duplicate verify and update, success cleanup
  ---
  duration_ms: 34.633882
  type: 'test'
  ...
# Subtest: website actual script: non-MFA policy and success
ok 16 - website actual script: non-MFA policy and success
  ---
  duration_ms: 16.971633
  type: 'test'
  ...
# Subtest: website actual script: expired link/import, unavailable factor and network initialization retry
ok 17 - website actual script: expired link/import, unavailable factor and network initialization retry
  ---
  duration_ms: 20.877125
  type: 'test'
  ...
# Subtest: website actual script: insufficient_aal requires MFA, cleanup failure has distinct retry
ok 18 - website actual script: insufficient_aal requires MFA, cleanup failure has distinct retry
  ---
  duration_ms: 3.826376
  type: 'test'
  ...
# Subtest: website recovery controller is an exact generated copy of mobile controller
ok 19 - website recovery controller is an exact generated copy of mobile controller
  ---
  duration_ms: 0.551836
  type: 'test'
  ...
# Subtest: mobile actual screen: MFA blocks password form, invalid code retry, duplicate taps, successful cleanup
ok 20 - mobile actual screen: MFA blocks password form, invalid code retry, duplicate taps, successful cleanup
  ---
  duration_ms: 1469.329061
  type: 'test'
  ...
# Subtest: mobile actual screen: non-MFA update and insufficient_aal transition
ok 21 - mobile actual screen: non-MFA update and insufficient_aal transition
  ---
  duration_ms: 432.288236
  type: 'test'
  ...
# Subtest: mobile actual screen: expired session and expired email fragment never expose password form
ok 22 - mobile actual screen: expired session and expired email fragment never expose password form
  ---
  duration_ms: 452.555033
  type: 'test'
  ...
# Subtest: real installed Supabase SDK: verify stores upgraded JWT, update uses that JWT, expiry refresh works
ok 23 - real installed Supabase SDK: verify stores upgraded JWT, update uses that JWT, expiry refresh works
  ---
  duration_ms: 381.901702
  type: 'test'
  ...
# Subtest: insufficient_aal remains mandatory when the first assurance request fails
ok 24 - insufficient_aal remains mandatory when the first assurance request fails
  ---
  duration_ms: 1.370968
  type: 'test'
  ...
# Subtest: website actual script: expiry during submission blocks retrying the password update
ok 25 - website actual script: expiry during submission blocks retrying the password update
  ---
  duration_ms: 11.474555
  type: 'test'
  ...
# Subtest: mobile actual screen: network verification retry and sign-out retry do not repeat password mutation
ok 26 - mobile actual screen: network verification retry and sign-out retry do not repeat password mutation
  ---
  duration_ms: 232.6177
  type: 'test'
  ...
1..26
# tests 26
# suites 0
# pass 26
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 3199.46201
PASS server min length 8
PASS server requires lower+upper+digit+symbol
PASS mobile and website patterns identical
24 pattern checks, 0 FAIL

EXIT_CODE=0
DURATION_SECONDS=4.45

````

## secret-scan.log

````text
$ node scripts/scan-secrets.mjs
CWD: .
PASS: tracked-file secret scan

EXIT_CODE=0
DURATION_SECONDS=1.71

````

## secret-selftest.log

````text
$ node scripts/secret-scan-selftest.mjs
CWD: .
PASS: secret scanner marker, generated fixture, PEM, escaped PEM, live keys, service-role and anon JWT cases

EXIT_CODE=0
DURATION_SECONDS=0.24

````

## test-admin-panel_scripts_audit-settings-selftest.cjs.log

````text
$ node --experimental-strip-types admin-panel/scripts/audit-settings-selftest.cjs
CWD: .
Error: synthetic initial read failure
    at getSettings (/home/ganeshp8545/AyurPulse/admin-panel/scripts/audit-settings-selftest.cjs:4:171)
    at load (evalmachine.<anonymous>:28:66)
    at evalmachine.<anonymous>:23:9
    at /home/ganeshp8545/AyurPulse/mobile-app/scripts/ui-harness.cjs:19:222
    at /home/ganeshp8545/AyurPulse/mobile-app/scripts/ui-harness.cjs:21:96
    at Array.forEach (<anonymous>)
    at Object.render (/home/ganeshp8545/AyurPulse/mobile-app/scripts/ui-harness.cjs:21:82)
    at /home/ganeshp8545/AyurPulse/admin-panel/scripts/audit-settings-selftest.cjs:5:13
    at Object.<anonymous> (/home/ganeshp8545/AyurPulse/admin-panel/scripts/audit-settings-selftest.cjs:9:121)
    at Module._compile (node:internal/modules/cjs/loader:1781:14)
Error: synthetic initial read failure
    at getSettings (/home/ganeshp8545/AyurPulse/admin-panel/scripts/audit-settings-selftest.cjs:4:171)
    at Object.load [as reload] (evalmachine.<anonymous>:28:66)
    at /home/ganeshp8545/AyurPulse/admin-panel/scripts/audit-settings-selftest.cjs:8:23
PASS AUD-017 failed initial baseline cannot save, retry loads, failed refresh preserves known baseline

EXIT_CODE=0
DURATION_SECONDS=1.78

````

## test-admin-panel_scripts_auth-race-selftest.cjs.log

````text
$ node --experimental-strip-types admin-panel/scripts/auth-race-selftest.cjs
CWD: .
PASS stale admin auth responses cannot restore access after logout/account change or unmount

EXIT_CODE=0
DURATION_SECONDS=1.42

````

## test-admin-panel_scripts_batch2-selftest.cjs.log

````text
$ node --experimental-strip-types admin-panel/scripts/batch2-selftest.cjs
CWD: .
PASS Notes: first/empty load, same-scope refresh, scope error/retry and unmount
PASS Videos: first/empty load, same-scope refresh, scope error/retry and unmount
PASS Quiz: first/empty load, same-scope refresh, scope error/retry and unmount
PASS Products: first/empty load, same-scope refresh, scope error/retry and unmount
PASS Orders: first/empty load, same-scope refresh, scope error/retry and unmount
PASS Users: first/empty load, same-scope refresh, scope error/retry and unmount
PASS Courses: create/edit/delete refresh failures and read-only Retry
PASS Years: create/edit/delete refresh failures and read-only Retry
PASS Subjects: create/edit/delete refresh failures and read-only Retry
PASS Chapters: create/edit/delete refresh failures and read-only Retry
PASS Products: create/edit/delete refresh failures and read-only Retry
PASS Courses: overlapping reads, stale error/loading and unmount
PASS Analytics: overlapping reads, stale error/loading and unmount
PASS Referrals: overlapping reads, stale error/loading and unmount
PASS ReviewFlags: scope race, stale error and unmount
PASS Products billing: overlapping polls, stale error and unmount
PASS lookup status: visible loading/error and read Retry
PASS Years: loading/failed lookups never report missing prerequisites
PASS Subjects: loading/failed lookups never report missing prerequisites
PASS Chapters: loading/failed lookups never report missing prerequisites
PASS Notes: loading/failed lookups never report missing prerequisites
PASS Videos: loading/failed lookups never report missing prerequisites
PASS Quiz: loading/failed lookups never report missing prerequisites
PASS Products: loading/failed lookups never report missing prerequisites
PASS SubjectPicker: late parent synchronization and intentional reset
PASS ChapterPicker: late parent synchronization and intentional reset

EXIT_CODE=0
DURATION_SECONDS=4.87

````

## test-admin-panel_scripts_list-retry-selftest.cjs.log

````text
$ node --experimental-strip-types admin-panel/scripts/list-retry-selftest.cjs
CWD: .
PASS eight admin error states expose Retry that calls the existing reload path

EXIT_CODE=0
DURATION_SECONDS=1.33

````

## test-admin-panel_scripts_mutation-selftest.cjs.log

````text
$ node --experimental-strip-types admin-panel/scripts/mutation-selftest.cjs
CWD: .
PASS updateCourse: zero-row rejection / one-row success
PASS setCourseActive: zero-row rejection / one-row success
PASS deleteCourse: zero-row rejection / one-row success
PASS updateYear: zero-row rejection / one-row success
PASS deleteYear: zero-row rejection / one-row success
PASS updateSubject: zero-row rejection / one-row success
PASS deleteSubject: zero-row rejection / one-row success
PASS updateChapter: zero-row rejection / one-row success
PASS deleteChapter: zero-row rejection / one-row success
PASS updateProduct: zero-row rejection / one-row success
PASS deleteProduct: zero-row rejection / one-row success
PASS setUserBlocked: zero-row rejection / one-row success

EXIT_CODE=0
DURATION_SECONDS=2.26

````

## test-admin-panel_scripts_p1-financial-ui-selftest.cjs.log

````text
$ node --experimental-strip-types admin-panel/scripts/p1-financial-ui-selftest.cjs
CWD: .
PASS admin >1000 orders, exact revenue, course filter, page failures, stable pagination; provider states read-only and unpaid fail/cancel only

EXIT_CODE=0
DURATION_SECONDS=1.36

````

## test-admin-panel_scripts_pagination-selftest.cjs.log

````text
$ node --experimental-strip-types admin-panel/scripts/pagination-selftest.cjs
CWD: .
PASS admin pagination: 1001 rows and later-page errors

EXIT_CODE=0
DURATION_SECONDS=2.13

````

## test-admin-panel_scripts_pdf-validation-selftest.mjs.log

````text
$ node --experimental-strip-types admin-panel/scripts/pdf-validation-selftest.mjs
CWD: .
PDF validation checks passed.
Video URL validation checks passed.
Quiz option validation checks passed.

EXIT_CODE=0
DURATION_SECONDS=0.25

````

## test-admin-panel_scripts_play-pricing-diagnostic-selftest.cjs.log

````text
$ node --experimental-strip-types admin-panel/scripts/play-pricing-diagnostic-selftest.cjs
CWD: .
PASS admin pricing diagnostic (28 cases; synthetic only)

EXIT_CODE=0
DURATION_SECONDS=3.41

````

## test-admin-panel_scripts_play-service-account-diagnostic-selftest.cjs.log

````text
$ node --experimental-strip-types admin-panel/scripts/play-service-account-diagnostic-selftest.cjs
CWD: .
PASS admin service-account diagnostic (50 cases; admin/AAL2, concurrency, safe output, visibility)

EXIT_CODE=0
DURATION_SECONDS=5.19

````

## test-admin-panel_scripts_request-race-selftest.cjs.log

````text
$ node --experimental-strip-types admin-panel/scripts/request-race-selftest.cjs
CWD: .
PASS nine admin list hooks ignore stale scope, overlapping and unmounted responses

EXIT_CODE=0
DURATION_SECONDS=2.88

````

## test-admin-panel_scripts_settings-save-selftest.cjs.log

````text
$ node --experimental-strip-types admin-panel/scripts/settings-save-selftest.cjs
CWD: .
PASS ADM-01 full success, pre-write validation, config failure, partial save, zero-row update, disconnect and displayed partial result

EXIT_CODE=0
DURATION_SECONDS=2.13

````

## test-admin-panel_scripts_upload-error-selftest.mjs.log

````text
$ node --experimental-strip-types admin-panel/scripts/upload-error-selftest.mjs
CWD: .
Upload error message checks passed.

EXIT_CODE=0
DURATION_SECONDS=1.1

````

## test-mobile-app_scripts_accessibility-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/accessibility-selftest.cjs
CWD: .
PASS primary button/input names, disabled semantics and separately focusable note open/download actions

EXIT_CODE=0
DURATION_SECONDS=2.47

````

## test-mobile-app_scripts_android-release-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/android-release-selftest.cjs
CWD: .
PASS release profiles enable R8 + resource shrinking, narrow JNI rules, retained mapping, unchanged payments/package, adaptive orientation and generated release config

EXIT_CODE=0
DURATION_SECONDS=0.27

````

## test-mobile-app_scripts_android-vault-preflight-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/android-vault-preflight-selftest.cjs
CWD: .
PASS preflight separates SDK file presence, native compilation, signing and device acceptance; malformed inputs reject; content and Play guards stay closed

EXIT_CODE=0
DURATION_SECONDS=0.43

````

## test-mobile-app_scripts_audit-firebase-profile-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/audit-firebase-profile-selftest.cjs
CWD: .
PASS AUD-018 isolated profile selects genuine matching test Firebase input; bad explicit input rejects

EXIT_CODE=0
DURATION_SECONDS=0.47

````

## test-mobile-app_scripts_audit-icon-controls-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/audit-icon-controls-selftest.cjs
CWD: .
PASS AUD-006 download and social actions expose names, roles and working handlers
PASS AUD-006 search Back and filter name, role, activation and expanded state

EXIT_CODE=0
DURATION_SECONDS=4.38

````

## test-mobile-app_scripts_audit-navigation-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/audit-navigation-selftest.cjs
CWD: .
PASS AUD-003 auth route removal, account remount, recovery route retained
PASS AUD-003 installed StackRouter discards previous private history and Back cannot recover it

EXIT_CODE=0
DURATION_SECONDS=8.23

````

## test-mobile-app_scripts_audit-reminder-service-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/audit-reminder-service-selftest.cjs
CWD: .
PASS AUD-001/002 reminder storage/schedule/cancel failure rollback and launch/disable serialization

EXIT_CODE=0
DURATION_SECONDS=1.79

````

## test-mobile-app_scripts_auth-recovery-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/auth-recovery-selftest.cjs
CWD: .
PASS startup rejection/error → visible retry → onboarding; auth transport timeout/caller cancellation; content transport unchanged

EXIT_CODE=0
DURATION_SECONDS=3.89

````

## test-mobile-app_scripts_auth-state-race-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/auth-state-race-selftest.cjs
CWD: .
PASS late initial session and blocked-account response cannot replace/sign out a newer account

EXIT_CODE=0
DURATION_SECONDS=1.3

````

## test-mobile-app_scripts_checkout-html-selftest.mjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/checkout-html-selftest.mjs
CWD: .
PASS h1 has no raw tag
PASS exactly 2 script blocks (checkout.js + inline)
PASS no injected <img> anywhere
PASS no '<!--' in inline script
PASS no U+2028 inside any <script>
PASS options JSON parses
PASS description round-trips exactly
PASS prefill name round-trips exactly
PASS amount unchanged
PASS Razorpay HTTPS allowed
PASS bank HTTPS allowed
PASS HTTP denied
PASS arbitrary HTTPS denied
PASS Razorpay lookalike denied
(node:8057) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///home/ganeshp8545/AyurPulse/mobile-app/src/screens/payment/checkoutHtmlTemplate.ts is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to /home/ganeshp8545/AyurPulse/mobile-app/package.json.
(Use `node --trace-warnings ...` to show where the warning was created)

EXIT_CODE=0
DURATION_SECONDS=0.44

````

## test-mobile-app_scripts_checkout-security-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/checkout-security-selftest.cjs
CWD: .
PASS checkout initializes with valid server order; stable HTML; rejects wrong origin/nonce/order/signature and duplicate callbacks
PASS late verification cannot navigate after checkout unmounts
PASS renderer failure moves an unconfirmed charge to existing pending recovery
PASS invalid route orders cannot open checkout; unsafe redirects are blocked
PASS cancelled and failed checkout callbacks grant no access

EXIT_CODE=0
DURATION_SECONDS=4.11

````

## test-mobile-app_scripts_closed-testing-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/closed-testing-selftest.cjs
CWD: .

android-release: PASS
PASS release profiles enable R8 + resource shrinking, narrow JNI rules, retained mapping, unchanged payments/package, adaptive orientation and generated release config

auth-recovery: PASS
PASS startup rejection/error → visible retry → onboarding; auth transport timeout/caller cancellation; content transport unchanged

login-network: PASS
PASS slow login single flight, network/503/429 do not count as bad passwords, wrong credentials count, retry succeeds, late unmounted login cannot redirect

login-submit: PASS
PASS secure lockout read failure handled; retry works; login double taps coalesced

auth-state-race: PASS
PASS late initial session and blocked-account response cannot replace/sign out a newer account

deep-link: PASS
Cold/warm link ordering, delayed initial read, cleanup and rejection passed

course-state-race: PASS
TAP version 13
# Subtest: save fetches a new profile and ignores a pre-save response arriving after it
ok 1 - save fetches a new profile and ignores a pre-save response arriving after it
  ---
  duration_ms: 700.432922
  type: 'test'
  ...
# Subtest: pre-save success cannot publish state or clear the pending post-save read
ok 2 - pre-save success cannot publish state or clear the pending post-save read
  ---
  duration_ms: 113.087683
  type: 'test'
  ...
# Subtest: pre-save error cannot publish state or clear the pending post-save read
ok 3 - pre-save error cannot publish state or clear the pending post-save read
  ---
  duration_ms: 138.683205
  type: 'test'
  ...
1..3
# tests 3
# suites 0
# pass 3
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 974.707536

course-year-selection: PASS
TAP version 13
# Subtest: course/year visibly select, save accepts 204, and state survives reload
ok 1 - course/year visibly select, save accepts 204, and state survives reload
  ---
  duration_ms: 1435.239874
  type: 'test'
  ...
# Subtest: 204 with zero profile rows stays on the picker and can retry after server repair
ok 2 - 204 with zero profile rows stays on the picker and can retry after server repair
  ---
  duration_ms: 591.728356
  type: 'test'
  ...
# Subtest: 204 with unchanged year stays on the picker and retry navigates only after confirmation
ok 3 - 204 with unchanged year stays on the picker and retry navigates only after confirmation
  ---
  duration_ms: 620.163159
  type: 'test'
  ...
1..3
# tests 3
# suites 0
# pass 3
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2685.794571

course-year-confirmation: PASS
TAP version 13
# Subtest: save rejects 204 followed by missing profile, even with matching cached state
ok 1 - save rejects 204 followed by missing profile, even with matching cached state
  ---
  duration_ms: 680.714335
  type: 'test'
  ...
# Subtest: save rejects 204 followed by missing year, even with matching cached state
ok 2 - save rejects 204 followed by missing year, even with matching cached state
  ---
  duration_ms: 234.929855
  type: 'test'
  ...
# Subtest: save rejects 204 followed by wrong year, even with matching cached state
ok 3 - save rejects 204 followed by wrong year, even with matching cached state
  ---
  duration_ms: 277.635003
  type: 'test'
  ...
# Subtest: save rejects 204 followed by wrong course, even with matching cached state
ok 4 - save rejects 204 followed by wrong course, even with matching cached state
  ---
  duration_ms: 107.886991
  type: 'test'
  ...
# Subtest: verification read failure cannot use a matching cached choice as proof of save
ok 5 - verification read failure cannot use a matching cached choice as proof of save
  ---
  duration_ms: 7157.105185
  type: 'test'
  ...
1..5
# tests 5
# suites 0
# pass 5
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 8479.461721

course-year-picker-race: PASS
TAP version 13
# Subtest: course picker ignores success from the previously selected course
ok 1 - course picker ignores success from the previously selected course
  ---
  duration_ms: 730.625257
  type: 'test'
  ...
# Subtest: course picker ignores error from the previously selected course
ok 2 - course picker ignores error from the previously selected course
  ---
  duration_ms: 389.291818
  type: 'test'
  ...
1..2
# tests 2
# suites 0
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1172.013903

notes-open: PASS
PASS note double tap, blur/refocus and account switch cannot launch stale signed PDF

notes-entitlement: PASS
PASS paid note local restriction, authorized opening/reopening with fresh links, and authoritative server denial despite a stale unlocked route

pdf-lifecycle: PASS
PASS PDF background/auth races, expiry/revocation, deleted/corrupt file messages and listener cleanup

pdf-remote-retry: PASS
PASS expired link → fresh authorized URL, retry single flight, stale render callbacks, render timeout, denial, background/resume and account switch; no signed URL logs

offline-owner: PASS
PASS verification remains owner-bound; account change during check cannot record access
PASS failed cleanup retains original owner through account switch/logout; successful cleanup allows new ownership

offline-download: PASS
PASS stale URL initial/retry/resume refresh, persisted source, revoked retry makes no download
PASS HTTP errors, partial bodies, size mismatch and non-PDF bodies never become completed downloads
PASS duplicate start coalesces; late completion after account switch cannot recreate content
PASS pause completion cannot overwrite paused state; resume obtains fresh authorization
PASS secure bulk cleanup failure/retry and legacy PDF preservation
PASS seven-day grace/network/5xx/429, day eight, 401/403 deletion, persistent rollback expiry, future/corrupt timestamps, legacy recovery, cleanup
PASS online denial persists offline, recovery clears denial, transient failure retains access, wrong user/sign-out denied
PASS upgrade cleanup removes quiz rows and orphan files, preserves paid notes, and is idempotent
(node:9001) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)

download-actions: PASS
PASS storage/native failures from all six download actions handled; successful retry refreshes

purchases: PASS
PASS repository filters success
PASS only successful scopes returned
PASS partial refund with successful purchase stays owned
PASS refunded scope denied by helpers
PASS chargeback scope denied by helpers
PASS partial_refund scope denied by helpers

purchases-unavailable-ui: PASS
PASS unavailable Buy/search UI, no checkout navigation, content browsing and owned state preserved

release-payments-disabled: PASS
PASS release Android actual provider config → navigation/service/checkout: no Razorpay order or checkout, including hostile Razorpay config

quiz-editing: PASS
PASS A → B → next → previous → submit saves B once; restart submits a new immutable attempt; existing timer advances

quiz-input: PASS
PASS malformed quiz questions/options show recovery; valid questions mount quiz

quiz-hooks: PASS
PASS offline quiz loading preserves Hook order and initializes every answer after content arrives

navigation-lazy: PASS
{"provider":"disabled","registeredRoutes":35,"eagerScreenModules":7,"lazyRoutes":28}
{"provider":"razorpay","registeredRoutes":37,"eagerScreenModules":7,"lazyRoutes":30}
{"provider":"play","registeredRoutes":37,"eagerScreenModules":7,"lazyRoutes":30}
PASS route registration, provider gates, eager Sentry and existing error/retry fallback contract

route-validation: PASS
PASS malformed routes rejected before screen effects; valid routes retain component; back/home recovery

load-resource: PASS
PASS load error/empty distinction, retry success, stale response cleanup, course readiness and offline UI

list-states: PASS
PASS all six list screens: loading, error and Retry, genuine empty, populated and pull-to-refresh

video-data: PASS
PASS: admin youtubeUrl → stored youtube_url → mobile youtubeUrl, exact value preserved, with row diagnostics (mock transport)

video-link: PASS
PASS: 25 URL forms, invalid/signed/playlist links, native → HTTPS → browser order, retry, copy/failure, iOS and diagnostics

video-tap: PASS
PASS: actual screen → card TouchableOpacity → onPress → opener; free card and keyboard tap forwarding (not a device gesture test)

30/30 closed-testing suites passed

EXIT_CODE=0
DURATION_SECONDS=87.28

````

## test-mobile-app_scripts_course-state-race-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/course-state-race-selftest.cjs
CWD: .
TAP version 13
# Subtest: save fetches a new profile and ignores a pre-save response arriving after it
ok 1 - save fetches a new profile and ignores a pre-save response arriving after it
  ---
  duration_ms: 589.241442
  type: 'test'
  ...
# Subtest: pre-save success cannot publish state or clear the pending post-save read
ok 2 - pre-save success cannot publish state or clear the pending post-save read
  ---
  duration_ms: 202.889044
  type: 'test'
  ...
# Subtest: pre-save error cannot publish state or clear the pending post-save read
ok 3 - pre-save error cannot publish state or clear the pending post-save read
  ---
  duration_ms: 166.628784
  type: 'test'
  ...
1..3
# tests 3
# suites 0
# pass 3
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1027.102174

EXIT_CODE=0
DURATION_SECONDS=2.04

````

## test-mobile-app_scripts_course-year-confirmation-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/course-year-confirmation-selftest.cjs
CWD: .
TAP version 13
# Subtest: save rejects 204 followed by missing profile, even with matching cached state
ok 1 - save rejects 204 followed by missing profile, even with matching cached state
  ---
  duration_ms: 655.409729
  type: 'test'
  ...
# Subtest: save rejects 204 followed by missing year, even with matching cached state
ok 2 - save rejects 204 followed by missing year, even with matching cached state
  ---
  duration_ms: 185.831162
  type: 'test'
  ...
# Subtest: save rejects 204 followed by wrong year, even with matching cached state
ok 3 - save rejects 204 followed by wrong year, even with matching cached state
  ---
  duration_ms: 164.170209
  type: 'test'
  ...
# Subtest: save rejects 204 followed by wrong course, even with matching cached state
ok 4 - save rejects 204 followed by wrong course, even with matching cached state
  ---
  duration_ms: 185.698096
  type: 'test'
  ...
# Subtest: verification read failure cannot use a matching cached choice as proof of save
ok 5 - verification read failure cannot use a matching cached choice as proof of save
  ---
  duration_ms: 7175.254032
  type: 'test'
  ...
1..5
# tests 5
# suites 0
# pass 5
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 8378.461638

EXIT_CODE=0
DURATION_SECONDS=9.46

````

## test-mobile-app_scripts_course-year-picker-race-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/course-year-picker-race-selftest.cjs
CWD: .
TAP version 13
# Subtest: course picker ignores success from the previously selected course
ok 1 - course picker ignores success from the previously selected course
  ---
  duration_ms: 361.194522
  type: 'test'
  ...
# Subtest: course picker ignores error from the previously selected course
ok 2 - course picker ignores error from the previously selected course
  ---
  duration_ms: 296.764962
  type: 'test'
  ...
1..2
# tests 2
# suites 0
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 676.085722

EXIT_CODE=0
DURATION_SECONDS=1.64

````

## test-mobile-app_scripts_course-year-selection-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/course-year-selection-selftest.cjs
CWD: .
TAP version 13
# Subtest: course/year visibly select, save accepts 204, and state survives reload
ok 1 - course/year visibly select, save accepts 204, and state survives reload
  ---
  duration_ms: 1392.244364
  type: 'test'
  ...
# Subtest: 204 with zero profile rows stays on the picker and can retry after server repair
ok 2 - 204 with zero profile rows stays on the picker and can retry after server repair
  ---
  duration_ms: 698.384785
  type: 'test'
  ...
# Subtest: 204 with unchanged year stays on the picker and retry navigates only after confirmation
ok 3 - 204 with unchanged year stays on the picker and retry navigates only after confirmation
  ---
  duration_ms: 600.126691
  type: 'test'
  ...
1..3
# tests 3
# suites 0
# pass 3
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2731.405322

EXIT_CODE=0
DURATION_SECONDS=3.49

````

## test-mobile-app_scripts_deep-link-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/deep-link-selftest.cjs
CWD: .
Cold/warm link ordering, delayed initial read, cleanup and rejection passed

EXIT_CODE=0
DURATION_SECONDS=1.36

````

## test-mobile-app_scripts_download-actions-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/download-actions-selftest.cjs
CWD: .
PASS storage/native failures from all six download actions handled; successful retry refreshes

EXIT_CODE=0
DURATION_SECONDS=1.11

````

## test-mobile-app_scripts_firebase-config-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/firebase-config-selftest.cjs
CWD: .
PASS production config with/without secret, EAS file path, unchanged release settings, and invalid Firebase input rejection

EXIT_CODE=0
DURATION_SECONDS=0.23

````

## test-mobile-app_scripts_list-states-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/list-states-selftest.cjs
CWD: .
PASS all six list screens: loading, error and Retry, genuine empty, populated and pull-to-refresh

EXIT_CODE=0
DURATION_SECONDS=2.11

````

## test-mobile-app_scripts_load-resource-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/load-resource-selftest.cjs
CWD: .
PASS load error/empty distinction, retry success, stale response cleanup, course readiness and offline UI

EXIT_CODE=0
DURATION_SECONDS=0.89

````

## test-mobile-app_scripts_login-network-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/login-network-selftest.cjs
CWD: .
PASS slow login single flight, network/503/429 do not count as bad passwords, wrong credentials count, retry succeeds, late unmounted login cannot redirect

EXIT_CODE=0
DURATION_SECONDS=1.97

````

## test-mobile-app_scripts_login-submit-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/login-submit-selftest.cjs
CWD: .
PASS secure lockout read failure handled; retry works; login double taps coalesced

EXIT_CODE=0
DURATION_SECONDS=1.77

````

## test-mobile-app_scripts_mv004-recovery-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/mv004-recovery-selftest.cjs
CWD: .
PASS same-account 401 refresh sends fresh Bearer once; same pending order and deadline preserved
PASS refresh failure/timeout/foreign session/repeated 401 stop all retries with sign-in guidance and uncertain payment
PASS signed out, switch during response/refresh and switch between retries cannot return success or send another request
PASS bounded pending retries preserve original identifier; successful historical recovery requires no new checkout
PASS screen coalesces duplicate recovery, ignores old-account success, stops auth polling, preserves pending order and offers My Purchases/support

EXIT_CODE=0
DURATION_SECONDS=4.03

````

## test-mobile-app_scripts_mv007-billing-boundary-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/mv007-billing-boundary-selftest.cjs
CWD: .
PASS unapproved standalone Play sales disabled; required UCB APIs and historical restoration remain separate
PASS historical Play restore refreshes disabled-sales history; account switch and unmount cannot refresh obsolete history

EXIT_CODE=0
DURATION_SECONDS=2.02

````

## test-mobile-app_scripts_mv008-ownership-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/mv008-ownership-selftest.cjs
CWD: .
PASS actual auth state notifies startup/login/logout/account switch; ignores late bootstrap session
PASS A slow / B fast: late A cannot erase newly confirmed purchase
PASS B slow / A fast: obsolete A cannot grant ownership or end B loading
PASS multiple concurrent refreshes: latest generation alone wins
PASS logout during load and login ownership initialization
PASS account switch invalidates pending and previously confirmed ownership
PASS same account logout/login cannot revive requests from previous session
PASS course/year switch clears old scopes and filters cross-course results
PASS timeout: retain same-context confirmed purchase, show error, recover
PASS API failure: retain same-context confirmed purchase, show error, recover
PASS initial failure is explicit and cannot fabricate ownership
PASS unmount ignores success/error/finally and clears listeners and timers
PASS payment confirmation, navigation focus refresh, resume, and revocation
PASS chapter purchase owns covered chapter/product only
PASS subject purchase owns covered chapter/product only
PASS year purchase owns covered chapter/product only
PASS bundle purchase owns covered chapter/product only
PASS purchase history shares ordering/account/unmount guards
PASS actual Notes screen refreshes ownership on focus; route cannot grant/deny paid access; signer still denies
PASS actual My Purchases recovery refresh wins over pre-confirmation history; old-account recovery ignored
MV008: 20 PASS, 0 FAIL

EXIT_CODE=0
DURATION_SECONDS=4.98

````

## test-mobile-app_scripts_mv009-store-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/mv009-store-selftest.cjs
CWD: .
PASS successful live snapshot sorts years/subjects, selects products, preserves testing prices
PASS successful empty years executes no child reads; repeated calls issue fresh repository reads
PASS empty subjects is successful, absent products remain null
PASS years rejection rejects entire snapshot, including partial data
PASS subjects rejection rejects entire snapshot, including partial data
PASS yearProduct rejection rejects entire snapshot, including partial data
PASS subjectProduct rejection rejects entire snapshot, including partial data
PASS hook success and successful empty replacement
PASS network is error, never empty; Retry issues fresh request and recovers
PASS unauthorized is error, never empty; Retry issues fresh request and recovers
PASS JWT expired is error, never empty; Retry issues fresh request and recovers
PASS forbidden is error, never empty; Retry issues fresh request and recovers
PASS server is error, never empty; Retry issues fresh request and recovers
PASS PostgREST unavailable is error, never empty; Retry issues fresh request and recovers
PASS Postgres server error is error, never empty; Retry issues fresh request and recovers
PASS API timeout is error, never empty; Retry issues fresh request and recovers
PASS deadline releases hung read; duplicate Retry/refresh taps cannot start concurrent requests; late timeout ignored
PASS A slow / B fast, rapid A-B-C-A switches reject obsolete success and failure
PASS A fast cannot finish B loading; course failures never retain previous-course snapshot
PASS same-course refresh retains complete snapshot while retrying and on failure, then replaces it
PASS account switch and same-ID logout/login clear snapshots and pending requests
PASS unmount ignores late success/rejection, cancels deadlines and subscriptions
PASS context load failure, context timeout, missing course and context recovery never spin forever or fetch unscoped years
PASS actual hook and Store screen: network failure -> visible Retry -> fresh request -> genuine empty
PASS late profile completion after deadline cannot start catalog reads; Retry starts a fresh context read
PASS actual Store UI distinguishes loading/empty/error/retrying/stale; Retry and pull refresh wired
PASS MV009 26 deterministic groups (local synthetic data only)

EXIT_CODE=0
DURATION_SECONDS=4.7

````

## test-mobile-app_scripts_mv010-options-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/mv010-options-selftest.cjs
CWD: .
PASS complete chapter/subject/year/bundle mapping preserves exact ₹1/₹2/₹5 prices and live calls
PASS successful empty tiers, bundle membership and foreign course exclusion
PASS getProductsByChapter failure rejects partial snapshot
PASS getProductsBySubject failure rejects partial snapshot
PASS getProductsByYear failure rejects partial snapshot
PASS getBundleProducts failure rejects partial snapshot
PASS malformed tier/row rejects incomplete response rather than fabricating empty options
PASS incomplete bundle memberships reject instead of disappearing as an empty bundle tier
PASS actual repository distinguishes successful [], server error, null payload and HTTP partial content
PASS hook success, fresh complete replacement and successful empty status
PASS network failure is error; genuinely new Retry recovers
PASS server failure is error; genuinely new Retry recovers
PASS API failure is error; genuinely new Retry recovers
PASS SQL failure is error; genuinely new Retry recovers
PASS expired JWT failure is error; genuinely new Retry recovers
PASS authentication failure is error; genuinely new Retry recovers
PASS forbidden failure is error; genuinely new Retry recovers
PASS API timeout failure is error; genuinely new Retry recovers
PASS partial failure is error; genuinely new Retry recovers
PASS deadline releases hung request, duplicate taps coalesce, late timed-out success ignored
PASS slow old / fast new and rapid chapter A-B-C-A navigation reject stale success/error
PASS fast old / slow new cannot populate new chapter or finish its loading
PASS course/year switches clear complete snapshots and pin exact request context
PASS account switching/logout/login invalidate old session, including relogin to same ID
PASS same-context cached complete data is explicitly stale on retry/failure and replaced on success
PASS unmount cancels timers/subscriptions and blocks late success/error writes
PASS course initialization failure, missing course and timeout yield bounded error with fresh context Retry
PASS actual panel + hook: network error -> accessible Retry -> fresh request -> genuine empty
PASS actual panel stale warnings, labels, disabled Buy Now and price preservation
PASS Chapter Details shares guarded panel, owned Notes indicator/focus refresh and free video/quiz navigation
PASS MV010 30 deterministic groups (synthetic fixtures only)

EXIT_CODE=0
DURATION_SECONDS=3.86

````

## test-mobile-app_scripts_mv011-accessibility-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/mv011-accessibility-selftest.cjs
CWD: .
Original contrast: 3.172779
PASS original source pairing fails normal-text AA despite meeting large-text 3:1
Corrected contrast: 6.134181
Corrected contrast: 6.134181
Corrected contrast: 6.134181
Corrected contrast: 6.134181
PASS actual panel action colors meet normal-text AA with unchanged brand accent
PASS active options expose distinct named buttons and preserve all scopes/prices
PASS disabled production offers accurately announce unavailable and cannot buy
PASS error/catalog disables actions, retains readable labels and MV010 retry
PASS retrying/catalog disables actions, retains readable labels and MV010 retry
PASS success/purchasing disables actions, retains readable labels and MV010 retry
PASS loading spinner is an accessible busy group; successful empty has no offer
PASS Store poster browse and purchase actions are independently focusable siblings
PASS Store unavailable and busy controls stay opaque/readable, disabled and callback guarded
PASS ownership preserved on both product cards with readable status badge and browse label
PASS shared payment-summary button preserves semantics and readable solid disabled background
PASS MV009 shared retry semantics, busy callback guard, readable errors and 48-unit target
PASS scaling stays enabled, panel cards wrap, purchase labels have no line/height caps
PASS Store year action active/unavailable/owned/busy semantics and unchanged ₹5
PASS MV011 15 deterministic groups; native layout/TalkBack NOT VERIFIED

EXIT_CODE=0
DURATION_SECONDS=3.36

````

## test-mobile-app_scripts_mv012-history-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/mv012-history-selftest.cjs
CWD: .
PASS two ISO purchases: newest first, numeric output
PASS multiple dates and subsecond precision
PASS offsets compare instants rather than wall time or ISO text
PASS equal instants across offsets use ascending purchase ID
PASS ties repeat across reversed server responses and refreshes
PASS null timestamp is undated and follows valid pre-epoch dates
PASS missing timestamp is undated and follows valid pre-epoch dates
PASS invalid timestamp is undated and follows valid pre-epoch dates
PASS empty timestamp is undated and follows valid pre-epoch dates
PASS NaN timestamp is undated and follows valid pre-epoch dates
PASS infinity timestamp is undated and follows valid pre-epoch dates
PASS out of Date range timestamp is undated and follows valid pre-epoch dates
PASS all undated rows have deterministic ID order
PASS empty and single purchase
PASS createdAt precedence, purchasedAt fallback, numeric and legacy toMillis
PASS frozen input array and records, amounts, identities and statuses unchanged; no new duplicates
PASS distinct historical purchases for the same product are both retained
PASS repository user/success filters, snake_case dates, refunded/failed/pending exclusion, one read
PASS no user means empty history without repository reads
PASS all ownership scopes unchanged by history sorting; revoked states never unlock
PASS service preserves refunded/failed/pending states if supplied; screen retains existing status/date/amount formatting
PASS actual My Purchases receives sorted rows, unique keys and undated placeholder
PASS navigation refocus and app resume refresh preserve newest-first ordering
PASS account switch clears history and ignores stale sorted response
MV012: 24 PASS, 0 FAIL

EXIT_CODE=0
DURATION_SECONDS=5.92

````

## test-mobile-app_scripts_navigation-lazy-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/navigation-lazy-selftest.cjs
CWD: .
{"provider":"disabled","registeredRoutes":35,"eagerScreenModules":7,"lazyRoutes":28}
{"provider":"razorpay","registeredRoutes":37,"eagerScreenModules":7,"lazyRoutes":30}
{"provider":"play","registeredRoutes":37,"eagerScreenModules":7,"lazyRoutes":30}
PASS route registration, provider gates, eager Sentry and existing error/retry fallback contract

EXIT_CODE=0
DURATION_SECONDS=4.11

````

## test-mobile-app_scripts_nonplay-test-isolation-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/nonplay-test-isolation-selftest.cjs
CWD: .
PASS test service: dedicated routes/Auth, concurrent taps, durable owner-bound idempotency, expiry, malformed/live response rejection, pending and account-switch protection
PASS payment facade delegates test creation/verification/recovery and refuses wallet or Play choices
PASS repository isolation: only synthetic products can be bought; test history stays in test APK; prior production purchases remain readable; synthetic scopes cannot unlock real chapters
PASS Notes service: synthetic IDs require the test route/build; existing purchased Notes retain the normal protected route; no fallback
PASS success screen uses isolated server proof in the test APK, retains live proof elsewhere, and never trusts route success fields

EXIT_CODE=0
DURATION_SECONDS=5.93

````

## test-mobile-app_scripts_notes-billing-choice-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/notes-billing-choice-selftest.cjs
CWD: .
PASS production Play profiles reject either enabled provider; required user-choice integration retained without activation
PASS standalone Play order/catalog/purchase blocked before native/HTTP work; historical receipt restoration and verification remain available
PASS native UCB initialization, product-bound choice, durable retry, malformed callback/account switch before and during storage, callback dedup, pending/verified/cancelled receipts
PASS Buy → summary → Google choice → Razorpay: one create for duplicate taps/callbacks; valid server order opens existing checkout
PASS Buy → summary → Google choice → Razorpay: one create for duplicate taps/callbacks; changed price requires confirmation
PASS native request timeout retains pending attempt; no duplicate charge; paid restart recovery requires committed server fulfillment

EXIT_CODE=0
DURATION_SECONDS=3.53

````

## test-mobile-app_scripts_notes-entitlement-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/notes-entitlement-selftest.cjs
CWD: .
PASS paid note local restriction, authorized opening/reopening with fresh links, and authoritative server denial despite a stale unlocked route

EXIT_CODE=0
DURATION_SECONDS=2.42

````

## test-mobile-app_scripts_notes-open-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/notes-open-selftest.cjs
CWD: .
PASS note double tap, blur/refocus and account switch cannot launch stale signed PDF

EXIT_CODE=0
DURATION_SECONDS=2.05

````

## test-mobile-app_scripts_notification-account-hook-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/notification-account-hook-selftest.cjs
CWD: .
PASS notification hook invalidates navigation synchronously across account changes and re-enables routing for the next signed-in account

EXIT_CODE=0
DURATION_SECONDS=1.46

````

## test-mobile-app_scripts_notification-inflight-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/notification-inflight-selftest.cjs
CWD: .
PASS concurrent notification reads, fresh subsequent state, account isolation, errors/retry, mute/read/archive semantics

EXIT_CODE=0
DURATION_SECONDS=1.21

````

## test-mobile-app_scripts_notification-preferences-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/notification-preferences-selftest.cjs
CWD: .
PASS notification gear destination, persisted category switches, remount, mute and unmute filtering

EXIT_CODE=0
DURATION_SECONDS=2.51

````

## test-mobile-app_scripts_notification-reads-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/notification-reads-selftest.cjs
CWD: .
100 notification rows: 1 preference reads; 50 enabled rows preserved

EXIT_CODE=0
DURATION_SECONDS=1.45

````

## test-mobile-app_scripts_notification-routing-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/notification-routing-selftest.cjs
CWD: .
PASS notification foreground/background/cold start, validation, login gate, deduplication, races and cleanup

EXIT_CODE=0
DURATION_SECONDS=2.13

````

## test-mobile-app_scripts_offline-download-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/offline-download-selftest.cjs
CWD: .
(node:9650) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS stale URL initial/retry/resume refresh, persisted source, revoked retry makes no download
PASS HTTP errors, partial bodies, size mismatch and non-PDF bodies never become completed downloads
PASS duplicate start coalesces; late completion after account switch cannot recreate content
PASS pause completion cannot overwrite paused state; resume obtains fresh authorization
PASS secure bulk cleanup failure/retry and legacy PDF preservation
PASS seven-day grace/network/5xx/429, day eight, 401/403 deletion, persistent rollback expiry, future/corrupt timestamps, legacy recovery, cleanup
PASS online denial persists offline, recovery clears denial, transient failure retains access, wrong user/sign-out denied
PASS upgrade cleanup removes quiz rows and orphan files, preserves paid notes, and is idempotent

EXIT_CODE=0
DURATION_SECONDS=5.99

````

## test-mobile-app_scripts_offline-license-storage-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/offline-license-storage-selftest.cjs
CWD: .
PASS native-only secure license persistence, legacy recheck, owner binding, missing/corrupt records, storage failures, grace/rollback, concurrent and bulk cleanup

EXIT_CODE=0
DURATION_SECONDS=4.06

````

## test-mobile-app_scripts_offline-owner-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/offline-owner-selftest.cjs
CWD: .
PASS verification remains owner-bound; account change during check cannot record access
PASS failed cleanup retains original owner through account switch/logout; successful cleanup allows new ownership

EXIT_CODE=0
DURATION_SECONDS=5.23

````

## test-mobile-app_scripts_p2-registration-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/p2-registration-selftest.cjs
CWD: .
PASS registration: duplicate request guard, normalized payload, success despite local referral failure, generic server rejection, retry and accessible field/action

EXIT_CODE=0
DURATION_SECONDS=5.23

````

## test-mobile-app_scripts_password-policy-selftest.mjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/password-policy-selftest.mjs
CWD: .
PASS server min length 8
PASS server requires lower+upper+digit+symbol
PASS mobile and website patterns identical
24 pattern checks, 0 FAIL

EXIT_CODE=0
DURATION_SECONDS=1.56

````

## test-mobile-app_scripts_password-recovery.test.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/password-recovery.test.cjs
CWD: .
TAP version 13
# Subtest: non-MFA recovery imports session, rechecks assurance, updates and signs out
ok 1 - non-MFA recovery imports session, rechecks assurance, updates and signs out
  ---
  duration_ms: 17.020635
  type: 'test'
  ...
# Subtest: MFA recovery requires existing verified TOTP and uses one client/session
ok 2 - MFA recovery requires existing verified TOTP and uses one client/session
  ---
  duration_ms: 2.777607
  type: 'test'
  ...
# Subtest: incorrect and malformed OTPs are sanitized and can be retried
ok 3 - incorrect and malformed OTPs are sanitized and can be retried
  ---
  duration_ms: 5.009607
  type: 'test'
  ...
# Subtest: successful verification response without actual AAL2 cannot unlock update
ok 4 - successful verification response without actual AAL2 cannot unlock update
  ---
  duration_ms: 1.195025
  type: 'test'
  ...
# Subtest: missing or unsupported factors block recovery with safe help
ok 5 - missing or unsupported factors block recovery with safe help
  ---
  duration_ms: 1.249147
  type: 'test'
  ...
# Subtest: expired import and expired verification session block password changes
ok 6 - expired import and expired verification session block password changes
  ---
  duration_ms: 13.621025
  type: 'test'
  ...
# Subtest: missing session, invalid JWT and revoked refresh token fail closed
ok 7 - missing session, invalid JWT and revoked refresh token fail closed
  ---
  duration_ms: 6.427327
  type: 'test'
  ...
# Subtest: insufficient_aal enters MFA and only retries update after verification
ok 8 - insufficient_aal enters MFA and only retries update after verification
  ---
  duration_ms: 13.518654
  type: 'test'
  ...
# Subtest: insufficient_aal with stale AAL2 still requires a fresh challenge, including network retry
ok 9 - insufficient_aal with stale AAL2 still requires a fresh challenge, including network retry
  ---
  duration_ms: 12.574089
  type: 'test'
  ...
# Subtest: network and rate-limit failures allow safe retry without reimporting recovery tokens
ok 10 - network and rate-limit failures allow safe retry without reimporting recovery tokens
  ---
  duration_ms: 2.293111
  type: 'test'
  ...
# Subtest: duplicate import, verification and password update are rejected while in flight
ok 11 - duplicate import, verification and password update are rejected while in flight
  ---
  duration_ms: 44.641297
  type: 'test'
  ...
# Subtest: sign-out failure cannot repeat password mutation; cleanup is retried separately
ok 12 - sign-out failure cannot repeat password mutation; cleanup is retried separately
  ---
  duration_ms: 0.850067
  type: 'test'
  ...
# Subtest: AAL downgrade before submit returns to MFA without updating password
ok 13 - AAL downgrade before submit returns to MFA without updating password
  ---
  duration_ms: 0.473568
  type: 'test'
  ...
# Subtest: password policy errors are classified by code and raw server messages are hidden
ok 14 - password policy errors are classified by code and raw server messages are hidden
  ---
  duration_ms: 0.832564
  type: 'test'
  ...
# Subtest: website actual script: TOTP form, wrong code, retry, duplicate verify and update, success cleanup
ok 15 - website actual script: TOTP form, wrong code, retry, duplicate verify and update, success cleanup
  ---
  duration_ms: 34.752225
  type: 'test'
  ...
# Subtest: website actual script: non-MFA policy and success
ok 16 - website actual script: non-MFA policy and success
  ---
  duration_ms: 15.027032
  type: 'test'
  ...
# Subtest: website actual script: expired link/import, unavailable factor and network initialization retry
ok 17 - website actual script: expired link/import, unavailable factor and network initialization retry
  ---
  duration_ms: 14.022804
  type: 'test'
  ...
# Subtest: website actual script: insufficient_aal requires MFA, cleanup failure has distinct retry
ok 18 - website actual script: insufficient_aal requires MFA, cleanup failure has distinct retry
  ---
  duration_ms: 5.811731
  type: 'test'
  ...
# Subtest: website recovery controller is an exact generated copy of mobile controller
ok 19 - website recovery controller is an exact generated copy of mobile controller
  ---
  duration_ms: 0.574071
  type: 'test'
  ...
# Subtest: mobile actual screen: MFA blocks password form, invalid code retry, duplicate taps, successful cleanup
ok 20 - mobile actual screen: MFA blocks password form, invalid code retry, duplicate taps, successful cleanup
  ---
  duration_ms: 1660.744549
  type: 'test'
  ...
# Subtest: mobile actual screen: non-MFA update and insufficient_aal transition
ok 21 - mobile actual screen: non-MFA update and insufficient_aal transition
  ---
  duration_ms: 360.798426
  type: 'test'
  ...
# Subtest: mobile actual screen: expired session and expired email fragment never expose password form
ok 22 - mobile actual screen: expired session and expired email fragment never expose password form
  ---
  duration_ms: 362.900397
  type: 'test'
  ...
# Subtest: real installed Supabase SDK: verify stores upgraded JWT, update uses that JWT, expiry refresh works
ok 23 - real installed Supabase SDK: verify stores upgraded JWT, update uses that JWT, expiry refresh works
  ---
  duration_ms: 10471.220287
  type: 'test'
  ...
# Subtest: insufficient_aal remains mandatory when the first assurance request fails
ok 24 - insufficient_aal remains mandatory when the first assurance request fails
  ---
  duration_ms: 60.805049
  type: 'test'
  ...
# Subtest: website actual script: expiry during submission blocks retrying the password update
ok 25 - website actual script: expiry during submission blocks retrying the password update
  ---
  duration_ms: 289.839336
  type: 'test'
  ...
# Subtest: mobile actual screen: network verification retry and sign-out retry do not repeat password mutation
ok 26 - mobile actual screen: network verification retry and sign-out retry do not repeat password mutation
  ---
  duration_ms: 484.486683
  type: 'test'
  ...
1..26
# tests 26
# suites 0
# pass 26
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 13967.057616

EXIT_CODE=0
DURATION_SECONDS=15.92

````

## test-mobile-app_scripts_payment-poll-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/payment-poll-selftest.cjs
CWD: .
PASS Razorpay polls coalesce, ignore blurred results, confirm focused success and stop on terminal refund verdict

EXIT_CODE=0
DURATION_SECONDS=4.23

````

## test-mobile-app_scripts_payment-provider-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/payment-provider-selftest.cjs
CWD: .
Payment provider and package configuration checks passed.

EXIT_CODE=0
DURATION_SECONDS=1.43

````

## test-mobile-app_scripts_payment-request-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/payment-request-selftest.cjs
CWD: .
PASS create sends product/wallet only and cleans request deadline
PASS malformed, live-mode and foreign verification checkout responses cannot open checkout
PASS stalled create request aborts without automatic duplicate order retry
PASS stalled verification aborts and bounded retry progresses
PASS recovery cannot send a session token to a route-supplied foreign endpoint
PASS structured pending verdict remains unconfirmed
PASS durable server-order recovery coalesces, binds account and excludes owned/refunded purchases
PASS signed-out/account-switched recovery cannot refresh the previous account as success

EXIT_CODE=0
DURATION_SECONDS=9.8

````

## test-mobile-app_scripts_payment-routing-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/payment-routing-selftest.cjs
CWD: .
PASS disabled payments block navigation and requests; existing Razorpay guards preserved

EXIT_CODE=0
DURATION_SECONDS=7.69

````

## test-mobile-app_scripts_payment-success-owner-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/payment-success-owner-selftest.cjs
CWD: .
PASS owner-bound readback, untrusted route fields ignored, confirmed details cleared on account switch
PASS delayed order/purchase replies ignored across account changes, including A to B to A
PASS isolated purchase proof cannot survive sign-out
PASS stalled Auth/readback stops loading and late replies cannot confirm success
PASS unpaid/refunded orders and mismatched purchase amounts cannot display success

EXIT_CODE=0
DURATION_SECONDS=14.67

````

## test-mobile-app_scripts_payment-summary-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/payment-summary-selftest.cjs
CWD: .
PASS same-render duplicate taps create once; changed server total requires price review before checkout
PASS pending, rejected and offline wallet quotes cannot charge using a stale total; retry remains available

EXIT_CODE=0
DURATION_SECONDS=13.88

````

## test-mobile-app_scripts_payment-verdict-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/payment-verdict-selftest.cjs
CWD: .
PASS structured pending, legacy unconfirmed and network failures recover then show pending without failed writes
PASS checkout authentication failure preserves pending order and passes sign-in guidance without failed writes
PASS only server-confirmed verification/recovery navigates to success; explicit rejection remains terminal
PASS UPI resume confirmation cannot be replaced or duplicated by a delayed callback verdict or network error

EXIT_CODE=0
DURATION_SECONDS=28.57

````

## test-mobile-app_scripts_pdf-lifecycle-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/pdf-lifecycle-selftest.cjs
CWD: .
PASS PDF background/auth races, expiry/revocation, deleted/corrupt file messages and listener cleanup

EXIT_CODE=0
DURATION_SECONDS=13.57

````

## test-mobile-app_scripts_pdf-remote-retry-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/pdf-remote-retry-selftest.cjs
CWD: .
PASS expired link → fresh authorized URL, retry single flight, stale render callbacks, render timeout, denial, background/resume and account switch; no signed URL logs

EXIT_CODE=0
DURATION_SECONDS=13.69

````

## test-mobile-app_scripts_play-catalog-contract-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/play-catalog-contract-selftest.cjs
CWD: .
PASS exact SKU, missing product, INR, single standard offer, wrong-price/discount/rental/preorder, ₹1/₹2/₹5, enrollment gate and native-unavailable failure; native country/version eligibility remains device acceptance

EXIT_CODE=0
DURATION_SECONDS=5.44

````

## test-mobile-app_scripts_profile-save-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/profile-save-selftest.cjs
CWD: .
PASS profile auth rejection prevents misleading success and profile writes; double tap and retry

EXIT_CODE=0
DURATION_SECONDS=4.22

````

## test-mobile-app_scripts_purchases-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/purchases-selftest.cjs
CWD: .
PASS repository filters success
PASS only successful scopes returned
PASS partial refund with successful purchase stays owned
PASS refunded scope denied by helpers
PASS chargeback scope denied by helpers
PASS partial_refund scope denied by helpers

EXIT_CODE=0
DURATION_SECONDS=1.69

````

## test-mobile-app_scripts_purchases-unavailable-ui-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/purchases-unavailable-ui-selftest.cjs
CWD: .
PASS unavailable Buy/search UI, no checkout navigation, content browsing and owned state preserved

EXIT_CODE=0
DURATION_SECONDS=2.27

````

## test-mobile-app_scripts_push-lifecycle-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/push-lifecycle-selftest.cjs
CWD: .
PASS push owner pinning, A→B, logout cancellation, channel ordering, native token refresh, foreground retry and owner-filtered cleanup

EXIT_CODE=0
DURATION_SECONDS=2.28

````

## test-mobile-app_scripts_quiz-editing-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/quiz-editing-selftest.cjs
CWD: .
PASS A → B → next → previous → submit saves B once; restart submits a new immutable attempt; existing timer advances

EXIT_CODE=0
DURATION_SECONDS=3.32

````

## test-mobile-app_scripts_quiz-hooks-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/quiz-hooks-selftest.cjs
CWD: .
PASS offline quiz loading preserves Hook order and initializes every answer after content arrives

EXIT_CODE=0
DURATION_SECONDS=2.28

````

## test-mobile-app_scripts_quiz-input-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/quiz-input-selftest.cjs
CWD: .
PASS malformed quiz questions/options show recovery; valid questions mount quiz

EXIT_CODE=0
DURATION_SECONDS=3.81

````

## test-mobile-app_scripts_razorpay-internal-test-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/razorpay-internal-test-selftest.cjs
CWD: .
PASS dedicated non-Play APK/package/channel/runtime; production-isolated configuration; existing profiles and Play native package stay disabled
PASS paid Notes pass the exact product ID to summary/server; Pay forwards server checkout data; owned Notes create no order; duplicate Pay creates once
PASS existing checkout cancel/failure/pending/server-confirmed-success behavior remains intact

EXIT_CODE=0
DURATION_SECONDS=3.65

````

## test-mobile-app_scripts_razorpay-live-testing-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/razorpay-live-testing-selftest.cjs
CWD: .
PASS dedicated live APK; exact build guards; native channel/runtime isolate Play; existing Firebase/package retained
PASS authenticated existing live order route; server-priced ₹1; test keys/foreign verify URLs rejected; backend verdict required

EXIT_CODE=0
DURATION_SECONDS=3.52

````

## test-mobile-app_scripts_readiness-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/readiness-selftest.cjs
CWD: .
PASS MOB-01 initial fail-open, confirmed true/false retained on malformed/error/timeout, successful false reopens, launch/resume and cleanup
PASS MOB-02 runtime correction of both stale IDs; valid and custom URLs preserved

EXIT_CODE=0
DURATION_SECONDS=2.26

````

## test-mobile-app_scripts_release-payments-disabled-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/release-payments-disabled-selftest.cjs
CWD: .
PASS release Android actual provider config → navigation/service/checkout: no Razorpay order or checkout, including hostile Razorpay config

EXIT_CODE=0
DURATION_SECONDS=3.68

````

## test-mobile-app_scripts_remaining-audit-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/remaining-audit-selftest.cjs
CWD: .
PASS AUD-007
PASS AUD-004
PASS AUD-001
PASS AUD-002
PASS AUD-005
PASS AUD-006

EXIT_CODE=0
DURATION_SECONDS=5.07

````

## test-mobile-app_scripts_route-validation-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/route-validation-selftest.cjs
CWD: .
PASS malformed routes rejected before screen effects; valid routes retain component; back/home recovery

EXIT_CODE=0
DURATION_SECONDS=1.84

````

## test-mobile-app_scripts_same-project-build-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/same-project-build-selftest.cjs
CWD: .
PASS same-project build and wrong-project/missing-key/wrong-provider rejection

EXIT_CODE=0
DURATION_SECONDS=0.69

````

## test-mobile-app_scripts_search-cache-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/search-cache-selftest.cjs
CWD: .
{"openingSourceReads":0,"firstSearchCumulativeReads":9,"reopenAfter3MinutesCumulativeReads":9,"forcedRefreshCumulativeReads":18,"concurrentColdSourceReads":9,"indexedRows":4950,"indexBytes":1276683}
PASS lazy cache read, 15-minute reuse, explicit refresh, single-flight and account/course isolation

EXIT_CODE=0
DURATION_SECONDS=4.37

````

## test-mobile-app_scripts_search-lazy-hook-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/search-lazy-hook-selftest.cjs
CWD: .
PASS search discovery masks previous ownership and rejects obsolete async completion
PASS actual search hook opens without build, lazily builds on first query, reuses on typing and explicitly refreshes

EXIT_CODE=0
DURATION_SECONDS=3.54

````

## test-mobile-app_scripts_search-pagination-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/search-pagination-selftest.cjs
CWD: .
{"rows":2601,"pageRequests":11,"maxRowsPerResponse":250}
PASS complete bounded pages, title mapping, quiz-key exclusion, failure and cursor/memory guards

EXIT_CODE=0
DURATION_SECONDS=2.29

````

## test-mobile-app_scripts_sentry-config-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/sentry-config-selftest.cjs
CWD: .
PASS Sentry supported plugin, token-free no-op, upload configuration and secret exclusion

EXIT_CODE=0
DURATION_SECONDS=0.66

````

## test-mobile-app_scripts_staging-build-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/staging-build-selftest.cjs
CWD: .
PASS internal profile does not inherit production
PASS internal profile uses preview EAS environment
PASS internal profile identifies same-project target
PASS internal profile pins existing project
PASS staging profile is a separate internal APK and channel
PASS staging profile uses exact staging URL and disables payments
PASS staging profile remains blocked until its key is provided
PASS exact staging URL with distinct fixture key
PASS placeholder key
PASS production URL
PASS production key
PASS unexpected project
PASS Play provider
PASS Razorpay provider
PASS production Google services file variable
PASS production payment worker secret
PASS missing target
PASS wrong profile
PASS staging APK has distinct app identity and disabled runtime

EXIT_CODE=0
DURATION_SECONDS=0.65

````

## test-mobile-app_scripts_startup-availability-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/startup-availability-selftest.cjs
CWD: .
PASS web/Android root: pending/disabled availability opens navigation, confirmed maintenance and required updates gate; native offline preparation preserved
PASS splash routes restored/signed-out/recovery sessions without scheduling a delay

EXIT_CODE=0
DURATION_SECONDS=3.08

````

## test-mobile-app_scripts_sync-concurrency-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/sync-concurrency-selftest.cjs
CWD: .
Concurrent drain is single-flight; connectivity rejection releases guard for retry

EXIT_CODE=0
DURATION_SECONDS=1.76

````

## test-mobile-app_scripts_verify-signature-selftest.js.log

````text
$ node --experimental-strip-types mobile-app/scripts/verify-signature-selftest.js
CWD: .
OK: A correctly generated signature is accepted
OK: A tampered signature is rejected
OK: Signature generated with the wrong secret is rejected
OK: Signature is rejected if the order id doesn't match

If all four checks say OK, the signature logic used in
verifyPayment.ts and webhook.ts is correct.

EXIT_CODE=0
DURATION_SECONDS=0.25

````

## test-mobile-app_scripts_video-data-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/video-data-selftest.cjs
CWD: .
PASS: admin youtubeUrl → stored youtube_url → mobile youtubeUrl, exact value preserved, with row diagnostics (mock transport)

EXIT_CODE=0
DURATION_SECONDS=1.79

````

## test-mobile-app_scripts_video-link-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/video-link-selftest.cjs
CWD: .
PASS: 25 URL forms, invalid/signed/playlist links, native → HTTPS → browser order, retry, copy/failure, iOS and diagnostics

EXIT_CODE=0
DURATION_SECONDS=2.73

````

## test-mobile-app_scripts_video-tap-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/video-tap-selftest.cjs
CWD: .
PASS: actual screen → card TouchableOpacity → onPress → opener; free card and keyboard tap forwarding (not a device gesture test)

EXIT_CODE=0
DURATION_SECONDS=1.69

````

## test-mobile-app_scripts_years-inflight-selftest.cjs.log

````text
$ node --experimental-strip-types mobile-app/scripts/years-inflight-selftest.cjs
CWD: .
PASS shared pending years read, fresh subsequent reads, account/course separation and independent error/offline fallback

EXIT_CODE=0
DURATION_SECONDS=2.27

````

## test-scripts_p2-admin-labels-selftest.cjs.log

````text
$ node --experimental-strip-types scripts/p2-admin-labels-selftest.cjs
CWD: .
54 native HTML form controls inspected
PASS admin HTML controls have explicit names/ids or enclosing labels; browser speech not certified

EXIT_CODE=0
DURATION_SECONDS=1.96

````

## test-scripts_p2-performance-selftest.cjs.log

````text
$ node --experimental-strip-types scripts/p2-performance-selftest.cjs
CWD: .
{"fixture":"1001 Notes / 1000 Chapters; actual component render; synthetic only","linearSearchComparisons":0,"indexConstructionVisits":1000,"renderMs":4.315283000000136,"titleAssertions":1001}

EXIT_CODE=0
DURATION_SECONDS=2.16

````

## test-scripts_p2-quality-selftest.cjs.log

````text
$ node --experimental-strip-types scripts/p2-quality-selftest.cjs
CWD: .
PASS Settings catches unavailable contact and both rate-app transports
PASS Contact retains draft on mail handoff, blocks duplicate submits and names social actions
PASS Admin Input associates label, input and announced error
PASS Referrals returns every page with stable ordering and propagates later errors
PASS Product form rejects invalid MRP and duplicate in-flight saves; retains exact valid prices
PASS Analytics sums paise exactly and selects only needed fields
PASS Notification Center can distinguish network failure from genuinely empty data
PASS Web PDF hides signed content on owner switch and retries through server authorization
PASS Admin modal traps keyboard focus, handles Escape, restores trigger and exposes dialog name
PASS Mobile confirmation exposes named 48-unit actions and blocks actions while busy
PASS Course filter retains an accessible name even when the visible label is hidden
PASS Notification screen ignores blurred loads and handles archive failure without hiding a row
12 passed; 0 failed

EXIT_CODE=0
DURATION_SECONDS=3.2

````

## test-scripts_secret-scan-selftest.mjs.log

````text
$ node --experimental-strip-types scripts/secret-scan-selftest.mjs
CWD: .
PASS: secret scanner marker, generated fixture, PEM, escaped PEM, live keys, service-role and anon JWT cases

EXIT_CODE=0
DURATION_SECONDS=0.19

````

## test-supabase_tests_audit-batch1-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/audit-batch1-selftest.cjs
CWD: .
node:internal/assert/utils:77
    throw err;
    ^

AssertionError [ERR_ASSERTION]: local host required
    at Object.<anonymous> (/home/ganeshp8545/AyurPulse/supabase/tests/audit-batch1-selftest.cjs:7:8)
    at Module._compile (node:internal/modules/cjs/loader:1781:14)
    at Object..js (node:internal/modules/cjs/loader:1913:10)
    at Module.load (node:internal/modules/cjs/loader:1505:32)
    at Function._load (node:internal/modules/cjs/loader:1309:12)
    at wrapModuleLoad (node:internal/modules/cjs/loader:254:19)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:171:5)
    at node:internal/main/run_main_module:36:49 {
  generatedMessage: false,
  code: 'ERR_ASSERTION',
  actual: false,
  expected: true,
  operator: '==',
  diff: 'simple'
}

Node.js v22.23.1

EXIT_CODE=1
DURATION_SECONDS=0.82

````

## test-supabase_tests_audit-login-body-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/audit-login-body-selftest.cjs
CWD: .
PASS AUD-019 malformed/nonobject JSON returns generic credentials failure before Auth/DB

EXIT_CODE=0
DURATION_SECONDS=1.22

````

## test-supabase_tests_audit-push-policy-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/audit-push-policy-selftest.cjs
CWD: .
PASS AUD-015 AAL1/AAL2, MFA on/off, missing/bad/error policy and nonadmin side-effect denial

EXIT_CODE=0
DURATION_SECONDS=2.19

````

## test-supabase_tests_b-to-c-handlers-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/b-to-c-handlers-selftest.cjs
CWD: .
node:internal/assert/utils:77
    throw err;
    ^

AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:

  assert.ok(process.env.PGHOST?.startsWith('/tmp/'))

    at Object.<anonymous> (/home/ganeshp8545/AyurPulse/supabase/tests/b-to-c-handlers-selftest.cjs:9:8)
    at Module._compile (node:internal/modules/cjs/loader:1781:14)
    at Object..js (node:internal/modules/cjs/loader:1913:10)
    at Module.load (node:internal/modules/cjs/loader:1505:32)
    at Function._load (node:internal/modules/cjs/loader:1309:12)
    at wrapModuleLoad (node:internal/modules/cjs/loader:254:19)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:171:5)
    at node:internal/main/run_main_module:36:49 {
  generatedMessage: true,
  code: 'ERR_ASSERTION',
  actual: undefined,
  expected: true,
  operator: '==',
  diff: 'simple'
}

Node.js v22.23.1

EXIT_CODE=1
DURATION_SECONDS=0.7

````

## test-supabase_tests_b-to-c-reporting-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/b-to-c-reporting-selftest.cjs
CWD: .
PASS F10 missing completion time prevents Google call
PASS F10 transient rejection records failed state
PASS F10 retry then success
PASS F10 F05 Google transactionTime is provider capture time, 25h before receipt
PASS F10 input-only Google token may be absent in readback; exact token asserted in CREATE
PASS F10 returned foreign token rejected
PASS F10 permanent Google rejection stays failed
PASS F10 Google amount mismatch rejected
PASS F10 test server rejects an unmarked real Google report result
PASS F10 license-test Google result persists its authoritative test marker
PASS F10 first partial refund
PASS F10 second partial refund uses prior reported amount
PASS F10 busy refund claim throws for durable retry rather than returning skipped success
PASS F10 already reported refund replay returns confirmed completion
PASS F10 Google success cannot return reported when persistence fails
PASS F10 lost persistence result reconciles on retry
PASS F10 a slower failed attempt cannot downgrade a concurrent reported result

EXIT_CODE=0
DURATION_SECONDS=2.15

````

## test-supabase_tests_b-to-c-worker-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/b-to-c-worker-selftest.cjs
CWD: .
PASS absent cron secret denies worker before financial work
Payment job failed {
  phase: 'reports',
  targetId: 'capture:pay_fixture',
  error: 'Error: External report not completed'
}
Payment job failed {
  phase: 'refunds',
  targetId: 'capture:pay_fixture',
  error: 'Error: External refund report not completed'
}
PASS skipped reports/refunds cannot finish durable jobs successfully
Payment job failed {
  phase: 'events',
  targetId: 'capture:pay_fixture',
  error: 'Error: Capture settlement pending'
}
PASS capture-only crash recovery retries until authoritative settlement commits
Payment job failed { phase: 'events', targetId: 'evt_authorized', error: 'Error: retry' }
PASS authorization inbox retries reporting without granting Notes
Payment job failed {
  phase: 'compensate',
  targetId: 'capture:pay_fixture',
  error: 'Error: Could not record compensated capture'
}
PASS compensation persistence errors and lost worker leases cannot return job success

EXIT_CODE=0
DURATION_SECONDS=3.98

````

## test-supabase_tests_billing-recovery-worker-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/billing-recovery-worker-selftest.cjs
CWD: .
Payment job failed {
  phase: 'reports',
  targetId: 'capture:pay_fixture',
  error: 'Error: External report not completed'
}
Payment job failed {
  phase: 'refunds',
  targetId: 'capture:pay_fixture',
  error: 'Error: External refund report not completed'
}
PASS skipped reports/refunds cannot finish durable jobs successfully
Payment job failed {
  phase: 'events',
  targetId: 'capture:pay_fixture',
  error: 'Error: Capture settlement pending'
}
PASS capture-only crash recovery retries until authoritative settlement commits
Payment job failed { phase: 'events', targetId: 'evt_authorized', error: 'Error: retry' }
PASS authorization inbox retries reporting without granting Notes
Payment job failed {
  phase: 'compensate',
  targetId: 'capture:pay_fixture',
  error: 'Error: Could not record compensated capture'
}
PASS compensation persistence errors and lost worker leases cannot return job success

EXIT_CODE=0
DURATION_SECONDS=3.28

````

## test-supabase_tests_compensation-worker-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/compensation-worker-selftest.cjs
CWD: .
Payment job failed {
  phase: 'compensate',
  targetId: 'pay_compensate',
  error: 'Error: mock transient Razorpay error'
}
PASS F03 full automatic compensation retries and queues Google refund with stable request id

EXIT_CODE=0
DURATION_SECONDS=2.1

````

## test-supabase_tests_delete-account-rate-limit-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/delete-account-rate-limit-selftest.cjs
CWD: .
PASS deletion-only IP/account limits, fail-closed flags, no mutation on denial, caller binding and partial failure retry

EXIT_CODE=0
DURATION_SECONDS=1.87

````

## test-supabase_tests_diagnostic-auth-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/diagnostic-auth-selftest.cjs
CWD: .
PASS diagnostic matrix requires verified user + admin + AAL2 before credential/network access; retirement notes present

EXIT_CODE=0
DURATION_SECONDS=1.87

````

## test-supabase_tests_f10-coverage-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/f10-coverage-selftest.cjs
CWD: .
PASS F10 independent Play and Razorpay sessions
PASS F10 mocked Google reporting scenarios
PASS F10 mocked Play consumption failure

EXIT_CODE=0
DURATION_SECONDS=0.15

````

## test-supabase_tests_google-reporting-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/google-reporting-selftest.cjs
CWD: .
PASS F10 missing completion time prevents Google call
PASS F10 transient rejection records failed state
PASS F10 retry then success
PASS F10 F05 Google transactionTime is provider capture time, 25h before receipt
PASS F10 permanent Google rejection stays failed
PASS F10 Google amount mismatch rejected
PASS F10 test server rejects an unmarked real Google report result
PASS F10 license-test Google result persists its authoritative test marker
PASS F10 first partial refund
PASS F10 second partial refund uses prior reported amount
PASS F10 busy refund claim throws for durable retry rather than returning skipped success
PASS F10 already reported refund replay returns confirmed completion
PASS F10 Google success cannot return reported when persistence fails
PASS F10 lost persistence result reconciles on retry
PASS F10 a slower failed attempt cannot downgrade a concurrent reported result

EXIT_CODE=0
DURATION_SECONDS=1.47

````

## test-supabase_tests_identity-retention-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/identity-retention-selftest.cjs
CWD: .
PASS retention SQL cutoff/privileges/no scheduling/no invocation; boundary and anti-abuse model; account ID removal; disclosure consistency
LIMIT: PostgreSQL execution and live retention operation are not verified (no database writes).

EXIT_CODE=0
DURATION_SECONDS=0.49

````

## test-supabase_tests_mv003-entitlement-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/mv003-entitlement-selftest.cjs
CWD: .
node:internal/assert/utils:77
    throw err;
    ^

AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:

  assert.ok(process.env.PGHOST?.startsWith('/tmp/'))

    at Object.<anonymous> (/home/ganeshp8545/AyurPulse/supabase/tests/mv003-entitlement-selftest.cjs:8:8)
    at Module._compile (node:internal/modules/cjs/loader:1781:14)
    at Object..js (node:internal/modules/cjs/loader:1913:10)
    at Module.load (node:internal/modules/cjs/loader:1505:32)
    at Function._load (node:internal/modules/cjs/loader:1309:12)
    at wrapModuleLoad (node:internal/modules/cjs/loader:254:19)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:171:5)
    at node:internal/main/run_main_module:36:49 {
  generatedMessage: true,
  code: 'ERR_ASSERTION',
  actual: undefined,
  expected: true,
  operator: '==',
  diff: 'simple'
}

Node.js v22.23.1

EXIT_CODE=1
DURATION_SECONDS=0.98

````

## test-supabase_tests_mv004-recovery-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/mv004-recovery-selftest.cjs
CWD: .
PASS missing authentication denied before order/provider/settlement
PASS expired authentication denied before order/provider/settlement
PASS forged authentication denied before order/provider/settlement
PASS raw token authentication denied before order/provider/settlement
PASS Basic scheme authentication denied before order/provider/settlement
PASS wrong owner and missing order use verified identity filters and identical non-disclosing responses; body user ID ignored
PASS invalid UUID and failed recovery limiter never reach provider/settlement
PASS valid owner and duplicate recovery deliveries reach settlement (SQL idempotency covered by MV003)
PASS valid signed callback without JWT reaches shared helper; invalid/missing signature rejected before order lookup
razorpay-webhook: processed { eventId: 'evt_mv004', paymentId: 'pay_Fixture004' }
razorpay-webhook: invalid signature { eventId: 'evt_mv004' }
razorpay-webhook: invalid signature { eventId: 'evt_mv004' }
PASS valid raw-body webhook HMAC; modified body/invalid HMAC rejected before inbox/settlement
PASS MV004 backend isolated fixtures; zero real HTTP requests

EXIT_CODE=0
DURATION_SECONDS=2.7

````

## test-supabase_tests_mv005-create-order-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/mv005-create-order-selftest.cjs
CWD: .
PASS all four actual create-order failure branches condition on created; paid/refunded states preserved (12 cases)

EXIT_CODE=0
DURATION_SECONDS=3.58

````

## test-supabase_tests_mv005-history-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/mv005-history-selftest.cjs
CWD: .
node:internal/assert/utils:77
    throw err;
    ^

AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:

  assert.ok(process.env.PGHOST?.startsWith('/tmp/'))

    at Object.<anonymous> (/home/ganeshp8545/AyurPulse/supabase/tests/mv005-history-selftest.cjs:4:8)
    at Module._compile (node:internal/modules/cjs/loader:1781:14)
    at Object..js (node:internal/modules/cjs/loader:1913:10)
    at Module.load (node:internal/modules/cjs/loader:1505:32)
    at Function._load (node:internal/modules/cjs/loader:1309:12)
    at wrapModuleLoad (node:internal/modules/cjs/loader:254:19)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:171:5)
    at node:internal/main/run_main_module:36:49 {
  generatedMessage: true,
  code: 'ERR_ASSERTION',
  actual: undefined,
  expected: true,
  operator: '==',
  diff: 'simple'
}

Node.js v22.23.1

EXIT_CODE=1
DURATION_SECONDS=1.56

````

## test-supabase_tests_mv006-restoration-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/mv006-restoration-selftest.cjs
CWD: .
PASS actual repository/service restores historic duplicates after logout/login and process reload; preserves display rows; one refund retains access, full refund denies, owner/status filtering holds

EXIT_CODE=0
DURATION_SECONDS=3.35

````

## test-supabase_tests_notes-choice-order-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/notes-choice-order-selftest.cjs
CWD: .
PASS authenticated Notes choice endpoint denies before writes when disabled/invalid; server price/user win; repeat request returns same provider order
PASS ambiguous provider creation never repeats CREATE for the same choice
PASS ambiguous creation recovers one exactly bound receipt with no second CREATE; mismatched provider snapshots cannot open checkout
PASS verified authorization queues reporting only, rejects provider mismatches, skips website orders and never calls settlement
PASS production approval gates; stale/terminal/foreign/malformed reservations rejected before provider CREATE; testing prices unchanged

EXIT_CODE=0
DURATION_SECONDS=4.91

````

## test-supabase_tests_p0-notification-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/p0-notification-selftest.cjs
CWD: .
PASS targeted requests cannot persist globally readable content or read tokens; authorized broadcast and admin gate preserved

EXIT_CODE=0
DURATION_SECONDS=2.67

````

## test-supabase_tests_p0-reversal-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/p0-reversal-selftest.cjs
CWD: .
Payment job failed {
  phase: 'events',
  targetId: 'evt_fixture',
  error: 'Error: Refund event not linked'
}
Payment job failed {
  phase: 'events',
  targetId: 'evt_fixture',
  error: 'Error: Refund event not linked'
}
Payment job failed {
  phase: 'events',
  targetId: 'evt_fixture',
  error: 'Error: Refund event not linked'
}
Payment job failed {
  phase: 'events',
  targetId: 'evt_fixture',
  error: 'Error: Refund event not linked'
}
Payment job failed {
  phase: 'events',
  targetId: 'evt_fixture',
  error: 'Error: Refund event not linked'
}
Payment job failed {
  phase: 'events',
  targetId: 'evt_fixture',
  error: 'Error: Refund event not linked'
}
Payment job failed {
  phase: 'events',
  targetId: 'evt_fixture',
  error: 'Error: Dispute event not linked'
}
Payment job failed {
  phase: 'events',
  targetId: 'evt_fixture',
  error: 'Error: Dispute event not linked'
}
Payment job failed {
  phase: 'events',
  targetId: 'evt_fixture',
  error: 'Error: Dispute event not linked'
}
Payment job failed {
  phase: 'events',
  targetId: 'evt_fixture',
  error: 'Error: Dispute event not linked'
}
Payment job failed {
  phase: 'events',
  targetId: 'evt_fixture',
  error: 'Error: Dispute event not linked'
}
Payment job failed {
  phase: 'events',
  targetId: 'evt_fixture',
  error: 'Error: Dispute event not linked'
}
PASS unresolved/null/unrecognized refund and dispute results retain inbox and webhook/worker retries (36 paths)
PASS recognized idempotent reversal outcomes and closed manual hold preserved; unfamiliar states fail closed
razorpay-webhook: not settled {
  eventId: 'evt_fixture',
  paymentId: 'pay_fixture',
  reason: 'provider mismatch'
}
razorpay-webhook: not settled {
  eventId: 'evt_fixture',
  paymentId: 'pay_fixture',
  reason: 'provider mismatch'
}
razorpay-webhook: not settled {
  eventId: 'evt_fixture',
  paymentId: 'pay_fixture',
  reason: 'provider mismatch'
}
razorpay-webhook: not settled {
  eventId: 'evt_fixture',
  paymentId: 'pay_fixture',
  reason: 'provider mismatch'
}
razorpay-webhook: not settled {
  eventId: 'evt_fixture',
  paymentId: 'pay_fixture',
  reason: 'payment captured; refund queued'
}
razorpay-webhook: not settled {
  eventId: 'evt_fixture',
  paymentId: 'pay_fixture',
  reason: 'payment already refunded'
}
razorpay-webhook: not settled {
  eventId: 'evt_fixture',
  paymentId: 'pay_fixture',
  reason: 'payment reversed'
}
PASS unresolved capture mismatches retain webhook retries; only durable compensation/reversal outcomes acknowledge

EXIT_CODE=0
DURATION_SECONDS=8.91

````

## test-supabase_tests_p1-push-delivery-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/p1-push-delivery-selftest.cjs
CWD: .
send-push-notification: notification row insert failed offline
PASS push tickets count acceptance only, partial/malformed/provider rejection, dead-token cleanup, and fail before send on feed persistence failure; no device delivery claim

EXIT_CODE=0
DURATION_SECONDS=2.81

````

## test-supabase_tests_phase-b-handlers-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/phase-b-handlers-selftest.cjs
CWD: .
node:internal/assert/utils:77
    throw err;
    ^

AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:

  assert.ok(process.env.PGHOST?.startsWith('/tmp/'))

    at Object.<anonymous> (/home/ganeshp8545/AyurPulse/supabase/tests/phase-b-handlers-selftest.cjs:8:8)
    at Module._compile (node:internal/modules/cjs/loader:1781:14)
    at Object..js (node:internal/modules/cjs/loader:1913:10)
    at Module.load (node:internal/modules/cjs/loader:1505:32)
    at Function._load (node:internal/modules/cjs/loader:1309:12)
    at wrapModuleLoad (node:internal/modules/cjs/loader:254:19)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:171:5)
    at node:internal/main/run_main_module:36:49 {
  generatedMessage: true,
  code: 'ERR_ASSERTION',
  actual: undefined,
  expected: true,
  operator: '==',
  diff: 'simple'
}

Node.js v22.23.1

EXIT_CODE=1
DURATION_SECONDS=1.65

````

## test-supabase_tests_phase-b-history-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/phase-b-history-selftest.cjs
CWD: .
node:internal/assert/utils:77
    throw err;
    ^

AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:

  assert.ok(process.env.PGHOST?.startsWith('/tmp/'))

    at Object.<anonymous> (/home/ganeshp8545/AyurPulse/supabase/tests/phase-b-history-selftest.cjs:4:8)
    at Module._compile (node:internal/modules/cjs/loader:1781:14)
    at Object..js (node:internal/modules/cjs/loader:1913:10)
    at Module.load (node:internal/modules/cjs/loader:1505:32)
    at Function._load (node:internal/modules/cjs/loader:1309:12)
    at wrapModuleLoad (node:internal/modules/cjs/loader:254:19)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:171:5)
    at node:internal/main/run_main_module:36:49 {
  generatedMessage: true,
  code: 'ERR_ASSERTION',
  actual: undefined,
  expected: true,
  operator: '==',
  diff: 'simple'
}

Node.js v22.23.1

EXIT_CODE=1
DURATION_SECONDS=1.85

````

## test-supabase_tests_phase-b-recovery-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/phase-b-recovery-selftest.cjs
CWD: .
PASS missing authentication denied before order/provider/settlement
PASS expired authentication denied before order/provider/settlement
PASS forged authentication denied before order/provider/settlement
PASS raw token authentication denied before order/provider/settlement
PASS Basic scheme authentication denied before order/provider/settlement
PASS wrong owner and missing order use verified identity filters and identical non-disclosing responses; body user ID ignored
PASS invalid UUID and failed recovery limiter never reach provider/settlement
PASS valid owner and duplicate recovery deliveries reach settlement (SQL idempotency covered by MV003)
PASS valid signed callback without JWT reaches shared helper; invalid/missing signature rejected before order lookup
razorpay-webhook: processed { eventId: 'evt_mv004', paymentId: 'pay_Fixture004' }
razorpay-webhook: invalid signature { eventId: 'evt_mv004' }
razorpay-webhook: invalid signature { eventId: 'evt_mv004' }
PASS valid raw-body webhook HMAC; modified body/invalid HMAC rejected before inbox/settlement
PASS MV004 backend isolated fixtures; zero real HTTP requests

EXIT_CODE=0
DURATION_SECONDS=2.97

````

## test-supabase_tests_phase-c-gates-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/phase-c-gates-selftest.cjs
CWD: .
PASS create-play-order: defaults and each approval/header/Auth gate deny before SQL; approved synthetic call derives owner from Auth
PASS attach-external-token: defaults and each approval/header/Auth gate deny before SQL; approved synthetic call derives owner from Auth

EXIT_CODE=0
DURATION_SECONDS=3.63

````

## test-supabase_tests_play-body-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/play-body-selftest.cjs
CWD: .
PASS malformed/null Play request bodies return 400 before rate-limit, order, verification or provider work

EXIT_CODE=0
DURATION_SECONDS=2.63

````

## test-supabase_tests_play-catalog-creation-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/play-catalog-creation-selftest.cjs
CWD: .
PASS real catalog creation worker: 126 scenarios; exact INR/India, explicit version, auth, failures, retries, idempotency, rotation and lease fences

EXIT_CODE=0
DURATION_SECONDS=5.28

````

## test-supabase_tests_play-catalog-worker-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/play-catalog-worker-selftest.cjs
CWD: .
PASS worker auth, safe logs, Publisher retry parity and terminal OAuth permission failures across 20 cases
PASS catalog failure persistence errors and expired leases return 503
PASS PATCH diagnostic reaches structured log; persisted error and retry behavior remain unchanged

EXIT_CODE=0
DURATION_SECONDS=2.38

````

## test-supabase_tests_play-consumption-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/play-consumption-selftest.cjs
CWD: .
verify-play-purchase consumption pending Consumption request failed
PASS F10 Google consumption failure recorded for retry after grant

EXIT_CODE=0
DURATION_SECONDS=1.56

````

## test-supabase_tests_play-order-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/play-order-selftest.cjs
CWD: .
PASS checkout distinguishes terminal catalog failures from pending/stale tiers and fails closed on lookup errors

EXIT_CODE=0
DURATION_SECONDS=1.27

````

## test-supabase_tests_play-payment-worker-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/play-payment-worker-selftest.cjs
CWD: .
PASS successful Play consumption
Play payment job failed {
  phase: 'consume',
  orderId: '00000000-0000-0000-0000-000000000001',
  error: 'Error: consume failed'
}
PASS failed consumption and retry
PASS duplicate token/job does not consume twice
PASS concurrent worker claim
PASS expired lease reclaimed
Play payment job failed {
  phase: 'consume',
  orderId: '00000000-0000-0000-0000-000000000001',
  error: 'Error: consume failed'
}
PASS retry limit parks failed job
Play payment job failed {
  phase: 'reconcile',
  orderId: '00000000-0000-0000-0000-000000000001',
  error: 'Error: Google unavailable'
}
PASS Google API failure retried without false check timestamp
PASS refunded purchase reverses entitlement
PASS voided token deduplicated and reversed
PASS void observed before settlement reverses later entitlement
Play job completion failed Error: Play job lease lost or finish failed
PASS stale lease cannot finish job
Play worker unavailable Error: Play void cursor lease lost or finish failed
PASS stale lease cannot advance void cursor
Play void sweep failed Error: Google unavailable
PASS void API failure releases cursor for retry
PASS direct verification consumption race
PASS concurrent direct consume 409 confirmed with fresh Google read
PASS Razorpay paths untouched
PASS dedicated cron authentication
PASS Play-only migration dependencies and SQL lease fences

EXIT_CODE=0
DURATION_SECONDS=1.4

````

## test-supabase_tests_play-reconcile-fairness-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/play-reconcile-fairness-selftest.cjs
CWD: .
Payment job failed {
  phase: 'reconcile',
  targetId: 'order-0',
  error: 'Error: mock Google failure'
}
Payment job failed {
  phase: 'reconcile',
  targetId: 'order-1',
  error: 'Error: mock Google failure'
}
Payment job failed {
  phase: 'reconcile',
  targetId: 'order-2',
  error: 'Error: mock Google failure'
}
Payment job failed {
  phase: 'reconcile',
  targetId: 'order-3',
  error: 'Error: mock Google failure'
}
Payment job failed {
  phase: 'reconcile',
  targetId: 'order-4',
  error: 'Error: mock Google failure'
}
Payment job failed {
  phase: 'reconcile',
  targetId: 'order-5',
  error: 'Error: mock Google failure'
}
Payment job failed {
  phase: 'reconcile',
  targetId: 'order-6',
  error: 'Error: mock Google failure'
}
Payment job failed {
  phase: 'reconcile',
  targetId: 'order-7',
  error: 'Error: mock Google failure'
}
Payment job failed {
  phase: 'reconcile',
  targetId: 'order-8',
  error: 'Error: mock Google failure'
}
Payment job failed {
  phase: 'reconcile',
  targetId: 'order-9',
  error: 'Error: mock Google failure'
}
PASS F04 eleventh refunded token checked despite ten permanent mock Google failures (11 unique tokens)

EXIT_CODE=0
DURATION_SECONDS=1.37

````

## test-supabase_tests_play-service-account-diagnostic-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/play-service-account-diagnostic-selftest.cjs
CWD: .
PASS play service-account diagnostic (43 cases; auth/MFA, exact match, safe output, read-only)

EXIT_CODE=0
DURATION_SECONDS=1.56

````

## test-supabase_tests_play-verification-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/play-verification-selftest.cjs
CWD: .
PASS real verification handler validates v2 receipt then settles and consumes
PASS paid Play RPC without committed Notes entitlement remains pending and unconsumed
PASS invalid ownership/token/SKU/option/refund/cancellation/pending/API/network cases cannot settle
PASS failed settlement never consumes; duplicate conflicts; paid replay and concurrent consumption remain idempotent

EXIT_CODE=0
DURATION_SECONDS=1.11

````

## test-supabase_tests_razorpay-routing-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/razorpay-routing-selftest.cjs
CWD: .
PASS standard entrypoint: native requests denied before writes; website checkout retained
PASS ordinary website route cannot bypass programme gates by attaching a legacy UCB body
PASS isolated test entrypoint does not import the live pricing handler; actual test handlers covered by nonplay-test-integration.ts

EXIT_CODE=0
DURATION_SECONDS=2.24

````

## test-supabase_tests_razorpay-security-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/razorpay-security-selftest.cjs
CWD: .
PASS malformed callback bodies return 400 without settlement
PASS production rejects test-mode key before provider request
PASS actual HMAC implementation accepts authentic and rejects forged/malformed signatures
PASS missing callback signature
PASS forged callback signature
PASS callback order swapped
verify-payment: not settled { reason: 'payment not captured', razorpayPaymentId: 'pay_audit0001' }
PASS authorized payment cannot unlock
verify-payment: not settled { reason: 'currency mismatch', razorpayPaymentId: 'pay_audit0001' }
PASS wrong payment currency cannot unlock
verify-payment: not settled {
  reason: 'payment/order mismatch',
  razorpayPaymentId: 'pay_audit0001'
}
PASS provider payment/order mismatch cannot unlock
verify-payment: not settled {
  reason: 'razorpay order amount mismatch',
  razorpayPaymentId: 'pay_audit0001'
}
PASS provider amount mismatch cannot unlock
verify-payment: not settled {
  reason: 'payment captured; refund queued',
  razorpayPaymentId: 'pay_audit0001'
}
PASS stored amount mismatch cannot unlock
PASS valid captured callback reaches server settlement
PASS refunded recovery is terminal without provider call or regrant
PASS recovery owner=undefined status=401
PASS recovery owner=other status=404
PASS recovery owner=buyer status=200

EXIT_CODE=0
DURATION_SECONDS=1.69

````

## test-supabase_tests_readiness-migrations-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/readiness-migrations-selftest.cjs
CWD: .
PASS SEC-02/MOB-01 migration contracts and MOB-02 conditional SQL regex fixtures (offline; SQL not executed)

EXIT_CODE=0
DURATION_SECONDS=0.15

````

## test-supabase_tests_recovery-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/recovery-selftest.cjs
CWD: .
PASS unsigned recover denied: 401
PASS wrong owner denied: 404
PASS recovery limiter fails closed before provider lookup: 429, lookups=0

EXIT_CODE=0
DURATION_SECONDS=1.61

````

## test-supabase_tests_settle-timestamp-selftest.cjs.log

````text
$ node --experimental-strip-types supabase/tests/settle-timestamp-selftest.cjs
CWD: .
settle: UCB completion timestamp missing undefined
PASS F05 missing settlement receipt cannot return success
PASS F05 authoritative capture timestamp persisted separately from receipt
PASS B01 granted marker without committed purchase stays pending
PASS B01 uncommitted capture is retryable rather than compensation
PASS F03 UCB wallet shortfall capture is reported despite refused entitlement
PASS F03 verified capture for an unknown local order is recorded and compensated

EXIT_CODE=0
DURATION_SECONDS=2.19

````

## test-website_scripts_account-verified-selftest.cjs.log

````text
$ node --experimental-strip-types website/scripts/account-verified-selftest.cjs
CWD: .
PASS AUD-020 token rejection, outage, absent SDK/user/confirmation fail visibly; confirmed user succeeds

EXIT_CODE=0
DURATION_SECONDS=0.2

````

## tooling-npm-audit.log

````text
$ npm audit --json
CWD: tooling
{
  "auditReportVersion": 2,
  "vulnerabilities": {
    "@eslint/config-array": {
      "name": "@eslint/config-array",
      "severity": "moderate",
      "isDirect": false,
      "via": [
        "minimatch"
      ],
      "effects": [],
      "range": ">=0.23.0",
      "nodes": [
        "node_modules/@eslint/config-array"
      ],
      "fixAvailable": true
    },
    "@typescript-eslint/eslint-plugin": {
      "name": "@typescript-eslint/eslint-plugin",
      "severity": "moderate",
      "isDirect": false,
      "via": [
        "@typescript-eslint/parser",
        "@typescript-eslint/type-utils",
        "@typescript-eslint/utils"
      ],
      "effects": [],
      "range": "6.16.0 - 8.72.2",
      "nodes": [
        "node_modules/@typescript-eslint/eslint-plugin"
      ],
      "fixAvailable": true
    },
    "@typescript-eslint/parser": {
      "name": "@typescript-eslint/parser",
      "severity": "moderate",
      "isDirect": false,
      "via": [
        "@typescript-eslint/typescript-estree"
      ],
      "effects": [
        "@typescript-eslint/eslint-plugin",
        "typescript-eslint"
      ],
      "range": "6.16.0 - 8.72.2",
      "nodes": [
        "node_modules/@typescript-eslint/parser"
      ],
      "fixAvailable": {
        "name": "typescript-eslint",
        "version": "8.36.0",
        "isSemVerMajor": true
      }
    },
    "@typescript-eslint/type-utils": {
      "name": "@typescript-eslint/type-utils",
      "severity": "moderate",
      "isDirect": false,
      "via": [
        "@typescript-eslint/typescript-estree",
        "@typescript-eslint/utils"
      ],
      "effects": [
        "@typescript-eslint/eslint-plugin"
      ],
      "range": "6.16.0 - 8.72.2",
      "nodes": [
        "node_modules/@typescript-eslint/type-utils"
      ],
      "fixAvailable": true
    },
    "@typescript-eslint/typescript-estree": {
      "name": "@typescript-eslint/typescript-estree",
      "severity": "moderate",
      "isDirect": false,
      "via": [
        "minimatch"
      ],
      "effects": [
        "@typescript-eslint/parser",
        "@typescript-eslint/type-utils",
        "@typescript-eslint/utils",
        "typescript-eslint"
      ],
      "range": "6.16.0 - 8.72.2",
      "nodes": [
        "node_modules/@typescript-eslint/typescript-estree"
      ],
      "fixAvailable": {
        "name": "typescript-eslint",
        "version": "8.36.0",
        "isSemVerMajor": true
      }
    },
    "@typescript-eslint/utils": {
      "name": "@typescript-eslint/utils",
      "severity": "moderate",
      "isDirect": false,
      "via": [
        "@typescript-eslint/typescript-estree"
      ],
      "effects": [
        "typescript-eslint"
      ],
      "range": "6.16.0 - 8.72.2",
      "nodes": [
        "node_modules/@typescript-eslint/utils"
      ],
      "fixAvailable": {
        "name": "typescript-eslint",
        "version": "8.36.0",
        "isSemVerMajor": true
      }
    },
    "eslint": {
      "name": "eslint",
      "severity": "moderate",
      "isDirect": true,
      "via": [
        "@eslint/config-array",
        "minimatch"
      ],
      "effects": [],
      "range": ">=10.0.0-alpha.0",
      "nodes": [
        "node_modules/eslint"
      ],
      "fixAvailable": {
        "name": "eslint",
        "version": "9.39.5",
        "isSemVerMajor": true
      }
    },
    "minimatch": {
      "name": "minimatch",
      "severity": "moderate",
      "isDirect": false,
      "via": [
        {
          "source": 1244623,
          "name": "minimatch",
          "dependency": "minimatch",
          "title": "minimatch has potential denial of service via globparts amplification",
          "url": "https://github.com/advisories/GHSA-g3hv-75wg-m249",
          "severity": "moderate",
          "cwe": [
            "CWE-405"
          ],
          "cvss": {
            "score": 0,
            "vectorString": null
          },
          "range": ">=7.0.0 <11.0.1"
        }
      ],
      "effects": [
        "@eslint/config-array",
        "@typescript-eslint/typescript-estree",
        "eslint"
      ],
      "range": "7.0.0 - 11.0.0",
      "nodes": [
        "node_modules/minimatch"
      ],
      "fixAvailable": {
        "name": "eslint",
        "version": "9.39.5",
        "isSemVerMajor": true
      }
    },
    "typescript-eslint": {
      "name": "typescript-eslint",
      "severity": "moderate",
      "isDirect": true,
      "via": [
        "@typescript-eslint/eslint-plugin",
        "@typescript-eslint/parser",
        "@typescript-eslint/typescript-estree",
        "@typescript-eslint/utils"
      ],
      "effects": [],
      "range": "<=8.72.2",
      "nodes": [
        "node_modules/typescript-eslint"
      ],
      "fixAvailable": {
        "name": "typescript-eslint",
        "version": "8.36.0",
        "isSemVerMajor": true
      }
    }
  },
  "metadata": {
    "vulnerabilities": {
      "info": 0,
      "low": 0,
      "moderate": 9,
      "high": 0,
      "critical": 0,
      "total": 9
    },
    "dependencies": {
      "prod": 1,
      "dev": 138,
      "optional": 0,
      "peer": 1,
      "peerOptional": 0,
      "total": 138
    }
  }
}

EXIT_CODE=1
DURATION_SECONDS=119.38

````

## vault-acquisition-run-tests.py.log

````text
$ python3 mobile-app/modules/medveda-offline-vault/tests/acquisition/run-tests.py
CWD: .

TIMEOUT

EXIT_CODE=124
DURATION_SECONDS=180.77

````

## vault-content-run-tests.py.log

````text
$ python3 mobile-app/modules/medveda-offline-vault/tests/content/run-tests.py
CWD: .

TIMEOUT

EXIT_CODE=124
DURATION_SECONDS=182.2

````

## vault-final-acquisition-run-tests.py.log

````text
$ python3 mobile-app/modules/medveda-offline-vault/tests/acquisition/run-tests.py
CWD: .
PASS AUD-008 dormant native streaming acquisition: authenticated ciphertext only, digest/length/expiry/key/revocation denial, input close and existing-file preservation

EXIT_CODE=0
DURATION_SECONDS=16.24

````

## vault-final-content-run-tests.py.log

````text
$ python3 mobile-app/modules/medveda-offline-vault/tests/content/run-tests.py
CWD: .
PASS content: legacy original conservation, digest/owner/expiry/tamper denial, authenticated reopen/revoke, ambiguous commit, temp storage failure, renderer disposal and restart sweep
PASS content journal halt/reopen boundary 1
PASS content journal halt/reopen boundary 2
PASS content journal halt/reopen boundary 3

EXIT_CODE=0
DURATION_SECONDS=18.53

````

## vault-final-phase1b-run-tests.py.log

````text
$ python3 mobile-app/modules/medveda-offline-vault/tests/phase1b/run-tests.py
CWD: .
PASS registry authenticates chained generations and owner key isolation
PASS missing keys never regenerate and retired owner stays denied after restart
PASS interrupted provisioning remains pending and cannot silently replace a key
PASS corrupt missing wrong-key and discontinuous registry fail closed
PASS uncertain publication poisons live state and reopens authenticated orphan
PASS native resource leases revoke epoch before cleanup and retry failures
PASS foreign session and duplicate active lease denied
PASS durable journal reopens, preserves finals, denies collisions and symlinks
PASS owner envelope substitution and registry tail corruption deny
PASS every byte mutation and truncation of first registry generation denies reopen
PASS directory flush failure preserves prior journal and requires reopen
11 Phase 1B shared-control groups passed; NOT native platform acceptance
PASS journal process-halt/reopen file: previous generation preserved; pending never ready
PASS journal process-halt/reopen link: previous generation preserved; pending never ready
PASS journal process-halt/reopen directory: previous generation preserved; pending never ready

EXIT_CODE=0
DURATION_SECONDS=17.65

````

## vault-final-run-host-tests.py.log

````text
$ python3 mobile-app/modules/medveda-offline-vault/tests/run-host-tests.py
CWD: .
PASS independent Node-generated wire fixture authenticates with native codec
PASS roundtrip verifies complete authenticated identity and exact digest
PASS all authenticated header regions reject mutation
PASS wrong owner note version length epoch and content identity fail closed
PASS chunk order lengths ciphertext tags and completion are authenticated
PASS equal-size reordered chunks and another file's valid chunks cannot substitute
PASS truncation at structural boundaries and trailing bytes are rejected
PASS every truncation and single-byte mutation of minimal container fails closed
PASS untrusted bounds invalid identities short long and nonPDF input reject
PASS fresh attempts use different wrapped keys file IDs and nonce material
PASS owner session revocation foreign sessions and stale tickets deny
PASS dedicated vault publishes ciphertext only and preserves unrelated existing data
PASS missing key short stream and write exception never publish final
PASS foreign-owner metadata is rejected before any foreign key lookup
PASS A to B to A permits only the active owner's independently keyed files
PASS revocation at durable-file boundary prevents publication and old ticket reuse
PASS fsync and publication failures retain only ciphertext and cannot report success
PASS existing target is never clobbered by atomic publication
PASS symlink roots and source entries cannot escape vault
PASS new vault root parent must be durably flushed before creation reports success
PASS threaded revocation serializes after admitted commit and denies subsequent work
HOST_DIAGNOSTIC sizeMiB=1 sealAndVerifyMs=101
HOST_DIAGNOSTIC sizeMiB=10 sealAndVerifyMs=668
HOST_DIAGNOSTIC sizeMiB=50 sealAndVerifyMs=1093
HOST_DIAGNOSTIC sizeMiB=100 sealAndVerifyMs=2155
PASS stream 1 10 50 100 MiB under 48 MiB host heap without plaintext spooling
22 focused foundation tests passed; no Android/iOS/device acceptance claimed
PASS independent Node AES-GCM codec authenticates Kotlin output
PASS restart authenticates committed/orphan ciphertext and ignores partials
PASS forced JVM halt after file: prior final unchanged; ciphertext only
PASS restart authenticates committed/orphan ciphertext and ignores partials
PASS forced JVM halt after link: prior final unchanged; ciphertext only
PASS restart authenticates committed/orphan ciphertext and ignores partials
PASS forced JVM halt after directory: prior final unchanged; ciphertext only
PASS restart authenticates committed/orphan ciphertext and ignores partials
PASS forced JVM halt after cleanup: prior final unchanged; ciphertext only

EXIT_CODE=0
DURATION_SECONDS=22.98

````

## vault-phase1b-run-tests.py.log

````text
$ python3 mobile-app/modules/medveda-offline-vault/tests/phase1b/run-tests.py
CWD: .

TIMEOUT

EXIT_CODE=124
DURATION_SECONDS=180.19

````

## vault-run-host-tests.py.log

````text
$ python3 mobile-app/modules/medveda-offline-vault/tests/run-host-tests.py
CWD: .

TIMEOUT

EXIT_CODE=124
DURATION_SECONDS=180.77

````

## wallet-expiry-repro.log

````text
{"reproduced": true, "actual_available": 0.00, "expected_available": 100}

EXIT_CODE=0

````

## website-links.log

````text
$ node scripts/check-links.mjs
CWD: website
OK: 17 pages checked, no problems

EXIT_CODE=0
DURATION_SECONDS=0.31

````

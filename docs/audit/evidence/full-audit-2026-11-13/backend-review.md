# Backend read-only audit — 2026-11-13

Status: assigned canonical backend source and complete migration-chain review finished; additional archived schema/setup evidence is being consolidated. No code, schema, deployment, user data, payment or cron changes performed. Production metadata is observed state, not inferred from repository migration names. No PII tables were selected; cron command/secret fields were excluded.

Read first: historical MEDVEDA_AUDIT_FIX_1_20261026.md and git show 8a6161f^:docs/audit/MEDVEDA_BUGFIX_FINAL_2026-10-27.md. Prior backend body-shape fixes are present locally but absent in deployed Play entrypoints. Existing server grant, signed-URL, free quiz/video policy decisions were retained.

## Confirmed deployed drift / findings

BACK-01 | High | Refund safety forward migration not deployed. Current supabase/migrations/20261112104610_audit_batch1_refund_revocation.sql adds reverse_refunded_capture and queue_capture_compensation and changes settlement to call reverse_payment before marking a reversal. Production pg_proc has neither helper; production settle_razorpay_payment reversal branch only marks order/capture, while user_can_access_note still accepts purchase success without consulting refunded order/reversed capture. Scenario: an existing successful purchase remains after a reversal marker is written (or historical missed reversal); URL authority can still allow the paid PDF. This is a proven rule inconsistency, not proof of affected live users. Proposal: reviewed migration before corresponding verifier/webhook bundles; stage reversal/capture retry ordering; inspect only aggregate contradictions. Diff: + perform reverse_payment(payment_id,classified_status,restore_wallet); + reject successful purchases whose order/capture is reversed.

BACK-02 | High | Deployed webhook acknowledges reversal events before durable application. Retrieved active razorpay-webhook v51 bundles functions/_shared/settle.ts (7211 bytes); settleRefund/settleDispute return ok:true for any RPC status, including unknown_payment. Live handler returns 204 on that result. It never calls record_provider_event. Scenario: refund or lost dispute arrives before local payment linkage; unknown_payment is ACKed and there is no durable inbox retry. A later capture may grant without the earlier fact. Current source explicitly rejects unknown outcomes and records inbox first. Proposal diff: + durable HMAC-verified inbox before provider calls; + whitelist accepted reversal outcomes; - ACK unknown_payment. Evidence backend-deployed-razorpay-webhook.json, backend-live-sensitive-rpcs.json.

BACK-03 | High | Recovery operations are not active. Production cron metadata shows play-catalog-sync, play-consume, play-reconcile, play-voids all active=false; no ucb-* jobs and no deployed report-external-transaction function. Source SQL can enqueue payment_compensations, but its refund processor lives in missing report-external-transaction. Scenario: capture receives compensation_pending (duplicate/late invalid discount etc.); application reports pending but no scheduled refund processor runs; paid-token refund/void reconciliation also cannot run on cadence. This is deployment readiness, not permission to enable jobs immediately. Proposal diff: + qualify and deploy exact workers; + approved schedules and monitored age/parked/error thresholds. No live charge or backlog rows inspected.

BACK-04 | High | UCB checkout route is absent from production. Local create-order-play-choice, attach-external-token and report-external-transaction exist/configured but are absent from live list_edge_functions. Live create-order is an older implementation with no UCB binding/platform gates; live create-play-order lacks notesChoiceAllowed. Scenario: current native UCB flow invokes missing routes and fails; direct legacy Razorpay route does not enforce current routing policy. Header routing is not platform attestation even after deploy. Proposal diff: + deploy reviewed complete checkout/reporting bundle and required migration ordering; + exercise default Play and enrolled UCB paths with licensed internal testers.

BACK-05 | High | Deployed targeted notification privacy guard is absent. Active send-push-notification v51 accepts targetUserIds and filters push tokens, but inserts {title,body,type,active:true} into global notifications. Live notifications policy permits active rows to anon/auth, so targeted message text becomes publicly readable in feed. Current source rejects targetUserIds before insert. Scenario: an admin sends account/payment-specific targeted text; everyone can read it from notifications. Proposal diff: - accept targeted send against broadcast table; + return 400 before persistence (existing local guard). Device delivery unnecessary to establish feed exposure; no private notification records were read.

BACK-06 | High | Mandatory admin MFA remains disabled and deployed push handler cannot honor enabling it. Production admin_settings.require_mfa=false; am_i_admin permits password-only admins. Retrieved live push source checks admins membership only, whereas local send-push-notification reads admin_settings and verifies same-token aal2. Scenario: enabling DB MFA alone still leaves live service-role push sender callable with a password-only admin JWT. Proposal diff: + qualify admin enrollment/recovery; + deploy push handler MFA guard; + owner-approved set_admin_mfa_required(true) and AAL1 denial/AAL2 success acceptance. Current setting is explicitly designed as an operator switch, so no claim of a code bypass of an enabled DB policy.

BACK-07 | Medium | Historical F15 malformed-body fix is not deployed. Active create-play-order v3 and verify-play-purchase v3 use const body=await req.json() then body.productId without rejecting null. JSON null causes TypeError outside handler catch (verify Play before try), yielding platform 500 rather than deterministic 400. Current source at create-play-order/index.ts:11 and verify-play-purchase/index.ts:12 fixes shape. Proposal diff: + validate non-null plain object before property reads; + deploy exact qualified files. Never invoke paid flow to reproduce: synthetic handler/unit input null suffices.

BACK-08 | Medium | Identity retention cron remains absent. purge_expired_first_purchase_identities is service-only and migration documents fixed 180-day retention, but live cron list contains no first-purchase-identity-retention job. Scenario: hashes/account identity rows are never automatically purged at promised cutoff. No record ages/counts queried; overdue data unproven. Proposal diff: + owner-approved retention cadence and monitored completion; + validate cutoff and legal wording first. Existing analytics/payment-session purge jobs are active and do not purge these rows.

BACK-09 | Medium | Worker timing guarantee is mathematically false. _shared/paymentQueue.ts comment bounds ceil(40/8)*15=75 seconds against cron 90 seconds, but each events capture job serially calls fetchPayment and fetchRazorpayOrder (30 seconds worst-case before SQL/reporting), and refunds/compensation add more provider calls. report-external-transaction processes 40 at concurrency8; just two 15-second calls gives 150 seconds. Scenario: slow successful provider responses exhaust cron request timeout before final lease/accounting, causing retries and optimistic drain estimates. Proposal diff: + bound total invocation budget; + budget jobs by full path request count or reduce batch; + test delayed multi-call jobs/lease expiry. No provider call made.

## Production table/RLS matrix

S/I/U/D below are table-level SQL privileges; RLS predicates further restrict rows. Quiz SELECT is intentionally column-only, therefore table-level S=false even though metadata columns are readable. Service role is privileged; no exposed table without RLS was found.

| Table | RLS | anon SELECT | auth SQL S/I/U/D | policy boundary |
|---|---|---|---|---|
| admin_settings | True | False | -/-/-/- | No client policy; service only |
| admins | True | False | Y/-/-/- | admins_admin_only:ALL |
| analytics_events | True | False | Y/Y/-/- | analytics_insert_own_or_anon:INSERT |
| app_config | True | True | Y/Y/Y/Y | app_config_admin_delete:DELETE; app_config_admin_insert:INSERT; app_config_admin_update:UPDATE; app_config_public_read:SELECT |
| app_settings | True | False | Y/Y/Y/Y | app_settings_admin_update:UPDATE; public read app_settings:SELECT |
| chapters | True | False | Y/Y/Y/Y | chapters_admin_write:ALL; chapters_public_read_active:SELECT; chapters_published_ancestry:SELECT restrictive |
| courses | True | True | Y/Y/Y/Y | courses_admin_write:ALL; courses_public_read_active:SELECT |
| first_discount_reservations | True | False | -/-/-/- | No client policy; service only |
| first_purchase_identities | True | False | -/-/-/- | No client policy; service only |
| nonplay_test_attempts | True | False | -/-/-/- | No client policy; service only |
| nonplay_test_audit | True | False | -/-/-/- | No client policy; service only |
| nonplay_test_checkouts | True | False | -/-/-/- | No client policy; service only |
| nonplay_test_config | True | False | -/-/-/- | No client policy; service only |
| nonplay_test_entitlements | True | False | -/-/-/- | No client policy; service only |
| nonplay_test_notes | True | False | -/-/-/- | No client policy; service only |
| nonplay_test_orders | True | False | -/-/-/- | No client policy; service only |
| nonplay_test_products | True | False | -/-/-/- | No client policy; service only |
| nonplay_test_users | True | False | -/-/-/- | No client policy; service only |
| nonplay_test_webhooks | True | False | -/-/-/- | No client policy; service only |
| note_pdf_validation_jobs | True | False | -/-/-/- | No client policy; service only |
| note_upload_requests | True | False | -/-/-/- | No client policy; service only |
| notes | True | False | Y/Y/Y/Y | notes_admin_write:ALL; notes_public_read_active:SELECT; notes_published_ancestry:SELECT restrictive |
| notes_choice_checkouts | True | False | -/-/-/- | No client policy; service only |
| notifications | True | True | Y/Y/Y/Y | notifications_admin_write:ALL; notifications_public_read_active:SELECT |
| order_review_flags | True | False | Y/-/-/- | order_review_flags_admin_select:SELECT |
| orders | True | False | Y/-/-/- | orders_select_own_or_admin:SELECT |
| payment_captures | True | False | -/-/-/- | No client policy; service only |
| payment_compensations | True | False | -/-/-/- | No client policy; service only |
| payment_jobs | True | False | -/-/-/- | No client policy; service only |
| payment_sessions | True | False | Y/-/-/- | payment_sessions_select_own:SELECT |
| payments | True | False | Y/-/-/- | Users can view own payments:SELECT; payments_admin_read:SELECT |
| play_payment_jobs | True | False | -/-/-/- | No client policy; service only |
| play_price_sync | True | False | Y/-/-/- | admin_read_play_sync:SELECT |
| play_price_sync_logs | True | False | -/-/-/- | No client policy; service only |
| play_price_tiers | True | False | Y/-/-/- | admin_read_play_tiers:SELECT |
| play_recovery_cursor | True | False | -/-/-/- | No client policy; service only |
| play_void_sweep_state | True | False | -/-/-/- | No client policy; service only |
| play_void_tokens | True | False | -/-/-/- | No client policy; service only |
| products | True | False | Y/Y/Y/Y | products_admin_write:ALL; products_public_read_active:SELECT; products_published_ancestry:SELECT restrictive |
| profiles | True | False | Y/-/Y/- | profiles_admin_all:ALL; profiles_select_own_or_admin:SELECT; profiles_update_own:UPDATE |
| provider_events | True | False | -/-/-/- | No client policy; service only |
| purchases | True | False | Y/-/-/- | purchases_select_own_or_admin:SELECT |
| push_tokens | True | False | Y/Y/Y/Y | push_tokens_own:ALL |
| quiz_scores | True | False | Y/Y/Y/Y | quiz_scores_own_or_admin:ALL |
| quiz_tests | True | False | -/Y/Y/Y | quiz_tests_admin_write:ALL; quiz_tests_public_read_active:SELECT; quiz_tests_published_ancestry:SELECT restrictive |
| rate_limits | True | False | -/-/-/- | No client policy; service only |
| razorpay_webhook_events | True | False | Y/-/-/- | No client policy; service only |
| referral_settings | True | False | Y/-/Y/- | referral_settings_admin_write:ALL; referral_settings_read_authenticated:SELECT |
| referral_settings_audit | True | False | Y/-/-/- | referral_settings_audit_admin_read:SELECT |
| referrals | True | False | Y/-/-/- | referrals_admin_write:ALL |
| subjects | True | False | Y/Y/Y/Y | subjects_admin_write:ALL; subjects_public_read_active:SELECT; subjects_published_ancestry:SELECT restrictive |
| ucb_external_refunds | True | False | -/-/-/- | No client policy; service only |
| verified_quiz_attempts | True | False | Y/-/-/- | verified_quiz_attempts_read:SELECT |
| videos | True | False | Y/Y/Y/Y | videos_admin_write:ALL; videos_public_read_active:SELECT; videos_published_ancestry:SELECT restrictive |
| wallet_ledger | True | False | Y/-/-/- | wallet_ledger_select_admin:SELECT; wallet_ledger_select_own:SELECT |
| wallet_order_reservations | True | False | -/-/-/- | No client policy; service only |
| years | True | True | Y/Y/Y/Y | years_admin_write:ALL; years_public_read_active:SELECT |

Complete predicates are in backend-policies.json. Owner: auth.uid() equals row owner; admin: am_i_admin() with configured MFA rule. Content uses has_content_access plus restrictive content_is_published ancestry. Financial tables are client read-only; private queues/config/identities have no client grants/policies. profiles self-update is constrained by profiles_before_write protected-field/phone checks. verified_quiz_attempts is owner/admin read-only, scored by authenticated RPC. quiz_scores remains legacy owner-write data and is not verified server scoring.

## Production function EXECUTE matrix

| Function(signature) | definer | anon | authenticated | service role |
|---|---|---|---|---|
| accounts_share_network(p_a uuid, p_b uuid) | True | False | False | True |
| admin_mfa_required() | True | False | False | True |
| admin_reject_referral(p_referral_id uuid, p_reason text) | True | False | True | True |
| admin_resolve_order_flag(p_flag_id uuid, p_note text) | True | False | True | True |
| admin_reverse_wallet_credit(p_ledger_id uuid, p_note text) | True | False | True | True |
| admin_set_order_status(p_order_id text, p_status text) | True | False | True | True |
| am_i_admin() | True | True | True | True |
| analytics_events_rate_limit() | True | False | False | True |
| app_config_touch_updated_at() | False | False | False | True |
| apply_referral_code(p_code text) | True | False | True | True |
| attach_ucb_external_token(p_user_id uuid, p_order_id text, p_token text) | True | False | False | True |
| backfill_auth_user_profile(p_user_id uuid) | True | False | False | False |
| bind_ucb_razorpay_order(p_user_id uuid, p_choice_id text, p_razorpay_id text, p_buyer_state text) | True | False | False | True |
| block_client_writes() | True | False | False | True |
| bump_quiz_question_revision() | False | False | False | True |
| change_my_phone(p_phone text) | True | False | True | True |
| chapters_derive_course() | True | False | False | True |
| chapters_propagate_course_move() | True | False | False | True |
| claim_note_pdf_validation() | True | False | False | True |
| claim_payment_jobs(p_kind text, p_limit integer) | True | False | False | True |
| claim_play_payment_jobs(p_kind text, p_limit integer) | True | False | False | True |
| claim_play_price_sync() | True | False | False | True |
| claim_play_recovery_cursor() | True | False | False | True |
| claim_play_void_sweep() | True | False | False | True |
| claim_ucb_external_refund(p_refund_id text) | True | False | False | True |
| content_is_published(p_course_id text, p_year_id text, p_subject_id text, p_chapter_id text) | True | False | True | True |
| create_play_order(p_user_id uuid, p_product_id text) | True | False | False | True |
| create_priced_order(p_user_id uuid, p_product_id text, p_use_wallet boolean) | True | False | False | True |
| create_priced_order_legacy(p_user_id uuid, p_product_id text, p_use_wallet boolean) | True | False | False | False |
| delete_my_account() | True | False | True | True |
| enqueue_payment_jobs() | True | False | False | True |
| enqueue_play_payment_jobs() | True | False | False | True |
| erase_user_data(p_user_id uuid) | True | False | False | True |
| fail_play_price_sync(p_price numeric, p_lease uuid, p_reason text, p_retry boolean) | True | False | False | True |
| finish_note_pdf_validation(p_request_id uuid, p_lease uuid, p_outcome text, p_error text) | True | False | False | True |
| finish_payment_job(p_kind text, p_target_id text, p_lease_id uuid, p_success boolean, p_error text) | True | False | False | True |
| finish_play_payment_job(p_kind text, p_order_id text, p_lease_id uuid, p_success boolean, p_error text) | True | False | False | True |
| finish_play_price_sync(p_price numeric, p_lease uuid, p_sku text, p_option text) | True | False | False | True |
| finish_play_recovery_cursor(p_lease_id uuid, p_success boolean, p_next_page_token text, p_error text) | True | False | False | True |
| generate_unique_referral_code(p_length integer) | True | False | False | True |
| get_admin_quiz_tests(p_course_id text, p_year_id text) | True | False | True | True |
| get_maintenance_mode() | True | True | True | True |
| get_my_play_fulfillment(p_order_id text) | True | False | True | True |
| get_my_referral_list() | True | False | True | True |
| get_my_referrals() | True | False | True | True |
| get_my_wallet() | True | False | True | True |
| get_public_quiz_tests(p_subject_id text, p_test_id text) | True | False | True | True |
| grant_razorpay_payment(p_event_id text, p_razorpay_order_id text, p_razorpay_payment_id text, p_amount_paise bigint) | True | False | False | True |
| guard_purchase_success_ownership() | True | False | False | True |
| guard_razorpay_order_transition() | True | False | False | True |
| handle_new_user() | True | False | False | True |
| handle_payment_dispute(p_razorpay_payment_id text, p_outcome text) | True | False | False | True |
| handle_payment_refund(p_razorpay_payment_id text, p_full_refund boolean) | True | False | False | True |
| has_content_access(p_course_id text, p_year_id text) | True | False | True | True |
| has_prior_purchase_identity(p_uid uuid) | True | False | False | True |
| identity_hash(p_kind text, p_value text) | False | False | False | True |
| is_admin_account() | True | False | True | True |
| log_referral_settings_change() | True | False | False | True |
| mark_ucb_report_attempt(p_order_id text, p_refund boolean) | True | False | False | True |
| my_course_id() | True | False | True | True |
| my_year_id() | True | False | True | True |
| nonplay_test_attach_order(p_user uuid, p_order uuid, p_provider text) | True | False | False | True |
| nonplay_test_immutable_order() | False | False | False | True |
| nonplay_test_observe_payment(p_order uuid, p_payment text, p_status text, p_amount integer, p_currency text, p_provider text, p_created timestamp with time zone) | True | False | False | True |
| nonplay_test_prepare_order(p_user uuid, p_product text, p_key uuid, p_key_id text) | True | False | False | True |
| nonplay_test_product_allowed(p_user uuid, p_product text) | True | False | False | True |
| nonplay_test_quote(p_user uuid, p_product text) | True | False | False | True |
| nonplay_test_user_allowed(p_user uuid) | True | False | False | True |
| normalize_phone(input text) | False | True | True | True |
| notes_derive_course() | True | False | False | True |
| orders_derive_course() | True | False | False | True |
| orders_entitlement_immutable() | False | False | False | True |
| orders_guard_client_writes() | True | False | False | True |
| orders_immutable_columns() | False | False | False | True |
| orders_play_option_immutable() | False | False | False | True |
| orders_reserve_first_discount() | True | False | False | True |
| orders_snapshot_tax() | True | False | False | True |
| play_entitlement_committed(p_order_id text, p_token text) | True | False | False | True |
| play_notes_product_eligible(p products) | True | False | True | True |
| play_price_has_eligible_product(p_price numeric) | True | False | False | True |
| play_purchase_entitlement_from_order() | True | False | False | True |
| prepare_notes_choice_checkout(p_user_id uuid, p_choice_id text, p_product_id text, p_use_wallet boolean, p_buyer_state text) | True | False | False | True |
| products_derive_course() | True | False | False | True |
| profiles_before_write() | True | False | False | True |
| profiles_generate_referral_code() | True | False | False | True |
| profiles_temp_default_course() | True | False | False | True |
| purge_expired_first_purchase_identities() | True | False | False | True |
| purge_old_analytics_events() | True | False | False | True |
| purge_old_payment_sessions() | True | False | False | True |
| push_tokens_cap() | True | False | False | True |
| queue_notes_play_price() | True | False | False | True |
| queue_play_price_sync(p_price numeric) | True | False | False | True |
| queue_product_play_price() | True | False | False | True |
| quiz_scores_own_email() | True | False | False | True |
| quiz_scores_rate_limit() | True | False | False | True |
| quiz_tests_derive_course() | True | False | False | True |
| quote_my_order(p_product_id text, p_use_wallet boolean) | True | False | True | True |
| quote_my_order_legacy(p_product_id text, p_use_wallet boolean) | True | False | False | False |
| rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer) | True | False | False | True |
| razorpay_entitlement_committed(p_order_id text, p_payment_id text) | True | False | False | True |
| razorpay_purchase_entitlement_from_order() | True | False | False | True |
| record_notes_choice_authorization(p_order_id text, p_provider_time timestamp with time zone) | True | False | False | True |
| record_payment_capture(p_payment_id text, p_razorpay_order_id text, p_amount_paise bigint, p_provider_time timestamp with time zone) | True | False | False | True |
| record_play_void_tokens(p_tokens text[]) | True | False | False | True |
| record_provider_event(p_event_id text, p_event_type text, p_razorpay_order_id text, p_payment_id text, p_provider_object_id text, p_payload_hash text, p_provider_time timestamp with time zone) | True | False | False | True |
| record_purchase_identity(p_uid uuid) | True | False | False | True |
| register_push_token(p_token text, p_platform text) | True | False | True | True |
| release_due_wallet_credits(p_user uuid) | True | False | False | True |
| requeue_stale_play_price_sync() | True | False | False | True |
| reserve_note_pdf_validation(p_request_id uuid, p_admin uuid, p_hash text, p_bytes bigint, p_url text) | True | False | False | True |
| retry_play_price_sync(p_price numeric) | True | False | True | True |
| reverse_payment(p_razorpay_payment_id text, p_purchase_status text, p_restore_wallet boolean) | True | False | False | True |
| reverse_play_payment(p_purchase_token text) | True | False | False | True |
| rls_auto_enable() | True | False | False | True |
| rotate_play_price_sku(p_price numeric, p_lease uuid, p_reason text) | True | False | False | True |
| save_note_with_upload(p_request_id uuid, p_note_id text, p_title text, p_description text, p_chapter_id text, p_order integer, p_active boolean, p_is_free_preview boolean) | True | False | True | True |
| set_admin_mfa_required(p_required boolean) | True | False | False | True |
| set_my_course_year(p_course_id text, p_year_id text) | True | False | True | True |
| settle_play_purchase(p_user_id uuid, p_order_id text, p_product_id text, p_play_sku text, p_purchase_token text, p_paid_at timestamp with time zone) | True | False | False | True |
| settle_razorpay_payment(p_event_id text, p_razorpay_order_id text, p_razorpay_payment_id text, p_amount_paise bigint, p_paid_at timestamp with time zone) | True | False | False | True |
| settle_razorpay_payment_legacy(p_event_id text, p_razorpay_order_id text, p_razorpay_payment_id text, p_amount_paise bigint, p_paid_at timestamp with time zone) | True | False | False | False |
| subjects_derive_course() | True | False | False | True |
| subjects_propagate_course_move() | True | False | False | True |
| submit_quiz_attempt(p_attempt_id text, p_test_id text, p_question_revision bigint, p_answers jsonb) | True | False | True | True |
| sync_profile_email() | True | False | False | True |
| sync_profile_mobile_verified() | True | False | False | True |
| sync_profile_phone_normalized() | False | False | False | True |
| touch_profile_updated_at() | False | False | False | True |
| user_can_access_note(p_user uuid, p_note_id text) | True | False | False | True |
| user_can_access_note_with_aal(p_user uuid, p_note_id text, p_aal text) | True | False | False | True |
| user_can_access_video(p_user uuid, p_video_id text) | True | False | False | True |
| user_can_access_video_with_aal(p_user uuid, p_video_id text, p_aal text) | True | False | False | True |
| user_owns_chapter(p_chapter_id text) | True | True | True | True |
| videos_derive_course() | True | False | False | True |
| wallet_balance_of(p_user uuid) | True | False | False | True |
| wallet_ledger_append_only() | False | False | False | True |
| wallet_ledger_no_overdraw() | True | False | False | True |
| wallet_ledger_no_truncate() | False | False | False | True |
| years_before_write() | True | False | False | True |
| years_propagate_course_move() | True | False | False | True |

No anon/auth execution is granted on settlement, capture, compensation, reversal, wallet mutation, rate-limit, private note entitlement helper or worker-lease routines. User RPCs use verified auth.uid(); admin RPCs require am_i_admin. am_i_admin/get_maintenance_mode/normalize_phone/user_owns_chapter are the anon callable public functions in retrieved inventory. Legacy settlement/pricing functions have service execution revoked and are reachable only through privileged wrappers. Trigger functions are not direct client API mutations.

## Security metadata and manual checks

Observed require_mfa=false. Play workers/catalog jobs inactive. Identity retention and all UCB jobs absent. Buckets: notes private 52428800 bytes application/pdf; note-quarantine private 52428800 bytes application/pdf; nonplay-test-notes private 10485760 bytes application/pdf; thumbnails public size/MIME unrestricted. Full storage policies and column grants preserved in backend-live-security-metadata.json. Auth server password/rate settings unsupported by available connector: check dashboard Auth > Security and Rate Limits or read-only config diff; do not infer server policy from local config.toml. Provider Console permission, actual payment/refund, signed URL issuance, SMTP/delivery, push delivery, deployed environment secrets remain untested.

## Coverage checkpoint

All canonical supabase/functions files have now been read in complete tool output. Current function modules are ~60 paths; reviewed manifest records exact paths. Complete78-file migration review is recorded in the final coverage statement and merged ledger below; the initial checkpoint has been superseded. Root is independently executing all migrations/SQL suites in disposable PG17. No tests were run against production.

## Effective production role × operation matrix

Legend: S/I/U/D; columns describe effective RLS authority after SQL grants, not just ACL. O=own row; A=admin membership with configured MFA; C=published allowed course scope; P=public. Admin is authenticated + am_i_admin, not a separate SQL role. Table-wide restrictions do not prevent an independently validated SECURITY DEFINER RPC. Service denotes SQL CRUD grants with BYPASSRLS.

| Table | anon | authenticated student | authenticated admin | service role | predicate / RPC caveat |
|---|---|---|---|---|---|
| admin_settings | - | - | - | S/I/U/D | No client policy |
| admins | - | - | S(A) | S/I/U/D | admins_admin_only |
| analytics_events | I(user_id=NULL) | I(O or user_id=NULL) | I(O or NULL) | S/I/U/D | analytics_insert_own_or_anon |
| app_config | S(P) | S(P) | S/I/U/D(A) | S/I/U/D | app_config_admin_delete; app_config_admin_insert; app_config_admin_update; app_config_public_read |
| app_settings | - | S(signed-in) | S/U(A) | S/I/U/D | app_settings_admin_update; public read app_settings |
| chapters | - | S(C) | S/I/U/D(A) | S/I/U/D | chapters_admin_write; chapters_public_read_active; chapters_published_ancestry |
| courses | S(active) | S(active) | S/I/U/D(A) | S/I/U/D | courses_admin_write; courses_public_read_active |
| first_discount_reservations | - | - | - | S/I/U/D | No client policy |
| first_purchase_identities | - | - | - | S/I/U/D | No client policy |
| nonplay_test_attempts | - | - | - | S/I/U/D | No client policy |
| nonplay_test_audit | - | - | - | S/I/U/D | No client policy |
| nonplay_test_checkouts | - | - | - | S/I/U/D | No client policy |
| nonplay_test_config | - | - | - | S/I/U/D | No client policy |
| nonplay_test_entitlements | - | - | - | S/I/U/D | No client policy |
| nonplay_test_notes | - | - | - | S/I/U/D | No client policy |
| nonplay_test_orders | - | - | - | S/I/U/D | No client policy |
| nonplay_test_products | - | - | - | S/I/U/D | No client policy |
| nonplay_test_users | - | - | - | S/I/U/D | No client policy |
| nonplay_test_webhooks | - | - | - | S/I/U/D | No client policy |
| note_pdf_validation_jobs | - | - | - | S/I/U/D | No client policy |
| note_upload_requests | - | - | - | S/I/U/D | No client policy |
| notes | - | S(C) | S/I/U/D(A) | S/I/U/D | notes_admin_write; notes_public_read_active; notes_published_ancestry |
| notes_choice_checkouts | - | - | - | S/I/U/D | No client policy |
| notifications | S(active) | S(active) | S/I/U/D(A) | S/I/U/D | notifications_admin_write; notifications_public_read_active |
| order_review_flags | - | - | S(A) | S/I/U/D | order_review_flags_admin_select |
| orders | - | S(O) | S(A) | S/I/U/D | orders_select_own_or_admin |
| payment_captures | - | - | - | S/I/U/D | No client policy |
| payment_compensations | - | - | - | S/I/U/D | No client policy |
| payment_jobs | - | - | - | S/I/U/D | No client policy |
| payment_sessions | - | S(O) | S(A) | S/I/U/D | payment_sessions_select_own |
| payments | - | S(O) | S(A) | S/I/U/D | Users can view own payments; payments_admin_read |
| play_payment_jobs | - | - | - | S/I/U/D | No client policy |
| play_price_sync | - | - | S(A) | S/I/U/D | admin_read_play_sync |
| play_price_sync_logs | - | - | - | S/I/U/D | No client policy |
| play_price_tiers | - | - | S(A) | S/I/U/D | admin_read_play_tiers |
| play_recovery_cursor | - | - | - | S/I/U/D | No client policy |
| play_void_sweep_state | - | - | - | S/I/U/D | No client policy |
| play_void_tokens | - | - | - | S/I/U/D | No client policy |
| products | - | S(C) | S/I/U/D(A) | S/I/U/D | products_admin_write; products_public_read_active; products_published_ancestry |
| profiles | - | S/U(O, protected-field trigger) | S/U(A) | S/I/U/D | profiles_admin_all; profiles_select_own_or_admin; profiles_update_own |
| provider_events | - | - | - | S/I/U/D | No client policy |
| purchases | - | S(O) | S(A) | S/I/U/D | purchases_select_own_or_admin |
| push_tokens | - | S/I/U/D(O) | S/I/U/D(A) | S/I/U/D | push_tokens_own |
| quiz_scores | - | S/I/U/D(O,legacy unverified) | S/I/U/D(A) | S/I/U/D | quiz_scores_own_or_admin |
| quiz_tests | - | S(metadata columns,C); question RPC | S(metadata)/I/U/D(A); full admin RPC | S/I/U/D | quiz_tests_admin_write; quiz_tests_public_read_active; quiz_tests_published_ancestry |
| rate_limits | - | - | - | S/I/U/D | No client policy |
| razorpay_webhook_events | - | - | - | S/I/U/D | No client policy |
| referral_settings | - | S(signed-in) | S/U(A) | S/I/U/D | referral_settings_admin_write; referral_settings_read_authenticated |
| referral_settings_audit | - | - | S(A) | S/I/U/D | referral_settings_audit_admin_read |
| referrals | - | - | S(A) | S/I/U/D | referrals_admin_write |
| subjects | - | S(C) | S/I/U/D(A) | S/I/U/D | subjects_admin_write; subjects_public_read_active; subjects_published_ancestry |
| ucb_external_refunds | - | - | - | S/I/U/D | No client policy |
| verified_quiz_attempts | - | S(O) | S(A) | S/I/U/D | verified_quiz_attempts_read |
| videos | - | S(C) | S/I/U/D(A) | S/I/U/D | videos_admin_write; videos_public_read_active; videos_published_ancestry |
| wallet_ledger | - | S(O) | S(A) | S/I/U/D | wallet_ledger_select_admin; wallet_ledger_select_own |
| wallet_order_reservations | - | - | - | S/I/U/D | No client policy |
| years | S(active course+year) | S(active course+year) | S/I/U/D(A) | S/I/U/D | years_admin_write; years_public_read_active |

Service trigger validation still applies. notes PDF URL/object path metadata is visible under C but private object bytes require the URL Edge Function; quiz questions/answers are not granted as table SELECT. get_public_quiz_tests strips answers; admin RPC checks am_i_admin. Financial writes are RPC/server-only even for authenticated admins. All 57 public tables have RLS enabled.

Public RPC correction: anon EXECUTE includes user_owns_chapter(text), in addition to am_i_admin(), get_maintenance_mode(), normalize_phone(text). user_owns_chapter uses auth.uid() and cannot select another owner. No arbitrary-user access helper is anon callable.

## Finding evidence and concrete diff proposals

These are proposals only. All current-source fixes that already exist must be deployed as a coherent reviewed bundle, after their dependencies. No instruction below authorizes production mutation. Deployed source line numbers refer to the named source entry inside `backend-deployed-*.json`, not to the unrelated current tree's line numbers.

### BACK-01 — High — Deployed refund markers can disagree with PDF authority

Locations: `supabase/migrations/20261109100000_billing_settlement_recovery.sql:120` (live settlement definition), `supabase/migrations/20261020110000_admin_url_mfa.sql:23` (live note helper), pending fix `supabase/migrations/20261112104610_audit_batch1_refund_revocation.sql:167` and `:216`. Observed live function definitions in `backend-live-sensitive-rpcs.json`; pending migration absent from `backend-migrations.json`.

```sql
-- live settlement reversal path:
if v_reason is not null then
  update public.orders set status=case when v_reversal then 'refunded' else 'paid' end ...;
  update public.payment_captures set status=case when v_reversal then 'reversed' else 'compensation_pending' end ...;
-- live paid-PDF predicate:
where p.user_id = p_user and p.status = 'success'
```

Root cause: terminal payment/capture state and purchase revocation are separate in the deployed function. The paid-PDF predicate ignores order/capture disposition. A historical missed reversal or reversal-only marker can preserve `purchases.status='success'`. Actual affected production rows were not selected. Existing local fix is forward-only and service-role-only.

```diff
 if v_reason is not null then
+  if v_reversal then
+    perform public.reverse_payment(payment_id, classified_refund_or_chargeback, restore_wallet_only_for_refund);
+  end if;
 -- update terminal order and capture in same transaction
 ... paid-PDF purchase predicate ...
+and not exists(select 1 from orders o left join payment_captures pc
+  on pc.payment_id=o.razorpay_payment_id where o.id=p.order_id
+  and (o.status='refunded' or pc.status in ('reversed','compensated')))
```

Manual acceptance: in disposable staging, existing success purchase → full refund/lost dispute before/after capture; paid URL denied immediately after committed reversal; duplicate deliveries do not double restore wallet/reward; partial refund/won dispute retain correct access.

### BACK-02 — High — Live reversal webhook ACKs unlinked outcomes without inbox

Locations: deployed `functions/_shared/settle.ts:102` and `:137`, deployed `functions/razorpay-webhook/index.ts:147`, `:167`, `:205`; current correction `supabase/functions/razorpay-webhook/index.ts:153` and `supabase/functions/_shared/settle.ts:218`.

```ts
// deployed helper accepts every RPC return, including unknown_payment:
return { ok: true, outcome: String(data?.status ?? 'unknown') };
// deployed capture handler also ACKs missing/mismatched local evidence:
if (result.status === 404 || result.status === 400) return response(204);
```

Root cause: provider redelivery is stopped even when no reversal has been linked/applied. No live `record_provider_event` call exists in the retrieved bundle. A reversal delivered before capture linkage is acknowledged; subsequent capture cannot consult a durable earlier reversal fact. A capture with missing/mismatched local evidence can also be discarded. No actual production event loss is claimed.

```diff
+await recordVerifiedProviderInbox(rawBodyHash, eventId, providerIdentity);
 const result = await handle_payment_refund(...);
-return {ok:true,outcome:String(result.status)};
+if (!acceptedReversalOutcomes.has(result.status)) return retryable503;
+await markOnlyThisInboxEventApplied(eventId);
-if (result.status === 404 || result.status === 400) return response(204);
+return response(500); // keep delivery/reconciliation retryable
```

Manual acceptance: deliver refund/lost-dispute before capture linkage, crash after inbox commit, retry after provider outage, unknown provider states and duplicate event ID with conflicting hash.

### BACK-03 — High — Financial recovery workers are inactive or missing

Locations: `supabase/play_payment_cron_setup.sql:22`, `supabase/ucb_cron_setup.sql:29`, `supabase/functions/report-external-transaction/index.ts:85`; observed `backend-live-security-metadata.json:1` cron projection and `backend-edge-functions.json:1`.

```json
{"jobname":"play-consume","active":false}
{"jobname":"play-reconcile","active":false}
{"jobname":"play-voids","active":false}
{"jobname":"play-catalog-sync","active":false}
```

No `ucb-*` jobs and no `report-external-transaction` deployment exist in retrieved inventories. SQL can enqueue `payment_compensations`; its automatic provider-refund loop is in the missing worker. A successful capture that cannot grant may remain pending without its intended compensation processor. Play refund/void and consumption recovery lack scheduled execution. An external scheduler was not inspected, so this does not prove that no out-of-repository automation exists.

```diff
 -- after provider permissions, staging acceptance and owner approval:
+deploy exact reviewed recovery worker bundles with current SQL dependencies
+schedule approved consume/reconcile/void/report/refund/compensation/event phases
+monitor oldest deadline, parked/error count, cursor lag and actual completion
```

Manual check: name/schedule/active and last-success metadata only, no secret-bearing cron commands; test dropped callbacks/consumption response/voids/compensation in licensed staging. Do not simply enable jobs before provider/catalog qualification.

### BACK-04 — High — Current UCB route cannot run against deployed functions

Locations: `supabase/functions/create-order-play-choice/index.ts:1`, `supabase/functions/attach-external-token/index.ts:1`, `supabase/functions/report-external-transaction/index.ts:1`, `supabase/functions/_shared/createOrderHandler.ts:39`, live inventory `backend-edge-functions.json:1`.

```ts
// current dedicated route:
import { handleNotesChoiceOrder } from '../_shared/notesChoiceOrder.ts';
Deno.serve(handleNotesChoiceOrder);
```

The three required routes are missing from the live list; live `create-order` is an older monolithic implementation with no current UCB/platform gate. Current native UCB attach/choice/report requests cannot be completed by that deployment. Missing isolated test routes are an additional default-off lane gap, not evidence that production billing depends on them.

```diff
-deploy a subset of order/verification files from different source revisions
+deploy qualified choice + attach + verification + webhook + reporting bundle
+verify enrolled India/package/user gates and migration dependencies together
```

Manual acceptance: licensed India Play tester chooses each billing option, cancellation/restore/late capture/refund, one grant, Google reporting reconciliation and exact package/track. Header hints alone are not device attestation.

### BACK-05 — High — Deployed targeting leaks message text into public broadcast feed

Locations: deployed `functions/send-push-notification/index.ts:63` and `:87`; current guard `supabase/functions/send-push-notification/index.ts:69`; policy `notifications_public_read_active` in `backend-policies.json:1`.

```ts
// deployed:
if (input.targetUserIds !== undefined && input.targetUserIds !== null) targets = ...;
await supabaseAdmin.from('notifications').insert({title,body,type,active:true});
// only device-token query is recipient-filtered
```

Root cause: targeted push and broadcast feed share unscoped persistence. `notifications_public_read_active` permits active rows; anon has SELECT. A targeted account/payment message can become visible to every reader. No private notification contents were queried.

```diff
+if (Object.prototype.hasOwnProperty.call(input,'targetUserIds'))
+  return jsonResponse({error:'Targeted notifications are not supported'},400);
 await insertBroadcastNotification(...);
```

Alternatively design recipient storage/RLS first, then support targeting. Existing current-source guard is the concrete minimal proposal. Acceptance: targeting rejected before DB/token operations; anon/student only see intended broadcasts.

### BACK-06 — High — Admin MFA remains an unclosed deployment gate

Locations: `supabase/migrations/20261001100000_admin_mfa_aal2.sql:29`, current `supabase/functions/send-push-notification/index.ts:46`, deployed sender `functions/send-push-notification/index.ts:37`; observed admin settings in `backend-live-security-metadata.json:1`.

```sql
-- observed live configuration
require_mfa = false
-- am_i_admin uses configured flag:
and (not admin_mfa_required() or auth.jwt()->>'aal'='aal2')
```

Deployed sender checks admin membership but never the flag/AAL. Password-only administrator sessions retain configured DB authority; enabling the DB flag alone would still leave old service-role sender without its matching guard. This is a missing mandatory-MFA release gate, not a claim that an enabled DB policy is bypassed by RLS.

```diff
+load admin_settings fail closed
+if require_mfa && sameVerifiedTokenAal !== 'aal2': deny403
+qualify all administrator factor enrollment/recovery
+owner-approved set_admin_mfa_required(true)
```

Acceptance: no locked-out administrators; AAL1 denied and AAL2 succeeds across direct Data API, RPCs, signed content URL, upload and push functions.

### BACK-07 — Medium — F15 malformed JSON fix only exists locally

Locations: deployed `functions/create-play-order/index.ts:10`, deployed `functions/verify-play-purchase/index.ts:13`; current `supabase/functions/create-play-order/index.ts:12`, `supabase/functions/verify-play-purchase/index.ts:13`.

```ts
// deployed accepts parse result without runtime shape validation
const body = await req.json().catch(()=>({})) as {productId?:unknown};
const productId = typeof body.productId === 'string' ? body.productId : '';
```

`null` is valid JSON and property access throws; parsing success does not make it an object. In Play verification this executes before its try/catch. Earlier report F15 claimed source-only fix and correctly left deployment pending; this audit confirms that pending state remains.

```diff
-const body = await req.json().catch(()=>({})) as Body;
+const input:unknown = await req.json().catch(()=>null);
+if (!input || typeof input!=='object' || Array.isArray(input)) return badRequest400;
+const body = input as Body;
```

Acceptance: unauthenticated rejected before body work; authenticated null/array/string/number/invalid JSON → stable 400 with no provider/order call. No live payment endpoint was invoked.

### BACK-08 — Medium — Fixed identity retention has no observed scheduler

Location: `supabase/migrations/20261020103000_first_purchase_identity_retention.sql:15` and `:36`; observed cron metadata `backend-live-security-metadata.json:1`.

```sql
delete from first_purchase_identities
where first_purchase_at < now() - interval '180 days';
-- cron.schedule(...) is intentionally only a prepared comment
```

The function and service-only grant exist; named scheduler does not. Analytics/payment-session jobs do not clean first-purchase identities. Actual overdue records were not counted. An external scheduler was not inspected.

```diff
+approve documented cutoff/cadence and legal wording
+configure only the specifically approved retention schedule
+monitor last successful purge, overdue count and alerts
```

Acceptance: disposable seeded rows at cutoff boundaries, preserved current rows, measured lag, no secrets/PII in telemetry; production scheduling remains a separate owner decision.

### BACK-09 — Medium — Queue batch budget counts one provider call per job

Locations: `supabase/functions/_shared/paymentQueue.ts:1`, `supabase/functions/_shared/settle.ts:28` and `:37`, `supabase/functions/report-external-transaction/index.ts:212`, `supabase/ucb_cron_setup.sql:38`.

```ts
// asserted 90-second request bound:
// ceil(40/8)*15 = 75 seconds
export const WORK_BATCH_SIZE=40, WORK_CONCURRENCY=8;
// capture settlement serially does:
await fetchPayment(paymentId);
await fetchRazorpayOrder(orderId);
```

Both requests independently allow 15 seconds; before DB/reporting, five waves of 8 jobs can require 150 seconds. Compensation/report/refund paths add more serial calls. Client cron HTTP timeout is 90 seconds, leases 3 minutes. A client timeout does not prove the platform kills the worker immediately, but it invalidates the claimed bounded response and makes retry/drain estimates optimistic.

```diff
+define invocation deadline and remaining-budget check
+budget batch size using complete path serial calls, DB and reporting overhead
+stop claiming/defer unstarted jobs before deadline; preserve lease fencing
+exercise slow successful multi-call provider responses and timeout/retry overlap
```

### BACK-10 — Medium — Blocked students can read free video URLs through table API

Locations: `supabase/migrations/20261020104000_course_wide_content_browsing.sql:35`–`:48`, live `videos_public_read_active` policy in `backend-policies.json:1`, current `supabase/functions/get-video-url/index.ts:35`.

```sql
-- effective has_content_access own-course branch:
select 1 from profiles pr
where pr.id=auth.uid() and pr.course_id=p_course_id
-- videos policy exposes youtube_url when this returns true:
active=true AND has_content_access(course_id,year_id)
```

The service URL helper requires a nonblocked profile, while direct table SELECT does not. A still-valid JWT for a blocked user can read published own-course video URLs by Data API. Mobile uses direct video reads, so logout enforcement in UI is insufficient as server authority. This does not grant private paid PDF bytes, and does not imply free content needs payment.

```diff
 -- existing admin branch unchanged
+student branches require exists(select 1 from profiles pr
+ where pr.id=auth.uid() and not coalesce(pr.blocked,false))
```

Apply to every student branch, including purchase-based cross-course access; review product decision whether blocking should suppress browsing vs only payment/PDF. Acceptance: synthetic blocked JWT direct SELECT videos/content and public-question RPC denied, owner/unblocked/admin behavior unchanged.

### BACK-14 — Low — Old UCB readiness check rejects generated catalog SKUs

Locations: `supabase/checks/ucb_postdeploy_checks.sql:48`–`:49`; generation `supabase/migrations/20261016100000_play_catalog_sync.sql:100`.

```sql
-- readiness script:
play_sku ~ '^notes_[0-9]+$'
-- current generated SKU:
'notes_' || replace(price::numeric(10,2)::text,'.','_') || '_v_' || uuid_without_dashes
```

The script says every row must pass, but cannot recognize current generated/verified price tiers. It can block valid release qualification or encourage manual legacy seeding (now explicitly retired).

```diff
-exists(select 1 from play_price_tiers where price_inr>0 and play_sku~'^notes_[0-9]+$')
+exists(select 1 from play_price_tiers t join play_price_sync s
+ on s.candidate_sku=t.play_sku where t.price_inr>0 and t.active
+ and t.verified_at>now()-interval '24 hours' and s.status='ready'
+ and t.currency_code='INR' and t.region_code='IN')
```

Manual check remains provider read-back; SQL readiness alone cannot establish Google permissions, active BUY offer or real purchase success.

### BACK-16 — Medium — Deployed recovery accepts another owner's order UUID without login

Locations: deployed `functions/verify-payment/index.ts:58`–`:82`; current owner checks `supabase/functions/verify-payment/index.ts:66` and `:111`.

```ts
// deployed: no getUserFromAuthHeader import/call
const order = await db.from('orders').select('id,razorpay_order_id').eq('id',internalOrderId);
if (recover) {
  const captured = await fetchCapturedPaymentForOrder(order.razorpay_order_id);
  return settle(order.razorpay_order_id,captured.id);
}
```

Anyone who learns an order UUID can distinguish missing/not-started/unpaid/paid and receive payment amount after verified settlement; they can also trigger provider work. UUID unpredictability reduces discovery, but does not authorize access. Grant still goes to actual order owner after real provider verification, so this is not a free-entitlement/ownership takeover.

```diff
+if (recover) require verified Auth bearer
+recovery query.eq('user_id',verifiedUser.id)
+wrong-owner and missing-order responses indistinguishable
+signed callback HMAC checked before order lookup
```

The full current-source boundary already implements this. Acceptance: no JWT401, other user404, owner normal pending/success; signed callback valid/invalid; recovered refund remains terminal; no probe leaks product/contact/user data.

## Earlier audit fix/gate reconciliation

| Earlier ID | Current source | Actual deployment / evidence |
|---|---|---|
| F15 Play body shape | fixed at both Play entrypoints | missing in deployed v3, BACK-07 |
| D01/B14 diagnostic admin+AAL2 | source requires verified user/admin/AAL2; retirement comments retained | list has diagnostics ACTIVE, matrix verify_jwt=true differs current false; handler deployment body was not revalidated here |
| B01/B02 Play catalog/worker gate | provider validation, queue fences, pinned dependencies present | four named cron jobs inactive; no provider Console qualification, BACK-03 |
| B04 identity retention | service-only fixed180-day purge exists | named schedule absent, BACK-08 |
| B05 authorization deployment parity | current RLS/RPC matrix explicitly recorded | final Nov12 refund/publication migrations absent; BACK-01 |
| B06 mandatory admin MFA | switch and AAL guards present locally | require_mfa=false, old push bundle lacks guard; BACK-06 |
| B11–B13 dependency reproducibility | Deno imports pinned2.118.0/pdf-lib1.17.1 and frozen lock | some deployed functions still npm:@supabase/supabase-js@2; source/deployment hash drift, no live dependency integrity certification |
| B15 Razorpay platform boundary | current header routing guard, dedicated Notes choice server opt-ins | older create-order lacks gate; routing hints still not platform attestation, BACK-04 |
| B03 paid offline encryption | mobile-native implementation outside this backend partition | mobile audit owns final assessment; no inherited plaintext finding assumed current |
| Prior free-MCQ/video product change | quiz RPC strips answer key, server grading; video rules require no purchase in chosen course | live column grants deny quiz questions; free course/publication scope retained; BACK-10 is blocking policy, not a payment gate |

No SDK/provider change recommendation is asserted from recollection. This audit used repository code and production metadata. Auth password settings, provider enrolment/permission, actual SMTP/push/device/store behavior remain explicitly manual.

## Schema/code compatibility cross-check

Every flat literal `.from(table).select(columns)` in all canonical Edge modules was compared to live `information_schema.columns` projection, excluding relationship selects and computed expressions. No missing flat selected column was found. `product_title` exists only in `purchases`, not `orders` or `products`; the reviewed backend payment insert correctly writes it to purchases. Notes now has `description`; quiz_tests has `question_revision`; orders has all current choice/tax/snapshot/recovery fields. Current new RPC names `reverse_refunded_capture`, `queue_capture_compensation`, `lock_checkout_publication` are absent live because two Nov12 migrations are pending. No blanket claim that dynamic payloads or every client query were automatically typechecked follows from this comparison.

Final-order review: Nov4 snapshots override legacy settlement body while wrappers retain service-only grants; Nov9 recovery weakened early MV003 proof, Nov11 phase-C restores strong identity/scope/payment proof, P0 classification allows verified partial refunds/won disputes without clearing blocking/parked facts; pending Nov12 adds atomic refunded revocation + publication admission locking. Old table policies and default grants in baseline are not final effective permissions; September hardening and October restrictive policies matter. None of the archived release copies should be blindly deployed over current files.

## September wallet/flag/push source findings

# SQL migrations 25–30 September — full-body read-only review

Fully read all 18 migrations, 228,828 bytes, every function/body/DDL/policy/trigger/grant and migration comment. No function-body dedup/skipping was used: similar reissued definitions were read in full. File ledger: `sql-sept25-30-reviewed.txt`. No application/schema/live data changes. Parent owns disposable PostgreSQL execution and live evidence; this report does not claim runtime reproductions unless linked by parent.

Later override handling was coordinated with backend auditor: original pricing/settlement functions are heavily superseded by October wallet reservations, November snapshot settlement/choice/recovery/commit/reversal migrations. Historical unsafe settlement/current-product snapshots/stale-wallet shortcuts are not newly reported as current vulnerabilities. The following wallet/flag/push functions survive unchanged; verified by global definition-name scan and backend independent review.

## BACK-11 — Medium — Expiring spent credits consume future wallet balance again

Current definitions: `supabase/migrations/20260925110000_phase2_wallet_ledger.sql:190` wallet_balance_of (sole definition), particularly :199–201:

```sql
sum(amount) filter (where entry_type='credit' and status='available'
  and (expires_at is null or expires_at>now()))
- sum(amount) filter (where entry_type in ('debit','reversal') and status='available')
```

`20260926130000_batch1_hygiene.sql:180–182` wallet_ledger_no_overdraw repeats the same arithmetic; this trigger also has no later replacement. Service-only balance helper is called by authenticated get_my_wallet and service pricing/settlement.

Root cause: credits expire out of the positive sum, but debits that already spent those credits stay forever in the negative sum. No debit-to-credit allocation or remainder accounting exists. Synthetic sequence: credit100→spend100→that credit expires→new nonexpired credit100. Expected new balance100; current helper returns greatest(0,100−100)=0. Trigger then refuses spending the valid new credit as overdraw. Reversed expiring credits have the same double-deduction shape. This is under-crediting/loss of spendability, not overdraw or demonstrated theft. Requires an expiring credit policy; live credit_expiry_days and affected balances are UNVERIFIED in this sub-review. Parent requested synthetic PG17 reproduction; no production mutation needed.

Proposed diff/design, not applied:

```diff
- activeCreditSum - allTimeDebitAndReversalSum
+ sum(activeCreditRemaindersAfterDeterministicConsumptionAndReversalAllocation)
```

Make display, pricing, reservation validation and no-overdraw trigger share one authoritative per-credit allocation computation. Preserve immutable ledger/history and existing idempotency. Do not fix by dropping all historical debits or subtracting expired original face value again; only unspent remainders should expire. Requires reviewed allocation/replay/migration policy, tests before/after expiry with partial spend, reversal, refund restoration, concurrent checkout and new credits.

## BACK-12 — Medium — Flag resolution reports success even if no row was resolved

Current sole definition `20260925120000_phase2_orders_pricing_and_settlement.sql:274`, lines :285–289:

```sql
update public.order_review_flags ... where id=p_flag_id and resolved_at is null;
perform set_config('app.trusted_order_write','false',true);
if not found then raise exception 'Flag not found or already resolved'; end if;
```

Root cause: PERFORM set_config returns one row and overwrites PL/pgSQL FOUND=true after the UPDATE. Nonexistent/already-resolved ID always passes the intended missing-row check. Admin authorization remains enforced; this is false mutation confirmation and operational review integrity, not unauthorized resolution. No later replacement (backend confirmed).

Proposed precise diff:

```diff
+ declare v_rows integer;
  update public.order_review_flags ... where id=p_flag_id and resolved_at is null;
+ get diagnostics v_rows = row_count;
  perform set_config('app.trusted_order_write','false',true);
- if not found then raise exception 'Flag not found or already resolved'; end if;
+ if v_rows=0 then raise exception 'Flag not found or already resolved'; end if;
```

Synthetic local tests: authorized admin resolves one flag once; repeat/nonexistent must return controlled failure, original audit actor/timestamp unchanged. AAL1/unauthorized denied by final am_i_admin policy.

## BACK-13 — Medium conditional expiry policy — Manual hold can expire a reward before first availability

Current release definition `20260927130000_batch3b_antifarming.sql:698` (last definition). It leaves a shared-network reward pending while an unresolved flag exists (:739–744), then changes only status to available (:734). Wallet append-only trigger fixes available_at/expires_at immutable at `20260925110000_phase2_wallet_ledger.sql:82–83`; status change stamps status_changed_at.

Earning side `20260927130000_batch3b_antifarming.sql:682–686` sets expires_at to earning-time + hold-days + credit-expiry-days. Later Razorpay legacy body still uses this formula (`20261104100000_razorpay_snapshot_discount_retry.sql:399–402`); backend confirms final Play credit creation also retains it. Therefore this is not merely superseded September code.

Root cause: scheduled release time is treated as actual first availability even though dispute/shared-network holds postpone release. If configured expiry is7 days and review lasts14 after nominal release, reward appears pending/held, is approved, becomes status available and is immediately excluded by expires_at<=now. Mobile ReferralTermsScreen says expiry after it becomes available; the held credit was never spendable. Expiry configuration/live affected records and exact intended product policy UNVERIFIED. Current defaults permit null/no expiry; no claim of observed customer loss.

Proposed diff/design if policy is expiry after actual availability:

```diff
- effectiveExpiry = original expires_at
+ effectiveExpiry = actual status_changed_at + captured(expiryDuration)
```

Derive captured duration from original expires_at−available_at where valid, or store a reviewed duration snapshot for future rows. Centralize effective expiry in balance, no-overdraw, reversal and read UI; do not silently mutate immutable historical columns or use changing current settings retroactively. Alternatively explicitly approve/disclose expiry while held. Test approval just before/after original expiry, dispute hold/win, canceled reward, settings changes and refund.

## BACK-15 — Medium — Eleventh new device fails before push registration can evict old token

Sole current definitions `20260930100000_medium_db_hardening.sql:135` push_tokens_cap and :157 register_push_token. BEFORE INSERT trigger at :138–141:

```sql
if current_setting('role',true) in ('anon','authenticated')
  and not exists (... expo_push_token=new.expo_push_token)
  and (select count(*) ... user_id=new.user_id)>=10
then raise exception 'Too many registered devices'; end if;
```

RPC :172 inserts/upserts first; only afterwards :178 deletes rows outside newest10. SECURITY DEFINER changes current_user but current_setting('role') remains authenticated, so trigger applies to authenticated RPC callers.

Root cause: intended keep-newest10 cleanup is unreachable for the eleventh brand-new token; BEFORE INSERT raises before cleanup. Transferring an already-existing token takes a different branch and can reach cleanup, but does not fix a new device. Mobile registration catches error and returns null, no user-facing device-management action. No later override (global scan/backend confirmation). Actual count/device registration UNVERIFIED.

Proposed diff/design:

```diff
+ serialize register_push_token by user advisory lock
+ in trusted RPC, remove only oldest owned excess token(s) before inserting brand-new token
  insert ... on conflict ...;
  keep newest10 deterministically (timestamp,id)
```

Retain trigger cap for direct writes, account-bound takeover, rate limiting and rollback atomicity. Decide whether product intends hard10 refusal or automatic oldest eviction; if refusal is deliberate, provide device-management/error UI and remove misleading keep-newest behavior claim. Test10 existing + new11th via actual authenticated-role RPC; expect final count10/new token present/oldest gone under eviction policy, concurrent calls bounded, existing token refresh does not delete itself.

## Full-file review inventory and override notes

| Migration | Reviewed behavior/current disposition |
|---|---|
| 20260925100000 phase2 config/product type | Adds product_type enum-like check, reward/wallet/expiry/window/checkout fields, aggregate range constraint, first_order unique and self-check. Later tighter named settings checks replace range; no unexpected grant. |
| 20260925110000 wallet ledger | Immutable ledger/FKs, one referral-credit/order-debit/refund/reversal indexes, append-only/delete/truncate/client-write triggers, own/admin read RLS and restricted helpers; balance flaw BACK11. get_my_wallet auth-bound. get_my_referral_list masked first/last initial; future-held status deserves UI interpretation, no new authorization defect established. Optional cron sweep catches setup errors; actual job state parent scope. |
| 20260925120000 pricing/settlement | Breakdown check/immutability, per-user locks, server-side quote/create, review flags, admin resolve BACK12, settlement/wrapper/refund/referral/rejection functions and privilege/self-checks. Product snapshot/stale wallet/refund weaknesses in original bodies superseded; not current findings. |
| 20260925130000 debug removal | Enumerates/drops all public.debug_whoami overloads; read-only helper exposure retired. |
| 20260925140000 discount once | Discount-order pointer + expanded review reasons; old duplicate-discount grant behavior later superseded, not reported as live exploit. |
| 20260926100000 refund/dispute | Closed purchase statuses; reverse_payment locks buyer before order, revokes purchase/restores wallet/reverses pending/released referral, flags shortfall, lost/open/won dispute flow; later wrapper/capture reversal policy must be assessed at final backend. Shared-network/expiry behavior retained into later release definition. |
| 20260926110000 settle flags | First-settlement wallet debit even stale/discount-duplicate, duplicate purchases do not grant, review reasons/account-deletion/replay/refund handling; later snapshot/compensation replacement parent scope. |
| 20260926120000 block owned | Pricing/quote already_owned, one-success index with explicit preexisting-row exemption. Historical exact UUID/payment comments not reproduced. Later settlement guards remain parent scope; mobile already-owned response regression separately MOB18. |
| 20260926130000 hygiene | Temporary validation helper, analytics ownership/size bounds, protected profile/admin bypass/email sync/phone verification reset, quiz constraints/email guard, order/FKs/index cleanup, no-overdraw BACK11 and admin reversal clamp. Profile logic subsequently reissued phone guard; no arbitrary direct client write established. |
| 20260927100000 legacy admin policies | Adds missing am_i_admin settings twin before drops; removes email/is_admin policies, guards dependency removal, drops is_admin. Current am_i_admin/MFA definition parent scope. |
| 20260927110000 excess grants | Removes TRUNCATE/REFERENCES/TRIGGER client grants and anonymous DML except analytics; alters postgres defaults, explicitly catches expected hosted supabase_admin permission limitation. No unsupported claim that all future creators are covered. |
| 20260927120000 referral hardening | Optional verified-phone gates default false, rate limit10/hr, cap under referrer lock, cryptographic rejection-sampled31-character code generator, exact lookup/check, removes student raw referral policy, masked compatibility RPC; settlement verification logic subsequently anti-farming/replaced. Phone verification disabled is explicit product decision, not guessed defect. |
| 20260927130000 anti-farming | Retained hashed identity table/server-only helpers/backfill, normalized email/phone (hashes personal data), fail-open shared-IP signal, revised pricing/apply/settlement/release with admin-held credit. Identity retention now has later policy/purge changes parent scope. BACK13 release timing; exact bodies read all775 lines. |
| 20260928100000 settings limits/audit | Named numeric bounds and remaining fields; refuses invalid existing settings, per-change old/new-only audit trigger with actor/email, admin-only read and client write revoked. Operational retention parent scope. |
| 20260928110000 wallet program off | Guard prior migration; wallet disabled in create/quote when program disabled, retains existing balances/priced orders; later quote/create replacements checked by backend. |
| 20260929100000 phone/storage | Protected direct phone/normalized-phone changes, rate-limited change_my_phone neutral collision response, verification reset/clearing; exact active-note storage suffix replacing unsafe substring. Storage policy subsequently service-only, so old direct-preview gap not current finding. |
| 20260930100000 medium hardening | Pinned search paths, trigger EXECUTE revokes, authenticated-only helpers, auth.uid scalar-subquery policy rewrite, redundant policy drops, FK indexes, quiz/analytics bounds, token-format/cap/register BACK15 and auth-confirmed phone trigger. No claim of SMS live configuration. |
| 20260930110000 grant tightening | Removes client writes unused by admin/app; anon SELECT allowlist, signed-in-only note policy to avoid anon permission-error reads. Later storage/server-write restrictions supersede. |

## Validation boundary

Backend auditor independently confirmed no later replacement for wallet_balance_of, no_overdraw, admin_resolve_order_flag, push_tokens_cap/register_push_token; release_due_wallet_credits last is September27. Parent can attach safe local PG reproductions. No live users, private token/identity rows, cron command credentials or secrets were selected, no refund/provider action performed. Conditional business-policy findings are not evidence of currently affected users. Historical grant/RLS fixes are reviewed against later overrides rather than presumed deployment parity.

## Full migration coverage and review method

All 78 canonical migration files are covered. Baseline/pre-September and all October–November migrations were fully read here. September19–24 were reviewed by admin/website auditor (15 files,226427 bytes), with exact SHA-256 matching duplicate Phase1A ranges against separately fully read originals; every distinct folded change/DDL/policy/grant was read. September25–30 were fully read by mobile auditor (18 files,228828 bytes) without skips. Read detailed ledgers sql-sept19-24-reviewed.txt and sql-sept25-30-reviewed.txt for precise ranges/hashes and override reasoning. Canonical path-per-file ledger backend-reviewed.txt now has zero migration omissions. The earlier in-progress checkpoint above is superseded by this completed coverage statement.

BACK-11 disposable PostgreSQL17 reproduction independently performed by parent: spent100/expired credit + new100 gives available0, expected100. Evidence wallet-expiry-repro.log. This verifies arithmetic failure without proving live customer impact.

## Deployed JWT and entrypoint inventory

Source flags below come from current config.toml; deployed flags come from connected list_edge_functions. Internal handler verification still matters when gateway false.

| Function | source verify_jwt | deployed verify_jwt | deployed version | status |
|---|---|---|---|---|
| attach-external-token | True | absent | - | NOT DEPLOYED |
| create-order | True | True | 23 | ACTIVE |
| create-order-nonplay-test | True | absent | - | NOT DEPLOYED |
| create-order-play-choice | True | absent | - | NOT DEPLOYED |
| create-play-order | True | True | 3 | ACTIVE |
| delete-account | True | True | 19 | ACTIVE |
| diagnose-play-matrix | False | True | 3 | ACTIVE |
| diagnose-play-pricing | True | True | 2 | ACTIVE |
| diagnose-play-service-account | False | False | 2 | ACTIVE |
| get-note-url | True | True | 20 | ACTIVE |
| get-note-url-nonplay-test | True | absent | - | NOT DEPLOYED |
| get-video-url | True | True | 20 | ACTIVE |
| login-with-mobile | False | False | 18 | ACTIVE |
| nonplay-test-catalog | True | absent | - | NOT DEPLOYED |
| play-payment-worker | False | False | 3 | ACTIVE |
| razorpay-webhook | False | False | 51 | ACTIVE |
| razorpay-webhook-nonplay-test | False | absent | - | NOT DEPLOYED |
| report-external-transaction | False | absent | - | NOT DEPLOYED |
| request-password-reset-by-mobile | False | False | 18 | ACTIVE |
| send-push-notification | False | False | 51 | ACTIVE |
| sync-play-catalog | False | False | 6 | ACTIVE |
| upload-note-pdf | False | False | 3 | ACTIVE |
| verify-payment | False | False | 69 | ACTIVE |
| verify-payment-nonplay-test | True | absent | - | NOT DEPLOYED |
| verify-play-purchase | True | True | 3 | ACTIVE |

Only gateway flag drift found among deployed/configured entrypoints: diagnose-play-matrix is live true vs current false. This affects browser CORS/preflight behavior; current handler independently requires verified Auth/admin/AAL2. No claim of unauthenticated diagnostic access follows. Missing routes are explicit in table.

## Retrieved deployed bundle vs canonical file hashes

| Deployed bundle | source file | live bytes | current bytes | exact content equal |
|---|---|---|---|---|
| create-order v23 | supabase/functions/create-order/index.ts | 6617 | 204 | False |
| create-order v23 | supabase/functions/_shared/cors.ts | 1015 | 1015 | True |
| create-order v23 | supabase/functions/_shared/supabaseAdmin.ts | 2188 | 2194 | False |
| create-order v23 | supabase/functions/_shared/razorpay.ts | 8263 | 11123 | False |
| create-order v23 | supabase/functions/_shared/rateLimit.ts | 1268 | 1268 | True |
| create-play-order v3 | supabase/functions/create-play-order/index.ts | 2405 | 3636 | False |
| create-play-order v3 | supabase/functions/_shared/cors.ts | 1015 | 1015 | True |
| create-play-order v3 | supabase/functions/_shared/supabaseAdmin.ts | 2188 | 2194 | False |
| create-play-order v3 | supabase/functions/_shared/rateLimit.ts | 1268 | 1268 | True |
| delete-account v19 | supabase/functions/delete-account/index.ts | 3412 | 4326 | False |
| delete-account v19 | supabase/functions/_shared/cors.ts | 1015 | 1015 | True |
| delete-account v19 | supabase/functions/_shared/supabaseAdmin.ts | 1554 | 2194 | False |
| login-with-mobile v18 | supabase/functions/login-with-mobile/index.ts | 4211 | 4388 | False |
| login-with-mobile v18 | supabase/functions/_shared/cors.ts | 1015 | 1015 | True |
| login-with-mobile v18 | supabase/functions/_shared/phone.ts | 727 | 727 | True |
| login-with-mobile v18 | supabase/functions/_shared/supabaseAdmin.ts | 1554 | 2194 | False |
| login-with-mobile v18 | supabase/functions/_shared/rateLimit.ts | 1268 | 1268 | True |
| razorpay-webhook v51 | supabase/functions/razorpay-webhook/index.ts | 9210 | 11980 | False |
| razorpay-webhook v51 | supabase/functions/_shared/settle.ts | 7211 | 20527 | False |
| razorpay-webhook v51 | supabase/functions/_shared/supabaseAdmin.ts | 2188 | 2194 | False |
| razorpay-webhook v51 | supabase/functions/_shared/razorpay.ts | 8263 | 11123 | False |
| request-password-reset-by-mobile v18 | supabase/functions/request-password-reset-by-mobile/index.ts | 3450 | 3460 | False |
| request-password-reset-by-mobile v18 | supabase/functions/_shared/cors.ts | 1015 | 1015 | True |
| request-password-reset-by-mobile v18 | supabase/functions/_shared/phone.ts | 727 | 727 | True |
| request-password-reset-by-mobile v18 | supabase/functions/_shared/supabaseAdmin.ts | 1554 | 2194 | False |
| request-password-reset-by-mobile v18 | supabase/functions/_shared/rateLimit.ts | 1268 | 1268 | True |
| send-push-notification v51 | supabase/functions/send-push-notification/index.ts | 6366 | 8392 | False |
| send-push-notification v51 | supabase/functions/_shared/cors.ts | 1015 | 1015 | True |
| send-push-notification v51 | supabase/functions/_shared/supabaseAdmin.ts | 1554 | 2194 | False |
| send-push-notification v51 | supabase/functions/_shared/rateLimit.ts | 1268 | 1268 | True |
| sync-play-catalog v6 | supabase/functions/sync-play-catalog/index.ts | 5166 | 5166 | True |
| sync-play-catalog v6 | supabase/functions/_shared/cors.ts | 1015 | 1015 | True |
| sync-play-catalog v6 | supabase/functions/_shared/supabaseAdmin.ts | 2194 | 2194 | True |
| sync-play-catalog v6 | supabase/functions/_shared/googlePlay.ts | 21700 | 21740 | False |
| sync-play-catalog v6 | supabase/functions/_shared/playCatalog.ts | 9019 | 9019 | True |
| verify-payment v69 | supabase/functions/verify-payment/index.ts | 5301 | 7611 | False |
| verify-payment v69 | supabase/functions/_shared/cors.ts | 1015 | 1015 | True |
| verify-payment v69 | supabase/functions/_shared/supabaseAdmin.ts | 2188 | 2194 | False |
| verify-payment v69 | supabase/functions/_shared/razorpay.ts | 8263 | 11123 | False |
| verify-payment v69 | supabase/functions/_shared/settle.ts | 7211 | 20527 | False |
| verify-payment v69 | supabase/functions/_shared/rateLimit.ts | 1268 | 1268 | True |
| verify-play-purchase v3 | supabase/functions/verify-play-purchase/index.ts | 5986 | 7000 | False |
| verify-play-purchase v3 | supabase/functions/_shared/cors.ts | 1015 | 1015 | True |
| verify-play-purchase v3 | supabase/functions/_shared/supabaseAdmin.ts | 2188 | 2194 | False |
| verify-play-purchase v3 | supabase/functions/_shared/rateLimit.ts | 1268 | 1268 | True |
| verify-play-purchase v3 | supabase/functions/_shared/googlePlay.ts | 8409 | 21740 | False |
| verify-play-purchase v3 | supabase/functions/_shared/playPurchaseValidation.ts | 1372 | 1372 | True |

Catalog read-back result: retrieved sync-play-catalog v6 entrypoint and playCatalog.ts are exact byte matches to canonical files; googlePlay.ts differs. Both paths build reviewed direct IN/INR requests using configured regionsVersion and do not invoke convertRegionPrices. The diagnostic invokes pricing:convertRegionPrices; its403 does not by itself establish that catalog GET/PATCH/activation have identical permission outcomes. No Google/Play API was invoked in this read-only audit, so provider permissions and403 root cause remain unverified manual checks.

## Financial mutation schema cross-check

Current source writes settlement using settle.ts→service-only SQL RPCs; no grantPurchase.ts exists in the canonical function tree. product_title is a purchases field introduced by 20260801150000, retained in live schema and correctly used by SQL purchase INSERT. It is absent from orders/products; do not add it to those API payloads based on an old PGRST204 error.

| Financial table | live columns used by reviewed INSERT statements across canonical migration chain | insert field absent live |
|---|---|---|
| orders | amount, chapter_id, course_id, expires_at, id, list_price, play_purchase_option_id, play_sku, product_id, provider, referral_discount, referral_id, scope, status, subject_id, user_id, wallet_amount, year_id, year_ids | none |
| payments | amount, order_id, play_sku, product_id, provider, purchase_token, razorpay_order_id, razorpay_payment_id, status, user_id, verified_at | none |
| purchases | amount, chapter_id, course_id, order_id, product_id, product_title, razorpay_order_id, scope, status, subject_id, user_id, year_id, year_ids | none |
| wallet_ledger | amount, available_at, entry_type, expires_at, note, order_id, referral_id, reverses_id, source, status, user_id | none |
| referrals | code_used, qualified_at, referred_id, referrer_id, status | none |
| first_purchase_identities | account_id, first_purchase_at, identity_hash, kind | none |
| wallet_order_reservations | amount, expires_at, order_id, user_id | none |
| first_discount_reservations | order_id, referral_id, user_id | none |
| payment_captures | amount_paise, order_id, payment_id, provider_time, razorpay_order_id | none |
| payment_compensations | amount_paise, order_id, payment_id, reason, refund_request_id | none |
| provider_events | event_id, event_type, payload_hash, payment_id, provider_object_id, provider_time, razorpay_order_id | none |
| notes_choice_checkouts | buyer_state, choice_id, order_id, use_wallet | none |

Mutation UPDATE/UPSERT audit: current Edge order updates use status, razorpay_order_id, play_consumption_status, play_last_attempt_at/play_last_checked_at, payment/capture completion markers, external report/refund status/error/attempt/test fields and UCB transaction time, all present live. SQL financial updates use the live order identity/scope/price/provider/tax snapshot columns; purchase status/ownership/snapshot fields; wallet status/status_changed_at/amount/reverses_id/availability/expiry fields; referral status/order markers/qualification/reward/reject fields. Ledger fields were checked against backend-columns.json; complete insert-name scan above found no removed/absent field. This is source/schema validation, not permission to mutate immutable fields: triggers independently constrain updates. No migration/code missing financial column was confirmed. The only missing current SQL API dependencies are the three Nov12 helper RPCs, not columns.

Four public views were checked: admin_play_billing_status uses security_invoker=true plus am_i_admin and underlying RLS; payment_queue_metrics/play_recovery_metrics/play_void_sweep_metrics have no anon/auth SELECT grants. Their default definer behavior therefore does not expose payment/token data to clients. Metadata in backend-views.json.

## Additional compatibility and held-code notes

The legacy authenticated delete_my_account() wrapper remains in source/live (Phase1A20260922100000:1982), even though the current app uses delete-account Edge Function. It binds auth.uid(), calls current erase_user_data(), rejects admin_blocked and deletes only that Auth user. It bypasses the Edge IP/account rate limiter. This is a Low hardening/compatibility decision, not BOLA or demonstrated financial retention bypass. Proposal: agree old-client retirement, then either revoke this compatibility RPC or share the same database-side limiter; preserve caller ownership/admin refusal and retained financial anonymization. Exact live definition is in backend-live-wallet-push-rpcs.json and September review sql-sept19-24-review.md.

Held batch2 paid-video SQL/README were read. They are deliberately outside migrations, have placeholder9999 timestamp and would introduce paid-video restrictions incompatible with current free-video decision. They are historical, not pending product requirements and must not be applied as an audit fix. The future MV006 complete unique index is likewise outside automatic migrations and requires reviewed historical reconciliation; current trigger prevents new duplicate successes without rewriting historical rows. Neither artifact was executed.

Older frozen staging preparation script requires exactly62 migration hashes by design and refuses today's78-file chain. This is a frozen-plan guard, not permission to bypass review by changing62 to78. Build a newly reviewed staging plan if current-chain preparation is needed. Retired manual Play-tier seed command safely fails; current catalog uses Google read-back, not manual tier activation.

Production Auth minimum/requirements/rate-limit settings cannot be queried with the available connector. Local config.toml declares min8 and lower_upper_letters_digits_symbols, but dashboard/config-diff/email-hook state remains an exact manual check. No live credentials, private token rows, personal profiles or cron commands were printed.

Migration-history drift detail: live version20260801 is named razorpay_webhook_atomic_grant, while local version20260801_auth_verified_identities.sql has a different migration name/purpose. Exact historical applied statement bodies were not retrieved here; names alone are not proof of statement-body inequality. Live also records20260801150000 as razorpay_webhook_atomic_grant. Matching version strings alone therefore do not establish identical applied migration bodies. The verified identity columns do exist live (later migration overlap), so no current missing-column failure is inferred. Retain this historical discrepancy in new-project/restore/runbook review; do not rewrite migration history or replay one file solely because its human-readable name differs.

Canonical standalone staging README and MIGRATION_SAFETY_AUDIT were also fully read. Their October62-file inventory and empty-staging observations are historical, not current operational state; the preparation script hash/count guard intentionally stops on today's changed78-file set.

## BACK-17 — Low — Legacy self-delete RPC bypasses Edge deletion rate limits

Locations: supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql:1985–2013, current Edge supabase/functions/delete-account/index.ts:39 and:58. Live pg_proc has authenticated EXECUTE and identical wrapper; exact definition backend-live-wallet-push-rpcs.json.

```sql
create or replace function public.delete_my_account() returns void ... security definer ...
  v_uid uuid := auth.uid();
  v_res := public.erase_user_data(v_uid);
  if v_res->>'status'='admin_blocked' then raise exception ...; end if;
  delete from auth.users where id=v_uid;
...
grant execute on function public.delete_my_account() to authenticated;
```

Root cause: backwards compatibility preserves a second destructive entrypoint without the Edge limiter. A signed-in student can call RPC directly rather than delete-account and avoid the fail-closed IP/account counters around the Edge Auth/erase/delete work. Caller ownership and admin refusal remain enforced; financial anonymization uses current erase_user_data. This is not another-user deletion or proof of retention loss, and a user may legitimately delete their own account.

```diff
 -- only after released-client compatibility/retirement decision:
-grant execute on function public.delete_my_account() to authenticated;
+revoke execute on function public.delete_my_account() from authenticated;
 -- OR preserve compatibility and centralize account deletion limiting:
+apply shared DB-side rate-limit guard before erase_user_data/auth.users delete
+use same guard from Edge-backed and legacy RPC paths without double-counting
```

Acceptance: old-client support decision recorded, same-user deletion still works, unauth/admin denied, repeat/parallel calls bounded, failed-auth deletion retry and retained accounting semantics preserved. No production deletion tested. Main paid PDF URL expiresIn is120 seconds (get-note-url/index.ts:13,:58,:63), not180; existing URLs may remain usable until their issued expiry after revocation.

-- PREPARED ONLY. Never run without the signed runbook gates. No automatic progression.
\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL standard_conforming_strings=on;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='15s';
SET LOCAL idle_in_transaction_session_timeout='15s';
DO $approval$
DECLARE k text;
BEGIN
 IF current_user<>'postgres' THEN RAISE EXCEPTION 'approved postgres operator required'; END IF;
 FOREACH k IN ARRAY ARRAY['medveda.c_owner_approval','medveda.recovery_evidence','medveda.window_approval','medveda.phase_b_verified','medveda.quiescence_evidence','medveda.drift_approval'] LOOP
  IF nullif(current_setting(k,true),'') IS NULL THEN RAISE EXCEPTION 'missing independently signed evidence reference: %',k; END IF;
 END LOOP;
END $approval$;
LOCK TABLE supabase_migrations.schema_migrations IN SHARE ROW EXCLUSIVE MODE;
-- Fixed order: short outage includes readers. Not a substitute for ingress quiescence.
LOCK TABLE public.orders IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.purchases IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.provider_events IN ACCESS EXCLUSIVE MODE;
DO $baseline$
BEGIN
IF (SELECT array_agg(version ORDER BY version) FROM supabase_migrations.schema_migrations) IS DISTINCT FROM ARRAY['20260701000000','20260718','20260721','20260801','20260801150000','20260919120000','20260919130000','20260920120000','20260920130000','20260920140000','20260921120000','20260921130000','20260922100000','20260923100000','20260924100000','20260924110000','20260924120000','20260924130000','20260924140000','20260924150000','20260925100000','20260925110000','20260925120000','20260925130000','20260925140000','20260926100000','20260926110000','20260926120000','20260926130000','20260927100000','20260927110000','20260927120000','20260927130000','20260928100000','20260928110000','20260929100000','20260930100000','20260930110000','20261001100000','20261012100000','20261012110000','20261012120000','20261013090000','20261013100000','20261013110000','20261014100000','20261014110000','20261015100000','20261015120000','20261016090000','20261016100000','20261018100000','20261018110000','20261018120000','20261018130000','20261019150000','20261019151000','20261020100000','20261020101000','20261020102000','20261020103000','20261020104000','20261020105000','20261020110000','20261104100000','20261104110000','20261110100000','20261110120000','20261110130000']::text[] THEN RAISE EXCEPTION 'exact ledger version-set mismatch'; END IF;
IF to_regclass('public.notes_choice_checkouts') IS NOT NULL OR to_regclass('public.orders_external_token_digest_unique') IS NOT NULL THEN RAISE EXCEPTION 'unexpected C object; no first-install approval'; END IF;
IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND ((table_name='orders' AND column_name IN ('ucb_transaction_time','external_report_test_purchase')) OR (table_name='provider_events' AND column_name='blocks_entitlement'))) THEN RAISE EXCEPTION 'unexpected pre-existing C column'; END IF;
IF to_regprocedure('extensions.digest(text,text)') IS NULL OR to_regclass('public.orders_external_token_unique') IS NULL THEN RAISE EXCEPTION 'pgcrypto/token-index prerequisite missing'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.purchases'::regclass AND tgname='purchases_play_order_snapshot' AND tgenabled='O') THEN RAISE EXCEPTION 'baseline Play trigger missing'; END IF;
IF md5((SELECT prosrc FROM pg_proc WHERE oid='public.razorpay_entitlement_committed(text,text)'::regprocedure)) IS DISTINCT FROM '49b01fbcc7a5e71bd527366fd342a6e9' THEN RAISE EXCEPTION 'strong A1 prerequisite mismatch'; END IF;
IF has_schema_privilege('anon','public','CREATE') OR has_schema_privilege('authenticated','public','CREATE') THEN RAISE EXCEPTION 'untrusted public CREATE privilege'; END IF;
IF EXISTS(SELECT 1 FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('prepare_notes_choice_checkout','record_notes_choice_authorization','play_entitlement_committed','get_my_play_fulfillment')) THEN RAISE EXCEPTION 'unexpected existing C function'; END IF;
END $baseline$;
DO $pinned_preimages$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='accounts_share_network' AND pg_get_function_identity_arguments(p.oid)='p_a uuid, p_b uuid' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='c5dcb898ca3ee23dfa27091df203b47fb7256013a2c23bd0337969f14650a778' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: accounts_share_network'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='admin_mfa_required' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='9aa26f57c18f9f97fe0e423a7a061102a436289e7abf9f98fcef5a8e557ed4a7' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: admin_mfa_required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='admin_reject_referral' AND pg_get_function_identity_arguments(p.oid)='p_referral_id uuid, p_reason text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='913db6eab49a3c8d277da5d21312def4571a3df2fb7231ccf226712299257fe9' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: admin_reject_referral'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='admin_resolve_order_flag' AND pg_get_function_identity_arguments(p.oid)='p_flag_id uuid, p_note text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='f8586ffc930dc155441cf71026a26518d1b48b141fa094f03584d0702813d736' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: admin_resolve_order_flag'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='admin_reverse_wallet_credit' AND pg_get_function_identity_arguments(p.oid)='p_ledger_id uuid, p_note text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='df6316cd54d6d81fd750ddbb17a73bb8d424492871053febb7dfd875cfdf51e3' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: admin_reverse_wallet_credit'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='admin_set_order_status' AND pg_get_function_identity_arguments(p.oid)='p_order_id text, p_status text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='71f4d4bed1948517637cef8bb50ac9997f2c2a4f94e6b629b8a7eca1be157a90' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: admin_set_order_status'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='am_i_admin' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='05d081e06c023ac173c0f862c7297a42999848a7f52133916047c598116b5cc5' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: am_i_admin'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='analytics_events_rate_limit' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='f64fed8fdbbfb189d66c2ce7a3f7548499393aa837e4457fd69599ebfcf7f781' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: analytics_events_rate_limit'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='app_config_touch_updated_at' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='2fc4cc4026ab4bd838e5965777e82a9220e39492393c5cee6224603ef0006482' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: app_config_touch_updated_at'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='apply_referral_code' AND pg_get_function_identity_arguments(p.oid)='p_code text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='001cbb78dd0f9fdb0b06c4f55f338795b2073dd077223d230271f7b6b25a2240' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: apply_referral_code'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='attach_ucb_external_token' AND pg_get_function_identity_arguments(p.oid)='p_user_id uuid, p_order_id text, p_token text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='00a1d182f32a8a93caef347e4c456a332d51a2891dd765dda1c369024f84ef8c' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: attach_ucb_external_token'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='backfill_auth_user_profile' AND pg_get_function_identity_arguments(p.oid)='p_user_id uuid' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='a8b3fa89eb5b564962c736fb5edffe0f6adad0806234006914095f237c0bc2f4' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: backfill_auth_user_profile'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='bind_ucb_razorpay_order' AND pg_get_function_identity_arguments(p.oid)='p_user_id uuid, p_choice_id text, p_razorpay_id text, p_buyer_state text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='85b1d0937c080dced76270f9a1beb16a919801d2f5ac7fb65ec55c728b87a067' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: bind_ucb_razorpay_order'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='block_client_writes' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='e9daf600226c49c46bb44de8d92768bb337a8883db19c32f68589cdde309971d' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: block_client_writes'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='bump_quiz_question_revision' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='0c28bee74b1b3e011f22535a74c965ce1f402e2233f7c5cf92aee18617cd3fb5' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: bump_quiz_question_revision'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='change_my_phone' AND pg_get_function_identity_arguments(p.oid)='p_phone text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='faec6a2c0b0b8b686ca9c08d152df48a1152b2d0f5d356bb6d6fcfbdb69b085a' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: change_my_phone'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='chapters_derive_course' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='f03f2f0bff7fa2de5b87f5c4f11179cba409aa29f416bbc9b381c8f3483aae51' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: chapters_derive_course'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='chapters_propagate_course_move' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='7433b574b2ec59b4d9b557343573b47b804922d9f30b99193d72b2ac35cf60c4' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: chapters_propagate_course_move'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='claim_note_pdf_validation' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='49a14d699eec069b21ba4eeb04ef6bedbc545e4d03a0b0b8df8bd26b9c521c53' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: claim_note_pdf_validation'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='claim_payment_jobs' AND pg_get_function_identity_arguments(p.oid)='p_kind text, p_limit integer' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='0221e68fa34e83867d77b011ae0cb0f6f22c7db11a588b39ecd85db394ca7570' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: claim_payment_jobs'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='claim_play_payment_jobs' AND pg_get_function_identity_arguments(p.oid)='p_kind text, p_limit integer' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='be6a6ab3c4dfd92903d11b27cf9fa5052826a119a896890d4644854acfbbf551' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: claim_play_payment_jobs'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='claim_play_price_sync' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='0add63d3c25395d7b448e309232ea840c691a889dbb0ba54f0348a7771409ecc' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: claim_play_price_sync'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='claim_play_recovery_cursor' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='9ec2a525f27c2c4cb28db7e2240c2a6bb0801be252e755881642c8920b492957' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: claim_play_recovery_cursor'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='claim_play_void_sweep' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='d7e068d5ea22a9043e40ec103093618fcea8fbc809f58b65a6eb3e98f4cafd3f' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: claim_play_void_sweep'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='claim_ucb_external_refund' AND pg_get_function_identity_arguments(p.oid)='p_refund_id text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='6122e8288416ff68c5a18e427473e3a761a8e7a603b379476ad9143d277b03f8' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: claim_ucb_external_refund'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='content_is_published' AND pg_get_function_identity_arguments(p.oid)='p_course_id text, p_year_id text, p_subject_id text, p_chapter_id text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='a124d0f8c632d154c603071ba0a1fa833b70f3ad3a9be22d87ebc9f92e9793ac' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: content_is_published'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='create_play_order' AND pg_get_function_identity_arguments(p.oid)='p_user_id uuid, p_product_id text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='df84e02eb0accdb200e68a1d47c503f0844076da8e42b7bc9e32b5678486caa5' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: create_play_order'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='create_priced_order' AND pg_get_function_identity_arguments(p.oid)='p_user_id uuid, p_product_id text, p_use_wallet boolean' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='9e986431c18784459a8ea9e55f7f55079fe9a133ce5216c808a0f42efc7070f6' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: create_priced_order'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='create_priced_order_legacy' AND pg_get_function_identity_arguments(p.oid)='p_user_id uuid, p_product_id text, p_use_wallet boolean' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='c1e7fbe6a2686ac547a68b237d0529225e89b72f31754177f9595b66d0547f17' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: create_priced_order_legacy'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='delete_my_account' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='fb0f51323d3fe4b2ab30ea4400fa08f0fe7bf1c40224a39323cc13abc48b87fe' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: delete_my_account'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='enqueue_payment_jobs' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='4b72c6aeae04c8e7e3800b297c7b83ce567bb6a663c28c4776810ac73cc5b080' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: enqueue_payment_jobs'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='enqueue_play_payment_jobs' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='e6526437fc175d950cb5a1e01af4f6c7cadc2e00ff79380deccb1f073d7b2a54' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: enqueue_play_payment_jobs'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='erase_user_data' AND pg_get_function_identity_arguments(p.oid)='p_user_id uuid' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='a30810487ac9bd1845ce1c442b4b42cce4e10a44e15809b887fcb28198a1b28a' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: erase_user_data'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='fail_play_price_sync' AND pg_get_function_identity_arguments(p.oid)='p_price numeric, p_lease uuid, p_reason text, p_retry boolean' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='9864887719aa67a2e82577f2eabe7306ae616a7dfbf9b40c917a60e1f9178db7' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: fail_play_price_sync'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='finish_note_pdf_validation' AND pg_get_function_identity_arguments(p.oid)='p_request_id uuid, p_lease uuid, p_outcome text, p_error text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='933586ffdb68f004b97d84eb30984bd3bc5371d9cd6b4d8c110c6d1e9c1c080a' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: finish_note_pdf_validation'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='finish_payment_job' AND pg_get_function_identity_arguments(p.oid)='p_kind text, p_target_id text, p_lease_id uuid, p_success boolean, p_error text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='222196f5f426d057f1248c8bd97f27f05b0c10e72972bdf27a8e66f8dfca4683' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: finish_payment_job'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='finish_play_payment_job' AND pg_get_function_identity_arguments(p.oid)='p_kind text, p_order_id text, p_lease_id uuid, p_success boolean, p_error text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='305c8ca9c338c5bb1a06f7e0603c662a8295f14b52cbcc782d54581eacdd4eec' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: finish_play_payment_job'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='finish_play_price_sync' AND pg_get_function_identity_arguments(p.oid)='p_price numeric, p_lease uuid, p_sku text, p_option text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='61aef2481cebd16581b09245d7ba21bc668b76464299080c749ed5eabec1eaf4' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: finish_play_price_sync'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='finish_play_recovery_cursor' AND pg_get_function_identity_arguments(p.oid)='p_lease_id uuid, p_success boolean, p_next_page_token text, p_error text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='b3109abe5d9ebffab1784496011748c50c3b1d778f8c77cef537dd056a17fdfd' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: finish_play_recovery_cursor'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='generate_unique_referral_code' AND pg_get_function_identity_arguments(p.oid)='p_length integer' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='f87fbda1d97cfb9b98521cb8a3b53c303b092428cfc32f64e8e5adfbc094134e' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: generate_unique_referral_code'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='get_admin_quiz_tests' AND pg_get_function_identity_arguments(p.oid)='p_course_id text, p_year_id text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='54ce42f675417b943265397de38e13c918af2a73210198b00e37fad53009ac3a' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: get_admin_quiz_tests'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='get_maintenance_mode' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='17cdebdd376bcffbc769b4918ac37baa3fdc74c72dc0113241b29a1fc21bf2db' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres,anon=X/postgres,authenticated=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: get_maintenance_mode'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='get_my_referral_list' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='95b41c018dc9d41675081b8ff3d137e9dfff968a28314d9a2a50edb503c7110c' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: get_my_referral_list'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='get_my_referrals' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='3f12c0c0076eb335bfa1ac49daf83fbf5affcfbdf25da5b7c61f9f5ace06442e' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: get_my_referrals'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='get_my_wallet' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='20179a1aa6c5a874407008ebf8889a003e3ed01b531e8a2f70c97633935a846f' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: get_my_wallet'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='get_public_quiz_tests' AND pg_get_function_identity_arguments(p.oid)='p_subject_id text, p_test_id text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='acb580a5c4fe1c3f11eeaeb06b43eb7b25a568f613ad24be46e64797f688672d' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: get_public_quiz_tests'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='grant_razorpay_payment' AND pg_get_function_identity_arguments(p.oid)='p_event_id text, p_razorpay_order_id text, p_razorpay_payment_id text, p_amount_paise bigint' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='f5ba28431a0afed1208e6cce26989f79204e44d9c7adc0b7a99c3680f8db7dce' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: grant_razorpay_payment'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='handle_new_user' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='b9add355be3c2a238e4b5d37b0aafaaa9533d6da998028c9644a41b3fe186671' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: handle_new_user'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='handle_payment_dispute' AND pg_get_function_identity_arguments(p.oid)='p_razorpay_payment_id text, p_outcome text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='31693ec89f4cc79b1c6c3b084242e7151de9ffc1b9c775bb0237a04d05cc735b' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: handle_payment_dispute'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='handle_payment_refund' AND pg_get_function_identity_arguments(p.oid)='p_razorpay_payment_id text, p_full_refund boolean' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='fbfd4bdd21004a8f08d70c155fe5518ffcc741e812eb88298d22b1bcfb20f4bd' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: handle_payment_refund'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='has_content_access' AND pg_get_function_identity_arguments(p.oid)='p_course_id text, p_year_id text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='fc2882b08c8b6aefd48ab409837c1d8543f8c094830b1a7901aab28b646c373b' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: has_content_access'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='has_prior_purchase_identity' AND pg_get_function_identity_arguments(p.oid)='p_uid uuid' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='64a5abfdc2328f029aabc595621b5fba32c744f380454c0051e5f42fe3419962' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: has_prior_purchase_identity'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='identity_hash' AND pg_get_function_identity_arguments(p.oid)='p_kind text, p_value text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='84a39e6289cc055ec6f07854277f8c0d449b116fab8d3cdf2fd18711cdec4cf1' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: identity_hash'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='is_admin_account' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='4ba33e2dfdb4503f74b9e43bb8330567181b721deb8a018f69a84ccf0c78c260' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: is_admin_account'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='log_referral_settings_change' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='adaeecd96946c2a6adcc662fa62327dc47da47fb92c53018140410f0534bad82' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: log_referral_settings_change'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='mark_ucb_report_attempt' AND pg_get_function_identity_arguments(p.oid)='p_order_id text, p_refund boolean' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='f789ba6c469cad652c33c494137a2c1a8fbc2bc0c6f0deaca46573e9fedfe5c2' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: mark_ucb_report_attempt'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='my_course_id' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='1d9d2abb4014be3dda8798f59d7679bf16bb172976fe25cff25e7f5feae5d3a0' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: my_course_id'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='my_year_id' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='4eb7595a01172a21ccad892b6c2a955928af9f5414ddc89bd8ba4cb2f787d3b9' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: my_year_id'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='normalize_phone' AND pg_get_function_identity_arguments(p.oid)='input text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='7c53a8366a69b5c2fc42adbb7fe8e534ce9426737158e2d685a27c3eb78d0291' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: normalize_phone'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='notes_derive_course' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='842f1ae6d608dfe41cc0e10eed5cdd530f1cdf3f68f3eb50053adca73cc021c7' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: notes_derive_course'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='orders_derive_course' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='a79f7a54673a212e1eee2ed9cfef3eae5753b6c77b8c79375169ce4b3e46b005' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: orders_derive_course'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='orders_entitlement_immutable' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='bdf415ce41b943547e54166d0cf9ec6b961ebd217d3b9ee3a177d53d61b9bd05' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: orders_entitlement_immutable'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='orders_guard_client_writes' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='bbf1c02e5de6412a142dafcc35d2376a310b7b9edcb9aee2d4b281a84df0a99f' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: orders_guard_client_writes'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='orders_immutable_columns' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='f855ef44c44460b832597e78cdd735c5929649f0708cf6287f62e0eb1930eadb' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: orders_immutable_columns'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='orders_play_option_immutable' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='5a3c2f5000c3781e2679f0e57f17f46927b05f73a8be75a56099e3d5c21bc955' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: orders_play_option_immutable'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='orders_reserve_first_discount' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='0afc0919d47c5be813f765271c7f50921e7f669ebcb5d65c3b8b368c3c14ed4c' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: orders_reserve_first_discount'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='orders_snapshot_tax' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='e584e63277a790d338742ce7b3907a3972e3a9e798da66d1b09555071e50d415' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: orders_snapshot_tax'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='play_notes_product_eligible' AND pg_get_function_identity_arguments(p.oid)='p products' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='7ee96689917c2ceb96fd4aecb9e561604e0449e5897516184943bfae85807661' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: play_notes_product_eligible'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='play_price_has_eligible_product' AND pg_get_function_identity_arguments(p.oid)='p_price numeric' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='763ba3d2ae331bb95f1257e7a7af235030e5ee8a31f1513edb9ce0fdf5685923' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: play_price_has_eligible_product'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='play_purchase_entitlement_from_order' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='78c61c2656561d05b8ef0ee1ccc05ce4edd9dc3937389bbf20b9cd091edd08a2' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: play_purchase_entitlement_from_order'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='products_derive_course' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='adfdf554179559bca6ed2abdafa00b9f5015c5984576c2b4f46e1b95dcba38af' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: products_derive_course'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='profiles_before_write' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='c8090a5684169d3904940220426d4742c17cb8e2a6f0457badc7a7cf91c7be5e' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: profiles_before_write'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='profiles_generate_referral_code' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='7c24338a680afb5f6c578184e22911556bf162cf0393c9451a75a7ea666a9d32' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: profiles_generate_referral_code'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='profiles_temp_default_course' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='c46fe082ae52fa2961d900bd7ddb0107adf85a948a392370ac1055ba0b67e129' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: profiles_temp_default_course'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='purge_expired_first_purchase_identities' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='00dc7277b2788f7ad215a88d6d6e2e2d4e0815ae4137e8cadc5bb461e134483e' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: purge_expired_first_purchase_identities'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='purge_old_analytics_events' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='d0fcb7db70dfb398dbb5a9bf9e37d51172fd783d73ece10d1915ee86df106194' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: purge_old_analytics_events'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='purge_old_payment_sessions' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='b27e9c48d26ef87fd1928e35d9fe1aa48b96270f838c91f22a31f64883e37b0d' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: purge_old_payment_sessions'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='push_tokens_cap' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='3b738391f14beb1372aa600e9cbaebe96c15805ed65bd640947fe6c5870cba57' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: push_tokens_cap'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='queue_notes_play_price' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='5d502b97c52013ced3ee614aa30e3e2661ae55f981356dedf56aa9c7721cbfff' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: queue_notes_play_price'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='queue_play_price_sync' AND pg_get_function_identity_arguments(p.oid)='p_price numeric' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='7ccd521c225188da96a65370a093b56bfa67e9a303c04c886b0296525eb384a5' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: queue_play_price_sync'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='queue_product_play_price' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='05ac79ff85866f2a6e952d7185b19dfd846cc3f0f4c7c5be85e42d1b5221ebb5' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: queue_product_play_price'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='quiz_scores_own_email' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='987a98ae92bffe4f4ebcae57e4b0866fae14ad4922d5e26722df3f2f3fdc1a03' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: quiz_scores_own_email'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='quiz_scores_rate_limit' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='3fac4175e7c7bfcf17cba2066ce269c47f30c3c9b2519af9109a1aeedb48db76' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: quiz_scores_rate_limit'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='quiz_tests_derive_course' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='033dc951275dc542c9d316bad316f0b05129e828359980320d9e5446782bd6ea' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: quiz_tests_derive_course'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='quote_my_order' AND pg_get_function_identity_arguments(p.oid)='p_product_id text, p_use_wallet boolean' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='98e717512e9365d000bfdf4632bbadacc8ef9bb1b5bdffbd8c67e34bfd1c2627' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: quote_my_order'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='quote_my_order_legacy' AND pg_get_function_identity_arguments(p.oid)='p_product_id text, p_use_wallet boolean' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='0edb949cb92652f14ae6160b3dad73bb8e1c70bb5733be58330f449d99eee3fb' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: quote_my_order_legacy'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='rate_limit_hit' AND pg_get_function_identity_arguments(p.oid)='p_key text, p_limit integer, p_window_seconds integer' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='675f1a6597d092d8222916333e3c0bf63ea2544f74538c9e51cfea4437a8f031' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: rate_limit_hit'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='razorpay_purchase_entitlement_from_order' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='0fb068a7aa8e53ef1ff1c41c24558a327ac4e532d0076ef0636d3c08439f9ebf' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: razorpay_purchase_entitlement_from_order'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='record_payment_capture' AND pg_get_function_identity_arguments(p.oid)='p_payment_id text, p_razorpay_order_id text, p_amount_paise bigint, p_provider_time timestamp with time zone' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='c28455d0a821d0945a33a5a94d9d8f66681a70ada477568605b16176369ef2c3' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: record_payment_capture'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='record_play_void_tokens' AND pg_get_function_identity_arguments(p.oid)='p_tokens text[]' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='fb06e9f9f473588c4343ea664e3ad37f29fcb0aca7f6c640f91c5d45e9ba3651' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: record_play_void_tokens'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='record_provider_event' AND pg_get_function_identity_arguments(p.oid)='p_event_id text, p_event_type text, p_razorpay_order_id text, p_payment_id text, p_provider_object_id text, p_payload_hash text, p_provider_time timestamp with time zone' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='3fa7c132c527532c50050a79c78a0943cb9f213a0e93d367654b5acc470fe6b8' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: record_provider_event'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='record_purchase_identity' AND pg_get_function_identity_arguments(p.oid)='p_uid uuid' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='91af31b38e53d8dedb5fa3da9a4598cd491a65d2ef9ceb68fe13a914f06fe53f' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: record_purchase_identity'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='register_push_token' AND pg_get_function_identity_arguments(p.oid)='p_token text, p_platform text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='921f0920646aa415ef7dc98d18cfac7784048a0ef84da598c4af307587fbd4f5' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: register_push_token'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='release_due_wallet_credits' AND pg_get_function_identity_arguments(p.oid)='p_user uuid' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='7b3301df6ddf7aff0a7075f6746f630aa60105bb93bbda8bf11ce095a58c3db0' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: release_due_wallet_credits'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='requeue_stale_play_price_sync' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='534cbecdae4635ebb21b98c7c178a4dae8aee7d8c87bf2f4173d0c3cf7e18adb' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: requeue_stale_play_price_sync'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='reserve_note_pdf_validation' AND pg_get_function_identity_arguments(p.oid)='p_request_id uuid, p_admin uuid, p_hash text, p_bytes bigint, p_url text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='53eef6e3601dffa37210db65cbd538ee1334a399c097d93290f0102a619b9add' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: reserve_note_pdf_validation'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='retry_play_price_sync' AND pg_get_function_identity_arguments(p.oid)='p_price numeric' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='7d6048427d53f5c8168b1385afbff2927e7397ced5c4144005f19102cc8710ae' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: retry_play_price_sync'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='reverse_payment' AND pg_get_function_identity_arguments(p.oid)='p_razorpay_payment_id text, p_purchase_status text, p_restore_wallet boolean' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='e387f1878b834e0c4084aa8f066b8d242d8ba66a6db9965fd0cf05a889730704' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: reverse_payment'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='reverse_play_payment' AND pg_get_function_identity_arguments(p.oid)='p_purchase_token text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='1575e2ce057b356b1e93696317356552b4899c3227f7f0d54b86627161faf9e4' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: reverse_play_payment'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='rls_auto_enable' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='62e77d28f3013a8047bb431be5f8b174ad51cdde883dcc3b0d6c6c0a84e954a3' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: rls_auto_enable'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='rotate_play_price_sku' AND pg_get_function_identity_arguments(p.oid)='p_price numeric, p_lease uuid, p_reason text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='706fa67c8482cd72e065b6912f3c5542dc99916efb6d84de2d55bf8df5cf9dee' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: rotate_play_price_sku'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='save_note_with_upload' AND pg_get_function_identity_arguments(p.oid)='p_request_id uuid, p_note_id text, p_title text, p_description text, p_chapter_id text, p_order integer, p_active boolean, p_is_free_preview boolean' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='fc4445581a7ca394fe4847f3303142d2b7b76db7615ebe56becce54f2ea7005b' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: save_note_with_upload'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='set_admin_mfa_required' AND pg_get_function_identity_arguments(p.oid)='p_required boolean' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='8d3133f9db18b7aefa6b3fbaa870a43114794298fd84426093cc0d6be2cd2b82' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: set_admin_mfa_required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='set_my_course_year' AND pg_get_function_identity_arguments(p.oid)='p_course_id text, p_year_id text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='e20d0b7b901c479e474f649675492c1b2f8bbb71d2c4956d72efeb8efbdc12dc' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: set_my_course_year'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='settle_play_purchase' AND pg_get_function_identity_arguments(p.oid)='p_user_id uuid, p_order_id text, p_product_id text, p_play_sku text, p_purchase_token text, p_paid_at timestamp with time zone' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='f786a68cf69e37e83645e546175abf4f20e066dd6a976cd7c322e421c286446c' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: settle_play_purchase'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='settle_razorpay_payment' AND pg_get_function_identity_arguments(p.oid)='p_event_id text, p_razorpay_order_id text, p_razorpay_payment_id text, p_amount_paise bigint, p_paid_at timestamp with time zone' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='25457888b99e1ee22dd93f6d2ad939c5cddd86916349f46d229846437d85e0da' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: settle_razorpay_payment'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='settle_razorpay_payment_legacy' AND pg_get_function_identity_arguments(p.oid)='p_event_id text, p_razorpay_order_id text, p_razorpay_payment_id text, p_amount_paise bigint, p_paid_at timestamp with time zone' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='0b2c18c2c81cd289b711441919c6dec32daf869b6b673c92612c4fa2a4d8c5f4' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: settle_razorpay_payment_legacy'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='subjects_derive_course' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='cc957ed054d90ef31f3a982ce394b61337491d04402eb30f85f987f1e909ed6a' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: subjects_derive_course'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='subjects_propagate_course_move' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='e4e8122ec6b380fc238d9e99de624188d015ea81219d95de7ec07f86e121408d' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: subjects_propagate_course_move'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='submit_quiz_attempt' AND pg_get_function_identity_arguments(p.oid)='p_attempt_id text, p_test_id text, p_question_revision bigint, p_answers jsonb' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='0f46cd39c8b99e0d47e3106969ec991b45fe944ce264e3cfbb1d6d9b7b925cbf' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: submit_quiz_attempt'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='sync_profile_email' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='27084de61a8221a4c5df294b05927c4c099490c0441ac7eff7b3da2695cd3c9e' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: sync_profile_email'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='sync_profile_mobile_verified' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='05e74d8bd98f779b6c4052d2288972460bbedbfc5370350058081d745cea5b3d' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: sync_profile_mobile_verified'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='sync_profile_phone_normalized' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='6cd8ea88f6ec43b26106c4976d38cea1e356d528d69d301705dc72eb2b81fffc' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: sync_profile_phone_normalized'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='touch_profile_updated_at' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='b3c8ce2c299d4bc0beeed8b1938c532d9e75579445943abb4a79d9116f7dc549' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: touch_profile_updated_at'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='user_can_access_note' AND pg_get_function_identity_arguments(p.oid)='p_user uuid, p_note_id text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='859cef94e3ebc9d0367c0e548248777ca4088206e32990c217fe0d639142a25b' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: user_can_access_note'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='user_can_access_note_with_aal' AND pg_get_function_identity_arguments(p.oid)='p_user uuid, p_note_id text, p_aal text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='8a00351f5ccdc0e64a828d4085560a0739092fb713ab101b3c3677b1171c495a' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: user_can_access_note_with_aal'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='user_can_access_video' AND pg_get_function_identity_arguments(p.oid)='p_user uuid, p_video_id text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='0087129a306667e084a77315756dc048db7035a751cc28269177a1ec8afbc91f' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: user_can_access_video'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='user_can_access_video_with_aal' AND pg_get_function_identity_arguments(p.oid)='p_user uuid, p_video_id text, p_aal text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='03fb0169221b4360f55d61cb388914a71ccfbb0c7a930c23bc68a7b57e18fe15' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: user_can_access_video_with_aal'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='user_owns_chapter' AND pg_get_function_identity_arguments(p.oid)='p_chapter_id text' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='e09bfbd94921e5a0c9f9d04973f163db4d2708a39c538c2b0178a826b9fb35ff' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: user_owns_chapter'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='videos_derive_course' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='68b5675d024ca118254303d6c9e58f63d6cac4c6e971b8436874fc43e4bbf45c' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: videos_derive_course'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='wallet_balance_of' AND pg_get_function_identity_arguments(p.oid)='p_user uuid' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='7dd6ecf779f6fb91a61bfa7a2b21f9084b3adaf1365ade74b940d663b23ac265' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: wallet_balance_of'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='wallet_ledger_append_only' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='d8e2eea5d1c83ef01ebfb7adb6108b9c6e48e28e5a4039abb429680d252ffd32' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: wallet_ledger_append_only'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='wallet_ledger_no_overdraw' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='87bf8c216ef034fc90b213ea91a2689d49b2d8728e600d99fb860b1624618d67' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: wallet_ledger_no_overdraw'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='wallet_ledger_no_truncate' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='2df356aafbd60c72e86c450f765a44e3d27b6ee0b26294970919bae931ae0ddd' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: wallet_ledger_no_truncate'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='years_before_write' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='9265d7201a16aed729e16d82baedc4e2236ca3c4004a45140934223e7c7453e0' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: years_before_write'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='years_propagate_course_move' AND pg_get_function_identity_arguments(p.oid)='' AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')='994983750b0fce582235c3650ce54fb25a14f05d98ebb379617e4caaeae872ee' AND pg_get_userbyid(p.proowner)='postgres' AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'pinned function drift: years_propagate_course_move'; END IF;
END $pinned_preimages$;
DO $a_ledger$ BEGIN
IF NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261110100000' AND name='mv003_razorpay_entitlement_commitment' AND cardinality(statements)=1 AND md5(statements[1])='7ca0d1f30eb5a0e6191a01a4b2afcb16') THEN RAISE EXCEPTION 'Phase A exact ledger source mismatch'; END IF;
IF NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261110120000' AND name='mv005_razorpay_order_transitions' AND cardinality(statements)=1 AND md5(statements[1])='d4c9a7d8b82fe2fd9c12ab8800e6be61') THEN RAISE EXCEPTION 'Phase A exact ledger source mismatch'; END IF;
IF NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261110130000' AND name='mv006_purchase_ownership_guard' AND cardinality(statements)=1 AND md5(statements[1])='ec5e704ae193a27125c9c6f0e91123fa') THEN RAISE EXCEPTION 'Phase A exact ledger source mismatch'; END IF;
END $a_ledger$;
DO $preservation$
DECLARE t text; v text;
BEGIN
 FOREACH t IN ARRAY['orders','payments','purchases','products','payment_captures','payment_compensations','provider_events','payment_jobs','ucb_external_refunds']::text[] LOOP
 EXECUTE format('SELECT md5(coalesce(string_agg(j::text, E''\n'' ORDER BY j::text),'''')) FROM (SELECT to_jsonb(x) - ARRAY[''ucb_transaction_time'',''external_report_test_purchase'',''blocks_entitlement''] AS j FROM public.%I x) q',t) INTO v;
 PERFORM set_config('medveda.before_'||t,v,true);
 END LOOP;
END $preservation$;

-- C1 SOURCE SHA256 bf0452bc97960bc15c7954d44303cb1009f7f8dfb66721ea627a6f952aff4427
-- Notes-only UCB checkout. Apply after the November pricing/reservation migration.
-- No client writes. A choice reserves exactly one priced order BEFORE contacting
-- Razorpay. Ambiguous provider creation is never retried as a new provider order.
create table public.notes_choice_checkouts (
  choice_id text primary key references public.orders(id),
  order_id text not null unique references public.orders(id),
  use_wallet boolean not null,
  buyer_state text not null,
  state text not null default 'creating' check(state in ('creating','ready','unknown')),
  created_at timestamptz not null default now()
);
alter table public.notes_choice_checkouts enable row level security;
revoke all on public.notes_choice_checkouts from public,anon,authenticated;
grant all on public.notes_choice_checkouts to service_role;

create or replace function public.prepare_notes_choice_checkout(
  p_user_id uuid,p_choice_id text,p_product_id text,p_use_wallet boolean,p_buyer_state text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.orders%rowtype; a public.notes_choice_checkouts%rowtype;
  o public.orders%rowtype; p public.products%rowtype; priced jsonb;
begin
  if p_buyer_state is null or p_buyer_state <> all(array['ANDAMAN AND NICOBAR ISLANDS','ANDHRA PRADESH','ARUNACHAL PRADESH','ASSAM','BIHAR','CHANDIGARH','CHHATTISGARH','DADRA AND NAGAR HAVELI','DADRA AND NAGAR HAVELI AND DAMAN AND DIU','DAMAN AND DIU','DELHI','GOA','GUJARAT','HARYANA','HIMACHAL PRADESH','JAMMU AND KASHMIR','JHARKHAND','KARNATAKA','KERALA','LADAKH','LAKSHADWEEP','MADHYA PRADESH','MAHARASHTRA','MANIPUR','MEGHALAYA','MIZORAM','NAGALAND','ODISHA','PUDUCHERRY','PUNJAB','RAJASTHAN','SIKKIM','TAMIL NADU','TELANGANA','TRIPURA','UTTAR PRADESH','UTTARAKHAND','WEST BENGAL']) then return jsonb_build_object('ok',false,'code','buyer_state_invalid'); end if;
  perform pg_advisory_xact_lock(hashtextextended('wallet:' || p_user_id::text,0));
  select * into c from public.orders where id=p_choice_id for update;
  if not found or c.user_id is distinct from p_user_id or c.product_id is distinct from p_product_id
      or c.provider<>'play' or c.purchase_token is not null or c.play_sku is null then
    return jsonb_build_object('ok',false,'code','choice_unavailable');
  end if;
  if not exists(select 1 from public.profiles where id=p_user_id and not blocked) then
    return jsonb_build_object('ok',false,'code','account_unavailable');
  end if;
  select * into p from public.products where id=p_product_id and active;
  if not found or ((p.scope='bundle' and p.product_type='notes_bundle')
      or (p.scope in ('chapter','subject','year') and p.product_type='notes')) is not true then
    return jsonb_build_object('ok',false,'code','notes_unavailable');
  end if;
  select * into a from public.notes_choice_checkouts where choice_id=p_choice_id;
  if found then
    if a.use_wallet is distinct from p_use_wallet or a.buyer_state is distinct from p_buyer_state then
      return jsonb_build_object('ok',false,'code','choice_parameters_changed');
    end if;
    select * into o from public.orders where id=a.order_id;
    if o.user_id is distinct from p_user_id or o.product_id is distinct from p_product_id
        or o.status<>'created' or o.expires_at<=now() then
      return jsonb_build_object('ok',false,'code','checkout_expired');
    end if;
    return jsonb_build_object('ok',true,'claimed',false,'order_id',o.id,'state',a.state);
  end if;
  if c.status<>'created' or c.external_transaction_token is null
      or c.external_choice_bound_order_id is not null or c.expires_at is null or c.expires_at<=now() then
    return jsonb_build_object('ok',false,'code','choice_expired');
  end if;
  -- Same authoritative pricing, friend discount and wallet reservations as web.
  priced:=public.create_priced_order(p_user_id,p_product_id,p_use_wallet);
  if not coalesce((priced->>'ok')::boolean,false) then return priced; end if;
  select * into o from public.orders where id=priced->>'order_id' for update;
  if o.provider<>'razorpay' or o.user_id is distinct from p_user_id
      or o.product_id is distinct from p_product_id or o.tax_pre_amount is null
      or o.tax_amount is null or o.gst_rate_percent is null
      or o.tax_pre_amount+o.tax_amount<>o.amount then raise exception 'Invalid priced Notes order'; end if;
  -- Explicitly cancel even if the pricing implementation changes in the future.
  update public.orders set status='cancelled' where id=c.id and status='created';
  update public.orders set external_transaction_token=null,external_choice_bound_order_id=o.id where id=c.id;
  update public.orders set external_transaction_token=c.external_transaction_token,
    external_transaction_id='medveda_' || replace(o.id,'-',''),external_report_status='pending',
    play_sku=c.play_sku,tax_region_code='IN',tax_administrative_area=p_buyer_state where id=o.id;
  insert into public.notes_choice_checkouts(choice_id,order_id,use_wallet,buyer_state)
    values(c.id,o.id,p_use_wallet,p_buyer_state);
  return jsonb_build_object('ok',true,'claimed',true,'state','creating','order_id',o.id);
end $$;
revoke all on function public.prepare_notes_choice_checkout(uuid,text,text,boolean,text) from public,anon,authenticated;
grant execute on function public.prepare_notes_choice_checkout(uuid,text,text,boolean,text) to service_role;

-- Attachment retries are valid after the token was transferred to its one
-- Razorpay order. Never move it to a second order or accept a different token.
create or replace function public.attach_ucb_external_token(p_user_id uuid,p_order_id text,p_token text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype;
begin
  if p_token is null or length(p_token)<10 or length(p_token)>4096 then
    return jsonb_build_object('ok',false,'code','invalid_token'); end if;
  perform pg_advisory_xact_lock(hashtextextended('wallet:' || p_user_id::text,0));
  select * into o from public.orders where id=p_order_id for update;
  if not found or o.user_id is distinct from p_user_id or o.provider<>'play' or o.purchase_token is not null then
    return jsonb_build_object('ok',false,'code','order_unavailable'); end if;
  if o.external_choice_bound_order_id is not null then
    if exists(select 1 from public.orders where id=o.external_choice_bound_order_id
      and user_id=p_user_id and product_id=o.product_id and provider='razorpay' and external_transaction_token=p_token) then
      return jsonb_build_object('ok',true); end if;
    return jsonb_build_object('ok',false,'code','token_already_attached');
  end if;
  if o.status<>'created' or o.expires_at<now() then
    return jsonb_build_object('ok',false,'code','order_unavailable'); end if;
  if o.external_transaction_token is not null and o.external_transaction_token<>p_token then
    return jsonb_build_object('ok',false,'code','token_already_attached'); end if;
  update public.orders set external_transaction_token=p_token where id=p_order_id and external_transaction_token is null;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.attach_ucb_external_token(uuid,text,text) from public,anon,authenticated;
grant execute on function public.attach_ucb_external_token(uuid,text,text) to service_role;
-- Authorisation queues reporting without granting access. The immutable provider
-- payment creation time is shared by authorized/captured deliveries so retries
-- cannot change Google's transaction timestamp. Existing website orders skip it.
alter table public.orders add column if not exists ucb_transaction_time timestamptz;
create or replace function public.record_notes_choice_authorization(
  p_order_id text,p_provider_time timestamptz)
returns void language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id=p_order_id for update;
  if not found or o.provider<>'razorpay' or o.external_transaction_token is null then return; end if;
  if p_provider_time is null or p_provider_time>now()+interval '5 minutes' then
    raise exception 'Invalid provider authorisation time'; end if;
  update public.orders set ucb_transaction_time=coalesce(ucb_transaction_time,p_provider_time)
    where id=o.id;
  insert into public.payment_jobs(kind,target_id,deadline_at)
    values('reports',o.id,coalesce(o.ucb_transaction_time,p_provider_time)+interval '24 hours')
    on conflict(kind,target_id) do nothing;
end $$;
revoke all on function public.record_notes_choice_authorization(text,timestamptz) from public,anon,authenticated;
grant execute on function public.record_notes_choice_authorization(text,timestamptz) to service_role;
create or replace function public.enqueue_payment_jobs() returns void
language plpgsql security definer set search_path=public as $$
begin
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'reports',o.id,coalesce(o.ucb_transaction_time,o.payment_provider_time,o.payment_completed_at,o.created_at)+interval '24 hours'
  from public.orders o where o.external_transaction_token is not null
    and o.external_report_status in ('pending','failed') and o.status in ('paid','refunded')
  on conflict(kind,target_id) do update set deadline_at=excluded.deadline_at;
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'refunds',r.refund_id,r.refund_time+interval '24 hours'
  from public.ucb_external_refunds r where r.status in ('pending','failed','processing')
  on conflict(kind,target_id) do nothing;
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'consume',o.id,coalesce(o.payment_completed_at,o.created_at)+interval '24 hours'
  from public.orders o where o.provider='play' and o.status='paid'
    and o.play_consumption_status in ('pending','failed')
  on conflict(kind,target_id) do nothing;
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'reconcile',o.id,coalesce(o.play_last_checked_at,o.created_at)+interval '2 hours'
  from public.orders o where o.provider='play' and o.status='paid' and o.purchase_token is not null
    and (o.play_last_checked_at is null or o.play_last_checked_at<now()-interval '2 hours')
  on conflict(kind,target_id) do update set status='pending', next_attempt_at=now(),
    deadline_at=excluded.deadline_at, attempts=0, lease_id=null, lease_until=null
    where public.payment_jobs.status='done';
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'compensate',c.payment_id,c.created_at+interval '24 hours'
  from public.payment_compensations c where c.status in ('pending','processing')
  on conflict(kind,target_id) do nothing;
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'events',e.event_id,e.received_at+interval '24 hours'
  from public.provider_events e where e.status='pending' and e.payment_id is not null
    and exists(select 1 from public.orders o where o.razorpay_payment_id=e.payment_id)
    and e.event_type in ('refund.processed','payment.dispute.created','payment.dispute.under_review',
      'payment.dispute.action_required','payment.dispute.won','payment.dispute.lost','payment.dispute.closed')
  on conflict(kind,target_id) do nothing;
end $$;
revoke all on function public.enqueue_payment_jobs() from public,anon,authenticated;
grant execute on function public.enqueue_payment_jobs() to service_role;


INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261108100000','notes_choice_checkout',ARRAY[$exact_source$-- Notes-only UCB checkout. Apply after the November pricing/reservation migration.
-- No client writes. A choice reserves exactly one priced order BEFORE contacting
-- Razorpay. Ambiguous provider creation is never retried as a new provider order.
begin;
create table public.notes_choice_checkouts (
  choice_id text primary key references public.orders(id),
  order_id text not null unique references public.orders(id),
  use_wallet boolean not null,
  buyer_state text not null,
  state text not null default 'creating' check(state in ('creating','ready','unknown')),
  created_at timestamptz not null default now()
);
alter table public.notes_choice_checkouts enable row level security;
revoke all on public.notes_choice_checkouts from public,anon,authenticated;
grant all on public.notes_choice_checkouts to service_role;

create or replace function public.prepare_notes_choice_checkout(
  p_user_id uuid,p_choice_id text,p_product_id text,p_use_wallet boolean,p_buyer_state text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.orders%rowtype; a public.notes_choice_checkouts%rowtype;
  o public.orders%rowtype; p public.products%rowtype; priced jsonb;
begin
  if p_buyer_state is null or p_buyer_state <> all(array['ANDAMAN AND NICOBAR ISLANDS','ANDHRA PRADESH','ARUNACHAL PRADESH','ASSAM','BIHAR','CHANDIGARH','CHHATTISGARH','DADRA AND NAGAR HAVELI','DADRA AND NAGAR HAVELI AND DAMAN AND DIU','DAMAN AND DIU','DELHI','GOA','GUJARAT','HARYANA','HIMACHAL PRADESH','JAMMU AND KASHMIR','JHARKHAND','KARNATAKA','KERALA','LADAKH','LAKSHADWEEP','MADHYA PRADESH','MAHARASHTRA','MANIPUR','MEGHALAYA','MIZORAM','NAGALAND','ODISHA','PUDUCHERRY','PUNJAB','RAJASTHAN','SIKKIM','TAMIL NADU','TELANGANA','TRIPURA','UTTAR PRADESH','UTTARAKHAND','WEST BENGAL']) then return jsonb_build_object('ok',false,'code','buyer_state_invalid'); end if;
  perform pg_advisory_xact_lock(hashtextextended('wallet:' || p_user_id::text,0));
  select * into c from public.orders where id=p_choice_id for update;
  if not found or c.user_id is distinct from p_user_id or c.product_id is distinct from p_product_id
      or c.provider<>'play' or c.purchase_token is not null or c.play_sku is null then
    return jsonb_build_object('ok',false,'code','choice_unavailable');
  end if;
  if not exists(select 1 from public.profiles where id=p_user_id and not blocked) then
    return jsonb_build_object('ok',false,'code','account_unavailable');
  end if;
  select * into p from public.products where id=p_product_id and active;
  if not found or ((p.scope='bundle' and p.product_type='notes_bundle')
      or (p.scope in ('chapter','subject','year') and p.product_type='notes')) is not true then
    return jsonb_build_object('ok',false,'code','notes_unavailable');
  end if;
  select * into a from public.notes_choice_checkouts where choice_id=p_choice_id;
  if found then
    if a.use_wallet is distinct from p_use_wallet or a.buyer_state is distinct from p_buyer_state then
      return jsonb_build_object('ok',false,'code','choice_parameters_changed');
    end if;
    select * into o from public.orders where id=a.order_id;
    if o.user_id is distinct from p_user_id or o.product_id is distinct from p_product_id
        or o.status<>'created' or o.expires_at<=now() then
      return jsonb_build_object('ok',false,'code','checkout_expired');
    end if;
    return jsonb_build_object('ok',true,'claimed',false,'order_id',o.id,'state',a.state);
  end if;
  if c.status<>'created' or c.external_transaction_token is null
      or c.external_choice_bound_order_id is not null or c.expires_at is null or c.expires_at<=now() then
    return jsonb_build_object('ok',false,'code','choice_expired');
  end if;
  -- Same authoritative pricing, friend discount and wallet reservations as web.
  priced:=public.create_priced_order(p_user_id,p_product_id,p_use_wallet);
  if not coalesce((priced->>'ok')::boolean,false) then return priced; end if;
  select * into o from public.orders where id=priced->>'order_id' for update;
  if o.provider<>'razorpay' or o.user_id is distinct from p_user_id
      or o.product_id is distinct from p_product_id or o.tax_pre_amount is null
      or o.tax_amount is null or o.gst_rate_percent is null
      or o.tax_pre_amount+o.tax_amount<>o.amount then raise exception 'Invalid priced Notes order'; end if;
  -- Explicitly cancel even if the pricing implementation changes in the future.
  update public.orders set status='cancelled' where id=c.id and status='created';
  update public.orders set external_transaction_token=null,external_choice_bound_order_id=o.id where id=c.id;
  update public.orders set external_transaction_token=c.external_transaction_token,
    external_transaction_id='medveda_' || replace(o.id,'-',''),external_report_status='pending',
    play_sku=c.play_sku,tax_region_code='IN',tax_administrative_area=p_buyer_state where id=o.id;
  insert into public.notes_choice_checkouts(choice_id,order_id,use_wallet,buyer_state)
    values(c.id,o.id,p_use_wallet,p_buyer_state);
  return jsonb_build_object('ok',true,'claimed',true,'state','creating','order_id',o.id);
end $$;
revoke all on function public.prepare_notes_choice_checkout(uuid,text,text,boolean,text) from public,anon,authenticated;
grant execute on function public.prepare_notes_choice_checkout(uuid,text,text,boolean,text) to service_role;

-- Attachment retries are valid after the token was transferred to its one
-- Razorpay order. Never move it to a second order or accept a different token.
create or replace function public.attach_ucb_external_token(p_user_id uuid,p_order_id text,p_token text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype;
begin
  if p_token is null or length(p_token)<10 or length(p_token)>4096 then
    return jsonb_build_object('ok',false,'code','invalid_token'); end if;
  perform pg_advisory_xact_lock(hashtextextended('wallet:' || p_user_id::text,0));
  select * into o from public.orders where id=p_order_id for update;
  if not found or o.user_id is distinct from p_user_id or o.provider<>'play' or o.purchase_token is not null then
    return jsonb_build_object('ok',false,'code','order_unavailable'); end if;
  if o.external_choice_bound_order_id is not null then
    if exists(select 1 from public.orders where id=o.external_choice_bound_order_id
      and user_id=p_user_id and product_id=o.product_id and provider='razorpay' and external_transaction_token=p_token) then
      return jsonb_build_object('ok',true); end if;
    return jsonb_build_object('ok',false,'code','token_already_attached');
  end if;
  if o.status<>'created' or o.expires_at<now() then
    return jsonb_build_object('ok',false,'code','order_unavailable'); end if;
  if o.external_transaction_token is not null and o.external_transaction_token<>p_token then
    return jsonb_build_object('ok',false,'code','token_already_attached'); end if;
  update public.orders set external_transaction_token=p_token where id=p_order_id and external_transaction_token is null;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.attach_ucb_external_token(uuid,text,text) from public,anon,authenticated;
grant execute on function public.attach_ucb_external_token(uuid,text,text) to service_role;
-- Authorisation queues reporting without granting access. The immutable provider
-- payment creation time is shared by authorized/captured deliveries so retries
-- cannot change Google's transaction timestamp. Existing website orders skip it.
alter table public.orders add column if not exists ucb_transaction_time timestamptz;
create or replace function public.record_notes_choice_authorization(
  p_order_id text,p_provider_time timestamptz)
returns void language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id=p_order_id for update;
  if not found or o.provider<>'razorpay' or o.external_transaction_token is null then return; end if;
  if p_provider_time is null or p_provider_time>now()+interval '5 minutes' then
    raise exception 'Invalid provider authorisation time'; end if;
  update public.orders set ucb_transaction_time=coalesce(ucb_transaction_time,p_provider_time)
    where id=o.id;
  insert into public.payment_jobs(kind,target_id,deadline_at)
    values('reports',o.id,coalesce(o.ucb_transaction_time,p_provider_time)+interval '24 hours')
    on conflict(kind,target_id) do nothing;
end $$;
revoke all on function public.record_notes_choice_authorization(text,timestamptz) from public,anon,authenticated;
grant execute on function public.record_notes_choice_authorization(text,timestamptz) to service_role;
create or replace function public.enqueue_payment_jobs() returns void
language plpgsql security definer set search_path=public as $$
begin
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'reports',o.id,coalesce(o.ucb_transaction_time,o.payment_provider_time,o.payment_completed_at,o.created_at)+interval '24 hours'
  from public.orders o where o.external_transaction_token is not null
    and o.external_report_status in ('pending','failed') and o.status in ('paid','refunded')
  on conflict(kind,target_id) do update set deadline_at=excluded.deadline_at;
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'refunds',r.refund_id,r.refund_time+interval '24 hours'
  from public.ucb_external_refunds r where r.status in ('pending','failed','processing')
  on conflict(kind,target_id) do nothing;
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'consume',o.id,coalesce(o.payment_completed_at,o.created_at)+interval '24 hours'
  from public.orders o where o.provider='play' and o.status='paid'
    and o.play_consumption_status in ('pending','failed')
  on conflict(kind,target_id) do nothing;
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'reconcile',o.id,coalesce(o.play_last_checked_at,o.created_at)+interval '2 hours'
  from public.orders o where o.provider='play' and o.status='paid' and o.purchase_token is not null
    and (o.play_last_checked_at is null or o.play_last_checked_at<now()-interval '2 hours')
  on conflict(kind,target_id) do update set status='pending', next_attempt_at=now(),
    deadline_at=excluded.deadline_at, attempts=0, lease_id=null, lease_until=null
    where public.payment_jobs.status='done';
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'compensate',c.payment_id,c.created_at+interval '24 hours'
  from public.payment_compensations c where c.status in ('pending','processing')
  on conflict(kind,target_id) do nothing;
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'events',e.event_id,e.received_at+interval '24 hours'
  from public.provider_events e where e.status='pending' and e.payment_id is not null
    and exists(select 1 from public.orders o where o.razorpay_payment_id=e.payment_id)
    and e.event_type in ('refund.processed','payment.dispute.created','payment.dispute.under_review',
      'payment.dispute.action_required','payment.dispute.won','payment.dispute.lost','payment.dispute.closed')
  on conflict(kind,target_id) do nothing;
end $$;
revoke all on function public.enqueue_payment_jobs() from public,anon,authenticated;
grant execute on function public.enqueue_payment_jobs() to service_role;

commit;
$exact_source$]::text[]);

-- C2 SOURCE SHA256 d62c8f4b17c75bf75df01d73460646381d8154916d835ec1acebe136dac90dee
-- Forward-only billing correctness/recovery. No remote application is authorized.
-- Requires the retained November snapshot and Notes choice migrations.
alter table public.provider_events add column if not exists blocks_entitlement boolean;
alter table public.orders add column if not exists external_report_test_purchase boolean;
-- Opaque tokens may be 4096 characters; a direct btree key can exceed the
-- PostgreSQL index tuple limit. Retain uniqueness with a fixed-width digest.
create unique index if not exists orders_external_token_digest_unique
  on public.orders(extensions.digest(external_transaction_token,'sha256'))
  where external_transaction_token is not null;
drop index if exists public.orders_external_token_unique;
-- Read-only proof used both inside settlement and by Edge after commit.
-- No historical rows/prices are rewritten; legacy entitlements remain intact.
create or replace function public.razorpay_entitlement_committed(p_order_id text,p_payment_id text)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.orders o
   join public.payments m on m.order_id=o.id and m.razorpay_payment_id=p_payment_id
   join public.purchases p on p.order_id=o.id
   where o.id=p_order_id and o.provider='razorpay' and o.status='paid'
     and o.razorpay_payment_id=p_payment_id and o.user_id is not null
     and m.status='success' and m.user_id=o.user_id and m.product_id=o.product_id and m.amount=o.amount
     and not exists(select 1 from public.provider_events e where e.payment_id=p_payment_id
       and e.status='pending' and e.blocks_entitlement is distinct from false
       and e.event_type in ('refund.processed','payment.dispute.created','payment.dispute.under_review',
         'payment.dispute.action_required','payment.dispute.lost'))
     and p.status='success' and p.user_id=o.user_id and p.product_id=o.product_id and p.amount=o.amount
     and row(p.scope,p.chapter_id,p.subject_id,p.year_id,p.year_ids,p.course_id)
       is not distinct from row(o.scope,o.chapter_id,o.subject_id,o.year_id,o.year_ids,o.course_id));
$$;
revoke all on function public.razorpay_entitlement_committed(text,text) from public,anon,authenticated;
grant execute on function public.razorpay_entitlement_committed(text,text) to service_role;

create or replace function public.settle_razorpay_payment(
  p_event_id text,p_razorpay_order_id text,p_razorpay_payment_id text,
  p_amount_paise bigint,p_paid_at timestamptz default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype; v_capture public.payment_captures%rowtype;
  v_reason text; v_reversal boolean; v_error text; v_uid uuid;
begin
  -- Match creation, refund and legacy settlement lock order: user, then order.
  select user_id into v_uid from public.orders where razorpay_order_id=p_razorpay_order_id;
  if v_uid is not null then
    perform pg_advisory_xact_lock(hashtextextended('wallet:' || v_uid::text,0));
  end if;
  select * into v_order from public.orders where razorpay_order_id=p_razorpay_order_id for update;
  if not found then raise exception 'Razorpay order is not linked'; end if;
  if round(v_order.amount*100)::bigint<>p_amount_paise then raise exception 'capture amount mismatch'; end if;
  perform public.record_payment_capture(p_razorpay_payment_id,p_razorpay_order_id,p_amount_paise,null);
  select * into v_capture from public.payment_captures where payment_id=p_razorpay_payment_id for update;
  if v_capture.status in ('compensation_pending','compensated') then
    update public.provider_events set status='applied'
      where event_id=p_event_id and event_type='payment.captured';
    return;
  end if;
  if v_order.razorpay_payment_id is not null and v_order.razorpay_payment_id<>p_razorpay_payment_id then
    insert into public.payment_compensations(payment_id,order_id,amount_paise,reason,refund_request_id)
      values(p_razorpay_payment_id,v_order.id,p_amount_paise,'additional_capture',
        'medveda_comp_' || md5(p_razorpay_payment_id)) on conflict(payment_id) do nothing;
    update public.payment_captures set status='compensation_pending',failure_reason='additional_capture'
      where payment_id=p_razorpay_payment_id;
    update public.provider_events set status='applied' where event_id=p_event_id and event_type='payment.captured';
    return;
  end if;
  -- Link the verified capture so an earlier reversal inbox can be reconciled
  -- even while entitlement is held. This does not mark the order paid.
  update public.orders set razorpay_payment_id=p_razorpay_payment_id
    where id=v_order.id and razorpay_payment_id is null;
  -- A successful capture replay must not become stale merely because time passed.
  -- Reversals still take precedence and never restore access.
  if v_capture.status='granted' and v_order.status='paid' then
    update public.provider_events set status='applied'
      where event_id=p_event_id and event_type='payment.captured';
    return;
  end if;
  -- Unknown reversal facts and open disputes HOLD settlement. A later won
  -- dispute clears the hold; an authenticated full refund/lost dispute reverses.
  -- Never infer a full refund from a refund.processed event alone.
  if v_order.status<>'refunded' and v_capture.status<>'reversed' and exists(
    select 1 from public.provider_events e where e.payment_id=p_razorpay_payment_id
      and e.status in ('pending','applied')
      and e.event_type in ('refund.processed','payment.dispute.created','payment.dispute.under_review',
        'payment.dispute.action_required','payment.dispute.lost')
      and (e.blocks_entitlement is null or (e.blocks_entitlement and
        e.event_type in ('payment.dispute.created','payment.dispute.under_review','payment.dispute.action_required')))) then
    return;
  end if;
  select v_order.status='refunded' or v_capture.status='reversed' or exists(
    select 1 from public.provider_events e where e.payment_id=p_razorpay_payment_id
      and e.blocks_entitlement and e.status in ('pending','applied')
      and e.event_type in ('refund.processed','payment.dispute.lost')) into v_reversal;
  if v_reversal then v_reason:='reversal_received';
  elsif v_order.user_id is null then v_reason:='account_deleted';
  elsif v_order.scope is null or v_order.scope not in ('chapter','subject','year','bundle')
      or (v_order.scope='chapter' and v_order.chapter_id is null)
      or (v_order.scope='subject' and v_order.subject_id is null)
      or (v_order.scope='year' and v_order.year_id is null)
      or (v_order.scope='bundle' and coalesce(array_length(v_order.year_ids,1),0)=0)
      or v_order.course_id is null then v_reason:='missing_entitlement_snapshot';
  elsif v_order.referral_discount>0 and (v_order.status in ('cancelled','failed')
      or (v_order.expires_at is not null and coalesce(p_paid_at,now())>v_order.expires_at)) then
    v_reason:='stale_discount';
  elsif v_order.referral_discount>0 and not exists(select 1 from public.first_discount_reservations
      where order_id=v_order.id and user_id=v_order.user_id) then v_reason:='discount_reused';
  elsif exists(select 1 from public.purchases where user_id=v_order.user_id
      and product_id=v_order.product_id and status='success' and order_id is distinct from v_order.id) then
    v_reason:='already_owned';
  elsif v_order.amount<>v_order.list_price-v_order.referral_discount-v_order.wallet_amount then
    v_reason:='underpriced_order';
  end if;
  if v_reason is null then
    begin
      perform public.settle_razorpay_payment_legacy(p_event_id,p_razorpay_order_id,
        p_razorpay_payment_id,p_amount_paise,p_paid_at);
    exception when others then
      v_error:=sqlerrm;
      if v_error like 'wallet shortfall:%' then v_reason:='wallet_shortfall';
      else raise; end if;
    end;
  end if;
  if v_reason is not null then
    update public.orders set status=case when v_reversal then 'refunded' else 'paid' end,
      razorpay_payment_id=p_razorpay_payment_id, updated_at=now(),
      payment_completed_at=coalesce(payment_completed_at,clock_timestamp())
      where id=v_order.id and status<>'refunded';
    insert into public.payment_compensations(payment_id,order_id,amount_paise,reason,refund_request_id)
      select p_razorpay_payment_id,v_order.id,p_amount_paise,v_reason,
        'medveda_comp_' || md5(p_razorpay_payment_id)
      where not v_reversal on conflict(payment_id) do nothing;
    update public.payment_captures set status=case when v_reversal then 'reversed' else 'compensation_pending' end,
      failure_reason=v_reason where payment_id=p_razorpay_payment_id;
  else
    if not public.razorpay_entitlement_committed(v_order.id,p_razorpay_payment_id) then
      raise exception 'Razorpay entitlement not committed';
    end if;
    update public.payment_captures set status='granted' where payment_id=p_razorpay_payment_id;
  end if;
  update public.orders set payment_provider_time=coalesce(payment_provider_time,v_capture.provider_time),
    payment_received_at=coalesce(payment_received_at,v_capture.received_at),
    payment_completed_at=coalesce(payment_completed_at,clock_timestamp()),
    payment_time_fallback=(v_capture.provider_time is null)
    where id=v_order.id;
  update public.provider_events set status='applied'
    where event_id=p_event_id and event_type='payment.captured';
end $$;
revoke all on function public.settle_razorpay_payment(text,text,text,bigint,timestamptz) from public,anon,authenticated;
grant execute on function public.settle_razorpay_payment(text,text,text,bigint,timestamptz) to service_role;


create or replace function public.attach_ucb_external_token(p_user_id uuid,p_order_id text,p_token text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype;
begin
  if p_token is null or length(p_token)<10 or length(p_token)>4096 or p_token ~ '[[:space:][:cntrl:]]' then
    return jsonb_build_object('ok',false,'code','invalid_token'); end if;
  perform pg_advisory_xact_lock(hashtextextended('wallet:' || p_user_id::text,0));
  select * into o from public.orders where id=p_order_id for update;
  if not found or o.user_id is distinct from p_user_id or o.provider<>'play' or o.purchase_token is not null or o.play_sku is null then
    return jsonb_build_object('ok',false,'code','order_unavailable'); end if;
  if o.external_choice_bound_order_id is not null then
    if exists(select 1 from public.orders where id=o.external_choice_bound_order_id
      and user_id=p_user_id and product_id=o.product_id and provider='razorpay' and external_transaction_token=p_token) then
      return jsonb_build_object('ok',true); end if;
    return jsonb_build_object('ok',false,'code','token_already_attached');
  end if;
  if o.status<>'created' or o.expires_at is null or o.expires_at<=now() then
    return jsonb_build_object('ok',false,'code','order_unavailable'); end if;
  if o.external_transaction_token is not null and o.external_transaction_token<>p_token then
    return jsonb_build_object('ok',false,'code','token_already_attached'); end if;
  if exists(select 1 from public.orders where external_transaction_token=p_token and id<>p_order_id) then
    return jsonb_build_object('ok',false,'code','token_already_attached'); end if;
  update public.orders set external_transaction_token=p_token where id=p_order_id and external_transaction_token is null;
  return jsonb_build_object('ok',true);
exception when unique_violation then
  return jsonb_build_object('ok',false,'code','token_already_attached');
end $$;
revoke all on function public.attach_ucb_external_token(uuid,text,text) from public,anon,authenticated;
grant execute on function public.attach_ucb_external_token(uuid,text,text) to service_role;
create or replace function public.enqueue_payment_jobs() returns void
language plpgsql security definer set search_path=public as $$
begin
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'reports',o.id,coalesce(o.ucb_transaction_time,o.payment_provider_time,o.payment_completed_at,o.created_at)+interval '24 hours'
  from public.orders o where o.external_transaction_token is not null
    and o.external_report_status in ('pending','failed')
    and (o.ucb_transaction_time is not null or o.status in ('paid','refunded'))
  on conflict(kind,target_id) do update set deadline_at=excluded.deadline_at;
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'refunds',r.refund_id,r.refund_time+interval '24 hours'
  from public.ucb_external_refunds r where r.status in ('pending','failed','processing')
  on conflict(kind,target_id) do nothing;
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'consume',o.id,coalesce(o.payment_completed_at,o.created_at)+interval '24 hours'
  from public.orders o where o.provider='play' and o.status='paid'
    and o.play_consumption_status in ('pending','failed')
  on conflict(kind,target_id) do nothing;
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'reconcile',o.id,coalesce(o.play_last_checked_at,o.created_at)+interval '2 hours'
  from public.orders o where o.provider='play' and o.status='paid' and o.purchase_token is not null
    and (o.play_last_checked_at is null or o.play_last_checked_at<now()-interval '2 hours')
  on conflict(kind,target_id) do update set status='pending', next_attempt_at=now(),
    deadline_at=excluded.deadline_at, attempts=0, lease_id=null, lease_until=null
    where public.payment_jobs.status='done';
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'compensate',c.payment_id,c.created_at+interval '24 hours'
  from public.payment_compensations c where c.status in ('pending','processing')
  on conflict(kind,target_id) do nothing;
  -- Captures survive an Edge/SQL outage even if no webhook is delivered again.
  -- Reuse the existing events schedule; these targets cannot collide with provider event IDs.
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'events','capture:' || c.payment_id,c.received_at+interval '24 hours'
  from public.payment_captures c where c.status='captured'
  on conflict(kind,target_id) do nothing;
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'events',e.event_id,e.received_at+interval '24 hours'
  from public.provider_events e where e.status='pending' and e.payment_id is not null
    and (e.event_type in ('payment.captured','payment.authorized') or
      (exists(select 1 from public.orders o where o.razorpay_payment_id=e.payment_id)
    and e.event_type in ('refund.processed','payment.dispute.created','payment.dispute.under_review',
      'payment.dispute.action_required','payment.dispute.won','payment.dispute.lost','payment.dispute.closed')))
  on conflict(kind,target_id) do nothing;
end $$;
revoke all on function public.enqueue_payment_jobs() from public,anon,authenticated;
grant execute on function public.enqueue_payment_jobs() to service_role;


-- A paid order is an accounting fact, not by itself a Notes entitlement.
create or replace function public.play_entitlement_committed(p_order_id text,p_token text)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.orders o
   join public.payments m on m.order_id=o.id and m.purchase_token=p_token
   join public.purchases p on p.order_id=o.id
   where o.id=p_order_id and o.provider='play' and o.status='paid' and o.purchase_token=p_token
     and o.user_id is not null and m.status='success' and m.user_id=o.user_id
     and m.product_id=o.product_id and m.amount=o.amount
     and p.status='success' and p.user_id=o.user_id and p.product_id=o.product_id and p.amount=o.amount
     and row(p.scope,p.chapter_id,p.subject_id,p.year_id,p.year_ids,p.course_id)
       is not distinct from row(o.scope,o.chapter_id,o.subject_id,o.year_id,o.year_ids,o.course_id));
$$;
revoke all on function public.play_entitlement_committed(text,text) from public,anon,authenticated;
grant execute on function public.play_entitlement_committed(text,text) to service_role;

create or replace function public.get_my_play_fulfillment(p_order_id text)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id=p_order_id and user_id=auth.uid() and provider='play';
  if not found then return jsonb_build_object('success',false,'pending',true); end if;
  if o.status='refunded' then
    return jsonb_build_object('success',false,'pending',false,'message','This payment was refunded.'); end if;
  if exists(select 1 from public.purchases where order_id=o.id and status='duplicate') then
    return jsonb_build_object('success',false,'pending',false,'message','This product was already owned; contact support for a refund.'); end if;
  if public.play_entitlement_committed(o.id,o.purchase_token) then
    return jsonb_build_object('success',true,'internalOrderId',o.id,'amount',o.amount); end if;
  return jsonb_build_object('success',false,'pending',true);
end $$;
revoke all on function public.get_my_play_fulfillment(text) from public,anon;
grant execute on function public.get_my_play_fulfillment(text) to authenticated,service_role;


INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261109100000','billing_settlement_recovery',ARRAY[$exact_source$-- Forward-only billing correctness/recovery. No remote application is authorized.
-- Requires the retained November snapshot and Notes choice migrations.
begin;
alter table public.provider_events add column if not exists blocks_entitlement boolean;
alter table public.orders add column if not exists external_report_test_purchase boolean;
-- Opaque tokens may be 4096 characters; a direct btree key can exceed the
-- PostgreSQL index tuple limit. Retain uniqueness with a fixed-width digest.
create unique index if not exists orders_external_token_digest_unique
  on public.orders(extensions.digest(external_transaction_token,'sha256'))
  where external_transaction_token is not null;
drop index if exists public.orders_external_token_unique;
-- Read-only proof used both inside settlement and by Edge after commit.
-- No historical rows/prices are rewritten; legacy entitlements remain intact.
create or replace function public.razorpay_entitlement_committed(p_order_id text,p_payment_id text)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.orders o
   join public.payments m on m.order_id=o.id and m.razorpay_payment_id=p_payment_id
   join public.purchases p on p.order_id=o.id
   where o.id=p_order_id and o.provider='razorpay' and o.status='paid'
     and o.razorpay_payment_id=p_payment_id and o.user_id is not null
     and m.status='success' and m.user_id=o.user_id and m.product_id=o.product_id and m.amount=o.amount
     and not exists(select 1 from public.provider_events e where e.payment_id=p_payment_id
       and e.status='pending' and e.blocks_entitlement is distinct from false
       and e.event_type in ('refund.processed','payment.dispute.created','payment.dispute.under_review',
         'payment.dispute.action_required','payment.dispute.lost'))
     and p.status='success' and p.user_id=o.user_id and p.product_id=o.product_id and p.amount=o.amount
     and row(p.scope,p.chapter_id,p.subject_id,p.year_id,p.year_ids,p.course_id)
       is not distinct from row(o.scope,o.chapter_id,o.subject_id,o.year_id,o.year_ids,o.course_id));
$$;
revoke all on function public.razorpay_entitlement_committed(text,text) from public,anon,authenticated;
grant execute on function public.razorpay_entitlement_committed(text,text) to service_role;

create or replace function public.settle_razorpay_payment(
  p_event_id text,p_razorpay_order_id text,p_razorpay_payment_id text,
  p_amount_paise bigint,p_paid_at timestamptz default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype; v_capture public.payment_captures%rowtype;
  v_reason text; v_reversal boolean; v_error text; v_uid uuid;
begin
  -- Match creation, refund and legacy settlement lock order: user, then order.
  select user_id into v_uid from public.orders where razorpay_order_id=p_razorpay_order_id;
  if v_uid is not null then
    perform pg_advisory_xact_lock(hashtextextended('wallet:' || v_uid::text,0));
  end if;
  select * into v_order from public.orders where razorpay_order_id=p_razorpay_order_id for update;
  if not found then raise exception 'Razorpay order is not linked'; end if;
  if round(v_order.amount*100)::bigint<>p_amount_paise then raise exception 'capture amount mismatch'; end if;
  perform public.record_payment_capture(p_razorpay_payment_id,p_razorpay_order_id,p_amount_paise,null);
  select * into v_capture from public.payment_captures where payment_id=p_razorpay_payment_id for update;
  if v_capture.status in ('compensation_pending','compensated') then
    update public.provider_events set status='applied'
      where event_id=p_event_id and event_type='payment.captured';
    return;
  end if;
  if v_order.razorpay_payment_id is not null and v_order.razorpay_payment_id<>p_razorpay_payment_id then
    insert into public.payment_compensations(payment_id,order_id,amount_paise,reason,refund_request_id)
      values(p_razorpay_payment_id,v_order.id,p_amount_paise,'additional_capture',
        'medveda_comp_' || md5(p_razorpay_payment_id)) on conflict(payment_id) do nothing;
    update public.payment_captures set status='compensation_pending',failure_reason='additional_capture'
      where payment_id=p_razorpay_payment_id;
    update public.provider_events set status='applied' where event_id=p_event_id and event_type='payment.captured';
    return;
  end if;
  -- Link the verified capture so an earlier reversal inbox can be reconciled
  -- even while entitlement is held. This does not mark the order paid.
  update public.orders set razorpay_payment_id=p_razorpay_payment_id
    where id=v_order.id and razorpay_payment_id is null;
  -- A successful capture replay must not become stale merely because time passed.
  -- Reversals still take precedence and never restore access.
  if v_capture.status='granted' and v_order.status='paid' then
    update public.provider_events set status='applied'
      where event_id=p_event_id and event_type='payment.captured';
    return;
  end if;
  -- Unknown reversal facts and open disputes HOLD settlement. A later won
  -- dispute clears the hold; an authenticated full refund/lost dispute reverses.
  -- Never infer a full refund from a refund.processed event alone.
  if v_order.status<>'refunded' and v_capture.status<>'reversed' and exists(
    select 1 from public.provider_events e where e.payment_id=p_razorpay_payment_id
      and e.status in ('pending','applied')
      and e.event_type in ('refund.processed','payment.dispute.created','payment.dispute.under_review',
        'payment.dispute.action_required','payment.dispute.lost')
      and (e.blocks_entitlement is null or (e.blocks_entitlement and
        e.event_type in ('payment.dispute.created','payment.dispute.under_review','payment.dispute.action_required')))) then
    return;
  end if;
  select v_order.status='refunded' or v_capture.status='reversed' or exists(
    select 1 from public.provider_events e where e.payment_id=p_razorpay_payment_id
      and e.blocks_entitlement and e.status in ('pending','applied')
      and e.event_type in ('refund.processed','payment.dispute.lost')) into v_reversal;
  if v_reversal then v_reason:='reversal_received';
  elsif v_order.user_id is null then v_reason:='account_deleted';
  elsif v_order.scope is null or v_order.scope not in ('chapter','subject','year','bundle')
      or (v_order.scope='chapter' and v_order.chapter_id is null)
      or (v_order.scope='subject' and v_order.subject_id is null)
      or (v_order.scope='year' and v_order.year_id is null)
      or (v_order.scope='bundle' and coalesce(array_length(v_order.year_ids,1),0)=0)
      or v_order.course_id is null then v_reason:='missing_entitlement_snapshot';
  elsif v_order.referral_discount>0 and (v_order.status in ('cancelled','failed')
      or (v_order.expires_at is not null and coalesce(p_paid_at,now())>v_order.expires_at)) then
    v_reason:='stale_discount';
  elsif v_order.referral_discount>0 and not exists(select 1 from public.first_discount_reservations
      where order_id=v_order.id and user_id=v_order.user_id) then v_reason:='discount_reused';
  elsif exists(select 1 from public.purchases where user_id=v_order.user_id
      and product_id=v_order.product_id and status='success' and order_id is distinct from v_order.id) then
    v_reason:='already_owned';
  elsif v_order.amount<>v_order.list_price-v_order.referral_discount-v_order.wallet_amount then
    v_reason:='underpriced_order';
  end if;
  if v_reason is null then
    begin
      perform public.settle_razorpay_payment_legacy(p_event_id,p_razorpay_order_id,
        p_razorpay_payment_id,p_amount_paise,p_paid_at);
    exception when others then
      v_error:=sqlerrm;
      if v_error like 'wallet shortfall:%' then v_reason:='wallet_shortfall';
      else raise; end if;
    end;
  end if;
  if v_reason is not null then
    update public.orders set status=case when v_reversal then 'refunded' else 'paid' end,
      razorpay_payment_id=p_razorpay_payment_id, updated_at=now(),
      payment_completed_at=coalesce(payment_completed_at,clock_timestamp())
      where id=v_order.id and status<>'refunded';
    insert into public.payment_compensations(payment_id,order_id,amount_paise,reason,refund_request_id)
      select p_razorpay_payment_id,v_order.id,p_amount_paise,v_reason,
        'medveda_comp_' || md5(p_razorpay_payment_id)
      where not v_reversal on conflict(payment_id) do nothing;
    update public.payment_captures set status=case when v_reversal then 'reversed' else 'compensation_pending' end,
      failure_reason=v_reason where payment_id=p_razorpay_payment_id;
  else
    if not public.razorpay_entitlement_committed(v_order.id,p_razorpay_payment_id) then
      raise exception 'Razorpay entitlement not committed';
    end if;
    update public.payment_captures set status='granted' where payment_id=p_razorpay_payment_id;
  end if;
  update public.orders set payment_provider_time=coalesce(payment_provider_time,v_capture.provider_time),
    payment_received_at=coalesce(payment_received_at,v_capture.received_at),
    payment_completed_at=coalesce(payment_completed_at,clock_timestamp()),
    payment_time_fallback=(v_capture.provider_time is null)
    where id=v_order.id;
  update public.provider_events set status='applied'
    where event_id=p_event_id and event_type='payment.captured';
end $$;
revoke all on function public.settle_razorpay_payment(text,text,text,bigint,timestamptz) from public,anon,authenticated;
grant execute on function public.settle_razorpay_payment(text,text,text,bigint,timestamptz) to service_role;


create or replace function public.attach_ucb_external_token(p_user_id uuid,p_order_id text,p_token text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype;
begin
  if p_token is null or length(p_token)<10 or length(p_token)>4096 or p_token ~ '[[:space:][:cntrl:]]' then
    return jsonb_build_object('ok',false,'code','invalid_token'); end if;
  perform pg_advisory_xact_lock(hashtextextended('wallet:' || p_user_id::text,0));
  select * into o from public.orders where id=p_order_id for update;
  if not found or o.user_id is distinct from p_user_id or o.provider<>'play' or o.purchase_token is not null or o.play_sku is null then
    return jsonb_build_object('ok',false,'code','order_unavailable'); end if;
  if o.external_choice_bound_order_id is not null then
    if exists(select 1 from public.orders where id=o.external_choice_bound_order_id
      and user_id=p_user_id and product_id=o.product_id and provider='razorpay' and external_transaction_token=p_token) then
      return jsonb_build_object('ok',true); end if;
    return jsonb_build_object('ok',false,'code','token_already_attached');
  end if;
  if o.status<>'created' or o.expires_at is null or o.expires_at<=now() then
    return jsonb_build_object('ok',false,'code','order_unavailable'); end if;
  if o.external_transaction_token is not null and o.external_transaction_token<>p_token then
    return jsonb_build_object('ok',false,'code','token_already_attached'); end if;
  if exists(select 1 from public.orders where external_transaction_token=p_token and id<>p_order_id) then
    return jsonb_build_object('ok',false,'code','token_already_attached'); end if;
  update public.orders set external_transaction_token=p_token where id=p_order_id and external_transaction_token is null;
  return jsonb_build_object('ok',true);
exception when unique_violation then
  return jsonb_build_object('ok',false,'code','token_already_attached');
end $$;
revoke all on function public.attach_ucb_external_token(uuid,text,text) from public,anon,authenticated;
grant execute on function public.attach_ucb_external_token(uuid,text,text) to service_role;
create or replace function public.enqueue_payment_jobs() returns void
language plpgsql security definer set search_path=public as $$
begin
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'reports',o.id,coalesce(o.ucb_transaction_time,o.payment_provider_time,o.payment_completed_at,o.created_at)+interval '24 hours'
  from public.orders o where o.external_transaction_token is not null
    and o.external_report_status in ('pending','failed')
    and (o.ucb_transaction_time is not null or o.status in ('paid','refunded'))
  on conflict(kind,target_id) do update set deadline_at=excluded.deadline_at;
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'refunds',r.refund_id,r.refund_time+interval '24 hours'
  from public.ucb_external_refunds r where r.status in ('pending','failed','processing')
  on conflict(kind,target_id) do nothing;
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'consume',o.id,coalesce(o.payment_completed_at,o.created_at)+interval '24 hours'
  from public.orders o where o.provider='play' and o.status='paid'
    and o.play_consumption_status in ('pending','failed')
  on conflict(kind,target_id) do nothing;
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'reconcile',o.id,coalesce(o.play_last_checked_at,o.created_at)+interval '2 hours'
  from public.orders o where o.provider='play' and o.status='paid' and o.purchase_token is not null
    and (o.play_last_checked_at is null or o.play_last_checked_at<now()-interval '2 hours')
  on conflict(kind,target_id) do update set status='pending', next_attempt_at=now(),
    deadline_at=excluded.deadline_at, attempts=0, lease_id=null, lease_until=null
    where public.payment_jobs.status='done';
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'compensate',c.payment_id,c.created_at+interval '24 hours'
  from public.payment_compensations c where c.status in ('pending','processing')
  on conflict(kind,target_id) do nothing;
  -- Captures survive an Edge/SQL outage even if no webhook is delivered again.
  -- Reuse the existing events schedule; these targets cannot collide with provider event IDs.
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'events','capture:' || c.payment_id,c.received_at+interval '24 hours'
  from public.payment_captures c where c.status='captured'
  on conflict(kind,target_id) do nothing;
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'events',e.event_id,e.received_at+interval '24 hours'
  from public.provider_events e where e.status='pending' and e.payment_id is not null
    and (e.event_type in ('payment.captured','payment.authorized') or
      (exists(select 1 from public.orders o where o.razorpay_payment_id=e.payment_id)
    and e.event_type in ('refund.processed','payment.dispute.created','payment.dispute.under_review',
      'payment.dispute.action_required','payment.dispute.won','payment.dispute.lost','payment.dispute.closed')))
  on conflict(kind,target_id) do nothing;
end $$;
revoke all on function public.enqueue_payment_jobs() from public,anon,authenticated;
grant execute on function public.enqueue_payment_jobs() to service_role;


-- A paid order is an accounting fact, not by itself a Notes entitlement.
create or replace function public.play_entitlement_committed(p_order_id text,p_token text)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.orders o
   join public.payments m on m.order_id=o.id and m.purchase_token=p_token
   join public.purchases p on p.order_id=o.id
   where o.id=p_order_id and o.provider='play' and o.status='paid' and o.purchase_token=p_token
     and o.user_id is not null and m.status='success' and m.user_id=o.user_id
     and m.product_id=o.product_id and m.amount=o.amount
     and p.status='success' and p.user_id=o.user_id and p.product_id=o.product_id and p.amount=o.amount
     and row(p.scope,p.chapter_id,p.subject_id,p.year_id,p.year_ids,p.course_id)
       is not distinct from row(o.scope,o.chapter_id,o.subject_id,o.year_id,o.year_ids,o.course_id));
$$;
revoke all on function public.play_entitlement_committed(text,text) from public,anon,authenticated;
grant execute on function public.play_entitlement_committed(text,text) to service_role;

create or replace function public.get_my_play_fulfillment(p_order_id text)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id=p_order_id and user_id=auth.uid() and provider='play';
  if not found then return jsonb_build_object('success',false,'pending',true); end if;
  if o.status='refunded' then
    return jsonb_build_object('success',false,'pending',false,'message','This payment was refunded.'); end if;
  if exists(select 1 from public.purchases where order_id=o.id and status='duplicate') then
    return jsonb_build_object('success',false,'pending',false,'message','This product was already owned; contact support for a refund.'); end if;
  if public.play_entitlement_committed(o.id,o.purchase_token) then
    return jsonb_build_object('success',true,'internalOrderId',o.id,'amount',o.amount); end if;
  return jsonb_build_object('success',false,'pending',true);
end $$;
revoke all on function public.get_my_play_fulfillment(text) from public,anon;
grant execute on function public.get_my_play_fulfillment(text) to authenticated,service_role;

commit;
$exact_source$]::text[]);

-- C3 SOURCE SHA256 d47d7ee0e8d74e56752c16c034e38c996e7b6b81e029cbb2d309a43151b720f2
-- Phase C final override: MUST follow Notes choice, settlement recovery and A1/A2/A3.
-- Recovery replaces this RPC with weaker proof; restore every strong MV003
-- predicate without editing the frozen Phase A/B artifacts or financial rows.
-- Deliberately conservative for pending/parked reversals, including classified
-- partial refunds until their durable application. No capture backfill required.
create or replace function public.razorpay_entitlement_committed(p_order_id text,p_payment_id text)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1 from public.orders o
    join public.payments m on m.order_id=o.id
    join public.purchases p on p.order_id=o.id
    where o.id=p_order_id and p_payment_id is not null and p_payment_id<>''
      and o.provider='razorpay' and o.status='paid'
      and o.razorpay_payment_id=p_payment_id
      and o.razorpay_order_id is not null and o.razorpay_order_id<>''
      and o.user_id is not null and o.product_id is not null
      and o.amount>0 and o.course_id is not null
      and o.scope in ('chapter','subject','year','bundle')
      and case o.scope
        when 'chapter' then o.chapter_id is not null
        when 'subject' then o.subject_id is not null
        when 'year' then o.year_id is not null
        when 'bundle' then coalesce(cardinality(o.year_ids),0)>0
          and array_position(o.year_ids,null) is null
        else false end
      and m.provider='razorpay' and m.status='success'
      and m.razorpay_payment_id=p_payment_id and m.razorpay_order_id=o.razorpay_order_id
      and m.user_id=o.user_id and m.product_id=o.product_id and m.amount=o.amount
      and p.status='success' and p.user_id=o.user_id
      and p.product_id=o.product_id and p.amount=o.amount
      and p.razorpay_order_id=o.razorpay_order_id
      and row(p.scope,p.chapter_id,p.subject_id,p.year_id,p.year_ids,p.course_id)
        is not distinct from row(o.scope,o.chapter_id,o.subject_id,o.year_id,o.year_ids,o.course_id)
      -- Absence is allowed for historical purchases. An existing capture must
      -- match exactly and must not be awaiting or have completed reversal.
      and not exists (select 1 from public.payment_captures c
        where c.payment_id=p_payment_id and (
          c.order_id is distinct from o.id or c.razorpay_order_id is distinct from o.razorpay_order_id
          or c.amount_paise is distinct from round(o.amount*100)::bigint
          or c.status not in ('captured','granted')))
      -- Even parked compensation is unresolved; no compensation state grants.
      and not exists (select 1 from public.payment_compensations c where c.payment_id=p_payment_id)
      -- On the production contract pending/parked reversal facts cannot yet be
      -- classified as partial refund or resolved dispute. Fail closed for retry.
      -- Applied refunds/disputes are reflected in the durable purchase state;
      -- blocking all applied events would reject partial refunds and disputes won.
      and not exists (select 1 from public.provider_events e
        where e.payment_id=p_payment_id and e.status in ('pending','parked')
          and e.event_type in ('refund.processed','payment.dispute.created',
            'payment.dispute.under_review','payment.dispute.action_required','payment.dispute.lost'))
  );
$$;
revoke all on function public.razorpay_entitlement_committed(text,text) from public,anon,authenticated;
grant execute on function public.razorpay_entitlement_committed(text,text) to service_role;

INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261111100000','phase_c_final_mv003_commitment',ARRAY[$exact_source$-- Phase C final override: MUST follow Notes choice, settlement recovery and A1/A2/A3.
-- Recovery replaces this RPC with weaker proof; restore every strong MV003
-- predicate without editing the frozen Phase A/B artifacts or financial rows.
-- Deliberately conservative for pending/parked reversals, including classified
-- partial refunds until their durable application. No capture backfill required.
begin;
create or replace function public.razorpay_entitlement_committed(p_order_id text,p_payment_id text)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1 from public.orders o
    join public.payments m on m.order_id=o.id
    join public.purchases p on p.order_id=o.id
    where o.id=p_order_id and p_payment_id is not null and p_payment_id<>''
      and o.provider='razorpay' and o.status='paid'
      and o.razorpay_payment_id=p_payment_id
      and o.razorpay_order_id is not null and o.razorpay_order_id<>''
      and o.user_id is not null and o.product_id is not null
      and o.amount>0 and o.course_id is not null
      and o.scope in ('chapter','subject','year','bundle')
      and case o.scope
        when 'chapter' then o.chapter_id is not null
        when 'subject' then o.subject_id is not null
        when 'year' then o.year_id is not null
        when 'bundle' then coalesce(cardinality(o.year_ids),0)>0
          and array_position(o.year_ids,null) is null
        else false end
      and m.provider='razorpay' and m.status='success'
      and m.razorpay_payment_id=p_payment_id and m.razorpay_order_id=o.razorpay_order_id
      and m.user_id=o.user_id and m.product_id=o.product_id and m.amount=o.amount
      and p.status='success' and p.user_id=o.user_id
      and p.product_id=o.product_id and p.amount=o.amount
      and p.razorpay_order_id=o.razorpay_order_id
      and row(p.scope,p.chapter_id,p.subject_id,p.year_id,p.year_ids,p.course_id)
        is not distinct from row(o.scope,o.chapter_id,o.subject_id,o.year_id,o.year_ids,o.course_id)
      -- Absence is allowed for historical purchases. An existing capture must
      -- match exactly and must not be awaiting or have completed reversal.
      and not exists (select 1 from public.payment_captures c
        where c.payment_id=p_payment_id and (
          c.order_id is distinct from o.id or c.razorpay_order_id is distinct from o.razorpay_order_id
          or c.amount_paise is distinct from round(o.amount*100)::bigint
          or c.status not in ('captured','granted')))
      -- Even parked compensation is unresolved; no compensation state grants.
      and not exists (select 1 from public.payment_compensations c where c.payment_id=p_payment_id)
      -- On the production contract pending/parked reversal facts cannot yet be
      -- classified as partial refund or resolved dispute. Fail closed for retry.
      -- Applied refunds/disputes are reflected in the durable purchase state;
      -- blocking all applied events would reject partial refunds and disputes won.
      and not exists (select 1 from public.provider_events e
        where e.payment_id=p_payment_id and e.status in ('pending','parked')
          and e.event_type in ('refund.processed','payment.dispute.created',
            'payment.dispute.under_review','payment.dispute.action_required','payment.dispute.lost'))
  );
$$;
revoke all on function public.razorpay_entitlement_committed(text,text) from public,anon,authenticated;
grant execute on function public.razorpay_entitlement_committed(text,text) to service_role;
commit;
$exact_source$]::text[]);

-- C4 SOURCE SHA256 da4f56405f25e8e1a67f077d4ecce1e40ddbf2932efa16882e4ba8a2a2ed08c4
-- Phase C: new Play grants must use the purchased order's immutable scope,
-- even if the catalog changes before receipt verification. No historical DML.
-- Requires billing_settlement_recovery and the existing order snapshot columns.
create or replace function public.play_purchase_entitlement_from_order()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public,pg_temp as $$
declare o public.orders%rowtype;
begin
  if new.order_id is null then return new; end if;
  select * into o from public.orders where id=new.order_id;
  if not found or o.provider<>'play' then return new; end if;
  if new.user_id is distinct from o.user_id or new.product_id is distinct from o.product_id
    or new.amount is distinct from o.amount or o.course_id is null
    or o.scope not in ('chapter','subject','year','bundle') or o.scope is null
    or (o.scope='chapter' and o.chapter_id is null)
    or (o.scope='subject' and o.subject_id is null)
    or (o.scope='year' and o.year_id is null)
    or (o.scope='bundle' and (coalesce(cardinality(o.year_ids),0)=0 or array_position(o.year_ids,null) is not null)) then
    raise exception 'Play purchase does not match order entitlement';
  end if;
  new.scope:=o.scope; new.chapter_id:=o.chapter_id; new.subject_id:=o.subject_id;
  new.year_id:=o.year_id; new.year_ids:=o.year_ids; new.course_id:=o.course_id;
  return new;
end $$;
revoke all on function public.play_purchase_entitlement_from_order() from public,anon,authenticated;
drop trigger if exists purchases_play_order_snapshot on public.purchases;
create trigger purchases_play_order_snapshot before insert on public.purchases
for each row execute function public.play_purchase_entitlement_from_order();

create or replace function public.play_entitlement_committed(p_order_id text,p_token text)
returns boolean language sql stable security definer
set search_path=pg_catalog,public,pg_temp as $$
 select exists(select 1 from public.orders o
   join public.payments m on m.order_id=o.id and m.purchase_token=p_token
   join public.purchases p on p.order_id=o.id
   where o.id=p_order_id and p_token is not null and p_token<>''
     and o.provider='play' and o.status='paid' and o.purchase_token=p_token
     and o.user_id is not null and o.product_id is not null and o.amount>0
     and o.play_sku is not null and o.course_id is not null
     and o.scope in ('chapter','subject','year','bundle')
     and case o.scope when 'chapter' then o.chapter_id is not null
       when 'subject' then o.subject_id is not null when 'year' then o.year_id is not null
       when 'bundle' then coalesce(cardinality(o.year_ids),0)>0 and array_position(o.year_ids,null) is null else false end
     and m.provider='play' and m.play_sku=o.play_sku and m.status='success'
     and m.user_id=o.user_id and m.product_id=o.product_id and m.amount=o.amount
     and p.status='success' and p.user_id=o.user_id and p.product_id=o.product_id and p.amount=o.amount
     and row(p.scope,p.chapter_id,p.subject_id,p.year_id,p.year_ids,p.course_id)
       is not distinct from row(o.scope,o.chapter_id,o.subject_id,o.year_id,o.year_ids,o.course_id));
$$;
revoke all on function public.play_entitlement_committed(text,text) from public,anon,authenticated;
grant execute on function public.play_entitlement_committed(text,text) to service_role;

INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261111110000','phase_c_play_entitlement_snapshot',ARRAY[$exact_source$-- Phase C: new Play grants must use the purchased order's immutable scope,
-- even if the catalog changes before receipt verification. No historical DML.
-- Requires billing_settlement_recovery and the existing order snapshot columns.
begin;
create or replace function public.play_purchase_entitlement_from_order()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public,pg_temp as $$
declare o public.orders%rowtype;
begin
  if new.order_id is null then return new; end if;
  select * into o from public.orders where id=new.order_id;
  if not found or o.provider<>'play' then return new; end if;
  if new.user_id is distinct from o.user_id or new.product_id is distinct from o.product_id
    or new.amount is distinct from o.amount or o.course_id is null
    or o.scope not in ('chapter','subject','year','bundle') or o.scope is null
    or (o.scope='chapter' and o.chapter_id is null)
    or (o.scope='subject' and o.subject_id is null)
    or (o.scope='year' and o.year_id is null)
    or (o.scope='bundle' and (coalesce(cardinality(o.year_ids),0)=0 or array_position(o.year_ids,null) is not null)) then
    raise exception 'Play purchase does not match order entitlement';
  end if;
  new.scope:=o.scope; new.chapter_id:=o.chapter_id; new.subject_id:=o.subject_id;
  new.year_id:=o.year_id; new.year_ids:=o.year_ids; new.course_id:=o.course_id;
  return new;
end $$;
revoke all on function public.play_purchase_entitlement_from_order() from public,anon,authenticated;
drop trigger if exists purchases_play_order_snapshot on public.purchases;
create trigger purchases_play_order_snapshot before insert on public.purchases
for each row execute function public.play_purchase_entitlement_from_order();

create or replace function public.play_entitlement_committed(p_order_id text,p_token text)
returns boolean language sql stable security definer
set search_path=pg_catalog,public,pg_temp as $$
 select exists(select 1 from public.orders o
   join public.payments m on m.order_id=o.id and m.purchase_token=p_token
   join public.purchases p on p.order_id=o.id
   where o.id=p_order_id and p_token is not null and p_token<>''
     and o.provider='play' and o.status='paid' and o.purchase_token=p_token
     and o.user_id is not null and o.product_id is not null and o.amount>0
     and o.play_sku is not null and o.course_id is not null
     and o.scope in ('chapter','subject','year','bundle')
     and case o.scope when 'chapter' then o.chapter_id is not null
       when 'subject' then o.subject_id is not null when 'year' then o.year_id is not null
       when 'bundle' then coalesce(cardinality(o.year_ids),0)>0 and array_position(o.year_ids,null) is null else false end
     and m.provider='play' and m.play_sku=o.play_sku and m.status='success'
     and m.user_id=o.user_id and m.product_id=o.product_id and m.amount=o.amount
     and p.status='success' and p.user_id=o.user_id and p.product_id=o.product_id and p.amount=o.amount
     and row(p.scope,p.chapter_id,p.subject_id,p.year_id,p.year_ids,p.course_id)
       is not distinct from row(o.scope,o.chapter_id,o.subject_id,o.year_id,o.year_ids,o.course_id));
$$;
revoke all on function public.play_entitlement_committed(text,text) from public,anon,authenticated;
grant execute on function public.play_entitlement_committed(text,text) to service_role;
commit;
$exact_source$]::text[]);
DO $final_contracts$
DECLARE r record; p pg_proc%rowtype;
BEGIN
 SELECT * INTO p FROM pg_proc WHERE oid=to_regprocedure('public.razorpay_entitlement_committed(text,text)');
 IF NOT FOUND OR md5(p.prosrc) IS DISTINCT FROM '49b01fbcc7a5e71bd527366fd342a6e9' OR NOT p.prosecdef OR pg_get_userbyid(p.proowner)<>'postgres' OR p.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog, public, pg_temp']::text[] THEN RAISE EXCEPTION 'final definition/owner/path mismatch: razorpay_entitlement_committed'; END IF;
 IF EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') OR has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE') IS DISTINCT FROM false OR NOT has_function_privilege('service_role',p.oid,'EXECUTE') THEN RAISE EXCEPTION 'final execute ACL mismatch: razorpay_entitlement_committed'; END IF;
 SELECT * INTO p FROM pg_proc WHERE oid=to_regprocedure('public.prepare_notes_choice_checkout(uuid,text,text,boolean,text)');
 IF NOT FOUND OR md5(p.prosrc) IS DISTINCT FROM '37f20aba7fb04bccc174b4083cb23547' OR NOT p.prosecdef OR pg_get_userbyid(p.proowner)<>'postgres' OR p.proconfig IS DISTINCT FROM ARRAY['search_path=public']::text[] THEN RAISE EXCEPTION 'final definition/owner/path mismatch: prepare_notes_choice_checkout'; END IF;
 IF EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') OR has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE') IS DISTINCT FROM false OR NOT has_function_privilege('service_role',p.oid,'EXECUTE') THEN RAISE EXCEPTION 'final execute ACL mismatch: prepare_notes_choice_checkout'; END IF;
 SELECT * INTO p FROM pg_proc WHERE oid=to_regprocedure('public.attach_ucb_external_token(uuid,text,text)');
 IF NOT FOUND OR md5(p.prosrc) IS DISTINCT FROM 'ec1b4b632d0c6aca8617dc4952be7ec8' OR NOT p.prosecdef OR pg_get_userbyid(p.proowner)<>'postgres' OR p.proconfig IS DISTINCT FROM ARRAY['search_path=public']::text[] THEN RAISE EXCEPTION 'final definition/owner/path mismatch: attach_ucb_external_token'; END IF;
 IF EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') OR has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE') IS DISTINCT FROM false OR NOT has_function_privilege('service_role',p.oid,'EXECUTE') THEN RAISE EXCEPTION 'final execute ACL mismatch: attach_ucb_external_token'; END IF;
 SELECT * INTO p FROM pg_proc WHERE oid=to_regprocedure('public.record_notes_choice_authorization(text,timestamptz)');
 IF NOT FOUND OR md5(p.prosrc) IS DISTINCT FROM '7c12b7902552ea89d60efcb6c2d521e8' OR NOT p.prosecdef OR pg_get_userbyid(p.proowner)<>'postgres' OR p.proconfig IS DISTINCT FROM ARRAY['search_path=public']::text[] THEN RAISE EXCEPTION 'final definition/owner/path mismatch: record_notes_choice_authorization'; END IF;
 IF EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') OR has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE') IS DISTINCT FROM false OR NOT has_function_privilege('service_role',p.oid,'EXECUTE') THEN RAISE EXCEPTION 'final execute ACL mismatch: record_notes_choice_authorization'; END IF;
 SELECT * INTO p FROM pg_proc WHERE oid=to_regprocedure('public.enqueue_payment_jobs()');
 IF NOT FOUND OR md5(p.prosrc) IS DISTINCT FROM '5b895e3df1fdb9ce75e7a6fd4f5654aa' OR NOT p.prosecdef OR pg_get_userbyid(p.proowner)<>'postgres' OR p.proconfig IS DISTINCT FROM ARRAY['search_path=public']::text[] THEN RAISE EXCEPTION 'final definition/owner/path mismatch: enqueue_payment_jobs'; END IF;
 IF EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') OR has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE') IS DISTINCT FROM false OR NOT has_function_privilege('service_role',p.oid,'EXECUTE') THEN RAISE EXCEPTION 'final execute ACL mismatch: enqueue_payment_jobs'; END IF;
 SELECT * INTO p FROM pg_proc WHERE oid=to_regprocedure('public.settle_razorpay_payment(text,text,text,bigint,timestamptz)');
 IF NOT FOUND OR md5(p.prosrc) IS DISTINCT FROM '1afa656037319aa34225ae278af43552' OR NOT p.prosecdef OR pg_get_userbyid(p.proowner)<>'postgres' OR p.proconfig IS DISTINCT FROM ARRAY['search_path=public']::text[] THEN RAISE EXCEPTION 'final definition/owner/path mismatch: settle_razorpay_payment'; END IF;
 IF EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') OR has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE') IS DISTINCT FROM false OR NOT has_function_privilege('service_role',p.oid,'EXECUTE') THEN RAISE EXCEPTION 'final execute ACL mismatch: settle_razorpay_payment'; END IF;
 SELECT * INTO p FROM pg_proc WHERE oid=to_regprocedure('public.play_entitlement_committed(text,text)');
 IF NOT FOUND OR md5(p.prosrc) IS DISTINCT FROM '361a0cc9e09282c3446e5ea9b15b62ff' OR NOT p.prosecdef OR pg_get_userbyid(p.proowner)<>'postgres' OR p.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog, public, pg_temp']::text[] THEN RAISE EXCEPTION 'final definition/owner/path mismatch: play_entitlement_committed'; END IF;
 IF EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') OR has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE') IS DISTINCT FROM false OR NOT has_function_privilege('service_role',p.oid,'EXECUTE') THEN RAISE EXCEPTION 'final execute ACL mismatch: play_entitlement_committed'; END IF;
 SELECT * INTO p FROM pg_proc WHERE oid=to_regprocedure('public.get_my_play_fulfillment(text)');
 IF NOT FOUND OR md5(p.prosrc) IS DISTINCT FROM '7c6adc08cf47830237e426c3bf8897c7' OR NOT p.prosecdef OR pg_get_userbyid(p.proowner)<>'postgres' OR p.proconfig IS DISTINCT FROM ARRAY['search_path=public']::text[] THEN RAISE EXCEPTION 'final definition/owner/path mismatch: get_my_play_fulfillment'; END IF;
 IF EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') OR has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE') IS DISTINCT FROM true OR NOT has_function_privilege('service_role',p.oid,'EXECUTE') THEN RAISE EXCEPTION 'final execute ACL mismatch: get_my_play_fulfillment'; END IF;
 SELECT * INTO p FROM pg_proc WHERE oid=to_regprocedure('public.play_purchase_entitlement_from_order()');
 IF NOT FOUND OR md5(p.prosrc) IS DISTINCT FROM 'a00fd21b2f6715a7fd28852720fc11b3' OR NOT p.prosecdef OR pg_get_userbyid(p.proowner)<>'postgres' OR p.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog, public, pg_temp']::text[] THEN RAISE EXCEPTION 'final definition/owner/path mismatch: play_purchase_entitlement_from_order'; END IF;
 IF EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') OR has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE') IS DISTINCT FROM false OR NOT has_function_privilege('service_role',p.oid,'EXECUTE') THEN RAISE EXCEPTION 'final execute ACL mismatch: play_purchase_entitlement_from_order'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('public.orders_external_token_digest_unique') AND indisunique AND indisvalid AND indisready) OR to_regclass('public.orders_external_token_unique') IS NOT NULL THEN RAISE EXCEPTION 'token index replacement incomplete'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.notes_choice_checkouts'::regclass AND relrowsecurity) OR EXISTS(SELECT 1 FROM public.notes_choice_checkouts) THEN RAISE EXCEPTION 'reservation RLS/empty-table mismatch'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.purchases'::regclass AND tgname='purchases_play_order_snapshot' AND tgenabled='O' AND tgfoid='public.play_purchase_entitlement_from_order()'::regprocedure AND tgtype=7) THEN RAISE EXCEPTION 'Play trigger mismatch'; END IF;
END $final_contracts$;
DO $preservation$
DECLARE t text; v text;
BEGIN
 FOREACH t IN ARRAY['orders','payments','purchases','products','payment_captures','payment_compensations','provider_events','payment_jobs','ucb_external_refunds']::text[] LOOP
 EXECUTE format('SELECT md5(coalesce(string_agg(j::text, E''\n'' ORDER BY j::text),'''')) FROM (SELECT to_jsonb(x) - ARRAY[''ucb_transaction_time'',''external_report_test_purchase'',''blocks_entitlement''] AS j FROM public.%I x) q',t) INTO v;
 IF v IS DISTINCT FROM current_setting('medveda.before_'||t) THEN RAISE EXCEPTION 'preservation mismatch: %',t; END IF;
 END LOOP;
END $preservation$;
DO $ledger$ BEGIN
IF (SELECT array_agg(version ORDER BY version) FROM supabase_migrations.schema_migrations) IS DISTINCT FROM ARRAY['20260701000000','20260718','20260721','20260801','20260801150000','20260919120000','20260919130000','20260920120000','20260920130000','20260920140000','20260921120000','20260921130000','20260922100000','20260923100000','20260924100000','20260924110000','20260924120000','20260924130000','20260924140000','20260924150000','20260925100000','20260925110000','20260925120000','20260925130000','20260925140000','20260926100000','20260926110000','20260926120000','20260926130000','20260927100000','20260927110000','20260927120000','20260927130000','20260928100000','20260928110000','20260929100000','20260930100000','20260930110000','20261001100000','20261012100000','20261012110000','20261012120000','20261013090000','20261013100000','20261013110000','20261014100000','20261014110000','20261015100000','20261015120000','20261016090000','20261016100000','20261018100000','20261018110000','20261018120000','20261018130000','20261019150000','20261019151000','20261020100000','20261020101000','20261020102000','20261020103000','20261020104000','20261020105000','20261020110000','20261104100000','20261104110000','20261108100000','20261109100000','20261110100000','20261110120000','20261110130000','20261111100000','20261111110000']::text[] THEN RAISE EXCEPTION 'exact ledger version-set mismatch'; END IF;
END $ledger$;
DO $exact_ledger_sources$ BEGIN
IF NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261110100000' AND name='mv003_razorpay_entitlement_commitment' AND cardinality(statements)=1 AND md5(statements[1])='7ca0d1f30eb5a0e6191a01a4b2afcb16') THEN RAISE EXCEPTION 'exact ledger source/name mismatch: A1'; END IF;
IF NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261110120000' AND name='mv005_razorpay_order_transitions' AND cardinality(statements)=1 AND md5(statements[1])='d4c9a7d8b82fe2fd9c12ab8800e6be61') THEN RAISE EXCEPTION 'exact ledger source/name mismatch: A2'; END IF;
IF NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261110130000' AND name='mv006_purchase_ownership_guard' AND cardinality(statements)=1 AND md5(statements[1])='ec5e704ae193a27125c9c6f0e91123fa') THEN RAISE EXCEPTION 'exact ledger source/name mismatch: A3'; END IF;
IF NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261108100000' AND name='notes_choice_checkout' AND cardinality(statements)=1 AND md5(statements[1])='2aa434f4d48b75a244b20596effc3aab') THEN RAISE EXCEPTION 'exact ledger source/name mismatch: C1'; END IF;
IF NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261109100000' AND name='billing_settlement_recovery' AND cardinality(statements)=1 AND md5(statements[1])='7d9a7672c3afb767b163a37333c00423') THEN RAISE EXCEPTION 'exact ledger source/name mismatch: C2'; END IF;
IF NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261111100000' AND name='phase_c_final_mv003_commitment' AND cardinality(statements)=1 AND md5(statements[1])='4a464364e31cb347320eea7c5d216c16') THEN RAISE EXCEPTION 'exact ledger source/name mismatch: C3'; END IF;
IF NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261111110000' AND name='phase_c_play_entitlement_snapshot' AND cardinality(statements)=1 AND md5(statements[1])='02829c3ee0cb5b36f7e92fe5ab202be9') THEN RAISE EXCEPTION 'exact ledger source/name mismatch: C4'; END IF;
END $exact_ledger_sources$;
COMMIT;

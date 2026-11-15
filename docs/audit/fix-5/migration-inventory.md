# Wallet/referral source inventory (Phase 1)

Generated from every timestamped migration; definitions below are in migration order, so later replacements win. No production reads.

## supabase/migrations/20260701000000_baseline_live_schema.sql

25: --     on_auth_user_created trigger has a target; 20260923100000 / 20260924130000
42: create function pg_temp.bl_constraint(p_tbl regclass, p_name text, p_ddl text) returns void
45:   if not exists (select 1 from pg_constraint where conrelid = p_tbl and conname = p_name) then
50: create function pg_temp.bl_policy(p_schema text, p_tbl text, p_name text, p_ddl text) returns void
58: create function pg_temp.bl_trigger(p_tbl regclass, p_name text, p_ddl text) returns void
66: create function pg_temp.bl_function(p_sig text, p_ddl text) returns void
151:   expires_at timestamp with time zone not null,
196: create table if not exists public.purchases (
288: CREATE OR REPLACE FUNCTION public.am_i_admin()
299: CREATE OR REPLACE FUNCTION public.debug_whoami()
314: CREATE OR REPLACE FUNCTION public.is_admin()
327: CREATE OR REPLACE FUNCTION public.normalize_phone(input text)
344: CREATE OR REPLACE FUNCTION public.rls_auto_enable()
376: CREATE OR REPLACE FUNCTION public.sync_profile_phone_normalized()
395: CREATE OR REPLACE FUNCTION public.handle_new_user()
410: -- ---- 3. Constraints (primary/unique/check first, foreign keys last) -----------
412: select pg_temp.bl_constraint('public.admins', 'admins_pkey',
413:   'alter table public.admins add constraint admins_pkey ' || $bl$PRIMARY KEY (email)$bl$);
415: select pg_temp.bl_constraint('public.analytics_events', 'analytics_events_pkey',
416:   'alter table public.analytics_events add constraint analytics_events_pkey ' || $bl$PRIMARY KEY (id)$bl$);
418: select pg_temp.bl_constraint('public.app_settings', 'app_settings_pkey',
419:   'alter table public.app_settings add constraint app_settings_pkey ' || $bl$PRIMARY KEY (id)$bl$);
421: select pg_temp.bl_constraint('public.chapters', 'chapters_pkey',
422:   'alter table public.chapters add constraint chapters_pkey ' || $bl$PRIMARY KEY (id)$bl$);
424: select pg_temp.bl_constraint('public.notes', 'notes_pkey',
425:   'alter table public.notes add constraint notes_pkey ' || $bl$PRIMARY KEY (id)$bl$);
427: select pg_temp.bl_constraint('public.notifications', 'notifications_pkey',
428:   'alter table public.notifications add constraint notifications_pkey ' || $bl$PRIMARY KEY (id)$bl$);
430: select pg_temp.bl_constraint('public.orders', 'orders_pkey',
431:   'alter table public.orders add constraint orders_pkey ' || $bl$PRIMARY KEY (id)$bl$);
433: select pg_temp.bl_constraint('public.payment_sessions', 'payment_sessions_pkey',
434:   'alter table public.payment_sessions add constraint payment_sessions_pkey ' || $bl$PRIMARY KEY (id)$bl$);
436: select pg_temp.bl_constraint('public.payments', 'payments_pkey',
437:   'alter table public.payments add constraint payments_pkey ' || $bl$PRIMARY KEY (id)$bl$);
439: select pg_temp.bl_constraint('public.products', 'products_pkey',
440:   'alter table public.products add constraint products_pkey ' || $bl$PRIMARY KEY (id)$bl$);
442: select pg_temp.bl_constraint('public.profiles', 'profiles_pkey',
443:   'alter table public.profiles add constraint profiles_pkey ' || $bl$PRIMARY KEY (id)$bl$);
445: select pg_temp.bl_constraint('public.purchases', 'purchases_pkey',
446:   'alter table public.purchases add constraint purchases_pkey ' || $bl$PRIMARY KEY (id)$bl$);
448: select pg_temp.bl_constraint('public.push_tokens', 'push_tokens_pkey',
449:   'alter table public.push_tokens add constraint push_tokens_pkey ' || $bl$PRIMARY KEY (id)$bl$);
451: select pg_temp.bl_constraint('public.quiz_scores', 'quiz_scores_pkey',
452:   'alter table public.quiz_scores add constraint quiz_scores_pkey ' || $bl$PRIMARY KEY (id)$bl$);
454: select pg_temp.bl_constraint('public.quiz_tests', 'quiz_tests_pkey',
455:   'alter table public.quiz_tests add constraint quiz_tests_pkey ' || $bl$PRIMARY KEY (id)$bl$);
457: select pg_temp.bl_constraint('public.razorpay_webhook_events', 'razorpay_webhook_events_pkey',
458:   'alter table public.razorpay_webhook_events add constraint razorpay_webhook_events_pkey ' || $bl$PRIMARY KEY (event_id)$bl$);
460: select pg_temp.bl_constraint('public.subjects', 'subjects_pkey',
461:   'alter table public.subjects add constraint subjects_pkey ' || $bl$PRIMARY KEY (id)$bl$);
463: select pg_temp.bl_constraint('public.videos', 'videos_pkey',
464:   'alter table public.videos add constraint videos_pkey ' || $bl$PRIMARY KEY (id)$bl$);
466: select pg_temp.bl_constraint('public.years', 'years_pkey',
467:   'alter table public.years add constraint years_pkey ' || $bl$PRIMARY KEY (id)$bl$);
469: select pg_temp.bl_constraint('public.admins', 'admins_id_key',
470:   'alter table public.admins add constraint admins_id_key ' || $bl$UNIQUE (id)$bl$);
472: select pg_temp.bl_constraint('public.payments', 'payments_razorpay_payment_id_key',
473:   'alter table public.payments add constraint payments_razorpay_payment_id_key ' || $bl$UNIQUE (razorpay_payment_id)$bl$);
475: select pg_temp.bl_constraint('public.push_tokens', 'push_tokens_expo_push_token_key',
476:   'alter table public.push_tokens add constraint push_tokens_expo_push_token_key ' || $bl$UNIQUE (expo_push_token)$bl$);
478: select pg_temp.bl_constraint('public.app_settings', 'single_row',
479:   'alter table public.app_settings add constraint single_row ' || $bl$CHECK ((id = 1))$bl$);
481: select pg_temp.bl_constraint('public.orders', 'orders_status_check',
482:   'alter table public.orders add constraint orders_status_check ' || $bl$CHECK ((status = ANY (ARRAY['created'::text, 'paid'::text, 'failed'::text, 'cancelled'::text, 'pending'::text, 'refunded'::text])))$bl$);
484: select pg_temp.bl_constraint('public.products', 'original_price_gte_price',
485:   'alter table public.products add constraint original_price_gte_price ' || $bl$CHECK (((original_price IS NULL) OR (original_price >= price)))$bl$);
487: select pg_temp.bl_constraint('public.products', 'products_scope_check',
488:   'alter table public.products add constraint products_scope_check ' || $bl$CHECK ((scope = ANY (ARRAY['chapter'::text, 'subject'::text, 'year'::text, 'bundle'::text])))$bl$);
490: select pg_temp.bl_constraint('public.purchases', 'purchases_scope_check',
491:   'alter table public.purchases add constraint purchases_scope_check ' || $bl$CHECK ((scope = ANY (ARRAY['chapter'::text, 'subject'::text, 'year'::text, 'bundle'::text])))$bl$);
493: select pg_temp.bl_constraint('public.push_tokens', 'push_tokens_platform_check',
494:   'alter table public.push_tokens add constraint push_tokens_platform_check ' || $bl$CHECK ((platform = ANY (ARRAY['ios'::text, 'android'::text, 'web'::text])))$bl$);
496: select pg_temp.bl_constraint('public.admins', 'admins_id_fkey',
497:   'alter table public.admins add constraint admins_id_fkey ' || $bl$FOREIGN KEY (id) REFERENCES auth.users(id)$bl$);
499: select pg_temp.bl_constraint('public.analytics_events', 'analytics_events_user_id_fkey',
500:   'alter table public.analytics_events add constraint analytics_events_user_id_fkey ' || $bl$FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL$bl$);
502: select pg_temp.bl_constraint('public.chapters', 'chapters_subject_id_fkey',
503:   'alter table public.chapters add constraint chapters_subject_id_fkey ' || $bl$FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE$bl$);
505: select pg_temp.bl_constraint('public.chapters', 'chapters_year_id_fkey',
506:   'alter table public.chapters add constraint chapters_year_id_fkey ' || $bl$FOREIGN KEY (year_id) REFERENCES years(id) ON DELETE CASCADE$bl$);
508: select pg_temp.bl_constraint('public.notes', 'notes_chapter_id_fkey',
509:   'alter table public.notes add constraint notes_chapter_id_fkey ' || $bl$FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE$bl$);
511: select pg_temp.bl_constraint('public.orders', 'orders_product_id_fkey',
512:   'alter table public.orders add constraint orders_product_id_fkey ' || $bl$FOREIGN KEY (product_id) REFERENCES products(id)$bl$);
514: select pg_temp.bl_constraint('public.orders', 'orders_user_id_fkey',
515:   'alter table public.orders add constraint orders_user_id_fkey ' || $bl$FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE$bl$);
517: select pg_temp.bl_constraint('public.payment_sessions', 'payment_sessions_order_id_fkey',
518:   'alter table public.payment_sessions add constraint payment_sessions_order_id_fkey ' || $bl$FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE$bl$);
520: select pg_temp.bl_constraint('public.payment_sessions', 'payment_sessions_product_id_fkey',
521:   'alter table public.payment_sessions add constraint payment_sessions_product_id_fkey ' || $bl$FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE$bl$);
523: select pg_temp.bl_constraint('public.payment_sessions', 'payment_sessions_user_id_fkey',
524:   'alter table public.payment_sessions add constraint payment_sessions_user_id_fkey ' || $bl$FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE$bl$);
526: select pg_temp.bl_constraint('public.payments', 'payments_order_id_fkey',
527:   'alter table public.payments add constraint payments_order_id_fkey ' || $bl$FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE$bl$);
529: select pg_temp.bl_constraint('public.payments', 'payments_product_id_fkey',
530:   'alter table public.payments add constraint payments_product_id_fkey ' || $bl$FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL$bl$);
532: select pg_temp.bl_constraint('public.payments', 'payments_user_id_fkey',
533:   'alter table public.payments add constraint payments_user_id_fkey ' || $bl$FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE$bl$);
535: select pg_temp.bl_constraint('public.products', 'products_chapter_id_fkey',
536:   'alter table public.products add constraint products_chapter_id_fkey ' || $bl$FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL$bl$);
538: select pg_temp.bl_constraint('public.products', 'products_subject_id_fkey',
539:   'alter table public.products add constraint products_subject_id_fkey ' || $bl$FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL$bl$);
541: select pg_temp.bl_constraint('public.products', 'products_year_id_fkey',
542:   'alter table public.products add constraint products_year_id_fkey ' || $bl$FOREIGN KEY (year_id) REFERENCES years(id) ON DELETE SET NULL$bl$);
544: select pg_temp.bl_constraint('public.profiles', 'profiles_id_fkey',
545:   'alter table public.profiles add constraint profiles_id_fkey ' || $bl$FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE$bl$);
547: select pg_temp.bl_constraint('public.purchases', 'purchases_chapter_id_fkey',
548:   'alter table public.purchases add constraint purchases_chapter_id_fkey ' || $bl$FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL$bl$);
550: select pg_temp.bl_constraint('public.purchases', 'purchases_order_id_fkey',
551:   'alter table public.purchases add constraint purchases_order_id_fkey ' || $bl$FOREIGN KEY (order_id) REFERENCES orders(id)$bl$);
553: select pg_temp.bl_constraint('public.purchases', 'purchases_product_id_fkey',
554:   'alter table public.purchases add constraint purchases_product_id_fkey ' || $bl$FOREIGN KEY (product_id) REFERENCES products(id)$bl$);
556: select pg_temp.bl_constraint('public.purchases', 'purchases_subject_id_fkey',
557:   'alter table public.purchases add constraint purchases_subject_id_fkey ' || $bl$FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL$bl$);
559: select pg_temp.bl_constraint('public.purchases', 'purchases_user_id_fkey',
560:   'alter table public.purchases add constraint purchases_user_id_fkey ' || $bl$FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE$bl$);
562: select pg_temp.bl_constraint('public.purchases', 'purchases_year_id_fkey',
563:   'alter table public.purchases add constraint purchases_year_id_fkey ' || $bl$FOREIGN KEY (year_id) REFERENCES years(id) ON DELETE SET NULL$bl$);
565: select pg_temp.bl_constraint('public.push_tokens', 'push_tokens_user_id_fkey',
566:   'alter table public.push_tokens add constraint push_tokens_user_id_fkey ' || $bl$FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE$bl$);
568: select pg_temp.bl_constraint('public.quiz_scores', 'quiz_scores_subject_id_fkey',
569:   'alter table public.quiz_scores add constraint quiz_scores_subject_id_fkey ' || $bl$FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL$bl$);
571: select pg_temp.bl_constraint('public.quiz_scores', 'quiz_scores_test_id_fkey',
572:   'alter table public.quiz_scores add constraint quiz_scores_test_id_fkey ' || $bl$FOREIGN KEY (test_id) REFERENCES quiz_tests(id) ON DELETE SET NULL$bl$);
574: select pg_temp.bl_constraint('public.quiz_scores', 'quiz_scores_user_id_fkey',
575:   'alter table public.quiz_scores add constraint quiz_scores_user_id_fkey ' || $bl$FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE$bl$);
577: select pg_temp.bl_constraint('public.quiz_tests', 'quiz_tests_subject_id_fkey',
578:   'alter table public.quiz_tests add constraint quiz_tests_subject_id_fkey ' || $bl$FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE$bl$);
580: select pg_temp.bl_constraint('public.quiz_tests', 'quiz_tests_year_id_fkey',
581:   'alter table public.quiz_tests add constraint quiz_tests_year_id_fkey ' || $bl$FOREIGN KEY (year_id) REFERENCES years(id) ON DELETE CASCADE$bl$);
583: select pg_temp.bl_constraint('public.subjects', 'subjects_year_id_fkey',
584:   'alter table public.subjects add constraint subjects_year_id_fkey ' || $bl$FOREIGN KEY (year_id) REFERENCES years(id) ON DELETE CASCADE$bl$);
586: select pg_temp.bl_constraint('public.videos', 'videos_subject_id_fkey',
587:   'alter table public.videos add constraint videos_subject_id_fkey ' || $bl$FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE$bl$);
589: select pg_temp.bl_constraint('public.videos', 'videos_year_id_fkey',
590:   'alter table public.videos add constraint videos_year_id_fkey ' || $bl$FOREIGN KEY (year_id) REFERENCES years(id) ON DELETE CASCADE$bl$);
601: CREATE UNIQUE INDEX IF NOT EXISTS purchases_order_id_unique ON public.purchases USING btree (order_id);
620: alter table public.purchases enable row level security;
632: create policy "admins_admin_only" on public.admins for all to public
634:   with check (am_i_admin())
638: create policy "anyone can log analytics events" on public.analytics_events for insert to public
639:   with check (true)
643: create policy "admin write app_settings" on public.app_settings for update to public
648: create policy "public read app_settings" on public.app_settings for select to public
653: create policy "admin write chapters" on public.chapters for all to public
655:   with check (is_admin())
659: create policy "chapters_admin_write" on public.chapters for all to public
661:   with check (am_i_admin())
665: create policy "chapters_public_read_active" on public.chapters for select to public
670: create policy "public read active chapters" on public.chapters for select to public
675: create policy "Admin can manage notes" on public.notes for all to authenticated
679:   with check ((EXISTS ( SELECT 1
685: create policy "Authenticated users can read notes" on public.notes for select to authenticated
690: create policy "notes_admin_write" on public.notes for all to public
692:   with check (am_i_admin())
696: create policy "notes_public_read_active" on public.notes for select to public
701: create policy "read notes" on public.notes for select to public
706: create policy "admin write notifications" on public.notifications for all to public
708:   with check (is_admin())
712: create policy "notifications_admin_write" on public.notifications for all to public
714:   with check (am_i_admin())
718: create policy "notifications_public_read_active" on public.notifications for select to public
723: create policy "public read active notifications" on public.notifications for select to public
728: create policy "Admins can update all orders" on public.orders for update to public
730:   with check (am_i_admin())
734: create policy "Admins can view all orders" on public.orders for select to public
739: create policy "Users can cancel own pending orders" on public.orders for update to public
741:   with check (((auth.uid() = user_id) AND (status <> 'paid'::text)))
745: create policy "Users can create own orders" on public.orders for insert to public
746:   with check (((auth.uid() = user_id) AND (status = 'created'::text)))
750: create policy "Users can view own orders" on public.orders for select to public
755: create policy "admin update orders" on public.orders for update to public
760: create policy "orders_admin_write" on public.orders for all to public
762:   with check (am_i_admin())
766: create policy "orders_insert_own" on public.orders for insert to public
767:   with check ((user_id = auth.uid()))
771: create policy "orders_select_own_or_admin" on public.orders for select to public
776: create policy "user read own orders" on public.orders for select to public
781: create policy "payment_sessions_select_own" on public.payment_sessions for select to public
786: create policy "Admins can view all payments" on public.payments for select to public
791: create policy "Users can view own payments" on public.payments for select to public
796: create policy "payments_admin_read" on public.payments for select to public
801: create policy "admin write products" on public.products for all to public
803:   with check (is_admin())
807: create policy "products_admin_write" on public.products for all to public
809:   with check (am_i_admin())
813: create policy "products_public_read_active" on public.products for select to public
818: create policy "public read active products" on public.products for select to public
823: create policy "admin manage profiles" on public.profiles for all to public
828: create policy "profiles_admin_all" on public.profiles for all to public
830:   with check (am_i_admin())
834: create policy "profiles_select_own_or_admin" on public.profiles for select to public
839: create policy "profiles_update_own_or_admin" on public.profiles for update to public
844: create policy "user read own profile" on public.profiles for select to public
849: create policy "user update own profile" on public.profiles for update to public
851:   with check (((id = auth.uid()) AND (blocked = ( SELECT profiles_1.blocked
856: select pg_temp.bl_policy('public', 'purchases', 'Admins can view all purchases', $bl$
857: create policy "Admins can view all purchases" on public.purchases for select to public
861: select pg_temp.bl_policy('public', 'purchases', 'Users can view own purchases', $bl$
862: create policy "Users can view own purchases" on public.purchases for select to public
866: select pg_temp.bl_policy('public', 'purchases', 'purchases_admin_write', $bl$
867: create policy "purchases_admin_write" on public.purchases for all to public
869:   with check (am_i_admin())
872: select pg_temp.bl_policy('public', 'purchases', 'purchases_select_own_or_admin', $bl$
873: create policy "purchases_select_own_or_admin" on public.purchases for select to public
877: select pg_temp.bl_policy('public', 'purchases', 'user read own purchases', $bl$
878: create policy "user read own purchases" on public.purchases for select to public
883: create policy "Users manage their own push tokens" on public.push_tokens for all to public
885:   with check ((auth.uid() = user_id))
889: create policy "push_tokens_own" on public.push_tokens for all to public
891:   with check (((user_id = auth.uid()) OR am_i_admin()))
895: create policy "quiz_scores_own_or_admin" on public.quiz_scores for all to public
897:   with check (((user_id = auth.uid()) OR am_i_admin()))
901: create policy "user read own quiz_scores" on public.quiz_scores for select to public
906: create policy "user write own quiz_scores" on public.quiz_scores for insert to public
907:   with check ((user_id = auth.uid()))
911: create policy "admin write quiz_tests" on public.quiz_tests for all to public
913:   with check (is_admin())
917: create policy "public read active quiz_tests" on public.quiz_tests for select to public
922: create policy "quiz_tests_admin_write" on public.quiz_tests for all to public
924:   with check (am_i_admin())
928: create policy "quiz_tests_public_read_active" on public.quiz_tests for select to public
933: create policy "admin write subjects" on public.subjects for all to public
935:   with check (is_admin())
939: create policy "public read active subjects" on public.subjects for select to public
944: create policy "subjects_admin_write" on public.subjects for all to public
946:   with check (am_i_admin())
950: create policy "subjects_public_read_active" on public.subjects for select to public
955: create policy "admin write videos" on public.videos for all to public
957:   with check (is_admin())
961: create policy "public read active videos" on public.videos for select to public
966: create policy "videos_admin_write" on public.videos for all to public
968:   with check (am_i_admin())
972: create policy "videos_public_read_active" on public.videos for select to public
977: create policy "admin write years" on public.years for all to public
979:   with check (is_admin())
983: create policy "public read active years" on public.years for select to public
988: create policy "years_admin_write" on public.years for all to public
990:   with check (am_i_admin())
994: create policy "years_public_read_active" on public.years for select to public
999: create policy "admin delete notes/thumbnails" on storage.objects for delete to public
1004: create policy "admin update notes/thumbnails" on storage.objects for update to public
1006:   with check (((bucket_id = ANY (ARRAY['notes'::text, 'thumbnails'::text])) AND is_admin()))
1010: create policy "admin upload notes/thumbnails" on storage.objects for insert to public
1011:   with check (((bucket_id = ANY (ARRAY['notes'::text, 'thumbnails'::text])) AND is_admin()))
1015: create policy "notes_admin_write" on storage.objects for all to public
1017:   with check (((bucket_id = 'notes'::text) AND am_i_admin()))
1021: create policy "notes_read_if_purchased" on storage.objects for select to public
1025:      JOIN purchases p ON ((p.user_id = auth.uid())))
1030: create policy "public read notes/thumbnails" on storage.objects for select to public
1036: select pg_temp.bl_trigger('auth.users', 'on_auth_user_created', $bl$CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()$bl$);
1038: select pg_temp.bl_trigger('public.profiles', 'profiles_sync_phone_normalized', $bl$CREATE TRIGGER profiles_sync_phone_normalized BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_profile_phone_normalized()$bl$);
1045:     create event trigger ensure_rls on ddl_command_end
1050:   raise notice 'baseline: cannot create event trigger ensure_rls (insufficient privilege); skipped';
1116: grant DELETE, REFERENCES, TRIGGER, MAINTAIN, INSERT, UPDATE, SELECT, TRUNCATE on table public.purchases to anon;
1117: grant REFERENCES, MAINTAIN, TRIGGER, TRUNCATE, UPDATE, SELECT, INSERT, DELETE on table public.purchases to authenticated;
1118: grant TRUNCATE, REFERENCES, TRIGGER, MAINTAIN, INSERT, SELECT, UPDATE, DELETE on table public.purchases to service_role;
## supabase/migrations/20260721_admin_orders_purchases_access.sql

1: -- REGRESSION FIX for orders_purchases_rls.sql.
3: -- That migration was correct to lock orders/purchases down to
7: -- and the equivalent for purchases). The admin panel authenticates with
26: create policy "Admins can view all orders"
36: create policy "Admins can update all orders"
39:   with check (am_i_admin());
41: drop policy if exists "Admins can view all purchases" on public.purchases;
42: create policy "Admins can view all purchases"
43:   on public.purchases for select
## supabase/migrations/20260801150000_razorpay_webhook_atomic_grant.sql

4: alter table public.purchases
18:   where table_schema = 'public' and table_name = 'purchases' and column_name = 'id';
21:     alter table public.purchases alter column id set default gen_random_uuid();
23:     alter table public.purchases alter column id set default gen_random_uuid()::text;
25:     raise exception 'public.purchases.id is missing';
27:     raise exception 'unsupported public.purchases.id type: %', id_type;
58: create unique index if not exists purchases_order_id_unique
59:   on public.purchases(order_id);
76: create or replace function public.grant_razorpay_payment(
128:   insert into public.purchases (
## supabase/migrations/20260919120000_multi_course_and_referrals.sql

21: --   - purchases has a product_id column (added by
23: --   - RLS policy names on orders/purchases: the real migrations and the
34: --   - Drop new tables: `drop table if exists public.referrals,
35: --     public.referral_settings, public.courses cascade;` — cascade will
54:   v_purchases bigint; v_profiles bigint;
64:   select count(*) into v_purchases from public.purchases;
66:   raise notice 'PRE-FLIGHT row counts — years:%, subjects:%, chapters:%, notes:%, videos:%, quiz_tests:%, products:%, orders:%, purchases:%, profiles:%',
67:     v_years, v_subjects, v_chapters, v_notes, v_videos, v_quiz, v_products, v_orders, v_purchases, v_profiles;
100: create or replace function public.touch_profile_updated_at()
113: create trigger courses_touch_updated_at
154: alter table public.purchases
213: -- orders/purchases: prefer the linked product's course; fall back to
225: update public.purchases pu set course_id = p.course_id
227: update public.purchases pu set course_id = c.course_id
229: update public.purchases pu set course_id = s.course_id
231: update public.purchases pu set course_id = y.course_id
233: update public.purchases set course_id = 'bams' where course_id is null;
270:   select count(*) into v_bad_count from public.purchases where course_id is null;
271:   if v_bad_count > 0 then raise exception 'purchases.course_id backfill incomplete: % rows', v_bad_count; end if;
288: alter table public.purchases alter column course_id set not null;
293: -- constraint here would make every new signup fail outright. Existing
328: create index if not exists idx_purchases_course_id on public.purchases(course_id);
345: create or replace function public.subjects_derive_course()
368: create trigger subjects_before_write
372: create or replace function public.subjects_propagate_course_move()
395: create trigger subjects_after_write
400: create or replace function public.chapters_derive_course()
429: create trigger chapters_before_write
433: create or replace function public.chapters_propagate_course_move()
451: create trigger chapters_after_write
456: create or replace function public.notes_derive_course()
485: create trigger notes_before_write
490: create or replace function public.videos_derive_course()
519: create trigger videos_before_write
524: create or replace function public.quiz_tests_derive_course()
553: create trigger quiz_tests_before_write
558: create or replace function public.products_derive_course()
630: create trigger products_before_write
635: create or replace function public.years_before_write()
652: create trigger years_before_write
656: create or replace function public.years_propagate_course_move()
676: create trigger years_after_write
682: create or replace function public.orders_derive_course()
717: create trigger orders_before_write
721: -- purchases has no equivalent trigger: it is only ever written by
723: -- authenticated at all — see orders_purchases_rls.sql) and that function
729: create or replace function public.my_course_id()
739: create or replace function public.my_year_id()
754: create or replace function public.has_content_access(p_course_id text, p_year_id text)
771:       from public.purchases pu
788: -- Compares purchases.course_id against the chapter's own course_id as
792: create or replace function public.user_owns_chapter(p_chapter_id text)
804:       join public.purchases p
821: create or replace function public.set_my_course_year(p_course_id text, p_year_id text default null)
870: create or replace function public.profiles_before_write()
908: create trigger profiles_before_write
918: create policy "courses_public_read_active" on public.courses
922: create policy "courses_admin_write" on public.courses
923:   for all using (public.am_i_admin()) with check (public.am_i_admin());
930: create policy "years_public_read_active" on public.years
939: create policy "years_admin_write" on public.years
940:   for all using (public.am_i_admin()) with check (public.am_i_admin());
947: create policy "subjects_public_read_active" on public.subjects
951: create policy "subjects_admin_write" on public.subjects
952:   for all using (public.am_i_admin()) with check (public.am_i_admin());
956: create policy "chapters_public_read_active" on public.chapters
960: create policy "chapters_admin_write" on public.chapters
961:   for all using (public.am_i_admin()) with check (public.am_i_admin());
965: create policy "notes_public_read_active" on public.notes
969: create policy "notes_admin_write" on public.notes
970:   for all using (public.am_i_admin()) with check (public.am_i_admin());
974: create policy "videos_public_read_active" on public.videos
978: create policy "videos_admin_write" on public.videos
979:   for all using (public.am_i_admin()) with check (public.am_i_admin());
983: create policy "quiz_tests_public_read_active" on public.quiz_tests
987: create policy "quiz_tests_admin_write" on public.quiz_tests
988:   for all using (public.am_i_admin()) with check (public.am_i_admin());
999: create policy "products_public_read_active" on public.products
1018: create policy "products_admin_write" on public.products
1019:   for all using (public.am_i_admin()) with check (public.am_i_admin());
1025: create policy "notes_read_if_purchased" on storage.objects
1040: create policy "notes_admin_write" on storage.objects
1042:   with check (bucket_id = 'notes' and public.am_i_admin());
1070: create policy "public read thumbnails" on storage.objects
1081: -- purchases at all.
1082: create or replace function public.grant_razorpay_payment(
1137:   insert into public.purchases (
1153:   update public.referrals
1158:       select 1 from public.referral_settings where id = true and qualify_on = 'first_purchase'
1173: -- 12a. referral_settings (single row)
1174: create table if not exists public.referral_settings (
1175:   id boolean primary key default true check (id),
1177:   reward_type text not null default 'none' check (reward_type in ('none','discount_percent','discount_flat','credit')),
1180:   qualify_on text not null default 'signup' check (qualify_on in ('signup','first_purchase')),
1181:   max_referrals_per_user integer,
1185: insert into public.referral_settings (id) values (true) on conflict (id) do nothing;
1187: drop trigger if exists referral_settings_touch_updated_at on public.referral_settings;
1188: create trigger referral_settings_touch_updated_at
1189:   before update on public.referral_settings
1192: alter table public.referral_settings enable row level security;
1194: drop policy if exists "referral_settings_read_authenticated" on public.referral_settings;
1195: create policy "referral_settings_read_authenticated" on public.referral_settings
1198: drop policy if exists "referral_settings_admin_write" on public.referral_settings;
1199: create policy "referral_settings_admin_write" on public.referral_settings
1200:   for all using (public.am_i_admin()) with check (public.am_i_admin());
1202: -- 12b. referrals
1203: create table if not exists public.referrals (
1208:   status text not null default 'pending' check (status in ('pending','qualified','rewarded','rejected')),
1213:   constraint referrals_no_self_referral check (referrer_id <> referred_id)
1216: create index if not exists idx_referrals_referrer on public.referrals(referrer_id);
1217: create index if not exists idx_referrals_status on public.referrals(status);
1219: alter table public.referrals enable row level security;
1224: drop policy if exists "referrals_read_own" on public.referrals;
1225: create policy "referrals_read_own" on public.referrals
1229: drop policy if exists "referrals_admin_write" on public.referrals;
1230: create policy "referrals_admin_write" on public.referrals
1231:   for all using (public.am_i_admin()) with check (public.am_i_admin());
1236: create or replace function public.generate_unique_referral_code(p_length int default 7)
1263: create or replace function public.profiles_generate_referral_code()
1278: create trigger profiles_before_insert_referral_code
1301: create or replace function public.apply_referral_code(p_code text)
1309:   v_settings public.referral_settings%rowtype;
1322:   select * into v_settings from public.referral_settings where id = true;
1324:     return jsonb_build_object('status', 'disabled', 'message', 'Referrals are not available right now.');
1345:   if exists (select 1 from public.referrals where referred_id = v_uid) then
1353:   if exists (select 1 from public.purchases where user_id = v_uid and status = 'success') then
1357:   if v_settings.max_referrals_per_user is not null then
1358:     select count(*) into v_referral_count from public.referrals where referrer_id = v_referrer.id;
1359:     if v_referral_count >= v_settings.max_referrals_per_user then
1364:   insert into public.referrals (referrer_id, referred_id, code_used, status, qualified_at)
1383: -- referral_settings but no automatic payout, wallet credit, or price
1384: -- discount is applied anywhere. A 'rewarded' referrals.status must be set
1408:   raise notice 'multi-course + referrals migration completed successfully';
## supabase/migrations/20260919130000_referral_history_rpc.sql

6: -- email/phone) for referrals where the caller is the referrer.
7: -- Depends on 20260919120000_multi_course_and_referrals.sql.
9: create or replace function public.get_my_referrals()
36:   from public.referrals r
42: revoke all on function public.get_my_referrals() from public;
43: grant execute on function public.get_my_referrals() to authenticated;
## supabase/migrations/20260920120000_null_year_course_fallback.sql

20: create or replace function public.has_content_access(p_course_id text, p_year_id text)
41:       from public.purchases pu
## supabase/migrations/20260921130000_account_deletion_support.sql

16: --      any signed-in user and deleted payments/orders/purchases outright.
25: alter table public.orders   drop constraint if exists orders_user_id_fkey;
26: alter table public.orders   add constraint orders_user_id_fkey
29: alter table public.payments drop constraint if exists payments_user_id_fkey;
30: alter table public.payments add constraint payments_user_id_fkey
33: CREATE OR REPLACE FUNCTION public.grant_razorpay_payment(p_event_id text, p_razorpay_order_id text, p_razorpay_payment_id text, p_amount_paise bigint)
109:   insert into public.purchases (
125:   update public.referrals
130:       select 1 from public.referral_settings where id = true and qualify_on = 'first_purchase'
139: create or replace function public.erase_user_data(p_user_id uuid)
166:   delete from public.purchases where user_id = p_user_id;
167:   get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('purchases', n);
168:   delete from public.referrals where referrer_id = p_user_id or referred_id = p_user_id;
169:   get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('referrals', n);
## supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql

8: --             20260919120000_multi_course_and_referrals.sql
45: -- Nothing is deleted from orders, purchases, payments, profiles, auth.users or
46: -- storage. Existing purchases keep working.
53: union all select 'purchases', count(*) from public.purchases
68: -- ===== BEGIN folded: 20260919120000_multi_course_and_referrals.sql =====
89: --   - purchases has a product_id column (added by
91: --   - RLS policy names on orders/purchases: the real migrations and the
102: --   - Drop new tables: `drop table if exists public.referrals,
103: --     public.referral_settings, public.courses cascade;` — cascade will
121:   v_purchases bigint; v_profiles bigint;
131:   select count(*) into v_purchases from public.purchases;
133:   raise notice 'PRE-FLIGHT row counts — years:%, subjects:%, chapters:%, notes:%, videos:%, quiz_tests:%, products:%, orders:%, purchases:%, profiles:%',
134:     v_years, v_subjects, v_chapters, v_notes, v_videos, v_quiz, v_products, v_orders, v_purchases, v_profiles;
167: create or replace function public.touch_profile_updated_at()
180: create trigger courses_touch_updated_at
221: alter table public.purchases
280: -- orders/purchases: prefer the linked product's course; fall back to
292: update public.purchases pu set course_id = p.course_id
294: update public.purchases pu set course_id = c.course_id
296: update public.purchases pu set course_id = s.course_id
298: update public.purchases pu set course_id = y.course_id
300: update public.purchases set course_id = 'bams' where course_id is null;
337:   select count(*) into v_bad_count from public.purchases where course_id is null;
338:   if v_bad_count > 0 then raise exception 'purchases.course_id backfill incomplete: % rows', v_bad_count; end if;
355: alter table public.purchases alter column course_id set not null;
360: -- constraint here would make every new signup fail outright. Existing
395: create index if not exists idx_purchases_course_id on public.purchases(course_id);
412: create or replace function public.subjects_derive_course()
435: create trigger subjects_before_write
439: create or replace function public.subjects_propagate_course_move()
462: create trigger subjects_after_write
467: create or replace function public.chapters_derive_course()
496: create trigger chapters_before_write
500: create or replace function public.chapters_propagate_course_move()
518: create trigger chapters_after_write
523: create or replace function public.notes_derive_course()
552: create trigger notes_before_write
557: create or replace function public.videos_derive_course()
586: create trigger videos_before_write
591: create or replace function public.quiz_tests_derive_course()
620: create trigger quiz_tests_before_write
625: create or replace function public.products_derive_course()
697: create trigger products_before_write
702: create or replace function public.years_before_write()
719: create trigger years_before_write
723: create or replace function public.years_propagate_course_move()
743: create trigger years_after_write
749: create or replace function public.orders_derive_course()
784: create trigger orders_before_write
788: -- purchases has no equivalent trigger: it is only ever written by
790: -- authenticated at all — see orders_purchases_rls.sql) and that function
796: create or replace function public.my_course_id()
806: create or replace function public.my_year_id()
821: create or replace function public.has_content_access(p_course_id text, p_year_id text)
838:       from public.purchases pu
855: -- Compares purchases.course_id against the chapter's own course_id as
859: create or replace function public.user_owns_chapter(p_chapter_id text)
871:       join public.purchases p
888: create or replace function public.set_my_course_year(p_course_id text, p_year_id text default null)
937: create or replace function public.profiles_before_write()
975: create trigger profiles_before_write
985: create policy "courses_public_read_active" on public.courses
989: create policy "courses_admin_write" on public.courses
990:   for all using (public.am_i_admin()) with check (public.am_i_admin());
997: create policy "years_public_read_active" on public.years
1006: create policy "years_admin_write" on public.years
1007:   for all using (public.am_i_admin()) with check (public.am_i_admin());
1014: create policy "subjects_public_read_active" on public.subjects
1018: create policy "subjects_admin_write" on public.subjects
1019:   for all using (public.am_i_admin()) with check (public.am_i_admin());
1023: create policy "chapters_public_read_active" on public.chapters
1027: create policy "chapters_admin_write" on public.chapters
1028:   for all using (public.am_i_admin()) with check (public.am_i_admin());
1032: create policy "notes_public_read_active" on public.notes
1036: create policy "notes_admin_write" on public.notes
1037:   for all using (public.am_i_admin()) with check (public.am_i_admin());
1041: create policy "videos_public_read_active" on public.videos
1045: create policy "videos_admin_write" on public.videos
1046:   for all using (public.am_i_admin()) with check (public.am_i_admin());
1050: create policy "quiz_tests_public_read_active" on public.quiz_tests
1054: create policy "quiz_tests_admin_write" on public.quiz_tests
1055:   for all using (public.am_i_admin()) with check (public.am_i_admin());
1066: create policy "products_public_read_active" on public.products
1085: create policy "products_admin_write" on public.products
1086:   for all using (public.am_i_admin()) with check (public.am_i_admin());
1092: create policy "notes_read_if_purchased" on storage.objects
1107: create policy "notes_admin_write" on storage.objects
1109:   with check (bucket_id = 'notes' and public.am_i_admin());
1140: create policy "public read thumbnails" on storage.objects
1151: -- purchases at all.
1152: create or replace function public.grant_razorpay_payment(
1207:   insert into public.purchases (
1223:   update public.referrals
1228:       select 1 from public.referral_settings where id = true and qualify_on = 'first_purchase'
1243: -- 12a. referral_settings (single row)
1244: create table if not exists public.referral_settings (
1245:   id boolean primary key default true check (id),
1247:   reward_type text not null default 'none' check (reward_type in ('none','discount_percent','discount_flat','credit')),
1250:   qualify_on text not null default 'signup' check (qualify_on in ('signup','first_purchase')),
1251:   max_referrals_per_user integer,
1255: insert into public.referral_settings (id) values (true) on conflict (id) do nothing;
1257: drop trigger if exists referral_settings_touch_updated_at on public.referral_settings;
1258: create trigger referral_settings_touch_updated_at
1259:   before update on public.referral_settings
1262: alter table public.referral_settings enable row level security;
1264: drop policy if exists "referral_settings_read_authenticated" on public.referral_settings;
1265: create policy "referral_settings_read_authenticated" on public.referral_settings
1268: drop policy if exists "referral_settings_admin_write" on public.referral_settings;
1269: create policy "referral_settings_admin_write" on public.referral_settings
1270:   for all using (public.am_i_admin()) with check (public.am_i_admin());
1272: -- 12b. referrals
1273: create table if not exists public.referrals (
1278:   status text not null default 'pending' check (status in ('pending','qualified','rewarded','rejected')),
1283:   constraint referrals_no_self_referral check (referrer_id <> referred_id)
1286: create index if not exists idx_referrals_referrer on public.referrals(referrer_id);
1287: create index if not exists idx_referrals_status on public.referrals(status);
1289: alter table public.referrals enable row level security;
1294: drop policy if exists "referrals_read_own" on public.referrals;
1295: create policy "referrals_read_own" on public.referrals
1299: drop policy if exists "referrals_admin_write" on public.referrals;
1300: create policy "referrals_admin_write" on public.referrals
1301:   for all using (public.am_i_admin()) with check (public.am_i_admin());
1306: create or replace function public.generate_unique_referral_code(p_length int default 7)
1333: create or replace function public.profiles_generate_referral_code()
1348: create trigger profiles_before_insert_referral_code
1371: create or replace function public.apply_referral_code(p_code text)
1379:   v_settings public.referral_settings%rowtype;
1392:   select * into v_settings from public.referral_settings where id = true;
1394:     return jsonb_build_object('status', 'disabled', 'message', 'Referrals are not available right now.');
1415:   if exists (select 1 from public.referrals where referred_id = v_uid) then
1423:   if exists (select 1 from public.purchases where user_id = v_uid and status = 'success') then
1427:   if v_settings.max_referrals_per_user is not null then
1428:     select count(*) into v_referral_count from public.referrals where referrer_id = v_referrer.id;
1429:     if v_referral_count >= v_settings.max_referrals_per_user then
1434:   insert into public.referrals (referrer_id, referred_id, code_used, status, qualified_at)
1453: -- referral_settings but no automatic payout, wallet credit, or price
1454: -- discount is applied anywhere. A 'rewarded' referrals.status must be set
1478:   raise notice 'multi-course + referrals migration completed successfully';
1483: -- ===== END folded: 20260919120000_multi_course_and_referrals.sql =====
1491: -- email/phone) for referrals where the caller is the referrer.
1492: -- Depends on 20260919120000_multi_course_and_referrals.sql.
1494: create or replace function public.get_my_referrals()
1521:   from public.referrals r
1527: revoke all on function public.get_my_referrals() from public;
1528: grant execute on function public.get_my_referrals() to authenticated;
1552: create or replace function public.has_content_access(p_course_id text, p_year_id text)
1573:       from public.purchases pu
1606:   constraint app_config_min_app_version_format
1607:     check (key <> 'min_app_version' or value ~ '^[0-9]+(\.[0-9]+){0,2}$'),
1608:   constraint app_config_store_url_https
1609:     check (key <> 'store_url' or value ~ '^https://')
1612: create or replace function public.app_config_touch_updated_at()
1621: create trigger app_config_touch_updated_at
1631: create policy "app_config_public_read" on public.app_config
1635: create policy "app_config_admin_insert" on public.app_config
1636:   for insert to authenticated with check (public.am_i_admin());
1639: create policy "app_config_admin_update" on public.app_config
1640:   for update to authenticated using (public.am_i_admin()) with check (public.am_i_admin());
1643: create policy "app_config_admin_delete" on public.app_config
1677: create or replace function public.profiles_temp_default_course()
1693: create trigger profiles_temp_default_course
1721: create or replace function public.purge_old_analytics_events()
1743: create or replace function public.purge_old_payment_sessions()
1810: --      any signed-in user and deleted payments/orders/purchases outright.
1819: alter table public.orders   drop constraint if exists orders_user_id_fkey;
1820: alter table public.orders   add constraint orders_user_id_fkey
1823: alter table public.payments drop constraint if exists payments_user_id_fkey;
1824: alter table public.payments add constraint payments_user_id_fkey
1827: CREATE OR REPLACE FUNCTION public.grant_razorpay_payment(p_event_id text, p_razorpay_order_id text, p_razorpay_payment_id text, p_amount_paise bigint)
1903:   insert into public.purchases (
1919:   update public.referrals
1924:       select 1 from public.referral_settings where id = true and qualify_on = 'first_purchase'
1933: create or replace function public.erase_user_data(p_user_id uuid)
1960:   delete from public.purchases where user_id = p_user_id;
1961:   get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('purchases', n);
1962:   delete from public.referrals where referrer_id = p_user_id or referred_id = p_user_id;
1963:   get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('referrals', n);
1985: create or replace function public.delete_my_account()
2036: create or replace function public.grant_razorpay_payment(
2126:   insert into public.purchases (
2141:   update public.referrals
2146:       select 1 from public.referral_settings where id = true and qualify_on = 'first_purchase'
2171: create or replace function public.orders_guard_client_writes()
2231: create trigger orders_00_guard_client_writes
2239: create policy "Users can create own orders" on public.orders
2241:   with check (auth.uid() = user_id and status = 'created');
2244: create policy "Users can cancel own pending orders" on public.orders
2247:   with check (auth.uid() = user_id and status in ('cancelled', 'failed'));
2256: create policy "profiles_update_own" on public.profiles
2259:   with check (id = auth.uid());
2328:         when 'purchases' then (select count(*) from public.purchases)
## supabase/migrations/20260924100000_critical1_lock_settlement_functions.sql

2: -- CRITICAL 1 — no client may grant access / mark paid / insert purchases
8: --      purchases / payments / entitlements or sets an order to 'paid', and
15: --   5. guarantees the idempotency constraints exist (one payment id -> one
17: -- Nothing is deleted or rewritten: existing orders, purchases and payments are
38:         p.prosrc ~* 'insert\s+into\s+(public\.)?(purchases|payments|entitlements)\y'
39:         or p.prosrc ~* 'update\s+(public\.)?(purchases|payments|entitlements)\y'
61: -- purchases / payments: service_role (Edge Functions) and SECURITY DEFINER
63: revoke insert, update, delete, truncate on public.purchases from anon, authenticated;
77:       and tablename in ('purchases', 'payments', 'payment_sessions', 'razorpay_webhook_events')
88: alter table public.purchases enable row level security;
91: drop policy if exists "Users can view own purchases" on public.purchases;
92: create policy "Users can view own purchases" on public.purchases
94: drop policy if exists "Admins can view all purchases" on public.purchases;
95: create policy "Admins can view all purchases" on public.purchases
99: create policy "Users can view own payments" on public.payments
103: -- 3. Trigger backstop: a client role can never write purchases/payments
105: create or replace function public.block_client_writes()
123: drop trigger if exists purchases_00_block_client_writes on public.purchases;
124: create trigger purchases_00_block_client_writes
125:   before insert or update or delete on public.purchases
129: create trigger payments_00_block_client_writes
147: create unique index if not exists purchases_order_id_unique
148:   on public.purchases (order_id);
163:       and (p.prosrc ~* 'insert\s+into\s+(public\.)?(purchases|payments|entitlements)\y'
171:   if has_table_privilege('authenticated', 'public.purchases', 'insert')
173:     raise exception 'CRITICAL1 self-check: client can still INSERT purchases/payments';
## supabase/migrations/20260924110000_critical2_orders_server_only.sql

21: -- Existing orders, purchases and payments are not modified. Idempotent.
23: -- DEPLOY ORDER MATTERS: ship the `create-order` Edge Function and a mobile build
31: union all select 'purchases', count(*) from public.purchases
53: create policy "Users can view own orders" on public.orders
56: create policy "Admins can view all orders" on public.orders
68: create or replace function public.orders_immutable_columns()
90: create trigger orders_01_immutable_columns
105: create or replace function public.grant_razorpay_payment(
184:   insert into public.purchases (
199:   update public.referrals
204:       select 1 from public.referral_settings where id = true and qualify_on = 'first_purchase'
224: create or replace function public.admin_set_order_status(p_order_id text, p_status text)
277:                when 'purchases' then (select count(*) from public.purchases)
## supabase/migrations/20260924120000_critical3_storage_profiles_rls.sql

14: --      20260924100000 (purchases/payments) and 20260924110000 (orders): no
56: create policy "notes_admin_write" on storage.objects
59:   with check (bucket_id = 'notes' and public.am_i_admin());
63: create policy "public read thumbnails" on storage.objects
78: create or replace function public.profiles_before_write()
129: create trigger profiles_before_write
137: create policy "profiles_update_own" on public.profiles
140:   with check (id = auth.uid());
160:              and tablename in ('orders', 'purchases', 'payments') and cmd <> 'SELECT') then
161:     raise exception 'CRITICAL3 self-check: a write policy remains on orders/purchases/payments';
## supabase/migrations/20260924150000_free_preview.sql

16: -- Existing purchases are untouched. Idempotent: re-running does not re-flag
53: create or replace function public.user_can_access_note(p_user uuid, p_note_id text)
74:             from public.purchases p
89: create or replace function public.user_can_access_video(p_user uuid, p_video_id text)
110:             from public.purchases p
## supabase/migrations/20260925100000_phase2_referral_config_and_product_type.sql

11: --   * referral_settings: every reward number lives here and is edited from the
25: alter table public.products drop constraint if exists products_product_type_check;
27:   add constraint products_product_type_check
28:   check (product_type in ('notes', 'notes_bundle', 'video', 'other'));
31: -- 2. referral_settings: reward config
33: alter table public.referral_settings
45: alter table public.referral_settings drop constraint if exists referral_settings_phase2_ranges;
46: alter table public.referral_settings
47:   add constraint referral_settings_phase2_ranges check (
60: -- 3. referrals: which order was the friend's first paid purchase
62: alter table public.referrals
65: create unique index if not exists referrals_first_order_unique
66:   on public.referrals (first_order_id) where first_order_id is not null;
73:   if not exists (select 1 from public.referral_settings where id = true) then
74:     raise exception 'PHASE2 self-check: referral_settings row missing';
## supabase/migrations/20260925110000_phase2_wallet_ledger.sql

8: --   credit       pending                   referral reward, held until available_at
9: --   credit       available                 spendable (unless expires_at has passed)
23: create table if not exists public.wallet_ledger (
26:   entry_type        text not null check (entry_type in ('credit', 'debit', 'reversal')),
27:   status            text not null check (status in ('pending', 'available', 'cancelled')),
28:   amount            numeric(10, 2) not null check (amount > 0),
29:   source            text not null check (source in ('referral_reward', 'order_payment', 'order_refund', 'admin_adjustment')),
30:   referral_id       uuid references public.referrals(id) on delete set null,
32:   reverses_id       uuid references public.wallet_ledger(id) on delete set null,
33:   available_at      timestamptz,
34:   expires_at        timestamptz,
37:   status_changed_at timestamptz,
38:   constraint wallet_ledger_pending_needs_date check (status <> 'pending' or available_at is not null),
39:   constraint wallet_ledger_only_credits_pend check (entry_type = 'credit' or status <> 'pending')
43: --   one referral credit per friend (referrals.referred_id is already unique)
44: create unique index if not exists wallet_ledger_one_credit_per_referral
45:   on public.wallet_ledger (referral_id)
48: create unique index if not exists wallet_ledger_one_debit_per_order
49:   on public.wallet_ledger (order_id)
52: create unique index if not exists wallet_ledger_one_restore_per_order
53:   on public.wallet_ledger (order_id)
56: create unique index if not exists wallet_ledger_one_reversal_per_entry
57:   on public.wallet_ledger (reverses_id)
60: create index if not exists wallet_ledger_user_idx on public.wallet_ledger (user_id, created_at desc);
61: create index if not exists wallet_ledger_due_idx  on public.wallet_ledger (available_at) where status = 'pending';
65: --   * status pending -> available | cancelled (stamping status_changed_at), or
68: create or replace function public.wallet_ledger_append_only()
74:     raise exception 'wallet_ledger is append-only' using errcode = '42501';
82:   or new.available_at  is distinct from old.available_at
83:   or new.expires_at    is distinct from old.expires_at
89:     raise exception 'wallet_ledger rows are immutable except status' using errcode = '42501';
94:       raise exception 'wallet_ledger: illegal status change % -> %', old.status, new.status
97:     new.status_changed_at := now();
103: drop trigger if exists wallet_ledger_01_append_only on public.wallet_ledger;
104: create trigger wallet_ledger_01_append_only
105:   before update or delete on public.wallet_ledger
106:   for each row execute function public.wallet_ledger_append_only();
108: create or replace function public.wallet_ledger_no_truncate()
111:   raise exception 'wallet_ledger is append-only' using errcode = '42501';
115: drop trigger if exists wallet_ledger_02_no_truncate on public.wallet_ledger;
116: create trigger wallet_ledger_02_no_truncate
117:   before truncate on public.wallet_ledger
118:   for each statement execute function public.wallet_ledger_no_truncate();
120: drop trigger if exists wallet_ledger_00_block_client_writes on public.wallet_ledger;
121: create trigger wallet_ledger_00_block_client_writes
122:   before insert or update or delete on public.wallet_ledger
128: alter table public.wallet_ledger enable row level security;
130: drop policy if exists "wallet_ledger_select_own" on public.wallet_ledger;
131: create policy "wallet_ledger_select_own" on public.wallet_ledger
133: drop policy if exists "wallet_ledger_select_admin" on public.wallet_ledger;
134: create policy "wallet_ledger_select_admin" on public.wallet_ledger
137: revoke all on public.wallet_ledger from public, anon, authenticated;
138: grant select on public.wallet_ledger to authenticated;
139: grant all on public.wallet_ledger to service_role;
145: create or replace function public.release_due_wallet_credits(p_user uuid default null)
159:     update public.wallet_ledger
163:        and available_at <= now()
169:   update public.referrals r
173:        select 1 from public.wallet_ledger l
190: create or replace function public.wallet_balance_of(p_user uuid)
191: returns table (available numeric, pending numeric, total_earned numeric, next_available_at timestamptz)
200:                                      and (expires_at is null or expires_at > now())), 0)
206:     min(available_at) filter (where entry_type = 'credit' and status = 'pending') as next_available_at
207:   from public.wallet_ledger
215: create or replace function public.get_my_wallet()
216: returns table (available numeric, pending numeric, total_earned numeric, next_available_at timestamptz)
235: -- get_my_referrals() is left untouched for released builds.)
237: create or replace function public.get_my_referral_list()
244:   available_at timestamptz
265:       when l.status = 'available' or l.available_at <= now() then 'credited'
269:     case when l.status = 'pending' then l.available_at end as available_at
270:   from public.referrals r
272:   left join public.wallet_ledger l
274:   left join public.wallet_ledger rev
288: create or replace function public.admin_reverse_wallet_credit(p_ledger_id uuid, p_note text)
295:   v_row public.wallet_ledger%rowtype;
300:   select * into v_row from public.wallet_ledger where id = p_ledger_id for update;
305:   insert into public.wallet_ledger (user_id, entry_type, status, amount, source, reverses_id, referral_id, note)
318: -- referrals.status fresh for the admin panel. Skipped quietly if pg_cron is not
338:   if has_table_privilege('authenticated', 'public.wallet_ledger', 'insert')
339:      or has_table_privilege('authenticated', 'public.wallet_ledger', 'update')
340:      or has_table_privilege('authenticated', 'public.wallet_ledger', 'delete')
341:      or has_table_privilege('anon', 'public.wallet_ledger', 'select') then
342:     raise exception 'PHASE2 self-check: wallet_ledger privileges too wide';
## supabase/migrations/20260925120000_phase2_orders_pricing_and_settlement.sql

7: -- purchases, payments or the ledger. The client never sends an amount; every
8: -- number below is computed here from `products`, `referral_settings` and the
15: --   referral_discount friend's first-purchase discount
16: --   wallet_amount     wallet credit applied
17: --   amount            = list_price - referral_discount - wallet_amount
27:   add column if not exists referral_discount numeric(10, 2) not null default 0,
28:   add column if not exists wallet_amount     numeric(10, 2) not null default 0,
29:   add column if not exists referral_id       uuid references public.referrals(id) on delete set null,
30:   add column if not exists expires_at        timestamptz;   -- NULL on legacy orders = never expires
32: alter table public.orders drop constraint if exists orders_phase2_amounts;
33: alter table public.orders add constraint orders_phase2_amounts check (
34:   referral_discount >= 0 and wallet_amount >= 0
35:   and (list_price is null or list_price - referral_discount - wallet_amount = amount)
41: create or replace function public.orders_immutable_columns()
59:      or new.referral_discount is distinct from old.referral_discount
60:      or new.wallet_amount is distinct from old.wallet_amount then
66:   if new.expires_at is distinct from old.expires_at then
67:     raise exception 'orders.expires_at is immutable' using errcode = '42501';
76: -- Called by the create-order Edge Function (service_role). Returns
77: --   {ok:true, order_id, list_price, referral_discount, wallet_amount, amount, title}
82: -- created, and the new order expires after referral_settings.checkout_expiry_minutes
84: create or replace function public.create_priced_order(
95:   v_set      public.referral_settings%rowtype;
97:   v_ref      public.referrals%rowtype;
118:   select * into v_set from public.referral_settings where id = true;
123:       from public.referrals r
128:        and not exists (select 1 from public.purchases pu
165:     amount, list_price, referral_discount, wallet_amount, referral_id, status, expires_at
176:     'list_price', v_price, 'referral_discount', v_discount,
177:     'wallet_amount', v_wallet, 'amount', v_final,
188: create or replace function public.quote_my_order(p_product_id text, p_use_wallet boolean default false)
196:   v_set      public.referral_settings%rowtype;
209:   select * into v_set from public.referral_settings where id = true;
212:      and exists (select 1 from public.referrals r
215:      and not exists (select 1 from public.purchases pu where pu.user_id = v_uid and pu.status = 'success') then
230:     'ok', true, 'list_price', v_price, 'referral_discount', v_discount,
233:     'wallet_amount', v_wallet, 'amount', v_price - v_discount - v_wallet
249:   reason            text not null check (reason in ('stale_order_paid')),
250:   wallet_amount     numeric(10, 2) not null default 0,
251:   referral_discount numeric(10, 2) not null default 0,
263: create policy "order_review_flags_admin_select" on public.order_review_flags
270: create trigger order_review_flags_00_block_client_writes
274: create or replace function public.admin_resolve_order_flag(p_flag_id uuid, p_note text)
303: --     or the payment was initiated after orders.expires_at, the wallet is NOT
311: create or replace function public.settle_razorpay_payment(
328:   v_set public.referral_settings%rowtype;
329:   v_ref public.referrals%rowtype;
400:   insert into public.purchases (
420:           or (v_order.status = 'created' and v_order.expires_at is not null
421:               and coalesce(p_paid_at, now()) > v_order.expires_at);
423:   if v_stale and (v_order.wallet_amount > 0 or v_order.referral_discount > 0) then
424:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
425:     values (v_order.id, v_order.user_id, 'stale_order_paid', v_order.wallet_amount, v_order.referral_discount,
426:             jsonb_build_object('order_status', v_order.status, 'expires_at', v_order.expires_at,
434:   if v_order.wallet_amount > 0 and not v_stale then
437:     -- Normally balance >= wallet_amount (create_priced_order checked it under
439:     v_debit := least(v_order.wallet_amount, coalesce(v_balance, 0));
440:     if v_debit < v_order.wallet_amount
441:        and not exists (select 1 from public.wallet_ledger
444:         v_order.id, v_order.wallet_amount, v_balance;
447:       insert into public.wallet_ledger (user_id, entry_type, status, amount, source, order_id, note)
455:   select * into v_ref from public.referrals where referred_id = v_order.user_id for update;
457:      and not exists (select 1 from public.purchases
459:     update public.referrals
463:     select * into v_set from public.referral_settings where id = true;
466:       insert into public.wallet_ledger (
468:         available_at, expires_at, note
491: create or replace function public.grant_razorpay_payment(
522: create or replace function public.handle_payment_refund(p_razorpay_payment_id text, p_full_refund boolean)
530:   v_credit public.wallet_ledger%rowtype;
531:   v_debit public.wallet_ledger%rowtype;
544:   select * into v_debit from public.wallet_ledger
548:     insert into public.wallet_ledger (user_id, entry_type, status, amount, source, order_id, note)
559:     from public.referrals r
560:     join public.wallet_ledger l on l.referral_id = r.id and l.entry_type = 'credit' and l.source = 'referral_reward'
568:   elsif v_credit.status = 'pending' and v_credit.available_at > now() then
570:     update public.wallet_ledger set status = 'cancelled' where id = v_credit.id;
572:     update public.referrals
592: -- Differences: the window comes from referral_settings.apply_window_days
595: create or replace function public.apply_referral_code(p_code text)
603:   v_settings public.referral_settings%rowtype;
615:   select * into v_settings from public.referral_settings where id = true;
617:     return jsonb_build_object('status', 'disabled', 'message', 'Referrals are not available right now.');
635:   if exists (select 1 from public.referrals where referred_id = v_uid) then
641:   if exists (select 1 from public.purchases where user_id = v_uid and status = 'success')
646:   if v_settings.max_referrals_per_user is not null then
647:     select count(*) into v_referral_count from public.referrals where referrer_id = v_referrer.id;
648:     if v_referral_count >= v_settings.max_referrals_per_user then
653:   insert into public.referrals (referrer_id, referred_id, code_used, status)
670: create or replace function public.admin_reject_referral(p_referral_id uuid, p_reason text)
677:   v_credit public.wallet_ledger%rowtype;
683:   update public.referrals
689:   select * into v_credit from public.wallet_ledger
693:     update public.wallet_ledger set status = 'cancelled' where id = v_credit.id;
## supabase/migrations/20260925140000_phase2_single_use_friend_discount.sql

8: -- referral (referrals.discount_order_id); a second discounted order is recorded
13: alter table public.referrals
16: alter table public.order_review_flags drop constraint if exists order_review_flags_reason_check;
18:   add constraint order_review_flags_reason_check
19:   check (reason in ('stale_order_paid', 'discount_reused'));
21: create or replace function public.settle_razorpay_payment(
38:   v_set public.referral_settings%rowtype;
39:   v_ref public.referrals%rowtype;
107:   -- to settle claims referrals.discount_order_id; any other discounted order is
112:   if v_order.referral_discount > 0 and v_order.referral_id is not null then
113:     update public.referrals set discount_order_id = v_order.id
115:     select discount_order_id into v_discount_owner from public.referrals where id = v_order.referral_id;
127:   insert into public.purchases (
147:           or (v_order.status = 'created' and v_order.expires_at is not null
148:               and coalesce(p_paid_at, now()) > v_order.expires_at);
150:   if v_stale and (v_order.wallet_amount > 0 or v_order.referral_discount > 0) then
151:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
152:     values (v_order.id, v_order.user_id, 'stale_order_paid', v_order.wallet_amount, v_order.referral_discount,
153:             jsonb_build_object('order_status', v_order.status, 'expires_at', v_order.expires_at,
162:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
163:     values (v_order.id, v_order.user_id, 'discount_reused', v_order.wallet_amount, v_order.referral_discount,
172:   if v_order.wallet_amount > 0 and not v_stale and not v_discount_dup then
175:     -- Normally balance >= wallet_amount (create_priced_order checked it under
177:     v_debit := least(v_order.wallet_amount, coalesce(v_balance, 0));
178:     if v_debit < v_order.wallet_amount
179:        and not exists (select 1 from public.wallet_ledger
182:         v_order.id, v_order.wallet_amount, v_balance;
185:       insert into public.wallet_ledger (user_id, entry_type, status, amount, source, order_id, note)
193:   select * into v_ref from public.referrals where referred_id = v_order.user_id for update;
195:      and not exists (select 1 from public.purchases
197:     update public.referrals
201:     select * into v_set from public.referral_settings where id = true;
204:       insert into public.wallet_ledger (
206:         available_at, expires_at, note
## supabase/migrations/20260926100000_batch1_refund_dispute_revoke_access.sql

6: --   * marked the order 'refunded' but left purchases.status = 'success', so the
8: --   * found the referrer's credit through referrals.first_order_id, so a friend
9: --     who had deleted their account (referrals row gone) left the credit alive;
10: --   * only cancelled a credit with status 'pending' AND available_at > now(), so
16: --   * purchases.status leaves 'success' on a FULL refund (-> 'refunded') and on a
21: --   * the credit is found through wallet_ledger.order_id (survives the friend's
22: --     account deletion), a pending credit is cancelled whatever its available_at,
29: -- ---- 1. purchases.status: a real, closed vocabulary -------------------------
31: update public.purchases set status = 'success' where status is null;   -- no-op on live; keeps the migration re-runnable on other copies
32: alter table public.purchases alter column status set default 'success';
33: alter table public.purchases alter column status set not null;
34: alter table public.purchases drop constraint if exists purchases_status_check;
35: alter table public.purchases add constraint purchases_status_check
36:   check (status in ('success', 'refunded', 'disputed', 'chargeback', 'duplicate'));
38: comment on column public.purchases.status is
42: alter table public.order_review_flags drop constraint if exists order_review_flags_reason_check;
43: alter table public.order_review_flags add constraint order_review_flags_reason_check
44:   check (reason in ('stale_order_paid', 'discount_reused', 'referral_credit_unrecovered'));
47: create or replace function public.reverse_payment(
60:   v_credit public.wallet_ledger%rowtype;
61:   v_debit public.wallet_ledger%rowtype;
87:   update public.purchases set status = p_purchase_status
93:     select * into v_debit from public.wallet_ledger
97:       insert into public.wallet_ledger (user_id, entry_type, status, amount, source, order_id, note)
108:   -- Looked up by the ledger row's own order_id, NOT through referrals: the
109:   -- referrals row is deleted when the friend deletes their account.
110:   select * into v_credit from public.wallet_ledger
124:     update public.wallet_ledger set status = 'cancelled' where id = v_credit.id;
126:     update public.referrals
131:   elsif exists (select 1 from public.wallet_ledger
138:   elsif v_credit.expires_at is not null and v_credit.expires_at <= now() then
150:       insert into public.wallet_ledger (user_id, entry_type, status, amount, source, reverses_id, referral_id, order_id, note)
156:     update public.referrals
160:       insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
177:   return v_status || jsonb_build_object('wallet_restored', v_restored, 'purchases_revoked', v_revoked);
185: create or replace function public.handle_payment_refund(p_razorpay_payment_id text, p_full_refund boolean)
210: create or replace function public.handle_payment_dispute(p_razorpay_payment_id text, p_outcome text)
238:     update public.purchases set status = 'disputed' where order_id = v_order.id and status = 'success';
241:                               'purchases_suspended', v_n);
246:   update public.purchases pu
247:      set status = case when exists (select 1 from public.purchases o
254:                             'purchases_restored', v_n);
262: create or replace function public.release_due_wallet_credits(p_user uuid default null)
276:     update public.wallet_ledger l
280:        and l.available_at <= now()
283:        and not exists (select 1 from public.purchases pu
289:   update public.referrals r
293:        select 1 from public.wallet_ledger l
## supabase/migrations/20260926110000_batch1_settle_wallet_and_flags.sql

25: --    on purchases (next migration) from ever failing a settlement.
31: alter table public.order_review_flags drop constraint if exists order_review_flags_reason_check;
32: alter table public.order_review_flags add constraint order_review_flags_reason_check
33:   check (reason in ('stale_order_paid', 'discount_reused', 'referral_credit_unrecovered',
36: create or replace function public.settle_razorpay_payment(
53:   v_set public.referral_settings%rowtype;
54:   v_ref public.referrals%rowtype;
126:   -- The first discounted order to settle claims referrals.discount_order_id; any
131:   if v_order.referral_discount > 0 and v_order.referral_id is not null then
132:     update public.referrals set discount_order_id = v_order.id
134:     select discount_order_id into v_discount_owner from public.referrals where id = v_order.referral_id;
147:   select id into v_owned_purchase from public.purchases
152:   insert into public.purchases (
174:           or (v_order.status = 'created' and v_order.expires_at is not null
175:               and coalesce(p_paid_at, now()) > v_order.expires_at);
178:   if v_first and v_order.wallet_amount > 0
179:      and not exists (select 1 from public.wallet_ledger
183:     v_debit := least(v_order.wallet_amount, coalesce(v_balance, 0));
185:       insert into public.wallet_ledger (user_id, entry_type, status, amount, source, order_id, note)
201:   if v_first and v_order.wallet_amount > 0 and v_debit < v_order.wallet_amount then
202:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
203:     values (v_order.id, v_order.user_id, 'wallet_shortfall', v_order.wallet_amount, v_order.referral_discount,
205:               'wallet_amount_applied', v_order.wallet_amount,
207:               'shortfall', v_order.wallet_amount - v_debit,
211:                        v_order.wallet_amount, v_debit, v_order.wallet_amount - v_debit, p_razorpay_payment_id)))
214:       v_order.id, v_order.wallet_amount, v_debit;
217:   if v_stale and (v_order.wallet_amount > 0 or v_order.referral_discount > 0) then
218:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
219:     values (v_order.id, v_order.user_id, 'stale_order_paid', v_order.wallet_amount, v_order.referral_discount,
221:               'order_status', v_order.status, 'expires_at', v_order.expires_at, 'paid_at', p_paid_at,
222:               'wallet_debited', (select coalesce(sum(amount), 0) from public.wallet_ledger
233:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
234:     values (v_order.id, v_order.user_id, 'discount_reused', v_order.wallet_amount, v_order.referral_discount,
237:               'discount_not_owed', v_order.referral_discount,
243:                        v_discount_owner, v_order.referral_discount, v_order.amount,
244:                        v_order.amount + v_order.referral_discount, p_razorpay_payment_id)))
251:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
252:     values (v_order.id, v_order.user_id, 'duplicate_purchase', v_order.wallet_amount, v_order.referral_discount,
265:   select * into v_ref from public.referrals where referred_id = v_order.user_id for update;
268:      and not exists (select 1 from public.purchases
270:     update public.referrals
274:     select * into v_set from public.referral_settings where id = true;
277:       insert into public.wallet_ledger (
279:         available_at, expires_at, note
## supabase/migrations/20260926120000_batch1_block_owned_product.sql

6: --  * a partial UNIQUE index makes it impossible to hold two successful purchases
12: -- already has two successful purchases - an ADMIN account testing the Rs 1
19: --   drop index purchases_one_success_per_product;
20: --   create unique index purchases_one_success_per_product
21: --     on public.purchases (user_id, product_id) where status = 'success';
24: CREATE OR REPLACE FUNCTION public.create_priced_order(p_user_id uuid, p_product_id text, p_use_wallet boolean DEFAULT false)
31:   v_set      public.referral_settings%rowtype;
33:   v_ref      public.referrals%rowtype;
55:   if exists (select 1 from public.purchases
60:   select * into v_set from public.referral_settings where id = true;
65:       from public.referrals r
70:        and not exists (select 1 from public.purchases pu
107:     amount, list_price, referral_discount, wallet_amount, referral_id, status, expires_at
118:     'list_price', v_price, 'referral_discount', v_discount,
119:     'wallet_amount', v_wallet, 'amount', v_final,
125: CREATE OR REPLACE FUNCTION public.quote_my_order(p_product_id text, p_use_wallet boolean DEFAULT false)
133:   v_set      public.referral_settings%rowtype;
145:   if exists (select 1 from public.purchases
150:   select * into v_set from public.referral_settings where id = true;
153:      and exists (select 1 from public.referrals r
156:      and not exists (select 1 from public.purchases pu where pu.user_id = v_uid and pu.status = 'success') then
171:     'ok', true, 'list_price', v_price, 'referral_discount', v_discount,
174:     'wallet_amount', v_wallet, 'amount', v_price - v_discount - v_wallet
185: -- purchases.product_id is nullable on legacy rows; NULLs are distinct, so they never collide.
186: create unique index if not exists purchases_one_success_per_product
187:   on public.purchases (user_id, product_id)
## supabase/migrations/20260926130000_batch1_hygiene.sql

8: create or replace function pg_temp.try_validate(p_table regclass, p_constraint text) returns void
11:   execute format('alter table %s validate constraint %I', p_table, p_constraint);
13:   raise notice 'HYGIENE: % on % left NOT VALID (existing rows break it): %', p_constraint, p_table, sqlerrm;
19: create policy analytics_insert_own_or_anon on public.analytics_events
21:   with check (user_id is null or user_id = auth.uid());
23: alter table public.analytics_events drop constraint if exists analytics_events_name_len;
24: alter table public.analytics_events add constraint analytics_events_name_len
25:   check (char_length(name) between 1 and 64) not valid;
26: alter table public.analytics_events drop constraint if exists analytics_events_params_size;
27: alter table public.analytics_events add constraint analytics_events_params_size
28:   check (octet_length(params::text) <= 4096) not valid;
33: create or replace function public.profiles_before_write()
88: create or replace function public.sync_profile_email()
106: create trigger on_auth_user_email_changed
114: alter table public.quiz_scores drop constraint if exists quiz_scores_sane;
115: alter table public.quiz_scores add constraint quiz_scores_sane
116:   check (total > 0 and score >= 0 and score <= total and percentage between 0 and 100) not valid;
119: create or replace function public.quiz_scores_own_email()
135: create trigger quiz_scores_own_email
141: alter table public.orders drop constraint if exists orders_amount_positive;
142: alter table public.orders add constraint orders_amount_positive check (amount > 0) not valid;
149: alter table public.payments drop constraint if exists payments_order_id_fkey;
150: alter table public.payments add constraint payments_order_id_fkey
154: -- (d) referrals.first_order_id now points at a real order
155: alter table public.referrals drop constraint if exists referrals_first_order_id_fkey;
156: alter table public.referrals add constraint referrals_first_order_id_fkey
158: select pg_temp.try_validate('public.referrals', 'referrals_first_order_id_fkey');
161: -- constraint (payments_razorpay_payment_id_key), drop the redundant plain index.
162: -- ON CONFLICT (razorpay_payment_id) keeps working against the constraint.
166: create or replace function public.wallet_ledger_no_overdraw()
181:                                         and (expires_at is null or expires_at > now())), 0)
184:     from public.wallet_ledger where user_id = new.user_id;
186:     raise exception 'wallet_ledger: a % of % would overdraw the wallet (available %)', new.entry_type, new.amount, v_bal
192: revoke all on function public.wallet_ledger_no_overdraw() from public, anon, authenticated;
194: drop trigger if exists wallet_ledger_03_no_overdraw on public.wallet_ledger;
195: create trigger wallet_ledger_03_no_overdraw
196:   before insert on public.wallet_ledger
197:   for each row execute function public.wallet_ledger_no_overdraw();
201: create or replace function public.admin_reverse_wallet_credit(p_ledger_id uuid, p_note text)
208:   v_row public.wallet_ledger%rowtype;
215:   select * into v_row from public.wallet_ledger where id = p_ledger_id for update;
222:   if v_row.expires_at is not null and v_row.expires_at <= now() then
225:   if exists (select 1 from public.wallet_ledger where entry_type = 'reversal' and reverses_id = v_row.id) then
237:   insert into public.wallet_ledger (user_id, entry_type, status, amount, source, reverses_id, referral_id, note)
## supabase/migrations/20260927100000_f7_drop_legacy_admin_policies.sql

19: create policy app_settings_admin_update on public.app_settings
20:   for update using (public.am_i_admin()) with check (public.am_i_admin());
31: drop policy if exists "user read own purchases"         on public.purchases;
## supabase/migrations/20260927120000_batch3_referral_hardening.sql

8: --     referral_settings.require_verified_phone is the switch. It DEFAULTS TO FALSE
12: --     (update referral_settings set require_verified_phone = true) once a server-side
16: -- F11 the referrals table is no longer readable by students (it exposed the other
18: --     RPCs; the admin panel reads it as an admin. get_my_referrals() (kept for
23: --       same instant can no longer both pass), and counts only referrals that were
31: create or replace function pg_temp.try_validate(p_table regclass, p_constraint text) returns void
34:   execute format('alter table %s validate constraint %I', p_table, p_constraint);
36:   raise notice 'BATCH3: % on % left NOT VALID (existing rows break it): %', p_constraint, p_table, sqlerrm;
40: alter table public.referral_settings
44: create or replace function public.apply_referral_code(p_code text)
52:   v_settings public.referral_settings%rowtype;
71:   select * into v_settings from public.referral_settings where id = true;
73:     return jsonb_build_object('status', 'disabled', 'message', 'Referrals are not available right now.');
98:   if exists (select 1 from public.referrals where referred_id = v_uid) then
104:   if exists (select 1 from public.purchases where user_id = v_uid and status = 'success')
109:   if v_settings.max_referrals_per_user is not null then
112:     select count(*) into v_referral_count from public.referrals
114:     if v_referral_count >= v_settings.max_referrals_per_user then
119:   insert into public.referrals (referrer_id, referred_id, code_used, status)
133: create or replace function public.generate_unique_referral_code(p_length integer default 7)
168: alter table public.profiles drop constraint if exists profiles_referral_code_upper;
169: alter table public.profiles add constraint profiles_referral_code_upper
170:   check (referral_code = upper(referral_code)) not valid;
173: -- ---- F11: the referrals table is not a student-facing API ------------------------
174: drop policy if exists referrals_read_own on public.referrals;
175: -- (referrals_admin_write, FOR ALL am_i_admin(), still gives admins read and write)
178: create or replace function public.get_my_referrals()
198:   from public.referrals r
203: revoke all on function public.get_my_referrals() from public, anon;
204: grant execute on function public.get_my_referrals() to authenticated;
207: create or replace function public.settle_razorpay_payment(
224:   v_set public.referral_settings%rowtype;
225:   v_ref public.referrals%rowtype;
297:   -- The first discounted order to settle claims referrals.discount_order_id; any
302:   if v_order.referral_discount > 0 and v_order.referral_id is not null then
303:     update public.referrals set discount_order_id = v_order.id
305:     select discount_order_id into v_discount_owner from public.referrals where id = v_order.referral_id;
318:   select id into v_owned_purchase from public.purchases
323:   insert into public.purchases (
345:           or (v_order.status = 'created' and v_order.expires_at is not null
346:               and coalesce(p_paid_at, now()) > v_order.expires_at);
349:   if v_first and v_order.wallet_amount > 0
350:      and not exists (select 1 from public.wallet_ledger
354:     v_debit := least(v_order.wallet_amount, coalesce(v_balance, 0));
356:       insert into public.wallet_ledger (user_id, entry_type, status, amount, source, order_id, note)
372:   if v_first and v_order.wallet_amount > 0 and v_debit < v_order.wallet_amount then
373:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
374:     values (v_order.id, v_order.user_id, 'wallet_shortfall', v_order.wallet_amount, v_order.referral_discount,
376:               'wallet_amount_applied', v_order.wallet_amount,
378:               'shortfall', v_order.wallet_amount - v_debit,
382:                        v_order.wallet_amount, v_debit, v_order.wallet_amount - v_debit, p_razorpay_payment_id)))
385:       v_order.id, v_order.wallet_amount, v_debit;
388:   if v_stale and (v_order.wallet_amount > 0 or v_order.referral_discount > 0) then
389:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
390:     values (v_order.id, v_order.user_id, 'stale_order_paid', v_order.wallet_amount, v_order.referral_discount,
392:               'order_status', v_order.status, 'expires_at', v_order.expires_at, 'paid_at', p_paid_at,
393:               'wallet_debited', (select coalesce(sum(amount), 0) from public.wallet_ledger
404:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
405:     values (v_order.id, v_order.user_id, 'discount_reused', v_order.wallet_amount, v_order.referral_discount,
408:               'discount_not_owed', v_order.referral_discount,
414:                        v_discount_owner, v_order.referral_discount, v_order.amount,
415:                        v_order.amount + v_order.referral_discount, p_razorpay_payment_id)))
422:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
423:     values (v_order.id, v_order.user_id, 'duplicate_purchase', v_order.wallet_amount, v_order.referral_discount,
436:   select * into v_ref from public.referrals where referred_id = v_order.user_id for update;
439:      and not exists (select 1 from public.purchases
441:     select * into v_set from public.referral_settings where id = true;
449:       update public.referrals
455:       update public.referrals
462:       insert into public.wallet_ledger (
464:         available_at, expires_at, note
## supabase/migrations/20260927130000_batch3b_antifarming.sql

6: --    Deleting an account deletes the profile and the purchases, so a fresh signup used
9: --    HASH of the buyer's normalised email and phone in first_purchase_identities, a
24: --        its row in first_purchase_identities.
44: alter table public.order_review_flags drop constraint if exists order_review_flags_reason_check;
45: alter table public.order_review_flags add constraint order_review_flags_reason_check
46:   check (reason in ('stale_order_paid', 'discount_reused', 'referral_credit_unrecovered',
50: create table if not exists public.first_purchase_identities (
52:   kind text not null check (kind in ('email', 'phone')),
56: alter table public.first_purchase_identities enable row level security;
57: revoke all on public.first_purchase_identities from public, anon, authenticated;
58: grant all on public.first_purchase_identities to service_role;
60: create or replace function public.identity_hash(p_kind text, p_value text)
96: create or replace function public.record_purchase_identity(p_uid uuid)
102:   insert into public.first_purchase_identities (identity_hash, kind, account_id)
113: create or replace function public.has_prior_purchase_identity(p_uid uuid)
123:       join public.first_purchase_identities i
131: -- existing buyers (deleted accounts' purchases are already gone; nothing to recover for them)
132: insert into public.first_purchase_identities (identity_hash, kind, account_id, first_purchase_at)
134:   from (select user_id, min(created_at) as first_at from public.purchases
143: create or replace function public.accounts_share_network(p_a uuid, p_b uuid)
162: CREATE OR REPLACE FUNCTION public.create_priced_order(p_user_id uuid, p_product_id text, p_use_wallet boolean DEFAULT false)
169:   v_set      public.referral_settings%rowtype;
171:   v_ref      public.referrals%rowtype;
193:   if exists (select 1 from public.purchases
198:   select * into v_set from public.referral_settings where id = true;
203:       from public.referrals r
208:        and not exists (select 1 from public.purchases pu
247:     amount, list_price, referral_discount, wallet_amount, referral_id, status, expires_at
258:     'list_price', v_price, 'referral_discount', v_discount,
259:     'wallet_amount', v_wallet, 'amount', v_final,
265: CREATE OR REPLACE FUNCTION public.quote_my_order(p_product_id text, p_use_wallet boolean DEFAULT false)
273:   v_set      public.referral_settings%rowtype;
285:   if exists (select 1 from public.purchases
290:   select * into v_set from public.referral_settings where id = true;
293:      and exists (select 1 from public.referrals r
296:      and not exists (select 1 from public.purchases pu where pu.user_id = v_uid and pu.status = 'success')
312:     'ok', true, 'list_price', v_price, 'referral_discount', v_discount,
315:     'wallet_amount', v_wallet, 'amount', v_price - v_discount - v_wallet
320: create or replace function public.apply_referral_code(p_code text)
328:   v_settings public.referral_settings%rowtype;
347:   select * into v_settings from public.referral_settings where id = true;
349:     return jsonb_build_object('status', 'disabled', 'message', 'Referrals are not available right now.');
374:   if exists (select 1 from public.referrals where referred_id = v_uid) then
380:   if exists (select 1 from public.purchases where user_id = v_uid and status = 'success')
390:   if v_settings.max_referrals_per_user is not null then
393:     select count(*) into v_referral_count from public.referrals
395:     if v_referral_count >= v_settings.max_referrals_per_user then
400:   insert into public.referrals (referrer_id, referred_id, code_used, status)
410: create or replace function public.settle_razorpay_payment(
427:   v_set public.referral_settings%rowtype;
428:   v_ref public.referrals%rowtype;
500:   -- The first discounted order to settle claims referrals.discount_order_id; any
505:   if v_order.referral_discount > 0 and v_order.referral_id is not null then
506:     update public.referrals set discount_order_id = v_order.id
508:     select discount_order_id into v_discount_owner from public.referrals where id = v_order.referral_id;
521:   select id into v_owned_purchase from public.purchases
526:   insert into public.purchases (
554:           or (v_order.status = 'created' and v_order.expires_at is not null
555:               and coalesce(p_paid_at, now()) > v_order.expires_at);
558:   if v_first and v_order.wallet_amount > 0
559:      and not exists (select 1 from public.wallet_ledger
563:     v_debit := least(v_order.wallet_amount, coalesce(v_balance, 0));
565:       insert into public.wallet_ledger (user_id, entry_type, status, amount, source, order_id, note)
581:   if v_first and v_order.wallet_amount > 0 and v_debit < v_order.wallet_amount then
582:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
583:     values (v_order.id, v_order.user_id, 'wallet_shortfall', v_order.wallet_amount, v_order.referral_discount,
585:               'wallet_amount_applied', v_order.wallet_amount,
587:               'shortfall', v_order.wallet_amount - v_debit,
591:                        v_order.wallet_amount, v_debit, v_order.wallet_amount - v_debit, p_razorpay_payment_id)))
594:       v_order.id, v_order.wallet_amount, v_debit;
597:   if v_stale and (v_order.wallet_amount > 0 or v_order.referral_discount > 0) then
598:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
599:     values (v_order.id, v_order.user_id, 'stale_order_paid', v_order.wallet_amount, v_order.referral_discount,
601:               'order_status', v_order.status, 'expires_at', v_order.expires_at, 'paid_at', p_paid_at,
602:               'wallet_debited', (select coalesce(sum(amount), 0) from public.wallet_ledger
613:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
614:     values (v_order.id, v_order.user_id, 'discount_reused', v_order.wallet_amount, v_order.referral_discount,
617:               'discount_not_owed', v_order.referral_discount,
623:                        v_discount_owner, v_order.referral_discount, v_order.amount,
624:                        v_order.amount + v_order.referral_discount, p_razorpay_payment_id)))
631:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
632:     values (v_order.id, v_order.user_id, 'duplicate_purchase', v_order.wallet_amount, v_order.referral_discount,
645:   select * into v_ref from public.referrals where referred_id = v_order.user_id for update;
648:      and not exists (select 1 from public.purchases
650:     select * into v_set from public.referral_settings where id = true;
658:       update public.referrals
665:       update public.referrals
671:       update public.referrals
678:       insert into public.wallet_ledger (
680:         available_at, expires_at, note
698: create or replace function public.release_due_wallet_credits(p_user uuid default null)
716:   insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
724:     from public.wallet_ledger l
727:      and l.available_at <= now() and l.user_id is not null and o.user_id is not null
733:     update public.wallet_ledger l
737:        and l.available_at <= now()
740:        and not exists (select 1 from public.purchases pu
749:   update public.referrals r
753:        select 1 from public.wallet_ledger l
## supabase/migrations/20260928100000_referral_settings_limits_and_audit.sql

4: --   1. One named CHECK constraint per admin-editable number, so the server
10: --        max_referrals_per_user   blank or 1-1000
11: --      The Phase 2 catch-all constraint is replaced: its ranges for these
13: --      minutes, product types) move to referral_settings_other_ranges.
17: --   2. referral_settings_audit: one row per change (who, when, old and new
27: alter table public.referral_settings drop constraint if exists referral_settings_phase2_ranges;
29: alter table public.referral_settings drop constraint if exists referral_settings_other_ranges;
30: alter table public.referral_settings
31:   add constraint referral_settings_other_ranges check (
37: alter table public.referral_settings drop constraint if exists referral_settings_friend_discount_percent_range;
38: alter table public.referral_settings
39:   add constraint referral_settings_friend_discount_percent_range
40:   check (friend_discount_percent between 0 and 50);
42: alter table public.referral_settings drop constraint if exists referral_settings_friend_discount_max_range;
43: alter table public.referral_settings
44:   add constraint referral_settings_friend_discount_max_range
45:   check (friend_discount_max is null or friend_discount_max between 1 and 10000);
47: alter table public.referral_settings drop constraint if exists referral_settings_referrer_credit_amount_range;
48: alter table public.referral_settings
49:   add constraint referral_settings_referrer_credit_amount_range
50:   check (referrer_credit_amount between 0 and 10000);
52: alter table public.referral_settings drop constraint if exists referral_settings_credit_hold_days_range;
53: alter table public.referral_settings
54:   add constraint referral_settings_credit_hold_days_range
55:   check (credit_hold_days between 0 and 90);
57: alter table public.referral_settings drop constraint if exists referral_settings_wallet_max_percent_range;
58: alter table public.referral_settings
59:   add constraint referral_settings_wallet_max_percent_range
60:   check (wallet_max_percent between 1 and 100);
62: alter table public.referral_settings drop constraint if exists referral_settings_apply_window_days_range;
63: alter table public.referral_settings
64:   add constraint referral_settings_apply_window_days_range
65:   check (apply_window_days between 1 and 30);
67: alter table public.referral_settings drop constraint if exists referral_settings_max_referrals_per_user_range;
68: alter table public.referral_settings
69:   add constraint referral_settings_max_referrals_per_user_range
70:   check (max_referrals_per_user is null or max_referrals_per_user between 1 and 1000);
75: create table if not exists public.referral_settings_audit (
84: create index if not exists referral_settings_audit_changed_at_idx
85:   on public.referral_settings_audit (changed_at desc);
87: alter table public.referral_settings_audit enable row level security;
89: drop policy if exists "referral_settings_audit_admin_read" on public.referral_settings_audit;
90: create policy "referral_settings_audit_admin_read"
91:   on public.referral_settings_audit for select to authenticated
95: revoke all on public.referral_settings_audit from public, anon, authenticated;
96: grant select on public.referral_settings_audit to authenticated;
97: grant all on public.referral_settings_audit to service_role;
99: create or replace function public.log_referral_settings_change()
123:   insert into public.referral_settings_audit (changed_by, changed_by_email, old_values, new_values)
129: revoke all on function public.log_referral_settings_change() from public, anon, authenticated;
131: drop trigger if exists referral_settings_audit_trg on public.referral_settings;
132: create trigger referral_settings_audit_trg
133:   after update on public.referral_settings
134:   for each row execute function public.log_referral_settings_change();
141:   if (select count(*) from pg_constraint
142:        where conrelid = 'public.referral_settings'::regclass
144:     raise exception 'REFERRAL LIMITS self-check: expected 7 range constraints';
146:   if has_table_privilege('authenticated', 'public.referral_settings_audit', 'INSERT')
147:      or has_table_privilege('authenticated', 'public.referral_settings_audit', 'UPDATE')
148:      or has_table_privilege('authenticated', 'public.referral_settings_audit', 'DELETE')
149:      or has_table_privilege('anon', 'public.referral_settings_audit', 'SELECT') then
## supabase/migrations/20260928110000_referral_off_blocks_wallet.sql

4: -- When referral_settings.enabled = false, quote_my_order() and
7: -- false and wallet_amount = 0, and the order is created with wallet_amount = 0.
27: CREATE OR REPLACE FUNCTION public.create_priced_order(p_user_id uuid, p_product_id text, p_use_wallet boolean DEFAULT false)
34:   v_set      public.referral_settings%rowtype;
36:   v_ref      public.referrals%rowtype;
58:   if exists (select 1 from public.purchases
63:   select * into v_set from public.referral_settings where id = true;
68:       from public.referrals r
73:        and not exists (select 1 from public.purchases pu
88:   -- Wallet: eligible product types only (referral_settings), capped at wallet_max_percent of what is left
113:     amount, list_price, referral_discount, wallet_amount, referral_id, status, expires_at
124:     'list_price', v_price, 'referral_discount', v_discount,
125:     'wallet_amount', v_wallet, 'amount', v_final,
131: CREATE OR REPLACE FUNCTION public.quote_my_order(p_product_id text, p_use_wallet boolean DEFAULT false)
139:   v_set      public.referral_settings%rowtype;
151:   if exists (select 1 from public.purchases
156:   select * into v_set from public.referral_settings where id = true;
159:      and exists (select 1 from public.referrals r
162:      and not exists (select 1 from public.purchases pu where pu.user_id = v_uid and pu.status = 'success')
179:     'ok', true, 'list_price', v_price, 'referral_discount', v_discount,
182:     'wallet_amount', v_wallet, 'amount', v_price - v_discount - v_wallet
## supabase/migrations/20260930100000_medium_db_hardening.sql

19: alter function public.wallet_ledger_append_only()    set search_path = public, pg_temp;
20: alter function public.wallet_ledger_no_truncate()    set search_path = public, pg_temp;
64:       execute format('alter policy %I on %I.%I using (%s) with check (%s)', r.policyname, r.schemaname, r.tablename, v_q, v_w);
68:       execute format('alter policy %I on %I.%I with check (%s)', r.policyname, r.schemaname, r.tablename, v_w);
77: drop policy if exists "Admins can view all purchases"  on public.purchases;  -- purchases_select_own_or_admin
78: drop policy if exists "Users can view own purchases"   on public.purchases;
88:     from pg_constraint c
99: create or replace function public.quiz_scores_rate_limit()
109: create trigger quiz_scores_rate_limit before insert on public.quiz_scores
114: create or replace function public.analytics_events_rate_limit()
127: create trigger analytics_events_rate_limit before insert on public.analytics_events
131: alter table public.push_tokens drop constraint if exists push_tokens_token_format;
132: alter table public.push_tokens add constraint push_tokens_token_format
133:   check (expo_push_token ~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,}\]$');
135: create or replace function public.push_tokens_cap()
146: create trigger push_tokens_cap before insert on public.push_tokens
157: create or replace function public.register_push_token(p_token text, p_platform text)
189: create or replace function public.sync_profile_mobile_verified()
211: create trigger on_auth_user_phone_confirmed
## supabase/migrations/20260930110000_low_grants_tightening.sql

10: --   authenticated: admins (all writes), referrals (all writes), analytics_events UPDATE/DELETE, profiles INSERT/DELETE (rows are created by the
11: --                  signup trigger and removed by erase_user_data), referral_settings INSERT/DELETE
20: revoke insert, update, delete on public.referrals     from authenticated;
23: revoke insert, delete         on public.referral_settings from authenticated;
44: create policy notes_read_if_purchased on storage.objects
## supabase/migrations/20261012100000_google_play_ucb.sql

6:   price_inr numeric(10,2) primary key check (price_inr > 0),
7:   play_sku text not null unique check (play_sku ~ '^notes_[0-9]+$'),
46: create or replace function public.orders_snapshot_tax()
63: create trigger orders_02_tax_snapshot before insert on public.orders
66: alter table public.orders drop constraint if exists orders_ucb_provider_check;
67: alter table public.orders add constraint orders_ucb_provider_check
68:   check (provider in ('razorpay','play'));
69: alter table public.orders drop constraint if exists orders_ucb_choice_check;
70: alter table public.orders add constraint orders_ucb_choice_check
71:   check (provider <> 'play' or (play_sku is not null and razorpay_order_id is null));
72: alter table public.orders drop constraint if exists orders_ucb_report_check;
73: alter table public.orders add constraint orders_ucb_report_check
74:   check (external_report_status is null or external_report_status in ('pending','failed','reported'));
75: alter table public.orders drop constraint if exists orders_ucb_consumption_check;
76: alter table public.orders add constraint orders_ucb_consumption_check
77:   check (play_consumption_status is null or play_consumption_status in ('pending','failed','consumed'));
88: alter table public.payments drop constraint if exists payments_ucb_provider_check;
89: alter table public.payments add constraint payments_ucb_provider_check check (
96: create or replace function public.orders_immutable_columns()
103:   if new.list_price is distinct from old.list_price or new.referral_discount is distinct from old.referral_discount or new.wallet_amount is distinct from old.wallet_amount then raise exception 'orders price breakdown is immutable' using errcode='42501'; end if;
105:   if new.expires_at is distinct from old.expires_at then raise exception 'orders.expires_at is immutable' using errcode='42501'; end if;
123: create or replace function public.create_play_order(p_user_id uuid, p_product_id text)
133:   if exists(select 1 from public.purchases where user_id=p_user_id and product_id=p_product_id and status='success') then return jsonb_build_object('ok',false,'code','already_owned'); end if;
136:   select checkout_expiry_minutes into v_minutes from public.referral_settings where id=true;
139:     amount,list_price,provider,play_sku,status,expires_at)
147: create or replace function public.attach_ucb_external_token(p_user_id uuid,p_order_id text,p_token text)
154:      or v_order.purchase_token is not null or (v_order.expires_at is not null and v_order.expires_at<now()) then
166: create or replace function public.bind_ucb_razorpay_order(p_user_id uuid,p_choice_id text,p_razorpay_id text,p_buyer_state text)
206: create or replace function public.settle_play_purchase(
212:   v_ref public.referrals%rowtype; v_set public.referral_settings%rowtype;
239:      or v_order.list_price is distinct from v_order.amount or v_order.wallet_amount<>0
240:      or v_order.referral_discount<>0 then raise exception 'Play order price mismatch'; end if;
244:   select id into v_owned_purchase from public.purchases
246:   insert into public.purchases(user_id,order_id,product_id,product_title,scope,chapter_id,subject_id,year_id,
257:   select * into v_ref from public.referrals where referred_id=v_order.user_id for update;
260:      and not exists(select 1 from public.purchases where user_id=v_order.user_id
262:     select * into v_set from public.referral_settings where id=true;
266:       update public.referrals set first_order_id=v_order.id,status='rejected',
270:       update public.referrals set first_order_id=v_order.id,status='rejected',
274:       update public.referrals set first_order_id=v_order.id,status='qualified',
279:       insert into public.wallet_ledger(user_id,entry_type,status,amount,source,referral_id,order_id,
280:         available_at,expires_at,note)
296: create or replace function public.mark_ucb_report_attempt(p_order_id text,p_refund boolean default false)
## supabase/migrations/20261012110000_google_play_refunds.sql

5: create or replace function public.reverse_play_payment(p_purchase_token text)
14:   v_credit public.wallet_ledger%rowtype;
35:   update public.purchases set status = 'refunded'
40:   -- Looked up by the ledger row's own order_id, NOT through referrals: the
41:   -- referrals row is deleted when the friend deletes their account.
42:   select * into v_credit from public.wallet_ledger
56:     update public.wallet_ledger set status = 'cancelled' where id = v_credit.id;
58:     update public.referrals
63:   elsif exists (select 1 from public.wallet_ledger
70:   elsif v_credit.expires_at is not null and v_credit.expires_at <= now() then
82:       insert into public.wallet_ledger (user_id, entry_type, status, amount, source, reverses_id, referral_id, order_id, note)
88:     update public.referrals
92:       insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
109:   return v_status || jsonb_build_object('wallet_restored', v_restored, 'purchases_revoked', v_revoked);
## supabase/migrations/20261013090000_ucb_atomic_completion.sql

3: create or replace function public.settle_razorpay_payment(
20:   v_set public.referral_settings%rowtype;
21:   v_ref public.referrals%rowtype;
95:   -- The first discounted order to settle claims referrals.discount_order_id; any
100:   if v_order.referral_discount > 0 and v_order.referral_id is not null then
101:     update public.referrals set discount_order_id = v_order.id
103:     select discount_order_id into v_discount_owner from public.referrals where id = v_order.referral_id;
116:   select id into v_owned_purchase from public.purchases
121:   insert into public.purchases (
151:           or (v_order.status = 'created' and v_order.expires_at is not null
152:               and coalesce(p_paid_at, now()) > v_order.expires_at);
155:   if v_first and v_order.wallet_amount > 0
156:      and not exists (select 1 from public.wallet_ledger
160:     v_debit := least(v_order.wallet_amount, coalesce(v_balance, 0));
162:       insert into public.wallet_ledger (user_id, entry_type, status, amount, source, order_id, note)
178:   if v_first and v_order.wallet_amount > 0 and v_debit < v_order.wallet_amount then
179:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
180:     values (v_order.id, v_order.user_id, 'wallet_shortfall', v_order.wallet_amount, v_order.referral_discount,
182:               'wallet_amount_applied', v_order.wallet_amount,
184:               'shortfall', v_order.wallet_amount - v_debit,
188:                        v_order.wallet_amount, v_debit, v_order.wallet_amount - v_debit, p_razorpay_payment_id)))
191:       v_order.id, v_order.wallet_amount, v_debit;
194:   if v_stale and (v_order.wallet_amount > 0 or v_order.referral_discount > 0) then
195:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
196:     values (v_order.id, v_order.user_id, 'stale_order_paid', v_order.wallet_amount, v_order.referral_discount,
198:               'order_status', v_order.status, 'expires_at', v_order.expires_at, 'paid_at', p_paid_at,
199:               'wallet_debited', (select coalesce(sum(amount), 0) from public.wallet_ledger
210:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
211:     values (v_order.id, v_order.user_id, 'discount_reused', v_order.wallet_amount, v_order.referral_discount,
214:               'discount_not_owed', v_order.referral_discount,
220:                        v_discount_owner, v_order.referral_discount, v_order.amount,
221:                        v_order.amount + v_order.referral_discount, p_razorpay_payment_id)))
228:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
229:     values (v_order.id, v_order.user_id, 'duplicate_purchase', v_order.wallet_amount, v_order.referral_discount,
242:   select * into v_ref from public.referrals where referred_id = v_order.user_id for update;
245:      and not exists (select 1 from public.purchases
247:     select * into v_set from public.referral_settings where id = true;
255:       update public.referrals
262:       update public.referrals
268:       update public.referrals
275:       insert into public.wallet_ledger (
277:         available_at, expires_at, note
## supabase/migrations/20261013100000_wallet_reservations.sql

3: create table if not exists public.wallet_order_reservations (
6:   amount numeric(10,2) not null check (amount>0),
7:   expires_at timestamptz not null
9: create index if not exists wallet_order_reservations_user_idx on public.wallet_order_reservations(user_id);
10: alter table public.wallet_order_reservations enable row level security;
11: revoke all on public.wallet_order_reservations from public,anon,authenticated;
12: grant all on public.wallet_order_reservations to service_role;
15: CREATE OR REPLACE FUNCTION public.create_priced_order(p_user_id uuid, p_product_id text, p_use_wallet boolean DEFAULT false)
22:   v_set      public.referral_settings%rowtype;
24:   v_ref      public.referrals%rowtype;
46:   if exists (select 1 from public.purchases
51:   select * into v_set from public.referral_settings where id = true;
56:       from public.referrals r
61:        and not exists (select 1 from public.purchases pu
76:   -- Wallet: eligible product types only (referral_settings), capped at wallet_max_percent of what is left
101:     amount, list_price, referral_discount, wallet_amount, referral_id, status, expires_at
111:     insert into public.wallet_order_reservations(order_id,user_id,amount,expires_at)
117:     'list_price', v_price, 'referral_discount', v_discount,
118:     'wallet_amount', v_wallet, 'amount', v_final,
126: create or replace function public.settle_razorpay_payment(
143:   v_set public.referral_settings%rowtype;
144:   v_ref public.referrals%rowtype;
220:   if v_first and v_order.wallet_amount > 0 then
224:       from public.wallet_order_reservations r join public.orders o on o.id=r.order_id
226:         and o.status='created' and r.expires_at>now();
227:     if coalesce(v_balance,0)-v_other_reserved < v_order.wallet_amount then
233:   -- The first discounted order to settle claims referrals.discount_order_id; any
238:   if v_order.referral_discount > 0 and v_order.referral_id is not null then
239:     update public.referrals set discount_order_id = v_order.id
241:     select discount_order_id into v_discount_owner from public.referrals where id = v_order.referral_id;
254:   select id into v_owned_purchase from public.purchases
259:   insert into public.purchases (
289:           or (v_order.status = 'created' and v_order.expires_at is not null
290:               and coalesce(p_paid_at, now()) > v_order.expires_at);
293:   if v_first and v_order.wallet_amount > 0
294:      and not exists (select 1 from public.wallet_ledger
298:     v_debit := v_order.wallet_amount;
300:       insert into public.wallet_ledger (user_id, entry_type, status, amount, source, order_id, note)
316:   if v_first and v_order.wallet_amount > 0 and v_debit < v_order.wallet_amount then
317:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
318:     values (v_order.id, v_order.user_id, 'wallet_shortfall', v_order.wallet_amount, v_order.referral_discount,
320:               'wallet_amount_applied', v_order.wallet_amount,
322:               'shortfall', v_order.wallet_amount - v_debit,
326:                        v_order.wallet_amount, v_debit, v_order.wallet_amount - v_debit, p_razorpay_payment_id)))
329:       v_order.id, v_order.wallet_amount, v_debit;
332:   if v_stale and (v_order.wallet_amount > 0 or v_order.referral_discount > 0) then
333:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
334:     values (v_order.id, v_order.user_id, 'stale_order_paid', v_order.wallet_amount, v_order.referral_discount,
336:               'order_status', v_order.status, 'expires_at', v_order.expires_at, 'paid_at', p_paid_at,
337:               'wallet_debited', (select coalesce(sum(amount), 0) from public.wallet_ledger
348:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
349:     values (v_order.id, v_order.user_id, 'discount_reused', v_order.wallet_amount, v_order.referral_discount,
352:               'discount_not_owed', v_order.referral_discount,
358:                        v_discount_owner, v_order.referral_discount, v_order.amount,
359:                        v_order.amount + v_order.referral_discount, p_razorpay_payment_id)))
366:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
367:     values (v_order.id, v_order.user_id, 'duplicate_purchase', v_order.wallet_amount, v_order.referral_discount,
380:   select * into v_ref from public.referrals where referred_id = v_order.user_id for update;
383:      and not exists (select 1 from public.purchases
385:     select * into v_set from public.referral_settings where id = true;
393:       update public.referrals
400:       update public.referrals
406:       update public.referrals
413:       insert into public.wallet_ledger (
415:         available_at, expires_at, note
## supabase/migrations/20261014100000_payment_audit_capture_inbox.sql

13:   payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
16:   status text not null default 'pending' check (status in ('pending','applied','parked')),
30:   amount_paise bigint not null check (amount_paise>0),
33:   status text not null default 'captured' check (status in ('captured','granted','compensation_pending','reversal_pending','reversed','compensated')),
44:   amount_paise bigint not null check (amount_paise>0),
48:   status text not null default 'pending' check (status in ('pending','processing','refunded','parked')),
62: create table if not exists public.first_discount_reservations (
68: alter table public.first_discount_reservations enable row level security;
69: revoke all on public.first_discount_reservations from public,anon,authenticated;
70: grant all on public.first_discount_reservations to service_role;
72: create or replace function public.orders_reserve_first_discount()
75:   if new.referral_discount > 0 and new.referral_id is not null then
76:     insert into public.first_discount_reservations(user_id,referral_id,order_id)
78:     if not exists(select 1 from public.first_discount_reservations
80:       new.amount:=new.amount+new.referral_discount;
81:       new.referral_discount:=0;
89: create trigger orders_01_discount_reserve before insert on public.orders
100: create or replace function public.create_priced_order(p_user_id uuid,p_product_id text,p_use_wallet boolean default false)
108:       'referral_discount',v_order.referral_discount,'wallet_amount',v_order.wallet_amount);
121: create or replace function public.quote_my_order(p_product_id text,p_use_wallet boolean default false)
127:     (select 1 from public.first_discount_reservations where user_id=auth.uid()) then
128:     v_discount:=coalesce((v_result->>'referral_discount')::numeric,0);
130:       v_result:=v_result || jsonb_build_object('referral_discount',0,
139: create or replace function public.record_provider_event(
157: create or replace function public.record_payment_capture(
185: create or replace function public.settle_razorpay_payment(
206:   elsif v_order.referral_discount>0 and (v_order.status in ('cancelled','failed')
207:       or (v_order.expires_at is not null and coalesce(p_paid_at,now())>v_order.expires_at)) then
209:   elsif v_order.referral_discount>0 and not exists(select 1 from public.first_discount_reservations
211:   elsif exists(select 1 from public.purchases where user_id=v_order.user_id
214:   elsif v_order.amount<>v_order.list_price-v_order.referral_discount-v_order.wallet_amount then
252: create or replace function public.grant_razorpay_payment(
## supabase/migrations/20261015120000_play_entitlement_order_snapshot.sql

6: create function public.play_purchase_entitlement_from_order()
29: create trigger purchases_play_order_snapshot before insert on public.purchases
## supabase/migrations/20261016100000_play_catalog_sync.sql

5: alter table public.play_price_tiers drop constraint if exists play_price_tiers_pkey;
11: alter table public.play_price_tiers drop constraint if exists play_price_tiers_play_sku_check;
20:   price_inr numeric(10,2) primary key check (price_inr > 0),
21:   status text not null default 'pending' check (status in ('pending','running','ready','failed')),
36:   event text not null check (event in ('queued','claimed','verified','retry','failed','rotated')),
51: create or replace function public.play_notes_product_eligible(p public.products)
81: create or replace function public.play_price_has_eligible_product(p_price numeric)
92: create or replace function public.queue_play_price_sync(p_price numeric)
113: create or replace function public.queue_product_play_price()
128: create trigger products_queue_play_price after insert or update of price, active, product_type, scope,
133: create or replace function public.queue_notes_play_price()
148: create trigger notes_queue_play_price after insert or update of active,is_free_preview,chapter_id,pdf_url on public.notes
152: create or replace function public.retry_play_price_sync(p_price numeric)
168: create or replace function public.claim_play_price_sync()
192: create or replace function public.requeue_stale_play_price_sync()
207: create or replace function public.rotate_play_price_sku(p_price numeric,p_lease uuid,p_reason text)
223: create or replace function public.finish_play_price_sync(p_price numeric,p_lease uuid,p_sku text,p_option text)
244: create or replace function public.fail_play_price_sync(p_price numeric,p_lease uuid,p_reason text,p_retry boolean)
279: create policy admin_read_play_tiers on public.play_price_tiers for select to authenticated using (public.am_i_admin());
280: create policy admin_read_play_sync on public.play_price_sync for select to authenticated using (public.am_i_admin());
290: create or replace function public.orders_play_option_immutable()
299: create trigger orders_play_option_immutable before update on public.orders
301: create or replace function public.create_play_order(p_user_id uuid, p_product_id text)
314:   if exists(select 1 from public.purchases where user_id=p_user_id and product_id=p_product_id and status='success') then return jsonb_build_object('ok',false,'code','already_owned'); end if;
320:   select checkout_expiry_minutes into v_minutes from public.referral_settings where id=true;
323:     amount,list_price,provider,play_sku,play_purchase_option_id,status,expires_at)
## supabase/migrations/20261019151000_play_duplicate_settlement_result.sql

2: -- No prices, existing purchases, or Razorpay functions are modified.
5: create or replace function public.settle_play_purchase(
11:   v_ref public.referrals%rowtype; v_set public.referral_settings%rowtype;
25:         'duplicate',exists(select 1 from public.purchases
40:      or v_order.list_price is distinct from v_order.amount or v_order.wallet_amount<>0
41:      or v_order.referral_discount<>0 then raise exception 'Play order price mismatch'; end if;
45:   select id into v_owned_purchase from public.purchases
47:   insert into public.purchases(user_id,order_id,product_id,product_title,scope,chapter_id,subject_id,year_id,
58:   select * into v_ref from public.referrals where referred_id=v_order.user_id for update;
61:      and not exists(select 1 from public.purchases where user_id=v_order.user_id
63:     select * into v_set from public.referral_settings where id=true;
67:       update public.referrals set first_order_id=v_order.id,status='rejected',
71:       update public.referrals set first_order_id=v_order.id,status='rejected',
75:       update public.referrals set first_order_id=v_order.id,status='qualified',
80:       insert into public.wallet_ledger(user_id,entry_type,status,amount,source,referral_id,order_id,
81:         available_at,expires_at,note)
## supabase/migrations/20261020103000_first_purchase_identity_retention.sql

7: create index if not exists first_purchase_identities_retention_idx
8:   on public.first_purchase_identities (first_purchase_at);
10: create or replace function public.purge_expired_first_purchase_identities()
19:   delete from public.first_purchase_identities
25: revoke all on function public.purge_expired_first_purchase_identities() from public, anon, authenticated;
26: grant execute on function public.purge_expired_first_purchase_identities() to service_role;
33: --   'select public.purge_expired_first_purchase_identities();');
39: -- 2. drop function public.purge_expired_first_purchase_identities();
40: -- 3. drop index public.first_purchase_identities_retention_idx;
## supabase/migrations/20261020104000_course_wide_content_browsing.sql

10: create or replace function public.content_is_published(
35: create or replace function public.has_content_access(p_course_id text, p_year_id text)
51:       from public.purchases pu
70: create policy subjects_published_ancestry on public.subjects as restrictive
74: create policy chapters_published_ancestry on public.chapters as restrictive
78: create policy notes_published_ancestry on public.notes as restrictive
82: create policy videos_published_ancestry on public.videos as restrictive
86: create policy quiz_tests_published_ancestry on public.quiz_tests as restrictive
90: create policy products_published_ancestry on public.products as restrictive
112: create or replace function public.user_can_access_note(p_user uuid, p_note_id text)
135:             from public.purchases p
150: create or replace function public.user_can_access_video(p_user uuid, p_video_id text)
161:             select 1 from public.purchases pu
175: create or replace function public.submit_quiz_attempt(
## supabase/migrations/20261020110000_admin_url_mfa.sql

6: create or replace function public.user_can_access_note(p_user uuid, p_note_id text)
22:             select 1 from public.purchases p
34: create or replace function public.user_can_access_video(p_user uuid, p_video_id text)
48:             select 1 from public.purchases pu
61: create function public.user_can_access_note_with_aal(
75: create function public.user_can_access_video_with_aal(
## supabase/migrations/20261104100000_razorpay_snapshot_discount_retry.sql

1: -- Forward-only payment correctness fix. No historical purchases are rewritten.
5: create function public.orders_entitlement_immutable()
15: create trigger orders_02_entitlement_immutable before update on public.orders
20: create or replace function public.orders_derive_course()
40: create function public.razorpay_purchase_entitlement_from_order()
62: create trigger purchases_razorpay_order_snapshot before insert on public.purchases
68: create or replace function public.orders_reserve_first_discount()
71:   if new.referral_discount>0 and new.referral_id is not null then
73:     insert into public.first_discount_reservations(user_id,referral_id,order_id)
78:       where o.id=first_discount_reservations.order_id
79:         and (o.status in ('failed','cancelled') or o.expires_at<=now()
82:       and not exists(select 1 from public.purchases p
84:       and not exists(select 1 from public.referrals r where r.referred_id=new.user_id
86:     if not exists(select 1 from public.first_discount_reservations
88:       new.amount:=new.amount+new.referral_discount;
89:       new.referral_discount:=0;
97: -- attempt. Eligibility is still derived from purchases, identity and referral.
98: create or replace function public.quote_my_order(p_product_id text,p_use_wallet boolean default false)
107: create or replace function public.settle_razorpay_payment_legacy(
124:   v_set public.referral_settings%rowtype;
125:   v_ref public.referrals%rowtype;
201:   if v_first and v_order.wallet_amount > 0 then
205:       from public.wallet_order_reservations r join public.orders o on o.id=r.order_id
207:         and o.status='created' and r.expires_at>now();
208:     if coalesce(v_balance,0)-v_other_reserved < v_order.wallet_amount then
214:   -- The first discounted order to settle claims referrals.discount_order_id; any
219:   if v_order.referral_discount > 0 and v_order.referral_id is not null then
220:     update public.referrals set discount_order_id = v_order.id
222:     select discount_order_id into v_discount_owner from public.referrals where id = v_order.referral_id;
235:   select id into v_owned_purchase from public.purchases
240:   insert into public.purchases (
270:           or (v_order.status = 'created' and v_order.expires_at is not null
271:               and coalesce(p_paid_at, now()) > v_order.expires_at);
274:   if v_first and v_order.wallet_amount > 0
275:      and not exists (select 1 from public.wallet_ledger
279:     v_debit := v_order.wallet_amount;
281:       insert into public.wallet_ledger (user_id, entry_type, status, amount, source, order_id, note)
297:   if v_first and v_order.wallet_amount > 0 and v_debit < v_order.wallet_amount then
298:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
299:     values (v_order.id, v_order.user_id, 'wallet_shortfall', v_order.wallet_amount, v_order.referral_discount,
301:               'wallet_amount_applied', v_order.wallet_amount,
303:               'shortfall', v_order.wallet_amount - v_debit,
307:                        v_order.wallet_amount, v_debit, v_order.wallet_amount - v_debit, p_razorpay_payment_id)))
310:       v_order.id, v_order.wallet_amount, v_debit;
313:   if v_stale and (v_order.wallet_amount > 0 or v_order.referral_discount > 0) then
314:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
315:     values (v_order.id, v_order.user_id, 'stale_order_paid', v_order.wallet_amount, v_order.referral_discount,
317:               'order_status', v_order.status, 'expires_at', v_order.expires_at, 'paid_at', p_paid_at,
318:               'wallet_debited', (select coalesce(sum(amount), 0) from public.wallet_ledger
329:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
330:     values (v_order.id, v_order.user_id, 'discount_reused', v_order.wallet_amount, v_order.referral_discount,
333:               'discount_not_owed', v_order.referral_discount,
339:                        v_discount_owner, v_order.referral_discount, v_order.amount,
340:                        v_order.amount + v_order.referral_discount, p_razorpay_payment_id)))
347:     insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
348:     values (v_order.id, v_order.user_id, 'duplicate_purchase', v_order.wallet_amount, v_order.referral_discount,
361:   select * into v_ref from public.referrals where referred_id = v_order.user_id for update;
364:      and not exists (select 1 from public.purchases
366:     select * into v_set from public.referral_settings where id = true;
374:       update public.referrals
381:       update public.referrals
387:       update public.referrals
394:       insert into public.wallet_ledger (
396:         available_at, expires_at, note
417: create or replace function public.settle_razorpay_payment(
453:   elsif v_order.referral_discount>0 and (v_order.status in ('cancelled','failed')
454:       or (v_order.expires_at is not null and coalesce(p_paid_at,now())>v_order.expires_at)) then
456:   elsif v_order.referral_discount>0 and not exists(select 1 from public.first_discount_reservations
458:   elsif exists(select 1 from public.purchases where user_id=v_order.user_id
461:   elsif v_order.amount<>v_order.list_price-v_order.referral_discount-v_order.wallet_amount then
## supabase/migrations/20261109100000_billing_settlement_recovery.sql

14: create or replace function public.razorpay_entitlement_committed(p_order_id text,p_payment_id text)
18:    join public.purchases p on p.order_id=o.id
33: create or replace function public.settle_razorpay_payment(
99:   elsif v_order.referral_discount>0 and (v_order.status in ('cancelled','failed')
100:       or (v_order.expires_at is not null and coalesce(p_paid_at,now())>v_order.expires_at)) then
102:   elsif v_order.referral_discount>0 and not exists(select 1 from public.first_discount_reservations
104:   elsif exists(select 1 from public.purchases where user_id=v_order.user_id
107:   elsif v_order.amount<>v_order.list_price-v_order.referral_discount-v_order.wallet_amount then
149: create or replace function public.attach_ucb_external_token(p_user_id uuid,p_order_id text,p_token text)
165:   if o.status<>'created' or o.expires_at is null or o.expires_at<=now() then
178: create or replace function public.enqueue_payment_jobs() returns void
227: create or replace function public.play_entitlement_committed(p_order_id text,p_token text)
231:    join public.purchases p on p.order_id=o.id
242: create or replace function public.get_my_play_fulfillment(p_order_id text)
250:   if exists(select 1 from public.purchases where order_id=o.id and status='duplicate') then
## supabase/migrations/20261110100000_mv003_razorpay_entitlement_commitment.sql

5: create or replace function public.razorpay_entitlement_committed(p_order_id text,p_payment_id text)
12:     join public.purchases p on p.order_id=o.id
35:       -- Absence is allowed for historical purchases. An existing capture must
## supabase/migrations/20261110130000_mv006_purchase_ownership_guard.sql

5: create or replace function public.guard_purchase_success_ownership()
23:   -- Legacy purchases can lack product/user identities. Keep their established
41:     select 1 from public.purchases p
60: drop trigger if exists purchases_zz_success_ownership on public.purchases;
61: create trigger purchases_zz_success_ownership
62: before insert or update on public.purchases
## supabase/migrations/20261111100000_phase_c_final_mv003_commitment.sql

7: create or replace function public.razorpay_entitlement_committed(p_order_id text,p_payment_id text)
14:     join public.purchases p on p.order_id=o.id
37:       -- Absence is allowed for historical purchases. An existing capture must
## supabase/migrations/20261111110000_phase_c_play_entitlement_snapshot.sql

5: create or replace function public.play_purchase_entitlement_from_order()
27: drop trigger if exists purchases_play_order_snapshot on public.purchases;
28: create trigger purchases_play_order_snapshot before insert on public.purchases
31: create or replace function public.play_entitlement_committed(p_order_id text,p_token text)
36:    join public.purchases p on p.order_id=o.id
## supabase/migrations/20261111120000_p0_classified_reversal_commitment.sql

6: create or replace function public.razorpay_entitlement_committed(p_order_id text,p_payment_id text)
13:     join public.purchases p on p.order_id=o.id
36:       -- Absence is allowed for historical purchases. An existing capture must
## supabase/migrations/20261111175746_all_row_foreign_key_indexes.sql

10: CREATE INDEX purchases_user_id_all_rows_idx ON public.purchases (user_id);
13: CREATE INDEX wallet_ledger_referral_id_all_rows_idx ON public.wallet_ledger (referral_id);
14: CREATE INDEX wallet_ledger_order_id_all_rows_idx ON public.wallet_ledger (order_id);
15: CREATE INDEX wallet_ledger_reverses_id_all_rows_idx ON public.wallet_ledger (reverses_id);
## supabase/migrations/20261112104610_audit_batch1_refund_revocation.sql

4: create or replace function public.reverse_refunded_capture(p_payment_id text)
23:     select exists(select 1 from public.purchases where order_id=o.id and status='chargeback')
41: create or replace function public.queue_capture_compensation(p_payment_id text)
72: create or replace function public.settle_razorpay_payment(
138:   elsif v_order.referral_discount>0 and (v_order.status in ('cancelled','failed')
139:       or (v_order.expires_at is not null and coalesce(p_paid_at,now())>v_order.expires_at)) then
141:   elsif v_order.referral_discount>0 and not exists(select 1 from public.first_discount_reservations
143:   elsif exists(select 1 from public.purchases where user_id=v_order.user_id
146:   elsif v_order.amount<>v_order.list_price-v_order.referral_discount-v_order.wallet_amount then
163:       select exists(select 1 from public.purchases where order_id=v_order.id and status='chargeback')
196: create or replace function public.user_can_access_note(p_user uuid, p_note_id text)
212:             select 1 from public.purchases p
## supabase/migrations/20261112150427_audit_checkout_publication_guard.sql

5: create or replace function public.lock_checkout_publication(p_product_id text)
40: create or replace function public.create_priced_order(p_user_id uuid,p_product_id text,p_use_wallet boolean default false)
51:       'referral_discount',v_order.referral_discount,'wallet_amount',v_order.wallet_amount);
58: create or replace function public.create_play_order(p_user_id uuid, p_product_id text)
72:   if exists(select 1 from public.purchases where user_id=p_user_id and product_id=p_product_id and status='success') then return jsonb_build_object('ok',false,'code','already_owned'); end if;
78:   select checkout_expiry_minutes into v_minutes from public.referral_settings where id=true;
81:     amount,list_price,provider,play_sku,play_purchase_option_id,status,expires_at)
## supabase/migrations/20261114040000_fix3_content_push_and_delete_guards.sql

3: create or replace function public.has_content_access(p_course_id text,p_year_id text)
10:    or exists(select 1 from public.purchases pu
24: create or replace function public.push_tokens_cap()
39: create trigger push_tokens_cap before insert or update of user_id on public.push_tokens
43: create or replace function public.register_push_token(p_token text,p_platform text)
## supabase/migrations/20261114050400_fix4_identity_retention_schedule.sql

3: create or replace function public.purge_expired_first_purchase_identities()
7:  delete from public.first_purchase_identities where first_purchase_at <= now()-interval '180 days';
11: revoke all on function public.purge_expired_first_purchase_identities() from public,anon,authenticated;
12: grant execute on function public.purge_expired_first_purchase_identities() to service_role;
16:    perform cron.schedule('first-purchase-identity-retention','0 * * * *','select public.purge_expired_first_purchase_identities();');

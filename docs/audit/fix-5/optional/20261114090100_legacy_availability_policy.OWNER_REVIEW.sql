-- OPTIONAL OWNER POLICY MIGRATION. NOT in supabase/migrations; NOT applied/test-certified.
-- Default decision is KEEP LEGACY STAMPED EXPIRY. Do not run for the normal Fix 5 rollout.
-- Only after owner policy approval, staging rehearsal and review of aggregate counts:
-- SET medveda.approve_legacy_availability_policy = 'approved'; then run this entire file.
-- This may extend expiry AND provider clawback eligibility. It never edits wallet_ledger.
-- It cannot undo an already posted expiry fact; that requires a separate reviewed
-- compensating-credit policy, not deletion/update of a financial fact.
begin;
set local search_path=public;
do $$ declare u uuid; begin
 if current_setting('medveda.approve_legacy_availability_policy',true) is distinct from 'approved' then
  raise exception 'Legacy availability policy is not approved. Keep stamped dates by default.';
 end if;
 for u in select distinct l.user_id from public.wallet_ledger l join public.wallet_credit_policy p on p.credit_id=l.id
  where p.legacy and l.user_id is not null order by l.user_id
 loop perform pg_advisory_xact_lock(hashtextextended('wallet:'||u::text,0)); end loop;
 if exists(select 1 from public.wallet_ledger e join public.wallet_credit_policy p on p.credit_id=e.expiry_credit_id
  where e.entry_type='expiry' and p.legacy) then
  raise exception 'Legacy expiry facts already exist. Review compensating-credit policy; this optional migration cannot erase them.';
 end if;
end $$;
-- Controlled one-time exception on DERIVED policy snapshots only. The ledger's
-- append-only guards remain enabled. DDL/update/re-enable are atomic in this transaction.
alter table public.wallet_credit_policy disable trigger wallet_policy_guard;
update public.wallet_credit_policy p set legacy=false,
 first_available_at=case when l.status='available' then coalesce(l.status_changed_at,l.available_at,l.created_at) end,
 effective_expires_at=case when l.status='available' then coalesce(l.status_changed_at,l.available_at,l.created_at)+p.duration end
from public.wallet_ledger l where l.id=p.credit_id and p.legacy;
alter table public.wallet_credit_policy enable trigger wallet_policy_guard;
commit;

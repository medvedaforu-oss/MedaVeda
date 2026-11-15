\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values('f5000000-0000-0000-0000-000000000001','fix5-bound-referrer@example.invalid'),('f5000000-0000-0000-0000-000000000002','fix5-bound-friend@example.invalid');
update public.profiles set course_id='bams' where id in('f5000000-0000-0000-0000-000000000001','f5000000-0000-0000-0000-000000000002');
update public.referral_settings set enabled=true,require_verified_phone=false,credit_hold_days=90,credit_expiry_days=36500,referrer_credit_amount=50 where id=true;
insert into public.referrals(referrer_id,referred_id,code_used,status) values('f5000000-0000-0000-0000-000000000001','f5000000-0000-0000-0000-000000000002','BOUNDARY','pending');
do $$ declare o jsonb; l public.wallet_ledger%rowtype; begin
 o:=public.create_priced_order('f5000000-0000-0000-0000-000000000002','seed_product',false);
 assert (o->>'ok')::boolean,'maximum policy order fixture';
 update public.orders set razorpay_order_id='order_fix5_bound' where id=o->>'order_id';
 perform public.settle_razorpay_payment('evt_fix5_bound','order_fix5_bound','pay_fix5_bound',round((o->>'amount')::numeric*100)::bigint,now());
 select * into strict l from public.wallet_ledger where order_id=o->>'order_id' and source='referral_reward';
 assert l.amount=50 and l.available_at=now()+interval '90 days' and l.expires_at=now()+interval '36590 days','max hold/expiry earning arithmetic';
 assert (select duration=interval '36500 days' from public.wallet_credit_policy where credit_id=l.id),'max duration not snapshotted';
 begin update public.referral_settings set credit_expiry_days=36501 where id=true;raise exception '36501 accepted'; exception when check_violation then null;end;
end $$;
update public.referral_settings set credit_expiry_days=1 where id=true;
update public.referral_settings set credit_expiry_days=null where id=true;
\echo PASS NULL/1/36500 policy, max hold90 + expiry36500 actual settlement, reject36501
rollback;

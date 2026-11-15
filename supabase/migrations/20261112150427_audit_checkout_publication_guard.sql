-- Admission only: existing order snapshots and settlement remain recoverable.
begin;
-- Locks publication ancestors through order insertion. Service-only, never a client
-- authorization substitute. No historical order/purchase/content rows are rewritten.
create or replace function public.lock_checkout_publication(p_product_id text)
returns boolean language plpgsql security definer set search_path=public as $$
declare p public.products%rowtype; n integer; wanted integer;
begin
  select * into p from public.products where id=p_product_id for share;
  if not found or not p.active then return false; end if;
  perform 1 from public.courses where id=p.course_id and active for share;
  if not found then return false; end if;
  if p.scope='chapter' then
    perform 1 from public.chapters c join public.subjects s on s.id=c.subject_id
      join public.years y on y.id=s.year_id
      where c.id=p.chapter_id and c.active and s.active and y.active
        and c.course_id=p.course_id and s.course_id=p.course_id and y.course_id=p.course_id
      for share of c,s,y;
    return found;
  elsif p.scope='subject' then
    perform 1 from public.subjects s join public.years y on y.id=s.year_id
      where s.id=p.subject_id and s.active and y.active
        and s.course_id=p.course_id and y.course_id=p.course_id for share of s,y;
    return found;
  elsif p.scope='year' then
    perform 1 from public.years y where y.id=p.year_id and y.active and y.course_id=p.course_id for share;
    return found;
  elsif p.scope='bundle' then
    wanted:=cardinality(p.year_ids);
    if wanted is null or wanted=0 then return false; end if;
    perform 1 from public.years y where y.id=any(p.year_ids) and y.active and y.course_id=p.course_id for share;
    get diagnostics n=row_count;
    return n=wanted;
  end if;
  return false;
end $$;
revoke all on function public.lock_checkout_publication(text) from public,anon,authenticated;
grant execute on function public.lock_checkout_publication(text) to service_role;

create or replace function public.create_priced_order(p_user_id uuid,p_product_id text,p_use_wallet boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb; v_order public.orders%rowtype;
begin
  if not public.lock_checkout_publication(p_product_id) then
    return jsonb_build_object('ok',false,'code','product_unavailable');
  end if;
  v_result:=public.create_priced_order_legacy(p_user_id,p_product_id,p_use_wallet);
  if coalesce((v_result->>'ok')::boolean,false) then
    select * into v_order from public.orders where id=v_result->>'order_id';
    v_result:=v_result || jsonb_build_object('amount',v_order.amount,
      'referral_discount',v_order.referral_discount,'wallet_amount',v_order.wallet_amount);
  end if;
  return v_result;
end $$;
revoke all on function public.create_priced_order(uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.create_priced_order(uuid,text,boolean) to service_role;

create or replace function public.create_play_order(p_user_id uuid, p_product_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_product public.products%rowtype; v_profile public.profiles%rowtype;
  v_sku text; v_option text; v_order_id text := gen_random_uuid()::text; v_minutes integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('wallet:' || p_user_id::text, 0));
  select * into v_profile from public.profiles where id=p_user_id;
  if not found or v_profile.blocked then return jsonb_build_object('ok',false,'code','account_unavailable'); end if;
  if not public.lock_checkout_publication(p_product_id) then return jsonb_build_object('ok',false,'code','product_unavailable'); end if;
  select * into v_product from public.products where id=p_product_id and active;
  if not found or v_product.course_id is distinct from v_profile.course_id then return jsonb_build_object('ok',false,'code','product_unavailable'); end if;
  if not public.play_notes_product_eligible(v_product) then
    return jsonb_build_object('ok',false,'code','not_billable_notes');
  end if;
  if exists(select 1 from public.purchases where user_id=p_user_id and product_id=p_product_id and status='success') then return jsonb_build_object('ok',false,'code','already_owned'); end if;
  select t.play_sku,t.purchase_option_id into v_sku,v_option
    from public.play_price_tiers t join public.play_price_sync s on s.candidate_sku=t.play_sku
    where t.price_inr=v_product.price and t.active and t.verified_at > now()-interval '24 hours'
      and t.currency_code='INR' and t.region_code='IN' and s.status='ready';
  if v_sku is null then return jsonb_build_object('ok',false,'code','price_tier_pending'); end if;
  select checkout_expiry_minutes into v_minutes from public.referral_settings where id=true;
  update public.orders set status='cancelled',updated_at=now() where user_id=p_user_id and status='created' and provider='play' and purchase_token is null;
  insert into public.orders(id,user_id,product_id,scope,chapter_id,subject_id,year_id,year_ids,course_id,
    amount,list_price,provider,play_sku,play_purchase_option_id,status,expires_at)
  values(v_order_id,p_user_id,p_product_id,v_product.scope,v_product.chapter_id,v_product.subject_id,v_product.year_id,
    v_product.year_ids,v_product.course_id,v_product.price,v_product.price,'play',v_sku,v_option,'created',now()+make_interval(mins=>coalesce(v_minutes,30)));
  return jsonb_build_object('ok',true,'order_id',v_order_id,'play_sku',v_sku,'purchase_option_id',v_option);
end; $$;
revoke all on function public.create_play_order(uuid,text) from public,anon,authenticated;
grant execute on function public.create_play_order(uuid,text) to service_role;

commit;

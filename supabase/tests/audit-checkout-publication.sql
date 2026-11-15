-- Synthetic fixtures only; rollback leaves the disposable database unchanged.
begin;
insert into auth.users(id,email) values ('a0130000-0000-4000-8000-000000000001','audit013@synthetic.invalid');
insert into public.years(id,title,course_id) values ('audit_y2','Second audit year','bams');
insert into public.products(id,title,scope,price,active,subject_id,year_id,year_ids,course_id,product_type) values
 ('audit_subject','Audit subject','subject',49,true,'seed_s',null,null,'bams','notes'),
 ('audit_year','Audit year','year',49,true,null,'seed_y',null,'bams','notes'),
 ('audit_bundle','Audit bundle','bundle',49,true,null,null,array['seed_y','audit_y2'],'bams','notes_bundle');
do $$
declare r jsonb; p text; parent text; target text; before_count bigint;
begin
  foreach p in array array['seed_product','audit_subject','audit_year','audit_bundle'] loop
    r:=public.create_priced_order('a0130000-0000-4000-8000-000000000001',p,false);
    if not coalesce((r->>'ok')::boolean,false) then raise exception 'published % rejected: %',p,r; end if;
  end loop;
  foreach parent in array array['courses','years','subjects','chapters'] loop
    target:=case parent when 'courses' then 'bams' when 'years' then 'seed_y' when 'subjects' then 'seed_s' else 'seed_c' end;
    execute format('update public.%I set active=false where id=$1',parent) using target;
    foreach p in array array['seed_product','audit_subject','audit_year','audit_bundle'] loop
      -- A broader scope does not require every descendant published.
      if parent='chapters' and p<>'seed_product' then continue; end if;
      if parent='subjects' and p in ('audit_year','audit_bundle') then continue; end if;
      select count(*) into before_count from public.orders;
      r:=public.create_priced_order('a0130000-0000-4000-8000-000000000001',p,false);
      if r->>'code'<>'product_unavailable' or coalesce((r->>'ok')::boolean,true) then
        raise exception 'AUD-013 unpublished % admitted %: %',parent,p,r;
      end if;
      if (select count(*) from public.orders)<>before_count then raise exception 'rejected checkout wrote an order'; end if;
    end loop;
    execute format('update public.%I set active=true where id=$1',parent) using target;
  end loop;
  update public.years set active=false where id='audit_y2';
  r:=public.create_priced_order('a0130000-0000-4000-8000-000000000001','audit_bundle',false);
  if r->>'code'<>'product_unavailable' then raise exception 'unpublished second bundle year admitted'; end if;
end $$;
-- Orders admitted before unpublication retain recovery: snapshot settlement is unchanged.
do $$ declare r jsonb; oid text; begin
 r:=public.create_priced_order('a0130000-0000-4000-8000-000000000001','seed_product',false);oid:=r->>'order_id';
 update public.orders set razorpay_order_id='order_audit013' where id=oid;
 update public.chapters set active=false where id='seed_c';
 perform public.settle_razorpay_payment('evt_audit013','order_audit013','pay_audit013',4900,now());
 if not exists(select 1 from public.purchases where order_id=oid and status='success') then raise exception 'in-flight recovery broken'; end if;
end $$;
select 'PASS AUD-013 published scopes, all ancestors, second bundle year, no rejected insert, existing payment recovery';
rollback;

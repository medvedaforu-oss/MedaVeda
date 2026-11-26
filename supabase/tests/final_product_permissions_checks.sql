-- Only against a disposable fixture database; every row mutation rolls back.
begin;
insert into auth.users(id,email) values('a9110000-0000-4000-8000-000000000001','final-admin@example.invalid');
insert into public.admins(id,email) values('a9110000-0000-4000-8000-000000000001','final-admin@example.invalid');
update public.admin_settings set require_mfa=true;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a9110000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
do $$ declare r integer; original_price numeric; changed public.products;
begin
  assert has_table_privilege(current_user,'public.products','INSERT'), 'Admin INSERT grant missing';
  assert has_table_privilege(current_user,'public.products','DELETE'), 'Admin DELETE grant missing';
  assert has_function_privilege(current_user,'public.products_update(text,integer,jsonb)','EXECUTE'), 'Admin edit RPC grant missing';
  assert not has_table_privilege(current_user,'public.products','UPDATE'), 'Direct UPDATE must remain revoked';
  insert into public.products(id,title,scope,price,chapter_id,course_id,product_type,active)
    values('final_disposable_product','Admin fixture','chapter',0,'seed_c','bams','other',false);
  select revision,price into r,original_price from public.products where id='final_disposable_product';
  select * into changed from public.products_update('final_disposable_product',r,'{"title":"Edited fixture"}');
  assert changed.revision=r+1 and changed.title='Edited fixture' and changed.price=original_price;
  begin
    perform public.products_update('final_disposable_product',r,'{"title":"Stale fixture"}');
    raise exception 'Stale revision was accepted';
  exception when serialization_failure then null; end;
  delete from public.products where id='final_disposable_product';
  assert not exists(select 1 from public.products where id='final_disposable_product');
end $$;
-- Password-only Admin must still satisfy the switchable MFA requirement.
select set_config('request.jwt.claims','{"sub":"a9110000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
do $$ begin
  begin
    insert into public.products(id,title,scope,price,chapter_id,course_id) values('mfa_blocked','Denied','chapter',0,'seed_c','bams');
    raise exception 'MFA bypass on insert';
  exception when insufficient_privilege then null; end;
  begin
    perform public.products_update('seed_product',1,'{"title":"Denied"}');
    raise exception 'MFA bypass on RPC';
  exception when insufficient_privilege then null; end;
  delete from public.products where id='seed_product';
  assert not found, 'MFA bypass on delete';
end $$;
select set_config('request.jwt.claims','{"sub":"5eed0000-0000-0000-0000-00000000000b","role":"authenticated","aal":"aal2"}',true);
do $$ begin
  begin
    insert into public.products(id,title,scope,price,chapter_id,course_id) values('student_blocked','Denied','chapter',0,'seed_c','bams');
    raise exception 'Student inserted product';
  exception when insufficient_privilege then null; end;
  begin
    perform public.products_update('seed_product',1,'{"title":"Denied"}');
    raise exception 'Student edited product';
  exception when insufficient_privilege then null; end;
  delete from public.products where id='seed_product';
  assert not found, 'Student deleted product';
end $$;
set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$ begin
  assert not has_table_privilege(current_user,'public.products','INSERT');
  assert not has_table_privilege(current_user,'public.products','UPDATE');
  assert not has_table_privilege(current_user,'public.products','DELETE');
  assert not has_function_privilege(current_user,'public.products_update(text,integer,jsonb)','EXECUTE');
end $$;
rollback;
select 'PASS actual authenticated Admin CRUD, revision, stale conflict, student/anonymous denial and MFA enforcement';

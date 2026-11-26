-- MV-023: the SKU primary key supersedes the earlier SKU UNIQUE constraint.
-- Check catalog equivalence and dependencies at application time; fail closed
-- on drift. Never use CASCADE or touch price-tier rows or payment jobs.
begin;
set local lock_timeout='5s';
do $$
declare duplicate pg_index; retained pg_index; owned pg_constraint;
begin
  select * into duplicate from pg_index where indexrelid=to_regclass('public.play_price_tiers_play_sku_key');
  if not found then
    -- Idempotent replay is safe only when the required primary key still exists.
    if not exists(select 1 from pg_index where indexrelid=to_regclass('public.play_price_tiers_pkey')
      and indisprimary and indisvalid and indisunique) then
      raise exception 'Required Play SKU primary key missing';
    end if;
    return;
  end if;
  select * into retained from pg_index where indexrelid=to_regclass('public.play_price_tiers_pkey');
  if not found then raise exception 'Required Play SKU primary key missing'; end if;
  if not duplicate.indisunique or not retained.indisunique or not retained.indisprimary
     or not duplicate.indisvalid or not retained.indisvalid
     or not duplicate.indisready or not retained.indisready
     or not duplicate.indislive or not retained.indislive
     or duplicate.indisreplident or duplicate.indisclustered
     or duplicate.indisprimary or duplicate.indisexclusion or retained.indisexclusion
     or row(duplicate.indrelid,duplicate.indnatts,duplicate.indnkeyatts,
       duplicate.indkey,duplicate.indcollation,duplicate.indclass,duplicate.indoption,
       duplicate.indexprs::text,duplicate.indpred::text,duplicate.indimmediate,duplicate.indnullsnotdistinct)
       is distinct from row(retained.indrelid,retained.indnatts,retained.indnkeyatts,
       retained.indkey,retained.indcollation,retained.indclass,retained.indoption,
       retained.indexprs::text,retained.indpred::text,retained.indimmediate,retained.indnullsnotdistinct)
     or (select relam from pg_class where oid=duplicate.indexrelid)<>
        (select relam from pg_class where oid=retained.indexrelid)
     or duplicate.indrelid<>'public.play_price_tiers'::regclass
     or duplicate.indnatts<>1 or duplicate.indnkeyatts<>1
     or duplicate.indkey[0]<>(select attnum from pg_attribute
       where attrelid='public.play_price_tiers'::regclass and attname='play_sku')
     or duplicate.indexprs is not null or duplicate.indpred is not null then
    raise exception 'Play SKU indexes are not equivalent; retain both for review';
  end if;
  select * into owned from pg_constraint where conindid=duplicate.indexrelid
    and conrelid=duplicate.indrelid and conname='play_price_tiers_play_sku_key' and contype='u';
  if not found or owned.condeferrable or owned.condeferred then
    raise exception 'Unexpected Play SKU index ownership';
  end if;
  if exists(select 1 from pg_constraint where contype='f' and conindid=duplicate.indexrelid)
     or exists(select 1 from pg_depend where refclassid='pg_class'::regclass
       and refobjid=duplicate.indexrelid)
     or exists(select 1 from pg_depend where refclassid='pg_constraint'::regclass
       and refobjid=owned.oid and not (classid='pg_class'::regclass
         and objid=duplicate.indexrelid and deptype='i')) then
    raise exception 'Play SKU redundant constraint has dependents; retain for review';
  end if;
  alter table public.play_price_tiers drop constraint play_price_tiers_play_sku_key;
end $$;
commit;

CREATE OR REPLACE FUNCTION public.sync_profile_phone_normalized()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.phone_normalized := public.normalize_phone(new.phone);
  if (tg_op = 'INSERT' or new.phone is distinct from old.phone)
    and new.phone is not null
    and btrim(new.phone) <> ''
    and new.phone_normalized is null then
    raise exception 'phone must be a valid E.164 number';
  end if;
  return new;
end;
$function$
;

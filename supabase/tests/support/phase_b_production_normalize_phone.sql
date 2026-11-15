-- Local baseline fixture only: exact observed production function, not a migration.
CREATE OR REPLACE FUNCTION public.normalize_phone(input text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select case
    when input is null or btrim(input) = '' then null
    when regexp_replace(btrim(input), '[[:space:]().-]', '', 'g') ~ '^00[1-9][0-9]{7,14}$'
      then '+' || substr(regexp_replace(btrim(input), '[[:space:]().-]', '', 'g'), 3)
    when regexp_replace(btrim(input), '[[:space:]().-]', '', 'g') ~ '^\+[1-9][0-9]{7,14}$'
      then regexp_replace(btrim(input), '[[:space:]().-]', '', 'g')
    else null
  end;
$function$

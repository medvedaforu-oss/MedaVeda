-- Free-only release: an independent server authority; existing billing flags unchanged.
begin;
create table public.purchase_settings (
  id boolean primary key default true check (id),
  new_orders_enabled boolean not null default false
);
insert into public.purchase_settings(id, new_orders_enabled) values (true, false);
alter table public.purchase_settings enable row level security;
revoke all on public.purchase_settings from public, anon, authenticated;
grant select on public.purchase_settings to service_role;
comment on table public.purchase_settings is 'Owner SQL only. Keep disabled for free-only; never toggled by client.';
commit;

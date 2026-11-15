begin;
create table public.notification_requests (
 admin_id uuid not null references public.admins(id) on delete cascade,
 request_id uuid not null,
 status text not null check(status in('reserved','completed','unknown_outcome','enumeration_failed')),
 result jsonb not null,
 payload jsonb not null,
 created_at timestamptz not null default now(),
 primary key(admin_id,request_id)
);
alter table public.notification_requests enable row level security;
revoke all on public.notification_requests from public,anon,authenticated;
grant select,update on public.notification_requests to service_role;
create function public.reserve_notification_request(p_admin_id uuid,p_request_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare inserted integer; existing public.notification_requests%rowtype;
begin
 if not exists(select 1 from public.admins where id=p_admin_id) then raise exception 'Admin required' using errcode='42501'; end if;
 insert into public.notification_requests(admin_id,request_id,status,result,payload)
 values(p_admin_id,p_request_id,'reserved',jsonb_build_object('httpStatus',200,'body',jsonb_build_object('success',false,'code','unknown_outcome','unknown',1,'note','Push provider outcome unknown - check the feed before retrying.')),p_payload)
 on conflict do nothing;
 get diagnostics inserted=row_count;
 if inserted=0 then
  select * into strict existing from public.notification_requests where admin_id=p_admin_id and request_id=p_request_id;
  if existing.payload is distinct from p_payload then
   return jsonb_build_object('reserved',false,'result',jsonb_build_object('httpStatus',409,'body',jsonb_build_object('code','request_id_conflict','error','Request ID already belongs to another notification.')));
  end if;
  return jsonb_build_object('reserved',false,'result',existing.result);
 end if;
 -- Reservation and feed publication have one transaction commit point.
 insert into public.notifications(title,body,type,active)
 values(p_payload->>'title',p_payload->>'body',p_payload->>'type',true);
 return jsonb_build_object('reserved',true);
end $$;
revoke all on function public.reserve_notification_request(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.reserve_notification_request(uuid,uuid,jsonb) to service_role;
commit;

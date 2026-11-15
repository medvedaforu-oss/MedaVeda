begin;
create function public.get_my_verified_quiz_stats()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb; uid uuid:=auth.uid();
begin
 if uid is null or not exists(select 1 from public.profiles where id=uid and not coalesce(blocked,false)) then
  raise exception 'Account unavailable' using errcode='42501';
 end if;
 with owned as materialized(select id,percentage,created_at,test_id,test_title,score,total from public.verified_quiz_attempts where user_id=uid),
 recent as(select * from owned order by created_at desc,id desc limit 5)
 select jsonb_build_object('totalAttempts',count(*),'averagePercentage',coalesce(round(avg(percentage)),0),
 'bestScore',coalesce(max(percentage),0),'recentQuiz',(select coalesce(jsonb_agg(to_jsonb(r) order by created_at desc,id desc),'[]'::jsonb) from recent r))
 into result from owned;
 return result;
end $$;
revoke all on function public.get_my_verified_quiz_stats() from public,anon;
grant execute on function public.get_my_verified_quiz_stats() to authenticated;

create function public.get_admin_analytics(p_course_id text default null)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
 if not public.am_i_admin() then raise exception 'Admin MFA authorization required' using errcode='42501'; end if;
 with owned as materialized(select o.id,o.product_id,o.amount,o.status,p.title from public.orders o left join public.products p on p.id=o.product_id where p_course_id is null or p_course_id='' or o.course_id=p_course_id),
 top_products as(select coalesce(product_id,'unknown') as "productId",coalesce(max(title),'Untitled') as "productTitle",count(*) as orders,sum(round(amount*100))/100 as revenue from owned where status='paid' group by product_id order by revenue desc,coalesce(product_id,'unknown') limit 5)
 select jsonb_build_object('totalRevenue',coalesce(sum(round(amount*100)) filter(where status='paid'),0)/100,
 'totalOrders',count(*),'paidOrders',count(*) filter(where status='paid'),'pendingOrders',count(*) filter(where status='created'),
 'failedOrders',count(*) filter(where status='failed'),'refundedOrders',count(*) filter(where status='refunded'),
 'totalUsers',(select count(*) from public.profiles where p_course_id is null or p_course_id='' or course_id=p_course_id),
 'totalProducts',(select count(*) from public.products where p_course_id is null or p_course_id='' or course_id=p_course_id),
 'topProducts',(select coalesce(jsonb_agg(to_jsonb(t) order by revenue desc,"productId"),'[]'::jsonb) from top_products t))
 into result from owned;
 return result;
end $$;
revoke all on function public.get_admin_analytics(text) from public,anon;
grant execute on function public.get_admin_analytics(text) to authenticated;
commit;

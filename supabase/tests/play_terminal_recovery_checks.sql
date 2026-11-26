-- Retained duplicate-settlement regression, scoped to its buyer because Phase C
-- also retains historical successes belonging to other synthetic accounts.
begin;
do $$
declare j record; first_order jsonb; second_order jsonb; result jsonb;
begin
  select * into j from public.claim_play_price_sync();
  assert public.finish_play_price_sync(49,j.lease_id,j.candidate_sku,'buy');
  first_order:=public.create_play_order('5eed0000-0000-0000-0000-00000000000b','seed_product');
  second_order:=public.create_play_order('5eed0000-0000-0000-0000-00000000000b','seed_product');
  result:=public.settle_play_purchase('5eed0000-0000-0000-0000-00000000000b',
    first_order->>'order_id','seed_product',j.candidate_sku,'qa-first-duplicate-token',now());
  assert (result->>'ok')::boolean and not (result->>'duplicate')::boolean;
  result:=public.settle_play_purchase('5eed0000-0000-0000-0000-00000000000b',
    second_order->>'order_id','seed_product',j.candidate_sku,'qa-second-duplicate-token',now());
  assert (result->>'ok')::boolean and (result->>'duplicate')::boolean;
  result:=public.settle_play_purchase('5eed0000-0000-0000-0000-00000000000b',
    second_order->>'order_id','seed_product',j.candidate_sku,'qa-second-duplicate-token',now());
  assert (result->>'already_settled')::boolean and coalesce((result->>'duplicate')::boolean,false),
    'duplicate purchase replay was reported as ordinary success';
  assert public.play_duplicate_recorded(second_order->>'order_id','qa-second-duplicate-token'), 'duplicate disposition missing';
  assert not public.play_entitlement_committed(second_order->>'order_id','qa-second-duplicate-token'), 'duplicate fabricated an entitlement';
  assert not public.play_duplicate_recorded(first_order->>'order_id','qa-first-duplicate-token'), 'ordinary grant classified duplicate';
  assert not public.play_duplicate_recorded(second_order->>'order_id','foreign-token'), 'token ownership ignored';
  perform set_config('request.jwt.claim.sub','5eed0000-0000-0000-0000-00000000000b',true);
  result:=public.get_my_play_fulfillment(second_order->>'order_id');
  assert result->>'terminal'='true' and result->>'outcome'='duplicate'
    and result->>'internalOrderId'=second_order->>'order_id' and result->>'success'='false', 'duplicate remains pending';
  perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
  result:=public.get_my_play_fulfillment(second_order->>'order_id');
  assert result->>'pending'='true' and result->>'terminal' is null, 'foreign account learned disposition';
  assert not has_function_privilege('authenticated','public.play_duplicate_recorded(text,text)','EXECUTE'), 'duplicate proof publicly callable';
  assert not has_function_privilege('anon','public.play_duplicate_recorded(text,text)','EXECUTE'), 'duplicate proof anon callable';
  assert (select count(*)=1 from public.purchases where product_id='seed_product' and user_id='5eed0000-0000-0000-0000-00000000000b' and status='success'),
    'duplicate created another entitlement';
end $$;
rollback;

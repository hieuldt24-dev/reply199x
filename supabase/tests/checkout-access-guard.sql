-- Executed by scripts/test-checkout-guard-db.mjs against its disposable PostgreSQL.
-- Structural assertions complement behavioral calls from the service_role tests.
do $$
declare
  v_now timestamptz := clock_timestamp();
  v_lower timestamptz := v_now - interval '1 hour';
  v_order_deadline timestamptz;
  v_link_deadline timestamptz;
begin
  for v_order_deadline, v_link_deadline in
    select * from (values
      (v_lower, v_lower),
      (v_lower - interval '1 microsecond', v_lower),
      (v_lower, v_now + interval '1 minute'),
      (v_now + interval '1 minute', v_lower),
      (v_now, v_now),
      (v_now + interval '1 microsecond', v_now + interval '1 minute')
    ) as boundaries(order_deadline, link_deadline)
  loop
    if ((least(v_order_deadline, v_link_deadline) between v_lower and v_now)
        is distinct from
        (v_order_deadline >= v_lower and v_link_deadline >= v_lower
         and least(v_order_deadline, v_link_deadline) <= v_now)) then
      raise exception 'coarse lower bounds changed the exact inclusive eligibility range';
    end if;
  end loop;
end;
$$;

do $$
begin
  if not has_function_privilege('service_role', 'public.create_ticket_order_v4(uuid,uuid,text,text,text,text,integer,integer,text)', 'execute') then
    raise exception 'service_role cannot execute guarded checkout RPC';
  end if;
  if has_function_privilege('anon', 'public.create_ticket_order_v4(uuid,uuid,text,text,text,text,integer,integer,text)', 'execute')
     or has_function_privilege('authenticated', 'public.create_ticket_order_v4(uuid,uuid,text,text,text,text,integer,integer,text)', 'execute') then
    raise exception 'client role can execute guarded checkout RPC';
  end if;
  if not has_function_privilege('service_role', 'public.create_ticket_order_v5(uuid,uuid,text,text,text,text,integer,integer,text)', 'execute') then
    raise exception 'service_role cannot execute combined checkout RPC';
  end if;
  if has_function_privilege('anon', 'public.create_ticket_order_v5(uuid,uuid,text,text,text,text,integer,integer,text)', 'execute')
     or has_function_privilege('authenticated', 'public.create_ticket_order_v5(uuid,uuid,text,text,text,text,integer,integer,text)', 'execute') then
    raise exception 'client role can execute combined checkout RPC';
  end if;
  if not exists (
    select 1 from pg_proc p
    where p.oid='public.create_ticket_order_v5(uuid,uuid,text,text,text,text,integer,integer,text)'::regprocedure
      and p.prosecdef and coalesce(p.proconfig,'{}') @> array['search_path=""']
  ) then
    raise exception 'combined checkout RPC must be SECURITY DEFINER with an empty search_path';
  end if;
  if has_function_privilege('service_role', 'public.create_ticket_order_v3(uuid,uuid,text,text,text,text,integer,integer,text)', 'execute') then
    raise exception 'service_role can bypass guarded checkout through legacy RPC';
  end if;
  if not exists (
    select 1 from pg_class
    where oid='public.checkout_access_state'::regclass and relrowsecurity
  ) then
    raise exception 'checkout access state must use row-level security';
  end if;
  if has_table_privilege('anon', 'public.checkout_access_state', 'select')
     or has_table_privilege('authenticated', 'public.checkout_access_state', 'select') then
    raise exception 'client role can read private checkout access state';
  end if;
  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='orders_checkout_access_idx'
      and indexdef like '%(user_id, payment_expires_at)%'
      and indexdef like '%WHERE (status = ANY (ARRAY[''pending_payment''%'
  ) then
    raise exception 'bounded checkout candidate index is missing or has the wrong predicate';
  end if;
  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='payos_payment_events_guard_lookup_idx'
      and indexdef like '%(order_code)%'
      and indexdef like '%processing_status%'
  ) then
    raise exception 'checkout evidence anti-join index is missing or has the wrong columns';
  end if;
end;
$$;

-- 202611190001: 10-minute checkout deadline structural assertions.
do $$
declare
  v_default text;
  v_def text;
  v_secdef boolean;
  v_config text[];
begin
  select column_default into v_default from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='payment_expires_at';
  if v_default is null or v_default not like '%00:10:00%' or v_default like '%00:05:00%' then
    raise exception 'orders.payment_expires_at default must be now() + 10 minutes (got %)', v_default;
  end if;
  select pg_get_functiondef(p.oid), p.prosecdef, p.proconfig into v_def, v_secdef, v_config
    from pg_proc p where p.oid = 'public.prepare_payos_checkout(uuid,uuid,text,text)'::regprocedure;
  if v_def not like '%interval ''10 minutes''%' or v_def like '%interval ''5 minutes''%' then
    raise exception 'prepare_payos_checkout link expiry must use interval ''10 minutes''';
  end if;
  if v_def not like '%interval ''60 seconds''%' then
    raise exception 'prepare_payos_checkout must keep the 60 second creation lease';
  end if;
  if v_secdef is not true or v_config is null or not ('search_path=""' = any(v_config)) then
    raise exception 'prepare_payos_checkout must be security definer with an empty search_path (got %)', v_config;
  end if;
end;
$$;

do $$ begin raise notice 'SENTINEL checkout-access-guard.sql'; end $$;

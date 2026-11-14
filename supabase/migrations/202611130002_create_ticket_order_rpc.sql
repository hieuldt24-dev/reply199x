-- Atomic, idempotent order creation. This is service-role only; call from a
-- server route after verifying the Supabase Auth user.
create or replace function public.create_ticket_order(
  p_user_id uuid,
  p_idempotency_key uuid,
  p_drink_ids uuid[]
)
returns table (
  order_id uuid,
  quantity smallint,
  unit_price_vnd integer,
  total_vnd integer,
  order_status public.ticket_order_status,
  reused boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quantity integer;
  v_fingerprint text;
  v_order_id uuid;
  v_inserted boolean := false;
  v_order public.orders%rowtype;
  v_active_count integer;
begin
  if p_user_id is null or p_idempotency_key is null or p_drink_ids is null then
    raise exception 'invalid_order_request' using errcode = '22023';
  end if;

  v_quantity := cardinality(p_drink_ids);
  if v_quantity < 1 or v_quantity > 4 then
    raise exception 'invalid_order_quantity' using errcode = '22023';
  end if;

  select count(*) into v_active_count
  from unnest(p_drink_ids) as requested(drink_id)
  join public.drink_menu menu on menu.id = requested.drink_id and menu.active;

  if v_active_count <> v_quantity then
    raise exception 'invalid_or_inactive_drink' using errcode = '22023';
  end if;

  v_fingerprint := encode(
    extensions.digest(
      convert_to(jsonb_build_object('drink_ids', to_jsonb(p_drink_ids))::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  insert into public.orders (user_id, idempotency_key, request_fingerprint, quantity)
  values (p_user_id, p_idempotency_key, v_fingerprint, v_quantity)
  on conflict (user_id, idempotency_key) do nothing
  returning id into v_order_id;

  v_inserted := found;
  if not v_inserted then
    select o.* into v_order from public.orders o
    where o.user_id = p_user_id and o.idempotency_key = p_idempotency_key
    for update;

    if not found then
      raise exception 'order_idempotency_race' using errcode = '40001';
    end if;
    if v_order.request_fingerprint <> v_fingerprint then
      raise exception 'idempotency_payload_conflict' using errcode = '23505';
    end if;
    v_order_id := v_order.id;
  else
    insert into public.order_items (order_id, ticket_number, drink_id)
    select v_order_id, requested.ordinality::smallint, requested.drink_id
    from unnest(p_drink_ids) with ordinality as requested(drink_id, ordinality);
    select o.* into v_order from public.orders o where o.id = v_order_id;
  end if;

  return query select v_order.id, v_order.quantity, v_order.unit_price_vnd,
    v_order.total_vnd, v_order.status, not v_inserted;
end;
$$;

revoke all on function public.create_ticket_order(uuid, uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.create_ticket_order(uuid, uuid, uuid[]) to service_role;

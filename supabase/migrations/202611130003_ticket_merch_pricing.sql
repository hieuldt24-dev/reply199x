-- User-confirmed pricing correction: each ticket is 169,000 VND including a
-- drink; one optional merch combo is selected for the whole order.
-- Additive migration: preserve the already-created drink catalog and historic
-- order item data while making drink_id optional for new ticket rows.

alter table public.order_items alter column drink_id drop not null;

alter table public.orders
  add column if not exists merch_option text not null default 'none',
  add column if not exists merch_price_vnd integer not null default 0;

alter table public.orders drop constraint if exists orders_merch_option_price_check;
alter table public.orders add constraint orders_merch_option_price_check check (
  (merch_option = 'none' and merch_price_vnd = 0)
  or (merch_option = 'tuoi-xi-tin' and merch_price_vnd = 99000)
  or (merch_option = 'tuoi-xi-lay' and merch_price_vnd = 169000)
);

alter table public.orders drop column total_vnd;
alter table public.orders add column total_vnd integer
  generated always as (quantity * unit_price_vnd + merch_price_vnd) stored;

create or replace function public.create_ticket_order_v2(
  p_user_id uuid,
  p_idempotency_key uuid,
  p_quantity integer,
  p_merch_option text
)
returns table (
  order_id uuid,
  quantity smallint,
  unit_price_vnd integer,
  merch_option text,
  merch_price_vnd integer,
  ticket_subtotal_vnd integer,
  total_vnd integer,
  order_status public.ticket_order_status,
  reused boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_merch_price integer;
  v_fingerprint text;
  v_order_id uuid;
  v_inserted boolean := false;
  v_order public.orders%rowtype;
begin
  if p_user_id is null or p_idempotency_key is null or p_quantity is null or p_merch_option is null then
    raise exception 'invalid_order_request' using errcode = '22023';
  end if;
  if p_quantity < 1 or p_quantity > 4 then
    raise exception 'invalid_order_quantity' using errcode = '22023';
  end if;

  v_merch_price := case p_merch_option
    when 'none' then 0
    when 'tuoi-xi-tin' then 99000
    when 'tuoi-xi-lay' then 169000
    else null
  end;
  if v_merch_price is null then
    raise exception 'invalid_merch_option' using errcode = '22023';
  end if;

  v_fingerprint := encode(extensions.digest(
    convert_to(jsonb_build_object('quantity', p_quantity, 'merch_option', p_merch_option)::text, 'UTF8'),
    'sha256'
  ), 'hex');

  insert into public.orders (user_id, idempotency_key, request_fingerprint, quantity, merch_option, merch_price_vnd)
  values (p_user_id, p_idempotency_key, v_fingerprint, p_quantity, p_merch_option, v_merch_price)
  on conflict (user_id, idempotency_key) do nothing
  returning id into v_order_id;

  v_inserted := found;
  if not v_inserted then
    select o.* into v_order from public.orders o
    where o.user_id = p_user_id and o.idempotency_key = p_idempotency_key
    for update;
    if not found then raise exception 'order_idempotency_race' using errcode = '40001'; end if;
    if v_order.request_fingerprint <> v_fingerprint then
      raise exception 'idempotency_payload_conflict' using errcode = '23505';
    end if;
    v_order_id := v_order.id;
  else
    insert into public.order_items (order_id, ticket_number)
    select v_order_id, series.ticket_number::smallint
    from generate_series(1, p_quantity) as series(ticket_number);
    select o.* into v_order from public.orders o where o.id = v_order_id;
  end if;

  return query select v_order.id, v_order.quantity, v_order.unit_price_vnd,
    v_order.merch_option, v_order.merch_price_vnd,
    v_order.quantity * v_order.unit_price_vnd, v_order.total_vnd,
    v_order.status, not v_inserted;
end;
$$;

revoke all on function public.create_ticket_order_v2(uuid, uuid, integer, text) from public, anon, authenticated;
grant execute on function public.create_ticket_order_v2(uuid, uuid, integer, text) to service_role;

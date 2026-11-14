-- SePay hosted checkout and IPN processing. Additive; migrations 001-003 may
-- already be applied. The IPN handler stores normalized evidence only: the
-- provider payload can contain card details and must not be retained wholesale.

create unique index if not exists payment_transactions_one_pending_per_order_idx
  on public.payment_transactions (order_id)
  where status = 'pending';

create or replace function public.prepare_sepay_checkout(
  p_order_id uuid,
  p_user_id uuid,
  p_provider_reference text
)
returns table (
  order_id uuid,
  provider_reference text,
  amount_vnd integer,
  currency text,
  payment_status text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_payment public.payment_transactions%rowtype;
  v_expected_reference text;
begin
  if p_order_id is null or p_user_id is null or p_provider_reference is null then
    raise exception 'invalid_checkout_request' using errcode = '22023';
  end if;
  v_expected_reference := 'REPLY199X-' || p_order_id::text;
  if p_provider_reference <> v_expected_reference then
    raise exception 'invalid_checkout_reference' using errcode = '22023';
  end if;

  select o.* into v_order
  from public.orders o
  where o.id = p_order_id and o.user_id = p_user_id
  for update;
  if not found then raise exception 'order_not_found' using errcode = 'P0002'; end if;

  if v_order.status <> 'pending_payment' then
    return query select v_order.id, p_provider_reference, v_order.total_vnd,
      'VND'::text, v_order.status::text, v_order.payment_expires_at;
    return;
  end if;

  select pt.* into v_payment
  from public.payment_transactions pt
  where pt.order_id = v_order.id and pt.provider = 'sepay'
  order by pt.created_at desc
  limit 1
  for update;

  if found then
    if v_payment.provider_reference <> p_provider_reference
      or v_payment.amount_vnd <> v_order.total_vnd
      or v_payment.currency <> 'VND' then
      raise exception 'payment_order_mismatch' using errcode = '23514';
    end if;
    if v_payment.status = 'pending' and v_payment.expires_at <= now() then
      update public.payment_transactions set status = 'expired', updated_at = now() where id = v_payment.id;
      update public.orders set status = 'expired', updated_at = now()
        where id = v_order.id and status = 'pending_payment';
      return query select v_order.id, v_payment.provider_reference,
        v_payment.amount_vnd, v_payment.currency, 'expired'::text, v_payment.expires_at;
      return;
    end if;
    return query select v_order.id, v_payment.provider_reference,
      v_payment.amount_vnd, v_payment.currency, v_payment.status, v_payment.expires_at;
    return;
  end if;

  if v_order.payment_expires_at <= now() then
    update public.orders set status = 'expired', updated_at = now() where id = v_order.id;
    return query select v_order.id, p_provider_reference, v_order.total_vnd,
      'VND'::text, 'expired'::text, v_order.payment_expires_at;
    return;
  end if;

  insert into public.payment_transactions (
    order_id, provider, provider_reference, amount_vnd, currency, status, expires_at
  ) values (
    v_order.id, 'sepay', p_provider_reference, v_order.total_vnd, 'VND',
    'pending', v_order.payment_expires_at
  ) returning * into v_payment;

  return query select v_order.id, v_payment.provider_reference,
    v_payment.amount_vnd, v_payment.currency, v_payment.status, v_payment.expires_at;
end;
$$;

create or replace function public.process_sepay_gateway_ipn(
  p_provider_event_id text,
  p_provider_transaction_id text,
  p_provider_reference text,
  p_notification_type text,
  p_order_status text,
  p_order_currency text,
  p_order_amount_vnd integer,
  p_transaction_status text,
  p_transaction_currency text,
  p_transaction_amount_vnd integer
)
returns table (result text, order_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payment_transactions%rowtype;
  v_order public.orders%rowtype;
  v_order_id uuid;
  v_inserted boolean;
  v_valid_paid boolean;
begin
  if p_provider_event_id is null or char_length(p_provider_event_id) > 180
    or p_provider_transaction_id is null or char_length(p_provider_transaction_id) > 120
    or p_provider_reference is null or char_length(p_provider_reference) > 80
    or p_notification_type not in ('ORDER_PAID', 'TRANSACTION_VOID') then
    raise exception 'invalid_ipn_request' using errcode = '22023';
  end if;

  insert into public.payment_events (
    provider, provider_event_id, provider_transaction_id, amount_vnd, processing_status
  ) values (
    'sepay', p_provider_event_id, p_provider_transaction_id,
    p_transaction_amount_vnd, 'received'
  ) on conflict (provider_event_id) do nothing;
  v_inserted := found;
  if not v_inserted then
    return query select 'duplicate'::text, null::uuid;
    return;
  end if;

  select pt.order_id into v_order_id
  from public.payment_transactions pt
  where pt.provider = 'sepay' and pt.provider_reference = p_provider_reference;
  if not found then
    update public.payment_events
      set processing_status = 'reconciliation', processed_at = now(), failure_code = 'unknown_reference'
      where provider_event_id = p_provider_event_id;
    return query select 'reconciliation'::text, null::uuid;
    return;
  end if;

  -- Lock order before payment rows; prepare/expiry use the same lock order.
  select o.* into v_order from public.orders o where o.id = v_order_id for update;
  if not found then raise exception 'payment_order_missing' using errcode = 'P0002'; end if;
  select pt.* into v_payment
  from public.payment_transactions pt
  where pt.provider = 'sepay' and pt.provider_reference = p_provider_reference
  for update;
  if not found then raise exception 'payment_missing' using errcode = 'P0002'; end if;

  update public.payment_events set order_id = v_order.id where provider_event_id = p_provider_event_id;

  if p_notification_type = 'TRANSACTION_VOID' then
    if v_payment.status = 'pending' and v_order.status = 'pending_payment' then
      update public.payment_transactions
        set status = 'failed', updated_at = now()
        where id = v_payment.id;
      update public.orders set status = 'failed', updated_at = now() where id = v_order.id;
      update public.payment_events
        set processing_status = 'processed', processed_at = now()
        where provider_event_id = p_provider_event_id;
      return query select 'failed'::text, v_order.id;
      return;
    end if;
    update public.payment_events
      set processing_status = 'ignored', processed_at = now(), failure_code = 'void_after_terminal_state'
      where provider_event_id = p_provider_event_id;
    return query select 'ignored'::text, v_order.id;
    return;
  end if;

  v_valid_paid := p_order_status = 'CAPTURED'
    and p_transaction_status = 'APPROVED'
    and p_order_currency = 'VND'
    and p_transaction_currency = 'VND'
    and p_order_amount_vnd = v_payment.amount_vnd
    and p_transaction_amount_vnd = v_payment.amount_vnd
    and v_payment.currency = 'VND';

  if exists (
    select 1 from public.payment_transactions pt
    where pt.provider = 'sepay' and pt.provider_transaction_id = p_provider_transaction_id
      and pt.id <> v_payment.id
  ) then
    update public.payment_events set processing_status = 'reconciliation',
      processed_at = now(), failure_code = 'transaction_reused'
      where provider_event_id = p_provider_event_id;
    update public.payment_transactions set status = 'reconciliation', updated_at = now()
      where id = v_payment.id and status = 'pending';
    update public.orders set status = 'reconciliation', updated_at = now()
      where id = v_order.id and status = 'pending_payment';
    return query select 'reconciliation'::text, v_order.id;
    return;
  end if;

  if not v_valid_paid then
    if v_payment.status = 'paid' or v_order.status = 'paid' then
      update public.payment_events
        set processing_status = 'reconciliation', processed_at = now(), failure_code = 'paid_event_mismatch'
        where provider_event_id = p_provider_event_id;
      return query select 'reconciliation'::text, v_order.id;
      return;
    end if;
    update public.payment_transactions set status = 'reconciliation',
      updated_at = now()
      where id = v_payment.id;
    update public.orders set status = 'reconciliation', updated_at = now()
      where id = v_order.id and status = 'pending_payment';
    update public.payment_events
      set processing_status = 'reconciliation', processed_at = now(), failure_code = 'payment_data_mismatch'
      where provider_event_id = p_provider_event_id;
    return query select 'reconciliation'::text, v_order.id;
    return;
  end if;

  if v_payment.status = 'paid' and v_order.status = 'paid'
    and v_payment.provider_transaction_id = p_provider_transaction_id then
    update public.payment_events set processing_status = 'processed', processed_at = now()
      where provider_event_id = p_provider_event_id;
    return query select 'duplicate'::text, v_order.id;
    return;
  end if;

  if v_payment.status <> 'pending' or v_order.status <> 'pending_payment'
    or v_payment.expires_at <= now() then
    update public.payment_transactions set status = 'reconciliation',
      updated_at = now()
      where id = v_payment.id and status <> 'paid';
    update public.orders set status = 'reconciliation', updated_at = now()
      where id = v_order.id and status in ('pending_payment', 'expired', 'failed');
    update public.payment_events
      set processing_status = 'reconciliation', processed_at = now(), failure_code = 'late_or_terminal_payment'
      where provider_event_id = p_provider_event_id;
    return query select 'reconciliation'::text, v_order.id;
    return;
  end if;

  update public.payment_transactions set status = 'paid',
    provider_transaction_id = p_provider_transaction_id, paid_at = now(), updated_at = now()
    where id = v_payment.id;
  update public.orders set status = 'paid', updated_at = now() where id = v_order.id;
  insert into public.sheet_sync_outbox (order_id, event_key)
    values (v_order.id, 'paid') on conflict (order_id, event_key) do nothing;
  update public.payment_events set processing_status = 'processed', processed_at = now()
    where provider_event_id = p_provider_event_id;

  return query select 'paid'::text, v_order.id;
end;
$$;

create or replace function public.expire_sepay_checkout(p_order_id uuid, p_user_id uuid)
returns table (order_status public.ticket_order_status)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  select o.* into v_order from public.orders o
  where o.id = p_order_id and o.user_id = p_user_id
  for update;
  if not found then raise exception 'order_not_found' using errcode = 'P0002'; end if;

  if v_order.status = 'pending_payment' and v_order.payment_expires_at <= now() then
    update public.payment_transactions set status = 'expired', updated_at = now()
      where order_id = v_order.id and provider = 'sepay' and status = 'pending';
    update public.orders set status = 'expired', updated_at = now() where id = v_order.id;
    return query select 'expired'::public.ticket_order_status;
    return;
  end if;
  return query select v_order.status;
end;
$$;

revoke all on function public.prepare_sepay_checkout(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.process_sepay_gateway_ipn(text, text, text, text, text, text, integer, text, text, integer) from public, anon, authenticated;
revoke all on function public.expire_sepay_checkout(uuid, uuid) from public, anon, authenticated;
grant execute on function public.prepare_sepay_checkout(uuid, uuid, text) to service_role;
grant execute on function public.process_sepay_gateway_ipn(text, text, text, text, text, text, integer, text, text, integer) to service_role;
grant execute on function public.expire_sepay_checkout(uuid, uuid) to service_role;

-- Coordinate rollout with checkout disabled: install v4 before deploying its caller.
create table public.checkout_access_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  blocked_until timestamptz,
  consumed_through timestamptz
);
alter table public.checkout_access_state enable row level security;
revoke all on public.checkout_access_state from public, anon, authenticated;
grant select, insert, update on public.checkout_access_state to service_role;

-- NULL deliberately preserves uncertainty about historical checkouts.
alter table public.payos_payment_links add column checkout_issued_at timestamptz;
create index orders_checkout_access_idx on public.orders(user_id, payment_expires_at)
  where status in ('pending_payment', 'expired');

create function public.create_ticket_order_v4(
  p_user_id uuid, p_idempotency_key uuid, p_attendee_name text,
  p_attendee_email text, p_attendee_phone text, p_attendee_gender text,
  p_attendee_birth_year integer, p_quantity integer, p_merch_option text
)
returns table (
  order_id uuid, quantity smallint, unit_price_vnd integer, merch_option text,
  merch_price_vnd integer, ticket_subtotal_vnd integer, total_vnd integer,
  order_status public.ticket_order_status, reused boolean, blocked_until timestamptz
)
language plpgsql security definer set search_path = '' as $$
declare
  v_state public.checkout_access_state%rowtype;
  v_now timestamptz;
  v_strikes integer;
begin
  if p_user_id is null or p_idempotency_key is null then
    raise exception 'invalid_order_request' using errcode = '22023';
  end if;
  insert into public.checkout_access_state(user_id) values(p_user_id)
    on conflict (user_id) do nothing;
  select s.* into v_state from public.checkout_access_state s
    where s.user_id = p_user_id for update;
  v_now := clock_timestamp();

  -- Replays are still validated by v3 (including normalized payload fingerprint).
  -- Account serialization makes same-key and distinct-key requests consistent.
  if exists(select 1 from public.orders o where o.user_id=p_user_id and o.idempotency_key=p_idempotency_key) then
    return query select r.*, null::timestamptz from public.create_ticket_order_v3(
      p_user_id,p_idempotency_key,p_attendee_name,p_attendee_email,p_attendee_phone,
      p_attendee_gender,p_attendee_birth_year,p_quantity,p_merch_option) r;
    return;
  end if;
  if v_state.blocked_until > v_now then
    return query select null::uuid,null::smallint,null::integer,null::text,
      null::integer,null::integer,null::integer,null::public.ticket_order_status,
      false,v_state.blocked_until;
    return;
  end if;

  -- Match payment lifecycle ordering: account -> orders (stable IDs) -> links.
  -- Lock all potential recent candidates before evaluating their current states.
  perform o.id from public.orders o join public.payos_payment_links p on p.order_id=o.id
    where o.user_id=p_user_id and least(p.expires_at,o.payment_expires_at) >= v_now-interval '1 hour'
      and least(p.expires_at,o.payment_expires_at) <= v_now
      and (v_state.consumed_through is null or least(p.expires_at,o.payment_expires_at)>v_state.consumed_through)
    order by o.id for update of o;
  perform p.order_code from public.payos_payment_links p join public.orders o on o.id=p.order_id
    where o.user_id=p_user_id and least(p.expires_at,o.payment_expires_at) >= v_now-interval '1 hour'
      and least(p.expires_at,o.payment_expires_at) <= v_now
      and (v_state.consumed_through is null or least(p.expires_at,o.payment_expires_at)>v_state.consumed_through)
    order by o.id for update of p;
  select count(*) into v_strikes
    from public.orders o join public.payos_payment_links p on p.order_id=o.id
    where o.user_id=p_user_id and o.status in ('pending_payment','expired')
      and p.status in ('pending','expired')
      and p.checkout_issued_at is not null
      and p.checkout_issued_at < least(p.expires_at,o.payment_expires_at)
      and p.payment_link_id is not null and p.checkout_url is not null
      and p.paid_at is null and p.transaction_reference is null
      and least(p.expires_at,o.payment_expires_at) between v_now-interval '1 hour' and v_now
      and (v_state.consumed_through is null or least(p.expires_at,o.payment_expires_at)>v_state.consumed_through)
      and not exists(select 1 from public.payos_payment_events e where e.order_code=p.order_code
        and e.processing_status in ('received','processed','reconciliation'))
      and not exists(select 1 from public.payment_transactions t where t.order_id=o.id
        and (t.status in ('paid','reconciliation','refunded') or t.paid_at is not null or t.provider_transaction_id is not null));
  if v_strikes >= 3 then
    update public.checkout_access_state s set blocked_until=v_now+interval '24 hours',consumed_through=v_now
      where s.user_id=p_user_id returning s.* into v_state;
    -- A normal result is essential: throwing would roll back the restriction.
    return query select null::uuid,null::smallint,null::integer,null::text,
      null::integer,null::integer,null::integer,null::public.ticket_order_status,
      false,v_state.blocked_until;
    return;
  end if;
  return query select r.*,null::timestamptz from public.create_ticket_order_v3(
    p_user_id,p_idempotency_key,p_attendee_name,p_attendee_email,p_attendee_phone,
    p_attendee_gender,p_attendee_birth_year,p_quantity,p_merch_option) r;
end; $$;

revoke all on function public.create_ticket_order_v3(uuid,uuid,text,text,text,text,integer,integer,text) from public,anon,authenticated,service_role;
revoke all on function public.create_ticket_order_v4(uuid,uuid,text,text,text,text,integer,integer,text) from public,anon,authenticated;
grant execute on function public.create_ticket_order_v4(uuid,uuid,text,text,text,text,integer,integer,text) to service_role;

create or replace function public.prepare_payos_checkout(p_order_id uuid, p_user_id uuid, p_payment_link_id text default null, p_checkout_url text default null)
returns table (order_code integer, order_id uuid, amount_vnd integer, currency text, payment_status text, expires_at timestamptz, payment_link_id text, checkout_url text, can_create boolean, can_reconcile boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  v_link public.payos_payment_links%rowtype;
  v_new_code integer;
  v_now timestamptz;
begin
  select o.* into v_order from public.orders o where o.id=p_order_id and o.user_id=p_user_id for update;
  if not found then raise exception 'order_not_found' using errcode='P0002'; end if;
  select p.* into v_link from public.payos_payment_links p where p.order_id=p_order_id for update;
  if found then
    v_now := clock_timestamp();
    if v_link.amount_vnd <> v_order.total_vnd or v_link.currency <> 'VND' then raise exception 'payment_order_mismatch' using errcode='23514'; end if;
    if p_payment_link_id is not null and v_link.payment_link_id is null then
      update public.payos_payment_links as p set payment_link_id=p_payment_link_id, checkout_url=p_checkout_url, creation_lease_until=null,
        checkout_issued_at=case when v_order.status='pending_payment' and p.status='pending'
          and p_checkout_url is not null and least(p.expires_at,v_order.payment_expires_at)>v_now
          then v_now else null end, updated_at=v_now
        where p.order_id=p_order_id returning p.* into v_link;
    end if;
    if p_payment_link_id is not null or v_link.checkout_url is not null then
      return query select v_link.order_code,v_link.order_id,v_link.amount_vnd,v_link.currency,v_link.status,v_link.expires_at,v_link.payment_link_id,v_link.checkout_url,false,false;
      return;
    end if;
    if v_link.creation_lease_until is not null and v_link.creation_lease_until > v_now then
      return query select v_link.order_code,v_link.order_id,v_link.amount_vnd,v_link.currency,v_link.status,v_link.expires_at,v_link.payment_link_id,v_link.checkout_url,false,false;
      return;
    end if;
    if v_link.creation_attempted then
      return query select v_link.order_code,v_link.order_id,v_link.amount_vnd,v_link.currency,v_link.status,v_link.expires_at,v_link.payment_link_id,v_link.checkout_url,false,true;
      return;
    end if;
    update public.payos_payment_links as p set creation_lease_until=v_now+interval '60 seconds',creation_attempted=true,updated_at=v_now
      where p.order_code=v_link.order_code returning p.* into v_link;
    return query select v_link.order_code,v_link.order_id,v_link.amount_vnd,v_link.currency,v_link.status,v_link.expires_at,v_link.payment_link_id,v_link.checkout_url,true,false;
    return;
  end if;
  v_now := clock_timestamp();
  if v_order.status <> 'pending_payment' or v_order.payment_expires_at <= v_now then raise exception 'order_not_payable' using errcode='23514'; end if;
  v_new_code := nextval('public.payos_order_code_seq');
  insert into public.payos_payment_links as p(order_code,order_id,amount_vnd,currency,expires_at,payment_link_id,checkout_url,creation_lease_until,creation_attempted,checkout_issued_at)
    values(v_new_code,p_order_id,v_order.total_vnd,'VND',least(v_order.payment_expires_at,v_now+interval '5 minutes'),p_payment_link_id,p_checkout_url,v_now+interval '60 seconds',true,
      case when p_payment_link_id is not null and p_checkout_url is not null then v_now else null end)
    returning p.* into v_link;
  return query select v_link.order_code,v_link.order_id,v_link.amount_vnd,v_link.currency,v_link.status,v_link.expires_at,v_link.payment_link_id,v_link.checkout_url,true,false;
end; $$;
revoke all on function public.prepare_payos_checkout(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.prepare_payos_checkout(uuid,uuid,text,text) to service_role;

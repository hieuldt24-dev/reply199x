-- PayOS links and webhook evidence are kept in separate tables so the
-- historical SePay provider checks, global event keys, and RPC remain intact.
-- Apply only after local review and Postgres/RLS integration validation.

create sequence if not exists public.payos_order_code_seq as integer minvalue 1 maxvalue 2147483647 start with 1000000000 no cycle;

create table if not exists public.payos_payment_links (
  order_code integer primary key default nextval('public.payos_order_code_seq'),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  payment_link_id text unique,
  amount_vnd integer not null check (amount_vnd > 0),
  currency text not null check (currency = 'VND'),
  checkout_url text,
  status text not null default 'pending' check (status in ('pending','paid','expired','failed','reconciliation')),
  expires_at timestamptz not null,
  transaction_reference text unique,
  creation_lease_until timestamptz,
  creation_attempted boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (order_code > 0),
  check ((status <> 'paid') or paid_at is not null),
  check (checkout_url is null or checkout_url ~ '^https://pay\.payos\.vn/')
);

create table if not exists public.payos_payment_events (
  provider_event_id text primary key,
  transaction_reference text not null unique,
  order_code integer references public.payos_payment_links(order_code),
  amount_vnd integer not null check (amount_vnd >= 0),
  processing_status public.payment_event_processing_status not null default 'received',
  failure_code text check (failure_code is null or char_length(failure_code) <= 80),
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.payos_payment_links enable row level security;
alter table public.payos_payment_events enable row level security;
revoke all on public.payos_payment_links, public.payos_payment_events from anon, authenticated;
revoke all on sequence public.payos_order_code_seq from anon, authenticated;
grant select, insert, update on public.payos_payment_links, public.payos_payment_events to service_role;
grant usage, select on sequence public.payos_order_code_seq to service_role;

create or replace function public.prepare_payos_checkout(p_order_id uuid, p_user_id uuid, p_payment_link_id text default null, p_checkout_url text default null)
returns table (order_code integer, order_id uuid, amount_vnd integer, currency text, payment_status text, expires_at timestamptz, payment_link_id text, checkout_url text, can_create boolean, can_reconcile boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  v_link public.payos_payment_links%rowtype;
  v_new_code integer;
begin
  select o.* into v_order from public.orders o where o.id=p_order_id and o.user_id=p_user_id for update;
  if not found then raise exception 'order_not_found' using errcode='P0002'; end if;
  select p.* into v_link from public.payos_payment_links p where p.order_id=p_order_id for update;
  if found then
    if v_link.amount_vnd <> v_order.total_vnd or v_link.currency <> 'VND' then raise exception 'payment_order_mismatch' using errcode='23514'; end if;
    if p_payment_link_id is not null and v_link.payment_link_id is null then
      update public.payos_payment_links set payment_link_id=p_payment_link_id, checkout_url=p_checkout_url, creation_lease_until=null, updated_at=now()
        where order_id=p_order_id returning * into v_link;
    end if;
    if p_payment_link_id is not null then
      return query select v_link.order_code,v_link.order_id,v_link.amount_vnd,v_link.currency,v_link.status,v_link.expires_at,v_link.payment_link_id,v_link.checkout_url,false,false;
      return;
    end if;
    if v_link.checkout_url is not null then
      return query select v_link.order_code,v_link.order_id,v_link.amount_vnd,v_link.currency,v_link.status,v_link.expires_at,v_link.payment_link_id,v_link.checkout_url,false,false;
      return;
    end if;
    if v_link.creation_lease_until is not null and v_link.creation_lease_until > now() then
      return query select v_link.order_code,v_link.order_id,v_link.amount_vnd,v_link.currency,v_link.status,v_link.expires_at,v_link.payment_link_id,v_link.checkout_url,false,false;
      return;
    end if;
    if v_link.creation_attempted then
      return query select v_link.order_code,v_link.order_id,v_link.amount_vnd,v_link.currency,v_link.status,v_link.expires_at,v_link.payment_link_id,v_link.checkout_url,false,true;
      return;
    end if;
    update public.payos_payment_links set creation_lease_until=now()+interval '60 seconds',creation_attempted=true,updated_at=now()
      where order_code=v_link.order_code returning * into v_link;
    return query select v_link.order_code,v_link.order_id,v_link.amount_vnd,v_link.currency,v_link.status,v_link.expires_at,v_link.payment_link_id,v_link.checkout_url,true,false;
    return;
  end if;
  if v_order.status <> 'pending_payment' or v_order.payment_expires_at <= now() then raise exception 'order_not_payable' using errcode='23514'; end if;
  v_new_code := nextval('public.payos_order_code_seq');
  insert into public.payos_payment_links(order_code,order_id,amount_vnd,currency,expires_at,payment_link_id,checkout_url,creation_lease_until,creation_attempted)
    values(v_new_code,p_order_id,v_order.total_vnd,'VND',least(v_order.payment_expires_at,now()+interval '5 minutes'),p_payment_link_id,p_checkout_url,now()+interval '60 seconds',true)
    returning * into v_link;
  return query select v_link.order_code,v_link.order_id,v_link.amount_vnd,v_link.currency,v_link.status,v_link.expires_at,v_link.payment_link_id,v_link.checkout_url,true,false;
end; $$;

create or replace function public.process_payos_webhook(p_event_id text,p_order_code integer,p_payment_link_id text,p_reference text,p_amount_vnd integer,p_currency text,p_success boolean)
returns table(result text,order_id uuid)
language plpgsql security definer set search_path = '' as $$
declare v_link public.payos_payment_links%rowtype; v_order public.orders%rowtype; v_order_id uuid; v_inserted boolean;
begin
  if p_event_id is null or char_length(p_event_id)>160 or p_reference is null or char_length(p_reference)>120 then raise exception 'invalid_payos_event' using errcode='22023'; end if;
  insert into public.payos_payment_events(provider_event_id,transaction_reference,order_code,amount_vnd)
    values(p_event_id,p_reference,case when exists(select 1 from public.payos_payment_links p where p.order_code=p_order_code) then p_order_code else null end,coalesce(p_amount_vnd,0))
    on conflict do nothing;
  v_inserted := found;
  if not v_inserted then return query select 'duplicate'::text,null::uuid; return; end if;
  select p.order_id into v_order_id from public.payos_payment_links p where p.order_code=p_order_code;
  if not found then
    update public.payos_payment_events set processing_status='reconciliation',failure_code='unknown_order_code',processed_at=now() where provider_event_id=p_event_id;
    return query select 'reconciliation'::text,null::uuid; return;
  end if;
  -- Match the prepare/expiry lock order: order first, then payment link.
  select o.* into v_order from public.orders o where o.id=v_order_id for update;
  if not found then raise exception 'payment_order_missing' using errcode='P0002'; end if;
  select p.* into v_link from public.payos_payment_links p where p.order_code=p_order_code for update;
  if not found then raise exception 'payment_link_missing' using errcode='P0002'; end if;
  if not p_success or p_currency <> 'VND' or p_amount_vnd <> v_link.amount_vnd or p_payment_link_id <> v_link.payment_link_id then
    update public.payos_payment_links set status='reconciliation',updated_at=now() where order_code=p_order_code and status='pending';
    update public.orders set status='reconciliation',updated_at=now() where id=v_order.id and status='pending_payment';
    update public.payos_payment_events set processing_status='reconciliation',failure_code='payment_data_mismatch',processed_at=now() where provider_event_id=p_event_id;
    return query select 'reconciliation'::text,v_order.id; return;
  end if;
  if v_link.status <> 'pending' or v_order.status <> 'pending_payment' or v_link.expires_at <= now() then
    update public.payos_payment_links set status='reconciliation',updated_at=now() where order_code=p_order_code and status <> 'paid';
    update public.orders set status='reconciliation',updated_at=now() where id=v_order.id and status in ('pending_payment','expired','failed');
    update public.payos_payment_events set processing_status='reconciliation',failure_code='late_or_terminal_payment',processed_at=now() where provider_event_id=p_event_id;
    return query select 'reconciliation'::text,v_order.id; return;
  end if;
  update public.payos_payment_links set status='paid',transaction_reference=p_reference,paid_at=now(),updated_at=now() where order_code=p_order_code;
  update public.orders set status='paid',updated_at=now() where id=v_order.id;
  insert into public.sheet_sync_outbox(order_id,event_key) values(v_order.id,'paid') on conflict(order_id,event_key) do nothing;
  update public.payos_payment_events set processing_status='processed',processed_at=now() where provider_event_id=p_event_id;
  return query select 'paid'::text,v_order.id;
end; $$;

create or replace function public.expire_ticket_checkout(p_order_id uuid,p_user_id uuid)
returns table(order_status public.ticket_order_status)
language plpgsql security definer set search_path = '' as $$
declare v_order public.orders%rowtype;
begin
  select o.* into v_order from public.orders o where o.id=p_order_id and o.user_id=p_user_id for update;
  if not found then raise exception 'order_not_found' using errcode='P0002'; end if;
  if v_order.status='pending_payment' and v_order.payment_expires_at<=now() then
    update public.payment_transactions set status='expired',updated_at=now() where order_id=v_order.id and provider='sepay' and status='pending';
    update public.payos_payment_links set status='expired',updated_at=now() where order_id=v_order.id and status='pending';
    update public.orders set status='expired',updated_at=now() where id=v_order.id;
    return query select 'expired'::public.ticket_order_status; return;
  end if;
  return query select v_order.status;
end; $$;

create or replace function public.mark_payos_checkout_reconciliation(p_order_code integer)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_order_id uuid; v_order public.orders%rowtype;
begin
  select p.order_id into v_order_id from public.payos_payment_links p where p.order_code=p_order_code;
  if not found then return; end if;
  select o.* into v_order from public.orders o where o.id=v_order_id for update;
  if not found then return; end if;
  update public.payos_payment_links set status='reconciliation',creation_lease_until=null,updated_at=now()
    where order_code=p_order_code and status='pending';
  update public.orders set status='reconciliation',updated_at=now() where id=v_order_id and status='pending_payment';
end; $$;

revoke all on function public.prepare_payos_checkout(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.process_payos_webhook(text,integer,text,text,integer,text,boolean) from public,anon,authenticated;
grant execute on function public.prepare_payos_checkout(uuid,uuid,text,text) to service_role;
grant execute on function public.process_payos_webhook(text,integer,text,text,integer,text,boolean) to service_role;
revoke all on function public.expire_ticket_checkout(uuid,uuid) from public,anon,authenticated;
grant execute on function public.expire_ticket_checkout(uuid,uuid) to service_role;
revoke all on function public.mark_payos_checkout_reconciliation(integer) from public,anon,authenticated;
grant execute on function public.mark_payos_checkout_reconciliation(integer) to service_role;

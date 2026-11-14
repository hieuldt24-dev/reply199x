-- Durable worker lease and retry lifecycle for paid ticket Sheet rows.
-- Existing outbox rows remain eligible; no payment/order state is changed here.

alter table public.sheet_sync_outbox
  add column if not exists lease_until timestamptz,
  add column if not exists lease_token uuid;

-- Recreate RPC signatures atomically if this migration is reapplied during
-- pre-production validation; old unfenced entry points must not remain callable.
drop function if exists public.claim_paid_ticket_sheet_sync(integer);
drop function if exists public.complete_paid_ticket_sheet_sync(uuid,text);
drop function if exists public.fail_paid_ticket_sheet_sync(uuid,text);

create or replace function public.claim_paid_ticket_sheet_sync(p_limit integer default 10)
returns table (
  outbox_id uuid, lease_token uuid, order_id uuid, event_key text, order_created_at timestamptz,
  attendee_name text, attendee_email text, attendee_phone text, attendee_gender text,
  attendee_birth_year smallint, quantity smallint, merch_option text, total_vnd integer,
  order_status text, payos_reference text, paid_at timestamptz, payment_link_id text
)
language plpgsql security definer set search_path = '' as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 50 then
    raise exception 'invalid_claim_limit' using errcode='22023';
  end if;

  return query
  with picked as (
    select s.id
    from public.sheet_sync_outbox s
    join public.orders o on o.id=s.order_id
    left join public.payos_payment_links payos on payos.order_id=o.id
    left join lateral (
      select pt.id from public.payment_transactions pt
      where pt.order_id=o.id and pt.provider='sepay' and pt.status='paid'
      order by pt.paid_at desc limit 1
    ) sepay on true
    where o.status='paid'
      and s.event_key='paid'
      and (payos.order_id is not null or sepay.id is not null)
      and ((s.status in ('pending','failed') and s.next_attempt_at<=now())
        or (s.status='processing' and (s.lease_until is null or s.lease_until<=now())))
    order by s.created_at, s.id
    for update of s skip locked
    limit p_limit
  ), claimed as (
    update public.sheet_sync_outbox s
      set status='processing', attempt_count=s.attempt_count+1, lease_token=gen_random_uuid(),
          lease_until=now()+interval '2 minutes', last_error_code=null, updated_at=now()
    from picked p where s.id=p.id
    returning s.id, s.lease_token, s.order_id, s.event_key
  )
  select c.id,c.lease_token,c.order_id,c.event_key,o.created_at,o.attendee_name,o.attendee_email,
    coalesce(o.attendee_phone,''),coalesce(o.attendee_gender,''),o.attendee_birth_year,
    o.quantity,o.merch_option,o.total_vnd,o.status::text,coalesce(p.transaction_reference,t.provider_reference),
    coalesce(p.paid_at,t.paid_at),p.payment_link_id
  from claimed c
  join public.orders o on o.id=c.order_id
  left join public.payos_payment_links p on p.order_id=o.id
  left join lateral (
    select pt.provider_reference,pt.paid_at from public.payment_transactions pt
    where pt.order_id=o.id and pt.provider='sepay' and pt.status='paid'
    order by pt.paid_at desc limit 1
  ) t on true;
end; $$;

create or replace function public.complete_paid_ticket_sheet_sync(p_outbox_id uuid,p_lease_token uuid,p_sheet_row_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_sheet_row_id is null or char_length(p_sheet_row_id)>120 then
    raise exception 'invalid_sheet_row_id' using errcode='22023';
  end if;
  update public.sheet_sync_outbox
    set status='synced', synced_at=now(), sheet_row_id=p_sheet_row_id,
        lease_until=null,lease_token=null,last_error_code=null,updated_at=now()
    where id=p_outbox_id and status='processing' and lease_token=p_lease_token;
  return found;
end; $$;

create or replace function public.fail_paid_ticket_sheet_sync(p_outbox_id uuid,p_lease_token uuid,p_error_code text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_error_code is null or p_error_code !~ '^[a-z0-9_]{1,80}$' then
    raise exception 'invalid_sheet_error_code' using errcode='22023';
  end if;
  update public.sheet_sync_outbox s
    set status='failed',
        next_attempt_at=now()+make_interval(secs=>least(3600,30 * (2 ^ least(s.attempt_count,7))::integer)),
        lease_until=null,lease_token=null,last_error_code=p_error_code,updated_at=now()
    where s.id=p_outbox_id and s.status='processing' and s.lease_token=p_lease_token;
  return found;
end; $$;

revoke all on function public.claim_paid_ticket_sheet_sync(integer) from public,anon,authenticated;
revoke all on function public.complete_paid_ticket_sheet_sync(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.fail_paid_ticket_sheet_sync(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_paid_ticket_sheet_sync(integer) to service_role;
grant execute on function public.complete_paid_ticket_sheet_sync(uuid,uuid,text) to service_role;
grant execute on function public.fail_paid_ticket_sheet_sync(uuid,uuid,text) to service_role;

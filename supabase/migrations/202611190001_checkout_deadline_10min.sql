-- 202611190001: extend the checkout payment deadline from 5 to 10 minutes.
-- Forward-only. Agents never apply this migration; the owner applies it in the
-- production Supabase SQL Editor (run the read-only pre-check first) and then
-- deploys the app in the same window. No backfill: orders and PayOS links that
-- already exist keep their stored 5-minute expiry.
-- Reason: a real customer paid 39 seconds after the 5-minute link deadline and
-- the payment was routed to reconciliation instead of paid.
-- prepare_payos_checkout is copied verbatim from 202611150001 (lines 108-157);
-- the ONLY change is the link expiry literal '5 minutes' -> '10 minutes'.
-- The 60 second creation lease, SECURITY DEFINER, empty search_path and the
-- service_role-only grants are unchanged.

alter table public.orders alter column payment_expires_at set default (now() + interval '10 minutes');

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
    values(v_new_code,p_order_id,v_order.total_vnd,'VND',least(v_order.payment_expires_at,v_now+interval '10 minutes'),p_payment_link_id,p_checkout_url,v_now+interval '60 seconds',true,
      case when p_payment_link_id is not null and p_checkout_url is not null then v_now else null end)
    returning p.* into v_link;
  return query select v_link.order_code,v_link.order_id,v_link.amount_vnd,v_link.currency,v_link.status,v_link.expires_at,v_link.payment_link_id,v_link.checkout_url,true,false;
end; $$;
revoke all on function public.prepare_payos_checkout(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.prepare_payos_checkout(uuid,uuid,text,text) to service_role;

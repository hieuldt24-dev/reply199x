-- Fix PL/pgSQL ambiguity between RETURNS TABLE output variables and columns.
-- Forward-only function replacement; no order or payment rows are changed.
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
      update public.payos_payment_links as p set payment_link_id=p_payment_link_id, checkout_url=p_checkout_url, creation_lease_until=null, updated_at=now()
        where p.order_id=p_order_id returning p.* into v_link;
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
    update public.payos_payment_links as p set creation_lease_until=now()+interval '60 seconds',creation_attempted=true,updated_at=now()
      where p.order_code=v_link.order_code returning p.* into v_link;
    return query select v_link.order_code,v_link.order_id,v_link.amount_vnd,v_link.currency,v_link.status,v_link.expires_at,v_link.payment_link_id,v_link.checkout_url,true,false;
    return;
  end if;
  if v_order.status <> 'pending_payment' or v_order.payment_expires_at <= now() then raise exception 'order_not_payable' using errcode='23514'; end if;
  v_new_code := nextval('public.payos_order_code_seq');
  insert into public.payos_payment_links as p(order_code,order_id,amount_vnd,currency,expires_at,payment_link_id,checkout_url,creation_lease_until,creation_attempted)
    values(v_new_code,p_order_id,v_order.total_vnd,'VND',least(v_order.payment_expires_at,now()+interval '5 minutes'),p_payment_link_id,p_checkout_url,now()+interval '60 seconds',true)
    returning p.* into v_link;
  return query select v_link.order_code,v_link.order_id,v_link.amount_vnd,v_link.currency,v_link.status,v_link.expires_at,v_link.payment_link_id,v_link.checkout_url,true,false;
end; $$;

revoke all on function public.prepare_payos_checkout(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.prepare_payos_checkout(uuid,uuid,text,text) to service_role;

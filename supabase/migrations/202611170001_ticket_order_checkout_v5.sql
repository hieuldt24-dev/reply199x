create function public.create_ticket_order_v5(
  p_user_id uuid, p_idempotency_key uuid, p_attendee_name text,
  p_attendee_email text, p_attendee_phone text, p_attendee_gender text,
  p_attendee_birth_year integer, p_quantity integer, p_merch_option text
)
returns table (
  order_id uuid, quantity smallint, unit_price_vnd integer, merch_option text,
  merch_price_vnd integer, ticket_subtotal_vnd integer, total_vnd integer,
  order_status public.ticket_order_status, reused boolean, blocked_until timestamptz,
  checkout_order_code integer, checkout_order_id uuid, checkout_amount_vnd integer,
  checkout_currency text, checkout_payment_status text, checkout_expires_at timestamptz,
  checkout_payment_link_id text, checkout_url text, checkout_can_create boolean,
  checkout_can_reconcile boolean, checkout_prepare_error_code text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
  v_checkout record;
  v_prepare_sqlstate text;
begin
  for v_order in
    select * from public.create_ticket_order_v4(
      p_user_id, p_idempotency_key, p_attendee_name, p_attendee_email,
      p_attendee_phone, p_attendee_gender, p_attendee_birth_year,
      p_quantity, p_merch_option
    )
  loop
    order_id := v_order.order_id;
    quantity := v_order.quantity;
    unit_price_vnd := v_order.unit_price_vnd;
    merch_option := v_order.merch_option;
    merch_price_vnd := v_order.merch_price_vnd;
    ticket_subtotal_vnd := v_order.ticket_subtotal_vnd;
    total_vnd := v_order.total_vnd;
    order_status := v_order.order_status;
    reused := v_order.reused;
    blocked_until := v_order.blocked_until;
    checkout_order_code := null;
    checkout_order_id := null;
    checkout_amount_vnd := null;
    checkout_currency := null;
    checkout_payment_status := null;
    checkout_expires_at := null;
    checkout_payment_link_id := null;
    checkout_url := null;
    checkout_can_create := null;
    checkout_can_reconcile := null;
    checkout_prepare_error_code := null;

    if v_order.order_id is not null and v_order.order_status = 'pending_payment' then
      begin
        select * into v_checkout
        from public.prepare_payos_checkout(v_order.order_id, p_user_id, null, null);

        checkout_order_code := v_checkout.order_code;
        checkout_order_id := v_checkout.order_id;
        checkout_amount_vnd := v_checkout.amount_vnd;
        checkout_currency := v_checkout.currency;
        checkout_payment_status := v_checkout.payment_status;
        checkout_expires_at := v_checkout.expires_at;
        checkout_payment_link_id := v_checkout.payment_link_id;
        checkout_url := v_checkout.checkout_url;
        checkout_can_create := v_checkout.can_create;
        checkout_can_reconcile := v_checkout.can_reconcile;
      exception when others then
        get stacked diagnostics v_prepare_sqlstate = returned_sqlstate;
        checkout_order_code := null;
        checkout_order_id := null;
        checkout_amount_vnd := null;
        checkout_currency := null;
        checkout_payment_status := null;
        checkout_expires_at := null;
        checkout_payment_link_id := null;
        checkout_url := null;
        checkout_can_create := null;
        checkout_can_reconcile := null;
        checkout_prepare_error_code := v_prepare_sqlstate;
      end;
    end if;

    return next;
  end loop;
end;
$$;

revoke all on function public.create_ticket_order_v5(uuid,uuid,text,text,text,text,integer,integer,text) from public, anon, authenticated;
grant execute on function public.create_ticket_order_v5(uuid,uuid,text,text,text,text,integer,integer,text) to service_role;

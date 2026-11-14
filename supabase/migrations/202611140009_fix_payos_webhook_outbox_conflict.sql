-- Forward-only fix: RETURNS TABLE order_id conflicts with the outbox conflict target.
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
  insert into public.sheet_sync_outbox(order_id,event_key) values(v_order.id,'paid') on conflict on constraint sheet_sync_outbox_order_id_event_key_key do nothing;
  update public.payos_payment_events set processing_status='processed',processed_at=now() where provider_event_id=p_event_id;
  return query select 'paid'::text,v_order.id;
end; $$;

revoke all on function public.process_payos_webhook(text,integer,text,text,integer,text,boolean) from public,anon,authenticated;
grant execute on function public.process_payos_webhook(text,integer,text,text,integer,text,boolean) to service_role;


-- Forward-only hardening for manual operation of the paid-ticket Sheet outbox.
-- Table constraint sheet_sync_outbox_check (status <> 'synced' or synced_at is not null) is kept.
-- 1) A row can no longer be rejected just because synced_at was omitted.
-- 2) Operators get a safe re-queue function instead of hand-written INSERT/UPDATE SQL.

create or replace function public.sheet_sync_outbox_fill_synced_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'synced' and new.synced_at is null then
    new.synced_at := now();
  end if;
  return new;
end; $$;

drop trigger if exists sheet_sync_outbox_fill_synced_at on public.sheet_sync_outbox;
create trigger sheet_sync_outbox_fill_synced_at
  before insert or update on public.sheet_sync_outbox
  for each row execute function public.sheet_sync_outbox_fill_synced_at();

-- Queue (or re-queue) the 'paid' Sheet sync for one order.
-- Never touches a synced row or a row whose worker lease is still live.
-- Returns true when the row is now eligible for the worker, false otherwise.
create or replace function public.enqueue_paid_ticket_sheet_sync(p_order_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if not exists (select 1 from public.orders o where o.id = p_order_id and o.status = 'paid') then
    return false;
  end if;

  insert into public.sheet_sync_outbox (order_id, event_key)
  values (p_order_id, 'paid')
  on conflict (order_id, event_key) do update
    set status = 'pending', next_attempt_at = now(), lease_until = null, lease_token = null,
        last_error_code = null, updated_at = now()
    where public.sheet_sync_outbox.status = 'failed'
       or (public.sheet_sync_outbox.status = 'processing'
           and (public.sheet_sync_outbox.lease_until is null or public.sheet_sync_outbox.lease_until <= now()));

  get diagnostics v_count = row_count;
  return v_count = 1 or exists (
    select 1 from public.sheet_sync_outbox s
    where s.order_id = p_order_id and s.event_key = 'paid' and s.status = 'pending'
  );
end; $$;

revoke all on function public.enqueue_paid_ticket_sheet_sync(uuid) from public, anon, authenticated;
grant execute on function public.enqueue_paid_ticket_sheet_sync(uuid) to service_role;

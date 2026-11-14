-- Preserve the ticket attendee data entered by the buyer. Existing orders stay
-- intact with NULL snapshot fields; new orders use v3 and always persist a full
-- normalized snapshot in the same transaction as the order and ticket items.

alter table public.orders
  add column if not exists attendee_name text,
  add column if not exists attendee_email text,
  add column if not exists attendee_phone text,
  add column if not exists attendee_gender text,
  add column if not exists attendee_birth_year smallint;

alter table public.orders drop constraint if exists orders_attendee_name_check;
alter table public.orders add constraint orders_attendee_name_check
  check (attendee_name is null or char_length(attendee_name) between 1 and 120);

alter table public.orders drop constraint if exists orders_attendee_email_check;
alter table public.orders add constraint orders_attendee_email_check
  check (attendee_email is null or (char_length(attendee_email) between 3 and 254 and attendee_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'));

alter table public.orders drop constraint if exists orders_attendee_phone_check;
alter table public.orders add constraint orders_attendee_phone_check
  check (attendee_phone is null or (char_length(attendee_phone) <= 40 and attendee_phone !~ '[[:cntrl:]]'));

alter table public.orders drop constraint if exists orders_attendee_gender_check;
alter table public.orders add constraint orders_attendee_gender_check
  check (attendee_gender is null or attendee_gender in ('', 'female', 'male', 'other', 'undisclosed'));

alter table public.orders drop constraint if exists orders_attendee_birth_year_check;
alter table public.orders add constraint orders_attendee_birth_year_check
  check (attendee_birth_year is null or attendee_birth_year between 1900 and 2100);

create or replace function public.prevent_ticket_attendee_snapshot_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(new.attendee_name, new.attendee_email, new.attendee_phone, new.attendee_gender, new.attendee_birth_year)
    is distinct from row(old.attendee_name, old.attendee_email, old.attendee_phone, old.attendee_gender, old.attendee_birth_year) then
    raise exception 'ticket_attendee_snapshot_is_immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_attendee_snapshot_immutable on public.orders;
create trigger orders_attendee_snapshot_immutable
  before update on public.orders
  for each row execute function public.prevent_ticket_attendee_snapshot_change();

create or replace function public.create_ticket_order_v3(
  p_user_id uuid,
  p_idempotency_key uuid,
  p_attendee_name text,
  p_attendee_email text,
  p_attendee_phone text,
  p_attendee_gender text,
  p_attendee_birth_year integer,
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
  v_name text;
  v_email text;
  v_phone text;
  v_gender text;
  v_merch_price integer;
  v_fingerprint text;
  v_order_id uuid;
  v_inserted boolean := false;
  v_order public.orders%rowtype;
begin
  if p_user_id is null or p_idempotency_key is null or p_quantity is null or p_merch_option is null then
    raise exception 'invalid_order_request' using errcode = '22023';
  end if;

  v_name := btrim(coalesce(p_attendee_name, ''));
  v_email := btrim(coalesce(p_attendee_email, ''));
  v_phone := btrim(coalesce(p_attendee_phone, ''));
  v_gender := coalesce(p_attendee_gender, '');
  if char_length(v_name) not between 1 and 120 or v_name ~ '[[:cntrl:]]' then
    raise exception 'invalid_attendee_name' using errcode = '22023';
  end if;
  if char_length(v_email) not between 3 and 254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or v_email ~ '[[:cntrl:]]' then
    raise exception 'invalid_attendee_email' using errcode = '22023';
  end if;
  if char_length(v_phone) > 40 or v_phone !~ '^[+().\-0-9[:space:]]*$' or v_phone ~ '[[:cntrl:]]' then
    raise exception 'invalid_attendee_phone' using errcode = '22023';
  end if;
  if v_gender not in ('', 'female', 'male', 'other', 'undisclosed') then
    raise exception 'invalid_attendee_gender' using errcode = '22023';
  end if;
  if p_attendee_birth_year is not null and (
    p_attendee_birth_year < 1900 or p_attendee_birth_year > extract(year from now())::integer
  ) then
    raise exception 'invalid_attendee_birth_year' using errcode = '22023';
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
    convert_to(jsonb_build_object(
      'attendee_name', v_name,
      'attendee_email', v_email,
      'attendee_phone', v_phone,
      'attendee_gender', v_gender,
      'attendee_birth_year', p_attendee_birth_year,
      'quantity', p_quantity,
      'merch_option', p_merch_option
    )::text, 'UTF8'),
    'sha256'
  ), 'hex');

  insert into public.orders (
    user_id, idempotency_key, request_fingerprint, quantity, merch_option, merch_price_vnd,
    attendee_name, attendee_email, attendee_phone, attendee_gender, attendee_birth_year
  ) values (
    p_user_id, p_idempotency_key, v_fingerprint, p_quantity, p_merch_option, v_merch_price,
    v_name, v_email, v_phone, v_gender, p_attendee_birth_year::smallint
  )
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

-- Retire order-creation RPCs that cannot capture attendee data. Keep the
-- functions defined for migration history and safe rollback documentation.
revoke all on function public.create_ticket_order(uuid, uuid, uuid[]) from public, anon, authenticated, service_role;
revoke all on function public.create_ticket_order_v2(uuid, uuid, integer, text) from public, anon, authenticated, service_role;
revoke all on function public.create_ticket_order_v3(uuid, uuid, text, text, text, text, integer, integer, text) from public, anon, authenticated;
grant execute on function public.create_ticket_order_v3(uuid, uuid, text, text, text, text, integer, integer, text) to service_role;

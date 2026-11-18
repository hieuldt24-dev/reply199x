-- Ticket order survey (Q6 source, Q8 area, Q9 attendance), keyed by order.
-- Forward-only and additive: no existing table or function is altered or dropped.
-- Stored values are stable ids from src/lib/ticket-orders/survey.ts (never labels).
-- Each allowlist stays on ONE line; src/lib/ticket-orders/survey-migration-drift.test.ts reads them.
-- Access is service_role-only: RLS on, no policies, explicit revoke/grant per object.

-- CHECK constraints cannot use subqueries, so source validation lives in an IMMUTABLE helper.
create or replace function public.ticket_survey_source_valid(p_source text[])
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(
    array_ndims(p_source) = 1
    and cardinality(p_source) between 1 and 8
    and array_position(p_source, null) is null
    and p_source <@ array['facebook', 'zalo', 'tiktok', 'referral', 'poster-standee', 'popup-reply199x', 'on-the-radio-bar', 'website']::text[]
    and (select count(distinct v.id) from unnest(p_source) as v(id)) = cardinality(p_source),
    false)
$$;

create table public.ticket_order_survey (
  order_id uuid primary key,
  user_id uuid not null,
  source text[] not null,
  area text not null,
  attendance text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ticket_order_survey_order_owner_fkey foreign key (order_id, user_id)
    references public.orders (id, user_id) on delete cascade,
  constraint ticket_order_survey_source_check check (public.ticket_survey_source_valid(source)),
  constraint ticket_order_survey_area_check check (area in ('hai-chau', 'thanh-khe', 'son-tra', 'ngu-hanh-son', 'lien-chieu', 'cam-le', 'hoa-vang', 'quang-nam-cu')),
  constraint ticket_order_survey_attendance_check check (attendance in ('confirmed', 'unsure'))
);

alter table public.ticket_order_survey enable row level security;
revoke all on table public.ticket_order_survey from public, anon, authenticated;
grant select, insert, update on table public.ticket_order_survey to service_role;

-- Save (or overwrite) the survey for an order owned by p_user_id. A missing order and an
-- order owned by someone else raise the same P0002 error, so callers learn nothing extra.
create or replace function public.upsert_ticket_order_survey(
  p_order_id uuid, p_user_id uuid, p_source text[], p_area text, p_attendance text
)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_order_id is null or p_user_id is null or not exists (
    select 1 from public.orders o where o.id = p_order_id and o.user_id = p_user_id
  ) then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  insert into public.ticket_order_survey (order_id, user_id, source, area, attendance)
  values (p_order_id, p_user_id, p_source, p_area, p_attendance)
  on conflict (order_id) do update
    set source = excluded.source, area = excluded.area, attendance = excluded.attendance,
        updated_at = now();
  return true;
end; $$;

-- Zero or one row. Table-qualified columns avoid the 42702 ambiguity seen in 202611140008.
create or replace function public.get_ticket_order_survey(p_order_id uuid)
returns table (source text[], area text, attendance text)
language sql stable security definer set search_path = '' as $$
  select s.source, s.area, s.attendance
  from public.ticket_order_survey s
  where s.order_id = p_order_id
$$;

-- Manual compensation for a survey saved after its order was already synced to the Sheet.
-- Only resets a synced 'paid' outbox row of a paid order that has a survey; returns true
-- when it did so. Never touches claim/complete/fail/enqueue or non-synced rows.
create or replace function public.requeue_synced_sheet_sync_for_survey(p_order_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.sheet_sync_outbox s
    set status = 'pending', next_attempt_at = now(), lease_until = null, lease_token = null,
        last_error_code = null, updated_at = now()
  where s.order_id = p_order_id
    and s.event_key = 'paid'
    and s.status = 'synced'
    and exists (select 1 from public.orders o where o.id = p_order_id and o.status = 'paid')
    and exists (select 1 from public.ticket_order_survey t where t.order_id = p_order_id);
  return found;
end; $$;

revoke all on function public.ticket_survey_source_valid(text[]) from public, anon, authenticated;
grant execute on function public.ticket_survey_source_valid(text[]) to service_role;
revoke all on function public.upsert_ticket_order_survey(uuid, uuid, text[], text, text) from public, anon, authenticated;
grant execute on function public.upsert_ticket_order_survey(uuid, uuid, text[], text, text) to service_role;
revoke all on function public.get_ticket_order_survey(uuid) from public, anon, authenticated;
grant execute on function public.get_ticket_order_survey(uuid) to service_role;
revoke all on function public.requeue_synced_sheet_sync_for_survey(uuid) from public, anon, authenticated;
grant execute on function public.requeue_synced_sheet_sync_for_survey(uuid) to service_role;

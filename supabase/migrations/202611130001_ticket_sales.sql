-- Schema-first foundation for the SePay ticket flow.
-- Apply only after local migration review and Postgres/RLS integration tests.
-- This migration creates no real checkout endpoint or provider configuration.

create extension if not exists pgcrypto with schema extensions;

do $$ begin
  create type public.ticket_order_status as enum (
    'pending_payment', 'paid', 'expired', 'failed', 'reconciliation', 'refunded'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_event_processing_status as enum (
    'received', 'processed', 'ignored', 'reconciliation', 'failed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.sheet_sync_status as enum ('pending', 'processing', 'synced', 'failed');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Older setup attempts may have created the basic profile table already.
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.drink_menu (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 80),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  idempotency_key uuid not null,
  request_fingerprint text not null check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  quantity smallint not null check (quantity between 1 and 4),
  unit_price_vnd integer not null default 169000 check (unit_price_vnd = 169000),
  total_vnd integer generated always as (quantity * unit_price_vnd) stored,
  status public.ticket_order_status not null default 'pending_payment',
  payment_expires_at timestamptz not null default (now() + interval '5 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key),
  unique (id, user_id)
);

create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);
create index if not exists orders_pending_expiry_idx on public.orders (payment_expires_at) where status = 'pending_payment';

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  ticket_number smallint not null check (ticket_number between 1 and 4),
  drink_id uuid not null references public.drink_menu (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (order_id, ticket_number)
);

create index if not exists order_items_order_idx on public.order_items (order_id);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  provider text not null default 'sepay' check (provider = 'sepay'),
  provider_reference text unique,
  provider_transaction_id text unique,
  amount_vnd integer not null check (amount_vnd > 0),
  currency text not null default 'VND' check (currency = 'VND'),
  status text not null check (status in ('pending', 'paid', 'failed', 'expired', 'reconciliation', 'refunded')),
  expires_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status <> 'paid') or paid_at is not null)
);

create index if not exists payment_transactions_order_idx on public.payment_transactions (order_id, created_at desc);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'sepay' check (provider = 'sepay'),
  provider_event_id text not null unique,
  provider_transaction_id text,
  order_id uuid references public.orders (id) on delete restrict,
  amount_vnd integer check (amount_vnd is null or amount_vnd >= 0),
  processing_status public.payment_event_processing_status not null default 'received',
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  failure_code text check (failure_code is null or char_length(failure_code) <= 80)
);

create index if not exists payment_events_transaction_idx on public.payment_events (provider_transaction_id);

create table if not exists public.sheet_sync_outbox (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  event_key text not null,
  status public.sheet_sync_status not null default 'pending',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  synced_at timestamptz,
  sheet_row_id text,
  last_error_code text check (last_error_code is null or char_length(last_error_code) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, event_key),
  check ((status <> 'synced') or synced_at is not null)
);

create index if not exists sheet_sync_outbox_retry_idx on public.sheet_sync_outbox (next_attempt_at, created_at)
  where status in ('pending', 'failed');

-- No client may mutate order, amount, payment, event or outbox state directly.
alter table public.profiles enable row level security;
alter table public.drink_menu enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.payment_events enable row level security;
alter table public.sheet_sync_outbox enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "order_items_select_own_order" on public.order_items;
create policy "order_items_select_own_order" on public.order_items
  for select to authenticated using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = (select auth.uid())
    )
  );

drop policy if exists "drink_menu_select_active" on public.drink_menu;
create policy "drink_menu_select_active" on public.drink_menu
  for select to anon, authenticated using (active);

revoke all on public.profiles, public.drink_menu, public.orders, public.order_items,
  public.payment_transactions, public.payment_events, public.sheet_sync_outbox from anon, authenticated;
grant select on public.profiles, public.orders, public.order_items to authenticated;
grant select on public.drink_menu to anon, authenticated;

-- Privileged order creation, payment transitions and outbox processing must be
-- introduced as reviewed transactional RPCs/server operations in later steps.

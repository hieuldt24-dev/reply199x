-- 202611180001_username_login.sql (forward-only; ALREADY applied to production by the owner; repo file must match exactly)
create table if not exists public.usernames (
  username text primary key check (username ~ '^[a-z0-9_.]{3,32}$'),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.usernames enable row level security;
revoke all on public.usernames from public, anon, authenticated;
grant select, insert, update, delete on public.usernames to service_role;

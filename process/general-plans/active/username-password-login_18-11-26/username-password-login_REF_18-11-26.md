---
name: ref:username-password-login-runbook
description: "Owner/admin runbook for username + password login: verify the applied public.usernames SQL, create accounts, map usernames, probes AC7/AC8"
date: 18-11-26
feature: none
---

# Username + password login — Owner and admin runbook

**BLUF:** The `public.usernames` SQL is already applied to production (owner-reported). Verify it (step 0), confirm dashboard settings, create an account in the dashboard, map a username with one SQL insert, then run the AC7/AC8 probes. Never paste passwords anywhere.

Repo migration: `supabase/migrations/202611180001_username_login.sql` (same text as the SQL the owner ran). Never edit it; any change needs a new migration.

## Dashboard settings (owner, by hand)

1. Authentication -> Providers -> Email: enabled (password sign-in on).
2. "Allow new users to sign up": stays ON (owner decision 2026-11-18) so first-time Google users still work.
3. "Confirm email": ON recommended (self-made email accounts must verify an inbox; admin-created users use auto-confirm).

## 0. Read-only verification of the applied SQL (SQL Editor, changes nothing)

```sql
select to_regclass('public.usernames') is not null as table_exists,
  (select relrowsecurity from pg_class where oid = to_regclass('public.usernames')) as rls_on,
  has_table_privilege('anon','public.usernames','select') as anon_select,
  has_table_privilege('authenticated','public.usernames','select') as auth_select,
  has_table_privilege('service_role','public.usernames','select') as service_select;
```

Expected: `table_exists` true, `rls_on` true, `anon_select` false, `auth_select` false, `service_select` true.

```sql
select conname, contype from pg_constraint where conrelid='public.usernames'::regclass order by contype;
```

Expected `contype` values: `c` (username format CHECK), `f` (FK to auth.users), `p` (primary key), `u` (unique user_id).

## 1. Create an account

Dashboard -> Authentication -> Users -> Add user -> email + password, tick auto-confirm.
Passwords must be 8 to 72 BYTES. The login route rejects anything shorter or longer. A non-ASCII character (for example a Vietnamese letter with a diacritic) counts as more than one byte.

## 2. Map a username

```sql
insert into public.usernames (username, user_id)
select 'ten_dang_nhap', id from auth.users where email = 'a@b.vn';
```

Username: lowercase, 3-32 characters of `a-z 0-9 _ .`. Uppercase is rejected by the CHECK; the login form lowercases what people type.

## 3. Change password or remove access

- Change password: Dashboard -> user -> set or reset password.
- Remove access: delete the user (the cascade removes the mapping). To keep the account but stop username login, delete only the `public.usernames` row.

## 4. Safety

Never paste passwords into chat, tickets or tracked files.

## 5. Probes the owner records (plan stays CODE DONE until both are recorded)

- AC7: log in via the login dialog with the mapped username; the header shows the signed-in state with display name "Bạn"; refresh keeps the session; logout works; Google login still works. Note how a Supabase 429 looks if one occurs (password login then returns "Chưa thể đăng nhập. Vui lòng thử lại sau.").
- AC8: a self-created email account (public sign-up) has no `public.usernames` row and gets 401 ("Tên đăng nhập hoặc mật khẩu không đúng.") from `/api/auth/password`.

## Known residuals (accepted)

- Shared egress-IP rate bucket (all password logins share one Supabase sign-in limit): `process/general-plans/backlog/username-login-rate-limit_NOTE_18-11-26.md`.
- Small residual timing difference between unknown username and wrong password.
- Sign-ups left ON.

TL;DR: verify (step 0), add user in dashboard, insert one `usernames` row, then record AC7/AC8.

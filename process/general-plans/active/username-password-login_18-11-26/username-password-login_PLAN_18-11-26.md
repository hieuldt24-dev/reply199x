---
name: plan:username-password-login
description: "Add username + password login for organizer-created accounts on top of Supabase Auth (new POST /api/auth/password, tiny usernames table, real CredentialLoginForm)"
date: 18-11-26
feature: none
---

# PLAN — Username + password login (Supabase Auth, admin-created accounts)

**BLUF:** Add `POST /api/auth/password` that maps `username -> auth user -> email`, then calls `signInWithPassword` on the normal SSR cookie client, so the session is identical to Google login. One tiny forward-only migration adds `public.usernames`. The dead UI form becomes a real submit. No new dependency, no bcryptjs, no custom password store.

Date: 2026-11-18
Status: CODE DONE 2026-11-18, KEEP ACTIVE (not VERIFIED). Independent EVL (vc-tester) green for AC1-AC6 scoped gates and HR1; independent vc-code-reviewer decision `approved-with-concerns` (harness/review-decision.json). Pending: owner hosted probes AC7/AC8, owner creation of the first account, and two follow-ups (error-mapping fix, rate limiting). Previously: VALIDATED (outer-pvl contract PASS after PVL cycle 1). Supplement 2026-11-18: owner already applied the `public.usernames` SQL to PRODUCTION (owner-reported, not agent-verified) and keeps Supabase sign-ups ON (accepted residual, see Risks).
Complexity: SIMPLE (one session, 13 steps). Risk class: HIGH (auth/identity + schema migration).
Upstream: SPEC and INNOVATE skipped; the user locked the decisions below directly in chat (2026-11-18).

## Locked Decisions (from user)

1. Passwords live in Supabase Auth (`auth.users.encrypted_password`, bcrypt). No `bcryptjs`, no custom password table. Reason: `public.orders.user_id` and `checkout_access_state` reference `auth.users(id)` and RLS uses `auth.uid()`; a custom user table would break orders and checkout. The bcrypt requirement is satisfied by Supabase itself.
2. Accounts are created by organizers only. No sign-up form, no password-reset UI.
3. SQL must be short; one new forward-only migration; never edit applied migrations; the owner applies it to the hosted DB, not agents. Update 2026-11-18: the owner has ALREADY applied it to production (see Owner-Applied State).

## Overview, Goals, Scope

Goal: a person who types `username` + `password` in the login dialog gets a Supabase session cookie and the header shows them signed in.
In scope: migration, route, UI form, tests, runbook, context update.
Out of scope: self sign-up, password reset UI, Google<->username account linking, any change to checkout/orders/payments/Sheets, rate-limiting infrastructure.

## Verified Facts From Code

- `src/app/api/auth/google/route.ts` and `logout/route.ts`: mutating routes require `request.headers.get("origin") === getSiteOrigin()` else `403` with empty body; set `Cache-Control: private, no-store`; wrap work in try/catch with a fixed non-sensitive failure.
- `src/lib/supabase/route-client.ts` `createRouteClient(request, response)` writes session cookies onto the given `response` through `enforceHttpOnlyCookieOptions`. Reused unchanged. `src/proxy.ts` refresh is untouched.
- Service-role pattern: the server secret env var must start with `sb_secret_`; used in `src/app/api/ticket-orders/route.ts` (supabase-js client from `getSupabaseConfig().url` plus the secret). Follow the same guard; missing key -> `503`.
- `src/components/auth/CredentialLoginForm.tsx` today is UI-only (preventDefault, "sắp ra mắt" notice, inputs without `name`). `LoginDialog.tsx` renders it above the Google form and already takes an `error` prop. `GoogleLoginForm` uses a normal form POST plus a 303 redirect.
- `src/app/auth/sign-in/page.tsx` renders only `GoogleLoginForm`, not the credential form. Decision: leave it Google-only (out of scope; the dialog is the login surface).
- Existing `public.profiles` (migration `202611130001`, line 26) has `select_own` RLS and `grant select ... to authenticated`; rows are not auto-created for admin-made users.
- `scripts/test-checkout-guard-db.mjs` applies EVERY `supabase/migrations/*.sql` generically (sorted), then runs `supabase/tests/*.sql`, but asserts the SQL test file list equals a fixed expected list (tripwire). A new migration is picked up automatically; a new SQL test file requires updating that list.
- Latest migration is `202611170003`. New file: `supabase/migrations/202611180001_username_login.sql`.

## Owner-Applied State (owner-reported 2026-11-18, not agent-verified)

- The owner ran the SQL block below (4 statements, 9 lines), unmodified, in the PRODUCTION Supabase SQL Editor (create table if not exists; enable RLS; revoke from public, anon, authenticated; grant select/insert/update/delete to service_role). The repo file `supabase/migrations/202611180001_username_login.sql` does not exist yet.
- EXECUTE must create that file containing EXACTLY the same statements (same text, `if not exists` kept) so repo and production match. A later re-apply is harmless (`if not exists`; re-running revoke/grant is idempotent).
- Because it is applied, any change (extra column, index, policy) now requires a NEW follow-up migration (next timestamp); never edit `202611180001`.
- Agents did not verify production; the owner read-only check is in the Admin Runbook (step 0). Other hosted databases (if any) are not covered by this statement.

## Schema Choice (one line)

Chosen: a tiny new table `public.usernames`, not a column on `profiles`, because profiles rows do not exist for admin-created users and `profiles` is readable by `authenticated`; a separate service_role-only table needs no policies and exposes nothing.

```sql
-- 202611180001_username_login.sql (forward-only; ALREADY applied to production by the owner; repo file must match exactly)
create table if not exists public.usernames (
  username text primary key check (username ~ '^[a-z0-9_.]{3,32}$'),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.usernames enable row level security;
revoke all on public.usernames from public, anon, authenticated;
grant select, insert, update, delete on public.usernames to service_role;
```

Notes: usernames are stored lowercase; the route lowercases input before lookup; the CHECK rejects uppercase so case-duplicates are impossible. No policies means RLS denies anon/authenticated even if a default grant appears later; the SQL test asserts the revoke.

## Route Design: POST /api/auth/password

Request JSON `{username, password}`. Order of operations:

1. Origin check: read the site origin inside a try/catch (`getSiteOrigin()` can throw on a missing or invalid `SITE_URL`); a throw -> `503` fixed body, never an unhandled 500. Origin header not equal to the site origin -> `403` empty body. DELIBERATE DIFFERENCE: every response from this route, including the `403`, carries `Cache-Control: private, no-store`. The existing `google` and `logout` routes return their `403` WITHOUT that header; this route does not copy that omission, and the existing routes are not edited.
2. Parse JSON (try/catch) -> `400 {error:{code:"invalid_request"}}`. Validate: username is a string, trimmed and lowercased, matching `^[a-z0-9_.]{3,32}$`; password is a string with 8..72 bytes (Supabase/bcrypt limit). Invalid -> generic `400` (no field detail).
3. Service-role client (same guard as ticket-orders; missing or malformed key -> `503`). Look up `user_id` in `usernames` by username (maybeSingle).
4. If a mapping row is found: `auth.admin.getUserById(user_id)` to get the email. UNMAPPED path (username not found, OR `getUserById` returns 404 / `user_not_found`, OR the user has no email): to equalize timing, call `auth.admin.getUserById` with the nil UUID `00000000-0000-0000-0000-000000000000` (result discarded; not repeated if the mapped path already made that call), THEN run ONE dummy `signInWithPassword` with a fixed unroutable email and the supplied password (result discarded), then return the generic 401. Result: both paths make exactly one `getUserById` and one `signInWithPassword`.
   DUMMY CLIENT: the dummy sign-in uses a plain `@supabase/supabase-js` `createClient` built from the publishable key with `auth: {persistSession: false, autoRefreshToken: false}`. It must NEVER be `createRouteClient` and NEVER the service-role client, so no session cookie can be written even if a self-registered account's email were used.
5. Real sign-in: `createRouteClient(request, response)` where `response = NextResponse.json({ok:true})`; call `signInWithPassword({email, password})`. Success -> the same response object carries the session cookies, status 200 `{ok:true}`. On any error the route discards that `response` and returns a fresh error response with no `set-cookie`.
6. Error semantics (one route test per row):

   | Upstream outcome | Route result |
   |---|---|
   | `getUserById` 404 / `user_not_found`, or user has no email | unmapped path: nil-UUID call + dummy sign-in + generic 401 |
   | any other `getUserById` error or thrown exception | 503 `temporarily_unavailable` |
   | `signInWithPassword` `invalid_credentials` or `email_not_confirmed` (400/401-class) | generic 401 |
   | `signInWithPassword` 429 / `over_request_rate_limit`, status >= 500, or network error | 503 `temporarily_unavailable` |
   | `usernames` lookup error, missing or malformed secret key, `getSiteOrigin()` throw, unexpected exception | 503 |

   Generic 401 body for unknown user AND wrong password is exactly `401 {"error":{"code":"invalid_credentials","message":"Tên đăng nhập hoặc mật khẩu không đúng."}}`. The 503 body is `503 {"error":{"code":"temporarily_unavailable","message":"Chưa thể đăng nhập. Vui lòng thử lại sau."}}`.
7. Logging: never log username, password, email or user_id; at most a `{reason}` code. `Cache-Control: private, no-store` on ALL responses including 400, 401, 403 and 503 (see step 1). No `set-cookie` header on any 400/401/403/503 (asserted by route tests).

Rate limiting: relies on Supabase Auth's built-in sign-in limits plus the repo's existing, still-unverified edge rate limiting gap (all-context Open Questions). Server-side Auth calls leave from the app's egress IP, so Supabase's per-IP sign-in limit is ONE shared bucket for all users: an attacker or heavy legitimate use can exhaust it and lock everyone out of password login, which then returns `503 temporarily_unavailable` (429 maps to 503, step 6). Google login is unaffected. ACCEPTED KNOWN-GAP (owner decision 2026-11-18). Backlog stub: `process/general-plans/backlog/username-login-rate-limit_NOTE_18-11-26.md` (options: app-level limiter, captcha, forwarded client IP). The AC7 owner probe records how a 429 looks on the hosted project.

Rejected alternative: synthetic email `<username>@<internal-domain>` (skips lookup and admin call). Rejected because organizers may want real emails on accounts, usernames should be renameable without touching `auth.users`, and fake addresses would pollute the Auth user list shared with Google users. Cost of the rejection: one extra admin API call per login.

## Touchpoints

| Path | Action |
|---|---|
| `supabase/migrations/202611180001_username_login.sql` | new; content must equal the owner-applied SQL above exactly (repo/production parity); never edited after creation |
| `src/lib/auth/username.ts` (+ `username.test.ts`) | new: pure `parseCredentials(body)`, `USERNAME_RE`, password byte-length rule; shared by route and form |
| `src/app/api/auth/password/route.ts` (+ `route.test.ts`) | new route |
| `src/components/auth/CredentialLoginForm.tsx` | rewrite: real submit via `fetch`. File is UNTRACKED in git (no git revert); a copy of the current UI-only version is saved into the task folder before editing (checklist step 1) |
| `src/components/auth/CredentialLoginForm.test.tsx` | new |
| `supabase/tests/username-login.sql` and `scripts/test-checkout-guard-db.mjs` | new SQL test; update expected SQL file list and add grant checks (step 8) |
| `process/context/all-context.md`, `process/context/tests/all-tests.md` | updated at UPDATE PROCESS (new route, table, migration not applied, runbook) |
| `process/general-plans/active/username-password-login_18-11-26/username-password-login_REF_18-11-26.md` | new: owner/admin runbook |
| `process/general-plans/active/username-password-login_18-11-26/harness/` | new: 5-file high-risk evidence pack (checklist step 12) |
| `process/general-plans/active/username-password-login_18-11-26/CredentialLoginForm.ui-only.backup.tsx.txt` | new: pre-edit copy of the untracked form (non-code extension so it is not compiled or linted) |
| `process/general-plans/backlog/username-login-rate-limit_NOTE_18-11-26.md` | new: backlog stub for the rate-limit known-gap |
| read only | `src/lib/supabase/{route-client,config,cookie-policy}.ts`, `src/proxy.ts`, `LoginDialog.tsx`, `HeaderAuth.tsx`, `src/app/api/ticket-orders/route.ts` (service-role guard pattern) |

## Public Contracts

- New HTTP endpoint `POST /api/auth/password` (JSON in, JSON out, session via Set-Cookie on 200 only). Status set: 200, 400, 401, 403, 503. All responses carry `Cache-Control: private, no-store`; only the 200 carries `set-cookie`.
- New DB object `public.usernames` (service_role only). No change to any existing table, function or grant.
- Session cookie names and shape unchanged (same SSR client as Google). `getAuthView()` (`src/lib/supabase/session.ts`) falls back to the display name "Bạn" for password users (no Google `full_name`), so the header shows the signed-in state with display name "Bạn" (not the email). Accepted; showing the username is a possible follow-up, not planned.
- Env: no new variable. The existing server secret key (already required for checkout) is now also required for password login; a deployment without it returns 503 for password login only.

## Blast Radius

About 8 files: 4 new source files, 1 rewritten component, 1 migration, 1 SQL test, 1 runner list edit, plus docs. Risk class HIGH: auth/identity and schema migration. Google flow, checkout, orders, webhook and Sheets are not edited. Password login fails closed (503/401) without affecting Google login or checkout.
Backward compatibility: purely additive. Rollback = remove the route, restore the form, and (only if needed) drop the table through a NEW forward migration; never edit the applied one. FORM ROLLBACK CAVEAT: `CredentialLoginForm.tsx` is untracked and `LoginDialog.tsx` is modified-uncommitted, so `git checkout` cannot restore the form. Restore = copy the pre-edit backup saved in the task folder (`CredentialLoginForm.ui-only.backup.tsx.txt`, checklist step 1) back over the file, or re-apply the UI-only version (preventDefault, "sắp ra mắt" notice, inputs without `name`).

## Security Notes (STRIDE quick scan)

- Spoofing/brute force: Supabase Auth limits only; edge limiting unverified. Shared egress-IP bucket: one rate bucket for all users, so lockout of password login is possible (429 -> 503); ACCEPTED known-gap with backlog stub `username-login-rate-limit_NOTE_18-11-26.md`.
- Information disclosure: single generic 401; unmapped path mirrors the mapped path (nil-UUID `getUserById` plus dummy `signInWithPassword` on a cookie-less plain client); no identifier logging; `usernames` unreadable by anon/authenticated; no `set-cookie` on any non-200.
- Tampering/CSRF: Origin check (not authentication, same posture as other routes); cookies HttpOnly via the existing policy.
- Elevation: the route never calls any create/update admin API. Public sign-up stays ON (owner decision 2026-11-18): anyone can create an email/password account via the Supabase public signUp API, but it has no row in `public.usernames` (service_role-only writes), so it cannot use this route; for ordering it equals a Google-created account (same `auth.users`, same RLS). Accepted residual.
- Residual (timing): equalization is best effort and NOT proven. A nil-UUID `getUserById` and a dummy sign-in for a nonexistent email still differ slightly from a real user lookup and a real bcrypt compare (different GoTrue code paths, DB row present vs absent), so a small measurable timing difference may remain. Accepted known-gap; the AC7 owner probe may compare timings informally.

## Owner Dashboard Config (owner does by hand)

1. Authentication -> Providers -> Email: enable (password sign-in on).
2. DECIDED (2026-11-18): keep "Allow new users to sign up" ON so first-time Google users still work. No "disable sign-ups" step. Recommended: keep "Confirm email" ON so self-made email accounts must verify an inbox (admin-created users use auto-confirm, so unaffected).
3. DONE (owner-reported 2026-11-18): the `public.usernames` SQL was applied in the production SQL Editor. Run the read-only verification in Admin Runbook step 0 to confirm.

## Admin Runbook (content for the REF file written at EXECUTE)

0. Owner read-only verification of the applied SQL (SQL Editor, changes nothing):
   `select to_regclass('public.usernames') is not null as table_exists, (select relrowsecurity from pg_class where oid = to_regclass('public.usernames')) as rls_on, has_table_privilege('anon','public.usernames','select') as anon_select, has_table_privilege('authenticated','public.usernames','select') as auth_select, has_table_privilege('service_role','public.usernames','select') as service_select;`
   Expected: table_exists true, rls_on true, anon_select false, auth_select false, service_select true.
   Constraint check: `select conname, contype from pg_constraint where conrelid='public.usernames'::regclass order by contype;` Expected contype values: c (username format CHECK), f (FK to auth.users), p (primary key), u (unique user_id).
1. Dashboard -> Authentication -> Users -> Add user -> email + password, tick auto-confirm. Organizers must set passwords of 8 to 72 BYTES (the route rejects anything shorter or longer; a non-ASCII character counts as more than one byte).
2. SQL Editor: `insert into public.usernames (username, user_id) select 'ten_dang_nhap', id from auth.users where email = 'a@b.vn';` (lowercase, 3-32 chars of `a-z 0-9 _ .`).
3. Change password: Dashboard -> user -> set or reset password. Remove access: delete the user (cascade removes the mapping).
4. Never paste passwords into chat, tickets or tracked files.

## Acceptance Criteria

- AC1 Correct username+password sets the normal Supabase session cookie (proven by: route happy-path test; strategy: Fully-Automated).
- AC2 Unknown username and wrong password give the same 401 (proven by: route enumeration test; strategy: Fully-Automated).
- AC3 Invalid input 400, bad Origin 403, no identifiers logged (proven by: route validation tests; strategy: Fully-Automated).
- AC4 The dialog form really submits, shows pending and Vietnamese errors (proven by: CredentialLoginForm test; strategy: Fully-Automated).
- AC5 Migration is short, applies cleanly, service_role-only (proven by: isolated Postgres runner; strategy: Hybrid).
- AC6 No regression in test, lint, typecheck, build (proven by: AC6 gate row; strategy: Fully-Automated).
- AC7 Real hosted login works end to end (proven by: owner probe; strategy: Agent-Probe).
- AC8 (revised) Sign-up stays ON by owner decision; a self-made email account cannot use username login (proven by: owner check that a self-created email account gets 401 from the username route, plus unmapped-user route test under AC2; strategy: Agent-Probe).

## Phase Completion Rules

Code-only completion is `CODE DONE`, not `VERIFIED`. The plan is `VERIFIED` only when AC1-AC6 gates are green via an independent vc-tester EVL run and AC7/AC8 are recorded by the owner; until then it stays CONDITIONAL. Known-Gap rows are never a PASS state.

## Implementation Checklist

1. Pre-edit baseline: run `git status --short` and record the output in the harness notes (other uncommitted tasks share the tree; the final scope check compares against this baseline). Confirm no other active plan touches `src/app/api/auth/` or `CredentialLoginForm.tsx` (checked at plan time: none overlapping). Because `CredentialLoginForm.tsx` is untracked and `LoginDialog.tsx` is modified-uncommitted, copy the current `CredentialLoginForm.tsx` to `process/general-plans/active/username-password-login_18-11-26/CredentialLoginForm.ui-only.backup.tsx.txt` BEFORE rewriting it (git cannot restore it). Do not discard or `git clean` the untracked file.
2. Create `supabase/migrations/202611180001_username_login.sql` containing EXACTLY the SQL block above (identical to what the owner already ran in production, `if not exists` kept; do not add columns/indexes: that needs a new migration).
3. Create `src/lib/auth/username.ts`: `USERNAME_RE`, `parseCredentials(body: unknown)` returning `{username, password}` or `null` (trim and lowercase username, password 8..72 BYTES measured with `new TextEncoder().encode(password).length` (client-safe; no `Buffer`, no `process.env` in this module), reject non-strings). Write its failing tests first, including a multi-byte case (e.g. 25 three-byte characters = 75 bytes rejected, 24 = 72 accepted).
4. Create `src/app/api/auth/password/route.ts` following Route Design steps 1-7 exactly: origin read wrapped so a `getSiteOrigin()` throw -> 503; every response (incl. 403) with `Cache-Control: private, no-store`; unmapped path = nil-UUID `getUserById` then dummy `signInWithPassword` on a plain `@supabase/supabase-js` client (publishable key, `persistSession:false`, `autoRefreshToken:false`; never `createRouteClient`, never the service client); real sign-in via `createRouteClient(request, response)` with the returned response object; error mapping per the step 6 table. Reuse `getSiteOrigin`, `getSupabaseConfig`, `createRouteClient`; copy the service-role guard from the ticket-orders route.
5. Write `route.test.ts` BEFORE the route (mocked supabase-js and `createRouteClient`, same style as existing route tests), one test per case: happy path 200 with session cookie on the returned response; unknown username -> 401 byte-identical to wrong password; invalid body, short password, overlong password, bad username format -> 400; bad or missing Origin -> 403; `getSiteOrigin()` throw -> 503; missing or malformed secret key -> 503; `usernames` lookup error or exception -> 503; `getUserById` 404 / `user_not_found` -> unmapped path -> 401; `getUserById` user without email -> unmapped -> 401; `getUserById` other error or thrown -> 503; `signInWithPassword` `invalid_credentials` -> 401; `email_not_confirmed` -> 401; 429 / `over_request_rate_limit` -> 503; status >= 500 -> 503; network error -> 503; on the unmapped path BOTH the nil-UUID `getUserById` and the dummy `signInWithPassword` are called, and the dummy uses the plain cookie-less client (not `createRouteClient`, not the service client); NO `set-cookie` header on any 400/401/403/503 response; every response including 403 has `Cache-Control: private, no-store`; no password/username/email/user_id in any `console.*` call.
6. Rewrite `CredentialLoginForm.tsx`: inputs get `name="username"` and `name="password"`; client check via `parseCredentials` with Vietnamese messages; `fetch("/api/auth/password", POST, JSON)`; pending state disables the button ("Đang đăng nhập…"); on 200 navigate with `window.location.assign("/")` (full navigation so server components and the header re-read the new cookie; same effect as the Google redirect); on 401 show the generic message in a `role="alert"` element and clear the password; on other failure show the 503 message. Keep class names (`login-dialog__credentials`, `login-dialog__submit`, `login-dialog__error`) so `globals.css` needs no edit.
7. Write `CredentialLoginForm.test.tsx` (jsdom, mocked `fetch`): correct JSON submitted, pending state, 401 shows the generic message and clears password, success calls `window.location.assign("/")` (jsdom has no real navigation: the test replaces `window.location` with an object whose `assign` is a `vi.fn()` and restores it in `afterEach`), client validation blocks empty or short input without calling fetch. Update `LoginDialog.test.tsx` only if it asserts the old "sắp ra mắt" text (grep first).
8. First verify the current expected list in `scripts/test-checkout-guard-db.mjs` (line 22: `EXPECTED_SQL_TESTS = ["checkout-access-guard.sql", "ticket-order-survey.sql"]`). Add `supabase/tests/username-login.sql` ending with `do $$ begin raise notice 'SENTINEL username-login.sql'; end $$;`: valid insert ok; bad format and uppercase rejected by CHECK; duplicate `user_id` rejected; deleting the auth user cascades the mapping. In `scripts/test-checkout-guard-db.mjs` change the expected SQL list to the SORTED `["checkout-access-guard.sql", "ticket-order-survey.sql", "username-login.sql"]` (the runner compares against a sorted directory listing) and add JS grant checks (RLS on; anon and authenticated have no privilege; service_role can select and insert).
9. Write the REF runbook (content above, including the step 0 constraint query expecting c, f, p, u and the 8-72 byte password rule) in the task folder.
10. Run the gate commands in Verification Evidence; fix inside the blast radius only.
11. Hand off to the owner: (migration already applied in production by the owner) run Admin Runbook step 0 verification (both queries), confirm dashboard settings (Email provider on, sign-ups left ON, Confirm email ON recommended), create a first account, manual login probe (AC7: header shows signed-in state with display name "Bạn"; note how a 429 looks), self-created account 401 check (AC8).
12. High-risk evidence pack: create `process/general-plans/active/username-password-login_18-11-26/harness/` with `risk-gate.json`, `context-snippets.json`, `verification.json`, `review-decision.json` and `adversarial-validation.json` per `.claude/skills/vc-risk-evidence-pack/SKILL.md` (the validator is the schema authority: `risk-gate.json` needs task, planPath, riskLevel, riskClasses, mustStopBeforeFinalize, humanApprovalRequired, why; `verification.json` needs task, commands, manualChecks, result; `review-decision.json` needs task, decision (approved / approved-with-concerns / rejected), blockingFindings, nonBlockingFindings, notes). `review-decision.json` is written from an INDEPENDENT review by `vc-code-reviewer`, not by the execute agent. `adversarial-validation.json` covers: user enumeration, timing oracle, unmapped self-signup account, CSRF/Origin, key exposure (service key, publishable key, no secrets logged), cookie flags (HttpOnly, no cookie on non-200). Run `node .claude/skills/vc-risk-evidence-pack/scripts/validate-risk-artifacts.mjs process/general-plans/active/username-password-login_18-11-26/harness/` and require exit 0.
13. Confirm the backlog stub `process/general-plans/backlog/username-login-rate-limit_NOTE_18-11-26.md` exists (written at this PLAN supplement) and link it from the phase report; run the final scope check against the step 1 `git status --short` baseline.

## Failure Modes

| Failure | Behaviour |
|---|---|
| Unknown username or wrong password | identical 401 |
| `usernames` table missing (migration not applied) | lookup error -> fixed 503; Google login unaffected |
| Server secret key missing | 503 |
| Email provider disabled in dashboard | sign-in errors -> 401 (indistinguishable); runbook step 1 covers it |
| Sign-up stays ON (owner decision) | Google first-time users work; self-made email accounts may exist but have no mapping and cannot use username login (accepted residual) |
| Auth user without a mapping row | cannot log in with password (by design) |
| `SITE_URL` missing or invalid (`getSiteOrigin()` throws) | 503 fixed body, never an unhandled 500 |
| Supabase Auth 429 / 5xx / network error on sign-in, or `getUserById` non-404 error | 503 `temporarily_unavailable` (shared egress-IP bucket can cause a lockout; accepted) |

## Verification Evidence

SPEC was skipped, so the criteria below are the locked user decisions (AC ids local to this plan; each gate names the AC it proves and each AC is proven by the named gate).

| Gate / Scenario | Strategy | Proves SPEC criterion |
|---|---|---|
| AC1 `npx.cmd vitest run src/app/api/auth/password src/lib/auth`: happy path sets the session cookie (proven by: route.test happy path) | Fully-Automated | AC1 login sets the normal Supabase session |
| AC2 route tests: unknown username and wrong password return byte-identical 401 (proven by: route.test enumeration case) | Fully-Automated | AC2 no user enumeration |
| AC3 route tests: invalid input 400, bad Origin 403, missing key 503, no identifiers logged (proven by: route.test validation/origin/log cases) | Fully-Automated | AC3 validation, origin check, no sensitive logging |
| AC4 `npx.cmd vitest run src/components/auth`: submit, pending, error, success (proven by: CredentialLoginForm.test) | Fully-Automated | AC4 real working form in the dialog with Vietnamese strings |
| AC5 `node scripts/test-checkout-guard-db.mjs` applies the new migration and `username-login.sql` incl. grant/RLS checks (proven by: username-login.sql + runner grant checks) | Hybrid (runner-managed embedded Postgres) | AC5 short schema works, is service_role-only, existing checkout migrations unaffected |
| AC6 `npm.cmd test` (expect only the known failing `src/lib/supabase/route-client.test.ts`), `npx.cmd eslint <touched paths> --max-warnings=0`, `npm.cmd run typecheck`, `npm.cmd run build` (retry once for the known advisory stop) | Fully-Automated | AC6 no regression, no new src lint or type problem |
| AC7 owner probe on the hosted project: create a test user, map username, log in via dialog, header shows the signed-in state with display name "Bạn", refresh keeps session, logout works, Google login still works; also note how a Supabase 429 looks (proven by: owner probe record) | Agent-Probe (owner-run, `agent-browser` optional) | AC7 end-to-end real Supabase behaviour that mocks cannot prove |
| AC8 owner check: a self-created email account (public signUp, allowed by owner decision) gets 401 from `/api/auth/password` and has no `usernames` row (proven by: owner check record + AC2 unmapped-user route test) | Agent-Probe (owner-run) | AC8 unmapped accounts cannot use username login |
| HR1 `node .claude/skills/vc-risk-evidence-pack/scripts/validate-risk-artifacts.mjs process/general-plans/active/username-password-login_18-11-26/harness/` exits 0 (proven by: harness/ pack incl. independent vc-code-reviewer `review-decision.json` and `adversarial-validation.json`) | Fully-Automated (structure) + manual independent reviewer decision | HIGH-risk (auth + migration) evidence pack exists and is reviewed (supports AC1-AC3, AC5, AC8) |
| AC3b route tests: no `set-cookie` on any 400/401/403/503; `getSiteOrigin()` throw -> 503; every response (incl. 403) has `Cache-Control: private, no-store`; unmapped path performs nil-UUID `getUserById` and dummy sign-in on the plain cookie-less client; error-semantics table, one case per row (proven by: route.test cases) | Fully-Automated | AC2 / AC3 (no enumeration, no cookie leak, fail-closed errors) |
| Known gap: edge/brute-force rate limiting, shared egress-IP bucket and timing-equalization effectiveness | Known-Gap residual: backlog stub `process/general-plans/backlog/username-login-rate-limit_NOTE_18-11-26.md` written; AC1-AC3 gates stay valid; AC7/AC8 stay CONDITIONAL until the owner records them | none (residual) |

Test tier note: `process/context/tests/all-tests.md` was read in full. Hosted Supabase behaviour is never proven by Vitest or the isolated runner.

## Test Infra Improvement Notes

(none identified yet) Candidate: the SQL runner's fixed expected-file list must be edited for every new SQL test (step 8).

## Dependencies and Risks

- Migration already applied in production by the owner (owner-reported); remaining owner dependency: verification query, dashboard confirmation, first account (blocks only AC7/AC8, not code-done). Parity risk: if EXECUTE alters the SQL, production diverges; any change needs a NEW migration.
- Risks: (1) timing oracle, mitigated by the dummy sign-in; (2) sign-ups stay ON by owner decision: anyone can create an email/password account via the Supabase public signUp API; it cannot use username login (no `usernames` row, service_role-only writes) and equals a Google-created account for ordering; ACCEPTED RESIDUAL known-gap (keep Confirm email ON); (3) admin `getUserById` needs the service key (same key as checkout); (4) header shows "Bạn", not the username or email (cosmetic, accepted); (5) shared egress-IP rate bucket can lock out all password logins (429 -> 503), ACCEPTED known-gap with backlog stub; (6) residual timing difference after equalization (accepted).
- Risk Predictions: the likeliest defect is a missing Set-Cookie because the response object given to `createRouteClient` is not the one returned; the route test asserts cookies on the returned response.

## Resume and Execution Handoff

1. Selected plan file: `process/general-plans/active/username-password-login_18-11-26/username-password-login_PLAN_18-11-26.md`
2. Last completed step: PLAN written; no source edits made.
3. Validate-contract status: written 2026-11-18 (outer-pvl, PASS after PVL cycle 1); next is EXECUTE. Owner-reported: production `public.usernames` SQL already applied; sign-ups stay ON.
4. Supporting context loaded: `process/context/all-context.md`, `process/context/tests/all-tests.md`, `process/development-protocols/orchestration.md`; code read: auth routes, `route-client.ts`, `server.ts`, `CredentialLoginForm.tsx`, `LoginDialog.tsx`, sign-in page, `scripts/test-checkout-guard-db.mjs` (migration discovery), migration `202611130001` (profiles).
5. Next step for a fresh agent: ENTER VALIDATE MODE on this plan, then EXECUTE (opus) in checklist order with tests first; spawned vc-tester runs the EVL gate re-run. High-risk (auth + migration): the task `harness/` folder needs a `vc-risk-evidence-pack` evidence pack validated by `node .claude/skills/vc-risk-evidence-pack/scripts/validate-risk-artifacts.mjs <task-folder>/harness/` before closure. Migrations are applied by the owner, never by agents; secrets never go in tracked files.
Plan validator: `node .claude/skills/vc-generate-plan/scripts/validate-plan-artifact.mjs <plan-path>`.

## Validate Contract

Status: PASS
Date: 18-11-26
date: 2026-11-18
generated-by: outer-pvl
supersedes: 2026-11-18 (outer-pvl) — re-validation after PVL cycle 1 (9/9 supplement gaps applied and verified in plan text)

Parallel strategy: sequential
Rationale: 7-signal score 3/7 (S2 auth/schema surface, S6 high-risk class, S7 about 8 files in blast radius); dominant signal is the high-risk auth + migration class, but the files are coupled (`username.ts` is shared by route and form), so one opus execute agent in checklist order, then an independent sonnet vc-tester EVL run and a sonnet vc-code-reviewer for the evidence pack.

Test gates (C3 5-column table):

| criterion id | behavior | strategy | proving test | gap-resolution |
|---|---|---|---|---|
| AC1 | Correct username + password returns 200 `{ok:true}` and the Supabase session cookies are on the RETURNED response | Fully-Automated | `npx.cmd vitest run src/app/api/auth/password src/lib/auth` (route.test happy path) | B |
| AC2 | Unknown username and wrong password return a byte-identical 401; the unmapped path still performs exactly one `getUserById` and one dummy sign-in on the plain cookie-less client | Fully-Automated | same command (route.test enumeration case) | B |
| AC3 | Invalid body / short / overlong (bytes) password / bad username 400, bad or missing Origin 403, `getSiteOrigin()` throw 503, missing or malformed secret key 503, lookup error 503, no identifier in any console call | Fully-Automated | same command (route.test validation/origin/log cases) | B |
| AC3b | Error-semantics table one case per row (`getUserById` 404 / no-email / other error, `signInWithPassword` invalid_credentials / email_not_confirmed / 429 / >=500 / network); no `set-cookie` on any 400/401/403/503; `Cache-Control: private, no-store` on every response incl. 403 | Fully-Automated | same command (route.test error-mapping, no-cookie and no-store cases) | B |
| AC4 | Dialog form submits JSON to `/api/auth/password`, shows pending, shows the generic Vietnamese 401 message and clears the password, calls a stubbed `window.location.assign("/")` on 200, blocks invalid input without calling fetch | Fully-Automated | `npx.cmd vitest run src/components/auth` (CredentialLoginForm.test) | B |
| AC5 | New migration applies cleanly; `public.usernames` is service_role-only, RLS on; CHECK, unique user_id and cascade work | Hybrid | `node scripts/test-checkout-guard-db.mjs` (precondition: embedded PostgreSQL binary available, port free; runs `supabase/tests/username-login.sql` + runner grant checks; expected SQL list becomes the sorted 3-file list) | B |
| AC6 | No regression in tests, scoped lint, types, build | Fully-Automated | `npm.cmd test` (only the known failing `src/lib/supabase/route-client.test.ts` allowed), `npx.cmd eslint <touched paths> --max-warnings=0`, `npm.cmd run typecheck`, `npm.cmd run build` (retry once for the known Next 16.4.3 advisory stop; record both exit codes) | B |
| HR1 | High-risk evidence pack exists and is structurally valid, with an independent reviewer decision | Fully-Automated (structure) + manual reviewer decision | `node .claude/skills/vc-risk-evidence-pack/scripts/validate-risk-artifacts.mjs process/general-plans/active/username-password-login_18-11-26/harness/` exit 0 | B |
| AC7 | Real hosted login end to end: session cookie set, header shows signed-in state with display name "Bạn", refresh keeps session, logout works, Google login still works; includes hosted `auth.admin.getUserById` with the `sb_secret_` key and how a 429 looks | Agent-Probe | owner probe on the hosted project (checklist step 11) | C |
| AC8 | A self-created email account gets 401 from the route and has no `usernames` row | Agent-Probe | owner check (checklist step 11) plus the AC2 unmapped-user route test | C |
| RL1 | Edge/brute-force rate limiting, shared egress-IP limit bucket, timing-equalization effectiveness | (named residual, not a proving strategy) | none; backlog stub written: `process/general-plans/backlog/username-login-rate-limit_NOTE_18-11-26.md` | D |

Failing stub (AC1):
test("should set the Supabase session cookies on the returned 200 response for a mapped user with the right password", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub: AC1 happy path sets session cookie on returned response")
})

Failing stub (AC2):
test("should return a byte-identical 401 for an unknown username and for a wrong password, and perform exactly one getUserById and one dummy sign-in on the plain client for the unknown username", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub: AC2 no user enumeration")
})

Failing stub (AC3):
test("should return 400 for invalid input, 403 for a bad Origin, 503 for a getSiteOrigin throw, a missing secret key or a lookup error, and never log username/password/email/user_id", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub: AC3 validation, origin and logging")
})

Failing stub (AC3b):
test("should map each upstream outcome per the error table, send no set-cookie on any 400/401/403/503, and send Cache-Control private no-store on every response", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub: AC3b error semantics, no cookie leak, no-store")
})

Failing stub (AC4):
test("should submit the credentials as JSON, show pending, show the generic Vietnamese error on 401 and clear the password, and navigate on 200", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub: AC4 CredentialLoginForm behavior")
})

Legacy line form:
- Route and username parsing: Fully-automated: `npx.cmd vitest run src/app/api/auth/password src/lib/auth`
- Dialog form: Fully-automated: `npx.cmd vitest run src/components/auth`
- Migration and grants: hybrid: `node scripts/test-checkout-guard-db.mjs` + embedded PostgreSQL available
- Regression: Fully-automated: `npm.cmd test` + `npx.cmd eslint <touched paths> --max-warnings=0` + `npm.cmd run typecheck` + `npm.cmd run build`
- High-risk evidence pack: Fully-automated (structure): `node .claude/skills/vc-risk-evidence-pack/scripts/validate-risk-artifacts.mjs <task-folder>/harness/` + manual independent reviewer decision
- Hosted login and unmapped-account check: agent-probe: owner-run on the hosted Supabase project
- Rate limiting and timing: known-gap: documented (backlog stub exists)

Supplement-gap closure check (re-validation 2026-11-18, each verified in plan text and against code):
- Gap 1 dummy sign-in client: CLOSED — Route Design step 4 and checklist step 4 specify a plain `@supabase/supabase-js` client (publishable key, persistSession false, autoRefreshToken false), never `createRouteClient`, never the service client; AC3b asserts no set-cookie.
- Gap 2 timing: CLOSED — nil-UUID `getUserById` plus one dummy sign-in on the unmapped path; residual timing difference named and accepted.
- Gap 3 error semantics: CLOSED — step 6 table with one route test per row; 400/401/403/503 body strings fixed.
- Gap 4 shared egress rate bucket: CLOSED as recorded residual — accepted known-gap, backlog stub exists on disk (verified).
- Gap 5 origin throw and no-store: CLOSED — origin read wrapped (503), `Cache-Control: private, no-store` on every response incl. 403; the difference from `google`/`logout` (verified: their 403 has no header) is stated as deliberate.
- Gap 6 header fallback: CLOSED — `getAuthView()` fallback "Bạn" verified at `src/lib/supabase/session.ts:30`; plan text, AC7 and runbook all say "Bạn".
- Gap 7 evidence pack: CLOSED — checklist step 12, touchpoint row and HR1 gate row present.
- Gap 8 runner list, runbook, password length: CLOSED — `EXPECTED_SQL_TESTS` current value verified at `scripts/test-checkout-guard-db.mjs:22`; sorted 3-file list and `.sort()` directory listing (line 231) consistent; runbook step 0 constraint query; 8-72 byte rule in route, `username.ts`, runbook.
- Gap 9 form details: CLOSED — `window.location.assign` stub, `TextEncoder`, git-status baseline, pre-edit backup of the untracked form, rollback caveat.
- Regression scan: steps numbered 1-13 consistently ("13 steps" in header); AC1-AC8 + HR1 + AC3b rows consistent between Acceptance Criteria, Verification Evidence and this contract; the old contract was replaced, not appended (single contract, single verdict line); plan validator 0 failures, 0 warnings. Two minor wording fixes applied during V6: "9 statements" corrected to "4 statements (9 lines)" in Owner-Applied State, and stale Status / Resume lines updated.

Dimension findings:
- Infra fit: PASS — all paths resolve (`src/lib/auth` is a new dir; `getSiteOrigin` in `src/lib/supabase/config.ts`; service-role guard in ticket-orders route lines 196-203); shared egress bucket is a recorded accepted residual (RL1), hosted `getUserById` behavior is covered by the AC7 owner probe.
- Test coverage: PASS — AC1-AC6, AC3b and HR1 are concrete and runnable; every developed behavior has a Fully-Automated or Hybrid gate (not vacuously green); AC7/AC8 Agent-Probe rows are owner-run accepted residuals.
- Breaking changes: PASS — purely additive (new route, new service_role-only table); no existing contract, table, function or grant changed.
- Security surface: PASS — no FAIL, no open CONCERN. Single generic 401, mirrored unmapped path on a cookie-less client, no set-cookie on non-200, no identifier logging, Origin check with `getSiteOrigin()` throw handled, `usernames` writes service_role-only; sign-ups ON, shared rate bucket and residual timing are explicitly owner-accepted known-gaps.
- Section A (migration + SQL test + runner): PASS — runner discovers the new migration automatically and sorts it after `202611170003`; copy the SQL block verbatim (parity with production); sorted expected SQL list. Highest-risk edit: repo SQL diverging from production text.
- Section B (username.ts): PASS — pure module, `TextEncoder` byte rule, no env access.
- Section C (route): PASS — highest-risk edit and likeliest defect (Set-Cookie not on the returned response) is covered by AC1 and AC3b assertions on the returned response.
- Section D (form): PASS — `LoginDialog.test.tsx` has no "sắp ra mắt" assertion (grep: only `CredentialLoginForm.tsx` line 13, which is rewritten); untracked-file backup step present.
- Section E (runbook, evidence pack, docs): PASS — step 0 verification, constraint query, evidence-pack step and HR1 gate present.

Execute-agent instructions:
- E1: Write the migration file with exactly the SQL block from the plan (4 statements, 9 lines; same text, `if not exists` kept). Never edit it afterwards; never apply it to any hosted database.
- E2: Tests first (red stubs above), then code, in checklist order 1-13.
- E3: The dummy sign-in must use a plain `@supabase/supabase-js` client (publishable key, `persistSession:false`, `autoRefreshToken:false`), never `createRouteClient` and never the service-role client; discard its result and its thrown errors; assert no `set-cookie` header on any 400/401/403/503.
- E4: Cookies must be asserted on the response object that is RETURNED.
- E5: `username.ts` must not touch `process.env` or `Buffer`; use `TextEncoder`.
- E6: Run Vitest via PowerShell or `cmd.exe //c "npx.cmd vitest run ..."` (Git Bash path casing fails). Never run `typecheck` and `build` concurrently (both write `.next`).
- E7: Record `git status --short` before editing; other uncommitted tasks share the tree, so the final scope check compares against that baseline. Do not discard the untracked `CredentialLoginForm.tsx`.
- E8: Never open environment files or print secret values; route tests stub `SUPABASE_SECRET_KEY=sb_secret_test`, the two `NEXT_PUBLIC_SUPABASE_*` vars and `SITE_URL`.
- E9: Evidence pack folder `harness/` inside the task folder; the reviewer decision must come from an independent reviewer (vc-code-reviewer), not the execute agent.
- E10: Call-count rule for the unmapped path: assert exactly ONE `auth.admin.getUserById` and exactly ONE dummy `signInWithPassword` on every unmapped branch. The `getUserById` argument is the nil UUID when the username lookup missed, and the real id when that call itself returned 404 / user_not_found (not repeated). Checklist step 5 wording "both the nil-UUID getUserById and the dummy" applies to the username-not-found branch.

Open gaps (recorded residuals, none open as CONCERN):
- RL1 edge/brute-force rate limiting and the shared egress-IP bucket: known-gap: documented as NEW PLAN REQUIRED — see backlog/username-login-rate-limit_NOTE_18-11-26.md
- Timing-equalization effectiveness unproven (best effort): known-gap: documented (owner-accepted)
- Sign-ups left ON: self-made email accounts exist but cannot use username login: known-gap: documented (owner decision 2026-11-18)
- AC7/AC8 owner probes not yet run: owner-run Agent-Probe residuals; the plan stays CODE DONE (not VERIFIED) until the owner records them
- Production `public.usernames` text parity and hosted behavior are owner-reported, not agent-verified (runbook step 0)

What this coverage does NOT prove:
- AC1-AC3b route tests (mocked supabase-js and `createRouteClient`): do NOT prove real GoTrue behavior, real Set-Cookie writing by `@supabase/ssr` on the live client, hosted `getUserById` with an `sb_secret_` key, real response timing, or Auth rate-limit behavior.
- AC4 form test (jsdom, mocked fetch, stubbed `window.location`): does NOT prove real browser navigation, focus/scroll behavior of the dialog, or visual fidelity.
- AC5 runner (disposable embedded PostgreSQL with a stubbed `auth.users`): does NOT prove the SQL is applied to production, that production grants match, or hosted PostgREST exposure; it does not exercise real Supabase default privileges.
- AC6: does NOT prove interaction or visual correctness; `build` first-run exit 1 is the known Next 16.4.3 advisory, not a pass signal.
- HR1: structural validation only; it does not prove the reviewer's judgment or that listed adversarial scenarios are exhaustive.
- Nothing here proves brute-force resistance, absence of a timing oracle, or that a self-created account cannot reach orders beyond what a Google account can.

Gate: PASS
Accepted by: not required for PASS. Recorded owner-accepted residuals (owner decision 2026-11-18): shared egress-IP rate bucket (RL1), small residual timing difference, sign-ups left ON, hosted probes AC7/AC8 owner-run.

## Deviations

- `src/components/auth/CredentialLoginForm.tsx`: added one `// eslint-disable-next-line @next/next/no-location-assign-relative-destination` above the plan-mandated `window.location.assign("/")`. Why: the scoped lint gate (`--max-warnings=0`) flags that call; the plan requires full navigation so the header re-reads the cookie. Impact: none on behavior; within blast radius.
- `harness/review-decision.json` not written by EXECUTE (E9 requires an independent reviewer). Resolved 2026-11-18: vc-code-reviewer wrote `approved-with-concerns`; HR1 re-run exit 0 (0 failures, 0 warnings).

## Autonomous Goal Block

```
SESSION GOAL: Username + password login for organizer-created Supabase accounts (POST /api/auth/password, public.usernames, real CredentialLoginForm)
Charter + umbrella plan: N/A — single plan: process/general-plans/active/username-password-login_18-11-26/username-password-login_PLAN_18-11-26.md
Autonomy: proceed through reversible steps without asking (feedback_autonomous_phase_execution.md); autonomy removes approval pauses only; spawn vc-execute-agent (opus) for edits and vc-tester for the EVL re-run; never inline.
Hard stop conditions / safety constraints:
- Never apply or edit a migration on any hosted database; never edit the applied 202611180001 file after creating it (changes = NEW migration)
- Never print, log or commit secret values, passwords, emails or user ids; never open environment files
- Repo SQL must equal the SQL block (4 statements) the owner already ran in production
- Do not touch checkout, orders, payments, Sheets, Google login, or turn PAYOS_CHECKOUT_ENABLED on
- Do not add dependencies or upgrade Next.js
- Stop and ask before any outward-facing or irreversible action not in this contract
Next phase: EXECUTE: process/general-plans/active/username-password-login_18-11-26/username-password-login_PLAN_18-11-26.md
Validate contract: inline in plan (## Validate Contract), PASS after PVL cycle 1; residuals RL1, timing, sign-ups ON, AC7/AC8 owner-run
Execute start: npx.cmd vitest run src/app/api/auth/password src/lib/auth src/components/auth | node scripts/test-checkout-guard-db.mjs | npm.cmd test + npx.cmd eslint <touched paths> --max-warnings=0 + npm.cmd run typecheck + npm.cmd run build | owner probe AC7/AC8 (hosted login, unmapped account 401) | high-risk pack: yes (harness/ validated by validate-risk-artifacts.mjs)
```

## UPDATE PROCESS Status (2026-11-18)

Classification: Keep in active/testing. Not archived; do not move to completed/ until AC7/AC8 are recorded by the owner.

| Item | Result |
|---|---|
| EVL (independent vc-tester) | AC1-AC3b route+username tests 9/9; AC4 form tests 15/15; AC5 embedded-PG runner green (migration 202611180001, 3 SQL tests, usernames permissions); AC6 scoped eslint 0, typecheck 0, build exit 0 on retry (first run stopped by the known Next 16.4.3 advisory); HR1 exit 0 |
| Full `npm test` | 2 failures outside this task: `src/lib/supabase/route-client.test.ts` "requires secure cookies in production" (pre-existing) and `src/components/FormPopup.test.tsx` T12 (see closeout, owner question) |
| Code review | approved-with-concerns; no blocking findings. Medium: route.ts maps any non-429 400/401 to generic 401, hiding config outages (backlog: `process/general-plans/backlog/username-login-error-mapping_NOTE_18-11-26.md`). Low: no upstream timeout; `SITE_URL` unset in production means every login gets 403 |
| Owner-pending | AC7 hosted login probe; AC8 self-created account gets 401; create account `loihoidap199x` (password never recorded); confirm `SITE_URL` set in production; run runbook step 0 checks |
| Accepted residuals | RL1 shared egress-IP rate bucket (backlog stub exists), small timing difference, Supabase sign-ups ON |
| Closeout packet | `username-password-login_REPORT_18-11-26.md` (appended section "UPDATE PROCESS Closeout Packet") |

## Phase Loop Progress

- [x] 7. UPDATE PROCESS: context updated, closeout written; plan intentionally kept in active/ (owner AC7/AC8 pending); not committed

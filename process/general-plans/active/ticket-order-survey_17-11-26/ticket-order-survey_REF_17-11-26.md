---
name: ref:ticket-order-survey-runbook
description: "Owner runbook for rolling out the ticket order survey: production order, SQL grant checks, Sheet-copy probe (GJ.10), requeue use, caveats and rollback."
date: 18-11-26
metadata:
  node_type: memory
  type: references
  feature: general
  phase: P6
---

# Ticket order survey: rollout and operations runbook

Audience: the project owner. Agents never run any step below (no migration, no env change, no deploy, no checkout enable, no real Sheet or PayOS).

**BLUF:** Roll out in the order in section 1. Checkout stays OFF until the last step. Migration `202611170003` is NOT applied to any hosted database yet (`create_ticket_order_v5`, migration `202611170001`, IS applied to production per the owner's read-only check on 2026-11-18); production still runs the old app with a 14-column writer while the real Sheet is already the 17-column A:Q layout, so nobody may trigger a Sheet sync until the new app is deployed.

## 0. Current state (verified from the repo on 2026-11-18)

- Migration `supabase/migrations/202611170003_ticket_order_survey.sql` exists in the repo only. Production already has `create_ticket_order_v4`, `create_ticket_order_v5`, `202611170002` and `202611140007`. Owner check on 2026-11-18 (read-only, production SQL Editor): `create_ticket_order_v4 = true`, `create_ticket_order_v5 = true`; grant check for v5: `service_role` true, `anon` false, `authenticated` false.
- Production app: old version (14-column Sheet writer). Real Sheet: already 17 columns (A:Q). Checkout: OFF (`PAYOS_CHECKOUT_ENABLED` not `"true"`).
- Local `.env` still has the previous 14-column range. Only the owner edits it; local sync fails closed with `invalid_range` until then.

## 1. Production order (owner-run)

1. Keep checkout OFF. Back up the Google Sheet. Make a copy that has a `Registrations` tab with the A:Q layout; share it with the service account. This copy is used in step 4.
2. Read-only pre-check (section 1a), then apply migration `202611170003` in the Supabase SQL Editor ONCE (section 1b notes). Run the verification queries in section 2 and confirm every expected value.
3. Set `GOOGLE_SHEETS_PAID_ORDERS_RANGE=Registrations!A:Q` and deploy, in ONE step (env changes take effect only on the next deploy). Until the new app is live, nobody calls `POST /api/internal/sheets-sync` or `enqueue_paid_ticket_sheet_sync`: the old app would append 14 columns into the 17-column Sheet.
4. Manual probe (GJ.10, AC15), section 4.
5. Restore `GOOGLE_SHEETS_SPREADSHEET_ID` to the real Sheet and redeploy while checkout is OFF. Check that the worker writes to the correct rows.
6. Set `PAYOS_CHECKOUT_ENABLED=true` and deploy. PRECONDITIONS (all must be true BEFORE this step; otherwise leave checkout OFF):
   - Consent and retention for survey answers sent to the third-party Sheet are decided AND a notice text has been added to the form.
   - An external scheduler, or a documented manual routine, that calls `POST /api/internal/sheets-sync` is in place, and someone watches failed outbox rows (the repo has no scheduler and no retry cap or alert).

If the new code goes live before the migration: the route only logs a survey save failure (checkout is not blocked); the worker fails safe with `survey_read_failed` and heals after the migration is applied.

### 1a. Read-only pre-check before the migration

Migration `202611170003` builds on `create_ticket_order_v5`. Run in the SQL Editor (expected `true`):

```sql
select to_regprocedure('public.create_ticket_order_v5(uuid,uuid,text,text,text,text,integer,integer,text)') is not null;
```

If it returns `false`, apply migration `202611170001` first (and verify its grants: `service_role` true, `anon` false, `authenticated` false), then continue.

### 1b. Migration notes

- Migration `202611170003` is NOT re-runnable (`create table public.ticket_order_survey` has no `if not exists`). Do not run it twice; a second run aborts atomically and changes nothing.
- If the new RPCs return `PGRST202` (function not found in schema cache) right after applying, run `notify pgrst, 'reload schema';` in the SQL Editor and retry.

## 2. SQL verification queries (run after step 2; read-only)

Four functions, three roles. Expected: `service_role` true, `anon` false, `authenticated` false for every row.

```sql
select f.sig,
       has_function_privilege('anon', f.sig, 'EXECUTE')          as anon_can_execute,
       has_function_privilege('authenticated', f.sig, 'EXECUTE') as authenticated_can_execute,
       has_function_privilege('service_role', f.sig, 'EXECUTE')  as service_role_can_execute
from (values
  ('public.ticket_survey_source_valid(text[])'),
  ('public.upsert_ticket_order_survey(uuid, uuid, text[], text, text)'),
  ('public.get_ticket_order_survey(uuid)'),
  ('public.requeue_synced_sheet_sync_for_survey(uuid)')
) as f(sig);
```

Table grants. Expected: anon and authenticated false for select/insert/update/delete; service_role true for select/insert/update.

```sql
select r.role_name,
       has_table_privilege(r.role_name, 'public.ticket_order_survey', 'SELECT') as can_select,
       has_table_privilege(r.role_name, 'public.ticket_order_survey', 'INSERT') as can_insert,
       has_table_privilege(r.role_name, 'public.ticket_order_survey', 'UPDATE') as can_update,
       has_table_privilege(r.role_name, 'public.ticket_order_survey', 'DELETE') as can_delete
from (values ('anon'), ('authenticated'), ('service_role')) as r(role_name);
```

Row level security on (expected `true`):

```sql
select c.relrowsecurity from pg_class c
where c.oid = 'public.ticket_order_survey'::regclass;
```

SECURITY DEFINER with an empty search_path for the three definer functions (expected: `prosecdef = true`, and `proconfig` contains `search_path=""`; the helper `ticket_survey_source_valid` is not SECURITY DEFINER but also has `search_path=""`):

```sql
select p.proname, p.prosecdef, p.proconfig
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('ticket_survey_source_valid', 'upsert_ticket_order_survey',
                    'get_ticket_order_survey', 'requeue_synced_sheet_sync_for_survey')
order by p.proname;
```

If any value differs from the expectation, stop: leave checkout OFF and do not continue to step 3.

## 3. Caveats the owner must know

- **Pre-cutover 14-column rows.** Paid rows already in the real Sheet from the old app were written with the order ID at index 10. The new lookup uses index 13 (column N), so a re-sync would append a duplicate row. Fix the layout by hand or delete those rows, and do NOT requeue or enqueue those orders (they have no survey row, so the requeue function would not touch them anyway).
- **Old app PayOS webhook also drains the outbox.** The PayOS webhook route calls `drainPaidTicketSheetOutbox`. Keep checkout OFF, and make sure PayOS links created earlier have expired or no paid webhook can arrive, before step 3. A late paid event handled by the old app would trigger a 14-column sync into the 17-column Sheet.
- **Local `.env`.** It still has the previous 14-column range. The owner edits it; agents never touch it. Until then local sync reports `invalid_range` (this is the intended fail-closed behavior).
- **Forward-fix only.** The database is forward-only: roll back with a NEW migration, never by editing an applied one. Reverting the app is NOT clean once the Sheet is A:Q (the old app writes 14 shifted columns). Prefer keeping checkout OFF and fixing forward; revert the app only if you also restore the old Sheet layout.
- **Never drop `public.ticket_order_survey`.** It holds user answers. Export first, or keep the table and stop using it. The four new functions are service_role-only, so leaving them is harmless.
- **Consent and retention** for survey data sent to the third-party Sheet are undecided: this is a PRECONDITION of step 6 (decided, and a notice text added to the form), not only a caveat.
- **Requeue overwrites hand edits.** `requeue_synced_sheet_sync_for_survey` makes the worker re-sync the whole A:Q row (written RAW), overwriting any hand edits in that row, including hand-fixed pre-cutover rows. Check the row before requeueing.

## 4. Manual probe on a Sheet COPY (GJ.10, AC15; owner-run)

Window rule: this probe needs checkout ON briefly on production, so a real customer could buy during it and their row would go to the copy.

1. Set `GOOGLE_SHEETS_SPREADSHEET_ID` to the Sheet COPY (same `Registrations` tab, same A:Q), keep `GOOGLE_SHEETS_PAID_ORDERS_RANGE=Registrations!A:Q`, set `PAYOS_CHECKOUT_ENABLED=true`, deploy. Do not use a Vercel preview that shares the production Supabase.
2. Create ONE test order end to end (answer all three survey questions, pay). This is a real order and payment in the production database; the owner decides how to handle it.
3. Call `POST /api/internal/sheets-sync` with the bearer worker secret (use the real secret privately).
4. On the copy check: exactly 17 columns; G = source labels joined with `;`; H = area; M = attendance certainty; order ID in column N.
5. Restore the real spreadsheet ID, redeploy with checkout OFF (step 5).
6. Reconcile paid orders created during the window: those that reached the copy instead of the real Sheet and have a survey can be re-sent with `select public.requeue_synced_sheet_sync_for_survey('<order uuid>');` followed by a sync call. Rows for orders that were synced to the copy but have no survey row must be handled by hand.
7. Record the observation (date, what was checked). Until then AC15 stays CONDITIONAL. This probe also exercises K.2 (PostgREST passing a JS array to a `text[]` argument) for real.

## 4a. Detecting orders that have no survey row (read-only)

Paid orders created after the cutover that have NO row in `public.ticket_order_survey` (the survey save failed or timed out, or the order was created by an old app instance). Replace the timestamp with the time you applied migration `202611170003` and deployed the new app. SELECT only:

```sql
select o.id as order_id, o.created_at, o.status
from public.orders o
left join public.ticket_order_survey s on s.order_id = o.id
where o.status = 'paid'
  and o.created_at >= timestamptz '2026-11-18 00:00:00+07'  -- REPLACE with the cutover time
  and s.order_id is null
order by o.created_at;
```

Answers for these orders were never stored and are UNRECOVERABLE: `requeue_synced_sheet_sync_for_survey` cannot help (it only acts when a survey row exists). Contact the buyer or accept blank G/H/M. Do not requeue them.

## 5. Requeue function usage

`public.requeue_synced_sheet_sync_for_survey(p_order_id uuid) returns boolean` resets one outbox row to `pending` (next attempt now, lease cleared, error code cleared) only when: the order is paid, a survey row exists, and the paid outbox row is `synced`. It returns `false` and changes nothing otherwise. After `true`, call `POST /api/internal/sheets-sync`; the worker re-reads the survey and updates the existing Sheet row (found by order ID in column N). It never calls claim/complete/fail/enqueue.

Use it for the late-survey race (AC20, accepted known gap): the order synced before its survey was saved, so G/H/M are blank although a survey row exists.

## 6. What this runbook does not cover

Hosted latency of the 1500 ms survey join, live PayOS, a real production Sheet write, automatic race detection, a scheduler for the sync endpoint and an outbox retry cap/alert. See the backlog NOTE `process/general-plans/backlog/ticket-order-survey-followups_17-11-26/ticket-order-survey-followups_NOTE_17-11-26.md`.

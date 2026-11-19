---
name: plan:checkout-deadline-10min
description: "Extend the ticket checkout payment deadline (order and PayOS link) from 5 to 10 minutes via one forward-only migration plus 3 TypeScript fallback constants and tests."
date: 19-11-26
feature: general
phase: PLAN
status: planned
complexity: simple
metadata:
  node_type: memory
  type: plan
---

# Checkout payment deadline 5 -> 10 minutes - Plan

**Date**: 19-11-26
**Complexity**: SIMPLE (one session, 11 steps), risk class HIGH (billing/payments + schema migration)
**Status**: PLANNED
**Selected plan**: `process/general-plans/active/checkout-deadline-10min_19-11-26/checkout-deadline-10min_PLAN_19-11-26.md`

**BLUF:** Two SQL spots define the 5-minute window: the `orders.payment_expires_at` column default and the link expiry inside `prepare_payos_checkout`. One new migration changes both to 10 minutes. The app already sends PayOS the DB-chosen expiry, so only three fallback constants (300 s) in one TypeScript file change. Apply the DB migration first, deploy the app in the same window. In-flight orders keep their 5-minute deadline.

**TL;DR:** 1 migration (2 statements), 1 TS file (3 constants), tests in 3 files, owner applies SQL then deploys.

## Overview and Decision Record

SPEC and INNOVATE were skipped: the owner locked the decision ("chinh lai 10 phut") after a real customer paid through PayOS 39 seconds after the 5-minute deadline. That payment hit the late rule (`v_link.expires_at <= now()` in `process_payos_webhook`, `202611140009_fix_payos_webhook_outbox_conflict.sql:29`), so the order went to `reconciliation` with `failure_code = late_or_terminal_payment` instead of `paid`. Related but OUT of scope: a separate read-only agent is drafting a one-off remediation SQL for that single order.

**Goals / success metrics**
- New orders get `payment_expires_at = created + 10 min`; new PayOS links get `expires_at = least(order deadline, prepare time + 10 min)`; PayOS `expiredAt` equals that value (already true, see Findings).
- Strike guard (3 strikes / 1 hour window / 24 h block), 60 s creation lease, and the late-payment-to-reconciliation rule behave exactly as before.

**Out of scope:** scheduled expiry sweep, PayOS reconcile function, the single-order remediation, strike-window changes, UI countdown (none exists), backfill of existing pending orders.

## Findings: every place the 5-minute window lives (verified by grep, 19-11-26)

| # | Location | What | Action |
|---|---|---|---|
| 1 | `supabase/migrations/202611130001_ticket_sales.sql:55` | `orders.payment_expires_at ... default (now() + interval '5 minutes')`. No order insert (`130002:53`, `130003:73`, `130005:142`) sets the column, so every order gets the default. This is the ORDER deadline. | Change default (migration stmt 1) |
| 2 | `202611150001_checkout_access_guard.sql:151` (latest definition of `prepare_payos_checkout`, lines 108-155) | `least(v_order.payment_expires_at, v_now + interval '5 minutes')` = link `expires_at`. Superseded copies: `140006:86`, `140008:44`. This is the LINK deadline and the late-payment cutoff in `process_payos_webhook`. | Redefine function, change literal to `'10 minutes'` |
| 3 | `202611170001_ticket_order_checkout_v5.sql:56` | v5 calls `prepare_payos_checkout`; v3/v4/v5 contain no `5 minutes` literal. | No change (inherits #2) |
| 4 | `src/lib/payments/payos/checkout.ts:138` | `nowMs + 300_000` only when `input.expiresAt` is absent. The route always passes `row.checkout_expires_at` (`src/app/api/ticket-orders/route.ts:289`), so PayOS `expiredAt` (`checkout.ts:140,150`) already tracks the DB. | Change to `600_000` (a fallback must not be shorter than the DB) |
| 5 | `checkout.ts:89` and `checkout.ts:121` | `Math.floor(Date.now()/1000) + 300` in webhook/lookup return values; the route never reads `link.expiresAt` from these paths. | Change to `600` for consistency |
| 6 | `src/app/(routes)/payment/return/TicketPaymentStatus.tsx:112`, `src/app/api/ticket-orders/[orderId]/route.ts:34-57` | Display the stored `payment_expires_at`. No hard-coded 5, no countdown, no "5 phut" copy anywhere in `src`. | No change |
| 7 | SePay rail `202611130004_sepay_checkout_ipn.sql:77,273` | Compares `payment_expires_at <= now()`; shares the column default, so it silently gets 10 min (rail dormant). | No change; note only |
| 8 | Unchanged windows | `150001:62-91` strike logic (1 hour lower bound, 3 strikes, 24 h block), `150001:142` 60 s lease, `140007:49` 2 min outbox lease. Strikes use the stored `least(p.expires_at, o.payment_expires_at)`, so longer links just move a strike 5 minutes later; the 1-hour bound still covers it. | Keep as is |
| 9 | Tests | `supabase/tests/ticket-order-survey.sql:194` and `scripts/test-checkout-guard-db.mjs:334,471` use `interval '5 minutes'` only as fixture data. No existing test asserts the default order window or the lease link expiry. | Add new assertions; leave fixtures |
| 10 | `src/app/api/ticket-orders/route.test.ts:59` | Mock `expiresAt: ... + 300` fixture | Optional cosmetic change to 600 |

## Touchpoints

| Path | Change |
|---|---|
| `supabase/migrations/202611190001_checkout_deadline_10min.sql` | NEW |
| `src/lib/payments/payos/checkout.ts` | lines 89, 121, 138: 300 / 300_000 to 600 / 600_000 |
| `src/lib/payments/payos/checkout.test.ts` | add: default `expiredAt` is about now + 600 s when `expiresAt` omitted; explicit `expiresAt` passes through unchanged |
| `scripts/test-checkout-guard-db.mjs` | add checks 5a-5e (runner applies all migrations, so the new one is picked up) |
| `supabase/tests/checkout-access-guard.sql` (DECISION: extend this existing file; do NOT add a new SQL test file) | structural assertions inserted BEFORE the existing last statement `do $$ begin raise notice 'SENTINEL checkout-access-guard.sql'; end $$;` (line 85), which must stay the LAST statement. `EXPECTED_SQL_TESTS` in `scripts/test-checkout-guard-db.mjs` (line 22, tripwire asserted at line 257) stays unchanged |
| `src/app/api/ticket-orders/route.test.ts:59` | optional fixture 300 to 600 |
| Read only | files in Findings rows 3, 6, 7, 8 |

## Public Contracts

- Customer-visible change: payment window is 10 minutes (`paymentExpiresAt` from `GET /api/ticket-orders/[orderId]`, PayOS page expiry).
- No RPC signature, return shape, grant, or API schema change. `prepare_payos_checkout(uuid,uuid,text,text)` keeps its exact signature and `returns table`, so `create or replace` is legal.
- Late-payment rule retained: a payment after the (now 10-minute) link expiry still goes to `reconciliation`. Residual: payments after 10 minutes remain manual-reconcile (separate path).

## Blast Radius

Risk class HIGH: billing/payments + schema migration. 1 new migration, 1 source file (3 lines), 2-3 test files. Orders and links created BEFORE the migration keep stored 5-minute expiries (no backfill; they age out within 5 minutes of the owner applying). Strike evidence reads stored expiries, so mixed old/new rows are handled correctly. Rollback: a forward-only fix migration restoring `'5 minutes'` in both statements (never edit the applied file); it affects only NEW orders.

## Migration SQL outline (`202611190001_checkout_deadline_10min.sql`)

1. Header comment: forward-only, agents do not apply it, owner applies in production SQL Editor, no backfill, reason (39 s late payment).
2. `alter table public.orders alter column payment_expires_at set default (now() + interval '10 minutes');`
3. `create or replace function public.prepare_payos_checkout(p_order_id uuid, p_user_id uuid, p_payment_link_id text default null, p_checkout_url text default null)` with the body copied byte-for-byte from `202611150001_checkout_access_guard.sql:108-155` (keep `language plpgsql security definer set search_path = ''` and the identical return table). The ONLY edit: on line 151 `v_now+interval '5 minutes'` becomes `v_now+interval '10 minutes'`. Do not touch the 60 s lease literal on line 142.
4. Restate grants exactly: `revoke all on function public.prepare_payos_checkout(uuid,uuid,text,text) from public,anon,authenticated;` then `grant execute on function public.prepare_payos_checkout(uuid,uuid,text,text) to service_role;`.
5. No `create_ticket_order_v3/v4/v5` redefinition and no helper/constant (two literals, small diff).

## Implementation Checklist

1. Create `supabase/migrations/202611190001_checkout_deadline_10min.sql` per the outline (copy lines 108-155 of 150001 verbatim, change one literal).
2. Diff the copied function body against `150001:108-155`; only the interval literal may differ.
3. Edit `src/lib/payments/payos/checkout.ts` lines 89, 121, 138 (300 / 300_000 to 600 / 600_000).
4. Add Vitest cases in `src/lib/payments/payos/checkout.test.ts` (default expiry 600 s; explicit `expiresAt` passed through as `expiredAt`).
5. Add DB runner checks in `scripts/test-checkout-guard-db.mjs`: (5a) a new order's `payment_expires_at - created_at` is between 9m59s and 10m01s; (5b) after the `prepare_payos_checkout` lease, link `expires_at` is about 10 min after now and never exceeds the order deadline; (5c) an order whose `payment_expires_at` is forced to 3 min still gets link expiry equal to the order deadline (least rule kept); (5d) after `prepare_payos_checkout` assert link `expires_at - now()` is above 9 minutes, then process a paid webhook immediately and expect `paid`; on a second order (fresh user) force the link `expires_at = now() - interval '1 second'` and expect `reconciliation` with `payos_payment_events.failure_code = 'late_or_terminal_payment'` (rule kept; real-time minute 9 is not waited for); (5e) `has_function_privilege` service_role true, anon/authenticated false for `prepare_payos_checkout`.
6. Extend `supabase/tests/checkout-access-guard.sql` (chosen route; keep its `SENTINEL checkout-access-guard.sql` notice as the LAST statement; do not edit `EXPECTED_SQL_TESTS`) with structural assertions: `column_default` from `information_schema.columns` for `orders.payment_expires_at` contains `00:10:00` and not `00:05:00` (Postgres stores the default as `(now() + '00:10:00'::interval)`, so a text match on `10 minutes` would fail); the `prepare_payos_checkout` function body (`pg_get_functiondef`) may match `interval '10 minutes'`; the function is security definer with empty `search_path`.
7. Optional: update the fixture in `route.test.ts:59` to 600.
8. Run the gates below; fix only inside the blast radius.
9. Write the evidence pack in `process/general-plans/active/checkout-deadline-10min_19-11-26/harness/` per `vc-risk-evidence-pack` (risk class: billing + schema migration) and validate with `node .claude/skills/vc-risk-evidence-pack/scripts/validate-risk-artifacts.mjs process/general-plans/active/checkout-deadline-10min_19-11-26/harness/`. The pack includes `risk-gate.json`, `context-snippets.json`, `verification.json`, `review-decision.json` and `adversarial-validation.json` (scenarios: PUBLIC grant regression, search_path hijack, late payment bypass, strike-window evasion via longer link). `review-decision.json` MUST be written by an independent spawned sonnet vc-code-reviewer, never by the execute-agent.
10. Stop. EXECUTE does NOT apply the migration or deploy; hand the Owner Steps below to the owner.
11. In UPDATE PROCESS: update `process/context/all-context.md` (migration list: add `202611190001`, applied or not) and run `vc-audit-context`.

## Acceptance Criteria

- AC1-AC5 (Fully-Automated) all green: DB runner checks 5a-5e (incl. the extended `checkout-access-guard.sql` with its sentinel reached), Vitest PayOS/route tests.
- AC6 (Fully-Automated, baseline comparison): scoped eslint, typecheck and build pass; full `npm.cmd test` shows NO new failures versus the pre-change baseline (known pre-existing failures per `process/context/tests/all-tests.md`: `src/lib/supabase/route-client.test.ts`, and `src/components/FormPopup.test.tsx` T12 if still failing; record the baseline before editing). `npm.cmd run typecheck` and `npm.cmd run build` must never run concurrently (`.next` write race).
- AC7 and AC8 (Hybrid, owner-run) recorded; until the owner confirms them the plan closes as CODE DONE, not VERIFIED.
- Migration `202611190001` differs from `150001:108-155` only by the interval literal; no applied migration edited.

## Phase Completion Rules

Single phase. Code-only completion is `CODE DONE`. `VERIFIED` requires the automated gates plus the evidence pack and, for production claims, the owner probes (AC7, AC8). Known-Gap residual stays CONDITIONAL with a backlog stub.

## Verification Evidence

| Gate / Scenario | Strategy | Proves SPEC criterion |
|---|---|---|
| AC1 order deadline is 10 min: `node scripts/test-checkout-guard-db.mjs` check 5a + structural default assertion matching `00:10:00` (proven by: order-deadline-10min) | Fully-Automated | Owner decision: order deadline is 10 minutes |
| AC2 new link expiry is 10 min and at most the order deadline: runner checks 5b, 5c (proven by: link-expiry-10min) | Fully-Automated | Owner decision: DB and PayOS deadlines match |
| AC3 `expiredAt` sent to PayOS equals DB expiry; fallback is 600 s: `npx.cmd vitest run src/lib/payments/payos src/app/api/ticket-orders` (proven by: payos-expiredAt-matches) | Fully-Automated | PayOS stops accepting no later than our deadline |
| AC4 late-payment rule and strike guard unchanged: existing runner cases + check 5d (proven by: guard-and-late-rule-regression) | Fully-Automated | No regression of guard or reconciliation |
| AC5 grants and security definer preserved: runner check 5e + structural assertion (proven by: grants-preserved) | Fully-Automated | Service-role-only, empty search_path |
| AC6 lint, types, build: `npx.cmd eslint src/lib/payments/payos --max-warnings=0`, `npm.cmd run typecheck`, `npm.cmd test` (baseline comparison: no new failures vs the pre-change baseline; known pre-existing failures tolerated), `npm.cmd run build` (retry once on the Next 16.4.3 advisory stop; never concurrent with typecheck) (proven by: static-gates) | Fully-Automated | No TypeScript regression |
| AC7 hosted: one real PayOS payment made at minute 6-9 lands as `paid` (proven by: owner-probe-hosted) | Hybrid (owner-run, production) | Fixes the reported failure end to end; CONDITIONAL until the owner confirms |
| AC8 production read-only queries below (proven by: prod-readonly-check) | Hybrid (owner SQL Editor) | Migration actually applied with grants intact |
| Residual: PayOS honoring a 10-minute `expiredAt` and bank timing on the live rail | Known-Gap (residual, not a proving strategy) | Backlog stub required (`process/general-plans/backlog/checkout-deadline-live-probe_NOTE_19-11-26.md`, written in UPDATE PROCESS); AC7 stays CONDITIONAL |

Run Vitest from PowerShell (not Git Bash) with `npm.cmd`/`npx.cmd`, per all-tests.md.

## Owner Steps and Deploy Ordering

0. **Pre-check (read-only, BEFORE applying):** in the production SQL Editor run `select pg_get_functiondef('public.prepare_payos_checkout(uuid,uuid,text,text)'::regprocedure) like '%v_now+interval ''5 minutes''%';` and expect `true`. If `false`, the hosted function drifted from migration 150001: STOP and report to the planner, because `create or replace` would overwrite a hand edit.
1. Apply `202611190001_checkout_deadline_10min.sql` in the production Supabase SQL Editor (agents never apply). Deploy the app in the same window.
2. **DB first, app second.** The app reads `checkout_expires_at` from the DB and sends it as PayOS `expiredAt`, so it is correct against either DB state. Old app + new DB: order and link are 10 min and PayOS gets 10 min (works). New app + old DB (the wrong order): still 5 min until the migration lands, harmless but the fix is not live. The 600 s fallbacks are reached only when no expiry is passed, which the route never does. Orders created between the two steps are consistent either way because expiry comes from the DB row.
3. Read-only verification (SQL Editor):
   - `select column_default from information_schema.columns where table_schema='public' and table_name='orders' and column_name='payment_expires_at';` expect `(now() + '00:10:00'::interval)`.
   - `select pg_get_functiondef('public.prepare_payos_checkout(uuid,uuid,text,text)'::regprocedure) like '%interval ''10 minutes''%';` expect `true`.
   - `select has_function_privilege('service_role','public.prepare_payos_checkout(uuid,uuid,text,text)','execute') as svc, has_function_privilege('anon','public.prepare_payos_checkout(uuid,uuid,text,text)','execute') as anon, has_function_privilege('authenticated','public.prepare_payos_checkout(uuid,uuid,text,text)','execute') as auth;` expect true / false / false.
   - After the first new order: `select o.payment_expires_at - o.created_at as order_window, p.expires_at - o.created_at as link_window from public.orders o join public.payos_payment_links p on p.order_id=o.id order by o.created_at desc limit 3;` expect about 10 minutes for both.
4. Existing pending orders (5-minute) expire normally; no action.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Migration copy drifts from 150001 body | Checklist step 2 diff; runner exercises prepare/lease/webhook paths |
| Grants regress to PUBLIC | Statement 4 restated + runner check 5e + production query |
| Abandoned orders stay pending 5 minutes longer | No seat reservation exists in the repo today; revisit only if inventory holds are added |
| Strikes occur 5 minutes later | 3 strikes / 1 h / 24 h unchanged; acceptable, owner may revisit |
| Payments after 10 minutes still reconcile manually | Documented residual; reconcile function out of scope |

## Test Infra Improvement Notes

(none identified yet) Candidate: before this plan the runner had no assertion of the default order window or the lease link expiry; checks 5a-5e close that.

## Resume and Execution Handoff

1. Selected plan: `process/general-plans/active/checkout-deadline-10min_19-11-26/checkout-deadline-10min_PLAN_19-11-26.md`
2. Last completed step: PLAN written (no source edits, no migration created, no commit).
3. Validate-contract: pending (VALIDATE required before EXECUTE; high-risk evidence pack required, checklist step 9).
4. Context loaded: `process/context/all-context.md`, `process/context/tests/all-tests.md`, migrations 130001/130004/140006/140008/140009/150001/170001, `src/lib/payments/payos/checkout.ts`, `src/app/api/ticket-orders/route.ts`, `scripts/test-checkout-guard-db.mjs`. No overlap with active plans (`username-password-login_18-11-26` is unrelated).
5. Next: ENTER VALIDATE MODE; then EXECUTE checklist 1-9 via a spawned vc-execute-agent (opus), EVL via vc-tester; owner applies the SQL and deploys.

## Validate Contract

Status: PASS
Date: 19-11-26
date: 2026-11-19
generated-by: outer-pvl
supersedes: 2026-11-19 (outer-pvl, first-pass CONDITIONAL with G1-G6) — PVL cycle 1 supplement applied all six; this V1 re-validation has current evidence

Parallel strategy: sequential (EXECUTE) with a parallel review step afterwards
Rationale: signal score 3/7 (S2 schema/billing surface, S6 high-risk class, S7 about 6 files in blast radius). The files are small and tightly coupled (one migration, one 3-line TS edit, test additions to the same runner), so one opus vc-execute-agent is the right fit. Afterwards, spawn vc-tester (sonnet, EVL confirmation run) and an independent sonnet vc-code-reviewer in parallel for the high-risk evidence pack. Estimated agents: 1 execute (opus) + 1 tester (sonnet) + 1 reviewer (sonnet) = 3. Cost guard not triggered.

Test gates (C3 5-column table):

| criterion id | behavior | strategy | proving test | gap-resolution |
|---|---|---|---|---|
| AC1 | New order deadline is created + 10 min | Fully-Automated | `node scripts/test-checkout-guard-db.mjs` check 5a (`payment_expires_at - created_at` between 9m59s and 10m01s) + structural assertion in `supabase/tests/checkout-access-guard.sql` that `information_schema.columns.column_default` contains `00:10:00` and not `00:05:00` (see E3) | B |
| AC2 | New link expiry is 10 min and never later than the order deadline | Fully-Automated | runner checks 5b and 5c | B |
| AC3 | PayOS `expiredAt` equals the DB expiry; fallback is 600 s | Fully-Automated | `npx.cmd vitest run src/lib/payments/payos src/app/api/ticket-orders` (PowerShell) | B |
| AC4 | Strike guard unchanged (existing runner cases); late-payment-to-reconciliation rule unchanged (new check 5d, no existing test covered it) | Fully-Automated | existing runner cases + check 5d (see E4) | B |
| AC5 | Grants (service_role only) and SECURITY DEFINER with empty search_path preserved | Fully-Automated | runner check 5e + structural SQL assertion (`prosecdef` and `proconfig` empty search_path) | B |
| AC6 | No lint, type or build regression | Fully-Automated | `npx.cmd eslint src/lib/payments/payos --max-warnings=0`; `npm.cmd run typecheck`; `npm.cmd test` (baseline comparison, see E6); `npm.cmd run build` (retry once on the Next 16.4.3 advisory stop; never concurrent with typecheck) | A |
| AC7 | A real PayOS payment at minute 6-9 lands as `paid` | Hybrid | owner-run on production after applying the migration and deploying; precondition: hosted PayOS live rail + checkout enabled | C |
| AC8 | Production shows the new default, 10-minute function literal and intact grants | Hybrid | owner read-only SQL Editor queries in Owner Steps item 3 (after the item 0 pre-check); precondition: owner access to the production SQL Editor | C |

gap-resolution legend:
- A — proven now (gate passes in this cycle)
- B — fixed in this plan (gate added by this plan's checklist)
- C — deferred to a named later phase/plan (owner-run, recorded in the phase report)
- D — backlog test-building stub (named residual; keep-active; continue)

C-4 reconciliation: the `strategy:` column carries ONLY the 3 proving strategies (Fully-Automated / Hybrid / Agent-Probe). Known-Gap is never a strategy value.

Named residual (not a proving strategy, gap-resolution D): PayOS honoring a 10-minute `expiredAt`, and real bank timing on the live rail, are unproven by any automated gate. Backlog stub: `process/general-plans/backlog/checkout-deadline-live-probe_NOTE_19-11-26.md` (written in UPDATE PROCESS). AC7 stays CONDITIONAL (plan closes CODE DONE, not VERIFIED) until the owner confirms. This is a written residual with justification, not the silent reason any behavior passes: every developed behavior above has a Fully-Automated or Hybrid gate.

Legacy line form (retained so existing validate-contract consumers still parse):
- DB migration (orders default + prepare_payos_checkout): [Fully-automated: `node scripts/test-checkout-guard-db.mjs`] | [hybrid: owner SQL Editor read-only queries on production] | [known-gap: live PayOS 10-minute expiry, documented]
- `src/lib/payments/payos/checkout.ts`: [Fully-automated: `npx.cmd vitest run src/lib/payments/payos src/app/api/ticket-orders`]
- Static gates: [Fully-automated: `npx.cmd eslint src/lib/payments/payos --max-warnings=0`, `npm.cmd run typecheck`, `npm.cmd run build`]

Failing stubs (Fully-Automated rows only; red-first starting points for execute-agent, not on-disk files):

AC1:
```
test("should give a new order a payment deadline of created + 10 minutes", () => { throw new Error("NOT IMPLEMENTED — TDD stub: new order deadline is created + 10 minutes") })
```
AC2:
```
test("should set the link expiry to 10 minutes and never beyond the order deadline", () => { throw new Error("NOT IMPLEMENTED — TDD stub: link expiry 10 minutes, capped by order deadline") })
```
AC3:
```
test("should default PayOS expiredAt to now plus 600 seconds and pass an explicit expiresAt through unchanged", () => { throw new Error("NOT IMPLEMENTED — TDD stub: PayOS expiredAt default 600 s and passthrough") })
```
AC4:
```
test("should still send a paid webhook after link expiry to reconciliation with late_or_terminal_payment", () => { throw new Error("NOT IMPLEMENTED — TDD stub: late payment rule kept") })
```
AC5:
```
test("should keep prepare_payos_checkout service_role-only, security definer, empty search_path", () => { throw new Error("NOT IMPLEMENTED — TDD stub: grants preserved") })
```
AC6 is a static gate (existing commands), no stub.

PVL cycle 1 re-validation (each prior concern verified against real source, then closed):
- G1 closed: `scripts/test-checkout-guard-db.mjs:22` `EXPECTED_SQL_TESTS = ["checkout-access-guard.sql","ticket-order-survey.sql","username-login.sql"]`, asserted at :257; the plan now extends the existing `supabase/tests/checkout-access-guard.sql` (85 lines) and keeps its `SENTINEL checkout-access-guard.sql` notice (line 85, last statement) last, so the tripwire and the per-file sentinel check (:263) stay green with no runner edit to that list.
- G2 closed: Postgres normalizes the default to `(now() + '00:10:00'::interval)`; the plan asserts `00:10:00` for the column default and `10 minutes` only for the function body (`pg_get_functiondef` keeps source text).
- G3 closed: check 5d is now concrete and feasible with existing helpers (the pattern at runner :465-472: admin forces link `expires_at` into the past; `process_payos_webhook` args `(event, order_code, payment_link_id, reference, amount, 'VND', true)`; the late branch is `v_link.expires_at <= now()` in `202611140009:29`).
- G4 closed: AC6 is a baseline comparison; all-tests.md records the pre-existing `src/lib/supabase/route-client.test.ts` failure and the FormPopup T12 caveat; typecheck and build are never concurrent.
- G5 closed: the owner pre-check literal `%v_now+interval ''5 minutes''%` matches the exact spacing at `202611150001:151` (`least(v_order.payment_expires_at,v_now+interval '5 minutes')`, no spaces around `+`), and that is the only `5 minutes` literal in the function (the other literal is `60 seconds`).
- G6 closed: checklist step 9 requires an independent sonnet vc-code-reviewer for `review-decision.json` and an `adversarial-validation.json` with four named scenarios.

Dimension findings:
- Infra fit: PASS — all cited lines re-confirmed after the supplement (130001:55, 150001:108-157 with `end; $$;` at 155 and revoke/grant at 156-157, :142 lease, :151 literal, 140009:29, checkout.ts:89/121/138, route.ts:289, route.test.ts:59, runner :22/:257/:334/:471, survey test :194). Migration prefix 202611190001 sorts after 202611180001 and is free. The runner applies `supabase/migrations/*.sql` by sorted readdir, so the new file is loaded automatically; `create or replace` is legal because the signature and `returns table` are copied verbatim.
- Test coverage: PASS — G1-G4 resolved and verified against source (see re-validation list). Every behavior (order default, link expiry and cap, PayOS expiredAt, late-payment rule, grants) has a Fully-Automated gate; the only Known-Gap is the named live-PayOS residual with a backlog stub, so the net gate is not vacuously green. Non-blocking precision notes carried as execute-agent instructions E1, E3 and E4 (no plan edit required).
- Breaking changes: PASS — no RPC signature, return shape, grant or API schema change; `paymentExpiresAt` moves 5 minutes later (intended). The route always passes `row.checkout_expires_at` so PayOS `expiredAt` follows the DB; the 300 s values are fallbacks and return-value fields only. No "5 minutes" user copy exists in `src` (grep). Pending orders at apply time keep their 5-minute deadline (documented).
- Security surface: PASS — grants restated, SECURITY DEFINER with `set search_path = ''` kept, no secrets, no new endpoint. Risk class HIGH (billing/payments + schema migration): evidence pack mandatory with an independent reviewer decision (E5); adversarial scenarios named.
- Section A — Migration `202611190001`: PASS — single changed literal at 150001:151; the 60 s lease literal at :142 must not change. Highest-risk edit is the verbatim function copy (mitigated by the step-2 diff). Residual: production body assumed equal to 150001, covered by owner step 0.
- Section B — `checkout.ts` fallbacks: PASS — three literal edits at lines 89, 121, 138 confirmed; `src/lib/payments/payos/checkout.test.ts` exists and `createPayOsPaymentLink` accepts an injectable `now`, so the default-expiry test is deterministic.
- Section C — Test additions: PASS — runner checks 5a-5e are feasible with existing helpers (`call`, `callV5`, `newUser`, `admin.query`, `service.query`); 5c uses `call` (v4, creates no link) then an explicit `prepare_payos_checkout`; the SQL structural assertions run as the migration owner after all migrations, before the sentinel.
- Section D — Owner steps and deploy ordering: PASS — step 0 pre-check added; DB first then app is safe in either order because expiry is read from the DB row; production queries are correct.

Open gaps: none blocking. Named residual (gap-resolution D): live PayOS 10-minute `expiredAt` and bank timing (`process/general-plans/backlog/checkout-deadline-live-probe_NOTE_19-11-26.md`, written in UPDATE PROCESS). AC7 and AC8 are owner-run Hybrid gates (gap-resolution C), recorded in the phase report.

Execute-agent instructions:

| # | Instruction | Trigger condition |
|---|---|---|
| E1 | Create the migration: statement 1 `alter table public.orders alter column payment_expires_at set default (now() + interval '10 minutes');`, statement 2 the function copied from lines 108-155 of `202611150001_checkout_access_guard.sql` changing only `v_now+interval '5 minutes'` to `v_now+interval '10 minutes'`, statement 3 the revoke/grant pair restated (the same text as lines 156-157). Diff the function (lines 108-155) and the grant lines (156-157) against 150001 to prove only the one literal differs. Do not edit any applied migration. Do not apply the migration to any hosted database. | Checklist steps 1-2 |
| E2 | Run Vitest and the DB runner from PowerShell with `npx.cmd`/`npm.cmd` (Git Bash fails Vitest on drive-letter casing). `node scripts/test-checkout-guard-db.mjs` needs no external DB (disposable embedded PostgreSQL). Never run `npm.cmd run typecheck` and `npm.cmd run build` concurrently. | All gate runs |
| E3 | Extend `supabase/tests/checkout-access-guard.sql` only (no new SQL test file; do not edit `EXPECTED_SQL_TESTS`). Insert the new assertions BEFORE line 85 so `do $$ begin raise notice 'SENTINEL checkout-access-guard.sql'; end $$;` stays the LAST statement. Column default assertion: contains `00:10:00` and not `00:05:00`. Function-body assertion: `pg_get_functiondef` contains `interval '10 minutes'` AND does not contain `interval '5 minutes'`, and still contains `interval '60 seconds'`; also assert `prosecdef` and `proconfig` contains `search_path=""`. | Checklist step 6 |
| E4 | Implement 5a-5e per the plan: every new runner check uses a fresh user (`newUser`). 5a compares `payment_expires_at - created_at` (both come from one transaction `now()`, expect about 10:00 inside 9m59s to 10m01s). 5b: link `expires_at` is within roughly 10 minutes of the prepare call (tolerance of a few seconds, and strictly greater than 9 minutes so a 5-minute regression fails) and `<=` the order deadline. 5c uses `call` (v4) then an explicit `prepare_payos_checkout` with the order deadline forced to 3 minutes; expect link `expires_at` equal to the order deadline. 5d: call `prepare_payos_checkout($order,$user,$linkId,$url)`, assert `expires_at - now() > 9 minutes`, then `process_payos_webhook($event,$order_code,$linkId,$reference,$total_vnd,'VND',true)` with the SAME link id and expect `paid`; on a second order and fresh user force the link `expires_at = now() - interval '1 second'`, send the paid webhook and expect `reconciliation` plus `payos_payment_events.failure_code = 'late_or_terminal_payment'`. 5e: `has_function_privilege` service_role true, anon false, authenticated false. Do not change existing fixtures at runner lines 334 and 471 or `ticket-order-survey.sql:194`. | Checklist step 5 |
| E5 | Evidence pack lives in `process/general-plans/active/checkout-deadline-10min_19-11-26/harness/`; validate with `node .claude/skills/vc-risk-evidence-pack/scripts/validate-risk-artifacts.mjs process/general-plans/active/checkout-deadline-10min_19-11-26/harness/`. `review-decision.json` MUST be written by an independent spawned sonnet vc-code-reviewer, never by the execute-agent; add `adversarial-validation.json` (PUBLIC grant regression, search_path hijack, late payment bypass, strike-window evasion via longer link). Required fields: risk-gate (task, planPath, riskLevel, riskClasses, mustStopBeforeFinalize, humanApprovalRequired, why), context-snippets (task), verification (task, commands, manualChecks, result), review-decision (task, decision in approved / approved-with-concerns / rejected, blockingFindings, nonBlockingFindings, notes). If the pack is missing, say so; do not claim the work is proven. | Checklist step 9 |
| E6 | Record the `npm.cmd test` baseline BEFORE editing (pre-change run), then re-run after. Known pre-existing failure: `src/lib/supabase/route-client.test.ts` "requires secure cookies in production"; `src/components/FormPopup.test.tsx` T12 only if it still fails at baseline. Any other failing test, or any failure not in the baseline, is new. Record both exit codes of the first build and the retry. | AC6 |
| E7 | Do not touch `src/app/(routes)/_components/EventsSection.tsx` or other uncommitted UI files; no overlap with this plan. Do not commit unless asked. | Whole run |
| E8 | EXECUTE stops after the code, tests and evidence pack (CODE DONE). It never applies the SQL or deploys; hand Owner Steps (including the step 0 pre-check) to the owner. | Checklist step 10 |

Backlog artifacts:

| Artifact | Location | What it tracks |
|---|---|---|
| checkout-deadline-live-probe_NOTE_19-11-26.md | process/general-plans/backlog/ | Live PayOS 10-minute `expiredAt` and bank timing probe (written in UPDATE PROCESS) |

What This Coverage Does NOT Prove (what this coverage does NOT prove):
- Runner checks 5a-5e and structural assertions (isolated embedded PostgreSQL): do not prove the migration is applied to the hosted Supabase, hosted function body or grants, or behavior under real concurrency and load.
- Vitest PayOS/route tests (mocked fetch and RPC): do not prove PayOS actually accepts or honors a 10-minute `expiredAt`, real bank or QR timing, or that a payment at minute 6-9 lands as `paid` (owner probe AC7). Check 5d proves the late rule with a forced past expiry, not a real wait to minute 9.
- Scoped eslint, typecheck, build: do not prove runtime or visual behavior; full lint has known pre-existing failures outside `src/`, and the Next.js 16.4.3 advisory stop on the first build is a known, honestly recorded exit. The `npm.cmd test` gate is a baseline comparison, not "all green".
- Hybrid AC7 and AC8 are owner-run: until the owner confirms them the plan closes as CODE DONE, not VERIFIED.
- Nothing here covers the separate one-off remediation of the 39-second-late order, the SePay rail (dormant), orders already pending at apply time (they keep 5 minutes), or abandoned-order inventory holds (none exist).

Gate: PASS
Accepted by: not applicable (Gate PASS; no CONCERNs outstanding; named residual and owner-run AC7/AC8 recorded above, not accepted concerns)

## Autonomous Goal Block

SESSION GOAL: Extend ticket checkout payment deadline from 5 to 10 minutes (order default + PayOS link expiry + 3 TS fallbacks) with tests and a high-risk evidence pack.
Charter + umbrella plan: N/A - single plan: process/general-plans/active/checkout-deadline-10min_19-11-26/checkout-deadline-10min_PLAN_19-11-26.md
Autonomy: autonomy removes approval pauses only; subagent delegation stays mandatory (vc-execute-agent opus; vc-tester and independent vc-code-reviewer sonnet); BLOCKED goes to backlog.
Hard stop conditions / safety constraints:
- Never apply a migration to any hosted database and never deploy; the owner does both.
- Never edit an already-applied migration; only the new 202611190001 file.
- Only the interval literal may differ from 202611150001:108-155; keep the 60 s lease literal, grants and SECURITY DEFINER with empty search_path.
- New SQL assertions go into supabase/tests/checkout-access-guard.sql before its SENTINEL line (stays last); do not edit EXPECTED_SQL_TESTS.
- review-decision.json comes from the independent reviewer, never the execute-agent.
- Do not touch EventsSection.tsx or other uncommitted UI files; do not commit unless asked.
- No secrets in files or chat.
Next phase: EXECUTE: process/general-plans/active/checkout-deadline-10min_19-11-26/checkout-deadline-10min_PLAN_19-11-26.md (gate is PASS)
Validate contract: inline in plan (## Validate Contract)
Execute start: node scripts/test-checkout-guard-db.mjs | npx.cmd vitest run src/lib/payments/payos src/app/api/ticket-orders | npx.cmd eslint src/lib/payments/payos --max-warnings=0 | npm.cmd run typecheck | npm.cmd run build (never concurrent with typecheck) | npm.cmd test compared to a pre-edit baseline | probe: owner AC7/AC8 after step 0 pre-check | high-risk pack: yes (harness/ validated by validate-risk-artifacts.mjs)

Next instruction: say ENTER EXECUTE MODE for this plan. EXECUTE stops at CODE DONE; the owner runs the pre-check, applies the SQL, deploys, then confirms AC7 and AC8.

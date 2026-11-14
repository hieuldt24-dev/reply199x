---
phase: payos-checkout-alias-fix
date: 2026-11-14
status: COMPLETE_WITH_GAPS
feature: ticket-payment
plan: process/general-plans/active/sepay-ticket-payment_13-11-26/sepay-ticket-payment_PLAN_13-11-26.md
---

## What Was Done

Added forward-only migration `supabase/migrations/202611140008_fix_payos_checkout_column_aliases.sql`. It replaces `prepare_payos_checkout` with the same signature, lock order, lease decisions, security-definer/search_path settings and service-role grants. The save branch now uses `where p.order_id=p_order_id returning p.*`; the lease branch uses `where p.order_code=v_link.order_code returning p.*`. Both previously unqualified names collide with RETURNS TABLE output variables under PL/pgSQL's default ambiguity rule (SQLSTATE 42702). Insert/returning also uses a table alias for consistency. Migration 006 was not edited.

Added safe route logs for `prepare` versus `persist` RPC failures. Logs contain only a fixed stage and an allowlisted SQLSTATE/PostgREST code; unknown values are recorded as `unknown`. Raw error objects, messages, details, links, attendee data and credentials are not logged.

## What Was Skipped or Deferred

No remote migration, DB row update, credential reads or live PayOS/Sheets call. Existing reconciliation rows were not reset. The new migration must be applied to the same Supabase project used by the application before the function correction is active. Replaying the same idempotent request should preserve any existing provider orderCode; do not create replacement orders to work around an ambiguous provider outcome.

## Test Gate Outcomes

- `npm.cmd test -- src/app/api/ticket-orders/route.test.ts`: 11/11 passed, exit 0. New tests cover preparation SQLSTATE 42702, rejecting unknown code text from diagnostics, and failed persistence after a mocked signed provider success. Persistence failure does not issue another provider call.
- `npx.cmd eslint src/app/api/ticket-orders/route.ts src/app/api/ticket-orders/route.test.ts --max-warnings=0`: exit 0.
- Static Node artifact probe: PASS, exit 0. Asserted migration 006 contains both problematic predicates, migration 008 has no unqualified order_id/order_code WHERE predicate, and the entire replacement function equals the old function after normalizing only the alias additions. This guards against accidental lease/lock/behavior drift.
- No local `psql` command is available. The artifact probe does not execute PL/pgSQL or prove Postgres/RLS/concurrency/runtime behavior. A reviewed migration application and real function regression on approved staging/local Postgres remain required.

Scenario/security checks: first claim, held lease, expired attempted lease, save-link branch, missing RPC and unknown error. STRIDE: service-role boundary unchanged; exact signature and search_path preserved; owner/order row locking unchanged; log allowlist prevents raw upstream data disclosure. No new auth endpoint or provider retry was introduced.

## Plan Deviations

Additive migration 008 is the orchestrator-authorized correction for an already-applied migration 006; no applied migration was rewritten. No other deviation.

## Test Infra Gaps Found

CONTEXT_PARTIAL: no local Postgres runner/psql discovered. No follow-up plan stubs were created. Runtime execution remains an existing hybrid gate.

## Closeout Packet

Keep in active/testing. Code and static/scoped checks are complete; independent review and application of migration 008 remain pending. Next: review the new function and apply the entire 008 file through the project's normal migration workflow or Supabase SQL editor. Do not rerun or edit migration 006 as the deployment mechanism. Inspect safe `payos_checkout_rpc_failed` stage/code logs if a failure remains.

## Forward Preview

### Test Infra Found
Vitest route tests with mocked database and PayOS HTTP responses.
### Blast Radius Changes
New migration 008, ticket-orders route and route test; this report.
### Commands to Stay Green
The focused test and ESLint commands above.
### Dependency Changes
None.

---
name: plan:ticket-checkout-performance
description: "Reduce one serial checkout database round trip, add safe stage timing, and verify controlled latency and ingress behavior."
date: 17-11-26
feature: general
phase: PLAN
status: executed-testing
complexity: complex
metadata:
  node_type: memory
  type: plan
---

# Ticket checkout performance and module boundaries

**Date**: 17-11-26  
**Status**: Executed; kept active/testing (hosted, live and capacity gates unverified)  
**Complexity**: COMPLEX — one sequential execution stream with API/payment/database changes  
**Selected plan:** `process/general-plans/active/ticket-checkout-performance_17-11-26/ticket-checkout-performance_PLAN_17-11-26.md`  
**Locked SPEC:** `process/general-plans/active/ticket-checkout-performance_17-11-26/ticket-checkout-performance_SPEC_17-11-26.md`

## Phase Completion Rules

- **CODE DONE** requires the route, PayOS, ingress parser and isolated PostgreSQL gates to pass, plus lint/typecheck/build.
- **AC1** is proven only by the fixed-delay authenticated handler benchmark and the required p50 reduction. A change in RPC count alone is not enough.
- The isolated database and route fixture do not prove hosted Supabase, live PayOS or production latency. Report those boundaries in the task report.
- Do not deploy, apply a migration remotely, contact PayOS, create a production order, inspect production credentials, or change production configuration.
- Keep this plan active/testing if AC1 or any high-risk database or payment gate remains unverified.

## Overview

This plan addresses the checkout latency requirement with a measured, bounded application change. The selected candidate is to combine the existing order-create and initial checkout-lease calls in one service-role-only database RPC. It preserves the separate provider and post-provider persistence steps. Stage timings explain the remaining route path, and local ingress testing covers only unauthenticated request handling.

## TL;DR

On a fresh checkout, the route currently makes separate sequential database RPCs to create the order and prepare its PayOS lease. Add a service-role-only database function that performs those two operations in one request, while retaining their existing rules and failure outcomes. Capture a controlled authenticated route baseline before changing the route, compare it with the candidate using fixed RPC delays and mocked PayOS, and run the SQL behavior/concurrency checks against isolated PostgreSQL. Add safe route-stage timings and a bounded loopback-only ingress probe. No production latency, real PayOS, or hosted-capacity claim is part of this plan.

## Scope and goals

### In scope

1. Capture a reproducible baseline for the current authenticated route-handler path before changing it.
2. Add one database RPC that composes `create_ticket_order_v4` and the initial `prepare_payos_checkout` claim, returning the same order and checkout state in one response. Keep provider work and post-provider persistence separate.
3. Update the route to use that RPC and preserve current response behavior, cooldown, idempotency, payment lease, reconciliation, and failure persistence.
4. Add fixed-name request-local `Server-Timing` spans and optional isolated PayOS create/lookup observers.
5. Add a bounded, loopback-only ingress probe and verify 50 requests/second for 10 seconds against a local production build.
6. Keep validation and PayOS responsibilities in their current modules; add no standalone runtime telemetry module.

### Out of scope

- Production/staging deployment, production credentials, real orders, real PayOS calls, or production database changes.
- Claiming that the controlled benchmark measures hosted latency or proves the reported ~4.1-second request is fixed.
- Sustaining 50 authenticated checkout creations per second; the ingress probe has no auth and performs no order/provider writes.
- Changing order eligibility, price, cooldown policy, payment state semantics, retries, or provider contract.
- Adding queues, workers, new dependencies, or a general telemetry framework.
- Modifying the independent checkout-access-guard plan.

## Decision Summary

### Chosen Approach

The current fresh-order route makes three sequential database requests: `create_ticket_order_v4`, `prepare_payos_checkout` to claim/create the payment lease, and `prepare_payos_checkout` after PayOS returns to persist the link. The first two happen before PayOS and can be composed inside a single new service-role-only database function. The final persistence call must remain separate because its input is the provider result.

The new function calls the existing v4 order function first, then invokes the existing checkout-preparation function in a nested exception block. If checkout preparation fails, the nested block rolls back only its own work; the function returns a bounded SQLSTATE marker with the created order so the route can preserve the current 503 response and retry/idempotency behavior. A cooldown result or a non-payable order does not call checkout preparation. The function performs no provider call.

This removes one sequential database request on a fresh checkout without combining payment-provider work or changing the existing v4 security/cooldown implementation. A local controlled route fixture measures the modeled round-trip reduction; isolated PostgreSQL verifies actual SQL behavior, permissions, rollback, and concurrency. Neither establishes production performance.

### Why This Over Alternatives

The two sequential pre-provider RPCs are visible in the current route. Composing those existing operations removes one app-to-database request without duplicating v4 cooldown or order rules. Adding a background queue changes when a customer receives a payment link. Instrumentation alone does not satisfy the latency criterion. Combining provider creation and persistence would cross the external-service boundary and is not selected.

### Risk Predictions

| Persona | Prediction | Mitigation |
|---|---|---|
| Architect | The wrapper can drift from v4 result mapping or alter transaction lifetime. | Delegate to v4; keep the result columns explicit; test fresh order, replay and blocked results with isolated PostgreSQL. |
| Security | A new `SECURITY DEFINER` RPC could expose order creation or execute objects through an unsafe search path. | Revoke public/anon/authenticated, grant only `service_role`, use `search_path = ''`, and schema-qualify every object. |
| Performance | One fewer serial request lowers controlled handler time, but provider latency may dominate the real request. | Measure p50/p95 with identical fixed RPC delays; keep production latency claims out of acceptance evidence. |
| Customer experience | Combined failures could lose a created order or change a 429/503 response. | Use a nested exception block for prepare failure; preserve route JSON/status/headers; cover 429 `Retry-After` and retries. |
| Devil's advocate | A synthetic benchmark may make a small local change look like a production fix. | Require both RPC-count reduction and thresholded handler benchmark; label all local evidence and retain hosted latency as an explicit gap. |

### Key Constraints Accepted

- No provider call inside the database function; no live PayOS, hosted measurement or production deployment.
- Existing v4 rules remain authoritative; v5 composes v4 and `prepare_payos_checkout` rather than duplicating policy.
- The controlled benchmark uses the same handler, auth fixture, fixed per-RPC delay and provider mock before and after. It does not claim the production 4.1-second symptom improves by the same amount.
- The HTTP route remains the orchestration boundary; the PayOS adapter remains the provider boundary; the migration owns transaction composition.

## Architecture and contracts

### Request and database flow

1. Validate Origin, media type, bounded body, JSON shape and order fields. Record the reached request-validation span.
2. Read the authenticated user and record the auth span.
3. Call the new `create_ticket_order_v5` RPC once. It delegates to v4, returns cooldown/order state, and for a payable order performs the initial PayOS lease preparation. Record one `order_checkout_rpc` span.
4. For an existing saved checkout URL, return it without a provider call. Otherwise call PayOS create only when the lease permits it; call PayOS lookup only when reconciliation state requires it.
5. Persist the confirmed provider link with the existing `prepare_payos_checkout` RPC. Record `checkout_persist_rpc`.
6. Finalize the response through one timing-aware response helper. Add only the fixed reached spans and `total` to `Server-Timing`.
### Database function result schema and failure semantics

The v5 result schema composes the current v4 and `prepare_payos_checkout` contracts. Base columns/types below match the current v4 `RETURNS TABLE`; checkout columns map the prepare function's current output types through prefixed aliases. Every `RETURNS TABLE` column is nullable at declaration level; the route enforces outcome-specific nullability. `checkout_prepare_error_code text` is newly planned for v5 and is not present in either existing function.

| Output column | PostgreSQL type | Nullability contract |
|---|---|---|
| `order_id` | `uuid` | Null only for cooldown; otherwise required |
| `quantity` | `smallint` | Null only for cooldown; otherwise required |
| `unit_price_vnd` | `integer` | Null only for cooldown; otherwise required |
| `merch_option` | `text` | Null only for cooldown; otherwise required |
| `merch_price_vnd` | `integer` | Null only for cooldown; otherwise required |
| `ticket_subtotal_vnd` | `integer` | Null only for cooldown; otherwise required |
| `total_vnd` | `integer` | Null only for cooldown; otherwise required |
| `order_status` | `public.ticket_order_status` | Null only for cooldown; otherwise required |
| `reused` | `boolean` | Required for every returned row |
| `blocked_until` | `timestamptz` | Non-null only for cooldown; null otherwise |
| `checkout_order_code` | `integer` | Null when prepare returns no result; otherwise required |
| `checkout_order_id` | `uuid` | Null when prepare returns no result; otherwise required and equal to `order_id` |
| `checkout_amount_vnd` | `integer` | Null when prepare returns no result; otherwise required and equal to `total_vnd` |
| `checkout_currency` | `text` | Null when prepare returns no result; otherwise required and exactly `VND` |
| `checkout_payment_status` | `text` | Null when prepare returns no result; otherwise required |
| `checkout_expires_at` | `timestamptz` | Null when prepare returns no result; otherwise required |
| `checkout_payment_link_id` | `text` | Null when prepare returns no result or no provider link ID exists; otherwise the returned ID |
| `checkout_url` | `text` | Null when prepare returns no result or provider URL is not saved; required for saved-link reuse |
| `checkout_can_create` | `boolean` | Null when prepare returns no result; otherwise required |
| `checkout_can_reconcile` | `boolean` | Null when prepare returns no result; otherwise required |
| `checkout_prepare_error_code` | `text` | Null except a caught nested prepare error; when present exactly five ASCII uppercase alphanumeric SQLSTATE characters matching `^[0-9A-Z]{5}$`; no message/detail text |

The table follows the existing function contracts: v4 columns are `uuid, smallint, integer, text, integer, integer, integer, public.ticket_order_status, boolean, timestamptz`; prepare columns are `integer, uuid, integer, text, text, timestamptz, text, text, boolean, boolean`. Prefixed v5 aliases preserve these respective types; the final text marker is newly defined.

Outcome shapes and consistency rules:

- **Cooldown:** all base order detail fields are null; `reused=false`; `blocked_until` is non-null; all checkout fields and prepare marker are null. Route returns existing 429/`Retry-After` before provider work.
- **Non-payable order:** all base order fields are non-null and valid; `blocked_until` is null; v5 does not call prepare, so every checkout field and marker is null. Follow existing non-payable behavior without provider work.
- **Nested prepare failure:** base order fields are non-null and `blocked_until` is null; all checkout result fields are null; only the bounded prepare marker is present. The nested subtransaction preserves the v4 order. `P0002` maps to existing 404; another safe marker maps to sanitized 503.
- **Prepared payable order:** base fields are non-null; `blocked_until` and marker are null; required checkout fields are present; `checkout_order_id = order_id`, `checkout_amount_vnd = total_vnd`, and currency is `VND`. Link ID/URL may be null only while provider data is not saved. Saved-link reuse requires both a non-null saved `checkout_payment_link_id` and URL, with both capability flags false. A held creation lease returns both flags false; a fresh lease returns `can_create=true, can_reconcile=false`; an ambiguous prior attempt returns `can_create=false, can_reconcile=true`.
- Before any PayOS call, reject partial/invalid rows, mismatched IDs/amount/currency, invalid capability booleans, malformed marker or mixed outcome shapes as sanitized 503.

Keep error channels separate. If `admin.rpc('create_ticket_order_v5')` returns an RPC error, a recognized underlying v4 `23505` idempotency-payload conflict maps to the existing 409 response; missing v5 and unrecognized RPC errors map to sanitized 503, while existing validated-request mappings remain. Never copy a v4 RPC error into `checkout_prepare_error_code`. That field contains only SQLSTATE caught around nested `prepare_payos_checkout`: `P0002` maps to 404; another bounded marker maps to sanitized 503. A prepare-side `23505` is not the v4 conflict and follows the marker-to-503 path. Both channels are handled before provider work and raw database text is never exposed.

The v5 function delegates order, cooldown, account-lock, idempotency, strike and order-creation rules to current `create_ticket_order_v4`; it calls current `prepare_payos_checkout` only for a pending payable order. Catch prepare errors only in a nested subtransaction so they do not roll back the order. Revoke execute from `PUBLIC`, `anon`, and `authenticated`; grant only to `service_role`; use `SECURITY DEFINER`, `search_path = ''`, and fully qualified names. Isolated PostgreSQL asserts `pg_proc.prosecdef`, empty `proconfig` search path and grants. v5 never calls PayOS; post-provider persistence remains the existing RPC.
### Timing contract

`Server-Timing` contains only these fixed names and rounded, finite, non-negative millisecond values: `request_validation`, `auth`, `order_checkout_rpc`, `payos_create`, `payos_lookup`, `checkout_persist_rpc`, and `total`. The validation span starts at handler entry and covers Origin/content-type/body/JSON/schema checks. The auth span covers only `getUser`. Database and provider spans cover their awaited operation. Unreached spans are omitted. `total` is set immediately before each explicit response is finalized.

All explicit route responses, including the cooldown 429 and the existing catch path, use the finalizer. It merges `Server-Timing` into current headers and retains status, JSON body, `Retry-After`, `Cache-Control`, and `X-Content-Type-Options`. Sensitive-data tests inspect the timing header only; a success body is allowed to contain its existing `checkoutUrl`.

Pass the same optional observer through the provider create operation and the internal timeout/5xx fallback GET. Emit exactly once per started network operation, from `finally`, including failed/timed-out POST and failed/not-found/successful fallback GET; use fixed stage names `payos_create` and `payos_lookup`. Catch/swallow observer exceptions so they cannot replace or alter the provider result. Timeout/5xx fallback remains one create POST followed by lookup, never a second POST.

### Ingress probe contract

- Place the executable runner in `scripts/measure-ticket-order-ingress.mjs` and pure parser/runner tests under `src/` so Vitest discovers them.
- Accept only HTTP loopback targets with exact normalized host `localhost`, `127.0.0.1`, or `::1` (IPv6 URL syntax is bracketed, e.g. `http://[::1]:3001`). Reject username/password credentials, deceptive hosts (`localhost.evil`, `127.0.0.1.evil`), alternate numeric/hex IP forms, non-loopback hosts, and unsupported schemes. No remote override.
- Numeric bounds: 1–50 requests/second, 1–30 seconds, at most 100 in-flight, 2-second timeout per request. On cap overflow, increment `skipped` for each unsent scheduled request; any skipped count makes the run fail. Await/abort all outstanding requests and exit only when none remain.
- Set `redirect: "manual"`; never follow redirects. A mocked 302 with `Location` pointing at a second test URL must assert that the original target was called once, the Location target was never requested, and 302 is recorded in status distribution as a failed response. Readiness GET treats exactly 405 as ready and is reported separately from load.
- Send valid-shaped JSON while intentionally omitting Origin, authorization, and payment headers. With `SITE_URL=http://127.0.0.1:3001`, expected status is 403 from the origin guard before auth/database/provider work; label the result `unauthenticated_ingress_only`.
- Machine-readable summary includes loopback target, rate, duration, sent/completed/skipped counts, status distribution, redirect/transport/timeout counts and p50/p95/max. Never print bodies, headers, credentials or secrets.
## Implementation Checklist

1. Before route or migration edits, add `src/app/api/ticket-orders/route.performance.test.ts` and capture baseline mode against the unchanged authenticated handler. Use mock auth/user, mocked PayOS, 15 ms per RPC, 5 excluded warm-ups and 50 measured samples. Before every warm-up and measured sample, reset the mock database/order/lease/provider state to the same initial fresh-payable-checkout state (or prove an equivalent deterministic reset); use the same deterministic 50-request vector and unique idempotency keys for baseline and candidate, resetting state so no sample becomes a replay. Persist immutable `process/general-plans/active/ticket-checkout-performance_17-11-26/ticket-checkout-performance_BASELINE_17-11-26.json` before route/SQL changes. Record fixture reset protocol, schema/scenario/vector digest, stable environment, source/build revisions separately, delay, warm-up and sample count/order, status distribution, failures, RPC counts, p50/p95. Baseline fresh checkout must show 3 RPCs.
2. Run baseline then candidate modes from a clean PowerShell session using the commands below. The baseline command must run before any route or migration source edit and writes the immutable JSON path specified in item 1. The candidate command loads and validates that same immutable baseline; do not overwrite or regenerate it. Both invocations use the exact same Vitest test path, request vector, fixture reset protocol, delay, warm-up and sample policy, with fixture reset before every sample. The `Remove-Item Env:... -ErrorAction SilentlyContinue` statements clear inherited/stale mode and path values before selection and after each run.
   ```powershell
   # Capture baseline before route/migration source edits.
   Remove-Item Env:CHECKOUT_PERF_MODE -ErrorAction SilentlyContinue
   Remove-Item Env:CHECKOUT_PERF_BASELINE -ErrorAction SilentlyContinue
   $env:CHECKOUT_PERF_MODE = 'baseline'
   npm.cmd test -- src/app/api/ticket-orders/route.performance.test.ts
   Remove-Item Env:CHECKOUT_PERF_MODE -ErrorAction SilentlyContinue
   Remove-Item Env:CHECKOUT_PERF_BASELINE -ErrorAction SilentlyContinue

   # After implementation, compare candidate to the saved immutable baseline.
   Remove-Item Env:CHECKOUT_PERF_MODE -ErrorAction SilentlyContinue
   Remove-Item Env:CHECKOUT_PERF_BASELINE -ErrorAction SilentlyContinue
   $env:CHECKOUT_PERF_MODE = 'candidate'
   $env:CHECKOUT_PERF_BASELINE = 'process/general-plans/active/ticket-checkout-performance_17-11-26/ticket-checkout-performance_BASELINE_17-11-26.json'
   npm.cmd test -- src/app/api/ticket-orders/route.performance.test.ts
   Remove-Item Env:CHECKOUT_PERF_MODE -ErrorAction SilentlyContinue
   Remove-Item Env:CHECKOUT_PERF_BASELINE -ErrorAction SilentlyContinue
   ```
3. Create `supabase/migrations/202611170001_ticket_order_checkout_v5.sql` with the complete typed `RETURNS TABLE` schema and outcome shapes in Architecture; delegate to v4; catch only prepare errors in a nested block; preserve order on prepare failure; add service-role-only grants, SECURITY DEFINER and empty search path. Do not modify earlier migrations.
4. Update `src/app/api/ticket-orders/route.ts` in this order: validate the request; call `getUser`; derive `p_user_id` only from `authData.user.id`; enforce the existing pre-RPC gates `PAYOS_CHECKOUT_ENABLED`, `getPayOsConfig()`, and `SUPABASE_SECRET_KEY` with their current 503 response semantics; only then call `admin.rpc("create_ticket_order_v5", { p_user_id, p_idempotency_key, p_attendee_name, p_attendee_email, p_attendee_phone, p_attendee_gender, p_attendee_birth_year, p_quantity, p_merch_option })` with validated body fields. If checkout is disabled or config/secret is missing or invalid, return the existing 503 response and perform no order RPC or persistence. Before any provider work, validate all required fields, nullability and cross-field invariants in the v5 row. Keep error channels separate: admin RPC error with recognized underlying v4 SQLSTATE 23505 plus the existing idempotency-conflict message maps to 409; missing/unrecognized RPC error maps to sanitized 503. `checkout_prepare_error_code` is only the nested prepare failure marker: P0002 maps to 404; another safe marker maps to sanitized 503. Never put a v4 RPC error in that marker. With a valid row, call at most one PayOS create POST or one reconciliation GET according to lease state, then existing persistence RPC if a provider link was created. Fresh checkout uses two DB RPCs; saved-link reuse uses one.
5. Extend `src/app/api/ticket-orders/route.test.ts` with separate named cases: (a) valid payable, saved-link, held-lease, non-payable and cooldown row shapes; assert provider is not called for saved-link, held-lease, non-payable or cooldown; (b) recognized v4 23505 RPC error plus conflict message returns 409; (c) missing-function and other RPC errors return sanitized 503; (d) nested P0002 marker returns 404; (e) other safe prepare marker returns sanitized 503; (f) partial, malformed or inconsistent row returns sanitized 503; for b-f assert no provider call; (g) checkout disabled; (h) missing PayOS config; (i) missing and invalid `SUPABASE_SECRET_KEY`; for g-i assert current 503 contract and zero v5 order RPC, PayOS provider, or persistence calls. Assert exact auth-derived user/arguments, call order/count, cooldown Retry-After, retry/replay, failure persistence and unchanged payment state.
6. Add route timing and PayOS observer. Pass observer through internal timeout/5xx fallback GET; emit once per started create/lookup from `finally`, including failed spans. Test create failure/timeout, lookup success/not-found/failure, observer exception swallowed, POST followed by GET, and exactly one POST maximum. This evidence maps PayOS spans to AC2 and retry/payment protection to AC4.
7. Extend `scripts/test-checkout-guard-db.mjs` and `supabase/tests/checkout-access-guard.sql` to verify v5 exact schema, permissions, SECURITY DEFINER/search_path, cooldown/non-payable, replay/conflict, prepared lease states, retained order, retry/replay, concurrency and v3/v4 invariants. For deterministic nested-prepare P0002 injection, create a test-only trigger that fires only for the designated P0002 fixture (match its fixture key/order identity); install it only for that isolated case and drop/disable it in a guaranteed `finally`/teardown path. Assert the designated fixture gets the marker and retained order, then run a control preparation using a different fixture and assert it succeeds without the injected marker, proving later checks are unaffected. For comparative DB timing, run 50 pairs (legacy v4 then prepare calls vs v5) in one isolated PostgreSQL process, alternating order by pair. Before every timed sample, reset to the same deterministic fresh fixture with no order, lease, link or idempotency record; use the same user/input for paired samples and never reuse state. Keep reset and outcome-equivalence assertions outside timing; assert matching order/payment/lease outcome per pair. Report DB p50/p95 and RPC count separately from handler and ingress evidence.
8. Add `scripts/measure-ticket-order-ingress.mjs` and `src/lib/ticket-orders/measure-ticket-order-ingress.test.ts`. Test numeric caps exactly: rate 1 to 50 requests/second, duration 1 to 30 seconds, max 100 in-flight, request timeout 2 seconds. Test IPv4 127.0.0.1 and bracketed IPv6 [::1], credentials/deceptive/unusual host rejection, manual 302 with Location where the target URL is never requested, 3xx counted as failure, timeout and awaited abort, and cap overflow incrementing `skipped` and failing the run. Assert import issues no network request and omitted Origin yields expected 403.
9. Run the local ingress probe in two terminals against the production build. Terminal A: run `npm.cmd run build`, then set `$env:SITE_URL='http://127.0.0.1:3001'` and `$env:PAYOS_CHECKOUT_ENABLED='false'`, then run `npm.cmd start -- --hostname 127.0.0.1 --port 3001`. After Terminal A is serving, in Terminal B run this literal readiness command: `node -e "fetch('http://127.0.0.1:3001/api/ticket-orders',{redirect:'manual'}).then(r=>{if(r.status!==405)process.exit(1);console.log('ready')})"`. Continue only after it prints `ready`; then run `node scripts/measure-ticket-order-ingress.mjs --base-url http://127.0.0.1:3001 --rate 50 --duration 10`. The probe omits Origin and expects 403 origin rejections; require zero skipped samples and zero transport errors. Stop Terminal A with Ctrl+C.
10. Run `npm.cmd exec -- eslint src/app/api/ticket-orders/route.ts src/app/api/ticket-orders/route.test.ts src/app/api/ticket-orders/route.performance.test.ts src/lib/payments/payos/checkout.ts src/lib/payments/payos/checkout.test.ts src/lib/ticket-orders/measure-ticket-order-ingress.test.ts scripts/measure-ticket-order-ingress.mjs scripts/test-checkout-guard-db.mjs --max-warnings=0`, then `npm.cmd run typecheck`, then `npm.cmd run build`, sequentially. The explicit file list covers all in-scope TS/TSX files plus the two touched MJS scripts and uses the existing ESLint config while avoiding unrelated repository lint baseline.
11. Write `ticket-checkout-performance_REPORT_17-11-26.md` with explicit AC1–AC7 links and separate handler, isolated PostgreSQL and ingress evidence. Include commands, baseline/config/reset metadata, source/build revisions, failures, p50/p95, status distributions, RPC counts and evidence limits. Because checkout/payment, auth, secret and migration surfaces are high-risk, before routing to EXECUTE create and validate `process/general-plans/active/ticket-checkout-performance_17-11-26/harness/risk-gate.json` with the risk class, work description, approver and `mustStopBeforeFinalize: true`; do not create risk-pack artifacts during PLAN or VALIDATE. Before implementation finalization or human handoff, complete and validate the remaining required files in the same `harness/` folder: `context-snippets.json`, `verification.json`, `review-decision.json`, and `adversarial-validation.json`; require an explicit reviewer APPROVE with rationale and timestamp. Preserve this documented narrow `harness/` exception to the flat task-folder convention and the UPDATE PROCESS reconciliation follow-up. Do not make a hosted/production performance claim.
## Acceptance Criteria

- **AC1:** The authenticated handler benchmark reduces median total handler time by at least 10 ms and 20% against the captured baseline, with no increase in failures and one fewer fresh-checkout RPC.
  - `proven by:` 50-sample paired baseline/candidate route benchmark loading the immutable baseline JSON; identical fixed-delay RPC fixture, auth fixture, PayOS mock and deterministic request vector
  - `strategy: Fully-Automated`
- **AC2:** Every explicit route response reports only reached fixed stage names plus total, with finite non-negative durations and no identity/order/provider data in the timing header; PayOS create and lookup observers report separate fixed spans once per started operation and isolate observer exceptions.
  - `proven by:` route success/early-exit/429/provider-error/data-exclusion scenarios and PayOS observer success/failure/exception cases
  - `strategy: Fully-Automated`
- **AC3:** The loopback ingress-only probe sustains the SPEC rate and interval without transport errors or skipped samples, with unauthenticated ingress clearly distinguished from checkout capacity.
  - `proven by:` bounded local probe run against the built server, recording readiness, target, rate, duration, status distribution, 403 origin rejections and errors
  - `strategy: Hybrid`
- **AC4:** Existing checkout protections remain effective under retry, replay, cooldown, nonpayable, provider ambiguity and concurrency; failures do not mark orders paid, create duplicate orders/links, or repeat a PayOS create POST.
  - `proven by:` route retry/replay/payment-state tests, PayOS timeout/5xx fallback tests, and isolated PostgreSQL lease/concurrency/failure tests
  - `strategy: Fully-Automated`
- **AC5:** The v5 database function preserves cooldown, idempotency, payment lease, reconciliation and failure-persistence behavior, and the fresh authenticated route uses one fewer sequential database RPC.
  - `proven by:` isolated PostgreSQL v5 migration/permission/failure/replay/concurrency suite plus exact route RPC call-count assertions
  - `strategy: Fully-Automated`
- **AC6:** Existing checkout responsibilities stay in their route, PayOS and database boundaries, with no standalone runtime telemetry module or unrelated feature changes.
  - `proven by:` changed-file and ownership review
  - `strategy: Agent-Probe`
- **AC7:** Ticket-order, PayOS, isolated PostgreSQL, scoped lint, typecheck and production build checks pass.
  - `proven by:` verification gates below
  - `strategy: Fully-Automated`
## Touchpoints

### Existing files to modify

- `src/app/api/ticket-orders/route.ts` — combined RPC mapping, request-scoped timings, response finalization.
- `src/app/api/ticket-orders/route.test.ts` — route behavior, timing, header preservation and v5 result scenarios.
- `src/lib/payments/payos/checkout.ts` — optional create/lookup observer.
- `src/lib/payments/payos/checkout.test.ts` — observer and no-repeat-create cases.
- `scripts/test-checkout-guard-db.mjs` — apply/verify new migration, permissions, failure persistence and comparative DB calls.
- `supabase/tests/checkout-access-guard.sql` — assert v5 privileges and existing access-guard invariants.

### New files

- `supabase/migrations/202611170001_ticket_order_checkout_v5.sql` — combined order/checkout-preparation RPC.
- `src/app/api/ticket-orders/route.performance.test.ts` — authenticated route baseline/candidate benchmark.
- `process/general-plans/active/ticket-checkout-performance_17-11-26/ticket-checkout-performance_BASELINE_17-11-26.json` — immutable 50-sample baseline and deterministic request/config manifest captured before implementation edits.
- `scripts/measure-ticket-order-ingress.mjs` — bounded loopback-only ingress runner.
- `src/lib/ticket-orders/measure-ticket-order-ingress.test.ts` — Vitest-discoverable parser/runner tests.

### Execution report artifact

- `ticket-checkout-performance_REPORT_17-11-26.md` — record AC1–AC7 links, baseline/candidate metadata and metrics, isolated database evidence, ingress results, commands and evidence limits after execution.

### Task-folder artifact layout and narrow evidence-pack exception

The repository normally keeps plan, SPEC, report, and baseline artifacts flat inside the selected task folder. This plan documents one narrow exception required by `vc-risk-evidence-pack`: only its five required files live under the task-folder `harness/` subdirectory. The exception does not move the plan, SPEC, execution report, or baseline JSON. Do not create any `harness/` artifacts during PLAN or VALIDATE; create and validate them only during EXECUTE before implementation finalization.

### High-risk evidence pack before implementation finalization

Store `risk-gate.json`, `context-snippets.json`, `verification.json`, `review-decision.json`, and `adversarial-validation.json` under `process/general-plans/active/ticket-checkout-performance_17-11-26/harness/`. Run `node .claude/skills/vc-risk-evidence-pack/scripts/validate-risk-artifacts.mjs process/general-plans/active/ticket-checkout-performance_17-11-26/harness/`; missing pack or reviewer decision blocks implementation finalization.

## Public Contracts

- Add an internal database RPC `public.create_ticket_order_v5(...)`, executable only by `service_role`. Its result adds checkout-preparation state and a nullable prepare-only SQLSTATE marker to the v4 order result. A v4 error such as recognized `23505` conflict remains an RPC error and never populates this marker.
- Add `Server-Timing` to explicit `POST /api/ticket-orders` responses with fixed names `request_validation`, `auth`, `order_checkout_rpc`, `payos_create`, `payos_lookup`, `checkout_persist_rpc`, `total`.
- Keep JSON request/response shapes, HTTP statuses, `Retry-After`, cache/security headers, PayOS API contract, payment state transitions and order prices unchanged.
- The new ingress script accepts no remote target, authorization token, payment URL, credential or order creation setting.

## Security Review

- **Order/payment integrity:** v5 delegates order rules to v4 and checkout lease rules to the existing prepare function. Isolated PostgreSQL verifies permissions, replay, concurrency and failure persistence before app integration.
- **Function exposure:** fully qualify database objects, set empty `search_path`, revoke from public/anon/authenticated, grant only to `service_role`.
- **Timing disclosure:** allowlist fixed labels, clamp/round finite durations, inspect only the `Server-Timing` header for sensitive-data exclusion.
- **Probe destination/load:** strictly parse loopback hosts, never follow redirects, cap rate/duration/in-flight work, use a fixed request timeout and count skipped work.
- **Provider behavior:** no live provider calls; observer errors cannot alter results; create-timeout fallback remains one POST followed by lookup.
- **Highest-risk change:** v5 composes two security-definer functions and must preserve the outer order result when inner checkout preparation fails. Test SQLSTATE capture, nested rollback, cooldown, same-key replay, and concurrent requests with actual PostgreSQL before route use.
- **Lock ordering:** retain the existing account → order → payment-link order. v5 calls v4 before prepare; no new path may lock these objects in reverse order.

## Rollback and Compatibility

If v5 SQL or route mapping fails validation, keep `PAYOS_CHECKOUT_ENABLED=false`, revert the route caller first, then remove the new function only through a reviewed follow-up migration. Do not rewrite or delete prior migrations. No data format or table change is introduced. The timing header and observer can be removed independently if they cause a client/proxy issue.

## Verification Evidence

| Gate / scenario | Strategy | Proves SPEC criterion |
|---|---|---|
| `npm.cmd test -- src/app/api/ticket-orders/route.performance.test.ts` baseline then candidate: 50 samples after 5 warm-ups; before each sample reset mocked DB/order/lease/provider state to equivalent fresh-payable state; replay exact same deterministic request vector/config; compare only stable environment/fixture fields, record source/build revision separately; record statuses/failures/RPCs/p50/p95; require ≥10 ms and ≥20% median reduction, no failure increase and one fewer fresh-checkout RPC | Fully-Automated | AC1 |
| `npm.cmd test -- src/app/api/ticket-orders/route.test.ts` — complete outcome-shape and route compatibility cases; separately inject admin RPC `23505` (409), unrecognized/missing-function RPC error (503), returned prepare `P0002` marker (404), other marker (503), malformed/partial/inconsistent row (503); assert sanitized response and zero provider calls for each failure | Fully-Automated | AC2, AC4, AC5, AC7 |
| `npm.cmd test -- src/lib/payments/payos/checkout.test.ts` — observer passed into create and fallback GET; exactly one span from `finally` per started network operation including failures/timeouts, observer throws swallowed, timeout/5xx results in at most one POST then lookup | Fully-Automated | AC2, AC4, AC7 |
| `node scripts/test-checkout-guard-db.mjs` - exact v5 types/shape, service-role grants and SECURITY DEFINER/search_path; cooldown/non-payable/replay/lease; distinguish v4 23505 RPC error from nested prepare marker; inject P0002 using isolated test-only trigger; compare 50 paired, alternating legacy v4+prepare and v5 timings with state reset before each sample and matching outcome assertions; report database timing separately | Fully-Automated | AC4, AC5, AC7 |
| `npm.cmd test -- src/lib/ticket-orders/measure-ticket-order-ingress.test.ts` — IPv4/bracketed IPv6 and host rejection; mocked 302 with Location proves target never called; 3xx status recorded; cap overflow increments skipped and fails run; timeout/outstanding work and omitted-Origin 403 | Fully-Automated | AC3, AC7 |
| Two-terminal local production-build ingress run: readiness GET exactly 405; then 50 req/s × 10 s with no Origin, expected 403 origin rejection; require zero skipped samples and zero transport errors | Hybrid | AC3 |
| Scoped ESLint: `npm.cmd exec -- eslint src/app/api/ticket-orders/route.ts src/app/api/ticket-orders/route.test.ts src/app/api/ticket-orders/route.performance.test.ts src/lib/payments/payos/checkout.ts src/lib/payments/payos/checkout.test.ts src/lib/ticket-orders/measure-ticket-order-ingress.test.ts scripts/measure-ticket-order-ingress.mjs scripts/test-checkout-guard-db.mjs --max-warnings=0`; then `npm.cmd run typecheck`, then `npm.cmd run build` in that order. Explicit scoped files cover all in-scope TS/TSX and the touched MJS scripts; this uses the repository ESLint config without linting unrelated files | Fully-Automated | AC7 |
| Review changed-file list, responsibility boundaries, v5 type/shape and RPC error-channel split, fixed timing allowlist, no standalone telemetry module | Agent-Probe | AC6 |
| Hosted Supabase and production PayOS latency comparison | Known-Gap — no approved hosted endpoint/credentials; requires separate authorized non-production validation. This does not substitute for AC1's controlled handler benchmark. | AC1 boundary only; not proof of hosted performance |
## Test Infra Improvement Notes

- Existing Vitest includes only `src/**/*.{test,spec}.{ts,tsx}`; all new Vitest tests therefore live under `src/`. No config expansion is needed.
- `scripts/test-checkout-guard-db.mjs` already starts isolated embedded PostgreSQL and applies every SQL migration in filename order. Extend this runner for the v5 database contract and measured call comparison.
- The route benchmark uses the existing handler and deterministic mocks, resetting database/order/lease/provider fixture state before every warm-up and measured sample. It proves the modeled per-RPC reduction only.
- The ingress runner does its own readiness check, disables redirects and has hard numeric caps. No remote target or auth setting is supported.

## Verification / Test Scenarios by Blast-Radius Area

| Area | Tier | Scenario and exact command / steps | What it proves | What it does not prove |
|---|---|---|---|---|
| Authenticated route | Fully-Automated | `npm.cmd test -- src/app/api/ticket-orders/route.test.ts` — scenario: route response and timing compatibility including cooldown 429 | Existing route contract and timing behavior | Hosted latency |
| Authenticated route | Fully-Automated | `npm.cmd test -- src/app/api/ticket-orders/route.performance.test.ts` — scenario: reduce median handler time after combining the order and lease RPCs | Controlled p50 reduction, failures and fresh-checkout RPC count | Production timing |
| Authenticated route | Hybrid | Same route benchmark command, with baseline captured before source changes and candidate after; compare the recorded 50-sample summaries | Before/after measurement under one fixture | Real Supabase/provider latency |
| Authenticated route | Agent-Probe | Inspect diff and `Server-Timing` assertions for only fixed labels/numeric durations; verify all explicit responses retain body/status/headers | Data-minimal response and route ownership | Production observability configuration |
| Authenticated route | Known-Gap | — Hosted Supabase route timing is not available/authorized in this task. Resolution: separate owner-approved non-production capture after deployment. | — | Hosted p95 or production reduction |
| Database RPC | Fully-Automated | `node scripts/test-checkout-guard-db.mjs` — scenario: preserve the order when checkout preparation fails inside v5; also verify grants, v4 delegation, cooldown, replay, lease and concurrency | SQL permissions and state behavior against real local PostgreSQL | Hosted Supabase role parity |
| Database RPC | Hybrid | `node scripts/test-checkout-guard-db.mjs` — embedded runtime startup is automated; record runtime/platform and compare v4+prepare with v5 inside the same database process | Local SQL timing and one-request reduction | Hosted database round-trip latency |
| Database RPC | Agent-Probe | Review migration for `SECURITY DEFINER`, empty `search_path`, qualified names, service-role-only grant and account→order→link lock order | Privilege and lock boundaries | Hosted migration application state |
| Database RPC | Known-Gap | — Hosted migration and Supabase permission parity are unavailable/unauthorized. Resolution: reviewed release evidence in a separate deployment plan. | — | Production privileges or migration state |
| PayOS adapter | Fully-Automated | `npm.cmd test -- src/lib/payments/payos/checkout.test.ts` — scenario: emit create and fallback lookup spans once without repeating the create POST | Provider adapter semantics under mocks | Live provider behavior |
| PayOS adapter | Hybrid | Run the same suite with deterministic `fetchImpl` fixtures; no live provider request is permitted | Error and reconciliation mapping | PayOS network latency |
| PayOS adapter | Agent-Probe | Inspect observer calls to confirm fixed stage names and no raw provider response, URL, header or error enters timings/logs | Safe telemetry boundary | Provider contract outside fixtures |
| PayOS adapter | Known-Gap | — Live PayOS behavior is not authorized and there is no separate sandbox. Resolution: owner-approved provider verification in a separate plan, if available. | — | Live PayOS latency/availability |
| Ingress probe | Fully-Automated | `npm.cmd test -- src/lib/ticket-orders/measure-ticket-order-ingress.test.ts` — scenario: reject unsafe probe targets and bounds without issuing network requests | Unsafe arguments and accidental network activity are rejected | Sustained server performance |
| Ingress probe | Hybrid | Build/start the app on `127.0.0.1:3001`; run the exact 50 req/s × 10 s probe in Verification Evidence | Local unauthenticated request stability and transport errors | Authenticated checkout capacity |
| Ingress probe | Agent-Probe | Inspect machine summary for target, request counts, statuses, errors and ingress-only label; confirm no bodies or headers are printed | Safe, interpretable measurement | Hosted ingress behavior |
| Ingress probe | Known-Gap | — Authenticated 50 req/s is outside scope and the local probe cannot establish it. Resolution: separate authorized capacity plan with isolated accounts and provider mocks. | — | Authenticated throughput |

### Red-first test stubs for EXECUTE

These are planning stubs for the validate-contract, not files to add during PLAN. Each name matches its automated scenario.

Failing stub: `test("should reduce median handler time after combining the order and lease RPCs", () => { throw new Error("NOT IMPLEMENTED — controlled AC1 benchmark") })`

Failing stub: `test("should preserve route responses and report reached timing spans, including cooldown 429", () => { throw new Error("NOT IMPLEMENTED — timing and compatibility cases") })`

Failing stub: `test("should emit create and fallback lookup spans once without repeating the create POST", () => { throw new Error("NOT IMPLEMENTED — PayOS observer cases") })`

Failing stub: `test("should preserve the order when checkout preparation fails inside v5", () => { throw new Error("NOT IMPLEMENTED — isolated PostgreSQL failure case") })`

Failing stub: `test("should reject unsafe probe targets and bounds without issuing network requests", () => { throw new Error("NOT IMPLEMENTED — ingress parser guard cases") })`

## Gap Resolution Options

| Gap | Resolution |
|---|---|
| Hosted database/provider latency | A) Run only after owner approves a non-production environment and test identity. B) Keep hosted latency as an explicit residual and make no production performance claim. |
| Probe cannot reach 50 scheduled requests/sec because local resources hit the fixed concurrency cap | Record skipped count and fail AC3; lower unrelated local load and rerun. Do not silently queue unbounded requests or reinterpret skipped samples as successes. |
| Isolated PostgreSQL is unavailable | The existing runner owns its own embedded server; fix its local precondition or report the automated DB gate as failed. Do not replace real SQL role/concurrency evidence with mocks. |

## Acceptance Matrix / Traceability

| SPEC criterion | Planned proof |
|---|---|
| AC1 | Authenticated handler baseline/candidate from immutable 50-sample manifest, same fixed-delay fixture and request vector; ≥10 ms and ≥20% median improvement, no failure increase, one fewer fresh-checkout RPC |
| AC2 | Route Server-Timing across all explicit exits plus sensitive-data assertions; fixed PayOS create/lookup observer spans and observer-failure isolation |
| AC3 | Loopback-only ingress run with readiness 405, intentionally omitted Origin/expected 403, status/latency/error summary, no skipped samples or transport errors |
| AC4 | Route retry/replay/payment-state protection, PayOS ambiguous-create fallback with at-most-one POST, checkout lease/cooldown and concurrency behavior |
| AC5 | Isolated PostgreSQL v5 behavior/permission/failure suite plus exact route call-order/count proving one fewer sequential RPC |
| AC6 | Changed-file and responsibility-boundary review; no standalone runtime telemetry module |
| AC7 | Route/PayOS/probe tests, DB runner, scoped ESLint, typecheck and build |
## Blast Radius

- One Next.js application package and its ticket-order route/PayOS adapter tests; one PostgreSQL migration and the existing isolated SQL test runner.
- New files: one migration, one authenticated route performance test, one dependency-free ingress script, and one Vitest parser test under `src/`.
- High-risk surfaces: authenticated checkout API, payment/order database transaction and role grants, provider retry/reconciliation boundary, client-visible timing header.
- No table/data shape change, live provider call, deployment, new dependency, queue or change to the checkout-access-guard plan.
- Runtime integration point: local Next.js production server on `127.0.0.1:3001`; isolated database uses the existing embedded PostgreSQL runner.

## Validate Contract

Status: CONDITIONAL
Date: 17-11-26
date: 2026-11-17
generated-by: outer-pvl

Parallel strategy: parallel-subagents
Rationale: 3/7 MEDIUM; 4 Layer 1 dimensions + 11 checklist sections = 15 independent reviews; no mid-review coordination needed.

Test gates:

| criterion id | behavior | strategy | proving test | gap-resolution |
|---|---|---|---|---|
| AC1 | Authenticated checkout median improves by at least 10 ms and 20%, with no failure increase and one fewer fresh-checkout RPC. | Fully-Automated | Run immutable-baseline capture, then candidate comparison with the PowerShell mode/path commands in Implementation Checklist items 1–2; both invoke npm.cmd test -- src/app/api/ticket-orders/route.performance.test.ts. | B |

Failing stub:
    test("should reduce median handler time against the immutable baseline", () => { throw new Error("NOT IMPLEMENTED — TDD stub: AC1 controlled route benchmark") })

| criterion id | behavior | strategy | proving test | gap-resolution |
|---|---|---|---|---|
| AC2 | Route timing exposes only fixed reached spans; PayOS create and fallback lookup observers emit once and isolate observer errors. | Fully-Automated | npm.cmd test -- src/app/api/ticket-orders/route.test.ts; npm.cmd test -- src/lib/payments/payos/checkout.test.ts | B |

Failing stub:
    test("should report fixed route timings and isolate each PayOS observer span", () => { throw new Error("NOT IMPLEMENTED — TDD stub: AC2 timing and observer behavior") })

| criterion id | behavior | strategy | proving test | gap-resolution |
|---|---|---|---|---|
| AC3 | Loopback ingress sustains 50 requests/second for 10 seconds without transport failures or skipped requests. | Hybrid | Build/start the local server at 127.0.0.1:3001; run the readiness node -e command in Implementation Checklist item 9; then node scripts/measure-ticket-order-ingress.mjs --base-url http://127.0.0.1:3001 --rate 50 --duration 10. Require readiness 405, expected no-Origin 403, zero skipped work and zero transport errors. | B |

| criterion id | behavior | strategy | proving test | gap-resolution |
|---|---|---|---|---|
| AC4 | Retries, replay, cooldown, leases, provider ambiguity and payment state remain protected; fallback never repeats a create POST. | Fully-Automated | npm.cmd test -- src/app/api/ticket-orders/route.test.ts; npm.cmd test -- src/lib/payments/payos/checkout.test.ts; node scripts/test-checkout-guard-db.mjs | B |

Failing stub:
    test("should preserve checkout protections and never repeat a PayOS create POST", () => { throw new Error("NOT IMPLEMENTED — TDD stub: AC4 retry, lease, reconciliation and payment-state cases") })

| criterion id | behavior | strategy | proving test | gap-resolution |
|---|---|---|---|---|
| AC5 | The v5 database function preserves checkout rules and the route uses one fewer sequential database RPC on fresh checkout. | Fully-Automated | node scripts/test-checkout-guard-db.mjs; npm.cmd test -- src/app/api/ticket-orders/route.test.ts | B |

Failing stub:
    test("should combine order creation and checkout preparation without changing outcomes", () => { throw new Error("NOT IMPLEMENTED — TDD stub: AC5 v5 database and route RPC-count cases") })

| criterion id | behavior | strategy | proving test | gap-resolution |
|---|---|---|---|---|
| AC6 | Checkout responsibilities stay within route, PayOS and database boundaries, with no standalone telemetry module. | Agent-Probe | Review changed files and ownership boundaries; confirm fixed timing labels and no unrelated module or feature changes. | B |

| criterion id | behavior | strategy | proving test | gap-resolution |
|---|---|---|---|---|
| AC7 | Ticket-order, PayOS, probe and isolated database checks pass, followed by scoped lint, typecheck and production build. | Fully-Automated | npm.cmd test -- src/app/api/ticket-orders/route.test.ts; npm.cmd test -- src/lib/payments/payos/checkout.test.ts; npm.cmd test -- src/app/api/ticket-orders/route.performance.test.ts; npm.cmd test -- src/lib/ticket-orders/measure-ticket-order-ingress.test.ts; node scripts/test-checkout-guard-db.mjs; npm.cmd exec -- eslint src/app/api/ticket-orders/route.ts src/app/api/ticket-orders/route.test.ts src/app/api/ticket-orders/route.performance.test.ts src/lib/payments/payos/checkout.ts src/lib/payments/payos/checkout.test.ts src/lib/ticket-orders/measure-ticket-order-ingress.test.ts scripts/measure-ticket-order-ingress.mjs scripts/test-checkout-guard-db.mjs --max-warnings=0; npm.cmd run typecheck; npm.cmd run build, in that order. | B |

Failing stub:
    test("should pass the scoped checkout verification gates", () => { throw new Error("NOT IMPLEMENTED — TDD stub: AC7 route, payment, probe, database and build gates") })

Dimension findings:
- Infra fit: CONCERN — the risk-pack skill requires a harness subfolder while plan-lifecycle.md requires task-folder contents to remain flat; the plan documents the narrow exception and UPDATE PROCESS reconciliation.
- Test coverage: PASS — AC1–AC7 proving gates, baseline/candidate commands, route configuration cases, DB reset/teardown, probe and verification commands are specified.
- Breaking changes: PASS — v5 result/error channels are distinct and HTTP/payment contracts remain compatible.
- Security surface: CONCERN — security controls and risk-gate timing are adequate; the same harness-folder policy conflict remains.
- Section 1 feasibility: PASS — immutable baseline and per-sample fixture reset.
- Section 2 feasibility: PASS — candidate mode, immutable baseline path, stable parity and environment cleanup.
- Section 3 feasibility: PASS — typed v5 schema, failure isolation and service-role grants.
- Section 4 feasibility: PASS — authentication, pre-RPC configuration gates, row validation and error mapping.
- Section 5 feasibility: PASS — route tests cover configuration failures and no-call guarantees.
- Section 6 feasibility: PASS — timing spans and isolated PayOS fallback observer.
- Section 7 feasibility: PASS — fixture-scoped P0002 trigger, guaranteed teardown, control fixture and paired DB reset.
- Section 8 feasibility: PASS — bounded loopback probe and redirect/overflow handling.
- Section 9 feasibility: PASS — explicit local readiness and ingress commands.
- Section 10 feasibility: PASS — exact scoped ESLint, typecheck and build commands in the correct order.
- Section 11 feasibility: CONCERN — evidence pack and timing are clear, but the same documented harness-folder exception conflicts with the flat task-folder rule.

Open gaps:
- Accepted concern: preserve the narrow task-folder harness/ exception required by vc-risk-evidence-pack; reconcile the flat-folder requirement in plan-lifecycle.md and related process documentation during UPDATE PROCESS.
- Hosted Supabase and production PayOS latency are not proved. No authorized hosted endpoint or credentials are available; separate authorized non-production validation is required. This boundary does not substitute for AC1.

What This Coverage Does NOT Prove:
- AC1 route benchmark does not prove hosted Supabase, live PayOS or production latency.
- AC2 route and adapter tests do not prove real proxy behavior or provider network latency.
- AC3 local unauthenticated ingress does not prove authenticated checkout capacity or hosted load capacity.
- AC4 route mocks and isolated PostgreSQL do not prove multi-instance production concurrency or live PayOS behavior.
- AC5 isolated PostgreSQL and route tests do not prove that a hosted migration has been applied.
- AC6 changed-file review does not prove runtime behavior.
- AC7 lint, typecheck and build do not prove checkout behavior beyond the dedicated behavioral gates.

Gate: CONDITIONAL (the user accepted the documented harness-folder policy concern at V5).
Accepted by: user — “Accept with concerns — ghi Validate Contract ở trạng thái CONDITIONAL, giữ ngoại lệ harness/ và follow-up UPDATE PROCESS.” The three concern findings are one underlying policy conflict.

## Resume and Execution Handoff

1. **Selected plan:** `process/general-plans/active/ticket-checkout-performance_17-11-26/ticket-checkout-performance_PLAN_17-11-26.md`.
2. **Last completed phase:** PLAN supplement after blocked validation; SPEC and plan updated to include a measurable controlled latency reduction and one fewer serial RPC.
3. **Validate-contract status:** CONDITIONAL; the user accepted the documented harness-folder policy concern, with UPDATE PROCESS reconciliation still required.
4. **Context loaded:** `process/context/all-context.md` routed to planning, tests and UI contracts; `process/context/tests/all-tests.md` has no deeper test subrouters. Existing test files, route, PayOS adapter, v4 and checkout-preparation migrations, isolated PostgreSQL runner, current SPEC, related checkout plans/reports, and historical test gaps were inspected.
5. **Validation/execution source authority:** use current source, SQL migrations, test files, package/test-runner configuration and actual commands as authority. Existing `process/context/all-context.md` and `process/context/tests/all-tests.md` contain stale narrative for some runtime/test details; record a deferred context refresh in UPDATE PROCESS rather than treating those narratives as current truth.
6. **Next step:** EXECUTE may begin only after an explicit ENTER EXECUTE MODE command; create and validate harness/risk-gate.json before routing to EXECUTE. Do not deploy, call PayOS, or use hosted credentials under this plan.
7. **UPDATE PROCESS follow-up:** after execution, reconcile the general flat task-folder artifact convention with the narrow `task-folder/harness/` risk-pack exception in `process/development-protocols/plan-lifecycle.md`, `process/development-protocols/orchestration.md`, and the `vc-risk-evidence-pack` skill contract; refresh stale `all-context.md` and `tests/all-tests.md` narratives from source/config evidence. Keep these documentation edits deferred to UPDATE PROCESS; do not modify them in this PLAN supplement.

## Autonomous Goal Block

    SESSION GOAL: Implement the approved ticket-checkout performance plan and produce evidence for AC1–AC7.
    ENTRY PHASE: EXECUTE (PLAN and VALIDATE complete; CONDITIONAL accepted; an explicit ENTER EXECUTE MODE command is still required before implementation starts)
    REMAINING PHASES:
      [ ] EXECUTE — use the selected plan, create and validate risk-gate.json first, then implement and run its gates in order.
      [ ] UPDATE PROCESS — reconcile the flat task-folder rule with the required harness/ exception and refresh stale context from source evidence.
    CLARIFICATIONS LOCKED:
      1. AC1 requires the authenticated handler benchmark with an immutable baseline and candidate comparison.
      2. Preserve existing checkout configuration gates, HTTP/payment contracts and no-blind-retry behavior.
      3. Keep the harness/ exception; risk-gate.json precedes EXECUTE and remaining evidence precedes finalization.
      4. Do not claim hosted or production latency; do not call live PayOS during this plan.
    EXECUTE CONSENT: standing-granted in this stored provisional /goal block; this V5 acceptance does not start EXECUTE, which still requires explicit ENTER EXECUTE MODE in the normal workflow.
    DECISION POLICY: Follow the selected plan and its accepted CONDITIONAL contract; stop for missing risk-gate approval, security/grant mismatch, failed mandatory gates or any request for live external services.
    HARD STOPS:
      - No implementation before explicit ENTER EXECUTE MODE.
      - No migration rollout or live PayOS/hosted request under this plan.
      - Do not bypass the service-role-only grant, empty search_path or current config-failure responses.
    TEST GATES: route performance benchmark; route and PayOS suites; isolated PostgreSQL runner; ingress parser and local probe; scoped ESLint; typecheck; production build.
    START: After explicit ENTER EXECUTE MODE, create and validate harness/risk-gate.json, capture the immutable route baseline before source edits, then follow the implementation checklist.

## Strategy Compare — PLAN to VALIDATE

Signals: S1 multi-package 0; S2 API/auth/database contract 1; S3 3+ directions 0; S4 phase program 0; S5 depth requested 0; S6 high-risk API/payment/database class 1; S7 more than five touchpoints 1. **Score 3/7 (MEDIUM).**

| Strategy | Agent count | Fit |
|---|---:|---|
| Sequential | one validator, one owner | Recommended for the single route/database contract and the already defined dependent evidence sequence |
| Parallel subagents | 4 dimensions + 11 checklist sections = 15 reviews | Independent inspection is possible, but full fan-out is not needed to draft this single plan |
| Workflow | 1 plan supplement → validation → implementation gates | Predictable but no separate workflow runtime is needed |
| Agent team | 3–4 members over 2 rounds | No live coordination is needed among plan reviewers |

**Recommended next-phase strategy:** sequential VALIDATE owner with mandatory independent read-only validation checks as required by `vc-validate-agent`. The validation fan-out size above is an estimate only; the validator may use the strategy required by its protocol.

## Implementation checklist extracted

1. Capture and persist the 50-sample authenticated baseline JSON before route or migration edits; preserve exact request vector/configuration.
2. Add the service-role-only v5 migration with explicit return aliases, SQLSTATE mapping, and nested failure isolation.
3. Update the route to pass authenticated user and validated fields, combine initial DB calls, preserve exact call ordering and response semantics.
4. Add route and PayOS tests for AC2/AC4/AC5 behavior, cooldown, retry/replay, payment-state, provider observer, fallback, and SQLSTATE mapping.
5. Run candidate benchmark against the validated immutable baseline and record handler p50/p95/failures/RPC count.
6. Extend isolated PostgreSQL tests for role grants, security definer/search_path, cooldown, nonpayable, replay, conflict, deterministic prepare failure, lease and concurrency.
7. Add bounded ingress probe and Vitest-discoverable parser tests for IPv4/IPv6, host validation, redirects, timeout, outstanding work, and summary.
8. Run the two-terminal local ingress probe with readiness 405 and omitted-Origin expected 403; record ingress-only metrics.
9. Run focused tests, isolated DB runner, scoped lint, typecheck and build in the documented sequence.
10. Write AC1–AC7 linked report with separate handler/DB/ingress evidence and limits.
11. Produce and validate the five required high-risk evidence artifacts under the task-folder `harness/` before implementation finalization.

## Closeout / Execution State (UPDATE PROCESS, 17-11-26)

- **Classification:** Keep in active/testing (COMPLETE_WITH_GAPS). Not archived: the high-risk hosted/live gates are unverified and `mustStopBeforeFinalize` stays true.
- **Gate results:** route benchmark AC1 pass (cited run p50 74.929 to 45.781 ms, -38.9%; later rerun 32.049 ms, -57.23%); Vitest 87 tests in 6 files pass; isolated PostgreSQL runner pass; scoped ESLint 0; typecheck 0; build exit 1 on first run (Next.js 16.4.3 advisory stop) then 0 on retry; local ingress probe 500 x 403, 0 skipped, 0 transport errors.
- **Review:** round 1 vc-code-reviewer REQUEST_CHANGES (resolved by a test-side fix); round 2 APPROVE_WITH_CONCERNS (five Low items). Recorded in `harness/review-decision.json`; the evidence-pack validator exits 0.
- **Known gaps:** hosted Supabase (migration `202611170001` not applied), production, live PayOS, authenticated 50 req/s capacity, proxy Origin behavior.
- **Handoff item 7 done:** the flat task-folder rule and the `harness/` risk-pack exception are reconciled in `plan-lifecycle.md`, `orchestration.md` and the `vc-risk-evidence-pack` skill; `all-context.md` and `tests/all-tests.md` were refreshed from source.
- **Details and follow-ups:** `ticket-checkout-performance_REPORT_17-11-26.md` section "Final Closeout".

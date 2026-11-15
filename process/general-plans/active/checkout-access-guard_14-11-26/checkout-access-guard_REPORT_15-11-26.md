---
name: report:checkout-access-guard-execution
description: "Local checkout guard, auth refresh and visibility-aware polling execution evidence."
date: 15-11-26
metadata:
  node_type: memory
  type: report
  feature: general
  phase: EXECUTE
---

# Checkout access guard execution report

## What Was Done

- Continued the approved `checkout-access-guard` plan. The auth prompt/session handling, guarded route/UI response and visibility-aware polling were already present in the selected workspace and have existing targeted evidence in the sibling auth and payment UI reports.
- Added the real PostgreSQL fixture and policy checks to `scripts/test-checkout-guard-db.mjs` and `supabase/tests/checkout-access-guard.sql`. The runner applies every migration in order on an isolated, localhost-only embedded PostgreSQL instance and cleans up its temporary data directory.
- Verified permissions, 2/3 expiry thresholds, cooldown non-extension, idempotent replay/conflict, excluded and consumed evidence, late provider persistence, payment completion during a restriction, one checkout lease per order, ownership checks and 12 concurrent same-account requests.
- Added a partial `payos_payment_events(order_code)` index for the eligibility anti-join.
- Replaced the effective-deadline lower bound with the exactly equivalent pair of coarse predicates (`order deadline >= now - 1 hour` and `link deadline >= now - 1 hour`), preserving the exact inclusive lower bound and retaining `least(...) <= now` for the upper bound. The order lock query now filters pending/expired statuses, matching its partial index.
- Validated boundary equivalence in SQL and captured an actual `EXPLAIN` selecting `orders_checkout_access_idx` with 20,003 fixture orders.
- Captured 30-sample isolated workload timings and prior client request-count evidence in `checkout-access-guard-workload_15-11-26.json`.

## What Was Skipped or Deferred

- G8 controlled local browser screenshots and presentation checks were not run and remain unverified.
- No deployment, production migration, live OAuth, real provider request, or production throughput test was performed.
- Independent EVL reran G1-G5 plus scoped lint, typecheck and build. Independent code/security review recorded `approved-with-concerns`; the risk artifact validator now passes. The two nonblocking performance evidence gaps are retained below.

## Test Gate Outcomes

| Gate | Result | Evidence |
|---|---|---|
| G1 auth/session | PASS — 2 files, 21 tests | `npm.cmd test -- src/lib/supabase/session.test.ts src/components/auth` |
| G2 real PostgreSQL | PASS with review concerns | `node scripts/test-checkout-guard-db.mjs`; boundary SQL passes and `EXPLAIN` selects `orders_checkout_access_idx` with 20,003 total orders. The fixture's large volume is under a different user; it asserts the index name only, not the index condition. The PayOS event anti-join index has a schema assertion but no EXPLAIN/stress proof. |
| G3 route/payment/dialog | PASS — 8 files, 89 tests | `npm.cmd test -- src/app/api/ticket-orders src/app/api/payments src/lib/payments src/app/auth 'src/app/(routes)/_components/TicketRequestDialog.test.tsx'` |
| G4 status polling | PASS — 1 file, 16 tests | `npm.cmd test -- 'src/app/(routes)/payment/return/TicketPaymentStatus.test.tsx'` |
| G5 local workload | PASS — 30 samples per DB case | `node scripts/test-checkout-guard-db.mjs --workload`; latest rerun and `EXPLAIN` evidence are in `checkout-access-guard-workload_15-11-26.json` |
| G6 full automated suite | FAIL — 200 passed, 1 existing test failed | `npm.cmd test`; `src/lib/supabase/route-client.test.ts` expects production cookie configuration after setting `NODE_ENV` at test time, but `AUTH_COOKIE_OPTIONS` was captured during module import. This file is outside the selected plan touchpoints. |
| G6 application lint/typecheck/build | PASS for scoped lint, typecheck and build | `npx.cmd eslint src scripts --max-warnings=0`; `npm.cmd run typecheck`; `npm.cmd run build` |
| Broad `npm.cmd run check` | FAIL in installed harness sources | Existing `.agents/` and `.codex/` lint reports 269 errors and 192 warnings; scoped application/script lint passes. |
| Dependency audit | PASS — 0 production vulnerabilities | `npm.cmd audit --omit=dev` |
| G8 controlled browser | NOT RUN | No controlled local auth/payment fixtures or screenshots were produced in this execution. |
| G9 reviewer decision | APPROVED WITH CONCERNS | `harness/review-decision.json`; two nonblocking performance evidence gaps are recorded. This is not production approval. |

Latest local DB measurements: baseline v3 fresh p50/p95 1.980/4.007 ms; guarded v4 fresh 1.361/2.030 ms; baseline replay 1.988/3.757 ms; guarded replay 1.879/3.663 ms; guarded denial 1.455/2.415 ms. These small isolated samples do not establish network latency or production capacity. Client requests fell from 41 to 22 for the visible30s/hidden60s/visible30s status workload, with hidden polls 20 to 0; a 20-event focus burst fell from 20 router refreshes to 1 and added zero session fetches in both runs.

## Plan Deviations

- Added pending/expired status filters, two exactly equivalent sargable lower bounds, and an anti-join partial index in the approved migration. SQL boundary assertions and actual planner output confirm the inclusive policy and index selection; public behavior is unchanged.
- No other scope changes. Existing auth, route and UI source code was already in the workspace when this execution resumed; this execution did not rewrite those changes.

## Test Infra Gaps Found

- Full `npm.cmd test` remains red on the independent cookie-options test described above. It needs an independent baseline classification before altering a file outside this plan.
- Broad lint remains blocked by installed `.agents/` and `.codex/` files; application and script lint passes.
- The isolated PostgreSQL gate proves local PostgreSQL behavior and permission setup, not hosted Supabase parity or production rollout ordering.
- The event anti-join partial index is definition-checked but has not been EXPLAINed or stress-tested against a large PayOS event ledger.
- The effective upper-bound still uses `least(...) <= now`; it remains a residual filter after the per-account partial index scan. The 20,003-order fixture places decoy rows under a different user and checks only that the plan names `orders_checkout_access_idx`; it does not prove a high-volume single-account scan, exact index condition, or bounded future-order behavior.
- The independent reviewer approved with concerns and found no blocking correctness/payment-safety issue. The review decision is recorded in the task harness; the remaining evidence gaps keep the plan active/testing.

## Closeout Packet

- Selected plan: `process/general-plans/active/checkout-access-guard_14-11-26/checkout-access-guard_PLAN_15-11-26.md`.
- Finished: local PostgreSQL gate, policy/concurrency assertions, candidate-scan index alignment and workload evidence; targeted auth, route/payment/dialog and polling tests pass.
- Verified: G1–G5, scoped lint, typecheck, build and production dependency audit. Full suite and broad lint remain red for existing unrelated failures.
- Verified by independent EVL: G1-G5, scoped lint, typecheck and build. Risk artifact validator passes. Not verified: G8 browser scenarios, hosted Supabase behavior, production deployment, live OAuth/provider path and production performance.
- Cleanup/context capture remaining: no durable context update is made in EXECUTE. The recorded reviewer decision has nonblocking performance evidence gaps.
- Closeout classification: **Keep in active/testing**.
- Best next state: keep active/testing; run G8 if a controlled local browser fixture becomes available and consider a separate scale probe for event-index selection and unusually large single-account candidate sets.

## Forward Preview

### Test Infra Found

The pinned embedded PostgreSQL runtime works on Windows and is sufficient for deterministic local migrations, SQL permissions, policy cases and concurrency checks.

### Blast Radius Changes

`supabase/migrations/202611150001_checkout_access_guard.sql`, `scripts/test-checkout-guard-db.mjs`, `supabase/tests/checkout-access-guard.sql`, this plan, the colocated workload and report artifacts.

### Commands to Stay Green

`node scripts/test-checkout-guard-db.mjs`; `node scripts/test-checkout-guard-db.mjs --workload`; targeted G1/G3/G4 commands in the Test Gate Outcomes table; `npx.cmd eslint src scripts --max-warnings=0`; `npm.cmd run typecheck`; `npm.cmd run build`.

### Dependency Changes

No dependency changes in this execution. The workspace already includes the pinned `embedded-postgres` test dependency.

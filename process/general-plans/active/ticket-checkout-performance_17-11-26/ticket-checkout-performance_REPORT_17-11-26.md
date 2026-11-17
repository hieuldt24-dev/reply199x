---
phase: ticket-checkout-performance-execute
date: 2026-11-17
status: COMPLETE_WITH_GAPS
feature: none (general-plans)
plan: process/general-plans/active/ticket-checkout-performance_17-11-26/ticket-checkout-performance_PLAN_17-11-26.md
---

# Ticket checkout performance — EXECUTE report

**Bottom line:** Every local and isolated gate passes, and an independent reviewer approved with concerns (round 2). The authenticated handler median dropped 38.9% on the cited run (74.9 to 45.8 ms; a later rerun measured 32.0 ms, -57.2%) with one fewer database call. The evidence-pack validator now exits 0. Nothing was checked on hosted Supabase, in production, or against live PayOS, so the plan stays in active/testing. See the Final Closeout section at the end for the corrected single source of truth.

## What Was Done

- Checklist 1–8 (orchestrator-verified earlier this session): baseline/candidate JSON, migration `202611170001_ticket_order_checkout_v5.sql`, route + tests, PayOS observer + tests, ingress probe + tests, DB runner + SQL assertions.
- Checklist 9: local production build, loopback ingress probe, results in `ticket-checkout-performance_INGRESS_17-11-26.json`.
- Checklist 10: scoped ESLint, typecheck and build, run in order.
- Checklist 11: the four remaining `harness/` files, validator run, this report.

## Acceptance criteria → evidence

| AC | Result | Evidence |
|---|---|---|
| AC1 handler median −≥10 ms and −≥20%, no added failures, one fewer RPC | PASS | `ticket-checkout-performance_BASELINE_17-11-26.json` vs `ticket-checkout-performance_CANDIDATE_17-11-26.json`: p50 74.929 → 45.781 ms (−29.148 ms, −38.9%); p95 140.028 → 61.316 ms; 50×201 in both; 0 failures; RPCs 3 → 2 |
| AC2 Server-Timing fixed stages; PayOS spans once per operation; observer isolated | PASS | `src/app/api/ticket-orders/route.test.ts`, `src/lib/payments/payos/checkout.test.ts` (in the vitest runs; see the test-count table in the Final Closeout) |
| AC3 loopback ingress 50 req/s × 10 s, 0 skipped, 0 transport errors | PASS | `ticket-checkout-performance_INGRESS_17-11-26.json`: readiness 405; sent/completed 500/500; 403×500; skipped 0; transportErrors 0; timeouts 0; redirects 0; p50 2.375 / p95 3.522 / max 10.661 ms |
| AC4 retry/replay/cooldown/ambiguity/concurrency protections hold | PASS | route retry/replay tests, PayOS timeout/5xx fallback tests (max one POST), DB runner concurrency checks |
| AC5 v5 preserves behavior; fresh route uses one fewer RPC | PASS | `node scripts/test-checkout-guard-db.mjs` exit 0 (v5 schema, permissions, SECURITY DEFINER/search_path, P0002 injection + control); route RPC-count assertions |
| AC6 responsibilities stay in their boundaries | PASS (agent-probe) | Changed files are limited to the plan's Touchpoints; no telemetry module added (see `harness/context-snippets.json`). Independent review later recorded as approved-with-concerns |
| AC7 test/DB/lint/typecheck/build pass | PASS with concern | See gate table. The build exits 1 on its first attempt because of a Next.js security-advisory stop, then exits 0 on retry |

## Evidence by layer (kept separate)

**Handler, mocked authenticated route, 15 ms per mocked RPC, 5 warm-ups and 50 samples:**
- Environment: Node v22.22.0, win32 x64.
- Vector digest: `3a6c6611…c233`. The fixture is reset before every sample.
- Baseline route sha256: `1cd9c095…c125`.
- Candidate route sha256: `7eb3d4dd…78e4`. This equals the current `route.ts`, so the measured source is the current source.
- Git HEAD is not trustworthy: the baseline recorded it as unavailable.

**Isolated PostgreSQL (embedded), 50 alternating pairs:**

| Path | p50 | p95 | RPCs |
|---|---|---|---|
| Legacy v4 + prepare | 1.219 ms | 1.965 ms | 2 |
| v5 | 1.039 ms | 1.309 ms | 1 |

This excludes network and hosted latency.

**Ingress (unauthenticated, loopback):**
- Server: `next start` on 127.0.0.1:3001 with `SITE_URL=http://127.0.0.1:3001` and `PAYOS_CHECKOUT_ENABLED=false`, BUILD_ID `AQzcvrFqxKAfjLDM4dLNT`.
- Every request was a 403 origin rejection. This does not measure checkout capacity.
- The server was killed afterwards; nothing is listening on 3001.

## Test Gate Outcomes

| Command | Exit |
|---|---|
| `npm.cmd test -- src/app/api/ticket-orders src/lib/payments/payos src/lib/ticket-orders` (orchestrator) | 0 (79/79) |
| `node scripts/test-checkout-guard-db.mjs` (re-run) | 0 |
| `npm.cmd run build` (pre-ingress) | 1, then 0 on retry |
| Readiness `node -e "fetch(...)"` | 0 (`ready`) |
| `node scripts/measure-ticket-order-ingress.mjs --base-url http://127.0.0.1:3001 --rate 50 --duration 10` | 0 |
| Scoped `npm.cmd exec -- eslint … --max-warnings=0` | 0 |
| `npm.cmd run typecheck` | 0 |
| `npm.cmd run build` (final) | 1, then 0 on retry (BUILD_ID `Gd6_KxhDv4RSc-Ht_zLkR`) |
| `node .claude/skills/vc-risk-evidence-pack/scripts/validate-risk-artifacts.mjs …/harness/` | 1 at EXECUTE time (`review-decision.json` pending); 0 after the reviewer decision was recorded in UPDATE PROCESS |

### Review-fix supplement (2026-11-17, test-side only)

Closes the independent reviewer's test-evidence gaps. No production code, migration, script under measurement, BASELINE, risk-gate or review-decision file was changed. No new test exposed a production bug.

| Item | Change | Location |
|---|---|---|
| H1 | Probe import path fixed to `../../../scripts/...` (was 4 levels, above repo root); `@ts-expect-error` removed (non-literal import path) | `src/lib/ticket-orders/measure-ticket-order-ingress.test.ts:8-9` |
| M2 | No-network import test now `vi.resetModules()` → stubs `fetch` → dynamic import → asserts module loaded and fetch not called | same file `:13-20` |
| M4 | Fresh checkout asserts full nine-field v5 RPC object with `toEqual` + key count 9 | `src/app/api/ticket-orders/route.test.ts:87-98` |
| H2 | Restored/added: 413 + non-JSON 400; persist failure after provider success (503, safe log only); reconciliation-status order (409, no provider); lookup reconcile success; lookup null (409 + mark); lookup throws (503, no mark); create throws (503 + mark, one create) | `route.test.ts:242-351` |
| M1 | Observer passed to create and lookup; Server-Timing exact ordered names, finite non-negative values, includes `payos_create`/`payos_lookup`/`checkout_persist_rpc` where reached, no identity/order/provider data | `route.test.ts:286-304, 353-376` |
| M3 | Real-function v5 held-lease, ambiguous-reconcile, saved-link reuse assertions; concurrent same-key exactly-one `checkout_can_create=true` | `scripts/test-checkout-guard-db.mjs:295-325, 392-395` |

| Command | Exit | Result |
|---|---|---|
| `npx vitest run src/app/api/ticket-orders/route.test.ts src/lib/payments/payos/checkout.test.ts src/lib/ticket-orders/measure-ticket-order-ingress.test.ts` | 0 | 3 files, 61/61 |
| `node scripts/test-checkout-guard-db.mjs` | 0 | new PASS lines: held-lease, ambiguous-reconcile, saved-link reuse, exactly-one-creator (12 requests); P0002 trigger case/control and teardown unchanged; v5 paired p50 1.029 vs legacy 1.245 ms |
| Plan item-10 scoped `npm.cmd exec -- eslint … --max-warnings=0` | 0 | clean |
| `npm.cmd run typecheck` | 0 | clean |

Build, server, ingress and perf benchmark were not re-run (left to EVL). `ticket-checkout-performance_CANDIDATE_17-11-26.json` was restored from a saved copy (the on-disk file had been overwritten by a later rerun) so the cited p50 45.781 ms / -38.9% matches the file; the later rerun (p50 32.049 ms, -57.23%) is preserved as `ticket-checkout-performance_CANDIDATE_RERUN_17-11-26.json`. AC1 passes in both.

## Plan Deviations

- **Build retries.** The build was retried because Next.js 16.4.3 halts on a security advisory even when compilation succeeds. No upgrade was run, since that would change dependencies, which is a hard stop.
- **Two terminals replaced.** Instead of two manual terminals, I started the server as a background process and killed it with `taskkill` rather than Ctrl+C. The behavior is equivalent.
- **Review left pending at EXECUTE time.** `review-decision.json` was deliberately `pending-human-review`; the reviewer decision was recorded later in UPDATE PROCESS (see Final Closeout).

## What Was Skipped or Deferred / Evidence limits

- No hosted or production performance claim. Hosted Supabase migration application is unverified.
- No live PayOS calls.
- Authenticated 50 req/s throughput is unverified (Known-Gap).
- The proxy Origin behavior when hosted is untested.
- The reviewer decision is now recorded (approved-with-concerns); the human decision on commit, hosted migration and deployment is still required.

## Test Infra Gaps Found

- The Next.js security-advisory stop makes the first `npm run build` non-deterministic (exit 1). The upgrade decision belongs to the user.

## Closeout Packet

- Plan: `process/general-plans/active/ticket-checkout-performance_17-11-26/ticket-checkout-performance_PLAN_17-11-26.md`
- **Finished:** checklist 1–11 work. All mandatory local gates are green.
- **Verified:** handler, isolated DB and loopback ingress.
- **Not verified:** hosted, production and live provider behavior; reviewer approval.
- **Classification (superseded by Final Closeout):** at EXECUTE time, keep in active/testing until a reviewer decision was recorded. That is done; the classification stays Keep in active/testing for the reasons in the Final Closeout.
- **Next step (superseded):** review, EVL and UPDATE PROCESS have since run.

## Forward Preview

- **Test Infra Found:** `route.performance.test.ts` (env-driven baseline/candidate modes), `scripts/measure-ticket-order-ingress.mjs`, the v5 timing in `scripts/test-checkout-guard-db.mjs`.
- **Blast Radius Changes:** none beyond the plan's Touchpoints. Migration `202611170002` is unrelated but gets applied by the DB runner.
- **Commands to Stay Green:** the gate table above.
- **Dependency Changes:** none.

No follow-up plan stubs were created. CONTEXT_PARTIAL: none.

## Final Closeout (UPDATE PROCESS, 2026-11-17)

**Bottom line:** the plan stays in `active/` (Keep in active/testing, COMPLETE_WITH_GAPS). All local and isolated gates are green twice, the reviewer approved with concerns, and the evidence pack validates. Hosted Supabase, production, live PayOS and authenticated capacity remain unverified, and the high-risk gate still requires the user's decision before commit, migration rollout or deploy.

### AC1 evidence: two candidate runs, both pass

| File | Run | p50 | vs baseline p50 74.929 ms | Role |
|---|---|---|---|---|
| `ticket-checkout-performance_BASELINE_17-11-26.json` | baseline | 74.929 ms (p95 140.028) | n/a | immutable baseline, 3 RPCs |
| `ticket-checkout-performance_CANDIDATE_17-11-26.json` | cited candidate run | 45.781 ms (p95 61.316) | -29.148 ms, -38.9% | the numbers cited throughout this REPORT and in `harness/verification.json`; restored from a saved copy because a later rerun overwrote it |
| `ticket-checkout-performance_CANDIDATE_RERUN_17-11-26.json` | later EVL rerun | 32.049 ms | -57.23% | preserved separately; also passes (at least 10 ms and 20% required) |

The route benchmark test overwrites the candidate json on each candidate run (Low item L2). The spread between 45.8 and 32.0 ms is run-to-run variation on a mocked fixed-delay fixture; both runs show the one-fewer-RPC saving, neither proves hosted latency.

### Test counts: single source of truth

The 79, 61 and 87 figures are different test sets at different times, not conflicting results.

| Figure | Test set | When |
|---|---|---|
| 79/79 | `src/app/api/ticket-orders`, `src/lib/payments/payos`, `src/lib/ticket-orders` directories | orchestrator run during EXECUTE, before the review-fix cycle |
| 61/61 | three named files only (`route.test.ts`, `checkout.test.ts`, `measure-ticket-order-ingress.test.ts`) | review-fix supplement, after tests were restored/added |
| 87 tests in 6 files | the vc-tester EVL run of the validate-contract suites | EVL confirmation; use this as the current count |

### EVL results (vc-tester, two runs, all green)

- Route benchmark (AC1): pass, see above.
- Vitest: 87 tests, 6 files, pass.
- Isolated PostgreSQL runner (`node scripts/test-checkout-guard-db.mjs`): pass, including v5 held-lease, ambiguous-reconcile, saved-link reuse, exactly one `can_create` among 12 concurrent same-key calls, and the P0002 trigger case.
- Scoped ESLint: 0 problems. Typecheck: exit 0.
- Build: exit 1 on the first run (Next.js 16.4.3 known-vulnerability advisory stop after successful compilation), exit 0 on retry.
- Local ingress probe: 50 req/s for 10 s, 500 requests all 403, 0 skipped, 0 transport errors (ingress only, unauthenticated).

### Reviewer rounds

| Round | Reviewer | Decision | Outcome |
|---|---|---|---|
| 1 | vc-code-reviewer | REQUEST_CHANGES | test-evidence gaps H1, H2, M1-M4 |
| fix | vc-execute-agent | test-side fix only | no production code, migration, measured script, baseline or risk-gate change; closed H1, H2, M1-M4 |
| 2 | vc-code-reviewer | APPROVE_WITH_CONCERNS | no High/Medium open; five Low concerns |

Recorded in `harness/review-decision.json` (`approved-with-concerns`). `node .claude/skills/vc-risk-evidence-pack/scripts/validate-risk-artifacts.mjs process/general-plans/active/ticket-checkout-performance_17-11-26/harness/` exits 0 with no warnings or failures.

### Limits (what this does not prove)

Local and isolated-database behavior only. Unverified: hosted Supabase (migration `202611170001` is NOT applied to any hosted database), production, live PayOS, authenticated 50 req/s capacity, and proxy Origin behavior.

### Side work in this session (outside this plan)

Migration `supabase/migrations/202611170002_sheet_outbox_safe_manual_ops.sql` (fills `synced_at` through a trigger; adds service_role-only `enqueue_paid_ticket_sheet_sync(order_id)`) was applied by the user to the production Supabase together with `202611140007`. The user's production check: one order's outbox row ended `status=synced`, `attempt_count=1`, with a `sheet_row_id`, so a live Sheet write was observed for that order. This is a single manual observation, not an automated test. No secret values are recorded in repo files.

### Follow-ups (listed; not created as plans or backlog notes)

1. Next.js security upgrade from 16.4.3: separate, user-approved dependency task (removes the first-build exit 1).
2. Add a scheduler for `POST /api/internal/sheets-sync` (README says to schedule it; none exists in the repo; Vercel Hobby cron is daily only).
3. The PayOS webhook currently awaits Google Sheets before replying to PayOS; consider `after()` from `next/server`.
4. Outbox retry cap and alerting.
5. SQL tests for migration `202611170002` (trigger and enqueue function).
6. Five Low items: L1 CLI main-guard removal undetected by the import test; L2 benchmark test overwrites candidate json; L3 mixed test counts (resolved by the table above); L4 probe VALID_BODY shape differs from the route schema (harmless); L5 truncated-stream 400 path untested.
7. Apply `202611170001` to a non-production database and validate latency there before any hosted claim.
8. Pre-existing follow-ups: `ticket-sheet-retry-worker-validation` and `payos-live-rail-verification`.

### Closeout classification

Keep in active/testing. COMPLETE_WITH_GAPS. Drift: HIGH. Move-on: the user decides on a commit checkpoint, then hosted-migration validation on a non-production database.

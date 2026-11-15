---
name: plan:checkout-access-guard
description: "Implement initial login prompting, atomic account checkout cooldown and visibility-aware data loading."
date: 15-11-26
feature: general
phase: PLAN
status: planned
---

# Checkout access guard implementation plan

**Date**: 15-11-26
**Status**: PLANNED
**Complexity**: COMPLEX

## Overview

Implement the approved SPEC with a database-enforced account policy and small changes to existing client components. This is one COMPLEX-quality plan with one execution stream, not a separately released phase program. No production mutation, deployment, real payment or credential inspection is authorized by this plan.

## Requirements and Execution Context

Locked requirements: `checkout-access-guard_SPEC_14-11-26.md` in this folder. User instruction on 15 November 2026: “thực hiện spec này”. INNOVATE is skipped because this extends existing auth, RPC and polling mechanisms. SPEC defaults are accepted for this implementation: dismissible initial prompt per full entry and a fixed restriction beginning at first detection.

| Field | Value |
|---|---|
| feature | general |
| phase | PLAN |
| session-goal | Implement checkout-access-guard SPEC |
| branch | main, baseline 059f844 |
| worktree | D:/SE19C01-DE190318/7.FALL2026/EXE101 |
| context-group | planning, tests, uxui |
| blast-radius-packages | single Next.js package, supabase/migrations, local test scripts |
| active-plan | process/general-plans/active/checkout-access-guard_14-11-26/checkout-access-guard_PLAN_15-11-26.md |
| test-runner | vitest; isolated PostgreSQL integration harness |
| validate-contract | pending in this plan |

Context loaded: `process/context/all-context.md`, `planning/all-planning.md`, `tests/all-tests.md`, `uxui/all-uxui.md`, `uxui/component-contracts.md`; workflow routers and selected skills. Tests router has no deeper testing document. Existing context predates payment/auth implementation: current source and migrations are authoritative. Situation scan finds only this untracked task folder dirty; no existing implementation plan overlaps this SPEC.

## Goals and Scope

- Prompt anonymous visitors once per mounted full-page visit; distinguish auth outage from anonymous state.
- Three distinct, evidenced, unpaid expiry deadlines in the inclusive preceding hour block creation of new orders for exactly 24 hours from detection.
- Preserve idempotent retries, verified payment processing, ownership and provider creation leases.
- Reduce duplicate focus refreshes and suspend status polling when hidden; record comparative timings and request counts.
- Exclude permanent bans, browsing/sign-in restrictions, payment-provider replacement and throughput claims.

## Touchpoints

| Path | Change or dependency |
|---|---|
| `src/lib/supabase/session.ts` | Classify missing session separately from auth outages |
| `src/lib/supabase/session.test.ts` | New auth classification tests |
| `src/components/auth/HeaderAuth.tsx` | Initial prompt and coalesced focus refresh |
| `src/components/auth/HeaderAuth.test.tsx` | New prompt and focus lifecycle tests |
| `src/components/auth/LoginDialog.tsx` | Read; change only if needed for recovery/accessibility |
| `src/components/auth/LoginDialog.test.tsx` | New keyboard/dialog lifecycle tests if not covered by HeaderAuth tests |
| `src/app/(routes)/layout.tsx` | Read existing server-supplied auth; no additional session fetch |
| `supabase/migrations/202611150001_checkout_access_guard.sql` | New forward migration: account state, issued-checkout evidence, guarded RPC and permissions |
| `supabase/migrations/202611130005*`, `202611140006*`, `202611140008*`, `202611140009*` | Read-only pricing, expiry, provider lease, webhook and outbox contracts |
| `src/app/api/ticket-orders/route.ts` | Call guarded creation RPC; structured 429 response |
| `src/app/api/ticket-orders/route.test.ts` | Extend denial, retry and provider-call regressions |
| `src/app/(routes)/_components/TicketRequestDialog.tsx` and `.test.tsx` | Display reason/retry time; retain request identity |
| `src/app/(routes)/payment/return/TicketPaymentStatus.tsx` and `.test.tsx` | Visibility, cancellation, non-overlap, retries, terminal behavior |
| `src/app/api/ticket-orders/[orderId]/route.test.ts` | Existing-order/ownership regression |
| `src/app/api/payments/payos/webhook/route.test.ts` | Verified payment and tampered-return regressions; extend as necessary |
| `scripts/test-checkout-guard-db.mjs` | New isolated real PostgreSQL migration/concurrency/workload runner |
| `supabase/tests/checkout-access-guard.sql` | New deterministic database assertions/fixtures |
| `package.json`, `package-lock.json` | Add local DB gate script; lockfile changes only if fallback test runtime is needed |
| Selected task folder | Execution report, workload evidence, risk pack and iteration records |

## Architecture and Data Flow

### A. Auth presentation and focus refresh

Use the existing server-provided AuthView. HeaderAuth initializes the prompt only for `anonymous`; component-local state owns dismissal and survives rerenders/router refreshes. Never open automatically for `authenticated` or `unavailable`. Keep callback-error handling, native dialog keyboard escape and manual reopen intact. An unavailable state presents a recoverable session-check action and clear status rather than claiming logout or repeatedly initiating OAuth.

Classify a genuine missing/invalid session from installed Supabase auth error types/codes; network, upstream 5xx, retryable fetch failures and unexpected exceptions yield `unavailable`. A returned null user without error is anonymous. Read installed SDK declarations before naming error classes, avoiding speculative error matching.

Coalesce focus and visibility refreshes with a documented minimum interval (5 seconds) and React transition pending state so bursts cannot schedule overlapping router refreshes. Skip hidden events. A visible return can request one refresh; repeated events inside the interval do none. Remove listeners on unmount. Do not add a separate `/api/auth/session` request for initial prompting.

### B. Atomic checkout policy

Add service-only `checkout_access_state` keyed by auth user UUID with nullable `blocked_until` and `consumed_through` timestamps. Enable RLS and revoke anon/authenticated table and function access. SECURITY DEFINER functions use empty search_path, schema-qualified references and explicit service_role grants. Add an index supporting orders by user/deadline and supporting provider evidence lookup if current indexes do not suffice.

Add nullable `checkout_issued_at` to PayOS links. Only successful persistence of a newly confirmed provider link URL/id sets it, once, while both order and link are pending and the effective payment deadline is strictly in the future. Capture the persistence time after obtaining the existing order/link locks; a delayed provider response at or after expiry must never receive issued evidence. Historical rows remain null; replaying old links must not backfill evidence. Failed/reconciliation rows and creation attempts without issued evidence never count. Eligibility additionally requires `checkout_issued_at < least(link.expires_at, order.payment_expires_at)`. Preserve existing order -> provider lock ordering and provider amount/currency/link validation when updating prepare function.

Introduce `create_ticket_order_v4` with v3 inputs and existing success return columns plus nullable `blocked_until`. Keep v3 normalization, fingerprint conflict, pricing and ticket-item creation by reusing its implementation inside the guarded transaction. Do not merely guard with a separate route query: that permits races.

In one transaction: validate inputs; insert account state if absent; lock account row; check existing same-user/idempotency identity and enforce the same fingerprint semantics before applying new-order policy. Existing identical requests bypass the new-order restriction and preserve existing route behavior for terminal orders. A conflicting payload still returns 409. For genuinely new requests, return the existing active restriction without extending it; otherwise lock candidate orders in stable UUID order, then associated provider rows, and recheck statuses after locks. Do not acquire account lock after an order/provider lock in any path.

Eligible evidence is one distinct order for that account with order state pending_payment/expired, PayOS state pending/expired, non-null issued evidence and persisted link id/URL, no paid_at/transaction evidence, no reconciliation evidence, and effective provider payment deadline in `[database_now - 1 hour, database_now]`. Use the PayOS deadline (bounded by order deadline) rather than demand-driven stored order labels. Exclude provider failures, reconciliation, paid/refunded orders and ambiguous historical rows. Lock/recheck ensures a webhook that committed before evaluation cannot be counted from stale state; payments arriving after a committed restriction continue normally without extending it.

Count only deadlines strictly after `consumed_through` when that watermark exists. At >=3 qualifying distinct orders, persist `blocked_until = database_now + 24 hours` and `consumed_through = database_now`; return a denied result with null order_id and that timestamp. Return normally: raising an exception here would roll back the restriction. Use database time captured after acquiring the account lock so queued requests do not shorten/extend periods accidentally. At the deadline equality checkout is allowed; old evidence stays consumed; a later new qualifying group may trigger another period. Do not modify past payment facts or mark orders paid.

The v4 function calls v3 as database owner where reuse is safe. Retire service-role grants on legacy unguarded creation RPCs as part of the migration; v4 owner remains able to call v3. This requires deployment with checkout disabled, migration first then matching application deployment, then existing release gates before enabling. Do not deploy in this task. A missing v4 produces fail-closed 503. Keep status GET, signed webhook, expiry and outbox processing independent of cooldown state.

### C. Route and customer response

After guarded RPC returns, recognize valid denial before parsing success order fields. Return HTTP 429 with `error.code = checkout_restricted`, Vietnamese reason, ISO `error.retryAt`, and `Retry-After` rounded up in seconds (minimum 1). Preserve private/no-store, Origin, content limits, authenticated user identity, payment-rail feature flag and existing 409/503 semantics. A denied result must never call prepare/create/lookup provider functions. Unexpected RPC shape fails closed rather than creating checkout.

TicketRequestDialog recognizes that code and valid retryAt, shows a localized retry date/time and preserves form values and existing idempotency identity. It must not automatically generate a new request key, retry a blocked request, or mistake cooldown for a provider failure. Malformed error payloads show existing generic safe error.

### D. Payment status lifecycle

One timer and at most one active fetch per mounted order. Start only while visible; hiding clears periodic retry timer and aborts current fetch; becoming visible starts one immediate fetch. Use AbortController and a generation/disposed guard checked after response JSON parsing as well as fetch. Cleanup aborts, clears polling and paid redirect timers and removes listeners. Stale old-order promises cannot update new-order UI.

Retain 3-second pending poll interval, 5-second transient error retry and 3-second paid redirect. Stop polling for terminal states and unauthorized responses. Network/5xx/malformed transient responses show recovery and retry while visible; aborts do not show errors. Visibility/focus bursts coalesce. Preserve paid redirect without scheduling duplicate redirects when revisiting visible state.

## Public Contracts

- New service-role-only `create_ticket_order_v4` with v3 inputs and additional blocked_until result; existing successful HTTP 201 shape remains unchanged.
- New HTTP 429 checkout_restricted/error.retryAt plus Retry-After; UI handles this explicitly.
- New restricted account state and PayOS issued evidence are inaccessible to anonymous/authenticated DB clients. Caller identity still comes from server getUser, never request-supplied user id.
- Existing signing, amount checks, webhook transaction idempotency and registration/outbox contracts remain required regressions.

## Blast Radius

One npm package; approximately 15-20 changed/new files plus colocated evidence. High risk: auth/identity, schema migration, billing/payment adjacency, public API, permissions/trust boundary. No harness or context reorganization. No unrelated source cleanup.

## Risk Predictions and Security

Five-perspective review: architecture requires account serialization; security requires service-only RPC/no user-id trust; performance requires an indexed bounded one-hour candidate scan; reliability requires durable denied results and stable lock order; UX requires dismissible prompting and an understandable fixed retry time. Rejected alternatives: in-memory counters (cross-instance race), route read-then-write (race), stored expired label alone (demand-driven/ambiguous), throwing SQL denial (rolls back), and unrestricted polling (wasted hidden requests).

STRIDE: spoofing is constrained by authenticated server identity; tampering by RLS/SQL permissions and fingerprint checks; repudiation by persisted timestamps and test evidence without PII; disclosure by private no-store and secret-free diagnostics; denial of service by account-local row locks and indexed scans; elevation by explicit function grants and revoked legacy creation paths. Cooldown is about creating new orders, never authority to finalize payments from browser parameters.

Highest-risk scenario matrix: exactly 2/3 expiries; inclusive lower/current boundary; one microsecond outside; same request 20 times; 20 simultaneous new keys on one restricted account; parallel independent accounts; webhook commits before eligibility lock; late signed webhook during restriction; active/cooldown-equality/after expiry; failed/reconciliation/legacy links; old consumed strikes plus 3 fresh strikes; malformed retry time; hidden pending fetch; JSON resolves after navigation; terminal event followed by focus bursts.

## Implementation Checklist

1. [ ] Add auth classification and prompt/focus regression scenarios to `session.test.ts` and `HeaderAuth.test.tsx`; verify they fail against baseline using `npm.cmd test -- src/lib/supabase/session.test.ts src/components/auth/HeaderAuth.test.tsx`.
2. [ ] Implement session classification and HeaderAuth lifecycle; preserve LoginDialog accessibility, test Escape/manual reopen/callback state.
3. [ ] Create isolated DB harness and fixtures. Validation ran `docker info`: Docker daemon is unavailable. Prefer a pinned Windows/x64 `embedded-postgres` test-only dependency (official project documents Node >=18 support), or disposable Docker if the daemon becomes available. The runner must actually initialize/start PostgreSQL, prove pgcrypto availability, bind only localhost on a fresh port and unique task-owned data directory, and stop/remove its own instance in try/finally without host-user creation. Never use production URLs or existing databases; fail nonzero when no real runtime is available.
4. [ ] Add migration `202611150001_checkout_access_guard.sql`: state/evidence/indexes, guarded RPC, updated prepare evidence and explicit privileges. Keep prior migrations immutable.
5. [ ] Exercise every migration in order in isolated PostgreSQL with minimal Supabase auth.users/auth.uid(), extensions.pgcrypto and anon/authenticated/service_role bootstrap. Model service_role BYPASSRLS and hosted-default schema/table privileges needed by existing code; run guarded RPC/concurrency as service_role, not merely superuser. Add deterministic SQL eligibility, permission, transaction and cooldown cases in `supabase/tests/checkout-access-guard.sql`, including delayed provider persistence at/after expiry, historical replay exclusion, anon/authenticated denial and revoked legacy RPC calls. Run multi-session concurrency through the harness. No SQL mocks qualify for this step.
6. [ ] Extend ticket-orders route tests for structured denial/header, missing migration, malformed denial, no provider work while blocked, existing request replay, payload conflict and unchanged pricing; implement v4/429 handling.
7. [ ] Extend TicketRequestDialog tests then implement localized reason/time display and identity preservation.
8. [ ] Extend TicketPaymentStatus tests using fake timers/deferred fetch/JSON promises and visibility transitions; implement cancellation/non-overlap/retry and terminal lifecycle.
9. [ ] Capture baseline before changing source, then run `node scripts/test-checkout-guard-db.mjs --workload` as the deterministic G5 workload gate. It writes `checkout-access-guard-workload_15-11-26.json` in this task folder, containing reproducible isolated DB baseline v3/after v4 equal-run fresh/replay/denied workloads, sample counts and elapsed p50/p95. G1/G4 tests additionally measure equal fake-clock client timelines (30s visible, 60s hidden, 30s visible) and focus bursts against baseline and after behavior; record those actual observed request counts in that JSON/report. Assert zero hidden polls, one logical provider creation, ownership and amount invariants; no unsupported provider/production capacity claim or fabricated timings.
10. [ ] Run automated, DB, application quality and production build gates below; independently confirm via tester agent. Record all residuals honestly and keep active/testing if required proof is unavailable.
11. [ ] Produce risk evidence pack and execution report in this task folder. Have independent reviewer record actual decision before high-risk work is described as ready. Keep deployment/migration application to production as a separate authorized action.

## Acceptance Criteria

AC1 initial accessible prompt/dismissal/signed-in suppression — proven by: G1 initial auth/dialog scenarios; strategy: Fully-Automated.

AC2 auth failures recover — proven by: G1 returned and thrown auth outage scenarios; strategy: Fully-Automated.

AC3 threshold/hour boundary/24h — proven by: G2 actual DB clock/eligibility cases; strategy: Fully-Automated.

AC4 excluded states and retries — proven by: G2 classification/replay and G3 provider/idempotency regressions; strategy: Fully-Automated.

AC5 cross-tab concurrency — proven by: G2 multi-session same-account/different-account tests; strategy: Fully-Automated.

AC6 non-extension/recovery/consumed evidence — proven by: G2 timestamp and fresh-cycle assertions; strategy: Fully-Automated.

AC7 existing-order/payment safety — proven by: G2 payment concurrent interleavings and G3 ownership/signed-webhook/tampered-return cases; strategy: Fully-Automated.

AC8 polling lifecycle — proven by: G4 fake-clock visibility/unmount/terminal scenarios; strategy: Fully-Automated.

AC9 focus/request count — proven by: G1 focus coalescing and no initial session-fetch assertions; strategy: Fully-Automated.

AC10 measured workload — proven by: G5 comparative workload records plus G2/G3 correctness invariants; strategy: Hybrid.

## Verification Evidence

| Gate / Scenario | Strategy | Proves SPEC criterion |
|---|---|---|
| G1: `npm.cmd test -- src/lib/supabase/session.test.ts src/components/auth` | Fully-Automated | AC1, AC2, AC9 |
| G2: `node scripts/test-checkout-guard-db.mjs` (new runner; real isolated PostgreSQL mandatory, no silent skip) | Fully-Automated | AC3, AC4, AC5, AC6, AC7 |
| G3: `npm.cmd test -- src/app/api/ticket-orders src/app/api/payments src/lib/payments src/app/auth 'src/app/(routes)/_components/TicketRequestDialog.test.tsx'` | Fully-Automated | AC4, AC7, AC10 correctness |
| G4: `npm.cmd test -- 'src/app/(routes)/payment/return/TicketPaymentStatus.test.tsx'` | Fully-Automated | AC8 |
| G5: `node scripts/test-checkout-guard-db.mjs --workload`; G1/G4 observed baseline/after client counts; named workload JSON artifact and execution report required | Hybrid | AC10 |
| G6: `npm.cmd test`; `npm.cmd run check`; `npm.cmd run build` sequentially for typegen/build | Fully-Automated | Full regression and build compatibility |
| G7: `npx.cmd eslint src scripts --max-warnings=0` and `npm.cmd run typecheck` if only unrelated harness breaks broad lint | Fully-Automated | Application quality; record broad failure separately |
| G8: browser inspect 390px/1280px, anonymous entry, Escape/dismiss, signed-in entry, outage recovery and blocked retry wording | Agent-Probe | AC1/AC2/AC3 presentation; not actual DB correctness |

G1/G3/G4 red-first scenarios must fail meaningfully against baseline and then pass; do not add implementation-mirroring tests. G2 creates/destroys only its own isolated database and must assert committed account state after denied calls, real competing connections and privileges. Docker-only preconditions may classify G2 as Hybrid operationally, but absence is an unmet required proving gate, never PASS.

## Test Infra Improvement Notes

Discovered actual tests: route/domain/webhook tests and TicketPaymentStatus/TicketRequestDialog jsdom tests under src; no HeaderAuth/session tests or real DB runner. Vitest config only includes src tests. Node >=22 and npm scripts are existing tooling. Add DB integration command separately to avoid converting existing unit suite into a Docker dependency. Docker executable exists; daemon not yet proven. Embedded PostgreSQL is an allowed local test-only fallback; if neither works, record backlog note for G2 and keep AC3-7 conditional/unmet, never replace concurrency proof with mocks. Live production provider throughput remains outside the claim.

| Area | High-risk class | Minimum tier | Gap resolution |
|---|---|---|---|
| Auth prompt/session | auth/identity | Hybrid | Automated G1 plus browser G8; no live credential output |
| Account guard/SQL | migration, permissions, public contract | Hybrid | Real isolated G2 required |
| Payment correctness | billing/payment | Hybrid | G2 interleavings and G3 signed-provider regressions; no real charges |

Residual options if local DB runtime blocked: A) complete runner/fixtures now; B) run disposable Docker/embedded PostgreSQL; C) accept only an explicitly unverified local implementation with no production-readiness claim; D) colocate a follow-up test-infrastructure NOTE and keep plan active/testing. Production migration smoke/live auth/provider capacity have no proving command in this task and require separate release evidence.

## Dependencies, Rollout and Rollback

Preserve all previous SQL history and current pricing/payment contracts. New v4 and evidence column must exist before matching app release; use existing checkout feature flag closed for coordinated rollout. Remote apply/deploy is outside this task. For rollback, disable checkout; revert application together with a reviewed permission restoration migration if returning to v3 is explicitly desired. Do not drop account/evidence state or reset payment facts. Auth/status client changes can be reverted independently. Never claim local bootstrap of auth roles proves full hosted Supabase RLS environment; test grants/RLS explicitly in isolated DB.

## Phase Completion Rules

PLANNED means no implementation proof. CODE DONE requires all source/checklist work recorded. TESTING applies while any gate, browser check or external requirement remains unproven. VERIFIED requires automated regression, real database assertions, manual flow checks and user confirmation; successful builds or mocks alone never establish it. Keep this plan active/testing when a required gate cannot run. Execution transitions and independent EVL belong to the orchestrator; this PLAN agent never implements.

## Risk Evidence Pack

Create `risk-gate.json`, `context-snippets.json`, `verification.json`, `review-decision.json`, `adversarial-validation.json` under this task folder's `harness/`. Follow actual validator field requirements (the prose example differs). Snippets cite exact code lines, verification includes happy/boundary/failure evidence and skipped external checks, and review-decision must come from a real independent review. Validate with `node .claude/skills/vc-risk-evidence-pack/scripts/validate-risk-artifacts.mjs process/general-plans/active/checkout-access-guard_14-11-26/harness`.

## Validate Contract

Status: PASS
Date: 15-11-26
date: 2026-11-15
generated-by: outer-pvl

Scope: this one plan and its locked sibling SPEC. The user's instruction to implement this SPEC authorizes local reversible implementation and verification. No remote deployment, production migration, real payment, messaging or credential disclosure is included.

V1: artifact validator passed (zero failures/warnings); existing source paths and deliberate new-file targets checked against repository. Loaded root context and planning/test/UX routing chains; current source overrides stale pre-payment context. Main branch has this task folder untracked. No umbrella with a Stable Program Goal heading exists for this work, so Branch A applies.

V2/V3: root-managed independent reviews covered infra/setup, test coverage, breaking contracts, security and auth/SQL/client section feasibility. Minor plan gaps were corrected in this validation: issued evidence must precede effective expiry and be persisted while payable; isolated DB must run as service_role and prove permissions; exact quoted G3 command; named G5 workload/artifact; Docker-unavailable fallback and cleanup constraints. No unresolved design FAIL remains. PASS approves the executable plan, not unrun implementation gates.

Parallel strategy: parallel-subagents for independent read-only validation; sequential single-owner implementation.
Rationale: score 3/7, S2 schema/API/auth, S6 high risk and S7 >5 files; shared SQL/auth policy favors one implementer.

| Signal | S1 | S2 | S3 | S4 | S5 | S6 | S7 |
|---|---|---|---|---|---|---|---|
| Present | 0 | 1 | 0 | 0 | 0 | 1 | 1 |

| Strategy | Agent count math | Fit |
|---|---|---|
| Sequential | 1 implementer + 1 independent tester + 1 reviewer = 3 | Recommended after validation |
| Parallel subagents | 2 helpers x 2 dimensions = 4 independent dimension assessments, plus section review by validator | Used for read-only validation |
| Workflow | 3 dependent steps x 1 agent x 1 pass = 3 | Equivalent sequencing, no separate runtime needed |
| Agent team | 3 members x 2 rounds = 6 | Unnecessary coordination for one implementation stream |

Cost guard: not triggered; no >30-agent fan-out.

Test gates:

| criterion id | behavior | strategy | proving test | gap-resolution |
|---|---|---|---|---|
| AC1, AC2, AC9 | Anonymous prompt once, signed-in suppression, outage recovery, Escape/manual reopen and coalesced refresh | Fully-Automated | G1: `npm.cmd test -- src/lib/supabase/session.test.ts src/components/auth` | B |

Failing stub: `test("should prompt once and recover from auth outages without redundant session loads", () => { throw new Error("NOT IMPLEMENTED — G1 behavioral scenarios") })`

| AC3, AC4, AC5, AC6, AC7 | Atomic 3/hour threshold, inclusive boundaries, fixed cooldown, consumed evidence, replay/exclusions, independent accounts, privileges and concurrent payments | Hybrid | G2: `node scripts/test-checkout-guard-db.mjs`; precondition: self-created isolated real PostgreSQL from pinned embedded runtime or Docker | B |
| AC4, AC7, AC10 | 429 shape/header, no provider work on denial, existing-order ownership, idempotency, signed webhook and tampered-return safety | Fully-Automated | G3: `npm.cmd test -- src/app/api/ticket-orders src/app/api/payments src/lib/payments src/app/auth 'src/app/(routes)/_components/TicketRequestDialog.test.tsx'` | B |

Failing stub: `test("should deny new checkout with retry time while preserving existing payment and idempotency contracts", () => { throw new Error("NOT IMPLEMENTED — G3 boundary scenarios") })`

| AC8 | Pause/abort hidden requests, immediate visible return, no overlap, transient retries, terminal stop and stale JSON/unmount safety | Fully-Automated | G4: `npm.cmd test -- 'src/app/(routes)/payment/return/TicketPaymentStatus.test.tsx'` | B |

Failing stub: `test("should pause hidden status polling and discard aborted or stale responses", () => { throw new Error("NOT IMPLEMENTED — G4 lifecycle scenarios") })`

| AC10 | Comparable measured baseline/after counts and p50/p95, preserving amount, ownership and single-provider-creation invariants | Hybrid | G5: `node scripts/test-checkout-guard-db.mjs --workload`; actual G1/G4 client observations; task artifact `checkout-access-guard-workload_15-11-26.json` | B |
| AC1-AC10 regression | Full tests, lint/typecheck and production build | Fully-Automated | G6: `npm.cmd test`, then `npm.cmd run check`, then `npm.cmd run build` | B |

Failing stub: regression gates reuse existing meaningful assertions plus the new behavioral scenarios; no synthetic always-failing regression test should be committed.

| Quality fallback | App/scripts lint and types when broad lint fails solely on unrelated harness files | Fully-Automated | G7: `npx.cmd eslint src scripts --max-warnings=0`, then `npm.cmd run typecheck` | B |
| AC1, AC2, AC3 presentation | Local browser 390px/1280px, anonymous dismiss/Escape, signed-in/outage/blocked states using controlled local fixtures | Agent-Probe | G8 browser assertions and screenshot evidence; no production login/payment required | B |
| Risk handoff | Actual independent review and complete evidence pack | Hybrid | G9: `node .claude/skills/vc-risk-evidence-pack/scripts/validate-risk-artifacts.mjs process/general-plans/active/checkout-access-guard_14-11-26/harness`; independent reviewer decision required | B |

gap-resolution legend: A proven now; B tests/evidence added by this plan; C named later plan; D named residual requiring keep-active. These rows describe developed coverage; execution and independent EVL must run the new gates. Missing G2/G5 execution cannot be reported as achieved AC3-7/AC10.

Legacy line form:
- Auth: Fully-automated: G1 command above.
- Account policy: hybrid: G2 command above + isolated real PostgreSQL.
- API/payment: Fully-automated: G3 command above.
- Client lifecycle: Fully-automated: G4 command above.
- Measurement: hybrid: G5 command above + baseline/after artifact.
- Regression: Fully-automated: G6; conditional scoped fallback G7 with broad failure recorded.
- Presentation: agent-probe: G8 controlled local scenarios.
- Risk review: hybrid: G9 + independent review.

Dimension findings:
- Infra fit: PASS — standalone PostgreSQL needs only auth bootstrap/roles/pgcrypto; Docker unavailable; embedded Windows/x64 fallback documented, actual runtime gate remains mandatory.
- Test coverage: PASS — new auth/DB/concurrency/visibility gates are explicit; no mock replaces real DB evidence; G5 baseline captured before edits.
- Breaking changes: PASS — success HTTP shape unchanged, additive 429, v4 and revoked legacy RPC require flag-closed coordinated rollout; missing v4 fails closed.
- Security surface: PASS — service-only state/RPC, owner-checked replay and provider lock order retained; issued-after-expiry gap corrected and regression required.
- Auth feasibility: PASS — existing server AuthView and installed Supabase missing-session error/type guards are present.
- SQL feasibility: PASS — existing v3 and prepare lifecycle are available; normal denial commits; owner v4 can invoke revoked v3; actual role/concurrency proof required by G2.
- Client feasibility: PASS — existing dialog and polling tests can be extended; post-JSON disposed checks and transition-pending guards required.

Open gaps: none preventing local implementation. External release evidence remains outside this plan: production migration smoke, hosted Supabase environment parity, live Google/provider flow and production throughput. G8 scenarios without controlled fixture/browser proof must be explicitly unmet and retained in active/testing; do not manufacture screenshots or user confirmation.

What This Coverage Does NOT Prove:
- G1/G3/G4 use controlled application boundaries and cannot prove live OAuth/provider availability or hosted database isolation.
- G2 proves actual PostgreSQL behavior under the runner's bootstrap, not complete hosted Supabase configuration or deployment ordering.
- G5 proves measured local workloads only, not production capacity, provider throughput or guaranteed latency.
- G6/G7 prove static/build/regression compatibility, not visual fidelity, storage persistence or external service delivery.
- G8 proves only scenarios actually observed; inaccessible controlled states remain explicitly unverified.
- G9 validates evidence schema and independent recorded review; schema validity alone does not prove correctness.

Gate: PASS (plan corrected; required implementation evidence remains to be produced).
Accepted by: session — user's explicit instruction “thực hiện spec này”; local implementation scope only, no external release approval.

## Autonomous Goal Block

```text
/goal Implement checkout-access-guard SPEC according to this selected plan.
Reference for latest state: process/general-plans/active/checkout-access-guard_14-11-26/checkout-access-guard_PLAN_15-11-26.md
Requirements: sibling checkout-access-guard_SPEC_14-11-26.md; preserve payment correctness and conservative strike evidence.
Scope: listed source/tests/migration/scripts and colocated artifacts only.
Execution consent: user explicitly requested implementing this SPEC; reversible local work authorized.
Verification: run G1-G9; independent tester confirms; real PostgreSQL G2 and actual G5 measurements mandatory.
Limits: no deployment, production DB mutation, real charge or credential disclosure.
Completion: report actual achieved criteria, residuals and independent review; keep active/testing if proof is missing.
Next: sequential implementer, then independent tester/reviewer; orchestrator owns results.tsv.
```

## Resume and Execution Handoff

- Selected plan file: `process/general-plans/active/checkout-access-guard_14-11-26/checkout-access-guard_PLAN_15-11-26.md`.
- Last completed phase: PLAN; source unchanged by planner. Locked SPEC remains intact.
- Validate-contract status: pending; mandatory before implementation.
- Supporting context: all-context, planning/all-planning, tests/all-tests, uxui/all-uxui and component-contracts; research/source findings above.
- Next step: validator checks account/order/provider lock order, committed denial semantics, permissions, historical exclusion, real DB gate feasibility and test matrix, then writes exact runnable gate contract. Execute agent receives this exact plan, not an inferred ambient plan. User authorized implementation; orchestrator handles transitions within that authorization.
- Report destination: `checkout-access-guard_REPORT_15-11-26.md` in this folder. Existing results.tsv belongs to orchestrator and must not be overwritten.

## Strategy Comparison and Next State

Seven signals: S1=0 (one package), S2=1 (schema/auth/API), S3=0 (one chosen extension), S4=0 (one plan), S5=0, S6=1 (high risk), S7=1 (>5 files); score 3/7. Sequential: one planner/validator/implementer/tester per dependent stage, lowest edit conflict. Parallel subagents: four validation dimensions plus section checks, useful independent read-only validation. Workflow: deterministic sequencing feasible but no special runtime needed. Agent team: unnecessary shared execution overhead for one coherent policy. Recommend one authoritative implementer after validation, with independent validation/review as required; ≤10 expected agent turns before fixes, no >30 cost guard. Preserve parent/default model selection.

Plan complete. Next valid state: VALIDATE this exact plan; do not implement in PLAN mode.

---
name: report:ticket-order-survey-evl-001
description: EVL confirmation run by an independent vc-tester for the ticket order survey change; no regressions.
date: 18-11-26
phase: EVL
loop_status: HALTED_SUCCESS
---

# EVL cycle 1

Selected plan: `ticket-order-survey_PLAN_17-11-26.md`. Run by a spawned `vc-tester` (sonnet) from PowerShell on an otherwise quiet machine, after phases E0 and P1-P6 were executed sequentially.

Result: no regressions. Passing: G1.1 (90 tests), G2.1 isolated PostgreSQL runner (11 migrations, both SQL files and sentinels), G2.2 drift (3 tests), Red-proofs A, B and C each exit 1 on a scratchpad copy, G3.2 (78 tests), G3.3 candidate benchmark, G4.1 (18 tests), G5.1 (37 tests), GJ.1 `npm test` (349 of 350 pass; the single failure is the known pre-existing `route-client.test.ts` secure-cookie test), GJ.2 lint equals baseline (461 problems, all outside `src/`; scoped lint clean), GJ.3 typecheck, GJ.5 build (exit 1 on the Next.js 16.4.3 advisory then exit 0 on retry), ingress probe (500 requests, all 403, 0 errors), GJ.6 untouched areas, GJ.7 doc greps, plan/routing/context/protocol validators.

Authoritative candidate benchmark (this run): p50 77.538 ms against baseline 76.157 ms (+1.381 ms, limit 10), serial RPC {"2":50}, survey RPC {"1":50}, survey started before PayOS finished in 50 of 50, 0 failures. The author's own candidate capture (p50 77.207 ms) is kept in the session scratchpad because the plan command overwrote the candidate JSON.

Pre-existing (not caused by this change): `validate-context-discovery`, `validate-skills`, `validate-guide-sync` exit 1 at HEAD as well as now.

Pending, not failed: GJ.8 risk-pack validator (waits for the independent review decision), GJ.10 owner manual probe on a Sheet copy. Not re-run by the tester: G3.1 baseline capture (author file used, hash recorded) and G4.2 browser widths (four screenshots exist).

Observation: an unrelated `next dev` process appeared on port 3000 after the last gate; it was not started by the tester and was left running. No production operation was performed.

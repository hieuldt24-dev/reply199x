---
name: report:ticket-order-survey-evl-002
description: EVL cycle 2 for the ticket order survey change after the review fix cycle; all runnable gates pass, no regressions.
date: 18-11-26
phase: EVL
loop_status: HALTED_SUCCESS
---

# EVL cycle 2

Selected plan: `ticket-order-survey_PLAN_17-11-26.md`. Trigger: the independent review (`vc-code-reviewer`, verdict `approved-with-concerns`, no Blocker or High) led to a fix cycle: code by `vc-execute-agent` (M3 old-baseline hash test now CRLF-normalizing and archive-tolerant; L6 `aria-invalid` replaced by `data-invalid` on the survey fieldset plus its CSS selector) and docs (M1 production state reconciled, M2 detection query, M4 and M5 pre-checkout preconditions, L1-L3 runbook notes, L4/L5/L7 report notes). The reviewer's verdict was transcribed verbatim by a non-author agent into `harness/review-decision.json`.

Independent re-run by a spawned `vc-tester` from PowerShell on a quiet machine, port 3000 free: no regressions. Passing: G1.1 (90), G2.1 isolated PostgreSQL runner, G2.2 drift (3), Red-proofs A, B and C each exit 1 on a scratchpad copy, G3.2 (78), G3.3 candidate benchmark (p50 74.239 ms against baseline 76.157 ms, delta -1.918 ms, limit +10; serial RPC {"2":50}, survey RPC {"1":50}, survey started before PayOS finished 50 of 50, 0 failures; always-on old-baseline hash test green), G4.1 (18), G5.1 (37), GJ.1 `npm test` (349 of 350, only the known `route-client.test.ts` secure-cookie failure), GJ.2 lint equals baseline (461 problems all outside `src/`, scoped lint clean), GJ.3 typecheck, GJ.5 build (exit 1 on the Next.js 16.4.3 advisory, exit 0 on retry), GJ.6 untouched areas, GJ.7 doc greps, GJ.8 risk-pack validator exit 0 with all 5 artifacts, GJ.9 validators, ingress probe (500 requests, all 403, 0 errors).

Untouched: old baseline sha256 `da3ca2c7...877e`, `survey.ts` sha256 `1da21f7d...b2bc`, no diff in migrations other than the new one, payments, internal. The new migration has no drop, alter or replace of the protected functions.

Pre-existing, not caused by this change: `route-client.test.ts` secure-cookie failure, 461 lint problems under `.agents/.claude/.codex`, `validate-context-discovery`, `validate-skills`, `validate-guide-sync` (fail at HEAD too).

Pending: GJ.10 owner manual probe on a Sheet copy (AC15 stays CONDITIONAL). Not re-run: G3.1 baseline capture and G4.2 browser widths (author evidence used). Tester note M1: the tester read an outdated doc state; the orchestrator re-checked and `all-context.md` and the runbook now both record migration `202611170001` as applied to production per the owner's check on 2026-11-18.

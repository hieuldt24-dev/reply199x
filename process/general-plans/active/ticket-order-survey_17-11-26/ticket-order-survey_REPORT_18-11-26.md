---
name: report:ticket-order-survey
description: "Execution and UPDATE PROCESS closeout report for the ticket order survey plan (E0, P1-P6, EVL 1-2, review, fix cycle): final summary, closeout packet, owner action list, decisions still open, evidence and known gaps."
date: 18-11-26
metadata:
  node_type: memory
  type: report
  feature: general
  phase: UPDATE-PROCESS
---

# Ticket order survey: EXECUTE report and closeout

phase: UPDATE PROCESS (closes E0, P1-P6, EVL cycles 1-2, independent review, fix cycle)
status: COMPLETE_WITH_GAPS
plan: `process/general-plans/active/ticket-order-survey_17-11-26/ticket-order-survey_PLAN_17-11-26.md`

## Final summary (UPDATE PROCESS, 2026-11-18)

**BLUF:** The survey feature is built and every locally runnable gate is green, but nothing is live and AC15 is still CONDITIONAL. The plan stays in `active/` (`Keep in active/testing`) until the owner runs the Sheet-copy probe (GJ.10) and the rollout. Nothing is committed, no migration is applied to a hosted database, `.env` is untouched and checkout is OFF.

- **Verified (local only, independent vc-tester, EVL cycle 2):** all runnable gates pass with no regressions; `npm test` 349 of 350 (the one failure is the known `route-client.test.ts`); lint equals the recorded baseline; typecheck clean; build exit 1 on the Next.js advisory then 0; isolated PostgreSQL runner and Red-proofs A/B/C; benchmark p50 74.239 ms vs baseline 76.157 ms (limit +10 ms); risk pack validator exit 0 with 5 artifacts. Review: approved-with-concerns, no Blocker or High; fix cycle applied.
- **Not proven:** the real 17-column Sheet write (GJ.10, AC15), migration `202611170003` on a hosted DB, PostgREST array argument (K.2), hosted latency of the 1500 ms join (K.1), live PayOS, G3.1 re-capture and G4.2 browser re-run (not re-run).
- **Links:** closeout packet = section "UPDATE PROCESS closeout packet" at the end of this file; owner action list = section "Owner action list (in order)" right after it; evidence = `harness/verification.json`, `ticket-order-survey-evl-iteration-002_REPORT_18-11-26.md`, runbook `ticket-order-survey_REF_17-11-26.md`; backlog = `process/general-plans/backlog/ticket-order-survey-followups_17-11-26/ticket-order-survey-followups_NOTE_17-11-26.md`.
- **Decisions the owner must still make:**
  1. Consent and retention text for survey answers sent to the third-party Sheet (needed before checkout is enabled; a notice text must be added to the form).
  2. A scheduler or a documented manual routine that calls `POST /api/internal/sheets-sync`, plus someone watching failed outbox rows (the repo has no scheduler, no retry cap, no alert).
  3. Whether to keep the extra row added to `process/context/uxui/component-contracts.md` (the independent reviewer says keep; it is listed in the plan Touchpoints).

> The sections below were written during EXECUTE (P6) and are kept as the evidence trail. Where they say a gate is "pending", the EVL reports and `harness/verification.json` hold the final result.

**BLUF:** E0 and P1-P5 are implemented in the working tree (uncommitted); P6 docs and evidence files are written. Nothing is VERIFIED yet: the final gates GJ.1-GJ.9 and the independent review are still to run (vc-tester and vc-code-reviewer, spawned by the orchestrator). Not applied or proven: migration `202611170003` on any hosted database, a real 17-column Sheet write (AC15), hosted latency, live PayOS. Plan stays in `active/`; `mustStopBeforeFinalize` and `humanApprovalRequired` stay `true`.

## What Was Done

| Phase | Result (source: files on disk and the orchestrator's verified state) |
|---|---|
| E0 | `harness/risk-gate.json` (high risk, 5 classes, both stop flags true). |
| P1 | `src/lib/ticket-orders/survey.ts` (+ `survey.test.ts`) shared contract and `validation.ts` allowlist/`parseSurvey`; contract FROZEN with `survey.ts` sha256 `1da21f7d8380a2a65ea3b4c7df69cc15d782eda043066c1a90f57a6374e1b2bc` (re-checked by docs at P6 time: unchanged). Baseline recorded in `ticket-order-survey-lint-baseline_REF_17-11-26.md`. |
| P2 | Migration `supabase/migrations/202611170003_ticket_order_survey.sql` (table, helper, upsert, get, requeue, RLS, service_role-only grants); `supabase/tests/ticket-order-survey.sql`; sentinel appended to `checkout-access-guard.sql`; runner `scripts/test-checkout-guard-db.mjs` now runs every `supabase/tests/*.sql` with tripwire list, sentinels, default-privileges bootstrap before 170003 and `CHECKOUT_GUARD_ARTIFACTS_DIR`; `survey-migration-drift.test.ts`. |
| P3 | `route.ts`: survey save started in parallel with PayOS, joined with a 1500 ms cap (timer cleared in `finally`), clean log `ticket_survey_save_failed {reason, code}`, 9-key `create_ticket_order_v5` call unchanged; `route.test.ts`; benchmark `route.performance.test.ts` with new fixture; new baseline and candidate JSON in the task folder. |
| P4 | `TicketSurveyFields.tsx` and `TicketRequestDialog.tsx` (3 groups, per-group Vietnamese errors, no fetch while invalid, Q6 sorted before fingerprint, reset); CSS in `globals.css`; dialog tests; four screenshots `survey-form-{360,390,768,1280}.png` in the task folder. |
| P5 | `paid-orders.ts` (A:Q, 17 columns, order id at index 13, update `A{n}:Q{n}`, survey as separate parameter), `outbox-worker.ts` (per-order survey read before upsert, `survey_read_failed`), and their tests. |
| P6 (this pass) | README and env example (range wording A:Q), runbook REF, context docs (`all-context.md`, `tests/all-tests.md`, `uxui/component-contracts.md`), this REPORT, backlog NOTE, harness files `context-snippets.json`, `verification.json`, `adversarial-validation.json`. |

Benchmark evidence on disk (mocked RPC 15 ms, PayOS 30 ms, 50 samples, same fixture and vector digest in both files):

| Mode | p50 ms | p95 ms | failures | serial RPCs | survey RPC | survey started before PayOS end |
|---|---|---|---|---|---|---|
| baseline (route unmodified) | 76.157 | 78.522 | 0 | `{"2":50}` | `{"0":50}` | n/a |
| candidate (route modified) | 77.207 | 91.121 | 0 | `{"2":50}` | `{"1":50}` | `{"true":50}` |

p50 delta 1.05 ms (limit 10 ms). These files are the authors' capture; the vc-tester candidate run at EVL is the authoritative one. Handler-only measurement, not hosted latency. The old checkout-performance baseline is pinned by sha256 `da3ca2c76765ce6315fb3bc03dc9d75821a8a7027164e662e515fa2fbd17877e` in the always-on test; `git ls-files --eol` for that file reports `i/lf w/lf` (index and working tree both LF). No `_BASELINE_R2` file exists, so no re-capture happened.

Baseline before edits (from the lint REF): `npm.cmd test` exit 1 (24 files, 236 tests, 1 pre-existing failure in `route-client.test.ts`); lint exit 1 with 461 problems in 118 files, none under `src/`, `scripts/` or `supabase/`; typecheck exit 0; build exit 1 on the first run (Next 16.4.3 advisory after successful compile) and exit 0 on retry.

## What Was Skipped or Deferred

- Final gates GJ.1-GJ.9, the independent review and the Red-proof A/B/C confirmation are not part of this docs pass; Red-proof A/B/C results are recorded by the P2 agent and must be re-confirmed through the EVL runner run, not copied here.
- AC15 (real 17-column write) and GJ.10: owner-run on a Sheet copy; CONDITIONAL.
- `review-decision.json` deliberately not written (transcribed by a non-author agent after the read-only reviewer returns).

## Test Gate Outcomes

| Gate | Status at the end of P6 |
|---|---|
| G1.1-G5.1 phase gates | Reported green by the phase agents to the orchestrator; NOT re-run by the docs agent. Independent re-run pending (EVL). |
| GJ.1-GJ.6 | Pending vc-tester. |
| GJ.7 recorded grep | Done by docs: no occurrence of the previous 14-column range string in README or the env example file; A:Q present in both; README names the race and the requeue function. |
| GJ.8 | Pending; the P6 validator run expects exit 1 with only `review-decision.json` missing (see `harness/verification.json` and the output recorded below). |
| GJ.9 | Docs ran what is safe sequentially: plan artifact validator exit 0 (0 failures); `discover-context.mjs --check-routing` exit 0; `validate-all-context.mjs` exit 0 (0 warnings on the final run); `validate-protocol-discovery.mjs` exit 0; `validate-context-discovery.mjs` exit 1 with environment failures that also name files this task did not edit (see `verification.json`). `git diff --check` exit 0 (only CRLF notices). |
| GJ.10 | CONDITIONAL until the owner runs it. |

## Plan Deviations

1. **Sequential execution instead of an agent team.** The plan and validate-contract chose an agent team; the TeamCreate/TaskCreate tools were unavailable in this environment, so the orchestrator ran the phases sequentially with spawned agents. No scope change; the disjoint-ownership and no-typecheck-during-parallel rules became moot.
2. **GJ.7 vs the "A:N is rejected" note.** The orchestrator asked README/env example to note that the old range is rejected, while GJ.7 requires the old range string to be absent from both files. The wording says "the previous 14-column range" without the literal string, satisfying both. Runbook REF and context docs may name it.
3. **Report date.** Files use 18-11-26 (execution date), not 17-11-26 as in the plan's file list.
4. **Component contracts.** `component-contracts.md` got one row (plan P6 lists it; the spawn scope omitted it).
5. Accepted deviations recorded elsewhere in the plan are unchanged (drift test owned by P2).

## Test Infra Gaps Found

See the backlog NOTE: K.1, K.2, AC15, AC20 detection, scheduler/retry cap, no test of README/env wording, no SQL test for the `202611170002` trigger, pre-existing failing test and lint baseline. `validate-context-discovery.mjs` fails on this Windows checkout because `.agents/skills` is not a link to `.claude/skills` (known compatibility note in `all-context.md`) and because it compares path separators when checking that docs are indexed.

## Closeout Packet

- Plan: `process/general-plans/active/ticket-order-survey_17-11-26/ticket-order-survey_PLAN_17-11-26.md`.
- Finished: E0, P1-P6 files. Verified by docs: validators above, hash unchanged. Unverified: all GJ.1-GJ.9 independent runs, review, hosted/production behavior.
- Remaining: vc-code-reviewer (read-only) then non-author transcription of `harness/review-decision.json`; vc-tester EVL; owner actions; UPDATE PROCESS.
- Classification: `Keep in active/testing`.
- Owner actions (agents never do these): apply migration `202611170003` and run the grant checks; edit local `.env` to the A:Q range; deploy order per runbook; Sheet-copy probe (AC15); restore env; enable checkout; handle pre-cutover 14-column rows; decide consent/retention, "Other", backfill; decide commit/archive; separately approve any Next.js upgrade.

CONTEXT_PARTIAL: none beyond the unverified items above.

Follow-up stub paths created: `process/general-plans/backlog/ticket-order-survey-followups_17-11-26/ticket-order-survey-followups_NOTE_17-11-26.md`.

## Forward Preview

- **Test Infra Found:** runner tripwire/sentinel mechanism; benchmark with by-name RPC counts; old-baseline sha256 test.
- **Blast Radius Changes:** none beyond the plan's table.
- **Commands to Stay Green:** (PowerShell) `npm.cmd test`; `npx.cmd vitest run src/lib/ticket-orders src/app/api/ticket-orders src/lib/ticket-registration`; `node scripts/test-checkout-guard-db.mjs`; `npm.cmd run typecheck`; `npm.cmd run build` (exit 1 then 0).
- **Dependency Changes:** none.

## Independent review and EVL fix cycle 1 (notes added 2026-11-18)

- Independent review verdict: approved-with-concerns (no Blocker, no High). The concerns below were applied to docs in EVL fix cycle 1.
- `uxui/component-contracts.md` row is kept: it is listed in the plan Touchpoints.
- M1: production state corrected. `create_ticket_order_v5` (migration `202611170001`) IS applied to production per the owner's read-only check on 2026-11-18 (v4 true, v5 true; v5 grants: service_role true, anon false, authenticated false). Migration `202611170003` is NOT applied. Live PayOS behavior, hosted latency and authenticated production capacity remain unverified. The runbook now has a read-only `to_regprocedure` pre-check for v5.
- M2 known gap (added to the backlog NOTE): a paid order created after the cutover can have NO `ticket_order_survey` row (survey save failed or timed out). Its answers were never stored and are UNRECOVERABLE; `requeue_synced_sheet_sync_for_survey` cannot help. A read-only detection query is in the runbook (section 4a); README race note now covers both cases (survey row exists but Sheet blank; paid order with no survey row).
- M4/M5: the runbook step that enables checkout now lists as explicit preconditions (a) consent/retention decided and a notice text added to the form, (b) a scheduler or documented manual routine calling `/api/internal/sheets-sync` plus someone watching failed outbox rows.
- L1-L3 added to the runbook: requeue re-syncs the whole A:Q row and overwrites hand edits; migration `202611170003` is not re-runnable; `notify pgrst, 'reload schema';` fallback for `PGRST202`.
- L4: the CANDIDATE JSON is overwritten on every candidate run. The authoritative EVL run was p50 77.538 ms (+1.381 ms vs baseline). The author capture quoted above (p50 77.207 ms, delta 1.05 ms) was kept only in the temporary session scratchpad, not in the committed task folder.
- L5: do not commit `.claude/hooks/.logs/hook-log.jsonl` (it shows as modified in the working tree).
- L7: a same-key retry with different answers overwrites the survey while the order is still pending (small window after payment); accepted as an AC20-class gap.
- M3 (test hash normalization) and L6 (`data-invalid`): being applied by a separate code agent; pending verification by the tester. Not claimed as applied here.

## Evidence-pack validator output (P6 run)

Command: `node .claude/skills/vc-risk-evidence-pack/scripts/validate-risk-artifacts.mjs process/general-plans/active/ticket-order-survey_17-11-26/harness/`
Exit code 1 (expected). Output: warnings `[]`; failures `["review-decision.json missing or invalid JSON object"]` (the only failure).

Superseded by the final run (EVL cycle 2 and UPDATE PROCESS, 2026-11-18): the same command now exits 0 with `warnings: []` and `failures: []` after `review-decision.json` was written by a non-author agent and `verification.json` was updated with the final gate results.

## UPDATE PROCESS closeout packet

1. **Selected plan path:** `process/general-plans/active/ticket-order-survey_17-11-26/ticket-order-survey_PLAN_17-11-26.md` (task folder `process/general-plans/active/ticket-order-survey_17-11-26/`).
2. **Closeout classification:** Keep in active/testing.
3. **What was finished:** E0 risk gate; P1 shared survey contract (frozen, `survey.ts` sha256 `1da21f7d...b2bc`, unchanged); P2 migration `202611170003`, SQL tests, runner hardening, drift test; P3 route with parallel survey save and 1500 ms join, route tests, benchmark baseline and candidate; P4 form and CSS, dialog tests, four screenshots; P5 A:Q Sheet adapter and worker survey read; P6 docs, runbook, context, backlog NOTE, harness (5 files); PVL cycles 1-2 (Gate: PASS); EVL cycles 1-2 (independent vc-tester); independent review (approved-with-concerns); fix cycle (M3, L6 code; M1, M2, M4, M5, L1-L3 docs); UPDATE PROCESS (state, verification.json, context check).
4. **Verified vs unverified:** Verified locally (see Final summary and `harness/verification.json`). Unverified: GJ.10 and AC15, hosted migration, PostgREST array argument (K.2), hosted 1500 ms join (K.1), live PayOS, G3.1 re-capture, G4.2 re-run, AC20 detection, paid orders with no survey row (unrecoverable), scheduler/retry cap, consent/retention.
4b. **Validate-contract compliance:** VALIDATE was run; `## Validate Contract` is inline in the plan, `Gate: PASS` (PVL cycle 2, `generated-by: outer-pvl`).
5. **Cleanup done vs still needed:** Done: plan status and Current Execution State updated, REPORT summary, `harness/verification.json` updated, context docs checked and gaps added, backlog NOTE present, validators run. Still needed: owner actions below; commit; later archival of the task folder; the old `ticket-checkout-performance_17-11-26` task folder must stay (the survey tests read its immutable baseline).
6. **Single best next valid state:** Keep the plan active and continue validation on the same selected plan (owner runs GJ.10 and the rollout in the order below).
7. **Commit-checkpoint recommendation:** Execution and process changes are both present and one commit was requested: ONE conventional commit directly on `main` when the user asks, for example `feat: add ticket order survey (form, route, migration 202611170003, A:Q sheet)`, ending with the Co-Authored-By line. Include by explicit path (not `git add -A`): the env example file at the repo root, `README.md`, `scripts/test-checkout-guard-db.mjs`; under `src/app/(routes)/_components/`: `TicketRequestDialog.tsx`, `TicketRequestDialog.test.tsx`, `TicketSurveyFields.tsx`; under `src/app/api/ticket-orders/`: `route.ts`, `route.test.ts`, `route.performance.test.ts`; under `src/lib/ticket-orders/`: `validation.ts`, `validation.test.ts`, `survey.ts`, `survey.test.ts`, `survey-migration-drift.test.ts`; under `src/lib/ticket-registration/`: `outbox-worker.ts`, `outbox-worker.test.ts`, `paid-orders.ts`, `paid-orders.test.ts`; `src/styles/globals.css`; `supabase/migrations/202611170003_ticket_order_survey.sql`, `supabase/tests/checkout-access-guard.sql`, `supabase/tests/ticket-order-survey.sql`; `process/context/all-context.md`, `process/context/tests/all-tests.md`, `process/context/uxui/component-contracts.md`; the whole `process/general-plans/active/ticket-order-survey_17-11-26/` folder and `process/general-plans/backlog/ticket-order-survey-followups_17-11-26/`. EXCLUDE `.claude/hooks/.logs/hook-log.jsonl` (runtime log, review note L5). A split into an execution commit then a process commit is also valid if the owner prefers.
8. **Regression status:** not a phase program. EVL cycle 2 re-ran the touched and adjacent surfaces (route, payments, internal, Sheets, runner, benchmark, ingress probe): no regressions; failures present at HEAD (`route-client.test.ts`, lint 461 outside `src/`, `validate-context-discovery`, `validate-skills`, `validate-guide-sync`) are pre-existing.
9. **SPEC achievement (Revision 3, 20 AC):**

| AC | Score | Basis |
|---|---|---|
| AC1-AC4 | met | G4.1 (18) and G1.1 (90) green |
| AC5, AC6 | met | G3.2 (78) green |
| AC7 | met (mechanism) | G3.2 + G3.3 green; residual K.1: real serverless behavior after the response and hosted latency unproven |
| AC8 | met | GJ.6 untouched-areas gate and existing tests green |
| AC9, AC10 | met | G2.1 runner, G2.2 drift, Red-proofs A/B/C |
| AC11-AC13 | met | G5.1 (37) green |
| AC14 | met | G5.1 plus the recorded GJ.7 grep (not an automated test) |
| AC15 | UNMET | Agent-Probe only; GJ.10 owner probe not run. Residual strategy: owner probe on a Sheet copy; stub: automated Sheets integration test (backlog NOTE, row AC15) |
| AC16 | met | G3.3 candidate p50 delta -1.918 ms, always-on baseline hash test green |
| AC17 | met | GJ.1-GJ.5 equal to the recorded baseline |
| AC18 | met | GJ.8 exit 0 (5 artifacts) and independent review approved-with-concerns |
| AC19 | met | G2.1 SQL P0002 cases plus G3.2 |
| AC20 | met for the automated parts; residual gaps | Requeue function covered by SQL and worker/README checks; automatic detection of the late-survey race and the paid-order-with-no-survey-row case (AC20b, unrecoverable) are known gaps with backlog stubs |

Unmet criteria and residuals each have a row in the backlog NOTE. Known-Gap is not treated as met: the AC15 residual forces the archival classification above.

**Drift score: HIGH (6 signals: 20+ files touched = 2, README.md changed = 1, 3+ memory-worthy observations = 1, new task folder and backlog NOTE = 1, execution diverged from the validate-contract (sequential instead of agent team) = 1).**
Strongly recommend UPDATE PROCESS -- harness/protocol files touched. (UPDATE PROCESS has now been run for this task; no `.claude/` harness file was edited, so no `vc-audit-vc` run is required.)

## Owner action list (in order)

Agents never do these. Details and SQL are in the runbook `ticket-order-survey_REF_17-11-26.md` (sections 1-6).

1. Decide consent and retention for survey data and add a notice text to the form (code change, before deploy). Decide the scheduler or manual sync routine and who watches failed outbox rows (both are preconditions for step 11).
2. Commit when ready (one commit on `main`, see item 7 of the packet; exclude `.claude/hooks/.logs/hook-log.jsonl`).
3. Keep checkout OFF. Back up the real Google Sheet and make a copy with a `Registrations` tab in the A:Q layout, shared with the service account.
4. Run the read-only pre-check (runbook 1a, including the `to_regprocedure` check for v5), then apply migration `202611170003` ONCE in the Supabase SQL Editor.
5. Run the verification queries (runbook section 2) and confirm the four survey functions are service_role-only and the table is not granted to anon/authenticated. If PostgREST reports `PGRST202`, use the schema-reload fallback in the runbook.
6. Set `GOOGLE_SHEETS_PAID_ORDERS_RANGE=Registrations!A:Q` in the deployed environment and deploy in ONE step; also edit the local env file (it still holds the previous range). Until the new app is live, nobody calls `/api/internal/sheets-sync` or `enqueue_paid_ticket_sheet_sync` (the old app would append 14 columns into the 17-column Sheet).
7. Run the Sheet-copy probe (GJ.10, AC15; runbook section 4): point `GOOGLE_SHEETS_SPREADSHEET_ID` at the copy, create one real test order, call the sync endpoint, check 17 columns (G source, H area, M attendance, N order ID). Record the observation with its date; this also exercises K.2.
8. Restore `GOOGLE_SHEETS_SPREADSHEET_ID` to the real Sheet and redeploy with checkout OFF; check the worker writes the right rows. Reconcile paid orders created during the probe window (requeue function only for orders that have a survey).
9. Handle the pre-cutover 14-column rows in the real Sheet by hand (re-lay out or remove them); do NOT requeue or enqueue them, or a re-sync appends duplicate rows.
10. Optional: run the read-only query for paid orders with no survey row (runbook 4a) and decide on buyer follow-up for any hits.
11. Set `PAYOS_CHECKOUT_ENABLED=true` and deploy, only after steps 1-9 are done.
12. After AC15 is observed and the rollout is stable, archive the plan: `git mv process/general-plans/active/ticket-order-survey_17-11-26 process/general-plans/completed/ticket-order-survey_17-11-26` (keep `ticket-checkout-performance_17-11-26` in place unless the survey baseline path is updated first). Any Next.js upgrade is a separate approved task.

Unverified in this closeout: everything listed under item 4 as unverified. No production operation was performed by any agent.

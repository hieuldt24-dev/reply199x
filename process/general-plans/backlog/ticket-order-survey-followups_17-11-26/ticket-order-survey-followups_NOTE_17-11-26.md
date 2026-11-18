---
name: note:ticket-order-survey-followups
description: "Backlog stubs for the known gaps left by the ticket order survey task (K.1, K.2, AC15, AC20 race, scheduler/retry cap, consent and retention questions)."
date: 18-11-26
feature: general
metadata:
  node_type: memory
  type: note
---

# Ticket order survey: follow-ups (backlog)

Source plan: `process/general-plans/active/ticket-order-survey_17-11-26/ticket-order-survey_PLAN_17-11-26.md`. Each gap below keeps its gate CONDITIONAL; none counts as PASS (vacuous-green ban). These are stubs, not scheduled work.

## Test-building and handling stubs

| ID | Gap | Stub | Gate kept CONDITIONAL |
|---|---|---|---|
| K.1 | 1500 ms survey join not measured on hosted infrastructure; live PayOS, migration on a hosted DB and a production Sheet write never exercised; serverless behavior after the response unverified | Measure on a non-production hosted environment with owner approval (`needs-live-provider` class: explicit opt-in required) | AC6/AC7 edge, AC18 edge |
| K.2 | PostgREST passing a JS array to the `text[]` RPC argument is confirmed only by documentation; route tests mock the RPC | Integration test against a real non-production Supabase/PostgREST (no production identity) | AC5/AC10 edge |
| AC15 | Real 17-column Sheet write only observable by the owner probe (GJ.10 in the runbook REF) | Automated Sheets integration test against a Sheet copy with a non-production identity | AC15 |
| AC20 | Survey saved after its order synced is not detected automatically; only `requeue_synced_sheet_sync_for_survey` fixes it by hand | Reconciliation job: find outbox rows `synced` whose order has a survey row but blank G/H/M, then call the requeue function | AC20 |
| AC20b | A paid order created after the cutover with NO `ticket_order_survey` row (save failed or timed out): answers never stored, UNRECOVERABLE; the requeue function cannot help | Read-only detection query is in the runbook (section 4a); optional reconciliation report and buyer follow-up | AC20 |
| Ops | No scheduler calls `/api/internal/sheets-sync`; no outbox retry cap or alerting (pre-existing) | Scheduler + retry limit + alert | operations |
| Docs | No automated test reads the env example file or README range wording (GJ.7 is a recorded grep) | Optional documentation test | AC14 |
| UI | Pre-existing mobile horizontal scroll in the dialog (poster notch `::after`, `right:-12px`), outside this task | Separate UI fix and re-check at 360/390 px | none |
| Dep | Next.js 16.4.3 advisory (first `npm run build` exits 1, retry exits 0) | Separate user-approved dependency upgrade task | none |
| Test | Pre-existing failing test `src/lib/supabase/route-client.test.ts` (secure cookies in production) and lint baseline of 461 problems outside `src/` | Separate cleanup task | none |
| SQL | No SQL test covers migration `202611170002` trigger | Add SQL assertions | none |

## Open questions for the owner (not tests)

1. Consent and retention for survey answers sent to the third-party Sheet: decide before real ticket sales.
2. Should Q6/Q8 get an "Other" option with free text?
3. Backfill survey answers for orders paid before the cutover (they have blank G/H/M and 14-column rows)?
4. Who cleans or re-lays out the pre-cutover 14-column rows in the real Sheet (see runbook caveats)?

## Owner actions (agents never do these)

Apply migration `202611170003`; run the grant verification queries; edit local `.env` range; set `GOOGLE_SHEETS_PAID_ORDERS_RANGE=Registrations!A:Q` and deploy; run the Sheet-copy probe; restore env; enable checkout; decide commit and archive. Runbook: `process/general-plans/active/ticket-order-survey_17-11-26/ticket-order-survey_REF_17-11-26.md`.

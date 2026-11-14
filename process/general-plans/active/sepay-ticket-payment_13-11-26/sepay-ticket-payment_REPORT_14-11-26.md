---
phase: execute
date: 2026-11-14
status: COMPLETE_WITH_GAPS
feature: sepay-ticket-payment
plan: process/general-plans/active/sepay-ticket-payment_13-11-26/sepay-ticket-payment_PLAN_13-11-26.md
---

## What Was Done

- Added server-only PayOS config, documented create-link HMAC signing, full response signature validation, HTTPS `pay.payos.vn` validation, bounded timeouts, and signed webhook canonicalization in `src/lib/payments/payos/checkout.ts`.
- Added a PayOS payment-link path to the existing authenticated ticket-order endpoint. It uses the order's server-derived total and database allocated positive `orderCode`, returns only a safe checkout URL, and is blocked unless `PAYOS_CHECKOUT_ENABLED=true`. Root `.env` and `.env.example` currently set this flag false. PayOS credentials remain empty placeholders and no secret values were read or printed.
- Added database lease/attempt tracking in migration `202611140006_payos_payment_links.sql`. One request owns the create lease. It checks the provider by stable `orderCode` before creating, and checks again after ambiguous network/5xx outcomes. A timeout followed by a not-found lookup is durably marked for reconciliation; later requests cannot create another link automatically. Stored verified URLs are reused.
- Added isolated PayOS link/event tables and transactional webhook RPC. It validates exact amount, VND, order code, link ID, success state and reference; deduplicates provider references; moves unknown, mismatched, late and non-success signed events to reconciliation; and atomically marks matching pending orders paid and adds one Sheet outbox item. Unknown order codes are stored with a null foreign key and acknowledged after durable reconciliation. Existing SePay migration files and SePay callback route/RPC are unchanged.
- Added `/api/payments/payos/webhook`, provider-aware expiry RPC use, PayOS return/status copy, and a client URL allowlist in the ticket dialog. Return/cancel still only polls persisted state.
- Added PayOS environment entries and `PAYOS_SETUP_REF_14-11-26.md` with setup and rollout gates.
- Added automated coverage for signatures, URL trust, lookup-before-create, ambiguous timeout/no second POST, lease losers, stored URL reuse, signed success/non-success/unknown webhooks, database failure, disabled checkout, and UI navigation.
- Created the required risk evidence pack in `harness/`. The final narrow independent review approved the lock ordering and unknown-order webhook path for continued validation; it did not approve enabling production checkout.
- Completed the paid Sheet outbox delivery slice: migration `202611140007_ticket_sheet_outbox_worker.sql` adds claim leases, stale-lease recovery, completion and exponential retry state; `paid-orders.ts` upserts A:N by stable order ID in K and reconciles ambiguous append responses; the authenticated `/api/internal/sheets-sync` worker drains bounded batches. The worker supports PayOS and retained paid SePay callbacks. The PayOS webhook makes one best-effort immediate drain after durable paid+outbox processing.
- Documented the exact scheduler requirement in `PAYOS_SETUP_REF_14-11-26.md`: configure an HTTPS POST to `/api/internal/sheets-sync` every minute with a 32+ character `SHEETS_SYNC_WORKER_SECRET`. The endpoint does not schedule itself; automatic retry is not active until the scheduler is configured and migration 007 is applied.
- Remediated review findings: the tracked `.env.example` now contains a safe placeholder instead of the exposed value. Treat the previous token as compromised; the owner must rotate it in both application configuration and scheduler secret storage. `.env` was not read or changed. Migration 007 assigns a fresh UUID lease token per claim and requires it for completion/failure, preventing stale workers from changing reclaimed rows. Added a stale-token test and adversarial evidence entries; independent follow-up review remains pending.
- The tracked worker-secret placeholder is `REPLACE_ME`, shorter than the endpoint's 32-character minimum. The authenticated route test confirms the exact placeholder is rejected.

## Security Review (STRIDE)

- **Spoofing:** PayOS webhooks require canonical HMAC verification; checkout credentials stay server-side. The public webhook still needs deployment-edge rate limiting and public HTTPS configuration.
- **Tampering:** server/database amount and integer orderCode are authoritative; signed response/webhook data, currency, paymentLinkId, reference and result codes are checked before transition.
- **Repudiation:** normalized event reference/status is persisted for dedupe and reconciliation; raw payloads and secrets are not logged or stored.
- **Information disclosure:** browser responses contain only the safe checkout URL and public order summary; webhook errors are generic.
- **Denial of service:** webhook and order bodies are bounded and provider calls have timeouts. Edge rate limiting is a rollout requirement and remains unverified.
- **Elevation of privilege:** order creation/status remain authenticated and owner-scoped; privileged mutations use service-role RPCs. The checkout kill switch is false.

## What Was Skipped or Deferred

- Checkout remains disabled. No PayOS API call or live payment was made; there is no PayOS sandbox.
- Migration 007 was not applied to any database. No local Postgres runner was available, so SQL execution, RLS, transaction rollback, concurrent leases and retained SePay row/callback compatibility remain unverified.
- The user confirmed the A:N Sheet header mapping and reported migration 006 applied. Google credentials/share permissions, migration 007, a deployed scheduler and live Sheet write/retry behavior remain unverified. No Google Sheets API call was made.
- PayOS `expiredAt`, settlement, webhook delivery and late-payment behavior remain unverified. A separate owner-approved live-rail check naming account and amount is required.
- Browser/mobile keyboard probe was not available in this run.
- No follow-up plan stub was created. The accepted Validate Contract identifies these follow-ups: `ticket-postgres-integration-validation`, `ticket-sheet-retry-worker-validation`, and `payos-live-rail-verification`.

## Test Gate Outcomes

- New focused outbox/Sheet/worker/webhook suite: **16 passed across 4 files**, clean exit, including stale-lease fencing.
- Full `npm.cmd test`: **111 passed, 6 failed** at the observed run. Five failures are auth/cookie expectations outside this change; one webhook assertion was corrected afterward and the focused webhook suite then passed. The full run did not return a clean process exit; baseline for unrelated failures was not independently established.
- Focused ESLint over all touched application/test files: **passed with zero warnings**.
- Full `npx.cmd eslint src --max-warnings=0`: **failed** on `src/components/auth/HeaderAuth.tsx` (`react-hooks/set-state-in-effect`, plus two unused-variable warnings), which is outside the PayOS cutover; the baseline was not independently established.
- `npm.cmd run typecheck`: Next route type generation succeeded twice, but `tsc --noEmit` produced no result and the exact low-CPU responding Node process was stopped after more than one minute each time. Typecheck is **inconclusive**, not a pass.
- `npm.cmd run build`: final run after the last source change reported successful compilation, completed its TypeScript stage, generated all 17 pages and printed the route table. The process remained alive without final exit output and was stopped. No clean process exit is claimed.
- Exact command/process observations are recorded in `harness/verification.json`.

## Plan Deviations

- PayOS evidence is stored in dedicated `payos_payment_links` and `payos_payment_events` tables rather than widening the existing SePay-only `payment_transactions` and `payment_events` constraints. This keeps the historical SePay schema and its callback RPC unchanged while providing provider-scoped uniqueness for PayOS order code, link ID and transaction reference. This is an additive implementation-shape deviation and must be reconciled in UPDATE PROCESS before archival.
- Added `PAYOS_CHECKOUT_ENABLED=false` as an explicit default-off kill switch because the accepted contract requires checkout to remain disabled until later operational proof.
- Added a 9-character provider description (`REPLY199X`) because PayOS channel documentation limits descriptions to nine characters for some bank-account configurations; the full order identity stays in the persisted orderCode mapping.

## Test Infra Gaps Found

- No Postgres integration runner, no configured retry scheduler/operator replay, no browser E2E runner, and no PayOS sandbox.
- `npm.cmd test`, ESLint, typecheck, and build each leave their Node process alive after the useful output in this environment. Test/build outputs were captured, but no clean command exit was observed for those runs. Only focused ESLint returned exit code 0.
- Full suite has five auth/cookie expectation failures outside the changed PayOS files; full-source lint has an error outside the PayOS files. Their baseline was not independently established.
- Code review approved the implementation while explicitly keeping production checkout disabled. The required evidence artifacts are under `harness/`.

## Closeout Packet

- Selected plan: `process/general-plans/active/sepay-ticket-payment_13-11-26/sepay-ticket-payment_PLAN_13-11-26.md`.
- Finished: PayOS adapter, server order route contract, signed webhook endpoint, additive persistence, idempotent paid/outbox transition, provider-aware expiry, UI return/status updates, paid Sheet outbox worker/upsert/retry route, tests, names-only env entries and setup reference.
- Verified: new focused outbox/Sheet suite has 15 passing tests and touched-file ESLint passes. Full suite reported 111 passed and 6 failed (one changed webhook assertion was fixed and focused suite passed afterward; five unrelated auth/cookie failures remain). Typecheck and build have no clean terminal result. Database migration/lease behavior, real PayOS, Google writes, configured scheduler and recovery remain unverified.
- CONTEXT_PARTIAL: database-integration — no local Postgres runner.
- CONTEXT_PARTIAL: sheet-retry — worker and A:N mapping exist; migration 007, scheduler, Google permissions and live retry evidence remain unverified.
- CONTEXT_PARTIAL: payos-provider-runtime — no sandbox; live check not authorized.
- Cleanup/context capture remaining: reconcile the separate PayOS tables with plan language, resolve repository-wide test/lint failures, establish a Postgres/Sheet retry validation path, and obtain later provider proof. UPDATE PROCESS must not archive this plan yet.
- Uncommitted worktree includes extensive pre-existing unrelated edits; all were preserved.
- Best next state: **Keep in active/testing**. Code review APPROVE is recorded for the implementation; production checkout remains unapproved until Postgres and scheduler validations are available and the live-rail follow-up is separately approved and completed.

## Forward Preview

### Test Infra Found

No Postgres, browser E2E, or durable Sheet retry runner is available. Full test/lint failures predate and are outside the PayOS files touched here.

### Blast Radius Changes

New PayOS adapter/webhook/migration and environment setup; modified ticket-order API, owner-scoped expiry route and ticket purchase/return UI. SePay history and callback code were preserved.

### Commands to Stay Green

- `npm.cmd test` after the auth/cookie test failures outside the PayOS files are resolved; baseline was not independently established.
- `npx.cmd eslint src --max-warnings=0` after the HeaderAuth lint failure outside the PayOS files is resolved; baseline was not independently established.
- `npm.cmd run typecheck` and `npm.cmd run build` once the command-process stall is resolved and exit codes can be captured.
- Add the approved local/staging Postgres migration/RLS/rollback gate and durable Sheet retry gate before any checkout enablement.

### Dependency Changes

No package dependency added. PayOS uses Node 22 `fetch` and `node:crypto`.

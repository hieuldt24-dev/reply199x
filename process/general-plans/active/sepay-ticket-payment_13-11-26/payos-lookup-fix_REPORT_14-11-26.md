---
phase: payos-lookup-fix
date: 2026-11-14
status: COMPLETE_WITH_GAPS
feature: ticket-payment
plan: process/general-plans/active/sepay-ticket-payment_13-11-26/sepay-ticket-payment_PLAN_13-11-26.md
---

## What Was Done

Corrected the PayOS lookup contract: GET returns signed `id`, amount, orderCode, status, amountPaid, amountRemaining and transactions, rather than POST's currency/paymentLinkId/checkoutUrl. Canonicalization now follows the official Node SDK's sorted transaction-array objects and null/undefined handling. Only a signed, exact pending unpaid link can be returned as a checkout destination; the destination uses a fixed PayOS HTTPS origin and validated hexadecimal id.

The initial `can_create=true` claim sends one POST without the speculative GET. Migration 006 sets creation_attempted with that one-time claim, and subsequent claims only permit lookup/reconciliation. Ambiguous POST outcomes are looked up and never trigger another POST. Unknown business error codes fail closed; no undocumented not-found code was guessed. This was explicitly approved within scope by the orchestrator.

Provider errors now carry safe stage/status/code diagnostics; the route logs only those fields, never provider messages, raw bodies, headers, credentials, attendee data or full exception objects. Reconciliation orders return a specific code and the dialog explains the required operator check while retaining the same idempotency key.

Sources: https://payos.vn/docs/api/ ; https://github.com/payOSHQ/payos-lib-node/blob/main/src/resources/v2/payment-requests/payment-requests.ts ; https://github.com/payOSHQ/payos-lib-node/blob/main/src/utils/convert-obj-to-query-str.ts ; https://github.com/payOSHQ/payos-lib-node/blob/main/src/crypto/node-crypto.ts .

## What Was Skipped or Deferred

No PayOS/Sheets merchant calls, remote DB mutations, credential reads, status resets or replacement orders. Existing reconciliation orders remain unchanged and require PayOS operator verification before any recovery. Exact original provider failure remains unknown because earlier code discarded upstream diagnostics. A missing saved payment_link_id does not prove no provider link exists.

## Test Gate Outcomes

`npm.cmd test -- src/lib/payments/payos/checkout.test.ts src/app/api/ticket-orders/route.test.ts "src/app/(routes)/_components/TicketRequestDialog.test.tsx"`: 24/24 tests passed across 3 files. The first poll returned the result summary while the process was still open; a later session call returned exit code 0. Scoped ESLint across the six changed source/test files exited 0.

Scenario checks: valid signed GET vs POST shapes; tampered/terminal GET rejection; undocumented business code rejection; initial-only POST; ambiguous POST plus GET with no duplicate POST; stale reconciliation order produces no provider calls; UI retains idempotency key. STRIDE review: HMAC and exact amount/identity prevent spoofing/tampering, fixed URL origin prevents untrusted navigation, logs whitelist only status/code/stage, no new public secret or privilege surface. Residual operational risks remain provider availability, real signature compatibility and manual recovery.

## Plan Deviations

Removed speculative GET before the one-time initial POST, approved by orchestrator as an implementation correction within the existing provider/lease contract. No public success-response shape or schema changed.

## Test Infra Gaps Found

CONTEXT_PARTIAL: authoritative context router still describes the older registration-only implementation. No context files were modified. Provider and database integration remain unproven by mocks.

## Closeout Packet

Keep in active/testing. Source correction is implemented and scoped checks passed; independent code review and EVL are still required. No follow-up plan stubs created. No claim of production or live-rail readiness.

## Forward Preview

### Test Infra Found
Vitest contract, route and jsdom component tests.
### Blast Radius Changes
Six files: checkout adapter/test, ticket-orders route/test, ticket dialog/test. No schema or environment changes.
### Commands to Stay Green
Use the focused test command above and scoped ESLint on those six files.
### Dependency Changes
None.

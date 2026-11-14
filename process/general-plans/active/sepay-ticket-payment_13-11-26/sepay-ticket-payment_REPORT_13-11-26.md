---
phase: sepay-checkout-ipn
date: 2026-11-13
status: COMPLETE_WITH_GAPS
feature: general
plan: process/general-plans/active/sepay-ticket-payment_13-11-26/sepay-ticket-payment_PLAN_13-11-26.md
---

## What Was Done

- Implemented SePay Gateway hosted form signing using the documented ordered fields and environment-specific checkout host.
- Connected authenticated order creation to a durable pending payment transaction and signed checkout form response.
- Added authenticated SePay Gateway IPN processing, bounded request parsing, normalized input validation, replay deduplication, exact VND/reference checks, atomic paid transition and Sheet outbox insertion, late/mismatched payment reconciliation, and `TRANSACTION_VOID` handling.
- Added authenticated owner-only order status lookup, five-minute pending expiry transition, and a return page that reads status from persisted state. Redirect query values never establish payment.
- Added `.env.example` variable names/placeholders only. `.env` and actual provider credentials were not touched.

## What Was Skipped or Deferred

- Did not apply migration 004 to Supabase or call SePay. No real keys are configured; checkout fails closed until the three server-only variables are present.
- Sheet retry/worker, approved Sheet columns, and idempotent Sheet upsert remain unimplemented because the active plan still lists the exact destination contract and retry runtime as unresolved execution gates.
- No SePay sandbox verification, production launch, full test suite, or production build was performed.
- No follow-up plan stubs were created.

## Test Gate Outcomes

- Focused Vitest: 26/26 passed for SePay checkout signing and parsing, ticket order route, order status and expiry route, IPN route, and ticket dialog.
- Scoped ESLint on all changed TypeScript/TSX files: passed.
- `npm.cmd run typecheck`: passed.
- PostgreSQL migration execution and concurrency/RLS integration tests: not run; migration is unapplied and no local database integration harness is available.
- SePay sandbox-to-Sheets walkthrough: not run; credentials, public callback URL, Sheet contract, and retry runtime are not configured.

## Plan Deviations

- The active plan's generic webhook-auth wording was resolved using SePay Gateway's official IPN contract: checkout is a signed browser POST to `/v1/checkout/init`; Gateway IPN authenticates with `X-Secret-Key`. SePay bank webhooks use a different HMAC header and are not the endpoint implemented here. References: https://developer.sepay.vn/vi/cong-thanh-toan/API/don-hang/form-thanh-toan and https://developer.sepay.vn/vi/cong-thanh-toan/IPN.
- Raw IPN payloads are not persisted because the official sample includes cardholder and card metadata. Normalized transaction/order evidence is retained in the existing event table instead.
- This execution slice adds a `paid` outbox item atomically but does not process the Sheet outbox. The plan remains active/testing until retry processing and the agreed Sheet schema are implemented and verified.

## Test Infra Gaps Found

- No local Postgres/Supabase integration runner for migration, race, RLS, and atomicity verification.
- No configured worker/scheduler or operator replay path for the durable Sheet outbox.
- Provider sandbox requires an external HTTPS callback origin and owner-managed SePay test merchant/IPN secrets.

## Closeout Packet

- Selected plan: `process/general-plans/active/sepay-ticket-payment_13-11-26/sepay-ticket-payment_PLAN_13-11-26.md`.
- Finished: checkout signing, pending payment persistence call, IPN authentication and processing contract, atomic paid/outbox database function, expiry, status lookup, return UI, tests, and names-only configuration documentation.
- Verified: 26 focused tests, scoped lint, and TypeScript. Not verified: SQL execution against PostgreSQL, SePay sandbox, real webhook delivery, expiry behavior at provider, and Sheet sync/retry.
- Cleanup/context capture: remain in active/testing; archive only after the remaining hybrid gates and outbox processing are complete.
- Uncommitted changes: not counted; repository has pre-existing shared edits and no reliable Git status in the current harness context.
- Best next state: review and apply migration 004 in Supabase, then add the actual SePay sandbox secrets locally and run the sandbox-to-webhook path. Do not enable production checkout before this.

## Forward Preview

### Test Infra Found

Vitest route and adapter tests are available. PostgreSQL concurrency/RLS tests and an E2E browser runner are not configured.

### Blast Radius Changes

New SePay adapter, Gateway IPN route, ticket order status route, payment return UI, migration 004, focused tests, `.env.example`, and active plan/report artifacts.

### Commands to Stay Green

`npm.cmd test -- 'src/lib/payments/sepay/checkout.test.ts' 'src/app/api/ticket-orders/route.test.ts' 'src/app/api/ticket-orders/[orderId]/route.test.ts' 'src/app/api/payments/sepay/ipn/route.test.ts' 'src/app/(routes)/_components/TicketRequestDialog.test.tsx'`

`npx.cmd eslint` with the changed TypeScript/TSX file list; `npm.cmd run typecheck`.

### Dependency Changes

None.

## Follow-up Execution: Attendee Snapshot (2026-11-13)

### What Was Added

- Restored the original form fields `name`, `email`, `phone`, `gender`, `birthYear`, `quantity`, and `merch`; the dialog sends `merch` with canonical option IDs. The user-entered email is saved even if it differs from the authenticated Google email.
- Added boundary validation and normalization before checkout: trim name/email/phone, preserve email case, normalize phone whitespace, validate email and phone formats, limit gender to `female` / `male` / `other` / `undisclosed` / blank, and allow optional birth year from 1900 through the current year.
- Added migration 005 attendee columns and an immutable snapshot trigger. Existing rows keep NULL attendee columns for compatibility. New orders use a new service-role-only `create_ticket_order_v3` RPC which requires attendee data and fingerprints normalized attendee fields together with quantity and merch. Existing v1/v2 RPCs were left defined but execution privileges revoked to prevent new orders from bypassing attendee capture.

### Verification

- Focused Vitest: 34/34 passed across ticket-order validation, `POST /api/ticket-orders`, and the dialog.
- Scoped ESLint passed for modified application files.
- `npm.cmd run typecheck` passed.
- Migration 005 remains unapplied; PostgreSQL transaction/idempotency/immutability integration checks are still unverified.

### Remaining Questions and Gates

- No field/schema decision remains unresolved for this slice. Phone, gender, and birth year are optional; name and email are required. Blank optional values persist as blank phone/gender and NULL birth year.
- The owner still needs to apply/review migration 005 before the new route can work against Supabase. No secrets or `.env` values were changed.
- Sheet persistence of attendee fields remains gated on confirming the sheet columns and adding the durable outbox retry/sync worker.

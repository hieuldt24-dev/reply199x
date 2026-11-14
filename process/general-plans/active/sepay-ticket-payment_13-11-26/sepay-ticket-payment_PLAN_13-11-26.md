---
name: plan:sepay-ticket-payment
description: "Sell REPLY 199X tickets through PayOS and synchronize verified payment status to Google Sheets."
date: 13-11-26
status: validated-conditional
complexity: complex
metadata:
  node_type: memory
  type: plan
---

# PayOS Ticket Payment â€” Implementation Plan

**Date**: 13-11-26  
**Complexity**: COMPLEX â€” one sequential execution stream  
**Status**: VALIDATED CONDITIONAL â€” EXECUTE may proceed with the recorded gates; live checkout remains disabled.  
**SPEC:** `process/general-plans/active/sepay-ticket-payment_13-11-26/sepay-ticket-payment_SPEC_13-11-26.md`  
**Chosen approach:** server-authoritative order and total, PayOS payment-link adapter, signed webhook as payment authority, durable order state and retryable Sheet synchronization.

## Overview and Goals

## V2 Reconciliation Requirements

This revised scope supersedes stale guest flow and Google-login-out-of-scope statements below. Supabase Google OAuth and managed Postgres are in scope; schema/configuration are planned only and are not created until EXECUTE.

- Use SQL RPCs or explicit Postgres transactions for order + amount snapshot + all ticket items, and for verified payment + conditional state transition + Sheet outbox. Failures roll back the full unit.
- Enforce unique `(user_id, idempotency_key)`. Same key/same normalized payload returns existing order; same key/different payload returns HTTP 409. Do not rely on preflight SELECT.
- Unique provider event/transaction IDs; webhook marks paid only from expected pending state and cannot downgrade paid/refunded/reconciliation states. Late, partial, excess or mismatched transfers enter reconciliation.
- RLS allows authenticated users read-only access to their own profiles/orders/items; clients cannot write payment fields, events, amounts or outbox. Privileged mutations use server-only service-role credentials.
- Google OAuth uses PKCE, secure session cookies and exact redirect allowlists. Test callback mismatch, PKCE/state failure, session lifecycle and ownership.
- Serialize Sheet sync by stable order ID and upsert idempotently; persist row identity/result. Concurrent append-only calls are unsafe.
- Retire `/api/ticket-requests` from purchases but preserve historical `Registrations` rows. Use a separately approved paid-orders tab/range; never reinterpret old requests as purchases.
- PayOS documentation does not provide a sandbox. Do not create a live payment during implementation. Keep checkout disabled until a separately approved live-rail test confirms `expiredAt` expiry and late-payment handling; reconcile any verified late, partial or excess payment.
- Add tests for same/different-payload idempotency, distinct keys, transaction rollback, webhook dedupe/no downgrade, RLS cross-user and client-write denial, concurrent Sheet retry uniqueness, and legacy endpoint retirement.

## Phase Completion Rules

The plan is complete only when automated tests cover order idempotency, PayOS request/response/webhook signatures, amount and identity matching, duplicate notifications, and mocked Sheets recovery; database transaction/RLS behavior has real Postgres evidence; and an owner-approved live-rail walkthrough later confirms `expiredAt`, webhook delivery and exact Sheet status “Đã chuyển khoản”. This plan does not authorize a real payment. Until that separate approval and evidence exist, checkout remains disabled and the plan is not VERIFIED.

## Superseding Scope: Supabase Auth and Database (2026-11-13)

The revised SPEC supersedes the original payment-only scope. Supabase Auth with Google OAuth provides identity; Supabase managed Postgres is the durable source of truth. This is a plan only: no tables, OAuth providers, callbacks, secrets, or external resources are created during PLAN or VALIDATE.

Schema-first implementation begins with reviewed migrations for: `profiles` (PK linked to `auth.users.id`, user-scoped RLS); `drink_menu` is not used for customer selection; drinks are included in ticket price; `orders` (user ID, unique per-user idempotency key, quantity 1–4, immutable VND total, state); `order_items` (one per ticket, unique order/ticket number); `payment_transactions` and `payment_events` (unique provider transaction/event IDs and minimal validated metadata); and `sheet_sync_outbox` (unique order/event key and retry state). Foreign keys, check/unique constraints, deny-by-default RLS, and transactions are required. Same-key concurrent submissions resolve to one order; distinct keys remain distinct; payment transition and outbox insert are atomic; repeated sync jobs upsert by stable order ID. Service-role credentials remain server-only.

The customer signs in through Google OAuth, chooses 1–4 tickets and one order-level merch option, then creates the order. Each ticket includes one drink; no drink choice is collected. PayOS payment links request an `expiredAt` five minutes ahead, but actual expiration requires later owner-approved live verification because PayOS has no sandbox. No PayOS credentials are read or entered during PLAN/VALIDATE. Google Sheets receives approved minimal operational fields and the exact paid status `Đã chuyển khoản`. Before live checkout, provision PayOS credentials only in a secure deployment environment, confirm public HTTPS webhook setup and Sheet mapping, and obtain separate approval for the exact live test account and amount. Keep secrets out of tracked files.

Schema creation and OAuth/provider setup happen only in EXECUTE after this revised plan is validated. VALIDATE must replace the prior contract because its scope predates Supabase Auth, Postgres/RLS, schema-first work, merch selection and OAuth ownership tests.

Convert the current ticket-request popup into ticket purchase. An authenticated customer chooses 1â€“4 tickets, sees 169,000 VND per ticket (one drink included; one order-level merch option is added to the total), creates a pending order, pays through PayOS, and sees confirmation only after verified PayOS webhook. Google Sheets receives the paid state and reconciliation fields. A Sheet outage after payment must not lose the order or ask the guest to pay again.

Google Sheets is an operational reporting destination, not the authoritative transaction ledger: it does not provide atomic order creation, idempotency, concurrent updates, durable retries, or webhook deduplication. Order/payment state therefore needs durable storage before live checkout. During EXECUTE, choose the smallest durable store already supported by the approved deployment. If none exists, stop before live checkout and propose a separately approved persistence foundation; never simulate durability with process memory or Sheet-only writes.

### Scope

- Ticket quantity and total presentation in the existing purchase dialog.
- Server validation and price calculation; ignore client-supplied amount.
- Durable pending order, PayOS payment link, verified asynchronous payment notification, idempotency, and status lookup for the return page.
- Retryable Sheet synchronization with observable failure and reconciliation.
- Automated unit/route tests and a provider verification gate. PayOS has no sandbox; any real payment test requires separate explicit account-and-amount approval.

### Out of Scope

- Standalone merch checkout, discounts, multiple ticket types, seat assignment, automated refunds/cancellation after payment, and ticket issuance/QR codes.
- Production launch without owner-provided credentials and operational gates.
- Treating browser redirects as payment evidence or using Sheets as the sole order/payment database.

## Locked Decisions and Execution Gates

Current decisions: PayOS; each ticket costs 169,000 VND and includes one drink; each order may include one merch choice at 0/99,000/169,000 VND; quantity 1–4; server/database owns totals; Google Sheets is downstream status reporting.

Existing workspace state: SePay checkout/IPN and order/status code plus migrations 001–005 are already present as local uncommitted work. This is a provider cutover, not a greenfield integration. Preserve historical SePay transaction/event rows and keep its IPN path for pending SePay links until terminal or reconciled. Do not rewrite prior migrations.

PayOS has no sandbox. During EXECUTE, do not contact PayOS or create any payment. Add names only for `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` to `.env.example`; do not read, print, copy or expose credential values. Checkout must fail closed and remain disabled until database, webhook, retry and operator gates are proven. Any live-rail smoke test requires separate explicit user approval naming the exact account and amount.

## Architecture and Data Flow

1. Existing `TicketRequestDialog` sends attendee fields, integer quantity and one merch option. The server calculates `quantity × 169000 VND + merch (0/99000/169000 VND)`; every ticket includes one drink.
2. Adapt the existing `POST /api/ticket-orders` and preserve its Origin, bounded body, auth and validation checks. The durable order RPC remains the source for price and idempotency. Allocate a positive collision-safe integer PayOS `orderCode` and persist its mapping uniquely per provider before creating a link.
3. Create a PayOS payment link at `POST /v2/payment-requests`. Sign exactly the documented fields `amount`, `cancelUrl`, `description`, `orderCode`, and `returnUrl` with HMAC-SHA256 and the server-only checksum key. Set `expiredAt` to a Unix timestamp five minutes ahead. Verify the signed API response before persisting `paymentLinkId` and returning `checkoutUrl`. Require HTTPS and an explicitly allowlisted PayOS checkout host. The five-minute runtime behavior is unverified because PayOS has no sandbox.
4. Persist provider, orderCode, paymentLinkId, amount, VND currency, expiry and safe provider reference before returning the link. On ambiguous API timeout, reconcile against the durable orderCode before retrying to avoid duplicate links. No PayOS API call is part of this EXECUTE.
5. Replace the existing SePay order response and form-post UI with a safe PayOS `checkoutUrl` response. The return page and cancel URL only display/poll persisted order state. They never establish paid state. Countdown expiry is informational until real link expiry is separately verified.
6. New `POST /api/payments/payos/webhook` verifies the HMAC-SHA256 signature over canonical `data` using constant-time comparison. Require root `success=true`, root `code='00'`, nested `data.code='00'`, `currency='VND'`, exact persisted amount, expected orderCode, paymentLinkId and nonempty transaction `reference`. Reject malformed, tampered, duplicate, unknown and mismatched events; deduplicate by provider-scoped reference/event identity.
7. In one Postgres transaction, record normalized provider evidence, transition only the matching pending PayOS payment to paid, and enqueue one Sheet outbox event. Out-of-order, late, partial or excess payments enter reconciliation. Never let SePay events affect PayOS rows or vice versa. Return/cancel navigations cannot update payment state.
8. Keep SePay IPN processing available for already-created SePay links until pending transactions are terminal or reconciled. Keep status polling safe and owner-scoped. Sheet upserts by stable order ID; configure a durable retry worker/replay mechanism before checkout enablement.

### State Model

`pending_payment â†’ paid â†’ sheet_synced`; alternatives are `pending_payment â†’ failed | expired`. A Sheet failure leaves payment `paid` and sets `sheet_sync_pending` with retry metadata. Failed/expired orders cannot silently become paid; a verified late payment enters reconciliation/manual review. Duplicate notifications never duplicate orders, payments, or Sheet rows.

## Implementation Checklist

1. Preserve the current dirty workspace. Read only the approved deployment configuration needed to identify missing PayOS variables; never print secret values. Add names/placeholders to `.env.example` for `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, and `PAYOS_CHECKSUM_KEY`; do not create or expose live credentials. Fail closed when any is missing.
2. Inspect existing `src/lib/payments/sepay/checkout.ts`, `src/app/api/payments/sepay/ipn/route.ts`, `src/app/api/ticket-orders/route.ts`, order-status/expiry routes, migrations 001/004/005, and their tests. Adapt existing code; do not duplicate ticket-order routes or payment RPCs.
3. Add the PayOS adapter under `src/lib/payments/payos/`. Create the documented payment link (`POST /v2/payment-requests`) with server-derived VND amount and a collision-safe positive integer `orderCode`. Sign exactly the documented create-link fields (`amount`, `cancelUrl`, `description`, `orderCode`, `returnUrl`) using HMAC-SHA256 and the checksum key. Treat `expiredAt` as a Unix timestamp; the documented create-link signature fields do not include it.
4. Verify the PayOS API response signature before persisting or returning its `checkoutUrl`; require HTTPS and an explicitly allowlisted PayOS checkout host. Persist the orderCode mapping, paymentLinkId, exact amount/currency and expiry before returning a safe checkout URL. On ambiguous API timeout, query/reconcile by durable mapping instead of creating an unbounded second link.
5. Add an additive migration after 005. Preserve historical SePay payment/event rows and existing RPCs. Add provider-scoped unique constraints/indexes for PayOS orderCode, paymentLinkId and transaction reference; add a PayOS prepare/payment-transition RPC that atomically records verified paid state and the Sheet outbox. Keep SePay callbacks available for pending SePay links until terminal/reconciled; do not edit historical migrations or drop constraints in place.
6. Adapt `POST /api/ticket-orders` from SePay form `{ action, fields }` to a safe PayOS checkout URL contract; the browser must not receive credentials or signature keys. Keep attendee, price and merch validation authoritative on the server.
7. Add `POST /api/payments/payos/webhook`. Verify the HMAC-SHA256 signature over canonical PayOS webhook `data` with constant-time comparison. Require root `success=true`, root `code='00'`, nested `data.code='00'`, `currency='VND'`, exact amount, expected orderCode and paymentLinkId, and a nonempty transaction `reference`. Deduplicate on provider-scoped reference/event key. Only a matching pending PayOS transaction can transition to paid and enqueue Sheets; late/mismatched/partial/excess events go to reconciliation. Acknowledge only after durable processing; duplicates get safe 2xx without duplicate effects.
8. Update `TicketRequestDialog.tsx`, `/payment/return`, order status and expiry behavior. The return/cancel URL only displays/polls persisted state and never marks paid. Update the user-facing return copy from SePay. Do not show a success state before the verified webhook transition.
9. Update Sheet reconciliation and retry. Preserve stable order IDs and idempotent upsert behavior. Document the scheduler gap if no durable worker exists; checkout remains disabled until there is a durable retry/replay process and approved Sheet columns.
10. Add tests for create request signing, response-signature validation, HTTPS host allowlist, missing config, timeout/ambiguous create, webhook canonicalization/tampering/malformed data, both success codes, amount/currency/orderCode/linkID/reference mismatch, duplicate/out-of-order callbacks, expiry/late reconciliation, SePay-history preservation, Sheet idempotence, and no state change from return/cancel.
11. Run `npm.cmd test`, `npx.cmd eslint src --max-warnings=0`, `npm.cmd run typecheck`, and `npm.cmd run build` sequentially as applicable. No provider call or live-payment verification is part of this execution. Record exact results and keep the feature fail-closed.
## Acceptance Criteria

- **AC1:** Ticket and merch totals are calculated from server values: quantity 1–4 × 169,000 VND plus at most one merch option (0/99,000/169,000 VND). `proven by: ticket-price-and-merch-total scenarios`; `strategy: Fully-Automated`.
- **AC2:** Create-link signing uses the documented five fields; API response signature is verified before persistence; invalid HTTPS/host response is rejected. `proven by: PayOS create-link signature and checkout-host tests`; `strategy: Fully-Automated`.
- **AC3:** Webhook HMAC and root/nested success codes, VND, exact amount, orderCode, paymentLinkId and reference are all required before a pending PayOS payment can become paid. Browser return/cancel never changes payment state. `proven by: PayOS webhook validation matrix`; `strategy: Fully-Automated`.
- **AC4:** Missing credentials, malformed/tampered signatures, API errors/timeouts, wrong IDs/amount/currency/status and unknown links fail closed without leaking secrets or marking paid. `proven by: PayOS failure and mismatch tests`; `strategy: Fully-Automated`.
- **AC5:** Concurrent order submissions, retries and duplicate/out-of-order PayOS/SePay callbacks cannot create duplicate payments, downgrade state or duplicate Sheet events. `proven by: idempotency and provider-isolation scenarios`; `strategy: Fully-Automated` for application logic; real Postgres transaction/RLS behavior remains a named gap until a database runner is available.
- **AC6:** Paid transition and Sheet outbox enqueue are atomic; retry/replay upserts one row by stable order ID and Sheets failure does not revert paid state. `proven by: outbox and Sheet retry tests`; `strategy: Fully-Automated` for application logic; actual scheduler/Sheets write remain a rollout gate.
- **AC7:** A later owner-approved live-rail check confirms configured channel, exact amount/orderCode/paymentLinkId, webhook delivery, `expiredAt` behavior, late-payment handling and matching Sheet row. PayOS has no sandbox; no payment is authorized by this plan. `proven by: separately approved live-rail walkthrough`; `strategy: Hybrid`.
- **AC8:** Historical SePay payments/events remain readable; pending SePay callbacks continue through their existing route until terminal/reconciled; provider-scoped unique indexes do not collide. `proven by: migration compatibility and retained-row integration scenarios`; `strategy: Hybrid`.

## Security and Risk Review

- **Create-link integrity:** HMAC-SHA256 over the exact PayOS-documented request fields; verify response signature before storing/returning anything. Fail closed on invalid signatures or malformed response.
- **Webhook authenticity:** verify canonical `data` HMAC with constant-time comparison; validate root and nested success codes, currency, amount, orderCode, paymentLinkId and transaction reference. Idempotent provider-scoped dedupe and atomic state/outbox transition prevent replay/race.
- **Redirect and URL trust:** `returnUrl`/`cancelUrl` are fixed same-origin destinations and informational only. Accept checkout URL only over HTTPS and on an explicit PayOS host allowlist; never accept an arbitrary return/checkout destination.
- **Secret exposure:** only server environment variables; no `NEXT_PUBLIC_`; names/placeholders only in tracked files; no credential values, raw webhook body, PII or provider secrets in logs. Missing config keeps checkout disabled.
- **Price and authorization:** server/database owns VND amount and orderCode mapping; authenticated owner-scoped order access; RLS and service-role writes only. Never mark paid from client state or Sheet.
- **Provider migration:** maintain strict provider separation so a SePay event cannot match PayOS orderCode/reference; preserve historical SePay evidence and callback handling.
- **Availability:** constrain body size, rate-limit public webhook at deployment edge, use durable outbox, bounded retries and operator reconciliation. A missing scheduler is a launch blocker.
- **Live money:** no PayOS request/transaction during this implementation. A real payment test needs separate explicit approval for the account and amount; no sandbox is documented by PayOS.

## Touchpoints

| Existing/new path | Planned change |
|---|---|
| `src/lib/payments/sepay/checkout.ts` and tests | Retire from new orders after cutover; preserve only as needed for outstanding SePay links/history. |
| `src/app/api/payments/sepay/ipn/route.ts` and tests | Keep processing pending SePay callbacks until terminal/reconciled; provider-isolate from PayOS. |
| `src/app/api/ticket-orders/route.ts` and tests | Existing route calls `prepare_sepay_checkout` and returns a signed form; adapt to PayOS request/response signature checks and safe `checkoutUrl`. |
| `src/app/api/ticket-orders/[orderId]/route.ts` and tests | Extend provider-aware status/expiry behavior without changing safe owner access. |
| `src/app/api/payments/payos/webhook/route.ts` and tests | New signed, validated and idempotent PayOS webhook. |
| `src/app/(routes)/_components/TicketRequestDialog.tsx` and tests | Replace hard-coded SePay form hosts with the validated PayOS URL contract; preserve pending/return states. |
| `src/app/(routes)/payment/return/page.tsx`, `TicketPaymentStatus.tsx` and tests | Replace SePay wording; keep return/cancel informational and status sourced from persistence. |
| `supabase/migrations/202611130001_ticket_sales.sql`, `202611130004_sepay_checkout_ipn.sql`, `202611130005_ticket_attendee_snapshot.sql` | Read-only historical schemas/RPCs. Do not rewrite or drop provider-specific history. |
| New `supabase/migrations/202611140006_payos_payment_links.sql` | Add provider-scoped orderCode/paymentLink/reference storage/uniqueness and PayOS RPC; preserve old SePay rows/functions. Verify actual numbering before creating. |
| `src/lib/payments/payos/` (new), `src/lib/ticket-orders/` | PayOS canonical signatures, response validation, allowlist, mapping and shared domain handling. |
| `.env.example`, operator docs | Add only names/placeholders for the three server secrets and fail-closed setup instructions. Do not read/write secret values. |
| Google Sheets sync/outbox tests and runtime | Preserve idempotent stable-order upsert; establish durable worker or authenticated operator replay before enabling checkout. |


## Public Contracts

- `POST /api/ticket-orders`: accepts attendee data, quantity, merch option and idempotency key; never trusts a client amount. Returns opaque order ID, authoritative total/status and validated HTTPS PayOS `checkoutUrl`; no credentials, signing keys or raw provider payloads.
- `POST /api/payments/payos/webhook`: validates PayOS signature and matching persisted order; acknowledges only after durable event/state/outbox processing. Duplicate valid events receive safe 2xx without duplicate effects.
- `POST /api/payments/sepay/ipn`: existing callback remains isolated for historical/pending SePay transactions until terminal/reconciled.
- `GET /api/ticket-orders/{orderId}`: owner-scoped status only; browser return/cancel does not change status.
- Database: provider-scoped identifiers and uniqueness; retain all SePay rows and old provider functions. New PayOS paid transition + outbox is atomic.
- Sheet row: approved minimal attendee/order data, stable order ID, PayOS transaction reference and exact `Đã chuyển khoản` only after verified webhook; retry/upsert by stable order ID.


## Blast Radius

Next.js UI and routes, payment provider boundary, durable persistence/migration, retry/outbox execution, Google Sheets adapter and deployment secrets/edge configuration. High-risk classes: billing/payment, public API, secrets/trust boundary, external provider contract and persistent data. Current ticket-request endpoint appends directly to Sheet and has no durable payment/order state; it must not be expanded to assert â€œpaidâ€.

## Verification Evidence

| Gate / Scenario | Strategy | Proves SPEC criterion |
|---|---|---|
| Server price/quantity/merch calculation boundaries | Fully-Automated — `npm.cmd test` — Failing stub: `test("ticket and merch totals use server values", () => { throw new Error("NOT IMPLEMENTED — TDD stub: ticket and merch totals use server values") })` | AC1 |
| PayOS request signature, response signature, malformed response and HTTPS host allowlist | Fully-Automated — `npm.cmd test` — Failing stub: `test("PayOS create-link request and response signatures are verified", () => { throw new Error("NOT IMPLEMENTED — TDD stub: PayOS create-link request and response signatures are verified") })` | AC2 |
| Webhook HMAC, root/nested status, amount/currency/orderCode/paymentLinkId/reference and return non-authority | Fully-Automated — `npm.cmd test` — Failing stub: `test("only a matching signed PayOS webhook marks an order paid", () => { throw new Error("NOT IMPLEMENTED — TDD stub: only a matching signed PayOS webhook marks an order paid") })` | AC3 |
| Missing config, API timeout, tampered/mismatched callback, duplicate/out-of-order events and provider isolation | Fully-Automated — `npm.cmd test` — Failing stub: `test("PayOS failures and duplicate events fail closed idempotently", () => { throw new Error("NOT IMPLEMENTED — TDD stub: PayOS failures and duplicate events fail closed idempotently") })` | AC4–5 |
| Additive migration retains SePay rows and atomically records PayOS state/outbox; real DB concurrency/RLS | Hybrid — approved local/staging Postgres migration and transaction/RLS run; no local Postgres runner is currently confirmed | AC5, AC8 |
| Sheet retry/outbox and live `expiredAt`/webhook reconciliation | Hybrid — durable worker + approved Sheet mapping; provider check requires separate explicit account-and-amount approval (PayOS has no sandbox) | AC6–7 |
| Return page/UI keyboard and pending-to-paid states | Agent-Probe — desktop/mobile keyboard check, return before webhook, verified status after webhook | AC3, AC7 |

Exact repo verification commands are in `process/context/tests/all-tests.md`. `npm.cmd test` and mocks prove application handling only. `npx.cmd eslint src --max-warnings=0`, `npm.cmd run typecheck`, then `npm.cmd run build` are sequential source-quality gates; build/type checks do not prove database atomicity, PayOS responses, real expiry or external Sheets writes.


## Test Infra Improvement Notes

Known gaps: no PayOS sandbox, no local Postgres integration runner, no in-project browser E2E runner, and no confirmed durable Sheet retry scheduler. Add or identify database integration coverage for provider-scoped constraints, concurrent orderCode allocation, RLS, atomic paid+outbox rollback and retained SePay rows. Establish a durable retry worker or authenticated replay. Until these are evidenced, keep checkout disabled. Real PayOS expiry/settlement proof requires a separately approved live check; this validation does not authorize one.


## Rollback and Operations

- Fail closed by disabling PayOS link creation; do not remove webhook/status support for existing transactions.
- Preserve paid orders and all transaction evidence. Never downgrade paid to pending or delete historical SePay rows/events.
- Keep SePay IPN processing for pending SePay links until terminal/reconciled; ensure provider-scoped keys prevent cross-provider collisions.
- For ambiguous PayOS create-link timeout, reconcile by persisted orderCode before retrying.
- Sheet outage retains paid/outbox state and retries via durable worker or authenticated operator replay; no checkout enablement without retry proof.
- Late, partial, excess or mismatched provider callbacks enter reconciliation; browser refresh never retries payment automatically.
- Refund/cancellation remains manual under organizer policy. No production/live transaction is authorized by the plan.


## Resume and Execution Handoff

1. Selected plan: `process/general-plans/active/sepay-ticket-payment_13-11-26/sepay-ticket-payment_PLAN_13-11-26.md`.
2. Last completed: SePay checkout/IPN foundation, authenticated order API, ticket UI wiring and attendee snapshot exist as local uncommitted code; PayOS cutover has not started.
3. Validate-contract: CONDITIONAL, accepted by user on 2026-11-14; live checkout remains disabled and requires separate explicit approval for any real payment test.
4. Context loaded: `process/context/all-context.md`, planning, tests, development protocols, selected SPEC, current order route/UI, SePay adapter/IPN, migrations 001–005, status/return UI and relevant tests.
5. Next: EXECUTE this exact plan. Preserve all existing worktree changes. Add env variable names only, adapt the existing SePay path, add a forward-only migration and PayOS tests. Do not read secret values, contact PayOS, create a real payment, apply a remote migration, or enable checkout.


## Validate Contract

Status: CONDITIONAL — user accepted the documented concerns; execution is allowed only with checkout fail-closed.
Date: 14-11-26
date: 2026-11-14
generated-by: outer-pvl
supersedes: 2026-11-13 (outer-pvl) — current PayOS evidence supersedes stale SePay contract
Parallel strategy: parallel-subagents
Rationale: 4 mandatory Layer 1 dimensions + 4 grouped Layer 2 feasibility areas; independent read-only review required no mid-run coordination. Up to 3 optional reviewers; 11 maximum, under the 30-agent cost guard.

Test gates:

| criterion id | behavior | strategy | proving test | gap-resolution |
|---|---|---|---|---|
| AC1 | Server-authoritative ticket/merch total | Fully-Automated | `npm.cmd test` — price boundaries and merch selection | B |
| AC2 | PayOS request/response signatures and checkout URL trust | Fully-Automated | `npm.cmd test` — canonical five-field request, signed response, malformed response, HTTPS host allowlist | B |
| AC3–4 | Verified webhook only; invalid/mismatched events fail closed; return is informational | Fully-Automated | `npm.cmd test` — HMAC, root/nested codes, amount, VND, orderCode, paymentLinkId, reference, duplicate/out-of-order | B |
| AC5 | OrderCode uniqueness, provider isolation and transaction/RLS behavior | Hybrid | Approved local/staging Postgres integration after runner is available; app-level route tests via `npm.cmd test` | C — new `ticket-postgres-integration-validation` plan required |
| AC6 | Durable paid+outbox and idempotent Sheet retry | Hybrid | `npm.cmd test` for app logic; verify deployed scheduler/approved Sheet mapping before checkout enablement | C — new `ticket-sheet-retry-worker-validation` plan required |
| AC7 | Actual `expiredAt`, webhook delivery, settlement and reconciliation | Hybrid | No sandbox exists; a separately approved live-rail account/amount walkthrough is required; not part of this execution | C — new `payos-live-rail-verification` plan required |
| AC8 | SePay row/callback compatibility after provider migration | Hybrid | Apply additive migration to approved local/staging DB; verify existing SePay records and pending callbacks | B |
| UI | Keyboard and responsive status/return flow | Agent-Probe | Inspect dialog and return states; return/cancel before webhook must remain pending | B |

Dimension findings:
- Infra fit: CONCERN — PayOS has no sandbox; `.env.example` has no PAYOS names; existing implementation is SePay; no confirmed durable retry worker.
- Test coverage: CONCERN — no PayOS tests, local Postgres runner or browser E2E; mocks cannot prove PayOS, DB or Sheet runtime.
- Breaking changes: CONCERN — update existing order response/UI/return/status/expiry, introduce orderCode mapping and additive migration, preserve SePay history and pending callbacks.
- Security surface: CONCERN — signed create request and response, constant-time webhook verification, success/amount/identity matching, HTTPS host allowlist, server-only secrets and fail-closed configuration required.
- Layer 2 — schema/order/rollback/handoff: CONCERN — provider-scoped uniqueness and migration/RPC must preserve existing SePay rows and atomic outbox semantics; status and resume records updated above.
- Layer 2 — API/UI/return/touchpoints: CONCERN — adapt existing SePay code rather than duplicating routes; return never changes state.
- Layer 2 — payment/security: CONCERN — PayOS `expiredAt` runtime behavior remains unverified; no provider call/live test was run.
- Layer 2 — evidence/operations/history: CONCERN — no provider sandbox, local DB runner or confirmed retry worker; checkout stays disabled pending evidence.

Open gaps:
- No PayOS sandbox; real expiry/settlement/webhook verification requires separate explicit approval naming account and amount. Deferred follow-up: `payos-live-rail-verification` plan.
- No confirmed local Postgres integration runner; concurrency, RLS and transaction rollback must be proven before enablement. Deferred follow-up: `ticket-postgres-integration-validation` plan.
- No confirmed durable Sheet retry scheduler or approved live Sheet mapping. Deferred follow-up: `ticket-sheet-retry-worker-validation` plan.
- PayOS credential values are not present in tracked files and were not read or changed; environment setup during EXECUTE adds names/placeholders only unless the user provisions secrets securely.

What This Coverage Does NOT Prove:
- `npm.cmd test` mocks do not prove PayOS request/response behavior, webhook delivery, actual `expiredAt` enforcement or money settlement.
- App-level tests do not prove real Postgres uniqueness/concurrency, RLS, migration compatibility or atomic paid+outbox behavior.
- Mocked Sheets tests do not prove external writes, permissions, quotas, retry scheduling or recovery.
- Lint, typecheck and build do not prove payment security or live operations.

Gate: CONDITIONAL — no FAILs; user accepted the concerns with “Accept with concerns; ghi contract và tiếp tục EXECUTE”. EXECUTE may implement and verify code with checkout disabled. No real payment or provider call is authorized.
Accepted by: user — “Accept with concerns; ghi contract và tiếp tục EXECUTE”; accepted conditions: no sandbox/live payment during implementation, checkout remains disabled, preserve SePay history/callbacks, additive migration, unresolved DB/scheduler/provider gates recorded.

## Autonomous Goal Block

SESSION GOAL: Replace the existing SePay checkout integration with PayOS payment-link/webhook code in the selected plan while preserving orders and SePay history.
Autonomy rules: Implement in-scope code, names-only environment template updates and automated tests; preserve all unrelated dirty workspace changes; run scoped tests/lint/typecheck/build sequentially and record results.
Hard stops: Do not read/print/alter secret values, contact PayOS, create a real payment, apply remote migrations, or enable checkout. Stop before any external/live action; it needs separate explicit user approval naming exact account and amount. Preserve historical SePay rows and pending callback processing.
Next phase: EXECUTE on `process/general-plans/active/sepay-ticket-payment_13-11-26/sepay-ticket-payment_PLAN_13-11-26.md`.
Contract summary: PayOS server-side credentials; signed create request/response and webhook; durable integer orderCode mapping; additive migration; provider-isolated state transition and Sheet outbox; `returnUrl`/`cancelUrl` informational only; known Postgres/scheduler/provider gaps keep checkout disabled.
Execute start command: `ENTER EXECUTE MODE` with the exact plan path above.


## User-confirmed pricing amendment (2026-11-13)

This amendment supersedes prior drink-selection and merch-exclusion requirements: each ticket costs 169,000 VND and includes a drink; customers do not choose a drink. One order-level merch option matches the existing single-select form: none (0 VND), Combo "Tuổi Xì Tin" (99,000 VND), or Combo "Tuổi Xì Lây" (169,000 VND). Total = quantity × 169,000 + one selected merch price. Quantity remains 1–4; server/database are authoritative and client amounts are rejected. No payment/provider behavior changes are authorized by this amendment.

## Execution Status — Ticket Order UI Wiring (2026-11-13)

- `TicketRequestDialog` now submits only `idempotencyKey`, `quantity`, and `merchOption` to authenticated `POST /api/ticket-orders`; the legacy `POST /api/ticket-requests` endpoint remains unchanged and isolated.
- The UI provides the 169,000 VND ticket-with-drink price, one order-level merch choice, and server-returned order ID/total. It states that the order is pending payment and does not claim payment or ticket confirmation. The current dialog is wired to the SePay checkout response; the PayOS cutover must replace that contract while keeping checkout disabled until live-rail approval.
- Unauthenticated responses offer Google sign-in at `/auth/sign-in`. Retrying an unchanged order reuses its idempotency key; changing order fields rotates the key.
- This UI slice does not complete legacy endpoint cutover, payment integration, order-status retrieval, or live checkout. Keep the overall plan active until the remaining implementation and rollout gates are complete.
- Focused component tests (4), ESLint for the touched UI and test files, and `npm run typecheck` passed.

## User provider change: PayOS (2026-11-13)

The user asks to replace SePay with PayOS. Provider-specific implementation must use PayOS payment links and HMAC-SHA256 signature verification for create-link data and webhook payloads. Browser `returnUrl`/`cancelUrl` never change payment state; only a verified webhook can atomically mark an order paid and enqueue Sheet sync. Preserve the existing Supabase order/merch schema and price rules. Validate whether PayOS payment-link expiry supports the required five-minute window; do not claim bank transfer itself expires unless PayOS confirms it. Required server-only config: `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`. Use public HTTPS webhook URL; secrets never enter browser, DB rows or logs. Additive migration must widen provider constraints from SePay to PayOS without destroying historical rows. SePay-specific QR/VA and webhook assumptions are superseded. Sandbox/live checkout remains disabled until signature, dedupe, exact amount/currency/orderCode and expiry/reconciliation scenarios pass.

Primary docs: https://payos.vn/docs/api/ ; https://payos.vn/docs/tich-hop-webhook/kiem-tra-du-lieu-voi-signature/ ; https://payos.vn/docs/du-lieu-tra-ve/webhook/ ; https://payos.vn/docs/du-lieu-tra-ve/return-url/ .
## User provider decision changed to PayOS (2026-11-14)

The user has now selected PayOS, superseding the prior SePay decision. Keep the confirmed Supabase order/merch schema and pricing: 169,000 VND per ticket including drink, plus one order-level merch choice at 0/99,000/169,000 VND. Replace the SePay hosted-checkout/IPN flow with the PayOS payment-link API (`POST /v2/payment-requests`) and verified webhook. Sign the create-link fields per PayOS documentation with HMAC-SHA256 and the channel checksum key; verify webhook `data` signature in constant time, then match integer `orderCode`, exact amount, VND currency, payment-link ID and successful transaction code to the persisted pending order before an atomic paid transition and Sheet outbox enqueue. `returnUrl` and `cancelUrl` are display/navigation only. PayOS documents `expiredAt` as a Unix timestamp; confirm five-minute behavior and late-payment outcomes in sandbox. Server-only configuration: `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`. Public HTTPS webhook must be configured/confirmed. Replace the current SePay provider adapter/config and update additive provider constraints while retaining historical SePay transaction rows; do not apply destructive schema changes. Keep PayOS checkout disabled until sandbox signature, idempotency, exact matching, expiry, reconciliation and Sheets recovery gates pass. Existing SePay implementation notes below are historical evidence, not the current target provider.

Official docs: [PayOS API](https://payos.vn/docs/api/), [signature verification](https://payos.vn/docs/tich-hop-webhook/kiem-tra-du-lieu-voi-signature/), [payment webhook](https://payos.vn/docs/du-lieu-tra-ve/webhook/), [return URL](https://payos.vn/docs/du-lieu-tra-ve/return-url/).

## Execution Status — SePay Checkout and IPN Foundation (2026-11-13)

- Added the server-only SePay hosted-checkout adapter and wired `POST /api/ticket-orders` to create/reuse the order, persist one pending SePay transaction through a new service-role RPC, and return a signed form for browser POST to the sandbox or production checkout host. The dialog submits that form only to the two hard-coded SePay hosts.
- Added the SePay Gateway IPN route, owner-scoped order status route, a return page that polls persisted order status, and expiry processing. Paid state and the `paid` Sheet outbox record are created atomically in migration `202611130004_sepay_checkout_ipn.sql`. Amount/currency/reference mismatches and late payments enter reconciliation; return redirects never update payment state.
- Official Gateway docs distinguish its IPN `X-Secret-Key` from SePay bank-webhook HMAC. Checkout and IPN use separate secret variables. Only normalized payment evidence is stored; raw callback/card/customer fields are not persisted.
- `.env.example` lists names/placeholders only. Missing SePay settings make checkout fail closed before creating an order. No `.env` values were changed, no SePay API was called, and migration 004 has not been applied remotely.
- Focused Vitest gate: 26 tests passed across checkout signing/parser, order creation, status access/expiry, IPN authentication/processing, and the ticket dialog. Scoped ESLint and `npm.cmd run typecheck` passed.
- Remaining before live checkout: apply/review migration 004 in the project, sandbox-check signed checkout and IPN with the configured account, confirm public HTTPS callback and provider expiry behavior, and resolve the approved Sheet columns plus durable outbox retry/sync worker. Plan stays active/testing; this implementation slice does not establish production readiness.

## Follow-up Execution Status — Attendee Snapshot (2026-11-13)

- Restored the original ticket form fields `name`, `email`, `phone`, `gender`, `birthYear`, `quantity`, and `merch` in the existing purchase dialog. Email remains the user-entered address even when it differs from their Google account email.
- `POST /api/ticket-orders` now validates and normalizes attendee values, derives the server price, and calls `create_ticket_order_v3`. Phone, gender, and birth year are optional; blank phone is saved as `''`, blank gender as `''`, and blank birth year as `NULL`. Name and email are required. Gender is limited to `female`, `male`, `other`, `undisclosed`, or blank; birth year is limited to 1900 through the current year.
- New additive migration `202611130005_ticket_attendee_snapshot.sql` adds nullable snapshot columns for historical row compatibility; the v3 RPC requires valid snapshot input for all new orders. An update trigger makes those snapshot fields immutable. The order idempotency fingerprint includes normalized name, email, phone, gender, birth year, quantity, and canonical merch option, so reuse of the same key with changed attendee data conflicts.
- Existing `create_ticket_order` and `create_ticket_order_v2` definitions remain unchanged; migration 005 revokes their execute privileges so new orders cannot bypass attendee capture. `create_ticket_order_v3` is service-role-only.
- Focused Vitest: 34 tests passed for validation, authenticated order route, and form UI. Scoped ESLint and TypeScript checks passed.
- Migration 005 was not applied and no database integration run was available. The order status endpoint intentionally returns no attendee PII; Sheet synchronization can use the private persisted snapshot after the approved Sheet contract/retry worker is implemented. Plan remains active/testing.


**Next instruction:** ENTER EXECUTE MODE on this exact plan. Keep PayOS checkout disabled; do not create a payment or contact PayOS.

## Next Step

Execution finished with gaps as recorded below. Keep PayOS checkout disabled; do not create a payment or contact PayOS.

## Execution Status — PayOS Cutover (2026-11-14)

- Status: COMPLETE_WITH_GAPS; the plan remains active/testing and is not ready for UPDATE PROCESS archival.
- Implemented PayOS payment-link signing/response validation, provider URL allowlisting, database orderCode lease and no-blind-retry reconciliation, signed webhook processing, an isolated additive PayOS schema/RPC, provider-aware expiry, PayOS UI contract, names-only credentials and a default-off checkout flag.
- Independent review approved implementation for continued validation only. It does not approve production checkout.
- Focused PayOS/order/UI tests: 24 passed. Full suite: 102 passed and 5 unrelated auth/cookie failures. Focused ESLint passed; full ESLint has the existing HeaderAuth failure. Typecheck and build reported useful stages but did not produce clean terminal exits in this environment.
- No PayOS calls, payment, or remote/local migration application occurred. Checkout remains disabled.
- Unverified rollout gates: Postgres/RLS/SePay history integration, durable Sheet retry/replay and approved columns, public webhook configuration, live expiry/settlement and operator reconciliation.
- Execution report: `sepay-ticket-payment_REPORT_14-11-26.md`; risk evidence: `harness/`.

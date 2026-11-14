---
name: plan:ticket-registration-sheets
description: "Submit ticket-popup requests to the organizer's Google Sheets Registrations tab through a server-side Next.js route."
date: 12-11-26
metadata:
  node_type: memory
  type: plan
---

# Ticket Registration to Google Sheets — Implementation Plan

**Date**: 12-11-26  
**Complexity**: Complex — one execution stream (not a phase program)  
**Status**: ⏳ PLANNED  
**Selected approach:** A server-side Next.js Route Handler validates submissions and appends them to Google Sheets. The ticket popup remains the only UI surface changed.

## Overview

Replace the ticket popup's `mailto:` handoff with an explicit request submission to a same-origin Route Handler. The server validates a narrowly defined payload, authenticates to Google Sheets without exposing credentials, and appends one row to the fixed `Registrations!A:F` range using `RAW` input. The popup confirms receipt only after the append response confirms one row was written; it shows generic retry feedback and preserves form values when the write fails or is uncertain. This records a request only; it does not reserve or sell a ticket.

The plan implements the approved SPEC approach (Option 1) as one sequential workstream. It does not perform a live append or access credential values during planning.

## Quick Links

- [Goals and scope](#goals-and-scope)
- [Architecture and contracts](#architecture-and-contracts)
- [Implementation Checklist](#implementation-checklist)
- [Risks and mitigations](#risks-and-mitigations)
- [Touchpoints](#touchpoints)
- [Public Contracts](#public-contracts)
- [Blast Radius](#blast-radius)
- [Verification Evidence](#verification-evidence)
- [Test Infra Improvement Notes](#test-infra-improvement-notes)
- [High-Risk Evidence Handoff](#high-risk-evidence-handoff)
- [Resume and Execution Handoff](#resume-and-execution-handoff)
- [Validate Contract](#validate-contract)

## Goals and Scope

### Goals

- Save a valid ticket-popup request as one row in the organizer-approved `Registrations` tab, with columns in this exact order: `Thời gian`, `Họ tên`, `Email`, `Điện thoại`, `Số vé`, `Merch`.
- Keep Google credentials and provider errors server-side; never include attendee data or credentials in logs or error responses.
- Make pending, success, and failure states understandable and accessible. Keep entered values after a failed or uncertain attempt.
- Prevent repeated activation of the same form while a request is pending.
- Make provider-independent automated tests possible through an injected/mockable Sheets append boundary.
- Verify the code path with a controlled real-sheet check only after the owner authorizes a safe test target and an approved, non-revoked runtime identity is provisioned.

### In scope

- One `POST /api/ticket-requests` Route Handler and the ticket popup that submits to it.
- Server-side field validation, strict merch allowlisting, request-size limiting, a fixed append range and mapping, and generic failure handling.
- A Google Sheets server adapter using Google Application Default Credentials and the configured spreadsheet ID.
- Automated route/validation and popup tests with a mocked Sheets boundary.
- Names-only local/deployment configuration and operator guidance; no credential values or file contents.
- Required manual-first evidence for the public API and credential trust boundary.

### Out of scope

- Ticket sales, purchases, reservations, payment, seat assignment, or a claim that a request is accepted as a reservation.
- Contact-form behavior, authentication, a database, persistent idempotency storage, CAPTCHA, or a new hosting/platform choice.
- Any change to the `Registrations` tab name, its six columns, or their order.
- A process-local rate limiter presented as protection across multiple server instances.
- Reading, printing, copying, transmitting, or testing with credential values or credential-file contents; live Google API access during PLAN.

## Architecture and Contracts

### Request flow

1. The dialog submits a same-origin JSON `POST` containing `name`, `email`, `quantity`, and `merch`, plus `phone` when supplied. `phone` may be omitted or an empty string; if present it must be a string.
2. The Route Handler rejects an unsupported content type, a missing/invalid/mismatched configured origin, oversized bodies, malformed JSON, unknown fields, invalid field values, or a merch value outside the current UI choices. Enforce the body cap while reading the stream (not only from the client-supplied `Content-Length`); use an 8 KiB maximum.
3. A pure validation/mapping layer trims and validates values, preserves Vietnamese text, applies the allowed merch values derived from the existing `merchCombos` data, and constructs exactly six server-owned cells.
4. A server-only Sheets adapter uses `GOOGLE_SHEETS_SPREADSHEET_ID` and Application Default Credentials with the Sheets scope only. It appends to the fixed `Registrations!A:F` range with `insertDataOption: INSERT_ROWS` and `valueInputOption: RAW`. The timestamp is generated on the server as an ISO-8601 UTC value; the quantity is a number; an omitted phone is an empty cell.
5. Return success only when the Sheets append response confirms exactly one row was written. Do not return or log provider response content.
6. The client clears no entered data on failure. It remains in the dialog and displays a generic retry message. After confirmed success, show a clear received-request notice that explicitly does not say “reserved” or “purchased.”

### Validation and spreadsheet safety

- Require non-empty trimmed name and a valid email address; accept an omitted or empty-string phone, normalize either to an empty sheet cell, and reject `null` or non-string phone values; require an integer quantity from 1 through 4.
- Bound user-controlled strings (proposed limits: name 120 characters, email 254, phone 40) and reject malformed types, control characters, unexpected keys, and non-allowlisted merch values. Keep the limits in one validation module and test them. Confirm/adjust these proposed bounds during VALIDATE if needed.
- Build merch options and the server allowlist from the same existing source so a UI option change cannot silently diverge from server validation.
- Use only the server-defined tab/range and field-to-column mapping. Never accept a range, spreadsheet ID, timestamp, or other write instruction from the browser.
- `RAW` is required so values such as `=HYPERLINK(...)` are stored as text rather than interpreted as formulas. Add a regression test for formula-looking input.
- Do not echo submitted fields or Sheets details in response bodies, logs, metrics, or error messages. Return generic client-safe messages and use a random correlation ID plus a fixed error category for any server diagnostic; never serialize a provider exception.
- Set no-store response headers for request responses containing personal-data workflow state.

### Abuse mitigation and limits

- Require JSON, enforce the streaming 8 KiB body cap, reject a missing, invalid, or non-matching `Origin` using the configured `SITE_URL` origin, and do not enable permissive CORS. Parse `SITE_URL` as an absolute HTTP(S) URL and compare normalized origins only; fail closed if it is missing or invalid. For local development, set `SITE_URL` to the exact local origin being used (the current `.env.example` value is `http://localhost:3000`; use the actual port/host when they differ). For production behind a reverse proxy, set `SITE_URL` to the public browser-facing origin, route the request through that same origin, and compare the browser-supplied `Origin` directly; do not infer trust from `Host`, `X-Forwarded-Host`, or `X-Forwarded-Proto`. The proxy must preserve the `Origin` header. Preview/development origins are accepted only when explicitly configured as the active `SITE_URL`; do not add wildcard or forwarded-header trust.
- Origin checks are a browser-origin mitigation, not authentication; non-browser clients can forge headers. The endpoint remains public.
- Do not implement an in-memory/process-local rate limiter. No hosting platform has been selected, so do not claim a platform-level limit exists. Before exposing this public endpoint in production, the owner must select/configure a platform-level edge/WAF rate limit and monitoring; until then, production exposure is a hard stop. Keep provider-specific setup out of this plan until the host is selected.
- Use Google's normal API quotas and restrict the runtime identity to this spreadsheet. Do not add CAPTCHA, authentication, or an external anti-abuse service in this scope.

### Duplicate and ambiguous-write behavior

- Disable the submit control and guard the submit handler synchronously while a request is pending. A repeated click in that pending UI state must not start another fetch.
- Google Sheets append has no row-level uniqueness constraint. A timeout or lost response can occur after Sheets has appended successfully; the UI cannot distinguish that from an unrecorded request. Retrying after this ambiguous outcome can therefore create a duplicate.
- Do not promise exactly-once delivery or treat a client-generated token, process-local lock, or blind API retry as durable idempotency. Do not automatically retry an append in the server adapter.
- Preserve the values and show the SPEC's generic retry guidance for any unconfirmed result. Record this at-least-once retry limitation in the implementation and high-risk evidence. If true cross-request idempotency becomes a requirement, stop and obtain a separately approved storage/contract design rather than adding columns or hidden state to this sheet.

### Credential and deployment handling

- Keep all Google SDK imports and authentication in server-only modules; use no `NEXT_PUBLIC_` configuration. The client sends only attendee form fields.
- Use the `GOOGLE_SHEETS_SPREADSHEET_ID` value at runtime without logging it. Use Application Default Credentials with the Sheets API scope; never request broader Drive access.
- The local `GOOGLE_APPLICATION_CREDENTIALS` path is not a portable deployment strategy. Since hosting is not selected, document provider-neutral options only: an attached workload identity/ADC mechanism or a securely mounted runtime credential. The owner must select and configure the supported method before production verification.
- The previously exposed key was revoked. Do not reuse it. Before any authorized live-sheet test, the owner must provision a rotated service identity/key or approved runtime identity and share only the target spreadsheet with that identity. Do not inspect or disclose credential values or file contents.
- Initialize the Google client lazily so lint, tests, typecheck, and build do not contact Google or require live credentials. Missing runtime configuration must fail closed with a generic response.

### HTTP behavior

| Case | Response behavior |
|---|---|
| Append confirms one row | `201` with a minimal success status; no attendee fields echoed |
| Unsupported content type | `415`, generic client-safe error |
| Body exceeds 8 KiB | `413`, generic client-safe error |
| Missing, invalid, or mismatched origin | `403`, generic client-safe error |
| Invalid payload or malformed JSON | `400`, generic client-safe error |
| Google configuration/API failure or uncertain append result | `503`, generic retry response; do not reveal provider details |

Use one consistent JSON response shape: success is `{ "status": "recorded" }`; failure is `{ "status": "error", "code": "<fixed-safe-code>", "message": "<generic-safe-message>" }`. Use a small fixed code set for request rejection, origin rejection, and temporary recording failure. The client treats only a confirmed `201` success response as success and displays generic retry feedback for every non-2xx response. Do not expose stack traces, credentials, spreadsheet ID, raw provider errors, or user input in responses or logs.

## Implementation Checklist

This is one execution stream; each numbered step is a checkpoint, not a separately planned phase. Keep server modules server-only and the popup as the sole browser-facing interaction owner.

- [ ] **1. Start the high-risk gate before implementation.** Record the public-API and secret/trust-boundary risk class in the task-local `harness/risk-gate.json`; identify the approver and retain the manual stop before finalization. Do not access credentials or write to a sheet.
- [ ] **2. Add the test seam and runner.** Add Vitest, jsdom, React Testing Library, user-event, and jest-dom as development dependencies; add `"test": "vitest run"` and a Vitest config with the project's `@/` alias. Configure the route/domain tests for Node and the dialog tests for jsdom; keep setup limited to matchers and test cleanup, with no credential loading or Google client initialization. Run the new runner against a small baseline test before feature code.
- [ ] **3. Define the input contract and pure validation.** Add a narrowly scoped ticket-registration type/validation module. Validate exact keys, required name/email, optional phone, 1–4 integer quantity, bounded lengths, and the merch allowlist sourced from the current `merchCombos`. Unit-test boundaries and Vietnamese values.
- [ ] **4. Create the Sheets adapter seam.** Add a `server-only` adapter with a small append interface and a lazy Google client. Keep mapping/range fixed, use the Sheets-only scope, append with `RAW`, and avoid SDK-level automatic retry for a non-idempotent append where configurable. Test the adapter through an injected fake; no live credentials or network.
- [ ] **5. Add the Node.js Route Handler.** Implement `POST /api/ticket-requests`, bounded streaming JSON parsing, fail-closed configured-origin check, validation, server timestamp, exact cell mapping, fixed generic status/response shapes, and a minimal safe diagnostic. In local development, verify `SITE_URL` matches the exact local origin; behind a proxy, use the public origin and preserve the browser `Origin` header without trusting forwarded host/protocol headers. Test missing/invalid config and provider failures without contacting Google.
- [ ] **6. Automate the route and mapping scenarios.** In `route.test.ts`, cover the pure validation module and the mocked Sheets adapter without Google credentials/client initialization or network. Assert one fixed-range append with six correctly ordered values, server-generated timestamp, omitted and empty optional phone normalization, integer quantity, Sheets-only scope, `RAW`, formula-looking input, invalid payload/origin/media type/body size, spoofed forwarded-host headers not bypassing Origin validation, lazy/fail-closed missing configuration, and generic failure behavior. Assert both response bodies and captured diagnostics contain no PII, provider exception text, spreadsheet ID, or credentials.
- [ ] **7. Connect the ticket dialog.** Replace mailto navigation with same-origin JSON fetch and serialize `quantity` as a JSON number. Add pending/success/error states, synchronous duplicate-submit guard, disabled pending control, retain values after errors, and leave the dialog open to display feedback. Explain before submit that the details are sent to the organizers for request review and do not reserve or purchase a ticket. If an append result is uncertain, the generic message must warn that the request may already have been recorded and advise contacting organizers before retrying; do not automatically retry. Do not change other CTAs or ticket-sales copy.
- [ ] **8. Add popup behavior tests.** Verify required fields and quantity limits, pending disabled state and one fetch on repeated activation, success only after confirmed response, no reservation/purchase claim, direct-submission disclosure, generic failure and retained field values, and accessible status/error announcement.
- [ ] **9. Update only directly related documentation.** Update `README.md` and `.env.example` comments with variable names, server-only usage, spreadsheet sharing, local `SITE_URL` origin, public production origin behind a proxy, the production rate-limit prerequisite, local-versus-deployment identity setup, and the warning not to reuse revoked credentials. Update `process/context/all-context.md`, `process/context/tests/all-tests.md`, and `process/context/uxui/component-contracts.md` to reflect the verified API, test runner, popup interaction/disclosure, and remaining deployment/idempotency limits. Never add credential values or attendee data.
- [ ] **10. Install from the changed lockfile and run tests.** Use `npm.cmd ci`, then `npm.cmd test`. Fix failures before proceeding; mock-only tests must not use Google endpoints or require credentials.
- [ ] **11. Run application gates sequentially.** Run `npx.cmd eslint src --max-warnings=0`, `npm.cmd run typecheck`, then `npm.cmd run build`. Do not overlap typecheck and build because both write `.next`. If broad lint is requested, report pre-existing installed skill-tree failures separately; the scoped app lint is the relevant gate.
- [ ] **12. Manually verify the browser flow.** At 360/390 px, 768 px, and 1280/1440 px, open/close the dialog; submit valid, invalid, pending, server-failure, and success-mock scenarios; confirm no overflow, preserved values, direct-submission disclosure, no premature success, no PII in UI errors, keyboard operation, focus behavior, and live status announcements. Verify local requests succeed only when `SITE_URL` equals the local origin; verify the deployed proxy preserves the public browser `Origin` and mismatched/missing origins fail closed before any production exposure. Do not point the browser at a live Sheets write during this step.
- [ ] **13. Perform controlled real-sheet confirmation only after authorization.** Obtain owner approval for a designated non-production spreadsheet with the same `Registrations` schema, or for a clearly marked synthetic row in the target sheet with explicit cleanup ownership. Use only the approved rotated/runtime identity through the app; submit synthetic data, verify all six cells and the server timestamp, then follow the owner's cleanup instruction. If no safe target/cleanup approval is available, mark this gate `SKIP` and keep the feature `CODE DONE`/unverified; do not append to a live sheet.
- [ ] **14. Complete and validate the evidence pack.** Finish all required task-local `harness/` artifacts, including adversarial checks, obtain an explicit reviewer decision, and validate the pack. Stop before finalize/handoff if a high-risk pack or explicit review is missing.

## Phase Completion Rules

The implementation is not complete until:

1. **Automated integration:** Route and popup tests pass using the mocked Sheets boundary, including the failure, boundary, duplicate-click, and mapping cases.
2. **Manual interaction:** The popup works with keyboard and assistive-technology status feedback at the documented viewports; success is not shown before an append is confirmed.
3. **Sheet-state verification:** A controlled, owner-authorized synthetic request is visible in the correct six columns and has a server-generated timestamp. If this cannot be run safely, record it as unverified/blocked rather than claiming end-to-end verification.
4. **Failure handling:** Provider/configuration failures are generic, preserve the form, and reveal neither user data nor provider/credential details.
5. **User Confirmation:** The organizer confirms the controlled sheet behavior and cleanup/retention disposition. A successful build or mock test alone is not proof of a real write.

Status meanings: `⏳ PLANNED` not started; `🔨 CODE DONE` code written but not end-to-end tested; `🧪 TESTING` verification in progress; `✅ VERIFIED` controlled flow tested and owner-confirmed; `🚧 BLOCKED` a required gate cannot safely proceed.

## Acceptance Criteria Mapping

Carry the SPEC criteria forward unchanged:

- **AC1:** Required name and valid email, optional phone, and quantity limited to 1–4. Validate server-side and retain native client validation.
- **AC2:** One append maps request values to `Registrations` columns in the exact agreed order; timestamp is server-generated.
- **AC3:** Success is rendered only after Sheets confirms a one-row append; copy describes a received request, not reservation or purchase.
- **AC4:** Failure or uncertain outcome shows generic retry feedback, preserves values, and discloses no private service details.
- **AC5:** Repeated activation while that dialog's request is pending issues no second request. This does not claim idempotency after an ambiguous timeout or a later retry.
- **AC6:** Keyboard and assistive technology can reach and understand submitting, pending, success, and error feedback.

## Risks and Mitigations

| Risk | Mitigation / required disclosure |
|---|---|
| Append succeeds but response is lost; retry duplicates the row | No exactly-once claim; no blind server retry; explain the ambiguity and record it in operator/evidence notes. |
| Public endpoint is abused | Bound body, strict allowlist, same-origin/JSON checks, no permissive CORS; document residual bot risk. Production exposure is blocked until the selected host has an edge/WAF rate limit and monitoring configured. |
| Attendees do not understand where their personal data goes | The popup discloses direct transfer to organizers for request review and explicitly says this is not a reservation or purchase. Owner confirms sheet access and retention before any controlled live-sheet test or production exposure; do not invent a retention promise. |
| PII or secrets leak through errors/logs | Do not echo payload/provider exceptions; fixed error codes and random correlation ID only; test response and log boundaries. |
| Formula-like input becomes an executable cell formula | Always use `RAW`; test formula-looking attendee values remain literal. |
| Revoked/local key is used or deployment lacks file-based credentials | Never reuse the revoked key; owner provisions approved rotated/attached identity; document hosting-neutral credential setup; no production write until confirmed. |
| Google config, quota, permissions, or tab name is wrong | Lazy fail-closed configuration; owner confirms sheet sharing/tab; mock test errors; controlled approved real-sheet proof. |
| Origin validation breaks behind a proxy or alternate origin | Compare normalized `Origin` with the configured canonical `SITE_URL` origin, not untrusted forwarded headers. Local development uses its exact configured origin; reverse-proxy production uses the public browser-facing origin and preserves `Origin`. Verify with the actual deployment proxy before exposure. |

## Touchpoints

The following are planned execution touchpoints; none are changed during PLAN.

| Path | Planned action |
|---|---|
| `src/app/(routes)/_components/TicketRequestDialog.tsx` | Replace mailto submit with fetch and accessible pending/success/failure states; retain visual shell and other content. |
| `src/app/(routes)/_data/home.ts` | Expose/reuse a single derived merch option list for UI and server allowlist; keep current option labels. |
| `src/app/api/ticket-requests/route.ts` | New Node.js `POST` route, bounded parsing, same-origin check, safe response mapping. |
| `src/lib/ticket-registration/validation.ts` | New pure payload validation/types and fixed mapping logic, testable without Next or Google. |
| `src/lib/ticket-registration/sheets.ts` | New server-only Google Sheets adapter with injectable append boundary and lazy auth. |
| `src/app/api/ticket-requests/route.test.ts` | New route/mapping tests with a mocked append interface. |
| `src/app/(routes)/_components/TicketRequestDialog.test.tsx` | New dialog validation, pending, duplicate activation, success/error retention, and accessibility tests. |
| `vitest.config.ts`, `src/test/setup.ts` | New test-runner config/setup only as required. |
| `package.json`, `package-lock.json` | Add Google Sheets runtime dependency, test dependencies, and test script. |
| `README.md`, `.env.example` | Document variable names and safe local/deployment identity setup; never place secrets in tracked files. |
| `process/context/all-context.md` | Update implementation/configuration facts after verification. |
| `process/context/tests/all-tests.md` | Add the actual test command and distinguish mock proof from live-sheet proof. |
| `process/context/uxui/component-contracts.md` | Update the ticket popup contract while retaining no-sales/no-reservation language. |
| `process/general-plans/active/ticket-registration-sheets_12-11-26/harness/` | Future manual-first high-risk evidence pack; created/completed during execution, not during PLAN. |

## Public Contracts

### Route

- **Method/path:** same-origin `POST /api/ticket-requests`.
- **Request JSON:** `{ "name": string, "email": string, "phone"?: string, "quantity": number, "merch": string }`. `name`, `email`, `quantity`, and `merch` are required. `phone` may be omitted or supplied as an empty string; if present it must be a string (not `null` or another type). Omission and empty string both map to an empty sheet cell. No extra keys are accepted.
- **Success:** `201` with a minimal `{ "status": "recorded" }` response only after one append row is confirmed.
- **Failure:** generic JSON `{ "status": "error", "code": "<fixed-safe-code>", "message": "<generic-safe-message>" }`; codes are exactly `origin_rejected` (`403`), `invalid_request` (`400`), `payload_too_large` (`413`), `unsupported_media_type` (`415`), and `temporarily_unavailable` (`503` for unavailable/misconfigured Sheets writes or uncertain append outcomes). The client treats codes as safe categories only and renders no provider/attendee details. No attendee fields, spreadsheet ID, credential information, stack, or provider text in response or logs.
- **Durable destination:** fixed tab and range only: `Registrations!A:F`, with `RAW` input and `INSERT_ROWS`.
- **Origin configuration:** require a valid absolute HTTP(S) `SITE_URL` and compare normalized origins exactly. Local/dev sets it to the actual local origin (`http://localhost:3000` by default); production behind a proxy sets it to the external public origin and preserves the browser `Origin` header. Never derive allowed origins from forwarded headers. Missing/invalid configuration fails closed; preview origins are not implicitly trusted.

### Sheet mapping

| Column order | Source |
|---|---|
| `Thời gian` | Server-created ISO-8601 UTC timestamp |
| `Họ tên` | Trimmed validated `name` |
| `Email` | Trimmed validated `email` |
| `Điện thoại` | Trimmed `phone`, or empty string |
| `Số vé` | Validated integer `quantity` |
| `Merch` | Exact allowed option selected in the current popup |

The route owns the timestamp, destination, range, auth scope, and mapping. No client can choose them.

### Compatibility

- The homepage, section order, other CTAs, and ticket-sales-not-open messaging remain unchanged.
- The dialog continues to require name/email, permit missing phone, and allow quantities 1–4.
- No extra sheet columns, database, auth flow, or endpoint for contacts are introduced.

## Blast Radius

- **Files:** 16 planned execution files, including one new API route, two server/domain modules, UI integration, tests/config, dependency lock, docs, and three context references; task-local high-risk evidence artifacts are additional.
- **Packages/runtime:** one Next.js App Router application; new Node.js runtime POST surface; Google Sheets API outbound integration; Vitest test runtime.
- **Data:** personal name, email, optional phone, requested quantity, and merch option sent to the organizer-controlled sheet. No app database or additional persistence.
- **Risk class:** high-risk public API/external contract and secret/trust-boundary handling. Manual-first evidence and explicit reviewer decision are required before finalization.
- **Explicit non-effects:** no contact endpoint, no auth, no payment/sales behavior, no sheet schema changes, no hosting-platform assumption.

## Verification Evidence

| Gate / Scenario | Strategy | Proves SPEC criterion |
|---|---|---|
| Validation tests: required name/email, valid email, omitted/empty optional phone and rejection of null/non-string phone, quantity 1/4 boundaries, invalid quantities, merch allowlist, max lengths, Unicode | Fully-Automated | AC1 |
| Mocked route append: fixed `Registrations!A:F`, six-column order, server UTC timestamp, field mapping, and exactly one confirmed mock append result | Fully-Automated | AC2 mapping/response handling |
| Formula-looking input stored with `RAW`; strict JSON schema and request size/origin/media-type boundaries | Fully-Automated | AC2, AC4 |
| Route error tests: missing configuration, append failure, ambiguous response; generic body and no PII/provider details | Fully-Automated | AC4 |
| Route diagnostics test: fixed-safe diagnostic fields only; no attendee data, provider exception, spreadsheet ID, or credential text | Fully-Automated | AC4 |
| Origin tests: exact configured local/public origin accepted; missing, malformed, mismatched, and forwarded-host-only spoof rejected | Fully-Automated | AC4 |
| Dialog tests: no premature success, success copy avoids sale/reservation, pending disables and repeat activation causes one fetch | Fully-Automated | AC3, AC5 |
| Dialog failure test: generic retry feedback, direct-submission disclosure, and all entered values remain available | Fully-Automated | AC4 |
| Keyboard, focus, live-region announcement, screen-reader status review | Hybrid | AC6 |
| Browser popup flow at 360/390/768/1280/1440 widths; no overflow; mock success/failure/pending; exact local Origin configuration | Hybrid | AC1, AC3, AC4, AC6 |
| Reverse-proxy pre-production check: public `SITE_URL`, preserved browser Origin, fail-closed mismatch/missing Origin | Hybrid | AC4 |
| Owner-approved synthetic append to an approved test target; verify durable exact row and timestamp and cleanup/retention | Hybrid | AC2 real persistence |
| `npm.cmd test` | Fully-Automated | AC1–AC5 |
| `npx.cmd eslint src --max-warnings=0` | Fully-Automated | AC1–AC6 (application source quality) |
| `npm.cmd run typecheck` then `npm.cmd run build` sequentially | Fully-Automated | AC1–AC6 (compile/runtime integration; not proof of external delivery) |
| High-risk evidence pack and explicit reviewer decision | Agent-Probe | AC2, AC4, AC6 and trust-boundary safety |

**Gate interpretation:** A build or mock append never proves the real Google write. If controlled real-sheet verification is unavailable, state that clearly and do not use `✅ VERIFIED`.

## Test Infra Improvement Notes

(none identified yet as an EVL finding). Known baseline: the repository currently has no application test runner. This plan therefore includes a Vitest/jsdom/Testing Library setup and a mockable Sheets boundary as planned scope; update this section during VALIDATE/EVL with any additional gaps discovered.

## High-Risk Evidence Handoff

This change adds a public API and handles a Google credential trust boundary. Invoke `vc-risk-evidence-pack` during execution/review and keep the pack under this task folder at `harness/`. Before finalizing or handing off as complete, require:

1. `harness/risk-gate.json` — risk class, description, approver, and `mustStopBeforeFinalize: true`; create before execution/finalization.
2. `harness/context-snippets.json` — exact changed-file/line snippets for route validation, auth scope, fixed range, and client/server boundary. Redact secrets and attendee data; do not include credential-file contents.
3. `harness/verification.json` — automated gates plus successful and failure/boundary evidence; mark any unavailable live-sheet run `SKIP`, not `PASS`.
4. `harness/review-decision.json` — explicit reviewer `APPROVE` or `REJECT`, rationale, and timestamp.
5. `harness/adversarial-validation.json` — cover forged/cross-origin requests, oversized/malformed payloads, unexpected fields/merch, formula-looking input, provider error disclosure, duplicate activation, and ambiguous append timeout/retry.

If the evidence pack or reviewer decision is missing, stop and report that the high-risk work is not ready to finalize. Do not create blocking hooks or imply an automated gate substitutes for the manual-first review.

## Test Stages and Commands

Run in this order after execution changes the manifest and lockfile:

1. `npm.cmd ci` — install exactly from the updated lockfile.
2. `npm.cmd test` — all Vitest tests pass, including mocked route and dialog scenarios; no live network or credentials used.
3. `npx.cmd eslint src --max-warnings=0` — no app-source lint errors/warnings.
4. `npm.cmd run typecheck` — Next type generation and TypeScript complete without errors.
5. `npm.cmd run build` — production build succeeds without initializing Google auth or contacting Sheets.
6. Manual browser and controlled owner-approved sheet checks from [Verification Evidence](#verification-evidence). Record actual outcome; do not substitute lint/build for these.

Do not run `npm.cmd run typecheck` and `npm.cmd run build` concurrently; both write `.next`. `npm.cmd run check` may still report existing failures under the installed skill tree; record that separately and use the scoped app lint command above. Do not run `npm test` before the planned `test` script exists.

## Risks, Decisions, and Preconditions

- **Deployment identity and host-level abuse controls are not selected.** No production hosting assumption is made. The owner must identify a secure runtime ADC/identity mechanism and configure edge/WAF rate limiting and monitoring before production exposure; configure them without sharing credentials in chat or tracked files.
- **Key rotation is a hard precondition for live verification.** The previously exposed key is revoked; never use it. The owner must provision an approved rotated/runtime identity and confirm access to only the intended spreadsheet.
- **Live write permission is not implicit.** No append, credential access, or live API test is part of PLAN. A later real-sheet test requires an owner-approved test sheet or explicit synthetic-row and cleanup authorization.
- **Idempotency is bounded.** Pending duplicate clicks are prevented in the client. A later retry after an ambiguous provider timeout may append a duplicate; exactly-once semantics require an independently approved durable design.
- **Residual abuse risk remains.** Same-origin and body validation reduce browser misuse but are not authentication or a global rate limit. Revisit platform-level throttling when the deployment host is known.
- **Sheet access and data handling.** Before any controlled live-sheet test or production exposure, the owner must confirm the tab exists, the selected identity is shared only with the intended spreadsheet, the popup clearly discloses direct submission to organizers for request review, and access/retention expectations are appropriate for the collected personal data. Do not invent a retention promise.

## Resume and Execution Handoff

1. **Selected plan file:** `process/general-plans/active/ticket-registration-sheets_12-11-26/ticket-registration-sheets_PLAN_12-11-26.md`
2. **Last completed phase/step:** PLAN complete; no source code, configuration, credentials, or sheet data changed.
3. **Validate-contract status:** Pending. The placeholder below is intentional; `vc-validate-agent` must write the contract before EXECUTE.
4. **Supporting context loaded:** `process/context/all-context.md`; `process/context/planning/all-planning.md`; `process/context/tests/all-tests.md`; `process/context/uxui/all-uxui.md`; `process/context/uxui/component-contracts.md`; `process/development-protocols/all-development-protocols.md`; `process/development-protocols/orchestration.md`; `process/development-protocols/plan-lifecycle.md`; `process/development-protocols/implementation-standards.md`; selected SPEC at `process/general-plans/active/ticket-registration-sheets_12-11-26/ticket-registration-sheets_SPEC_12-11-26.md`.
5. **Next step for a fresh agent:** Run VALIDATE against this exact plan and preserve the high-risk/manual evidence requirements. After a green/accepted validate-contract and explicit `ENTER EXECUTE MODE`, execute this plan only. First execution action: create the risk-gate record, re-read this plan/SPEC, and confirm the approved runtime identity and safe test target without viewing or printing any credential values.

## Cursor + RIPER-5 Guidance

- Cursor Plan mode: import the ordered [Implementation Checklist](#implementation-checklist); keep the test, build, manual, and data-verification gates attached to the relevant steps.
- RIPER-5: this PLAN artifact is not authorization to implement. Run VALIDATE, then require explicit EXECUTE approval. During EXECUTE, stop at each checkpoint if scope, credentials, host assumptions, or sheet schema differ from this contract.
- Before claiming completion, distinguish `CODE DONE`, `TESTING`, and `VERIFIED`; controlled owner confirmation is required for the last status.

## Validate Contract

Status: PASS
Date: 2026-11-12
date: 2026-11-12
generated-by: outer-pvl
Gate: PASS — 0 unresolved FAILs and 0 unresolved CONCERNs after the plan clarifications listed below. This validates plan readiness only; it does not verify implemented code, a deployed proxy, or a live Sheets write.

### V1 — Pre-check

- Selected plan path confirmed; approved SPEC is the sibling `ticket-registration-sheets_SPEC_12-11-26.md`.
- `node .claude/skills/vc-generate-plan/scripts/validate-plan-artifact.mjs process/general-plans/active/ticket-registration-sheets_12-11-26/ticket-registration-sheets_PLAN_12-11-26.md` — PASS; 0 failures, 0 warnings.
- Existing plan target files are present. New route, domain/adapter, tests, Vitest configuration, and test setup are explicitly planned creates, not missing pre-existing files.
- The test context confirms no application test runner and no existing application test/spec files. No tests were run during VALIDATE.
- No previous Validate Contract was present; `supersedes:` is therefore omitted.
- This is a standalone plan, not a phase-program plan.

### V2–V3 — Findings and synthesis

The four independent Layer 1 dimensions and four scoped Layer 2 sections were reviewed. Initial concerns were corrected in the plan before this contract was written.

#### Layer 1 dimensions

| Dimension | Status | Finding and disposition |
|---|---|---|
| Infra/setup fit | PASS | Existing Next App Router and Node 22 structure supports the planned Node Route Handler. New paths are planned creates. Local and reverse-proxy `SITE_URL` requirements are now explicit; production host support remains a future pre-exposure gate. |
| Test coverage | PASS | No current runner/tests exist, but the plan now names the Vitest script, Node/jsdom assignments, test locations/scenarios, exact later commands, and Hybrid gates. Mocked append is explicitly distinguished from durable live-sheet persistence. |
| Breaking changes | PASS | Phone request contract now matches the SPEC: optional, omitted or empty string accepted; `null`/non-string rejected. Failure response codes/shapes and numeric `quantity` serialization are explicit. Fixed six-column sheet mapping remains unchanged. |
| Security surface | PASS | The plan now requires safe response/log assertions, direct-submission disclosure, fail-closed Origin checks, no forwarded-header trust, production edge/WAF limiting before exposure, and the manual-first high-risk evidence pack. |

#### Layer 2 sections

| Section | Status | Mechanical feasibility, gaps, conflicts, and mitigation |
|---|---|---|
| Architecture and contracts | PASS | Route/library paths are valid planned creates; the existing App Router pattern supports the route. Phone is optional; request/response contracts, numeric quantity, fixed range and `RAW` semantics are explicit. |
| Implementation checklist and completion rules | PASS | Existing dialog and merch source are present. Tests cover validation, mapping, lazy configuration, disclosure, pending state, retry, and accessibility. A real append is not claimed by mocks; uncertain writes do not auto-retry and advise contacting organizers before resubmission. |
| Touchpoints, blast radius, and verification | PASS | The plan adds the test runner because none exists, uses documented Windows commands, separates application lint/typecheck/build, and keeps `.next`-writing typecheck/build sequential. Local/proxy Origin and live persistence are named Hybrid gates. |
| Risks and high-risk evidence | PASS | The public API/PII/credential write path is gated by least privilege, safe diagnostics, owner authorization, edge limiting before production, and five manual-first evidence artifacts. No credential or network access is authorized by this contract. |

**Totals: 0 FAILs / 0 CONCERNs / 8 PASSes**  
**→ Net Gate: PASS**

#### V4 strategy recommendation for EXECUTE

Signal score: **3/7** — S2 public API/external contract, S6 high-risk public API and secret/trust boundary, S7 at least five planned files. S1, S3, S4, and S5 are absent (one application/package, one selected approach, not a phase program, and no request for extra design exploration).

| Strategy | Agent count estimate | Cost guard | Fit |
|---|---:|---|---|
| Sequential | 1 `vc-execute-agent` | Not triggered | Best fit: the plan is one ordered implementation stream; server contract, test seam, route, UI, docs, and safety checks depend on one another. |
| Parallel subagents | 4 implementers (server/domain, dialog, tests/config, docs) | Not triggered | Not recommended: shared API and test contracts need coordination, and parallel edits risk drift across route, client, and tests. |
| Workflow | Up to 14 checklist steps × 1 executor = 14 invocations | Not triggered | Deterministic but unnecessary orchestration overhead for one bounded plan; use the checklist sequentially. |
| Agent team | 4 members × 1 round = 4 invocations, plus coordination overhead | Not triggered | Not recommended: no mid-execution specialist coordination is needed beyond one cohesive executor; no team machinery is needed. |

**Recommended strategy: Sequential — one `vc-execute-agent` (opus for implementation/build work).** Follow the selected plan's checklist in order; run automated gates after implementation, and keep the high-risk/manual gates as hard stops. This recommendation does not authorize execution.

### III — Test coverage plan

The project has no application tests or test runner today. Add the planned Vitest setup first; then `npm.cmd test` is the exact automated test command. `npm.cmd test` must use mocked Sheets calls only and must not read credentials or make Google network calls.

**Area: Route, validation, and Sheets adapter (`src/app/api/ticket-requests/route.ts`, `src/lib/ticket-registration/`, and route tests)**

**Fully-automated scenario: `ticket-popup-required-fields-and-quantity-boundaries`**

| Tier | Scenario | Command / Steps | What it proves | What it does NOT prove |
|---|---|---|---|---|
| Fully-automated | `ticket-popup-required-fields-and-quantity-boundaries` | `npm.cmd test` exits 0 after the Vitest script/setup are added. | Required name/email, valid email, optional phone omission/empty normalization, invalid phone types, integer quantities 1–4, merch allowlist, length limits, Unicode, and unknown-field rejection. | Does not prove a live Sheets write or policy decisions beyond the coded schema. |

Failing stub (create in the test file during EXECUTE, not on disk during VALIDATE):

```ts
test("should ticket-popup-required-fields-and-quantity-boundaries", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: ticket-popup-required-fields-and-quantity-boundaries")
})
```

**Fully-automated scenario: `ticket-request-to-registration-row`**

| Tier | Scenario | Command / Steps | What it proves | What it does NOT prove |
|---|---|---|---|---|
| Fully-automated | `ticket-request-to-registration-row` | `npm.cmd test` exits 0. | Mock receives one fixed `Registrations!A:F` append in exact order, server UTC timestamp, empty optional phone cell, integer quantity, `RAW`, and one confirmed mock row. | Mocked append does not prove a durable row in Google Sheets. |

Failing stub:

```ts
test("should ticket-request-to-registration-row", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: ticket-request-to-registration-row")
})
```

**Fully-automated scenario: `ticket-request-origin-and-payload-boundaries`**

| Tier | Scenario | Command / Steps | What it proves | What it does NOT prove |
|---|---|---|---|---|
| Fully-automated | `ticket-request-origin-and-payload-boundaries` | `npm.cmd test` exits 0. | Exact configured origin acceptance; missing/invalid/mismatched Origin, bad content type, malformed/oversized JSON, and forwarded-host-only spoof rejection. | Does not prove that a not-yet-selected production proxy preserves Origin. |

Failing stub:

```ts
test("should ticket-request-origin-and-payload-boundaries", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: ticket-request-origin-and-payload-boundaries")
})
```

**Fully-automated scenario: `ticket-request-error-redaction`**

| Tier | Scenario | Command / Steps | What it proves | What it does NOT prove |
|---|---|---|---|---|
| Fully-automated | `ticket-request-error-redaction` | `npm.cmd test` exits 0. | Missing config/provider errors/uncertain result yield fixed safe codes and generic bodies; captured diagnostics expose no attendee data, provider text, spreadsheet ID, or credentials. | Does not prove a provider's live failure modes or quota behavior. |

Failing stub:

```ts
test("should ticket-request-error-redaction", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: ticket-request-error-redaction")
})
```

**Hybrid and remaining tiers**

| Tier | Scenario | Command / Steps | What it proves | What it does NOT prove |
|---|---|---|---|---|
| Hybrid | Controlled real-sheet append and cleanup | Only after owner authorizes a non-production target or a marked synthetic row and explicit cleanup/retention instructions; use an approved, non-revoked runtime identity. Verify the six cells and timestamp, then follow owner cleanup. Mark `SKIP` if authorization/preconditions are absent. | A real authorized append, durable row, and agreed cleanup/retention outcome. | Does not establish exactly-once delivery or justify broader production access. |
| Agent-Probe | Manual-first API/credential-boundary review | Reviewer inspects the five task-local `harness/` artifacts and approved route/mapping excerpts; no credential values or attendee data in evidence. | Human reviewer decision and adversarial evidence for the public API/trust boundary. | Not a substitute for automated tests, safe-target write, or production host controls. |
| Known-Gap | Ambiguous append timeout may be retried and duplicate a row | — | — | No durable idempotency key/store is in scope. Accept only the documented at-least-once limitation; do not claim exactly-once. A later exactly-once requirement needs a separately approved design. |

**Area: Ticket request dialog (`src/app/(routes)/_components/TicketRequestDialog.tsx` and dialog tests)**

**Fully-automated scenario: `ticket-request-confirmation-after-recording`**

| Tier | Scenario | Command / Steps | What it proves | What it does NOT prove |
|---|---|---|---|---|
| Fully-automated | `ticket-request-confirmation-after-recording` | `npm.cmd test` exits 0. | No success before a confirmed response; success language says request received, not reserved/purchased. | Does not prove an external write. |

Failing stub:

```ts
test("should ticket-request-confirmation-after-recording", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: ticket-request-confirmation-after-recording")
})
```

**Fully-automated scenario: `ticket-request-failure-and-retry`**

| Tier | Scenario | Command / Steps | What it proves | What it does NOT prove |
|---|---|---|---|---|
| Fully-automated | `ticket-request-failure-and-retry` | `npm.cmd test` exits 0. | Generic feedback, preserved values, no sensitive/provider details, and safe advice for uncertain outcomes. | Does not establish whether an uncertain write actually appended. |

Failing stub:

```ts
test("should ticket-request-failure-and-retry", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: ticket-request-failure-and-retry")
})
```

**Fully-automated scenario: `ticket-request-repeated-submit`**

| Tier | Scenario | Command / Steps | What it proves | What it does NOT prove |
|---|---|---|---|---|
| Fully-automated | `ticket-request-repeated-submit` | `npm.cmd test` exits 0. | Pending state disables/guards repeated activation and one submit starts only one fetch. | Does not provide durable idempotency across later retries or tabs. |

Failing stub:

```ts
test("should ticket-request-repeated-submit", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: ticket-request-repeated-submit")
})
```

**Fully-automated scenario: `ticket-popup-submission-disclosure`**

| Tier | Scenario | Command / Steps | What it proves | What it does NOT prove |
|---|---|---|---|---|
| Fully-automated | `ticket-popup-submission-disclosure` | `npm.cmd test` exits 0. | Dialog explains direct submission to organizers for request review and avoids reservation/purchase claims. | Does not establish the organizer's retention policy. |

Failing stub:

```ts
test("should ticket-popup-submission-disclosure", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: ticket-popup-submission-disclosure")
})
```

**Hybrid and remaining tiers**

| Tier | Scenario | Command / Steps | What it proves | What it does NOT prove |
|---|---|---|---|---|
| Hybrid | `ticket-popup-keyboard-and-status-feedback` | Manually open, complete, fail, and close the popup by keyboard; inspect focus movement and live status announcement at 360/390/768/1280/1440 px, including a screen-reader spot check. | Keyboard reachability, understandable status, responsive use, and no obscured/overflowing controls. | Does not cover every assistive-technology/device combination. |
| Known-Gap | Full assistive-technology/browser matrix | — | — | No browser/AT matrix is installed; the scoped manual check is the plan's coverage. Broader coverage is deferred unless later required. |

**Area: Local configuration, deployment proxy, and operator evidence**

**Fully-automated scenario: `ticket-request-origin-validation`**

| Tier | Scenario | Command / Steps | What it proves | What it does NOT prove |
|---|---|---|---|---|
| Fully-automated | `ticket-request-origin-validation` | `npm.cmd test` exits 0. | `SITE_URL` parsing/fail-closed behavior and exact Origin comparison work for configured local/public origins; forwarded headers cannot override the decision. | Does not test an actual hosting proxy. |

Failing stub:

```ts
test("should ticket-request-origin-validation", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: ticket-request-origin-validation")
})
```

**Hybrid, Agent-Probe, and Known-Gap tiers**

| Tier | Scenario | Command / Steps | What it proves | What it does NOT prove |
|---|---|---|---|---|
| Hybrid | Local/dev origin check | Set `SITE_URL` to the exact local origin being used (default `http://localhost:3000`); submit a mocked request from that origin and verify mismatch/missing Origin is rejected. | Local configuration is unambiguous and works at the actual dev host/port. | Does not verify production routing. |
| Hybrid | Reverse-proxy pre-production Origin check | After host selection, set `SITE_URL` to the public scheme/host, confirm the proxy preserves browser `Origin`, and test matching, mismatch, and missing-Origin cases before exposing the route. | Actual proxy behavior matches the fail-closed origin contract. | Does not establish abuse controls unless separately verified. |
| Hybrid | Edge/WAF exposure gate | Before production exposure, configure and verify a host-level rate limit and monitoring; record evidence in the task pack. | The public endpoint has a deployment-level abuse control. | No host is selected yet; no provider-specific control can be verified now. |
| Agent-Probe | High-risk evidence pack and review | Complete and validate the five task-local JSON artifacts listed below; obtain a human reviewer `APPROVE`/`REJECT`. | Manual-first risk classification, happy/failure evidence, adversarial scenarios, and reviewer accountability. | Does not itself prove a live row or authorize production exposure. |
| Known-Gap | Host-specific deployment/edge configuration | — | — | The deployment host is unselected. Production exposure remains blocked until runtime identity, proxy-Origin, rate limiting, and monitoring are verified. |

#### High-risk classes and minimum coverage

| Area | High-risk class | Minimum tier | Gap rationale if known-gap accepted |
|---|---|---|---|
| `POST /api/ticket-requests` and fixed Sheets append | Public API / external contract | Hybrid | Owner-authorized controlled write is required for real persistence; unavailable live verification is `SKIP`, not `PASS`. |
| Google runtime identity, PII handling, and diagnostics | Secret / trust boundary | Hybrid | No credential inspection or live access is allowed during VALIDATE. Least privilege, no disclosure, and owner-approved test access must be evidenced before any live write. |

#### Gaps and resolution options

| Gap | Resolution options |
|---|---|
| Real Sheets persistence and cleanup not verified during VALIDATE | A) Keep provider-mock tests in `src/app/api/ticket-requests/route.test.ts` (planned, EXECUTE). B) Run the controlled Hybrid check only with explicit owner authorization, a safe target, approved non-revoked identity, and cleanup instructions. C) Accept as a known gap only while production exposure is blocked; mocks cannot prove persistence. D) If no safe target can be authorized, create a task-local follow-up note in this plan's task folder recording the missing live evidence. |
| Production proxy and edge control cannot be verified before host selection | A) Add automated exact-Origin and forged-forwarded-header tests (planned). B) Verify the real proxy and edge/WAF controls after host selection and before production exposure. C) Accept as a known gap only while the route remains unexposed. D) If host selection is deferred, create a follow-up plan/backlog note for proxy, rate limiting, and monitoring. |
| At-least-once duplicate risk after ambiguous timeout | A) Keep a test for no automatic retry and generic uncertainty feedback. B) A durable idempotency store/contract requires a separately approved design. C) Accept the documented limitation for this scope; do not claim exactly-once. D) Create a follow-up plan only if exactly-once becomes a requirement. |
| Broader assistive-technology matrix | A) Run the named manual keyboard/screen-reader probe. B) Add browser/AT infrastructure only if the product requires broader coverage. C) Accept the scoped manual check as the current evidence, not universal compatibility. D) Record broader matrix coverage as backlog if requested. |

#### Missing test areas

| Area | Why untestable in this plan | Resolution chosen |
|---|---|---|
| Durable Google write during VALIDATE | User explicitly prohibited Google/Sheets network operations and no approved safe target/cleanup authorization is part of this validation task. | Defer to the owner-authorized Hybrid test; absent approval, record `SKIP` and do not claim `VERIFIED`. |
| Actual production proxy and WAF behavior | Host/proxy are not selected, and deployment runtime is not present. | Defer to pre-production Hybrid gate; production exposure is blocked until verified. |

### IV — Plan updates applied

| # | Update | Location | Reason |
|---|---|---|---|
| P1 | Made `phone` optional in the JSON schema; specified omitted/empty string accepted, `null`/non-string rejected, both accepted forms map to blank cell. | Architecture and Contracts; Public Contracts; validation/test checklist | Aligns plan contract to the approved SPEC. |
| P2 | Defined exact safe failure status/code/response behavior and numeric `quantity` serialization requirement. | HTTP behavior; Public Contracts; implementation checklist | Removes API ambiguity and matches current form value types. |
| P3 | Specified local `SITE_URL`, exact-origin comparison, fail-closed configuration, reverse-proxy public origin, preserved `Origin`, no forwarded-header trust, and preview-origin behavior. | Abuse mitigation; Public Contracts; implementation and manual-check steps | Addresses local/dev and proxy deployment behavior without selecting a host. |
| P4 | Required diagnostic redaction assertions, direct-submission disclosure, cautious uncertain-write retry guidance, and production edge/WAF rate limit/monitoring before exposure. | Implementation checklist; Risks and Mitigations; Verification Evidence; Risks/Decisions/Preconditions | Resolves security review findings while retaining explicit release gates. |
| P5 | Made Vitest's script and Node/jsdom split explicit; distinguished mocked mapping from durable real persistence; added named Origin and log-redaction scenarios. | Implementation checklist; Verification Evidence; Test Stages and Commands | Makes test assignments executable and accurately represents proof limits. |

### Execute-agent instructions

| # | Instruction | Trigger |
|---|---|---|
| E1 | Re-read this exact plan and its SPEC before implementation. This validation is not authorization to execute; wait for explicit `ENTER EXECUTE MODE`. | Before any source/config/dependency edits |
| E2 | Do not access, print, copy, transmit, or test with credential values or credential-file contents. Never reuse the revoked key. Use lazy server-only ADC and the Sheets-only scope; do not initialize/authenticate a Google client during tests, typecheck, lint, or build. | All steps |
| E3 | Implement the exact payload contract: required `name`, `email`, numeric `quantity`, `merch`; optional `phone` omitted or string (empty accepted); reject null/non-string and unknown keys. Normalize phone to an empty cell. | Validation/route |
| E4 | Use the fixed safe status/code map and response shape. Do not echo attendee data or provider detail in responses/logs; assert both body and captured diagnostics. Client success only follows confirmed `201` append; uncertain writes warn request may have been recorded and advise contacting organizers before retry. | Route/client |
| E5 | Compare normalized `Origin` against a valid absolute HTTP(S) `SITE_URL` origin. Local config must match actual host/port. Production config must be the public origin; do not trust forwarded host/protocol headers. Fail closed on missing/invalid/mismatch. | Route/config |
| E6 | Convert form quantity to JSON number. Keep submission disclosure visible, preserve values after failure, prevent repeated pending submits, and do not claim reservation/purchase. | Dialog |
| E7 | Keep all Google calls mocked in automated tests. No test, build, or browser mock should contact Google. Do not run any live write unless owner explicitly authorizes a safe target and cleanup/retention instructions. | Tests and manual checks |
| E8 | Production exposure is blocked until the actual proxy-Origin check, owner-confirmed data access/retention, approved least-privilege runtime identity, and host-level edge/WAF rate limiting/monitoring are verified. | Deployment/release |
| E9 | Keep the manual-first evidence pack task-local; redact secrets and attendee data; mark unavailable live write `SKIP`; do not finalize or claim verified without the pack and explicit reviewer decision. | Before finalization/handoff |

### Hard stops

- Do not begin implementation until the user separately says `ENTER EXECUTE MODE` for this exact plan.
- Do not access, print, copy, transmit, or test with credential values or credential-file contents; never reuse the revoked key.
- Do not make any Google/Sheets call or append without explicit owner approval, an approved safe target, a non-revoked runtime identity, and explicit cleanup/retention instructions. This VALIDATE run performed no such operation.
- Do not expose the route in production until the public `SITE_URL`/actual proxy Origin behavior, owner-confirmed access/retention, least-privilege identity, edge/WAF rate limit, and monitoring are verified.
- Do not claim a request is a ticket reservation or purchase, or claim `VERIFIED` without the controlled owner-approved write and complete evidence pack/reviewer decision.

### Test gates and exact commands

Run only during EXECUTE after its dependencies and scripts exist; VALIDATE ran no application tests and none of these commands were run here.

1. `npm.cmd ci` — after the dependency manifest and lockfile have been updated; install the exact Vitest/Google SDK dependency set.
2. `npm.cmd test` — after adding `"test": "vitest run"`; run all route/domain and dialog tests with mocked Sheets boundary only. Must not require credentials or network.
3. `npx.cmd eslint src --max-warnings=0` — application source lint.
4. `npm.cmd run typecheck` — Next type generation and TypeScript check.
5. `npm.cmd run build` — production compilation; run after typecheck, not concurrently because both write `.next`. Lazy Google initialization must prevent auth/network use.

The plan's broader `npm.cmd run check` is not a substitute for the scoped app lint/typecheck because current full lint has documented pre-existing installed skill-tree failures. Record any such baseline separately. Do not run `npm test` before the planned script exists.

### High-risk pack

Required: **yes** — public API/external contract and secret/trust-boundary handling.

Create under `process/general-plans/active/ticket-registration-sheets_12-11-26/harness/` during EXECUTE/review, not during this validation:

- `risk-gate.json` — risk class, description, approver, `mustStopBeforeFinalize: true`.
- `context-snippets.json` — exact relevant excerpts for validation, fixed mapping/range, auth scope, and client/server boundary; redact secrets and attendee data.
- `verification.json` — automated pass/fail/boundary evidence and hybrid results; unavailable live check is `SKIP`.
- `review-decision.json` — explicit reviewer `APPROVE` or `REJECT`, rationale, ISO timestamp.
- `adversarial-validation.json` — forged/cross-origin requests, malformed/oversized payloads, unexpected fields/merch, formula-looking input, error/log disclosure, duplicate activation, and ambiguous append outcome.

Do not treat work as ready to finalize or hand off until the complete pack and explicit reviewer decision exist.

### What this coverage does NOT prove

- Mocked tests, lint, typecheck, and build do not prove a durable Google Sheets row, provider quota/permission behavior, or owner cleanup.
- Unit tests do not prove a selected production proxy preserves the public browser `Origin`; that is a pre-production Hybrid check.
- Same-origin checking is not authentication and does not stop non-browser clients from forging `Origin`; production edge/WAF limiting and monitoring remain required.
- A pending-submit guard is not durable idempotency; an append may succeed while its response is lost, and a later retry can duplicate it.
- The scoped manual accessibility check does not establish support for every browser/assistive-technology combination.
- No production runtime identity, host, rate limiter, or live write was selected or tested during VALIDATE.

### Known gaps on record

- Real Google persistence and cleanup: future owner-approved Hybrid test; no credentials or provider/network use during VALIDATE.
- Production deployment/proxy and edge/WAF controls: host not selected; production exposure is blocked until verified.
- Ambiguous append retries: explicitly at-least-once; exactly-once is out of scope and needs a separately approved design.
- Broader screen-reader/browser matrix: scoped manual check only; no installed automated browser/AT test infrastructure.

### V5 decision and acceptance boundary

The task instruction directed completion of this validation and the phone/Origin clarifications. Acceptance here applies only to the plan text and validate-contract. **It does not grant `ENTER EXECUTE MODE` approval, standing `/goal` consent, permission to access credentials, or permission to write to Google Sheets.**

Accepted by: user-directed VALIDATE task — 2026-11-12; execution approval remains separate.

### V6–V7 handoff

Gate: PASS  
Plan path: `process/general-plans/active/ticket-registration-sheets_12-11-26/ticket-registration-sheets_PLAN_12-11-26.md`  
Validate-contract written: yes  
Plan updates applied: 5 (P1–P5 above)  
Execute-agent instructions: 9  
Test gates written: yes  
High-risk pack required: yes  
Backlog artifacts to create now: 0; production prerequisites remain explicit gates, and any out-of-scope follow-up must be recorded in the task folder or approved backlog.  
Next step: wait for explicit `ENTER EXECUTE MODE`; do not start implementation automatically.

### Autonomous Goal Block

Not activated. No standing `/goal` or Autopilot consent is created; any execution remains gated by the user's separate explicit `ENTER EXECUTE MODE` approval.

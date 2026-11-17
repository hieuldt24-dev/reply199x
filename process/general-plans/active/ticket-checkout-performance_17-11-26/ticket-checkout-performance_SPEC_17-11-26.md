---
name: spec:ticket-checkout-performance
description: "Improve ticket checkout response time and request handling while keeping code modules understandable."
date: 17-11-26
status: updated-for-plan-review
complexity: complex
metadata:
  node_type: memory
  type: spec
---

# Ticket checkout performance and code organization

## Summary

Customers have seen ticket order requests take several seconds, and the project needs to handle bursts of incoming API traffic reliably. Reduce avoidable checkout delay by removing one serial application-to-database round trip while preserving order and payment protections. Add stage timing so remaining delay is visible, and keep the code organized into a small number of clear, focused modules.

## User Stories / Jobs To Be Done

- As a customer, I want a ticket order request to finish promptly so I can continue to payment without a long unexplained wait.
- As a site operator, I want the system to remain responsive during bursts of at least 50 API requests per second so visitors can use the site at the same time.
- As a maintainer, I want checkout code grouped by clear responsibilities with as few files as practical so performance fixes remain understandable and safe to change.

## What The User Wants (Behavioral Outcomes)

- The authenticated checkout route completes with lower latency in a repeatable controlled fixture after the serial database call is consolidated; stage timing makes remaining slow steps visible.
- The API accepts and responds to bursts of incoming requests without transport failures at the agreed ingress-only load level.
- Existing order, payment, retry, and error behavior remains consistent when checkout code is adjusted.
- The codebase uses a restrained number of focused modules. Checkout responsibilities remain understandable, and the HTTP entry point does not become an oversized catch-all.

## Flow / State Diagram

```text
[Customer submits ticket order]
               |
               v
 [Request is validated and processed]
               |
       {Response slow?}
         /          \
       no            yes
       |              |
       v              v
 [Continue to      [Operator can identify
  payment/result]   the slow checkout stage]

[Burst of API requests]
               |
               v
 [Requests receive HTTP responses]
               |
      {Ingress load stable?}
         /          \
       yes           no
       |              |
       v              v
 [No transport    [Capture failures and
  errors at target]   latency for diagnosis]
```

## Acceptance Criteria (Testable Outcomes)

- **AC1:** In a repeatable authenticated route-handler fixture with fixed database-call delays and a mocked PayOS response, the updated checkout has at least 10 ms and 20% lower median total handler time than the captured baseline, with no increase in failed requests across the same scenarios.
  - `proven by:` paired 50-sample baseline/candidate route benchmark using the same in-process handler, fixed-delay RPC fixture, mock auth, mock PayOS, and deterministic request vector; persist and validate baseline configuration/sample metadata, then record failures, status distribution, RPC count, p50 and p95
  - `strategy: Fully-Automated`
- **AC2:** A slow checkout response reports enough stage-level timing information to distinguish authentication, database work, payment-provider work, and total request duration, without exposing personal data, order details, or secrets.
  - `proven by:` route timing and sensitive-data exclusion integration scenarios
  - `strategy: Fully-Automated`
- **AC3:** The API sustains the agreed ingress-only load of at least 50 requests per second for the measured interval without transport failures; this result is reported separately from authenticated order-creation capacity.
  - `proven by:` ingress load scenario with request rate, duration, response distribution, and transport-error count recorded
  - `strategy: Hybrid`
- **AC4:** Existing checkout protections remain effective under repeated, retried, and concurrent submissions: identical retries do not create duplicate orders or payment links, and failures do not falsely mark an order as paid.
  - `proven by:` order idempotency, concurrent submission, payment failure, and payment-state preservation integration scenarios
  - `strategy: Fully-Automated`
- **AC5:** The combined order-and-checkout-preparation database operation preserves account cooldown, idempotency, payment lease, reconciliation and failure-persistence behavior, and the application makes one fewer sequential database RPC for a fresh checkout.
  - `proven by:` isolated PostgreSQL behavior/concurrency suite plus route RPC-count and compatibility scenarios
  - `strategy: Fully-Automated`
- **AC6:** After the code changes, checkout responsibilities remain easy to locate, the HTTP entry point does not absorb unrelated business or provider logic, and the implementation adds no standalone runtime module for timing.
  - `proven by:` changed-file and responsibility-boundary review against the existing ticket-order, validation, and PayOS test coverage
  - `strategy: Agent-Probe`
- **AC7:** Existing ticket-order behavior remains covered by passing route and payment tests, and the application still passes lint, typecheck, database migration checks and production build checks.
  - `proven by:` ticket-order and PayOS regression suite, isolated PostgreSQL migration suite, scoped lint, typecheck, and build
  - `strategy: Fully-Automated`

## Out Of Scope

- Creating real PayOS payment links, making real payment-provider requests, or deploying changes to production.
- Claiming that authenticated order creation can sustain 50 requests per second based on an ingress-only load test.
- Adding a background queue or changing how customers receive their payment link unless separate evidence and approval establish that need.
- Changing ticket prices, order eligibility, payment policy, or the existing checkout-abuse cooldown rules.
- Claiming that a controlled local benchmark establishes a production or hosted latency improvement, or that unauthenticated ingress load establishes authenticated checkout capacity.
- Inspecting production credentials or making production configuration changes.

## Constraints

- Preserve order idempotency, payment integrity, safe retry/reconciliation behavior, and current error handling.
- Consolidate the order and checkout-preparation database calls only if returned state and failure behavior match the existing two-call flow, including preserving an idempotent order when checkout preparation fails.
- Keep sensitive credentials, personal data, and order information out of timing output and logs.
- Use mocked auth and PayOS behavior plus fixed-delay RPC fixtures for the automated route benchmark. Persist a 50-sample baseline/configuration manifest in the task folder before route or migration edits; candidate comparison must load and validate that artifact and replay the identical request vector and settings. Require parity only for stable runtime/environment and benchmark inputs (Node/runtime version, platform/architecture, dependency-lock digest, relevant config, fixture/schema/scenario identity, request vector, RPC delay, warm-up policy, sample count and order). Record source/code and build revisions separately for each run; these revisions are expected to differ and must not be used as environment-parity checks. Use the existing isolated PostgreSQL runner to verify real SQL transaction, role and concurrency behavior. PayOS does not provide a separate sandbox; no real provider request or live payment is authorized.
- Treat the production screenshot showing approximately 4.1 seconds as a symptom, not a stage-level diagnosis or a repeatable baseline.
- Report ingress-only capacity separately from authenticated checkout performance. The previous 50 requests-per-second measurement exercised unauthenticated ingress responses and did not create orders.
- Minimize file count while keeping each module's purpose clear; do not concentrate the entire flow in one oversized file.
- Do not change or expand the active checkout-access-guard plan as part of this task.

## Open Questions

None. The selected plan will address avoidable application-to-database round trips and prove the change in an isolated controlled fixture. Production and hosted latency remain unclaimed without an approved non-production capture.

## Background / Research Findings

- The production browser capture shows a `POST /api/ticket-orders` taking about 4.1 seconds. It does not show how much time was spent in authentication, database operations, or PayOS.
- A fresh checkout currently waits on several sequential operations: authentication, order creation, checkout preparation, PayOS link creation or lookup, and saving the returned link. The observed total therefore cannot be attributed to one stage yet.
- The application already has separate ticket-order validation and PayOS integration modules, plus route tests for order creation, failures, and payment-link persistence. This provides existing behavior to preserve.
- The earlier local load measurement returned 401 responses for unauthenticated ingress requests at 50 requests per second. It reported no transport errors, but did not exercise authenticated order creation or PayOS.
- A local isolated database timing sample does not measure the hosted database or external provider latency. The selected optimization targets one avoidable serial RPC; the controlled route benchmark uses a fixed per-RPC delay to make that reduction observable.
- The existing PayOS implementation plan covers payment correctness and architecture. The active checkout-access-guard plan covers account restrictions and is not the owner of this performance task.
- User intent captured during this work: “Giảm file code nhưng vẫn chia module rõ.” The user also asked to reduce the 4.1-second ticket order response and handle 50 requests per second at API ingress.

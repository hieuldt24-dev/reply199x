# Payment UI execution evidence

Ownership: TicketPaymentStatus component/tests and TicketRequestDialog component/tests only.

Status workload baseline was measured before source changes: 41 requests over visible30s/hidden60s/visible30s, including 20 hidden requests. Identical after scenario: 22 requests, zero hidden requests. Raw observations and reproducible command are in `payment-ui-workload_15-11-26.json`. Immediate resume accounts for one request. Fake-clock latency does not measure real network capacity.

Red-first status run: 6 failed, 8 passed against original component. After implementation and two additional cleanup/non-overlap scenarios: 16 passed. Coverage includes initially hidden, repeated visibility events, in-flight abort, stale JSON after hiding/order change, unmount abort, paid redirect cleanup, HTTP/malformed/network retries, terminal states and unauthorized stop.

Red-first restriction dialog: 1 failed, 9 passed. Restricted response now displays a fixed Vietnamese reason and localized valid ISO retry time, retains form values and idempotency key, and does not retry automatically. Malformed dates use existing safe fallback. Combined component suite passed 24 tests before the final two status-only additions; final status-only run passed 16 tests. Scoped ESLint over all four files passed with zero warnings.

No production call, real authentication, actual payment or browser screenshot was used. Browser presentation remains for the integration/independent verification stage.

# PayOS webhook registration diagnostics

Status: diagnostics implemented and scoped checks pass; production registration remains unverified.

Official https://payos.vn/docs/api/ documents a signed registration sample with currency VND and a 2xx acknowledgement requirement. The current parser accepts that shape; no evidence supports accepting missing currency or unsigned samples. Dashboard confirm-webhook 400 does not establish the receiver's response code.

Read-only/non-payment production probes: GET webhook returned 405; POST empty JSON returned 400 invalid_webhook. This confirms endpoint presence and configured PayOS keys, but not checksum alignment with the selected channel. No signed payment was sent and no remote configuration changed.

Changes: webhook validation rejection emits only payos_webhook_rejected plus fixed stage validation and code invalid_signature or invalid_payload. Public response remains generic 400 invalid_webhook. Signature verification and payment mutation gates are unchanged. No payload, signature, key, reference or attendee data is logged.

Tests cover documented signed registration sample, rejection of tampering, exact fixed diagnostic arguments for signature failure and a signed payload missing required currency, and absence of DB/Sheets calls on rejected input. Focused webhook suite: 7/7 passed. Scoped ESLint of handler and tests: exit 0. Initial test edit had a syntax error, corrected before the successful final checks.

Next: deploy through normal release workflow, attempt Save once, inspect Vercel fixed diagnostic. invalid_signature means inspect checksum/channel alignment; invalid_payload means obtain field-presence-only evidence and compare provider contract. A 503 instead requires config/RPC investigation. This patch improves observability; it does not claim to fix the unobserved provider registration cause.

## Follow-up: signed payload rejected

User provided actual registration log with code invalid_payload. This proves HMAC passed and eliminates checksum mismatch for that request. Actual rejected field is still unknown; official docs require boolean success and currency, and the full documented sample passes the real verifier/parser. No known schema correction is justified yet.

Extracted unchanged validation guards into shared payOsWebhookValidationIssue, used by the parser and rejection diagnostics. Logs now include only a fixed reason: success_type, root_code, data_code, order_code, amount, payment_link_id, currency, reference, or invalid_signature. This avoids diagnostic/parser rule drift and logs no field values. Acceptance and payment mutation gates are unchanged.

Final checks: checkout and webhook suites 26/26 pass; scoped ESLint of all three touched source/test files exits 0. Added field/envelope rejection coverage with real HMAC and no DB access. Next deployment and one registration Save will expose the exact incompatible field safely. Live registration success remains unverified.

# PayOS webhook registration diagnostics

Status: diagnostics implemented and scoped checks pass; production registration remains unverified.

Official https://payos.vn/docs/api/ documents a signed registration sample with currency VND and a 2xx acknowledgement requirement. The current parser accepts that shape; no evidence supports accepting missing currency or unsigned samples. Dashboard confirm-webhook 400 does not establish the receiver's response code.

Read-only/non-payment production probes: GET webhook returned 405; POST empty JSON returned 400 invalid_webhook. This confirms endpoint presence and configured PayOS keys, but not checksum alignment with the selected channel. No signed payment was sent and no remote configuration changed.

Changes: webhook validation rejection emits only payos_webhook_rejected plus fixed stage validation and code invalid_signature or invalid_payload. Public response remains generic 400 invalid_webhook. Signature verification and payment mutation gates are unchanged. No payload, signature, key, reference or attendee data is logged.

Tests cover documented signed registration sample, rejection of tampering, exact fixed diagnostic arguments for signature failure and a signed payload missing required currency, and absence of DB/Sheets calls on rejected input. Focused webhook suite: 7/7 passed. Scoped ESLint of handler and tests: exit 0. Initial test edit had a syntax error, corrected before the successful final checks.

Next: deploy through normal release workflow, attempt Save once, inspect Vercel fixed diagnostic. invalid_signature means inspect checksum/channel alignment; invalid_payload means obtain field-presence-only evidence and compare provider contract. A 503 instead requires config/RPC investigation. This patch improves observability; it does not claim to fix the unobserved provider registration cause.

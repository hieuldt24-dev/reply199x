# PayOS setup and rollout gates

## Environment

Configure these variables only in a secure local or deployment secret store:

- `PAYOS_CLIENT_ID`
- `PAYOS_API_KEY`
- `PAYOS_CHECKSUM_KEY`
- `SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SITE_URL`
- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SHEETS_PAID_ORDERS_RANGE` (optional; defaults to `Registrations!A:N`)
- `SHEETS_SYNC_WORKER_SECRET` (random secret, at least 32 characters)

The checkout flag is `PAYOS_CHECKOUT_ENABLED=false` by default in the supplied environment templates. Keep it false until the database migration and integration evidence, public HTTPS webhook, durable Sheet retry/replay worker, approved Sheet mapping, and separate owner-approved live-rail verification are complete. This implementation did not call PayOS or apply the migration.

## Callback and return behavior

Configure the PayOS webhook to call `/api/payments/payos/webhook` over public HTTPS. Configure return and cancel URLs to `/payment/return`; these pages only display persisted order state and do not verify payment. The webhook HMAC, both success codes, VND amount, orderCode, paymentLinkId, and transaction reference are required before a paid transition. Signed non-success and unknown-order events are persisted for reconciliation before acknowledgment.

## Operational limits

The create-link request is protected by a database lease and stable integer orderCode. Every create attempt first checks PayOS by orderCode. If a prior attempt is ambiguous, a later request can only reconcile by lookup; it never submits a second create automatically. If lookup cannot produce a complete verified response or confirms no link after a create was attempted, the order moves to reconciliation for manual handling.

## Google Sheets outbox delivery

Migration `202611140007_ticket_sheet_outbox_worker.sql` adds a leased worker lifecycle to the existing `sheet_sync_outbox`. Apply and review it in the intended database before running the worker; this code does not apply migrations. The sheet adapter upserts `Registrations!A:N` by stable order ID in column K and refuses to write if duplicate order IDs already exist. It uses `RAW` cell values. The mapping is A order time, B name, C email, D phone, E gender, F birth year, G ticket quantity, H merch, I total VND, J payment status, K order ID, L PayOS reference, M paid time, N PayOS paymentLinkId.

Configure a scheduler to send an HTTPS `POST` to `/api/internal/sheets-sync` with `Authorization: Bearer <SHEETS_SYNC_WORKER_SECRET>`. Schedule it once per minute; each request processes at most 10 rows (or a lower `?limit=N`). The route does not self-schedule. The PayOS webhook makes one best-effort immediate attempt after durable paid+outbox processing, while scheduled calls recover failures, worker crashes and ambiguous Google write responses. Failed rows use exponential backoff capped at one hour and remain visible in the outbox with a sanitized error code. Monitor `pending`, `failed` and expired `processing` rows; alert on any row remaining unsynced beyond the operational target. Protect the secret in the scheduler's secret store and rotate it by updating both locations together.

The mapping is based on the organizer-provided A:N headers, and the sheet tab name defaults to the existing `Registrations` tab. Configure another range only if the destination tab is intentionally different. A configured scheduler, database migration, Google credentials/share permissions, and live Sheet writes have not been verified here.

Checkout remains disabled until the database, webhook, scheduled Sheet retry, approved mapping and later live-rail evidence gates pass. No PayOS/Sheets calls or migrations were applied as part of this implementation.

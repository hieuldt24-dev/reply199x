# PayOS paid webhook outbox conflict fix

User evidence: registration succeeds; actual paid webhook returns 503 after Supabase API call. This distinguishes the paid RPC branch from unknown registration orders.

Confirmed source defect: process_payos_webhook RETURNS TABLE declares order_id as a PL/pgSQL output variable. Paid branch INSERT uses ON CONFLICT(order_id,event_key), which ambiguously resolves output variable versus table column under default variable_conflict=error. Expected SQLSTATE is 42702. Registration's unknown-order branch returns before this statement. Actual production SQLSTATE remains unobserved; screenshot alone does not establish it.

Forward-only migration: supabase/migrations/202611140009_fix_payos_webhook_outbox_conflict.sql replaces only that conflict target with ON CONFLICT ON CONSTRAINT sheet_sync_outbox_order_id_event_key_key. Base migration 001 defines unnamed unique(order_id,event_key), yielding this PostgreSQL constraint name. Verify constraint name before applying if production schema was changed manually. Function signature, row locking, durable payment/event updates, outbox deduplication, security definer/search_path and role grants are preserved; old applied migrations unchanged.

Handler now logs payos_webhook_failed with stage process_rpc and allowlisted SQLSTATE/PostgREST code (unknown otherwise), never raw error/detail/payload. Public 503/retry semantics remain unchanged. Route tests: 17/17 passed. Scoped handler/test ESLint: exit 0. Static comparison proves replacement function differs from 006 only in the conflict target. No Postgres execution, migration application or remote writes performed. SQL runtime and real webhook replay remain unverified.

Next: apply migration009 through normal Supabase workflow, deploy safe diagnostics, redeliver the original provider event. Do not create another payment, manually mark paid or reset event rows. Payment expiry gates remain unchanged: a late event may correctly reconcile rather than issue a paid ticket.

Primary explanation: https://www.postgresql.org/docs/current/plpgsql-implementation.html (variable substitution); PostgreSQL issue example https://www.postgresql.org/message-id/18587-c4ee4d43f6a4f8f3%40postgresql.org documents the same ON CONFLICT/output-variable 42702 failure.

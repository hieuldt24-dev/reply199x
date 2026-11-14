import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { upsertPaidTicketOrder, type PaidTicketOrder } from "./paid-orders";

type RpcResult = { data: unknown; error: { message?: string } | null };
export type OutboxAdmin = { rpc: (name: string, args?: Record<string, unknown>) => Promise<RpcResult> };

export function createOutboxAdminClient(): OutboxAdmin | null {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey?.startsWith("sb_secret_")) return null;
  try {
    const { url } = getSupabaseConfig();
    const client = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    return client as unknown as OutboxAdmin;
  } catch {
    return null;
  }
}

function errorCode(error: unknown): string {
  if (error instanceof Error && error.message === "duplicate_sheet_order_rows") return "duplicate_rows";
  if (error instanceof Error && error.message === "invalid_paid_order") return "invalid_order";
  if (error instanceof Error && error.message === "invalid_sheet_range") return "invalid_range";
  if (error instanceof Error && error.message === "sheets_not_configured") return "not_configured";
  return "sheets_write_failed";
}

export async function drainPaidTicketSheetOutbox(admin: OutboxAdmin, limit = 1): Promise<{ claimed: number; synced: number; failed: number }> {
  const { data, error } = await admin.rpc("claim_paid_ticket_sheet_sync", { p_limit: limit });
  if (error || !Array.isArray(data)) throw new Error("outbox_claim_failed");
  let synced = 0;
  let failed = 0;

  for (const raw of data as PaidTicketOrder[]) {
    try {
      const rowNumber = await upsertPaidTicketOrder(raw);
      const completed = await admin.rpc("complete_paid_ticket_sheet_sync", {
        p_outbox_id: raw.outbox_id,
        p_lease_token: raw.lease_token,
        p_sheet_row_id: rowNumber,
      });
      if (completed.error || completed.data !== true) throw new Error("outbox_complete_failed");
      synced += 1;
    } catch (error) {
      const failedResult = await admin.rpc("fail_paid_ticket_sheet_sync", {
        p_outbox_id: raw.outbox_id,
        p_lease_token: raw.lease_token,
        p_error_code: errorCode(error),
      });
      if (failedResult.error || failedResult.data !== true) throw new Error("outbox_failure_record_failed");
      failed += 1;
    }
  }

  return { claimed: data.length, synced, failed };
}

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { getPayOsConfig, parsePayOsWebhook } from "@/lib/payments/payos/checkout";
import { drainPaidTicketSheetOutbox, type OutboxAdmin } from "@/lib/ticket-registration/outbox-worker";

export const runtime = "nodejs";
const MAX_BODY_BYTES = 16 * 1024;
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
function json(body: Record<string, unknown>, status: number) { return NextResponse.json(body, { status, headers }); }

async function readBody(request: Request): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder(); let size = 0; let result = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); return null; }
      result += decoder.decode(value, { stream: true });
    }
    return result + decoder.decode();
  } finally { reader.releaseLock(); }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return json({ error: "unsupported_media_type" }, 415);
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413);
  const config = getPayOsConfig();
  if (!config) return json({ error: "temporarily_unavailable" }, 503);
  let raw: string | null;
  try { raw = await readBody(request); } catch { return json({ error: "invalid_request" }, 400); }
  if (raw === null) return json({ error: "payload_too_large" }, 413);
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return json({ error: "invalid_json" }, 400); }
  const parsed = parsePayOsWebhook(payload, config.checksumKey);
  if (!parsed) return json({ error: "invalid_webhook" }, 400);
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey?.startsWith("sb_secret_")) return json({ error: "temporarily_unavailable" }, 503);
  try {
    const { url } = getSupabaseConfig();
    const admin = createSupabaseClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const { data, error } = await admin.rpc("process_payos_webhook", {
      p_event_id: parsed.eventId,
      p_order_code: parsed.orderCode,
      p_payment_link_id: parsed.paymentLinkId,
      p_reference: parsed.reference,
      p_amount_vnd: parsed.amount,
      p_currency: parsed.currency,
      p_success: parsed.success,
    });
    if (error || !data) return json({ error: "temporarily_unavailable" }, 503);
    // Payment and outbox are already durable. This best-effort bounded attempt
    // reduces delivery latency; scheduled retries remain the recovery path.
    if (Array.isArray(data) && data[0]?.result === "paid") {
      try { await drainPaidTicketSheetOutbox(admin as unknown as OutboxAdmin, 1); } catch { /* outbox remains retryable */ }
    }
    return json({ received: true }, 200);
  } catch { return json({ error: "temporarily_unavailable" }, 503); }
}

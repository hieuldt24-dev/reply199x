import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { parseSepayGatewayIpn, verifySepayIpnSecret } from "@/lib/payments/sepay/checkout";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 16 * 1024;
const responseHeaders = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: responseHeaders });
}

async function readBoundedBody(request: Request): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let bytes = 0;
  let result = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      result += decoder.decode(value, { stream: true });
    }
    return result + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return json({ error: "unsupported_media_type" }, 415);
  }
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413);

  if (!verifySepayIpnSecret(request.headers.get("x-secret-key"), process.env.SEPAY_IPN_SECRET_KEY)) {
    return json({ error: "unauthorized" }, 401);
  }

  let rawBody: string | null;
  try {
    rawBody = await readBoundedBody(request);
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
  if (rawBody === null) return json({ error: "payload_too_large" }, 413);

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(rawBody);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const ipn = parseSepayGatewayIpn(rawPayload);
  if (!ipn) return json({ error: "invalid_ipn" }, 400);

  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey?.startsWith("sb_secret_")) return json({ error: "temporarily_unavailable" }, 503);

  try {
    const { url } = getSupabaseConfig();
    const admin = createSupabaseClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await admin.rpc("process_sepay_gateway_ipn", {
      p_provider_event_id: ipn.providerEventId,
      p_provider_transaction_id: ipn.providerTransactionId,
      p_provider_reference: ipn.providerReference,
      p_notification_type: ipn.notificationType,
      p_order_status: ipn.orderStatus,
      p_order_currency: ipn.orderCurrency,
      p_order_amount_vnd: ipn.orderAmountVnd,
      p_transaction_status: ipn.transactionStatus,
      p_transaction_currency: ipn.transactionCurrency,
      p_transaction_amount_vnd: ipn.transactionAmountVnd,
    });
    if (error || !data) return json({ error: "temporarily_unavailable" }, 503);

    // SePay requires HTTP 200 after the verified notification is durably stored.
    // Reconciliation and duplicate outcomes are acknowledged to avoid needless redelivery.
    return json({ received: true }, 200);
  } catch {
    return json({ error: "temporarily_unavailable" }, 503);
  }
}

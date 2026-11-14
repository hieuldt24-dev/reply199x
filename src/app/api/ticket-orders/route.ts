import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getSiteOrigin, getSupabaseConfig } from "@/lib/supabase/config";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { validateCreateTicketOrder } from "@/lib/ticket-orders/validation";
import { createPayOsPaymentLink, getPayOsConfig, lookupPayOsPaymentLink, payOsErrorDiagnostic, type PayOsLink } from "@/lib/payments/payos/checkout";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 8 * 1024;
const noStore = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const CHECKOUT_RPC_CODES = new Set(["42702", "42883", "42501", "23514", "23505", "P0002", "PGRST202"]);

function logCheckoutRpcFailure(stage: "prepare" | "persist", code: unknown) {
  console.error("payos_checkout_rpc_failed", {
    stage,
    code: typeof code === "string" && CHECKOUT_RPC_CODES.has(code) ? code : "unknown",
  });
}

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: noStore });
}

async function readBoundedBody(request: Request): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== getSiteOrigin()) {
    return json({ error: { code: "origin_rejected", message: "Request could not be accepted." } }, 403);
  }

  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return json({ error: { code: "unsupported_media_type", message: "Send a JSON request." } }, 415);
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json({ error: { code: "payload_too_large", message: "Request is too large." } }, 413);
  }

  let rawBody: string | null;
  try {
    rawBody = await readBoundedBody(request);
  } catch {
    return json({ error: { code: "invalid_request", message: "Check the request and try again." } }, 400);
  }
  if (rawBody === null) {
    return json({ error: { code: "payload_too_large", message: "Request is too large." } }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: { code: "invalid_request", message: "Check the request and try again." } }, 400);
  }
  const input = validateCreateTicketOrder(body);
  if (!input) return json({ error: { code: "invalid_request", message: "Check the request and try again." } }, 400);

  const { data: authData, error: authError } = await (await createSessionClient()).auth.getUser();
  if (authError || !authData.user) {
    return json({ error: { code: "unauthorized", message: "Sign in to create an order." } }, 401);
  }

  // Keep the payment rail closed until the database, webhook, retry-worker,
  // and owner-approved live verification gates have been completed.
  if (process.env.PAYOS_CHECKOUT_ENABLED !== "true") {
    return json({ error: { code: "temporarily_unavailable", message: "Checkout is not enabled." } }, 503);
  }
  const payosConfig = getPayOsConfig();
  if (!payosConfig) return json({ error: { code: "temporarily_unavailable", message: "Checkout is not configured." } }, 503);

  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey?.startsWith("sb_secret_")) {
    return json({ error: { code: "temporarily_unavailable", message: "Order creation is not configured." } }, 503);
  }

  try {
    const { url } = getSupabaseConfig();
    const admin = createSupabaseClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await admin.rpc("create_ticket_order_v3", {
      p_user_id: authData.user.id,
      p_idempotency_key: input.idempotencyKey,
      p_attendee_name: input.name,
      p_attendee_email: input.email,
      p_attendee_phone: input.phone,
      p_attendee_gender: input.gender,
      p_attendee_birth_year: input.birthYear,
      p_quantity: input.quantity,
      p_merch_option: input.merch,
    });

    if (error) {
      if (error.code === "23505" && error.message.includes("idempotency_payload_conflict")) {
        return json({ error: { code: "idempotency_conflict", message: "This request key was already used for a different order." } }, 409);
      }
      if (error.code === "PGRST202" || error.code === "42883") {
        return json({ error: { code: "temporarily_unavailable", message: "Order service is not ready." } }, 503);
      }
      return json({ error: { code: "temporarily_unavailable", message: "Order could not be created." } }, 503);
    }

    const order = Array.isArray(data) ? data[0] : null;
    if (!order || typeof order.order_id !== "string") {
      return json({ error: { code: "temporarily_unavailable", message: "Order could not be confirmed." } }, 503);
    }

    if (order.order_status !== "pending_payment" || !Number.isSafeInteger(order.total_vnd)) {
      if (order.order_status === "reconciliation") {
        return json({ error: { code: "checkout_reconciliation_required", message: "Checkout needs manual reconciliation." } }, 409);
      }
      return json({ error: { code: "order_not_payable", message: "This order is no longer available for payment." } }, 409);
    }

    const { data: paymentData, error: paymentError } = await admin.rpc("prepare_payos_checkout", {
      p_order_id: order.order_id,
      p_user_id: authData.user.id,
      p_payment_link_id: null,
      p_checkout_url: null,
    });
    if (paymentError) {
      logCheckoutRpcFailure("prepare", paymentError.code);
      if (paymentError.code === "P0002") {
        return json({ error: { code: "order_not_found", message: "Order could not be found." } }, 404);
      }
      if (paymentError.code === "PGRST202" || paymentError.code === "42883") {
        return json({ error: { code: "temporarily_unavailable", message: "Payment service is not ready." } }, 503);
      }
      return json({ error: { code: "temporarily_unavailable", message: "Checkout could not be prepared." } }, 503);
    }
    const payment = Array.isArray(paymentData) ? paymentData[0] : null;
    if (!payment || payment.payment_status !== "pending" || payment.amount_vnd !== order.total_vnd || payment.currency !== "VND" || !Number.isSafeInteger(payment.order_code)) {
      return json({ error: { code: "order_not_payable", message: "This order is no longer available for payment." } }, 409);
    }
    let checkoutUrl: string;
    if (typeof payment.checkout_url === "string" && payment.payment_link_id) {
      checkoutUrl = payment.checkout_url;
    } else {
      let link: PayOsLink | null = null;
      if (payment.can_create !== true) {
        if (payment.can_reconcile !== true) {
          return json({ error: { code: "checkout_pending", message: "Checkout is being prepared. Retry shortly." } }, 409);
        }
        try {
          link = await lookupPayOsPaymentLink({ amountVnd: order.total_vnd, orderCode: payment.order_code, config: payosConfig });
        } catch (error) {
          console.error("payos_checkout_failed", payOsErrorDiagnostic(error));
          return json({ error: { code: "checkout_reconciliation_required", message: "Checkout needs manual reconciliation." } }, 503);
        }
        if (!link) {
          await admin.rpc("mark_payos_checkout_reconciliation", { p_order_code: payment.order_code });
          return json({ error: { code: "checkout_reconciliation_required", message: "Checkout needs manual reconciliation." } }, 409);
        }
        if (!link) return json({ error: { code: "checkout_reconciliation_required", message: "Checkout needs manual reconciliation." } }, 503);
      } else {
        try {
          link = await createPayOsPaymentLink({ orderId: order.order_id, orderCode: payment.order_code, amountVnd: order.total_vnd, config: payosConfig, expiresAt: payment.expires_at });
        } catch (error) {
          console.error("payos_checkout_failed", payOsErrorDiagnostic(error));
          await admin.rpc("mark_payos_checkout_reconciliation", { p_order_code: payment.order_code });
          return json({ error: { code: "checkout_reconciliation_required", message: "Checkout needs manual reconciliation." } }, 503);
        }
      }
      const { error: saveError } = await admin.rpc("prepare_payos_checkout", {
        p_order_id: order.order_id,
        p_user_id: authData.user.id,
        p_payment_link_id: link.paymentLinkId,
        p_checkout_url: link.checkoutUrl,
      });
      if (saveError) {
        logCheckoutRpcFailure("persist", saveError.code);
        return json({ error: { code: "temporarily_unavailable", message: "Checkout could not be prepared." } }, 503);
      }
      checkoutUrl = link.checkoutUrl;
    }

    return json({
      order: {
        id: order.order_id,
        quantity: order.quantity,
        unitPriceVnd: order.unit_price_vnd,
        ticketSubtotalVnd: order.ticket_subtotal_vnd,
        merchOption: order.merch_option,
        merchPriceVnd: order.merch_price_vnd,
        totalVnd: order.total_vnd,
        status: order.order_status,
        reused: order.reused,
      },
      checkoutUrl,
    }, 201);
  } catch {
    return json({ error: { code: "temporarily_unavailable", message: "Order service is unavailable." } }, 503);
  }
}

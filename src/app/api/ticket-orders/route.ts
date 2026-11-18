import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getSiteOrigin, getSupabaseConfig } from "@/lib/supabase/config";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { SURVEY_RPC, type TicketSurvey } from "@/lib/ticket-orders/survey";
import { validateCreateTicketOrder } from "@/lib/ticket-orders/validation";
import { createPayOsPaymentLink, getPayOsConfig, lookupPayOsPaymentLink, payOsErrorDiagnostic, type PayOsLink, type PayOsOperationObserver } from "@/lib/payments/payos/checkout";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 8 * 1024;
const noStore = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const CHECKOUT_RPC_CODES = new Set(["42702", "42883", "42501", "23514", "23505", "P0002", "PGRST202"]);
const TIMING_NAMES = ["request_validation", "auth", "order_checkout_rpc", "payos_create", "payos_lookup", "checkout_persist_rpc", "total"] as const;
type TimingName = (typeof TIMING_NAMES)[number];
type V5CheckoutRow = Record<string, unknown>;

function logCheckoutRpcFailure(stage: "prepare" | "persist", code: unknown) {
  console.error("payos_checkout_rpc_failed", {
    stage,
    code: typeof code === "string" && CHECKOUT_RPC_CODES.has(code) ? code : "unknown",
  });
}

// Upper bound on how long a 201 waits for the survey save; the link is returned either way.
const SURVEY_JOIN_TIMEOUT_MS = 1500;
type SurveySaveFailure = "timeout" | "rpc_error" | "unexpected";
type RpcClient = { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<unknown> };

// Logs only a fixed reason and an allowlisted SQLSTATE: never order, user or answer data.
function logSurveySaveFailure(reason: SurveySaveFailure, code?: unknown) {
  console.error("ticket_survey_save_failed", {
    reason,
    code: typeof code === "string" && CHECKOUT_RPC_CODES.has(code) ? code : "unknown",
  });
}

// Starts the survey save; the returned promise never rejects (failures are logged here).
function startSurveySave(admin: RpcClient, orderId: string, userId: string, survey: TicketSurvey): Promise<void> {
  try {
    return Promise.resolve(admin.rpc(SURVEY_RPC.upsert, {
      p_order_id: orderId,
      p_user_id: userId,
      p_source: [...survey.source],
      p_area: survey.area,
      p_attendance: survey.attendance,
    })).then((result) => {
      const error = result && typeof result === "object" ? (result as { error?: unknown }).error : undefined;
      if (error) logSurveySaveFailure("rpc_error", typeof error === "object" ? (error as { code?: unknown }).code : undefined);
    }, () => logSurveySaveFailure("unexpected"));
  } catch {
    logSurveySaveFailure("unexpected");
    return Promise.resolve();
  }
}

// Waits for the save at most SURVEY_JOIN_TIMEOUT_MS; never cancels the save and always clears its timer.
async function joinSurveySave(save: Promise<void>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timedOut = await Promise.race([
      save.then(() => false),
      new Promise<boolean>((resolveTimeout) => { timer = setTimeout(() => resolveTimeout(true), SURVEY_JOIN_TIMEOUT_MS); }),
    ]);
    if (timedOut) logSurveySaveFailure("timeout");
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function finiteDuration(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value * 100) / 100) : null;
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

function isSafeSqlState(value: unknown): value is string {
  return typeof value === "string" && /^[0-9A-Z]{5}$/.test(value);
}

function allNull(row: V5CheckoutRow, fields: string[]) {
  return fields.every((field) => row[field] === null);
}

const BASE_FIELDS = ["order_id", "quantity", "unit_price_vnd", "merch_option", "merch_price_vnd", "ticket_subtotal_vnd", "total_vnd", "order_status"];
const CHECKOUT_FIELDS = ["checkout_order_code", "checkout_order_id", "checkout_amount_vnd", "checkout_currency", "checkout_payment_status", "checkout_expires_at", "checkout_payment_link_id", "checkout_url", "checkout_can_create", "checkout_can_reconcile"];

function validBaseOrder(row: V5CheckoutRow) {
  return typeof row.order_id === "string"
    && /^[0-9a-f-]{36}$/iu.test(row.order_id)
    && Number.isSafeInteger(row.quantity) && Number(row.quantity) > 0
    && Number.isSafeInteger(row.unit_price_vnd) && Number(row.unit_price_vnd) > 0
    && typeof row.merch_option === "string"
    && Number.isSafeInteger(row.merch_price_vnd) && Number(row.merch_price_vnd) >= 0
    && Number.isSafeInteger(row.ticket_subtotal_vnd) && Number(row.ticket_subtotal_vnd) > 0
    && Number.isSafeInteger(row.total_vnd) && Number(row.total_vnd) > 0
    && typeof row.order_status === "string"
    && typeof row.reused === "boolean"
    && row.blocked_until === null;
}

function validPreparedCheckout(row: V5CheckoutRow) {
  const expiresAt = typeof row.checkout_expires_at === "string" ? Date.parse(row.checkout_expires_at) : NaN;
  const hasLinkId = typeof row.checkout_payment_link_id === "string" && row.checkout_payment_link_id.length > 0;
  const hasUrl = typeof row.checkout_url === "string" && row.checkout_url.length > 0;
  const validLeaseState = (row.checkout_can_create === true && row.checkout_can_reconcile === false)
    || (row.checkout_can_create === false && row.checkout_can_reconcile === false)
    || (row.checkout_can_create === false && row.checkout_can_reconcile === true);
  return Number.isSafeInteger(row.checkout_order_code)
    && Number(row.checkout_order_code) > 0
    && Number.isSafeInteger(row.checkout_amount_vnd)
    && row.checkout_amount_vnd === row.total_vnd
    && row.checkout_order_id === row.order_id
    && row.checkout_currency === "VND"
    && typeof row.checkout_payment_status === "string"
    && Number.isFinite(expiresAt)
    && validLeaseState
    && (hasLinkId === hasUrl)
    && (!hasUrl || (row.checkout_can_create === false && row.checkout_can_reconcile === false));
}

export async function POST(request: NextRequest) {
  const startedAt = performance.now();
  const timings: Partial<Record<TimingName, number>> = {};
  let validationFinished = false;
  const addSpan = (name: TimingName, duration: number) => {
    const safe = finiteDuration(duration);
    if (safe !== null) timings[name] = safe;
  };
  const finish = (response: NextResponse) => {
    if (!validationFinished) addSpan("request_validation", performance.now() - startedAt);
    addSpan("total", performance.now() - startedAt);
    const values = TIMING_NAMES.filter((name) => timings[name] !== undefined).map((name) => `${name};dur=${timings[name]}`);
    response.headers.set("Server-Timing", values.join(", "));
    return response;
  };
  const json = (body: Record<string, unknown>, status: number, headers?: HeadersInit) => finish(NextResponse.json(body, { status, headers: { ...noStore, ...headers } }));

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
  try { rawBody = await readBoundedBody(request); }
  catch { return json({ error: { code: "invalid_request", message: "Check the request and try again." } }, 400); }
  if (rawBody === null) return json({ error: { code: "payload_too_large", message: "Request is too large." } }, 413);

  let body: unknown;
  try { body = JSON.parse(rawBody); }
  catch { return json({ error: { code: "invalid_request", message: "Check the request and try again." } }, 400); }
  const input = validateCreateTicketOrder(body);
  if (!input) return json({ error: { code: "invalid_request", message: "Check the request and try again." } }, 400);
  addSpan("request_validation", performance.now() - startedAt);
  validationFinished = true;

  const authStartedAt = performance.now();
  const { data: authData, error: authError } = await (await createSessionClient()).auth.getUser();
  addSpan("auth", performance.now() - authStartedAt);
  if (authError || !authData.user) return json({ error: { code: "unauthorized", message: "Sign in to create an order." } }, 401);

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
    const rpcStartedAt = performance.now();
    const { data, error } = await admin.rpc("create_ticket_order_v5", {
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
    addSpan("order_checkout_rpc", performance.now() - rpcStartedAt);

    if (error) {
      if (error.code === "23505" && typeof error.message === "string" && error.message.includes("idempotency_payload_conflict")) {
        return json({ error: { code: "idempotency_conflict", message: "This request key was already used for a different order." } }, 409);
      }
      if (error.code === "PGRST202" || error.code === "42883") {
        return json({ error: { code: "temporarily_unavailable", message: "Order service is not ready." } }, 503);
      }
      return json({ error: { code: "temporarily_unavailable", message: "Order could not be created." } }, 503);
    }

    const row: V5CheckoutRow | null = Array.isArray(data) && data.length === 1 && data[0] && typeof data[0] === "object" ? data[0] as V5CheckoutRow : null;
    if (row?.blocked_until !== undefined && row.blocked_until !== null) {
      const retryAt = typeof row.blocked_until === "string" ? Date.parse(row.blocked_until) : NaN;
      if (row.order_id !== null || row.reused !== false || !allNull(row, BASE_FIELDS) || !allNull(row, CHECKOUT_FIELDS) || row.checkout_prepare_error_code !== null || !Number.isFinite(retryAt) || retryAt <= Date.now()) {
        return json({ error: { code: "temporarily_unavailable", message: "Order could not be confirmed." } }, 503);
      }
      return json({ error: {
        code: "checkout_restricted",
        message: "Tài khoản đã có 3 đơn hết hạn chưa thanh toán trong một giờ. Bạn có thể tạo đơn mới sau thời hạn tạm khóa.",
        retryAt: new Date(retryAt).toISOString(),
      },
      }, 429, { "Retry-After": String(Math.max(1, Math.ceil((retryAt - Date.now()) / 1000))) });
    }
    if (!row || !validBaseOrder(row) || row.checkout_prepare_error_code !== null && row.checkout_prepare_error_code !== undefined) {
      if (row && validBaseOrder(row) && isSafeSqlState(row.checkout_prepare_error_code)) {
        logCheckoutRpcFailure("prepare", row.checkout_prepare_error_code);
        if (row.checkout_prepare_error_code === "P0002") return json({ error: { code: "order_not_found", message: "Order could not be found." } }, 404);
        if (allNull(row, CHECKOUT_FIELDS)) return json({ error: { code: "temporarily_unavailable", message: "Checkout could not be prepared." } }, 503);
      }
      return json({ error: { code: "temporarily_unavailable", message: "Order could not be confirmed." } }, 503);
    }
    if (row.order_status !== "pending_payment") {
      if (!allNull(row, CHECKOUT_FIELDS)) return json({ error: { code: "temporarily_unavailable", message: "Order could not be confirmed." } }, 503);
      if (row.order_status === "reconciliation") {
        return json({ error: { code: "checkout_reconciliation_required", message: "Checkout needs manual reconciliation." } }, 409);
      }
      return json({ error: { code: "order_not_payable", message: "This order is no longer available for payment." } }, 409);
    }
    if (!validPreparedCheckout(row)) return json({ error: { code: "temporarily_unavailable", message: "Order could not be confirmed." } }, 503);
    if (row.checkout_payment_status !== "pending") return json({ error: { code: "order_not_payable", message: "This order is no longer available for payment." } }, 409);

    // Classify once: only a payable order on a branch that can return a link saves the survey.
    const branch = typeof row.checkout_url === "string" && typeof row.checkout_payment_link_id === "string"
      ? "saved-link"
      : row.checkout_can_create === true ? "create" : row.checkout_can_reconcile === true ? "reconcile" : "pending";
    if (branch === "pending") {
      return json({ error: { code: "checkout_pending", message: "Checkout is being prepared. Retry shortly." } }, 409);
    }
    const surveySave = startSurveySave(admin, String(row.order_id), authData.user.id, input.survey);

    let checkoutUrl: string;
    if (branch === "saved-link") {
      checkoutUrl = String(row.checkout_url);
    } else {
      let link: PayOsLink | null = null;
      const observer: PayOsOperationObserver = (stage, duration) => addSpan(stage, duration);
      if (branch === "reconcile") {
        try {
          link = await lookupPayOsPaymentLink({ amountVnd: Number(row.total_vnd), orderCode: Number(row.checkout_order_code), config: payosConfig, observer });
        } catch (error) {
          console.error("payos_checkout_failed", payOsErrorDiagnostic(error));
          return json({ error: { code: "checkout_reconciliation_required", message: "Checkout needs manual reconciliation." } }, 503);
        }
        if (!link) {
          await admin.rpc("mark_payos_checkout_reconciliation", { p_order_code: row.checkout_order_code });
          return json({ error: { code: "checkout_reconciliation_required", message: "Checkout needs manual reconciliation." } }, 409);
        }
      } else {
        try {
          link = await createPayOsPaymentLink({ orderId: String(row.order_id), orderCode: Number(row.checkout_order_code), amountVnd: Number(row.total_vnd), config: payosConfig, expiresAt: String(row.checkout_expires_at), observer });
        } catch (error) {
          console.error("payos_checkout_failed", payOsErrorDiagnostic(error));
          await admin.rpc("mark_payos_checkout_reconciliation", { p_order_code: row.checkout_order_code });
          return json({ error: { code: "checkout_reconciliation_required", message: "Checkout needs manual reconciliation." } }, 503);
        }
      }
      const persistStartedAt = performance.now();
      const { error: saveError } = await admin.rpc("prepare_payos_checkout", {
        p_order_id: row.order_id,
        p_user_id: authData.user.id,
        p_payment_link_id: link.paymentLinkId,
        p_checkout_url: link.checkoutUrl,
      });
      addSpan("checkout_persist_rpc", performance.now() - persistStartedAt);
      if (saveError) {
        logCheckoutRpcFailure("persist", saveError.code);
        return json({ error: { code: "temporarily_unavailable", message: "Checkout could not be prepared." } }, 503);
      }
      checkoutUrl = link.checkoutUrl;
    }

    await joinSurveySave(surveySave);
    return json({
      order: {
        id: row.order_id,
        quantity: row.quantity,
        unitPriceVnd: row.unit_price_vnd,
        ticketSubtotalVnd: row.ticket_subtotal_vnd,
        merchOption: row.merch_option,
        merchPriceVnd: row.merch_price_vnd,
        totalVnd: row.total_vnd,
        status: row.order_status,
        reused: row.reused,
      },
      checkoutUrl,
    }, 201);
  } catch {
    return json({ error: { code: "temporarily_unavailable", message: "Order service is unavailable." } }, 503);
  }
}

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getSiteOrigin } from "@/lib/supabase/config";

export type PayOsConfig = Readonly<{ clientId: string; apiKey: string; checksumKey: string }>;
export type PayOsLink = Readonly<{ checkoutUrl: string; paymentLinkId: string; amount: number; orderCode: number; expiresAt: number }>;
type RecordValue = Record<string, unknown>;

const CHECKOUT_HOSTS = new Set(["pay.payos.vn"]);

export class PayOsProviderError extends Error {
  constructor(readonly stage: "lookup" | "create", readonly status?: number, readonly code?: string) {
    super("PayOS payment link outcome could not be confirmed; automatic retry is disabled.");
    this.name = "PayOsProviderError";
  }
}

export function payOsErrorDiagnostic(error: unknown) {
  return error instanceof PayOsProviderError
    ? { stage: error.stage, status: error.status, code: error.code }
    : { stage: "unknown" };
}

function providerCode(value: unknown): string | undefined {
  const code = record(value)?.code;
  return typeof code === "string" && /^[a-z0-9_-]{1,32}$/iu.test(code) ? code : undefined;
}

function record(value: unknown): RecordValue | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : null;
}

function safeEqualHex(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/iu.test(left) || !/^[a-f0-9]{64}$/iu.test(right)) return false;
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function canonical(data: RecordValue): string {
  return Object.keys(data).sort().filter((key) => data[key] !== undefined).map((key) => {
    let value = data[key];
    if (Array.isArray(value)) {
      value = JSON.stringify(value.map((entry) => {
        const object = record(entry);
        return object ? Object.fromEntries(Object.keys(object).sort().map((key) => [key, object[key]])) : entry;
      }));
    }
    const normalized = value === null || value === "null" || value === "undefined" ? "" : String(value);
    return `${key}=${normalized}`;
  }).join("&");
}

export function getPayOsConfig(env: Partial<NodeJS.ProcessEnv> = process.env): PayOsConfig | null {
  const clientId = env.PAYOS_CLIENT_ID?.trim();
  const apiKey = env.PAYOS_API_KEY?.trim();
  const checksumKey = env.PAYOS_CHECKSUM_KEY?.trim();
  if (!clientId || !apiKey || !checksumKey || clientId.length > 200 || apiKey.length > 500 || checksumKey.length > 500) return null;
  return { clientId, apiKey, checksumKey };
}

export function signPayOsCreateLink(input: { amount: number; cancelUrl: string; description: string; orderCode: number; returnUrl: string }, checksumKey: string): string {
  if (!Number.isSafeInteger(input.amount) || input.amount < 1 || !Number.isSafeInteger(input.orderCode) || input.orderCode < 1 || input.orderCode > 2147483647) throw new Error("Invalid PayOS payment data.");
  const ordered = `amount=${input.amount}&cancelUrl=${input.cancelUrl}&description=${input.description}&orderCode=${input.orderCode}&returnUrl=${input.returnUrl}`;
  return createHmac("sha256", checksumKey).update(ordered, "utf8").digest("hex");
}

export function verifyPayOsWebhook(value: unknown, checksumKey: string): RecordValue | null {
  const root = record(value);
  const data = record(root?.data);
  const signature = root?.signature;
  if (!data || typeof signature !== "string") return null;
  const expected = createHmac("sha256", checksumKey).update(canonical(data), "utf8").digest("hex");
  return safeEqualHex(signature, expected) ? root : null;
}

export function validatePayOsLinkResponse(value: unknown, expected: { amount: number; orderCode: number; checksumKey: string }): PayOsLink | null {
  const root = record(value);
  const data = record(root?.data);
  if (!root || !data || root.code !== "00" || typeof root.signature !== "string") return null;
  const expectedSignature = createHmac("sha256", expected.checksumKey).update(canonical(data), "utf8").digest("hex");
  if (!safeEqualHex(root.signature, expectedSignature)) return null;
  if (data.amount !== expected.amount || data.orderCode !== expected.orderCode || data.currency !== "VND") return null;
  if (typeof data.paymentLinkId !== "string" || data.paymentLinkId.length < 1 || data.paymentLinkId.length > 120) return null;
  if (typeof data.checkoutUrl !== "string") return null;
  let url: URL;
  try { url = new URL(data.checkoutUrl); } catch { return null; }
  if (url.protocol !== "https:" || !CHECKOUT_HOSTS.has(url.hostname) || url.username || url.password) return null;
  const expiresAt = Math.floor(Date.now() / 1000) + 300;
  return { checkoutUrl: url.toString(), paymentLinkId: data.paymentLinkId, amount: expected.amount, orderCode: expected.orderCode, expiresAt };
}

export async function lookupPayOsPaymentLink(input: { amountVnd: number; orderCode: number; config: PayOsConfig; fetchImpl?: typeof fetch }): Promise<PayOsLink | null> {
  let response: Response;
  try { response = await (input.fetchImpl ?? fetch)(`https://api-merchant.payos.vn/v2/payment-requests/${input.orderCode}`, {
    method: "GET",
    headers: { "x-client-id": input.config.clientId, "x-api-key": input.config.apiKey },
    signal: AbortSignal.timeout(8000),
  }); } catch { throw new PayOsProviderError("lookup"); }
  if (response.status === 404) return null;
  const root = await response.json().catch(() => null);
  const data = record(record(root)?.data);
  const signature = record(root)?.signature;
  if (!response.ok || record(root)?.code !== "00" || !data || typeof signature !== "string"
    || !safeEqualHex(signature, createHmac("sha256", input.config.checksumKey).update(canonical(data), "utf8").digest("hex"))
    || data.amount !== input.amountVnd || data.orderCode !== input.orderCode
    || data.status !== "PENDING" || data.amountPaid !== 0 || data.amountRemaining !== input.amountVnd
    || typeof data.id !== "string" || !/^[a-f0-9]{32}$/iu.test(data.id)) {
    throw new PayOsProviderError("lookup", response.status, providerCode(root));
  }
  // GET returns its signed id rather than the POST checkoutUrl/paymentLinkId.
  return { paymentLinkId: data.id, checkoutUrl: `https://pay.payos.vn/web/${data.id}`, amount: input.amountVnd, orderCode: input.orderCode, expiresAt: Math.floor(Date.now() / 1000) + 300 };
}

export async function createPayOsPaymentLink(input: { orderId: string; orderCode: number; amountVnd: number; config: PayOsConfig; siteOrigin?: string; fetchImpl?: typeof fetch; now?: number; expiresAt?: string }): Promise<PayOsLink> {
  if (!/^[0-9a-f-]{36}$/iu.test(input.orderId) || !Number.isSafeInteger(input.amountVnd) || input.amountVnd < 1) throw new Error("Invalid order for PayOS.");
  const origin = input.siteOrigin ?? getSiteOrigin();
  const returnUrl = new URL("/payment/return", origin);
  returnUrl.searchParams.set("orderId", input.orderId);
  const cancelUrl = new URL(returnUrl);
  cancelUrl.searchParams.set("cancelled", "1");
  // PayOS limits descriptions to nine characters for certain bank channels.
  // The durable orderCode remains the unique, complete internal mapping.
  const description = "REPLY199X";
  const amount = input.amountVnd;
  const orderCode = input.orderCode;
  const createSignature = signPayOsCreateLink({ amount, cancelUrl: cancelUrl.toString(), description, orderCode, returnUrl: returnUrl.toString() }, input.config.checksumKey);
  const nowMs = input.now ?? Date.now();
  const expiresAtMs = input.expiresAt ? Date.parse(input.expiresAt) : nowMs + 300_000;
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) throw new Error("PayOS payment expiry is invalid.");
  const expiredAt = Math.floor(expiresAtMs / 1000);
  // Only called for the DB's one-time can_create claim. Subsequent attempts
  // use lookup only, even after the creation lease expires.
  let response: Response;
  try {
    response = await (input.fetchImpl ?? fetch)("https://api-merchant.payos.vn/v2/payment-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-client-id": input.config.clientId, "x-api-key": input.config.apiKey },
      body: JSON.stringify({ orderCode, amount, description, cancelUrl: cancelUrl.toString(), returnUrl: returnUrl.toString(), expiredAt, signature: createSignature }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    const reconciled = await lookupPayOsPaymentLink({ amountVnd: amount, orderCode, config: input.config, fetchImpl: input.fetchImpl });
    if (reconciled) return reconciled;
    throw new PayOsProviderError("create");
  }
  if (!response.ok) {
    if (response.status >= 500) {
      const reconciled = await lookupPayOsPaymentLink({ amountVnd: amount, orderCode, config: input.config, fetchImpl: input.fetchImpl });
      if (reconciled) return reconciled;
      throw new PayOsProviderError("create", response.status);
    }
    const body = await response.json().catch(() => null);
    throw new PayOsProviderError("create", response.status, providerCode(body));
  }
  const body = await response.json().catch(() => null);
  const result = validatePayOsLinkResponse(body, { amount, orderCode, checksumKey: input.config.checksumKey });
  if (!result) throw new PayOsProviderError("create", response.status, providerCode(body));
  return { ...result, expiresAt: expiredAt };
}

export function payOsWebhookValidationIssue(value: unknown, checksumKey: string): string | null {
  const root = verifyPayOsWebhook(value, checksumKey);
  const data = record(root?.data);
  if (!root || !data) return "invalid_signature";
  if (typeof data.code !== "string" || !/^[0-9]{2}$/.test(data.code)) return "data_code";
  const success = data.code === "00" && root.success !== false;
  if (success && root.code !== undefined && root.code !== "00") return "root_code";
  if (root.success === true && data.code !== "00") return "data_code";
  if (!Number.isSafeInteger(data.orderCode) || (data.orderCode as number) < 1) return "order_code";
  if (!Number.isSafeInteger(data.amount) || (data.amount as number) < 1) return "amount";
  if (typeof data.paymentLinkId !== "string" || !data.paymentLinkId || data.paymentLinkId.length > 120) return "payment_link_id";
  if (typeof data.currency !== "string" || data.currency.length > 8) return "currency";
  if (success && (typeof data.reference !== "string" || !data.reference)) return "reference";
  return null;
}

export function parsePayOsWebhook(value: unknown, checksumKey: string): { orderCode: number; amount: number; currency: string; paymentLinkId: string; reference: string; eventId: string; success: boolean } | null {
  if (payOsWebhookValidationIssue(value, checksumKey)) return null;
  const root = record(value)!;
  const data = record(root.data)!;
  const { orderCode, amount, paymentLinkId } = data;
  const rawReference = data.reference;
  const reference = typeof rawReference === "string" && rawReference.length <= 120
    ? rawReference
    : `payos-${createHash("sha256").update(canonical(data), "utf8").digest("hex")}`;
  // Only data is HMAC-signed. Some registration probes omit the outer boolean;
  // derive success from signed code, retaining an explicit false as a veto.
  return { orderCode: orderCode as number, amount: amount as number, currency: data.currency as string, paymentLinkId: paymentLinkId as string, reference, eventId: reference, success: data.code === "00" && root.success !== false };
}

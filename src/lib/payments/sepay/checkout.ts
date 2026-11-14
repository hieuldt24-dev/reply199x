import { createHmac, timingSafeEqual } from "node:crypto";
import { getSiteOrigin } from "@/lib/supabase/config";

export type SepayEnvironment = "sandbox" | "production";

export type SepayCheckoutFields = Readonly<{
  order_amount: string;
  merchant: string;
  currency: "VND";
  operation: "PURCHASE";
  order_description: string;
  order_invoice_number: string;
  payment_method: "BANK_TRANSFER";
  success_url: string;
  error_url: string;
  cancel_url: string;
  lang: "vi";
  signature: string;
}>;

export type SepayCheckoutConfig = Readonly<{
  merchantId: string;
  merchantSecret: string;
  environment: SepayEnvironment;
}>;

const CHECKOUT_URLS: Record<SepayEnvironment, string> = {
  sandbox: "https://pay-sandbox.sepay.vn/v1/checkout/init",
  production: "https://pay.sepay.vn/v1/checkout/init",
};

const SIGNED_FIELD_ORDER = [
  "order_amount",
  "merchant",
  "currency",
  "operation",
  "order_description",
  "order_invoice_number",
  "payment_method",
  "success_url",
  "error_url",
  "cancel_url",
] as const satisfies readonly (keyof Omit<SepayCheckoutFields, "signature" | "lang">)[];

export function getSepayCheckoutConfig(env: Partial<NodeJS.ProcessEnv> = process.env): SepayCheckoutConfig | null {
  const merchantId = env.SEPAY_MERCHANT_ID?.trim();
  const merchantSecret = env.SEPAY_MERCHANT_SECRET?.trim();
  const environment = env.SEPAY_ENVIRONMENT?.trim();
  if (!merchantId || !merchantSecret || (environment !== "sandbox" && environment !== "production")) return null;
  if (merchantId.length > 100 || merchantSecret.length > 500) return null;
  return { merchantId, merchantSecret, environment };
}

export function createSepayCheckoutForm(input: {
  orderId: string;
  amountVnd: number;
  config: SepayCheckoutConfig;
  siteOrigin?: string;
}): { action: string; fields: SepayCheckoutFields } {
  const { orderId, amountVnd, config } = input;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(orderId)) throw new Error("Invalid order identifier.");
  if (!Number.isSafeInteger(amountVnd) || amountVnd <= 0) throw new Error("Invalid payment amount.");

  const siteOrigin = input.siteOrigin ?? getSiteOrigin();
  const resultUrl = new URL("/payment/return", siteOrigin);
  resultUrl.searchParams.set("orderId", orderId);
  const fieldsWithoutSignature = {
    order_amount: String(amountVnd),
    merchant: config.merchantId,
    currency: "VND" as const,
    operation: "PURCHASE" as const,
    order_description: `REPLY 199X ticket order ${orderId}`,
    order_invoice_number: `REPLY199X-${orderId}`,
    payment_method: "BANK_TRANSFER" as const,
    success_url: resultUrl.toString(),
    error_url: resultUrl.toString(),
    cancel_url: resultUrl.toString(),
    lang: "vi" as const,
  };
  const signedString = SIGNED_FIELD_ORDER
    .map((name) => `${name}=${fieldsWithoutSignature[name]}`)
    .join(",");
  const signature = createHmac("sha256", config.merchantSecret).update(signedString, "utf8").digest("base64");
  return {
    action: CHECKOUT_URLS[config.environment],
    fields: { ...fieldsWithoutSignature, signature },
  };
}

export function verifySepayIpnSecret(received: string | null, expected: string | undefined): boolean {
  if (!received || !expected) return false;
  const supplied = Buffer.from(received, "utf8");
  const configured = Buffer.from(expected, "utf8");
  if (supplied.length !== configured.length) return false;
  return timingSafeEqual(supplied, configured);
}

type SepayIpnRecord = Readonly<Record<string, unknown>>;

export type SepayGatewayIpn = Readonly<{
  providerEventId: string;
  providerTransactionId: string;
  providerReference: string;
  notificationType: "ORDER_PAID" | "TRANSACTION_VOID";
  orderStatus: string;
  orderCurrency: string;
  orderAmountVnd: number;
  transactionStatus: string;
  transactionCurrency: string;
  transactionAmountVnd: number;
}>;

function asRecord(value: unknown): SepayIpnRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as SepayIpnRecord
    : null;
}

function parseVnd(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const input = String(value);
  if (!/^\d+(?:\.0{1,2})?$/u.test(input)) return null;
  const amount = Number(input);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function boundedString(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength ? value : null;
}

export function parseSepayGatewayIpn(value: unknown): SepayGatewayIpn | null {
  const root = asRecord(value);
  const order = asRecord(root?.order);
  const transaction = asRecord(root?.transaction);
  if (!root || !order || !transaction || !Number.isSafeInteger(root.timestamp)) return null;
  if (root.notification_type !== "ORDER_PAID" && root.notification_type !== "TRANSACTION_VOID") return null;

  const eventId = boundedString(transaction.id, 80);
  const transactionId = boundedString(transaction.transaction_id, 120);
  const invoice = boundedString(order.order_invoice_number, 80);
  const orderStatus = boundedString(order.order_status, 40);
  const orderCurrency = boundedString(order.order_currency, 3);
  const transactionStatus = boundedString(transaction.transaction_status, 40);
  const transactionCurrency = boundedString(transaction.transaction_currency, 3);
  const orderAmountVnd = parseVnd(order.order_amount);
  const transactionAmountVnd = parseVnd(transaction.transaction_amount);
  if (!eventId || !transactionId || !invoice || !orderStatus || !orderCurrency ||
    !transactionStatus || !transactionCurrency || orderAmountVnd === null || transactionAmountVnd === null) return null;

  return {
    providerEventId: `${root.notification_type}:${eventId}`,
    providerTransactionId: transactionId,
    providerReference: invoice,
    notificationType: root.notification_type,
    orderStatus,
    orderCurrency,
    orderAmountVnd,
    transactionStatus,
    transactionCurrency,
    transactionAmountVnd,
  };
}

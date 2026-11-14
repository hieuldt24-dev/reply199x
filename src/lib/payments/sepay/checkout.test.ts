import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createSepayCheckoutForm,
  getSepayCheckoutConfig,
  parseSepayGatewayIpn,
  verifySepayIpnSecret,
} from "./checkout";

const orderId = "7d444840-9dc0-4e22-a132-5a1ae8a4f1d0";

describe("SePay hosted checkout", () => {
  it("signs the documented ordered fields and selects the sandbox checkout host", () => {
    const config = { merchantId: "MERCHANT_TEST", merchantSecret: "merchant-secret", environment: "sandbox" as const };
    const result = createSepayCheckoutForm({ orderId, amountVnd: 268000, config, siteOrigin: "https://reply.example" });
    const signed = [
      `order_amount=268000`,
      `merchant=MERCHANT_TEST`,
      `currency=VND`,
      `operation=PURCHASE`,
      `order_description=REPLY 199X ticket order ${orderId}`,
      `order_invoice_number=REPLY199X-${orderId}`,
      `payment_method=BANK_TRANSFER`,
      `success_url=https://reply.example/payment/return?orderId=${orderId}`,
      `error_url=https://reply.example/payment/return?orderId=${orderId}`,
      `cancel_url=https://reply.example/payment/return?orderId=${orderId}`,
    ].join(",");
    const expected = createHmac("sha256", config.merchantSecret).update(signed).digest("base64");
    expect(result.action).toBe("https://pay-sandbox.sepay.vn/v1/checkout/init");
    expect(result.fields.signature).toBe(expected);
    expect(result.fields.order_invoice_number).toBe(`REPLY199X-${orderId}`);
  });

  it("fails closed when keys or an explicit sandbox/production mode are missing", () => {
    expect(getSepayCheckoutConfig({})).toBeNull();
    expect(getSepayCheckoutConfig({ SEPAY_MERCHANT_ID: "merchant", SEPAY_MERCHANT_SECRET: "secret" })).toBeNull();
  });

  it("rejects invalid order IDs and non-integer VND amounts", () => {
    const config = { merchantId: "M", merchantSecret: "S", environment: "production" as const };
    expect(() => createSepayCheckoutForm({ orderId: "bad", amountVnd: 1000, config })).toThrow("Invalid order identifier");
    expect(() => createSepayCheckoutForm({ orderId, amountVnd: 1000.5, config })).toThrow("Invalid payment amount");
  });
});

describe("SePay Gateway IPN contract", () => {
  const payload = {
    timestamp: 1757058220,
    notification_type: "ORDER_PAID",
    order: { order_status: "CAPTURED", order_currency: "VND", order_amount: "268000.00", order_invoice_number: `REPLY199X-${orderId}` },
    transaction: { id: "ipn-event-1", transaction_id: "sepay-txn-1", transaction_status: "APPROVED", transaction_currency: "VND", transaction_amount: "268000" },
    customer: { id: "customer" },
  };

  it("extracts normalized payment evidence without carrying customer or card PII", () => {
    expect(parseSepayGatewayIpn(payload)).toEqual({
      providerEventId: "ORDER_PAID:ipn-event-1",
      providerTransactionId: "sepay-txn-1",
      providerReference: `REPLY199X-${orderId}`,
      notificationType: "ORDER_PAID",
      orderStatus: "CAPTURED",
      orderCurrency: "VND",
      orderAmountVnd: 268000,
      transactionStatus: "APPROVED",
      transactionCurrency: "VND",
      transactionAmountVnd: 268000,
    });
  });

  it("rejects malformed or fractional-VND payloads", () => {
    expect(parseSepayGatewayIpn({ ...payload, transaction: { ...payload.transaction, transaction_amount: "268000.01" } })).toBeNull();
    expect(parseSepayGatewayIpn({ ...payload, notification_type: "RETURNED" })).toBeNull();
  });

  it("compares the IPN secret without accepting missing or wrong values", () => {
    expect(verifySepayIpnSecret("secret", "secret")).toBe(true);
    expect(verifySepayIpnSecret("wrong", "secret")).toBe(false);
    expect(verifySepayIpnSecret(null, "secret")).toBe(false);
    expect(verifySepayIpnSecret("secret", undefined)).toBe(false);
  });
});

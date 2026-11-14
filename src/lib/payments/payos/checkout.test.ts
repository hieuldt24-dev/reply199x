import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createPayOsPaymentLink, getPayOsConfig, lookupPayOsPaymentLink, parsePayOsWebhook, payOsErrorDiagnostic, signPayOsCreateLink, validatePayOsLinkResponse } from "./checkout";

describe("PayOS payment-link contract", () => {
  it("uses the one-time create claim for one POST without a speculative lookup", async () => {
    const data = { amount: 169000, orderCode: 77, currency: "VND", paymentLinkId: "plink-77", checkoutUrl: "https://pay.payos.vn/web/plink-77" };
    const signed = "amount=169000&checkoutUrl=https://pay.payos.vn/web/plink-77&currency=VND&orderCode=77&paymentLinkId=plink-77";
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ code: "00", data, signature: createHmac("sha256", "checksum").update(signed).digest("hex") }));
    await expect(createPayOsPaymentLink({ orderId: "7d444840-9dc0-4e22-a132-5a1ae8a4f1d0", orderCode: 77, amountVnd: 169000, config: { clientId: "id", apiKey: "key", checksumKey: "checksum" }, siteOrigin: "https://reply.test", fetchImpl: fetchMock })).resolves.toMatchObject({ paymentLinkId: "plink-77" });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
  });

  it("fails closed on undocumented lookup business errors and exposes only safe diagnostics", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ code: "UNKNOWN", desc: "private provider detail", data: null }));
    const error = await lookupPayOsPaymentLink({ amountVnd: 169000, orderCode: 77, config: { clientId: "id", apiKey: "key", checksumKey: "checksum" }, fetchImpl: fetchMock }).catch((error: unknown) => error);
    expect(payOsErrorDiagnostic(error)).toEqual({ stage: "lookup", status: 200, code: "UNKNOWN" });
    expect(JSON.stringify(payOsErrorDiagnostic(error))).not.toContain("private");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("verifies signed GET transaction arrays and rejects a terminal or tampered payment", async () => {
    const data = { id: "124c33293c934a85be5b7f8761a27a07", amount: 169000, orderCode: 77, amountPaid: 169000, amountRemaining: 0, status: "PAID", transactions: [{ reference: "ref", amount: 169000 }] };
    const canonical = 'amount=169000&amountPaid=169000&amountRemaining=0&id=124c33293c934a85be5b7f8761a27a07&orderCode=77&status=PAID&transactions=[{"amount":169000,"reference":"ref"}]';
    const signature = createHmac("sha256", "checksum").update(canonical).digest("hex");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ code: "00", data, signature }));
    await expect(lookupPayOsPaymentLink({ amountVnd: 169000, orderCode: 77, config: { clientId: "id", apiKey: "key", checksumKey: "checksum" }, fetchImpl: fetchMock })).rejects.toThrow();
  });
  it("signs exactly the documented sorted create-link fields", () => {
    const fields = { amount: 268000, cancelUrl: "https://reply.test/payment/return?cancelled=1", description: "REPLY199X order", orderCode: 12345, returnUrl: "https://reply.test/payment/return" };
    const signature = createHmac("sha256", "checksum").update("amount=268000&cancelUrl=https://reply.test/payment/return?cancelled=1&description=REPLY199X order&orderCode=12345&returnUrl=https://reply.test/payment/return").digest("hex");
    expect(signPayOsCreateLink(fields, "checksum")).toBe(signature);
  });

  it("fails closed without server credentials", () => {
    expect(getPayOsConfig({})).toBeNull();
    expect(getPayOsConfig({ PAYOS_CLIENT_ID: "client", PAYOS_API_KEY: "key" })).toBeNull();
  });

  it("rejects an untrusted checkout URL or invalid API response", () => {
    expect(validatePayOsLinkResponse({ code: "00", signature: "0".repeat(64), data: {} }, { amount: 268000, orderCode: 1, checksumKey: "secret" })).toBeNull();
    expect(validatePayOsLinkResponse({ code: "00", signature: "0".repeat(64), data: { checkoutUrl: "https://evil.test/pay", amount: 268000, orderCode: 1, currency: "VND", paymentLinkId: "abc" } }, { amount: 268000, orderCode: 1, checksumKey: "secret" })).toBeNull();
  });

  it("verifies the complete signed API data and accepts only a PayOS HTTPS host", () => {
    const data = { amount: 268000, orderCode: 2, currency: "VND", paymentLinkId: "link-2", checkoutUrl: "https://pay.payos.vn/web/link-2", description: "ticket" };
    const canonical = "amount=268000&checkoutUrl=https://pay.payos.vn/web/link-2&currency=VND&description=ticket&orderCode=2&paymentLinkId=link-2";
    const signature = createHmac("sha256", "checksum").update(canonical).digest("hex");
    expect(validatePayOsLinkResponse({ code: "00", signature, data }, { amount: 268000, orderCode: 2, checksumKey: "checksum" })).toMatchObject({ checkoutUrl: data.checkoutUrl, paymentLinkId: "link-2" });
    const unsafeData = { ...data, checkoutUrl: "https://evil.test/link-2" };
    const unsafeSignature = createHmac("sha256", "checksum").update(Object.keys(unsafeData).sort().map((key) => `${key}=${unsafeData[key as keyof typeof unsafeData]}`).join("&")).digest("hex");
    expect(validatePayOsLinkResponse({ code: "00", signature: unsafeSignature, data: unsafeData }, { amount: 268000, orderCode: 2, checksumKey: "checksum" })).toBeNull();
  });

  it("reconciles an ambiguous create timeout by orderCode and never blindly repeats create", async () => {
    const data = { id: "124c33293c934a85be5b7f8761a27a07", amount: 169000, orderCode: 77, amountPaid: 0, amountRemaining: 169000, status: "PENDING", transactions: [], createdAt: "2026-11-14T10:00:00Z" };
    const canonical = 'amount=169000&amountPaid=0&amountRemaining=169000&createdAt=2026-11-14T10:00:00Z&id=124c33293c934a85be5b7f8761a27a07&orderCode=77&status=PENDING&transactions=[]';
    const signature = createHmac("sha256", "checksum").update(canonical).digest("hex");
    const fetchMock = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("ambiguous network timeout"))
      .mockResolvedValueOnce(Response.json({ code: "00", signature, data }));
    const link = await createPayOsPaymentLink({ orderId: "7d444840-9dc0-4e22-a132-5a1ae8a4f1d0", orderCode: 77, amountVnd: 169000, config: { clientId: "id", apiKey: "key", checksumKey: "checksum" }, siteOrigin: "https://reply.test", fetchImpl: fetchMock });
    expect(link.paymentLinkId).toBe(data.id);
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).description).toBe("REPLY199X");
    expect(fetchMock.mock.calls.map((call) => call[1]?.method ?? "GET")).toEqual(["POST", "GET"]);
  });

  it("does not POST when the orderCode reconciliation lookup is unavailable", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error("provider lookup unavailable"));
    await expect(lookupPayOsPaymentLink({ orderCode: 77, amountVnd: 169000, config: { clientId: "id", apiKey: "key", checksumKey: "checksum" }, fetchImpl: fetchMock })).rejects.toThrow("automatic retry is disabled");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("GET");
  });

  it("does not issue another POST when timeout reconciliation still returns not found", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("ambiguous timeout"))
      .mockResolvedValueOnce(new Response("{}", { status: 404 }));
    await expect(createPayOsPaymentLink({ orderId: "7d444840-9dc0-4e22-a132-5a1ae8a4f1d0", orderCode: 77, amountVnd: 169000, config: { clientId: "id", apiKey: "key", checksumKey: "checksum" }, fetchImpl: fetchMock })).rejects.toThrow("automatic retry is disabled");
    expect(fetchMock.mock.calls.filter((call) => call[1]?.method === "POST")).toHaveLength(1);
  });

  it("accepts only a correctly signed success webhook with matching required field shapes", () => {
    const data = { orderCode: 31, amount: 268000, currency: "VND", paymentLinkId: "plink-1", reference: "bank-ref-1", code: "00" };
    const canonical = "amount=268000&code=00&currency=VND&orderCode=31&paymentLinkId=plink-1&reference=bank-ref-1";
    const signature = createHmac("sha256", "checksum").update(canonical).digest("hex");
    expect(parsePayOsWebhook({ success: true, code: "00", data, signature }, "checksum")).toMatchObject({ orderCode: 31, amount: 268000, currency: "VND", paymentLinkId: "plink-1", reference: "bank-ref-1", success: true });
    expect(parsePayOsWebhook({ success: true, code: "01", data, signature }, "checksum")).toBeNull();
    const failedData = { ...data, reference: undefined, code: "01" };
    const failedSignature = createHmac("sha256", "checksum").update(Object.keys(failedData).sort().filter((key) => failedData[key as keyof typeof failedData] !== undefined).map((key) => `${key}=${failedData[key as keyof typeof failedData] ?? ""}`).join("&")).digest("hex");
    expect(parsePayOsWebhook({ success: false, code: "01", data: failedData, signature: failedSignature }, "checksum")).toMatchObject({ success: false });
    expect(parsePayOsWebhook({ success: true, code: "00", data: { ...data, amount: 1 }, signature }, "checksum")).toBeNull();
  });
});

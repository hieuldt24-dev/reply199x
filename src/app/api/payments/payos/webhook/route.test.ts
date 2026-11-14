import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const { rpc, createClient } = vi.hoisted(() => ({ rpc: vi.fn(), createClient: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient }));
const { drain } = vi.hoisted(() => ({ drain: vi.fn() }));
vi.mock("@/lib/ticket-registration/outbox-worker", () => ({ drainPaidTicketSheetOutbox: drain }));

function signedRequest(overrides: { success?: boolean; code?: string; data?: Record<string, unknown> } = {}) {
  const data = overrides.data ?? { orderCode: 1234, amount: 169000, currency: "VND", paymentLinkId: "plink-1", reference: "bank-ref-1", code: "00" };
  const canonical = Object.keys(data).sort().map((key) => `${key}=${data[key] == null ? "" : String(data[key])}`).join("&");
  const signature = createHmac("sha256", "checksum").update(canonical).digest("hex");
  return new NextRequest("http://localhost:3000/api/payments/payos/webhook", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ success: overrides.success ?? true, code: overrides.code ?? "00", data, signature }),
  });
}

describe("POST /api/payments/payos/webhook", () => {
  afterEach(() => vi.restoreAllMocks());
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("PAYOS_CLIENT_ID", "client"); vi.stubEnv("PAYOS_API_KEY", "key"); vi.stubEnv("PAYOS_CHECKSUM_KEY", "checksum");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test"); vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
    rpc.mockReset().mockResolvedValue({ data: [{ result: "paid", order_id: "order-id" }], error: null });
    createClient.mockReset().mockReturnValue({ rpc });
    drain.mockReset().mockResolvedValue({ claimed: 1, synced: 1, failed: 0 });
  });

  it("durably processes a signed success before acknowledging it", async () => {
    const response = await POST(signedRequest());
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("process_payos_webhook", expect.objectContaining({ p_order_code: 1234, p_payment_link_id: "plink-1", p_reference: "bank-ref-1", p_success: true }));
    expect(drain).toHaveBeenCalledWith(expect.anything(), 1);
  });

  it("records a signed non-success notification for reconciliation and acknowledges it", async () => {
    rpc.mockResolvedValue({ data: [{ result: "reconciliation", order_id: "order-id" }], error: null });
    const data = { orderCode: 1234, amount: 169000, currency: "VND", paymentLinkId: "plink-1", code: "01" };
    const response = await POST(signedRequest({ success: false, code: "01", data }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("process_payos_webhook", expect.objectContaining({ p_success: false, p_order_code: 1234 }));
    expect(drain).not.toHaveBeenCalled();
  });

  it("durably passes an unknown signed orderCode to reconciliation and acknowledges it", async () => {
    rpc.mockResolvedValue({ data: [{ result: "reconciliation", order_id: null }], error: null });
    const data = { orderCode: 999999, amount: 169000, currency: "VND", paymentLinkId: "unknown-link", reference: "unknown-ref", code: "00" };
    const response = await POST(signedRequest({ data }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("process_payos_webhook", expect.objectContaining({ p_order_code: 999999, p_reference: "unknown-ref" }));
  });

  it("accepts the documented signed registration sample without syncing an unknown order", async () => {
    // https://payos.vn/docs/api/ — confirm-webhook sends a signed sample.
    const data = {
      orderCode: 123, amount: 3000, description: "VQRIO123", accountNumber: "12345678",
      reference: "TF230204212323", transactionDateTime: "2023-02-04 18:25:00",
      currency: "VND", paymentLinkId: "124c33293c43417ab7879e14c8d9eb18", code: "00",
      desc: "Thành công", counterAccountBankId: "", counterAccountBankName: "",
      counterAccountName: "", counterAccountNumber: "", virtualAccountName: "", virtualAccountNumber: "",
    };
    rpc.mockResolvedValue({ data: [{ result: "reconciliation", order_id: null }], error: null });
    expect((await POST(signedRequest({ data }))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("process_payos_webhook", expect.objectContaining({ p_order_code: 123, p_amount_vnd: 3000 }));
    expect(drain).not.toHaveBeenCalled();
    const request = signedRequest({ data });
    const body = await request.json();
    body.signature = "0".repeat(64);
    rpc.mockClear();
    expect((await POST(new NextRequest(request.url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects tampered webhook data and oversized or wrong-content requests", async () => {
    const tampered = signedRequest();
    const body = await tampered.json();
    body.data.amount = 1;
    const response = await POST(new NextRequest("http://localhost:3000/api/payments/payos/webhook", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
    expect((await POST(new NextRequest("http://localhost:3000/api/payments/payos/webhook", { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" }))).status).toBe(415);
  });

  it("returns 503 when durable processing fails so PayOS can retry", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "database unavailable" } });
    expect((await POST(signedRequest())).status).toBe(503);
  });

  it("logs only fixed validation diagnostics for invalid signatures and signed invalid payloads", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const request = signedRequest();
    const tampered = await request.json();
    tampered.data.reference = "sensitive-bank-reference";
    expect((await POST(new NextRequest(request.url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(tampered) }))).status).toBe(400);
    expect(warn.mock.calls).toEqual([["payos_webhook_rejected", { stage: "validation", code: "invalid_signature", reason: "invalid_signature" }]]);
    warn.mockClear();
    const invalidPayload = await POST(signedRequest({ data: { orderCode: 123, amount: 3000, paymentLinkId: "sensitive-link", reference: "sensitive-reference", code: "00" } }));
    expect(invalidPayload.status).toBe(400);
    expect(warn.mock.calls).toEqual([["payos_webhook_rejected", { stage: "validation", code: "invalid_payload", reason: "currency" }]]);
    expect(rpc).not.toHaveBeenCalled();
    expect(drain).not.toHaveBeenCalled();
  });

  it.each([
    ["orderCode", "123", "order_code"],
    ["amount", 0, "amount"],
    ["paymentLinkId", "", "payment_link_id"],
    ["currency", null, "currency"],
    ["reference", "", "reference"],
    ["code", "01", "data_code"],
  ])("identifies the rejected signed %s field without logging its value", async (field, value, reason) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const data = { orderCode: 123, amount: 3000, paymentLinkId: "private-link", currency: "VND", reference: "private-reference", code: "00", [field]: value };
    expect((await POST(signedRequest({ data }))).status).toBe(400);
    expect(warn.mock.calls).toEqual([["payos_webhook_rejected", { stage: "validation", code: "invalid_payload", reason }]]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([["success", undefined, "success_type"], ["code", "01", "root_code"]])("identifies rejected envelope %s", async (field, value, reason) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const request = signedRequest();
    const body = await request.json();
    body[field] = value;
    expect((await POST(new NextRequest(request.url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }))).status).toBe(400);
    expect(warn.mock.calls).toEqual([["payos_webhook_rejected", { stage: "validation", code: "invalid_payload", reason }]]);
    expect(rpc).not.toHaveBeenCalled();
  });
});

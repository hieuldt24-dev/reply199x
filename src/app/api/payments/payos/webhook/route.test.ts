import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
});

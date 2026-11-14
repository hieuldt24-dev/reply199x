import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const { rpc, createClient } = vi.hoisted(() => ({ rpc: vi.fn(), createClient: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

const payload = {
  timestamp: 1757058220,
  notification_type: "ORDER_PAID",
  order: {
    order_status: "CAPTURED",
    order_currency: "VND",
    order_amount: "268000.00",
    order_invoice_number: "REPLY199X-7d444840-9dc0-4e22-a132-5a1ae8a4f1d0",
  },
  transaction: {
    id: "event-uuid",
    transaction_id: "sepay-transaction-1",
    transaction_status: "APPROVED",
    transaction_currency: "VND",
    transaction_amount: "268000",
    card_holder_name: "PII must not be forwarded",
  },
  customer: { customer_id: "private-customer-id" },
};

function request(body: unknown = payload, headers: Record<string, string> = {}) {
  return new NextRequest("https://reply.example/api/payments/sepay/ipn", {
    method: "POST",
    headers: { "content-type": "application/json", "x-secret-key": "ipn-secret", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("SEPAY_IPN_SECRET_KEY", "ipn-secret");
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  rpc.mockReset().mockResolvedValue({ data: [{ result: "paid", order_id: "order-id" }], error: null });
  createClient.mockReset().mockReturnValue({ rpc });
});

describe("POST /api/payments/sepay/ipn", () => {
  it("authenticates, normalizes and durably delegates the payment event", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(rpc).toHaveBeenCalledWith("process_sepay_gateway_ipn", {
      p_provider_event_id: "ORDER_PAID:event-uuid",
      p_provider_transaction_id: "sepay-transaction-1",
      p_provider_reference: payload.order.order_invoice_number,
      p_notification_type: "ORDER_PAID",
      p_order_status: "CAPTURED",
      p_order_currency: "VND",
      p_order_amount_vnd: 268000,
      p_transaction_status: "APPROVED",
      p_transaction_currency: "VND",
      p_transaction_amount_vnd: 268000,
    });
    expect(JSON.stringify(rpc.mock.calls)).not.toContain("PII must not be forwarded");
    expect(JSON.stringify(rpc.mock.calls)).not.toContain("private-customer-id");
  });

  it("rejects a missing or incorrect IPN key before database access", async () => {
    expect((await POST(request(payload, { "x-secret-key": "wrong" }))).status).toBe(401);
    expect((await POST(request(payload, { "x-secret-key": "" }))).status).toBe(401);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("rejects malformed payloads and unsupported media types", async () => {
    expect((await POST(request({ ...payload, notification_type: "UNKNOWN" }))).status).toBe(400);
    expect((await POST(request(payload, { "content-type": "text/plain" }))).status).toBe(415);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns a retryable failure when the durable RPC fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "08006", message: "database unavailable" } });
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("database unavailable");
  });
});

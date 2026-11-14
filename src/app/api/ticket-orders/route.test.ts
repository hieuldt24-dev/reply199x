import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const { getUser, rpc, createClient } = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser } }) }));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

const userId = "7d444840-9dc0-4e22-a132-5a1ae8a4f1d0";
const validInput = { idempotencyKey: "8c5f4d5b-66f9-4a41-9e07-3f46fae90e12", name: "Nguyen An", email: "an@example.com", phone: "", gender: "", birthYear: null, quantity: 1, merch: "none" };
function request(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/ticket-orders", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.stubEnv("SITE_URL", "http://localhost:3000");
  vi.stubEnv("PAYOS_CHECKOUT_ENABLED", "false");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
  getUser.mockReset().mockResolvedValue({ data: { user: { id: userId } }, error: null });
  rpc.mockReset();
  createClient.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe("POST /api/ticket-orders", () => {
  it.each(["42702", "untrusted-code-with-private-data"])("logs only safe preparation diagnostics for %s", async (code) => {
    vi.stubEnv("PAYOS_CHECKOUT_ENABLED", "true");
    vi.stubEnv("PAYOS_CLIENT_ID", "client"); vi.stubEnv("PAYOS_API_KEY", "key"); vi.stubEnv("PAYOS_CHECKSUM_KEY", "checksum");
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    rpc.mockResolvedValueOnce({ data: [{ order_id: userId, total_vnd: 169000, order_status: "pending_payment" }], error: null })
      .mockResolvedValueOnce({ data: null, error: { code, message: "private attendee and query data", details: "private details" } });
    createClient.mockReturnValue({ rpc });
    const response = await POST(request(validInput));
    expect(response.status).toBe(503);
    expect(log).toHaveBeenCalledExactlyOnceWith("payos_checkout_rpc_failed", { stage: "prepare", code: code === "42702" ? code : "unknown" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("distinguishes failed persistence after provider success without logging the link or raw error", async () => {
    vi.stubEnv("PAYOS_CHECKOUT_ENABLED", "true");
    vi.stubEnv("PAYOS_CLIENT_ID", "client"); vi.stubEnv("PAYOS_API_KEY", "key"); vi.stubEnv("PAYOS_CHECKSUM_KEY", "checksum");
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const data = { amount: 169000, orderCode: 112233, currency: "VND", paymentLinkId: "link-1", checkoutUrl: "https://pay.payos.vn/web/link-1" };
    const signature = createHmac("sha256", "checksum").update("amount=169000&checkoutUrl=https://pay.payos.vn/web/link-1&currency=VND&orderCode=112233&paymentLinkId=link-1").digest("hex");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ code: "00", data, signature }));
    vi.stubGlobal("fetch", fetchMock);
    rpc.mockResolvedValueOnce({ data: [{ order_id: userId, total_vnd: 169000, order_status: "pending_payment" }], error: null })
      .mockResolvedValueOnce({ data: [{ order_code: 112233, amount_vnd: 169000, currency: "VND", payment_status: "pending", can_create: true, checkout_url: null, payment_link_id: null }], error: null })
      .mockResolvedValueOnce({ data: null, error: { code: "42702", message: "private query and attendee data" } });
    createClient.mockReturnValue({ rpc });
    const response = await POST(request(validInput));
    expect(response.status).toBe(503);
    expect(log).toHaveBeenCalledExactlyOnceWith("payos_checkout_rpc_failed", { stage: "persist", code: "42702" });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenNthCalledWith(3, "prepare_payos_checkout", expect.objectContaining({ p_payment_link_id: "link-1" }));
  });
  it("returns a specific reconciliation response without attempting another provider call", async () => {
    vi.stubEnv("PAYOS_CHECKOUT_ENABLED", "true");
    vi.stubEnv("PAYOS_CLIENT_ID", "client"); vi.stubEnv("PAYOS_API_KEY", "key"); vi.stubEnv("PAYOS_CHECKSUM_KEY", "checksum");
    vi.stubGlobal("fetch", vi.fn());
    rpc.mockResolvedValue({ data: [{ order_id: userId, total_vnd: 169000, order_status: "reconciliation" }], error: null });
    createClient.mockReturnValue({ rpc });
    const response = await POST(request(validInput));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: "checkout_reconciliation_required" } });
    expect(rpc).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("keeps the payment rail disabled before order or provider calls", async () => {
    const response = await POST(request(validInput));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: "temporarily_unavailable" } });
    expect(rpc).not.toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("does not create a link when another request holds the database lease", async () => {
    vi.stubEnv("PAYOS_CHECKOUT_ENABLED", "true");
    vi.stubEnv("PAYOS_CLIENT_ID", "client"); vi.stubEnv("PAYOS_API_KEY", "key"); vi.stubEnv("PAYOS_CHECKSUM_KEY", "checksum");
    vi.stubGlobal("fetch", vi.fn());
    rpc.mockImplementation((name: string) => name === "create_ticket_order_v3"
      ? Promise.resolve({ data: [{ order_id: userId, quantity: 1, unit_price_vnd: 169000, ticket_subtotal_vnd: 169000, merch_option: "none", merch_price_vnd: 0, total_vnd: 169000, order_status: "pending_payment", reused: false }], error: null })
      : Promise.resolve({ data: [{ order_code: 112233, amount_vnd: 169000, currency: "VND", payment_status: "pending", can_create: false, checkout_url: null, payment_link_id: null }], error: null }));
    createClient.mockReturnValue({ rpc });
    const response = await POST(request(validInput));
    expect(response.status).toBe(409);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns a persisted checkout URL without creating another provider link", async () => {
    vi.stubEnv("PAYOS_CHECKOUT_ENABLED", "true");
    vi.stubEnv("PAYOS_CLIENT_ID", "client"); vi.stubEnv("PAYOS_API_KEY", "key"); vi.stubEnv("PAYOS_CHECKSUM_KEY", "checksum");
    vi.stubGlobal("fetch", vi.fn());
    rpc.mockImplementation((name: string) => name === "create_ticket_order_v3"
      ? Promise.resolve({ data: [{ order_id: userId, quantity: 1, unit_price_vnd: 169000, ticket_subtotal_vnd: 169000, merch_option: "none", merch_price_vnd: 0, total_vnd: 169000, order_status: "pending_payment", reused: false }], error: null })
      : Promise.resolve({ data: [{ order_code: 112233, amount_vnd: 169000, currency: "VND", payment_status: "pending", can_create: false, checkout_url: "https://pay.payos.vn/web/link-1", payment_link_id: "link-1" }], error: null }));
    createClient.mockReturnValue({ rpc });
    const response = await POST(request(validInput));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ checkoutUrl: "https://pay.payos.vn/web/link-1" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects mismatched origins before auth or database access", async () => {
    const response = await POST(request(validInput, { origin: "https://attacker.example" }));
    expect(response.status).toBe(403);
    expect(getUser).not.toHaveBeenCalled();
  });

  it("requires an authenticated user", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await POST(request(validInput))).status).toBe(401);
  });

  it("rejects client supplied prices and drink selections", async () => {
    expect((await POST(request({ ...validInput, totalVnd: 1 }))).status).toBe(400);
    expect((await POST(request({ ...validInput, drinkIds: [userId] }))).status).toBe(400);
    expect((await POST(request({ ...validInput, name: "  " }))).status).toBe(400);
  });

  it("rejects oversized and non-JSON requests", async () => {
    expect((await POST(request(" ".repeat(8193)))).status).toBe(413);
    expect((await POST(request({}, { "content-type": "text/plain" }))).status).toBe(415);
  });
});

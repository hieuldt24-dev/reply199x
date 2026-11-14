import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const { getUser, maybeSingle, eq, select, from, adminRpc, createAdmin } = vi.hoisted(() => ({
  getUser: vi.fn(), maybeSingle: vi.fn(), eq: vi.fn(), select: vi.fn(), from: vi.fn(), adminRpc: vi.fn(), createAdmin: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser } }) }));
vi.mock("@supabase/supabase-js", () => ({ createClient: createAdmin }));

const orderId = "7d444840-9dc0-4e22-a132-5a1ae8a4f1d0";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
  getUser.mockReset().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  maybeSingle.mockReset().mockResolvedValue({ data: { id: orderId, status: "pending_payment", total_vnd: 268000, payment_expires_at: "2099-11-13T10:05:00Z" }, error: null });
  eq.mockReset().mockImplementation(() => ({ eq, maybeSingle }));
  select.mockReset().mockReturnValue({ eq, maybeSingle });
  from.mockReset().mockReturnValue({ select });
  adminRpc.mockReset().mockResolvedValue({ data: [{ order_status: "expired" }], error: null });
  createAdmin.mockReset().mockReturnValue({ from, rpc: adminRpc });
});

describe("GET /api/ticket-orders/[orderId]", () => {
  it("returns safe status data only for the signed-in owner's order", async () => {
    const response = await GET(new NextRequest(`https://reply.example/api/ticket-orders/${orderId}`), { params: Promise.resolve({ orderId }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ order: {
      id: orderId, status: "pending_payment", totalVnd: 268000, paymentExpiresAt: "2099-11-13T10:05:00Z",
    } });
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("does not query orders without authentication", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await GET(new NextRequest(`https://reply.example/api/ticket-orders/${orderId}`), { params: Promise.resolve({ orderId }) });
    expect(response.status).toBe(401);
    expect(createAdmin).not.toHaveBeenCalled();
  });

  it("returns the same not-found response for invalid and unowned IDs", async () => {
    const invalid = await GET(new NextRequest("https://reply.example/api/ticket-orders/invalid"), { params: Promise.resolve({ orderId: "invalid" }) });
    expect(invalid.status).toBe(404);
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const missing = await GET(new NextRequest(`https://reply.example/api/ticket-orders/${orderId}`), { params: Promise.resolve({ orderId }) });
    expect(missing.status).toBe(404);
  });

  it("atomically marks a pending order expired after its five-minute window", async () => {
    maybeSingle.mockResolvedValue({ data: { id: orderId, status: "pending_payment", total_vnd: 268000, payment_expires_at: "2000-01-01T00:00:00Z" }, error: null });
    const response = await GET(new NextRequest(`https://reply.example/api/ticket-orders/${orderId}`), { params: Promise.resolve({ orderId }) });
    expect(response.status).toBe(200);
    expect((await response.json()).order.status).toBe("expired");
    expect(adminRpc).toHaveBeenCalledWith("expire_ticket_checkout", { p_order_id: orderId, p_user_id: "user-1" });
  });
});

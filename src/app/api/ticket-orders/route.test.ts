import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const { getUser, rpc, createClient, getPayOsConfig, createPayOsPaymentLink, lookupPayOsPaymentLink } = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
  createClient: vi.fn(),
  getPayOsConfig: vi.fn(),
  createPayOsPaymentLink: vi.fn(),
  lookupPayOsPaymentLink: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser } }) }));
vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("@/lib/payments/payos/checkout", () => ({
  createPayOsPaymentLink,
  getPayOsConfig,
  lookupPayOsPaymentLink,
  payOsErrorDiagnostic: () => ({ stage: "create" }),
}));

const userId = "7d444840-9dc0-4e22-a132-5a1ae8a4f1d0";
const orderId = "a3d9df10-fc46-4f23-8d73-96fe71ad9465";
const validInput = { idempotencyKey: "8c5f4d5b-66f9-4a41-9e07-3f46fae90e12", name: "Nguyen An", email: "an@example.com", phone: "", gender: "", birthYear: null, quantity: 1, merch: "none", survey: { source: ["website", "facebook"], area: "hai-chau", attendance: "confirmed" } };
const savedSurveyArgs = { p_order_id: orderId, p_user_id: userId, p_source: ["facebook", "website"], p_area: "hai-chau", p_attendance: "confirmed" };
const checkoutFields = {
  checkout_order_code: 112233,
  checkout_order_id: orderId,
  checkout_amount_vnd: 169000,
  checkout_currency: "VND",
  checkout_payment_status: "pending",
  checkout_expires_at: new Date(Date.now() + 3600000).toISOString(),
  checkout_payment_link_id: null,
  checkout_url: null,
  checkout_can_create: true,
  checkout_can_reconcile: false,
  checkout_prepare_error_code: null,
};
function orderRow(overrides: Record<string, unknown> = {}) {
  return {
    order_id: orderId,
    quantity: 1,
    unit_price_vnd: 169000,
    merch_option: "none",
    merch_price_vnd: 0,
    ticket_subtotal_vnd: 169000,
    total_vnd: 169000,
    order_status: "pending_payment",
    reused: false,
    blocked_until: null,
    ...checkoutFields,
    ...overrides,
  };
}
function responseRow(overrides: Record<string, unknown> = {}) { return { data: [orderRow(overrides)], error: null }; }
function request(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/ticket-orders", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
}
const link = { paymentLinkId: "benchmark-link", checkoutUrl: "https://pay.payos.vn/web/benchmark-link", amount: 169000, orderCode: 112233, expiresAt: Math.floor(Date.now() / 1000) + 600 };
function setPayOsEnabled() {
  vi.stubEnv("PAYOS_CHECKOUT_ENABLED", "true");
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.stubEnv("SITE_URL", "http://localhost:3000");
  vi.stubEnv("PAYOS_CHECKOUT_ENABLED", "false");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
  getUser.mockReset().mockResolvedValue({ data: { user: { id: userId } }, error: null });
  rpc.mockReset().mockResolvedValue({ data: null, error: null });
  createClient.mockReset().mockReturnValue({ rpc });
  getPayOsConfig.mockReset().mockReturnValue({ clientId: "client", apiKey: "key", checksumKey: "checksum" });
  createPayOsPaymentLink.mockReset().mockResolvedValue(link);
  lookupPayOsPaymentLink.mockReset().mockResolvedValue(link);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("POST /api/ticket-orders", () => {
  it("uses the auth-derived user and combines fresh order and lease setup", async () => {
    setPayOsEnabled();
    rpc.mockImplementation(async (name: string) => name === "create_ticket_order_v5" ? responseRow() : { data: null, error: null });
    const response = await POST(request(validInput));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ order: { id: orderId, status: "pending_payment" }, checkoutUrl: link.checkoutUrl });
    expect(rpc.mock.calls.map(([name]) => name)).toEqual(["create_ticket_order_v5", "upsert_ticket_order_survey", "prepare_payos_checkout"]);
    expect(rpc.mock.calls[0]?.[1]).toEqual({
      p_user_id: userId,
      p_idempotency_key: validInput.idempotencyKey,
      p_attendee_name: "Nguyen An",
      p_attendee_email: "an@example.com",
      p_attendee_phone: "",
      p_attendee_gender: "",
      p_attendee_birth_year: null,
      p_quantity: 1,
      p_merch_option: "none",
    });
    expect(Object.keys(rpc.mock.calls[0]?.[1] ?? {})).toHaveLength(9);
    expect(createPayOsPaymentLink).toHaveBeenCalledOnce();
    expect(lookupPayOsPaymentLink).not.toHaveBeenCalled();
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("reuses a saved provider link without a provider call or persistence RPC", async () => {
    setPayOsEnabled();
    rpc.mockResolvedValue(responseRow({ checkout_payment_link_id: "saved-link", checkout_url: "https://pay.payos.vn/web/saved-link", checkout_can_create: false, checkout_can_reconcile: false }));
    const response = await POST(request(validInput));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ checkoutUrl: "https://pay.payos.vn/web/saved-link" });
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenNthCalledWith(1, "create_ticket_order_v5", expect.any(Object));
    expect(rpc).toHaveBeenNthCalledWith(2, "upsert_ticket_order_survey", savedSurveyArgs);
    expect(createPayOsPaymentLink).not.toHaveBeenCalled();
  });

  it("does not create a provider link while another request holds the lease", async () => {
    setPayOsEnabled();
    rpc.mockResolvedValue(responseRow({ checkout_can_create: false, checkout_can_reconcile: false }));
    expect((await POST(request(validInput))).status).toBe(409);
    expect(createPayOsPaymentLink).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledExactlyOnceWith("create_ticket_order_v5", expect.any(Object));
  });

  it("returns cooldown with Retry-After and does not create checkout", async () => {
    setPayOsEnabled();
    const retryAt = new Date(Date.now() + 86400000).toISOString();
    rpc.mockResolvedValue({ data: [{ order_id: null, quantity: null, unit_price_vnd: null, merch_option: null, merch_price_vnd: null, ticket_subtotal_vnd: null, total_vnd: null, order_status: null, reused: false, blocked_until: retryAt, ...Object.fromEntries(Object.keys(checkoutFields).map((key) => [key, null])) }], error: null });
    const response = await POST(request(validInput));
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ error: { code: "checkout_restricted", retryAt } });
    expect(Number(response.headers.get("Retry-After"))).toBeGreaterThan(86390);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Server-Timing")).toContain("total;dur=");
    expect(createPayOsPaymentLink).not.toHaveBeenCalled();
  });

  it("does not prepare or create checkout for a non-payable order", async () => {
    setPayOsEnabled();
    rpc.mockResolvedValue(responseRow({ order_status: "paid", ...Object.fromEntries(Object.keys(checkoutFields).filter((key) => key !== "checkout_prepare_error_code").map((key) => [key, null])) }));
    expect((await POST(request(validInput))).status).toBe(409);
    expect(createPayOsPaymentLink).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledExactlyOnceWith("create_ticket_order_v5", expect.any(Object));
  });

  it("keeps the v4 idempotency conflict RPC error distinct and returns 409", async () => {
    setPayOsEnabled();
    rpc.mockResolvedValue({ data: null, error: { code: "23505", message: "idempotency_payload_conflict" } });
    expect((await POST(request(validInput))).status).toBe(409);
    expect(createPayOsPaymentLink).not.toHaveBeenCalled();
  });

  it.each([
    { code: "PGRST202", message: "private database text" },
    { code: "untrusted", message: "attendee data leaked" },
  ])("sanitizes missing or unrecognized v5 RPC failures", async (error) => {
    setPayOsEnabled();
    rpc.mockResolvedValue({ data: null, error });
    const response = await POST(request(validInput));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain(error.message);
    expect(createPayOsPaymentLink).not.toHaveBeenCalled();
  });

  it("maps a nested P0002 marker to not found without leaking database text", async () => {
    setPayOsEnabled();
    rpc.mockResolvedValue(responseRow({ checkout_prepare_error_code: "P0002" }));
    const response = await POST(request(validInput));
    expect(response.status).toBe(404);
    expect(createPayOsPaymentLink).not.toHaveBeenCalled();
  });

  it("sanitizes other nested prepare markers", async () => {
    setPayOsEnabled();
    rpc.mockResolvedValue(responseRow({ checkout_prepare_error_code: "23514" }));
    const response = await POST(request(validInput));
    expect(response.status).toBe(503);
    expect(createPayOsPaymentLink).not.toHaveBeenCalled();
  });

  it.each([
    { order_id: null },
    { checkout_order_id: "a3d9df10-fc46-4f23-8d73-96fe71ad9466" },
    { checkout_amount_vnd: 1 },
    { checkout_currency: "USD" },
    { checkout_can_create: true, checkout_can_reconcile: true },
    { checkout_payment_link_id: "partial-link", checkout_url: null },
    { checkout_prepare_error_code: "not-sqlstate" },
  ])("fails closed on partial or inconsistent v5 rows: %j", async (overrides) => {
    setPayOsEnabled();
    rpc.mockResolvedValue(responseRow(overrides));
    expect((await POST(request(validInput))).status).toBe(503);
    expect(createPayOsPaymentLink).not.toHaveBeenCalled();
  });

  it("fails closed for malformed cooldown row", async () => {
    setPayOsEnabled();
    rpc.mockResolvedValue({ data: [{ order_id: orderId, reused: false, blocked_until: new Date(Date.now() + 60000).toISOString() }], error: null });
    expect((await POST(request(validInput))).status).toBe(503);
    expect(createPayOsPaymentLink).not.toHaveBeenCalled();
  });

  it("reports only reached fixed numeric timing spans and preserves response headers", async () => {
    setPayOsEnabled();
    rpc.mockResolvedValue(responseRow({ checkout_payment_link_id: "saved-link", checkout_url: "https://pay.payos.vn/web/saved-link", checkout_can_create: false, checkout_can_reconcile: false }));
    const response = await POST(request(validInput));
    const timing = response.headers.get("Server-Timing") ?? "";
    expect(timing).toMatch(/request_validation;dur=\d+(?:\.\d+)?/);
    expect(timing).toMatch(/auth;dur=\d+(?:\.\d+)?/);
    expect(timing).toMatch(/order_checkout_rpc;dur=\d+(?:\.\d+)?/);
    expect(timing).toMatch(/total;dur=\d+(?:\.\d+)?/);
    expect(timing).not.toMatch(/payos_create|payos_lookup|checkout_persist_rpc/);
    expect(timing).not.toMatch(/orderId|attendee|pay\.payos|link-1/iu);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("enforces configuration gates before the v5 RPC or provider", async () => {
    const disabled = await POST(request(validInput));
    expect(disabled.status).toBe(503);
    expect(rpc).not.toHaveBeenCalled();
    expect(createPayOsPaymentLink).not.toHaveBeenCalled();

    setPayOsEnabled();
    getPayOsConfig.mockReturnValueOnce(null);
    expect((await POST(request(validInput))).status).toBe(503);
    expect(rpc).not.toHaveBeenCalled();

    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    expect((await POST(request(validInput))).status).toBe(503);
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_anon_invalid");
    expect((await POST(request(validInput))).status).toBe(503);
    expect(rpc).not.toHaveBeenCalled();
    expect(createPayOsPaymentLink).not.toHaveBeenCalled();
  });

  it("rejects invalid origin, media type, body and auth before database access", async () => {
    expect((await POST(request(validInput, { origin: "https://attacker.example" }))).status).toBe(403);
    expect((await POST(request(validInput, { "content-type": "text/plain" }))).status).toBe(415);
    expect((await POST(request({ ...validInput, totalVnd: 1 }))).status).toBe(400);
    getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    expect((await POST(request(validInput))).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects oversized and non-JSON requests before auth or database access", async () => {
    setPayOsEnabled();
    const oversized = await POST(request(" ".repeat(8193)));
    expect(oversized.status).toBe(413);
    expect(await oversized.json()).toMatchObject({ error: { code: "payload_too_large" } });
    const declaredOversized = await POST(request(validInput, { "content-length": "9000" }));
    expect(declaredOversized.status).toBe(413);
    const nonJson = await POST(request("{not json"));
    expect(nonJson.status).toBe(400);
    expect(await nonJson.json()).toMatchObject({ error: { code: "invalid_request" } });
    expect(getUser).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
    expect(createPayOsPaymentLink).not.toHaveBeenCalled();
  });

  it("distinguishes failed persistence after provider success without logging the link or raw error", async () => {
    setPayOsEnabled();
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    rpc.mockImplementation(async (name: string) => name === "create_ticket_order_v5"
      ? responseRow()
      : name === "upsert_ticket_order_survey" ? { data: true, error: null } : { data: null, error: { code: "42702", message: "raw private database text" } });
    const response = await POST(request(validInput));
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ error: { code: "temporarily_unavailable", message: "Checkout could not be prepared." } });
    expect(text).not.toMatch(/raw private|benchmark-link|pay\.payos/u);
    expect(createPayOsPaymentLink).toHaveBeenCalledOnce();
    expect(rpc.mock.calls.map(([name]) => name)).toEqual(["create_ticket_order_v5", "upsert_ticket_order_survey", "prepare_payos_checkout"]);
    expect(rpc).toHaveBeenNthCalledWith(3, "prepare_payos_checkout", { p_order_id: orderId, p_user_id: userId, p_payment_link_id: link.paymentLinkId, p_checkout_url: link.checkoutUrl });
    expect(log).toHaveBeenCalledExactlyOnceWith("payos_checkout_rpc_failed", { stage: "persist", code: "42702" });
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/raw private|benchmark-link|pay\.payos/u);
  });

  it("returns a reconciliation response for a reconciliation order without another provider call", async () => {
    setPayOsEnabled();
    rpc.mockResolvedValue(responseRow({ order_status: "reconciliation", ...Object.fromEntries(Object.keys(checkoutFields).filter((key) => key !== "checkout_prepare_error_code").map((key) => [key, null])) }));
    const response = await POST(request(validInput));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: { code: "checkout_reconciliation_required", message: "Checkout needs manual reconciliation." } });
    expect(createPayOsPaymentLink).not.toHaveBeenCalled();
    expect(lookupPayOsPaymentLink).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledOnce();
  });

  it("reconciles an ambiguous lease by lookup only, persists it and reports lookup timing", async () => {
    setPayOsEnabled();
    lookupPayOsPaymentLink.mockImplementation(async ({ observer }: { observer?: (stage: string, duration: number) => void }) => {
      observer?.("payos_lookup", 12.5);
      return link;
    });
    rpc.mockImplementation(async (name: string) => name === "create_ticket_order_v5"
      ? responseRow({ checkout_can_create: false, checkout_can_reconcile: true })
      : { data: null, error: null });
    const response = await POST(request(validInput));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ checkoutUrl: link.checkoutUrl });
    expect(createPayOsPaymentLink).not.toHaveBeenCalled();
    expect(lookupPayOsPaymentLink).toHaveBeenCalledExactlyOnceWith({ amountVnd: 169000, orderCode: 112233, config: expect.any(Object), observer: expect.any(Function) });
    expect(rpc.mock.calls.map(([name]) => name)).toEqual(["create_ticket_order_v5", "upsert_ticket_order_survey", "prepare_payos_checkout"]);
    const timing = response.headers.get("Server-Timing") ?? "";
    expect(timing).toContain("payos_lookup;dur=12.5");
    expect(timing).toMatch(/checkout_persist_rpc;dur=\d+(?:\.\d+)?/);
    expect(timing).not.toContain("payos_create");
  });

  it("marks reconciliation and returns 409 when lookup finds no link", async () => {
    setPayOsEnabled();
    lookupPayOsPaymentLink.mockResolvedValue(null);
    rpc.mockImplementation(async (name: string) => name === "create_ticket_order_v5"
      ? responseRow({ checkout_can_create: false, checkout_can_reconcile: true })
      : { data: null, error: null });
    const response = await POST(request(validInput));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: { code: "checkout_reconciliation_required", message: "Checkout needs manual reconciliation." } });
    expect(createPayOsPaymentLink).not.toHaveBeenCalled();
    expect(rpc.mock.calls.map(([name]) => name)).toEqual(["create_ticket_order_v5", "upsert_ticket_order_survey", "mark_payos_checkout_reconciliation"]);
    expect(rpc).toHaveBeenNthCalledWith(3, "mark_payos_checkout_reconciliation", { p_order_code: 112233 });
  });

  it("returns a sanitized 503 without marking when lookup throws", async () => {
    setPayOsEnabled();
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    lookupPayOsPaymentLink.mockRejectedValue(new Error("raw provider text secret"));
    rpc.mockResolvedValue(responseRow({ checkout_can_create: false, checkout_can_reconcile: true }));
    const response = await POST(request(validInput));
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ error: { code: "checkout_reconciliation_required", message: "Checkout needs manual reconciliation." } });
    expect(text).not.toContain("raw provider");
    expect(createPayOsPaymentLink).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenNthCalledWith(1, "create_ticket_order_v5", expect.any(Object));
    expect(rpc).toHaveBeenNthCalledWith(2, "upsert_ticket_order_survey", savedSurveyArgs);
    expect(JSON.stringify(log.mock.calls)).not.toContain("raw provider");
  });

  it("marks reconciliation after a single failed provider create and returns a sanitized 503", async () => {
    setPayOsEnabled();
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    createPayOsPaymentLink.mockRejectedValue(new Error("raw provider text secret"));
    rpc.mockImplementation(async (name: string) => name === "create_ticket_order_v5" ? responseRow() : { data: null, error: null });
    const response = await POST(request(validInput));
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ error: { code: "checkout_reconciliation_required", message: "Checkout needs manual reconciliation." } });
    expect(text).not.toContain("raw provider");
    expect(createPayOsPaymentLink).toHaveBeenCalledOnce();
    expect(lookupPayOsPaymentLink).not.toHaveBeenCalled();
    expect(rpc.mock.calls.map(([name]) => name)).toEqual(["create_ticket_order_v5", "upsert_ticket_order_survey", "mark_payos_checkout_reconciliation"]);
    expect(rpc).toHaveBeenNthCalledWith(3, "mark_payos_checkout_reconciliation", { p_order_code: 112233 });
    expect(JSON.stringify(log.mock.calls)).not.toContain("raw provider");
  });

  it("passes an observer to provider create and emits only fixed finite timing spans", async () => {
    setPayOsEnabled();
    createPayOsPaymentLink.mockImplementation(async ({ observer }: { observer?: (stage: string, duration: number) => void }) => {
      observer?.("payos_create", 33.25);
      return link;
    });
    rpc.mockImplementation(async (name: string) => name === "create_ticket_order_v5" ? responseRow() : { data: null, error: null });
    const response = await POST(request(validInput));
    expect(response.status).toBe(201);
    expect(createPayOsPaymentLink).toHaveBeenCalledExactlyOnceWith({ orderId, orderCode: 112233, amountVnd: 169000, config: expect.any(Object), expiresAt: checkoutFields.checkout_expires_at, observer: expect.any(Function) });
    const timing = response.headers.get("Server-Timing") ?? "";
    const entries = timing.split(", ").map((entry) => {
      const match = /^([a-z_]+);dur=(.+)$/u.exec(entry);
      expect(match).not.toBeNull();
      return [match?.[1], Number(match?.[2])] as const;
    });
    expect(entries.map(([name]) => name)).toEqual(["request_validation", "auth", "order_checkout_rpc", "payos_create", "checkout_persist_rpc", "total"]);
    for (const [, value] of entries) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
    expect(timing).toContain("payos_create;dur=33.25");
    expect(timing).not.toMatch(new RegExp([userId, orderId, "112233", "benchmark-link", "pay\\.payos", "an@example"].join("|"), "iu"));
  });
});

describe("POST /api/ticket-orders survey save", () => {
  const savedLinkRow = { checkout_payment_link_id: "saved-link", checkout_url: "https://pay.payos.vn/web/saved-link", checkout_can_create: false, checkout_can_reconcile: false };
  const nullCheckout = Object.fromEntries(Object.keys(checkoutFields).filter((key) => key !== "checkout_prepare_error_code").map((key) => [key, null]));
  const surveyLogs = (log: { mock: { calls: unknown[][] } }) => log.mock.calls.filter(([event]) => event === "ticket_survey_save_failed");
  function surveyRpc(onSurvey: () => unknown, rowOverrides: Record<string, unknown> = {}) {
    rpc.mockImplementation((name: string) => {
      if (name === "upsert_ticket_order_survey") return onSurvey();
      return Promise.resolve(name === "create_ticket_order_v5" ? responseRow(rowOverrides) : { data: null, error: null });
    });
  }

  afterEach(() => { vi.useRealTimers(); });

  it("(a) saves the normalized survey for the new order and the session user only", async () => {
    setPayOsEnabled();
    surveyRpc(async () => ({ data: true, error: null }));
    const response = await POST(request({ ...validInput, survey: { source: ["website", "zalo", "facebook"], area: "son-tra", attendance: "unsure" } }));
    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenNthCalledWith(2, "upsert_ticket_order_survey", { p_order_id: orderId, p_user_id: userId, p_source: ["facebook", "zalo", "website"], p_area: "son-tra", p_attendance: "unsure" });
    expect(rpc.mock.calls.filter(([name]) => name === "upsert_ticket_order_survey")).toHaveLength(1);
  });

  it.each([
    { code: "42501", expected: "42501" },
    { code: "XX000", expected: "unknown" },
  ])("(b) returns 201 with the link and logs only an allowlisted code when the save fails: $code", async ({ code, expected }) => {
    setPayOsEnabled();
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    surveyRpc(async () => ({ data: null, error: { code, message: "raw private database text" } }));
    const response = await POST(request(validInput));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ checkoutUrl: link.checkoutUrl });
    expect(surveyLogs(log)).toEqual([["ticket_survey_save_failed", { reason: "rpc_error", code: expected }]]);
    expect(JSON.stringify(log.mock.calls)).not.toContain("raw private");
  });

  it("(c) returns 201 with the link at the 1500 ms bound when the save hangs and clears its timer", async () => {
    setPayOsEnabled();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    surveyRpc(() => new Promise(() => undefined), savedLinkRow);
    let settled = false;
    const pending = POST(request(validInput)).then((response) => { settled = true; return response; });
    while (vi.getTimerCount() === 0) await new Promise((resolveTick) => setImmediate(resolveTick));
    await vi.advanceTimersByTimeAsync(1499);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const response = await pending;
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ checkoutUrl: "https://pay.payos.vn/web/saved-link" });
    expect(surveyLogs(log)).toEqual([["ticket_survey_save_failed", { reason: "timeout", code: "unknown" }]]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    ["throws synchronously", () => { throw new Error("raw sync failure"); }],
    ["rejects", () => Promise.reject(new Error("raw async failure"))],
  ])("(d) returns 201 with the link when the save %s", async (_label, onSurvey) => {
    setPayOsEnabled();
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    surveyRpc(onSurvey);
    const response = await POST(request(validInput));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ checkoutUrl: link.checkoutUrl });
    expect(surveyLogs(log)).toEqual([["ticket_survey_save_failed", { reason: "unexpected", code: "unknown" }]]);
    expect(JSON.stringify(log.mock.calls)).not.toContain("raw");
  });

  it("(e) never logs order, user or answer data", async () => {
    setPayOsEnabled();
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    surveyRpc(async () => ({ data: null, error: { code: "P0002", message: `order ${orderId} user ${userId}`, details: "hai-chau website facebook" } }));
    expect((await POST(request(validInput))).status).toBe(201);
    expect(surveyLogs(log)).toEqual([["ticket_survey_save_failed", { reason: "rpc_error", code: "P0002" }]]);
    const text = JSON.stringify(log.mock.calls);
    for (const forbidden of [orderId, userId, "facebook", "website", "hai-chau", "confirmed", "Facebook", "Hải Châu", "an@example.com", "Nguyen An"]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it.each([
    ["missing", Object.fromEntries(Object.entries(validInput).filter(([key]) => key !== "survey"))],
    ["empty source", { ...validInput, survey: { source: [], area: "hai-chau", attendance: "confirmed" } }],
    ["prototype-name area", { ...validInput, survey: { source: ["facebook"], area: "constructor", attendance: "confirmed" } }],
    ["extra key", { ...validInput, survey: { source: ["facebook"], area: "hai-chau", attendance: "confirmed", other: "x" } }],
  ])("(f) rejects a %s survey with 400 invalid_request and no RPC call", async (_label, body) => {
    setPayOsEnabled();
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: { code: "invalid_request", message: "Check the request and try again." } });
    expect(rpc).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
  });

  it.each([
    ["checkout_pending", { checkout_can_create: false, checkout_can_reconcile: false }],
    ["order_not_payable", { order_status: "paid", ...nullCheckout }],
    ["checkout_reconciliation_required", { order_status: "reconciliation", ...nullCheckout }],
    ["a non-pending payment status", { checkout_payment_status: "paid" }],
  ])("(g) returns 409 and does not save the survey for %s", async (_label, overrides) => {
    setPayOsEnabled();
    surveyRpc(async () => ({ data: true, error: null }), overrides);
    expect((await POST(request(validInput))).status).toBe(409);
    expect(rpc.mock.calls.map(([name]) => name)).toEqual(["create_ticket_order_v5"]);
  });

  it("(h) saves and joins on the saved-link branch without a provider call", async () => {
    setPayOsEnabled();
    let saved = false;
    surveyRpc(async () => { await new Promise((resolveSave) => setTimeout(resolveSave, 5)); saved = true; return { data: true, error: null }; }, savedLinkRow);
    const response = await POST(request(validInput));
    expect(response.status).toBe(201);
    expect(saved).toBe(true);
    expect(rpc.mock.calls.map(([name]) => name)).toEqual(["create_ticket_order_v5", "upsert_ticket_order_survey"]);
    expect(createPayOsPaymentLink).not.toHaveBeenCalled();
    expect(lookupPayOsPaymentLink).not.toHaveBeenCalled();
  });

  it("(i) starts the save before the reconcile lookup finishes", async () => {
    setPayOsEnabled();
    const events: string[] = [];
    lookupPayOsPaymentLink.mockImplementation(async () => { await new Promise((resolveLookup) => setTimeout(resolveLookup, 5)); events.push("lookup:end"); return link; });
    surveyRpc(async () => { events.push("survey:start"); return { data: true, error: null }; }, { checkout_can_create: false, checkout_can_reconcile: true });
    const response = await POST(request(validInput));
    expect(response.status).toBe(201);
    expect(events).toEqual(["survey:start", "lookup:end"]);
    expect(rpc.mock.calls.map(([name]) => name)).toEqual(["create_ticket_order_v5", "upsert_ticket_order_survey", "prepare_payos_checkout"]);
  });

  it("(j) keeps the provider failure response when the save already started and leaves no unhandled rejection", async () => {
    setPayOsEnabled();
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => { unhandled.push(reason); };
    process.on("unhandledRejection", onUnhandled);
    try {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      createPayOsPaymentLink.mockRejectedValue(new Error("raw provider text"));
      surveyRpc(() => Promise.reject(new Error("raw survey failure")));
      const response = await POST(request(validInput));
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: { code: "checkout_reconciliation_required", message: "Checkout needs manual reconciliation." } });
      await new Promise((resolveTick) => setTimeout(resolveTick, 20));
      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });

  it("(k) keeps only the fixed Server-Timing names when the survey is saved", async () => {
    setPayOsEnabled();
    surveyRpc(async () => ({ data: true, error: null }));
    const response = await POST(request(validInput));
    const names = (response.headers.get("Server-Timing") ?? "").split(", ").map((entry) => entry.split(";")[0]);
    expect(names).toEqual(["request_validation", "auth", "order_checkout_rpc", "checkout_persist_rpc", "total"]);
  });
});

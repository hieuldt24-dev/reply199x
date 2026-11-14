import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { createAdmin, drain } = vi.hoisted(() => ({ createAdmin: vi.fn(), drain: vi.fn() }));
vi.mock("@/lib/ticket-registration/outbox-worker", () => ({ createOutboxAdminClient: createAdmin, drainPaidTicketSheetOutbox: drain }));

import { POST } from "./route";

describe("POST /api/internal/sheets-sync", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("SHEETS_SYNC_WORKER_SECRET", "a-secure-test-secret-that-is-long-enough");
    createAdmin.mockReset().mockReturnValue({});
    drain.mockReset().mockResolvedValue({ claimed: 1, synced: 1, failed: 0 });
  });

  it("requires the configured bearer secret before touching the database", async () => {
    const response = await POST(new NextRequest("http://localhost/api/internal/sheets-sync", { method: "POST" }));
    expect(response.status).toBe(401);
    expect(createAdmin).not.toHaveBeenCalled();
  });

  it("uses a bounded batch for an authenticated scheduled/manual request", async () => {
    const request = new NextRequest("http://localhost/api/internal/sheets-sync?limit=1000", {
      method: "POST", headers: { authorization: "Bearer a-secure-test-secret-that-is-long-enough" },
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(drain).toHaveBeenCalledWith({}, 10);
    expect(await response.json()).toEqual({ claimed: 1, synced: 1, failed: 0 });
  });

  it("rejects the exact tracked placeholder and any too-short secret, and fails closed without an admin client", async () => {
    vi.stubEnv("SHEETS_SYNC_WORKER_SECRET", "REPLACE_ME");
    expect((await POST(new NextRequest("http://localhost/api/internal/sheets-sync", { method: "POST", headers: { authorization: "Bearer REPLACE_ME" } }))).status).toBe(401);
    expect(createAdmin).not.toHaveBeenCalled();
    vi.stubEnv("SHEETS_SYNC_WORKER_SECRET", "short");
    expect((await POST(new NextRequest("http://localhost/api/internal/sheets-sync", { method: "POST", headers: { authorization: "Bearer short" } }))).status).toBe(401);
    vi.stubEnv("SHEETS_SYNC_WORKER_SECRET", "a-secure-test-secret-that-is-long-enough");
    createAdmin.mockReturnValue(null);
    expect((await POST(new NextRequest("http://localhost/api/internal/sheets-sync", { method: "POST", headers: { authorization: "Bearer a-secure-test-secret-that-is-long-enough" } }))).status).toBe(503);
    expect(drain).not.toHaveBeenCalled();
  });
});

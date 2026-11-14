import { beforeEach, describe, expect, it, vi } from "vitest";

const { upsert } = vi.hoisted(() => ({ upsert: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/ticket-registration/paid-orders", () => ({ upsertPaidTicketOrder: upsert }));

import { drainPaidTicketSheetOutbox, type OutboxAdmin } from "./outbox-worker";

const paidOrder = {
  outbox_id: "outbox-id", lease_token: "lease-token-1", order_id: "order-id", order_created_at: "2026-11-14T01:00:00.000Z",
  attendee_name: "Lê An", attendee_email: "an@example.com", attendee_phone: "", attendee_gender: "",
  attendee_birth_year: null, quantity: 1, merch_option: "none", total_vnd: 169000,
  order_status: "paid", payos_reference: "ref", paid_at: "2026-11-14T01:03:00.000Z", payment_link_id: "link",
};

describe("paid ticket outbox worker", () => {
  const rpc = vi.fn();
  const admin = { rpc } as unknown as OutboxAdmin;
  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockImplementation(async (name: string) => {
      if (name === "claim_paid_ticket_sheet_sync") return { data: [paidOrder], error: null };
      return { data: true, error: null };
    });
    upsert.mockResolvedValue("42");
  });

  it("claims a bounded batch and marks each successful stable-row upsert synced", async () => {
    expect(await drainPaidTicketSheetOutbox(admin, 4)).toEqual({ claimed: 1, synced: 1, failed: 0 });
    expect(rpc).toHaveBeenNthCalledWith(1, "claim_paid_ticket_sheet_sync", { p_limit: 4 });
    expect(rpc).toHaveBeenNthCalledWith(2, "complete_paid_ticket_sheet_sync", { p_outbox_id: "outbox-id", p_lease_token: "lease-token-1", p_sheet_row_id: "42" });
  });

  it("records a sanitized failure code without exposing error or attendee details", async () => {
    upsert.mockRejectedValue(new Error("duplicate_sheet_order_rows"));
    expect(await drainPaidTicketSheetOutbox(admin, 1)).toEqual({ claimed: 1, synced: 0, failed: 1 });
    expect(rpc).toHaveBeenNthCalledWith(2, "fail_paid_ticket_sheet_sync", { p_outbox_id: "outbox-id", p_lease_token: "lease-token-1", p_error_code: "duplicate_rows" });
  });

  it("does not silently accept failed durable claim or completion calls", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "db down" } });
    await expect(drainPaidTicketSheetOutbox(admin, 1)).rejects.toThrow("outbox_claim_failed");
    rpc.mockImplementation(async (name: string) => name === "claim_paid_ticket_sheet_sync" ? { data: [paidOrder], error: null } : { data: null, error: { message: "db down" } });
    await expect(drainPaidTicketSheetOutbox(admin, 1)).rejects.toThrow("outbox_failure_record_failed");
  });

  it("cannot finalize with a stale lease token after another worker reclaimed the row", async () => {
    rpc.mockImplementation(async (name: string) => {
      if (name === "claim_paid_ticket_sheet_sync") return { data: [paidOrder], error: null };
      return { data: false, error: null };
    });
    await expect(drainPaidTicketSheetOutbox(admin, 1)).rejects.toThrow("outbox_failure_record_failed");
    expect(rpc).toHaveBeenNthCalledWith(2, "complete_paid_ticket_sheet_sync", expect.objectContaining({ p_lease_token: "lease-token-1" }));
    expect(rpc).toHaveBeenNthCalledWith(3, "fail_paid_ticket_sheet_sync", expect.objectContaining({ p_lease_token: "lease-token-1" }));
  });
});

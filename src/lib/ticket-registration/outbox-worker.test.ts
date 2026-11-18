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

const surveyRow = { source: ["website", "facebook"], area: "son-tra", attendance: "confirmed" };
const surveyFailure = { p_outbox_id: "outbox-id", p_lease_token: "lease-token-1", p_error_code: "survey_read_failed" };

describe("paid ticket outbox worker", () => {
  const rpc = vi.fn();
  const admin = { rpc } as unknown as OutboxAdmin;

  function answerSurvey(survey: () => Promise<{ data: unknown; error: { message?: string } | null }>) {
    rpc.mockImplementation(async (name: string) => {
      if (name === "claim_paid_ticket_sheet_sync") return { data: [paidOrder], error: null };
      if (name === "get_ticket_order_survey") return survey();
      return { data: true, error: null };
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    answerSurvey(async () => ({ data: [], error: null }));
    upsert.mockResolvedValue("42");
  });

  it("claims a bounded batch, reads the survey, and marks each successful stable-row upsert synced", async () => {
    expect(await drainPaidTicketSheetOutbox(admin, 4)).toEqual({ claimed: 1, synced: 1, failed: 0 });
    expect(rpc).toHaveBeenNthCalledWith(1, "claim_paid_ticket_sheet_sync", { p_limit: 4 });
    expect(rpc).toHaveBeenNthCalledWith(2, "get_ticket_order_survey", { p_order_id: "order-id" });
    expect(rpc).toHaveBeenNthCalledWith(3, "complete_paid_ticket_sheet_sync", { p_outbox_id: "outbox-id", p_lease_token: "lease-token-1", p_sheet_row_id: "42" });
  });

  it("writes empty survey cells and marks synced when the order has no survey row (late survey, AC20)", async () => {
    expect(await drainPaidTicketSheetOutbox(admin, 1)).toEqual({ claimed: 1, synced: 1, failed: 0 });
    expect(upsert).toHaveBeenCalledWith(paidOrder, null);
    expect(rpc).toHaveBeenCalledWith("complete_paid_ticket_sheet_sync", expect.anything());
  });

  it("passes the normalized survey to the Sheet upsert when a survey exists", async () => {
    answerSurvey(async () => ({ data: [surveyRow], error: null }));
    expect(await drainPaidTicketSheetOutbox(admin, 1)).toEqual({ claimed: 1, synced: 1, failed: 0 });
    expect(upsert).toHaveBeenCalledWith(paidOrder, { source: ["facebook", "website"], area: "son-tra", attendance: "confirmed" });
  });

  it.each([
    ["rpc error", async () => ({ data: null, error: { message: "permission denied for order-id" } })],
    ["rpc throw", async () => { throw new Error("network down order-id"); }],
    ["non-array data", async () => ({ data: surveyRow, error: null })],
    ["malformed row", async () => ({ data: [{ ...surveyRow, area: "constructor" }], error: null })],
    ["more than one row", async () => ({ data: [surveyRow, surveyRow], error: null })],
  ])("fails closed with survey_read_failed on %s without writing the Sheet or completing", async (_case, survey) => {
    answerSurvey(survey);
    expect(await drainPaidTicketSheetOutbox(admin, 1)).toEqual({ claimed: 1, synced: 0, failed: 1 });
    expect(upsert).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalledWith("complete_paid_ticket_sheet_sync", expect.anything());
    expect(rpc).toHaveBeenNthCalledWith(3, "fail_paid_ticket_sheet_sync", surveyFailure);
    expect(surveyFailure.p_error_code).toMatch(/^[a-z0-9_]{1,80}$/);
  });

  it("retries a survey read failure on the next drain and syncs once the read succeeds", async () => {
    answerSurvey(async () => ({ data: null, error: { message: "timeout" } }));
    expect(await drainPaidTicketSheetOutbox(admin, 1)).toEqual({ claimed: 1, synced: 0, failed: 1 });
    answerSurvey(async () => ({ data: [surveyRow], error: null }));
    expect(await drainPaidTicketSheetOutbox(admin, 1)).toEqual({ claimed: 1, synced: 1, failed: 0 });
    expect(upsert).toHaveBeenCalledOnce();
  });

  it("records a sanitized failure code without exposing error or attendee details", async () => {
    upsert.mockRejectedValue(new Error("duplicate_sheet_order_rows"));
    expect(await drainPaidTicketSheetOutbox(admin, 1)).toEqual({ claimed: 1, synced: 0, failed: 1 });
    expect(rpc).toHaveBeenNthCalledWith(3, "fail_paid_ticket_sheet_sync", { p_outbox_id: "outbox-id", p_lease_token: "lease-token-1", p_error_code: "duplicate_rows" });
  });

  it("does not silently accept failed durable claim or completion calls", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "db down" } });
    await expect(drainPaidTicketSheetOutbox(admin, 1)).rejects.toThrow("outbox_claim_failed");
    rpc.mockImplementation(async (name: string) => {
      if (name === "claim_paid_ticket_sheet_sync") return { data: [paidOrder], error: null };
      if (name === "get_ticket_order_survey") return { data: [], error: null };
      return { data: null, error: { message: "db down" } };
    });
    await expect(drainPaidTicketSheetOutbox(admin, 1)).rejects.toThrow("outbox_failure_record_failed");
    expect(upsert).toHaveBeenCalledOnce();
  });

  it("cannot finalize with a stale lease token after another worker reclaimed the row", async () => {
    rpc.mockImplementation(async (name: string) => {
      if (name === "claim_paid_ticket_sheet_sync") return { data: [paidOrder], error: null };
      if (name === "get_ticket_order_survey") return { data: [], error: null };
      return { data: false, error: null };
    });
    await expect(drainPaidTicketSheetOutbox(admin, 1)).rejects.toThrow("outbox_failure_record_failed");
    expect(rpc).toHaveBeenNthCalledWith(3, "complete_paid_ticket_sheet_sync", expect.objectContaining({ p_lease_token: "lease-token-1" }));
    expect(rpc).toHaveBeenNthCalledWith(4, "fail_paid_ticket_sheet_sync", expect.objectContaining({ p_lease_token: "lease-token-1" }));
  });
});

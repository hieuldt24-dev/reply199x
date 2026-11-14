import { beforeEach, describe, expect, it, vi } from "vitest";

const { GoogleAuth, getValues, appendValues, updateValues, sheets } = vi.hoisted(() => ({
  GoogleAuth: vi.fn(), getValues: vi.fn(), appendValues: vi.fn(), updateValues: vi.fn(), sheets: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("googleapis", () => ({ google: { auth: { GoogleAuth }, sheets } }));

import { upsertPaidTicketOrder, type PaidTicketOrder } from "./paid-orders";

const order: PaidTicketOrder = {
  outbox_id: "outbox-id", lease_token: "lease-token-1", order_id: "order-id", order_created_at: "2026-11-14T01:00:00.000Z",
  attendee_name: "Lê An", attendee_email: "an@example.com", attendee_phone: "+8412345",
  attendee_gender: "female", attendee_birth_year: 2000, quantity: 2,
  merch_option: "tuoi-xi-tin", total_vnd: 437000, order_status: "paid",
  payos_reference: "payos-ref", paid_at: "2026-11-14T01:03:00.000Z", payment_link_id: "link-id",
};

describe("paid ticket Sheets upsert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("GOOGLE_SHEETS_SPREADSHEET_ID", "sheet-id");
    vi.stubEnv("GOOGLE_SHEETS_PAID_ORDERS_RANGE", "Registrations!A:N");
    getValues.mockResolvedValue({ data: { values: [["Thời gian", "Họ tên", "Email", "Điện thoại", "", "", "", "", "", "", "Mã đơn"]] } });
    appendValues.mockResolvedValue({ data: { updates: { updatedRows: 1, updatedRange: "Registrations!A2:N2" } } });
    updateValues.mockResolvedValue({ data: { updatedRows: 1 } });
    sheets.mockReturnValue({ spreadsheets: { values: { get: getValues, append: appendValues, update: updateValues } } });
  });

  it("appends the approved A:N mapping as RAW and uses order ID in column K", async () => {
    expect(await upsertPaidTicketOrder(order)).toBe("2");
    expect(appendValues).toHaveBeenCalledWith(expect.objectContaining({
      range: "Registrations!A:N", valueInputOption: "RAW", insertDataOption: "INSERT_ROWS",
      requestBody: { values: [[order.order_created_at, "Lê An", "an@example.com", "+8412345", "Nữ", "2000", "2", "Combo Tuổi Xì Tin", "437000", "Đã chuyển khoản", "order-id", "payos-ref", order.paid_at, "link-id"]] },
    }), { retry: false });
    expect(getValues).toHaveBeenCalledWith({ spreadsheetId: "sheet-id", range: "Registrations!A:N" }, { retry: false });
  });

  it("updates an existing stable order row instead of appending on retry", async () => {
    getValues.mockResolvedValue({ data: { values: [["header"], ["", "", "", "", "", "", "", "", "", "", "order-id"]] } });
    expect(await upsertPaidTicketOrder(order)).toBe("2");
    expect(updateValues).toHaveBeenCalledWith(expect.objectContaining({ range: "Registrations!A2:N2", valueInputOption: "RAW" }), { retry: false });
    expect(appendValues).not.toHaveBeenCalled();
  });

  it("fails visibly when duplicate order IDs already exist", async () => {
    getValues.mockResolvedValue({ data: { values: [["", "", "", "", "", "", "", "", "", "", "order-id"], ["", "", "", "", "", "", "", "", "", "", "order-id"]] } });
    await expect(upsertPaidTicketOrder(order)).rejects.toThrow("duplicate_sheet_order_rows");
    expect(appendValues).not.toHaveBeenCalled();
    expect(updateValues).not.toHaveBeenCalled();
  });

  it("rejects non-paid snapshots before writing", async () => {
    await expect(upsertPaidTicketOrder({ ...order, order_status: "pending_payment" })).rejects.toThrow("invalid_paid_order");
    expect(getValues).not.toHaveBeenCalled();
  });
});

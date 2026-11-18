import { beforeEach, describe, expect, it, vi } from "vitest";

const { GoogleAuth, getValues, appendValues, updateValues, sheets } = vi.hoisted(() => ({
  GoogleAuth: vi.fn(), getValues: vi.fn(), appendValues: vi.fn(), updateValues: vi.fn(), sheets: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("googleapis", () => ({ google: { auth: { GoogleAuth }, sheets } }));

import type { TicketSurvey } from "@/lib/ticket-orders/survey";
import { upsertPaidTicketOrder, type PaidTicketOrder } from "./paid-orders";

const order: PaidTicketOrder = {
  outbox_id: "outbox-id", lease_token: "lease-token-1", order_id: "order-id", order_created_at: "2026-11-14T01:00:00.000Z",
  attendee_name: "Lê An", attendee_email: "an@example.com", attendee_phone: "+8412345",
  attendee_gender: "female", attendee_birth_year: 2000, quantity: 2,
  merch_option: "tuoi-xi-tin", total_vnd: 437000, order_status: "paid",
  payos_reference: "payos-ref", paid_at: "2026-11-14T01:03:00.000Z", payment_link_id: "link-id",
};

const survey: TicketSurvey = { source: ["facebook", "website"], area: "hai-chau", attendance: "confirmed" };

function orderIdRow(orderId: string): string[] {
  const row = Array<string>(17).fill("");
  row[13] = orderId;
  return row;
}

function expectedRow(source: string, area: string, attendance: string): string[] {
  return [
    order.order_created_at, order.attendee_name ?? "", "an@example.com", "+8412345", "Nữ", "2000",
    source, area, "2", "Combo Tuổi Xì Tin", "437000", "Đã chuyển khoản", attendance,
    "order-id", "payos-ref", order.paid_at ?? "", "link-id",
  ];
}

describe("paid ticket Sheets upsert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("GOOGLE_SHEETS_SPREADSHEET_ID", "sheet-id");
    vi.stubEnv("GOOGLE_SHEETS_PAID_ORDERS_RANGE", "Registrations!A:Q");
    getValues.mockResolvedValue({ data: { values: [["Thời gian", "Họ tên", "Email", "Điện thoại", "", "", "", "", "", "", "", "", "", "Mã đơn hàng"]] } });
    appendValues.mockResolvedValue({ data: { updates: { updatedRows: 1, updatedRange: "Registrations!A2:Q2" } } });
    updateValues.mockResolvedValue({ data: { updatedRows: 1 } });
    sheets.mockReturnValue({ spreadsheets: { values: { get: getValues, append: appendValues, update: updateValues } } });
  });

  it("appends the 17-column A:Q mapping as RAW with survey cells in G/H/M and order ID in N", async () => {
    expect(await upsertPaidTicketOrder(order, survey)).toBe("2");
    const values = appendValues.mock.calls[0][0].requestBody.values;
    expect(values[0]).toHaveLength(17);
    expect(values[0][13]).toBe("order-id");
    expect(appendValues).toHaveBeenCalledWith(expect.objectContaining({
      range: "Registrations!A:Q", valueInputOption: "RAW", insertDataOption: "INSERT_ROWS",
      requestBody: { values: [expectedRow("Facebook;Tại website của REPLY 199X", "Hải Châu", "Có, tôi chắc chắn mình sẽ tham gia")] },
    }), { retry: false });
    expect(getValues).toHaveBeenCalledWith({ spreadsheetId: "sheet-id", range: "Registrations!A:Q" }, { retry: false });
  });

  it("joins multi-select sources with ';' in canonical order regardless of input order", async () => {
    const unordered: TicketSurvey = { source: ["website", "zalo", "facebook"], area: "quang-nam-cu", attendance: "unsure" };
    await upsertPaidTicketOrder(order, unordered);
    const row = appendValues.mock.calls[0][0].requestBody.values[0];
    expect(row[6]).toBe("Facebook;Zalo;Tại website của REPLY 199X");
    expect(row[7]).toBe("Khu vực Quảng Nam cũ (Hội An, Điện Bàn, Tam Kỳ...)");
    expect(row[12]).toBe("Tôi chưa chắc chắn mình sẽ tham gia");
  });

  it("writes empty G/H/M when the order has no survey", async () => {
    await upsertPaidTicketOrder(order, null);
    expect(appendValues.mock.calls[0][0].requestBody.values).toEqual([expectedRow("", "", "")]);
  });

  it("defaults to Registrations!A:Q when the range variable is unset", async () => {
    vi.stubEnv("GOOGLE_SHEETS_PAID_ORDERS_RANGE", "");
    await upsertPaidTicketOrder(order, survey);
    expect(getValues).toHaveBeenCalledWith({ spreadsheetId: "sheet-id", range: "Registrations!A:Q" }, { retry: false });
  });

  it("should reject GOOGLE_SHEETS_PAID_ORDERS_RANGE ending in A:N", async () => {
    vi.stubEnv("GOOGLE_SHEETS_PAID_ORDERS_RANGE", "Registrations!A:N");
    await expect(upsertPaidTicketOrder(order, survey)).rejects.toThrow("invalid_sheet_range");
    expect(getValues).not.toHaveBeenCalled();
    expect(appendValues).not.toHaveBeenCalled();
  });

  it("updates an existing stable order row (matched at index 13) with A{n}:Q{n} instead of appending", async () => {
    getValues.mockResolvedValue({ data: { values: [["header"], orderIdRow("order-id")] } });
    expect(await upsertPaidTicketOrder(order, survey)).toBe("2");
    expect(updateValues).toHaveBeenCalledWith(expect.objectContaining({ range: "Registrations!A2:Q2", valueInputOption: "RAW" }), { retry: false });
    expect(appendValues).not.toHaveBeenCalled();
  });

  it("does not match an order ID found in the old column K position", async () => {
    const oldLayout = Array<string>(14).fill("");
    oldLayout[10] = "order-id";
    getValues.mockResolvedValue({ data: { values: [["header"], oldLayout] } });
    await upsertPaidTicketOrder(order, survey);
    expect(updateValues).not.toHaveBeenCalled();
    expect(appendValues).toHaveBeenCalledOnce();
  });

  it("overwrites G/H/M with empty strings when an existing row is re-synced without a survey", async () => {
    getValues.mockResolvedValue({ data: { values: [["header"], orderIdRow("order-id")] } });
    await upsertPaidTicketOrder(order, null);
    expect(updateValues).toHaveBeenCalledWith(expect.objectContaining({
      range: "Registrations!A2:Q2", requestBody: { values: [expectedRow("", "", "")] },
    }), { retry: false });
  });

  it("fails visibly when duplicate order IDs already exist", async () => {
    getValues.mockResolvedValue({ data: { values: [orderIdRow("order-id"), orderIdRow("order-id")] } });
    await expect(upsertPaidTicketOrder(order, survey)).rejects.toThrow("duplicate_sheet_order_rows");
    expect(appendValues).not.toHaveBeenCalled();
    expect(updateValues).not.toHaveBeenCalled();
  });

  it("rejects non-paid snapshots before writing", async () => {
    await expect(upsertPaidTicketOrder({ ...order, order_status: "pending_payment" }, survey)).rejects.toThrow("invalid_paid_order");
    expect(getValues).not.toHaveBeenCalled();
  });
});

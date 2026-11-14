import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TicketRegistrationRow } from "./validation";

const { GoogleAuth, appendValues, sheets } = vi.hoisted(() => ({
  GoogleAuth: vi.fn(),
  appendValues: vi.fn(),
  sheets: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("googleapis", () => ({
  google: {
    auth: { GoogleAuth },
    sheets,
  },
}));

import { appendTicketRequestRow } from "./sheets";

const row: TicketRegistrationRow = [
  "2026-11-12T00:00:00.000Z",
  "Nguyễn An",
  "an@example.com",
  "",
  "",
  "",
  2,
  "Không kèm merch",
];

describe("Google Sheets adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("GOOGLE_SHEETS_SPREADSHEET_ID", "test-sheet-id");
    appendValues.mockResolvedValue({ data: { updates: { updatedRows: 1 } } });
    sheets.mockReturnValue({ spreadsheets: { values: { append: appendValues } } });
  });

  it("uses a lazy, Sheets-only append with the fixed range and RAW values", async () => {
    const result = await appendTicketRequestRow(row);

    expect(result).toBe(1);
    expect(GoogleAuth).toHaveBeenCalledOnce();
    expect(GoogleAuth).toHaveBeenCalledWith({
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    expect(sheets).toHaveBeenCalledWith({ version: "v4", auth: expect.anything() });
    expect(appendValues).toHaveBeenCalledWith({
      spreadsheetId: "test-sheet-id",
      range: "Registrations!A:H",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    }, { retry: false });
  });

  it("fails closed without spreadsheet configuration before creating an auth client", async () => {
    vi.stubEnv("GOOGLE_SHEETS_SPREADSHEET_ID", "");

    await expect(appendTicketRequestRow(row)).rejects.toThrow("not configured");
    expect(GoogleAuth).not.toHaveBeenCalled();
    expect(sheets).not.toHaveBeenCalled();
  });
});

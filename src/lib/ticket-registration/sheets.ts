import "server-only";
import { google } from "googleapis";
import type { TicketRegistrationRow } from "./validation";

const spreadsheetRange = "Registrations!A:H";
const sheetsScope = "https://www.googleapis.com/auth/spreadsheets";

export async function appendTicketRequestRow(row: TicketRegistrationRow): Promise<number> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("Ticket registration is not configured");
  }

  const auth = new google.auth.GoogleAuth({ scopes: [sheetsScope] });
  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: spreadsheetRange,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[...row]],
    },
  }, {
    retry: false,
  });

  return response.data.updates?.updatedRows ?? 0;
}

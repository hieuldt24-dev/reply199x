import "server-only";
import { google } from "googleapis";

export type PaidTicketOrder = {
  outbox_id: string;
  lease_token: string;
  order_id: string;
  order_created_at: string;
  attendee_name: string | null;
  attendee_email: string | null;
  attendee_phone: string | null;
  attendee_gender: string | null;
  attendee_birth_year: number | null;
  quantity: number;
  merch_option: string | null;
  total_vnd: number;
  order_status: string;
  payos_reference: string | null;
  paid_at: string | null;
  payment_link_id: string | null;
};

const spreadsheetScope = "https://www.googleapis.com/auth/spreadsheets";
const defaultPaidOrdersRange = "Registrations!A:N";

function getPaidOrdersRange(): string {
  const range = process.env.GOOGLE_SHEETS_PAID_ORDERS_RANGE || defaultPaidOrdersRange;
  if (!/^.{1,200}!A:N$/.test(range)) throw new Error("invalid_sheet_range");
  return range;
}

function makeRow(order: PaidTicketOrder): string[] {
  if (order.order_status !== "paid" || !order.order_id || !order.attendee_name || !order.attendee_email || !order.paid_at) {
    throw new Error("invalid_paid_order");
  }
  const merchNames: Record<string, string> = {
    none: "Không kèm merch",
    "tuoi-xi-tin": "Combo Tuổi Xì Tin",
    "tuoi-xi-lay": "Combo Tuổi Xì Lây",
  };
  const genderNames: Record<string, string> = {
    female: "Nữ", male: "Nam", other: "Khác", undisclosed: "Không muốn tiết lộ", "": "",
  };
  const merch = order.merch_option ?? "none";
  if (!(merch in merchNames) || !((order.attendee_gender ?? "") in genderNames)) throw new Error("invalid_paid_order");
  return [
    order.order_created_at,
    order.attendee_name,
    order.attendee_email,
    order.attendee_phone ?? "",
    genderNames[order.attendee_gender ?? ""],
    order.attendee_birth_year == null ? "" : String(order.attendee_birth_year),
    String(order.quantity),
    merchNames[merch],
    String(order.total_vnd),
    "Đã chuyển khoản",
    order.order_id,
    order.payos_reference ?? "",
    order.paid_at,
    order.payment_link_id ?? "",
  ];
}

export async function upsertPaidTicketOrder(order: PaidTicketOrder): Promise<string> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("sheets_not_configured");
  const range = getPaidOrdersRange();
  const auth = new google.auth.GoogleAuth({ scopes: [spreadsheetScope] });
  const sheets = google.sheets({ version: "v4", auth });
  const row = makeRow(order);

  // Always reconcile by stable order ID before writing. This also recovers an
  // append whose response was lost after Google accepted it.
  const existing = await sheets.spreadsheets.values.get({ spreadsheetId, range }, { retry: false });
  const matches: number[] = [];
  for (const [index, values] of (existing.data.values ?? []).entries()) {
    if (values[10] === order.order_id) matches.push(index + 1);
  }
  if (matches.length > 1) throw new Error("duplicate_sheet_order_rows");
  if (matches.length === 1) {
    const rowNumber = matches[0];
    const updateRange = `${range.slice(0, range.lastIndexOf("!"))}!A${rowNumber}:N${rowNumber}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId, range: updateRange, valueInputOption: "RAW", requestBody: { values: [row] },
    }, { retry: false });
    return String(rowNumber);
  }

  const appended = await sheets.spreadsheets.values.append({
    spreadsheetId, range, valueInputOption: "RAW", insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  }, { retry: false });
  const updatedRange = appended.data.updates?.updatedRange;
  const rowNumber = updatedRange?.match(/![A-Z]+(\d+):/)?.[1];
  if (!rowNumber || appended.data.updates?.updatedRows !== 1) throw new Error("sheet_append_unconfirmed");
  return rowNumber;
}

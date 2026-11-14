export const TICKET_UNIT_PRICE_VND = 169_000;
export const TICKET_ORDER_LIMIT = 4;

export const MERCH_OPTIONS = {
  none: { label: "Không kèm merch", priceVnd: 0 },
  "tuoi-xi-tin": { label: 'Combo "Tuổi Xì Tin"', priceVnd: 99_000 },
  "tuoi-xi-lay": { label: 'Combo "Tuổi Xì Lây"', priceVnd: 169_000 },
} as const;

export type MerchOption = keyof typeof MERCH_OPTIONS;

export type CreateTicketOrderInput = Readonly<{
  idempotencyKey: string;
  name: string;
  email: string;
  phone: string;
  gender: "female" | "male" | "other" | "undisclosed" | "";
  birthYear: number | null;
  quantity: number;
  merch: MerchOption;
}>;

export type ValidatedTicketOrder = Readonly<CreateTicketOrderInput & {
  ticketSubtotalVnd: number;
  merchPriceVnd: number;
  totalVnd: number;
}>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const phonePattern = /^[+().\-\d\s]*$/u;
const controlCharacters = /[\u0000-\u001f\u007f]/u;
const genders = ["", "female", "male", "other", "undisclosed"] as const;

function isSafeString(value: unknown, maximumLength: number): value is string {
  return typeof value === "string" && value.length <= maximumLength && !controlCharacters.test(value);
}

function normalizeBirthYear(value: unknown): number | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^\d{4}$/u.test(value.trim())) return Number(value.trim());
  return undefined;
}

export function validateCreateTicketOrder(payload: unknown): ValidatedTicketOrder | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  if (Object.keys(record).some((key) => !["idempotencyKey", "name", "email", "phone", "gender", "birthYear", "quantity", "merch"].includes(key))) return null;
  if (typeof record.idempotencyKey !== "string" || !uuidPattern.test(record.idempotencyKey)) return null;
  if (!isSafeString(record.name, 120) || !isSafeString(record.email, 254)) return null;
  if (record.phone !== undefined && !isSafeString(record.phone, 40)) return null;
  if (record.gender !== undefined && (typeof record.gender !== "string" || !genders.includes(record.gender as (typeof genders)[number]))) return null;
  const birthYear = normalizeBirthYear(record.birthYear);
  if (birthYear === undefined || (birthYear !== null && (birthYear < 1900 || birthYear > new Date().getFullYear()))) return null;
  if (!Number.isInteger(record.quantity) || (record.quantity as number) < 1 || (record.quantity as number) > TICKET_ORDER_LIMIT) return null;
  if (typeof record.merch !== "string" || !Object.hasOwn(MERCH_OPTIONS, record.merch)) return null;

  const name = record.name.trim();
  const email = record.email.trim();
  const phone = typeof record.phone === "string" ? record.phone.trim().replace(/\s+/gu, " ") : "";
  const gender = (record.gender ?? "") as CreateTicketOrderInput["gender"];
  if (!name || name.length > 120 || !email || !emailPattern.test(email) || email.length > 254 || !phonePattern.test(phone)) return null;

  const merch = record.merch as MerchOption;
  const quantity = record.quantity as number;
  const ticketSubtotalVnd = quantity * TICKET_UNIT_PRICE_VND;
  const merchPriceVnd = MERCH_OPTIONS[merch].priceVnd;
  return {
    idempotencyKey: record.idempotencyKey,
    name,
    email,
    phone,
    gender,
    birthYear,
    quantity,
    merch,
    ticketSubtotalVnd,
    merchPriceVnd,
    totalVnd: ticketSubtotalVnd + merchPriceVnd,
  };
}

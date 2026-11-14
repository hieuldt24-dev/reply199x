import { ticketMerchOptions } from "@/app/(routes)/_data/home";

const allowedKeys = new Set(["name", "email", "phone", "gender", "birthYear", "quantity", "merch"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const controlCharacters = /[\u0000-\u001f\u007f]/u;
const genders = ["female", "male", "other", "undisclosed"] as const;

export type TicketRequest = Readonly<{
  name: string;
  email: string;
  phone: string;
  gender: (typeof genders)[number] | "";
  birthYear: number | null;
  quantity: number;
  merch: (typeof ticketMerchOptions)[number];
}>;

export type TicketRegistrationRow = readonly [
  timestamp: string,
  name: string,
  email: string,
  phone: string,
  gender: string,
  birthYear: number | "",
  quantity: number,
  merch: string,
];

export type TicketRequestValidation =
  | Readonly<{ valid: true; value: TicketRequest }>
  | Readonly<{ valid: false }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeString(value: unknown, maximumLength: number): value is string {
  return typeof value === "string" && value.length <= maximumLength && !controlCharacters.test(value);
}

function isMerchOption(value: string): value is TicketRequest["merch"] {
  return (ticketMerchOptions as readonly string[]).includes(value);
}

export function validateTicketRequest(input: unknown): TicketRequestValidation {
  if (!isRecord(input) || Object.keys(input).some((key) => !allowedKeys.has(key))) {
    return { valid: false };
  }

  const { name, email, phone, gender, birthYear, quantity, merch } = input;
  if (
    !isSafeString(name, 120)
    || !isSafeString(email, 254)
    || !isSafeString(merch, 120)
    || (gender !== undefined && (typeof gender !== "string" || !["", ...genders].includes(gender)))
    || (birthYear !== undefined && birthYear !== "" && typeof birthYear !== "string" && typeof birthYear !== "number")
    || typeof quantity !== "number"
    || !Number.isInteger(quantity)
    || quantity < 1
    || quantity > 4
  ) {
    return { valid: false };
  }

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const trimmedMerch = merch.trim();
  const normalizedGender = typeof gender === "string" ? gender : "";
  const normalizedBirthYear = birthYear === undefined || birthYear === "" ? null : Number(birthYear);
  const trimmedPhone = phone === undefined
    ? ""
    : isSafeString(phone, 40)
      ? phone.trim()
      : null;

  if (
    trimmedName.length === 0
    || trimmedEmail.length === 0
    || !emailPattern.test(trimmedEmail)
    || trimmedPhone === null
    || trimmedPhone.length > 40
    || !isMerchOption(trimmedMerch)
    || (normalizedBirthYear !== null && (!Number.isInteger(normalizedBirthYear) || normalizedBirthYear < 1900 || normalizedBirthYear > new Date().getFullYear()))
  ) {
    return { valid: false };
  }

  return {
    valid: true,
    value: {
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      gender: normalizedGender as TicketRequest["gender"],
      birthYear: normalizedBirthYear,
      quantity,
      merch: trimmedMerch,
    },
  };
}

export function mapTicketRequestToRow(
  request: TicketRequest,
  timestamp = new Date().toISOString(),
): TicketRegistrationRow {
  return [
    timestamp,
    request.name,
    request.email,
    request.phone,
    request.gender,
    request.birthYear ?? "",
    request.quantity,
    request.merch,
  ];
}

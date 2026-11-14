import "server-only";
import { google } from "googleapis";

const scopes = ["https://www.googleapis.com/auth/spreadsheets"];

export function createSheetsAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (raw === undefined) return new google.auth.GoogleAuth({ scopes });

  let credentials: unknown;
  try { credentials = JSON.parse(raw); }
  catch { throw new Error("invalid_google_service_account_configuration"); }
  if (!credentials || typeof credentials !== "object" || Array.isArray(credentials)) {
    throw new Error("invalid_google_service_account_configuration");
  }
  const fields = credentials as Record<string, unknown>;
  if (fields.type !== "service_account" || typeof fields.client_email !== "string" || !fields.client_email.trim() ||
    typeof fields.private_key !== "string" || !fields.private_key.trim()) {
    throw new Error("invalid_google_service_account_configuration");
  }
  // Select only credential fields; do not accept configurable token endpoints.
  return new google.auth.GoogleAuth({
    scopes,
    credentials: { type: "service_account", client_email: fields.client_email, private_key: fields.private_key },
  });
}

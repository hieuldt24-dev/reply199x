import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { GoogleAuth } = vi.hoisted(() => ({ GoogleAuth: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("googleapis", () => ({ google: { auth: { GoogleAuth } } }));
import { createSheetsAuth } from "./google-auth";

describe("server-only Sheets credentials", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_JSON", undefined); });
  afterEach(() => vi.unstubAllEnvs());

  it("preserves ADC when inline credentials are absent", () => {
    vi.stubEnv("GOOGLE_APPLICATION_CREDENTIALS", "./local-credentials.json");
    createSheetsAuth();
    expect(GoogleAuth).toHaveBeenCalledWith({ scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  });

  it("uses explicit inline credentials and excludes arbitrary endpoints", () => {
    const credentials = { type: "service_account", client_email: "test@example.iam.gserviceaccount.com", private_key: "test-key\nsecond-line" };
    vi.stubEnv("GOOGLE_APPLICATION_CREDENTIALS", "/does-not-exist.json");
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_JSON", JSON.stringify({ ...credentials, token_uri: "https://untrusted.example" }));
    createSheetsAuth();
    expect(GoogleAuth).toHaveBeenCalledWith({ scopes: ["https://www.googleapis.com/auth/spreadsheets"], credentials });
  });

  it.each(["", "private-invalid-json", "null", "[]", "{}", JSON.stringify({ type: "authorized_user", client_email: "test@example.com", private_key: "private" }), JSON.stringify({ type: "service_account", client_email: " ", private_key: "private" }), JSON.stringify({ type: "service_account", client_email: "test@example.com", private_key: "" })])("rejects malformed explicit credentials without ADC fallback (%#)", (raw) => {
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_JSON", raw);
    expect(createSheetsAuth).toThrow(/^invalid_google_service_account_configuration$/);
    expect(GoogleAuth).not.toHaveBeenCalled();
  });
});

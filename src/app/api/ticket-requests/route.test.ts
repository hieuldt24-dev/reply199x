import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTicketRequestHandler } from "./route";
import {
  mapTicketRequestToRow,
  validateTicketRequest,
  type TicketRequest,
  type TicketRegistrationRow,
} from "@/lib/ticket-registration/validation";

const { appendTicketRequestRow } = vi.hoisted(() => ({
  appendTicketRequestRow: vi.fn(),
}));

vi.mock("@/lib/ticket-registration/sheets", () => ({ appendTicketRequestRow }));

const validPayload = {
  name: "  Nguyễn An  ",
  email: "  an@example.com ",
  quantity: 2,
  merch: "Không kèm merch",
};

function request(
  body: string,
  options: Readonly<{
    origin?: string;
    contentType?: string;
    extraHeaders?: Record<string, string>;
  }> = {},
) {
  const headers = new Headers(options.extraHeaders);
  if (options.origin !== undefined) headers.set("Origin", options.origin);
  if (options.contentType !== undefined) headers.set("Content-Type", options.contentType);
  return new Request("http://localhost:3000/api/ticket-requests", {
    method: "POST",
    headers,
    body,
  });
}

function handler(
  appendRow: (row: TicketRegistrationRow) => Promise<number>,
  log = vi.fn(),
  siteUrl: string | undefined = "http://localhost:3000",
) {
  return createTicketRequestHandler({ siteUrl, appendRow, log });
}

describe("ticket request validation", () => {
  it("trims fields and accepts omitted or empty phone", () => {
    const omitted = validateTicketRequest(validPayload);
    const emptyPhone = validateTicketRequest({ ...validPayload, phone: "   " });

    expect(omitted.valid).toBe(true);
    expect(emptyPhone.valid).toBe(true);
    if (omitted.valid) expect(omitted.value).toMatchObject({ name: "Nguyễn An", email: "an@example.com", phone: "" });
    if (emptyPhone.valid) expect(emptyPhone.value.phone).toBe("");
  });

  it.each([null, 123, {}, []])("rejects invalid phone value %s", (phone) => {
    expect(validateTicketRequest({ ...validPayload, phone }).valid).toBe(false);
  });

  it.each([0, 5, 1.5, "2", null])("rejects invalid quantity %s", (quantity) => {
    expect(validateTicketRequest({ ...validPayload, quantity }).valid).toBe(false);
  });

  it("accepts quantity boundaries and rejects invalid fields", () => {
    expect(validateTicketRequest({ ...validPayload, quantity: 1 }).valid).toBe(true);
    expect(validateTicketRequest({ ...validPayload, quantity: 4 }).valid).toBe(true);
    expect(validateTicketRequest({ ...validPayload, name: "  " }).valid).toBe(false);
    expect(validateTicketRequest({ ...validPayload, email: "not-an-email" }).valid).toBe(false);
    expect(validateTicketRequest({ ...validPayload, extra: "unexpected" }).valid).toBe(false);
    expect(validateTicketRequest({ ...validPayload, merch: "Unlisted option" }).valid).toBe(false);
    expect(validateTicketRequest({ ...validPayload, phone: "x".repeat(41) }).valid).toBe(false);
    expect(validateTicketRequest({ ...validPayload, name: "x".repeat(121) }).valid).toBe(false);
    expect(validateTicketRequest({ ...validPayload, name: "Name\nInjected" }).valid).toBe(false);
  });

  it("maps a validated request to eight cells in the confirmed order", () => {
    const result = validateTicketRequest({
      ...validPayload,
      phone: "  0123456789 ",
      gender: "female",
      birthYear: "2000",
      quantity: 3,
      merch: 'Combo "Tuổi Xì Tin" · 99.000đ',
    });
    expect(result.valid).toBe(true);
    if (!result.valid) return;

    const request: TicketRequest = result.value;
    expect(mapTicketRequestToRow(request, "2026-11-12T00:00:00.000Z")).toEqual([
      "2026-11-12T00:00:00.000Z",
      "Nguyễn An",
      "an@example.com",
      "0123456789",
      "female",
      2000,
      3,
      'Combo "Tuổi Xì Tin" · 99.000đ',
    ]);
  });
});

describe("POST /api/ticket-requests", () => {
  beforeEach(() => vi.clearAllMocks());

  it("appends one fixed eight-cell row and confirms only the single-row result", async () => {
    const appendRow = vi.fn(async (row: TicketRegistrationRow) => {
      void row;
      return 1;
    });
    const response = await handler(appendRow)(request(JSON.stringify(validPayload), {
      origin: "http://localhost:3000",
      contentType: "application/json; charset=utf-8",
    }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ status: "recorded" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(appendRow).toHaveBeenCalledTimes(1);
    const [row] = appendRow.mock.calls[0];
    expect(row).toHaveLength(8);
    expect(row[0]).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/u);
    expect(row.slice(1)).toEqual(["Nguyễn An", "an@example.com", "", "", "", 2, "Không kèm merch"]);
  });

  it("preserves formula-looking input as a literal row value", async () => {
    const appendRow = vi.fn(async (row: TicketRegistrationRow) => {
      void row;
      return 1;
    });
    const response = await handler(appendRow)(request(JSON.stringify({
      ...validPayload,
      name: "=HYPERLINK(\"https://example.invalid\")",
    }), { origin: "http://localhost:3000", contentType: "application/json" }));

    expect(response.status).toBe(201);
    expect(appendRow.mock.calls[0][0][1]).toBe('=HYPERLINK("https://example.invalid")');
  });

  it("rejects missing, invalid, mismatched and forwarded-header-only origins", async () => {
    const appendRow = vi.fn(async (row: TicketRegistrationRow) => {
      void row;
      return 1;
    });
    const route = handler(appendRow);

    for (const origin of [undefined, "not a URL", "https://attacker.example"]) {
      const response = await route(request(JSON.stringify(validPayload), {
        origin,
        contentType: "application/json",
        extraHeaders: { "X-Forwarded-Host": "localhost:3000", "X-Forwarded-Proto": "http" },
      }));
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ code: "origin_rejected" });
    }

    expect(appendRow).not.toHaveBeenCalled();
  });

  it("fails closed when SITE_URL is missing or invalid", async () => {
    const appendRow = vi.fn(async (row: TicketRegistrationRow) => {
      void row;
      return 1;
    });
    for (const siteUrl of [undefined, "ftp://localhost:3000", "not a URL"]) {
      const route = createTicketRequestHandler({ siteUrl, appendRow, log: vi.fn() });
      const response = await route(
        request(JSON.stringify(validPayload), {
          origin: "http://localhost:3000",
          contentType: "application/json",
        }),
      );
      expect(response.status).toBe(403);
    }
    expect(appendRow).not.toHaveBeenCalled();
  });

  it("rejects unsupported media type, malformed JSON, unknown fields and oversized streamed bodies", async () => {
    const appendRow = vi.fn(async (row: TicketRegistrationRow) => {
      void row;
      return 1;
    });
    const route = handler(appendRow);

    expect((await route(request("{}", { origin: "http://localhost:3000", contentType: "text/plain" }))).status).toBe(415);
    expect((await route(request("{", { origin: "http://localhost:3000", contentType: "application/json" }))).status).toBe(400);
    expect((await route(request(JSON.stringify({ ...validPayload, unexpected: true }), {
      origin: "http://localhost:3000",
      contentType: "application/json",
    }))).status).toBe(400);

    const oversized = await route(request(" ".repeat(8 * 1024 + 1), {
      origin: "http://localhost:3000",
      contentType: "application/json",
    }));
    expect(oversized.status).toBe(413);
    expect(await oversized.json()).toMatchObject({ code: "payload_too_large" });
    expect(appendRow).not.toHaveBeenCalled();
  });

  it("returns generic failure and logs only fixed-safe diagnostic fields", async () => {
    const secretLookingProviderError = "provider detail, attendee@example.test, sheet-id-secret";
    const appendRow = vi.fn(async (row: TicketRegistrationRow) => {
      void row;
      throw new Error(secretLookingProviderError);
    });
    const log = vi.fn();
    const response = await handler(appendRow, log)(request(JSON.stringify({
      ...validPayload,
      email: "attendee@example.test",
    }), { origin: "http://localhost:3000", contentType: "application/json" }));
    const responseText = await response.text();

    expect(response.status).toBe(503);
    expect(responseText).not.toContain(secretLookingProviderError);
    expect(responseText).not.toContain("attendee@example.test");
    expect(responseText).toContain("temporarily_unavailable");
    expect(log).toHaveBeenCalledOnce();
    expect(log.mock.calls[0][0]).toMatchObject({ category: "append_failed" });
    expect(JSON.stringify(log.mock.calls[0][0])).not.toContain(secretLookingProviderError);
    expect(JSON.stringify(log.mock.calls[0][0])).not.toContain("attendee@example.test");
    expect(JSON.stringify(log.mock.calls[0][0])).not.toContain("sheet-id-secret");
  });

  it("does not confirm an ambiguous or multi-row append result", async () => {
    const appendRow = vi.fn(async (row: TicketRegistrationRow) => {
      void row;
      return 0;
    });
    const response = await handler(appendRow)(request(JSON.stringify(validPayload), {
      origin: "http://localhost:3000",
      contentType: "application/json",
    }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "temporarily_unavailable" });
  });
});

import { describe, expect, it } from "vitest";
import { MERCH_OPTIONS, TICKET_UNIT_PRICE_VND, validateCreateTicketOrder } from "./validation";

const key = "8c5f4d5b-66f9-4a41-9e07-3f46fae90e12";
const survey = { source: ["zalo", "facebook"], area: "hai-chau", attendance: "confirmed" };
const attendee = { name: "Nguyễn An", email: "an@example.com", phone: "", gender: "", birthYear: null, survey };
const order = (overrides: Record<string, unknown> = {}) => ({ idempotencyKey: key, ...attendee, quantity: 1, merch: "none", ...overrides });
const withSurvey = (overrides: Record<string, unknown>) => order({ survey: { ...survey, ...overrides } });

describe("validateCreateTicketOrder", () => {
  it.each([1, 2, 3, 4])("computes server price for %i tickets including drink", (quantity) => {
    const order = validateCreateTicketOrder({ idempotencyKey: key, ...attendee, quantity, merch: "none" });
    expect(order?.ticketSubtotalVnd).toBe(quantity * TICKET_UNIT_PRICE_VND);
    expect(order?.totalVnd).toBe(quantity * 169_000);
  });

  it.each(Object.entries(MERCH_OPTIONS))("adds the fixed price for merch option %s", (option, merch) => {
    const order = validateCreateTicketOrder({ idempotencyKey: key, ...attendee, quantity: 1, merch: option });
    expect(order?.merchPriceVnd).toBe(merch.priceVnd);
    expect(order?.totalVnd).toBe(TICKET_UNIT_PRICE_VND + merch.priceVnd);
  });

  it.each([
    null, [], { idempotencyKey: "bad", ...attendee, quantity: 1, merch: "none" },
    { idempotencyKey: key, ...attendee, quantity: 0, merch: "none" },
    { idempotencyKey: key, ...attendee, quantity: 5, merch: "none" },
    { idempotencyKey: key, ...attendee, quantity: 1, merch: "unknown" },
    { idempotencyKey: key, ...attendee, quantity: 1, merch: "none", totalVnd: 1 },
    { idempotencyKey: key, ...attendee, quantity: 1.5, merch: "none" },
    { idempotencyKey: key, ...attendee, email: "bad", quantity: 1, merch: "none" },
    { idempotencyKey: key, ...attendee, name: " \n ", quantity: 1, merch: "none" },
    { idempotencyKey: key, ...attendee, phone: "ext<script>", quantity: 1, merch: "none" },
    { idempotencyKey: key, ...attendee, gender: "unknown", quantity: 1, merch: "none" },
    { idempotencyKey: key, ...attendee, birthYear: String(new Date().getFullYear() + 1), quantity: 1, merch: "none" },
  ])("rejects malformed or tampered input %#", (payload) => {
    expect(validateCreateTicketOrder(payload)).toBeNull();
  });

  it("trims attendee fields and preserves the user-entered email", () => {
    expect(validateCreateTicketOrder({
      idempotencyKey: key,
      name: "  Nguyễn An  ",
      email: "  An@Example.com  ",
      phone: "  +84  123 456  ",
      gender: "female",
      birthYear: "2000",
      quantity: 2,
      merch: "tuoi-xi-tin",
      survey,
    })).toMatchObject({
      name: "Nguyễn An", email: "An@Example.com", phone: "+84 123 456", gender: "female", birthYear: 2000,
      ticketSubtotalVnd: 338000, merchPriceVnd: 99000, totalVnd: 437000,
    });
  });

  it("returns the survey normalized to canonical Q6 order", () => {
    expect(validateCreateTicketOrder(order())?.survey).toEqual({ source: ["facebook", "zalo"], area: "hai-chau", attendance: "confirmed" });
  });

  it("gives the same survey for two click orders of the same Q6 set", () => {
    const first = validateCreateTicketOrder(withSurvey({ source: ["website", "tiktok", "facebook"] }));
    const second = validateCreateTicketOrder(withSurvey({ source: ["facebook", "website", "tiktok"] }));
    expect(first?.survey).toEqual(second?.survey);
    expect(first?.survey.source).toEqual(["facebook", "tiktok", "website"]);
  });

  const prototypeNames = ["constructor", "__proto__", "toString", "hasOwnProperty"];

  const invalidSurveyCases: readonly (readonly [string, unknown])[] = [
    ["survey missing", { idempotencyKey: key, name: attendee.name, email: attendee.email, quantity: 1, merch: "none" }],
    ["survey null", order({ survey: null })],
    ["survey array", order({ survey: [survey] })],
    ["survey string", order({ survey: "facebook" })],
    ["source missing", order({ survey: { area: "hai-chau", attendance: "confirmed" } })],
    ["area missing", order({ survey: { source: ["facebook"], attendance: "confirmed" } })],
    ["attendance missing", order({ survey: { source: ["facebook"], area: "hai-chau" } })],
    ["source not array", withSurvey({ source: "facebook" })],
    ["source element not string", withSurvey({ source: ["facebook", 7] })],
    ["source duplicate", withSurvey({ source: ["zalo", "zalo"] })],
    ["source duplicate after normalization", withSurvey({ source: ["zalo", "facebook", "zalo"] })],
    ["source empty", withSurvey({ source: [] })],
    ["source unknown", withSurvey({ source: ["instagram"] })],
    ["area unknown", withSurvey({ area: "ha-noi" })],
    ["area wrong type", withSurvey({ area: 3 })],
    ["attendance unknown", withSurvey({ attendance: "maybe" })],
    ["attendance wrong type", withSurvey({ attendance: false })],
    ["unknown key inside survey", withSurvey({ other: "x" })],
    ["unknown key outside survey", order({ surveyExtra: true })],
    ...prototypeNames.flatMap((name) => [
      [`source prototype id ${name}`, withSurvey({ source: [name] })],
      [`area prototype id ${name}`, withSurvey({ area: name })],
      [`attendance prototype id ${name}`, withSurvey({ attendance: name })],
    ] as const),
  ];

  it.each(invalidSurveyCases)("rejects an invalid survey with a bare null: %s", (_name, payload) => {
    expect(validateCreateTicketOrder(payload)).toBeNull();
  });

  // Oversized bodies are rejected by the route's existing 8 KiB limit before validation runs (covered in route tests).
});

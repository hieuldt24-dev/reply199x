import { describe, expect, it } from "vitest";
import { MERCH_OPTIONS, TICKET_UNIT_PRICE_VND, validateCreateTicketOrder } from "./validation";

const key = "8c5f4d5b-66f9-4a41-9e07-3f46fae90e12";
const attendee = { name: "Nguyễn An", email: "an@example.com", phone: "", gender: "", birthYear: null };

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
    })).toMatchObject({
      name: "Nguyễn An", email: "An@Example.com", phone: "+84 123 456", gender: "female", birthYear: 2000,
      ticketSubtotalVnd: 338000, merchPriceVnd: 99000, totalVnd: 437000,
    });
  });
});

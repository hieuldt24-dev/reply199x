import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PaymentReturnPage from "./page";

describe("payment return page navigation", () => {
  it("always provides a homepage link when no order ID is present", async () => {
    const element = await PaymentReturnPage({ searchParams: Promise.resolve({}) });
    const markup = renderToStaticMarkup(element);
    expect(markup).toContain('href="/#su-kien"');
  });
});

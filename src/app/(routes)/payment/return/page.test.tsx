import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUser, redirect } = vi.hoisted(() => ({
  getUser: vi.fn(),
  redirect: vi.fn((): never => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser } })),
}));
vi.mock("next/navigation", () => ({ redirect }));

import PaymentReturnPage from "./page";

describe("payment return page", () => {
  beforeEach(() => {
    getUser.mockReset();
    redirect.mockClear();
  });

  it("redirects to / when no user is signed in", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(PaymentReturnPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("redirects to / when getUser returns an error", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error("bad") });
    await expect(PaymentReturnPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("redirects to / when the session client throws", async () => {
    getUser.mockRejectedValue(new Error("config"));
    await expect(PaymentReturnPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("renders the homepage link for a signed-in user without an order ID", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const element = await PaymentReturnPage({ searchParams: Promise.resolve({}) });
    const markup = renderToStaticMarkup(element);
    expect(redirect).not.toHaveBeenCalled();
    expect(markup).toContain('href="/#su-kien"');
  });
});

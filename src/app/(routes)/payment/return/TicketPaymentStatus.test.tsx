// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TicketPaymentStatus } from "./TicketPaymentStatus";

const { push, router } = vi.hoisted(() => {
  const push = vi.fn();
  return { push, router: { push } };
});
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const pendingOrder = {
  status: "pending_payment",
  totalVnd: 169000,
  paymentExpiresAt: "2026-11-14T09:18:28.097Z",
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  push.mockReset();
});

describe("TicketPaymentStatus return behavior", () => {
  it("redirects home after the server confirms paid", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ order: { ...pendingOrder, status: "paid" } }),
    }));

    render(<TicketPaymentStatus orderId="order-123" />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(screen.getByRole("status")).toHaveTextContent("169.000");
    expect(push).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(2999); });
    expect(push).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(push).toHaveBeenCalledWith("/#su-kien");
  });

  it("keeps polling and does not redirect while the server reports pending", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ order: pendingOrder }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<TicketPaymentStatus orderId="order-123" />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(screen.getByRole("status")).toHaveTextContent("169.000");
    await act(async () => { vi.advanceTimersByTime(3000); await Promise.resolve(); await Promise.resolve(); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(push).not.toHaveBeenCalled();
  });
});

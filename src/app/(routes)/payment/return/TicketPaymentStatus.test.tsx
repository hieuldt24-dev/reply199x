// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: state });
  document.dispatchEvent(new Event("visibilitychange"));
}

function response(status = "pending_payment") {
  return { ok: true, status: 200, json: async () => ({ order: { ...pendingOrder, status } }) };
}

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

beforeEach(() => {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  push.mockReset();
});

describe("TicketPaymentStatus return behavior", () => {
  it("pauses hidden polling and measures the same visible30-hidden60-visible30 workload", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(response());
    vi.stubGlobal("fetch", fetchMock);
    render(<TicketPaymentStatus orderId="order-123" />);
    await flush();
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    const visibleBefore = fetchMock.mock.calls.length;
    act(() => setVisibility("hidden"));
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    const hiddenPolls = fetchMock.mock.calls.length - visibleBefore;
    act(() => setVisibility("visible"));
    await flush();
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    console.info("STATUS_WORKLOAD", JSON.stringify({ visibleBefore, hiddenPolls, totalRequests: fetchMock.mock.calls.length, simulatedMs: 120000 }));
    expect(hiddenPolls).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(22);
  });

  it("does not start requests while initially hidden and coalesces visible events", async () => {
    vi.useFakeTimers();
    setVisibility("hidden");
    const fetchMock = vi.fn().mockResolvedValue(response());
    vi.stubGlobal("fetch", fetchMock);
    render(<TicketPaymentStatus orderId="order-123" />);
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
    act(() => { setVisibility("visible"); setVisibility("visible"); });
    await flush();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("aborts a hidden request and ignores its later JSON resolution", async () => {
    let resolveJson!: (value: unknown) => void;
    const json = new Promise((resolve) => { resolveJson = resolve; });
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => json }).mockResolvedValue(response());
    vi.stubGlobal("fetch", fetchMock);
    render(<TicketPaymentStatus orderId="order-123" />);
    await flush();
    const signal = fetchMock.mock.calls[0]?.[1]?.signal as AbortSignal;
    act(() => setVisibility("hidden"));
    expect(signal?.aborted).toBe(true);
    await act(async () => { resolveJson({ order: { ...pendingOrder, status: "paid" } }); });
    expect(screen.getByRole("status")).not.toHaveTextContent("Đã nhận thanh toán");
    act(() => setVisibility("visible"));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("status")).toHaveTextContent("169.000");
  });

  it("discards the previous order response after the order changes and aborts on unmount", async () => {
    let resolveJson!: (value: unknown) => void;
    const json = new Promise((resolve) => { resolveJson = resolve; });
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => json }).mockResolvedValue(response("expired"));
    vi.stubGlobal("fetch", fetchMock);
    const { rerender, unmount } = render(<TicketPaymentStatus orderId="old-order" />);
    await flush();
    const oldSignal = fetchMock.mock.calls[0]?.[1]?.signal as AbortSignal;
    rerender(<TicketPaymentStatus orderId="new-order" />);
    await flush();
    await act(async () => { resolveJson({ order: { ...pendingOrder, status: "paid" } }); });
    expect(oldSignal?.aborted).toBe(true);
    expect(screen.getByRole("status")).toHaveTextContent("đã hết");
    unmount();
    expect(push).not.toHaveBeenCalled();
  });

  it("keeps at most one request active and aborts it when leaving the page", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn<typeof fetch>(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    const { unmount } = render(<TicketPaymentStatus orderId="order-123" />);
    await flush();
    await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
    act(() => setVisibility("visible"));
    expect(fetchMock).toHaveBeenCalledOnce();
    const options = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    unmount();
    expect(options?.signal?.aborted).toBe(true);
  });

  it("cleans up the paid redirect when navigating away", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(response("paid"));
    vi.stubGlobal("fetch", fetchMock);
    const { unmount } = render(<TicketPaymentStatus orderId="order-123" />);
    await flush();
    act(() => { setVisibility("hidden"); setVisibility("visible"); });
    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();
  });

  it.each(["http", "malformed", "network"])("retries transient %s errors after five seconds", async (failure) => {
    vi.useFakeTimers();
    const fetchMock = vi.fn();
    if (failure === "network") fetchMock.mockRejectedValueOnce(new Error("offline"));
    else fetchMock.mockResolvedValueOnce(failure === "http" ? { ok: false, status: 503 } : { ok: true, status: 200, json: async () => ({ order: {} }) });
    fetchMock.mockResolvedValue(response());
    vi.stubGlobal("fetch", fetchMock);
    render(<TicketPaymentStatus orderId="order-123" />);
    await flush();
    expect(screen.getByRole("status")).toHaveTextContent("tự thử lại");
    await act(async () => { await vi.advanceTimersByTimeAsync(4999); });
    expect(fetchMock).toHaveBeenCalledOnce();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(["expired", "failed", "reconciliation", "refunded", "unauthorized"])("stops polling across visibility changes for %s", async (status) => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(status === "unauthorized" ? { ok: false, status: 401 } : response(status));
    vi.stubGlobal("fetch", fetchMock);
    render(<TicketPaymentStatus orderId="order-123" />);
    await flush();
    act(() => { setVisibility("hidden"); setVisibility("visible"); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
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

// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { TicketRequestDialog } from "./TicketRequestDialog";

vi.mock("./RemoteImage", () => ({ RemoteImage: () => <span aria-hidden="true" /> }));

async function openDialog() {
  const user = userEvent.setup();
  render(<TicketRequestDialog className="trigger">Request tickets</TicketRequestDialog>);
  await user.click(screen.getByRole("button", { name: "Request tickets" }));
  return user;
}

async function fillContact(user: ReturnType<typeof userEvent.setup>, email = "minh.anh@example.com") {
  await user.type(screen.getByLabelText(/Họ và tên/u), "Minh Anh Nguyễn");
  await user.type(screen.getByLabelText(/^Email/u), email);
  await user.type(screen.getByLabelText(/Số điện thoại/u), "+84 912 345 678");
  await user.selectOptions(screen.getByLabelText(/Giới tính/u), "female");
  await user.type(screen.getByLabelText(/Năm sinh/u), "2000");
}

function orderResponse(id = "order-123", totalVnd = 169000) {
  return { ok: true, status: 201, json: async () => ({
    order: { id, totalVnd, status: "pending_payment" },
    checkoutUrl: "https://pay.payos.vn/web/payment-link-123",
  }) } as Response;
}

describe("TicketRequestDialog purchase flow", () => {
  it("explains reconciliation and retains the same request key on retry", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: { code: "checkout_reconciliation_required" } }) } as Response);
    vi.stubGlobal("fetch", fetchMock);
    const user = await openDialog();
    await fillContact(user);
    await user.click(screen.getByRole("button", { name: /Tiếp tục đặt vé/u }));
    expect(await screen.findByRole("status")).toHaveTextContent("Đơn đang cần đối soát với PayOS");
    await user.click(screen.getByRole("button", { name: /Tiếp tục đặt vé/u }));
    const keys = fetchMock.mock.calls.map((call) => JSON.parse(String(call[1]?.body)).idempotencyKey);
    expect(keys[0]).toBe(keys[1]);
  });
  beforeAll(() => {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
    Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); } });
  });

  afterAll(() => {
    Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
  });

  beforeEach(() => vi.unstubAllGlobals());

  it("posts attendee details with order choices and displays pending payment with the server total", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    const fetchMock = vi.fn<typeof fetch>(async () => orderResponse("order-123", 437000));
    vi.stubGlobal("fetch", fetchMock);
    const user = await openDialog();
    await fillContact(user);

    expect(screen.getByText(/chọn một gói cho đơn/u)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/Số lượng vé/u), "2");
    await user.selectOptions(screen.getByLabelText(/Merch/u), "tuoi-xi-tin");
    expect(screen.getByText(/Tạm tính:/u).parentElement).toHaveTextContent("437.000đ");
    await user.click(screen.getByRole("button", { name: /Tiếp tục đặt vé/u }));

    expect(await screen.findByRole("status")).toHaveTextContent(/chuyển bạn đến PayOS/u);
    expect(screen.getByRole("status")).toHaveTextContent("order-123");
    expect(screen.getByRole("status")).toHaveTextContent("437.000đ");
    const [url, options] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("/api/ticket-orders");
    expect(options?.method).toBe("POST");
    expect(JSON.parse(String(options?.body))).toMatchObject({
      name: "Minh Anh Nguyễn",
      email: "minh.anh@example.com",
      phone: "+84 912 345 678",
      gender: "female",
      birthYear: 2000,
      quantity: 2,
      merch: "tuoi-xi-tin",
    });
    expect(JSON.parse(String(options?.body))).not.toHaveProperty("merchOption");
    expect(JSON.parse(String(options?.body)).idempotencyKey).toMatch(/^[\da-f-]{36}$/iu);
    expect(assign).toHaveBeenCalledWith("https://pay.payos.vn/web/payment-link-123");
  });

  it("reuses the idempotency key on retry and rotates it when attendee data changes", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) } as Response)
      .mockResolvedValueOnce(orderResponse());
    vi.stubGlobal("fetch", fetchMock);
    const user = await openDialog();
    await fillContact(user);
    const submit = () => user.click(screen.getByRole("button", { name: /Tiếp tục đặt vé/u }));
    await submit();
    await screen.findByRole("status");
    await submit();
    await user.clear(screen.getByLabelText(/^Email/u));
    await user.type(screen.getByLabelText(/^Email/u), "minh.anh+2@example.com");
    await submit();

    const firstPayload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const retryPayload = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    const changedPayload = JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body));
    expect(retryPayload.idempotencyKey).toBe(firstPayload.idempotencyKey);
    expect(retryPayload).toMatchObject({ quantity: 1, merch: "none", email: "minh.anh@example.com" });
    expect(changedPayload.idempotencyKey).not.toBe(firstPayload.idempotencyKey);
    expect(changedPayload).toMatchObject({ quantity: 1, merch: "none", email: "minh.anh+2@example.com" });
  });

  it("offers Google sign-in after an unauthorized response", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(async () => ({ ok: false, status: 401, json: async () => ({}) }) as Response));
    const user = await openDialog();
    await fillContact(user);
    await user.click(screen.getByRole("button", { name: /Tiếp tục đặt vé/u }));

    expect(await screen.findByRole("status")).toHaveAttribute("data-status", "unauthorized");
    expect(screen.getByRole("link", { name: /Đăng nhập bằng Google/u })).toHaveAttribute("href", "/auth/sign-in");
  });

  it("ignores duplicate activation while pending", async () => {
    let resolveFetch: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn<typeof fetch>(() => new Promise<Response>((resolve) => { resolveFetch = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    await openDialog();
    const form = screen.getByLabelText(/Số lượng vé/u).closest("form");
    if (!form) throw new Error("Ticket order form was not rendered");
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(fetchMock).toHaveBeenCalledOnce();

    resolveFetch?.(orderResponse());
    await waitFor(() => expect(screen.getByRole("status")).toHaveAttribute("data-status", "success"));
  });
});

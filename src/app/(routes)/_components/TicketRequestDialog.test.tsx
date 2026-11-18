// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { TicketRequestDialog } from "./TicketRequestDialog";
import {
  SURVEY_AREA_OPTIONS,
  SURVEY_ATTENDANCE_OPTIONS,
  SURVEY_QUESTIONS,
  SURVEY_SOURCE_OPTIONS,
  surveyFieldErrors,
} from "@/lib/ticket-orders/survey";
import { TICKET_ORDER_LIMIT } from "@/lib/ticket-orders/validation";

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

type User = ReturnType<typeof userEvent.setup>;
const sourceLabel = (id: string) => SURVEY_SOURCE_OPTIONS.find((option) => option.id === id)?.label ?? id;
const attendanceLabel = (id: string) => SURVEY_ATTENDANCE_OPTIONS.find((option) => option.id === id)?.label ?? id;
const messages = surveyFieldErrors({ source: [], area: "", attendance: "" });
const questions = [SURVEY_QUESTIONS.source, SURVEY_QUESTIONS.area, SURVEY_QUESTIONS.attendance];
const areaSelect = (options?: { hidden: boolean }) => screen.getByRole("combobox", { name: SURVEY_QUESTIONS.area, ...options });

async function fillSurvey(user: User, source = ["facebook"], area = "hai-chau", attendance = "confirmed") {
  for (const id of source) await user.click(screen.getByRole("checkbox", { name: sourceLabel(id) }));
  await user.selectOptions(areaSelect(), area);
  await user.click(screen.getByRole("radio", { name: attendanceLabel(attendance) }));
}

const nextButton = () => screen.getByRole("button", { name: "Tiếp tục" });
const backButton = () => screen.getByRole("button", { name: "Quay lại" });
const submitButton = () => screen.getByRole("button", { name: /Tiếp tục đặt phiếu nước/u });
const groupFor = (question: string) => screen.getByRole("group", { name: question });
const alertTexts = () => screen.queryAllByRole("alert").map((alert) => alert.textContent);
const progressItems = () => within(screen.getByRole("list", { name: "Tiến độ đặt phiếu nước" })).getAllByRole("listitem");
const currentStep = () => progressItems().findIndex((item) => item.getAttribute("aria-current") === "step") + 1;
const totalIn = (regionName: string) => within(screen.getByLabelText(regionName)).getByText("Tạm tính").parentElement;

/** Step 1 contact → step 2 survey → step 3 review. */
async function fillAll(user: User, email?: string) {
  await fillContact(user, email);
  await user.click(nextButton());
  await fillSurvey(user);
  await user.click(nextButton());
}

function orderResponse(id = "order-123", totalVnd = 169000) {
  return { ok: true, status: 201, json: async () => ({
    order: { id, totalVnd, status: "pending_payment" },
    checkoutUrl: "https://pay.payos.vn/web/payment-link-123",
  }) } as Response;
}

describe("TicketRequestDialog purchase flow", () => {
  it("explains the account restriction and retry time while retaining form values and request identity", async () => {
    const retryAt = "2026-11-16T12:34:56.000Z";
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({ ok: false, status: 429, json: async () => ({ error: { code: "checkout_restricted", retryAt } }) } as Response);
    vi.stubGlobal("fetch", fetchMock);
    const user = await openDialog();
    await fillAll(user);
    await user.click(screen.getByRole("button", { name: /Tiếp tục đặt phiếu nước/u }));
    expect(screen.getByRole("status")).toHaveAttribute("data-status", "restricted");
    expect(screen.getByRole("status")).toHaveTextContent("3 đơn hết hạn trong 1 giờ");
    expect(screen.getByRole("status")).toHaveTextContent(new Date(retryAt).toLocaleString("vi-VN"));
    expect(screen.getByLabelText(/^Email/u)).toHaveValue("minh.anh@example.com");
    expect(fetchMock).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: /Tiếp tục đặt phiếu nước/u }));
    const payloads = fetchMock.mock.calls.map((call) => JSON.parse(String(call[1]?.body)));
    expect(payloads[1]).toEqual(payloads[0]);
  });

  it.each([undefined, "not-a-date", "123", 123])("safely handles a malformed restriction retry time %s", async (retryAt) => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue({ ok: false, status: 429, json: async () => ({ error: { code: "checkout_restricted", retryAt } }) } as Response));
    const user = await openDialog();
    await fillAll(user);
    await user.click(screen.getByRole("button", { name: /Tiếp tục đặt phiếu nước/u }));
    expect(screen.getByRole("status")).toHaveAttribute("data-status", "error");
    expect(screen.getByRole("status")).not.toHaveTextContent("Invalid Date");
  });

  it("explains reconciliation and retains the same request key on retry", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: { code: "checkout_reconciliation_required" } }) } as Response);
    vi.stubGlobal("fetch", fetchMock);
    const user = await openDialog();
    await fillAll(user);
    await user.click(screen.getByRole("button", { name: /Tiếp tục đặt phiếu nước/u }));
    expect(await screen.findByRole("status")).toHaveTextContent("Đơn đang cần đối soát với PayOS");
    await user.click(screen.getByRole("button", { name: /Tiếp tục đặt phiếu nước/u }));
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
    await user.click(screen.getByRole("button", { name: "Tăng số phiếu nước" }));
    await user.selectOptions(screen.getByLabelText(/Merch/u), "tuoi-xi-tin");
    expect(totalIn("Cuống phiếu nước")).toHaveTextContent("437.000đ");
    await user.click(nextButton());
    await fillSurvey(user);
    await user.click(nextButton());
    await user.click(screen.getByRole("button", { name: /Tiếp tục đặt phiếu nước/u }));

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
      survey: { source: ["facebook"], area: "hai-chau", attendance: "confirmed" },
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
    await fillAll(user);
    const submit = () => user.click(screen.getByRole("button", { name: /Tiếp tục đặt phiếu nước/u }));
    await submit();
    await screen.findByRole("status");
    await submit();
    await user.click(backButton());
    await user.click(backButton());
    await user.clear(screen.getByLabelText(/^Email/u));
    await user.type(screen.getByLabelText(/^Email/u), "minh.anh+2@example.com");
    await user.click(nextButton());
    await user.click(nextButton());
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
    await fillAll(user);
    await user.click(screen.getByRole("button", { name: /Tiếp tục đặt phiếu nước/u }));

    expect(await screen.findByRole("status")).toHaveAttribute("data-status", "unauthorized");
    expect(screen.getByRole("link", { name: /Đăng nhập bằng Google/u })).toHaveAttribute("href", "/auth/sign-in");
  });

  it("ignores duplicate activation while pending", async () => {
    let resolveFetch: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn<typeof fetch>(() => new Promise<Response>((resolve) => { resolveFetch = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    const user = await openDialog();
    await fillAll(user);
    const form = submitButton().closest("form");
    if (!form) throw new Error("Ticket order form was not rendered");
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(fetchMock).toHaveBeenCalledOnce();

    resolveFetch?.(orderResponse());
    await waitFor(() => expect(screen.getByRole("status")).toHaveAttribute("data-status", "success"));
  });
  it("renders the three survey questions verbatim in canonical order without required or optional markers", async () => {
    const user = await openDialog();
    await fillContact(user);
    await user.click(nextButton());
    questions.forEach((question) => {
      const group = groupFor(question);
      expect(group.querySelector("legend")?.textContent).toBe(question);
      expect(group.textContent).not.toMatch(/\*|Bắt buộc|Tùy chọn/u);
      group.querySelectorAll("input, select").forEach((control) => expect(control).not.toBeRequired());
      expect(group).not.toHaveAttribute("aria-invalid");
    });
    const labelTexts = (question: string) => Array.from(groupFor(question).querySelectorAll("label")).map((label) => label.textContent);
    expect(labelTexts(SURVEY_QUESTIONS.source)).toEqual(SURVEY_SOURCE_OPTIONS.map((option) => option.label));
    expect(labelTexts(SURVEY_QUESTIONS.attendance)).toEqual(SURVEY_ATTENDANCE_OPTIONS.map((option) => option.label));
    const areaOptions = Array.from(areaSelect().querySelectorAll("option")).filter((option) => option.value !== "");
    expect(areaOptions.map((option) => [option.value, option.textContent])).toEqual(SURVEY_AREA_OPTIONS.map((option) => [option.id, option.label]));
    expect(groupFor(SURVEY_QUESTIONS.source).querySelectorAll('input[type="checkbox"]')).toHaveLength(8);
    expect(areaOptions).toHaveLength(8);
    expect(groupFor(SURVEY_QUESTIONS.attendance).querySelectorAll('input[type="radio"]')).toHaveLength(2);
    expect(SURVEY_QUESTIONS.attendance).toContain("Anh/ chị");
  });

  it("shows a Vietnamese error per empty group, focuses the first invalid group and never fetches", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const user = await openDialog();
    await fillContact(user);
    await user.click(nextButton());
    await user.click(nextButton());
    expect(alertTexts()).toEqual([messages.source, messages.area, messages.attendance]);
    for (const question of questions) {
      const describedBy = groupFor(question).getAttribute("aria-describedby");
      expect(describedBy).toBeTruthy();
      expect(document.getElementById(String(describedBy))).toHaveAttribute("role", "alert");
    }
    expect(screen.getByRole("checkbox", { name: sourceLabel("facebook") })).toHaveFocus();
    expect(screen.getByRole("status")).toHaveAttribute("data-status", "idle");
    expect(currentStep()).toBe(2);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["source", "area", "attendance"] as const)("blocks submit with only the %s group empty", async (missing) => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const user = await openDialog();
    await fillContact(user);
    await user.click(nextButton());
    if (missing !== "source") await user.click(screen.getByRole("checkbox", { name: sourceLabel("zalo") }));
    if (missing !== "area") await user.selectOptions(areaSelect(), "son-tra");
    if (missing !== "attendance") await user.click(screen.getByRole("radio", { name: attendanceLabel("unsure") }));
    await user.click(nextButton());
    expect(alertTexts()).toEqual([messages[missing]]);
    expect(groupFor(SURVEY_QUESTIONS[missing]).querySelector("input, select")).toHaveFocus();
    expect(currentStep()).toBe(2);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("toggles multi-select answers and treats unchecking every source as empty", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const user = await openDialog();
    await fillContact(user);
    await user.click(nextButton());
    const facebook = screen.getByRole("checkbox", { name: sourceLabel("facebook") });
    const tiktok = screen.getByRole("checkbox", { name: sourceLabel("tiktok") });
    await user.click(facebook);
    await user.click(tiktok);
    expect(facebook).toBeChecked();
    expect(tiktok).toBeChecked();
    await user.click(facebook);
    await user.click(tiktok);
    expect(facebook).not.toBeChecked();
    expect(tiktok).not.toBeChecked();
    await user.selectOptions(areaSelect(), "hai-chau");
    await user.click(screen.getByRole("radio", { name: attendanceLabel("confirmed") }));
    await user.click(nextButton());
    expect(alertTexts()).toEqual([messages.source]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the key for the same answers in a different click order and rotates it when answers change", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) } as Response);
    vi.stubGlobal("fetch", fetchMock);
    const user = await openDialog();
    await fillContact(user);
    await user.click(nextButton());
    await fillSurvey(user, ["website", "facebook"]);
    await user.click(nextButton());
    await user.click(submitButton());
    await waitFor(() => expect(screen.getByRole("status")).toHaveAttribute("data-status", "error"));
    await user.click(backButton());
    const website = screen.getByRole("checkbox", { name: sourceLabel("website") });
    const facebook = screen.getByRole("checkbox", { name: sourceLabel("facebook") });
    await user.click(website);
    await user.click(facebook);
    await user.click(facebook);
    await user.click(website);
    await user.click(nextButton());
    await user.click(submitButton());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await user.click(backButton());
    await user.selectOptions(areaSelect(), "cam-le");
    await user.click(nextButton());
    await user.click(submitButton());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const payloads = fetchMock.mock.calls.map((call) => JSON.parse(String(call[1]?.body)));
    expect(payloads[0]?.survey).toEqual({ source: ["facebook", "website"], area: "hai-chau", attendance: "confirmed" });
    expect(payloads[1]).toEqual(payloads[0]);
    expect(payloads[2]?.survey.area).toBe("cam-le");
    expect(payloads[2]?.idempotencyKey).not.toBe(payloads[0]?.idempotencyKey);
  });

  it("clears survey answers and errors after a successful order is closed", async () => {
    vi.stubGlobal("location", { assign: vi.fn() });
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(async () => orderResponse()));
    const user = await openDialog();
    await fillContact(user);
    await user.click(nextButton());
    await user.click(nextButton());
    expect(alertTexts()).toHaveLength(3);
    await fillSurvey(user);
    expect(alertTexts()).toHaveLength(0);
    await user.click(nextButton());
    await user.click(submitButton());
    await waitFor(() => expect(screen.getByRole("status")).toHaveAttribute("data-status", "success"));
    await user.click(screen.getByRole("button", { name: "Đóng biểu mẫu" }));
    await user.click(screen.getByRole("button", { name: "Request tickets" }));
    expect(screen.getByRole("checkbox", { name: sourceLabel("facebook"), hidden: true })).not.toBeChecked();
    expect(areaSelect({ hidden: true })).toHaveValue("");
    expect(screen.getByRole("radio", { name: attendanceLabel("confirmed"), hidden: true })).not.toBeChecked();
    expect(screen.queryAllByRole("alert", { hidden: true })).toHaveLength(0);
  });

  it("should not advance from step 1 with empty name or invalid email and should show inline Vietnamese errors", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const user = await openDialog();
    await user.click(nextButton());
    expect(currentStep()).toBe(1);
    expect(alertTexts()).toEqual(["Vui lòng nhập họ và tên.", "Vui lòng nhập email."]);
    const name = screen.getByLabelText(/Họ và tên/u);
    expect(name).toHaveFocus();
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById(String(name.getAttribute("aria-describedby")))).toHaveTextContent("Vui lòng nhập họ và tên.");
    await user.type(name, "Minh Anh");
    await user.type(screen.getByLabelText(/^Email/u), "minh.anh@example");
    await user.click(nextButton());
    expect(currentStep()).toBe(1);
    expect(name).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText(/^Email/u)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/^Email/u)).toHaveFocus();
    expect(alertTexts()).toEqual(["Email chưa đúng định dạng, ví dụ ban@example.com."]);
    expect(screen.queryByRole("group", { name: SURVEY_QUESTIONS.source })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("should move between steps with Tiếp tục / Quay lại and update progress (aria-current)", async () => {
    const user = await openDialog();
    expect(progressItems()).toHaveLength(3);
    expect(currentStep()).toBe(1);
    expect(screen.getByText(/Bước 1\/3/u)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Quay lại" })).not.toBeInTheDocument();
    await fillContact(user);
    await user.click(nextButton());
    expect(currentStep()).toBe(2);
    expect(screen.getByText(/Bước 2\/3/u)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Khảo sát nhanh" })).toHaveFocus();
    expect(screen.queryByLabelText(/Họ và tên/u)).not.toBeVisible();
    await fillSurvey(user);
    await user.click(nextButton());
    expect(currentStep()).toBe(3);
    expect(progressItems()[0]).toHaveAttribute("data-state", "done");
    expect(submitButton()).toHaveAttribute("type", "submit");
    await user.click(backButton());
    expect(currentStep()).toBe(2);
    await user.click(screen.getByRole("button", { name: "Về bước trước" }));
    expect(currentStep()).toBe(1);
    expect(screen.getByLabelText(/Họ và tên/u)).toHaveValue("Minh Anh Nguyễn");
  });

  it("should update Tạm tính live in stub and sticky bar when quantity or merch changes", async () => {
    const user = await openDialog();
    for (const region of ["Cuống phiếu nước", "Thanh đặt phiếu nước", "Tóm tắt đơn"]) expect(totalIn(region)).toHaveTextContent("169.000đ");
    await user.click(screen.getByRole("button", { name: "Tăng số phiếu nước" }));
    await user.selectOptions(screen.getByLabelText(/Merch/u), "tuoi-xi-lay");
    for (const region of ["Cuống phiếu nước", "Thanh đặt phiếu nước", "Tóm tắt đơn"]) expect(totalIn(region)).toHaveTextContent("507.000đ");
    const stub = screen.getByLabelText("Cuống phiếu nước");
    expect(stub).toHaveTextContent("Phiếu nước × 2");
    expect(stub).toHaveTextContent('Combo "Tuổi Xì Lây"');
  });

  it("should cap the stepper at TICKET_ORDER_LIMIT and min 1", async () => {
    const user = await openDialog();
    const decrease = screen.getByRole("button", { name: "Giảm số phiếu nước" });
    const increase = screen.getByRole("button", { name: "Tăng số phiếu nước" });
    expect(decrease).toBeDisabled();
    for (let index = 0; index < TICKET_ORDER_LIMIT + 2; index += 1) await user.click(increase);
    expect(increase).toBeDisabled();
    expect(screen.getByLabelText("Số phiếu nước đã chọn")).toHaveTextContent(String(TICKET_ORDER_LIMIT));
    const form = orderForm();
    expect(new FormData(form).get("quantity")).toBe(String(TICKET_ORDER_LIMIT));
    await user.click(decrease);
    expect(new FormData(form).get("quantity")).toBe(String(TICKET_ORDER_LIMIT - 1));
  });

  it("should reveal birth year and gender via the collapse button", async () => {
    const user = await openDialog();
    const toggle = screen.getByRole("button", { name: /năm sinh và giới tính/u });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    const region = document.getElementById(String(toggle.getAttribute("aria-controls")));
    expect(region).toHaveAttribute("data-expanded", "false");
    expect(region).toContainElement(screen.getByLabelText(/Năm sinh/u));
    expect(region).toContainElement(screen.getByLabelText(/Giới tính/u));
    expect(Array.from(screen.getByLabelText(/Giới tính/u).querySelectorAll("option")).map((option) => option.getAttribute("value"))).toEqual(["", "male", "female", "other", "undisclosed"]);
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(region).toHaveAttribute("data-expanded", "true");
  });

  it("should show review values on step 3 and submit the unchanged request body", async () => {
    vi.stubGlobal("location", { assign: vi.fn() });
    const fetchMock = vi.fn<typeof fetch>(async () => orderResponse());
    vi.stubGlobal("fetch", fetchMock);
    const user = await openDialog();
    await fillAll(user);
    const review = screen.getByRole("region", { name: "Xác nhận" });
    for (const text of ["Minh Anh Nguyễn", "minh.anh@example.com", "+84 912 345 678", "Nữ", "2000", "Phiếu nước × 1", "Không kèm merch", sourceLabel("facebook"), "Hải Châu", attendanceLabel("confirmed")]) {
      expect(review).toHaveTextContent(text);
    }
    await user.click(submitButton());
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(Object.keys(body)).toEqual(["idempotencyKey", "name", "email", "phone", "gender", "birthYear", "quantity", "merch", "survey"]);
    expect(body).toEqual({
      idempotencyKey: expect.stringMatching(/^[\da-f-]{36}$/iu),
      name: "Minh Anh Nguyễn",
      email: "minh.anh@example.com",
      phone: "+84 912 345 678",
      gender: "female",
      birthYear: 2000,
      quantity: 1,
      merch: "none",
      survey: { source: ["facebook"], area: "hai-chau", attendance: "confirmed" },
    });
  });

  it("should return to the first invalid step on submit and never fetch", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const user = await openDialog();
    const form = orderForm();
    fireEvent.submit(form);
    expect(currentStep()).toBe(1);
    expect(screen.getByLabelText(/Họ và tên/u)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/Họ và tên/u)).toHaveFocus();
    await fillContact(user);
    fireEvent.submit(form);
    await waitFor(() => expect(currentStep()).toBe(2));
    expect(alertTexts()).toEqual([messages.source, messages.area, messages.attendance]);
    expect(screen.getByRole("checkbox", { name: sourceLabel("facebook") })).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("should reset to step 1 after a successful order is closed", async () => {
    vi.stubGlobal("location", { assign: vi.fn() });
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(async () => orderResponse()));
    const user = await openDialog();
    await user.click(screen.getByRole("button", { name: "Tăng số phiếu nước" }));
    await fillAll(user);
    await user.click(submitButton());
    await waitFor(() => expect(screen.getByRole("status")).toHaveAttribute("data-status", "success"));
    await user.click(screen.getByRole("button", { name: "Đóng biểu mẫu" }));
    await user.click(screen.getByRole("button", { name: "Request tickets" }));
    expect(currentStep()).toBe(1);
    expect(screen.getByLabelText(/Họ và tên/u)).toHaveValue("");
    expect(screen.getByLabelText("Số phiếu nước đã chọn")).toHaveTextContent("1");
    expect(screen.getByRole("status")).toHaveAttribute("data-status", "idle");
  });
});

/** The order form, found independently of the current step. */
function orderForm() {
  const form = document.querySelector<HTMLFormElement>("form.ticket-request-dialog__form");
  if (!form) throw new Error("Ticket order form was not rendered");
  return form;
}

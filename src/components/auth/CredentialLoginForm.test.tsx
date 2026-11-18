// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CredentialLoginForm } from "./CredentialLoginForm";

const originalLocation = window.location;
const assign = vi.fn();
const fetchMock = vi.fn();

function deferred() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((done) => { resolve = done; });
  return { promise, resolve };
}

const jsonResponse = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function fill(username: string, password: string) {
  const user = userEvent.setup();
  if (username) await user.type(screen.getByLabelText("Tên đăng nhập"), username);
  if (password) await user.type(screen.getByLabelText("Mật khẩu"), password);
  return user;
}

beforeEach(() => {
  Object.defineProperty(window, "location", { configurable: true, value: { ...originalLocation, assign } });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("CredentialLoginForm", () => {
  it("should submit the credentials as JSON, show pending, show the generic Vietnamese error on 401 and clear the password, and navigate on 200", async () => {
    render(<CredentialLoginForm />);
    expect(screen.getByLabelText("Tên đăng nhập")).toHaveAttribute("name", "username");
    expect(screen.getByLabelText("Mật khẩu")).toHaveAttribute("name", "password");

    const pending = deferred();
    fetchMock.mockReturnValueOnce(pending.promise);
    const user = await fill("Ten_Dang_Nhap", "matkhau123");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/password", expect.objectContaining({
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "ten_dang_nhap", password: "matkhau123" }),
    }));
    const pendingButton = screen.getByRole("button", { name: "Đang đăng nhập…" });
    expect(pendingButton).toBeDisabled();

    await act(async () => { pending.resolve(jsonResponse({ error: { code: "invalid_credentials" } }, 401)); });
    expect(screen.getByRole("alert")).toHaveTextContent("Tên đăng nhập hoặc mật khẩu không đúng.");
    expect(screen.getByLabelText("Mật khẩu")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Đăng nhập" })).toBeEnabled();
    expect(assign).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }, 200));
    await user.type(screen.getByLabelText("Mật khẩu"), "matkhau-dung");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(assign).toHaveBeenCalledWith("/");
  });

  it("should show the temporary-failure message on 503 and on a network error", async () => {
    render(<CredentialLoginForm />);
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { code: "temporarily_unavailable" } }, 503));
    const user = await fill("abc", "matkhau123");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Chưa thể đăng nhập. Vui lòng thử lại sau.");

    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Chưa thể đăng nhập. Vui lòng thử lại sau.");
    expect(assign).not.toHaveBeenCalled();
  });

  it("should block empty or short input without calling fetch", async () => {
    render(<CredentialLoginForm />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Vui lòng nhập tên đăng nhập và mật khẩu.");

    await user.type(screen.getByLabelText("Tên đăng nhập"), "abc");
    await user.type(screen.getByLabelText("Mật khẩu"), "short");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Tên đăng nhập gồm 3–32 ký tự a-z, 0-9, dấu _ hoặc dấu chấm; mật khẩu từ 8 đến 72 byte.");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

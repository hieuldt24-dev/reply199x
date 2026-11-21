// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HeaderAuth } from "./HeaderAuth";

const navigation = vi.hoisted(() => ({ refresh: vi.fn(), error: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: navigation.refresh }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(navigation.error),
}));

beforeEach(() => {
  navigation.refresh.mockReset();
  navigation.error = "";
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

describe("HeaderAuth", () => {
  it("measures the identical focus burst workload", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<HeaderAuth auth={{ status: "authenticated", displayName: "Bạn" }} />);
    const started = performance.now();
    act(() => { for (let i = 0; i < 20; i++) window.dispatchEvent(new Event("focus")); });
    console.info(JSON.stringify({ workload: "auth-20-focus", refreshes: navigation.refresh.mock.calls.length, sessionFetches: fetchSpy.mock.calls.length, elapsedMs: performance.now() - started }));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not auto-open for anonymous entry without an auth error and opens on button click", () => {
    const view = render(<HeaderAuth auth={{ status: "anonymous" }} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    view.rerender(<HeaderAuth auth={{ status: "anonymous" }} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập"  }));
    expect(screen.getByRole("dialog")).toHaveAttribute("open");
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not auto-open for an unknown auth_error value", () => {
    navigation.error = "auth_error=constructor";
    render(<HeaderAuth auth={{ status: "anonymous" }} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not prompt signed-in visitors or fetch an extra session", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<HeaderAuth auth={{ status: "authenticated", displayName: "Bạn" }} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("retains callback recovery wording while removing the error query parameter", () => {
    navigation.error = "auth_error=callback&campaign=retro";
    const replace = vi.spyOn(window.history, "replaceState");
    const view = render(<HeaderAuth auth={{ status: "anonymous" }} />);
    expect(screen.getByRole("dialog")).toHaveAttribute("open");
    expect(screen.getByRole("alert")).toHaveTextContent("Phiên đăng nhập không hợp lệ hoặc đã hết hạn");
    expect(replace).toHaveBeenCalledWith(null, "", "/?campaign=retro");
    fireEvent.click(screen.getByRole("button", { name: "Đóng cửa sổ đăng nhập" }));
    navigation.error = "campaign=retro";
    view.rerender(<HeaderAuth auth={{ status: "anonymous" }} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("focuses Google login when the dialog is opened manually", () => {
    render(<HeaderAuth auth={{ status: "anonymous" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(screen.getByRole("dialog")).toHaveAttribute("id", "header-login-dialog");
    expect(screen.getByRole("button", { name: "Tiếp tục với Google" })).toHaveFocus();
  });

  it("recovers an unavailable session without opening Google login", () => {
    render(<HeaderAuth auth={{ status: "unavailable" }} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Chưa xác minh được phiên đăng nhập");
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra lại phiên đăng nhập" }));
    expect(navigation.refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("coalesces focus and visible-return bursts, skips hidden focus, and removes listeners", () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(1_000);
    const view = render(<HeaderAuth auth={{ status: "authenticated", displayName: "Bạn" }} />);
    act(() => { for (let i = 0; i < 20; i++) window.dispatchEvent(new Event("focus")); });
    expect(navigation.refresh).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    clock.mockReturnValue(7_000);
    fireEvent(window, new Event("focus"));
    expect(navigation.refresh).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    act(() => { document.dispatchEvent(new Event("visibilitychange")); window.dispatchEvent(new Event("focus")); });
    expect(navigation.refresh).toHaveBeenCalledTimes(2);
    view.unmount();
    clock.mockReturnValue(20_000);
    fireEvent(window, new Event("focus"));
    expect(navigation.refresh).toHaveBeenCalledTimes(2);
  });
});

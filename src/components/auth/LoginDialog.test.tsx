// @vitest-environment jsdom
import { StrictMode, useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LoginDialog } from "./LoginDialog";

function LoginPrompt() {
  const [open, setOpen] = useState(true);
  return <>
    <button onClick={() => setOpen(true)}>Mở lại</button>
    <LoginDialog open={open} onClose={() => setOpen(false)} />
  </>;
}

const scrollRoots = () => [document.body, document.documentElement];

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

afterEach(() => {
  cleanup();
  scrollRoots().forEach(({ style }) => style.removeProperty("overflow"));
});

describe("LoginDialog background scrolling", () => {
  it.each(["close button", "Escape", "backdrop"])("restores background scrolling after %s and can lock again", (method) => {
    render(<LoginPrompt />);
    scrollRoots().forEach(({ style }) => expect(style.overflow).toBe("hidden"));

    if (method === "close button") fireEvent.click(screen.getByRole("button", { name: "Đóng cửa sổ đăng nhập" }));
    else if (method === "Escape") fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    else fireEvent.click(screen.getByRole("dialog"));

    expect(screen.queryByRole("dialog")).toBeNull();
    scrollRoots().forEach(({ style }) => expect(style.getPropertyValue("overflow")).toBe(""));
    fireEvent.click(screen.getByRole("button", { name: "Mở lại" }));
    scrollRoots().forEach(({ style }) => expect(style.overflow).toBe("hidden"));
  });

  it("preserves inline overflow values and priorities through StrictMode, reopen and unmount", () => {
    document.body.style.setProperty("overflow", "scroll", "important");
    document.documentElement.style.setProperty("overflow", "auto");
    const expectRestored = () => {
      expect(document.body.style.getPropertyValue("overflow")).toBe("scroll");
      expect(document.body.style.getPropertyPriority("overflow")).toBe("important");
      expect(document.documentElement.style.getPropertyValue("overflow")).toBe("auto");
      expect(document.documentElement.style.getPropertyPriority("overflow")).toBe("");
    };
    const view = render(<StrictMode><LoginPrompt /></StrictMode>);
    scrollRoots().forEach(({ style }) => {
      expect(style.getPropertyValue("overflow")).toBe("hidden");
      expect(style.getPropertyPriority("overflow")).toBe("important");
    });
    fireEvent.click(screen.getByRole("button", { name: "Đóng cửa sổ đăng nhập" }));
    expectRestored();
    fireEvent.click(screen.getByRole("button", { name: "Mở lại" }));
    expect(document.body.style.overflow).toBe("hidden");
    view.unmount();
    expectRestored();
  });

  it("does not change scrolling when initially closed", () => {
    render(<LoginDialog open={false} onClose={() => {}} />);
    scrollRoots().forEach(({ style }) => expect(style.getPropertyValue("overflow")).toBe(""));
  });
});

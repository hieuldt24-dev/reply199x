// @vitest-environment jsdom
import { useRef, useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FORM_POPUP_LABEL, FORM_POPUP_TITLE, formPopupLinks } from "@/app/(routes)/_data/formPopup";
import { FormPopup } from "./FormPopup";

const E_ACUTE = String.fromCharCode(0xe9);
const BANNED = new RegExp("(?<![\\p{L}\\p{N}])v\\u00e9(?![\\p{L}\\p{N}])", "iu");
const scrollRoots = () => [document.body, document.documentElement];

function Harness({ useOther = false }: { useOther?: boolean }) {
  const [open, setOpen] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const other = useRef<HTMLButtonElement>(null);
  return <>
    <button type="button" onClick={(event) => { returnFocus.current = useOther ? other.current : event.currentTarget; setOpen(true); }}>Mở</button>
    <button type="button" ref={other}>Khác</button>
    <FormPopup open={open} onClose={() => setOpen(false)} returnFocus={returnFocus} />
  </>;
}

function renderOpen(onClose = vi.fn()) {
  const ref = { current: null };
  const view = render(<FormPopup open onClose={onClose} returnFocus={ref} />);
  return { ...view, onClose };
}

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

afterEach(() => {
  cleanup();
  scrollRoots().forEach(({ style }) => style.removeProperty("overflow"));
});

describe("FormPopup", () => {
  it("T1 renders no dialog and no iframe while never opened", () => {
    const { container } = render(<FormPopup open={false} onClose={vi.fn()} returnFocus={{ current: null }} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("T2 should render the iframe with the exact embed src when open", () => {
    const openSpy = vi.spyOn(window, "open");
    renderOpen();
    const dialog = screen.getByRole("dialog", { name: FORM_POPUP_TITLE });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    const frame = screen.getByTitle(FORM_POPUP_TITLE);
    expect(frame.tagName).toBe("IFRAME");
    expect(frame.getAttribute("src")).toBe(formPopupLinks.embed);
    expect(formPopupLinks.embed.endsWith("/viewform?embedded=true")).toBe(true);
    expect(frame).toHaveAttribute("loading", "lazy");
    expect(frame).toHaveAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    expect(frame).not.toHaveAttribute("sandbox");
    expect(frame).not.toHaveAttribute("allow");
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("T3 should render the open-in-new-tab fallback link with noopener noreferrer", () => {
    renderOpen();
    const link = screen.getByRole("link", { name: /Mở trong tab mới/ });
    expect(link).toHaveAttribute("href", formPopupLinks.fallback);
    expect(formPopupLinks.fallback).not.toContain("embedded");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("T4 should call onClose for the close button, cancel event and backdrop click", () => {
    const { onClose } = renderOpen();
    fireEvent.click(screen.getByRole("button", { name: "Đóng biểu mẫu" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    const dialog = screen.getByRole("dialog");
    const cancel = new Event("cancel", { cancelable: true });
    fireEvent(dialog, cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(3);
    fireEvent.click(screen.getByRole("heading", { name: FORM_POPUP_TITLE }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("T5 should restore focus to the trigger on close", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Mở" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Đóng biểu mẫu" }));
    fireEvent.click(screen.getByRole("button", { name: "Đóng biểu mẫu" }));
    expect(document.activeElement).toBe(trigger);
  });

  it("T5b restores focus to the element named by returnFocus", () => {
    render(<Harness useOther />);
    fireEvent.click(screen.getByRole("button", { name: "Mở" }));
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Khác" }));
  });

  it("T6 should lock and restore background scrolling", () => {
    document.body.style.setProperty("overflow", "scroll", "important");
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Mở" }));
    scrollRoots().forEach(({ style }) => {
      expect(style.getPropertyValue("overflow")).toBe("hidden");
      expect(style.getPropertyPriority("overflow")).toBe("important");
    });
    fireEvent.click(screen.getByRole("button", { name: "Đóng biểu mẫu" }));
    expect(document.body.style.getPropertyValue("overflow")).toBe("scroll");
    expect(document.body.style.getPropertyPriority("overflow")).toBe("important");
    expect(document.documentElement.style.getPropertyValue("overflow")).toBe("");
  });

  it("T7 keeps the same iframe mounted after close and reopen", () => {
    const { container } = render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Mở" }));
    const frame = container.querySelector("iframe");
    expect(frame).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Đóng biểu mẫu" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(container.querySelector("iframe")).toBe(frame);
    fireEvent.click(screen.getByRole("button", { name: "Mở" }));
    expect(container.querySelector("iframe")).toBe(frame);
  });

  it("T8 should not contain the banned accented word in any new string", () => {
    expect(BANNED.test(`Mua v${E_ACUTE} ngay`)).toBe(true);
    expect(BANNED.test(`v${E_ACUTE}`)).toBe(true);
    expect(BANNED.test(`v${E_ACUTE}c-tơ`)).toBe(false);
    renderOpen();
    const strings = [FORM_POPUP_LABEL, FORM_POPUP_TITLE, document.body.textContent ?? "",
      screen.getByRole("button", { name: "Đóng biểu mẫu" }).getAttribute("aria-label") ?? ""];
    strings.forEach((text) => expect(BANNED.test(text)).toBe(false));
  });
});

// @vitest-environment jsdom
import { useRef, useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHECKIN_GROUP_LABEL, checkinForms } from "@/app/(routes)/_data/formPopup";
import { FormPopup } from "./FormPopup";

const E_ACUTE = String.fromCharCode(0xe9);
const BANNED = new RegExp("(?<![\\p{L}\\p{N}])v\\u00e9(?![\\p{L}\\p{N}])", "iu");
const scrollRoots = () => [document.body, document.documentElement];
const [formA, formB] = checkinForms;
const frameOf = (form: { dialogTitle: string }) => document.querySelector<HTMLIFrameElement>(`iframe[title="${form.dialogTitle}"]`);

function Harness({ useOther = false }: { useOther?: boolean }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const other = useRef<HTMLButtonElement>(null);
  return <>
    {checkinForms.map((form) => (
      <button key={form.id} type="button" onClick={(event) => { returnFocus.current = useOther ? other.current : event.currentTarget; setActiveId(form.id); }}>{`Mở ${form.id}`}</button>
    ))}
    <button type="button" ref={other}>Khác</button>
    <FormPopup activeId={activeId} onClose={() => setActiveId(null)} returnFocus={returnFocus} />
  </>;
}

const openForm = (id: string) => fireEvent.click(screen.getByRole("button", { name: `Mở ${id}` }));
const closePopup = () => fireEvent.click(screen.getByRole("button", { name: "Đóng biểu mẫu" }));

function renderOpen(onClose = vi.fn(), activeId = formA.id) {
  const view = render(<FormPopup activeId={activeId} onClose={onClose} returnFocus={{ current: null }} />);
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
    const { container } = render(<FormPopup activeId={null} onClose={vi.fn()} returnFocus={{ current: null }} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("T2 should render the iframe of the active form with its exact embed src", () => {
    const openSpy = vi.spyOn(window, "open");
    renderOpen();
    const dialog = screen.getByRole("dialog", { name: formA.dialogTitle });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    const frame = screen.getByTitle(formA.dialogTitle);
    expect(frame.tagName).toBe("IFRAME");
    expect(frame.getAttribute("src")).toBe(formA.embedUrl);
    expect(frame).toHaveAttribute("loading", "lazy");
    expect(frame).toHaveAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    expect(frame).not.toHaveAttribute("sandbox");
    expect(frame).not.toHaveAttribute("allow");
    expect(frame).not.toHaveAttribute("hidden");
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("T3 should render the open-in-new-tab fallback link of the shown form", () => {
    renderOpen();
    const link = screen.getByRole("link", { name: /Mở trong tab mới/ });
    expect(link).toHaveAttribute("href", formA.fallbackUrl);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("T4 should call onClose for the close button, cancel event and backdrop click", () => {
    const { onClose } = renderOpen();
    closePopup();
    expect(onClose).toHaveBeenCalledTimes(1);
    const dialog = screen.getByRole("dialog");
    const cancel = new Event("cancel", { cancelable: true });
    fireEvent(dialog, cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(3);
    fireEvent.click(screen.getByRole("heading", { name: formA.dialogTitle }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("T5 should move focus to the close button and restore it to the trigger on close", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: `Mở ${formA.id}` });
    trigger.focus();
    fireEvent.click(trigger);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Đóng biểu mẫu" }));
    closePopup();
    expect(document.activeElement).toBe(trigger);
  });

  it("T5b restores focus to the element named by returnFocus", () => {
    render(<Harness useOther />);
    openForm(formA.id);
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Khác" }));
  });

  it("T6 should lock and restore background scrolling", () => {
    document.body.style.setProperty("overflow", "scroll", "important");
    render(<Harness />);
    openForm(formA.id);
    scrollRoots().forEach(({ style }) => {
      expect(style.getPropertyValue("overflow")).toBe("hidden");
      expect(style.getPropertyPriority("overflow")).toBe("important");
    });
    closePopup();
    expect(document.body.style.getPropertyValue("overflow")).toBe("scroll");
    expect(document.body.style.getPropertyPriority("overflow")).toBe("important");
    expect(document.documentElement.style.getPropertyValue("overflow")).toBe("");
  });

  it("T7 keeps the same iframe mounted after close and reopen", () => {
    render(<Harness />);
    openForm(formA.id);
    const frame = frameOf(formA);
    expect(frame).not.toBeNull();
    closePopup();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(frameOf(formA)).toBe(frame);
    openForm(formA.id);
    expect(frameOf(formA)).toBe(frame);
  });

  it("T8 should not contain the banned accented word in any new string", () => {
    expect(BANNED.test(`Mua v${E_ACUTE} ngay`)).toBe(true);
    expect(BANNED.test(`v${E_ACUTE}`)).toBe(true);
    expect(BANNED.test(`v${E_ACUTE}c-tơ`)).toBe(false);
    const strings = [CHECKIN_GROUP_LABEL, ...checkinForms.flatMap((form) => [form.menuLabel, form.dialogTitle])];
    for (const form of checkinForms) {
      const view = renderOpen(vi.fn(), form.id);
      strings.push(document.body.textContent ?? "");
      view.unmount();
    }
    strings.forEach((text) => expect(BANNED.test(text)).toBe(false));
  });

  it.each(checkinForms.map((form) => [form.id, form] as const))("T9 opens %s with its own title, iframe src and fallback href", (_id, form) => {
    renderOpen(vi.fn(), form.id);
    expect(screen.getByRole("dialog", { name: form.dialogTitle })).toBeInTheDocument();
    expect(screen.getByTitle(form.dialogTitle).getAttribute("src")).toBe(form.embedUrl);
    expect(screen.getByRole("link", { name: /Mở trong tab mới/ })).toHaveAttribute("href", form.fallbackUrl);
  });

  it("T10 should keep both iframes mounted with the inactive one hidden", () => {
    render(<Harness />);
    openForm(formA.id);
    const frameA = frameOf(formA);
    closePopup();
    openForm(formB.id);
    expect(screen.getByRole("dialog", { name: formB.dialogTitle })).toBeInTheDocument();
    expect(frameOf(formA)).toBe(frameA);
    expect(frameA).toHaveAttribute("hidden");
    expect(frameOf(formB)).not.toHaveAttribute("hidden");
    closePopup();
    openForm(formA.id);
    expect(frameOf(formA)).toBe(frameA);
    expect(frameA).not.toHaveAttribute("hidden");
    expect(frameOf(formB)).toHaveAttribute("hidden");
  });

  it("T11 mounts only the iframe of the form that was opened", () => {
    render(<Harness />);
    openForm(formA.id);
    expect(frameOf(formA)).not.toBeNull();
    expect(frameOf(formB)).toBeNull();
    expect(document.querySelectorAll("iframe")).toHaveLength(1);
  });

  it("T12 keeps the form list shape intact", () => {
    expect(CHECKIN_GROUP_LABEL).toBe("Check in");
    expect(checkinForms.map((form) => form.id)).toEqual(["check-in-hoai-niem", "checkin-popup"]);
    expect(formB.menuLabel).toBe("Checkin popup");
    expect(new Set(checkinForms.map((form) => form.id)).size).toBe(checkinForms.length);
    expect(new Set(checkinForms.map((form) => form.menuLabel)).size).toBe(checkinForms.length);
    for (const form of checkinForms) {
      expect(form.embedUrl.startsWith("https://docs.google.com/forms/d/e/")).toBe(true);
      expect(form.embedUrl.endsWith("/viewform?embedded=true")).toBe(true);
      expect(form.fallbackUrl.startsWith("https://docs.google.com/forms/d/e/")).toBe(true);
      expect(form.fallbackUrl).not.toContain("embedded");
      expect(form.embedUrl).toBe(`${form.fallbackUrl}?embedded=true`);
    }
  });

  it.each([["unknown", "no-such-form"], ["null", null]] as const)("T13 renders closed for a %s activeId", (_label, activeId) => {
    const { container } = render(<FormPopup activeId={activeId} onClose={vi.fn()} returnFocus={{ current: null }} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  });
});

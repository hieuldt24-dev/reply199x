// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NAV_LINKS } from "@/lib/constants";
import { FORM_POPUP_LABEL, FORM_POPUP_TITLE, formPopupLinks } from "@/app/(routes)/_data/formPopup";
import { Navbar } from "./Navbar";

vi.mock("@/components/auth/HeaderAuth", () => ({ HeaderAuth: () => null }));
vi.mock("@/app/(routes)/_components/TicketRequestDialog", () => ({ TicketRequestDialog: () => null }));
vi.mock("@/app/(routes)/_components/RemoteImage", () => ({ RemoteImage: () => null }));

const desktopNav = () => screen.getByRole("navigation", { name: "Điều hướng chính" });
// The mobile nav is `hidden` while the menu is closed, so look it up by its stable id.
const mobileNav = () => {
  const nav = document.getElementById("mobile-navigation");
  if (!nav) throw new Error("mobile navigation missing");
  return nav;
};

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});

afterEach(() => {
  cleanup();
  [document.body, document.documentElement].forEach(({ style }) => style.removeProperty("overflow"));
});

describe("Navbar form popup", () => {
  it("N1 should render a form button in both desktop and mobile navs and keep the five NAV_LINKS", () => {
    render(<Navbar auth={{ status: "anonymous" }} />);
    for (const nav of [desktopNav(), mobileNav()]) {
      const button = within(nav).getByRole("button", { name: FORM_POPUP_LABEL, hidden: true });
      expect(button).toHaveAttribute("aria-haspopup", "dialog");
      expect(button).toHaveAttribute("aria-controls", "form-popup-dialog");
      const links = within(nav).getAllByRole("link", { hidden: true });
      expect(links.map((link) => link.getAttribute("href"))).toEqual(NAV_LINKS.map(({ id }) => `#${id}`));
    }
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("N2 opens the popup with the embed iframe from the desktop button", () => {
    const view = render(<Navbar auth={{ status: "anonymous" }} />);
    const button = within(desktopNav()).getByRole("button", { name: FORM_POPUP_LABEL });
    fireEvent.click(button);
    expect(screen.getByRole("dialog", { name: FORM_POPUP_TITLE })).toBeInTheDocument();
    expect(view.container.querySelector("iframe")?.getAttribute("src")).toBe(formPopupLinks.embed);
    fireEvent.click(screen.getByRole("button", { name: "Đóng biểu mẫu" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it("N3 closes the mobile menu, opens the popup and returns focus to the menu button", () => {
    render(<Navbar auth={{ status: "anonymous" }} />);
    const toggle = screen.getByRole("button", { name: "Mở menu điều hướng" });
    fireEvent.click(toggle);
    expect(mobileNav()).not.toHaveAttribute("hidden");
    fireEvent.click(within(mobileNav()).getByRole("button", { name: FORM_POPUP_LABEL }));
    expect(mobileNav()).toHaveAttribute("hidden");
    expect(screen.getByRole("dialog", { name: FORM_POPUP_TITLE })).toBeInTheDocument();
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });
});

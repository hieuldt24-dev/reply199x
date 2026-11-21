// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NAV_LINKS } from "@/lib/constants";
import { CHECKIN_GROUP_LABEL, checkinForms } from "@/app/(routes)/_data/formPopup";
import { Navbar } from "./Navbar";

vi.mock("@/components/auth/HeaderAuth", () => ({ HeaderAuth: () => null }));
vi.mock("@/app/(routes)/_components/RemoteImage", () => ({ RemoteImage: () => null }));

const [formA, formB] = checkinForms;
const desktopNav = () => screen.getByRole("navigation", { name: "Điều hướng chính" });
// The mobile nav is `hidden` while the menu is closed, so look it up by its stable id.
const mobileNav = () => {
  const nav = document.getElementById("mobile-navigation");
  if (!nav) throw new Error("mobile navigation missing");
  return nav;
};
const groupToggle = (nav: HTMLElement) => within(nav).getByRole("button", { name: CHECKIN_GROUP_LABEL, hidden: true });
const listOf = (toggle: HTMLElement) => {
  const list = document.getElementById(toggle.getAttribute("aria-controls") ?? "");
  if (!list) throw new Error("group list missing");
  return list;
};
const renderNavbar = () => render(<Navbar auth={{ status: "anonymous" }} />);
function openDesktopGroup() {
  const toggle = groupToggle(desktopNav());
  fireEvent.click(toggle);
  return { toggle, list: listOf(toggle) };
}

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});

afterEach(() => {
  cleanup();
  [document.body, document.documentElement].forEach(({ style }) => style.removeProperty("overflow"));
});

describe("Navbar check-in group", () => {
  it("N1 renders one collapsed group toggle in both navs, keeps the four NAV_LINKS and no header ticket trigger", () => {
    renderNavbar();
    for (const nav of [desktopNav(), mobileNav()]) {
      const toggle = groupToggle(nav);
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(toggle).not.toHaveAttribute("aria-haspopup");
      expect(listOf(toggle)).toHaveAttribute("hidden");
      expect(within(nav).queryAllByRole("button", { name: "Checkin popup", hidden: true })).toHaveLength(1);
      const links = within(nav).getAllByRole("link", { hidden: true });
      expect(links.map((link) => link.getAttribute("href"))).toEqual(NAV_LINKS.map(({ id }) => `#${id}`));
    }
    expect(screen.queryAllByRole("button", { name: /Đặt phiếu nước/, hidden: true })).toHaveLength(0);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("N2 should open the dropdown, expose both form items and return focus to the toggle after the popup closes", () => {
    renderNavbar();
    const { toggle, list } = openDesktopGroup();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(list).not.toHaveAttribute("hidden");
    const items = within(list).getAllByRole("button");
    expect(items.map((item) => item.textContent)).toEqual(checkinForms.map((form) => form.menuLabel));
    items.forEach((item) => expect(item).toHaveAttribute("aria-controls", "form-popup-dialog"));
    fireEvent.click(within(list).getByRole("button", { name: formB.menuLabel }));
    expect(list).toHaveAttribute("hidden");
    expect(screen.getByRole("dialog", { name: formB.dialogTitle })).toBeInTheDocument();
    expect(screen.getByTitle(formB.dialogTitle).getAttribute("src")).toBe(formB.embedUrl);
    fireEvent.click(screen.getByRole("button", { name: "Đóng biểu mẫu" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });

  it("N2b opens the new form with its own title, iframe and fallback link", () => {
    renderNavbar();
    const { list } = openDesktopGroup();
    fireEvent.click(within(list).getByRole("button", { name: formA.menuLabel }));
    expect(screen.getByRole("dialog", { name: formA.dialogTitle })).toBeInTheDocument();
    expect(screen.getByTitle(formA.dialogTitle).getAttribute("src")).toBe(formA.embedUrl);
    expect(screen.getByRole("link", { name: /Mở trong tab mới/ })).toHaveAttribute("href", formA.fallbackUrl);
  });

  it("N3 mobile: expands the list, closes the menu on selection and returns focus to the menu button", () => {
    renderNavbar();
    const hamburger = screen.getByRole("button", { name: "Mở menu điều hướng" });
    fireEvent.click(hamburger);
    expect(mobileNav()).not.toHaveAttribute("hidden");
    const toggle = groupToggle(mobileNav());
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(within(listOf(toggle)).getByRole("button", { name: formB.menuLabel }));
    expect(mobileNav()).toHaveAttribute("hidden");
    expect(screen.getByRole("dialog", { name: formB.dialogTitle })).toBeInTheDocument();
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(hamburger);
  });

  it("N3b mobile toggle flips the sub-list independently of the menu", () => {
    renderNavbar();
    const toggle = groupToggle(mobileNav());
    const list = listOf(toggle);
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(list).not.toHaveAttribute("hidden");
    expect(mobileNav()).toHaveAttribute("hidden");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(list).toHaveAttribute("hidden");
  });

  it("N4 should close the dropdown on Escape and focus the toggle", () => {
    renderNavbar();
    fireEvent.keyDown(window, { key: "Escape" });
    const { toggle, list } = openDesktopGroup();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(list).toHaveAttribute("hidden");
    expect(document.activeElement).toBe(toggle);
  });

  it("N5 closes on pointerdown outside the group but not inside it", () => {
    renderNavbar();
    const { toggle, list } = openDesktopGroup();
    fireEvent.pointerDown(within(list).getByRole("button", { name: formA.menuLabel }));
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.pointerDown(document.body);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("N6 closes on focus-out to an outside element only", () => {
    renderNavbar();
    const { toggle, list } = openDesktopGroup();
    fireEvent.focusOut(toggle, { relatedTarget: null });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.focusOut(toggle, { relatedTarget: within(list).getByRole("button", { name: formA.menuLabel }) });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.focusOut(toggle, { relatedTarget: within(desktopNav()).getAllByRole("link")[0] });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("N7 collapses on a second click and stays collapsed after the popup closes", () => {
    renderNavbar();
    const { toggle, list } = openDesktopGroup();
    fireEvent.click(toggle);
    expect(list).toHaveAttribute("hidden");
    fireEvent.click(toggle);
    fireEvent.click(within(list).getByRole("button", { name: formA.menuLabel }));
    expect(list).toHaveAttribute("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Đóng biểu mẫu" }));
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(list).toHaveAttribute("hidden");
  });
});

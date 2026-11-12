"use client";

import { useEffect, useRef, useState } from "react";
import { NAV_LINKS } from "@/lib/constants";
import { assets } from "@/app/(routes)/_data/home";
import { RemoteImage } from "@/app/(routes)/_components/RemoteImage";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState("");
  const menuButton = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);

  useEffect(() => {
    let frame = 0;
    function updateActiveSection() {
      frame = 0;
      // Existing anchors reserve both root scroll padding and section scroll margin.
      const scrollPadding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const marker = Math.max((header.current?.getBoundingClientRect().bottom ?? 96) + 28, scrollPadding + 116);
      const sections = NAV_LINKS.flatMap(({ id }) => {
        const element = document.getElementById(id);
        return element ? [{ id, top: element.getBoundingClientRect().top }] : [];
      }).sort((a, b) => a.top - b.top);
      const current = sections.filter((section) => section.top <= marker).at(-1);
      setActiveId(current?.id ?? "");
    }
    function scheduleUpdate() {
      if (!frame) frame = requestAnimationFrame(updateActiveSection);
    }
    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("hashchange", scheduleUpdate);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("hashchange", scheduleUpdate);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    }
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !header.current?.contains(event.target)) setOpen(false);
    }
    const desktop = window.matchMedia("(min-width: 1024px)");
    function closeOnDesktop() {
      if (desktop.matches) setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutside);
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [open]);

  function navigate(id: string) {
    setOpen(false);
    setActiveId(id === "main-content" ? "" : id);
    // Move keyboard focus to the destination after closing the disclosure.
    requestAnimationFrame(() => {
      const target = document.getElementById(id);
      if (target) {
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
    });
  }

  return (
    <header ref={header} className="event-header">
      <div aria-hidden="true" className="event-header__stripe" />
      <div className="event-header__inner">
        <a className="event-header__brand" href="#main-content" aria-label="REPLY 199X — Về đầu trang" onClick={() => navigate("main-content")}>
          <RemoteImage src={assets.logo} alt="REPLY 199X Logo" width={2500} height={2500} className="event-header__logo" fallback="REPLY 199X" />
        </a>
        <nav className="event-header__desktop" aria-label="Điều hướng chính">
          {NAV_LINKS.map((link) => (
            <a key={link.id} className="event-header__link" aria-current={activeId === link.id ? "location" : undefined} href={`#${link.id}`} onClick={() => navigate(link.id)}>{link.label}</a>
          ))}
        </nav>
        <div className="event-header__actions">
          <a className="event-header__cta" href="#su-kien" onClick={() => navigate("su-kien")}>Sự kiện 22/11</a>
          <button ref={menuButton} type="button" className="event-header__toggle" aria-label={open ? "Đóng menu điều hướng" : "Mở menu điều hướng"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>
            <span className="event-header__hamburger" aria-hidden="true">{open ? "×" : "☰"}</span>
          </button>
        </div>
      </div>
      <nav id="mobile-navigation" className="event-header__mobile" aria-label="Điều hướng trên điện thoại" hidden={!open}>
        {NAV_LINKS.map((link) => <a key={link.id} href={`#${link.id}`} onClick={() => navigate(link.id)} aria-current={activeId === link.id ? "location" : undefined} className="event-header__link">{link.label}</a>)}
      </nav>
    </header>
  );
}

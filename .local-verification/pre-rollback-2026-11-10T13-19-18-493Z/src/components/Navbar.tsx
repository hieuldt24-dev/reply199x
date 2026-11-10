"use client";

import { useEffect, useRef, useState } from "react";
import { NAV_LINKS } from "@/lib/constants";
import { assets } from "@/app/(routes)/_data/home";
import { RemoteImage } from "@/app/(routes)/_components/RemoteImage";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const desktopLinks = NAV_LINKS.filter((link) => ["gioi-thieu", "timeline", "merch", "lien-he"].includes(link.id));

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function navigate(id: string) {
    setOpen(false);
    // A menu link disappears when selected: move keyboard focus to the destination.
    requestAnimationFrame(() => {
      const target = document.getElementById(id);
      if (target) {
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
    });
  }

  return (
    <header className="retro-header fixed top-0 left-0 w-full z-50 bg-retro-forest border-b-4 border-retro-dark text-retro-paper shadow-md">
      <div aria-hidden="true" className="h-1 w-full bg-linear-to-r from-retro-red via-retro-gold to-retro-teal" />
      <div className="max-w-7xl mx-auto px-4 lg:px-8 h-20 flex items-center justify-between gap-3">
        <a className="group flex items-center gap-3 shrink-0" href="#main-content" aria-label="REPLY 199X — Về đầu trang" onClick={() => setOpen(false)}>
          <RemoteImage src={assets.logo} alt="REPLY 199X Logo" width={2500} height={2500} className="h-16 md:h-20 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]" fallback="REPLY 199X" />
        </a>
        <nav className="site-nav hidden xl:flex items-center gap-0.5" aria-label="Điều hướng nhanh">
          {desktopLinks.map((link) => (
            <a key={link.id} className={`px-2 py-1 font-space text-xs font-bold uppercase tracking-wider hover:text-retro-gold transition-colors hover:bg-retro-forest rounded-full ${link.id === "su-kien" ? "text-retro-gold" : "text-retro-paper/90"}`} href={`#${link.id}`}>{link.label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a className="inline-flex items-center gap-2 bg-retro-red hover:bg-[#b81700] text-retro-paper font-space text-xs uppercase font-bold tracking-wider px-3 sm:px-4 py-2.5 rounded-lg border-2 border-retro-gold shadow-[3px_3px_0px_#13240d] min-h-11" href="#su-kien" onClick={() => setOpen(false)}><span aria-hidden="true">⚑</span>Sự kiện 22/11</a>
          <button ref={menuButton} type="button" className="mobile-menu-button rounded-lg border border-retro-teal px-3 py-2 font-space text-xs uppercase font-bold gap-2" aria-label={open ? "Đóng mục lục điều hướng" : "Mở mục lục điều hướng"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}><span aria-hidden="true">{open ? "×" : "☰"}</span>{open ? "Đóng mục lục" : "Mục lục"}</button>
        </div>
      </div>
      <nav id="mobile-navigation" className="mobile-menu border-t border-retro-teal/40 px-4 py-3 max-h-[calc(100dvh-88px)] overflow-y-auto" aria-label="Mục lục điều hướng" hidden={!open}>
        {NAV_LINKS.map((link) => <a key={link.id} href={`#${link.id}`} onClick={() => navigate(link.id)} className="font-space text-sm uppercase font-bold">{link.label}</a>)}
      </nav>
    </header>
  );
}

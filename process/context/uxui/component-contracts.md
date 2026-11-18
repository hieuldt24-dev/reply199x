---
name: context:component-contracts
description: "REPLY 199X section ownership, component interfaces, visual tokens and honest interaction contracts."
keywords: components, contracts, hero, navigation, contact, tickets, merch, assets, accessibility, server, client
related: [context:all-uxui, context:all-tests, context:all-planning]
date: 09-11-26
---
# REPLY 199X — Component Contracts

## Scope and Read When

Read after `all-uxui.md` before changing the event homepage or dividing work among agents. These ownership boundaries are implemented in the source. Read the active task plan and execution report for verification evidence and limits. The preserved reference is `process/general-plans/completed/harness-bootstrap_09-11-26/reply-199x.reference.html`.

## Section Ownership and Order

Keep the source order, Vietnamese text and existing fragment destinations. The hero has no source ID; adding an accessible top target must not remove any existing target.

| Source area / ID | Owner | Boundary |
|---|---|---|
| Fixed header and navigation | `src/components/Navbar.tsx` | Shared shell; client state only for mobile navigation |
| Hero, no source ID | `_components/HeroSection.tsx` | Server; main heading and two section links |
| `gioi-thieu` | `_components/AboutSection.tsx` | Server; project introduction and three memory tracks |
| `kenh-truyen-thong` | `_components/ChannelsSection.tsx` | Server shell (`<section class="radio-section">`, header copy from `_data/channels.ts`); renders the `ChannelsRadio` client leaf |
| Channels radio | `_components/ChannelsRadio.tsx` (+ pure `Radio*` parts) | Client; the only `"use client"` file of the section; holds the active channel only |
| `timeline` | `_components/TimelineSection.tsx` | Server; 20–21/11/2026 pop-up and 22/11/2026 event |
| `su-kien` | `_components/EventsSection.tsx` | Server; main event and poster; contains TicketsSection |
| `ve`, nested in `su-kien` | `_components/TicketsSection.tsx` | Server; sales unavailable and notification link |
| `merch` | `_components/MerchSection.tsx` | Server; product details and external order form |
| `quy-trinh` | `_components/ProcessSection.tsx` | Server; participation/order steps |
| `lien-he` | `_components/ContactSection.tsx` | Server; contact details and ContactForm leaf |
| Contact interaction | `_components/ContactForm.tsx` | Client; validation and local preview only |
| Footer | `src/components/Footer.tsx` | Server; shared shell (every `(routes)` page, incl. `/payment/return`); links in order TikTok, Facebook (omitted when `projectLinks.facebook` is null), Instagram, Zalo, Merch, all from `projectLinks`, new tab with `rel="noopener noreferrer"`; the link row wraps at every width |

All `_components`, `_data` and `_types` paths above are relative to `src/app/(routes)/`. `src/app/(routes)/page.tsx` composes sections and owns the single `<main id="main-content">`. `src/app/(routes)/layout.tsx` is the only owner of Navbar and Footer. Do not put duplicate shell markup in the page or section components. Root `src/app/layout.tsx` owns `lang="vi"`, metadata and the skip link.

## Data and Public Interfaces

- `_types/home.ts`: route-specific readonly content shapes, with stable `id` fields for repeated tracks, events, products and process steps. Use named types matching actual data; do not force unrelated cards into one large union or many boolean props.
- `_data/home.ts`: typed content arrays and source asset URLs for the homepage. Preserve exact copy, prices, dates, venue details, included items and order conditions from the reference. Do not invent availability or substitute different commercial details.
- Section components use named exports, accept only the content they render when supplied as props, and can import static route data directly. No callback props pass from a Server Component into a Client Component.
- ContactForm owns its local input/preview state; use native required/email constraints, associated labels and meaningful field names. Do not introduce shared form state, network APIs or local storage for this conversion.
- Optional `_components/RemoteImage.tsx` is a small client leaf for image failure handling. Props must cover `src`, descriptive `alt`, dimensions/layout classes and fallback content. Show a readable brand/poster placeholder when the source image fails; preserve reserved aspect ratio.
- Existing generic `Button`, `Card` and `cn` remain available. Use an anchor for navigation and a button for an action. Do not expand generic primitives solely to fit every decorative event block.

## Visual Tokens and Assets

Migrate the reference's Tailwind CDN configuration into the installed Tailwind v4 CSS theme in `src/styles/globals.css`. Keep classes statically discoverable; never construct utility strings from content values. Do not include the CDN script or inline HTML event-handler strings.

| Token | Value |
|---|---|
| retro-dark / retro-forest | `#2F4B23` / `#1f3517` |
| retro-teal / retro-teal-light | `#578E76` / `#7ccfaa` |
| retro-red | `#A01300` |
| retro-gold / retro-gold-light | `#FFB83F` / `#ffcf70` |
| retro-paper / retro-paper-card / retro-paper-dark | `#FAF3E0` / `#FFFDF5` / `#EFE6CE` |
| retro-ink / retro-ink-muted | `#1E1C10` / `#514E3E` |
| retro-solid / retro-solid-lg | `4px 4px 0 #13240d` / `8px 8px 0 #13240d` |
| retro-solid-red / retro-solid-gold | `4px 4px 0 #600b00` / `4px 4px 0 #b87a14` |
| retro-border | `0 0 0 2px #1E1C10` |
| radio (CSS vars on `.radio-section`) | `--radio-bg #E8DFC9`, `--radio-wood #6B4428`, `--radio-face #1E3A26`, `--radio-deep #12251A`, `--radio-trim #0E1F14`, `--radio-gold #E3B25A`, `--radio-red #A6362B`, `--radio-cream #F4ECDA`, `--radio-glass #F2E3B6`, `--radio-muted #CBBF9F`, `--radio-ink #4A554E` |

Preserve Epilogue display headings, Be Vietnam Pro body text and Space Grotesk labels from the source, with robust fallbacks if remote fonts cannot load. Preserve paper dots, dark halftone, cassette/radio motifs, ticket edges, layered title shadows and hard offset shadows. Accessibility fixes may soften effects where they obscure text.

The source has two Google-hosted bitmap assets: the logo and event poster. Preserve their source URLs and meaningful alternatives until production assets are confirmed. Do not fabricate local asset provenance, silently replace the poster, or assume network availability. Decorative icons are hidden from assistive technology; meaningful controls have text names even when an icon font is unavailable.

## Interaction Contracts and Unavailable Services

| Surface | Required behavior |
|---|---|
| Navigation and hero links | Resolve to the existing section IDs; fixed header must not obscure target headings |
| Mobile navigation | All source destinations remain reachable by keyboard/touch; expose expanded state and a controlled region; close after selecting a destination |
| TikTok | Preserve `https://www.tiktok.com/@loihoidap199x`; new-tab links use `rel="noopener noreferrer"` |
| Merchandise order CTA | Preserve `https://forms.gle/tW1VU8vpASc53CJa8`; this opens an external form, not an in-app checkout |
| Tickets | Preserve the sales-not-open state; the request dialog submits details for organizer review and confirms only a recorded request, never a reservation or purchase |
| Ticket dialog survey | `_components/TicketSurveyFields.tsx` (Client leaf) renders three mandatory groups after the merch block: Q6 source (checkboxes, at least one), Q8 area and Q9 attendance (radios); verbatim Vietnamese question text from `src/lib/ticket-orders/survey.ts`, no question number, asterisk or required badge; per-group `role="alert"` errors, focus on the first invalid group, no `fetch` while any group is empty; answers reset after a successful submit. Known existing issue outside this task: the dialog shows a mobile horizontal scroll from the poster notch `::after` (`right:-12px`) |
| Channels radio (`kenh-truyen-thong`) | Data in `_data/channels.ts` (`radioChannels`, `ZALO_GROUP_NAME`, header copy), types in `_types/channels.ts`; hrefs come from `projectLinks` (`tiktok`, `facebook`, `instagram`, `zalo`), never hardcoded. Four preset keys are `<button aria-pressed>` inside one `role="group"` (TikTok active by default); ArrowLeft/ArrowRight move and wrap, Home/End jump, focus follows; keys with Ctrl/Alt/Meta are ignored. The "now playing" panel shows frequency, name, handle, description and one CTA: an external new-tab link, or a disabled `<button>` with the same label when the href is null. Dial, speaker and knobs are decorative (`aria-hidden`). CSS is the `.radio-*` block at the end of `globals.css`, scoped under `.radio-section` / `.reply-site>.radio-section` (needed to beat `.reply-site>section` and `.reply-site h2`); all motion sits in `@media(prefers-reduced-motion:no-preference)`. Fonts: local "Reply Lobster" (title, channel name) and "Reply Nunito". The old `brief.channels/tiktok/facebook` strings are kept but no longer rendered |
| Form popup (Navbar "Check in" group) | Navbar group "Check in" (`CHECKIN_GROUP_LABEL`) after "Liên hệ": on desktop a disclosure dropdown (`button` with `aria-expanded`/`aria-controls="checkin-menu"`, no ARIA menu, no arrow keys; closes on Esc with focus back to the toggle, outside pointerdown, focus moving to an outside element (a null `relatedTarget` is ignored for Safari), second click or item selection); in the mobile menu an expandable list (`#mobile-checkin-list`). Items come from the typed `checkinForms` list in `_data/formPopup.ts` (today "Check in không gian âm nhạc hoài niệm" then "Checkin popup"; adding a form = one entry). Every item opens the ONE native `<dialog>` in `src/components/FormPopup.tsx` (`activeId` prop; unknown or null id = closed), rendered inside `<header>` but outside the hidden mobile nav. Title, iframe and fallback link come from the shown form; `aria-modal`, close by button, Esc (`cancel`) or backdrop; focus returns to the group toggle (desktop) or the hamburger (mobile). One iframe per form (`viewform?embedded=true`, no `sandbox`, `referrerPolicy="strict-origin-when-cross-origin"`, `loading="lazy"`) is created on that form's first open and kept, hidden by the `hidden` attribute when another form is shown (`.form-popup__frame[hidden]{display:none}` is required because `.form-popup__frame` sets `display:block`). "Mở trong tab mới" opens the plain `viewform` URL. Form URLs and labels live only in `_data/formPopup.ts`. CSS: the `.form-popup*` block and the `.event-header__group*`/`__submenu`/`__sublist` block at the end of `globals.css`. Third-party residual: whether BOTH forms render inside the iframe on the deployed site (login-restricted forms, blocked third-party cookies, hosting headers) is checked manually by the owner |
| Facebook | Uses `projectLinks.facebook`; when it is null the radio CTA becomes a disabled button and the Footer omits the link; do not invent an official page URL |
| Zalo | Community group `https://zalo.me/g/fhjd7fuvlccje1jwxyvu` (`projectLinks.zalo`), group name "HỘI ĐỒNG NIÊN REPLY 199X TẠI ĐÀ NẴNG" (`ZALO_GROUP_NAME`); the long name must wrap without horizontal scroll |
| Email | Preserve `loihoidap199x@gmail.com`; a `mailto:` link may open the user's mail client |
| Contact form | Clearly explain it is a local preview before interaction. Validate inputs and allow preview/edit without resetting user text. Announce feedback accessibly. Do not display the source's fabricated saved-success message |

Scope note (2026-11-17): this contract covers the home route's preserved UI. The app also has Supabase auth, PayOS ticket checkout and a Sheets paid-order outbox on the server; see `process/context/all-context.md` for that backend and its verification limits. No email transport, ticket allocation, contact persistence or newsletter subscription is supplied. Ticket-request submissions use a server-side route to the organizer's fixed Google Sheets registration tab; automated tests mock that boundary and do not prove durable persistence. The contact form remains a local preview and email-client link. Order completion on Google Forms and delivery through an email client remain outside this application's verified behavior.

## Accessibility and Responsive Rules

- Keep one h1, ordered section headings, semantic landmarks and a visible keyboard skip link.
- Associate each label with an input ID; use `autoComplete="name"` / `"email"` where relevant. Input font size is at least 16px. Contact status uses `role="status"` or a polite live region.
- Provide high-contrast visible focus treatment, sufficiently large touch targets and text alternatives. Avoid icon-only unexplained controls.
- Use forest/dark ink for small text on paper; source teal on paper is suitable for decoration or sufficiently large text, not ordinary small labels.
- Use anchor scroll offset for the fixed header. Avoid horizontal overflow from long URLs, dates, title shadows and flex rows.
- Check 360px and 390px phones, 768px tablet and 1280px/1440px desktop. Stack cards/CTA rows on narrow screens while preserving reading order.
- Respect reduced motion for smooth scrolling and decorative pulses/transforms. No essential information depends on animation or hover.
- Keep server-rendered content readable before hydration; a failed remote asset must not erase the page's identity or event details.

## Agent Change Checklist

1. Read the selected plan and this contract; claim exact files before parallel work. Never revert another agent's changes.
2. Edit the smallest owner. Keep new state in client leaves, repeated copy in typed data and global design tokens in the stylesheet.
3. Compare against preserved source: section IDs/order, Vietnamese Unicode, dates/prices, venue, links and availability language.
4. Run the checks in `process/context/tests/all-tests.md`. Run type generation and production build sequentially because both write `.next`.
5. Inspect responsive browser rendering and key interactions; record actual evidence and any unavailable assets. Lint/build alone do not establish fidelity.
6. Update the owning context doc when verified code changes these boundaries; rebuild generated routing and run context validation. Keep plans/reports in their task folder, not this durable context group.

## Source Paths and Update Triggers

Sources: preserved HTML; `src/app/(routes)/`, `src/app/layout.tsx`, `src/components/`, `src/styles/globals.css`, `src/lib/constants.ts`. Update after component renames, content restructuring, confirmed production assets, actual service integration or changed CTA behavior. Implementation progress belongs in the active task plan/report; this file remains the agent-facing contract.

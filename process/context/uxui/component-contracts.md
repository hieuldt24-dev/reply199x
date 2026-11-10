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
| `kenh-truyen-thong` | `_components/ChannelsSection.tsx` | Server; TikTok link and upcoming Facebook state |
| `timeline` | `_components/TimelineSection.tsx` | Server; 20–21/11/2026 pop-up and 22/11/2026 event |
| `su-kien` | `_components/EventsSection.tsx` | Server; main event and poster; contains TicketsSection |
| `ve`, nested in `su-kien` | `_components/TicketsSection.tsx` | Server; sales unavailable and notification link |
| `merch` | `_components/MerchSection.tsx` | Server; product details and external order form |
| `quy-trinh` | `_components/ProcessSection.tsx` | Server; participation/order steps |
| `lien-he` | `_components/ContactSection.tsx` | Server; contact details and ContactForm leaf |
| Contact interaction | `_components/ContactForm.tsx` | Client; validation and local preview only |
| Footer | `src/components/Footer.tsx` | Server; shared shell and real source links |

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

Preserve Epilogue display headings, Be Vietnam Pro body text and Space Grotesk labels from the source, with robust fallbacks if remote fonts cannot load. Preserve paper dots, dark halftone, cassette/radio motifs, ticket edges, layered title shadows and hard offset shadows. Accessibility fixes may soften effects where they obscure text.

The source has two Google-hosted bitmap assets: the logo and event poster. Preserve their source URLs and meaningful alternatives until production assets are confirmed. Do not fabricate local asset provenance, silently replace the poster, or assume network availability. Decorative icons are hidden from assistive technology; meaningful controls have text names even when an icon font is unavailable.

## Interaction Contracts and Unavailable Services

| Surface | Required behavior |
|---|---|
| Navigation and hero links | Resolve to the existing section IDs; fixed header must not obscure target headings |
| Mobile navigation | All source destinations remain reachable by keyboard/touch; expose expanded state and a controlled region; close after selecting a destination |
| TikTok | Preserve `https://www.tiktok.com/@loihoidap199x`; new-tab links use `rel="noopener noreferrer"` |
| Merchandise order CTA | Preserve `https://forms.gle/tW1VU8vpASc53CJa8`; this opens an external form, not an in-app checkout |
| Tickets | Preserve the sales-not-open state; notification CTA goes to `#lien-he`, without claiming a reservation or subscription |
| Facebook | Upcoming/unavailable state; do not invent an official page URL |
| Email | Preserve `loihoidap199x@gmail.com`; a `mailto:` link may open the user's mail client |
| Contact form | Clearly explain it is a local preview before interaction. Validate inputs and allow preview/edit without resetting user text. Announce feedback accessibly. Do not display the source's fabricated saved-success message |

No database, payment, email transport, ticket allocation, contact persistence or newsletter subscription is supplied. A valid local form preview proves only browser interaction. Order completion on Google Forms and delivery through an email client remain outside this application's verified behavior.

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

---
name: plan:ticket-buttons-google-form
description: "Swap the three 'dat phieu nuoc' trigger buttons (Hero, Timeline, Tickets) from the TicketRequestDialog order flow to an in-page popup embedding the owner's Google Form (forms.gle/VxzPfsoQQQv21zBs8); new typed ticketForm entry, small client leaf TicketFormButton, FormPopup generalised by two optional props; TicketRequestDialog stays in the repo untouched; form currently requires Google sign-in so the new-tab link is prominent and the form-settings change is an owner decision"
date: 18-11-26
feature: none
---

# PLAN — Ticket buttons open the Google Form popup

Status: CANCELLED (2026-11-18) — owner chose the existing PayOS order dialog because the Google Form needs an image upload, which forces Google sign-in and cannot be embedded; partial uncommitted code reverted to HEAD.

**BLUF:** SIMPLE (one sequential EXECUTE, 12 steps, one package, no schema/auth/API/billing). The three buttons "Đặt phiếu nước ngay ↗" (Hero), "Đặt phiếu nước ngay ✦" (Timeline) and "Liên hệ về phiếu nước" (Tickets) keep their classes and children but stop rendering `TicketRequestDialog`. They render a new client leaf `TicketFormButton` (same `className` + `children` props, so switching back is one import line plus one tag name per section). Clicking it mounts (first click only) and opens the existing `FormPopup` for a new typed `ticketForm` entry (embed URL `https://docs.google.com/forms/d/e/1FAIpQLSdPyMU0P2ZR8fhUj-GGLFIwLTrB7W49SDnjUFoZYfK8DhCANw/viewform?embedded=true`). `FormPopup` gets two OPTIONAL props (`forms`, `dialogId`) so the Navbar usage and all its tests stay byte-for-byte valid. IMPORTANT: the form currently redirects anonymous visitors to Google sign-in, which refuses to be framed, so the iframe will be blank until the owner changes the form settings (O2). The popup therefore always shows a short static note plus a prominent "Mở trong tab mới" link. `TicketRequestDialog.tsx` and its subcomponents are NOT modified.

Status: PLANNED (not validated, not executed).
Date: 18-11-26
Complexity: SIMPLE (about 11 touched files: 1 data, 1 popup component, 1 new leaf + 1 new test, 3 one-line-pair section edits, 1 CSS append, 1 extended popup test, 2 context docs, 1 backlog note extended; no schema/auth/API/billing)
TL;DR: new `TicketFormButton` (portal popup, lazily mounted per trigger) replaces `TicketRequestDialog` in three sections; `FormPopup` gains optional `forms` and `dialogId`; `ticketForm` data entry with a fallback note; owner must relax the form's Google settings or the iframe stays blank; old dialog untouched and still tested.

## Current Execution State
- Last updated: 2026-11-18
- Current step: PLAN written; next VALIDATE (vc-validate-agent), then the owner's explicit "ENTER EXECUTE MODE".
- Validate-contract: not written (placeholder below).
- No separate SPEC: the locked requirement is the owner's request message of 2026-11-18; AC1-AC15 below are its translation.
- Strategy (vc-agent-strategy-compare, Simple Mode): S7 (5+ files in blast radius) = 1; S1-S6 = 0; score 1/7 = LOW. Recommended: Sequential, 1 EXECUTE agent (opus), then 1 vc-tester EVL run (sonnet). No fan-out: data, popup, leaf, CSS and tests are one overlapping change.
- Baseline on disk (HEAD 6085118): `git status` shows only `package.json`, `package-lock.json` (owner edits, out of scope, never touch), the hook log, and the previous plan's files. Section files, `FormPopup*`, `formPopup.ts`, `TicketRequestDialog*` are clean.

## Overview
Owner request: every "đặt phiếu nước" trigger on the page must open an in-page popup embedding the Google Form `https://forms.gle/VxzPfsoQQQv21zBs8` (resolves to form id `1FAIpQLSdPyMU0P2ZR8fhUj-GGLFIwLTrB7W49SDnjUFoZYfK8DhCANw`, viewform `https://docs.google.com/forms/d/e/{id}/viewform`). All three triggers change; classes and children stay exactly; the old order dialog stays in the repo unused by these sections; the header ticket button stays removed.

Critical finding (verified by the orchestrator): resolving the short link anonymously redirects to `https://accounts.google.com/v3/signin/...`. The form requires sign-in (typical causes: "Limit to 1 response", "Collect email addresses: Verified", or "Restrict to users in organisation"). Google sign-in pages refuse framing, so visitors see a blank or refused frame until the owner fixes the settings. The design embeds anyway (the owner asked for an embedded popup and the fix is a 30-second settings change) and makes the way out obvious.

## Context read (current state on disk, 2026-11-18)
- Router chain: `process/context/all-context.md`, `uxui/component-contracts.md` (row 77 "Form popup (Navbar Check in group)"), `tests/all-tests.md` (Commands, Quick Procedures, Known Gaps), `process/development-protocols/plan-lifecycle.md` (task folder, flat backlog NOTE).
- Code: `HeroSection.tsx` (line 18), `TimelineSection.tsx` (lines 86-88, multi-line children), `TicketsSection.tsx` (line 40) each render `<TicketRequestDialog className=...>children</TicketRequestDialog>` and are Server Components. `TicketRequestDialog.tsx` renders a Fragment: `<button type="button" className aria-haspopup="dialog" aria-controls=...>` plus an always-present `<dialog>`. `FormPopup.tsx` (101 lines) iterates the module import `checkinForms` and hard-codes `id={FORM_POPUP_DIALOG_ID}`. `_data/formPopup.ts` (34 lines: `CHECKIN_GROUP_LABEL`, `CheckinForm`, private `googleForm()` helper, frozen `checkinForms`). `Navbar.tsx` opens `FormPopup` with `activeId` + `returnFocus`. `FormPopup.test.tsx` (T1-T13) and `Navbar.test.tsx` exist; no tests exist for the three sections (only `ChannelsSection.test.tsx` and `TicketRequestDialog.test.tsx` in that folder). `globals.css` is 978 lines; `.form-popup*` block at lines 946-964, the group/submenu block appended at the end.
- Previous plans reused for conventions, gates and E-instructions: `navbar-google-form-popup_18-11-26` (parent, popup contract) and `navbar-checkin-menu_18-11-26` (per-form lazy iframes, `[hidden]` rule, E1-E16). Lessons carried over: test files only via Write/Edit tool; Unicode-safe banned-word regex with a literal double backslash and a positive control built with `String.fromCharCode`; `\|` in gate tables means a plain `|`; append-only CSS at the end of `globals.css`; own-lines-only doc edits; never kill port 3000, probe on 3218 (3217 if free); press Esc first because anonymous visitors get a login dialog on load.

## Findings that shape the design (verified on disk)
1. `FormPopup` is coupled to two module constants: the `checkinForms` list and `FORM_POPUP_DIALOG_ID`. Reusing it for another form needs a forms list and a distinct dialog id, otherwise a page holding the Navbar popup plus a ticket popup would carry two `<dialog id="form-popup-dialog">` (invalid duplicate id, wrong `aria-controls`).
2. `FormPopup` derives open state from `activeId` resolved against its list; an unknown id means closed. A generalised `forms` prop keeps that contract (T13 stays true).
3. Server Components cannot hold state; each section must keep rendering a client leaf with `className` + `children` (same prop contract as `TicketRequestDialog`) so the sections stay Server Components and a swap-back is a rename.
4. A `<dialog>` rendered inline inside a section inherits DOM-ancestry CSS (for example `.reply-stop button`-style descendant rules could restyle the close button). `showModal()` lifts it to the top layer but not out of selector scope. Rendering the popup through `createPortal(..., document.body)` removes this class of bug. It is safe because the portal is created only after the first click (client only, no hydration mismatch).
5. Cross-origin iframe refusals cannot be detected reliably: `load` fires for blocked or error pages, `contentWindow`/`contentDocument` access throws for any cross-origin frame, and Google's X-Frame-Options refusal shows Chrome's own error page. A timeout-based guess would show false alarms on slow networks and hide real failures. Decision D4: no detection; a static, always-visible note plus a prominent link is honest and cheap.
6. The popup body is `.form-popup__body` (flex:1) with `.form-popup__fallback` below it; the fallback link already has `target="_blank" rel="noopener noreferrer"` and a 44px hit area. Making it prominent needs only one modifier class and a few CSS lines.
7. jsdom limits (as in the parent plans): no real `showModal`, no real Esc, no CSS. Tests polyfill `showModal`/`close` in `beforeEach`, simulate Esc with a `cancel` event, assert attributes not visibility. `createPortal` content is queryable through `screen`.
8. Working-tree state: `package.json` and `package-lock.json` carry owner edits that are out of scope; EXECUTE must not stage, revert or touch them, and must edit `globals.css` and the two context docs incrementally.

## Technical decisions (locked, no creative decisions left for EXECUTE)
- **D1 Data model (`src/app/(routes)/_data/formPopup.ts`, EDIT, additive).** Introduce a base type `FormPopupEntry = Readonly<{ id: string; dialogTitle: string; embedUrl: string; fallbackUrl: string; fallbackNote?: string }>` and redefine `CheckinForm = FormPopupEntry & Readonly<{ menuLabel: string }>` (shape of every existing entry unchanged; T12 stays valid). The private `googleForm()` helper stays the only place that builds `https://docs.google.com/forms/d/e/{id}/viewform` (fallback) and `?embedded=true` (embed); give it an optional `fallbackNote` pass-through and make it generic enough to build an entry without `menuLabel` (for example by building the base entry in a second tiny helper that `googleForm()` calls, so the URL rule exists once). Add `export const ticketForm: FormPopupEntry` with: id `ticket-order-form`, dialogTitle `Đặt phiếu nước REPLY 199X` (O1, owner-confirmable), googleFormId `1FAIpQLSdPyMU0P2ZR8fhUj-GGLFIwLTrB7W49SDnjUFoZYfK8DhCANw` (comment: owner short link `https://forms.gle/VxzPfsoQQQv21zBs8`), and `fallbackNote` `Nếu biểu mẫu không hiện hoặc yêu cầu đăng nhập Google, hãy mở biểu mẫu trong tab mới.` (D4). Also export `TICKET_FORM_DIALOG_BASE`? NOT needed (D3 uses `useId`). `checkinForms` and `CHECKIN_GROUP_LABEL` are untouched.
- **D2 `FormPopup` generalisation (`src/components/FormPopup.tsx`, EDIT, minimal).** Add two OPTIONAL props: `forms?: readonly FormPopupEntry[]` (default `checkinForms`) and `dialogId?: string` (default `FORM_POPUP_DIALOG_ID`). Replace the three internal `checkinForms` lookups/maps with the `forms` value and `id={FORM_POPUP_DIALOG_ID}` with `id={dialogId}`. Navbar passes neither prop, so its behaviour, DOM and tests are identical. Fallback paragraph: when the shown form has a `fallbackNote`, render `<p className="form-popup__fallback form-popup__fallback--prominent"><span>{note}</span> <a ...same attributes, text "Mở trong tab mới ↗">`; otherwise the current "Không thấy biểu mẫu? Mở trong tab mới ↗" markup stays exactly. The link keeps accessible name matching `/Mở trong tab mới/`, `href` = `fallbackUrl`, `target="_blank"`, `rel="noopener noreferrer"`. Keep the guarded render-phase state derive, no `setState` in an effect body, no `ref.current` read during render. Target file length at most about 110 lines.
- **D3 `TicketFormButton` (`src/app/(routes)/_components/TicketFormButton.tsx`, NEW, route-private, PascalCase named export, "use client", at most 150 lines).** Props `Readonly<{ className: string; children: ReactNode }>` (identical to `TicketRequestDialog`, enabling the one-line swap). State: `mounted` (set true on the first click, never reset) and `open`. `popupId = useId()`. Refs: `button = useRef<HTMLButtonElement>(null)`. Render a Fragment: `<button ref type="button" className={className} aria-haspopup="dialog" aria-controls={mounted ? popupId : undefined} onClick={...set mounted true, open true}>{children}</button>` and `{mounted && createPortal(<FormPopup forms={[ticketForm]} dialogId={popupId} activeId={open ? ticketForm.id : null} onClose={() => setOpen(false)} returnFocus={button} />, document.body)}`. The `forms` array must be a module-level constant (for example `const forms = [ticketForm] as const` at file top) so its identity is stable across renders. No `window.open`, no tracking, no extra DOM wrapper (Fragment) so each section's flex/grid layout is unchanged. Instance model (O3, justified): one lazily-mounted popup PER trigger, not one shared popup. Reasons: sections are Server Components and `layout.tsx` is out of scope, so a shared popup needs a new provider or an external store (extra files, more risk); before the first click a trigger renders no dialog and no iframe, so hidden or never-used triggers never call Google; the modal is exclusive, so in practice one popup is opened per visit. Accepted cost: opening a second trigger creates a second iframe (one extra Google load, and typed answers in the first trigger's frame are not shared). Revisit with a shared store only if analytics show people opening two triggers.
- **D4 Fallback prominence and no detection.** Static note + prominent link are shown every time the ticket popup is open, regardless of whether the frame works (see Finding 5). The note is data (`fallbackNote`), so the owner can change or drop it in one place; once the form is public the owner may delete the field and the popup falls back to the standard line.
- **D5 CSS (append-only, at the END of `src/styles/globals.css`).** Re-read the last 25 lines right before appending; ONE new commented block via the Edit tool; never rewrite the file, never touch existing `.form-popup*`, `.event-header__*`, radio or channel rules; keep LF. Content (starting values, tune only inside these properties): `.form-popup__fallback--prominent { display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:6px 14px; background:#fff3d6; }` and `.form-popup__fallback--prominent a { padding-inline:20px; border:2px solid var(--fp-red); border-radius:999px; font-weight:800; text-decoration:none; }` (specificity 0,1,1 beats the existing `.form-popup__fallback a`, 0,1,1, because it comes later). Nothing else. The existing mobile `max-width:639px` popup rules already make the dialog full-screen.
- **D6 Sections (3 files, EDIT, minimal diff).** In each of `HeroSection.tsx`, `TimelineSection.tsx`, `TicketsSection.tsx`: change the import line to `import { TicketFormButton } from "./TicketFormButton";` and rename the JSX tag (opening and, for Timeline, closing) to `TicketFormButton`. NOTHING else changes: classes, children, spans, spacing stay byte-identical. Expected `git diff --numstat`: Hero 2/2, Timeline 3/3, Tickets 2/2 (G10b).
- **D7 TicketRequestDialog stays.** No edit to `TicketRequestDialog.tsx`, `TicketAttendeeFields`, `TicketOrderReview`, `TicketOrderSteps`, `TicketOrderSummary`, `TicketStub`, `TicketSurveyFields`, their tests, `src/lib`, `src/app/api`, `supabase`. Its tests stay in the neighbour gate. Swap-back recipe (documented in the REPORT and the component-contracts row): in a section change the import and the tag name back to `TicketRequestDialog`.
- **D8 Documentation.** Edit ONLY `process/context/uxui/component-contracts.md` (add one new row "Ticket form popup (TicketFormButton)" directly after row 77, and append a short sentence to row 77 that `FormPopup` also accepts optional `forms`/`dialogId`; do not rewrite other rows) and the own lines of `process/context/all-context.md` (structure line for `(routes)/_components` mention of `TicketFormButton`, and ONE open-question line for the new residual R1/R2). Extend the backlog note `process/general-plans/backlog/form-popup-deployed-embed-check_NOTE_18-11-26.md` with one bullet for the ticket form (needs settings change). Then run `node .claude/skills/vc-context-discovery/scripts/discover-context.mjs --check-routing` and `node .claude/skills/vc-generate-context/scripts/validate-all-context.mjs`.
- **D9 No new surface.** No dependency, no `package.json` change, no new route, no header, no `window.open`, no tracking (analytics hook: none yet, mention only in the REPORT). "vé" ban applies to every new string (positive control kept). The ticket price and order survey remain only inside `TicketRequestDialog` (unreferenced by the three sections).

## Phase Completion Rules
`CODE DONE` when code is written; `VERIFIED` only when every Fully-Automated gate is green when re-run by vc-tester (EVL) and probes P1-P3 pass. AC14 (form actually renders inside the iframe on the deployed site after the owner changes the form settings) is a named residual and is NEVER counted as PASS; its gate stays CONDITIONAL until the owner confirms by hand.

## Scope
In scope: the files in Touchpoints. Out of scope (do NOT touch): `src/lib`, `src/app/api`, `supabase`, `scripts`, `.env*`, `package.json`, `package-lock.json`, `src/app/layout.tsx`, `src/app/(routes)/_data/brief.ts` (including `projectLinks.merch`), `Footer*`, `Channels*`, `Radio*`, `_data/channels.ts`, `Navbar.tsx` behaviour and `Navbar.test.tsx` (must stay unchanged and green), `TicketRequestDialog.tsx` and all its subcomponents and tests, `LoginDialog*`, `HeaderAuth*`, `next.config.ts`, `src/proxy.ts`, the merch link, and any re-introduction of the removed header ticket button.

## Touchpoints
| File | Action | Notes |
|---|---|---|
| `src/app/(routes)/_data/formPopup.ts` | EDIT (additive) | `FormPopupEntry`, `CheckinForm = FormPopupEntry & menuLabel`, optional `fallbackNote`, `ticketForm` (D1) |
| `src/components/FormPopup.tsx` | EDIT (minimal) | optional `forms` + `dialogId` props, prominent fallback when a note exists (D2) |
| `src/app/(routes)/_components/TicketFormButton.tsx` | NEW | client leaf, trigger + lazy portal popup (D3) |
| `src/app/(routes)/_components/TicketFormButton.test.tsx` | NEW (Write tool) | scenarios F1-F10 |
| `src/components/FormPopup.test.tsx` | EDIT (Edit tool, append tests) | T14-T16 for `forms`/`dialogId`/note; T1-T13 unchanged |
| `src/app/(routes)/_components/HeroSection.tsx` | EDIT (import + tag) | G10, G10b |
| `src/app/(routes)/_components/TimelineSection.tsx` | EDIT (import + two tags) | G10, G10b |
| `src/app/(routes)/_components/TicketsSection.tsx` | EDIT (import + tag) | G10, G10b |
| `src/styles/globals.css` | APPEND at end only | one commented block (D5) |
| `process/context/uxui/component-contracts.md` | EDIT: new row after row 77 + one sentence on row 77 | D8 |
| `process/context/all-context.md` | EDIT own lines only | D8 |
| `process/general-plans/backlog/form-popup-deployed-embed-check_NOTE_18-11-26.md` | EDIT (append one bullet) | ticket form needs settings change |
| `process/general-plans/active/ticket-buttons-google-form_18-11-26/ticket-buttons-google-form_REPORT_18-11-26.md` | NEW at EXECUTE end | numbers, screenshots, deviations |
Read only: `TicketRequestDialog.tsx`, `Navbar.tsx`, `Navbar.test.tsx`, `brief.ts`, `next.config.ts`, `src/proxy.ts`.

## Public Contracts
- Visible: on `/` the three ticket triggers keep their text, classes and look; clicking any opens a modal titled "Đặt phiếu nước REPLY 199X" containing the Google Form iframe, a short note, and a prominent "Mở trong tab mới" link (plain `viewform` URL, `target="_blank" rel="noopener noreferrer"`). The order form, survey and PayOS checkout are no longer reachable from the UI (code stays; checkout is also gated off by `PAYOS_CHECKOUT_ENABLED`).
- Internal API: `FormPopup` props gain optional `forms` and `dialogId` (backward compatible); `_data/formPopup.ts` gains `FormPopupEntry`, `ticketForm`, optional `fallbackNote`; `CheckinForm` is now an intersection with the same fields. `TicketFormButton({ className, children })` mirrors `TicketRequestDialog`'s props.
- External: the visitor's browser contacts `docs.google.com` only after the first click on a trigger; no endpoint, header or route is added.

## Blast Radius
Low: one package, no data, no auth/billing/schema/public API/runtime. Real risks: (1) the generalised `FormPopup` is also the Navbar popup (mitigated: optional props with identical defaults, T1-T13 and N1-N7 unchanged and in the gate); (2) duplicate dialog ids (D3 `useId` + T15); (3) section edits accidentally changing classes/children (G10b numstat); (4) focus not returning (F6 + P2); (5) the blank-iframe UX caused by Google sign-in (D4, O2, AC14); (6) a shared uncommitted tree: `package*.json` untouched. Rollback: revert the three section edits (restores the old dialog instantly), delete `TicketFormButton*`, revert `FormPopup.tsx`, `formPopup.ts`, the test additions and the one appended CSS block, restore the doc lines; no migration, no data.

## Test Coverage Plan (vc-test-coverage-plan)
Test context loaded: `process/context/tests/all-tests.md` (router: Commands, Quick Procedures, Known Gaps) plus the previous plans' contracts. Existing test files in the blast radius: `src/components/FormPopup.test.tsx` (T1-T13), `src/components/Navbar.test.tsx` (N1-N7, unchanged), neighbours `src/components/Footer.test.tsx`, `src/components/auth/HeaderAuth.test.tsx`, `src/components/auth/LoginDialog.test.tsx`, `src/app/(routes)/_components/TicketRequestDialog.test.tsx`, `ChannelsSection.test.tsx`. No test exists for Hero/Timeline/Tickets; proportionately they are covered by static gates G10/G10b plus the probe (a server-component render test would need `next/image` and layout mocks for little added proof). No high-risk class (auth, billing, schema, public API, secrets, migration) is touched, so no Hybrid minimum applies.

**Area: `TicketFormButton.tsx`** (`npx.cmd vitest run "src/app/(routes)/_components/TicketFormButton.test.tsx"`; jsdom, dialog polyfill in `beforeEach`)
| Tier | Scenario | Command / Steps | What it proves | What it does NOT prove |
|---|---|---|---|---|
| Fully-automated | F1 before any click: exactly one button with the given `className` and children text, no dialog, no iframe, no `aria-controls` | G1 | trigger visual contract, zero Google calls before click | real layout |
| Fully-automated | F2 click opens the dialog named `Đặt phiếu nước REPLY 199X` with `aria-modal="true"`; iframe `src` equals `ticketForm.embedUrl` exactly, `loading="lazy"`, `referrerpolicy`, no `sandbox`, no `allow`; `window.open` not called; button `aria-controls` equals the dialog id | G1 | open behaviour, URL, aria wiring | the form renders |
| Fully-automated | F3 fallback: note text present; link name matches `Mở trong tab mới`, `href` = `ticketForm.fallbackUrl` (no `embedded`), `target=_blank`, `rel="noopener noreferrer"`, link inside the `--prominent` paragraph | G1 | prominent fallback contract | link opens a tab |
| Fully-automated | F4 close paths: close button, `cancel` event (Esc simulation, `preventDefault`), click on the dialog itself; click on the heading does not close | G1 | close logic | real Esc and `::backdrop` click |
| Fully-automated | F5 reopen keeps the same iframe element (lazy mount once, answers kept) | G1 | lazy-once + retention | answers inside Google |
| Fully-automated | F6 focus: close button focused on open; after each close path focus is on the trigger button | G1 | deterministic focus restore | real Tab order across the iframe |
| Fully-automated | F7 two `TicketFormButton` instances plus a Navbar-style `FormPopup` default instance: all `<dialog>` ids unique (query `document.querySelectorAll("dialog[id]")`); each button's `aria-controls` resolves to its own dialog | G1 | no duplicate ids (Finding 1) | — |
| Fully-automated | F8 mounting a second trigger and clicking it does not mount iframes for triggers never clicked (count iframes after clicking only one of two) | G1 | hidden/never-used triggers do not preload Google | network |
| Fully-automated | F9 data integrity of `ticketForm`: id `ticket-order-form`; `embedUrl` is exactly `https://docs.google.com/forms/d/e/1FAIpQLSdPyMU0P2ZR8fhUj-GGLFIwLTrB7W49SDnjUFoZYfK8DhCANw/viewform?embedded=true`; `fallbackUrl` the same without `?embedded=true`; `fallbackNote` non-empty; `ticketForm` is not in `checkinForms` | G1 | URL shape cannot silently drift | the URL resolves, the form is public (owner check) |
| Fully-automated | F10 banned-word scan (accented "ve") over `ticketForm` strings and rendered dialog text with positive control built from `String.fromCharCode(0xe9)`; regex `new RegExp("(?<![\\p{L}\\p{N}])v\\u00e9(?![\\p{L}\\p{N}])", "iu")` | G1 | no banned word | site-wide copy |
Failing stubs (red-first, for the validate-contract; NOT written to disk at PLAN):
- `test("should open the ticket form popup with the exact embed src from the same className trigger", () => { throw new Error("NOT IMPLEMENTED — TDD stub for: trigger opens ticket form popup") })`
- `test("should keep dialog ids unique across several triggers and the navbar popup", () => { throw new Error("NOT IMPLEMENTED — TDD stub for: unique dialog ids") })`
- `test("should return focus to the trigger after each close path", () => { throw new Error("NOT IMPLEMENTED — TDD stub for: focus restore") })`

**Area: `FormPopup.tsx` + `_data/formPopup.ts`** (`npx.cmd vitest run src/components/FormPopup.test.tsx src/components/Navbar.test.tsx`)
| Tier | Scenario | Command / Steps | What it proves | What it does NOT prove |
|---|---|---|---|---|
| Fully-automated | T1-T13 (existing, UNCHANGED) still pass with zero edits to those tests | G1 | backward compatibility of the default `forms`/`dialogId` | — |
| Fully-automated | T14 `forms` prop: `<FormPopup forms={[ticketForm]} activeId={ticketForm.id} .../>` shows the ticket title, src, link; an id present only in `checkinForms` renders closed when `forms` is the ticket list | G1 | list injection and closed-on-unknown | — |
| Fully-automated | T15 `dialogId` prop: dialog `id` equals the supplied id; omitted prop gives `form-popup-dialog` | G1 | id override and default | — |
| Fully-automated | T16 `fallbackNote`: with a note the standard "Không thấy biểu mẫu?" text is absent and the `--prominent` class is present; without a note (a `checkinForms` entry) the standard line and no `--prominent` class | G1 | both fallback variants | visuals (probe) |
| Fully-automated | Navbar N1-N7 (existing, UNCHANGED) still pass | G1 | Navbar usage intact | real layout |
Failing stubs: `test("should accept a forms list and dialogId without changing navbar defaults", () => { throw new Error("NOT IMPLEMENTED — TDD stub for: FormPopup generalisation") })`.

**Area: three sections + `TicketRequestDialog` untouched** (static, PowerShell)
| Tier | Scenario | Command / Steps | What it proves | What it does NOT prove |
|---|---|---|---|---|
| Fully-automated | no section imports or uses `TicketRequestDialog`; each uses `TicketFormButton` exactly as many lines as expected | G10 | swap complete | runtime |
| Fully-automated | numstat of the three sections equals 2/2, 3/3, 2/2 (only the import and tag lines changed, so classes and children are byte-identical) | G10b | button visuals untouched | rendering |
| Fully-automated | `TicketRequestDialog.tsx` and its subcomponents have empty `git status`/`git diff`; its test still green | G11, G2 | old dialog preserved | its runtime in production |
| Fully-automated | header ticket button still absent | G12 | owner's earlier removal intact | header layout (probe) |
| Agent-probe | P1 browser at 360/390/768/1024/1280/1440 on `/`: each of the three triggers opens the popup, no horizontal scroll with popup open, popup fills the viewport correctly (full-screen below 640px), the prominent link visible without scrolling, close button styled like the Navbar popup's (computed style check) | G7 | real layout and styles | Google content |
| Agent-probe | P2 real Esc, real backdrop click, real focus return to the exact trigger clicked (all three), background scroll locked; Navbar "Check in" popup still opens and closes (regression) | G7 | native `<dialog>` + focus | iOS Safari |
| Agent-probe | P3 observe and record what the iframe shows (sign-in redirect / refused frame / the form) | G7 | whether O2 is still needed | NEVER a PASS |
| Known-gap | form renders in the iframe on the deployed site AFTER the owner relaxes the form settings; privacy/consent notice for a third-party embed; keyboard/screen reader across the iframe; iOS Safari | — | — | third party and environment; named residual R1-R5, gap-resolution D, gate CONDITIONAL |

Gap resolution:
| Gap | Resolution options |
|---|---|
| Form blank for anonymous visitors until settings change | A) none possible in code. B) owner changes Google Forms settings (O2). C) not acceptable as PASS. D) backlog note bullet + AC14 CONDITIONAL (chosen) |
| Real Esc / backdrop / focus in a real browser | A) probe P2 now (chosen). B) Playwright runner (new dependency, out of scope). C) accept. D) n/a |
| Section render tests | A) add server-component render tests (heavy mocks, little proof). B) static G10/G10b + probe (chosen). C) accept. D) n/a |
Missing test areas: form content/submission inside Google's page; shared-popup alternative (not built, O3).

## Acceptance Criteria (REQ-TEST-LINK)
Each criterion names `proven by:` and `strategy:` (Known-Gap is never a strategy). Gate ids G1-G13 are defined in Gates.
- AC1 The three triggers (Hero "Đặt phiếu nước ngay ↗", Timeline "Đặt phiếu nước ngay ✦", Tickets "Liên hệ về phiếu nước") render `TicketFormButton` with their original classes and children unchanged; none renders `TicketRequestDialog`. proven by: G10, G10b, TicketFormButton F1 (+ P1 visual); strategy: Fully-Automated (+ Agent-Probe).
- AC2 Clicking any trigger opens a modal named "Đặt phiếu nước REPLY 199X" whose iframe `src` is exactly `ticketForm.embedUrl`. proven by: F2, F9 (+ P1); strategy: Fully-Automated (+ Agent-Probe).
- AC3 The popup always shows a short note and a prominent "Mở trong tab mới" link with the plain `viewform` URL (`target=_blank`, `rel="noopener noreferrer"`); no fragile iframe-failure detection exists. proven by: F3, T16 (+ P1 visual); strategy: Fully-Automated (+ Agent-Probe).
- AC4 No dialog, iframe or Google request exists before a trigger's first click; never-clicked triggers never mount a popup; reopen keeps the same iframe. proven by: F1, F5, F8; strategy: Fully-Automated.
- AC5 Focus: close button focused on open; closing (button, Esc, backdrop) returns focus to the exact trigger clicked. proven by: F4, F6 (+ P2 native); strategy: Fully-Automated (+ Agent-Probe).
- AC6 The `FormPopup` generalisation is backward compatible: T1-T13 and Navbar N1-N7 pass unchanged; `forms`/`dialogId`/`fallbackNote` behave as specified; dialog ids stay unique across Navbar popup and triggers. proven by: G1 (T1-T16, N1-N7), F7; strategy: Fully-Automated.
- AC7 `ticketForm` is typed data next to `checkinForms`, exact id and URLs, not in the Navbar list. proven by: F9; strategy: Fully-Automated.
- AC8 `TicketRequestDialog.tsx` and its subcomponents are unchanged (empty git diff) and its tests stay green. proven by: G11, G2; strategy: Fully-Automated.
- AC9 Form URLs and ids appear only in `_data/formPopup.ts` (outside tests); merch link intact. proven by: G8; strategy: Fully-Automated.
- AC10 No banned word (accented "ve") in any new string. proven by: F10 with positive control; strategy: Fully-Automated.
- AC11 No horizontal scroll at 360/390/768/1024/1280/1440 with the popup open from each of the three triggers; real Esc, backdrop click, focus return and scroll lock work; Navbar popup unaffected. proven by: P1, P2; strategy: Agent-Probe.
- AC12 No regression: neighbours green, full vitest has only the known failure, typecheck, scoped lint (max-warnings 0), repo lint at the 461 baseline, build green with the retry rule. proven by: G2-G6; strategy: Fully-Automated.
- AC13 No CSP/X-Frame-Options/frame-src header in the repo that blocks `docs.google.com`. proven by: G9 (with positive control); strategy: Fully-Automated (repo scope only).
- AC14 (RESIDUAL) The form renders inside the iframe on the deployed site AFTER the owner changes the Google Form settings (Responses: turn off "Limit to 1 response"; "Collect email addresses" set to "Responder input" or "Do not collect"; no organisation restriction). proven by: no automated scenario; local observation P3 only (not PASS); owner manual check; strategy: Agent-Probe (local observation); named residual, gate CONDITIONAL, gap-resolution D.
- AC15 The header ticket button stays removed. proven by: G12; strategy: Fully-Automated.

## Implementation Checklist
Sequential, one EXECUTE agent (opus). TDD: tests before code; run the relevant gate after each step.
1. Pre-flight: `git status --short`; note `package.json`/`package-lock.json` as owner edits (never touch); read the last 25 lines of `src/styles/globals.css`; confirm HEAD 6085118; run G1 and G2 once to confirm the green baseline; find a free probe port (3218, else 3217); never touch port 3000.
2. Write `src/app/(routes)/_components/TicketFormButton.test.tsx` FIRST with the Write tool (never a shell heredoc): F1-F10 per the coverage table. Banned-word regex EXACTLY `new RegExp("(?<![\\p{L}\\p{N}])v\\u00e9(?![\\p{L}\\p{N}])", "iu")` with a literal DOUBLE backslash; positive controls via `String.fromCharCode(0xe9)`. Grep the file for `\\p{L}` and `\\u00e9` (present) and for the literal accented word (count 0). Run its gate: must be RED (module missing).
3. Edit `src/components/FormPopup.test.tsx` with the Edit tool: append T14-T16 (do not touch T1-T13). Run: T14-T16 RED, T1-T13 green.
4. Edit `src/app/(routes)/_data/formPopup.ts` per D1 (types, optional note, `ticketForm`). Run `npm.cmd run typecheck`-equivalent via G1 compile and fix.
5. Edit `src/components/FormPopup.tsx` per D2. Run `npx.cmd vitest run src/components/FormPopup.test.tsx src/components/Navbar.test.tsx` until all green (T1-T16, N1-N7).
6. Create `src/app/(routes)/_components/TicketFormButton.tsx` per D3 (at most 150 lines, module-level `forms` constant, `createPortal` only after first click). Run its test until green (F1-F10).
7. Edit the three sections per D6 (Edit tool, import line and tag rename only). Run G10 and G10b.
8. Append the CSS block at the END of `globals.css` per D5 with the Edit tool (re-read the last lines right before; keep LF; no other rule touched).
9. Run G1-G5 and fix in place until green (mind `react-hooks/set-state-in-effect`, the refs rule, `react-hooks/refs`).
10. Run G6 (build, retry rule), then `next start` on the free port (record the PID, stop exactly that PID tree afterwards, confirm the port is free) and run probes P1/P2/P3 at all six widths; Esc first at each load. Save screenshots flat in this task folder. Record in the REPORT what the iframe shows (P3).
11. Docs and backlog per D8 (Edit tool, own lines only); run the two context validators.
12. Final: re-run G3 (full vitest), G6, G8, G9, G10, G10b, G11, G12, G13; `git status --short` against Touchpoints (E-scope check, ignoring the owner's `package*.json` and the hook log); write `ticket-buttons-google-form_REPORT_18-11-26.md` (both build exit codes, both TicketRequestDialog results if the flake appears, AC14/P3 as observation, swap-back recipe); report to the orchestrator (vc-tester re-runs G1-G13 for EVL). Do not commit.

## Gates (PowerShell, from the repo root; Vitest must run from PowerShell, not Git Bash)
| Id | Command | Expected |
|---|---|---|
| G1 | `npx.cmd vitest run "src/app/(routes)/_components/TicketFormButton.test.tsx" src/components/FormPopup.test.tsx src/components/Navbar.test.tsx` | all green (F1-F10, T1-T16, N1-N7) |
| G2 | `npx.cmd vitest run src/components "src/app/(routes)/_components/TicketRequestDialog.test.tsx" "src/app/(routes)/_components/TicketFormButton.test.tsx"` | green (Footer, HeaderAuth, LoginDialog, Navbar, FormPopup, TicketRequestDialog, TicketFormButton) |
| G3 | `npm.cmd test` | only `src/lib/supabase/route-client.test.ts` red (known secure-cookie expectation); if `TicketRequestDialog.test.tsx` shows the rare 5s timeout under load, re-run that file alone once and record both results; any other failure is NEW |
| G4 | `npm.cmd run typecheck` (never concurrently with build: both write `.next`) | exit 0 |
| G5 | `npx.cmd eslint "src/app/(routes)/_components/TicketFormButton.tsx" "src/app/(routes)/_components/TicketFormButton.test.tsx" src/components/FormPopup.tsx src/components/FormPopup.test.tsx "src/app/(routes)/_data/formPopup.ts" "src/app/(routes)/_components/HeroSection.tsx" "src/app/(routes)/_components/TimelineSection.tsx" "src/app/(routes)/_components/TicketsSection.tsx" --max-warnings=0` | 0 problems |
| G5b | `npm.cmd run lint` | 461 problems (269 errors, 192 warnings), all under `.agents/ .claude/ .codex/`, none under `src/`; more, or any `src/` line, is NEW |
| G6 | `npm.cmd run build` | first run may exit 1 on the Next 16.4.3 advisory after a successful compile; re-run, expect exit 0; record BOTH exit codes; NEVER upgrade Next |
| G7 | `Start-Process -PassThru npx.cmd "next start -p 3218"` after build (3217 if 3218 is taken; port 3000 is the owner's dev server: never kill or use it), agent-browser probe at 360, 390, 768, 1024, 1280, 1440; stop exactly the recorded PID tree; confirm the port is free | probes P1-P3 (detail below) |
| G8 | `Select-String -Path (Get-ChildItem src -Recurse -Include *.ts,*.tsx -Exclude *.test.ts,*.test.tsx).FullName -Pattern "docs.google.com/forms","1FAIpQLSfkPApNK9sU","1FAIpQLSdTYWn8MFgQyPY67","1FAIpQLSdPyMU0P2ZR8fh"`: at least 4 match lines and EVERY match only in `src/app/(routes)/_data/formPopup.ts`; plus `Select-String -Pattern "forms.gle/tW1VU8vpASc53CJa8" "src/app/(routes)/_data/brief.ts"` exactly 1 match | AC9 (zero matches is vacuous and a failure) |
| G9 | `Select-String -Pattern "Content-Security-Policy","X-Frame-Options","frame-src","frame-ancestors" next.config.ts, src/proxy.ts` with control `Select-String -Pattern "poweredByHeader","reactStrictMode" next.config.ts, src/proxy.ts` | G9: 0 matches; control: 2 matches (if the control is not 2 the gate is meaningless: fix the command first). Array `-Pattern` form, no pipe character |
| G10 | `Select-String -Pattern "TicketRequestDialog" "src/app/(routes)/_components/HeroSection.tsx","src/app/(routes)/_components/TimelineSection.tsx","src/app/(routes)/_components/TicketsSection.tsx"` with control `Select-String -Pattern "TicketFormButton"` on the same three files | 0 matches; control: Hero 2, Timeline 3, Tickets 2 lines (7 total) |
| G10b | `git diff --numstat -- "src/app/(routes)/_components/HeroSection.tsx" "src/app/(routes)/_components/TimelineSection.tsx" "src/app/(routes)/_components/TicketsSection.tsx"` | exactly `2 2`, `3 3`, `2 2` (added deleted) per file: only import and tag lines changed, so classes and children are unchanged |
| G11 | `git status --short -- "src/app/(routes)/_components/TicketRequestDialog.tsx" "src/app/(routes)/_components/TicketRequestDialog.test.tsx" "src/app/(routes)/_components/TicketAttendeeFields.tsx" "src/app/(routes)/_components/TicketOrderReview.tsx" "src/app/(routes)/_components/TicketOrderSteps.tsx" "src/app/(routes)/_components/TicketOrderSummary.tsx" "src/app/(routes)/_components/TicketStub.tsx" "src/app/(routes)/_components/TicketSurveyFields.tsx"` and the same list with `git diff --stat --` | empty output (all unchanged); control: `git status --short -- src/components/FormPopup.tsx` is NON-empty after step 5 (if empty the gate path is wrong) |
| G12 | `Select-String -Pattern "TicketRequestDialog","TicketFormButton","event-header__ticket" src/components/Navbar.tsx, src/components/Navbar.test.tsx, src/styles/globals.css` with control `Select-String -Pattern "HeaderAuth","event-header__toggle" src/components/Navbar.tsx, src/styles/globals.css` | 0 matches; control at least 2 matches. Array `-Pattern` form, no pipe character. Never run this against `src/app` |
| G13 | `(Get-Content "src/app/(routes)/_components/TicketFormButton.tsx").Count` | at most 150 |

Probe G7 detail, at EACH width (always press Esc first: anonymous visitors get a login dialog on load): (a) record `documentElement.scrollWidth` vs `clientWidth` with the popup closed and open; (b) for each of the three triggers (Hero at top, Timeline `#timeline`, Tickets section): scroll it into view, click it, verify the dialog title text, iframe `src` attribute equals `ticketForm.embedUrl`, the note and the "Mở trong tab mới" link `href`/`target`/`rel`, and that the link is visible without scrolling at 360x640 and above; (c) Esc closes, focus is on the exact trigger clicked; reopen and click the backdrop (real) closes; background scroll locked while open; (d) computed style of `.form-popup__close` equals the style it has in the Navbar popup (portal check, Finding 4); (e) open the Navbar "Check in" popup once to confirm it still works and that two dialog ids differ (`document.querySelectorAll("dialog[id]")` ids unique); (f) only one popup open at a time; (g) at 360 and 390 confirm the header is not wider than the viewport (observation, as in the previous task); (h) P3: record what each iframe shows (Google sign-in redirect, refused frame, blank, or the real form); never assert Google's content, never PASS on it; (i) screenshots per width, flat, into this task folder.

## Verification Evidence
| Gate / Scenario | Strategy | Proves SPEC criterion |
|---|---|---|
| G10 + G10b (no TicketRequestDialog in sections; numstat 2/2, 3/3, 2/2) + TicketFormButton F1 | Fully-Automated | AC1 |
| Probe P1 triggers look unchanged and each opens the popup | Agent-Probe | AC1 |
| TicketFormButton F2, F9 (title, exact embed src, no sandbox/allow, no window.open) | Fully-Automated | AC2 |
| Probe P1 popup open at six widths | Agent-Probe | AC2 |
| TicketFormButton F3 + FormPopup T16 (note, prominent link, attributes) | Fully-Automated | AC3 |
| TicketFormButton F1, F5, F8 (lazy mount, never-clicked triggers, same iframe on reopen) | Fully-Automated | AC4 |
| TicketFormButton F4, F6 (close paths, focus to the trigger) | Fully-Automated | AC5 |
| Probe P2 (real Esc, backdrop, focus to the exact trigger, scroll lock) | Agent-Probe | AC5 |
| G1 T1-T16 and N1-N7 unchanged + F7 (unique dialog ids) | Fully-Automated | AC6 |
| TicketFormButton F9 (ticketForm shape and exact URLs) | Fully-Automated | AC7 |
| G11 (empty git diff) + G2 (TicketRequestDialog tests green) | Fully-Automated | AC8 |
| G8 (URLs and ids only in formPopup.ts, minimum matches, merch intact) | Fully-Automated | AC9 |
| TicketFormButton F10 (banned word with positive control) | Fully-Automated | AC10 |
| Probe P1/P2 no horizontal scroll, Navbar popup still works | Agent-Probe | AC11 |
| G2, G3, G4, G5, G5b, G6 (regression suite) | Fully-Automated | AC12 |
| G9 grep header/CSP in repo with positive control | Fully-Automated | AC13 |
| Form renders in the iframe on the deployed site after owner settings change (local observation P3 only) | Agent-Probe (observation) + named residual (CONDITIONAL, backlog note, owner manual check) | AC14 |
| G12 (header ticket button stays removed) | Fully-Automated | AC15 |

## Data Flow and Failure Modes
Flow: visitor clicks a trigger (client leaf `TicketFormButton` inside a Server Component section) -> `mounted` and `open` become true -> `FormPopup` renders through a portal on `document.body` with `forms=[ticketForm]`, a unique `dialogId`, `activeId=ticketForm.id` -> render-phase derive arms the single iframe -> `showModal()`, focus to the close button -> the browser loads `ticketForm.embedUrl` from Google (third party; none of our data leaves the client) -> close (button, Esc, backdrop) -> `setOpen(false)` -> `close()` and focus to the trigger button; the iframe stays mounted for the next open of the same trigger.
Failure modes: (1) iframe blank, refused or showing a sign-in redirect (this form today, O2): the always-visible note and the prominent new-tab link are the way out (D4); (2) JS disabled: the trigger does nothing (same as the old dialog, accepted); (3) duplicate dialog ids: unique `useId` id plus F7; (4) two triggers opened in one visit: two iframes, accepted (O3); (5) section CSS restyling the popup: avoided by the portal (Finding 4, probe step d); (6) focus target unmounted: the trigger stays mounted; (7) stale `forms` identity re-arming frames: module-level constant `forms`; (8) owner later makes the form public: nothing changes in code, optionally delete `fallbackNote`; (9) switching back to the order flow: rename import and tag per section (D7).

## Security and Privacy (vc-security quick STRIDE; no auth, billing or secrets in this surface)
Static third-party URL in one data file; no user input reaches `src`/`href`; the type and F9 fix its shape. The visitor's browser contacts Google only after the first click; `referrerPolicy="strict-origin-when-cross-origin"`; no `sandbox` (Google Forms needs script/same-origin; unchanged parent-plan decision); no `allow`; the external link uses `rel="noopener noreferrer"`. Behaviour change worth stating to the owner: the order survey and PayOS checkout become unreachable from the UI, so no new paid orders can be created through the site; form answers now live in Google (privacy/retention/consent for a third-party form and its responses is an owner decision, O6). No elevation or DoS surface added.

## Risk Predictions (vc-predict, condensed 5-persona debate)
| Persona | Risk | Mitigation |
|---|---|---|
| Architecture | generalising `FormPopup` could break the Navbar | optional props with identical defaults; T1-T13 and N1-N7 stay unchanged in G1 (D2) |
| UX/Accessibility | blank iframe with no explanation; duplicate dialog ids; focus lost | static note + prominent link (D4); `useId` + F7; focus restore F6 + P2 |
| CSS/Maintenance | section-scoped CSS leaking into an inline dialog; specificity of the new modifier | portal to `document.body` (Finding 4); append-only block, probe step d |
| Security/Privacy | third-party embed, order flow bypass | lazy mount, referrer policy, owner decision O6, flow gated by `PAYOS_CHECKOUT_ENABLED` anyway |
| Testing | jsdom has no CSS or real Esc; regex corrupted by shell escaping; no section tests exist | attribute assertions plus probe; Write-tool files with double-backslash regex; static G10/G10b |
Highest-risk checklist items and edge cases (vc-scenario): step 5 (`FormPopup`: `forms` identity change while open, unknown id with a custom list, default list unchanged), step 6 (`TicketFormButton`: click twice quickly, Esc then click again, two instances, portal unmount on route change), step 8 (CSS: modifier specificity vs `.form-popup__fallback a`, 360px wrapping of note + link).

## Test Infra Improvement Notes
- A shared `useModalDialog` hook and shared `HTMLDialogElement` polyfill in `src/test/` remain a separate task (carried over); `LoginDialog`, `TicketRequestDialog`, `FormPopup` and the portal popup repeat the pattern.
- No test covers the three sections themselves; if a server-component render helper appears in `src/test/`, add one smoke render per section.
- No in-project browser runner exists (all-tests.md Known Gaps); real Esc, backdrop and computed-style checks stay agent-browser probes.
- If a second Google Form trigger group appears, consider a shared popup store instead of per-trigger instances (O3).

## Residuals for the owner (not PASS)
- R1 The form renders inside the iframe on the deployed site only after the Google Form settings change (O2); today anonymous visitors are redirected to Google sign-in and the frame is refused.
- R2 Hosting-added CSP/X-Frame-Options would block the frame; the repo adds none (G9).
- R3 Third-party-cookie settings (Safari, strict Chrome) can still block a form that normally works; the new-tab link is the way out.
- R4 Privacy/consent notice for embedded Google content and for responses stored in Google (owner policy).
- R5 Keyboard and screen reader across the iframe boundary; iOS Safari.
- R6 With the three triggers switched, the site no longer collects paid orders itself (survey, PayOS, Sheet outbox keep existing but are unreachable from the UI): the owner must be sure that is intended.

## Open owner decisions (defaults already chosen; only O2 affects what visitors see)
- O1 Popup title: default `Đặt phiếu nước REPLY 199X`. One data field.
- O2 BLOCKER FOR UX (not for EXECUTE): in Google Forms -> Settings -> Responses turn OFF "Limit to 1 response", set "Collect email addresses" to "Responder input" or "Do not collect", and remove any organisation restriction. Until then visitors see a blank frame and must use the new-tab link, which itself asks for Google sign-in.
- O3 Instance model: default one lazily-mounted popup per trigger; alternative one shared popup (needs a provider; more files).
- O4 Wording of the note: default `Nếu biểu mẫu không hiện hoặc yêu cầu đăng nhập Google, hãy mở biểu mẫu trong tab mới.`; delete the field once the form is public.
- O5 Switch-back recipe: per section, import and tag name back to `TicketRequestDialog`; no data change.
- O6 Consent/cookie notice and retention for the Google embed and its responses.

## Dependencies
No new dependency; no `package.json` change. Environment: Node 22, `npm.cmd`/`npx.cmd` on PowerShell, `agent-browser` in the workspace, network to Google only for the optional P3 observation. Process: VALIDATE (contract `Gate: PASS`) then the owner's explicit "ENTER EXECUTE MODE".

## Validate Contract

Status: PASS
Date: 18-11-26
date: 2026-11-18
generated-by: outer-pvl

Parallel strategy: sequential
Rationale: score 1/7 (LOW; only S7, 5+ files in blast radius). Data, popup, leaf, CSS and tests are one overlapping change, so no fan-out. One vc-execute-agent (opus, EXECUTE) runs checklist 1-12 in order, then one vc-tester (sonnet) re-runs G1-G13 independently (EVL). Total 2 agents (1 x 1 + 1 x 1); cost guard not triggered. VALIDATE ran inline and sequentially (SIMPLE plan, read-only checks only). Alternatives considered and rejected: parallel subagents (4 + N + 3 = 8-15 agents, no independent slices), workflow (no unknown item count), agent team (no mid-run coordination need).

Baseline note (verified on disk at VALIDATE, HEAD 6085118): `FormPopup.tsx` is 101 lines, `_data/formPopup.ts` 34 lines, `globals.css` 978 lines (LF, last rule is the `.event-header__caret` reduced-motion block), the three sections still render `TicketRequestDialog` (Hero line 18, Timeline lines 86-88, Tickets line 40), `Navbar.tsx` has no ticket trigger. Scope note from the orchestrator: EXECUTE of this plan is sequenced AFTER a separate small task (Vercel Analytics) that edits `src/app/layout.tsx` and the owner's `package.json`/`package-lock.json`; `src/app/layout.tsx` is OUT of this plan's scope and must not be touched, staged or reverted here (E1).

Test gates (C3 5-column table):

| criterion id | behavior | strategy | proving test | gap-resolution |
|---|---|---|---|---|
| AC1 | The three triggers render `TicketFormButton` with original classes and children; none renders `TicketRequestDialog`; numstat of the three sections is 2/2, 3/3, 2/2 | Fully-Automated | G10 (0 matches; control Hero 2, Timeline 3, Tickets 2), G10b, G1 (F1) | B |
| AC1 | Triggers look unchanged and each opens the popup at six widths | Agent-Probe | G7 probe P1 (`agent-browser`, port 3218 or 3217, 360/390/768/1024/1280/1440) | B |
| AC2 | Click opens modal "Đặt phiếu nước REPLY 199X" with iframe src exactly `ticketForm.embedUrl`, lazy, referrerpolicy, no sandbox/allow, no `window.open` | Fully-Automated | `npx.cmd vitest run "src/app/(routes)/_components/TicketFormButton.test.tsx" src/components/FormPopup.test.tsx src/components/Navbar.test.tsx` (G1: F2, F9) | B |
| AC3 | Note plus prominent "Mở trong tab mới" link with plain `viewform` URL, `target=_blank`, `rel="noopener noreferrer"`; no iframe-failure detection | Fully-Automated | G1 (F3, T16) | B |
| AC3 | Prominent link visible without scrolling at 360x640 and above | Agent-Probe | G7 probe P1 | B |
| AC4 | No dialog/iframe before first click; never-clicked triggers mount nothing; reopen keeps the same iframe | Fully-Automated | G1 (F1, F5, F8) | B |
| AC5 | Focus: close button on open; every close path returns focus to the clicked trigger | Fully-Automated | G1 (F4, F6) | B |
| AC5 | Real Esc, real backdrop click, focus to the exact trigger (all three), scroll lock | Agent-Probe | G7 probe P2 | B |
| AC6 | `FormPopup` generalisation backward compatible: T1-T13 and Navbar N1-N7 unchanged and green; `forms`/`dialogId`/`fallbackNote` as specified; dialog ids unique across Navbar popup and triggers | Fully-Automated | G1 (T1-T16, N1-N7, F7) | A (T1-T13, N1-N7) / B (T14-T16, F7) |
| AC7 | `ticketForm` typed data: exact id and URLs, not in `checkinForms` | Fully-Automated | G1 (F9) | B |
| AC8 | `TicketRequestDialog.tsx` and subcomponents unchanged; its tests stay green | Fully-Automated | G11 (empty status/diff; control non-empty), G2 `npx.cmd vitest run src/components "src/app/(routes)/_components/TicketRequestDialog.test.tsx" "src/app/(routes)/_components/TicketFormButton.test.tsx"` | A |
| AC9 | Form URLs/ids only in `_data/formPopup.ts` (non-test); merch link intact | Fully-Automated | G8 (at least 4 match lines, all in `formPopup.ts`; brief.ts merch exactly 1 match) | B |
| AC10 | No banned accented word in any new string | Fully-Automated | G1 (F10, with positive control) | B |
| AC11 | No horizontal scroll at six widths with popup open from each trigger; Navbar popup unaffected; popup close button computed style equals the Navbar popup's | Agent-Probe | G7 probes P1, P2 | B |
| AC12 | No regression: neighbours green, full vitest has only the known failure, typecheck, scoped lint, repo lint baseline 461, build | Fully-Automated | G2, G3 `npm.cmd test`, G4 `npm.cmd run typecheck`, G5 scoped eslint `--max-warnings=0`, G5b `npm.cmd run lint`, G6 `npm.cmd run build` (retry rule) | B |
| AC13 | No CSP/X-Frame-Options/frame-src/frame-ancestors in `next.config.ts` or `src/proxy.ts` | Fully-Automated | G9 (0 matches; positive control exactly 2 matches, verified at VALIDATE) | B |
| AC14 | Form renders inside the iframe on the deployed site AFTER the owner relaxes the Google Form settings (RESIDUAL; today anonymous visitors are redirected to Google sign-in and the frame is refused) | Agent-Probe | local observation only, G7 probe P3 (never PASS evidence); owner manual check on the deployed site | D |
| AC15 | Header ticket button stays removed | Fully-Automated | G12 (0 matches; control at least 2, verified 3 at VALIDATE) | B |
| AC16 (added at VALIDATE) | `Navbar.tsx` and `Navbar.test.tsx` are byte-unchanged by this task | Fully-Automated | `git status --short -- src/components/Navbar.tsx src/components/Navbar.test.tsx` expects empty output | B |

gap-resolution legend:
- A — proven now (gate passes in this cycle)
- B — fixed in this plan (gate added by this plan's checklist)
- C — deferred to a named later phase/plan
- D — backlog test-building stub (named residual; keep-active; continue)

C-4 reconciliation: the `strategy:` column carries ONLY the 3 proving strategies (Fully-Automated / Hybrid / Agent-Probe). Known-Gap is NEVER a `strategy:` value. AC14 is a named residual row carried via gap-resolution D, never claimed as proven. Every behavior developed by this plan (trigger swap, popup open/close, URLs, fallback, ids, focus, lazy mount) has at least one Fully-Automated gate; AC14 is an external third-party condition (Google form settings), not behavior developed here, so the vacuous-green ban does not apply. No high-risk class is touched (no auth, billing, schema, public API, secrets, migration), so no Hybrid minimum applies.

Legacy line form (retained so existing validate-contract consumers still parse):
- Trigger swap + popup + FormPopup generalisation: [Fully-automated: `npx.cmd vitest run "src/app/(routes)/_components/TicketFormButton.test.tsx" src/components/FormPopup.test.tsx src/components/Navbar.test.tsx`]
- Static checks: [Fully-automated: G8, G9, G10, G10b, G11, G12, G13 and the Navbar-unchanged check (PowerShell, verified valid at VALIDATE)]
- Regression: [Fully-automated: G2 neighbours] | [Fully-automated: `npm.cmd test` (only `src/lib/supabase/route-client.test.ts` red)] | [Fully-automated: `npm.cmd run typecheck`] | [Fully-automated: G5 scoped eslint + G5b `npm.cmd run lint` baseline 461] | [Fully-automated: `npm.cmd run build` (retry rule)]
- Layout, native dialog, computed style, real Esc/backdrop/focus: [agent-probe: G7 P1/P2 on port 3218 (3217 if busy)]
- Form actually rendering inside the iframe on the deployed site: [known-gap: documented — residuals R1-R6, backlog note `form-popup-deployed-embed-check_NOTE_18-11-26.md` extended in step 11, owner checks by hand after relaxing the form settings]

Failing stubs (Fully-Automated rows; red-first starting point for execute-agent; NOT written to disk at VALIDATE; copied from the plan's Test Coverage Plan and completed for F1-F10, T14-T16):

Failing stub (AC1 / F1):
```
test("should render only the trigger with the given className and children before any click", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: trigger before click")
})
```
Failing stub (AC2 / F2):
```
test("should open the ticket form popup with the exact embed src from the same className trigger", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: trigger opens ticket form popup")
})
```
Failing stub (AC3 / F3, T16):
```
test("should show the note and a prominent new-tab link with the plain viewform href", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: prominent fallback contract")
})
```
Failing stub (AC5 / F4, F6):
```
test("should return focus to the trigger after each close path", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: focus restore")
})
```
Failing stub (AC4 / F5, F8):
```
test("should keep the same iframe on reopen and mount none for never-clicked triggers", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: lazy mount once")
})
```
Failing stub (AC6 / F7, T15):
```
test("should keep dialog ids unique across several triggers and the navbar popup", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: unique dialog ids")
})
```
Failing stub (AC6 / T14):
```
test("should accept a forms list and dialogId without changing navbar defaults", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: FormPopup generalisation")
})
```
Failing stub (AC7 / F9):
```
test("should expose ticketForm with the exact id and URLs and keep it out of checkinForms", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: ticketForm data integrity")
})
```
Failing stub (AC10 / F10):
```
test("should not contain the banned accented word in any new string", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: banned word scan")
})
```

Dimension findings:
- Infra fit: PASS — one package, no runtime surface; all touchpoint paths resolve; sections are Server Components and stay so (client leaf with the same `className` + `children` props); the Fragment adds no wrapper, so the only sibling-sensitive selector (`.reply-hero__center>.reply-action--gold`, child combinator) still matches; no `:last-child`/`:nth-child` rule targets the triggers or their containers.
- Test coverage: PASS — jsdom `<dialog>` polyfill pattern exists in `FormPopup.test.tsx` and `TicketRequestDialog.test.tsx` and is reused; `createPortal` content is reachable via `screen`; gates are valid PowerShell with controls and minimum matches (G8 3 existing lines + 1 new = 4; G9 0 matches / control 2; G10 control 7; G12 0 matches / control 3, all re-checked at VALIDATE); known pre-existing failures are named in G3.
- Breaking changes: PASS — `forms` and `dialogId` are optional with defaults `checkinForms` and `FORM_POPUP_DIALOG_ID`; `Navbar.tsx` passes neither and keeps `aria-controls={FORM_POPUP_DIALOG_ID}`; `CheckinForm` keeps every existing field (T12 intact); `TicketRequestDialog` untouched.
- Security surface: PASS — static third-party URL in one data file, no user input reaches `src`/`href`, lazy first-click load, `referrerPolicy="strict-origin-when-cross-origin"`, `rel="noopener noreferrer"`, no `sandbox`/`allow` (unchanged parent decision); no auth, billing or secrets touched. Privacy/consent for the Google embed and its responses is the owner's decision (O6, R4).
- Section D1 data model feasibility: PASS — additive types; `googleForm()` stays the single URL builder; keep a `docs.google.com/forms` line in the file (E3).
- Section D2 FormPopup feasibility: PASS — three `checkinForms` uses plus one id replaced by `forms`/`dialogId`; guarded render-phase derive unchanged; highest-risk edit is the default-param wiring (mitigation: T1-T13 and N1-N7 unchanged in G1).
- Section D3 TicketFormButton feasibility: PASS — portal created only after the first click (client only, no hydration mismatch), `useId` id plus `getElementById` resolution, module-level `forms` constant; highest-risk edit is focus return via the `button` ref (F6 plus P2).
- Section D5 CSS feasibility: PASS — append at the end of an LF file; specificity of `--prominent` equals `.form-popup__fallback a` and wins by source order; highest-risk point is G12 scanning `globals.css` for component names (E4).
- Section D6 sections feasibility: PASS with E2 — import plus tag rename gives numstat 2/2, 3/3, 2/2, but byte details matter: `HeroSection.tsx` is CRLF in the worktree (git `core.autocrlf=true`), `TimelineSection.tsx` has a UTF-8 BOM and a trailing CR on line 100, `TicketsSection.tsx` is LF.
- Section D8 docs feasibility: PASS with E9 — `component-contracts.md` row 77 exists, backlog note exists, both context validators are green today; `all-context.md` prose about the dialog becomes stale and needs one explicit open-question line.
- Product risk R6 (owner decision, NOT a gate failure): after the swap the site no longer collects paid orders itself (order dialog, survey, PayOS checkout and Sheet outbox stay in the repo but are unreachable from the UI; checkout is also gated off by `PAYOS_CHECKOUT_ENABLED`). The owner requested the change; EXECUTE must restate R6 and O2 in the REPORT for the owner (E10).

Open gaps (named residuals, none counted as PASS):
- R1/AC14: form renders in the iframe on the deployed site only after the owner changes the Google Form settings (O2): known-gap: documented — owner manual check; backlog note `process/general-plans/backlog/form-popup-deployed-embed-check_NOTE_18-11-26.md` extended with one bullet in step 11.
- R2 hosting-added CSP/X-Frame-Options (repo adds none, G9); R3 third-party-cookie blocking (new-tab link is the way out); R4 privacy/consent notice for the Google embed and stored responses; R5 keyboard/screen reader across the iframe boundary and iOS Safari; R6 paid-order flow unreachable from the UI (owner decision).
- Known-gap exclusion: no `## Known Gaps (Resolved via Backlog)` section exists in the plan; nothing excluded from the count.

What this coverage does NOT prove:
- G1 (F1-F10, T1-T16, N1-N7): jsdom only. No real `showModal`, real Esc, `::backdrop` click, CSS, layout, scroll lock visuals or network; does not prove the form renders, that the link opens a tab, or site-wide copy.
- G2/G3: neighbours and the full suite do not prove browser behavior; the known `route-client.test.ts` secure-cookie failure and the rare `TicketRequestDialog` 5s timeout are pre-existing.
- G4/G5/G5b/G6: types, lint and a successful build prove none of the interactions, visuals or the Google form.
- G8/G9/G10/G10b/G11/G12/G13/AC16: static text and diff checks; they do not prove runtime rendering, that headers added by hosting are absent (R2), or that the form URL resolves or is public.
- G7 probes P1/P2: one local browser engine, not iOS Safari or assistive technology; P3 records what the iframe shows and is never a PASS.
- Not proven at all: form content and submission inside Google's page, the owner's Google Form settings (O2), privacy/consent for the embed (O6), the shared-popup alternative (O3, not built).

Execute-Agent Instructions (concerns that cannot be fixed in plan text):

| # | Instruction | Trigger condition |
|---|---|---|
| E1 | Pre-flight baseline and concurrent edits: record `git status --short` and `git diff --stat -- src/app/layout.tsx package.json package-lock.json` BEFORE any edit. `src/app/layout.tsx`, `package.json`, `package-lock.json`, the hook log, the folder `process/general-plans/active/vercel-web-analytics_18-11-26/` and other tasks' plan folders belong to other work: never touch, stage or revert them, and ignore them in the step-12 scope check. Run G4 once at pre-flight (alone, never with build) to know the typecheck baseline. A G4/G6/G5b failure located only in `layout.tsx` or `package*.json` is reported as not this plan's; any error in a Touchpoint file is new. Do not run gates at the same time as another agent's build or typecheck (both write `.next`). | Checklist step 1; steps 9, 10, 12 |
| E2 | Byte-exact section edits (G10b is sensitive): `HeroSection.tsx` is CRLF in the worktree (git index LF, `core.autocrlf=true`); `TimelineSection.tsx` starts with a UTF-8 BOM (EF BB BF) and has a stray CR at the end of line 100; `TicketsSection.tsx` is LF. Use the Edit tool only on the import line and the tag name (Timeline: import at line 4, opening tag at line 86, closing tag at line 88). Never rewrite a whole file or use shell `sed`. After editing: confirm Timeline still begins with EF BB BF, then run G10b: exactly `2 2`, `3 3`, `2 2`. If it deviates only because of BOM/CR normalisation, restore the original bytes of the untouched lines. The Timeline opening tag keeps its long Tailwind class string exactly. | Checklist step 7 |
| E3 | Gate G8 shape: `_data/formPopup.ts` must keep at least one line containing `docs.google.com/forms` and the three id strings (`1FAIpQLSfkPApNK9sU`, `1FAIpQLSdTYWn8MFgQyPY67`, `1FAIpQLSdPyMU0P2ZR8fh`), giving at least 4 match lines all in that file. Do NOT write `docs.google.com/forms` or any form id in `FormPopup.tsx`, `TicketFormButton.tsx` or any other non-test file, including comments. Keep `brief.ts` untouched (merch match exactly 1). | Steps 4, 5, 6, 12 |
| E4 | Gate G12 scans `src/styles/globals.css`, `Navbar.tsx` and `Navbar.test.tsx` for `TicketRequestDialog`, `TicketFormButton`, `event-header__ticket` (0 expected). The appended CSS comment must NOT name those words; use for example `/* Prominent new-tab fallback for form popups that carry a note (src/components/FormPopup.tsx). */`. Never mention `TicketFormButton` in Navbar files. | Step 8 |
| E5 | CSS append: re-read the last 25 lines of `globals.css` right before editing (978 lines, LF, ends with the reduced-motion `.event-header__caret { transition:none; }` and `}`); use the Edit tool with a unique multi-line anchor from the tail; additions only (`git diff --numstat -- src/styles/globals.css` must read `N 0`); no CR bytes; single trailing newline; touch no existing `.form-popup*` rule. | Step 8 |
| E6 | Tests: `TicketFormButton.test.tsx` only via the Write tool; `FormPopup.test.tsx` only via the Edit tool, appending T14-T16 (verify T1-T13 untouched: `git diff --numstat -- src/components/FormPopup.test.tsx` reads `N 0`). Copy the dialog polyfill from `FormPopup.test.tsx` (assign `showModal`/`close` on `HTMLDialogElement.prototype` in `beforeEach`; `afterEach` cleanup plus removing `overflow` on body and documentElement). Banned-word regex EXACTLY `new RegExp("(?<![\\p{L}\\p{N}])v\\u00e9(?![\\p{L}\\p{N}])", "iu")` with a literal double backslash and positive controls via `String.fromCharCode(0xe9)`; grep the file for `\\p{L}` and `\\u00e9` (present) and the literal accented word (count 0). Resolve `aria-controls` with `document.getElementById`, never `querySelector("#" + id)` (React `useId` output contains punctuation). Spy `window.open` with `vi.spyOn`. Do not mock `FormPopup` or `ticketForm` in the F-tests. Red first: the new tests must fail before the code exists. | Steps 2, 3 |
| E7 | `TicketFormButton.tsx`: "use client"; named export; props exactly `Readonly<{ className: string; children: ReactNode }>`; renders a Fragment; `aria-controls` only after the first click; module-level `forms` constant for stable identity; `createPortal(..., document.body)` only after the first click; `returnFocus` is the button ref; no import from `TicketRequestDialog` or its subcomponents; no URL literal (E3); at most 150 lines (G13). | Step 6 |
| E8 | `FormPopup.tsx`: `forms = checkinForms` and `dialogId = FORM_POPUP_DIALOG_ID` as defaults (the constant is declared above the component); `Navbar.tsx` and `Navbar.test.tsx` stay byte-unchanged (`git status --short -- src/components/Navbar.tsx src/components/Navbar.test.tsx` empty); the standard fallback markup renders exactly as before when the shown form has no `fallbackNote`; keep the guarded render-phase derive, no `setState` in an effect body, no `ref.current` read during render. | Step 5 |
| E9 | Docs with the Edit tool, own lines only: `component-contracts.md` new row directly after row 77 plus one sentence on row 77; `all-context.md` structure line plus ONE open-question line. Its "Product and Current State" prose still says the ticket dialog asks three survey questions: do not rewrite that paragraph, but the new open-question line must state explicitly that the three section triggers now open the Google Form and that the order dialog, survey and PayOS checkout are unreachable from the UI (R6, owner decision). Stay outside the `<!-- GENERATED:routing -->` block. Then run `node .claude/skills/vc-context-discovery/scripts/discover-context.mjs --check-routing` (green at VALIDATE) and `node .claude/skills/vc-generate-context/scripts/validate-all-context.mjs` (0 failures at VALIDATE). | Step 11 |
| E10 | REPORT must open with R6 and O2 stated plainly for the owner (paid-order flow unreachable; form blank until Google settings change; the new-tab link also asks for sign-in today), then the P3 observation as observation only. Do not implement any mitigation in code (no iframe-failure detection, no re-adding the order dialog). | Step 12 |
| E11 | Probe safety: port 3000 is the owner's dev server (never touch); use 3218 (3217 if busy); record the PID you start and stop exactly that tree; press Esc first at each load (login dialog). P3 only observes Google's public form URL in the local browser: never sign in, never submit the form, no credentials. No production operation, no deploy, no commit, no push. | Step 10 |
| E12 | Known pre-existing failures to expect, not to fix: `src/lib/supabase/route-client.test.ts` secure-cookie expectation; the rare 5s `TicketRequestDialog.test.tsx` timeout under load (re-run that file alone once and record BOTH results); 461 lint problems all outside `src/`; first `npm.cmd run build` may exit 1 on the Next 16.4.3 advisory after a successful compile (re-run, record both exit codes, never upgrade Next). Any other failure is new. | Steps 9, 10, 12 |
| E13 | Gate syntax: all gates run from PowerShell (Vitest must not run from Git Bash). Use the array `-Pattern` form with no pipe character; the plan's commands contain no markdown `\|` (if a markdown-escaped pipe ever appears in a command, expand it to a plain pipe character only inside a quoted pattern string, never as a shell pipe). vc-tester runs each control first (G8 brief.ts 1 match, G9 control 2, G10 control 7, G11 control non-empty after step 5, G12 control at least 2); a zero-match result without its control is vacuous and a failure. | Step 12 and EVL |

Gate: PASS (no FAILs, no CONCERNs; plan unchanged; E1-E13 recorded as execute-agent instructions; R1-R6 carried as named residuals, AC14 gap-resolution D, owner decisions O2 and R6 flagged, not gate failures)
Accepted by: n/a — Gate is PASS (no CONCERN to accept); residuals R1-R6 are named, not accepted as proven; AC14 stays CONDITIONAL until the owner confirms by hand.

## Autonomous Goal Block (for the orchestrator after VALIDATE; plain English, under 4000 characters)
```
SESSION GOAL: Swap the three "dat phieu nuoc" triggers (Hero, Timeline, Tickets sections) from the order dialog to an in-page popup embedding the owner's Google Form (forms.gle/VxzPfsoQQQv21zBs8): new TicketFormButton leaf, FormPopup gains optional forms/dialogId, ticketForm data entry, prominent new-tab fallback.
Charter + umbrella plan: N/A — single plan: process/general-plans/active/ticket-buttons-google-form_18-11-26/ticket-buttons-google-form_PLAN_18-11-26.md
Autonomy: run checklist 1-12 in order, tests first; EXECUTE = vc-execute-agent (opus), EVL = vc-tester (sonnet) re-running G1-G13; the orchestrator never edits files or runs gates itself. Run this AFTER the Vercel Analytics task; never run gates while another agent builds.
Hard stops / safety constraints:
- Never kill or use port 3000 (owner's dev server); probe only on 3218 (3217 if busy), stop only the PID you started, press Esc first at each load.
- Do not touch: src/lib, src/app/api, supabase, scripts, .env*, package*.json, src/app/layout.tsx (Analytics task), brief.ts, Footer*, Channels*/Radio*, channels.ts, TicketRequestDialog.tsx and its subcomponents/tests, Navbar.tsx/Navbar.test.tsx, LoginDialog*, HeaderAuth*, next.config.ts, src/proxy.ts.
- globals.css and the two context docs: Edit tool only (append / own lines), never overwrite or revert; CSS comment must not name TicketFormButton/TicketRequestDialog/event-header__ticket.
- Section edits are import + tag only; G10b must read 2/2, 3/3, 2/2 (mind Hero CRLF and Timeline BOM).
- Test files via Write/Edit only; banned-word regex uses a double backslash with a String.fromCharCode positive control.
- No dependency, no window.open, no sandbox, no tracking, no iframe-failure detection, never upgrade Next.js (build advisory: re-run once, record both exit codes). Never sign in to or submit the Google Form.
- Owner decisions, not failures: O2 (form blank until Google settings change) and R6 (paid-order flow unreachable from the UI); AC14 is CONDITIONAL, never PASS. No commit, push or deploy unless asked.
Next phase: EXECUTE: process/general-plans/active/ticket-buttons-google-form_18-11-26/ticket-buttons-google-form_PLAN_18-11-26.md
Validate contract: inline in plan (## Validate Contract), Gate: PASS, execute-agent instructions E1-E13
Execute start: fully-auto: G1 npx.cmd vitest run "src/app/(routes)/_components/TicketFormButton.test.tsx" src/components/FormPopup.test.tsx src/components/Navbar.test.tsx, G2 neighbours, G3 npm.cmd test, G4 typecheck, G5 scoped eslint, G5b lint (461 baseline), G6 build, G8-G13 greps | e2e spec: none | probe: agent-browser P1/P2/P3 on 3218 at 360/390/768/1024/1280/1440 | high-risk pack: no
```

## Resume and Execution Handoff
1. Selected plan file path: `process/general-plans/active/ticket-buttons-google-form_18-11-26/ticket-buttons-google-form_PLAN_18-11-26.md`
2. Last completed phase or step: PLAN written; no source file edited.
3. Validate-contract status: pending (placeholder section above; vc-validate-agent writes it).
4. Supporting context files loaded: `process/context/all-context.md`, `process/context/tests/all-tests.md`, `process/context/uxui/component-contracts.md` (row 77), `process/development-protocols/plan-lifecycle.md`, `navbar-checkin-menu_18-11-26` plan (Validate Contract E1-E16 conventions), `navbar-google-form-popup_18-11-26`, `src/components/FormPopup.tsx`, `FormPopup.test.tsx`, `Navbar.tsx`, `src/app/(routes)/_data/formPopup.ts`, `HeroSection.tsx`, `TimelineSection.tsx`, `TicketsSection.tsx`, `TicketRequestDialog.tsx` (head and trigger markup), `src/styles/globals.css` (form-popup block and tail).
5. Next step for a fresh agent: run VALIDATE on this plan; after the owner says "ENTER EXECUTE MODE", spawn vc-execute-agent (opus) with this exact path and run checklist 1-12 in order (tests first); vc-tester (sonnet) re-runs G1-G13 independently. Validators: `node .claude/skills/vc-generate-plan/scripts/validate-plan-artifact.mjs process/general-plans/active/ticket-buttons-google-form_18-11-26/ticket-buttons-google-form_PLAN_18-11-26.md`; context gates after doc edits: `node .claude/skills/vc-context-discovery/scripts/discover-context.mjs --check-routing` and `node .claude/skills/vc-generate-context/scripts/validate-all-context.mjs`. Carry-over rules: test files only via Write/Edit; Esc first at probe load; never touch port 3000; never touch `package*.json`.

Next Step: VALIDATE (vc-validate-agent), then EXECUTE with the owner's explicit command; test context: `process/context/tests/all-tests.md`.

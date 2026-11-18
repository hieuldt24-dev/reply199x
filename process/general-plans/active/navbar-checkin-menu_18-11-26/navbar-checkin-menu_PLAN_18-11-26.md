---
name: plan:navbar-checkin-menu
description: "Follow-up to navbar-google-form-popup: replace the single Navbar item 'Checkin popup' with a 'Check in' group (desktop dropdown disclosure, expandable list in the mobile menu) holding two Google Forms (new 'Check in không gian âm nhạc hoài niệm' and the existing 'Checkin popup'), each opening the ONE shared FormPopup with its own title, embed URL and fallback URL; typed form list in _data/formPopup.ts"
date: 18-11-26
feature: none
---

# PLAN — Navbar "Check in" group with two Google Forms

**BLUF:** SIMPLE (one sequential EXECUTE, 11 steps, one package, no schema/auth/API/billing). The Navbar item "Checkin popup" becomes a group toggle "Check in". On desktop (>=1024px) it opens a dropdown (disclosure pattern: button with `aria-expanded`/`aria-controls`, Esc / outside click / focus-out / re-click / selection close it). On mobile it expands an inline list inside the mobile menu. The list has two items: "Check in không gian âm nhạc hoài niệm" (new form) and "Checkin popup" (existing form, exact label kept). Each item opens the SAME single `FormPopup` instance, which now takes the active form id and renders that form's own title, iframe and fallback link. Forms live in a typed list in `_data/formPopup.ts`, so a third form later is ONE entry. Per-form iframes are mounted lazily on first open and then kept, so typed answers survive close and switching. Whether the real forms load on the deployed site stays the owner's manual check (named residual, CONDITIONAL).

Status: PLANNED (no code written; VALIDATE then explicit owner "ENTER EXECUTE MODE" required).
Date: 18-11-26
Complexity: SIMPLE (8 touched files: 3 source/data, 1 CSS append, 2 tests, 2 docs, plus 2 backlog notes; no schema/auth/API/billing)
TL;DR: group "Check in" with 2 forms, one shared popup keyed by form id, data list so adding a form is one entry, CSS appended at the END of `globals.css`, tests updated (not deleted) plus dropdown tests; the known 360/390px header overflow is only recorded and parked as a backlog stub.

## Current Execution State
- Last updated: 2026-11-18
- Current step: PLAN written; next VALIDATE (vc-validate-agent), then owner "ENTER EXECUTE MODE".
- Validate-contract: pending (placeholder below).
- No separate SPEC: the locked requirement is the owner's request message of 2026-11-18 (Vietnamese); AC1-AC15 below are the verified translation. Parent plan: `process/general-plans/active/navbar-google-form-popup_18-11-26/navbar-google-form-popup_PLAN_18-11-26.md` (CODE DONE; its REPORT is in the same folder).
- Strategy (vc-agent-strategy-compare, Simple Mode): S7 (5+ files in blast radius) = 1; S1-S6 = 0; score 1/7 = LOW. Recommended: Sequential, 1 EXECUTE agent (opus), then vc-tester EVL (sonnet). No fan-out: Navbar, FormPopup, data, CSS and tests are one overlapping change.

## Overview
The owner supplied a second Google Form about "check in không gian âm nhạc hoài niệm" (short link `https://forms.gle/j8bUG4KqMMDQKfL27`, verified to resolve to `https://docs.google.com/forms/d/e/1FAIpQLSdTYWn8MFgQyPY67ixOfxkykYNBtL1Y-gTNRqBvVcs5SYcuog/viewform?usp=send_form`, HTTP 200). The Navbar must offer a COMMON group item "Check in" that shows the check-in forms ("check in âm nhạc hoài niệm, check in pop up, ...") and can hold more forms later. The existing form (short link `https://forms.gle/W4rPWP6rckzRFPkH9`, form id `1FAIpQLSfkPApNK9sU_GIXVe5Mh4t2HYTEfwQwYHaHJCMmDjx9iETRtw`) stays, under the exact label "Checkin popup".

## Context read (current state on disk, 2026-11-18)
- `process/context/all-context.md`, `uxui/component-contracts.md` (row "Form popup (Navbar)", line 77), `tests/all-tests.md` (commands, known gaps, lint baseline), `process/development-protocols/plan-lifecycle.md`.
- Code: `src/components/Navbar.tsx` (116 lines; Client Component; state `open`, `activeId`, `formOpen`; refs `menuButton`, `header`, `formReturn`; one desktop button and one mobile button, both `aria-haspopup="dialog"` and `aria-controls={FORM_POPUP_DIALOG_ID}`; `<FormPopup open onClose returnFocus />` before `</header>`), `Navbar.test.tsx` (N1-N3), `FormPopup.tsx` (85 lines; props `open/onClose/returnFocus`; single iframe armed on first open via render-phase `if (open && !armed) setArmed(true)`), `FormPopup.test.tsx` (T1-T8, T5b), `_data/formPopup.ts` (10 lines: `FORM_POPUP_LABEL`, `FORM_POPUP_TITLE`, `formPopupLinks`), `src/lib/constants.ts` (`NAV_LINKS`, 5 anchors, untouched), `auth/HeaderAuth.tsx` (pattern: trigger button `aria-haspopup="dialog"` + `aria-controls`), `globals.css` (965 lines; `.event-header__*` at lines 84-142, form-popup block at lines 947-965, file ends with the closed `@media(max-width:639px)` block of `.form-popup`).
- Previous plan, REPORT and Validate Contract (conventions, gates, execute instructions E1-E11) are reused below where they still apply.

## Findings that shape the design (verified on disk)
1. Only `Navbar.tsx`, `FormPopup.tsx`, their two tests and `globals.css` consume `FORM_POPUP_*`/`formPopupLinks` (grep over `src` and `process/context`). Replacing those exports is safe inside the blast radius; the two context docs mention them in prose only.
2. The repo has NO existing dropdown/menu pattern. `LoginDialog`/`HeaderAuth` are dialog triggers only. The only disclosure pattern is the mobile hamburger (`aria-expanded`, `aria-controls="mobile-navigation"`, Esc closes and focuses the toggle, `pointerdown` outside `header` closes). The new dropdown copies that vocabulary exactly (same Esc and outside-click semantics) instead of inventing a menu.
3. `.event-header__link { white-space:nowrap }` and `.event-header__desktop .event-header__link--button { width:auto }` (both exist) would break the new items: a 37-character label does not fit a 328px mobile panel on one line, and a `width:auto` button in a dropdown would not fill the row. The appended CSS must override both with higher specificity (see D8).
4. `.form-popup__frame { display:block }` overrides the UA `hidden` attribute (author CSS beats UA `display:none`). With one iframe per form, an inactive iframe marked `hidden` would still show unless `.form-popup__frame[hidden] { display:none }` is appended (D8). Missing this is the single most likely silent bug in this change.
5. Closing the dropdown on selection hides the item button, so a popup cannot return focus to the item. The desktop `returnFocus` is therefore the group toggle button; mobile stays the hamburger (`menuButton`), exactly like the parent plan.
6. Safari does not focus buttons on click. A naive "close on blur" would fire `focusout` with `relatedTarget === null` when the pointer moves from the toggle to an item and close the list BEFORE the click lands. Decision D5: close on focus-out ONLY when `relatedTarget` is an element outside the group; `null` is ignored (outside clicks are already handled by `pointerdown`).
7. Header width: the desktop nav item shrinks (the label "Check in" plus a caret replaces "Checkin popup"), so the 1024px header (measured last task: inner 1016/1016, desktop nav 501) cannot get wider because of this change. The pre-existing 385px action row at 360/390 is unrelated (D10).
8. jsdom limits (same as the parent plan): no real `showModal`, no real Esc `cancel`, no CSS (so `hidden` list state is observable only via the attribute). Tests polyfill `showModal`/`close`, simulate Esc with a `cancel` event, and assert the `hidden` attribute, not visibility.
9. Working-tree state: `Navbar.tsx` (+7 lines), `globals.css` (+23), `all-context.md`, `component-contracts.md` carry the previous task's uncommitted edits, plus the radio task's uncommitted edits in `globals.css`, `all-context.md`, `component-contracts.md`, `brief.ts`, `Footer.tsx`, `ChannelsSection.tsx`. EXECUTE must edit incrementally (Edit tool) and never overwrite, revert or reformat those files.

## Technical decisions (locked, no creative decisions left for EXECUTE)
- **D1 Group label.** One constant `CHECKIN_GROUP_LABEL = "Check in"` in `_data/formPopup.ts`. Used for the desktop toggle, the mobile toggle and both lists' accessible names.
- **D2 Data model (`src/app/(routes)/_data/formPopup.ts`, rewrite; the file is the previous task's new untracked file).** Export a type `CheckinForm = Readonly<{ id: string; menuLabel: string; dialogTitle: string; embedUrl: string; fallbackUrl: string }>` and `checkinForms: readonly CheckinForm[]` (frozen), plus `CHECKIN_GROUP_LABEL`. A private helper builds both URLs from a Google form id so the base `https://docs.google.com/forms/d/e/{formId}/viewform` is written once in the file: `fallbackUrl` = base, `embedUrl` = base + `?embedded=true` (same rule as the parent plan: drop `usp=send_form`, add `embedded=true`). Entries, in menu order:
  1. id `check-in-hoai-niem`, menuLabel `Check in không gian âm nhạc hoài niệm`, dialogTitle `Check in không gian âm nhạc hoài niệm`, form id `1FAIpQLSdTYWn8MFgQyPY67ixOfxkykYNBtL1Y-gTNRqBvVcs5SYcuog` (comment: owner short link `https://forms.gle/j8bUG4KqMMDQKfL27`).
  2. id `checkin-popup`, menuLabel `Checkin popup` (EXACT, owner-required), dialogTitle `Check in pop-up REPLY 199X` (see D3), form id `1FAIpQLSfkPApNK9sU_GIXVe5Mh4t2HYTEfwQwYHaHJCMmDjx9iETRtw` (comment: owner short link `https://forms.gle/W4rPWP6rckzRFPkH9`).
  The old exports `FORM_POPUP_LABEL`, `FORM_POPUP_TITLE`, `formPopupLinks` are REMOVED (no other consumer, Finding 1). Adding a form later = appending one object here; nothing else changes (Navbar renders the list by `map`, FormPopup renders iframes by `map`).
- **D3 Dialog titles (decision + evidence).** The title (`h2`, `aria-labelledby`, iframe `title`) is per form. Form 1 (new): `Check in không gian âm nhạc hoài niệm` (the owner's own name for it). Form 2 (existing): the owner said keep `Biểu mẫu REPLY 199X` unless better evidence exists. Evidence exists: the previous task's local probe showed the form's own heading as "PHIẾU CHECK-IN POP-UP REPLY 199X" (REPORT, AC10 observation). Default chosen: `Check in pop-up REPLY 199X` (matches the form's real name and the menu label; deliberately NOT "Phiếu check-in", to avoid confusion with "phiếu nước" products). Open owner decision O2; reverting to `Biểu mẫu REPLY 199X` is a one-line data change. EXECUTE must also read the real heading of form 1 during the probe (screenshot) and report it; a different heading is reported, not auto-applied.
- **D4 `FormPopup` contract.** New props `{ activeId: string | null; onClose: () => void; returnFocus: RefObject<HTMLElement | null> }`; open = `activeId` resolves to an entry of `checkinForms` (unknown id = closed). Still ONE `<dialog id={FORM_POPUP_DIALOG_ID}>`, still rendered in `<header>` outside the hidden mobile nav, same `showModal()`/`close()`, scroll lock, Esc (`cancel` + `preventDefault`), backdrop-click and close-button behaviour, same focus into `.form-popup__close` on open and `returnFocus.current?.focus()` on close. Changes: (a) `h2` text and fallback link come from the SHOWN form (the active one, or the last shown one while closed so the title never flashes empty; before any open, `h2` is empty and the fallback paragraph is omitted); (b) the iframe area renders one `<iframe>` per form id in an "armed" list, each `src` = that form's `embedUrl`, `title` = that form's `dialogTitle`, `loading="lazy"`, `referrerPolicy="strict-origin-when-cross-origin"`, no `sandbox`, no `allow`, `hidden` when not the shown form; (c) state is ONE object `{ shownId, armed }` updated by the existing render-phase derive pattern (guarded `if` calling `setState` during render for own state; NEVER `setState` inside an effect, NEVER read `ref.current` while rendering: `react-hooks/set-state-in-effect` and the refs rule apply).
- **D5 Desktop dropdown (disclosure, not ARIA menu).** Inside `<nav className="event-header__desktop">`, after the five `NAV_LINKS`, a wrapper `div.event-header__group` (ref `groupRef`) holds: toggle `button type="button"` classes `event-header__link event-header__link--button event-header__group-toggle`, text `CHECKIN_GROUP_LABEL` plus an `aria-hidden` caret span, `aria-expanded={groupOpen}`, `aria-controls="checkin-menu"`; and `ul#checkin-menu.event-header__submenu` with `hidden={!groupOpen}` and one `li > button.event-header__link.event-header__link--button` per form (text `menuLabel`, `aria-haspopup="dialog"`, `aria-controls={FORM_POPUP_DIALOG_ID}`). The toggle has NO `aria-haspopup` (that would announce an ARIA menu, which this is not). Closing rules: toggle click flips; `Escape` closes and focuses the toggle; `pointerdown` outside `groupRef` closes; `focusout` with `relatedTarget` an element outside the group closes (null ignored, Finding 6); selecting an item closes the dropdown and opens the popup. The listeners live in one new `useEffect` keyed on `groupOpen`, registered only while open (same shape as the existing mobile effect; the existing effect is not touched). Arrow keys: NOT implemented. Justification: with two items Tab/Shift+Tab already reach everything in 1-2 keystrokes; arrow-key navigation implies `role="menu"`/`menuitem` plus roving tabindex, which is the application-menu contract and a worse fit for site navigation (WAI-ARIA APG "Disclosure Navigation Menu" uses plain buttons/links with `aria-expanded`). Revisit only if the group grows beyond about 6 items (recorded in Test Infra Improvement Notes). Focus management: opening keeps focus on the toggle (list follows it in DOM order); the popup focuses its close button; closing the popup returns focus to the toggle (`formReturn.current = groupButton.current`).
- **D6 Mobile list.** Inside `<nav id="mobile-navigation">`, after the five links: `div.event-header__group` containing a toggle `button` (`event-header__link event-header__link--button`, text `CHECKIN_GROUP_LABEL` + caret, `aria-expanded={mobileGroupOpen}`, `aria-controls="mobile-checkin-list"`) and `ul#mobile-checkin-list.event-header__sublist` (`hidden={!mobileGroupOpen}`) with the same item buttons. New state `mobileGroupOpen`, independent of `open`; it is left as the user left it when the menu closes (no reset effect: avoids a `set-state-in-effect` violation and extra code). Selecting an item: `formReturn.current = menuButton.current`, `setOpen(false)`, `setFormId(id)`; the popup returns focus to the hamburger (parent-plan behaviour, N3). The existing Esc/outside-click/desktop-breakpoint logic for the menu is unchanged.
- **D7 Navbar wiring.** `formOpen: boolean` becomes `formId: string | null`; `<FormPopup activeId={formId} onClose={() => setFormId(null)} returnFocus={formReturn} />` stays before `</header>`. Imports change to `CHECKIN_GROUP_LABEL`, `checkinForms` and `FORM_POPUP_DIALOG_ID`. One shared helper inside `Navbar` opens a form: set `formReturn.current`, close the relevant dropdown/menu, set `formId`. `NAV_LINKS`, the active-section effect and the `Navbar({ auth })` signature are unchanged. Target length about 150 lines (a 116-line file plus ~35); if it exceeds 170, extract the two group blocks into a private `CheckinGroup` leaf in `src/components/CheckinMenu.tsx` is NOT planned (YAGNI); stay inline.
- **D8 CSS (append-only, at the END of `globals.css`).** EXECUTE re-reads the last 25 lines immediately before appending (the file is 965 lines now; it ends with the closed `@media(max-width:639px){ .form-popup ... }`), appends ONE new commented block with the Edit tool, never rewrites the file, never touches radio rules or the existing `.form-popup*` rules, keeps LF. Content (prefix `.event-header__group*`, `.event-header__submenu`, `.event-header__sublist`, plus one `.form-popup__frame[hidden]` rule):
  - `.form-popup__frame[hidden] { display:none; }` (Finding 4).
  - `.event-header__group { position:relative; display:flex; flex-direction:column; }`; `.event-header__group-toggle` caret: `gap:6px`, caret span `font-size:10px; transition:transform .18s`, rotated 180deg when `[aria-expanded="true"]`; honour `prefers-reduced-motion` by `transition:none` inside the existing reduced-motion convention (a small `@media(prefers-reduced-motion:reduce)` rule in the appended block).
  - Desktop dropdown: `.event-header__submenu { position:absolute; top:calc(100% + 14px); left:0; z-index:60; width:max-content; max-width:min(340px,calc(100vw - 24px)); margin:0; padding:6px; list-style:none; border:1px solid #578e7699; border-radius:12px; background:var(--reply-deep); box-shadow:0 12px 32px #13240d55; }`; `.event-header__submenu[hidden] { display:none; }`; `.event-header__desktop .event-header__submenu .event-header__link--button { width:100%; justify-content:flex-start; min-height:44px; padding-inline:14px; white-space:normal; text-align:left; }` (specificity 0,3,0 beats the existing `width:auto` rule and `nowrap`). The `top` offset (14px) and `left:0` anchor are the starting values; the probe may tune the offset within 8-20px and may switch to `right:0; left:auto` if the dropdown crosses the viewport edge at 1024px. Nothing else.
  - Mobile sublist: `.event-header__sublist { margin:0; padding:0 0 0 12px; list-style:none; }`; `.event-header__sublist[hidden] { display:none; }`; `.event-header__mobile .event-header__sublist .event-header__link--button { white-space:normal; text-align:left; min-height:48px; justify-content:flex-start; }`; mobile toggle row `justify-content:space-between`. Goal: the 37-character label wraps inside the 328px panel; panel `scrollWidth <= clientWidth`.
  - The mobile panel already has `max-height:calc(100dvh - var(--header-height) - 12px); overflow-y:auto`, so the longer menu (8 rows when expanded) scrolls vertically on short phones; no change needed.
- **D9 Iframe retention choice (justified).** Chosen: one lazily-mounted iframe PER form, kept mounted after the first open, shown/hidden by the `hidden` attribute. Rejected: a single iframe whose `src` changes (switching forms would destroy typed answers in the one you left, and Google Forms re-fetch on every switch); rejected: unmount on close (loses answers on an accidental Esc, contradicts parent plan O4). Cost: at most N iframes after N distinct opens (N=2 today; each only exists after its first open, so the page still calls Google zero times before the first click). If the list ever grows past about 6 forms, revisit (cap or unmount least-recent). Parent-plan guarantees kept: no `sandbox` (Google Forms needs script/same-origin; a meaningful sandbox would defeat it), explicit `referrerPolicy`, no `allow`.
- **D10 Header overflow scope.** The six-width overflow check (360/390/768/1024/1280/1440) is an AC. Known pre-existing issue, NOT fixed here: at 360 and 390px the action row (ticket button + login + hamburger) is 385px wide and the hamburger sits partly off-screen (parent REPORT, "Things for the owner to look at"). EXECUTE records the numbers again as an observation in the REPORT and writes the follow-up as its own backlog stub (checklist step 10). The new group item lives only in the desktop nav (hidden below 1024px) and in the mobile panel (an absolutely positioned layer, not in the action row), so it cannot worsen that row.
- **D11 No new surface.** No dependency, no `window.open`, no `package.json`, no new route, no tracking code, no change to the merch link or to any file listed under Scope-out. 'vé' ban applies to every new string (positive control kept).

## Phase Completion Rules
Status is `CODE DONE` when code is written; `VERIFIED` only when every Fully-Automated gate is green when re-run by vc-tester (EVL) and the probe passes. AC14 (both real forms load on the deployed site, including login-restricted or third-party-cookie-blocked browsers) is a named residual and is NEVER counted as PASS; its gate stays CONDITIONAL until the owner confirms by hand (gap-resolution D, backlog note updated in step 10).

## Scope
In scope: the files in Touchpoints. Out of scope (do NOT touch): `src/lib`, `src/app/api`, `supabase`, `scripts`, `.env*`, `package.json`, `package-lock.json`, `src/app/layout.tsx`, `src/app/(routes)/_data/brief.ts` (including `projectLinks.merch`), `Footer*`, `Channels*`, `Radio*`, `_data/channels.ts`, `_types/channels.ts`, `TicketRequestDialog*`, `TicketSurveyFields`, `TicketOrder*`, `TicketStub`, `LoginDialog*`, `HeaderAuth*`, `next.config.ts`, `src/proxy.ts`, `src/lib/constants.ts` (`NAV_LINKS` stays at 5), the merch form link.

## Touchpoints
| File | Action | Notes |
|---|---|---|
| `src/app/(routes)/_data/formPopup.ts` | REWRITE (own untracked file) | `CheckinForm` type, `checkinForms`, `CHECKIN_GROUP_LABEL`, one URL helper (D1, D2, D3) |
| `src/components/FormPopup.tsx` | EDIT | `activeId` prop, per-form armed iframes, shown title and fallback (D4, D9) |
| `src/components/Navbar.tsx` | EDIT (Edit tool, incremental; file already has +7 uncommitted lines) | group toggle + dropdown (desktop), group toggle + sublist (mobile), `formId` state (D5-D7) |
| `src/styles/globals.css` | APPEND at end only | one commented block (D8); file has radio and previous-task uncommitted edits |
| `src/components/FormPopup.test.tsx` | EDIT (Write the whole file; own untracked file) | adapt T1-T8, T5b to `activeId`; add T9-T12 |
| `src/components/Navbar.test.tsx` | EDIT (Write the whole file; own untracked file) | adapt N1-N3; add N2b, N3b, N4-N7 |
| `process/context/uxui/component-contracts.md` | EDIT own row 77 only (Edit tool, replace that one row) | "Form popup (Navbar)" row now describes the group, dropdown, two forms, per-form iframes; radio rows untouched |
| `process/context/all-context.md` | EDIT own two lines only (structure line ~88-89, Open Questions line ~165) | list two forms, owner checks for BOTH; radio lines untouched; no whole-file write |
| `process/general-plans/backlog/form-popup-deployed-embed-check_NOTE_18-11-26.md` | EDIT (append one bullet) | add the second form to the deployed-site manual check |
| `process/general-plans/backlog/navbar-mobile-header-overflow_NOTE_18-11-26.md` | NEW (flat NOTE) | follow-up for the pre-existing 385px action row at 360/390 (D10) |
| `process/general-plans/active/navbar-checkin-menu_18-11-26/navbar-checkin-menu_REPORT_18-11-26.md` | NEW at EXECUTE end | numbers, screenshots, deviations; screenshots saved in this task folder |
Read only: `src/lib/constants.ts`, `auth/HeaderAuth.tsx`, `auth/LoginDialog.tsx`, `next.config.ts`, `src/proxy.ts`, `brief.ts`.

## Public Contracts
- Visible behaviour: the Navbar shows a "Check in" group instead of "Checkin popup" (desktop >=1024px dropdown; mobile list inside the hamburger panel) on every route under `(routes)`. Items: "Check in không gian âm nhạc hoài niệm" and "Checkin popup". Each opens the same modal with its own title, iframe and "Mở trong tab mới" link (plain `viewform` URL, `target="_blank" rel="noopener noreferrer"`).
- Internal API changes (no other consumer, Finding 1): `FormPopup({ activeId, onClose, returnFocus })` replaces `FormPopup({ open, onClose, returnFocus })`; `FORM_POPUP_DIALOG_ID` stays; `FORM_POPUP_LABEL`, `FORM_POPUP_TITLE`, `formPopupLinks` are replaced by `checkinForms`, `CHECKIN_GROUP_LABEL`, `CheckinForm`. `Navbar({ auth })`, `NAV_LINKS`, `projectLinks` unchanged.
- External contract: the visitor's browser loads `https://docs.google.com/forms/d/e/{id}/viewform?embedded=true` for each opened form; no endpoint, header or route is added. Merch link `https://forms.gle/tW1VU8vpASc53CJa8` stays and keeps opening a new tab.

## Blast Radius
Low risk: one package, no data, no auth/billing/schema/public API/runtime. Real risks: (1) the Navbar is on every route and fixed, so any CSS slip hits all pages (mitigated by append-only prefixed rules and the six-width probe); (2) the `hidden`-vs-`display:block` iframe trap (D8, test T10 asserts the attribute and the probe asserts computed `display:none` for the inactive iframe); (3) focus loss when the dropdown item that triggered the popup is hidden (D5/D6, tests N2/N3); (4) a shared uncommitted working tree (radio + previous task): edits must be incremental. Rollback: revert `Navbar.tsx`, `FormPopup.tsx`, `formPopup.ts`, both tests and the one appended CSS block, restore the doc row and lines, delete the two backlog changes; no migration, no data.

## Test Coverage Plan (vc-test-coverage-plan)
Test context loaded: `process/context/tests/all-tests.md` (router) and its chain (Commands, Quick Procedures "Source changes" and "UI conversion", Known Gaps). Existing test files in the blast radius: `src/components/FormPopup.test.tsx` (T1-T8, T5b), `src/components/Navbar.test.tsx` (N1-N3), neighbours `src/components/Footer.test.tsx`, `src/components/auth/HeaderAuth.test.tsx`, `src/components/auth/LoginDialog.test.tsx`, `src/app/(routes)/_components/TicketRequestDialog.test.tsx`. No high-risk class (auth, billing, schema, public API, secrets, migration) is in the blast radius, so no Hybrid minimum applies. Tier assignments below come from this loaded context, not from training data. Old tests are ADAPTED, not deleted: every previous scenario keeps an equivalent.

**Area: `src/app/(routes)/_data/formPopup.ts` + `src/components/FormPopup.tsx`** (`npx.cmd vitest run src/components/FormPopup.test.tsx`)
| Tier | Scenario | Command / Steps | What it proves | What it does NOT prove |
|---|---|---|---|---|
| Fully-automated | T1 never opened: no dialog in the a11y tree, NO iframe | G1 | zero Google calls before first open | real network |
| Fully-automated | T2 open with the first form: dialog name = its `dialogTitle`, `aria-modal="true"`, iframe `title` and `src` = its `embedUrl`, `loading=lazy`, `referrerpolicy`, no `sandbox`, no `allow`, `window.open` not called | G1 | structure, aria, URL, no `window.open` | the form renders |
| Fully-automated | T3 fallback link per shown form: name "Mở trong tab mới", `href` = that form's `fallbackUrl` (no `embedded`), `target=_blank`, `rel="noopener noreferrer"` | G1 | link attributes | link opens a tab in a real browser |
| Fully-automated | T4 three close paths (button, `cancel` simulating Esc with `preventDefault`, click on the dialog itself; click on heading does NOT close) | G1 | close logic | real Esc and real `::backdrop` click |
| Fully-automated | T5/T5b focus into close button on open; focus returns to the `returnFocus` element (trigger and an "other" element) | G1 | deterministic focus return | real Tab order across the iframe |
| Fully-automated | T6 scroll lock set on `body`+`html`, previous value restored (including a pre-existing important value) | G1 | lock/restore | iOS scroll |
| Fully-automated | T7 iframe kept after close and reopen (same element) | G1 | answers-survive decision (D9) | the answers survive inside Google's page |
| Fully-automated | T8 banned-word scan over every `checkinForms` string (group label, menu labels, titles) and the rendered dialog text, with positive control built from `String.fromCharCode` | G1 | no banned word in new strings | site-wide copy |
| Fully-automated | T9 (data-driven `it.each(checkinForms)`) opening each form shows ITS title, ITS iframe `src`, ITS fallback `href`; covers any form added later | G1 | per-form wiring | form content |
| Fully-automated | T10 switch: open form A, close, open form B: both iframes exist, A has `hidden`, B does not, then reopen A: same A element, B hidden | G1 | per-form retention and the `hidden` toggle | computed `display:none` (probe) |
| Fully-automated | T11 lazy mount: after opening only form A, the iframe for form B is NOT in the DOM | G1 | no premature Google calls for B | network |
| Fully-automated | T12 data integrity: ids unique; menu labels unique; every `embedUrl` ends with `/viewform?embedded=true` and every `fallbackUrl` has no `embedded`; all `https://docs.google.com/forms/d/e/`; form 2 `menuLabel === "Checkin popup"`; `CHECKIN_GROUP_LABEL === "Check in"`; order = [new form, existing form] | G1 | adding a form cannot silently break shape | URLs resolve (owner check) |
| Fully-automated | T13 unknown or `null` `activeId` renders closed, no throw | G1 | defensive contract | — |
Failing stubs (red-first, destined for the validate-contract Test Gates; NOT written to disk at PLAN):
- `test("should open each form with its own title, iframe src and fallback href", () => { throw new Error("NOT IMPLEMENTED — TDD stub for: per-form wiring") })`
- `test("should keep both iframes mounted with the inactive one hidden", () => { throw new Error("NOT IMPLEMENTED — TDD stub for: per-form retention") })`

**Area: `src/components/Navbar.tsx`** (`npx.cmd vitest run src/components/Navbar.test.tsx`; mocks `HeaderAuth`, `TicketRequestDialog`, `RemoteImage`; `vi.stubGlobal("matchMedia")`; dialog polyfill; mobile nav found by `#mobile-navigation`, desktop nav by role+name, scoped queries use `within(nav)` because jsdom has no CSS so both navs are always in the DOM)
| Tier | Scenario | Command / Steps | What it proves | What it does NOT prove |
|---|---|---|---|---|
| Fully-automated | N1 (adapted) desktop and mobile navs each have exactly one group toggle named `CHECKIN_GROUP_LABEL` with `aria-expanded="false"` and `aria-controls` pointing at an existing list; the five `NAV_LINKS` hrefs unchanged in both navs; no dialog on load | G1 | group present, no anchor regression | breakpoint visibility (CSS) |
| Fully-automated | N2 (adapted) desktop: toggle click sets `aria-expanded="true"` and un-hides the list with the two item buttons in order; clicking "Checkin popup" closes the list, opens the dialog titled form 2 with form 2's `src`; closing the dialog returns focus to the toggle | G1 | trigger to popup wiring, focus return | real layout |
| Fully-automated | N2b desktop: the new item opens the dialog titled `Check in không gian âm nhạc hoài niệm` with form 1's `src` and fallback `href` | G1 | second-form wiring | form loads |
| Fully-automated | N3 (adapted) mobile: open hamburger, click mobile toggle (list un-hides, `aria-expanded="true"`), click an item: mobile menu `hidden`, dialog open; Esc (`cancel`) closes dialog and focus is on the hamburger | G1 | mobile flow | real layout |
| Fully-automated | N3b mobile toggle flips `aria-expanded` and the list `hidden` attribute independently of the menu | G1 | expandable sub-list | animation |
| Fully-automated | N4 Escape while the desktop dropdown is open closes it and focuses the toggle; Escape while closed does nothing harmful | G1 | keyboard close | real key events across browsers |
| Fully-automated | N5 `pointerdown` outside the group closes; `pointerdown` inside the group (on an item) does not | G1 | outside-click close | real pointer |
| Fully-automated | N6 `focusout` with `relatedTarget` an element outside the group closes; `relatedTarget` null or inside the group does NOT (Safari guard, Finding 6) | G1 | focus-out rule | real Tab order |
| Fully-automated | N7 second toggle click collapses; selecting an item collapses before the popup opens; after the popup closes the dropdown stays collapsed | G1 | state hygiene | — |
| Agent-probe | P1 browser at 360/390/768/1024/1280/1440 on `/` and `/payment/return`: toggle placement per breakpoint, dropdown within viewport, mobile panel and wrapped label with no horizontal overflow, `scrollWidth <= clientWidth` for the page, inactive iframe computed `display:none`, screenshots | agent-browser on port 3217 (3218 if busy) after build | real layout, real computed styles | content inside the iframe (Google) |
| Agent-probe | P2 real Esc, real outside click, real backdrop click, real focus return, background scroll locked, for BOTH forms | same probe | native `<dialog>` and focus behaviour | iOS Safari |
| Known-gap | both real forms render on the deployed site; the new form may be login-restricted, one-response-limited or blocked by third-party cookies; keyboard and screen-reader across the iframe; iOS Safari | — | — | third party and environment; named residual R1-R5, gap-resolution D, gate CONDITIONAL, backlog note updated in step 10 |
Failing stubs (red-first, for the validate-contract; NOT written to disk at PLAN):
- `test("should open the dropdown and expose both form items", () => { throw new Error("NOT IMPLEMENTED — TDD stub for: dropdown items") })`
- `test("should close the dropdown on Escape and focus the toggle", () => { throw new Error("NOT IMPLEMENTED — TDD stub for: Esc close") })`
- `test("should return focus to the toggle after the popup closes", () => { throw new Error("NOT IMPLEMENTED — TDD stub for: focus return") })`

Gap resolution (vc-test-coverage-plan format):
| Gap | Resolution options |
|---|---|
| Real Esc / outside click / focus in a real browser | A) probe P2 now (chosen). B) add a Playwright runner (new dependency, out of scope). C) accept. D) n/a |
| Computed `display:none` for the inactive iframe | A) probe P1 reads computed style (chosen). B) jsdom cannot compute the cascade. C) accept. D) n/a |
| Both forms loading on the deployed site, login-restricted form, cookie-blocked browsers | A) none possible locally. B) none. C) not acceptable as PASS. D) backlog note `form-popup-deployed-embed-check_NOTE_18-11-26.md` extended (chosen) |
Missing test areas: (a) form content and submission inside the iframe (Google's page; owner check); (b) Safari no-focus-on-click behaviour is guarded by N6 logic only, real Safari untested (residual R5).

## Acceptance Criteria (REQ-TEST-LINK)
Each criterion names `proven by:` and `strategy:` (Known-Gap is never a strategy). Gate ids G1-G9 are defined in Gates.
- AC1 The Navbar has a "Check in" group in the desktop nav and in the mobile nav; the five `NAV_LINKS` are unchanged; no stand-alone "Checkin popup" top-level button remains. proven by: `Navbar.test.tsx` N1 (+ P1 for real breakpoint layout); strategy: Fully-Automated (+ Agent-Probe for layout).
- AC2 Desktop dropdown is an accessible disclosure: toggle with `aria-expanded` and `aria-controls`; list hidden when collapsed; closes on Esc (focus back to toggle), outside pointerdown, focus-out to an outside element, second toggle click and item selection; focus-out with `relatedTarget` null does NOT close. proven by: N2, N4, N5, N6, N7; strategy: Fully-Automated.
- AC3 Each item opens the ONE shared popup with ITS own title, iframe `src` and fallback `href` (data-driven over `checkinForms`). proven by: FormPopup T2, T3, T9, Navbar N2, N2b; strategy: Fully-Automated.
- AC4 Iframes are mounted lazily per form and kept (answers preserved per form); inactive iframes carry `hidden` and are not displayed; no iframe exists before the first open. proven by: T1, T7, T10, T11 (+ P1 computed `display:none`); strategy: Fully-Automated (+ Agent-Probe).
- AC5 Focus: popup close button gets focus on open; closing returns focus to the group toggle (desktop) or the hamburger (mobile). proven by: T5, T5b, N2, N3; strategy: Fully-Automated (+ P2 native).
- AC6 Mobile: the group toggle expands an inline list inside the hamburger panel; selecting an item closes the menu and opens the popup. proven by: N3, N3b; strategy: Fully-Automated.
- AC7 Data model: typed `checkinForms` list; ids and menu labels unique; URL shapes fixed; group label in one constant; the second form's label is exactly "Checkin popup". proven by: T12; strategy: Fully-Automated.
- AC8 Form URLs/ids appear only in `_data/formPopup.ts` (outside tests); merch link intact (1 match in `brief.ts`). proven by: G8; strategy: Fully-Automated.
- AC9 No banned word (the accented "ve") in any new string. proven by: T8 with positive control; strategy: Fully-Automated.
- AC10 No horizontal page scroll at 360/390/768/1024/1280/1440 with the group present, dropdown open and popup open; dropdown box within the viewport at 1024/1280/1440; mobile panel (group expanded, long label wrapped) has `scrollWidth <= clientWidth`. proven by: P1; strategy: Agent-Probe.
- AC11 Real Esc, outside click, backdrop click and focus return work for both forms; background scroll locked while the popup is open. proven by: P2; strategy: Agent-Probe.
- AC12 No regression: neighbours green, full vitest has only the known failure, typecheck, scoped lint (max-warnings 0), repo lint at the 461 baseline, build green with the retry rule. proven by: G2-G6; strategy: Fully-Automated.
- AC13 No CSP/X-Frame-Options/frame-src header in the repo that blocks `docs.google.com`. proven by: G9 (with positive control); strategy: Fully-Automated (repo scope only).
- AC14 Both real forms load inside the iframe on the deployed site (including a login-restricted or cookie-blocked browser for the new form). proven by: no automated scenario; local observation in the probe only (not PASS); owner manual check; strategy: Agent-Probe (local observation); named residual, gate CONDITIONAL, gap-resolution D.
- AC15 The pre-existing 360/390px header action-row overflow is recorded as an observation (measured again) and parked as a separate backlog stub; it is NOT fixed here. proven by: G10 (file exists and is a flat NOTE) plus the REPORT numbers from P1; strategy: Fully-Automated (G10) + Agent-Probe (numbers).

## Implementation Checklist
Sequential, one EXECUTE agent (opus). TDD: tests before code; run the relevant gate after each step.
1. Pre-flight: run `git status --short` and `git diff --stat -- src/components/Navbar.tsx src/styles/globals.css` and note the existing uncommitted state (radio task and previous task); read the last 25 lines of `src/styles/globals.css`; run G1 and G2 once to confirm the baseline is green; confirm port 3217 is free (use 3218 if not). Never touch port 3000.
2. Rewrite `src/app/(routes)/_data/formPopup.ts` per D1-D3 (type, `checkinForms` with the two entries in order, `CHECKIN_GROUP_LABEL`, single URL helper; remove the old exports).
3. Rewrite `src/components/FormPopup.test.tsx` FIRST with the Write tool (never a shell heredoc): adapt T1-T8 and T5b to `activeId`, add T9-T13 per the coverage table. Harness: a small component holding `activeId` state and a `returnFocus` ref. Banned-word regex EXACTLY `new RegExp("(?<![\\p{L}\\p{N}])v\\u00e9(?![\\p{L}\\p{N}])", "iu")` with a literal DOUBLE backslash; positive controls built with `String.fromCharCode(0xe9)` so no test file contains the banned word. After writing, Grep the file for `\\p{L}` and `\\u00e9` (must be present) and for the literal accented word (count must be 0). Run G1 on this file: must be RED (the new exports do not exist yet / props mismatch).
4. Rewrite `src/components/FormPopup.tsx` per D4 and D9 (one object state, render-phase derive, per-form iframes with `hidden`, shown title and fallback). Run `npx.cmd vitest run src/components/FormPopup.test.tsx` until green. No `setState` in an effect, no `ref.current` during render.
5. Rewrite `src/components/Navbar.test.tsx` FIRST with the Write tool: adapt N1-N3, add N2b, N3b, N4-N7 per the coverage table (same mocks and stubs as the current file; `fireEvent.focusOut(element, { relatedTarget })` for N6; `fireEvent.pointerDown(document.body)` for N5; lookups scoped with `within`). Same grep checks as step 3. Run: must be RED.
6. Edit `src/components/Navbar.tsx` with the Edit tool, incrementally (D5-D7): imports; `formId` state replacing `formOpen`; refs `groupRef`, `groupButton`; state `groupOpen`, `mobileGroupOpen`; the new `useEffect` for the open dropdown; shared open-form helper; desktop group block; mobile group block; `<FormPopup activeId=...>`. Run `npx.cmd vitest run src/components/Navbar.test.tsx src/components/FormPopup.test.tsx` until green.
7. Append the CSS block at the END of `src/styles/globals.css` with the Edit tool per D8 (re-read the last lines right before; do not touch any existing rule).
8. Run G1-G5 and fix in place until green (mind `react-hooks/set-state-in-effect` and the refs rule).
9. Run G6 (build, retry rule), then start `next start` on port 3217 (record the PID, stop exactly that PID afterwards, confirm the port is free) and run the P1/P2 probe from Gates at all six widths, Esc pressed FIRST because anonymous visitors get a login dialog on load. Save screenshots into this task folder. Record the observed real heading of each form (as observation, not PASS).
10. Docs and backlog: Edit row 77 of `component-contracts.md` and the two own lines of `all-context.md` (Edit tool, replace only those); append one bullet for the second form to `form-popup-deployed-embed-check_NOTE_18-11-26.md`; write the NEW flat note `navbar-mobile-header-overflow_NOTE_18-11-26.md` (BLUF, measured 385px action row at 360/390, hamburger partly off-screen, source parent REPORT and this plan, suggested direction: shrink ticket button or move login into the menu below 480px; NOT part of this task); run `node .claude/skills/vc-context-discovery/scripts/discover-context.mjs --check-routing` and `node .claude/skills/vc-generate-context/scripts/validate-all-context.mjs`.
11. Final: re-run G3 (full vitest) and G6, G8, G9, G10; `git status --short` and compare to Touchpoints (E-scope check); write `navbar-checkin-menu_REPORT_18-11-26.md` in this task folder (both build exit codes, both TicketRequestDialog results if the flake appears, AC14 as observation only, the pre-existing overflow numbers); report to the orchestrator (vc-tester re-runs G1-G10 for EVL). Do not commit.

## Gates (PowerShell, from the repo root; Vitest must run from PowerShell, not Git Bash)
| Id | Command | Expected |
|---|---|---|
| G1 | `npx.cmd vitest run src/components/FormPopup.test.tsx src/components/Navbar.test.tsx` | all green |
| G2 | `npx.cmd vitest run src/components "src/app/(routes)/_components/TicketRequestDialog.test.tsx"` | green (Footer, HeaderAuth, LoginDialog, Navbar, FormPopup, TicketRequestDialog) |
| G3 | `npm.cmd test` | only `src/lib/supabase/route-client.test.ts` red (known secure-cookie expectation); if `TicketRequestDialog.test.tsx` shows the rare 5s timeout, re-run that file alone once and record both results; any other failure is NEW |
| G4 | `npm.cmd run typecheck` (never concurrently with build: both write `.next`) | exit 0 |
| G5 | `npx.cmd eslint src/components/Navbar.tsx src/components/FormPopup.tsx src/components/FormPopup.test.tsx src/components/Navbar.test.tsx "src/app/(routes)/_data/formPopup.ts" --max-warnings=0` | 0 problems |
| G5b | `npm.cmd run lint` | 461 problems (269 errors, 192 warnings), all under `.agents/ .claude/ .codex/`, none under `src/`; more, or any `src/` line, is NEW |
| G6 | `npm.cmd run build` | first run may exit 1 on the Next 16.4.3 advisory after a successful compile; re-run, expect exit 0; record BOTH exit codes; NEVER upgrade Next |
| G7 | `Start-Process -PassThru npx.cmd "next start -p 3217"` after build (3218 if 3217 is taken; port 3000 is the owner's dev server: never kill or use it), then agent-browser probe at 360, 390, 768, 1024, 1280, 1440; stop exactly the recorded PID; confirm the port is free | probe checks P1 and P2 below |
| G8 | `Select-String -Path (Get-ChildItem src -Recurse -Include *.ts,*.tsx -Exclude *.test.tsx).FullName -Pattern "docs.google.com/forms","1FAIpQLSfkPApNK9sU","1FAIpQLSdTYWn8MFgQyPY67"`: every match only in `src/app/(routes)/_data/formPopup.ts`; plus `Select-String -Pattern "forms.gle/tW1VU8vpASc53CJa8" "src/app/(routes)/_data/brief.ts"` exactly 1 match | AC8 |
| G9 | `Select-String -Pattern "Content-Security-Policy","X-Frame-Options","frame-src","frame-ancestors" next.config.ts, src/proxy.ts` with control `Select-String -Pattern "poweredByHeader","reactStrictMode" next.config.ts, src/proxy.ts` | G9: 0 matches; control: 2 matches (if the control is not 2 the gate is meaningless: fix the command first). Array `-Pattern` form, no pipe character |
| G10 | `Test-Path process/general-plans/backlog/navbar-mobile-header-overflow_NOTE_18-11-26.md` and `Select-String -Pattern "385" process/general-plans/backlog/navbar-mobile-header-overflow_NOTE_18-11-26.md` | True; at least 1 match (AC15) |

Probe G7 detail, at EACH width (always press Esc first to close the auto-opening login dialog): (a) record `documentElement.scrollWidth` and `clientWidth` with everything closed, with the dropdown/list open, and with the popup open (`scrollWidth <= clientWidth` required except the pre-existing observation below); (b) at >=1024: the toggle "Check in" is in the desktop nav, click it, record the submenu `getBoundingClientRect()` (must lie inside `0..innerWidth`), both item labels visible and not clipped; at <1024: open the hamburger, expand "Check in", record the mobile panel `scrollWidth <= clientWidth` and that the long label wraps; (c) click each item in turn and check dialog title text, iframe `src` attribute and fallback link `href` against `checkinForms`; (d) after opening both forms, read computed `display` of each iframe: the inactive one must be `none`; (e) Esc closes the popup and focus is on the toggle (desktop) or hamburger (mobile); outside click closes the dropdown; real backdrop click closes the popup; background scroll is locked while open; (f) repeat on `/payment/return` at 1280 and 360; (g) screenshots per width into the task folder; (h) at 360 and 390 re-measure the header action row and record it as the known pre-existing observation (385px, hamburger partly off-screen): it must NOT be reported as a failure of this task, only as AC15 numbers; (i) record what each iframe shows (form, error page, blank) as an observation, never as PASS. Do not assert Google's page content.

## Verification Evidence
| Gate / Scenario | Strategy | Proves SPEC criterion |
|---|---|---|
| Navbar.test.tsx N1 (group toggle in both navs, 5 NAV_LINKS intact) | Fully-Automated | AC1 |
| Navbar.test.tsx N2, N4, N5, N6, N7 (disclosure semantics and all close paths) | Fully-Automated | AC2 |
| FormPopup.test.tsx T2, T3, T9 + Navbar.test.tsx N2, N2b (per-form title, src, fallback) | Fully-Automated | AC3 |
| FormPopup.test.tsx T1, T7, T10, T11 (lazy per-form iframes, hidden attribute) | Fully-Automated | AC4 |
| Probe P1 computed `display:none` for the inactive iframe | Agent-Probe | AC4 |
| FormPopup.test.tsx T5, T5b + Navbar.test.tsx N2, N3 (focus in and return) | Fully-Automated | AC5 |
| Navbar.test.tsx N3, N3b (mobile expandable list, menu closes) | Fully-Automated | AC6 |
| FormPopup.test.tsx T12, T13 (data integrity, defensive id) | Fully-Automated | AC7 |
| G8 grep (URLs and ids only in formPopup.ts, merch intact) | Fully-Automated | AC8 |
| FormPopup.test.tsx T8 (banned word scan with positive control) | Fully-Automated | AC9 |
| Probe P1 at 360/390/768/1024/1280/1440 (no horizontal scroll, dropdown in viewport, mobile panel) | Agent-Probe | AC10 |
| Probe P2 (real Esc, outside click, backdrop click, focus, scroll lock, both forms) | Agent-Probe | AC11 |
| G2, G3, G4, G5, G5b, G6 (regression suite) | Fully-Automated | AC12 |
| G9 grep header/CSP in repo with positive control | Fully-Automated | AC13 |
| Both real forms load on the deployed site (local observation only) | Agent-Probe (observation) + named residual (CONDITIONAL, backlog note, owner manual check) | AC14 |
| G10 backlog stub exists + P1 header numbers recorded in REPORT | Fully-Automated + Agent-Probe | AC15 |

## Data Flow and Failure Modes
Flow: visitor clicks the group toggle (Navbar Client leaf) -> `groupOpen` true -> list shown -> click an item -> Navbar sets `formReturn`, closes the dropdown/menu, sets `formId` -> `FormPopup` derives the active form, arms its iframe (first time only), shows title and fallback of that form -> `showModal()` -> the browser loads that form's `embedUrl` from Google (third party; no data of ours leaves the client) -> close (button, Esc, backdrop) -> `setFormId(null)` -> `close()` and focus to `returnFocus`.
Failure modes: (1) iframe blank or blocked (login-restricted form, blocked third-party cookies, hosting headers): the per-form fallback link "Mở trong tab mới" is always shown; (2) JS disabled: no group or popup (same as the other Navbar controls, accepted); (3) dropdown closes before an item click in Safari (focusout with null relatedTarget): guarded by D5 and test N6; (4) inactive iframe visible because author CSS beats `hidden`: D8 rule plus T10 plus the probe; (5) popup cannot return focus to a hidden item: toggle/hamburger are the return targets (D5/D6); (6) unknown `activeId`: treated as closed (T13); (7) dropdown open while the viewport shrinks below 1024px: the desktop nav is `display:none`, the state is stale but invisible and cleared on the next toggle click (accepted, no extra effect); (8) long mobile label overflowing the panel: `white-space:normal` override (D8) and probe AC10.

## Security and Privacy (vc-security quick STRIDE; no auth, billing or secrets in this surface)
- Spoofing/Tampering: URLs are static constants in one file; no user input reaches `src`/`href`. The type and T12 fix their shape. Information disclosure: each opened form makes the visitor's browser contact Google; zero calls before the first open per form; `referrerPolicy="strict-origin-when-cross-origin"`; no `sandbox` (justified, parent plan D5/Finding 6); no `allow`. External links use `rel="noopener noreferrer"`. Consent/cookie notice for embedded Google content remains an owner decision (parent plan R4/O5). No elevation or DoS surface added.

## Risk Predictions (vc-predict, condensed 5-persona debate)
| Persona | Risk | Mitigation |
|---|---|---|
| Architecture | prop-controlled single popup keyed by form id vs one popup per form: per-form popups would multiply dialogs and focus targets | one `FormPopup`, `activeId` prop, per-form iframes inside it (D4, D9) |
| UX/Accessibility | role="menu" over-promises keyboard behaviour; Safari focus quirk can drop clicks; focus lost when the item is hidden | disclosure pattern, focus-out rule ignoring null `relatedTarget`, toggle/hamburger as return targets (D5, D6; N4-N6, N2, N3) |
| CSS/Maintenance | author `display` beats `hidden`; `nowrap` and `width:auto` rules break new items; shared uncommitted `globals.css` | append-only prefixed block with higher-specificity overrides and the `[hidden]` rule (D8), probe, incremental Edit |
| Security/Privacy | second third-party embed doubles exposure | lazy per form, no tracking, explicit referrer policy, owner consent decision recorded |
| Testing | jsdom has no CSS or real Esc; lint `set-state-in-effect`; regex corrupted by shell escaping | attribute assertions plus probe; render-phase derive; Write-tool test files with double-backslash regex and grep check |
Highest-risk checklist items and edge cases folded in (vc-scenario): step 4 (FormPopup state: switch A to B while closed, reopen A keeps element, unknown id), step 6 (Navbar: Esc while list open and popup closed, pointerdown inside group, focusout null, opening mobile group then desktop media change), step 7 (CSS: `[hidden]` iframe, nowrap label, dropdown crossing the viewport at 1024px).

## Test Infra Improvement Notes
- The `<dialog>` + scroll-lock + focus-return pattern now exists in `LoginDialog`, `TicketRequestDialog` and `FormPopup`; a shared `useModalDialog` hook and a shared `HTMLDialogElement` polyfill in `src/test/` remain a separate task (carried over from the parent plan).
- A first dropdown/disclosure pattern now exists in the repo (Navbar group). If a second one appears, extract a `useDisclosure` hook (Esc, outside pointerdown, safe focus-out) and a shared test helper for these three close paths.
- Arrow-key navigation is intentionally not implemented; revisit if the group grows beyond about 6 forms (then consider `role="menu"` or a dedicated forms page).
- No in-project browser runner exists (all-tests.md Known Gaps); real Esc, backdrop and computed-style checks stay agent-browser probes.

## Residuals for the owner (not PASS)
- R1 Both forms actually render inside the iframe on the deployed site (the earlier local probe saw form 2; form 1 has not been observed in the app yet).
- R2 Hosting-added CSP/X-Frame-Options would block both; the repo adds none (G9).
- R3 The new form may require Google sign-in, limit one response, or be blocked by third-party-cookie settings (Safari, Chrome strict); the fallback link is the way out.
- R4 Privacy/consent notice for embedded Google content (owner policy; now two embeds).
- R5 Keyboard and screen reader across the iframe boundary, and iOS Safari (including the no-focus-on-click behaviour).

## Open owner decisions (defaults already chosen; none blocks EXECUTE)
- O1 Group label: default "Check in" (as requested). One constant.
- O2 Dialog title of the existing form: default `Check in pop-up REPLY 199X` (evidence: the form's own heading seen in the previous local probe); alternative: keep `Biểu mẫu REPLY 199X`. Dialog title of the new form: default `Check in không gian âm nhạc hoài niệm`.
- O3 Item order: default new form first, then "Checkin popup". Swap = reorder two entries.
- O4 Iframe retention: default one iframe per form kept mounted after first open (answers preserved per form); alternative single iframe with changing `src` (loses answers when switching).
- O5 Fallback link target: default plain `viewform` URL; alternative the owner's short links (`forms.gle`).
- O6 Arrow-key navigation: default none (disclosure pattern); add only if the list grows.
- O7 Whether the hamburger overflow at 360/390 gets fixed next (backlog stub written; separate task).
- O8 Consent/cookie notice for the two Google embeds (owner policy).

## Dependencies
No new dependency; no `package.json` change. Environment: Node 22, `npm.cmd`/`npx.cmd` on PowerShell, `agent-browser` in the workspace, network to Google only for the optional probe observation. Process: VALIDATE (contract `Gate: PASS`) then the owner's explicit "ENTER EXECUTE MODE". The parent plan's EVL (vc-tester) is independent of this task; this task's EVL re-runs G1-G10.

## Validate Contract

Status: PASS
Date: 18-11-26
date: 2026-11-18
generated-by: outer-pvl

Parallel strategy: sequential
Rationale: score 1/7 (LOW; only S7, 5+ files in blast radius). Navbar, FormPopup, data, CSS and tests are one overlapping change, so no fan-out. One vc-execute-agent (opus, EXECUTE) runs checklist 1-11 in order, then one vc-tester (sonnet) re-runs G1-G11 independently (EVL). Total 2 agents (1 x 1 + 1 x 1); cost guard not triggered. VALIDATE itself ran inline and sequentially (SIMPLE plan, read-only checks only). Execution has NOT started; the owner's explicit "ENTER EXECUTE MODE" is still required.

Baseline note (scope change received during VALIDATE): the owner removed the header ticket trigger ("Đặt phiếu nước ngay", TicketRequestDialog) from the Navbar after the plan was written. Verified on disk at VALIDATE: `Navbar.tsx` is now 114 lines with no `TicketRequestDialog` import or button; `Navbar.test.tsx` no longer mocks it; `globals.css` is 961 lines with no `.event-header__ticket` rules and still ends with the closed `@media(max-width:639px)` form-popup block; the header action row holds only `HeaderAuth` and the hamburger. This plan must NOT reintroduce any of it (see AC16, G11, E14, E15). Because the 385px action row from the plan's D10/AC15 was ticket button + login + hamburger, AC15 and G10 are AMENDED below.

Test gates (C3 5-column table):

| criterion id | behavior | strategy | proving test | gap-resolution |
|---|---|---|---|---|
| AC1 | "Check in" group toggle in desktop and mobile navs; five NAV_LINKS unchanged; no stand-alone "Checkin popup" top-level button | Fully-Automated | `npx.cmd vitest run src/components/FormPopup.test.tsx src/components/Navbar.test.tsx` (N1) | B |
| AC1 | Real breakpoint layout of the group on `/` and `/payment/return` | Agent-Probe | G7 probe P1 (`agent-browser`, port 3217 or 3218, 360/390/768/1024/1280/1440) | B |
| AC2 | Desktop disclosure: `aria-expanded`/`aria-controls`; closes on Esc (focus to toggle), outside pointerdown, focus-out to an outside element, second toggle click, item selection; focus-out with null relatedTarget does NOT close | Fully-Automated | G1 (Navbar N2, N4, N5, N6, N7) | B |
| AC3 | Each item opens the ONE popup with its own title, iframe src, fallback href (data-driven over `checkinForms`) | Fully-Automated | G1 (FormPopup T2, T3, T9; Navbar N2, N2b) | B |
| AC4 | Per-form lazy iframes kept after first open; inactive iframe has `hidden`; no iframe before first open; B not mounted when only A opened | Fully-Automated | G1 (FormPopup T1, T7, T10, T11) | B |
| AC4 | Inactive iframe computed `display:none` (`.form-popup__frame[hidden]` rule beats `display:block`) | Agent-Probe | G7 probe P1 (computed style of both iframes) | B |
| AC5 | Focus into close button on open; returns to group toggle (desktop) or hamburger (mobile) | Fully-Automated | G1 (FormPopup T5, T5b; Navbar N2, N3) | B |
| AC6 | Mobile: toggle expands inline list in the hamburger panel; item selection closes the menu and opens the popup | Fully-Automated | G1 (Navbar N3, N3b) | B |
| AC7 | Typed `checkinForms`: unique ids and labels, URL shapes, group label constant, form 2 label exactly "Checkin popup", order, unknown/null activeId closed | Fully-Automated | G1 (FormPopup T12, T13) | B |
| AC8 | Form URLs/ids only in `_data/formPopup.ts` (non-test); merch link intact (1 match) | Fully-Automated | G8 (PowerShell, minimum-match rule in E6) | B |
| AC9 | No banned accented word in any new string | Fully-Automated | G1 (FormPopup T8, with positive control) | B |
| AC10 | No horizontal page scroll at six widths with group, dropdown and popup; dropdown within the viewport; mobile panel `scrollWidth <= clientWidth` | Agent-Probe | G7 probe P1 | B |
| AC11 | Real Esc, outside click, backdrop click, focus return, scroll lock, for BOTH forms | Agent-Probe | G7 probe P2 | B |
| AC12 | No regression: neighbours green, only the known full-suite failure, typecheck, scoped lint, lint baseline 461, build | Fully-Automated | G2 `npx.cmd vitest run src/components "src/app/(routes)/_components/TicketRequestDialog.test.tsx"`, G3 `npm.cmd test`, G4 `npm.cmd run typecheck`, G5/G5b lint, G6 `npm.cmd run build` | B |
| AC13 | No CSP/X-Frame-Options/frame-src/frame-ancestors in `next.config.ts` or `src/proxy.ts` | Fully-Automated | G9 (0 matches; positive control 2 matches) | B |
| AC14 | Both real forms load in the iframe on the deployed site (login-restricted or cookie-blocked browsers) | Agent-Probe | local observation only in G7 (not PASS evidence); owner manual check on the deployed site | D |
| AC15 (AMENDED) | Header action row at 360/390 re-measured WITHOUT the ticket button: page `scrollWidth <= clientWidth` and the hamburger's bounding box right edge `<= innerWidth`. If both hold the old overflow is resolved by the owner's ticket removal: record the numbers in the REPORT, write NO backlog stub. If either fails, write the stub with the measured numbers | Agent-Probe | G7 probe P1 step (h) numbers, plus amended G10 (below) | B |
| AC16 (added at VALIDATE) | The header ticket trigger stays removed: Navbar, its test and `globals.css` contain no `TicketRequestDialog` / `.event-header__ticket`; Navbar N1 also asserts no header control named like "Đặt phiếu nước" | Fully-Automated | G11 (0 matches, control at least 2) plus G1 (N1 extra assertion, E15) | B |

Amended G10 (replaces the plan's G10, which assumed the 385px row still existed): after the P1 re-measure at 360 and 390, (a) if no overflow: `Test-Path process/general-plans/backlog/navbar-mobile-header-overflow_NOTE_18-11-26.md` must be `False` and the REPORT states "resolved by header ticket removal" with the measured numbers; (b) if overflow remains: the stub must exist (`True`) and `Select-String -Pattern "<measured width>" <stub>` must match, with the REPORT numbers. Either branch is a pass; a stub that claims 385px while the probe shows no overflow is a failure.

New G11 (PowerShell, verified at VALIDATE: 0 matches, control 6): `Select-String -Pattern "TicketRequestDialog","event-header__ticket" src/components/Navbar.tsx, src/components/Navbar.test.tsx, src/styles/globals.css` expects 0 matches; control `Select-String -Pattern "HeaderAuth","event-header__toggle" src/components/Navbar.tsx, src/styles/globals.css` expects at least 2 matches (if fewer the gate is meaningless: fix the command first). Array `-Pattern` form, no pipe character. Do not run it against `src/app` (TicketRequestDialog is legitimately used by Hero, Tickets and Timeline sections).

gap-resolution legend:
- A — proven now (gate passes in this cycle)
- B — fixed in this plan (gate added by this plan's checklist)
- C — deferred to a named later phase/plan
- D — backlog test-building stub (named residual; keep-active; continue)

C-4 reconciliation: the `strategy:` column carries ONLY the 3 proving strategies (Fully-Automated / Hybrid / Agent-Probe). Known-Gap is NEVER a `strategy:` value; AC14 is a named residual row carried via gap-resolution D, never claimed as proven. Every developed behavior has at least one Fully-Automated gate (AC14 is an external third-party condition, not behavior developed here), so the vacuous-green ban does not apply.

Legacy line form (retained so existing validate-contract consumers still parse):
- Navbar group + FormPopup logic: [Fully-automated: `npx.cmd vitest run src/components/FormPopup.test.tsx src/components/Navbar.test.tsx`]
- Regression: [Fully-automated: G2 `npx.cmd vitest run src/components "src/app/(routes)/_components/TicketRequestDialog.test.tsx"`] | [Fully-automated: `npm.cmd test` (only `src/lib/supabase/route-client.test.ts` red)] | [Fully-automated: `npm.cmd run typecheck`] | [Fully-automated: G5 scoped `npx.cmd eslint` + G5b `npm.cmd run lint` baseline 461] | [Fully-automated: `npm.cmd run build` (retry rule)]
- Static greps: [Fully-automated: G8, G9, G11 (PowerShell, verified valid at VALIDATE), amended G10]
- Layout, native dialog, computed style, header action row re-measure: [agent-probe: G7 P1/P2 on port 3217 or 3218]
- Both real forms inside the iframe on the deployed site: [known-gap: documented — residual R1-R5, backlog note `form-popup-deployed-embed-check_NOTE_18-11-26.md` extended in step 10, owner checks by hand]

Failing stubs (Fully-Automated rows; red-first starting point for execute-agent; NOT written to disk at VALIDATE; copied from the plan's Test Coverage Plan plus AC16):

Failing stub (AC3 / T9, N2, N2b):
```
test("should open each form with its own title, iframe src and fallback href", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: per-form wiring")
})
```
Failing stub (AC4 / T10, T11):
```
test("should keep both iframes mounted with the inactive one hidden", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: per-form retention")
})
```
Failing stub (AC2 / N2):
```
test("should open the dropdown and expose both form items", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: dropdown items")
})
```
Failing stub (AC2 / N4):
```
test("should close the dropdown on Escape and focus the toggle", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: Esc close")
})
```
Failing stub (AC5 / N2, T5):
```
test("should return focus to the toggle after the popup closes", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: focus return")
})
```
Failing stub (AC9 / T8):
```
test("should not contain the banned accented word in any new string", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: no-ve wording with positive control")
})
```
Failing stub (AC16 / N1):
```
test("should not render a header ticket trigger in the Navbar", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: header ticket trigger stays removed")
})
```

Dimension findings:
- Infra fit: PASS — verified read-only against the code on disk (HEAD f3b06c3 plus the owner's in-flight ticket-trigger removal, which is already applied in the working tree): `Navbar.tsx` is 114 lines with `open/activeId/formOpen`, refs `menuButton/header/formReturn`, one desktop and one mobile form button, `<FormPopup open onClose returnFocus />` before `</header>`, actions row = `HeaderAuth` + hamburger; `FormPopup.tsx` is 85 lines (single iframe armed by render-phase `if (open && !armed)`); `_data/formPopup.ts` is 10 lines. Importer grep over `src` confirms only `Navbar.tsx`, `FormPopup.tsx` and their two tests use `FORM_POPUP_*`/`formPopupLinks`/`FormPopup` (Finding 1 true); `process/context` mentions them in prose only (component-contracts.md row 77, all-context.md structure lines 88-89 and open question at about line 165, all located). `next.config.ts` has only `reactStrictMode` and `poweredByHeader`; `src/proxy.ts` has no CSP/XFO. Port 3217 had a listener at VALIDATE time (PID 14848, another run): the plan's 3218 fallback applies.
- Test coverage: PASS — the dialog polyfill pattern (`HTMLDialogElement.prototype.showModal/close` in `beforeEach`, `cancel` event for Esc) already exists in `HeaderAuth.test.tsx`, `LoginDialog.test.tsx`, `TicketRequestDialog.test.tsx` and both current test files; `vi.stubGlobal("matchMedia")` and the `HeaderAuth`/`RemoteImage` mocks are in `Navbar.test.tsx` (the `TicketRequestDialog` mock was removed with the trigger and must not return, E14). Testing Library name matching is exact-string, so the toggle "Check in" does not collide with the item "Check in không gian âm nhạc hoài niệm"; both navs contain identical item names, so scoped `within(nav)` (planned) is mandatory. jsdom 29.1.1: `fireEvent.focusOut` bubbles (reaches a native `focusout` listener on the group); `pointerDown`/`keyDown` reach `document`/`window` listeners. Every developed behavior has a Fully-Automated gate; computed `display:none`, real Esc/backdrop, layout and the header re-measure are Agent-Probe rows; AC14 is the named residual.
- Breaking changes: PASS — internal API change only (`FormPopup` props; `FORM_POPUP_*` and `formPopupLinks` replaced) and the importer grep proves no other consumer; `Navbar({ auth })`, `NAV_LINKS` (5), `projectLinks.merch` (`https://forms.gle/tW1VU8vpASc53CJa8`, 1 match in `brief.ts`) unchanged. Scope exclusions confirmed against Touchpoints: `src/lib`, `src/app/api`, `supabase`, `scripts`, `.env*`, `layout.tsx`, `brief.ts`, `Footer*`, `Channels*`, `Radio*`, ticket-order dialog files, `LoginDialog*`, `HeaderAuth*`, `package*.json` appear nowhere in Touchpoints. The plan contains no instruction that touches `TicketRequestDialog` or the header ticket trigger, but its prose (Context read, Test Coverage Plan mocks line, D10, AC15, G10, step 10 stub, probe step (h)) still describes the pre-removal state; the amendments above and E14/E15 govern.
- Security surface: PASS — no auth, billing, schema, secret or API surface. Static third-party URLs in one file; second Google embed is lazy per form (zero calls before first open), explicit `referrerPolicy`, no `sandbox` (justified: Google Forms needs script/same-origin), no `allow`, fallback link `rel="noopener noreferrer"`. Consent/cookie notice for two embeds is owner decision O8/R4, not a blocker. No high-risk class, so no evidence pack.
- Section 1 (`_data/formPopup.ts` + `FormPopup.tsx`): PASS — both Google form ids in the plan match the owner's resolved URLs and the id already in `formPopup.ts` (grep: `1FAIpQLSdTYWn8MFgQyPY67ixOfxkykYNBtL1Y-gTNRqBvVcs5SYcuog` new, `1FAIpQLSfkPApNK9sU_GIXVe5Mh4t2HYTEfwQwYHaHJCMmDjx9iETRtw` old). The D4 shape (one object state `{ shownId, armed }`, guarded render-phase `setState`, dialog effect keyed on `[open, returnFocus]`) and the D5 effect (window `keydown`, document `pointerdown`, `focusout` on the group with an `instanceof Node` guard) were linted read-only as a piped snippet with the repo ESLint config: 0 problems with `--max-warnings=0`. Highest-risk edit: the render-phase state update; mitigation: guarded `if` plus T10/T11/T13.
- Section 2 (`Navbar.tsx`): PASS — incremental Edit on the current file; the Safari null-relatedTarget guard (D5) is logically correct (outside clicks go through `pointerdown`, in-group focus moves stay inside); `formReturn.current` is read only in handlers/effects; mobile `mobileGroupOpen` is independent of `open`. Highest-risk edit: the focus-out listener closing the list before an item click in Safari; mitigation D5 plus N6. The header is now narrower than the plan assumed (no ticket button), so the desktop nav and the action row cannot get wider because of this change.
- Section 3 (`globals.css` append): PASS — traps verified on disk by selector: `.form-popup__frame { display:block }` beats the UA `hidden`, so the planned `.form-popup__frame[hidden]` (0,2,0) is required and wins; `.event-header__link { white-space:nowrap }` (0,1,0) and `.event-header__desktop .event-header__link--button { width:auto }` (0,2,0) are real, and the planned `.event-header__desktop .event-header__submenu .event-header__link--button` and `.event-header__mobile .event-header__sublist .event-header__link--button` (both 0,3,0) beat them and `.event-header__mobile .event-header__link` (0,2,0). The file is now 961 lines (the ticket CSS lines were removed), LF, and still ends with the closed `@media(max-width:639px)` form-popup block. `var(--reply-deep)` exists. One specificity detail is recorded as E4.
- Section 4 (tests + docs + backlog + gates): PASS — the regex `new RegExp("(?<![\\p{L}\\p{N}])v\\u00e9(?![\\p{L}\\p{N}])", "iu")` was run from a file in node: matches "mua vé ngay", "vé", "Mua VÉ ngay"; does not match "vẻ", "nghề", "véc-tơ", "ve" or any new plan string. Running it through inline `node -e` in Git Bash strips one backslash level and silently breaks it (observed), which confirms the plan's Write-tool rule. G8 (1 match now, only the old id line in `formPopup.ts`), G9 (0, control 2), the merch check (1) and the new G11 (0, control 6) were run as real PowerShell at VALIDATE: valid syntax, expected values. `validate-plan-artifact.mjs`: 0 failures, 0 warnings; `discover-context.mjs --check-routing` in sync; `validate-all-context.mjs` 0 failures.

Open gaps:
- AC14 / R1-R5 (both real forms inside the iframe on the deployed site, hosting headers, login-restricted/one-response/cookie-blocked form, privacy notice for two embeds, keyboard and screen reader across the iframe, iOS Safari): known-gap: documented as NEW PLAN REQUIRED — see backlog/form-popup-deployed-embed-check_NOTE_18-11-26.md (extended at checklist step 10; owner checks by hand). Not PASS evidence.
- Owner decisions O1-O8: defaults chosen, none blocks EXECUTE. O7 (fix the hamburger overflow next) is likely moot after the owner's ticket removal; the probe decides.
- The pre-existing 360/390px header overflow (385px) is most likely RESOLVED by the owner's removal of the header ticket button (the row is now login + hamburger only). This is a prediction, not a measurement: AC15 (amended) measures it at EXECUTE; no backlog stub unless the probe still shows overflow.

What this coverage does NOT prove:
- G1 (Navbar N1-N7, FormPopup T1-T13, jsdom): does NOT prove breakpoint visibility (no CSS in jsdom), real Esc `cancel`, real `::backdrop` click, real Tab order across the iframe, real Safari no-focus-on-click behaviour (only the null-relatedTarget logic), computed `display:none`, real network load of either form, or the content of Google's page.
- G2/G3 regression: does not prove behavior of untested lib/api code; G3 has the known red `route-client.test.ts` (secure cookie) and the rare 5s `TicketRequestDialog.test.tsx` flake under load.
- G4/G5/G5b/G6 (typecheck, lint, build): do not prove interaction or visuals; G5b is the 461-problem baseline under `.agents/ .claude/ .codex/` (none under `src/`); the first build may exit 1 on the Next 16.4.3 advisory.
- G8/G9/G10/G11 (greps and file checks): repo scope only; hosting-added headers (R2) are not proven absent; amended G10 proves the stub state matches the probe numbers, not that layout is good; G11 proves the ticket trigger text is absent from three files, not that the header looks right.
- G7 probe: does not prove iframe content (Google), iOS Safari, or deployed-site behaviour; local observation on port 3217/3218 after build only. No gate proves a response can be submitted to Google.

Gate: PASS
Accepted by: not required for Gate: PASS. No CONCERN remains open; the E-instructions below are execution guidance, not unresolved concerns. AC14/R1-R5 is a named known-gap (gap-resolution D), not claimed as proven. The AC15/G10 amendment and the new AC16/G11 follow the owner's ticket-trigger removal received during VALIDATE and apply to EXECUTE and to the vc-tester EVL run.

### Plan updates applied at VALIDATE
The plan body was NOT edited (VALIDATE may write only the contract section; the structural validator passes). Instead this contract amends it, and where the contract and the plan text disagree the contract wins: (1) AC15 and G10 as amended above (no stub unless the re-measure still overflows); (2) new AC16 and G11; (3) checklist step 10's "write the NEW flat note navbar-mobile-header-overflow" becomes conditional on the re-measure; (4) G7 probe step (h) records numbers only and expects NO overflow; (5) the plan's statements about uncommitted edits in `Navbar.tsx`, `globals.css`, `all-context.md`, `component-contracts.md` are stale (the owner committed f3b06c3) but the Edit-only, own-lines-only rule stays; (6) the Test Coverage Plan line that lists a `TicketRequestDialog` mock for `Navbar.test.tsx` is obsolete. The Current Execution State and Resume sections still say validate pending; the orchestrator or update-process should refresh them.

### Execute-Agent Instructions
| # | Instruction | Trigger condition |
|---|---|---|
| E1 | Pre-flight: HEAD is f3b06c3; expected local changes are only the owner's ticket-trigger removal in `Navbar.tsx`, `Navbar.test.tsx`, `globals.css` (and the hook log and the previous task's EVL files). Report any other surprise. Re-read `Navbar.tsx` and the last 25 lines of `globals.css` fresh (the baseline is 114 and 961 lines). Edit `globals.css`, `all-context.md`, `component-contracts.md` with the Edit tool only (append / replace own lines), never a whole-file write. | Checklist step 1 |
| E2 | Port 3217 had a listener at VALIDATE time (PID 14848, another run). Re-check at step 9: if busy use 3218. Never stop a PID you did not start. Never use or kill port 3000. | Step 9, gate G7 |
| E3 | Write both test files with the Write tool only. Banned-word regex source must be exactly `(?<![\p{L}\p{N}])vé(?![\p{L}\p{N}])` (TypeScript literal: `new RegExp("(?<![\\p{L}\\p{N}])v\\u00e9(?![\\p{L}\\p{N}])", "iu")`). To sanity-check a regex in node write a small `.mjs` file; do NOT use inline `node -e` from Git Bash (it drops one backslash level). Positive controls built with `String.fromCharCode(0xe9)`; Grep each test file for `\\p{L}` (present) and the literal accented word (0). | Steps 3, 5 |
| E4 | CSS specificity: the existing `.event-header__mobile .event-header__link { justify-content:flex-start }` (0,2,0) beats a bare `.event-header__group-toggle`. Write the mobile toggle row rule as `.event-header__mobile .event-header__group-toggle { justify-content:space-between; }` appended AFTER it (same or higher specificity, later wins). Keep the `[hidden]` rules for submenu, sublist and `.form-popup__frame`. | Step 7 |
| E5 | In tests always scope with `within(nav)`: both navs hold identical item names, and the dropdown/sublist are `hidden` until opened (use `hidden: true` for closed-state lookups). Toggle name "Check in" does not collide with the longer item name (exact match). N5 uses `fireEvent.pointerDown(document.body)`; N6 uses `fireEvent.focusOut(el, { relatedTarget })`; handlers must not rely on PointerEvent-only properties. | Steps 3, 5 |
| E6 | G8 must be read with a minimum: after EXECUTE it must list at least 3 match lines (the base `docs.google.com/forms` line and both form ids) and ALL of them in `src/app/(routes)/_data/formPopup.ts`; zero matches is vacuous and a failure. Merch check stays exactly 1. G9 stays 0 with control 2. Run G8/G9/G10/G11 from a `.ps1` file or PowerShell directly, not through Git Bash quoting. | Steps 9, 11 |
| E7 | Lint-proven shape: keep the D4 state object updated by a guarded render-phase `setState` and the D5 listeners registered inside an effect that only calls `setGroupOpen` from event handlers (passed ESLint 0 problems at VALIDATE). Do not read `ref.current` while rendering and never call `setState` in an effect body. | Steps 4, 6, 8 |
| E8 | Server cleanup: `Start-Process -PassThru npx.cmd` returns a wrapper process; stop the whole tree of the PID you recorded (for example `taskkill /PID <pid> /T /F` from PowerShell), then confirm with `Get-NetTCPConnection -LocalPort <port> -State Listen` that the port is free. Press Esc first at each width (anonymous visitors get a login dialog on load). | Step 9 |
| E9 | Dropdown placement: start with `top:calc(100% + 14px); left:0`; tune the offset only within 8-20px and switch to `right:0; left:auto` only if the box crosses the viewport edge at 1024px (record it). Do nothing else visually. | Step 7, probe |
| E10 | Docs: replace only `component-contracts.md` row 77 and only `all-context.md` lines 88-89 (structure) and the open-question line about the Checkin popup; update both to say two forms, group, per-form iframes, owner checks for BOTH forms. Do NOT mention or restore the header ticket button, and do not edit the unrelated radio lines. Then run `node .claude/skills/vc-context-discovery/scripts/discover-context.mjs --check-routing` and `node .claude/skills/vc-generate-context/scripts/validate-all-context.mjs` (both pass now). | Step 10 |
| E11 | Known pre-existing failures that are NOT this task's: `src/lib/supabase/route-client.test.ts` secure-cookie, 461 lint problems under `.agents/.claude/.codex`, `validate-context-discovery`, `validate-skills`, `validate-guide-sync`, rare 5s timeout in `TicketRequestDialog.test.tsx` under load (re-run that file alone once and record both results). Any other failure is NEW. | Steps 8, 11 |
| E12 | Scope check at the end: `git status --short` must list only Touchpoints (the five source/test files, `globals.css`, two docs, the extended backlog note, the REPORT, screenshots inside the task folder) plus, only if the re-measure still overflows, the new overflow stub. Anything under the scope-out list (`src/lib`, `src/app/api`, `supabase`, `scripts`, `.env*`, `package*.json`, `layout.tsx`, `brief.ts`, `Footer*`, `Channels*`, `Radio*`, ticket-order dialog files, `LoginDialog*`, `HeaderAuth*`) is a violation to revert only if YOU changed it. Do not commit. | Step 11 |
| E13 | AC14 and what each iframe shows (form, error page, blank) are observations in the REPORT, never PASS. Record the real heading of the new form (screenshot) and report a mismatch with `dialogTitle` rather than auto-applying it. | Steps 9, 10 |
| E14 | Do NOT reintroduce the header ticket trigger: no `TicketRequestDialog` import, no "Đặt phiếu nước ngay" button in `.event-header__actions`, no `TicketRequestDialog` `vi.mock` in `Navbar.test.tsx`, no `.event-header__ticket` CSS (including inside the `max-width:639px` block). When rewriting `Navbar.test.tsx` start from the CURRENT file's mocks (`HeaderAuth`, `RemoteImage` only); the plan's older text listing a `TicketRequestDialog` mock is obsolete. `TicketRequestDialog.test.tsx` stays in G2 (the component is still used by Hero/Tickets/Timeline). | Steps 5, 6, 7 |
| E15 | Add to Navbar N1 one assertion that no header control matches /Đặt phiếu nước/ (desktop, mobile or actions row); run G11 at steps 8 and 11. | Step 5 |
| E16 | Header action row re-measure (amended AC15/G10): at 360 and 390 record `documentElement.scrollWidth` vs `clientWidth` and the hamburger's `getBoundingClientRect().right` vs `innerWidth`, with everything closed. No overflow: no stub, `Test-Path` of the stub path is `False`, REPORT says "resolved by header ticket removal" with numbers. Overflow: write the flat stub with the measured numbers (it must contain the measured width) and report it as a pre-existing observation, not a failure of this task. | Steps 9, 10 |

### Backlog Artifacts
| Artifact | Location | What it tracks |
|---|---|---|
| form-popup-deployed-embed-check_NOTE_18-11-26.md (EXTEND: one bullet for the second form) | process/general-plans/backlog/ | Owner manual check that BOTH real forms load on the deployed site (AC14, R1-R5) |
| navbar-mobile-header-overflow_NOTE_18-11-26.md (CONDITIONAL: only if the EXECUTE re-measure still shows overflow at 360/390) | process/general-plans/backlog/ | Header action row overflow, expected resolved by the ticket-button removal; written only with measured numbers |

## Autonomous Goal Block (for the orchestrator after VALIDATE; plain English, under 4000 characters)
```
SESSION GOAL: Navbar "Check in" group with two Google Forms (new "Check in không gian âm nhạc hoài niệm" + existing "Checkin popup"), each opening the one shared popup with its own title, iframe and fallback link.
Charter + umbrella plan: N/A — single plan: process/general-plans/active/navbar-checkin-menu_18-11-26/navbar-checkin-menu_PLAN_18-11-26.md
Autonomy: run checklist 1-11 in order, tests first; EXECUTE = vc-execute-agent (opus), EVL = vc-tester (sonnet) re-running G1-G10; the orchestrator never edits files or runs gates itself.
Hard stops / safety constraints:
- Never kill or use port 3000 (owner's dev server); probe only on 3217 (3218 if busy) and stop only the PID you started.
- Do not touch: src/lib, src/app/api, supabase, scripts, .env*, package*.json, layout.tsx, brief.ts (merch link forms.gle/tW1VU8vpASc53CJa8), Footer*, Channels*/Radio*, channels.ts, ticket order dialog files, LoginDialog*, HeaderAuth*, next.config.ts, src/proxy.ts, constants.ts.
- globals.css, all-context.md, component-contracts.md carry other tasks' uncommitted edits: append/insert/replace-own-lines only with the Edit tool, never overwrite or revert.
- Write test files only with Write/Edit (no shell heredoc); banned-word regex uses a double backslash (\\p{L}, \\u00e9) with a positive control built from String.fromCharCode.
- No dependency, no window.open, no sandbox, no tracking, never upgrade Next.js (build advisory: re-run once, record both exit codes).
- Do not fix the 360/390px header overflow here: record it and write the backlog stub only.
- Real forms loading on the deployed site is the owner's check (CONDITIONAL, not PASS). No commit, push or deploy unless asked.
Next phase: EXECUTE: process/general-plans/active/navbar-checkin-menu_18-11-26/navbar-checkin-menu_PLAN_18-11-26.md
Validate contract: inline in plan (## Validate Contract)
Execute start: fully-auto: G1 npx.cmd vitest run src/components/FormPopup.test.tsx src/components/Navbar.test.tsx, G2, G3 npm.cmd test, G4 npm.cmd run typecheck, G5 scoped eslint, G5b npm.cmd run lint (461 baseline), G6 npm.cmd run build, G8-G10 greps | e2e spec: none | probe: agent-browser P1/P2 on 3217 at 360/390/768/1024/1280/1440, Esc first | high-risk pack: no
```

## Resume and Execution Handoff
1. Selected plan file path: `process/general-plans/active/navbar-checkin-menu_18-11-26/navbar-checkin-menu_PLAN_18-11-26.md`
2. Last completed phase or step: PLAN written; no source file edited.
3. Validate-contract status: pending (placeholder section above; vc-validate-agent writes it).
4. Supporting context files loaded: `process/context/all-context.md`, `process/context/tests/all-tests.md`, `process/context/uxui/component-contracts.md`, `process/development-protocols/plan-lifecycle.md`, parent plan, REPORT and Validate Contract of `navbar-google-form-popup_18-11-26`, `src/components/Navbar.tsx`, `Navbar.test.tsx`, `FormPopup.tsx`, `FormPopup.test.tsx`, `src/app/(routes)/_data/formPopup.ts`, `src/lib/constants.ts`, `src/components/auth/HeaderAuth.tsx`, `src/styles/globals.css` (header, mobile menu and form-popup blocks).
5. Next step for a fresh agent: run VALIDATE on this plan; after the owner says "ENTER EXECUTE MODE", spawn vc-execute-agent (opus) with this exact path and run checklist 1-11 in order (tests first); vc-tester (sonnet) re-runs G1-G10 independently. Validators: `node .claude/skills/vc-generate-plan/scripts/validate-plan-artifact.mjs process/general-plans/active/navbar-checkin-menu_18-11-26/navbar-checkin-menu_PLAN_18-11-26.md`; context gates after doc edits: `node .claude/skills/vc-context-discovery/scripts/discover-context.mjs --check-routing` and `node .claude/skills/vc-generate-context/scripts/validate-all-context.mjs`.

Next Step: VALIDATE (vc-validate-agent), then EXECUTE with the owner's explicit command; test context: `process/context/tests/all-tests.md`.

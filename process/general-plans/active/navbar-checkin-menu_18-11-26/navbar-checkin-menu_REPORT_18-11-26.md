---
phase: navbar-checkin-menu-execute
date: 2026-11-18
status: COMPLETE_WITH_GAPS
feature: none
plan: process/general-plans/active/navbar-checkin-menu_18-11-26/navbar-checkin-menu_PLAN_18-11-26.md
---

# REPORT — Navbar "Check in" group with two Google Forms (EXECUTE)

**BLUF:** CODE DONE. The Navbar now has a "Check in" group: a dropdown on desktop and an expandable list in the mobile menu. Both items ("Check in không gian âm nhạc hoài niệm", then "Checkin popup") open the one shared popup with their own title, iframe and fallback link. Every locally runnable gate is green or at its known baseline, and the browser probe passed at all six widths. The only gap is AC14 (do both real forms load on the deployed site), which the owner checks by hand. The header overflow at 360/390 is gone (resolved by header ticket removal), so no overflow backlog note was written.

Note: the owner committed the working tree mid-EXECUTE as `6085118` ("Fixing: Last update", 17:29). The agent did not commit. The plan status edit and this REPORT were written after that commit and are uncommitted.

## What Was Done
| File | Lines now | Change |
|---|---|---|
| `src/app/(routes)/_data/formPopup.ts` | 34 | rewritten: `CHECKIN_GROUP_LABEL`, `CheckinForm` type, frozen `checkinForms` (2 entries), one URL helper; old exports removed |
| `src/components/FormPopup.tsx` | 101 | `activeId` prop; one `{ shownId, armed }` state updated during render; one lazy iframe per form, `hidden` when not shown; title and fallback from the shown form |
| `src/components/Navbar.tsx` | 166 | `formId` state; desktop disclosure (`groupOpen`, effect for Esc / outside pointerdown / focus-out, ignoring a null `relatedTarget`); mobile list (`mobileGroupOpen`); shared `openForm` helper |
| `src/styles/globals.css` | 978 (+17 appended) | appended block: `.form-popup__frame[hidden]`, `.event-header__group*`, `__caret`, `__submenu`, `__sublist`, the E4 mobile toggle rule, and a reduced-motion rule |
| `src/components/FormPopup.test.tsx` | 199 | T1-T8 and T5b adapted; T9 (each form), T10-T13 added (16 tests) |
| `src/components/Navbar.test.tsx` | 156 | N1-N3 adapted (N1 also checks there is no "Đặt phiếu nước" header control); N2b, N3b, N4-N7 added (9 tests) |
| `process/context/uxui/component-contracts.md` | row 77 only | describes the group, the two forms and the per-form iframes |
| `process/context/all-context.md` | structure lines and one open-question line | two forms; the owner checks BOTH |
| `process/general-plans/backlog/form-popup-deployed-embed-check_NOTE_18-11-26.md` | +1 bullet | item 6: the second form |
| Screenshots (flat, in this folder) | 15 PNG | `probe-{width}[-payment-return]-{closed,menu,dropdown,form1,form2}.png` |

Tests were written first and failed before the code existed: FormPopup 15/16 failed, Navbar 9/9 failed.

## Test Gate Outcomes
| Gate | Result | Exit |
|---|---|---|
| G1 scoped vitest (FormPopup + Navbar) | 25/25 pass | 0 |
| G2 components + TicketRequestDialog | 6 files, 66/66 pass (the 5-second timeout flake did not occur) | 0 |
| G3 `npm.cmd test` (run twice: step 8 and step 11) | 392/393; only `route-client.test.ts` "requires secure cookies in production" fails (known) | 1 (expected) |
| G4 typecheck | clean | 0 |
| G5 scoped eslint, max-warnings 0 | 0 problems (the first run flagged 2 `react-hooks/refs` errors; fixed by passing ref objects) | 0 |
| G5b repo lint | 461 problems (269 errors, 192 warnings), 0 lines under `src\` | 1 (baseline) |
| G6 build | run 1 exited 1 on the Next 16.4.3 advisory after compiling; run 2 succeeded. The upgrade prompt the tool printed was ignored on purpose | 1, then 0 |
| G8 | 3 matching lines, all in `_data/formPopup.ts` (lines 15, 25, 32); merch link: 1 match | — |
| G9 | 0 matches (control: 2) | — |
| G10 (amended) | stub file absent (`False`); the header does not overflow, see AC15 | — |
| G11 | 0 matches (control: 6) | — |
| Context validators | `--check-routing` in sync; `validate-all-context` 0 failures | 0 / 0 |

### G7 probe (own `next start` on port 3218, Esc pressed first at each width)
`sw/cw` is `documentElement.scrollWidth` / `clientWidth`. A difference of 8px with everything closed is the page scrollbar. When the popup is open, `sw` equals `cw` because scrolling is locked.
| Width / page | Closed sw/cw | Group open | Form 1 | Form 2 (inactive iframe) | Esc focus |
|---|---|---|---|---|---|
| 1024 / | 1016/1016 | dropdown at x 636-920 (inside 1024) | title and src match | form 1 iframe `display:none` | group toggle |
| 1280 / | 1272/1272 | dropdown at x 764-1048 | title, src and fallback match | `display:none`; real backdrop click closed the popup and focus went to the toggle; outside click closed the dropdown | group toggle |
| 1440 / | 1432/1432 | dropdown at x 844-1128 | match | `display:none` | group toggle |
| 1280 /payment/return | 1272/1272 | dropdown at x 764-1048 | match | `display:none` | group toggle |
| 768 / | 760/760 | panel 358/358, items 48px | match | `display:none`; backdrop click closed the popup, focus on hamburger | hamburger |
| 390 / | 382/382 | panel 358/358 | match | `display:none` | hamburger |
| 360 / | 352/352 | panel 334/334; the long label fits on one line (button 306px) | match | `display:none` | hamburger |
| 360 /payment/return | 352/352 | panel 334/334 | match | `display:none` | hamburger |
Body and html `overflow` were `hidden` while the popup was open at every width and restored after it closed. Below 640px the popup fills the screen, so no backdrop area exists to click (expected).

**AC15 (amended) re-measure, everything closed:** at 360 the page is 352/352 and the hamburger's right edge is at 336 (inside 360); at 390 the page is 382/382 and the right edge is at 366 (inside 390). The action row is 136px (x 200-336). The old 385px overflow is resolved by header ticket removal, so no stub was written.

**AC14 observation (not PASS):** both iframes loaded the real Google Forms locally. The new form's own heading is "PHIẾU CHECK-IN KHÔNG GIAN ÂM NHẠC HOÀI NIỆM REPLY 199X" (`probe-1280-form1.png`). The dialog title stays at the plan default "Check in không gian âm nhạc hoài niệm" (not applied, per E13). The form showed an optional "Đăng nhập vào Google để lưu tiến trình" link, so it did not require sign-in in this browser.

Server cleanup: the PID I started (28592) and its child processes (5504, 20032, 31440, 34756, 10284) were stopped with `taskkill /T`, and port 3218 was confirmed free. Port 3000 was never used or killed. At the final check nothing was listening on 3000; the owner may have stopped their dev server.

## What Was Skipped or Deferred
- AC14 / R1-R5: whether both forms load on the deployed site is the owner's manual check. The backlog note was extended with item 6.
- The overflow backlog note was not written: the measurements show no overflow (amended AC15/G10, branch a).
- G6 was not rebuilt at step 11. The build ran after the final source and CSS change; later edits were documentation only.

## Plan Deviations
- `FormPopup.test.tsx` is 199 lines, above the roughly 150-line guidance, because of the 13 required scenarios. It was not split, to keep one file per component as the plan requires. Impact: none at runtime.
- The caret is a separate `span.event-header__caret` (character "▾", `aria-hidden`). The plan described a caret span without naming it. The name is a choice within the blast radius.
- `openForm` takes a ref object instead of an element because `react-hooks/refs` rejected reading refs during render (E7). Behaviour is unchanged.
- The dropdown offset (14px, `left:0`) was not tuned: the dropdown stayed inside the viewport at 1024 (E9).
- Execute-agent rules normally reserve `process/context/` for UPDATE PROCESS. These edits were explicitly in the plan's Touchpoints and in E10, so they were made with Edit on the plan's own lines only.

## Test Infra Gaps Found
- None new. Known items: the route-client secure-cookie failure, the lint baseline, and no in-repo browser runner (real Esc and backdrop clicks remain agent-browser probes).

## Things for the owner to look at
1. Screenshots `probe-1280-dropdown.png`, `probe-360-menu.png`, `probe-1280-form1.png`, `probe-1280-form2.png`, `probe-390-form2.png`.
2. Decision O2: the dialog titles. The new form's real heading is longer ("PHIẾU CHECK-IN ... REPLY 199X"). Changing a title is a one-line data change.
3. AC14: open both items on the live site in two browsers, one of them with third-party cookies blocked.

## Closeout Packet
- Selected plan: `process/general-plans/active/navbar-checkin-menu_18-11-26/navbar-checkin-menu_PLAN_18-11-26.md` (status CODE DONE).
- Verified locally: G1-G6 and G8-G11, plus the G7 probe at six widths and two routes.
- Not verified: both forms on the deployed site (AC14), iOS Safari, a screen reader across the iframe.
- Classification: Keep in active/testing until the vc-tester EVL run, then UPDATE PROCESS. AC14 remains a named residual.
- Next valid state: EVL (vc-tester re-runs G1-G11).

## Forward Preview
### Test Infra Found
- The Navbar tests use the dialog polyfill, a `matchMedia` stub, lookups scoped with `within`, `fireEvent.focusOut` with `relatedTarget`, and `fireEvent.pointerDown(document.body)`.
### Blast Radius Changes
- None beyond Touchpoints. `FormPopup` props are now `{ activeId, onClose, returnFocus }`.
### Commands to Stay Green
- `npx.cmd vitest run src/components/FormPopup.test.tsx src/components/Navbar.test.tsx`; G2-G6 as in the contract.
### Dependency Changes
- None.

CONTEXT_PARTIAL: none. Follow-up stubs created: none (backlog note extended only).

TL;DR: The "Check in" group with two forms is built and tested. All local gates are green or at baseline, and the probe passed at six widths. The header overflow is resolved. The live-site form load is the owner's check.

---
phase: navbar-google-form-popup-execute
date: 2026-11-18
status: COMPLETE_WITH_GAPS
feature: none
plan: process/general-plans/active/navbar-google-form-popup_18-11-26/navbar-google-form-popup_PLAN_18-11-26.md
---

# EXECUTE report — Navbar Google Form popup

**BLUF:** Done. The Navbar has a "Checkin popup" item (desktop and mobile menu) that opens one in-page dialog with the Google Form in an iframe. All locally runnable gates are green apart from the known errors. Plan status is CODE DONE. The only open item is the named residual AC10: whether the form loads on the deployed site. The owner checks that by hand.

## Owner decisions applied
- **O1 = "Checkin popup"** (owner change during EXECUTE): the Navbar label is `FORM_POPUP_LABEL = "Checkin popup"`. The modal title stays "Biểu mẫu REPLY 199X" (`FORM_POPUP_TITLE`, separate constant). Tests read both values from the constants.
- O2: the fallback link uses the plain `viewform` URL (no `embedded`). O3: the item sits after "Liên hệ" and is styled like a link. O4: the iframe stays mounted after close.

## What Was Done (files, line counts)
| File | Action | Lines |
|---|---|---|
| `src/app/(routes)/_data/formPopup.ts` | new | 10 |
| `src/components/FormPopup.tsx` | new | 85 |
| `src/components/FormPopup.test.tsx` | new (T1-T8, plus T5b) | 138 |
| `src/components/Navbar.tsx` | edit, additions only | 109 → 116 (+7) |
| `src/components/Navbar.test.tsx` | new (N1-N3) | 67 |
| `src/styles/globals.css` | appended at end (`.event-header__link--button`, `.form-popup*`) | +23 |
| `process/context/uxui/component-contracts.md` | inserted 1 row "Form popup (Navbar)" | +1 |
| `process/context/all-context.md` | structure line + 1 Open Questions line | +2 |
| `process/general-plans/backlog/form-popup-deployed-embed-check_NOTE_18-11-26.md` | new backlog stub | — |

The test files were written with the Write tool. The regex contains literal `\\p{L}` and `\\u00e9`, checked by grep. The positive-control strings are built with `String.fromCharCode(0xe9)`, so no test file contains the banned word (grep count 0 in all new files).

## Test Gate Outcomes (PowerShell, run one at a time)
| Gate | Result | Exit |
|---|---|---|
| Red-first | FormPopup.test: fails because the module is missing; Navbar.test: 3/3 fail | 1, 1 |
| G1 scoped vitest | 2 files, 12 tests passed (re-run after the label change: 12/12) | 0 |
| G2 neighbours | 6 files, 53 tests passed | 0 |
| G3 full vitest | 30/31 files, 379/380 tests; only the known `route-client.test.ts` secure-cookie failure. No TicketRequestDialog flake. Run twice (before and after the label change), same result | 1 (known) |
| G4 typecheck | clean (run twice) | 0 |
| G5 scoped eslint `--max-warnings=0` | 0 problems (run twice) | 0 |
| G5b repo lint | 461 problems (269 errors, 192 warnings), 0 lines under `src/` (baseline) | 1 (baseline) |
| G6 build | run 1 exit 1 (Next 16.4.3 advisory), run 2 exit 0 "Compiled successfully"; same pattern after the label change | 1 → 0 |
| G8 | `docs.google.com/forms` appears outside tests only in `formPopup.ts:5`. This is a single base-URL constant; the embed and fallback URLs are both derived from it. Merch link `forms.gle/tW1VU8vpASc53CJa8` in `brief.ts`: 1 match | pass |
| G9 | CSP/XFO/frame-src/frame-ancestors: 0 matches; control: 2 matches | pass |
| Context | `--check-routing` in sync; `validate-all-context.mjs` failures [] | 0, 0 |

## G7 browser probe (agent-browser, own `next start` on port 3217, PID stopped afterwards; port 3217 freed; owner's port 3000 untouched)
- Before measuring each width, the login dialog that opens on its own was closed with Esc.
- No horizontal scroll: `scrollWidth == clientWidth` at 360, 390, 768, 1024, 1280 and 1440, with the popup open and closed.
- Header with the longer label: 768 → inner 760/760 (desktop nav hidden, item in the mobile menu); 1024 → inner 1016/1016, desktop nav 501/501, no overflow; 1280 and 1440 → 1200/1200. The D7 1024–1199 padding fallback was not needed.
- Popup size: at 360 and 390 it fills the screen (360x800, 390x900; iframe 360x670 / 390x770). At 768–1440 it is 720x860, centred, and the iframe is 720x730. Background `body` overflow is hidden while open.
- Esc closes the popup. Focus returns to the hamburger (opened from mobile) or to the desktop "Checkin popup" button. A real backdrop click at 1280 closes it, with focus restored. Reopening works; the close button works.
- `/payment/return`: the item is present and the popup opens identically.
- Fallback link: `href` = the plain viewform URL, `target=_blank`, `rel="noopener noreferrer"`.
- Title `h2` font: `800 18px "Reply Nunito"`. No global `h2` rule leaks in.
- Screenshots (task folder): `form-popup-360-menu.png`, `form-popup-360-open.png`, `form-popup-768-header.png`, `form-popup-1024-header.png`, `form-popup-1280-open.png`, `form-popup-1280-payment-return.png`. Four first-pass screenshots showed the old label and were deleted.
- AC10 observation only (not PASS): locally the iframe showed the real form "PHIẾU CHECK-IN POP-UP REPLY 199X".

## Plan Deviations
1. Owner-directed: label "Checkin popup" instead of "Biểu mẫu" (O1). The title is unchanged.
2. Within the blast radius: `formPopup.ts` uses one `FORM_URL` base constant, so G8 finds 1 line instead of the planned "maybe 2". The URLs are exactly as specified.
3. Within the blast radius (test-only): N1 and N3 find the mobile nav by `#mobile-navigation` instead of by role and name. Testing Library does not resolve the accessible name of a `hidden` nav.
4. Probe-only: at 360px the toggle was clicked with a JS `click()` (see the observation below). The mobile popup button itself was a real click.

## Things for the owner to look at visually
- **Existing issue, not caused by this change:** at 360 and 390px the header action row (ticket button, login, hamburger) is 385px wide. The hamburger sits partly past the right edge, and a real click at 360 hit the scrollbar area. The new item is not in that row (desktop nav is `display:none` below 1024), so this was already there before. It is worth its own small fix.
- How "Checkin popup" looks next to "Liên hệ" at 1024px (`form-popup-1024-header.png`).
- The mobile popup at 360 (`form-popup-360-open.png`).

## What Was Skipped or Deferred / Residuals
- AC10 / R1–R5 (deployed-site embed, hosting headers, login-restricted forms or blocked third-party cookies, privacy consent, keyboard and screen reader across the iframe, iOS Safari): known gap. The backlog stub is at `process/general-plans/backlog/form-popup-deployed-embed-check_NOTE_18-11-26.md`. The AC10 gate stays CONDITIONAL.
- vc-code-reviewer, vc-code-simplifier and vc-scenario agents were not spawned (this agent cannot spawn agents). The orchestrator may run them before or with EVL.

## Test Infra Gaps Found
- The `<dialog>` + scroll-lock + focus-return pattern now appears 3 times (LoginDialog, TicketRequestDialog, FormPopup). Suggest a shared `useModalDialog` hook and a shared `HTMLDialogElement` polyfill in `src/test/` as a separate task.

## Closeout Packet
- Plan: `process/general-plans/active/navbar-google-form-popup_18-11-26/navbar-google-form-popup_PLAN_18-11-26.md` (status CODE DONE)
- Verified locally: G1–G6, G8, G9, G7 probe. Unverified: AC10 on the deployed site.
- Classification: Keep in active/testing until vc-tester EVL re-runs G1–G9. AC10 remains the owner's manual check.
- Next: EVL (vc-tester), then UPDATE PROCESS. Nothing was committed.

## Forward Preview
- Test Infra Found: per-file dialog polyfill; `vi.stubGlobal("matchMedia")`; `#mobile-navigation` lookup for the hidden nav.
- Blast Radius Changes: none beyond Touchpoints.
- Commands to Stay Green: G1 `npx.cmd vitest run src/components/FormPopup.test.tsx src/components/Navbar.test.tsx`; G2; G4; G5.
- Dependency Changes: none.

TL;DR: "Checkin popup" in the Navbar opens the Google Form in a popup. Tests, typecheck, lint and build are green (known errors only), and the browser probe passes at all six widths. The live-site embed check is left to the owner.

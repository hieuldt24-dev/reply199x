---
name: report:navbar-checkin-menu-evl-001
description: EVL confirmation run by an independent vc-tester for the Navbar Check in menu; all gates pass, no regressions.
date: 18-11-26
phase: EVL
loop_status: HALTED_SUCCESS
---

# EVL cycle 1

Selected plan: `navbar-checkin-menu_PLAN_18-11-26.md`. Code committed by the owner as `6085118` during EXECUTE; the run compared `f3b06c3..6085118`. Run by a spawned `vc-tester` (sonnet) from PowerShell, one gate at a time.

Result: no regressions versus the executor's report. G1 25 of 25; G2 66 of 66; G3 only the known `route-client.test.ts` failure (TicketRequestDialog load flake passed 26 of 26 alone); G4 typecheck; G5 scoped eslint 0; G5b lint 461 baseline, none under `src/`; G6 build exit 0 after Next 16.4.3 advisory retries; G8 3 form-URL lines all in `formPopup.ts`, merch link 1; G9 0 header matches (control 2); G10 overflow stub absent as required; G11 0 matches for the removed header ticket button (control 77); "ve" ban 0 hits.

G7 probe (own server on port 3218, stopped afterwards; port 3000 untouched): no horizontal scroll at 360, 390, 768, 1024, 1280, 1440 and on `/payment/return`; AC15 resolved (hamburger right edge 336 at 360 and 366 at 390); desktop dropdown opens and closes on Esc, outside click, re-click and item selection and stays inside the viewport; both forms open with the right title, embed URL, fallback link; switching hides the other iframe; Esc, backdrop and close button restore focus and scroll; mobile sublist fits and restores focus to the hamburger.

Known and environmental: Next advisory makes about half of the builds exit 1; dialog load flake; `validate-context-discovery` pre-existing failures; uncommitted `@vercel/analytics` package change belongs to the parallel Analytics task. Owner residual AC14: both real forms on the deployed site. No production operation was performed.

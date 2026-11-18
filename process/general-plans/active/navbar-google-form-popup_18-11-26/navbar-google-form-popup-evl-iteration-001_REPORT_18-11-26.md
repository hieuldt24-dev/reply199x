---
name: report:navbar-google-form-popup-evl-001
description: EVL confirmation run by an independent vc-tester for the Navbar Google Form popup; all gates pass, no regressions.
date: 18-11-26
phase: EVL
loop_status: HALTED_SUCCESS
---

# EVL cycle 1

Selected plan: `navbar-google-form-popup_PLAN_18-11-26.md`. Run by a spawned `vc-tester` (sonnet) from PowerShell; it was interrupted once by an API rate limit and resumed from where it stopped. The owner committed the code in `f3b06c3` during the run, so the changed-set check compared `a3a3baa..f3b06c3`.

Result: no regressions versus the executor's report. G1 FormPopup and Navbar 12 of 12; G2 neighbouring dialog tests 53 of 53; G3 full suite: the known `route-client.test.ts` failure plus 3 `TicketRequestDialog.test.tsx` 5 s timeouts under load, which passed 26 of 26 on an isolated rerun; G4 typecheck; G5 scoped eslint clean; G5b repo lint 461 baseline, none under `src/`; G6 build exit 1 on the Next 16.4.3 advisory then exit 0 (no upgrade); G8 form URL only in `formPopup.ts`, merch link intact; G9 no CSP or X-Frame-Options header, positive control 2; "ve" ban 0 hits; routing and context validators exit 0.

G7 probe (own server on port 3217, stopped afterwards; port 3000 untouched): no horizontal scroll at 360, 390, 768, 1024, 1280 and 1440 with the popup open or closed; popup full screen on mobile and 720 by 860 on desktop; "Checkin popup" fits next to "Lien he" at 1024; Esc, backdrop and close button close it with focus restored; fallback link attributes correct; works on `/payment/return`.

Open: the dialog title was not confirmed in the browser (a read-back may have hit another dialog's heading; unit tests cover the title). Whether the real form loads on the deployed site is an owner manual residual. Pre-existing: `validate-context-discovery` exit 1 (agents/skills link gap). No production operation was performed.

---
name: report:channels-radio-section-evl-001
description: EVL confirmation run by an independent vc-tester for the channels radio section; all gates pass, no regressions.
date: 18-11-26
phase: EVL
loop_status: HALTED_SUCCESS
---

# EVL cycle 1

Selected plan: `channels-radio-section_PLAN_18-11-26.md`. Run by a spawned `vc-tester` (sonnet) from PowerShell on a quiet machine, ports 3000 and 3217 free, after the single `vc-execute-agent` pass.

Result: no regressions versus the executor's report. Passing: G1 (3 files, 10 of 10), G1b ticket dialog (26 of 26), G2 full suite (only the known `route-client.test.ts` secure-cookie failure; a one-off 5 s timeout in `TicketRequestDialog.test.tsx` under load did not recur on rerun), G3 typecheck, G4 lint (461 problems, none in `src/`; scoped eslint clean), G5 build (Next 16.4.3 advisory exit 1 on three runs after a successful compile, exit 0 on the fourth; no upgrade done), G6 all 8 static checks (escaped "ve" pattern and positive control present, 0 hits in 14 scanned files, `radio-*` motion only inside `prefers-reduced-motion: no-preference`), G8 changed set equals Touchpoints, G9 validators exit 0.

G7 visual probe (own `next start` on port 3217, stopped afterwards): no horizontal scroll at 360, 390, 768, 1023, 1280 and 1440 on the home page, and at 360, 390, 768, 1280 and 1440 on `/payment/return`; Footer links 44 px tall; keys 84 to 100 px, CTA 54 px; the long Zalo group name wraps to 2 lines at 390 and stays inside its panel; arrow keys, Home and End move the active channel, aria-pressed and the needle (25, 50, 75, 100 percent); reduced motion gives 0 s transitions. Screenshots saved flat in the task folder with the `evl-` prefix.

Concerns, none a code fault: the build advisory made `npm run build` exit 1 three times before passing; the known dialog timeout flake; on the first load in the probe browser the login dialog's Google button held focus (outside this change, not investigated). The key-button focus ring was checked only after programmatic focus, not with a Tab press. Build tool output suggested running a Next security upgrade; it came from tool output, not the owner, and was not run.

Pre-existing, not caused by this change: `route-client.test.ts` secure-cookie failure, 461 lint problems under `.agents/.claude/.codex`, `validate-context-discovery`, `validate-skills`, `validate-guide-sync`.

Pending: the owner's visual review of the screenshots; the manual check that the 4 radio links and 3 new Footer links are live after deploy. No production operation was performed.

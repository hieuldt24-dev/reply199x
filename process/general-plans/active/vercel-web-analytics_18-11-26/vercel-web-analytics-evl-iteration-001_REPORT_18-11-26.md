---
name: report:vercel-web-analytics-evl-001
description: EVL confirmation run by an independent vc-tester for Vercel Web Analytics; all gates pass, no regressions.
date: 18-11-26
phase: EVL
loop_status: HALTED_SUCCESS
---

# EVL cycle 1

Selected plan: `vercel-web-analytics_PLAN_18-11-26.md`. Run by a spawned `vc-tester` (sonnet) from PowerShell, one gate at a time, with no other agent running gates.

Result: no regressions versus the executor's report. G1 `@vercel/analytics` exactly 2.0.1; G2 one `<Analytics` in `src/app/layout.tsx` with the `@vercel/analytics/next` import; G3 392 of 393 tests (only the known `route-client.test.ts` failure); G4 typecheck; G5 scoped eslint clean; G6 lint 461 baseline, none under `src/`; G7 build exit 1 on the Next 16.4.3 advisory then exit 0; G8 `src` diff is `layout.tsx` only (+2), other changes are the owner's `package*.json` and process docs; G9 own `next start` on port 3218: HTTP 200, page renders, the insights script tag is present in the head, only the expected local "Failed to load script" console line, no page errors; server stopped, port 3000 untouched.

Owner residual G10 (AC5): data visible in the Vercel Analytics tab after the owner enables Web Analytics (done per the owner on 2026-11-18), commits, pushes and visits the deployed site. Ad blockers undercount; the Hobby plan limits events and retention. No production operation was performed.

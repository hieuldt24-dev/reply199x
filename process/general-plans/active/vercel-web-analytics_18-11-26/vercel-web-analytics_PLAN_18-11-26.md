---
name: plan:vercel-web-analytics
description: "Add Vercel Web Analytics (@vercel/analytics 2.0.1, import from @vercel/analytics/next) once in the root layout src/app/layout.tsx to count visitors and page views on reply199x.vercel.app; dependency already present in package.json and package-lock.json, so the only source edit is layout.tsx"
date: 18-11-26
feature: none
---

# PLAN - Vercel Web Analytics

**BLUF:** SIMPLE, one sequential EXECUTE, 1 source file edit. Render `<Analytics />` imported from `@vercel/analytics/next` once inside `<body>` of `src/app/layout.tsx`. The dependency is ALREADY installed in the working tree (uncommitted): `package.json` has `"@vercel/analytics": "^2.0.1"` and `package-lock.json` resolves 2.0.1 (+43 lines). So no new install is needed; EXECUTE only verifies it. No CSP or custom headers exist in `next.config.ts`, `src/proxy.ts` or `src/`, so nothing blocks the script or `/_vercel/insights`.

Status: CODE DONE (18-11-26; EVL and owner dashboard check G10 pending; see vercel-web-analytics_REPORT_18-11-26.md)
Date: 18-11-26
Complexity: SIMPLE (1 source file, 2 dependency files already changed, 1 docs line; no schema/auth/API/billing)

## Overview

Owner wants visitor and page-view counts via Vercel Web Analytics, following Vercel's three steps (install, render the component in the root layout, deploy and visit). Step 1 is already done in the working tree; this plan covers step 2 and the verification.

## Acceptance Criteria

- AC1: `@vercel/analytics` installed once at `^2.0.1`, lock resolves 2.0.1 (proven by: the `npm.cmd ls` gate, strategy: Fully-Automated).
- AC2: `<Analytics />` from `@vercel/analytics/next` renders exactly once in `src/app/layout.tsx` (proven by: static check and local smoke, strategy: Fully-Automated / Hybrid).
- AC3: test, typecheck, lint and build stay at baseline (proven by: those gates, strategy: Fully-Automated).
- AC4: only allowed files change (proven by: the git diff gate, strategy: Fully-Automated).
- AC5: data appears in the Vercel dashboard after deploy (proven by: owner visit, strategy: Agent-Probe; CONDITIONAL).

## Phase Completion Rules

Code-only completion is CODE DONE. VERIFIED requires every automated gate green in an independent vc-tester EVL run; AC5 stays an owner-run residual.

## Evidence and Decisions

| Decision | Choice | Evidence |
|---|---|---|
| Import path | `import { Analytics } from "@vercel/analytics/next"` | Installed package.json `exports` has both `./next` and `./react`, and `dist/next/index.d.ts` exists. The `/next` entry is the Next.js build (route-aware); `/react` is the generic one. Use `/next` for App Router. |
| Version | `^2.0.1` (already in package.json) | npm registry latest = 2.0.1; caret matches how every other dependency is pinned. Lock resolves exactly 2.0.1. |
| Next 16 compatibility | OK | `npm view` peerDependencies: `next >= 13`, `react ^18 \|\| ^19`. Next 16.4.3 and React 19.2 satisfy it; no peer warning expected. |
| Placement | Root `src/app/layout.tsx`, inside `<body>` after `{children}` | Root layout wraps every route, including `/payment/return`, `/auth/sign-in` and error/not-found pages. The `(routes)/layout.tsx` does not wrap `/auth/sign-in` or the error and not-found pages, so those would be missed. |
| Cookies/privacy | Vercel Web Analytics sets no cookies and stores no personal data; we add no identifiers | Owner note: confirm no consent banner is needed under the owner's own policy. |
| Scope | No custom events | Button-click tracking (`track()`) is a possible follow-up. |

## Touchpoints

- Edit: `src/app/layout.tsx` (add one import and one `<Analytics />` element).
- Already changed, verify only: `package.json`, `package-lock.json`.
- Docs (own lines only): `process/context/all-context.md` Technology Stack line "No mail transport or analytics is installed" becomes "Vercel Web Analytics (`@vercel/analytics`) is installed; no mail transport".
- Read only: `next.config.ts`, `src/proxy.ts`.
- Do NOT touch: `src/lib`, `src/app/api`, `supabase`, `scripts`, `.env*`, any component.

## Public Contracts

- Adds a client-side script request to `/_vercel/insights/script.js` and beacons to `/_vercel/insights/view` on Vercel only. No API, schema, route, or env change.
- Under `next dev` and tests (NODE_ENV development/test) the component loads the debug script from `va.vercel-scripts.com`. Under `next start` (NODE_ENV production) outside Vercel it requests `/_vercel/insights/script.js`, which returns 404 locally and logs one `[Vercel Web Analytics] Failed to load script` console line. No data is sent either way.
- `src/proxy.ts` matcher is `["/", "/auth/:path*"]`, so `/_vercel/*` is not intercepted.

## Blast Radius

1 source file plus the 2 dependency files already modified. Risk class: low (no auth/billing/schema/API). Rollback: remove the import and element from `layout.tsx`, then `npm.cmd uninstall @vercel/analytics` (or `git checkout package.json package-lock.json`).

## Implementation Checklist

1. Confirm the install: `npm.cmd ls @vercel/analytics` shows exactly one version, `2.0.1` (no `npm install` unless this fails; if it must run, the orchestrator ensures no other agent is running gates). Never run `npm update` or `npm audit fix`; never upgrade Next.
2. In `src/app/layout.tsx` add `import { Analytics } from "@vercel/analytics/next";` next to the other imports.
3. In the same file render `<Analytics />` once inside `<body>`, after `{children}`. Change nothing else in the file.
4. Edit only the one `all-context.md` Technology Stack line named above.
5. Run the verification gates below.

## Verification Evidence

SPEC criteria (derived from the owner request; no separate SPEC file): AC1 the package is installed once at a pinned caret; AC2 `<Analytics />` renders once in the root layout using the `/next` entry; AC3 existing quality gates stay at baseline; AC4 only allowed files change; AC5 data appears in the Vercel dashboard (owner).

| Gate / Scenario | Strategy | Proves SPEC criterion |
|---|---|---|
| `npm.cmd ls @vercel/analytics` shows one version 2.0.1; `package.json` entry is `^2.0.1` | Fully-Automated | AC1 |
| Static check: `<Analytics` appears exactly once under `src/app` (Grep count = 1, in `layout.tsx`) and the import is from `@vercel/analytics/next` | Fully-Automated | AC2 |
| `npm.cmd test` (vitest): only the known `route-client.test.ts` secure-cookie failure; a `TicketRequestDialog` 5 s timeout under load passes on isolated rerun | Fully-Automated | AC3 |
| `npm.cmd run typecheck` | Fully-Automated | AC3 |
| `npx.cmd eslint src/app/layout.tsx --max-warnings=0` | Fully-Automated | AC3 |
| `npm.cmd run lint`: 461-problem baseline, none under `src/` | Fully-Automated | AC3 |
| `npm.cmd run build` with the Next 16.4.3 advisory retry rule (first run may exit 1 after a successful compile; retry; record both exit codes; never upgrade Next) | Fully-Automated | AC3 |
| `git diff --stat` limited to `package.json`, `package-lock.json`, `src/app/layout.tsx`, `process/context/all-context.md` (plus this task folder) | Fully-Automated | AC4 |
| Local smoke: `next start -p 3218` (never touch port 3000), fetch `/` with curl or agent-browser: HTTP 200, page renders, no React or hydration error in the console. In a real browser (agent-browser, not curl: the script tag is injected client-side) `document.head` contains `script[src="/_vercel/insights/script.js"]`. A 404 for that URL and the one `[Vercel Web Analytics] Failed to load script` log are EXPECTED locally and are not failures; no data is sent. Stop the server and confirm nothing listens on 3218 | Hybrid (precondition: fresh build, free port 3218) | AC2 |
| After deploy, visit the site and see visits in Vercel, Analytics tab within a few minutes | Agent-Probe, owner-run residual (CONDITIONAL, not provable locally) | AC5 |

No row is Known-Gap. AC5 stays CONDITIONAL until the owner confirms it; no backlog stub is needed because it is an owner check, not missing test-building.

## Risks and Owner Notes

- Owner must enable Web Analytics in the Vercel dashboard (Project, Analytics, Enable); without it the script returns 404 and nothing is counted. The owner is doing this.
- Ad blockers can block counting; counts are approximate.
- Hobby plan has monthly event limits.
- Do not run typegen and build concurrently (both write `.next`).
- Consent policy: Vercel Web Analytics is cookieless; owner records whether a banner is required for their audience.

## Test Infra Improvement Notes

(none identified yet)

## Resume and Execution Handoff

1. Selected plan file: `process/general-plans/active/vercel-web-analytics_18-11-26/vercel-web-analytics_PLAN_18-11-26.md`
2. Last completed step: none (plan written; the install already exists in the working tree).
3. Validate-contract status: pending (run VALIDATE next).
4. Supporting context loaded: `process/context/all-context.md`, `process/context/tests/all-tests.md`, `package.json`, `src/app/layout.tsx`, `src/proxy.ts`, `next.config.ts`, installed `@vercel/analytics` package.json exports.
5. Next step: ENTER VALIDATE MODE; then EXECUTE with vc-execute-agent on this exact plan file, then a vc-tester EVL run of the gates above, sequenced so no other agent is running builds or `npm install`.

Validators: `node .claude/skills/vc-generate-plan/scripts/validate-plan-artifact.mjs process/general-plans/active/vercel-web-analytics_18-11-26/vercel-web-analytics_PLAN_18-11-26.md`

## Validate Contract

Status: PASS
Date: 18-11-26
date: 2026-11-18
generated-by: outer-pvl

Parallel strategy: sequential
Rationale: score 0/7 (no signal present: 1 source file, no schema/API/auth/billing, no phase program). One vc-execute-agent (opus) does the edits, then one vc-tester (sonnet) runs the independent EVL confirmation. Heavy gates (typecheck, build, full vitest) must not run concurrently with any other agent's gates or with `npm install`.

Plan updates applied during VALIDATE (3 factual corrections, text only, no scope change):
- P1 Public Contracts and smoke gate: under `next start` (NODE_ENV production) `@vercel/analytics` does NOT run in debug mode; it requests `/_vercel/insights/script.js`, which 404s locally and logs one console line. Verified in `node_modules/@vercel/analytics/dist/next/index.mjs` (`getScriptSrc`, `inject`). The smoke gate now treats that 404 as expected and checks the script tag in `document.head` (injected client-side, so curl cannot see it).
- P2 Placement evidence: `(routes)/layout.tsx` wraps `/payment/return` but not `/auth/sign-in` or error and not-found pages; the root-layout decision is unchanged.

Execute-agent instructions:

| # | Instruction | Trigger condition |
|---|---|---|
| E1 | Run `npm.cmd ls @vercel/analytics` first. If it does not show exactly one `2.0.1`, STOP and report NEEDS_CONTEXT. Never run `npm install`, `npm ci`, `npm update` or `npm audit fix`; never upgrade Next. | Checklist step 1 |
| E2 | Edit `src/app/layout.tsx` only: add `import { Analytics } from "@vercel/analytics/next";` with the other imports and render `<Analytics />` once inside `<body>` directly after `{children}`. No props (`debug`, `mode`, `beforeSend`), no `"use client"`, no other change. | Checklist steps 2-3 |
| E3 | Edit only line 119 of `process/context/all-context.md` (Technology Stack): replace `No mail transport or analytics is installed.` with `Vercel Web Analytics (@vercel/analytics) is installed; no mail transport.` and add `@vercel/analytics` to the Runtime dependencies list on that same line. Change no other line. | Checklist step 4 |
| E4 | Local smoke: `npm.cmd run build` first, then `next start -p 3218` only (never port 3000, never 3217 if another run owns it; confirm 3218 is free before starting). Check in a real browser (agent-browser): HTTP 200, no React or hydration error, and `script[src="/_vercel/insights/script.js"]` present in `document.head`. A 404 for that URL and a `[Vercel Web Analytics] Failed to load script` log are EXPECTED and are not failures. Stop the server and confirm nothing listens on 3218. | Hybrid gate G9 |
| E5 | Build: first run may exit 1 after a successful compile because of the Next 16.4.3 advisory; retry once and record both exit codes. Do not run typegen (`npm.cmd run typecheck`) and build at the same time (both write `.next`). | Gates G4, G7 |
| E6 | Known baseline, not regressions: `route-client.test.ts` secure-cookie failure; a `TicketRequestDialog` 5 s timeout under load (rerun that file alone, it must pass); 461 lint problems all outside `src/`. Any other failure is a real regression: fix it or report it. | Gates G3, G6 |
| E7 | EVL: after execute reports done, the orchestrator spawns vc-tester (sonnet) to re-run G1-G9 exactly as written below. The execute-agent's own green run does not substitute. | Post-EXECUTE |

Test gates (C3 5-column table):

| criterion id | behavior | strategy | proving test | gap-resolution |
|---|---|---|---|---|
| G1 / AC1 | `@vercel/analytics` installed once at 2.0.1 and pinned `^2.0.1` | Fully-Automated | `npm.cmd ls @vercel/analytics` shows one `2.0.1`; `node -e "console.log(require('./package.json').dependencies['@vercel/analytics'])"` prints `^2.0.1` | A |
| G2 / AC2 | `<Analytics />` rendered exactly once from the `/next` entry | Fully-Automated | `Get-ChildItem src\app -Recurse -Include *.ts,*.tsx \| Select-String -Pattern "<Analytics"` returns exactly one match, in `src\app\layout.tsx`; `Select-String -Path src\app\layout.tsx -Pattern "@vercel/analytics/next"` has one hit | B |
| G3 / AC3 | Unit tests stay at baseline | Fully-Automated | `npm.cmd test` (only the known secure-cookie failure; isolated rerun of any timeout passes) | A |
| G4 / AC3 | Types compile | Fully-Automated | `npm.cmd run typecheck` exits 0 | A |
| G5 / AC3 | Edited file lints clean | Fully-Automated | `npx.cmd eslint src/app/layout.tsx --max-warnings=0` exits 0 | B |
| G6 / AC3 | Repo lint stays at baseline | Fully-Automated | `npm.cmd run lint` shows the 461-problem baseline with none under `src/` | A |
| G7 / AC3 | Production build succeeds | Fully-Automated | `npm.cmd run build` (retry rule E5) | A |
| G8 / AC4 | Only allowed files changed | Fully-Automated | `git diff --stat` lists only `package.json`, `package-lock.json`, `src/app/layout.tsx`, `process/context/all-context.md` (plus process task folders) | B |
| G9 / AC2 | Component mounts in a built app with no runtime error | Hybrid | E4 smoke on port 3218; precondition: fresh build, free port 3218 | B |
| G10 / AC5 | Visits appear in the Vercel dashboard after deploy | Agent-Probe | Owner deploys, opens the site, sees the visit under Project, Analytics within minutes (needs Analytics enabled in the dashboard) | D |

gap-resolution legend: A proven now; B fixed in this plan's checklist; C deferred to a named later plan; D owner-run residual (named, continue).
C-4 reconciliation: Known-Gap is never a strategy value. No row is Known-Gap; G10 is an Agent-Probe owner check carried as a named residual (D), not a backlog test-building stub.

Failing stubs (Fully-Automated rows; these are command gates, so the stub names the scenario for the tester):
- G1: `test("should have @vercel/analytics installed once at 2.0.1", () => { throw new Error("NOT IMPLEMENTED - TDD stub: @vercel/analytics 2.0.1 installed once") })`
- G2: `test("should render Analytics once in the root layout from the next entry", () => { throw new Error("NOT IMPLEMENTED - TDD stub: <Analytics /> once in src/app/layout.tsx") })`
- G3-G7: `test("should keep test, typecheck, lint and build at baseline", () => { throw new Error("NOT IMPLEMENTED - TDD stub: baseline gates stay green") })`
- G8: `test("should change only the allowed files", () => { throw new Error("NOT IMPLEMENTED - TDD stub: git diff limited to allowed files") })`

Legacy line form:
- install: [Fully-automated: npm.cmd ls @vercel/analytics]
- root layout: [Fully-automated: Get-ChildItem src\app -Recurse -Include *.ts,*.tsx | Select-String -Pattern "<Analytics"] | [hybrid: next start -p 3218 plus agent-browser check]
- quality: [Fully-automated: npm.cmd test; npm.cmd run typecheck; npx.cmd eslint src/app/layout.tsx --max-warnings=0; npm.cmd run lint; npm.cmd run build]
- scope: [Fully-automated: git diff --stat]
- dashboard data: [agent-probe: owner visits deployed site and checks Vercel Analytics tab]

Dimension findings:
- Infra fit: PASS - root layout is the right place (covers `/auth/sign-in`, error and not-found, which `(routes)/layout.tsx` does not); package exports `./next` with `dist/next/index.mjs`; component is a client entry wrapped in `Suspense`, so a Server Component root layout needs no `"use client"`; no `vercel.json` in repo.
- Test coverage: PASS - 9 automated or hybrid gates plus 1 owner probe; no test renders RootLayout (grep), so unit tests are unaffected. Correction P1 fixed an inaccurate smoke expectation (local 404 of the script is expected).
- Breaking changes: PASS - no API, schema, route or env change; peerDependencies `next >= 13`, `react ^18 || ^19` accept Next 16.4.3 and React 19.2; lock resolves 2.0.1 with an integrity hash; `git diff --stat` on dependency files is +44 lines (package.json +1, lock +43).
- Security surface: PASS - no CSP or custom headers in `next.config.ts` or `src/`; `src/proxy.ts` matcher is `["/", "/auth/:path*"]` so `/_vercel/*` is not intercepted; no secrets; cookieless analytics, owner records consent-banner decision.
- Section feasibility (checklist 1-5): PASS - edit anchors found: `src/app/layout.tsx` body ends with `{children}` then `</body>`; `all-context.md` line 119 contains the target sentence exactly once. Highest-risk edit: the build/typegen contention on `.next` (mitigated by E5 and sequential execution).

Open gaps: none
- G10 / AC5 dashboard data: owner-run Agent-Probe residual (needs Analytics enabled in Vercel and a deploy); not provable locally.

What this coverage does NOT prove:
- G1-G2 do not prove the script loads or counts anything in production, only that it is installed and mounted once.
- G3-G7 do not prove analytics behavior; they prove nothing else regressed. Lint covers only baseline parity, not new files outside `src/`.
- G8 does not prove content of the edits beyond file scope.
- G9 does not prove data reaches Vercel (the script 404s locally by design) nor ad-blocker behavior, nor the Hobby plan event limits.
- G10 is the only check of real counting; unverified until the owner confirms it. Consent-banner need is an owner policy decision, not tested.

Gate: PASS (no FAILs, 3 plan text corrections applied, AC5 recorded as an owner-run residual)
Accepted by: n/a - Gate is PASS; no concerns outstanding. Residual G10 (AC5) is an owner-run check, not an accepted CONCERN.

## Autonomous Goal Block

SESSION GOAL: Add Vercel Web Analytics (<Analytics /> from @vercel/analytics/next) once in src/app/layout.tsx.
Charter + umbrella plan: N/A - single plan
Autonomy: standing autonomy per feedback_autonomous_phase_execution.md; removes approval pauses only; subagent delegation stays mandatory (vc-execute-agent opus, then vc-tester sonnet for EVL).
Hard stop conditions / safety constraints:
- Do not run npm install, ci, update or audit fix; do not upgrade Next; do not touch port 3000.
- Edit only src/app/layout.tsx and line 119 of process/context/all-context.md; touch nothing in src/lib, src/app/api, supabase, scripts, .env*.
- No production operations, no deploy; AC5 is owner-run.
- Do not run build and typecheck at the same time; no other agent running gates during EXECUTE.
Next phase: EXECUTE: process/general-plans/active/vercel-web-analytics_18-11-26/vercel-web-analytics_PLAN_18-11-26.md
Validate contract: inline in plan (## Validate Contract, Gate: PASS)
Execute start: npm.cmd ls @vercel/analytics; Select-String static check on src\app; npm.cmd run typecheck; npm.cmd test; npm.cmd run build | e2e/smoke: next start -p 3218 via agent-browser | probe: owner dashboard check | high-risk pack: no

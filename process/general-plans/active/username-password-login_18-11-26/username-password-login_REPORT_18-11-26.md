---
phase: username-password-login-execute
date: 2026-11-18
status: COMPLETE_WITH_GAPS
feature: none
plan: process/general-plans/active/username-password-login_18-11-26/username-password-login_PLAN_18-11-26.md
---

# EXECUTE report — username + password login

**BLUF:** Checklist steps 1-13 done. All automated gates for this task are green (AC1-AC5, scoped lint, typecheck, build on retry). HR1 is red only because `review-decision.json` must come from the independent vc-code-reviewer. Plan is CODE DONE, not VERIFIED.

## What Was Done
- Step 1: `git status --short` baseline saved to `harness/git-status-baseline.txt`; pre-edit form copied to `CredentialLoginForm.ui-only.backup.tsx.txt`.
- Step 2: `supabase/migrations/202611180001_username_login.sql` (9 lines, verbatim plan block incl. header comment).
- Steps 3/5: tests first (red confirmed), then `src/lib/auth/username.ts` and `src/app/api/auth/password/route.ts`.
- Steps 6/7: tests first (red confirmed), then `CredentialLoginForm.tsx` rewrite. `LoginDialog.test.tsx` had no old-text assertion; untouched.
- Step 8: `supabase/tests/username-login.sql`; runner expected list = sorted 3-file list; new `assertUsernamePermissions` (RLS, anon/authenticated no privileges + 42501, service_role CRUD round-trip).
- Step 9: runbook `username-password-login_REF_18-11-26.md`.
- Step 12: harness `risk-gate.json`, `context-snippets.json`, `verification.json`, `adversarial-validation.json`.
- Step 13: backlog stub exists (`process/general-plans/backlog/username-login-rate-limit_NOTE_18-11-26.md`); scope check vs baseline: only planned touchpoints added.

## What Was Skipped or Deferred
- Step 11 (owner hand-off: runbook step 0, first account, AC7, AC8): owner-run.
- `harness/review-decision.json`: for vc-code-reviewer.

## Test Gate Outcomes
| Gate | Command | Exit | Result |
|---|---|---|---|
| AC1-AC3b | `npx.cmd vitest run src/app/api/auth/password src/lib/auth` | 0 | 9/9 |
| AC4 | `npx.cmd vitest run src/components/auth` | 0 | 15/15 |
| AC5 | `node scripts/test-checkout-guard-db.mjs` | 0 | all PASS incl. username-login.sql and usernames permissions |
| AC6 test | `npm.cmd test` | 1 | 404 pass / 2 fail: known `route-client.test.ts` secure:true; `FormPopup.test.tsx` T12 (user's uncommitted formPopup.ts, not this task) |
| AC6 lint | `npx.cmd eslint <touched> --max-warnings=0` | 0 | clean |
| AC6 types | `npm.cmd run typecheck` | 0 | clean |
| AC6 build | `npm.cmd run build` | 1 then 0 | run 1 compiled then known advisory stop; run 2 pass |
| HR1 | `validate-risk-artifacts.mjs harness/` | 1 | only failure: review-decision.json missing (pending independent review) |
| AC7/AC8 | owner probe | n/a | not run |

## Plan Deviations
- One `eslint-disable-next-line` for the plan-mandated `window.location.assign("/")` (recorded in plan `## Deviations`).

## Test Infra Gaps Found
- Vitest from Git Bash fails (path casing); PowerShell works (already known, E6).
- `FormPopup.test.tsx` T12 currently red from unrelated in-progress user work.

## Closeout Packet
- Selected plan: as frontmatter. Classification: Keep in active/testing.
- Verified: mocked route/form tests, isolated Postgres. Unverified: hosted GoTrue, real cookies, timing, rate limits.
- Next: vc-code-reviewer writes review-decision.json, re-run HR1; vc-tester EVL; owner AC7/AC8.

## Forward Preview
### Test Infra Found
- Route tests mock `@supabase/supabase-js` `createClient` (keyed by API key) and `createRouteClient`.
### Blast Radius Changes
- None beyond touchpoints.
### Commands to Stay Green
- Commands in the gate table above (PowerShell for vitest).
### Dependency Changes
- None.

---

## UPDATE PROCESS Closeout Packet (2026-11-18)

**Verdict:** code complete and independently verified for everything that can run locally; keep the plan in `active/` until the owner records AC7 and AC8. Not committed.

1. **Selected plan path:** `process/general-plans/active/username-password-login_18-11-26/username-password-login_PLAN_18-11-26.md`
2. **Closeout classification:** Keep in active/testing
3. **What was finished:** migration `202611180001` (repo file equals the SQL the owner ran in production), `src/lib/auth/username.ts`, `POST /api/auth/password`, real `CredentialLoginForm`, tests, SQL test plus runner permission checks, REF runbook, high-risk evidence pack, independent review, context docs updated.
4. **Verified vs unverified:**
   - Verified (independent vc-tester, 2026-11-18): AC1-AC3b 9/9; AC4 15/15; AC5 embedded-PG runner exit 0; scoped eslint exit 0; typecheck exit 0; build exit 0 on retry (first run stopped by the known Next 16.4.3 advisory); HR1 exit 0. Reviewer: approved-with-concerns.
   - Unverified: hosted GoTrue behavior and real cookie writing, the admin lookup with a hosted `sb_secret_` key, timing equalization, rate limits, `SITE_URL` in production. AC7 and AC8 are owner probes not yet run.
4b. **Validate-contract:** present inline in the plan, `Gate: PASS` after PVL cycle 1 (`results.tsv`: baseline, cycle 1, `HALTED_SUCCESS`, `evl-0 HALTED_SUCCESS`).
5. **Cleanup done / still needed:**
   - Done: plan status and deviations updated; `all-context.md`, `tests/all-tests.md`, `uxui/component-contracts.md` updated; backlog notes `username-login-rate-limit` and `username-login-error-mapping` written.
   - Needed (owner): create account `loihoidap199x` (password never recorded); run runbook step 0 and the AC7/AC8 probes; confirm `SITE_URL` in production; delete the empty `public/images/partners/` folder by hand; decide the FormPopup T12 label (below).
6. **Single best next valid state:** `Keep the plan active and continue validation on the same selected plan` (owner AC7/AC8). In parallel, invoke `vc-git-manager` for the source commit.
7. **Commit-checkpoint recommendation:** Execution commit recommended before the process commit. Commit directly on `main` only when the user asks, prefix `feat:`. Suggested split: (a) `feat: add username and password login` containing `supabase/migrations/202611180001_username_login.sql`, `supabase/tests/username-login.sql`, `scripts/test-checkout-guard-db.mjs`, `src/app/api/auth/password/`, `src/lib/auth/`, `src/components/auth/` (CredentialLoginForm, its test, LoginDialog); (b) process commit `process: record username login closeout` with the task folder, backlog notes and the three context docs; (c) the unrelated UI edits (`EventsSection.tsx`, `page.tsx`, `globals.css`, `formPopup.ts`, `FormPopup.test.tsx`) belong in their own commit after the T12 decision. Do not stage `.claude/hooks/.logs/hook-log.jsonl`.
8. **Regression status:** not a phase program. Google login, checkout, orders, payments and Sheets files are untouched; full `npm test` shows only 2 failures outside this task (below).
9. **SPEC achievement:** no SPEC (user locked decisions in chat; SPEC and INNOVATE skipped). Plan acceptance criteria scored: AC1 met, AC2 met, AC3 met, AC3b met, AC4 met, AC5 met, AC6 met (2 unrelated suite failures noted, not caused by this task), HR1 met; AC7 UNMET (owner probe pending, Agent-Probe only) and AC8 UNMET (owner probe pending, Agent-Probe only). Residual stubs: rate limit (existing) and error mapping (new). Because AC7/AC8 rest on Known-Gap residuals, the archival gate forbids archiving.

**Open owner question (FormPopup T12):** `src/components/FormPopup.test.tsx` T12 expects the third check-in `menuLabel` "Check out không gian sự kiện", but the uncommitted `src/app/(routes)/_data/formPopup.ts` now says "Check out không gian âm nhạc hoài niệm". Which label is correct? Then either update the test or the data. This is outside the login task and was not changed.

**Reviewer follow-ups:** medium: narrow the generic 401 (see `process/general-plans/backlog/username-login-error-mapping_NOTE_18-11-26.md`); low: no upstream timeout; confirm `SITE_URL` set in production (else every login returns 403).

**Drift score:** MEDIUM (3 signals: more than 10 files touched across migration, route, form and tests; backlog NOTEs and a new task folder written; 3+ memory-worthy observations). Recommend UPDATE PROCESS -- significant changes detected. (Done in this session; no harness, agent or protocol files were edited.)

**Mirror discipline:** no `.claude/`, `.codex/`, `AGENTS.md`, `CLAUDE.md` or protocol edits, so no mirrored edits were needed.

---
name: context:all-tests
description: "Actual npm verification commands, Vitest and isolated PostgreSQL runners, checkout benchmark and ingress probe, harness validators and testing gaps."
keywords: tests, testing, vitest, lint, typecheck, build, verification, npm, errors, postgres, checkout, benchmark, ingress, payos, migrations
related: [context:component-contracts]
date: 18-11-26
---
# EXE101 — Tests and Verification

Last updated: 2026-11-18

## Scope and Read When

Read after the root router for source changes, runtime debugging, quality checks, checkout/database changes and harness validation. There is one package. Tests are Vitest route/domain/dialog tests, one isolated embedded-PostgreSQL runner, a mocked route benchmark and a loopback ingress probe. No end-to-end browser runner is installed.

## Commands

Run from the workspace root using Node 22+. On Windows PowerShell use `npm.cmd`/`npx.cmd` if `npm.ps1` is blocked. Run Vitest from PowerShell: under Git Bash on this machine it fails because of drive-letter casing in paths.

| Command | Establishes |
|---|---|
| npm.cmd ci | Reproducible dependency installation from package-lock.json |
| npm.cmd test | `vitest run` over `src/**/*.{test,spec}.{ts,tsx}` (setup `src/test/setup.ts`): route, Supabase, PayOS/SePay, Sheets/outbox, validation and dialog tests with mocked Supabase RPCs, PayOS and Sheets; no live network or credentials |
| npx.cmd vitest run <files> | Focused run, e.g. `src/app/api/ticket-orders src/lib/payments/payos src/lib/ticket-orders` |
| node scripts/test-checkout-guard-db.mjs | Starts a DISPOSABLE embedded PostgreSQL (accepts no external DB URL), applies every `supabase/migrations/*.sql`, then runs every `supabase/tests/*.sql` and the JS checks. Since the ticket-order-survey task the runner asserts the found SQL file list equals a fixed expected list (`checkout-access-guard.sql`, `ticket-order-survey.sql`; a tripwire: adding or removing a file without updating the runner fails) and each SQL file must end with a sentinel `do $$ begin raise notice 'SENTINEL <file>'; end $$;` caught through the client `notice` event (no sentinel = the file did not run to the end = fail). Immediately before applying migration `202611170003` only, it runs `alter default privileges in schema public grant all on tables to anon, authenticated` so the survey table's explicit revoke assertions are not vacuous. JS grant checks use exact signatures for the 4 survey functions and the table (`has_function_privilege`, `has_table_privilege`, `relrowsecurity`, SECURITY DEFINER + empty `search_path`, calls under `set role anon/authenticated` fail with 42501); data checks (CHECKs, cascade, idempotent upsert, P0002 for missing and foreign orders, requeue cases) live in `supabase/tests/ticket-order-survey.sql`. Earlier checks remain: grants (service_role-only), SECURITY DEFINER with empty search_path, checkout access guard, v5 held-lease, ambiguous-reconcile, saved-link reuse, exactly one `can_create` among 12 concurrent same-key calls, SQLSTATE P0002 mapping, and v4+prepare versus v5 paired timing. Exit 0 = pass. The workload artifact path (used only by `--workload`) defaults to the old `checkout-access-guard_14-11-26` task folder and can be overridden with `CHECKOUT_GUARD_ARTIFACTS_DIR`; a missing directory in `--workload` mode now fails with a clear message. Normal runs do not need it |
| CHECKOUT_PERF_MODE=baseline or candidate (with CHECKOUT_PERF_BASELINE=<baseline json>) npm.cmd test -- src/app/api/ticket-orders/route.performance.test.ts | Mocked-RPC authenticated route benchmark (fixed per-RPC delay, 5 warm-ups, 50 samples). Compares handler p50/p95 and RPC count against an immutable baseline. The candidate mode overwrites its output json each run, so copy the cited run elsewhere. Measures the handler only, not hosted latency. The ticket-order-survey benchmark (fixture `fresh-payable-checkout-survey-v1`: PayOS mock fixed 30 ms, RPC mock 15 ms, RPCs counted BY NAME) uses `CHECKOUT_PERF_BASELINE=process/general-plans/active/ticket-order-survey_17-11-26/ticket-order-survey_BASELINE_17-11-26.json`, written once with the `wx` flag; a re-capture must go to `ticket-order-survey_BASELINE_R2_17-11-26.json` with the reason recorded (the first file is never deleted). Candidate mode asserts: failures not above baseline, serial RPCs `{"2":50}`, survey RPC `{"1":50}` (total `{"3":50}` reported only), survey RPC started before PayOS create ended, and `candidate p50 - baseline p50 <= 10 ms`. Capture both in an announced quiet window (no concurrent vitest or runner). The earlier checkout-performance baseline JSON is immutable: an always-on test (an `it` outside the `CHECKOUT_PERF_MODE` gate, so plain `npm.cmd test` runs it) checks its raw-byte sha256 |
| node scripts/measure-ticket-order-ingress.mjs --base-url http://127.0.0.1:3001 --rate 50 --duration 10 | Loopback-only ingress probe (rate 1-50, duration 1-30 s; non-loopback targets are rejected). Requires `next start` on that port with `SITE_URL` equal to the same origin; omitted-Origin requests get 403, so it measures ingress handling, not checkout capacity |
| npm.cmd run dev | Local development server, normally localhost:3000 |
| npm.cmd run lint | `eslint . --max-warnings=0` for the repository |
| npm.cmd run typecheck | `next typegen` followed by `tsc --noEmit` |
| npm.cmd run check | repository-wide lint, then typecheck; the full-repo lint reports pre-existing failures in the installed agent-skill tree, so it stops before typecheck |
| npx.cmd eslint <touched paths> --max-warnings=0 | scoped application lint; use with `npm.cmd run typecheck` when unrelated harness files fail full lint |
| npm.cmd run build | Production compilation and prerendering |
| npm.cmd start | Starts an already-built production server |

Do not run typegen and build concurrently: both write `.next` artifacts. Build note: Next.js 16.4.3 stops `npm run build` with a known-vulnerability advisory on the first run (exit 1, even though compilation succeeded) and passes on retry (exit 0). Record both exit codes honestly; do not upgrade the dependency to hide it. That upgrade is a separate user-approved task.

## Quick Procedures

- **Checkout/database change:** run the focused Vitest directories, `node scripts/test-checkout-guard-db.mjs`, scoped ESLint, `npm.cmd run typecheck`, then build (retry once on the advisory stop). For performance claims also run the benchmark in candidate mode against the immutable baseline and record p50/p95, failures and RPC count, with the limits below.
- **Ingress probe:** build, start `next start -p 3001` (with `SITE_URL=http://127.0.0.1:3001`, `PAYOS_CHECKOUT_ENABLED=false`), confirm readiness, run the probe, then stop the server and confirm nothing listens on the port.
- **Source changes:** run check (or scoped lint plus typecheck when the broad lint fails only in installed `.agents/skills` or harness files), then build when routing, global styles, assets or rendering changed. Do not reinstall dependencies unless needed. For documentation-only changes, run the context/harness validators below.
- **UI conversion:** manually inspect 360/390px mobile, 768px tablet and 1280/1440px desktop; check horizontal overflow, fixed-header anchor offsets, keyboard navigation, form labels, reduced motion, image failures and Vietnamese text. Verify every CTA destination. Interactions are documented in `process/context/uxui/component-contracts.md`.
- **High-risk work** (payments, auth, migrations, trust boundaries): the task folder needs a `harness/` evidence pack validated by `node .claude/skills/vc-risk-evidence-pack/scripts/validate-risk-artifacts.mjs <task-folder>/harness/`, including an independent reviewer decision, before the work counts as finalized.

## Harness Verification

```sh
node .claude/skills/vc-context-discovery/scripts/discover-context.mjs --emit-routing
node .claude/skills/vc-context-discovery/scripts/discover-context.mjs --check-routing
node .claude/skills/vc-generate-context/scripts/validate-all-context.mjs
node .claude/skills/vc-audit-context/scripts/validate-context-discovery.mjs
node .claude/skills/vc-audit-context/scripts/validate-protocol-discovery.mjs
```

For a complete context audit, also use the skill routing, cross-reference, keyword, dependency, confusable-skill and catalog validators from vc-audit-context. For agent compatibility use vc-audit-vc's parity, skill, guide and protocol validators. Report warnings separately from failures. Do not rewrite managed protocols just to hide a warning.

## Known Gaps and Debugging

- No in-project end-to-end browser or screenshot runner is installed. Workspace `agent-browser` can record ad-hoc browser assertions and screenshots without adding a project dependency.
- /api/hello proves only an example GET response, not database readiness.
- The isolated PostgreSQL runner and the mocked benchmark do not prove hosted Supabase behavior, that a migration is applied to a hosted database, hosted latency, live PayOS behavior or authenticated production capacity. The ingress probe sends only unauthenticated requests that are rejected with 403.
- No test proves a durable Google Sheets write; the production Sheet write was a single manual observation by the owner. No SQL test covers migration `202611170002` (the `synced_at` fill trigger and the service_role-only `enqueue_paid_ticket_sheet_sync` function); the survey requeue function from `202611170003` IS covered by `supabase/tests/ticket-order-survey.sql`. The truncated-request-stream 400 path of the ticket-orders route is untested.
- The ticket-request and ticket-order APIs fail closed on a missing or mismatched Origin, but Origin is not authentication. Production exposure still requires verified proxy Origin behavior, a least-privilege runtime identity and host-level rate limiting/monitoring.
- Survey-task baseline (recorded 2026-11-18 before any edit, in `process/general-plans/active/ticket-order-survey_17-11-26/ticket-order-survey-lint-baseline_REF_17-11-26.md`): full lint = 461 pre-existing problems (269 errors, 192 warnings) in 118 files, all under `.agents/`, `.claude/`, `.codex/` and none under `src/`, `scripts/` or `supabase/`; one pre-existing failing test, `src/lib/supabase/route-client.test.ts` (requires secure cookies in production: expects `secure: true`, gets `false`). Compare later runs against this list: any `src/` lint problem or additional failing test is new.
- Not proven for the survey feature: the real 17-column Sheet write (owner probe on a Sheet copy), PostgREST passing a JS array to a `text[]` argument (route tests mock the RPC), the 1500 ms join bound on hosted infrastructure, and migration `202611170003` on a hosted database. No automated test reads the env example file or README (their range wording is checked by a recorded grep). The dialog shows a pre-existing mobile horizontal scroll from the poster notch `::after`, outside the survey task.
- Pre-existing harness validator failures (exit 1 at HEAD as well, verified through `git archive HEAD` during the survey EVL; not caused by feature work, do not fix inside unrelated tasks): `validate-context-discovery.mjs` (`.agents/skills` is not a link to `.claude/skills`, and a Windows path-separator comparison reports every context doc as not indexed), `validate-skills.mjs` and `validate-guide-sync.mjs`. `discover-context.mjs --check-routing`, `validate-all-context.mjs` and `validate-protocol-discovery.mjs` pass and are the usable context gates here. Survey-task EVL cycle 2 (2026-11-18) on this machine: `npm.cmd test` 349 of 350 (only the known `route-client.test.ts`), survey benchmark candidate p50 74.239 ms vs baseline 76.157 ms, ingress probe 500 requests all 403.
- The full-project `npm.cmd run lint` reports existing errors and warnings under the installed `.agents/skills` tree. Record the full-lint result separately from application-scoped lint instead of attributing those errors to application source.
- Lint/types/build cannot verify external image availability, real form delivery or purchasing behavior. The contact form is a local preview and email-client link; neither proves delivery.
- Tests that reset modules to import `scripts/*.mjs` do not detect removal of a script's CLI main guard.

## Source Paths and Update Triggers

Sources: package.json, vitest.config.ts, src/test/setup.ts, eslint.config.mjs, tsconfig.json, next.config.ts, scripts/test-checkout-guard-db.mjs, scripts/measure-ticket-order-ingress.mjs, supabase/migrations, supabase/tests and the .claude/skills validators above. Update when scripts, runners, build requirements, routes, migrations or evidence change.

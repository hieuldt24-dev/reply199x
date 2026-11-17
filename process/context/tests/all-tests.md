---
name: context:all-tests
description: "Actual npm verification commands, Vitest and isolated PostgreSQL runners, checkout benchmark and ingress probe, harness validators and testing gaps."
keywords: tests, testing, vitest, lint, typecheck, build, verification, npm, errors, postgres, checkout, benchmark, ingress, payos, migrations
related: [context:component-contracts]
date: 17-11-26
---
# EXE101 — Tests and Verification

Last updated: 2026-11-17

## Scope and Read When

Read after the root router for source changes, runtime debugging, quality checks, checkout/database changes and harness validation. There is one package. Tests are Vitest route/domain/dialog tests, one isolated embedded-PostgreSQL runner, a mocked route benchmark and a loopback ingress probe. No end-to-end browser runner is installed.

## Commands

Run from the workspace root using Node 22+. On Windows PowerShell use `npm.cmd`/`npx.cmd` if `npm.ps1` is blocked.

| Command | Establishes |
|---|---|
| npm.cmd ci | Reproducible dependency installation from package-lock.json |
| npm.cmd test | `vitest run` over `src/**/*.{test,spec}.{ts,tsx}` (setup `src/test/setup.ts`): route, Supabase, PayOS/SePay, Sheets/outbox, validation and dialog tests with mocked Supabase RPCs, PayOS and Sheets; no live network or credentials |
| npx.cmd vitest run <files> | Focused run, e.g. `src/app/api/ticket-orders src/lib/payments/payos src/lib/ticket-orders` |
| node scripts/test-checkout-guard-db.mjs | Starts a DISPOSABLE embedded PostgreSQL (accepts no external DB URL), applies every `supabase/migrations/*.sql`, then runs the SQL assertions and JS checks: grants (service_role-only), SECURITY DEFINER with empty search_path, checkout access guard, v5 held-lease, ambiguous-reconcile, saved-link reuse, exactly one `can_create` among 12 concurrent same-key calls, SQLSTATE P0002 mapping, and v4+prepare versus v5 paired timing. Exit 0 = pass. It has a hard-coded path to a task folder under `process/general-plans/active/` for a workload artifact it reads and rewrites (`artifacts` in the script); archiving that folder breaks the runner until the path is updated |
| CHECKOUT_PERF_MODE=baseline or candidate (with CHECKOUT_PERF_BASELINE=<baseline json>) npm.cmd test -- src/app/api/ticket-orders/route.performance.test.ts | Mocked-RPC authenticated route benchmark (fixed per-RPC delay, 5 warm-ups, 50 samples). Compares handler p50/p95 and RPC count against an immutable baseline. The candidate mode overwrites its output json each run, so copy the cited run elsewhere. Measures the handler only, not hosted latency |
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
- No test proves a durable Google Sheets write; the production Sheet write was a single manual observation by the owner. No SQL test covers migration `202611170002` (the `synced_at` fill trigger and the service_role-only `enqueue_paid_ticket_sheet_sync` function). The truncated-request-stream 400 path of the ticket-orders route is untested.
- The ticket-request and ticket-order APIs fail closed on a missing or mismatched Origin, but Origin is not authentication. Production exposure still requires verified proxy Origin behavior, a least-privilege runtime identity and host-level rate limiting/monitoring.
- The full-project `npm.cmd run lint` reports existing errors and warnings under the installed `.agents/skills` tree. Record the full-lint result separately from application-scoped lint instead of attributing those errors to application source.
- Lint/types/build cannot verify external image availability, real form delivery or purchasing behavior. The contact form is a local preview and email-client link; neither proves delivery.
- Tests that reset modules to import `scripts/*.mjs` do not detect removal of a script's CLI main guard.

## Source Paths and Update Triggers

Sources: package.json, vitest.config.ts, src/test/setup.ts, eslint.config.mjs, tsconfig.json, next.config.ts, scripts/test-checkout-guard-db.mjs, scripts/measure-ticket-order-ingress.mjs, supabase/migrations, supabase/tests and the .claude/skills validators above. Update when scripts, runners, build requirements, routes, migrations or evidence change.

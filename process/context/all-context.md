---
name: context:all-context
description: "EXE101 / REPLY 199X repository architecture and agent context router."
keywords: project, architecture, stack, repository, bootstrap, harness
date: 17-11-26
---
# EXE101 / REPLY 199X — All Context

Last updated: 2026-11-17

## Product and Current State

User intent: read the supplied REPLY 199X HTML, define maintainable components that AI agents can follow, and standardize the project harness. The approved direction preserves the Vietnamese retro event identity and documents events, tickets, merchandise and contact areas.

The REPLY 199X homepage conversion is implemented in the Next.js source and was checked locally against the preserved HTML at five viewport widths. The contact form still prepares a local preview and email link only. Merch links to the source's Google Form. The component contract describes current ownership. The reference remains at `process/general-plans/completed/harness-bootstrap_09-11-26/reply-199x.reference.html`.

Backend now present in source (verified from `src/`, `supabase/migrations/` and `package.json`, 2026-11-17):

- **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`): Google sign-in through `src/app/api/auth/*`, session cookies refreshed by `src/proxy.ts`, and a service-role server client used by order/payment routes.
- **Ticket orders and PayOS checkout:** `POST /api/ticket-orders` (authenticated; validates input, creates the order and initial checkout lease in ONE service-role-only RPC `create_ticket_order_v5`, then creates or reuses a PayOS payment link, persists it, and returns the checkout URL; adds a `Server-Timing` header with fixed stage names). `GET /api/ticket-orders/[orderId]` reads an order. Checkout is gated by `PAYOS_CHECKOUT_ENABLED === "true"`. `POST /api/payments/payos/webhook` records the verified PayOS event and paid state. A SePay IPN route (`/api/payments/sepay/ipn`) and `src/lib/payments/sepay` remain from an earlier rail. `/payment/return` is a browser return page and does not confirm payment.
- **Checkout access guard:** a per-user cooldown/consumed-window state in Postgres (`checkout_access_state`) checked inside the checkout RPCs.
- **Google Sheets:** `POST /api/ticket-requests` records ticket requests to the registration tab (a request only, not a reservation or purchase). A paid-order outbox (`sheet_sync_outbox`) is written when a paid webhook is processed and drained by `src/lib/ticket-registration/outbox-worker.ts`, triggered by `POST /api/internal/sheets-sync` with a bearer `SHEETS_SYNC_WORKER_SECRET`. Migration `202611170002` adds a `synced_at` fill trigger and a service_role-only `enqueue_paid_ticket_sheet_sync(order_id)` re-queue function.
- **Migrations** (`supabase/migrations/`, applied to hosted databases by the owner, not by agents): `202611130001`-`005` (ticket sales schema, order RPC, merch pricing, SePay, attendee snapshot), `202611140006`-`009` (PayOS links, Sheet outbox worker, alias and webhook-conflict fixes), `202611150001` (checkout access guard, `create_ticket_order_v4`), `202611170001` (`create_ticket_order_v5`), `202611170002` (outbox manual-ops safety). As recorded on 2026-11-17: `202611170002` and `202611140007` were applied to the production Supabase by the user, and one production order's outbox row was observed `synced`; `202611170001` is NOT applied to any hosted database and was verified only locally and against isolated PostgreSQL.

What is and is not verified: local Vitest tests, an isolated embedded-PostgreSQL runner, a mocked-RPC route benchmark and a loopback ingress probe pass. Hosted checkout latency, live PayOS behavior, authenticated production capacity and proxy Origin behavior are unverified. A mocked test or a successful build does not prove a real sheet write or a real payment.

## Quick Start

1. Read `process/context/all-context.md` first.
2. Choose the smallest relevant entrypoint below and follow its deeper links.
3. Discover existing active plans before creating a plan. Read `process/development-protocols/all-development-protocols.md` and follow the applicable protocol.
4. Keep facts about implemented code separate from future component contracts.

<!-- GENERATED:routing -->
| File | Read when |
|---|---|
| `process/context/all-context.md` | any substantial planning, research, review, or implementation task |
| `process/context/planning/all-planning.md` | Plan locations, source versus target distinction and component handoff requirements. |
| `process/context/tests/all-tests.md` | Actual npm verification commands, Vitest and isolated PostgreSQL runners, checkout benchmark and ingress probe, harness validators and testing gaps. |
| `process/context/uxui/all-uxui.md` | REPLY 199X UI preservation, styling and component architecture router. |

## Current Context Groups

| Group | Entry point | Scope |
|---|---|---|
| `planning/` | `process/context/planning/all-planning.md` | Plan locations, source versus target distinction and component handoff requirements. |
| `tests/` | `process/context/tests/all-tests.md` | Actual npm verification commands, Vitest and isolated PostgreSQL runners, checkout benchmark and ingress probe, harness validators and testing gaps. |
| `uxui/` | `process/context/uxui/all-uxui.md` | REPLY 199X UI preservation, styling and component architecture router. |
<!-- /GENERATED:routing -->

## Task Routing Table

| Task | Then read |
|---|---|
| UI components, HTML conversion, visual preservation | `process/context/uxui/all-uxui.md`, then `process/context/uxui/component-contracts.md` |
| Lint, types, build, verification gaps | `process/context/tests/all-tests.md` |
| Checkout, payments, Supabase migrations, Sheets outbox, performance benchmarks | this file (Product and Current State), then `process/context/tests/all-tests.md` for the runners |
| Plan creation and execution handoff | `process/context/planning/all-planning.md` |
| Context maintenance | `process/development-protocols/context-maintenance.md`, then use vc-audit-context |

## Repository Structure

```text
src/
  app/
    layout.tsx                 root document, metadata, global styles
    (routes)/layout.tsx         shared Navbar and Footer
    (routes)/page.tsx           REPLY 199X home page
    (routes)/_components/       route-private sections and contact/image client leaves
    (routes)/_data/home.ts      typed REPLY 199X content and source assets
    (routes)/_types/home.ts     home route content contracts
    (routes)/payment/return/    browser return page after PayOS (not payment confirmation)
    auth/sign-in/page.tsx       Google sign-in page
    api/hello/route.ts          example GET endpoint
    api/auth/{google,callback,logout,session}/   Supabase Google auth routes
    api/ticket-orders/          POST create/checkout, [orderId]/ GET
    api/ticket-requests/        ticket request to Google Sheets
    api/payments/{payos/webhook,sepay/ipn}/      payment event receivers
    api/internal/sheets-sync/   bearer-secret outbox worker trigger
    error.tsx, loading.tsx, not-found.tsx
    robots.ts, sitemap.ts, icon.svg
  proxy.ts                     Supabase session refresh and no-store headers
  components/                  Button, Card, Navbar, Footer
  lib/                         constants.ts, utils.ts, supabase/, payments/{payos,sepay}/,
                               ticket-orders/, ticket-registration/ (Sheets + outbox worker)
  styles/globals.css           Tailwind v4 retro theme and responsive styles
  test/setup.ts                Vitest setup (jest-dom, RTL cleanup, mock restore)
  types/index.ts               ApiResponse<T>
supabase/migrations/           forward-only SQL migrations (owner applies to hosted DBs)
supabase/tests/                SQL assertions run by scripts/test-checkout-guard-db.mjs
scripts/                       test-checkout-guard-db.mjs, measure-ticket-order-ingress.mjs
public/images/, public/fonts/  currently .gitkeep only
process/
  context/                     shared durable context
  general-plans/               active, completed, backlog; task artifacts colocated
  features/                    no product feature folders yet
  development-protocols/       shared workflow rules
.claude/                       canonical agents, skills, hooks
.codex/                        Codex compatibility surface
.agents/skills/                installed discovery copy; see compatibility note below
```

## Technology Stack

Compatibility note: this workspace currently has an ordinary `.agents/skills/` directory, not a link to `.claude/skills/`. The canonical skill source remains `.claude/skills/`; synchronize changed skill files into the installed discovery copy until a separate harness-maintenance task restores the link. The context discovery script accepts non-Git workspaces and uses portable slash-separated paths for routing.

- Single npm package, no workspaces or monorepo.
- Manifest: Next.js ^16.4.3 App Router, React/React DOM ^19.2.0, TypeScript ^5.0.0, Tailwind CSS ^4.0.0, ESLint ^10.0.0. Exact resolutions live in package-lock.json; use npm ci.
- Node.js >=22, .nvmrc selects 22; detected runtime Node 22.22.0 and npm 11.21.0.
- Tailwind uses @tailwindcss/postcss and CSS configuration, not the reference's CDN config script.
- Runtime dependencies: next, react, react-dom, @supabase/ssr, @supabase/supabase-js, googleapis. Dev: vitest ^5, jsdom, Testing Library, embedded-postgres 18.6.0-beta.19 (isolated test database), Tailwind, ESLint, TypeScript. No mail transport or analytics is installed.
- Next.js resolves to 16.4.3: `npm run build` stops with a known-vulnerability advisory on the first run (exit 1 after a successful compile) and passes on retry. Upgrading is a separate user-approved dependency task; do not upgrade inside an unrelated task.
- Vitest (`vitest.config.ts`) runs `src/**/*.{test,spec}.{ts,tsx}` with `src/test/setup.ts`; route tests mock Supabase RPCs, PayOS and Sheets.

## Key Patterns and Conventions

- Strict TypeScript; @/ maps to src/. Preserve PascalCase.tsx component filenames and named exports; route pages/layouts use default exports.
- Server Components by default. Browser state/events belong in small Client Component leaves. Do not mark the entire home page as a client component.
- Keep home-specific components, content and types inside the home route's private directories. Promote a primitive to src/components only when shared beyond that route or when it has a genuinely generic contract.
- Keep the route layout as the single owner of navigation/footer. Do not duplicate these inside the page.
- Use existing cn helper for optional class names. It joins strings; it does not resolve conflicting Tailwind classes.
- Keep content typed and separate from repeated markup; use stable IDs as React keys. Avoid generic components with many unrelated boolean props.
- Preserve Vietnamese Unicode, existing anchor IDs, section order, typography and retro tokens from the source. See the UI contract for details.
- Do not add services, dependencies or pretend transaction endpoints as part of a visual conversion.
- Payment and order rules: the browser never decides payment state; only the verified webhook persists paid. Checkout RPCs are SECURITY DEFINER with an empty `search_path` and granted to service_role only. Do not blind-retry provider calls; ambiguous provider outcomes go through lookup/reconcile. Migrations are forward-only; never edit an applied migration, add a new one.
- Server-Timing uses fixed stage names only (no identity, order or provider data). The performance harness (mocked-RPC route benchmark, ingress probe) measures handler/ingress behavior, never hosted latency.

## Environment and Configuration

- `SITE_URL` is used by `robots.ts`, `sitemap.ts`, and ticket-request origin validation; the API compares normalized origins and does not trust forwarded headers. The server-only Sheets adapter uses `GOOGLE_SHEETS_SPREADSHEET_ID` and lazily obtains Google Application Default Credentials. Do not put credential values or credential-file contents in tracked files. Production remains blocked until a least-privilege runtime identity, public-origin proxy behavior, data access/retention, and edge rate limiting/monitoring are verified.
- Other variable NAMES (see `.env.example`; values are never recorded in tracked files): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, server-only `SUPABASE_SECRET_KEY`, `GOOGLE_APPLICATION_CREDENTIALS` / `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_SHEETS_PAID_ORDERS_RANGE` (tab range ending `!A:N`, default `Registrations!A:N`), `SHEETS_SYNC_WORKER_SECRET` (at least 32 characters), `SEPAY_*`, and `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `PAYOS_CHECKOUT_ENABLED`.
- Secrets belong in ignored local environment files and server-only code. Never write a secret value (including a pasted worker secret) into tracked files, reports or chat summaries.
- next.config.ts enables reactStrictMode and disables poweredByHeader.
- tsconfig.json uses bundler resolution, strict mode and noEmit.
- ESLint uses Next core-web-vitals and TypeScript presets with zero warnings allowed.
- Root document language is Vietnamese (`vi`); title, description and site constants identify REPLY 199X.

## Testing and Quality

Use `process/context/tests/all-tests.md`. npm scripts provide test (Vitest), lint, typecheck, check and build; `node scripts/test-checkout-guard-db.mjs` runs SQL migrations and checkout assertions on a disposable embedded PostgreSQL; `node scripts/measure-ticket-order-ingress.mjs` is a loopback-only ingress probe. `agent-browser` is available in the workspace for manual assertions and screenshots. A successful build alone does not prove interaction, visual fidelity, Sheets persistence or payments.

## Context Group Lifecycle

Each context directory has exactly one all-{group}.md entrypoint, with scope, read-when rules, procedures, source paths, update triggers and deeper routing. Use frontmatter keywords and related references for discovery. Generated routing tables must be rebuilt after edits. Split a group only when a topic has 3+ durable docs, grows beyond about 800 lines or repeatedly needs separate slices. Run vc-audit-context after routing changes.

## Current Features and Plans

No feature folders. All current work is under `process/general-plans/active/` task folders (discover them with the plan-discovery skill; plans are not listed here because they move between `active/` and `completed/`). The completed bootstrap task stores the original source snapshot.

## Open Questions / Outstanding Work

- Ticket prices and sale timing in the public content still require organizer confirmation; checkout stays off unless `PAYOS_CHECKOUT_ENABLED` is `"true"`.
- Unverified: hosted migration `202611170001` and non-production latency, live PayOS behavior and the live rail, authenticated production capacity, reverse-proxy Origin preservation, and production edge rate limiting/monitoring.
- Known operational gaps: no scheduler in the repo calls `/api/internal/sheets-sync` (Vercel Hobby cron is daily only); the PayOS webhook awaits Sheets before replying to PayOS (consider `after()`); no outbox retry cap or alerting; no SQL test covers migration `202611170002`; the Next.js 16.4.3 advisory needs a user-approved upgrade.
- Contact delivery/storage, asset rights, production hosting and an official Facebook URL remain unselected.
- Remote logo and poster load in current browser checks but still depend on third-party hosting. The provided merch form destination has not been independently checked for order fulfillment.

## References

Sources: package.json, package-lock.json, README.md, tsconfig.json, next.config.ts, vitest.config.ts, .env.example, src/app, src/proxy.ts, src/components, src/styles/globals.css, src/lib, supabase/migrations, scripts and the preserved reference HTML. Protocol entrypoint: `process/development-protocols/all-development-protocols.md`.

## Scan Metadata

- Generated: 2026-11-09 (fresh bootstrap); refreshed 2026-11-17 from source evidence (delta, UPDATE PROCESS).
- Repo HEAD at refresh: 6663d9c on `main`, with uncommitted working-tree changes. Commits go directly on `main` only when the user asks.
- Package manager: npm (package-lock.json); on PowerShell use npm.cmd when npm.ps1 is blocked.
- Scope: source/configuration and installed harness, excluding caches, node_modules and secret files.

---
name: context:all-context
description: "EXE101 / REPLY 199X repository architecture and agent context router."
keywords: project, architecture, stack, repository, bootstrap, harness
date: 09-11-26
---
# EXE101 / REPLY 199X — All Context

Last updated: 2026-11-09

## Product and Current State

User intent: read the supplied REPLY 199X HTML, define maintainable components that AI agents can follow, and standardize the project harness. The approved direction preserves the Vietnamese retro event identity and documents events, tickets, merchandise and contact areas.

The REPLY 199X homepage conversion is implemented in the Next.js source and was checked locally against the preserved HTML at five viewport widths. The active task folder contains the requirements, plan and browser evidence. The component contract describes current ownership. Merch links to the source's Google Form; ticket sales remain unavailable; the contact form prepares a local preview and email link only. These do not prove order fulfillment, ticket reservations or message delivery. The reference remains at `process/general-plans/completed/harness-bootstrap_09-11-26/reply-199x.reference.html`.

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
| `process/context/tests/all-tests.md` | Actual npm verification commands, harness validators and application testing gaps. |
| `process/context/uxui/all-uxui.md` | REPLY 199X UI preservation, styling and component architecture router. |

## Current Context Groups

| Group | Entry point | Scope |
|---|---|---|
| `planning/` | `process/context/planning/all-planning.md` | Plan locations, source versus target distinction and component handoff requirements. |
| `tests/` | `process/context/tests/all-tests.md` | Actual npm verification commands, harness validators and application testing gaps. |
| `uxui/` | `process/context/uxui/all-uxui.md` | REPLY 199X UI preservation, styling and component architecture router. |
<!-- /GENERATED:routing -->

## Task Routing Table

| Task | Then read |
|---|---|
| UI components, HTML conversion, visual preservation | `process/context/uxui/all-uxui.md`, then `process/context/uxui/component-contracts.md` |
| Lint, types, build, verification gaps | `process/context/tests/all-tests.md` |
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
    api/hello/route.ts          example GET endpoint
    error.tsx, loading.tsx, not-found.tsx
    robots.ts, sitemap.ts, icon.svg
  components/                  Button, Card, Navbar, Footer
  lib/                         constants.ts, utils.ts
    styles/globals.css           Tailwind v4 retro theme and responsive styles
  types/index.ts               ApiResponse<T>
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
- No database, authentication, payment service, mail transport, analytics or automated application test runner is installed.

## Key Patterns and Conventions

- Strict TypeScript; @/ maps to src/. Preserve PascalCase.tsx component filenames and named exports; route pages/layouts use default exports.
- Server Components by default. Browser state/events belong in small Client Component leaves. Do not mark the entire home page as a client component.
- Keep home-specific components, content and types inside the home route's private directories. Promote a primitive to src/components only when shared beyond that route or when it has a genuinely generic contract.
- Keep the route layout as the single owner of navigation/footer. Do not duplicate these inside the page.
- Use existing cn helper for optional class names. It joins strings; it does not resolve conflicting Tailwind classes.
- Keep content typed and separate from repeated markup; use stable IDs as React keys. Avoid generic components with many unrelated boolean props.
- Preserve Vietnamese Unicode, existing anchor IDs, section order, typography and retro tokens from the source. See the UI contract for details.
- Do not add services, dependencies or pretend transaction endpoints as part of a visual conversion.

## Environment and Configuration

- SITE_URL is the sole documented environment variable; used by robots.ts and sitemap.ts. Copy .env.example to .env.local; set the deployed origin before production.
- Secrets belong in ignored local environment files and server-only code. No credentials were scanned or recorded.
- next.config.ts enables reactStrictMode and disables poweredByHeader.
- tsconfig.json uses bundler resolution, strict mode and noEmit.
- ESLint uses Next core-web-vitals and TypeScript presets with zero warnings allowed.
- Root document language is Vietnamese (`vi`); title, description and site constants identify REPLY 199X.

## Testing and Quality

Use `process/context/tests/all-tests.md`. npm scripts provide lint, typecheck, check and build. No project test runner is installed. `agent-browser` is available in the workspace for manual assertions and screenshots. A successful build alone does not prove interaction or visual fidelity.

## Context Group Lifecycle

Each context directory has exactly one all-{group}.md entrypoint, with scope, read-when rules, procedures, source paths, update triggers and deeper routing. Use frontmatter keywords and related references for discovery. Generated routing tables must be rebuilt after edits. Split a group only when a topic has 3+ durable docs, grows beyond about 800 lines or repeatedly needs separate slices. Run vc-audit-context after routing changes.

## Current Features and Plans

No feature folders. The implemented REPLY 199X conversion plan and evidence live under `process/general-plans/active/reply-199x_09-11-26/`. The completed bootstrap task stores the original source snapshot.

## Open Questions / Outstanding Work

- Ticket sales are not open in the reference; future prices and sale timing require organizer confirmation.
- Contact delivery/storage, asset rights, production hosting and an official Facebook URL remain unselected.
- Remote logo and poster load in current browser checks but still depend on third-party hosting. The provided merch form destination has not been independently checked for order fulfillment.

## References

Sources: package.json, package-lock.json, README.md, tsconfig.json, next.config.ts, .env.example, src/app, src/components, src/styles/globals.css, src/lib and the preserved reference HTML. Protocol entrypoint: `process/development-protocols/all-development-protocols.md`.

## Scan Metadata

- Generated: 2026-11-09, Asia/Saigon; Full Scan / fresh bootstrap.
- Repo HEAD: unavailable; git reports this workspace is not a Git repository.
- Package manager: npm (package-lock.json); on PowerShell use npm.cmd when npm.ps1 is blocked.
- Scope: source/configuration and installed harness, excluding caches, node_modules and secret files.

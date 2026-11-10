---
name: context:all-tests
description: "Actual npm verification commands, harness validators and application testing gaps."
keywords: tests, testing, lint, typecheck, build, verification, npm, errors
related: [context:component-contracts]
date: 09-11-26
---
# EXE101 — Tests and Verification

Last updated: 2026-11-09

## Scope and Read When

Read after the root router for source changes, runtime debugging, quality checks and harness validation. There is one package and no application unit/integration/E2E test runner. No deeper testing documents exist yet.

## Commands

Run from the workspace root using Node 22+. Use npm.cmd on Windows if PowerShell blocks npm.ps1.

| Command | Establishes |
|---|---|
| npm.cmd ci | Reproducible dependency installation from package-lock.json |
| npm.cmd run dev | Local development server, normally localhost:3000 |
| npm.cmd run lint | ESLint including Next/TypeScript rules, zero warnings |
| npm.cmd run typecheck | next typegen followed by tsc --noEmit |
| npm.cmd run check | repository-wide lint, then typecheck; currently reports pre-existing ESLint failures in the installed agent-skill tree, so it stops before typecheck |
| npx.cmd eslint src --max-warnings=0 | scoped application lint; use alongside `npm.cmd run typecheck` when unrelated harness files fail full lint |
| npm.cmd run build | Production compilation and prerendering |
| npm.cmd start | Starts an already-built production server |

Do not run typegen and build concurrently: both write .next artifacts. Do not run npm test; that script does not exist.

## Quick Procedures

For source changes, run check, then build when routing, global styles, assets or rendering changed. If the broad ESLint command fails only in installed `.agents/skills` or harness files, run `npx.cmd eslint src --max-warnings=0` and `npm.cmd run typecheck` to verify application sources, then build. Do not reinstall dependencies unless needed. For documentation-only changes, run context/harness validators; existing app checks may establish a baseline but are not behavioral tests of the new docs.

For UI conversion, manually inspect 360/390px mobile, 768px tablet and 1280/1440px desktop; check horizontal overflow, fixed-header anchor offsets, keyboard navigation, form labels, reduced motion, image failures and Vietnamese text. Verify every CTA destination. Reference interactions and outstanding functionality are documented in `process/context/uxui/component-contracts.md`.

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

- No in-project interaction, accessibility, screenshot or browser test runner is installed. Workspace `agent-browser` can record ad-hoc browser assertions and screenshots without adding a project dependency.
- /api/hello proves only an example GET response, not database readiness.
- Lint/types/build cannot verify external image availability, real form delivery or purchasing behavior.
- The original HTML form showed success without a backend. The converted form provides only a local preview and an email-client link; neither proves delivery or persistence.
- The current full-project `npm.cmd run lint` scan reports existing errors and warnings under the installed `.agents/skills` tree. Record the full lint result separately from application-scoped lint instead of attributing those errors to UI source.
- Git status/HEAD cannot be obtained until this workspace is initialized or restored as a Git repository. Do not initialize Git without a request.

## Source Paths and Update Triggers

Sources: package.json, eslint.config.mjs, tsconfig.json, next.config.ts and the .claude/skills validators above. Update when scripts, runners, build requirements, routes or evidence change.

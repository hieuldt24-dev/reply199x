---
name: plan:reply-199x
description: "Convert the preserved REPLY 199X HTML into maintainable Next.js sections and complete agent guidance."
date: 09-11-26
feature: general
---
# REPLY 199X — Implementation Plan

**Date**: 09-11-26  
**Complexity**: SIMPLE — one package, one execution stream  
**Status**: CODE DONE — application, context and browser checks pass; user visual review remains outstanding.

## Overview

Replace the English starter homepage with the preserved Vietnamese REPLY 199X experience and complete the component/context guidance future agents need. Requirements are locked in `reply-199x_SPEC_09-11-26.md` in this folder. INNOVATE is skipped because this is a mechanical conversion using the agreed architecture in `process/context/uxui/component-contracts.md`. The user's “thực hiện cả 2” authorizes both deliverables; the orchestrator retains that instruction through validation and execution.

Quick links: [scope](#scope), [checklist](#implementation-checklist), [verification](#verification-evidence), [handoff](#resume-and-execution-handoff).

## Context Envelope

| Field | Value |
|---|---|
| feature | general |
| phase | PLAN |
| session-goal | Complete agent guidance and convert the supplied event HTML |
| branch | unavailable — no Git repository |
| worktree | D:/SE19C01-DE190318/7.FALL2026/EXE101 |
| context-group | uxui, planning, tests |
| blast-radius-packages | src/app, src/components, src/lib, src/styles, process/context, context discovery script |
| active-plan | process/general-plans/active/reply-199x_09-11-26/reply-199x_PLAN_09-11-26.md |
| test-runner | npm check/build; existing external browser tooling, no app test runner |
| validate-contract | written — conditional safe-to-execute gate, now checked against execution evidence |

## Goals and Success Metrics

All SPEC AC1–AC10 must have recorded evidence or an explicitly unresolved gate. Preserve eight top-level sections and nested tickets, original commercial details, real external destinations and visual identity. Keep the page/server sections free of unnecessary client state. Do not claim visual or behavioral verification from compilation alone.

## Phase Completion Rules

This is one delivery, grouped below only for implementation sequencing. CODE DONE means code exists; TESTING means checks are in progress; VERIFIED requires browser evidence and user confirmation. Integration, keyboard/mobile flow, local form state and asset-failure behavior need separate proof. No database verification applies because this scope creates no persistence. Record errors, corrective changes, actual manual/browser checks and outstanding user confirmation. A developed behavior with missing browser evidence remains CONDITIONAL and the task stays active.

## Execution Brief

| Group | What happens | Test / verify state | Done when |
|---|---|---|---|
| Guidance and content | Complete component contract/discovery fallback and define typed route content | Context validators; compare section, date, price and URL inventory against reference | Guidance resolves and immutable source content is represented |
| Render and interactions | Compose server sections, shell, theme and small client leaves | Check/types; inspect semantic output, menu state and form values | Homepage renders with honest local interactions |
| Evidence | Run production build, browser scenarios and visual comparison | Five viewport widths, links, focus, invalid/valid form, image failures and reduced motion | Evidence recorded; remaining gaps explicit and user review requested |

Expected outcome: a maintainable REPLY 199X homepage, usable mobile navigation, an honest message-preparation flow and discoverable agent instructions. External order fulfillment, email delivery and ticket transactions remain outside the app.

## Scope

In scope: original visual/content conversion, typed route data, section contracts, Vietnamese metadata/language, responsive navigation, accessible local message preview/email alternative, remote image fallback, theme migration and scoped verification.

Out of scope: backend APIs, databases, payment/reservations, contact persistence, publishing, Git initialization, new package dependencies, invented Facebook URLs, new commercial facts, asset replacement/provenance claims and unrelated harness cleanup.

## Assumptions and Constraints

- The preserved HTML at `process/general-plans/completed/harness-bootstrap_09-11-26/reply-199x.reference.html` remains read-only and authoritative for copy/identity. Existing component contracts determine ownership.
- Current package is Next 16 / React 19 / Tailwind 4. Use its installed pipeline; no CDN Tailwind script, unsafe HTML injection or inline HTML handler strings.
- Keep Epilogue, Space Grotesk and Be Vietnam Pro roles with fallback stacks. Remote fonts must not be required for build success or readable layout.
- There are two remote Google-hosted images: logo and event poster. Retain their exact URLs and reserved layout with meaningful failure content. Asset rights/production hosting remain future decisions.
- Source dates/prices are organizer-provided content, not independently confirmed facts. Keep planned attendance and unavailable sales wording.
- No application tests exist. `process/context/tests/all-tests.md` is the complete testing route and explicitly has no deeper testing documents. Source/test discovery found no test files in the app blast radius.
- Browser feasibility is established by the parent: hidden Chrome at port 9333 and `agent-browser.cmd --session reply-cdp --cdp 9333 open about:blank` succeeded. The parent owns browser QA. The rendered reference's two images load; `reference-desktop.png` and `reference-full.png` in this folder are baseline evidence. Preserve asset-error handling even though the baseline loaded successfully.

## Functional and Non-Functional Requirements

- Source order: HeroSection; AboutSection `gioi-thieu`; ChannelsSection `kenh-truyen-thong`; TimelineSection `timeline`; EventsSection `su-kien` containing TicketsSection `ve`; MerchSection `merch`; ProcessSection `quy-trinh`; ContactSection `lien-he`.
- Main page contains one main landmark `main-content` and one h1. Route layout remains the sole owner of Navbar and Footer. Root layout owns `lang="vi"`, Vietnamese skip text and metadata.
- `_types/home.ts` contains readonly shapes with stable IDs for tracks, events, merchandise and steps. `_data/home.ts` holds repeated content and source asset URLs. Data never contains dynamically assembled Tailwind classes.
- All section components are server components. Client state is limited to Navbar's menu, ContactForm and optional RemoteImage. Do not pass callback props across a server/client boundary.
- Mobile navigation exposes every original destination, expanded state and controlled region; selecting a link closes it. Keep readable fixed-header anchor offsets at all widths.
- Contact fields have native required/email constraints, labels/IDs/names and autocomplete. Before preparation, explain that the site sends/saves nothing. Valid submission shows local preview, preserves values, announces status politely and provides an encoded email action to `loihoidap199x@gmail.com`. Preview/edit never claims delivery; no storage or network submission is added.
- Merchandise uses `https://forms.gle/tW1VU8vpASc53CJa8`; TikTok uses `https://www.tiktok.com/@loihoidap199x`. External new-tab links include `noopener noreferrer`. Ticket notification targets `#lien-he`. Facebook remains pending without a fabricated link.
- Migrate exact reference colors, font roles, hard shadows, paper dots, dark halftone, cassette/radio motifs and ticket edges into Tailwind v4 CSS theme/custom styles. Preserve a centered source hero rather than applying an unrelated redesign.
- Retain existing generic Button/Card/state-page styling compatibility. Use dark/forest ink for small text on paper; provide visible focus, at least 16px form text, long-content wrapping, touch targets and reduced-motion handling.

## Acceptance Criteria

These preserve the locked SPEC IDs and their proving strategy. Missing browser infrastructure keeps its associated gate CONDITIONAL; static checks do not substitute for interaction assertions.

| SPEC criterion | Required outcome | proven by: | strategy: |
|---|---|---|---|
| AC1 | Original eight sections, nested tickets, IDs/order and Vietnamese copy | G3 content/section assertions | Fully-Automated |
| AC2 | Retro palette, type roles, textures, cassette motifs and styling | G8 screenshots plus reference comparison | Hybrid |
| AC3 | Source event details, benefits, prices, dates and pending sales | G3 commercial-content assertions | Fully-Automated |
| AC4 | Real merch/TikTok URLs, pending Facebook, truthful contact notification | G4 destination/state assertions | Fully-Automated |
| AC5 | Usable navigation and no overflow at all five widths; visible anchor targets | G5 responsive/menu/anchor assertions | Fully-Automated |
| AC6 | Keyboard path, visible focus, skip link and associated field labels | G6 semantics/focus assertions and visual review | Hybrid |
| AC7 | Invalid fields blocked; valid local preparation preserves values with truthful status | G7 invalid/valid form assertions | Fully-Automated |
| AC8 | Readable fallback for both images; nonessential motion stops | G9 image-failure/reduced-motion assertions | Fully-Automated |
| AC9 | Discoverable, accurate agent guidance inside and outside Git | G2 context validators and guidance review | Hybrid |
| AC10 | Existing lint/types/build pass, no new project dependencies | G1 project checks and dependency comparison | Fully-Automated |

## Implementation Checklist

1. [x] Confirm the SPEC, this selected plan, reference HTML and component contract; inventory all copy, IDs, URLs and the two image sources before editing. Compare package manifests/lockfile before and after to ensure no new dependencies.
2. [x] Accept the concurrent guidance worker's changes to `component-contracts.md`, root/UXUI/planning context and minimal non-Git discovery fallback. Review section ownership and truthfulness; run G2 without overwriting another agent's work.
3. [x] Create `src/app/(routes)/_types/home.ts` and `_data/home.ts` with readonly typed repeated content and stable IDs; compare event/merch details and exact external destinations against reference for G3/G4.
4. [x] Create server `HeroSection.tsx`, `AboutSection.tsx`, `ChannelsSection.tsx` and `TimelineSection.tsx` in route-private `_components/`; retain source copy, ordering, motifs and IDs; verify heading inventory and no client boundary on these files.
5. [x] Create server `EventsSection.tsx` containing `TicketsSection.tsx`; preserve poster/details, benefits, `su-kien`/`ve`, price and unavailable-sale state. Compare content inventory for G3 and notification href for G4.
6. [x] Create server `MerchSection.tsx` and `ProcessSection.tsx`; preserve both source combo names/prices, dates, upcoming products, supplied form links and explicitly planned process. Check stable keys, copy and destinations.
7. [x] Create server `ContactSection.tsx` and client `ContactForm.tsx`; implement the required label/validation/local-preview/edit/mailto contract. Prepare G7 assertions before claiming behavior complete; do not reset input or send external email during tests.
8. [x] Add optional client `_components/RemoteImage.tsx` for both source images with reserved sizing, descriptive alternatives and explicit readable error fallback. Prepare G9 failure assertions; do not replace original assets.
9. [x] Replace `Navbar.tsx`/`Footer.tsx` content, retaining shell ownership in route layout. Navbar may be client for accessible mobile menu; use genuine anchors and preserve every source destination. Verify no duplicate shell and prepare G5/G6.
10. [x] Compose server `src/app/(routes)/page.tsx`; update `src/app/layout.tsx` language/skip link and `src/lib/constants.ts` site metadata. Keep robots/sitemap/API contracts unchanged; check one main/h1 and valid fragments.
11. [x] Replace starter homepage CSS in `src/styles/globals.css` with source theme/motifs/responsive rules; retain utilities required by existing Button/Card/error/loading/not-found pages. Check fixed-header offsets, focus contrast, fallback fonts, wrapping and reduced motion.
12. [x] Run application-scoped ESLint, TypeScript, then the production build sequentially. Repository-wide `npm.cmd run lint` reports 269 errors and 192 warnings across existing installed agent/harness scripts under `.agents`, `.claude` and `.codex`; record that limitation separately instead of broadening source scope.
13. [x] Run the G3–G9 browser matrix against the built local app; retain assertions and screenshots in this task folder. Browser content/responsive assertions passed at all five widths, and manual mobile menu/form/image/reduced-motion/skip-link probes passed.
14. [x] Write `reply-199x_REPORT_09-11-26.md` with touched files, checks/evidence and limits. Reconcile code facts into context. Leave the task active for user visual review; no archival, commit or deployment is implied.

## Touchpoints

| Ownership / action | Exact paths |
|---|---|
| New route content/types | `src/app/(routes)/_data/home.ts`, `src/app/(routes)/_types/home.ts` |
| New server sections | `src/app/(routes)/_components/HeroSection.tsx`, `AboutSection.tsx`, `ChannelsSection.tsx`, `TimelineSection.tsx`, `EventsSection.tsx`, `TicketsSection.tsx`, `MerchSection.tsx`, `ProcessSection.tsx`, `ContactSection.tsx` in that same directory |
| New client leaves | `src/app/(routes)/_components/ContactForm.tsx`; optional `RemoteImage.tsx` |
| Changed composition/shell/theme | `src/app/(routes)/page.tsx`, `src/app/layout.tsx`, `src/components/Navbar.tsx`, `src/components/Footer.tsx`, `src/lib/constants.ts`, `src/styles/globals.css` |
| Project description and browser icon | `README.md`, `src/app/icon.svg` |
| Read; change only if composition requires it | `src/app/(routes)/layout.tsx`; existing `Button.tsx`, `Card.tsx`, `src/lib/utils.ts`; state pages remain read-only unless a style regression requires a scoped correction |
| Concurrent guidance ownership | `process/context/uxui/component-contracts.md`, `process/context/all-context.md`, `process/context/uxui/all-uxui.md`, `process/context/planning/all-planning.md`, optional test-context clarification; `.claude/skills/vc-context-discovery/scripts/discover-context.mjs` minimal Git fallback |
| Evidence | This task's `reply-199x_REPORT_09-11-26.md`; screenshot/assertion evidence colocated here |
| Immutable requirements/source | This task SPEC; preserved bootstrap HTML; package.json/package-lock.json and service/API contracts |

The guidance worker and executor are not alone in the workspace. Never revert another owner's changes; coordinate context status at closeout. No new feature folder is needed because no product feature folder exists and this is one bounded plan.

## Public Contracts

Route `/` remains the landing route. Preserve source fragment IDs and CTA destinations. Navbar/Footer have named exports and a single layout owner. Section exports remain named; route page/layout defaults follow Next conventions. Content is available in server-rendered HTML before hydration. Only menu, preview and image-error state require the browser. Preview changes no durable data, and the external mail client/form owns any subsequent delivery/order operation. No API or schema changes are authorized.

## Blast Radius

One npm package; approximately 19–21 application files plus 5–7 context/discovery/artifact files. Risk is presentation/accessibility and truthful UX, with no auth, billing, schema, migration, secrets or backend changes. Global CSS can affect fallback state pages; inspect their rendering and retain their shared utility rules. Context/discovery changes are separately owned and audited.

## Verification Evidence

| Gate / Scenario | Strategy | Proves SPEC criterion |
|---|---|---|
| G1 — `npx.cmd eslint src --max-warnings=0`, `npm.cmd run typecheck`, then `npm.cmd run build`; broad lint result and manifest/lockfile comparison recorded | Fully-Automated | AC10; compilation only, never visual fidelity |
| G2 — `node .claude/skills/vc-context-discovery/scripts/discover-context.mjs --check-routing`; `node .claude/skills/vc-generate-context/scripts/validate-all-context.mjs`; `node .claude/skills/vc-audit-context/scripts/validate-context-discovery.mjs`; `node .claude/skills/vc-audit-context/scripts/validate-protocol-discovery.mjs`; guidance completeness review | Hybrid | AC9 |
| G3 — Browser assertions: single main/h1, ordered section IDs, selected source sentences, 20–21.11.2026 and 22.11.2026, 15:00–19:00, venue/address/benefits, 99.000/169.000 đ and 06/11–12/11 promotion, planned process and pending tickets | Fully-Automated | AC1, AC3 |
| G4 — Assert original hash targets resolve, merch/TikTok exact URLs and external rel attributes, Facebook lacks invented href, ticket notification goes to contact | Fully-Automated | AC4 |
| G5 — At 360/390/768/1280/1440 widths assert document width does not exceed viewport, every nav destination reachable, menu toggles/closes, and anchor target is below fixed header | Fully-Automated | AC5 |
| G6 — Keyboard traversal/skip target, field label associations, visible focus state; screenshot inspection confirms focus contrast/readability | Hybrid | AC6 |
| G7 — Empty and malformed email blocked; valid local preparation displays preview, retains all field values, allows edit and states unsent/unsaved; inspect email alternative without opening/sending it | Fully-Automated | AC7 |
| G8 — Capture five viewport screenshots and compare source palette, typography roles, centered hero/cassette, textures, shadows, section flow and readable fallbacks | Hybrid | AC2, visible focus part of AC6 |
| G9 — Force each image to fail and assert readable fallback plus retained event copy; emulate reduced motion and inspect nonessential animation removal | Fully-Automated | AC8 |
| G10 — Review fallback state pages and unavailable-assets presentation for visual regressions | Agent-Probe | Supports AC2, AC8, AC10 |

### Exact execution and evidence limits

Run project commands from the workspace root. After build, `npm.cmd start -- --port 3000` supplies the local app; `agent-browser.cmd --session reply-cdp --cdp 9333 open http://localhost:3000` uses the parent's working browser connection. Use the installed tool's documented controls/assertions for G3–G9 and record exact commands used in the report. The parent owns browser QA and baseline screenshots. No project dependency additions are permitted. If the connection later fails, HTTP/HTML inspection can prove server content only, not menu/form behavior, viewport layout or image events.

Every automated behavioral row requires actual assertions, not a script that merely visits the page. Validator may place failing-stub scenarios in the Validate Contract before execution; PLAN does not write test implementation. Red-first starting scenarios are: content/order differs; commercial text differs; wrong destination; overflow/menu/anchor failure; invalid form passes; values reset or delivery falsely claimed; no image fallback; reduced-motion animation persists. Each begins unproven and closes only with its named evidence.

## Test Infra Improvement Notes

No app test runner or browser suite is installed; do not introduce one just for this reversible conversion. Installed external browser tooling is the intended assertion mechanism. The initial CDP launch issue was resolved by the parent using hidden Chrome on port 9333; retain the working session rather than starting another browser. External order fulfillment and mail delivery are excluded outcomes, not missing tests of developed behavior.

| Gap | Resolution options / chosen handling |
|---|---|
| CDP/browser launch unavailable | A: run assertions with existing tool once launch works. B: use another already-available browser surface. C: retain CONDITIONAL; never call developed behavior verified. D: create `browser-verification_NOTE_09-11-26.md` in this task folder listing G3–G9 and exact observed failure if unresolved. |
| No persistent regression suite | A: future standalone test task with explicit scope. B: later organizer-approved runner setup. C: one-session browser assertion evidence suffices for this bounded conversion when actually run. D: report repeatability limits in closeout. |
| Third-party availability/fulfillment | Outside app scope; only correct href/fallback is tested. No live purchase, external form submission or email delivery occurs. |

## Risks and Mitigations

- Missing image/font availability: preserve original URLs and identity with text/aspect-ratio fallbacks; build must not require font downloads.
- Source min-height or fixed header creates awkward mobile spacing: preserve identity while adjusting wrapping/spacing against G5/G8; no claim about the historical screenshot without a supplied screenshot.
- Contact source lies about saving: replace with explicit local preparation and retained data; G7 is a release gate.
- Shared CSS regression: retain generic primitive/state-page contracts and run G10.
- Browser infrastructure failure: complete unaffected implementation/checks, report conditional browser gates and concrete follow-up. Do not publish or claim full verification.

## Integration Notes and Rollback

No environment variables beyond existing SITE_URL, no new services and no data migration. Keep example `/api/hello`, robots and sitemap behavior intact. Original HTML remains the recovery/reference artifact. Because this directory has no Git metadata, do not initialize Git or propose reset commands; preserve a scoped pre-edit backup under this task folder if the executor needs rollback, and restore only executor-owned files after reviewing concurrent edits.

## Resume and Execution Handoff

- Selected plan: `process/general-plans/active/reply-199x_09-11-26/reply-199x_PLAN_09-11-26.md`.
- Locked SPEC: same folder, `reply-199x_SPEC_09-11-26.md`.
- Last completed phase: implementation and local browser verification. Guidance contract and discovery fallback are complete.
- Validate-contract status: written; preimplementation gate CONDITIONAL, safe to execute bounded presentation changes. Core application conditions have been checked; unrelated existing lint/context validator issues remain documented.
- Supporting context loaded: `process/context/all-context.md`, `uxui/all-uxui.md`, `uxui/component-contracts.md`, `planning/all-planning.md`, `tests/all-tests.md`; preserved HTML; current page/layout/Navbar and source-file/test inventory.
- Fresh-agent next step: read this plan and `reply-199x_REPORT_09-11-26.md`; resume only if the user requests an adjustment or the outstanding visual review changes scope.
- Remaining confirmation: user visual review. No external email, order or ticket transaction was attempted. Repository-wide lint and context-discovery audit still report the unrelated installed-harness issues documented in the task report.

## Validate Contract

**Date:** 09-11-26. **Preimplementation gate: CONDITIONAL — safe to execute the bounded conversion.** This is a feasibility/acceptance contract, not proof that the finished app passes. The user's authorization covers this reversible implementation; no deployment, external submission or service integration is included.

### Scope and feasibility findings

| Dimension | Finding / binding condition |
|---|---|
| Infrastructure | Existing Next 16, React 19, TypeScript and Tailwind 4 pipeline supports server-rendered sections and small client leaves without new packages. Root established working Chrome CDP 9333 and loaded both reference images; build must still succeed without font downloads. |
| Public behavior | Retain every source fragment, source text/commercial detail and supplied merch/TikTok destination. Keep one layout-owned header/footer and one main/h1. New component paths are planned outputs, not missing-input blockers. |
| Security and truthfulness | Do not transplant inline handler strings, Tailwind CDN scripts, unsafe HTML injection or the source's fabricated saved-success. Use escaped React text and encoded mailto values; no persistence/network submission, invented Facebook destination, ticket reservation or checkout. External new-tab links retain noopener noreferrer. |
| Coverage | G1–G10 map to AC1–AC10. Browser assertions are required for developed behavior; check/build alone cannot close menu, form, overflow, focus, fallback or motion criteria. Installed browser tooling supplies probes without a project test-runner dependency. |
| Existing harness limitations | Guidance/discovery work reports routing and root-context checks passing. Full context/protocol audits still have preexisting ordinary-copy, Windows path-indexing and absent-Git assumptions. Record exact failing commands and distinguish these from the conversion; do not broaden into unrelated harness repair or claim all audits pass. |

Structural validation executed with `node .claude/skills/vc-generate-plan/scripts/validate-plan-artifact.mjs process/general-plans/active/reply-199x_09-11-26/reply-199x_PLAN_09-11-26.md`: 0 failures, 0 warnings before this contract was written. The locked SPEC and component contract agree with the plan's section ownership, data boundaries, pending-service states and verification requirements. No blocking source dependency or high-risk service change was found.

### Execution conditions and acceptance checks

1. Implementation owns only its assigned `src/` files; preserve separately owned guidance and discovery edits. Package manifest/lockfile and the reference HTML stay unchanged. No additional dependencies or service endpoints.
2. Run `npm.cmd run check` followed by `npm.cmd run build` sequentially; inspect fallback state-page styling after global CSS replacement.
3. Assert section order/IDs, one main/h1, selected source copy and all event/merch dates, prices, benefits and pending states. Assert every hash resolves and supplied external destinations/rel values match.
4. At 360, 390, 768, 1280 and 1440px assert no horizontal overflow, available navigation, close-on-selection menu behavior and anchor headings below the header; record screenshots and visually compare source identity.
5. Exercise keyboard skip/navigation/focus and associated form labels. Empty/invalid input must be blocked; valid preparation must retain values, display useful local preview/email action and clearly state unsent/unsaved. Do not open/send email or submit the external order form during QA.
6. Force both images to fail and assert readable, reserved-layout fallbacks. Emulate reduced motion and assert nonessential animation/smooth scrolling stops.
7. Record actual G1–G10 evidence and unresolved limits in the task report. Core application failures must be fixed before code-complete handoff; existing unrelated harness audit failures remain explicit concerns. User visual confirmation remains outstanding until received; do not label the delivery VERIFIED from agent checks alone.

**Handoff:** This selected plan is ready for the implementation worker under these conditions. If browser access fails, retain affected behavioral gates as unresolved and report the actual failure rather than substituting HTTP/build results.

## Cursor + RIPER-5 Guidance and Strategy

Import this single Implementation Checklist into Cursor Plan mode; keep this file as the execute anchor. RIPER-5 flow here is completed RESEARCH → locked SPEC → PLAN → VALIDATE → EXECUTE. Do not mutate source in PLAN. The orchestrator owns approval interpretation and carries the user's explicit instruction forward; this plan does not independently authorize a phase jump.

Strategy comparison: sequential uses one planner/one plan, lowest coordination cost; parallel planners duplicate this single artifact and increase conflicts; workflow orchestration adds tooling overhead for one known stream; an agent team is useful only for already separated guidance versus application ownership, not duplicate plan authorship. Seven signals: bounded goal, one package, ~20 UI files, shared global theme, no test suite, dependent implementation steps, no prior parallel-plan evidence. Recommendation: one sequential validator followed by one application executor; retain the existing separately owned guidance worker. Cost: 1 validation actor + 1 executor; no new planner fan-out.

Next step: review the rendered page and screenshots. Keep this task active until the user confirms the design or requests adjustments; no user-confirmed VERIFIED status is claimed.


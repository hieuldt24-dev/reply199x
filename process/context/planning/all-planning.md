---
name: context:all-planning
description: "Plan locations, source versus target distinction and component handoff requirements."
keywords: plan, planning, implementation, handoff, requirements, scope
related: [context:component-contracts, context:all-tests]
date: 09-11-26
---
# EXE101 — Planning Context

## Scope and Read When

Read after all-context.md before creating or resuming a plan. This group documents durable planning rules; active plans and reports belong in task folders, not in context. The REPLY 199X conversion plan and report are under `process/general-plans/active/reply-199x_09-11-26/`.

## Quick Procedures

1. Discover active general plans and feature plans before creating new artifacts. Never select an ambient plan on behalf of execution.
2. Use a dated task folder under process/general-plans/active for a single cross-cutting task. Use an existing product feature folder if one applies; create feature folders only when scope warrants them.
3. Use vc-generate-plan for the plan contract, and the relevant actor agent when the user explicitly invokes a mode. Follow the shared orchestration and plan-lifecycle protocols for approvals.
4. Keep implemented behavior distinct from proposed structure. The conversion is implemented and browser-checked; the active report records execution evidence. The UI contract is durable architecture guidance.
5. A frontend conversion plan must name exact files, preserve section IDs/copy, enumerate interactions and unavailable assets, and specify checks plus visual acceptance criteria.
6. Do not infer ticket sales, contact delivery or merch checkout from mockup buttons. Product decisions must be explicit before service implementation.

## Source Paths and Routing

- Workflow: `process/development-protocols/orchestration.md`, `process/development-protocols/plan-lifecycle.md`.
- Contract: `.claude/skills/vc-generate-plan/SKILL.md`.
- SIMPLE example: `.claude/skills/vc-generate-plan/references/example-simple-prd.md`.
- COMPLEX example: `.claude/skills/vc-generate-plan/references/example-complex-prd.md`.
- UI handoff: `process/context/uxui/component-contracts.md`.
- Verification: `process/context/tests/all-tests.md`.

## Update Triggers

Update when plan formats, artifact paths, approval rules or project-specific acceptance criteria change. Execution approval remains governed by AGENTS.md and the shared protocols.

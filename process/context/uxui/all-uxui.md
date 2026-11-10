---
name: context:all-uxui
description: "REPLY 199X UI preservation, styling and component architecture router."
keywords: ui, ux, frontend, design, components, layout, retro, html, tailwind
related: [context:component-contracts, context:all-tests]
date: 09-11-26
---
# REPLY 199X — UI Context

## Scope and Read When

Read after all-context.md for UI work, HTML decomposition, design tokens, assets, accessibility or responsive behavior. This group describes the reference and implemented component architecture. The conversion passed local browser and responsive checks; use the active task report for evidence and remaining limits.

## Quick Procedures

1. Read `component-contracts.md` for exact section mapping, file ownership and component boundaries.
2. Compare the preserved reference HTML with current source before editing. Preserve its Vietnamese content, green/cream/red/gold palette, section order and retro typography.
3. Keep navigation/footer in the route layout, sections on the server and interactive leaves on the client.
4. Use the installed Tailwind v4 CSS pipeline. Do not paste Tailwind CDN scripts or inline event-handler strings into JSX.
5. Run the checks in `process/context/tests/all-tests.md`; inspect actual browser rendering before claiming screenshot fidelity.

## Routing and Source Paths

| Need | Read |
|---|---|
| Component tree, props, interactions and design tokens | `component-contracts.md` |
| Source visual/content reference | `process/general-plans/completed/harness-bootstrap_09-11-26/reply-199x.reference.html` |
| Existing primitives | src/components/Button.tsx, Card.tsx, Navbar.tsx, Footer.tsx |
| Existing styling | src/styles/globals.css |

## Update Triggers

Update after component migrations, token changes, confirmed assets or interaction/backend decisions. Replace target-only descriptions with verified implementation facts as each part ships. Keep unresolved gaps visible.

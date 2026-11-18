---
name: ref:ticket-order-survey-lint-baseline
description: "Baseline lint/test/typecheck/build captured in P1 before any source edit (AC17)."
date: 18-11-26
metadata:
  node_type: memory
  type: references
  feature: general
  phase: P1
---

# Baseline before ticket-order-survey edits (AC17)

Captured 2026-11-18 on `main` (HEAD 89c3f8a, working tree only had the hook log and this task folder changed), before any source file was edited.

| Command | Exit | Result |
|---|---|---|
| `npm.cmd test` | 1 | 24 files (23 passed, 1 failed); 236 tests (235 passed, 1 failed) |
| `npm.cmd run lint` | 1 | 461 problems (269 errors, 192 warnings) in 118 files; all under `.agents/`, `.claude/`, `.codex/` (harness scripts). Zero files under `src/`, `scripts/` or `supabase/`. |
| `npm.cmd run typecheck` | 0 | clean |
| `npm.cmd run build` (first run) | 1 | compile succeeded; stopped on the known Next.js 16.4.3 advisory check |
| `npm.cmd run build` (retry) | 0 | passed |

Pre-existing test failure (not caused by this task): `src/lib/supabase/route-client.test.ts > SSR cookie lifecycle > requires secure cookies in production` expects `secure: true`, receives `secure: false`.

Comparison rule for GJ.1/GJ.2: no new failing test beyond the one above; no lint problem in any file outside the 118-file list below (any `src/` lint problem is new).

## Lint files with problems (paths only)

```
.agents/skills/vc-agent-browser/scripts/aria-snapshot.js
.agents/skills/vc-agent-browser/scripts/evaluate.js
.agents/skills/vc-agent-browser/scripts/lib/browser.js
.agents/skills/vc-agent-browser/scripts/lib/selector.js
.agents/skills/vc-agent-browser/scripts/network.js
.agents/skills/vc-agent-browser/scripts/performance.js
.agents/skills/vc-audit-plans/scripts/validate-eval-coverage.mjs
.agents/skills/vc-audit-vc/scripts/validate-agent-frontmatter.mjs
.agents/skills/vc-audit-vc/scripts/validate-agent-parity.mjs
.agents/skills/vc-audit-vc/scripts/validate-guide-sync.mjs
.agents/skills/vc-audit-vc/scripts/validate-kit-portability.mjs
.agents/skills/vc-audit-vc/scripts/validate-protocol-wiring.mjs
.agents/skills/vc-audit-vc/scripts/validate-skills.mjs
.agents/skills/vc-autopilot/scripts/validate-autopilot-goal-block.mjs
.agents/skills/vc-docs-seeker/scripts/analyze-llms-txt.js
.agents/skills/vc-docs-seeker/scripts/detect-topic.js
.agents/skills/vc-docs-seeker/scripts/fetch-docs.js
.agents/skills/vc-docs-seeker/scripts/tests/run-tests.js
.agents/skills/vc-docs-seeker/scripts/tests/test-analyze-llms.js
.agents/skills/vc-docs-seeker/scripts/tests/test-detect-topic.js
.agents/skills/vc-docs-seeker/scripts/tests/test-fetch-docs.js
.agents/skills/vc-docs-seeker/scripts/utils/env-loader.js
.agents/skills/vc-plan-discovery/scripts/validate-plan-discovery-output.mjs
.agents/skills/vc-review-situation/scripts/review-situation-scan.cjs
.agents/skills/vc-sequential-thinking/scripts/process-thought.js
.agents/skills/vc-web-testing/scripts/analyze-test-results.js
.agents/skills/vc-web-testing/scripts/init-playwright.js
.claude/hooks/descriptive-name.cjs
.claude/hooks/lib/__tests__/statusline-suite.cjs
.claude/hooks/lib/colors.cjs
.claude/hooks/lib/config-counter.cjs
.claude/hooks/lib/context-builder.cjs
.claude/hooks/lib/git-info-cache.cjs
.claude/hooks/lib/hook-logger.cjs
.claude/hooks/lib/privacy-checker.cjs
.claude/hooks/lib/project-detector.cjs
.claude/hooks/lib/scout-checker.cjs
.claude/hooks/lib/session-state-manager.cjs
.claude/hooks/lib/statusline-activity-renderers.cjs
.claude/hooks/lib/statusline-render-modes.cjs
.claude/hooks/lib/statusline-section-registry.cjs
.claude/hooks/lib/transcript-parser.cjs
.claude/hooks/lib/usage-limits-cache.cjs
.claude/hooks/lib/vc-config-utils.cjs
.claude/hooks/post-edit-simplify-reminder.cjs
.claude/hooks/privacy-block.cjs
.claude/hooks/scout-block.cjs
.claude/hooks/scout-block/broad-pattern-detector.cjs
.claude/hooks/scout-block/error-formatter.cjs
.claude/hooks/scout-block/pattern-matcher.cjs
.claude/hooks/scout-block/tests/test-broad-pattern-detector.cjs
.claude/hooks/scout-block/tests/test-error-formatter.cjs
.claude/hooks/scout-block/tests/test-monorepo-scenarios.cjs
.claude/hooks/scout-block/tests/test-path-extractor.cjs
.claude/hooks/scout-block/tests/test-pattern-matcher.cjs
.claude/hooks/session-init.cjs
.claude/hooks/session-state.cjs
.claude/hooks/stop-validator-sweep.cjs
.claude/hooks/subagent-init.cjs
.claude/skills/vc-agent-browser/scripts/aria-snapshot.js
.claude/skills/vc-agent-browser/scripts/evaluate.js
.claude/skills/vc-agent-browser/scripts/lib/browser.js
.claude/skills/vc-agent-browser/scripts/lib/selector.js
.claude/skills/vc-agent-browser/scripts/network.js
.claude/skills/vc-agent-browser/scripts/performance.js
.claude/skills/vc-audit-plans/scripts/validate-eval-coverage.mjs
.claude/skills/vc-audit-vc/scripts/validate-agent-frontmatter.mjs
.claude/skills/vc-audit-vc/scripts/validate-agent-parity.mjs
.claude/skills/vc-audit-vc/scripts/validate-guide-sync.mjs
.claude/skills/vc-audit-vc/scripts/validate-kit-portability.mjs
.claude/skills/vc-audit-vc/scripts/validate-protocol-wiring.mjs
.claude/skills/vc-audit-vc/scripts/validate-skills.mjs
.claude/skills/vc-autopilot/scripts/validate-autopilot-goal-block.mjs
.claude/skills/vc-docs-seeker/scripts/analyze-llms-txt.js
.claude/skills/vc-docs-seeker/scripts/detect-topic.js
.claude/skills/vc-docs-seeker/scripts/fetch-docs.js
.claude/skills/vc-docs-seeker/scripts/tests/run-tests.js
.claude/skills/vc-docs-seeker/scripts/tests/test-analyze-llms.js
.claude/skills/vc-docs-seeker/scripts/tests/test-detect-topic.js
.claude/skills/vc-docs-seeker/scripts/tests/test-fetch-docs.js
.claude/skills/vc-docs-seeker/scripts/utils/env-loader.js
.claude/skills/vc-plan-discovery/scripts/validate-plan-discovery-output.mjs
.claude/skills/vc-review-situation/scripts/review-situation-scan.cjs
.claude/skills/vc-sequential-thinking/scripts/process-thought.js
.claude/skills/vc-web-testing/scripts/analyze-test-results.js
.claude/skills/vc-web-testing/scripts/init-playwright.js
.codex/hooks/descriptive-name.cjs
.codex/hooks/lib/__tests__/statusline-suite.cjs
.codex/hooks/lib/colors.cjs
.codex/hooks/lib/config-counter.cjs
.codex/hooks/lib/context-builder.cjs
.codex/hooks/lib/git-info-cache.cjs
.codex/hooks/lib/hook-logger.cjs
.codex/hooks/lib/privacy-checker.cjs
.codex/hooks/lib/project-detector.cjs
.codex/hooks/lib/scout-checker.cjs
.codex/hooks/lib/session-state-manager.cjs
.codex/hooks/lib/statusline-activity-renderers.cjs
.codex/hooks/lib/statusline-render-modes.cjs
.codex/hooks/lib/statusline-section-registry.cjs
.codex/hooks/lib/transcript-parser.cjs
.codex/hooks/lib/usage-limits-cache.cjs
.codex/hooks/lib/vc-config-utils.cjs
.codex/hooks/post-edit-simplify-reminder.cjs
.codex/hooks/privacy-block.cjs
.codex/hooks/scout-block.cjs
.codex/hooks/scout-block/broad-pattern-detector.cjs
.codex/hooks/scout-block/error-formatter.cjs
.codex/hooks/scout-block/pattern-matcher.cjs
.codex/hooks/scout-block/tests/test-broad-pattern-detector.cjs
.codex/hooks/scout-block/tests/test-error-formatter.cjs
.codex/hooks/scout-block/tests/test-monorepo-scenarios.cjs
.codex/hooks/scout-block/tests/test-path-extractor.cjs
.codex/hooks/scout-block/tests/test-pattern-matcher.cjs
.codex/hooks/session-init.cjs
.codex/hooks/session-state.cjs
.codex/hooks/stop-validator-sweep.cjs
.codex/hooks/subagent-init.cjs
```

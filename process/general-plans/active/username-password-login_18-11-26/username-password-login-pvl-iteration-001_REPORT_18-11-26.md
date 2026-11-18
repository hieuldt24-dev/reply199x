---
name: username-password-login-pvl-iteration-001
domain: plan
iteration: 1
date: 2026-11-18
plan: process/general-plans/active/username-password-login_18-11-26/username-password-login_PLAN_18-11-26.md
gaps_in: 9
fail_count_in: 0
applied: 9
loop_status: continuing
---

# PVL iteration 001 — username-password-login

**BLUF:** vc-plan-agent applied all 9 CONCERN gaps from the first-pass `Gate: CONDITIONAL` (outer-pvl). Plan validator 0 failures; exactly one `^Gate:` line; zero `Gate: PASS` prose matches. Next: re-run vc-validate-agent from V1.

| Gap | Fix landed |
|---|---|
| 1 Dummy sign-in client | Plain supabase-js client (publishable key, no session persistence); no set-cookie on 400/401/403/503 (AC3b) |
| 2 Timing | Nil-UUID getUserById + dummy sign-in on unmapped path; residual accepted |
| 3 Error semantics | Error table: unmapped/invalid creds → 401; other admin errors, 429, >=500, network → 503 |
| 4 Shared egress rate limit | Accepted known-gap; backlog stub `process/general-plans/backlog/username-login-rate-limit_NOTE_18-11-26.md` |
| 5 Origin throw / no-store | Origin read wrapped → 503; all responses `Cache-Control: private, no-store` (deliberate difference documented) |
| 6 Header fallback | Corrected to "Bạn" |
| 7 Evidence pack | Checklist step 12 + HR1 gate row |
| 8 Runner list / runbook | Sorted SQL list; pg_constraint check (c,f,p,u); passwords 8-72 bytes |
| 9 Form details | `window.location.assign("/")` stubbed; TextEncoder byte length; git-status baseline + pre-edit backup of untracked form |

Owner choices applied by orchestrator defaults (user informed in chat): gap 2 equalize, gap 4 known-gap + stub, gap 9a full reload.

Regression flag: none.

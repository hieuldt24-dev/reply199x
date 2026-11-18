---
name: note:username-login-error-mapping
description: "Backlog: narrow the generic 401 in POST /api/auth/password so hosted config outages return 503 instead of 'wrong username or password'"
date: 18-11-26
---

# NOTE - Username login error mapping (backlog)

**Priority:** medium. Source: independent vc-code-reviewer decision, 2026-11-18 (`approved-with-concerns`).

**Problem:** `isCredentialRejection` in `src/app/api/auth/password/route.ts` (lines 35-39) maps every non-429 status 400/401 from `signInWithPassword` to the generic 401. A hosted misconfiguration (for example an invalid publishable key, 401 `invalid_api_key`, or a malformed request, 400 `validation_failed`) would show every user "wrong username or password" instead of the 503 outage response, hiding the real failure.

**Fix:** return 401 only for codes `invalid_credentials` and `email_not_confirmed` (optionally a 400 with no code); send every other code to 503. Add one route test per mapped code. This is a code change inside the route, so it needs a new small plan or a quick-fix pass; the current plan's contract says "400/401-class", so this is not a deviation.

**Related low findings (same route, not yet backlogged elsewhere)**
- No timeout on the admin lookup or sign-in calls; a hung upstream ends as a platform timeout instead of the fixed 503.
- A banned account (GoTrue `user_banned`, 403) returns 503 while an unknown username returns 401 (negligible signal).
- `getSiteOrigin()` defaults to `http://localhost:3000` when `SITE_URL` is unset, so a missing production `SITE_URL` makes every browser login return 403 (same behavior as the google and logout routes). Owner: confirm `SITE_URL` in production.
- `route.test.ts` mid-test `vi.clearAllMocks()` weakens the afterEach no-sensitive-value console check (risk nil today).

**Plan:** `process/general-plans/active/username-password-login_18-11-26/username-password-login_PLAN_18-11-26.md`

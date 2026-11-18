---
name: note:username-login-rate-limit
description: "Backlog: brute-force and shared egress-IP rate limiting for POST /api/auth/password (accepted known-gap)"
date: 18-11-26
---

# NOTE - Username login rate limiting (backlog)

**Problem:** `POST /api/auth/password` calls Supabase Auth from the server, so every sign-in attempt leaves from the app's egress IP. Supabase's per-IP sign-in limit is therefore ONE shared bucket for all users. Brute force and heavy legitimate use can exhaust it; once exhausted the route maps 429 to `503 temporarily_unavailable`, so password login is down for everyone (Google login is unaffected). No edge rate limiting is verified in this repo.

**Status:** accepted known-gap (owner decision 2026-11-18). Not solved by the login plan.

**Options to evaluate**
- App-level limiter (per username and per client IP, store in Postgres or an edge KV) before calling Supabase.
- Captcha (for example Supabase Auth captcha support) on the credential form.
- Forward the real client IP to Supabase Auth if the API supports it, so the bucket is per end user instead of per server.

**Plan:** `process/general-plans/active/username-password-login_18-11-26/username-password-login_PLAN_18-11-26.md` (see Route Design, Rate limiting; Security Notes).

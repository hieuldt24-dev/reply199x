# Production Google login investigation

Status: BLOCKED on production configuration visibility; no source or remote configuration changed.

## Evidence (2026-11-14)

- Node fetch of https://reply199x.vercel.app returned 200 and the unavailable header text.
- GET /api/auth/session returned 503 with authenticated:false.
- POST /api/auth/google with exact production Origin returned 303 to https://reply199x.vercel.app/?auth_error=unavailable. Google authorization was not reached.
- curl failed locally with Windows Schannel SEC_E_NO_CREDENTIALS; this was a diagnostic tool failure, not a production HTTP status.
- Vercel CLI is installed but whoami failed EPERM creating its local auth file; no authenticated deployment configuration was obtained. No .vercel project link exists.

## Hypotheses and elimination

SITE_URL mismatch is eliminated for the observed POST: the exact-Origin guard passed (otherwise 403). Callback allowlist/Google consent issues cannot explain this first failure because no provider redirect was issued. Missing/malformed Supabase configuration is consistent with both unavailable session rendering and the failed initiation. A thrown Supabase client/runtime error remains possible. Provider-disabled alone does not explain a fresh anonymous session returning unavailable; there is insufficient evidence to declare the exact production variable missing.

The application accepts NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ANON_KEY is not an alias. URL must be HTTPS with no credentials, non-root path, query or fragment. Verify these names on the active Production deployment, then redeploy if changed. SITE_URL accepted by the current deployment is https://reply199x.vercel.app.

After initiation works, verify Google provider enabled, Supabase redirect allowlist includes https://reply199x.vercel.app/api/auth/callback, and Google OAuth redirect is the Supabase project's /auth/v1/callback. No real account consent/session/logout was exercised.

## Risk and handoff

Auth is high risk. No fix is justified until production environment metadata or redacted server diagnostics identifies the failing stage. Existing parent-task harness artifacts describe prior payment work and do not establish evidence for this incident; incident-specific risk-gate/context-snippets/verification/review/adversarial artifacts remain pending before a source fix is finalized. Do not replace keys or loosen origin checks speculatively.

```text
FIX BOUNDARY:
affected_files: [] (production deployment environment is the first inspection target)
root_cause: Confirmed failure before Google OAuth redirect; exact underlying configuration/runtime exception is not yet observable.
proposed_fix: Verify active Vercel Production NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY against the application's strict config contract, then correct only the proven mismatch and redeploy; otherwise inspect a sanitized failing-stage server diagnostic.
risk_class: high
```

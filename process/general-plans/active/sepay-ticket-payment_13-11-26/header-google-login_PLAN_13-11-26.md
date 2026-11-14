---
name: plan:header-google-login
description: "Google-only header login dialog with server-managed HttpOnly Supabase sessions and current-session logout."
date: 13-11-26
status: planned
complexity: complex
metadata:
  node_type: memory
  type: plan
---

# Header Google Login — Detailed Implementation Plan

**Date**: 13-11-26, Asia/Saigon

**Status**: VALIDATED CONDITIONAL; user authorized validation and execution on 13-11-26. Live hybrid evidence remains required before VERIFIED.

**Complexity**: COMPLEX — one focused execution stream.

**Shape:** One focused complex plan, one sequential execution stream. This is a child of `sepay-ticket-payment_PLAN_13-11-26.md` in this same task folder. It does not execute the payment plan.

**Upstream requirements:** `sepay-ticket-payment_SPEC_13-11-26.md`, supplemented and locked by the user's current request: replace the header event CTA with Login; click opens a form offering only Google login; use JWT/access and refresh tokens; keep refresh in an HttpOnly cookie; do not persist tokens to application database tables; logout clears browser tokens and revokes the refresh session. The orchestrator explicitly accepted this message as the locked requirements supplement for this focused plan. INNOVATE was skipped because the implementation is constrained by the existing Supabase integration and this explicit request.

## Context Envelope

| # | Field | Value |
|---|---|---|
| 1 | feature | none; existing sepay task folder owns this child artifact |
| 2 | phase | PLAN |
| 3 | session-goal | Produce a concrete header Google login and HttpOnly session/logout plan |
| 4 | branch | main, HEAD 87bc2c2 at planning preflight |
| 5 | worktree | D:/SE19C01-DE190318/7.FALL2026/EXE101 |
| 6 | context-group | planning, uxui, tests |
| 7 | blast-radius-packages | single Next.js package; header, auth routes, Supabase helpers, proxy, styles/tests |
| 8 | active-plan | this exact child plan; parent is supporting context only |
| 9 | test-runner | Vitest |
| 10 | validate-contract | pending, this file's Validate Contract section |

## Current Evidence

- `src/components/Navbar.tsx` is a Client Component. The exact target is the `event-header__cta` anchor labelled `Sự kiện 22/11`; existing mobile disclosure and active-section tracking must remain.
- `src/app/(routes)/layout.tsx` synchronously renders Navbar and Footer. It does not currently load identity.
- Existing OAuth routes are POST `/auth/google`, GET `/auth/callback`, POST `/auth/sign-out`; direct fallback page is `/auth/sign-in`. Callback exchanges a PKCE code and redirects to `/`.
- `src/lib/supabase/server.ts`, `route-client.ts` and `src/proxy.ts` configure Secure in production, SameSite=Lax and Path=/, but omit HttpOnly. Installed `@supabase/ssr` defaults HttpOnly to false. Thus current cookies do not meet the new requirement.
- The SSR SDK stores the session, including JWT access token and opaque refresh token, in its canonical possibly chunked cookie. It does not expose independently managed access/refresh cookies. JWT is the access token, not a third token.
- `src/lib/supabase/client.ts` is an unused browser client. No current source imports it. Browser-owned Supabase auth is incompatible with making its session cookies HttpOnly.
- `src/proxy.ts` currently matches only `/auth/:path*`; the homepage header would not receive refresh coverage.
- Installed SDK public export `clearAuthCookiesAtScopes` clears canonical cookie names and numbered chunks using Max-Age=0. Its implementation and public export were inspected; no private SDK method is required.
- Installed `auth.signOut({ scope: 'local' })` removes local storage before the remote revoke request; a remote network error can leave refresh valid remotely despite local deletion. Some 401/403/404 responses are also treated as success by this SDK version. Mocked route success cannot prove remote revocation.
- Earlier foundation tests/build passed. The root later confirmed Google provider enabled and local sign-in start generated the expected authorize URL, callback and PKCE cookie. This does not prove complete Google consent or logout revocation.
- User selected `.env`; `.env.local` was removed. Existing unrelated dirty work must be preserved. Discovery scanner missed some legacy frontmatter plans, so direct filesystem/situation-scan inventory was also consulted.

## Scope and Success Criteria

In scope: header Google-only dialog; safe authenticated header state; server-owned session cookies; callback/error navigation; cookie refresh; current-session logout; focused tests and evidence. No new dependency is expected.

Out of scope: ticket purchasing, schema/migrations, profile persistence, payment/Sheets changes, password/email auth, role system, all-device logout, custom token issuance, token tables, token denylist and Google account disconnection. Supabase Auth necessarily manages its own internal sessions/refresh state; the requirement forbids extra application token persistence, not the provider's built-in Auth storage.

## Locked Acceptance Criteria

- **HAC1:** Header event CTA becomes a button labelled `Đăng nhập`, retaining current position/theme; clicking opens a dialog with one Google login action and no email/password inputs. `proven by: header-google-only-dialog`; `strategy: Fully-Automated`.
- **HAC2:** Dialog keyboard, focus return, Escape/backdrop and mobile-menu interactions work at the named viewport widths, without overflow or background interaction. `proven by: native-dialog-responsive-walkthrough`; `strategy: Hybrid`.
- **HAC3:** OAuth uses the existing Google/PKCE exchange; callback returns 303 plus HttpOnly session cookies and a fixed local destination. Tokens never appear in JSON, props, HTML, browser storage or logs. `proven by: real-google-httpOnly-session`; `strategy: Hybrid`.
- **HAC4:** Every session/verifier cookie write, rotation and deletion uses one policy: HttpOnly, SameSite=Lax, Path=/, Secure in production, host-only. Existing canonical cookie name and chunks are preserved. `proven by: sdk-cookie-policy-and-chunks`; `strategy: Fully-Automated`.
- **HAC5:** Header receives only a minimal verified user summary; reload and expired-access refresh retain correct identity. Signed-out or invalid sessions show Login; temporary auth outage is not represented as verified identity. `proven by: header-identity-and-refresh`; `strategy: Hybrid`.
- **HAC6:** Logout uses current-session scope, clears all session/verifier chunks locally, and a successful remote logout prevents subsequent refresh with the captured current session credential. Other device sessions are not intentionally revoked. `proven by: real-current-session-revocation`; `strategy: Hybrid`.
- **HAC7:** Network/revoke failure still clears local cookies, shows the explicit remote-unconfirmed outcome, and does not store a refresh token for retries. Foreign/missing/null Origin causes 403 with no logout action. `proven by: logout-outcome-and-origin`; `strategy: Fully-Automated`.
- **HAC8:** No application token table, database token write, localStorage/sessionStorage auth persistence, browser Supabase auth client or elevated secret is introduced; application checks and existing regression tests pass. `proven by: server-only-auth-boundary-and-regression`; `strategy: Fully-Automated`.

## Architecture Decisions

1. **Server owns the session.** Keep `@supabase/ssr` server adapters and the normal PKCE cookie flow. Remove the unused browser helper. Do not expose an access-token JSON endpoint or construct custom JWTs. OAuth success means the server receives tokens and sets cookies; client UI receives only identity summary.
2. **Use the SDK session cookie format.** Add `src/lib/supabase/cookie-policy.ts` for canonical cookie name and shared options. The explicit name must equal the installed default `sb-<project-ref>-auth-token`, derived from the configured project URL, so existing cookies are not orphaned. Do not rename or split storage. The verifier uses the SDK's corresponding `-code-verifier` key. Domain remains unset.
3. **HttpOnly applies to all writers.** Server, route client, proxy and cleanup use the same policy. Route/proxy adapters enforce the policy after any SDK-supplied cookie options, while preserving SDK expiry/chunk semantics. This also upgrades existing non-HttpOnly session cookies on the next cookie write without creating a second session store.
4. **Identity is server verified.** A server-only `getAuthView()` in `src/lib/supabase/session.ts` calls `auth.getUser()` and returns a discriminated safe view: authenticated with displayName only, anonymous, or unavailable. No raw User/session/tokens cross the client boundary. Display name uses verified provider full name trimmed to 40 characters, falling back to `Bạn`; React text escaping remains intact. No avatar network dependency.
5. **Refresh before rendering.** Extend proxy matching to the actual current shared-header route `/` plus `/auth/:path*`. Preserve cookie mutations in both the forwarded request and outgoing response. `getClaims()` in proxy refreshes/validates the JWT; layout `getUser()` supplies verified identity. New future header routes must explicitly extend the matcher. Do not match assets/API routes broadly.
6. **User-specific output is private.** Async shared layout reads cookies through the server helper, making its rendered identity request-specific. Auth routes, refreshed responses and the homepage response use private/no-store headers. No shared cache or React cross-request cache may memoize identity. Build/runtime proof must confirm no static user HTML is reused.
7. **Logout is local-session scope.** Continue public `auth.signOut({ scope: 'local' })`; no service-role key or manual Auth admin API. In a finally cleanup, use public `clearAuthCookiesAtScopes` for the canonical session and verifier storage keys with the existing Path=/ host-only scope and shared flags. The cleanup reads the union of original request cookies and newly written response cookie names so all old/new chunks are expired. Never clear unrelated cookies. Do not call private `_removeSession` or manually parse token payloads.
8. **Logout success has a precise limit.** SDK success means the normal revoke call completed under the SDK contract; the hybrid test must independently prove refresh rejection. A previously copied JWT may remain cryptographically valid until `exp`. This plan does not promise immediate invalidation of all copies, all-device logout or revocation of Google's own authorization.
9. **No custom persistence.** `.env` continues holding public Supabase settings and SITE_URL; Google OAuth secret remains in Supabase Dashboard. No application DB, localStorage, token log, retry queue or refresh-token backup is added.

## Data Flow and Failure Outcomes

1. Browser requests `/`; proxy handles session refresh and the layout calls `getAuthView()`. Navbar receives an auth view containing no token data.
2. Anonymous user clicks Login. Navbar closes the mobile disclosure first, HeaderAuth opens native LoginDialog and focuses the Google button. Closing returns focus to the trigger.
3. The shared GoogleLoginForm posts to `/auth/google`. While submitting it disables repeat submits and says `Đang chuyển đến Google…`. The route validates exact SITE_URL Origin, checks provider settings, requests Google OAuth and returns 303 with the PKCE verifier cookie.
4. Google returns through Supabase to the existing exact `/auth/callback`. The route validates callback origin, rejects provider errors/missing code, exchanges the PKCE code, writes HttpOnly session cookies and returns 303 to `/`. No token is put in a URL or response body.
5. A callback/provider failure returns to the fixed `/?auth_error=callback` or `/?auth_error=unavailable`. HeaderAuth reads only these fixed whitelisted codes once after hydration, opens the same dialog with a Vietnamese error, then removes that parameter with history replacement while preserving the pathname, other parameters and hash. This avoids putting searchParams logic in a layout or creating an arbitrary redirect destination. Direct `/auth/sign-in` remains a fallback with shared content and ordinary POST forms.
6. Authenticated header displays the short name and a Logout button. Its ordinary same-origin POST form has duplicate-submit/pending feedback. Successful logout redirects 303 to `/`; the next full render contains no authenticated view. Refresh on tab focus uses `router.refresh()` only, with no browser SDK/token reader, so other open tabs update after gaining focus.
7. If revoke returns an error or throws, finally cleanup still expires browser session/verifier chunks. Redirect to fixed `/?auth_error=logout_unconfirmed`. Show `Đã xóa phiên trên trình duyệt nhưng chưa xác nhận thu hồi phiên. Vui lòng thử đăng nhập lại khi kết nối ổn định.` Do not display a full-revocation success message or retain credentials for background retries. Missing session is an idempotent local logout; a real outstanding revoke failure stays unconfirmed.
8. Foreign/missing/null Origin is rejected before SDK creation and before any cookie mutation. Temporary identity lookup failure produces unavailable state with a retry action (`router.refresh()`), never a fabricated logged-in user. Google cancellation and PKCE replay/expiry produce retryable generic local errors, not raw provider diagnostics.

### Concurrency Boundaries

Suppress duplicate login/logout submissions per control. Keep normal SDK refresh rotation and reuse rules; do not implement a custom in-memory session manager. A cookie response already in flight can race logout in another tab: after the completed logout and a fresh navigation/focus, revoked refresh must not restore a session. Tests must not assert immediate rejection of a rotated token during Supabase's configured reuse grace (commonly 10 seconds); inspect actual project settings and record the duration without token values. A copied access JWT can survive until expiry, so any future sensitive API needs its own authorization design.

## Component and Route Contracts

| Owner | Contract |
|---|---|
| `Navbar.tsx` | Accept typed safe auth view; preserve all existing navigation logic; replace only event CTA; close menu before Login opens |
| `HeaderAuth.tsx` | Own open/error/pending state; render anonymous/authenticated/unavailable states; read whitelisted auth_error; refresh on tab focus; receive no tokens |
| `LoginDialog.tsx` | Native dialog lifecycle, accessible title/description/close, backdrop-only close, focus restoration; compose GoogleLoginForm |
| `GoogleLoginForm.tsx` | One POST form to `/auth/google`, one Google action, pending/status handling; reused in dialog and fallback page |
| route layout | Async server identity loading; one shell owner; pass safe auth view to Navbar |
| `/auth/sign-in` | Direct URL works; uses the same form/content and existing authenticated/logout presentation |
| `/auth/google` | POST only; exact Origin; 303 to provider or fixed local error; HttpOnly verifier cookie |
| `/auth/callback` | GET only; exact configured origin, PKCE exchange, fixed home/error destination, 303, no token JSON |
| `/auth/sign-out` | POST only; exact Origin; current-session revoke; unconditional supported cleanup; 303 home or fixed logout_unconfirmed |

## Public Contracts

- Browser-visible authentication output consists of Set-Cookie and fixed redirects. Access JWT and refresh token remain server-managed cookie contents; no token-bearing RSC props, HTML, JSON or Web Storage.
- Cookie policy is HttpOnly=true, SameSite=Lax, Path=/, Secure=true in production and false for local HTTP development; host-only, existing canonical name/chunks. Preserve SDK lifetime defaults; do not invent an independent refresh lifetime.
- `AuthView` carries authenticated displayName, anonymous, or unavailable state only. Protected operations must reverify identity server-side regardless of header state.
- Fixed home query codes are callback, unavailable and logout_unconfirmed only. No arbitrary next/returnTo redirect is accepted. Raw OAuth error details are never rendered.
- Token removal is browser-local; successful SDK logout targets the current Supabase session's refresh credential. JWT expiry and provider-internal storage constraints are explicit above.
- Existing ticket-request API, forms, section IDs, navigation destinations, payments and database schema remain outside this contract.

## Security Review and Risk Predictions

Quick `vc-security` STRIDE review of the proposed flow:

| Threat | Mitigation and proof |
|---|---|
| Spoofing / OWASP identification failures | Server `getUser()`, PKCE code exchange; forged/stale cookie tests; no trust in display props for authorization |
| Tampering / CSRF | POST + exact SITE_URL Origin for start/logout; callback exact origin; fixed destinations and whitelist error codes |
| Information disclosure / XSS token theft | HttpOnly on every writer, no browser SDK/storage, minimal escaped display text, no tokens in reports/logs; native app still needs normal XSS prevention |
| Shared-cache identity leakage | Cookie-driven layout, private/no-store and two-user response isolation test |
| Repudiation | Record safe scenario outcomes/status only; rely on Supabase Auth logs for provider operations, never application token logs |
| DoS / availability | Existing provider-settings timeout; clear failure/pending state and deployment rate-limit prerequisite; no new retry daemon |
| Privilege escalation | Publishable key + user's own session only; no elevated Supabase key or database writes |

Five-persona `vc-predict` synthesis, grounded in source review and auth research (no extra agent fan-out): security predicts one omitted cookie writer defeats HttpOnly, so shared policy plus SDK-level tests is mandatory; backend predicts logout network failure leaves remote refresh valid, so explicit unconfirmed outcome is mandatory; frontend predicts mobile header overflow and focus loss, so truncate names and real browser keyboard checks; performance predicts homepage identity removes static rendering, accepted for correct per-user header with private caching; maintainer predicts duplicate login markup/client SDK use drifts, so share one Google form and remove the unused browser helper. These concerns shape the checklist and gates rather than becoming speculative extra features.

Highest-risk `vc-scenario` cases from real APIs: route `setAll` receives numbered chunks and SDK options that omit HttpOnly; expired access triggers proxy refresh while callback writes another session; signOut returns network error after local deletion; malformed/stale verifier replays exchange; provider cancellation; missing/foreign Origin; callback `next` attack; response cache contains previous user's summary; second tab loses focus while another logs out. Tests below cover these mechanisms.

## Touchpoints

| File | Planned change |
|---|---|
| `src/lib/supabase/cookie-policy.ts` (new) | Canonical current SDK cookie name, shared enforced cookie flags and supported cleanup scope |
| `src/lib/supabase/session.ts` (new) | Server-only verified minimal auth-view mapping |
| `src/lib/supabase/server.ts` | Shared cookie policy; keep server rendering read-only adapter behavior |
| `src/lib/supabase/route-client.ts` | Shared policy, reusable route adapter and supported chunk cleanup helper |
| `src/lib/supabase/client.ts` | Remove unused browser auth helper after confirming zero imports |
| `src/proxy.ts` | Shared flags, homepage refresh matcher and private response behavior |
| `src/app/(routes)/layout.tsx` | Async auth view loading and Navbar props |
| `src/components/Navbar.tsx` | Replace event CTA with HeaderAuth and mobile-close integration |
| `src/components/auth/HeaderAuth.tsx` (new) | Auth presentation/dialog state and focus refresh |
| `src/components/auth/LoginDialog.tsx` (new) | Native accessible dialog |
| `src/components/auth/GoogleLoginForm.tsx` (new) | Shared Google-only POST form and pending state |
| `src/app/auth/sign-in/page.tsx` | Reuse form/auth view and fallback content |
| `src/app/auth/google/route.ts` | Fixed home error return and shared cookie behavior |
| `src/app/auth/callback/route.ts` | Fixed home error return; shared cookie behavior |
| `src/app/auth/sign-out/route.ts` | Local revoke + finally chunk cleanup + precise outcomes |
| `src/styles/globals.css` | Scoped auth/dialog styles; keep current Reply Lobster/Nunito fonts and theme |
| `README.md` | .env setup, server-owned cookies, session/logout guarantees and walkthrough |
| `src/lib/supabase/config.test.ts` (existing) | Regression of existing fixed config/origin rules |
| `src/lib/supabase/route-client.test.ts` (existing) | Flags, proxy and adapter propagation regression |
| `src/app/auth/auth.test.ts` (existing) | OAuth/logout route contracts and errors |
| `src/lib/supabase/cookie-policy.test.ts` (new) | Real installed SDK chunk cleanup/flags/name compatibility |
| `src/lib/supabase/session.test.ts` (new) | Safe view mapping and no raw tokens |
| `src/components/auth/HeaderAuth.test.tsx` (new) | UI states, Google-only, modal/pending/error/logout behavior |

Read-only references include TicketRequestDialog, global theme, package/lock, installed SDK source and parent SPEC/plan/foundation report. No broad generic Dialog/AuthProvider/state store is planned.

## Blast Radius

One npm package; 17 production/documentation touchpoints (including removing one unused helper), six existing/new test touchpoints. High-risk classes: authentication, cookie trust boundary, public auth routes and proxy/cache behavior. No dependency version change, database migration or external-resource mutation. The existing worktree was dirty before this plan and must not be reset. Add files only at the named owners; expansion needs plan review.

## Implementation Checklist

### Validation additions (13-11-26)

- Cookie upgrade is deterministic: on the first matching request, reissue existing canonical session/verifier cookies and their actual numbered chunks with HttpOnly even when the SDK emits no auth event. Do not extend expiry, change values, create phantom chunks, or restore cookies already deleted by the SDK; outgoing writes/deletions take precedence. Test an existing legacy non-HttpOnly cookie with a still-valid JWT and no SDK refresh event.
- Catch thrown refresh/configuration failures in the expanded proxy so public home rendering does not become a 500 during a Supabase outage. Preserve any pending cookie mutations and private/no-store headers, continue to the layout, and let the identity lookup report unavailable. Tests must exercise both returned auth errors and thrown errors; do not turn an outage into a verified identity or erase a still-valid session merely because the network failed.
- Prove final HTTP cache headers on home HTML/RSC and redirects and test two independent user sessions. Request cookie updates must be visible downstream; Set-Cookie and no-store headers must survive response reconstruction.
- Test the actual Navbar-to-dialog integration, mobile disclosure closing, automatic error-dialog focus, focus restoration when there was no trigger click, callback parameter cleanup without removing other URL parts, duplicate submit, long display names, and logged-out cross-tab focus refresh. Native browser focus/inert behavior remains a real-browser gate.
- In-flight pre-logout refresh responses can reinstall a copied access JWT temporarily; fresh server identity verification must reject revoked identity where supported, and refresh cannot renew a revoked session. Do not claim HttpOnly or logout makes a copied JWT instantly invalid. Test local cleanup and remote refresh rejection separately.

1. Record baseline of the selected files and current regression suite; confirm unused browser helper imports with `rg`; add red tests for shared cookie flags and canonical-key/chunk cleanup in `cookie-policy.test.ts` and `route-client.test.ts`.
2. Create `cookie-policy.ts` using the installed SDK canonical naming and options; apply it to server, route adapter and proxy. Remove unused `client.ts`; assert source has no browser Supabase auth imports. Run cookie tests before moving on.
3. Add supported `clearAuthCookiesAtScopes` cleanup in `route-client.ts`, covering session and verifier keys, original/response chunks and host-only Path=/ scope. Test all chunk deletions, preserved unrelated cookies, production flags and malformed/no-cookie cases using the real installed helper.
4. Write `session.test.ts`, then implement server-only `getAuthView()` with `getUser()`, safe displayName mapping and distinct anonymous/unavailable outcomes. Prove no session/token object escapes.
5. Extend proxy matcher and request/response propagation for `/` and auth routes; make shared layout async and pass only auth view to Navbar. Test homepage refresh, request cookie visibility, no cache reuse and authentication failure behavior.
6. Write route tests for fixed callback/provider errors and logout outcomes, then modify the three existing route handlers. Keep exact Origin checks, fixed redirects, callback PKCE exchange and no-store; make local SDK logout plus finally cleanup robust to both error returns and thrown exceptions.
7. Add `GoogleLoginForm.tsx` and reuse it from fallback sign-in page. Test sole Google action, ordinary POST behavior, duplicate-submit prevention, generic error text and no password/registration fields.
8. Add HeaderAuth and native LoginDialog with whitelisted home error handling and focus refresh; write UI tests for anonymous/authenticated/unavailable, open/close/Escape/backdrop, pending/logout errors and parameter removal.
9. Update Navbar's exact CTA and safe props; close its existing mobile menu before opening login. Preserve active-section/nav logic. Add header integration assertions to HeaderAuth tests.
10. Add narrowly scoped global styles for compact cream/forest/red/gold dialog and header auth state; reuse Reply fonts. Dialog max width 440px, viewport margin at least 16px per side, bounded scrolling, visible focus and minimum 44px controls. Truncate display name to fit small headers.
11. Update README with .env, exact callback, browser-storage prohibition, current-session logout semantics and remote-unconfirmed message. Do not place actual credentials or token values in docs.
12. Run automated gates below; fix in-scope failures. Typecheck and build run sequentially. Execute real Google consent/rotation/logout and responsive keyboard walkthrough, record sanitized evidence in `header-google-login_REPORT_13-11-26.md` in this same task folder, and obtain user confirmation before VERIFIED.

## Execution Brief and Phase Completion Rules

This is one delivery slice with internal dependent stages, not three separately approved programs. First lock session policy and test it; then connect verified identity/routes; then attach the header/modal and verify the complete flow. Each stage runs its affected test gate before the next; no stage is declared VERIFIED based only on compilation.

Completion requires integration tests, manual browser flow, cookie/remote refresh state verification, error-path verification and user confirmation. States: PLANNED → CODE DONE → TESTING → VERIFIED. If live revocation/rotation or native-dialog checks cannot run, keep TESTING/CONDITIONAL and name the missing evidence. There are no application DB writes to verify; inspect browser cookie absence/flags and provider refresh rejection instead.

## Verification Evidence

Test context loaded: `process/context/tests/all-tests.md` is the complete current test entrypoint with no deeper test-domain documents; its linked UX/component instructions were followed. Existing source tests discovered: `src/app/auth/auth.test.ts`, `src/lib/supabase/config.test.ts`, `src/lib/supabase/route-client.test.ts`, ticket route/dialog and Sheets tests. Runner is Vitest with current jsdom setup. Native-dialog browser behavior and remote token revocation require hybrid evidence.

| Gate / Scenario | Strategy | Proves SPEC criterion |
|---|---|---|
| header-google-only-dialog: Vitest HeaderAuth integration, sole provider/form and header CTA | Fully-Automated | HAC1 |
| native-dialog-responsive-walkthrough: real browser at 360/390/768/1280/1440, Tab/Shift+Tab, Escape/backdrop/focus restore/menu | Hybrid | HAC2 |
| real-google-httpOnly-session: real consent, 303/callback and browser HttpOnly visibility/storage checks | Hybrid | HAC3 |
| sdk-cookie-policy-and-chunks: installed SDK + adapters, session/verifier/rotated/deleted chunks, flags and canonical key | Fully-Automated | HAC4 |
| header-identity-and-refresh: safe mapping tests plus real reload/access-expiry/multitab/fresh-navigation flow | Hybrid | HAC5 |
| real-current-session-revocation: successful logout then server-only refresh rejection with current credential; no persisted token evidence | Hybrid | HAC6 |
| logout-outcome-and-origin: error and throw paths, unconditional cleanup, fixed warning redirect, 403 before side effects | Fully-Automated | HAC7 |
| server-only-auth-boundary-and-regression: no raw token payload/storage/DB paths; all app tests/lint/types/build | Fully-Automated | HAC8 |

### Exact Automated Commands

Run from workspace root, no type generation/build overlap:

1. `npm.cmd test -- src/lib/supabase/config.test.ts src/lib/supabase/route-client.test.ts src/lib/supabase/cookie-policy.test.ts src/lib/supabase/session.test.ts src/app/auth/auth.test.ts src/components/auth/HeaderAuth.test.tsx`
2. `npm.cmd test`
3. `npx.cmd eslint src --max-warnings=0`
4. `npm.cmd run typecheck`
5. `npm.cmd run build`

Commands 2–5 are the repository's documented application verification gates. The focused paths in command 1 include planned new tests; they must exist before execution. Existing broad lint errors in harness files are recorded separately, never silently attributed to auth. No new runner/package installation is assumed.

TDD red-first scenario inventory (plain descriptions; implementation belongs to EXECUTE): sole Google button and CTA replacement; empty/forged session cannot become identity; HttpOnly on every writer; real SDK cleans base and numbered chunks; logout remote error clears local cookies; external/missing Origin cannot mutate session; callback replay stays anonymous; no token strings in safe output. Write the failing behavior test before each corresponding implementation step.

### Per-Area Coverage and Limits

| Area / Tier | Scenario | Command / Steps | Proves | Does not prove |
|---|---|---|---|---|
| UI / Fully-Automated | All header/dialog states | Focused Vitest command above | Component contracts and control behavior under fixtures | Native browser focus trap or real Google navigation |
| UI / Hybrid | Native dialog and logged-in header | Start `npm.cmd run dev`; complete the keyboard and viewport walkthrough | Browser focus/inert/overflow and integrated navigation | Pixel identity on every browser |
| Session / Fully-Automated | Cookie adapters, cleanup, safe mapping, errors | Focused Vitest command above | Local contract and real installed helper behavior | Provider's actual revoke behavior |
| Session / Hybrid | Login, rotation and logout | Browser consent; refresh after actual access expiry; inspect flags; successful logout then one server-only attempted refresh of captured current credential | Remote exchange/rotation/revocation and local cleanup | Immediate copied-JWT invalidation |
| Visual / Agent-Probe | Retro styling and header fit | Inspect five named widths, long name, error/loading states, reduced motion | Readability and preservation of current theme | Authentication security |

Auth/identity and proxy/trust-boundary changes require at least the hybrid gates above. No developed behavior is marked PASS on Known-Gap alone.

### Hybrid Walkthrough Details

- Preconditions: configured Google provider, exact Supabase redirect allowlist, `.env` SITE_URL matching browser origin, owner-controlled test Google account, running dev server. Production Secure flags additionally need an HTTPS environment or deterministic cookie-header test; local HTTP cannot prove production cookie delivery.
- Log in through header popup; verify callback returns home and header changes. Inspect cookie names/flags only; `document.cookie` must not reveal session or verifier, and storage panels must have no application token entries. Never copy token values into screenshots/reports.
- For refresh, wait until actual access expiry or use an approved test-project expiry setting; do not alter production auth lifetimes casually. Reload and verify rotated session cookies and verified header. Account for configured refresh-reuse grace. Open another tab, logout in one, focus/reload the other; do not claim cross-tab completion without fresh server verification.
- To prove revocation, a test operator keeps the current pre-logout refresh credential only in a temporary server process's memory, performs actual successful logout, then invokes the provider refresh endpoint once with that credential. Require rejection; discard process memory immediately. No credential file/report/DB persistence or browser token endpoint is permitted. Use an owner-authorized test session only. SDK mock success alone is insufficient; provider 401/403/404 suppression makes this gate especially necessary.
- Simulate revoke outage in route tests; verify all local chunks expire and remote-unconfirmed warning is truthful. Test real no-cookie logout twice. Verify Google cancellation and invalid/replayed callback return safe retry UI.
- Inspect two independent browser sessions so rendered identity is not shared or cached. Confirm the navigation, ticket-request popup and footer still work.

### Gap Resolution

| Potential gap | Resolution options and selected rule |
|---|---|
| No native-dialog browser run | A: add a browser test with existing available agent-browser, about one scoped session. B: run manual browser with app server. C: keep CONDITIONAL; jsdom cannot prove inert/focus. D: record missing browser evidence in this task report. Selected B; A is optional without dependency changes. |
| No owner-controlled Google session for live revoke | A: add a temporary in-memory integration probe during EXECUTE, about one scoped session. B: owner supplies test session through browser consent, never chat token. C: keep TESTING/CONDITIONAL. D: record unverified-live-auth gate in this task report. Selected B+A; do not mark HAC3/5/6 verified without it. |
| Production HTTPS/proxy not available | A: cookie-header tests prove flags. B: use approved HTTPS preview for runtime walkthrough. C: production delivery remains unverified. D: retain deployment check in parent plan. Selected A now plus B before production rollout. |

## Test Infra Improvement Notes

Current Vitest mocks do not exercise real Supabase revoke, native dialog behavior or refresh rotation. Add SDK-level cookie cleanup tests within this slice, retain real browser/provider hybrid gates, and store only sanitized status/outcome evidence. A dedicated browser OAuth runner is not required as a new dependency. No database test infrastructure is needed because this slice creates no application persistence. Parent plan's database/RLS/concurrency gaps remain unchanged.

## Rollback and Compatibility

Revert only this slice's named source changes using its execution diff; never reset existing unrelated work. Keep canonical SDK cookie names and host-only Path=/ to avoid orphaned sessions. If auth UI rollback is needed, retain the existing direct sign-in route. Do not weaken HttpOnly just to make browser SDK code work. Do not restore a revoked refresh credential. No DB rollback or token migration is required. Existing non-HttpOnly cookies retain the same name and are overwritten on subsequent policy-controlled writes; verify upgrade and logout cleanup explicitly.

## Strategy Comparison

Planning signals: S1 multi-package=0; S2 auth=1; S3 three approaches=0 (one constrained architecture); S4 phase program=0; S5 user asks detail=1; S6 trust boundary=1; S7 five-plus files=1. Score 4. Chosen fit is sequential for a single dependent plan artifact; prior targeted UI/auth research already supplied evidence.

| Strategy | Agent math / relative cost | Fit |
|---|---|---|
| Sequential | 1 planner, about 1x | Selected: one artifact and tightly related auth decisions |
| Parallel subagents | 2 focused reviewers + synthesis, about 3x | Useful for independent UI/security validation after plan |
| Workflow | 3 deterministic actor steps, about 3x | Unnecessary automation for this one slice |
| Coordinated team | 3 members × 1 round, about 3x | No ongoing cross-file implementation collaboration needed in PLAN |

For VALIDATE, recommend two focused reviews (session/security and UI/test feasibility) followed by one synthesis. This is an estimate, not authorization to implement or launch a large fan-out. EXECUTE should stay one worker because cookie adapters/routes/layout share contracts.

## Resume and Execution Handoff

1. **Selected plan:** `process/general-plans/active/sepay-ticket-payment_13-11-26/header-google-login_PLAN_13-11-26.md` only. Parent sepay plan and same-folder foundation report are supporting context.
2. **Last completed phase:** read-only source/UI/auth research plus this PLAN. No implementation occurred in this planning turn.
3. **Validate-contract status:** pending. Parent payment contract does not automatically validate new HttpOnly/header/logout requirements.
4. **Context loaded:** `process/context/all-context.md`, `process/context/planning/all-planning.md`, `process/context/uxui/all-uxui.md`, `process/context/uxui/component-contracts.md`, `process/context/tests/all-tests.md`; plan-generation contract/example; test-coverage/security/scenario/docs/strategy skills; current source/SDK; situation scan and direct active-plan inventory; parent SPEC and foundation evidence.
5. **Next step:** VALIDATE this child plan, focusing on installed helper signatures, cookie option merge precedence, local revoke failure and cleanup, cache behavior, error UX and hybrid proof feasibility. Then explicit execution approval must name this exact child file. Preserve all unrelated dirty files.

## Validate Contract

Status: CONDITIONAL
Date: 13-11-26
date: 2026-11-13
generated-by: outer-pvl

Parallel strategy: parallel-subagents for independent investigation; sequential execution.
Rationale: four signals (auth/public surface, requested detail, trust boundary, 5+ files); independent reviews synthesized before one tightly coupled implementation. Four required dimension reviews and two section reviews were supplied by the root orchestrator. No unresolved FAIL was found. Review concerns have explicit implementation additions above; live gates remain completion conditions.

### Validation audit and accepted scope

V1: explicit selected child plan confirmed; repository situation scan completed on main; existing dirty work retained; context, planning, UX/component and test routing loaded; existing auth/config/adapter tests discovered. Structural validator passed with zero failures and zero warnings. Planned new files are intentional creates, not missing dependencies. SDK public cleanup helper and actual cookie writers were inspected. No umbrella plan with a Stable Program Goal section exists in active plans.

Layer 1 dimensions:

| Layer 1 dimensions | Status |
|---|---|
| Infra fit | CONCERN — catch proxy exceptions and preserve headers/cookies before public rendering |
| Test coverage | CONCERN — real SDK tests plus browser/provider hybrid gates required |
| Breaking changes | PASS — one Navbar caller, unused browser helper, stable callback/routes, no DB/payment change |
| Security surface | CONCERN — deterministic legacy-cookie upgrade and precise logout/JWT limits |

Layer 2 sections:

| Layer 2 sections | Status |
|---|---|
| Session/cookie/logout | CONCERN — SDK helper feasible; prove session/verifier chunks and error/throw cleanup |
| Header/UI/cache | CONCERN — targets feasible; distinguish outage, verify final headers and native dialog lifecycle |

Totals: 0 FAILs / 5 CONCERN review groups / 1 PASS. All actionable concerns are assigned to the Validation additions and the existing checklist. These concern counts describe pre-implementation work, not permission to omit the gates.

### Test gates

Matrix revision: 13-11-26, user requested an additional test-matrix validation. One authoritative run-set below supersedes the fragmented table. IDs T01–T22 identify scenarios for execution evidence. **B means required by this plan, not already passed.** New test files are planned targets until the execute actor creates them. No test or live result is claimed by writing this matrix.

Exact commands (from the loaded npm/Vitest test context, with explicit selected file paths):

- **C1:** `npm.cmd test -- src/components/auth/HeaderAuth.test.tsx`
- **C2:** `npm.cmd test -- src/lib/supabase/cookie-policy.test.ts src/lib/supabase/route-client.test.ts`
- **C3:** `npm.cmd test -- src/app/auth/auth.test.ts`
- **C4:** `npm.cmd test -- src/lib/supabase/session.test.ts`
- **C5:** `npm.cmd test`
- **C6:** `npx.cmd eslint src --max-warnings=0`, then `npm.cmd run typecheck`, then `npm.cmd run build` (three separate sequential commands).
- **C7:** `npm.cmd run dev`, then the deterministic browser/provider steps specified by each Hybrid row and Hybrid Walkthrough Details. Requires configured provider, exact redirect allowlist and an owner-controlled Google account. Start a server only if the approved app origin is not already served; do not silently change SITE_URL or use another port.

| criterion id | behavior | strategy | proving test | gap-resolution | What this row does NOT prove |
|---|---|---|---|---|---|
| HAC1 / T01 | Replace event CTA; anonymous header opens one Google-only form; no password/email/signup controls | Fully-Automated | C1; mount actual Navbar with safe auth view, click Login, inspect form action/method and sole provider | B | Native browser focus or real provider navigation |
| HAC1 / T02 | Login submit has pending feedback, prevents duplicate submit and preserves close affordance | Fully-Automated | C1; submit the shared form twice before navigation; assert one effective submission and status | B | Google or network success |
| HAC2 / T03 | Dialog closes by close/Escape/backdrop-only; mobile disclosure closes first; focus restores after click or error auto-open | Fully-Automated | C1; exercise dialog handlers and Navbar integration using explicit dialog shims; include inside-panel click and no-prior-trigger case | B | Native focus trapping/inert; shim success is not browser acceptance |
| HAC2 / T04 | Native dialog traps focus, makes background inert, restores focus, and fits mobile/tablet/desktop | Hybrid | C7; 360/390/768/1280/1440 widths; Tab/Shift+Tab, Escape, backdrop, scrolling and error auto-open; assert no overflow | B | Every browser engine or pixel-identical rendering |
| HAC3 / T05 | Google start and PKCE callback use exact Origin/fixed destinations; reject missing/provider-error/replayed/wrong-host codes; ignore malicious next | Fully-Automated | C3; test 303, expected Location, cookie forwarding, error-code whitelist and no token response body with route fixtures | B | Actual Google exchange or provider replay enforcement |
| HAC3 / T06 | Real Google consent exchanges PKCE and returns verified identity with HttpOnly cookies; no tokens in Web Storage/HTML/props | Hybrid | C7; login through popup, observe callback and home, inspect cookie flags/names and storage without recording values | B | Logout revocation or actual expiry refresh |
| HAC4 / T07 | One shared policy applies HttpOnly/Lax/root-path/host-only and production Secure to server, route and proxy writers | Fully-Automated | C2; inspect emitted Set-Cookie in production/development fixtures for all three adapters and OAuth verifier writes | B | Browser delivery over real HTTPS |
| HAC4 / T08 | Legacy canonical cookie/chunks upgrade on first matching request with no SDK event; current write/delete wins; no phantom chunks/unrelated changes | Fully-Automated | C2; valid-session/no-refresh fixture; base, numbered, verifier, response-rotated/deleted and unrelated cookie cases | B | Legacy cookies at unknown historical domains/paths outside the known root scope |
| HAC4 / T09 | Public SDK helper expires base/session/verifier chunks with matching flags and canonical key, including logout throw/error/no-session | Fully-Automated | C2 and C3; invoke installed real cleanup helper, inspect Max-Age=0 for every known chunk; unrelated cookies survive | B | Provider accepts remote revocation |
| HAC4 / T10 | HTTPS browser receives Secure/HttpOnly cookies and logout clears them at production host/path | Hybrid | C7 workflow on an approved HTTPS preview/production-equivalent origin with exact callbacks; inspect final headers and browser cookie absence | B | Production deployment readiness if only localhost/header fixtures were available |
| HAC5 / T11 | Identity maps verified getUser to minimal displayName; empty/forged/stale session cannot become authenticated; outage differs from anonymous | Fully-Automated | C4; auth success, missing session, invalid identity, provider-returned error and thrown-network fixtures; assert output keys contain no tokens/session | B | Actual provider revocation checks |
| HAC5 / T12 | Home proxy refresh propagates request/response cookies; config/refresh throw does not 500 public home; no-store survives reconstruction | Fully-Automated | C2; homepage matcher, returned auth error, thrown refresh/config failure, SDK cookie-write then throw; assert downstream cookie values and final headers | B | Running Next/CDN final HTML/RSC behavior |
| HAC5 / T13 | Reload after real access expiry rotates session and keeps verified header; second tab updates after login/logout on focus | Hybrid | C7; actual expiry or approved test-project TTL, reload/focus both tabs; respect project reuse grace and do not save token values | B | Immediate rejection of a rotated refresh token inside reuse grace |
| HAC5 / T14 | Two independent users never see each other's identity; final HTML/RSC/auth redirects are private/no-store | Hybrid | C7; two isolated browser sessions plus anonymous session; fresh and client navigation; inspect final HTTP headers and rendered identity | B | Unconfigured production CDN/proxy behavior |
| HAC6 / T15 | Logout invokes current-session scope, successful fixed 303 and unconditional cookie cleanup; repeat logout is locally idempotent | Fully-Automated | C3 and C2; assert local scope, success/no-session/error/throw paths, base/chunks/verifier expiry and fixed warning redirect | B | Remote refresh rejection or another device's real session survival |
| HAC6 / T16 | Actual successful logout rejects refresh using current pre-logout credential and preserves an independent device session | Hybrid | C7; owner-authorized credential stays only in temporary server memory; actual logout; exactly one rejected refresh; verify other isolated session still signs in; discard memory | B | Instant copied-access-JWT invalidation or Google account disconnection |
| HAC7 / T17 | Missing/null/foreign Origin returns 403 before SDK or cookie effects; remote error/throw still clears local state and warns truthfully | Fully-Automated | C3 and C2; spies for no SDK call on rejection; cleanup assertions on revoke error/throw; never report confirmed revoke on failure | B | Recovery of a provider session during a real outage |
| HAC7 / T18 | Header has authenticated/anonymous/unavailable and logout pending/failure states; safe auth_error auto-opens once and removes only that parameter | Fully-Automated | C1; long name, whitespace metadata, fixed codes, unknown codes, other search params/hash, focus retry and repeat render | B | Native browser announcement quality or provider availability |
| HAC8 / T19 | No token data escapes safe view; browser SDK helper removed with no consumers; no application token persistence introduced | Fully-Automated | C4 and C5; safe-output fixtures plus source-boundary assertions in the planned session/cookie test files covering browser SDK/Web Storage/token response/DB writers | B | Whole-repository security audit or provider's internal Auth storage removal |
| HAC8 / T20 | Application regressions, types and production build remain valid; ticket dialog/navigation/footer retain contracts | Fully-Automated | C5 then C6; full Vitest includes existing ticket route/dialog/Sheets tests; typecheck and build sequential | B | Live Sheets writes, real payments or full visual acceptance |
| HAC2 / T21 | Retro styling, name truncation, error/loading contrast, 44px controls, focus visibility and reduced motion remain usable | Agent-Probe | C7 server; judge five named widths, long/empty names and all header/dialog states against existing theme; save sanitized screenshots only | B | Authentication security, pixel equivalence or native behavior without T04 |
| HAC5,HAC6 / T22 | In-flight pre-logout response cannot silently renew revoked refresh; fresh identity checks reject revoked identity where supported | Hybrid | C7; two tabs/isolated request timing, logout during pending refresh, then fresh navigation and attempted renewal; record stale-JWT limit accurately | B | Instant stateless access-JWT invalidation before exp |

Tier completeness (all four skill tiers assessed):

| Skill tier | Assignment | Rule |
|---|---|---|
| Fully-automated | T01–T03, T05, T07–T09, T11–T12, T15, T17–T20 | Deterministic Vitest/local gates; planned tests must exist and pass before claiming coverage |
| Hybrid | T04, T06, T10, T13–T14, T16, T22 | Auth, proxy and trust-boundary areas meet minimum Hybrid tier; unavailable preconditions keep the affected criterion TESTING/CONDITIONAL |
| Agent-Probe | T21 | Judgment supplements deterministic functional checks |
| Known-Gap | **None accepted in this slice** | This tier is a residual, never a proving strategy. Missing owner consent/HTTPS/expiry evidence is an unexecuted Hybrid gate, not silently reclassified as Known-Gap. A later deferral needs a named backlog stub, rationale and explicit residual disposition |

gap-resolution: A = proven now; B = implement/prove in this plan; C = named later plan; D = named backlog residual. Every current row is B; validation checks feasibility and coverage assignment, not implementation completion. Use the existing Gap Resolution alternatives if a Hybrid precondition is unavailable. Production HTTPS, provider consent and actual expiry must not be declared passed using local mocks.

TDD starter inventory is separate from the matrix so the run-set remains one table. These are plan-only skeletons, not permanent tests that mirror implementation. EXECUTE replaces each placeholder with meaningful assertions before the corresponding production edit. No stub is added for Hybrid, Agent-Probe or Known-Gap.

```ts
// Each behavior string matches its matrix scenario; implement in C1/C2/C3/C4 owners above.
const redScenarios = [
  "T01: Replace event CTA; anonymous header opens one Google-only form; no password/email/signup controls",
  "T02: Login submit has pending feedback, prevents duplicate submit and preserves close affordance",
  "T03: Dialog closes by close/Escape/backdrop-only; mobile disclosure closes first; focus restores after click or error auto-open",
  "T05: Google start and PKCE callback use exact Origin/fixed destinations; reject missing/provider-error/replayed/wrong-host codes; ignore malicious next",
  "T07: One shared policy applies HttpOnly/Lax/root-path/host-only and production Secure to server, route and proxy writers",
  "T08: Legacy canonical cookie/chunks upgrade on first matching request with no SDK event; current write/delete wins; no phantom chunks/unrelated changes",
  "T09: Public SDK helper expires base/session/verifier chunks with matching flags and canonical key, including logout throw/error/no-session",
  "T11: Identity maps verified getUser to minimal displayName; empty/forged/stale session cannot become authenticated; outage differs from anonymous",
  "T12: Home proxy refresh propagates request/response cookies; config/refresh throw does not 500 public home; no-store survives reconstruction",
  "T15: Logout invokes current-session scope, successful fixed 303 and unconditional cookie cleanup; repeat logout is locally idempotent",
  "T17: Missing/null/foreign Origin returns 403 before SDK or cookie effects; remote error/throw still clears local state and warns truthfully",
  "T18: Header has authenticated/anonymous/unavailable and logout pending/failure states; safe auth_error auto-opens once and removes only that parameter",
  "T19: No token data escapes safe view; browser SDK helper removed with no consumers; no application token persistence introduced",
];
for (const scenario of redScenarios) {
  test(`should ${scenario}`, () => { throw new Error(`NOT IMPLEMENTED — TDD stub: ${scenario}`); });
}
// T20 is the existing regression/build command gate C5+C6, not a new artificial failing test.
```

Coverage cross-check: HAC1=T01/T02; HAC2=T03/T04/T21; HAC3=T05/T06; HAC4=T07/T08/T09/T10; HAC5=T11/T12/T13/T14/T22; HAC6=T15/T16/T22; HAC7=T17/T18; HAC8=T19/T20. No HAC lacks a proving gate. Each high-risk behavior retains a real-system row in addition to deterministic local tests.

Legacy line form:
- local session/UI: Fully-automated: focused Vitest commands and complete application gates above.
- real identity and revoke: hybrid: configured provider, running app and owner-controlled Google session plus Hybrid Walkthrough Details.
- visual fit: agent-probe: five widths and long-name/error/loading review.

Dimension findings:
- Infra fit: CONCERN — proxy getClaims throw must not 500 public home; preserve mutations/no-store and render unavailable through verified identity helper.
- Test coverage: CONCERN — current mocks insufficient for chunk cleanup, native focus and remote revoke; new SDK tests and live gates specified.
- Breaking changes: PASS — stable endpoints and canonical key, no browser-client consumers, no application DB or payment changes.
- Security surface: CONCERN — rewrite existing canonical cookies on first matched request even without refresh event; no token exposure; copied JWT expiry remains a documented limit.
- Session/cookie/logout feasibility: CONCERN — supported helper signature inspected; expiry covers base/numbered/verifier cookies and unrelated-cookie preservation; do not assume null SDK error independently proves revoke.
- Header/UI/cache feasibility: CONCERN — real edit targets exist; add error-auto-open focus behavior, final HTTP header checks and two-user isolation proof.

Open gaps: real Google consent, actual access expiry/rotation, refresh rejection after logout, native browser focus/inert and production HTTPS delivery are not yet executed. EXECUTE must attempt available gates and keep TESTING/CONDITIONAL for missing evidence. No custom token persistence, live payment, DB schema or elevated key is authorized. No new unknown architectural blocker was identified.

### What This Coverage Does NOT Prove

- Header component tests cannot prove native browser focus trapping, inert behavior or Google consent navigation.
- SDK/cookie tests cannot prove Supabase remotely revokes a real session; the independent refresh-rejection test is required.
- Mock session/proxy tests cannot prove actual rotation, cross-tab races, CDN behavior or production proxy header preservation.
- Build/lint/type checks cannot prove live OAuth, provider availability, expiry timing, remote revocation or production HTTPS cookie delivery.
- Local HTTP/browser checks do not prove Secure-cookie delivery on production HTTPS. Header evidence never authorizes protected APIs.
- Successful logout does not instantly invalidate a previously copied access JWT, revoke other devices, or disconnect Google's authorization. No plan claim exceeds those boundaries.

Accepted by: user — “validate plan và thực hiện plan” authorizes validation followed by implementation of this selected plan and its stated hybrid gates; session applies actionable review corrections within the same scope. Accepted completion limits are the plan's live-provider/native-browser/HTTPS evidence gates and JWT expiry/provider-internal-session constraints. This is not an assertion that live verification has already passed.

Gate: CONDITIONAL — no FAILs; actionable review corrections added, execution authorized, missing live evidence must remain explicit before VERIFIED.

## Autonomous Goal Block

SESSION GOAL: Implement the selected header Google-only login plan with server-owned HttpOnly Supabase session cookies, safe header identity, current-session logout and no application token persistence.
Reference for latest state: process/general-plans/active/sepay-ticket-payment_13-11-26/header-google-login_PLAN_13-11-26.md
Autonomy rules: Implement and test named touchpoints; preserve unrelated dirty work; fix in-scope regressions. Current user explicitly authorized validate followed by execute.
Hard stops: No database migration, payments, elevated secrets, token logging or external credential persistence. Do not claim real revoke, rotation or native browser acceptance without evidence.
Next phase: EXECUTE.
Contract summary: CONDITIONAL; add deterministic legacy-cookie upgrade, proxy error resilience, full chunk cleanup and no-store isolation; run automated gates and attempt all hybrid gates; retain TESTING when required live evidence unavailable.
Execute start command: ENTER EXECUTE MODE for this exact child plan (already authorized in current user instruction).

## Primary References

- [Supabase sessions](https://supabase.com/docs/guides/auth/sessions): JWT access/opaque refresh, refresh rotation and provider session storage.
- [Supabase SSR advanced guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide): server-only cookie ownership and browser-client limitation.
- [JavaScript auth.signOut](https://supabase.com/docs/reference/javascript/auth-signout): scopes and access JWT expiry limitation.
- [Supabase signout guide](https://supabase.com/docs/guides/auth/signout): current-session/global behavior.
- Installed source: `node_modules/@supabase/ssr/src/utils/constants.ts`, `src/clearAuthCookiesAtScopes.ts`, `src/index.ts`; `node_modules/@supabase/auth-js/src/GoTrueClient.ts` `_signOut`; actual package/lock resolve the version for EXECUTE preflight.

Plan complete. Review carefully. Say **ENTER VALIDATE MODE** when ready for required validation before implementation.

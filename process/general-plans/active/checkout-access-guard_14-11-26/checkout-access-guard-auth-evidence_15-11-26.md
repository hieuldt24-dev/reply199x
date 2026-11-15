# Auth implementation evidence

Scope: `src/lib/supabase/session.ts`, `src/components/auth/HeaderAuth.tsx`, `LoginDialog.tsx`, new session/HeaderAuth tests. At the integrating execute-agent's request, corrected two pre-existing expected URLs in `src/app/auth/auth.test.ts` from `auth_auth_error` to the actual `auth_error` query name; callback routes were unchanged.

## Captured before source edits

Command: `npm.cmd test -- src/components/auth/HeaderAuth.test.tsx -t 'measures the identical' --disableConsoleIntercept`.

Real run against untouched HeaderAuth: twenty synchronous visible focus events caused **20 router refresh calls**, **0 extra session fetches**, elapsed **1.5068 ms**. This is local jsdom event/React execution time, not network latency or a production benchmark. The new initial prompt, recovery, outage classification and focus coalescing assertions failed against baseline.

## Captured after implementation

Same twenty-focus workload: **1 router refresh**, **0 session fetches**; observed local elapsed samples **6.5042 ms**, **5.7616 ms**, **6.8972 ms** across targeted runs. Only request-count reduction is claimed; React transition overhead means these measurements do not establish latency improvement. No p50/p95 inference is made from these few samples.

`npm.cmd test -- src/lib/supabase/session.test.ts src/components/auth/HeaderAuth.test.tsx src/app/auth/auth.test.ts --disableConsoleIntercept`: **37 passed**, 3 files.

`npx.cmd eslint src/lib/supabase/session.ts src/lib/supabase/session.test.ts src/components/auth/HeaderAuth.tsx src/components/auth/HeaderAuth.test.tsx src/components/auth/LoginDialog.tsx src/app/auth/auth.test.ts --max-warnings=0`: **PASS**.

Coverage includes returned/thrown auth outages and no-session errors; upstream 503 takes precedence over an invalid-session code; initial anonymous prompt; native cancel dismissal; stable dismissal through rerender; manual reopen; remount prompt; callback recovery wording/query cleanup; authenticated suppression; no redundant session fetch; visible/hidden focus coalescing and listener cleanup.

## Browser handoff

Anonymous: accessible dialog `Đăng nhập REPLY 199X`, focused `Tiếp tục với Google`, close button `Đóng cửa sổ đăng nhập`, Escape dismissal, header `Đăng nhập` reopens. Dialog ID is `header-login-dialog`, matching aria-controls.

Authenticated: display name and `Đăng xuất`, no login dialog.

Unavailable: visible status `Chưa xác minh được phiên đăng nhập. Vui lòng thử lại.` and button `Kiểm tra lại phiên đăng nhập`; recovery refreshes server auth without opening Google sign-in. No production fixture route or mocked production auth was introduced. Real browser verification remains owned by the orchestrator.

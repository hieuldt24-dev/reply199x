---
phase: ticket-order-form-redesign-execute
date: 2026-11-18
status: COMPLETE_WITH_GAPS
feature: none
plan: process/general-plans/active/ticket-order-form-redesign_18-11-26/ticket-order-form-redesign_PLAN_18-11-26.md
---

# REPORT — Order form redesign (EXECUTE)

**BLUF:** The order dialog is now 3 steps (Phiếu nước & thông tin → Khảo sát nhanh → Xác nhận). All local gates pass apart from the 2 known baseline issues. The POST body, idempotency and PayOS redirect are unchanged. Still pending: the EVL re-run by vc-tester, the owner's visual review and the owner's commit. Nothing was committed.

## What Was Done
| File | Change | Lines (final) |
|---|---|---|
| `src/app/(routes)/_components/TicketRequestDialog.tsx` | Dialog shell with `step` state, `noValidate`, all steps mounted with `hidden`, sticky footer (total, status, Quay lại / Tiếp tục / submit), step-change scroll and heading focus, attendee + survey re-check in `handleSubmit` before fetch (returns to the first invalid step). The fetch, status and idempotency block is copied verbatim | 272 |
| `TicketAttendeeFields.tsx` (new) | Step 1: fields, inline errors (`aria-invalid` + `aria-describedby` on inputs), collapsible birth year/gender (mobile only), quantity stepper 1..`TICKET_ORDER_LIMIT`, merch select from `MERCH_OPTIONS`; exports `validateAttendeeStep` | 128 |
| `TicketOrderSteps.tsx` (new) | Progress header: `ol` with `aria-current="step"`, "Bước N/3", back icon (mobile), close button | 38 |
| `TicketOrderSummary.tsx` (new) | `formatVnd`, `orderTotalVnd`, summary in 3 variants (stub / mobile bar / sticky footer) | 46 |
| `TicketStub.tsx` (new) | Desktop stub: poster (`RemoteImage` + fallback), 22 / On The Radio / 15:00 – 19:00, perforation, summary | 38 |
| `TicketOrderReview.tsx` (new) | Step 3 review list and notes | 61 |
| `TicketSurveyFields.tsx` | Presentation only: Q6 chips (real checkboxes), Q8 select, Q9 segmented (real radios); labels, order, errors and `data-invalid` kept | 157 |
| `TicketRequestDialog.test.tsx` | 18 existing tests updated for the step flow (no assertion removed); 8 required new tests added → 26 | 496 |
| `src/styles/globals.css` | Old `.ticket-request-dialog*` block replaced by a new block with `--tod-*` tokens scoped to the modal; mobile CSS only in `@media(max-width:760px)`; no gradients | 881 (+136/−75) |
| `src/app/layout.tsx` | Playfair Display italic 700 through `next/font/google` (`--font-playfair` on `<html>`); the Be Vietnam Pro `@import` is unchanged | 30 |

TDD: the 26 tests were written first and all 26 failed against the old component (missing step UI). After the implementation, all 26 passed.

## Test Gate Outcomes (PowerShell, sequential)
| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `npx.cmd vitest run "src/app/(routes)/_components"` | 0 | 26/26 passed |
| 2 | `npx.cmd vitest run` | 1 | 357 passed, 1 failed: only the known baseline `src/lib/supabase/route-client.test.ts > requires secure cookies in production` (not touched) |
| 3 | `npm.cmd run typecheck` | 0 | clean |
| 4 | `npm.cmd run lint` | 1 | 461 problems (269 errors, 192 warnings), the same as the known baseline, all under `.agents/.claude/.codex`; 0 findings under `src/scripts/supabase`. Scoped `npx.cmd eslint "src/app/(routes)/_components" src/app/layout.tsx --max-warnings=0` → exit 0 |
| 5 | `npm.cmd run build` | 1, then 0 | Run 1 stopped on the Next 16.4.3 security advisory after a successful compile; the retry passed (17/17 pages). next/font downloaded Playfair Display, so the Georgia fallback was not needed. The advisory recommends `next upgrade --agent=security`; that is a separate user-approved task and was not run |
| 6 | `Get-FileHash src/lib/ticket-orders/survey.ts` | — | `1DA21F7D…E1B2BC` (matches) |
| 7 | Frozen paths | — | `git status` shows changes only under `_components/`, `layout.tsx`, `globals.css`, the task folder and the hook log. Nothing under `src/lib`, `src/app/api`, `supabase` or `scripts`, and no env file. The privacy hook blocked naming `.env.example` in `git diff`, so this was checked with a whole-repo `git status` instead |
| — | `grep -rnE "[Vv]é\|VÉ" src` | — | no matches |
| 8 | Agent-probe (agent-browser, `next dev -p 3107`) | — | See below. The dev server also hit the advisory stop on the first start and started on retry. The server was stopped afterwards and nothing listens on port 3107 |

### Agent-probe evidence (screenshots in this task folder)
`redesign-shot-w{360,390,768,1280,1440}-{step1,step1-errors,step2,step3}.png` and `redesign-shot-w1280-step3-focus.png`.
- No horizontal overflow at any width: dialog `scrollWidth == clientWidth`, page `scrollWidth 360 == 360`. The old poster-notch overflow at 360/390 is gone, because the stub is hidden on mobile and the new notch-free CSS has no `::after right:-12px`.
- Mobile (360/390): full screen; the footer is `position:sticky` and its bottom equals the viewport height (780/844); the stub is hidden and the green summary bar is shown; progress shows as 3 segments.
- Desktop (768/1280/1440): 940px modal (728px at 768) with the stub on the right; the footer is static at the bottom of the form column.
- An empty "Tiếp tục" shows 2 inline errors and moves focus to the name field. A step change moves focus to the step heading. The `em` title uses "Playfair Display".
- No order was submitted and no credentials were used.

## Plan Deviations
1. **`TicketRequestDialog.tsx` is 272 lines (target ≤ 220, E6).** About 85 lines are the `handleSubmit` fetch/status/idempotency block, which the plan says to keep unchanged (AC1–3, E1). Splitting it out would need a new file that is not in the plan. Impact: size only.
2. **`useTicketSurvey.validate()` focus selector changed** from `querySelector("input")` to `querySelector("input, select")`. This was needed because Q8 is now a `<select>` (D3); without the change, the area group would get no focus. The hook signature is unchanged.
3. **Tests adapted to the new presentation:** Q8 checks select options instead of 8 radios (same id/label equality). The duplicate-activation test now fills contact details, because the client now rejects an empty name before fetch, as the plan requires. The reset test queries hidden step-2 controls with `{hidden:true}`. No body, key or message assertion was relaxed.
4. **Screenshots are stored flat in the task folder** (`redesign-shot-*`), with no `screenshots/` subfolder, to follow the flat task-folder rule.
5. The optional `TicketAttendeeFields.test.tsx` was not created; `validateAttendeeStep` is covered through the dialog tests.

## What Was Skipped or Deferred
- Updating `process/context/uxui/component-contracts.md` (step 10). This belongs to UPDATE PROCESS.

## Test Infra Gaps Found
- No automated browser e2e (known, accepted). Real iOS safe-area and the virtual keyboard were only emulated through the viewport.

## Known gaps / concerns for owner review
- At 768px the desktop layout leaves a 420px form column; the merch select text is cut off ("Không kèm merch…"). Consider moving the stub breakpoint up later.
- On desktop, `showModal()` autofocuses the close button, which shows the yellow focus ring on open.
- The stub heading wraps "REPLY / 199X" and "Đà / Nẵng" at 300px.
- Awkward wording to review: "Thêm năm sinh và giới tính (tùy chọn)"; review labels "Biết đến qua", "Tham gia"; empty optional fields show "Không cung cấp"; gender "" shows "Không nêu" (the old wording was "Không cung cấp").
- No PayOS/live checks (out of scope).

## Closeout Packet
- Plan: `process/general-plans/active/ticket-order-form-redesign_18-11-26/ticket-order-form-redesign_PLAN_18-11-26.md`
- State: CODE DONE. Classification: **Keep in active/testing** until the EVL re-run by vc-tester and the owner's visual review.
- Next: EVL (vc-tester re-runs gates 1–7) → owner review of screenshots → owner commit → UPDATE PROCESS (update component-contracts).

## Forward Preview
- **Test Infra Found:** the dialog tests use `hidden` steps. Role queries skip inactive steps, so tests must navigate with "Tiếp tục"/"Quay lại" or pass `{hidden:true}`.
- **Blast Radius Changes:** 5 new components in `_components/`; CSS classes renamed (`__close`/`__submit`/`__poster` → `__icon`/`__primary`/`__stub`).
- **Commands to Stay Green:** gates 1–7 above (PowerShell only for Vitest).
- **Dependency Changes:** none (next/font is built into Next).

Follow-up stubs created: none. CONTEXT_PARTIAL: none.

TL;DR: 3-step form done, 26/26 dialog tests, typecheck/build green, lint and full-suite failures are only the known baselines; awaiting EVL, owner review and commit.

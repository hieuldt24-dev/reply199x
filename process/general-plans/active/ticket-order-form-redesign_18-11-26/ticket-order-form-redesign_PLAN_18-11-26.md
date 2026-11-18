---
name: plan:ticket-order-form-redesign
description: "Đổi giao diện TicketRequestDialog sang 3 bước theo brief retro, giữ nguyên body POST, khảo sát, idempotency và luồng PayOS"
date: 18-11-26
feature: none
---

# PLAN — Đổi giao diện form đặt phiếu nước (3 bước)

**BLUF:** Một kế hoạch SIMPLE-COMPLEX gồm 4 bước thực thi trong 1 lần EXECUTE tuần tự (opus). Chỉ chạm thư mục `_components/`, `globals.css`, `layout.tsx` (font Playfair). Mọi bước luôn render (ẩn bằng `hidden`) nên `FormData`, fingerprint idempotency và handler submit giữ nguyên.

Status: CODE DONE 2026-11-18 (EXECUTE xong; chờ EVL vc-tester, duyệt trực quan của chủ repo, chủ repo commit)
Complexity: COMPLEX

## Current Execution State
- Last updated: 2026-11-18
- Bước: EXECUTE xong → kế tiếp EVL (vc-tester chạy lại gate 1–7)
- Checklist: 1–9 xong; 10 = gate + trực quan xong, cập nhật `component-contracts.md` để dành UPDATE PROCESS
- Gate: G1 26/26 exit 0; G2 357/358 (1 fail baseline `route-client` secure cookies); G3 exit 0; G4 461 problems baseline (0 trong `src`), lint scoped exit 0; G5 build exit 1 (advisory) → retry exit 0, Playfair tải được; G6 hash khớp; G7 không đổi file đóng băng
- Report: `ticket-order-form-redesign_REPORT_18-11-26.md` (cùng thư mục); ảnh `redesign-shot-w*.png`
- Deviations: `TicketRequestDialog.tsx` 272 dòng (> 220, do giữ nguyên khối fetch); selector focus khảo sát `input, select` (Q8 select)
- Chưa làm: EVL, duyệt trực quan, commit (chủ repo)

## Overview
Context: `process/context/all-context.md` → `uxui/all-uxui.md`, `uxui/component-contracts.md`, `tests/all-tests.md`. Hộp thoại đặt phiếu nước hiện là 1 trang dài; user muốn giao diện 3 bước theo brief retro.

## Acceptance Criteria
1. Body POST và thứ tự key `attendee` không đổi; fingerprint ổn định; quy tắc xoay idempotency key giữ nguyên.
2. Kiểm tra client chạy trước fetch; không bao giờ gửi request không hợp lệ; chống gửi trùng (`submittingRef`) giữ nguyên.
3. Mọi thông báo trạng thái/lỗi hiện tại hiển thị nguyên văn.
4. 3 bước điều hướng được, có tiến độ, kiểm tra theo bước, tổng tạm tính live (cuống phiếu + thanh dính).
5. Stepper 1..4; merch thật; nhãn khảo sát nguyên văn, không `*`.
6. Mobile ≤760px: toàn màn hình, thanh dính đáy có safe-area, năm sinh/giới tính thu gọn.
7. A11y: label thật, fieldset/legend, aria-label nút icon, focus vàng, touch ≥44px.
8. Không file đóng băng nào bị đổi; tất cả gate xanh.

## Phase Completion Rules
- Trạng thái chỉ là `CODE DONE` khi code xong; `VERIFIED` chỉ khi gate 1–7 xanh do vc-tester chạy và agent-probe trực quan đạt.

SPEC: `process/general-plans/active/ticket-order-form-redesign_18-11-26/ticket-order-form-redesign_SPEC_18-11-26.md`

## Tiền điều kiện (BẮT BUỘC trước EXECUTE)
- Chủ repo commit phần survey + đổi chữ "vé"→"phiếu nước" đang chưa commit (orchestrator không commit). File trùng: `TicketRequestDialog.tsx`, `TicketSurveyFields.tsx`, `TicketRequestDialog.test.tsx`, `src/styles/globals.css`.
- `survey.ts` sha256 phải vẫn là `1da21f7d8380a2a65ea3b4c7df69cc15d782eda043066c1a90f57a6374e1b2bc`.

## Quyết định chính
| Chủ đề | Chọn | Loại bỏ |
|---|---|---|
| Trạng thái bước | `step` (1/2/3) trong `TicketRequestDialog`; tất cả bước luôn mount, bước không active có `hidden` | Unmount từng bước (mất FormData); chuyển toàn bộ sang controlled state (viết lại handler, rủi ro fingerprint) |
| Kiểm tra | `noValidate` trên form; hàm thuần `validateAttendeeStep(formData)` trong component mới cho tên/email/năm sinh/SĐT; khảo sát dùng `survey.validate()` sẵn có | Dựa vào validation gốc trình duyệt (bị chặn bởi input ẩn) |
| Submit | Nút "Tiếp tục" ở bước 1–2 là `type="button"` chuyển bước; chỉ bước 3 là `type="submit"`. `handleSubmit` chạy lại cả 2 kiểm tra trước fetch; nếu sai, nhảy về bước lỗi đầu tiên | Submit ở mỗi bước |
| Mobile | CSS thuần `@media (max-width:760px)`: ẩn panel cuống phiếu, hiện thanh tóm tắt + thanh dính đáy (cả hai luôn có trong DOM) | JS matchMedia |
| Poster | Giữ `RemoteImage` local + fallback có nhãn | Placeholder thuần (bỏ ảnh đang dùng) — chờ user |
| Font | Playfair Display italic 700 qua `next/font/google` → biến `--font-playfair` trên `<html>`; Lobster/Be Vietnam Pro dùng cái có sẵn | `<link>` Google Fonts; chuyển toàn site sang next/font |

## Touchpoints
| File | Thay đổi |
|---|---|
| `src/app/(routes)/_components/TicketRequestDialog.tsx` | Vỏ dialog + state `step`, kiểm tra theo bước, giữ nguyên `handleSubmit` body/idempotency/status; mục tiêu ≤ 220 dòng |
| `src/app/(routes)/_components/TicketOrderSteps.tsx` (mới) | Header tiến độ (desktop chỉ số tròn, mobile "Bước N/3" + thanh 3 đoạn), nút quay lại/đóng |
| `src/app/(routes)/_components/TicketAttendeeFields.tsx` (mới) | Bước 1: lưới trường, stepper `− N +` (1..`TICKET_ORDER_LIMIT`), select merch, nút thu gọn năm sinh/giới tính (mobile), lỗi inline + `aria-describedby`/`aria-invalid` trên input; export `validateAttendeeStep` |
| `src/app/(routes)/_components/TicketStub.tsx` (mới) | Panel phải: poster, ngày "22", địa điểm, đường răng cưa, `TicketOrderSummary` |
| `src/app/(routes)/_components/TicketOrderSummary.tsx` (mới) | Hàm `formatVnd`, tóm tắt "Phiếu nước × N / Merch / Tạm tính", dùng chung cho cuống phiếu và thanh dính đáy |
| `src/app/(routes)/_components/TicketOrderReview.tsx` (mới) | Bước 3: thẻ kiểm tra lại (đọc state truyền vào) + ghi chú |
| `src/app/(routes)/_components/TicketSurveyFields.tsx` | Chỉ JSX/class: chip có checkbox, select khu vực, segmented radio. Giữ API `useTicketSurvey`, nhãn, lỗi, focus, `data-invalid` |
| `src/app/(routes)/_components/TicketRequestDialog.test.tsx` | Cập nhật + thêm test (xem Verification) |
| `src/app/(routes)/_components/TicketAttendeeFields.test.tsx` (mới, tùy chọn) | Unit test `validateAttendeeStep` |
| `src/styles/globals.css` | Thay khối `.ticket-request-dialog*` bằng khối mới có token `--tod-*` scoped trong `.ticket-request-dialog` |
| `src/app/layout.tsx` | Thêm `Playfair_Display` (subsets `vietnamese`,`latin`; style italic; weight 700; variable) |

Đọc thôi: `validation.ts`, `survey.ts`, `_data/home.ts`, `RemoteImage.tsx`.

## Public Contracts
- Body POST `/api/ticket-orders` không đổi: `{idempotencyKey,name,email,phone,gender,birthYear,quantity,merch,survey}`; `survey` qua `normalizeSurveySource` (thứ tự chuẩn).
- Props `TicketRequestDialog({className, children})` không đổi (dùng trong `HeroSection`, `TicketsSection`, `Navbar`, `TimelineSection`?) — xác nhận bằng grep lúc EXECUTE.
- API `useTicketSurvey` / `TicketSurveyFields` không đổi chữ ký.
- Không đổi server, DB, survey.ts.

## Blast Radius
- ~11 file, 1 package, chỉ client UI + CSS + 1 dòng font ở layout. Rủi ro: hồi quy dialog thanh toán (gián tiếp chạm billing UI), a11y, CSS toàn site nếu selector rò rỉ.
- Không chạm: `src/lib/**`, `src/app/api/**`, `supabase/**`, `scripts/**`, `.env*`.

## Implementation Checklist
1. Preflight: xác nhận đã commit (git status sạch với các file trùng) và sha256 `survey.ts`; grep nơi dùng `TicketRequestDialog`; kiểm tra `emailPattern` có export không (không thì định nghĩa regex client tương đương trong `TicketAttendeeFields.tsx`).
2. TDD đỏ: viết test mới trong `TicketRequestDialog.test.tsx` (bước, kiểm tra theo bước, tổng tiền live, tiến độ, nút thu gọn, thanh dính, roles/labels); chạy thấy fail.
3. Tạo `TicketOrderSummary.tsx`, `TicketStub.tsx`, `TicketOrderSteps.tsx`, `TicketOrderReview.tsx`, `TicketAttendeeFields.tsx` (mỗi file ≤ 150 dòng).
4. Viết lại JSX `TicketRequestDialog.tsx`: `step` state, `noValidate`, mọi bước mount + `hidden`, chuyển bước cuộn vùng nội dung lên đầu và đưa focus tới heading bước; reset `step=1` trong `resetSuccessfulSubmission`; giữ nguyên toàn bộ khối try/catch/status.
5. `handleSubmit`: trước `survey.validate()` chạy `validateAttendeeStep`; lỗi → `setStep` về bước lỗi đầu tiên + focus; không fetch.
6. `TicketSurveyFields.tsx`: đổi trình bày (chip/select/segmented) giữ nhãn/thứ tự/lỗi.
7. `layout.tsx`: thêm Playfair Display qua next/font.
8. `globals.css`: khối CSS mới (desktop ≥761, mobile ≤760, `100dvh`, `env(safe-area-inset-bottom)`, padding đáy nội dung, focus vàng, touch ≥44px, input 16px, không gradient).
9. Cập nhật 18 test cũ theo luồng bước (không nới assertion: body, key, thông báo giữ nguyên).
10. Chạy gate; kiểm tra trực quan; cập nhật `process/context/uxui/component-contracts.md` (ở UPDATE PROCESS).

## Verification Evidence
| Gate / Scenario | Strategy | Proves SPEC criterion |
|---|---|---|
| `npx.cmd vitest run "src/app/(routes)/_components"` | Fully-Automated | Body/idempotency/status giữ nguyên; bước, kiểm tra, tổng live |
| `npx.cmd vitest run` (toàn bộ) | Fully-Automated | Không hồi quy chỗ khác |
| `npm.cmd run typecheck`, `npm.cmd run lint` | Fully-Automated | Chuẩn mã |
| `npm.cmd run build` (lần 1 có thể exit 1 do advisory Next 16.4.3; chạy lại) | Fully-Automated | next/font Playfair build được |
| sha256 `survey.ts` + `git diff --stat -- src/lib src/app/api supabase scripts` rỗng | Fully-Automated | Không chạm phần đóng băng |
| agent-browser 360/390/768/1280/1440 trên cổng phụ (vd. 3107), dừng dev server sau | Agent-Probe | Bố cục desktop/mobile, thanh dính, safe-area, focus |

## Test Infra Improvement Notes
(none identified yet)

## Resume and Execution Handoff
1. Plan: `process/general-plans/active/ticket-order-form-redesign_18-11-26/ticket-order-form-redesign_PLAN_18-11-26.md`
2. Bước hoàn thành cuối: PLAN + VALIDATE (chưa EXECUTE)
3. Validate-contract: written 2026-11-18 (inline bên dưới)
4. Context đã nạp: `all-context.md`, `uxui/all-uxui.md`, `uxui/component-contracts.md`, `tests/all-tests.md`, task `ticket-order-survey_17-11-26`
5. Bước kế: chủ repo commit → "ENTER EXECUTE MODE" → spawn vc-execute-agent (opus) chạy checklist 1–9.

## Validate Contract

generated-by: outer-pvl
date: 2026-11-18
Date: 2026-11-18
Gate: CONDITIONAL

### Net gate
| Layer 1 | Status |
|---|---|
| Infra fit | PASS — chỉ client/CSS; next/font có sẵn trong Next 16 |
| Test coverage | CONCERN — không có e2e trình duyệt tự động; trực quan là Agent-Probe |
| Breaking changes | PASS — body/props/API survey không đổi |
| Security surface | CONCERN — UI dẫn tới thanh toán; giữ `navigateToCheckout` allowlist và chống gửi trùng |

| Layer 2 | Status |
|---|---|
| A — Đa bước + FormData | CONCERN — bắt buộc `hidden` + `noValidate` (đã đưa vào plan) |
| B — Component mới | PASS |
| C — Survey trình bày | PASS — giữ nhãn và `data-invalid` |
| D — Font | CONCERN — next/font tải lúc build cần mạng; nếu build offline lỗi → fallback Georgia italic, ghi known-gap |
| E — CSS mobile | CONCERN — iOS safe-area chỉ kiểm được bằng mô phỏng |

Totals: 0 FAIL / 5 CONCERN → **Gate: CONDITIONAL** (các concern đã thành chỉ dẫn hoặc known-gap; cần user chấp nhận).

### Test gates (PowerShell, từ repo root)
1. `npx.cmd vitest run "src/app/(routes)/_components"` → exit 0
2. `npx.cmd vitest run` → exit 0
3. `npm.cmd run typecheck` → exit 0
4. `npm.cmd run lint` → exit 0, 0 warning
5. `npm.cmd run build` → exit 0 (cho phép 1 lần retry vì advisory Next 16.4.3)
6. `(Get-FileHash src/lib/ticket-orders/survey.ts -Algorithm SHA256).Hash` = `1DA21F7D8380A2A65EA3B4C7DF69CC15D782EDA043066C1A90F57A6374E1B2BC`
7. `git diff --name-only -- src/lib src/app/api supabase scripts .env.example` → rỗng (so với commit tiền điều kiện)
8. Agent-probe: `npm.cmd run dev -- -p 3107`; agent-browser ở 360, 390, 768, 1280, 1440: mở dialog, 3 bước, lỗi inline, tổng live, thanh dính không che nội dung, focus vàng; lưu ảnh mới vào task folder; dừng dev server.

### Test mới bắt buộc (TDD stub)
- "should not advance from step 1 with empty name or invalid email and should show inline Vietnamese errors"
- "should move between steps with Tiếp tục / Quay lại and update progress (aria-current)"
- "should update Tạm tính live in stub and sticky bar when quantity or merch changes"
- "should cap the stepper at TICKET_ORDER_LIMIT and min 1"
- "should reveal birth year and gender via the collapse button"
- "should show review values on step 3 and submit the unchanged request body"
- "should return to the first invalid step on submit and never fetch"
- "should reset to step 1 after a successful order is closed"

### Execute-agent instructions
- E1: Không unmount bước; dùng `hidden`. Không đổi thứ tự key trong `attendee` (fingerprint).
- E2: Không sửa `validation.ts`, `survey.ts`, `route.ts`, `src/lib/**`, `supabase/**`, `scripts/**`, `.env*`. Không git stash/checkout/reset/commit.
- E3: `aria-invalid` chỉ trên input/select, không trên fieldset; nhóm khảo sát dùng `data-invalid`.
- E4: Nút icon (đóng, −, +, quay lại) có `aria-label` tiếng Việt.
- E5: Nếu next/font fail khi build vì mạng: dùng fallback serif italic, ghi vào report, không thêm `<link>`.
- E6: File mới ≤ 150 dòng; `TicketRequestDialog.tsx` ≤ 220 dòng.

### Known gaps
- Hành vi iOS Safari thật (safe-area, bàn phím ảo) chỉ mô phỏng.
- Không kiểm PayOS thật.

### Strategy EXECUTE
Score 3/7 (S2 không, S6 gần billing UI, S7 ≥5 file). Khuyến nghị: **Sequential** — 1 vc-execute-agent (opus) → 1 vc-tester (sonnet) cho EVL. Lý do: các file phụ thuộc lẫn nhau (dialog + component + CSS + test). TeamCreate không có trong môi trường này nên không đề xuất agent team. Parallel subagents bị loại vì cùng chạm `globals.css`/dialog.

TL;DR: 3 bước, mọi bước luôn render, hợp đồng dữ liệu giữ nguyên, giới hạn 4 phiếu; cần commit trước và user duyệt 6 quyết định mặc định + 2 câu hỏi mở.

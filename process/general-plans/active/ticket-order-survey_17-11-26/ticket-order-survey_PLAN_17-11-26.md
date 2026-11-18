---
name: plan:ticket-order-survey
description: "Thêm 3 câu khảo sát bắt buộc vào form đặt vé, lưu vào bảng DB mới (migration 202611170003) và ghi vào Google Sheet bố cục A:Q cho đơn đã thanh toán; 6 phase, EXECUTE bằng agent team."
date: 17-11-26
feature: general
phase: PLAN
status: executed-verified-locally-awaiting-owner
complexity: complex
metadata:
  node_type: memory
  type: plan
---

# Khảo sát khi đặt vé (3 câu hỏi bắt buộc) — kế hoạch triển khai

**Date**: 17-11-26
**Status**: EXECUTE xong (E0, P1-P6, tuần tự), EVL vòng 1 và 2 xanh, đánh giá độc lập `approved-with-concerns`, fix cycle xong, UPDATE PROCESS xong (18-11-26). Giữ ở `active/` (Keep in active/testing): chờ chủ dự án chạy GJ.10 (AC15 vẫn CONDITIONAL), áp dụng migration, đặt env, deploy, bật checkout. Chưa commit. (Trước đó: Validated, Gate: PASS, PVL vòng 2.)
**Complexity**: COMPLEX — một plan, 6 phase (workstream) chạy trong một lượt EXECUTE; chạm route thanh toán, migration và dữ liệu người dùng gửi sang Sheet bên thứ ba (nhóm rủi ro cao)
**Selected plan:** `process/general-plans/active/ticket-order-survey_17-11-26/ticket-order-survey_PLAN_17-11-26.md`
**Locked SPEC:** `process/general-plans/active/ticket-order-survey_17-11-26/ticket-order-survey_SPEC_17-11-26.md` (Revision 3; 20 AC)

**BLUF:** Làm theo 6 phase: P1 chốt hợp đồng dùng chung (id, kiểu, tên RPC, mã lỗi, khóa JSON) rồi đóng băng; sau đó P2 (DB), P3 (route), P4 (form), P5 (Sheet + worker) chạy song song vì chỉ phụ thuộc P1; P6 gom tài liệu, bằng chứng rủi ro cao và chạy cổng cuối. Không đụng vào các hàm thanh toán/outbox hiện có; thêm đúng 1 migration mới (`202611170003`). Chủ dự án tự áp dụng migration, đặt biến môi trường, deploy và bật checkout; agent không bao giờ làm các việc đó.

**TL;DR:** 6 phase, 20/20 AC có phase + lệnh kiểm tra. P1 đóng băng hợp đồng trước; P2-P5 song song (agent team, mỗi người sở hữu tập file rời nhau); P6 gom cuối. Lưu khảo sát chạy song song với PayOS, chờ tối đa 1500 ms rồi vẫn trả link. Worker phân biệt "không có khảo sát" (ghi ô trống) với "đọc lỗi" (thất bại, thử lại). Rollback = migration mới / giữ checkout TẮT, không bao giờ drop bảng khảo sát; rollback app KHÔNG sạch vì Sheet đã là A:Q.

## Phase Completion Rules

- **CODE DONE** = cổng Level-1 của phase xanh (Vitest tập trung + ESLint phạm vi). **VERIFIED** = P6 xanh toàn bộ cổng (full `npm.cmd test`, runner PostgreSQL cô lập, typecheck, build, validator gói bằng chứng, đánh giá độc lập `approved`/`approved-with-concerns` (từ vựng của validator)).
- Quy tắc chống xanh giả (vacuous-green ban): Known-Gap không bao giờ là trạng thái PASS cuối cùng cho hành vi đã phát triển. Mỗi Known-Gap có backlog stub (mục "Known gaps") và cổng tương ứng giữ trạng thái **CONDITIONAL**. AC15 (ghi thật 17 cột) chưa chạy = CONDITIONAL, không phải PASS.
- Mô phỏng/mocked/isolated PostgreSQL KHÔNG chứng minh: migration đã áp dụng trên DB thật, độ trễ hosted, PayOS thật, ghi Sheet thật. Báo cáo phải nêu rõ.
- Agent không bao giờ: áp dụng migration lên DB thật, đặt biến môi trường production, deploy, bật checkout, gọi PayOS thật, ghi Sheet thật, đụng `.env`.
- Giữ plan ở `active/` (testing) cho tới khi AC15 + quyết định của chủ dự án về commit/migration/deploy hoàn tất; `mustStopBeforeFinalize` giữ `true`.

## Overview

Khán giả đặt vé trả lời 3 câu: Q6 nguồn biết sự kiện (chọn nhiều, >= 1), Q8 khu vực sống (chọn một), Q9 mức chắc chắn tham gia (chọn một). Câu trả lời đi theo đơn: client kiểm tra, server kiểm tra lại (`400 invalid_request` chung), route lưu qua RPC mới song song với bước PayOS, bảng mới `public.ticket_order_survey` giữ dữ liệu, worker outbox đọc qua RPC đọc mới và ghi cột G/H/M của Sheet 17 cột (A:Q) khi đơn paid.

## Scope and goals

### In scope

1. Module dùng chung `src/lib/ticket-orders/survey.ts` (id ổn định, nhãn, parse, lỗi tiếng Việt, ánh xạ nhãn Sheet) + tích hợp vào `validation.ts`.
2. Migration `202611170003_ticket_order_survey.sql`: bảng, ràng buộc, RLS, 3 hàm khảo sát (`upsert_ticket_order_survey`, `get_ticket_order_survey`, helper `ticket_survey_source_valid`) + hàm A1 `requeue_synced_sheet_sync_for_survey`; quyền service_role-only.
3. Route `POST /api/ticket-orders`: lưu khảo sát song song PayOS, join có giới hạn 1500 ms, log sạch.
4. Form: 3 nhóm câu hỏi (checkbox/radio), lỗi tiếng Việt theo nhóm, CSS, reset.
5. Sheet adapter 17 cột + worker đọc khảo sát + mã lỗi `survey_read_failed`.
6. Runner PostgreSQL chạy mọi `supabase/tests/*.sql` (tripwire + sentinel), sửa đường dẫn artifact cứng.
7. Benchmark route fixture mới + baseline mới (baseline cũ bất biến, kiểm hash).
8. Tài liệu (`all-tests.md`, `all-context.md`, README, `.env.example`, runbook), gói bằng chứng `harness/`, đánh giá độc lập.

### Out of scope

- Sửa `claim_/complete_/fail_paid_ticket_sheet_sync`, `enqueue_paid_ticket_sheet_sync`, `create_ticket_order_v4/v5`, `prepare_payos_checkout`, webhook PayOS, migration đã có (cấm sửa; `git diff` phải rỗng ở các đường dẫn đó).
- Backfill khảo sát cho đơn cũ; câu Q7; ô "Khác"; consent/retention; màn hình thống kê; nâng cấp Next.js; thêm thư viện; xử lý lỗi lint có sẵn không liên quan.
- Áp dụng migration/deploy/bật checkout/ghi Sheet thật (chủ dự án).

## Decision Summary

### Chosen Approach

(Từ INNOVATE đã được người dùng duyệt, gồm A1 và A2.)

- **Lưu:** bắt đầu lưu khảo sát song song với PayOS ngay sau khi hàng đơn hợp lệ và `payment_status === "pending"` và sau khi biết nhánh không phải `checkout_pending` (xem P3). Promise không bao giờ reject (gắn `.then(ok, err)`/IIFE có try-catch ngay khi tạo). Chỉ join ở đường 201 bằng `Promise.race` với `SURVEY_JOIN_TIMEOUT_MS = 1500` (hằng số trong route, không biến môi trường), timer xóa trong `finally`; quá hạn vẫn trả 201 kèm link, không hủy. `after()` bị loại (chưa kiểm chứng trên Next 16.4.3).
- **Worker:** RPC theo từng đơn `get_ticket_order_survey(p_order_id uuid)` trong `try` của vòng lặp, TRƯỚC `upsertPaidTicketOrder`. Ba trạng thái: (a) đơn cũ -> `[]` -> G/H/M rỗng, ghi, synced; (b) chưa từng lưu/lưu lỗi -> `[]` -> như (a); (c) lỗi đọc (rpc error, throw, không phải mảng, hàng sai dạng, > 1 hàng) -> throw `survey_read_failed`, không ghi Sheet, không complete, gọi `fail_paid_ticket_sheet_sync` với mã đó.
- **Quyền sở hữu:** `upsert_ticket_order_survey(p_order_id uuid, p_user_id uuid, p_source text[], p_area text, p_attendance text) returns boolean`; SECURITY DEFINER, `set search_path = ''`; kiểm `orders where id = p_order_id and user_id = p_user_id` nếu không có thì `raise exception ... errcode 'P0002'` thông điệp chung (không phân biệt "không tồn tại" và "không thuộc về"); `on conflict (order_id) do update` + `updated_at`. Khóa ngoại kép `(order_id, user_id) -> public.orders(id, user_id) on delete cascade` (orders đã có `unique (id, user_id)`, migration 202611130001 dòng 59).
- **DB:** id ổn định (không dùng nhãn): source `facebook, zalo, tiktok, referral, poster-standee, popup-reply199x, on-the-radio-bar, website`; area `hai-chau, thanh-khe, son-tra, ngu-hanh-son, lien-chieu, cam-le, hoa-vang, quang-nam-cu`; attendance `confirmed, unsure`. CHECK cho area/attendance `IN (...)`, `source <@ array[...]`, `cardinality` 1..8, không trùng qua helper IMMUTABLE `public.ticket_survey_source_valid(text[])` (`set search_path=''`; CHECK không dùng được subquery trực tiếp). RLS bật; `revoke all on table ... from public, anon, authenticated`; `grant select, insert, update to service_role`; mỗi hàm `revoke all ... from public, anon, authenticated` rồi `grant execute ... to service_role` với chữ ký chính xác. `get_ticket_order_survey(p_order_id uuid) returns table(source text[], area text, attendance text)` trả 0 hoặc 1 hàng (dùng `language sql` và cột có tiền tố bảng để tránh lỗi 42702 đã gặp ở migration 202611140008).
- **A1:** hàm `requeue_synced_sheet_sync_for_survey(p_order_id uuid) returns boolean` (service_role-only): chỉ khi đơn paid, có hàng khảo sát và hàng outbox `paid` đang `synced`; đặt `pending`, `next_attempt_at = now()`, `lease_until/lease_token/last_error_code = null`, `updated_at = now()`; không đụng claim/complete/fail/enqueue.
- **A2:** thử tay = cửa sổ ngắn trên production, checkout BẬT, `GOOGLE_SHEETS_SPREADSHEET_ID` trỏ BẢN SAO Sheet (cùng tab Registrations, cùng A:Q); sau đó khôi phục env về Sheet thật và deploy lại khi checkout TẮT. KHÔNG dùng preview Vercel với Supabase production dùng chung.
- **Module dùng chung:** `survey.ts` thuần (không `server-only`), `validateCreateTicketOrder` thêm `survey` vào allowlist và kết quả, vẫn trả `null` trần (route giữ `400` chung); không có validator song song. Client sắp xếp source theo thứ tự chuẩn trước khi dựng object attendee để `payloadFingerprint` ổn định.

### Why This Over Alternatives

Bảng riêng khóa theo đơn giữ nguyên hàm tạo đơn/outbox đang chạy (AC8) và cho phép CHECK/FK/RLS do DB áp dụng. Lưu song song + join có trần cân bằng AC6 (không chặn) và AC7 (không mất dữ liệu); `after()` chưa kiểm chứng nên loại. RPC đọc theo đơn trong vòng lặp worker giữ nguyên `claim_paid_ticket_sheet_sync` (không sửa hàm outbox) và cho phép phân biệt "rỗng" với "lỗi đọc". Hàm requeue riêng (A1) là cách duy nhất để bù race mà không sửa `enqueue`. Runner mở rộng thay vì file SQL nhúng vào file cũ để assertion khảo sát không thể bị bỏ qua im lặng (tripwire + sentinel).

### Risk Predictions

| Persona | Dự đoán | Giảm thiểu trong plan |
|---|---|---|
| Architect | Route khởi động lưu khảo sát ở nhánh sai (vd. `checkout_pending`) hoặc thay đổi thứ tự RPC làm vỡ test hiện có | Phân loại nhánh một lần (`saved-link / create / reconcile / pending`); test từng nhánh; cập nhật mảng tên RPC có chủ đích (P3) |
| Security | Gắn khảo sát vào đơn người khác; lộ câu trả lời/mã đơn qua log/Server-Timing; hàm SECURITY DEFINER mở cho anon | FK kép + kiểm sở hữu P0002 chung; log chỉ `{reason, code}`; revoke/grant chữ ký chính xác + assert `set role anon/authenticated` bị 42501 |
| Performance | Join làm chậm checkout; benchmark cũ không so sánh được | Trần 1500 ms; PayOS mock 30 ms chứng minh song song; baseline mới, baseline cũ bất biến (hash) |
| Operator | Ghi nhầm ô trống rồi synced khi đọc lỗi; triển khai sai thứ tự (code A:Q khi Sheet/migration chưa sẵn; app cũ A:N ghi vào Sheet 17 cột) | `survey_read_failed` fail-closed; fail-closed `A:N`; runbook thứ tự; app cũ không ai gọi sync trước khi deploy mới |
| Devil's advocate | "Xanh giả": runner chỉ chạy 1 file SQL nên test khảo sát không bao giờ chạy | Tripwire danh sách file + sentinel + red-proof A/B/C (bắt buộc ở EXECUTE) |

### Key Constraints Accepted

- Known-gap chấp nhận (có stub): race khảo sát đến muộn (AC20, bù bằng hàm requeue); lưu bị cắt/never saved (retry cùng key tự chữa qua nhánh saved-link); không có scheduler gọi `/api/internal/sheets-sync`, không có giới hạn retry/cảnh báo outbox (có sẵn từ trước); 1500 ms chưa đo trên hosted; ghi thật 17 cột chỉ qua thăm dò AC15; cảnh báo build Next 16.4.3 (lần `npm run build` đầu exit 1, retry exit 0; ghi cả hai, không nâng cấp); consent/retention chưa quyết (nợ trước khi bán vé thật); không có "Khác"; không backfill đơn cũ.
- Không thêm tên Server-Timing mới (thời gian khảo sát nằm trong `total`).

## SPEC deltas (Revision 3, đã ghi vào SPEC)

| AC | Thay đổi | Lý do |
|---|---|---|
| AC18 | Thứ tự production: checkout TẮT + sao lưu -> cột -> migration + xác minh quyền -> đặt `GOOGLE_SHEETS_PAID_ORDERS_RANGE=Registrations!A:Q` và deploy (MỘT bước) -> thử tay A2 trên bản sao -> khôi phục env + deploy lại khi checkout TẮT -> bật checkout. Bỏ lựa chọn preview Vercel | A2; env chỉ có hiệu lực ở lần deploy kế tiếp |
| AC20 | Bù race bằng `requeue_synced_sheet_sync_for_survey(order_id)` (mới, 170003) thay vì `enqueue_paid_ticket_sheet_sync` | `enqueue` không bao giờ reset hàng `synced` (202611170002 dòng 31-38); A1 |

Ngoài ra bullet "Đã chốt" số 2 trong SPEC đã sửa cho khớp A2. Cách thực hiện: sửa tại chỗ các dòng tương ứng của SPEC (PLAN được phép theo yêu cầu), thêm mục "Revision 3" và `revision: 3` ở frontmatter.

## Architecture and contracts

### Hợp đồng P1 (đóng băng trước khi P2-P5 bắt đầu)

Mọi phase sau chỉ đọc các tên dưới đây; đổi tên/kiểu = yêu cầu thay đổi hợp đồng đi qua thành viên `contract` (SendMessage) và làm lại cổng của các phase bị ảnh hưởng.

| Mục | Giá trị đóng băng |
|---|---|
| Khóa JSON | `survey` trong body `POST /api/ticket-orders`: `{ source: string[], area: string, attendance: string }` |
| Id | source 8 id, area 8 id, attendance 2 id (đúng như Decision Summary; thứ tự chuẩn = thứ tự liệt kê) |
| Kiểu | `SurveySourceId`, `SurveyAreaId`, `SurveyAttendanceId`, `TicketSurvey` (source đã chuẩn hóa thứ tự, readonly), `SurveyDraft` (dạng thô từ form) |
| Hàm/hằng (export của `survey.ts`) | danh sách `{id,label}` cho 3 câu theo thứ tự chuẩn; chữ câu hỏi nguyên văn cho 3 câu; `parseSurvey(unknown) -> TicketSurvey \| null`; `surveyFieldErrors(draft)` (thông báo tiếng Việt theo nhóm: source/area/attendance); bản đồ id -> nhãn; `surveyToSheetCells(survey \| null) -> [G, H, M]` (Q6 nối ";" theo thứ tự chuẩn, null -> ba chuỗi rỗng); hằng tên RPC (`upsert_ticket_order_survey`, `get_ticket_order_survey`); hằng mã lỗi `survey_read_failed` |
| `parseSurvey` | chỉ nhận object có đúng 3 khóa; chuẩn hóa source theo thứ tự chuẩn; từ chối: thiếu/lạ khóa, source không phải mảng, phần tử không phải chuỗi, trùng, rỗng, > 8, id lạ, area/attendance sai kiểu hoặc ngoài danh sách |
| `validateCreateTicketOrder` | thêm `survey` vào allowlist khóa và vào `CreateTicketOrderInput`/kết quả; `parseSurvey` null -> trả `null` trần |
| Tên RPC + chữ ký | `upsert_ticket_order_survey(p_order_id uuid, p_user_id uuid, p_source text[], p_area text, p_attendance text) returns boolean`; `get_ticket_order_survey(p_order_id uuid) returns table(source text[], area text, attendance text)`; `ticket_survey_source_valid(text[])`; `requeue_synced_sheet_sync_for_survey(p_order_id uuid) returns boolean` |
| Mã lỗi | worker: `survey_read_failed` (khớp `^[a-z0-9_]{1,80}$`); route log: `ticket_survey_save_failed` với `reason` in `timeout \| rpc_error \| unexpected` |

### Luồng route (P3)

1. Validate (đã gồm `survey`), auth, cổng cấu hình, gọi `create_ticket_order_v5` với đúng 9 khóa như cũ (KHÔNG truyền survey; test hiện khẳng định 9 khóa), kiểm hàng như cũ cho tới `validPreparedCheckout` và `checkout_payment_status === "pending"`.
2. Phân loại nhánh một lần (`saved-link` khi có cả link id và url; `create` khi `checkout_can_create === true`; `reconcile` khi `checkout_can_reconcile === true`; còn lại `pending`). `pending` trả `409 checkout_pending` NGAY, không lưu khảo sát (hành vi trả lời giữ nguyên, chỉ dời lên trên).
3. Các nhánh còn lại: tạo promise lưu khảo sát ngay (gọi `upsert_ticket_order_survey` với `p_order_id: row.order_id`, `p_user_id: authData.user.id`, `p_source/p_area/p_attendance` từ `input.survey`); promise tự bắt mọi lỗi và tự log `{reason:"rpc_error"|"unexpected", code}` (code chỉ khi thuộc `CHECKOUT_RPC_CODES`, ngược lại `"unknown"`); không log mã đơn/người dùng/câu trả lời.
4. Chạy khối PayOS/persist như cũ. Các lỗi sớm (503/409) không chờ khảo sát; promise đã có catch nên không có unhandled rejection.
5. Trước `return 201`: join bằng `Promise.race([promise, timeout 1500 ms])`; quá hạn log `{reason:"timeout", code:"unknown"}`; timer xóa trong `finally`; luôn trả 201 kèm link. Nhánh `saved-link`: bắt đầu lưu rồi join ngay tại 201 (tự chữa khi lần lưu trước hỏng).
6. Server-Timing giữ đúng 7 tên cố định; không thêm tên mới.

### Luồng worker và Sheet (P5)

- `makeRow(order, survey)` trả đúng 17 chuỗi (kiểm độ dài cố định, sai -> `invalid_paid_order`): A thời gian, B tên, C email, D điện thoại, E giới tính, F năm sinh, G nguồn, H khu vực, I số vé, J merch, K tổng tiền, L trạng thái, M chắc chắn tham gia, N mã đơn (chỉ số 13), O mã PayOS, P thời gian thanh toán, Q PaymentLink ID.
- Range hợp lệ `^.{1,200}!A:Q$`; mặc định `Registrations!A:Q`; `A:N` bị từ chối fail-closed (`invalid_sheet_range` -> mã sạch `invalid_range` có sẵn); cập nhật `A{n}:Q{n}`; tra cứu theo `values[13]`; append như cũ (`INSERT_ROWS`, `RAW`).
- `upsertPaidTicketOrder(order, survey)` nhận survey như tham số riêng (hàng claim không đổi); hàng đã có + survey null: ghi đè G/H/M bằng rỗng (AC12a).
- Worker: trong `try` của từng đơn gọi `get_ticket_order_survey` trước upsert; thêm đúng 1 nhánh `survey_read_failed` vào `errorCode()`; retry/backoff hiện có dùng lại nguyên.

### Runner PostgreSQL (P2)

`scripts/test-checkout-guard-db.mjs` chạy mọi `supabase/tests/*.sql` theo thứ tự tên; danh sách kỳ vọng cố định (`checkout-access-guard.sql`, `ticket-order-survey.sql`) được assert bằng đúng danh sách tìm thấy (thêm/bớt file mà không sửa danh sách = fail); mỗi file SQL kết thúc bằng một `raise notice` sentinel mà runner bắt qua sự kiện `notice` của client `pg` (không có sentinel = fail, chứng minh file chạy đến cuối). Đường dẫn artifact cứng (dòng 15) chỉ dùng cho `--workload`: cho phép ghi đè bằng biến môi trường và báo lỗi rõ khi thư mục không tồn tại. Quyền (grants) assert theo kiểu `assertSql` trong JS với chữ ký chính xác (`has_function_privilege`, `has_table_privilege`, thử gọi dưới `set role anon/authenticated` mong đợi lỗi 42501); assertion dữ liệu (CHECK, FK cascade, upsert idempotent, sở hữu P0002 cho cả "không tồn tại" và "không thuộc", requeue) nằm trong `supabase/tests/ticket-order-survey.sql`.

## Phase graph and parallelism

```text
E0 (risk-gate)  ->  P1 contract (+ baseline capture)  --FREEZE-->  { P2 DB | P3 route | P4 form | P5 sheet+worker }  -->  P6 docs + evidence + final gates
```

| Phase | Phụ thuộc | Song song với | Ghi chú |
|---|---|---|---|
| P1 | E0 | không | Đóng băng hợp đồng; xong mới mở P2-P5 |
| P2 DB | P1 (chỉ đọc id) | P3, P4, P5 | Test drift cần cả `survey.ts` (P1) và migration (P2) nên thuộc P2 (lệch nhẹ so với bản giao: drift test chuyển từ P1 sang P2 vì cần migration, nếu để P1 sẽ đỏ) |
| P3 route | P1 | P2, P4, P5 | Baseline benchmark phải chụp SAU P1 và TRƯỚC khi sửa `route.ts` |
| P4 form | P1 | P2, P3, P5 | |
| P5 sheet+worker | P1 | P2, P3, P4 | RPC trong test được mock, không phụ thuộc P2 |
| P6 | P2-P5 | không | Gom tài liệu, harness, cổng cuối |

Quy tắc song song: (1) mỗi thành viên chỉ sửa file thuộc phần sở hữu của mình (bảng Blast Radius); (2) trong giai đoạn song song CHỈ chạy `npx.cmd vitest run <file của mình>` và ESLint phạm vi — KHÔNG chạy `typecheck`/`build`/full test (cùng ghi `.next`; file đang dở của người khác làm vỡ tsc) — các lệnh này do P6/EVL chạy sau khi gộp; (3) không dùng `git stash/checkout/reset` (một working tree chung); (4) thay đổi hợp đồng đi qua `contract`; (5) `npm run dev` ghi `.next`: thành viên `form` chạy dev trên cổng rảnh riêng, dừng hẳn và xác nhận không còn tiến trình nào lắng nghe trước P6/EVL, không bao giờ chạy dev trong lúc typecheck/build; (6) agent không bao giờ đụng `.env` (chủ dự án tự sửa).

## Implementation Checklist

### E0 — Tiền đề (thành viên `docs`, trước P1)

1. Tạo `harness/risk-gate.json` trong task folder (cùng schema với `ticket-checkout-performance_17-11-26/harness/risk-gate.json`): `riskLevel: "high"`, `riskClasses` gồm payments, schema/data migration, public API contract, permission/secret/trust-boundary, dữ liệu cá nhân gửi bên thứ ba; `mustStopBeforeFinalize: true`, `humanApprovalRequired: true`; `why` nêu "không áp dụng migration, không đặt env, không deploy, không bật checkout, không ghi Sheet thật". Kiểm `node -e` JSON.parse; E0 chỉ làm `JSON.parse` + kiểm các trường bắt buộc trên `risk-gate.json` và KHÔNG chạy validator (validator trên gói 1/5 file thoát exit 1 và báo thiếu file — hành vi đã xác minh, không phải lỗi). Xác thực đầy đủ bằng validator chỉ ở P6/GJ.8.
2. Không tạo 4 file còn lại ở bước này.

### P1 — Hợp đồng dùng chung (thành viên `contract`)

Files: tạo `src/lib/ticket-orders/survey.ts`, `src/lib/ticket-orders/survey.test.ts`; sửa `src/lib/ticket-orders/validation.ts`, `src/lib/ticket-orders/validation.test.ts`; tạo `ticket-order-survey-lint-baseline_REF_17-11-26.md` trong task folder.

Steps:
1. Ghi baseline TRƯỚC mọi chỉnh sửa (AC17): `npm.cmd test` (số file/test), `npm.cmd run lint` (tổng vấn đề + danh sách file lỗi, chỉ đường dẫn, không dán secret), `npm.cmd run typecheck` (exit), `npm.cmd run build` (exit lần 1 và lần retry, KHÔNG chạy cùng typegen). Lưu vào file REF baseline.
2. Viết `survey.test.ts` đỏ trước (stub ở mục Red-first), rồi `survey.ts` theo bảng hợp đồng. Bắt buộc chữ nguồn nguyên văn (kể cả khoảng trắng trong "Anh/ chị" ở Q9) và nhãn Sheet nguyên văn theo SPEC. Tra id -> nhãn bằng `Object.hasOwn` hoặc `Map`, KHÔNG dùng toán tử `in`/chỉ mục thường (chặn id tên prototype).
3. Sửa `validation.ts` (allowlist + kết quả + `parseSurvey`), cập nhật `validation.test.ts`: mọi `validInput` có `survey`; thêm bảng ca hợp lệ/không hợp lệ đủ ca âm của AC4 (thiếu trường; source không phải mảng; phần tử không phải chuỗi; trùng, kể cả sau chuẩn hóa; rỗng; ngoài danh sách cho Q6/Q8/Q9, gồm id tên prototype (`constructor`, `__proto__`, `toString`, `hasOwnProperty`) là KHÔNG hợp lệ cho Q6/Q8/Q9; Q8/Q9 sai kiểu; khóa lạ trong `survey` và ngoài `survey`; thân quá lớn được route chặn bằng giới hạn 8 KiB sẵn có — ghi chú ở test route).
4. Test thứ tự ổn định: hai thứ tự click khác nhau của cùng tập Q6 -> cùng `source` chuẩn hóa.
5. Chạy cổng P1; ghi băng "FROZEN" bằng `TaskUpdate` + `SendMessage` tới cả đội kèm sha256 của `survey.ts` (để phát hiện đổi hợp đồng sau freeze).

Tests added: `survey.test.ts` (id/nhãn/thứ tự, parse hợp lệ/không hợp lệ, `surveyFieldErrors` theo nhóm, `surveyToSheetCells` đủ 3 trạng thái), `validation.test.ts` (AC4).

Gates: `npx.cmd vitest run src/lib/ticket-orders/survey.test.ts src/lib/ticket-orders/validation.test.ts`; `npx.cmd eslint src/lib/ticket-orders/survey.ts src/lib/ticket-orders/survey.test.ts src/lib/ticket-orders/validation.ts src/lib/ticket-orders/validation.test.ts --max-warnings=0`.

AC: AC4 (chính), nền cho AC1-3, AC5, AC11-12. Rollback: xóa `survey.ts`/`survey.test.ts`, hoàn tác `validation.ts`/`validation.test.ts`; chỉ làm được khi P3-P5 chưa hợp nhất (hoặc đã hoàn tác trước theo thứ tự ngược P6->P1).

### P2 — DB (thành viên `db`)

Files: tạo `supabase/migrations/202611170003_ticket_order_survey.sql`, `supabase/tests/ticket-order-survey.sql`, `src/lib/ticket-orders/survey-migration-drift.test.ts`; sửa `scripts/test-checkout-guard-db.mjs`, `supabase/tests/checkout-access-guard.sql` (chỉ thêm sentinel). Đọc-only: mọi migration cũ (cấm sửa).

Steps:
1. Viết `ticket-order-survey.sql` và phần assert JS đỏ trước.
2. Migration: helper IMMUTABLE `ticket_survey_source_valid` (từ chối NULL, phần tử NULL, trùng, rỗng, ngoài allowlist, > 8; `set search_path=''`); bảng `public.ticket_order_survey` (cột/ràng buộc như Decision Summary; mỗi danh sách id nằm trên MỘT dòng theo dạng `in ('a','b',...)` / `array['a',...]` để test drift đọc được); `enable row level security`; revoke/grant bảng; `upsert_ticket_order_survey`; `get_ticket_order_survey` (`language sql`); `requeue_synced_sheet_sync_for_survey`; revoke/grant từng hàm với chữ ký chính xác; forward-only, không `drop`/`alter` đối tượng cũ.
3. Runner: thay dòng chạy cứng (hiện dòng 163) bằng vòng lặp mọi `supabase/tests/*.sql` + tripwire danh sách + bắt `notice` sentinel; thêm sentinel cuối `checkout-access-guard.sql` và `ticket-order-survey.sql` (mỗi file SQL kết thúc bằng `do $$ begin raise notice 'SENTINEL <tên-file>'; end $$;`; runner đăng ký `admin.on("notice", ...)` TRƯỚC vòng lặp SQL, khớp đúng chuỗi sentinel của từng file; tripwire fail khi có file không mong đợi HOẶC thiếu sentinel); `artifacts` cho phép ghi đè bằng `CHECKOUT_GUARD_ARTIFACTS_DIR` và kiểm tồn tại (báo lỗi rõ, exit != 0) chỉ trong nhánh `--workload`.
4. Assert JS (grants/quyền): trước khi áp dụng riêng 202611170003, runner chạy `alter default privileges in schema public grant all on tables to anon, authenticated` (assertion hiện có giữ nguyên) để assertion revoke bảng không vacuous (bootstrap runner không cấp quyền bảng mặc định cho anon); `has_function_privilege` cho 4 hàm × `anon/authenticated/service_role` (chỉ service_role = true; chữ ký chính xác), `has_table_privilege` (select/insert/update/delete) cho anon/authenticated = false và service_role select/insert/update = true, `relrowsecurity = true`, `prosecdef` + `proconfig` chứa `search_path=""` cho mọi hàm SECURITY DEFINER, thử gọi `upsert/get/requeue` dưới `set role anon` và `set role authenticated` -> 42501, một vòng service_role: upsert rồi get trả đúng.
5. Assert SQL dữ liệu (lưu ý: quyền EXECUTE của hàm helper CHECK được kiểm ở thời điểm insert theo role gọi — anon insert lỗi 42501 chứ không phải 23514; agent KHÔNG được revoke helper khỏi service_role, và ca insert trực tiếp âm chạy bằng role owner/admin): CHECK từ chối (area/attendance ngoài list, source rỗng/trùng/ngoài list/NULL/phần tử NULL/> 8), PK/FK kép (không thể chèn trực tiếp `user_id` sai chủ), `on delete cascade` khi xóa đơn, upsert hai lần cho cùng đơn = 1 hàng (ghi đè, `updated_at` đổi), upsert cho đơn KHÔNG tồn tại và đơn của người khác đều bị từ chối với cùng SQLSTATE P0002 và cùng thông điệp, bảng không đổi sau hai ca đó (AC19), `get_ticket_order_survey` trả 0 hoặc 1 hàng, hàm requeue: synced -> pending trả true (kiểm các trường `next_attempt_at`, lease, `last_error_code`, `updated_at`; và `claim_paid_ticket_sheet_sync` nhận lại được hàng) / đơn chưa paid, không có khảo sát, hàng không `synced` (pending/processing/failed), đơn không tồn tại -> false, không đổi trạng thái.
6. `survey-migration-drift.test.ts`: đọc `survey.ts` và file migration, trích 3 danh sách id bằng regex một dòng, assert số lượng 8/8/2 (chống test rỗng) rồi so sánh tập và thứ tự source với `survey.ts`.
7. Red-proof A (bắt buộc, một lần): tạm sửa một assertion khảo sát cho sai (vd. đổi kỳ vọng số hàng), chạy runner, XÁC NHẬN exit != 0 kèm thông điệp assertion, hoàn tác, chạy lại xanh. Red-proof B: tạm bỏ sentinel của `ticket-order-survey.sql`, runner phải fail; hoàn tác. Red-proof C: tạm bỏ dòng `revoke all on table ... from public, anon, authenticated` của migration, runner PHẢI exit != 0; hoàn tác. Ghi lệnh + exit code của A/B/C vào báo cáo; kiểm `git diff` chỉ còn thay đổi dự kiến.

Tests added: `ticket-order-survey.sql`, assert JS mới, `survey-migration-drift.test.ts`.

Gates: `node scripts/test-checkout-guard-db.mjs` (exit 0, có `migration PASS 202611170003_ticket_order_survey.sql` và hai sentinel); `npx.cmd vitest run src/lib/ticket-orders/survey-migration-drift.test.ts`; `npx.cmd eslint scripts/test-checkout-guard-db.mjs src/lib/ticket-orders/survey-migration-drift.test.ts --max-warnings=0`; `git status --porcelain supabase/migrations` chỉ có `?? supabase/migrations/202611170003_ticket_order_survey.sql`.

AC: AC9, AC10, AC19 (DB), AC20 (hàm requeue), AC8 (không sửa migration cũ). Rollback: xóa file mới và hoàn tác script; production: KHÔNG drop bảng khảo sát (mất dữ liệu) — xuất dữ liệu trước hoặc giữ bảng và vô hiệu hóa việc dùng; rollback = migration mới (forward-only).

### P3 — Route + test + benchmark (thành viên `route`)

Files: sửa `src/app/api/ticket-orders/route.ts`, `route.test.ts`, `route.performance.test.ts`; tạo `ticket-order-survey_BASELINE_17-11-26.json` (một lần, cờ `wx`) và `ticket-order-survey_CANDIDATE_17-11-26.json` (đầu ra mỗi lần candidate) trong task folder. KHÔNG ghi vào `ticket-checkout-performance_BASELINE_17-11-26.json`.

Steps:
1. Sau khi P1 đã freeze và TRƯỚC khi sửa `route.ts`: sửa `route.performance.test.ts` (fixture mới: `fixtureVersion` mới; `requestVector` gồm `survey` -> `vectorDigest` đổi; đường dẫn baseline/candidate trỏ task folder này; thêm trễ PayOS cố định 30 ms vào mock `createPayOsPaymentLink`; mock RPC khảo sát trả `{data:true,error:null}` với cùng trễ 15 ms; mỗi mẫu ghi thêm tên RPC và mốc thời gian bắt đầu RPC khảo sát/kết thúc PayOS; `rpcCounts` tính THEO TÊN: đường nối tiếp [`create_ticket_order_v5`,`prepare_payos_checkout`] = 2 và số RPC khảo sát tách riêng, tổng báo cáo riêng; thêm kiểm sha256 của baseline cũ bất biến: băm BYTE THÔ của file, hằng số ghim sau khi tính từ file hiện tại, ghi cả hằng số và `git ls-files --eol` của file đó trong báo cáo; kiểm này nằm trong một `it` riêng LUÔN chạy, ngoài cổng `CHECKOUT_PERF_MODE` (để `npm test` mặc định cũng chạy nó); không bao giờ ghi vào file đó).
2. Chụp BASELINE MỚI (route chưa sửa, validation đã nhận `survey`): chế độ `baseline` khẳng định nối tiếp 2, khảo sát 0, 0 lỗi; ghi file bằng cờ `wx`. Chụp trong cửa sổ yên tĩnh đã thông báo: thành viên `route` SendMessage các thành viên khác tạm dừng vitest/runner; nếu cần chụp lại, ghi file `ticket-order-survey_BASELINE_R2_17-11-26.json` thay thế có lý do được ghi trong báo cáo (file cũ không bao giờ bị xóa).
3. Sửa `route.ts` theo "Luồng route (P3)": hằng `SURVEY_JOIN_TIMEOUT_MS = 1500`, hàm bắt đầu lưu (không bao giờ reject), hàm join (race + `finally` clear timer), phân loại nhánh, log `ticket_survey_save_failed` (dùng lại `CHECKOUT_RPC_CODES` cho `code`). Không đổi chữ ký 9 tham số của `create_ticket_order_v5`; không thêm tên Server-Timing.
4. Cập nhật `route.test.ts`: `validInput` có `survey`; cập nhật CÓ TÊN hai assertion hiện có cũng sẽ vỡ: ca saved-link (`rpc toHaveBeenCalledExactlyOnceWith("create_ticket_order_v5", ...)`, ~dòng 111) và ca reconcile-lookup-failure (`rpc toHaveBeenCalledOnce()`, ~dòng 332) sang dạng hai lần gọi dự định (v5 + upsert) mà KHÔNG nới matcher; ca non-payable và reconciliation-status giữ đúng một lần gọi; mọi mảng tên RPC cập nhật thành [`create_ticket_order_v5`,`upsert_ticket_order_survey`,`prepare_payos_checkout`] (và biến thể `mark_payos_checkout_reconciliation`); ca mới đặt tên riêng: (a) tham số chính xác của upsert (`p_order_id`, `p_user_id` lấy từ phiên, source chuẩn hóa); (b) lưu lỗi `rpc_error` (mã trong allowlist và mã ngoài allowlist -> `"unknown"`) -> vẫn 201 + link; (c) lưu treo -> 201 trong hạn 1500 ms + log `timeout` (dùng `vi.useFakeTimers({ toFake: ["setTimeout","clearTimeout"] })`, `vi.useRealTimers()` trong afterEach; POST rồi `await vi.advanceTimersByTimeAsync(1500)` rồi await response; assert `vi.getTimerCount() === 0` để chứng minh dọn timer trong `finally`); (d) lưu throw đồng bộ / reject -> 201 + `unexpected`; (e) log được stringify không chứa id đơn, id người dùng, id/nhãn câu trả lời; (f) khảo sát thiếu/sai -> `400 invalid_request` và `rpc` KHÔNG được gọi lần nào (AC5); (g) `checkout_pending`, `order_not_payable`, `checkout_reconciliation_required` -> không gọi RPC khảo sát; (h) `saved-link` -> lưu và join, không gọi PayOS; (i) `reconcile` -> lưu song song; (j) PayOS lỗi sau khi lưu đã bắt đầu -> 503/409 như cũ, không unhandled rejection; (k) Server-Timing vẫn đúng bộ 7 tên (test hiện có).
5. Chạy candidate: khẳng định lỗi <= baseline, nối tiếp `{"2":50}`, khảo sát `{"1":50}`, tổng `{"3":50}` chỉ để báo cáo, RPC khảo sát BẮT ĐẦU trước khi PayOS create kết thúc (chứng minh song song), và `candidate.p50Ms - baseline.p50Ms <= 10`. Lần chạy candidate của vc-tester ở EVL là lần có thẩm quyền; candidate cũng chạy trong cửa sổ yên tĩnh đã thông báo (không vitest/runner song song). Nếu dao động timer (Windows) làm cổng chập chờn: ghi nhận bằng chứng và đề xuất đổi ngưỡng qua thay đổi plan có ghi chú, KHÔNG nới im lặng và KHÔNG chạy lại cho tới khi xanh mà không ghi nhận.

Tests added: `route.test.ts` (a)-(k), benchmark mới (fixture/baseline/candidate/hash).

Gates (PowerShell, sạch biến môi trường trước/sau như plan ticket-checkout-performance):
- Baseline (một lần): đặt `CHECKOUT_PERF_MODE=baseline`, chạy `npm.cmd test -- src/app/api/ticket-orders/route.performance.test.ts`, xóa biến.
- `npx.cmd vitest run src/app/api/ticket-orders src/app/api/payments src/app/api/internal` (route + hồi quy webhook/outbox route).
- Candidate: đặt `CHECKOUT_PERF_MODE=candidate` và `CHECKOUT_PERF_BASELINE=process/general-plans/active/ticket-order-survey_17-11-26/ticket-order-survey_BASELINE_17-11-26.json`, chạy lại lệnh benchmark, xóa biến.
- `git diff --exit-code -- process/general-plans/active/ticket-checkout-performance_17-11-26/ticket-checkout-performance_BASELINE_17-11-26.json` (không đổi) + kiểm sha256 trong test.
- `npx.cmd eslint src/app/api/ticket-orders/route.ts src/app/api/ticket-orders/route.test.ts src/app/api/ticket-orders/route.performance.test.ts --max-warnings=0`.

AC: AC5, AC6, AC7, AC16, AC19 (phía route), AC8 (không đụng webhook/hàm cũ). Rollback: hoàn tác 3 file; file baseline/candidate mới là artifact, không xóa tay.

### P4 — Form + CSS (thành viên `form`)

Files: sửa `src/app/(routes)/_components/TicketRequestDialog.tsx`, `TicketRequestDialog.test.tsx`, `src/styles/globals.css`; tạo `src/app/(routes)/_components/TicketSurveyFields.tsx` (lá Client, export có tên; tách ra vì dialog đã 261 dòng, vượt hướng dẫn ~200 dòng của implementation-standards); ảnh chụp `survey-form-{360,390,768,1280}.png` phẳng trong task folder.

Steps:
1. Viết test đỏ trước: AC1/AC2/AC3 + reset + trợ năng.
2. `TicketSurveyFields.tsx`: 3 `fieldset` + `legend` (chữ câu hỏi nguyên văn từ `survey.ts`, KHÔNG số câu, KHÔNG dấu sao, KHÔNG nhãn "Bắt buộc"/"Tùy chọn"); Q6 checkbox, Q8/Q9 radio; không `required` gốc; thông báo lỗi `role="alert"` + `aria-describedby` trên fieldset; nhận `value`, `errors`, `onChange`, tham chiếu để focus ô đầu của nhóm lỗi đầu tiên.
3. `TicketRequestDialog.tsx`: state điều khiển cho 3 câu + lỗi theo nhóm; khi submit, kiểm `surveyFieldErrors` TRƯỚC khi đặt `submittingRef`/trạng thái pending và TRƯỚC `fetch`; có lỗi -> hiển thị theo nhóm, focus nhóm lỗi đầu, không gửi; hợp lệ -> sắp xếp source theo thứ tự chuẩn rồi thêm `survey: { source, area, attendance }` vào object `attendee` (cùng thứ tự khóa cố định) nên `payloadFingerprint` đổi khi đổi câu trả lời và ổn định theo thứ tự click; `resetSuccessfulSubmission` xóa câu trả lời và lỗi (cùng `formKey`). Đặt khối khảo sát sau khối merch, trước đoạn notice. `TicketRequestDialog.tsx` có thể đạt ~300 dòng: chuyển state/validate/focus của khảo sát vào `TicketSurveyFields.tsx` (hoặc một hook nhỏ do `form` sở hữu); nếu vẫn vượt, ghi một deviation được chấp nhận trong báo cáo.
4. CSS dưới `.ticket-request-dialog__survey*` trong `globals.css` ngay cạnh khối `.ticket-request-dialog__*` hiện có; mobile một cột trong khối `@media(max-width:767px)` dành cho dialog; không đổi selector hiện có; tôn trọng focus-visible/reduced-motion hiện có.
5. Cập nhật test hiện có của dialog: mọi ca submit điền khảo sát qua helper; ca mới: render đúng chữ/thứ tự và vắng "*"/"Bắt buộc"/"Tùy chọn" trong 3 nhóm (AC1); bỏ trống từng nhóm (và không chọn ô nào ở Q6) -> thông báo riêng, `fetch` không được gọi (AC2); fingerprint: đổi câu trả lời xoay khóa idempotency, đảo thứ tự click Q6 cùng tập -> cùng khóa (AC3); reset xóa câu trả lời; thông báo có `role="alert"`/`aria-describedby`, focus nhóm lỗi đầu.
6. Thăm dò trình duyệt (Agent-Probe, `agent-browser`): chạy `npm.cmd run dev` trên một cổng rảnh (xem quy tắc song song (5): dừng và xác nhận không còn lắng nghe trước P6/EVL), mở dialog, kiểm 360/390/768/1280 px: không tràn ngang, một cột ở mobile, lỗi hiển thị đúng, chữ Việt đúng; lưu 4 ảnh chụp; ghi kết quả vào báo cáo.

Gates: `npx.cmd vitest run "src/app/(routes)/_components/TicketRequestDialog.test.tsx"`; `npx.cmd eslint "src/app/(routes)/_components/TicketRequestDialog.tsx" "src/app/(routes)/_components/TicketRequestDialog.test.tsx" "src/app/(routes)/_components/TicketSurveyFields.tsx" --max-warnings=0`; thăm dò agent-browser (4 độ rộng).

AC: AC1, AC2, AC3. Rollback: hoàn tác 3 file + xóa `TicketSurveyFields.tsx`; CSS mới là khối tách biệt nên hoàn tác độc lập.

### P5 — Sheet adapter + worker (thành viên `sheet`)

Files: sửa `src/lib/ticket-registration/paid-orders.ts`, `paid-orders.test.ts`, `outbox-worker.ts`, `outbox-worker.test.ts`. Đọc-only: `src/app/api/internal/sheets-sync/route.ts` (không đổi chữ ký `drainPaidTicketSheetOutbox`).

Steps:
1. Test đỏ trước.
2. `paid-orders.ts`: `defaultPaidOrdersRange = "Registrations!A:Q"`; regex `^.{1,200}!A:Q$`; `makeRow(order, survey)` 17 chuỗi với kiểm độ dài; G/H/M từ `surveyToSheetCells`; tra cứu `values[13]`; range cập nhật `A{n}:Q{n}`; `upsertPaidTicketOrder(order, survey)` (survey `TicketSurvey | null`); hàng đã có + `null` -> ghi đè G/H/M bằng rỗng.
3. `outbox-worker.ts`: hàm đọc khảo sát cho từng đơn (gọi `get_ticket_order_survey` với `{ p_order_id: raw.order_id }`; bắt mọi throw bên trong và ném `survey_read_failed`); `[]` -> `null`; không phải mảng, > 1 hàng, hàng sai dạng (qua `parseSurvey`), lỗi rpc -> `survey_read_failed`; gọi TRƯỚC `upsertPaidTicketOrder`, trong `try` của vòng lặp; thêm đúng 1 nhánh `errorCode()` -> `"survey_read_failed"`. Không đổi claim/complete/fail.
4. Cập nhật test: `paid-orders.test.ts` (range mặc định/`A:Q`, `A:N` bị từ chối `invalid_sheet_range`, hàng 17 chuỗi và vị trí cột đầy đủ, Q6 nối ";" theo thứ tự chuẩn, mã đơn ở chỉ số 13 cho tra cứu, update `A{n}:Q{n}`, ghi đè rỗng khi survey null, append như cũ); `outbox-worker.test.ts` (mock rpc trả `[]` cho `get_ticket_order_survey` mặc định; chỉ số gọi dịch chuyển: 1 claim, 2 get survey, 3 complete; ca (a) và (b) -> upsert nhận `null`, synced; ca có khảo sát -> upsert nhận đối tượng chuẩn hóa; ca (c) với rpc error / throw / không phải mảng / hàng sai dạng / > 1 hàng -> `fail_paid_ticket_sheet_sync` với `p_error_code: "survey_read_failed"` khớp mẫu, KHÔNG gọi upsert, KHÔNG gọi complete, không mang câu trả lời/mã đơn/thông điệp gốc; ca ghi nhận hành vi AC20 = đơn không có hàng khảo sát lúc đồng bộ -> G/H/M rỗng, synced).

Gates: `npx.cmd vitest run src/lib/ticket-registration src/app/api/internal`; `npx.cmd eslint src/lib/ticket-registration/paid-orders.ts src/lib/ticket-registration/paid-orders.test.ts src/lib/ticket-registration/outbox-worker.ts src/lib/ticket-registration/outbox-worker.test.ts --max-warnings=0`.

AC: AC11, AC12, AC13, AC14 (phần regex), AC20 (test ghi nhận). Rollback: hoàn tác 4 file. Lưu ý rollback app sau khi Sheet đã A:Q KHÔNG sạch (app cũ ghi 14 cột sai cột) — xem mục Rollout.

### P6 — Tài liệu, bằng chứng rủi ro cao, cổng cuối (thành viên `docs`, sau P2-P5; cổng chạy bởi vc-tester ở EVL)

Files: sửa `.env.example`, `README.md`, `process/context/all-context.md`, `process/context/tests/all-tests.md`, `process/context/uxui/component-contracts.md`; tạo `ticket-order-survey_REF_17-11-26.md` (runbook triển khai/vận hành), `ticket-order-survey_REPORT_17-11-26.md`, `harness/{context-snippets,verification,review-decision,adversarial-validation}.json`, backlog NOTE (mục Known gaps).

Steps:
1. `.env.example`: chú thích "must be a tab range ending in !A:Q", giá trị `Registrations!A:Q` (không đổi biến khác, không giá trị bí mật). README: mặc định `Registrations!A:Q` (dòng ~112), mục vận hành khảo sát (bố cục 17 cột, cách phát hiện race AC20, cách bù bằng `requeue_synced_sheet_sync_for_survey`, thứ tự triển khai tóm tắt + trỏ runbook).
2. Runbook REF: thứ tự production (xem mục Rollout), truy vấn xác minh quyền mô tả chức năng (4 hàm × 3 role, `relrowsecurity`, `prosecdef`/`search_path`, quyền bảng) — người triển khai viết truy vấn từ mô tả, kiểm tra thủ công A2 từng bước, việc khôi phục env, đối chiếu đơn paid trong cửa sổ, ghi chú forward-fix, ghi chú "ai cũng KHÔNG gọi `/api/internal/sheets-sync` hay `enqueue_paid_ticket_sheet_sync` trước khi app mới deploy"; ba ghi chú runbook bổ sung ở mục Rollout (hàng pre-cutover 14 cột, webhook PayOS của app cũ, `.env` do chủ dự án sửa).
3. `all-tests.md`: runner nay chạy mọi `supabase/tests/*.sql` với tripwire + sentinel; biến `CHECKOUT_GUARD_ARTIFACTS_DIR`; benchmark fixture mới + baseline mới + hash baseline cũ; gap mới (không test cho cổng ghi Sheet thật vẫn đúng; cập nhật dòng "No SQL test covers 202611170002" nếu còn đúng — requeue được test, 170002 trigger vẫn chưa). `all-context.md`: sự thật mới (bảng khảo sát, 4 hàm, migration 170003 TỒN TẠI trong repo và CHƯA áp dụng trên DB thật, Sheet 17 cột, range A:Q, mẫu key patterns: id ổn định, join có trần). `component-contracts.md`: một dòng cho khối khảo sát của dialog. Chạy lại `discover-context.mjs --emit-routing` nếu mô tả nhóm đổi, rồi `--check-routing` và các validator ở mục Harness Verification của all-tests.md.
4. Báo cáo REPORT: bảng AC1-AC20 -> lệnh + kết quả + giới hạn; baseline lint/test/typecheck/build trước-sau (so sánh theo từng file lỗi, không lỗi MỚI); kết quả benchmark (p50/p95, `rpcCounts` theo tên, song song); red-proof A/B/C; ảnh chụp; build exit 1 rồi 0 (ghi cả hai); known gaps và CONDITIONAL.
5. Gói harness: `context-snippets.json`, `verification.json`, `adversarial-validation.json` (ít nhất 5 ca đối kháng, xem mục Edge cases), Trình tự: đội xong -> orchestrator spawn vc-code-reviewer (chỉ đọc, không có quyền Write) -> reviewer TRẢ verdict (`approved` | `approved-with-concerns` | `rejected`) -> một agent không phải tác giả (do orchestrator spawn) chép NGUYÊN VĂN vào `harness/review-decision.json` -> vc-tester chạy GJ.8. Lần chạy validator ở P6 (khi chưa có review) KỲ VỌNG exit 1 với đúng một mục thiếu là `review-decision.json`; exit 0 chỉ yêu cầu ở GJ.8. Chạy `node .claude/skills/vc-risk-evidence-pack/scripts/validate-risk-artifacts.mjs process/general-plans/active/ticket-order-survey_17-11-26/harness/`.
6. Backlog NOTE (một file, `process/general-plans/backlog/ticket-order-survey-followups_17-11-26/ticket-order-survey-followups_NOTE_17-11-26.md`) ghi các stub xây test cho known-gap (xem bảng Known gaps).
7. Cổng cuối (chạy bởi vc-tester độc lập ở EVL, không phải người viết code): xem Verification Evidence GJ.1-GJ.9.

AC: AC14 (tài liệu), AC17, AC18, AC20 (tài liệu), AC15 (chuẩn bị checklist; chạy do chủ dự án). Rollback: hoàn tác file tài liệu; context docs phản ánh trạng thái thực tế nên chỉ hoàn tác khi code cũng hoàn tác.

## Acceptance Criteria — Traceability (REQ-TEST-LINK)

Mỗi AC nêu `proven by:` (cổng, định nghĩa ở Verification Evidence) và `strategy:` (Fully-Automated | Hybrid | Agent-Probe).

| AC | Phase | proven by: | strategy: |
|---|---|---|---|
| AC1 | P4 | G4.1 dialog render test | Fully-Automated |
| AC2 | P4 | G4.1 dialog interaction test từng nhóm | Fully-Automated |
| AC3 | P4 | G4.1 fingerprint/thứ tự ổn định | Fully-Automated |
| AC4 | P1 | G1.1 survey + validation bảng ca âm | Fully-Automated |
| AC5 | P3 | G3.2 route.test.ts đường 400, RPC = 0 | Fully-Automated |
| AC6 | P3 | G3.2 lỗi/treo + nội dung log | Fully-Automated |
| AC7 | P3 | G3.2 + G3.3 (join nhanh/treo, tên Server-Timing, song song); `after()` đã loại nên không cần thăm dò; chứng minh cơ chế tự động, việc serverless đóng băng thật chưa xác minh (residual K.1) | Hybrid |
| AC8 | P2/P3/P5/P6 | GJ.6 diff gate + G3.2/G5.1/G2.1 test hiện có xanh | Fully-Automated |
| AC9 | P2 | G2.1 runner + G2.3/G2.4/G2.5 red-proof | Fully-Automated |
| AC10 | P2 | G2.1 SQL assertions (CHECK, cascade, idempotent) + G2.2 drift + G2.5 (quyền bảng) | Fully-Automated |
| AC11 | P5 | G5.1 paid-orders.test.ts | Fully-Automated |
| AC12 | P5 | G5.1 paid-orders + outbox-worker 3 trạng thái | Fully-Automated |
| AC13 | P5 | G5.1 outbox-worker mã lỗi mới | Fully-Automated |
| AC14 | P5 + P6 | G5.1 regex/range + GJ.7 kiểm tài liệu có ghi lại (grep) — chọn kiểm ghi lại, không thêm test mới | Hybrid |
| AC15 | P6 (chủ dự án chạy) | GJ.10 thử tay A2 trên bản sao Sheet | Agent-Probe (CONDITIONAL tới khi chạy) |
| AC16 | P3 | G3.3 benchmark candidate + hash baseline cũ | Fully-Automated |
| AC17 | P1 (baseline) + P6 | GJ.1-GJ.5 so với baseline lint ghi lại | Fully-Automated |
| AC18 | P6 | GJ.8 validator gói bằng chứng + checklist triển khai được duyệt; review độc lập | Hybrid |
| AC19 | P2 + P3 | G2.1 SQL P0002 hai ca + G3.2 route chỉ truyền đơn/người dùng của phiên | Fully-Automated |
| AC20 | P2 + P5 + P6 | G2.1 requeue SQL + G5.1 test ghi nhận + README (GJ.7) + kiểm thủ công trên bản sao | Hybrid |

## Touchpoints

- **Sửa:** `src/lib/ticket-orders/validation.ts`, `validation.test.ts`; `src/app/api/ticket-orders/route.ts`, `route.test.ts`, `route.performance.test.ts`; `src/app/(routes)/_components/TicketRequestDialog.tsx`, `TicketRequestDialog.test.tsx`; `src/styles/globals.css`; `src/lib/ticket-registration/paid-orders.ts`, `paid-orders.test.ts`, `outbox-worker.ts`, `outbox-worker.test.ts`; `scripts/test-checkout-guard-db.mjs`; `supabase/tests/checkout-access-guard.sql` (chỉ sentinel); `.env.example`; `README.md`; `process/context/all-context.md`, `tests/all-tests.md`, `uxui/component-contracts.md`.
- **Tạo:** `src/lib/ticket-orders/survey.ts`, `survey.test.ts`, `survey-migration-drift.test.ts`; `src/app/(routes)/_components/TicketSurveyFields.tsx`; `supabase/migrations/202611170003_ticket_order_survey.sql`; `supabase/tests/ticket-order-survey.sql`; trong task folder: baseline lint REF, `ticket-order-survey_BASELINE_17-11-26.json`, `ticket-order-survey_CANDIDATE_17-11-26.json`, `ticket-order-survey_REF_17-11-26.md`, `ticket-order-survey_REPORT_17-11-26.md`, 4 ảnh PNG, `harness/*.json`; backlog NOTE.
- **Chỉ đọc (cấm sửa):** mọi `supabase/migrations/*` đã có; `src/lib/payments/**`; `src/app/api/payments/**`; `src/app/api/internal/sheets-sync/route.ts`; `ticket-checkout-performance_BASELINE_17-11-26.json`.

## Public Contracts

- **HTTP:** `POST /api/ticket-orders` nhận thêm khóa bắt buộc `survey: { source: string[], area: string, attendance: string }`; thiếu/sai -> `400 invalid_request` chung (không nêu trường). Client cũ đã cache (không có `survey`) nhận 400 chung sau deploy; chấp nhận vì deploy khi checkout TẮT. Phản hồi 201/409/429/503, header `Server-Timing` (7 tên cố định) không đổi.
- **DB (service_role-only):** `public.ticket_order_survey`; `upsert_ticket_order_survey`, `get_ticket_order_survey`, `ticket_survey_source_valid`, `requeue_synced_sheet_sync_for_survey` (chữ ký ở bảng hợp đồng). Không đổi hàm/bảng đang có.
- **Sheet:** tab Registrations bố cục A:Q (17 cột, mã đơn ở cột N); biến `GOOGLE_SHEETS_PAID_ORDERS_RANGE` phải kết thúc `!A:Q` (`A:N` bị từ chối).
- **Log:** `console.error("ticket_survey_save_failed", { reason, code })` — không đơn/người dùng/câu trả lời.
- **Mã lỗi outbox mới:** `survey_read_failed` trong `last_error_code`.

## Security Review (STRIDE, vc-security)

| Mối đe dọa | Điểm | Biện pháp |
|---|---|---|
| Spoofing | `p_user_id` giả | Chỉ lấy từ `authData.user.id`; DB kiểm `orders(id,user_id)`; FK kép |
| Tampering | Câu trả lời giả/ngoài danh sách; thân lớn | Validate hai lớp (client, server `parseSurvey`) + CHECK DB; giới hạn 8 KiB có sẵn; id ổn định, không nhận nhãn |
| Tampering | Công thức/inject vào Sheet | Giá trị khảo sát chỉ là nhãn cố định từ allowlist; ghi `RAW` như cũ |
| Repudiation | Không có dấu vết | `created_at/updated_at`; log lỗi có `reason`/`code` |
| Information disclosure | Log/Server-Timing lộ đơn/người dùng/đáp án; DB lộ cho anon | Log chỉ `{reason, code}`; không tên timing mới; RLS bật + revoke bảng/hàm + assert `set role` bị 42501; dữ liệu cá nhân gửi Sheet bên thứ ba CHƯA có consent/retention (nợ ghi nhận) |
| Denial of service | Lưu khảo sát treo kéo dài checkout | Trần 1500 ms, timer xóa trong `finally`, promise không reject |
| Elevation of privilege | SECURITY DEFINER mở rộng; hàm requeue bị lạm dụng | `search_path=''`, qualified names, revoke/grant chữ ký chính xác, requeue chỉ đụng hàng `synced` của đơn paid có khảo sát |

## Edge cases cho 3 hạng mục rủi ro cao nhất (vc-scenario)

1. **Route song song/join:** lưu hoàn tất sau khi đã trả 201 (log timeout rồi thêm log rpc_error muộn — chấp nhận, hai dòng khác `reason`); PayOS lỗi sau khi lưu đã bắt đầu (không unhandled rejection); `saved-link` retry cùng key sau lần lưu hỏng (tự chữa); cùng idempotency key khác `survey` (client luôn xoay khóa khi đổi đáp án; server không so khóa với survey, upsert ghi đè chỉ cho chủ đơn); `admin.rpc` ném đồng bộ; timer rò rỉ khi 201 sớm; lưu bắt đầu ở nhánh `pending` (cấm).
2. **Worker đọc khảo sát:** `[]` vs lỗi (phân biệt), hàng có `source` rỗng/id lạ do DB bị sửa tay (qua `parseSurvey` -> lỗi đọc, fail-closed), > 1 hàng, rpc trả `null` không lỗi, throw mạng; mã lỗi mới khớp `^[a-z0-9_]{1,80}$`; không lộ thông điệp gốc; khảo sát đến giữa chừng giữa hai lần đồng bộ (known-gap AC20).
3. **Cắt sang Sheet 17 cột/triển khai:** app cũ A:N chạy với Sheet A:Q (lệch cột) — không ai gọi sync/enqueue trước khi deploy mới; deploy mới nhưng biến vẫn `A:N` -> fail-closed `invalid_range`; migration chưa áp dụng khi code mới chạy -> route chỉ log lỗi lưu, worker `survey_read_failed` rồi tự chữa sau migration; cửa sổ A2: khách thật mua trong lúc spreadsheet trỏ bản sao -> hàng đi sai Sheet (xem Rollout: đối chiếu + requeue); đơn test thật nằm trong DB production; hàng trùng `duplicate_sheet_order_rows` nếu cả bản sao và Sheet thật cùng được ghi.

## Blast Radius

Một package Next.js, một migration, một runner PostgreSQL cô lập, một bảng DB mới; nhóm rủi ro cao: route thanh toán, migration + quyền DB, dữ liệu cá nhân gửi bên thứ ba. Không thêm thư viện, không đổi hàm thanh toán/outbox hiện có.

| File | Owner (teammate) | Loại | Phase |
|---|---|---|---|
| `src/lib/ticket-orders/survey.ts`, `survey.test.ts`, `validation.ts`, `validation.test.ts` | `contract` | tạo/sửa | P1 |
| `ticket-order-survey-lint-baseline_REF_17-11-26.md` | `contract` | tạo | P1 |
| `supabase/migrations/202611170003_ticket_order_survey.sql`, `supabase/tests/ticket-order-survey.sql`, `supabase/tests/checkout-access-guard.sql` (sentinel), `scripts/test-checkout-guard-db.mjs`, `src/lib/ticket-orders/survey-migration-drift.test.ts` | `db` | tạo/sửa | P2 |
| `src/app/api/ticket-orders/route.ts`, `route.test.ts`, `route.performance.test.ts`, baseline/candidate JSON mới | `route` | sửa/tạo | P3 |
| `TicketRequestDialog.tsx`, `TicketRequestDialog.test.tsx`, `TicketSurveyFields.tsx`, `src/styles/globals.css`, 4 ảnh PNG | `form` | sửa/tạo | P4 |
| `paid-orders.ts`, `paid-orders.test.ts`, `outbox-worker.ts`, `outbox-worker.test.ts` | `sheet` | sửa | P5 |
| `.env.example`, `README.md`, `all-context.md`, `all-tests.md`, `component-contracts.md`, REF, REPORT, `harness/*`, backlog NOTE | `docs` | sửa/tạo | E0, P6 |

Các tập file rời nhau (không file nào có hai owner). Đối tượng cấm sửa liệt kê ở Touchpoints.

## Rollout and Rollback

### Thứ tự production (chủ dự án thực hiện; agent KHÔNG làm)

1. Giữ checkout TẮT; sao lưu Google Sheet (bản sao có tab Registrations bố cục A:Q — dùng luôn làm bản sao cho bước 5, chia sẻ cho service account).
2. Áp dụng migration `202611170003` trong Supabase SQL Editor; chạy truy vấn xác minh quyền theo runbook (4 hàm: chỉ service_role = true, anon/authenticated = false; bảng không cấp cho anon/authenticated; RLS bật; SECURITY DEFINER + `search_path` rỗng).
3. Đặt `GOOGLE_SHEETS_PAID_ORDERS_RANGE=Registrations!A:Q` và deploy — MỘT bước (biến môi trường chỉ có hiệu lực ở lần deploy kế tiếp). Cho tới khi app mới deploy, không ai gọi `/api/internal/sheets-sync` hay `enqueue_paid_ticket_sheet_sync` (app cũ sẽ append 14 cột vào Sheet 17 cột).
4. Thử tay A2: đặt `GOOGLE_SHEETS_SPREADSHEET_ID` = bản sao + `PAYOS_CHECKOUT_ENABLED=true`, deploy; tạo MỘT đơn test đi trọn luồng (đây là đơn và khoản thanh toán thật trong DB production — chủ dự án tự quyết xử lý), gọi `POST /api/internal/sheets-sync` có bearer, kiểm 17 cột trên bản sao (G/H/M, mã đơn cột N). Rủi ro cửa sổ: khách thật mua lúc này sẽ đồng bộ sang bản sao; sau khi khôi phục, đối chiếu đơn paid trong cửa sổ và dùng `requeue_synced_sheet_sync_for_survey` cho các đơn có khảo sát.
5. Khôi phục `GOOGLE_SHEETS_SPREADSHEET_ID` về Sheet thật và deploy lại khi checkout TẮT; kiểm worker ghi đúng hàng.
6. Bật checkout (`PAYOS_CHECKOUT_ENABLED=true`) và deploy.

Ghi chú runbook bổ sung (P6 REF):

- Hàng production tạo trước cutover có 14 cột (mã đơn ở chỉ số 10) nên KHÔNG khớp tra cứu `values[13]` mới: sync lại sẽ append hàng trùng. Chủ dự án chỉnh bố cục tay hoặc xóa các hàng đó và KHÔNG requeue/enqueue lại (các đơn này không có hàng khảo sát nên requeue cũng không đụng tới).
- Checkout giữ TẮT và các link PayOS tạo trước đó phải hết hạn/không có paid webhook nào đến trước bước 3: webhook PayOS của app cũ gọi `drainPaidTicketSheetOutbox` (webhook `route.ts` dòng 75), một paid event muộn cho link tạo trước khi tắt checkout sẽ kích hoạt sync bằng app cũ.
- `.env` cục bộ vẫn là `Registrations!A:N` nên sync cục bộ fail-closed `invalid_range` cho tới khi chủ dự án tự sửa; agent không bao giờ đụng `.env`.

Nếu code mới lên trước migration: route chỉ log lỗi lưu (không chặn checkout); worker fail an toàn `survey_read_failed`, tự chữa sau migration.

### Rollback

- DB: forward-only; rollback = migration mới; KHÔNG drop `ticket_order_survey` (mất dữ liệu) — xuất dữ liệu trước hoặc giữ bảng và vô hiệu hóa việc dùng. Hàm mới service_role-only nên giữ lại vô hại.
- App: hoàn tác route/form/worker bằng revert commit; NHƯNG revert app KHÔNG sạch khi Sheet đã là A:Q (app cũ ghi 14 cột lệch cột và tra mã đơn ở chỉ số 10). Xử lý: giữ checkout TẮT và forward-fix; chỉ revert app cùng lúc đưa Sheet về bố cục cũ nếu chủ dự án quyết.
- Thứ tự revert code khi chưa deploy: P6 -> P5 -> P4 -> P3 -> P2 -> P1.

## Verification Evidence

| Gate / Scenario | Strategy | Proves SPEC criterion |
|---|---|---|
| G1.1 `npx.cmd vitest run src/lib/ticket-orders/survey.test.ts src/lib/ticket-orders/validation.test.ts` — bảng ca hợp lệ/không hợp lệ đủ ca âm, thứ tự Q6 ổn định | Fully-Automated | AC4 |
| G2.1 `node scripts/test-checkout-guard-db.mjs` — chạy mọi `supabase/tests/*.sql` (tripwire + sentinel), grants service_role-only với chữ ký chính xác, `set role anon/authenticated` bị 42501, CHECK, cascade, upsert idempotent, P0002 cho "không tồn tại" và "không thuộc", requeue 5 ca, các assertion v4/v5 cũ vẫn xanh | Fully-Automated | AC9, AC10, AC19, AC20, AC8 |
| G2.2 `npx.cmd vitest run src/lib/ticket-orders/survey-migration-drift.test.ts` — tập id trong migration khớp `survey.ts` (đếm 8/8/2) | Fully-Automated | AC10 |
| G2.3 Red-proof A: tạm làm hỏng một assertion khảo sát, runner phải exit != 0, hoàn tác, xanh lại (ghi lệnh + exit code) | Fully-Automated | AC9 |
| G2.4 Red-proof B: tạm bỏ sentinel của file khảo sát, runner phải fail, hoàn tác | Fully-Automated | AC9 |
| G2.5 Red-proof C: tạm bỏ dòng `revoke all on table` của migration, runner phải exit != 0, hoàn tác (assertion quyền bảng không vacuous nhờ `alter default privileges` ở runner) | Fully-Automated | AC9, AC10 |
| G3.1 Baseline mới (`CHECKOUT_PERF_MODE=baseline`) chụp sau P1, trước khi sửa `route.ts`; ghi bằng cờ `wx` trong cửa sổ yên tĩnh đã thông báo; nối tiếp 2, khảo sát 0 | Fully-Automated | AC16 |
| G3.2 `npx.cmd vitest run src/app/api/ticket-orders src/app/api/payments src/app/api/internal` — ca (a)-(k): tham số upsert, lỗi/treo/throw không chặn, log sạch, 400 không gọi RPC, các nhánh 409 không lưu, saved-link, Server-Timing 7 tên, hồi quy webhook/outbox route | Fully-Automated | AC5, AC6, AC7, AC8, AC19 |
| G3.3 Candidate (`CHECKOUT_PERF_MODE=candidate` + `CHECKOUT_PERF_BASELINE` = baseline mới): nối tiếp `{"2":50}`, khảo sát `{"1":50}`, RPC khảo sát bắt đầu trước khi PayOS xong, p50 chênh <= 10 ms, lỗi không tăng; kèm sha256 baseline cũ không đổi (`it` luôn chạy, byte thô) + `git diff --exit-code` file cũ; chụp baseline/candidate trong cửa sổ yên tĩnh, candidate của vc-tester ở EVL là có thẩm quyền, cho phép file thay thế `_BASELINE_R2` có ghi lý do. Chứng minh cơ chế tự động; serverless đóng băng thật chưa xác minh (residual K.1) | Fully-Automated | AC16, AC7 |
| G4.1 `npx.cmd vitest run "src/app/(routes)/_components/TicketRequestDialog.test.tsx"` — chữ/thứ tự/vắng dấu sao, lỗi từng nhóm và không `fetch`, fingerprint ổn định theo thứ tự click, reset, trợ năng | Fully-Automated | AC1, AC2, AC3 |
| G4.2 `agent-browser` trên `npm.cmd run dev` ở 360/390/768/1280: không tràn ngang, một cột mobile, lỗi hiển thị; 4 ảnh chụp trong task folder | Agent-Probe | AC1, AC2 |
| G5.1 `npx.cmd vitest run src/lib/ticket-registration src/app/api/internal` — makeRow 17 cột, `A:Q`, `A:N` bị từ chối, update `A{n}:Q{n}`, ba trạng thái khảo sát, `survey_read_failed` | Fully-Automated | AC11, AC12, AC13, AC14, AC20 |
| GJ.1 `npm.cmd test` (toàn bộ Vitest) so với số lượng baseline | Fully-Automated | AC17, AC8 |
| GJ.2 `npm.cmd run lint` toàn repo so baseline (không file/lỗi MỚI) + `npx.cmd eslint <file chạm> --max-warnings=0` | Fully-Automated | AC17 |
| GJ.3 `npm.cmd run typecheck` | Fully-Automated | AC17 |
| GJ.4 `node scripts/test-checkout-guard-db.mjs` lần cuối sau khi gộp | Fully-Automated | AC17, AC9 |
| GJ.5 `npm.cmd run build` — ghi exit lần 1 và lần retry (cảnh báo Next 16.4.3: exit 1 rồi 0) | Fully-Automated | AC17 |
| GJ.6 Cổng diff: `git status --porcelain supabase/migrations` chỉ có migration 170003 mới; `git diff --exit-code HEAD -- src/lib/payments src/app/api/payments` rỗng | Fully-Automated | AC8 |
| GJ.7 Kiểm tài liệu có ghi lại (không thêm test): `A:N` không còn trong `.env.example`/README, `A:Q` có ở cả hai; README nêu phát hiện race và hàm requeue | Hybrid | AC14, AC20 |
| GJ.8 `node .claude/skills/vc-risk-evidence-pack/scripts/validate-risk-artifacts.mjs process/general-plans/active/ticket-order-survey_17-11-26/harness/` exit 0 (sau khi `review-decision.json` đã được chép nguyên văn từ verdict `approved`/`approved-with-concerns` của vc-code-reviewer độc lập) + checklist triển khai được duyệt | Hybrid | AC18 |
| GJ.9 `node .claude/skills/vc-generate-plan/scripts/validate-plan-artifact.mjs <plan>`; `discover-context.mjs --check-routing`; `validate-all-context.mjs`; `validate-context-discovery.mjs`; `validate-protocol-discovery.mjs` | Fully-Automated | AC17, AC18 |
| GJ.10 Thử tay A2 trên bản sao Sheet (chủ dự án chạy theo runbook; kiểm 17 cột, mã đơn ở N, G/H/M, đơn test đi trọn luồng) — CHƯA chạy = CONDITIONAL | Agent-Probe | AC15 |
| K.1 Độ trễ hosted/1500 ms, PayOS thật, migration trên DB thật, ghi Sheet production, tự động phát hiện race — Known-Gap có backlog stub, giữ cổng CONDITIONAL | Known-Gap (residual, không phải chiến lược chứng minh) | AC7, AC15, AC18, AC20 (biên) |
| K.2 PostgREST truyền mảng JS sang `text[]` đầu-cuối: chỉ xác nhận qua tài liệu, test route mock RPC nên không chạy thật — Known-Gap có backlog stub, giữ CONDITIONAL | Known-Gap (residual, không phải chiến lược chứng minh) | AC5, AC10 (biên) |

### Tầng kiểm thử theo vùng (vc-test-coverage-plan; đã nạp `all-tests.md` và các test hiện có trong blast radius)

| Vùng | High-risk class | Fully-Automated | Hybrid | Agent-Probe | Known-Gap |
|---|---|---|---|---|---|
| `survey.ts` + validation | trust boundary | G1.1 | — | — | — |
| DB migration/quyền | schema/migration, permission | G2.1-G2.5 | drift G2.2 | review quyền/lock bởi reviewer | migration chưa áp dụng trên DB thật (chủ dự án) |
| Route thanh toán | payment/API | G3.2, G3.3 | AC7 (join) | — | 1500 ms hosted chưa đo |
| Form | — | G4.1 | — | G4.2 (4 độ rộng) | — |
| Sheet + worker | third-party personal data | G5.1 | GJ.7 | GJ.10 (ghi thật) | tự động phát hiện race; scheduler/retry cap/cảnh báo outbox |
| Triển khai | high-risk | GJ.8 | AC18 checklist | — | consent/retention chưa quyết |

Quy tắc xanh giả: mỗi Known-Gap = backlog stub + cổng CONDITIONAL; không hành vi nào được tuyên PASS chỉ nhờ Known-Gap.

### Known gaps và backlog stubs (ghi vào NOTE ở P6)

| Gap | Stub xây test/xử lý | Giữ CONDITIONAL cho |
|---|---|---|
| Ghi thật 17 cột chỉ qua thăm dò thủ công | Stub: test tích hợp Sheets với bản sao tự động (cần định danh không production) | AC15 |
| 1500 ms chưa đo hosted | Stub: đo non-production có phê duyệt | AC6/AC7 biên |
| Race khảo sát muộn không tự phát hiện | Stub: job đối chiếu `synced` + G/H/M rỗng + có hàng khảo sát, gọi requeue | AC20 |
| Không scheduler `/api/internal/sheets-sync`, không retry cap/cảnh báo outbox (có sẵn từ trước) | Stub: scheduler + giới hạn + cảnh báo | vận hành |
| K.2 PostgREST mảng JS -> `text[]` chưa kiểm đầu-cuối (route test mock RPC) | Stub: test tích hợp thật với PostgREST/Supabase không-production | AC5/AC10 biên |
| Quyết định mở (không phải test): consent/retention, "Khác", backfill | Ghi ở NOTE như câu hỏi cho chủ dự án | — |

### Red-first test stubs (cho validate-contract; không tạo file ở PLAN)

- `test("should reject duplicate, empty, unknown and mistyped survey answers", () => { throw new Error("NOT IMPLEMENTED — AC4") })`
- `test("should normalize Q6 to canonical order regardless of click order", () => { throw new Error("NOT IMPLEMENTED — AC3/AC4") })`
- `test("should return 400 invalid_request and make no RPC call when survey is missing or invalid", () => { throw new Error("NOT IMPLEMENTED — AC5") })`
- `test("should still return the payment link when the survey save fails or hangs past the bound", () => { throw new Error("NOT IMPLEMENTED — AC6") })`
- `test("should start the survey save in parallel with PayOS and not on the checkout_pending branch", () => { throw new Error("NOT IMPLEMENTED — AC7/AC16") })`
- `test("should reject a survey upsert for a missing order and for another user's order with the same error", () => { throw new Error("NOT IMPLEMENTED — AC19") })`
- `test("should write exactly 17 columns with the order id at index 13 and empty G/H/M when no survey", () => { throw new Error("NOT IMPLEMENTED — AC11/AC12") })`
- `test("should fail the outbox row with survey_read_failed and not write the sheet when the survey read fails", () => { throw new Error("NOT IMPLEMENTED — AC12c/AC13") })`
- `test("should reject GOOGLE_SHEETS_PAID_ORDERS_RANGE ending in A:N", () => { throw new Error("NOT IMPLEMENTED — AC14") })`
- `test("should show three survey groups without asterisk or required badge and show a per-group Vietnamese error", () => { throw new Error("NOT IMPLEMENTED — AC1/AC2") })`

## Test Infra Improvement Notes

- Runner `test-checkout-guard-db.mjs` chỉ chạy cứng 1 file SQL (và đường dẫn artifact cứng): được sửa ở P2 (tripwire + sentinel + env override + red-proof). Ghi nhận trong `all-tests.md`.
- Benchmark mới đếm RPC theo tên (không còn khẳng định tổng `{"2": n}`); baseline cũ được bảo vệ bằng sha256.
- Chưa có test tự động đọc `.env.example`/README: AC14 dùng kiểm grep có ghi lại (không thêm test mới) — có thể xem xét test tài liệu ở backlog.
- Chưa có test cho trigger `synced_at` của 202611170002 (không thuộc phạm vi); hàm requeue mới được test.
- Cổng song song trong EXECUTE bị hạn chế (không typecheck/build đồng thời); P6 gom sau khi gộp.

## High-risk evidence pack (harness/)

Lớp rủi ro: payments, schema/migration, public API contract, permission/secret/trust-boundary, dữ liệu cá nhân gửi bên thứ ba. Năm file trong `process/general-plans/active/ticket-order-survey_17-11-26/harness/`: `risk-gate.json` (E0, trước P1), `context-snippets.json`, `verification.json`, `adversarial-validation.json`, `review-decision.json` (trước khi hoàn tất). Validator: `node .claude/skills/vc-risk-evidence-pack/scripts/validate-risk-artifacts.mjs process/general-plans/active/ticket-order-survey_17-11-26/harness/`. `harness/` là ngoại lệ hẹp đã được `plan-lifecycle.md` công nhận so với quy tắc task folder phẳng. KHÔNG tạo artifact harness ở PLAN/VALIDATE.

Quyết định độc lập (DECISION independent): `review-decision.json` do vc-code-reviewer (sonnet) CHƯA từng viết code của task này quyết định; Trình tự chép verdict (reviewer chỉ đọc; agent không phải tác giả ghi file; từ vựng validator `approved | approved-with-concerns | rejected`) như P6 bước 5. `rejected` -> vòng sửa test/code nhỏ bởi vc-execute-agent (supplement) rồi review lại; chỉ `approved`/`approved-with-concerns` mới đóng. Phê duyệt chỉ bao phủ hành vi local + PostgreSQL cô lập; hosted/production/PayOS thật/ghi Sheet thật vẫn ngoài phạm vi. `mustStopBeforeFinalize` và `humanApprovalRequired` giữ `true`: chủ dự án quyết commit, migration, deploy.

## Execution Strategy (EXECUTE) and model policy

**Chấm điểm 7 tín hiệu (vc-agent-strategy-compare):** S1 nhiều package 0 (một package); S2 schema/API/auth 1; S3 3+ hướng 0 (INNOVATE đã khóa); S4 phase program 0 (một plan COMPLEX, 6 workstream, không cần vòng research/validate riêng từng phase); S5 yêu cầu chiều sâu 0; S6 lớp rủi ro cao 1; S7 >= 5 file 1. **Điểm 3/7 (MEDIUM).** Bảng ngưỡng nghiêng về parallel subagents, nhưng quy tắc "fit" áp dụng: cần phối hợp giữa chừng (đổi hợp đồng đóng băng, chia sẻ phát hiện, giữ blast radius rời nhau) — thứ chỉ agent team làm được.

| Chiến lược | Số agent | Ghi chú |
|---|---|---|
| Sequential | 6 lượt | An toàn, chậm; P2-P5 độc lập nên lãng phí |
| Parallel subagents | 4 | Fire-and-forget, KHÔNG có kênh giữa các agent: không thể báo/đàm phán đổi hợp đồng P1 hay phát hiện chồng file giữa chừng |
| Workflow | 6 bước | Tất định nhưng không cần |
| **Agent team (khuyến nghị)** | 6 thành viên × 2 vòng = 12 | `TeamCreate` + `TaskCreate/TaskUpdate` (phụ thuộc: T0 `docs` -> T1 `contract` -> T2 `db`, T3 `route`, T4 `form`, T5 `sheet` -> T6 `docs`) + `Agent` với `team_name`/`name` + `SendMessage` (phát FROZEN, yêu cầu đổi hợp đồng, báo xong) + theo dõi bằng `TaskList` |

Giữ <= 6 thành viên (không cần xác nhận thêm); < 30 agent (không chạm cost guard). Vì sao agent team chứ không phải parallel subagents: parallel subagents không có kênh liên lạc nên không thể giữ hợp đồng đóng băng nhất quán hay báo chồng file; agent team có danh sách task chung, quan hệ chặn nhau (P1 chặn P2-P5) và SendMessage.

**Mô hình:** EXECUTE = opus cho 5 thành viên viết mã (`contract`, `db`, `route`, `form`, `sheet`); `docs` (tài liệu + JSON bằng chứng, không viết mã nguồn) và mọi vai trò khác = sonnet; vc-code-reviewer (độc lập) và vc-tester (EVL, chạy lại đúng lệnh cổng) = sonnet, do orchestrator spawn sau khi đội xong (orchestrator là người lái vòng EVL; thành viên không tự lặp). Tuân thủ no-inline-execution: orchestrator không sửa file nguồn hay chạy cổng bằng shell của mình.

## Validate Contract

Status: PASS
Date: 18-11-26
date: 2026-11-18
generated-by: outer-pvl

Parallel strategy: vc-team
Rationale: 3/7 MEDIUM (S2 schema/API, S6 high-risk class, S7 5+ files); dominant need is mid-run coordination (frozen P1 contract broadcast, disjoint file ownership, quiet window for the benchmark) which only an agent team provides; parallel subagents have no inter-agent channel. 6 teammates x 2 rounds = 12 agents (under the 30-agent cost guard). Models: sonnet for `docs` and every reviewer/validator/tester; opus only for the five code-writing teammates (`contract`, `db`, `route`, `form`, `sheet`). VALIDATE itself was run by one validator agent working through the four Layer 1 dimensions and the seven Layer 2 sections (E0, P1-P6) sequentially, because a validate subagent has no spawn tool; no feasibility probe was needed.

Plan updates applied (PVL cycle 2, wording-only alignment; no scope change):
- [x] Red-proof C (G2.5) was missing from five places that still said A/B or G2.1-G2.4 (Risk Predictions devil's-advocate row, P6 step 4 REPORT, AC9 and AC10 trace rows, tier table, Implementation checklist extracted item 3); all now say A/B/C and G2.1-G2.5.
- [x] P6 step 2 said "bốn ghi chú runbook" but the Rollout section carries three bullets; now "ba".
- [x] Header status, Current Execution State and Resume items 3 and 6 updated from "chưa có validate-contract" to the written contract.
- Cycle-1 supplement verified landed and coherent against the current file text: C1 (runner default table privileges to anon/authenticated before 170003 only, Red-proof C, G2.5, helper-EXECUTE note), C2 (quiet window, `_BASELINE_R2` rule, vc-tester EVL run authoritative, always-on old-baseline sha256 `it` outside CHECKOUT_PERF_MODE), C3 (team, then read-only vc-code-reviewer, then non-author transcription into harness/review-decision.json, then vc-tester GJ.8; vocabulary approved | approved-with-concerns | rejected; no APPROVE/REJECT token left; P6 validator run expects exit 1 with only review-decision missing; E0 does JSON.parse only), C4 (two named route.test.ts assertions), C7 (three runbook bullets + P6 step 2 pointer), C5/C6/C8-C12 notes.

Execute-agent instructions:

| # | Instruction | Trigger condition |
|---|---|---|
| E1 | Authority and boundaries: this plan plus SPEC Revision 3 (`ticket-order-survey_SPEC_17-11-26.md`) are the contract; read the SPEC for the verbatim Vietnamese question and option text (keep the space in "Anh/ chị" of Q9). Each teammate edits only the files it owns (Blast Radius table). Never run `git stash`, `git checkout`, `git reset` (one shared working tree). Never touch `.env`, apply a migration to a real database, set production env vars, deploy, enable checkout, call real PayOS or write a real Sheet. Existing migrations, `src/lib/payments/**`, `src/app/api/payments/**`, `src/app/api/internal/sheets-sync/route.ts` and the old checkout-performance baseline JSON are read-only. | Every phase |
| E2 | Parallel window (P2-P5): run only `npx.cmd vitest run <own files>` and scoped `npx.cmd eslint <own files> --max-warnings=0`. No `typecheck`, `build` or full `npm.cmd test` until P6/EVL (they share `.next` and would fail on other teammates' half-written files). Contract changes only through the `contract` teammate via SendMessage; broadcast FROZEN with the sha256 of `survey.ts` after P1 gates are green. | P1 end, P2-P5 |
| E3 | P1 prototype-name ids (C8): look up id to label with `Object.hasOwn` or a `Map`, never `in` or plain indexing; add negative cases for `constructor`, `__proto__`, `toString`, `hasOwnProperty` in Q6, Q8 and Q9. Record the baseline (test counts, lint failing files by path only, typecheck exit, build exit 1 then retry) in the lint-baseline REF before any edit. | P1 |
| E4 | P2 runner mechanics (C1, C9): add the sentinel `do $$ begin raise notice 'SENTINEL <file>'; end $$;` as the last statement of both SQL files; register `admin.on("notice", ...)` before the SQL loop; the tripwire fails on any unexpected or missing file or sentinel. Run `alter default privileges in schema public grant all on tables to anon, authenticated` immediately before applying `202611170003` only (not in the bootstrap, so existing table-privilege assertions are unaffected). Never revoke the helper `ticket_survey_source_valid` from service_role; negative direct-insert cases run as the owner/admin role (an anon insert fails with 42501, not 23514). Run Red-proof A, B and C, record each command and exit code, revert each, confirm `git status` shows only intended changes. | P2 |
| E5 | P3 benchmark and route (C2, C5, C10, C11): update the two named assertions (saved-link `toHaveBeenCalledExactlyOnceWith` near line 111, reconcile-lookup-failure `toHaveBeenCalledOnce` near line 332) to the intended two calls (v5 + upsert) without loosening matchers; the reconciliation-status case near line 283 stays at one call. Fake-timer test: `vi.useFakeTimers({ toFake: ["setTimeout","clearTimeout"] })`, `vi.useRealTimers()` in afterEach, start POST, wait on real `setImmediate` until `vi.getTimerCount() > 0` (the 1500 ms timer only exists after the awaited auth and RPC steps), then `await vi.advanceTimersByTimeAsync(1500)`, then await the response and assert `vi.getTimerCount() === 0`. Capture the new baseline once with the `wx` flag after the P1 freeze and before editing `route.ts`, inside an announced quiet window (other teammates pause vitest and the runner); a re-capture goes to `ticket-order-survey_BASELINE_R2_17-11-26.json` with the reason in the REPORT. Put the old-baseline sha256 check (raw bytes; pin the constant computed from the current file; record the constant and `git ls-files --eol` in the REPORT) in its own always-on `it` outside the `CHECKOUT_PERF_MODE` gate. Do not loosen the 10 ms threshold silently; if timer jitter fails it, record evidence and propose a plan change. The vc-tester candidate run at EVL is authoritative. | P3, EVL |
| E6 | P4 form and dev server (C6, C12): put survey state, validation and focus handling in `TicketSurveyFields.tsx` (named export, client leaf) so the dialog stays near its current size; no question number, asterisk or "Bắt buộc/Tùy chọn" label; validate before `submittingRef`/fetch; sort Q6 into canonical order before building the attendee object. Run `npm.cmd run dev` only on its own free port, never while typecheck or build runs, stop it and confirm nothing listens before P6/EVL; save the four PNGs flat in the task folder. | P4 |
| E7 | P5 worker tests: every `rpc.mockImplementation` override in `outbox-worker.test.ts` (including the failed-completion and stale-lease cases) must answer `get_ticket_order_survey` with `{ data: [], error: null }` unless the case is about survey failure, because the call order becomes claim (1), get survey (2), complete or fail (3); otherwise those cases pass or fail for the wrong reason. In `paid-orders.test.ts` replace the stubbed `A:N` range, the 14-column expectation and the `values[10]` fixtures with A:Q, 17 columns and index 13. | P5 |
| E8 | P6 and closeout: the risk pack follows the plan sequence (team, then read-only vc-code-reviewer, then a non-author agent copies the verdict verbatim into `harness/review-decision.json`, then vc-tester runs GJ.8); the P6 validator run is expected to exit 1 with only `review-decision.json` missing, GJ.8 must exit 0. The REPORT lists Red-proof A/B/C, the quiet-window evidence, build exit 1 then 0, and AC15 as CONDITIONAL. EVL is a spawned vc-tester re-running exactly the gates below; the orchestrator never edits source or runs gates itself. Keep `mustStopBeforeFinalize` and `humanApprovalRequired` true and keep the plan in `active/`. | P6, EVL, closeout |

Test gates (C3 5-column table; the legacy command list below it is the same set):

| criterion id | behavior | strategy | proving test | gap-resolution |
|---|---|---|---|---|
| AC1 | Dialog shows exactly three survey groups with verbatim text and order, no number, asterisk or required badge | Fully-Automated | `npx.cmd vitest run "src/app/(routes)/_components/TicketRequestDialog.test.tsx"` (G4.1) | B |
| AC2 | Any empty group (or no Q6 box) blocks submit with a per-group Vietnamese error and no `fetch` | Fully-Automated | G4.1 same command | B |
| AC3 | Changing an answer rotates the idempotency key; Q6 click order does not change it | Fully-Automated | G4.1 same command | B |
| AC4 | Shared validation accepts the allowlist and rejects every negative class including prototype-name ids | Fully-Automated | `npx.cmd vitest run src/lib/ticket-orders/survey.test.ts src/lib/ticket-orders/validation.test.ts` (G1.1) | B |
| AC5 | Missing or invalid survey returns 400 invalid_request with zero RPC calls | Fully-Automated | `npx.cmd vitest run src/app/api/ticket-orders src/app/api/payments src/app/api/internal` (G3.2) | B |
| AC6 | Save error, hang or throw never blocks the 201 plus link; log is clean; timer cleared | Fully-Automated | G3.2 same command | B |
| AC7 | Save starts in parallel, join is capped at 1500 ms, Server-Timing names fixed; mechanism proven, serverless freeze not proven | Hybrid | G3.2 plus G3.3: PowerShell set `CHECKOUT_PERF_MODE=candidate` and `CHECKOUT_PERF_BASELINE=process/general-plans/active/ticket-order-survey_17-11-26/ticket-order-survey_BASELINE_17-11-26.json`, run `npm.cmd test -- src/app/api/ticket-orders/route.performance.test.ts`, clear both variables; precondition: announced quiet window, new baseline already captured | B (K.1 residual: D) |
| AC8 | Existing payment/outbox functions, migrations and tests unchanged and green | Fully-Automated | GJ.6 `git status --porcelain supabase/migrations` (only the new 170003) and `git diff --exit-code HEAD -- src/lib/payments src/app/api/payments`; plus G2.1, G3.2, G5.1, GJ.1 | B |
| AC9 | Keyed table, RLS and service_role-only grants exist; runner really runs the new SQL; a broken assertion, missing sentinel or removed revoke is detected | Fully-Automated | `node scripts/test-checkout-guard-db.mjs` exit 0 with `migration PASS 202611170003_ticket_order_survey.sql` and both sentinels; Red-proof A, B, C each exit != 0 then reverted | B |
| AC10 | DB allowlist CHECKs, cascade delete and idempotent upsert hold; migration ids match `survey.ts` | Fully-Automated | runner above plus `npx.cmd vitest run src/lib/ticket-orders/survey-migration-drift.test.ts` (G2.2) | B |
| AC11 | Row has exactly 17 columns, A:Q, order id at index 13, update range `A{n}:Q{n}` | Fully-Automated | `npx.cmd vitest run src/lib/ticket-registration src/app/api/internal` (G5.1) | B |
| AC12 | Three no-survey states: (a) and (b) write blank G/H/M and sync; (c) read failure writes nothing and does not complete | Fully-Automated | G5.1 same command | B |
| AC13 | Read failure records the clean code `survey_read_failed` through the existing fail path | Fully-Automated | G5.1 same command | B |
| AC14 | `A:N` is rejected fail-closed; the env example file and README say A:Q | Hybrid | G5.1 plus GJ.7 recorded check: grep for `A:N` and `A:Q` in the env example file and README (A:N absent, A:Q present, README names the race and the requeue function); precondition: P6 docs written | B |
| AC15 | Real 17-column write on a Sheet copy with one full test order | Agent-Probe | GJ.10: owner follows runbook step A2 on the Sheet copy, one test order end to end, `POST /api/internal/sheets-sync` with bearer, check 17 columns, G/H/M, order id in N | C (owner-run after EXECUTE; CONDITIONAL until run; D stub) |
| AC16 | No added serial RPC; survey RPC counted separately; old baseline immutable | Fully-Automated | G3.1 baseline command (once, `CHECKOUT_PERF_MODE=baseline`), G3.3 candidate command above, always-on old-baseline sha256 test, `git diff --exit-code -- process/general-plans/active/ticket-checkout-performance_17-11-26/ticket-checkout-performance_BASELINE_17-11-26.json` | B |
| AC17 | No new lint, typecheck, test, runner or build failure versus the recorded baseline | Fully-Automated | GJ.1 `npm.cmd test`; GJ.2 `npm.cmd run lint` compared with the baseline file list and `npx.cmd eslint <touched files> --max-warnings=0`; GJ.3 `npm.cmd run typecheck`; GJ.4 `node scripts/test-checkout-guard-db.mjs`; GJ.5 `npm.cmd run build` (record exit 1 then retry 0) | B |
| AC18 | Rollout order, risk pack and independent review recorded | Hybrid | GJ.8 `node .claude/skills/vc-risk-evidence-pack/scripts/validate-risk-artifacts.mjs process/general-plans/active/ticket-order-survey_17-11-26/harness/` exit 0 after the verdict is transcribed from the independent vc-code-reviewer; GJ.9 `node .claude/skills/vc-generate-plan/scripts/validate-plan-artifact.mjs <plan>`, `node .claude/skills/vc-context-discovery/scripts/discover-context.mjs --check-routing`, `validate-all-context.mjs`, `validate-context-discovery.mjs`, `validate-protocol-discovery.mjs`; precondition: review-decision.json exists | B |
| AC19 | Upsert rejects a missing order and another user's order with the same SQLSTATE P0002 and message, table unchanged; route passes only the session user and the new order | Fully-Automated | runner (G2.1) plus G3.2 | B |
| AC20 | Requeue function: synced to pending returns true, five negative cases return false; late-survey behavior recorded; README documents detection and compensation | Hybrid | runner (requeue SQL), G5.1, GJ.7, manual check on the Sheet copy; precondition for the manual check: AC15 setup | B (detection job: D) |

Legacy line form (retained so existing consumers still parse):
- survey.ts + validation: [Fully-automated: `npx.cmd vitest run src/lib/ticket-orders/survey.test.ts src/lib/ticket-orders/validation.test.ts`]
- DB migration and grants: [Fully-automated: `node scripts/test-checkout-guard-db.mjs`; `npx.cmd vitest run src/lib/ticket-orders/survey-migration-drift.test.ts`; Red-proof A/B/C] | [agent-probe: reviewer reads grants and locks] | [known-gap: migration not applied to a hosted database (owner)]
- Route and benchmark: [Fully-automated: `npx.cmd vitest run src/app/api/ticket-orders src/app/api/payments src/app/api/internal`; baseline and candidate commands above] | [hybrid: AC7 join] | [known-gap: 1500 ms on hosted infrastructure]
- Form: [Fully-automated: `npx.cmd vitest run "src/app/(routes)/_components/TicketRequestDialog.test.tsx"`] | [agent-probe: `agent-browser` at 360/390/768/1280 px, four PNGs]
- Sheet and worker: [Fully-automated: `npx.cmd vitest run src/lib/ticket-registration src/app/api/internal`] | [hybrid: GJ.7 documented check] | [agent-probe: GJ.10 owner Sheet-copy write] | [known-gap: automatic race detection, scheduler, retry cap]
- Deployment and risk pack: [hybrid: GJ.8 validator + approved runbook checklist] | [known-gap: consent and retention undecided]
- Regression (after all phases, by vc-tester): `npm.cmd test`; `npm.cmd run lint` against baseline; `npm.cmd run typecheck`; `node scripts/test-checkout-guard-db.mjs`; `npm.cmd run build` (exit 1 then 0); GJ.6 diff gate; GJ.9 validators.

Failing stubs (one per Fully-Automated row; red first, keyed by criterion id; not files on disk):

    AC1:  test("should show three survey groups without asterisk or required badge", () => { throw new Error("NOT IMPLEMENTED — TDD stub: AC1") })
    AC2:  test("should block submit and show a per-group Vietnamese error when a survey group is empty", () => { throw new Error("NOT IMPLEMENTED — TDD stub: AC2") })
    AC3:  test("should rotate the idempotency key on a changed answer and keep it for a different Q6 click order", () => { throw new Error("NOT IMPLEMENTED — TDD stub: AC3") })
    AC4:  test("should reject duplicate, empty, unknown and mistyped survey answers", () => { throw new Error("NOT IMPLEMENTED — TDD stub: AC4") })
    AC5:  test("should return 400 invalid_request and make no RPC call when survey is missing or invalid", () => { throw new Error("NOT IMPLEMENTED — TDD stub: AC5") })
    AC6:  test("should still return the payment link when the survey save fails or hangs past the bound", () => { throw new Error("NOT IMPLEMENTED — TDD stub: AC6") })
    AC8:  test("should leave existing migrations and payment code untouched and existing tests green", () => { throw new Error("NOT IMPLEMENTED — TDD stub: AC8") })
    AC9:  test("should fail the runner when a survey assertion, a sentinel or the table revoke is broken", () => { throw new Error("NOT IMPLEMENTED — TDD stub: AC9") })
    AC10: test("should reject out-of-list survey data in the database and cascade on order delete", () => { throw new Error("NOT IMPLEMENTED — TDD stub: AC10") })
    AC11: test("should write exactly 17 columns with the order id at index 13", () => { throw new Error("NOT IMPLEMENTED — TDD stub: AC11") })
    AC12: test("should write empty G/H/M and sync when no survey row exists, and write nothing when the read fails", () => { throw new Error("NOT IMPLEMENTED — TDD stub: AC12") })
    AC13: test("should fail the outbox row with survey_read_failed and not write the sheet when the survey read fails", () => { throw new Error("NOT IMPLEMENTED — TDD stub: AC13") })
    AC16: test("should start the survey save in parallel with PayOS without adding a serial RPC", () => { throw new Error("NOT IMPLEMENTED — TDD stub: AC16") })
    AC17: test("should introduce no new lint, typecheck, test or build failure against the recorded baseline", () => { throw new Error("NOT IMPLEMENTED — TDD stub: AC17") })
    AC19: test("should reject a survey upsert for a missing order and for another user's order with the same error", () => { throw new Error("NOT IMPLEMENTED — TDD stub: AC19") })

Dimension findings:
- Infra fit: PASS — Windows PowerShell commands use `npx.cmd`/`npm.cmd`; runner anchors confirmed (artifact path line 15 used only by `--workload`, hard-coded SQL run line 163, bootstrap grants default table privileges to service_role only, so adding anon/authenticated before 170003 makes the revoke assertion meaningful); one working tree and shared `.next` handled by the parallel-phase rules.
- Test coverage: PASS — AC1-AC20 each map to a gate whose strategy matches SPEC Revision 3; the two named route.test.ts assertions (lines 111 and 332) and the outbox-worker call-order shift are covered; no developed behavior rests on Known-Gap alone (K.1 and K.2 are residuals around behaviors that have Fully-Automated or Hybrid gates, and AC15 is an Agent-Probe awaiting the owner).
- Breaking changes: PASS — `survey` becomes a required key of POST /api/ticket-orders (cached old clients get the generic 400; accepted, deploy happens with checkout off); Sheet layout becomes A:Q with fail-closed `A:N` and an ordered rollout; DB change is additive and forward-only; the ingress probe is unaffected (403 on Origin comes before body validation).
- Security surface: PASS — owner check P0002 with the FK pair, service_role-only grants asserted per exact signature, RLS on, `set role` 42501 checks, log limited to `{reason, code}`, Server-Timing unchanged, allowlist values written with `RAW`; personal data going to the third-party Sheet without consent or retention rules is a named debt, not a concern.
- E0 risk-gate feasibility: PASS — JSON.parse only; validator behavior on partial packs confirmed (exit 1, missing-file failures, adversarial file only a warning).
- P1 contract feasibility: PASS — contract table is complete and self-consistent; prototype-name ids covered by instruction E3.
- P2 DB feasibility: PASS — runner insertion points exist, the sentinel can be appended to `checkout-access-guard.sql` (it ends with `$$;`), `unique (id, user_id)` exists on orders (migration 202611130001 line 59), CHECK helper verified on embedded PostgreSQL 18.6.
- P3 route feasibility: PASS — branch classification matches route.ts lines 214-256, the 9-key v5 call is unchanged, both named test assertions exist at the cited lines, the benchmark gating structure supports a separate always-on hash `it`.
- P4 form feasibility: PASS — the `attendee` object and `payloadFingerprint` are where the plan says; the dialog is 261 lines so the extraction into `TicketSurveyFields.tsx` is justified.
- P5 sheet/worker feasibility: PASS — the 14-column layout maps cleanly to 17 (G source, H area, M attendance, N order id at index 13); worker call order and test shifts are covered by E7.
- P6 docs/evidence feasibility: PASS — the env example file (line 26) and README (line 112) hold the `A:N` strings to change; the PayOS webhook calls `drainPaidTicketSheetOutbox` at `webhook/route.ts` line 75 as the runbook bullet says; validator vocabulary and fields match the plan; vc-code-reviewer has no Write/Edit tool, so the non-author transcription step is required and correct.
- Ownership and parallel rules: PASS — the Blast Radius file sets are disjoint; the rules (no typecheck/build/full test, no git stash/checkout/reset, quiet window, dev server on its own port) are consistent across the parallel-rules paragraph, P3 and P4.

Open gaps:
- K.1: hosted latency and the 1500 ms bound, real PayOS, migration applied to a real database, production Sheet write, automatic detection of the late-survey race — known-gap: documented, backlog stub in `process/general-plans/backlog/ticket-order-survey-followups_17-11-26/ticket-order-survey-followups_NOTE_17-11-26.md` (written in P6).
- K.2: PostgREST passing a JS array to a `text[]` RPC argument is confirmed only by documentation; route tests mock the RPC — known-gap with a backlog stub in the same NOTE. The owner's AC15 run exercises it for real.
- AC15 real 17-column write: CONDITIONAL until the owner runs GJ.10 on a Sheet copy (Agent-Probe, owner-run).
- AC20 late-survey race: accepted known-gap with the requeue function as the manual compensation; the detection job is a stub.
- Pre-existing, unchanged: no scheduler calls `/api/internal/sheets-sync`; no outbox retry cap or alert; no SQL test for the 202611170002 trigger; Next.js 16.4.3 advisory (first build exits 1, retry 0).
- Open decisions for the owner (not tests): consent and retention for survey data sent to the Sheet, an "Other" option, backfill of old orders.

What This Coverage Does NOT Prove:
- G1.1 (survey and validation tests) does not prove the server receives what the browser builds; the form and route are joined only by shared code.
- G2.1/G2.2 (isolated PostgreSQL) do not prove the migration is applied on the hosted database, hosted role defaults, or that PostgREST turns a JS array into `text[]` (K.2).
- G3.2/G3.3 (mocked RPC and PayOS, loopback timers) do not prove hosted latency, the 1500 ms bound under real load, live PayOS behavior, or that a serverless runtime would not freeze work after the response (K.1).
- G4.1/G4.2 do not prove behavior in real mobile browsers beyond the four checked widths, or screen-reader output.
- G5.1 (mocked Google client) does not prove a real Sheet write, real column alignment on the production tab, or that old 14-column production rows are reconciled.
- GJ.7 (documented check) does not prove the documents are understandable or followed.
- GJ.8 (validator plus review) proves the pack is complete and a reviewer decided; it does not prove production readiness; the approval covers local and isolated-PostgreSQL behavior only.
- GJ.10 (owner run) is a single manual observation, not repeatable evidence.

Gate: PASS (0 FAIL, 0 unresolved CONCERN; cycle-1 CONCERNs C1-C12 verified landed; two wording-only misalignments fixed in cycle 2; named residual known gaps listed above)
Accepted by: session — no concern needs acceptance for a PASS gate; residual known gaps K.1, K.2, AC15 (CONDITIONAL until owner test), the AC20 race, the pre-existing scheduler/retry-cap gaps and the consent/retention debt are named residuals carried for the owner's awareness at EXECUTE entry.

## Autonomous Goal Block

    SESSION GOAL: Add the 3 mandatory survey questions to the ticket order flow (form, route, new table via migration 202611170003, Sheet A:Q) with verified local gates; the owner applies migration, env and deploy.
    Charter + umbrella plan: N/A — single plan (process/general-plans/active/ticket-order-survey_17-11-26/ticket-order-survey_PLAN_17-11-26.md; SPEC Revision 3 in the same folder)
    Autonomy: removes approval pauses only; subagent delegation stays mandatory (agent team, opus for code teammates, sonnet otherwise); the orchestrator never edits source or runs gates itself.
    Hard stop conditions / safety constraints:
    - Never apply a migration to a real database, set production env vars, deploy, enable checkout, call real PayOS, write a real Sheet, or touch .env.
    - Never edit existing migrations, src/lib/payments/**, src/app/api/payments/**, the sheets-sync route, or the old checkout-performance baseline JSON.
    - No git stash/checkout/reset; no typecheck/build/full test while P2-P5 run in parallel.
    - Do not loosen the 10 ms benchmark threshold or skip Red-proof A/B/C; record failures instead.
    - mustStopBeforeFinalize and humanApprovalRequired stay true; the owner decides commit, migration, deploy.
    Next phase: EXECUTE: process/general-plans/active/ticket-order-survey_17-11-26/ticket-order-survey_PLAN_17-11-26.md (E0, then P1, freeze, P2-P5 in parallel, then P6)
    Validate contract: inline in the plan (## Validate Contract, Gate: PASS, 2026-11-18)
    Execute start: E0 harness/risk-gate.json (JSON.parse only) | P1 `npx.cmd vitest run src/lib/ticket-orders/survey.test.ts src/lib/ticket-orders/validation.test.ts` | DB `node scripts/test-checkout-guard-db.mjs` | route `npx.cmd vitest run src/app/api/ticket-orders src/app/api/payments src/app/api/internal` | form `npx.cmd vitest run "src/app/(routes)/_components/TicketRequestDialog.test.tsx"` | sheet `npx.cmd vitest run src/lib/ticket-registration src/app/api/internal` | probe: agent-browser at 360/390/768/1280 | high-risk pack: yes

## Current Execution State

- **Last updated:** 2026-11-18 (UPDATE PROCESS).
- **Loop step:** UPDATE PROCESS xong. Plan giữ ở `active/` (Keep in active/testing), chờ các việc của chủ dự án.
- **Validate-contract status:** written (2026-11-18), Gate: PASS, generated-by: outer-pvl.
- **Last completed:** EXECUTE (E0, P1-P6) chạy TUẦN TỰ bằng agent được spawn (TeamCreate/TaskCreate không có trong môi trường; ghi ở REPORT mục Plan Deviations); EVL vòng 1 và vòng 2 do vc-tester độc lập: mọi cổng chạy được đều xanh, không regression, GJ.8 exit 0 với 5 file harness; đánh giá độc lập vc-code-reviewer `approved-with-concerns` (không Blocker/High), `review-decision.json` do agent không phải tác giả ghi; fix cycle xong (M3, L6 mã; M1, M2, M4, M5, L1-L3 tài liệu). Bằng chứng: `ticket-order-survey_REPORT_18-11-26.md`, `ticket-order-survey-evl-iteration-002_REPORT_18-11-26.md`, `harness/verification.json`.
- **Chưa xong / không chứng minh được:** GJ.10 (chủ dự án thử trên bản sao Sheet, AC15 CONDITIONAL), G3.1 chụp lại baseline và G4.2 chạy lại 4 độ rộng chưa re-run, migration `202611170003` chưa áp dụng cho DB thật, ghi Sheet thật, PostgREST với tham số mảng (K.2), độ trễ hosted của join 1500 ms (K.1), PayOS thật, race AC20, đơn đã thanh toán không có hàng khảo sát (không thể khôi phục), scheduler/retry cap, consent/retention.
- **Trạng thái production (chủ dự án kiểm 2026-11-18):** migration `202611170001` đã áp dụng; `202611170003` chưa; production vẫn chạy app 14 cột trong khi Sheet thật đã 17 cột (A:Q); checkout TẮT. Chưa commit, chưa áp dụng migration, chưa đổi `.env`.
- **Next phase:** việc của chủ dự án theo thứ tự ở REPORT (mục Owner action list), rồi quyết định commit và lưu trữ plan (`git mv` cả thư mục sang `completed/` chỉ sau khi GJ.10 và rollout xong). Không di chuyển hay xóa thư mục task `ticket-checkout-performance_17-11-26` (test khảo sát đọc baseline bất biến của nó).

## Resume and Execution Handoff

1. **Selected plan:** `process/general-plans/active/ticket-order-survey_17-11-26/ticket-order-survey_PLAN_17-11-26.md`.
2. **Last completed phase:** UPDATE PROCESS (18-11-26) sau EXECUTE (E0, P1-P6) + EVL vòng 1-2 + review + fix cycle. Còn lại: việc của chủ dự án (xem REPORT, Owner action list). Mục 3-7 bên dưới là ghi chú lịch sử tại thời điểm PLAN/VALIDATE; trạng thái hiện tại nằm ở `## Current Execution State`.
3. **Validate-contract status:** written 2026-11-18, Gate: PASS (generated-by: outer-pvl); các known gap K.1, K.2, AC15, AC20 là residual có tên.
4. **Context loaded:** `process/context/all-context.md`, `tests/all-tests.md` (không có test router sâu hơn), `uxui/all-uxui.md` + `component-contracts.md`, `plan-lifecycle.md`, `implementation-standards.md`; SPEC Revision 3; plan/harness mẫu `ticket-checkout-performance_17-11-26`; mã nguồn thực: route, validation, paid-orders, outbox-worker, TicketRequestDialog, runner PostgreSQL, benchmark, migration 202611140007/170002.
5. **Nguồn thẩm quyền khi thực thi:** mã nguồn hiện tại, migration, file test, lệnh thật; `all-context.md`/`all-tests.md` có thể lệch — ghi lại thay vì tin tuyệt đối.
6. **Next step:** orchestrator phát /goal block rồi chờ "ENTER EXECUTE MODE"; EXECUTE bắt đầu bằng E0 (`harness/risk-gate.json`), rồi P1 (baseline + hợp đồng), freeze, rồi P2-P5 song song, rồi P6; EVL do vc-tester độc lập; đánh giá do vc-code-reviewer độc lập. Không áp dụng migration, không đặt env, không deploy, không bật checkout, không gọi PayOS/Sheets thật.
7. **UPDATE PROCESS follow-up:** cập nhật context docs từ bằng chứng nguồn (P6 đã làm phần chính; UPDATE PROCESS đối chiếu lại), ghi backlog NOTE, chạy `vc-audit-context`/`vc-audit-plans` theo loại thay đổi, giữ plan ở `active/` đến khi AC15 + quyết định của chủ dự án xong; kiểm validator: `node .claude/skills/vc-generate-plan/scripts/validate-plan-artifact.mjs <plan>` và, nếu đụng bề mặt agent, `node .claude/skills/vc-audit-vc/scripts/validate-agent-parity.mjs --strict`.

## Strategy Compare — PLAN to VALIDATE

Tín hiệu cho VALIDATE: S2 1, S6 1, S7 1 = 3/7 (MEDIUM). Công việc VALIDATE = 4 chiều Layer 1 + 6 mục khả thi theo phase = 10 lượt đọc độc lập, không cần trao đổi giữa chừng.

| Chiến lược | Số agent | Phù hợp |
|---|---|---|
| Sequential | 1 validator | Chậm, vẫn hợp lệ |
| **Parallel subagents (khuyến nghị)** | 10 (sonnet, chỉ đọc) | Fan-out `vc-validate-findings` Layer 1 + Layer 2; không cần cross-talk |
| Workflow | 10 bước | Không cần |
| Agent team | 3-4 | Không cần phối hợp giữa chừng |

Mô hình: tất cả sonnet. Chưa dự kiến `VC-FEASIBILITY-PROBE-NEEDED` (các giả định API ở mục Validate Contract là xác nhận cheap-local/docs, không cần probe billed).

## Implementation checklist extracted

1. E0: `harness/risk-gate.json` (`docs`); không tạo 4 file còn lại.
2. P1: baseline lint/test/typecheck/build vào REF; `survey.ts` + `survey.test.ts`; `validation.ts` + `validation.test.ts`; chạy G1.1; phát FROZEN (sha256 `survey.ts`).
3. P2: migration `202611170003_ticket_order_survey.sql`; `supabase/tests/ticket-order-survey.sql`; sentinel trong `checkout-access-guard.sql`; runner (vòng lặp mọi SQL + tripwire + sentinel + env override artifacts); assert quyền JS; `survey-migration-drift.test.ts`; red-proof A, B và C; G2.x.
4. P3: sửa `route.performance.test.ts` (fixture mới, 30 ms PayOS, đếm theo tên, hash baseline cũ); chụp baseline mới (`wx`); sửa `route.ts` (nhánh, lưu song song, join 1500 ms, log sạch); cập nhật `route.test.ts` ca (a)-(k); chạy candidate; G3.x.
5. P4: `TicketSurveyFields.tsx`; sửa `TicketRequestDialog.tsx` (state, validate trước fetch, survey vào attendee, reset); CSS `.ticket-request-dialog__survey*`; cập nhật test dialog; agent-browser 4 độ rộng; G4.x.
6. P5: `paid-orders.ts` (A:Q, 17 cột, chỉ số 13, survey tham số riêng); `outbox-worker.ts` (đọc khảo sát, `survey_read_failed`, 1 nhánh `errorCode`); cập nhật 2 file test; G5.1.
7. P6: `.env.example`, README, runbook REF, context docs, REPORT, 4 file harness còn lại + review độc lập, backlog NOTE; GJ.1-GJ.9 bởi vc-tester; GJ.10 do chủ dự án.
8. Handoff: báo cáo cho orchestrator; chờ chủ dự án quyết commit/migration/deploy/bật checkout.

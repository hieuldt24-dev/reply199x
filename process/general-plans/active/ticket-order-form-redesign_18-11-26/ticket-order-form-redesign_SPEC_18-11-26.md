---
name: spec:ticket-order-form-redesign
description: "Yêu cầu đổi giao diện form đặt phiếu nước (TicketRequestDialog) sang thiết kế 3 bước, giữ nguyên luồng PayOS và hợp đồng khảo sát"
date: 18-11-26
---

# SPEC — Đổi giao diện form đặt phiếu nước (3 bước)

**BLUF:** Chỉ đổi phần trình bày của hộp thoại đặt phiếu nước sang 3 bước (Phiếu nước & thông tin → Khảo sát nhanh → Xác nhận). Body gửi lên `/api/ticket-orders`, khảo sát, idempotency và luồng PayOS giữ nguyên. Không sửa server, DB, `survey.ts`.

## Mục tiêu
- Giao diện retro theo brief: modal kem, panel "cuống phiếu" xanh đậm bên phải (desktop), toàn màn hình + thanh dính đáy (mobile ≤760px).
- Tạm tính cập nhật trực tiếp ở cuống phiếu và thanh dính đáy.
- Kiểm tra theo từng bước trước khi qua bước kế; không bao giờ gửi request không hợp lệ.
- Từ "vé" trong brief hiển thị thành "phiếu nước" (vd. "Một phiếu nước về thanh xuân.", "Số phiếu nước", "Tiếp tục đặt phiếu nước →").

## Quyết định mặc định (user có thể đổi)
| # | Quyết định | Bằng chứng | Trạng thái |
|---|---|---|---|
| D1 | Số lượng tối đa = `TICKET_ORDER_LIMIT` = **4**, không phải 10 | `validation.ts:4`; DB: `check (quantity between 1 and 4)` (`202611130001:51`) và RPC `p_quantity > 4` (`…0003:54`, `…0005:115`) | default — user may override (đổi lên 10 cần migration mới + API) |
| D2 | Merch dùng `MERCH_OPTIONS` thật: Không kèm merch 0đ; Combo "Tuổi Xì Tin" 99.000đ; Combo "Tuổi Xì Lây" 169.000đ | `validation.ts:6-10` | default — user may override |
| D3 | Nhãn khảo sát giữ nguyên từ `survey.ts` (đóng băng); chỉ đổi trình bày: Q6 chip có checkbox thật, Q8 select, Q9 segmented 2 lựa chọn (radio thật). Không `*`, không "Bắt buộc" | `survey.ts` sha256 `1da21f7d…2bc` | default — user may override |
| D4 | Bước 3 giữ luồng thật: POST → chuyển sang PayOS; không hiện màn "cảm ơn" trước thanh toán | `TicketRequestDialog.tsx` `navigateToCheckout` | default; câu "Hẹn gặp bạn ở một thời thương nhớ." cho trang return = **câu hỏi mở** |
| D5 | Bảng màu brief làm token CSS scoped trong modal. Font: Lobster đã tự host (`public/fonts/Lobster-Regular.ttf`, family "Reply Lobster"); Be Vietnam Pro đã nạp qua `@import` Google Fonts trong `globals.css:1`; **Playfair Display chưa có**. Đề xuất: thêm Playfair Display italic 700 qua `next/font/google` (tự host lúc build) gắn biến CSS ở `layout.tsx`; không chuyển Be Vietnam Pro/@import hiện có (ngoài phạm vi, tránh đụng toàn site) | `layout.tsx`, `globals.css:1-16` | default — user may override |
| D6 | `*` ở Họ và tên, Email; SĐT, năm sinh, giới tính tùy chọn; nhóm khảo sát không `*` | brief | default |

## Xung đột mới phát hiện (brief vs code)
1. **Giới tính:** brief 4 lựa chọn (Không nêu/Nam/Nữ/Khác); code có 5 giá trị `""`, female, male, other, undisclosed. Giữ đủ 5 giá trị server chấp nhận; nhãn "Không nêu" = `""`, thêm "Không muốn tiết lộ" = undisclosed.
2. **Form nhiều bước + FormData:** handler đọc `new FormData(form)`. Nếu bước 1 bị unmount ở bước 2/3 thì mất dữ liệu → mọi bước phải luôn được render (ẩn bằng `hidden`), hoặc chuyển sang state có kiểm soát. Input `required` bị ẩn làm trình duyệt chặn submit ("not focusable") → cần `noValidate` + kiểm tra phía client tự viết.
3. **Kiểm tra email phía client:** hiện dựa vào `type="email" required` gốc của trình duyệt. Thiết kế mới cần lỗi inline tiếng Việt → cần regex client; không được import khác `emailPattern` của server nếu nó không export (kiểm tra lúc EXECUTE; không sửa `validation.ts`).
4. **Poster:** dialog hiện dùng ảnh thật `RemoteImage` (`/images/…jpg`). Brief nói "không ảnh ngoài, dùng placeholder có nhãn". Đề xuất giữ `RemoteImage` + fallback có nhãn (đã có) — vì ảnh là local, không phải ngoài. Cần user xác nhận.
5. **Đóng/mở hiện có:** `<dialog>.showModal()` (khóa nền, Escape, focus trap gốc của trình duyệt), click backdrop đóng, reset khi đóng sau success. Brief yêu cầu "scroll to top" khi đổi bước → cuộn vùng nội dung dialog, không phải window. Không có body scroll lock riêng; giữ nguyên.
6. **Ngày/giờ:** brief "15:00 – 19:00"; dialog hiện ghi "15:00 · 19:00". Dùng "15:00 – 19:00" khớp `home.ts:107`.

## Use case chính
- Desktop: điền bước 1 → Tiếp tục (lỗi inline nếu thiếu tên/email sai) → khảo sát → xác nhận → "Tiếp tục đặt phiếu nước →" → PayOS.
- Mobile: header 1 dòng + thanh tiến độ 3 đoạn; thanh tóm tắt xanh đầu bước 1; năm sinh/giới tính thu gọn; thanh dính đáy có tạm tính + CTA.
- Lỗi server (401/429/đối soát/không thanh toán được) hiển thị ở bước 3 như hiện nay, giữ dữ liệu, giữ idempotency key.

## Ngoài phạm vi
`validation.ts`, `survey.ts`, `route.ts`, migrations, `supabase/`, `scripts/`, payments, Sheets; nâng số lượng lên 10; màn cảm ơn trước thanh toán; chuyển font toàn site sang next/font; trang `/payment/return`.

## Ràng buộc
- Phải commit thay đổi survey + đổi chữ "vé" (đang chưa commit) **trước** khi EXECUTE — trùng file: `TicketRequestDialog.tsx`, `TicketSurveyFields.tsx`, `TicketRequestDialog.test.tsx`, `globals.css`.
- Kiểm tra trực quan bằng agent-browser trên cổng phụ; ảnh chụp cũ của task survey đã lỗi thời.

TL;DR: đổi trình bày sang 3 bước, mọi hợp đồng dữ liệu và luồng thanh toán giữ nguyên; giới hạn 4 phiếu, merch thật, nhãn khảo sát gốc.

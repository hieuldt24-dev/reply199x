---
name: spec:ticket-order-survey
description: "Thêm 3 câu khảo sát bắt buộc vào form đặt vé, lưu vào bảng DB mới và ghi ra Google Sheet cho đơn đã thanh toán."
date: 17-11-26
revision: 3 (17-11-26, sau INNOVATE: AC18 và AC20 sửa theo A1/A2)
status: draft-for-user-review
complexity: complex
metadata:
  node_type: memory
  type: spec
---

# Khảo sát khi đặt vé (3 câu hỏi bắt buộc) — Revision 2

**BLUF:** Form đặt vé sẽ có thêm 3 câu hỏi khảo sát bắt buộc (nguồn biết sự kiện, khu vực sống, mức chắc chắn tham gia). Câu trả lời được lưu trong một bảng DB mới, và khi đơn được thanh toán thì được ghi vào 3 cột tương ứng của Google Sheet (bố cục mới A:Q). Không đụng vào logic thanh toán PayOS, hàm tạo đơn hiện có hay hàm outbox hiện có. Revision 2 siết lại 9 điểm sau đánh giá độc lập (xem mục "Revision 2").

**TL;DR:** 3 câu hỏi bắt buộc, kiểm tra cả client lẫn server. Bảng mới `ticket_order_survey` (chỉ service_role). Worker đồng bộ Sheet đọc khảo sát qua RPC mới và ghi vào cột G, H, M. Lưu khảo sát chờ có giới hạn thời gian, không bao giờ chặn checkout quá mức giới hạn. Runner DB hiện chỉ chạy 1 file SQL cố định, nên phải được mở rộng để chạy kiểm tra khảo sát. Checkout đang TẮT cho đến khi test xong.

## Revision 2 — changes from independent audit

Đánh giá độc lập: CONDITIONAL. Mỗi phát hiện đã đối chiếu với repo trước khi sửa; tất cả đều đúng.

| # | Mức | Thay đổi |
|---|---|---|
| 1 | HIGH | `scripts/test-checkout-guard-db.mjs` (dòng 163) chỉ chạy cứng `supabase/tests/checkout-access-guard.sql`, và ghi artifact vào thư mục task cũ `checkout-access-guard_14-11-26` (dòng 15, 455). Thêm script và `supabase/tests` vào blast radius; thêm yêu cầu runner PHẢI chạy kiểm tra khảo sát mới (AC9/AC10, AC17); ghi rủi ro đường dẫn cứng nếu thư mục cũ bị lưu trữ. |
| 2 | MEDIUM | AC6 ("không bao giờ chặn") mâu thuẫn AC7 ("phải chờ hoàn tất"): hòa giải thành "chờ có giới hạn" (yêu cầu có timeout; giá trị và cơ chế để INNOVATE/PLAN). |
| 3 | MEDIUM | Sơ đồ luồng và Background đã thống nhất: lưu khảo sát chạy song song với bước PayOS, sau khi đã có hàng đơn hợp lệ. |
| 4 | MEDIUM | Thêm yêu cầu quyền sở hữu: upsert khảo sát không thể gắn dữ liệu vào đơn không tồn tại hoặc không thuộc người gọi (AC19 mới). |
| 5 | MEDIUM | Race khảo sát đến muộn: ghi thành known-gap tường minh kèm cách phát hiện và cách bù thủ công (AC20 mới), theo trả lời 3. |
| 6 | MEDIUM | Thêm ghi chú forward-fix cho migration (Constraints, AC18). |
| 7 | MEDIUM | `PAYOS_CHECKOUT_ENABLED` chặn route: viết lại bước thử tay trong AC18 theo trả lời 2. |
| 8 | MEDIUM | Server-Timing: yêu cầu chỉ dùng tên giai đoạn cố định; mặc định KHÔNG thêm tên mới cho khảo sát (có thể đổi). |
| 9 | LOW | AC4 thêm ca âm; AC12 tách 3 trạng thái "không có khảo sát"; AC13 yêu cầu mã lỗi sạch mới; AC14 nêu rõ không có test tự động đọc `.env.example`/README; AC16 định nghĩa chính xác "không tăng số RPC"; AC17 nêu baseline lint; mặc định 6 và AC10 viết theo hành vi. |
| 10 | LOW | Câu hỏi mở cập nhật (trả lời 1-3 đã chốt); danh sách duyệt cập nhật. |

Trả lời người dùng ("tiến hành" = nhận mặc định): (1) giữ nguyên chữ nguồn cho Q6/Q9, kể cả khoảng trắng trong "Anh/ chị" ở Q9; (2) thử tay dùng preview Vercel hoặc cửa sổ ngắn có thông báo, luôn trỏ vào bản sao Sheet, không bao giờ thử trên Sheet thật; (3) chấp nhận race khảo sát đến muộn như known-gap.

## Revision 3 — changes after INNOVATE (user-approved A1, A2)

| # | Thay đổi |
|---|---|
| A1 | `enqueue_paid_ticket_sheet_sync` (202611170002 dòng 31-38) không bao giờ reset hàng `synced`, nên AC20 cũ (bù bằng enqueue) không thực hiện được. Thêm hàm service_role-only `requeue_synced_sheet_sync_for_survey(order_id)` trong `202611170003`; AC20 và AC18 viết lại. Không sửa hàm outbox hiện có. |
| A3 (PVL vòng 1) | AC7: chỉ chứng minh cơ chế tự động; serverless đóng băng thật là residual K.1. |
| A2 | Không dùng preview Vercel (chung Supabase production, webhook PayOS production sẽ ghi vào Sheet thật). Thử tay = cửa sổ ngắn trên production, checkout BẬT, spreadsheet trỏ bản sao; sau đó khôi phục và deploy lại khi checkout TẮT. AC18 và mục "Đã chốt" số 2 viết lại. |

## Summary

Ban tổ chức muốn biết khán giả biết đến sự kiện qua kênh nào, sống ở khu vực nào của Đà Nẵng/Quảng Nam, và có chắc chắn đến hay không. Ba câu hỏi này được đặt ngay trong form đặt vé, bắt buộc trả lời. Câu trả lời đi theo đơn hàng: lưu vào DB, rồi xuất hiện trong Google Sheet khi đơn đã thanh toán, để ban tổ chức phân tích mà không cần hỏi lại. Việc này không được làm chậm quá một giới hạn đã định hay làm hỏng luồng thanh toán.

## User Stories / Jobs To Be Done

- Là khán giả đặt vé, tôi muốn trả lời nhanh 3 câu hỏi ngay trong form đặt vé, để không phải điền một biểu mẫu khác.
- Là khán giả, tôi muốn được báo rõ bằng tiếng Việt khi quên trả lời câu nào, để sửa được ngay.
- Là ban tổ chức, tôi muốn mỗi đơn đã thanh toán có đủ nguồn biết sự kiện, khu vực và mức chắc chắn tham gia trong Google Sheet, để thống kê truyền thông và dự báo lượng khách.
- Là ban tổ chức, tôi muốn các đơn cũ (đã thanh toán trước khi có khảo sát) vẫn hiện đúng, với ô khảo sát để trống, không lệch cột.
- Là người vận hành, tôi muốn lỗi lưu khảo sát không chặn khách thanh toán quá giới hạn chờ, và lỗi đọc khảo sát không làm mất dữ liệu trên Sheet.
- Là người vận hành, tôi muốn phân biệt được đơn "không có khảo sát" thật với đơn "đọc khảo sát bị lỗi", để không ghi nhầm ô trống rồi đánh dấu xong.
- Là người bảo trì, tôi muốn thay đổi này không sửa các hàm thanh toán và outbox đã chạy ổn định.
- Là người bảo trì, tôi muốn không ai gắn được khảo sát vào đơn của người khác.

## What The User Wants (Behavioral Outcomes)

- Form đặt vé hiển thị 3 câu hỏi, không có số thứ tự câu, không có dấu sao và không có nhãn "Bắt buộc"; tuy vậy cả 3 đều bắt buộc.
- Q6 chọn nhiều (ít nhất 1), Q8 chọn một, Q9 chọn một. Danh sách lựa chọn và chữ hiển thị đúng nguồn (giữ nguyên, kể cả khoảng trắng trong "Anh/ chị" ở Q9) theo bảng bên dưới.
- Gửi form thiếu câu nào thì báo lỗi tiếng Việt ngay tại câu đó và không gửi đơn.
- Server cũng từ chối đơn thiếu hoặc sai khảo sát (trả `400 invalid_request` chung), kể cả khi bỏ qua giao diện.
- Khảo sát được lưu song song với bước PayOS, sau khi đã có hàng đơn hợp lệ. Việc chờ lưu có giới hạn thời gian: checkout không bao giờ bị chặn quá giới hạn đó. Lưu lỗi hoặc quá giới hạn thì ghi log (không kèm câu trả lời hay mã định danh) và khách vẫn sang trang thanh toán.
- Khảo sát chỉ gắn được vào đơn có thật và thuộc về người đang đặt; không thể ghi vào đơn của người khác hoặc đơn không tồn tại.
- Khi đơn được thanh toán và đồng bộ, Sheet có hàng 17 cột (A:Q) theo bố cục dưới đây. Đơn cũ không có khảo sát, hoặc đơn mà khảo sát chưa từng được lưu, thì ô G, H, M để trống.
- Nếu đọc khảo sát lỗi khi đồng bộ, hàng đó được thử lại sau, không ghi hàng thiếu dữ liệu rồi đánh dấu đã đồng bộ.

### Bảng yêu cầu theo từng trường

| Trường | Câu hỏi (hiển thị đúng chữ) | Kiểu | Bắt buộc | Lựa chọn (thứ tự chuẩn) | Cột Sheet |
|---|---|---|---|---|---|
| Q6 | Anh/chị biết đến thông tin Sự kiện "KHÔNG GIAN ÂM NHẠC HOÀI NIỆM REPLY199X" này qua đâu? (Có thể chọn nhiều đáp án) | Chọn nhiều, tối thiểu 1 | Có (client + server), không hiện dấu sao/badge | 1. Facebook; 2. Zalo; 3. TikTok; 4. Người thân / Bạn bè / người quen giới thiệu; 5. Poster / Standee thông tin; 6. Tại Pop-up REPLY 199X; 7. Tại On The Radio Bar; 8. Tại website của REPLY 199X | G (nối bằng ";") |
| Q8 | Anh/chị hiện đang sống ở khu vực nào? (theo tên quận/huyện cũ) | Chọn một | Có | Hải Châu; Thanh Khê; Sơn Trà; Ngũ Hành Sơn; Liên Chiểu; Cẩm Lệ; Hòa Vang; Khu vực Quảng Nam cũ (Hội An, Điện Bàn, Tam Kỳ...) | H |
| Q9 | Anh/ chị có chắc chắn mình sẽ có mặt tại sự kiện này không ạ? (giữ nguyên khoảng trắng sau "Anh/" như nguồn) | Chọn một | Có | "Có, tôi chắc chắn mình sẽ tham gia"; "Tôi chưa chắc chắn mình sẽ tham gia" | M |

Số thứ tự câu (Q6/Q8/Q9) không hiện trên giao diện. Câu Q7 của biểu mẫu gốc được coi là cố ý bỏ.

## Bố cục Google Sheet (đã được người dùng chèn cột trên Sheet thật)

| Cột | Nội dung | Ghi chú |
|---|---|---|
| A | Thời gian | như cũ |
| B | Họ tên | như cũ |
| C | Email | như cũ |
| D | Điện thoại | như cũ |
| E | Giới tính | như cũ |
| F | Năm sinh | như cũ |
| G | Nguồn biết sự kiện (Q6) | MỚI, các lựa chọn nối bằng ";" theo thứ tự chuẩn |
| H | Khu vực (Q8) | MỚI |
| I | Số vé | dịch chỗ |
| J | Merch | dịch chỗ |
| K | Tổng tiền (VND) | dịch chỗ |
| L | Trạng thái thanh toán | dịch chỗ |
| M | Chắc chắn tham gia (Q9) | MỚI |
| N | Mã đơn hàng | dịch chỗ; chỉ số tra cứu chuyển từ 10 sang 13 |
| O | Mã giao dịch PayOS | dịch chỗ |
| P | Thời gian thanh toán | dịch chỗ |
| Q | PaymentLink ID | dịch chỗ |

Phạm vi mặc định đổi từ `A:N` sang `A:Q`; ghi cập nhật hàng theo `A{n}:Q{n}`.

## Flow / State Diagram

```text
[Khách mở form đặt vé]
        |
        v
[Điền thông tin + trả lời Q6, Q8, Q9]
        |
   {Đủ 3 câu hợp lệ?}--không--> [Báo lỗi tiếng Việt tại câu thiếu, không gửi]
        | có
        v
[POST /api/ticket-orders]
        |
   {Server kiểm tra lại}--sai--> [400 invalid_request chung]
        | đúng
        v
[Tạo đơn + checkout lease (logic hiện có, không đổi)]
        |
   (đã có hàng đơn hợp lệ)
        |
        +----------------------------------+
        |                                  |
        v                                  v
[Bước PayOS -> link thanh toán]   [Lưu khảo sát (song song với PayOS)]
        |                          |-- chỉ ghi được cho đơn có thật và đúng chủ
        |                          |-- chờ CÓ GIỚI HẠN thời gian
        |                          |-- lỗi/quá giới hạn: log không kèm dữ liệu,
        |                          |   KHÔNG chặn checkout quá giới hạn
        v                                  |
[Trả link thanh toán cho khách] <----------+
        |
        v
[Khách thanh toán]
        |
        v
[Webhook PayOS xác nhận paid -> outbox (như cũ)]
        |
        v
[Worker: lấy đơn + đọc khảo sát qua RPC mới]
        |
        +--(c) đọc khảo sát LỖI--> [Hàng thất bại, mã lỗi sạch mới, thử lại sau;
        |                           KHÔNG ghi ô trống rồi đánh dấu synced]
        |
        +--(a) đơn cũ không có hàng khảo sát --+
        +--(b) khảo sát chưa từng lưu/lưu lỗi --+--> [G,H,M = rỗng, vẫn ghi và synced]
        |
        +--có khảo sát--> [Ghi hàng A:Q đầy đủ lên Sheet]
```

## Acceptance Criteria (Testable Outcomes)

**Form**

- **AC1:** Form hiển thị đúng 3 câu hỏi với đúng chữ nguồn (kể cả khoảng trắng trong "Anh/ chị" ở Q9) và đúng thứ tự lựa chọn như bảng yêu cầu, không có số thứ tự câu, không dấu sao, không nhãn "Bắt buộc".
  - `proven by:` TicketRequestDialog render test (nhãn, thứ tự, vắng dấu sao/badge)
  - `strategy: Fully-Automated`
- **AC2:** Bỏ trống bất kỳ câu nào (hoặc không chọn ô nào ở Q6) thì form không gửi đơn và hiện thông báo tiếng Việt riêng cho câu đó.
  - `proven by:` TicketRequestDialog interaction test cho từng câu thiếu
  - `strategy: Fully-Automated`
- **AC3:** Đổi câu trả lời khảo sát thì khóa chống trùng (idempotency) của lần gửi được làm mới đúng như khi đổi thông tin người tham dự; chọn cùng một tập đáp án Q6 theo thứ tự click khác nhau cho cùng một khóa.
  - `proven by:` TicketRequestDialog test về payload fingerprint (thứ tự ổn định)
  - `strategy: Fully-Automated`

**Validation (dùng chung client và server)**

- **AC4:** Bộ kiểm tra chấp nhận đúng các giá trị trong danh sách cho phép và từ chối: thiếu trường; Q6 không phải mảng; Q6 có phần tử không phải chuỗi; Q6 trùng lặp (kể cả sau khi chuẩn hóa); Q6 rỗng; giá trị ngoài danh sách (Q6, Q8, Q9); Q8/Q9 sai kiểu; thân yêu cầu quá lớn; khóa lạ ngoài danh sách cho phép.
  - `proven by:` validation.test.ts (bảng ca hợp lệ/không hợp lệ gồm đủ các ca âm trên)
  - `strategy: Fully-Automated`

**Route**

- **AC5:** Đơn thiếu hoặc sai khảo sát bị từ chối với `400 invalid_request` chung (không nêu chi tiết trường), và không tạo đơn.
  - `proven by:` ticket-orders route.test.ts (đường 400, kiểm tra số lần gọi RPC = 0)
  - `strategy: Fully-Automated`
- **AC6:** Đơn hợp lệ lưu khảo sát bằng RPC mới; khi lưu khảo sát lỗi hoặc chậm hơn giới hạn chờ, checkout vẫn trả link thanh toán trong giới hạn đó (không bị chặn thêm) và log không chứa câu trả lời hay mã đơn/người dùng.
  - `proven by:` route.test.ts (mock RPC khảo sát lỗi/treo; kiểm tra phản hồi vẫn có link và nội dung log)
  - `strategy: Fully-Automated`
- **AC7:** Trong trường hợp thường (khảo sát lưu xong trong giới hạn chờ), khảo sát không bị mất do môi trường serverless cắt ngang sau khi phản hồi (đạt bằng chờ có giới hạn; giá trị timeout và cơ chế để INNOVATE/PLAN quyết). Chứng minh bằng test cơ chế tự động; việc serverless đóng băng thật chưa xác minh (residual K.1). Giới hạn chờ này hòa giải với AC6: chờ để không mất dữ liệu, nhưng có trần để không chặn checkout. Header Server-Timing vẫn chỉ dùng tên giai đoạn cố định.
  - `proven by:` route.test.ts (khảo sát hoàn tất trước khi handler trả về khi nhanh; trả về đúng hạn khi treo) + kiểm tra tên Server-Timing; nếu INNOVATE chọn `after()` thì việc nó chạy đúng trên Next 16.4.3 là Agent-Probe
  - `strategy: Hybrid`
- **AC8:** Các hàm và luồng sau không đổi: `claim_paid_ticket_sheet_sync`, `create_ticket_order_v4`/`v5`, `prepare_payos_checkout`, webhook PayOS, các hàm outbox hiện có.
  - `proven by:` kiểm tra diff (không file migration/route cũ bị sửa) + toàn bộ test hiện có của PayOS webhook, checkout guard và outbox vẫn xanh
  - `strategy: Fully-Automated`
- **AC19 (mới):** Lưu khảo sát không thể gắn dữ liệu vào đơn không tồn tại hoặc đơn mà người gọi không sở hữu: ca đó bị từ chối ở tầng DB/RPC và không tạo hay sửa hàng khảo sát nào (cách kiểm tra quyền sở hữu để INNOVATE/PLAN quyết).
  - `proven by:` SQL assertions (upsert cho đơn không tồn tại và đơn của người khác đều bị từ chối, bảng không đổi) + route.test.ts (route chỉ truyền đơn vừa tạo của chính người dùng đã xác thực)
  - `strategy: Fully-Automated`

**DB**

- **AC9:** Migration `202611170003` tạo bảng `ticket_order_survey` khóa theo mã đơn, bật RLS, chỉ service_role truy cập; RPC upsert và RPC đọc chỉ cấp cho service_role (anon/authenticated bị từ chối). Runner PostgreSQL cô lập PHẢI thực sự chạy file SQL assertions mới của khảo sát (hiện runner chỉ chạy cứng file checkout-access-guard nên file mới sẽ không bao giờ chạy nếu runner không được mở rộng).
  - `proven by:` `scripts/test-checkout-guard-db.mjs` (đã mở rộng để chạy kiểm tra khảo sát) + file SQL assertions mới trong `supabase/tests`; kiểm chứng bằng cách cố ý làm một assertion khảo sát thất bại và thấy runner báo lỗi
  - `strategy: Fully-Automated`
- **AC10:** DB tự chặn dữ liệu sai bằng allowlist do chính DB áp dụng: Q6 không rỗng và không trùng, mọi giá trị Q6/Q8/Q9 phải thuộc danh sách cho phép; dữ liệu khảo sát được dọn theo vòng đời của đơn (xóa đơn thì khảo sát đi theo); upsert lần hai cho cùng đơn ghi đè, không tạo bản ghi trùng. (Đề xuất hiện tại: `text[]` kèm check constraint và khóa ngoại ON DELETE CASCADE; chỉ là đề xuất, cách làm do INNOVATE/PLAN chốt.)
  - `proven by:` SQL assertions (từ chối dữ liệu sai, dọn theo vòng đời đơn, upsert idempotent) chạy qua runner đã mở rộng ở AC9
  - `strategy: Fully-Automated`

**Worker / Sheet**

- **AC11:** Hàng Sheet có đúng 17 cột theo bố cục A:Q (Q6 nối ";" theo thứ tự chuẩn, nhãn tiếng Việt nguyên văn, mã đơn ở cột N), và ghi cập nhật dùng `A{n}:Q{n}`.
  - `proven by:` paid-orders.test.ts (makeRow, vị trí cột, range, chuỗi nối)
  - `strategy: Fully-Automated`
- **AC12:** Phân biệt 3 trạng thái "không có khảo sát". (a) Đơn paid cũ không có hàng khảo sát: vẫn đồng bộ, G/H/M là chuỗi rỗng, các cột còn lại không lệch. (b) Khảo sát chưa từng được lưu hoặc lưu lỗi lúc đặt vé (đơn mới nhưng không có hàng): cũng ghi G/H/M rỗng và đồng bộ bình thường. (c) Đọc khảo sát thất bại: hàng thất bại để thử lại, TUYỆT ĐỐI không ghi ô trống rồi đánh dấu synced.
  - `proven by:` paid-orders.test.ts + outbox-worker.test.ts (ba ca: RPC trả "không có hàng" cho (a) và (b) -> ghi rỗng; RPC trả lỗi cho (c) -> không ghi Sheet, không hoàn tất)
  - `strategy: Fully-Automated`
- **AC13:** Khi đọc khảo sát thất bại, hàng được đánh dấu lỗi để thử lại bằng một mã lỗi sạch MỚI khớp mẫu mã lỗi hiện có (`^[a-z0-9_]{1,80}$`, ví dụ đặt cho lỗi đọc khảo sát; tên cụ thể do PLAN chốt) và không mang câu trả lời, mã đơn hay thông điệp lỗi gốc; worker chỉ dùng RPC (admin client rpc-only).
  - `proven by:` outbox-worker.test.ts (lỗi RPC đọc -> mã lỗi mới được ghi qua đường fail hiện có, khớp mẫu, không có lệnh ghi Sheet / không gọi hoàn tất)
  - `strategy: Fully-Automated`
- **AC14:** Biến phạm vi vẫn đặt `A:N` bị từ chối (fail closed) với lỗi rõ ràng; `.env.example` và README ghi `A:Q`. Lưu ý: hiện KHÔNG có test tự động nào đọc `.env.example` hay README, nên phần tài liệu được chứng minh bằng một kiểm tra tài liệu có ghi lại (lệnh tìm chuỗi + kết quả trong báo cáo) HOẶC thêm một test mới cho việc này (PLAN chọn một; không được để trống).
  - `proven by:` paid-orders.test.ts (regex/range) + kiểm tra tài liệu có ghi lại hoặc test mới cho `.env.example`/README
  - `strategy: Hybrid`
- **AC15:** Ghi thật 17 cột lên Google Sheet (append/update) đúng cột trên bản sao Sheet, kèm một đơn test đi trọn luồng.
  - `proven by:` thử tay trên bản sao Sheet theo thứ tự triển khai (mock không chứng minh được việc ghi thật)
  - `strategy: Agent-Probe`

**Hiệu năng / hồi quy**

- **AC16:** Không tăng số RPC trên đường thành công của checkout nối tiếp, định nghĩa chính xác: số RPC checkout hiện tại trên đường thành công (benchmark mocked hiện đo `2` RPC/đơn cho candidate, `3` cho baseline cũ) không được tăng vì khảo sát; RPC lưu khảo sát chạy song song và được đếm riêng, không cộng vào đường nối tiếp. Benchmark dùng fixture mới (có khảo sát) và tạo baseline MỚI; file baseline bất biến hiện có KHÔNG bao giờ bị ghi đè.
  - `proven by:` route.performance.test.ts với baseline mới (kiểm tra hash baseline cũ không đổi; assertion `rpcCounts` mới nêu rõ số RPC nối tiếp và số RPC khảo sát)
  - `strategy: Fully-Automated`
- **AC17:** Lint, typecheck, toàn bộ Vitest, runner PostgreSQL cô lập (đã mở rộng chạy khảo sát) và build đều đạt, so với baseline đã ghi: `npm run check` hiện dừng ở các lỗi lint có sẵn từ trước, nên PLAN/EXECUTE phải ghi lại trước khi sửa việc gì những mục nào đã hỏng, và chứng minh không có lỗi MỚI (so sánh trước/sau). Ghi chú: `npm run build` có thể dừng ở cảnh báo lỗ hổng Next.js 16.4.3 ở lần chạy đầu và đạt khi chạy lại (đã biết, không nâng cấp trong task này).
  - `proven by:` `npm run check` (so với baseline lint ghi lại), `npm test`, `node scripts/test-checkout-guard-db.mjs`, `npm run build`
  - `strategy: Fully-Automated`

**Triển khai**

- **AC18:** Có tài liệu thứ tự áp dụng production và bằng chứng rủi ro cao: checkout TẮT và sao lưu Sheet -> (cột A:Q đã chèn) -> chạy migration `202611170003` trong Supabase SQL Editor và chạy truy vấn xác minh quyền -> đặt `GOOGLE_SHEETS_PAID_ORDERS_RANGE=Registrations!A:Q` và deploy (một bước, vì biến môi trường chỉ có hiệu lực ở lần deploy kế tiếp) -> thử tay theo A2 trên bản sao Sheet -> khôi phục biến môi trường về Sheet thật và deploy lại khi checkout TẮT -> bật checkout; có gói bằng chứng `harness/` và đánh giá độc lập. Hai điểm bổ sung (Revision 3):
  - Thử tay (A2, Revision 3): vì `PAYOS_CHECKOUT_ENABLED` chặn route khi TẮT, thử tay dùng một cửa sổ ngắn trên production với checkout BẬT và `GOOGLE_SHEETS_SPREADSHEET_ID` trỏ vào MỘT BẢN SAO của Sheet (cùng tab Registrations, cùng bố cục A:Q, đã chia sẻ cho service account). KHÔNG dùng preview Vercel với Supabase production dùng chung (webhook PayOS production sẽ ghi vào Sheet thật). Sau khi thử: khôi phục biến về Sheet thật và deploy lại khi checkout TẮT; đối chiếu các đơn paid trong cửa sổ (đơn đã synced sang bản sao được xếp lại bằng `requeue_synced_sheet_sync_for_survey` khi có hàng khảo sát). KHÔNG BAO GIỜ thử trên Sheet thật.
  - Forward-fix: migration chỉ tiến (forward-only), không sửa migration đã áp dụng; hoàn tác = thêm một migration mới; xóa bảng `ticket_order_survey` sẽ làm MẤT dữ liệu khảo sát đã thu, nên rollback chỉ làm theo cách an toàn dữ liệu (xuất dữ liệu trước hoặc giữ bảng và vô hiệu hóa việc dùng).
  - `proven by:` validator gói bằng chứng rủi ro + checklist triển khai được người dùng duyệt (không tự chạy trên production)
  - `strategy: Hybrid`
- **AC20 (known-gap, Revision 3):** Race khảo sát đến muộn: nếu worker đồng bộ một đơn paid TRƯỚC khi khảo sát kịp lưu (hoặc khảo sát lưu muộn sau khi lưu bị quá giới hạn chờ), hàng Sheet có G/H/M rỗng và được coi là known-gap đã chấp nhận. Cách phát hiện: hàng đã `synced` nhưng G/H/M rỗng trong khi bảng `ticket_order_survey` có hàng cho đơn đó (đối chiếu khi cần). Cách bù thủ công (A1): `enqueue_paid_ticket_sheet_sync` KHÔNG BAO GIỜ reset hàng đã `synced` (migration 202611170002 dòng 31-38), nên dùng hàm mới `requeue_synced_sheet_sync_for_survey(order_id)` (chỉ service_role, thêm trong `202611170003`): chỉ khi đơn đã paid, có hàng khảo sát và hàng outbox paid đang `synced` thì đặt lại thành `pending`, rồi worker đồng bộ lại (ghi đè hàng theo mã đơn). Hàm này không sửa các hàm claim/complete/fail/enqueue. Tài liệu vận hành (README) ghi cả hai.
  - `proven by:` SQL assertions cho hàm requeue (synced -> pending trả true; không paid / không có khảo sát / không synced / không tồn tại trả false; quyền chỉ service_role) + test ghi nhận hành vi (đơn không có hàng khảo sát lúc đồng bộ -> G/H/M rỗng, synced) + tài liệu vận hành; kiểm chứng thủ công trên bản sao
  - `strategy: Hybrid`

## Out Of Scope

- Sửa `claim_paid_ticket_sheet_sync`, `create_ticket_order_v4`/`v5`, `prepare_payos_checkout`, webhook PayOS, các hàm outbox hiện có (cấm sửa).
- Chuyển hàng cũ đã có trên Sheet sang bố cục mới, hay điền khảo sát cho đơn cũ (đơn cũ để ô trống).
- Câu Q7 của biểu mẫu gốc và mọi câu hỏi khác ngoài Q6, Q8, Q9.
- Thêm văn bản đồng ý (consent) hoặc thời hạn lưu giữ dữ liệu (xem Câu hỏi mở).
- Đổi giá vé, chính sách thanh toán, quy tắc cooldown; bật checkout; chạy migration lên DB thật; sửa Sheet thật (do chủ dự án thực hiện).
- Màn hình quản trị/thống kê khảo sát, xuất báo cáo.
- Sửa các migration đã áp dụng (chỉ thêm migration mới, forward-only).
- Nâng cấp Next.js hay thêm thư viện mới.
- Sửa các lỗi lint có sẵn từ trước không liên quan đến thay đổi này (chỉ ghi baseline, không xử lý).

## Constraints

- Cả 3 câu bắt buộc, kiểm tra ở client và server; thông báo tiếng Việt; không hiện dấu sao hay nhãn "Bắt buộc".
- Lưu trữ: bảng MỚI khóa theo mã đơn, RLS bật, chỉ service_role; RPC upsert và RPC đọc chỉ service_role; trong migration mới `202611170003`. Không sửa migration đã có.
- Quyền sở hữu: upsert khảo sát không thể gắn dữ liệu vào đơn không tồn tại hoặc không thuộc người gọi (hành vi bắt buộc; cơ chế kiểm tra để INNOVATE/PLAN).
- Chờ lưu khảo sát có giới hạn thời gian (timeout bắt buộc có; giá trị và cơ chế để INNOVATE/PLAN): checkout không bao giờ bị chặn quá giới hạn đó.
- Migration forward-only: không sửa migration đã áp dụng; rollback = migration mới; xóa bảng khảo sát làm mất dữ liệu đã thu.
- Worker đọc khảo sát theo mã đơn qua RPC đọc mới (admin client chỉ gọi RPC) rồi gộp vào hàng Sheet; lỗi đọc dùng mã lỗi sạch mới khớp mẫu hiện có.
- Trình duyệt không bao giờ quyết định trạng thái thanh toán; chỉ webhook đã xác minh mới ghi paid. Không retry mù với nhà cung cấp.
- Không ghi câu trả lời, mã đơn hay mã người dùng vào log, Server-Timing hay báo cáo. Server-Timing chỉ dùng tên giai đoạn cố định, không chứa danh tính, mã đơn hay dữ liệu nhà cung cấp. Mặc định: KHÔNG thêm tên giai đoạn mới cho khảo sát (thêm tên mới buộc phải cập nhật bộ tên, test khẳng định đúng thứ tự và benchmark); mặc định này có thể đổi nếu người dùng muốn đo riêng. (default — user may override)
- Phạm vi file thay đổi (blast radius) PHẢI gồm `scripts/test-checkout-guard-db.mjs` và `supabase/tests/`, vì runner DB hiện chỉ chạy cứng một file SQL.
- Rủi ro: runner DB ghi artifact vào đường dẫn cứng của thư mục task cũ `checkout-access-guard_14-11-26`; nếu thư mục đó bị lưu trữ/di chuyển, runner có thể lỗi hoặc ghi sai chỗ. Phải ghi nhận và xử lý trong PLAN (không chọn cách ở đây).
- Không đưa bí mật hay giá trị biến môi trường vào file được theo dõi.
- Giữ cấu trúc code hiện có: Server Component mặc định, client chỉ ở lá; PascalCase.tsx và export có tên.
- Nhóm rủi ro cao (route thanh toán, migration, dữ liệu cá nhân gửi bên thứ ba) cần gói bằng chứng `harness/` và người đánh giá độc lập.
- Cơ chế kỹ thuật (cách chạy song song và chờ lưu khảo sát, giá trị timeout, cách kiểm tra quyền sở hữu, cách gộp vào hàng Sheet, thứ tự validate, cách mở rộng runner DB) thuộc INNOVATE, không khóa ở đây.
- Chưa kiểm chứng được từ mã nguồn: `after()` trên Next 16.4.3; append/update 17 cột trên Sheets thật.

### Mặc định đã quyết (người dùng chưa phản đối, ghi "default — user may override")

1. Giá trị trên Sheet là nhãn tiếng Việt nguyên văn theo nguồn (Q8 cuối ghi đủ; Q9 giữ nguyên khoảng trắng sau "Anh/"); Q6 theo thứ tự chuẩn của danh sách, không theo thứ tự click; đơn cũ hoặc đơn chưa có khảo sát thì ô rỗng. (default — user may override)
2. Client hiện thông báo tiếng Việt theo từng trường; server chỉ trả `400 invalid_request` chung. (default — user may override)
3. Lưu khảo sát chạy song song với bước PayOS và được chờ CÓ GIỚI HẠN thời gian để serverless không cắt ngang mà checkout không bị chặn quá bound; lỗi chỉ ghi log (không kèm câu trả lời/mã), không chặn checkout. Cơ chế (`after()`, gom kiểu settled kèm timeout, hay cách khác) và giá trị timeout để INNOVATE/PLAN. (default — user may override)
4. Worker: đọc khảo sát lỗi thì hàng thất bại để thử lại; không bao giờ ghi ô trống rồi đánh dấu synced; "không có hàng khảo sát" thì ghi ô trống và synced. (default — user may override)
5. Biến phạm vi đang đặt `A:N` ở môi trường deploy bị từ chối (fail closed). (default — user may override)
6. DB (mô tả theo hành vi): allowlist Q6/Q8/Q9 do chính DB áp dụng; Q6 không rỗng và không trùng; khảo sát được dọn theo vòng đời của đơn; chỉ gắn được vào đơn hợp lệ. Đề xuất hiện tại (không bắt buộc): Q6 là `text[]` với check constraint, khóa ngoại tới đơn ON DELETE CASCADE, Q8/Q9 text với check constraint. (default — user may override)
7. Benchmark: cập nhật fixture và tạo baseline MỚI; không ghi đè baseline bất biến cũ. (default — user may override)
8. Không thêm văn bản consent hay thời hạn lưu giữ (ghi là câu hỏi mở). (default — user may override)
9. Thứ tự áp dụng production và cách thử tay như AC18. (default — user may override)
10. Không thêm tên giai đoạn Server-Timing mới cho khảo sát. (default — user may override)

## Risks

| Rủi ro | Tác động | Hướng giảm (chi tiết để INNOVATE/PLAN) |
|---|---|---|
| Sai thứ tự triển khai (code range A:Q trước khi cột có hoặc migration chưa chạy) | Ghi lệch cột, worker lỗi | Thứ tự AC18, fail closed với `A:N`, checkout TẮT trong lúc đổi |
| Runner DB chỉ chạy cứng 1 file SQL | Assertion khảo sát không bao giờ chạy, xanh giả | Yêu cầu AC9: runner phải chạy kiểm tra khảo sát, kiểm chứng bằng ca cố ý thất bại |
| Runner DB ghi vào đường dẫn cứng của thư mục task cũ | Lỗi/ghi sai chỗ nếu thư mục bị lưu trữ | Ghi nhận trong PLAN; xử lý khi mở rộng runner |
| Đơn cũ đã paid không có khảo sát | Cột lệch hoặc thiếu | Ô rỗng tường minh (AC12a) |
| Lưu khảo sát bị cắt khi serverless kết thúc | Mất dữ liệu im lặng | Chờ có giới hạn bằng cơ chế được xác nhận (AC6/AC7) |
| Chờ lưu khảo sát kéo dài chặn checkout | Khách bị chậm thanh toán | Trần thời gian bắt buộc (AC6) |
| Khảo sát đến muộn hơn lúc hàng được đồng bộ (race nhỏ) | Hàng Sheet thiếu khảo sát | Known-gap đã chấp nhận, cách phát hiện và bù thủ công ở AC20 |
| Gắn khảo sát vào đơn của người khác | Dữ liệu sai chủ | Yêu cầu quyền sở hữu, AC19 |
| Dữ liệu cá nhân và khảo sát gửi sang Sheet bên thứ ba, chưa có consent/retention | Pháp lý/quyền riêng tư | Câu hỏi mở số 3 |
| Sửa nhầm hàm thanh toán/outbox | Hỏng thanh toán | AC8 (cấm sửa, kiểm tra diff, test hiện có) |
| Xóa/hoàn tác bảng khảo sát | Mất dữ liệu đã thu | Forward-fix an toàn dữ liệu (AC18) |
| Test hiện có vỡ (paid-orders, outbox-worker, route, performance, validation, dialog) | Hồi quy che khuất | Cập nhật có chủ đích, AC17 với baseline lint |

## Tầng kiểm thử (đối chiếu enumerasi trong RESEARCH và `process/context/tests/all-tests.md`)

| Tầng | Phạm vi |
|---|---|
| Fully-Automated | AC1-AC6, AC8-AC13, AC16, AC17, AC19: Vitest (validation, route, dialog, paid-orders, outbox-worker, performance), runner PostgreSQL cô lập (đã mở rộng) + SQL assertions, lint/typecheck/build |
| Hybrid | AC7 (chờ có giới hạn: test tự động + thăm dò `after()` nếu được chọn), AC14 (test + kiểm tra tài liệu có ghi lại hoặc test mới), AC18 (validator bằng chứng + checklist người duyệt), AC20 (known-gap: test ghi nhận + tài liệu vận hành) |
| Agent-Probe | AC15 (ghi thật 17 cột trên bản sao Sheet), thăm dò hiển thị form trên trình duyệt bằng `agent-browser` nếu cần ảnh chụp |
| Known-Gap (nêu rõ) | Độ trễ hosted, hành vi PayOS thật, migration trên DB thật (chủ dự án áp dụng), dữ liệu thật trên Sheet production, race khảo sát đến muộn (AC20) |

## Open Questions

Không chặn PLAN; mỗi mục có mặc định đề xuất. Owner = người dùng trừ khi ghi khác.

**Đã chốt (không còn mở):**

- Chữ tiêu đề Q6/Q9: giữ nguyên chữ nguồn, kể cả khoảng trắng trong "Anh/ chị" ở Q9. (trả lời 1)
- Cách thử tay khi checkout đang TẮT (Revision 3 thay bản cũ dùng preview Vercel): cửa sổ ngắn trên production, checkout BẬT, `GOOGLE_SHEETS_SPREADSHEET_ID` trỏ bản sao Sheet; không dùng preview Vercel; không bao giờ thử trên Sheet thật; khôi phục và deploy lại khi checkout TẮT (AC18). (trả lời 2, sửa theo A2)
- Race khảo sát đến muộn: chấp nhận như known-gap, có AC20 với cách phát hiện và cách bù. (trả lời 3)

**Còn mở:**

1. Cơ chế lưu khảo sát song song, chờ có giới hạn và giá trị timeout: owner = INNOVATE. Mặc định: gom kết quả kiểu settled trong handler kèm timeout (chưa kiểm chứng `after()` trên Next 16.4.3).
2. Cách mở rộng runner DB để chạy kiểm tra khảo sát và xử lý đường dẫn artifact cứng: owner = INNOVATE/PLAN. Mặc định: yêu cầu ở AC9, cách làm do INNOVATE chọn.
3. Consent và thời hạn lưu giữ khảo sát/dữ liệu cá nhân: owner = người dùng. Mặc định: không thêm (ngoài phạm vi), ghi là nợ cần quyết định trước khi bán vé thật.
4. Q6 chọn nhiều có cần ô "Khác" không: owner = người dùng. Mặc định: không (8 lựa chọn cố định như đã khóa).
5. Có cần bù (backfill) khảo sát cho đơn paid đã tồn tại trên Sheet không: owner = người dùng. Mặc định: không (để trống).
6. Có muốn thêm tên giai đoạn Server-Timing riêng cho khảo sát không: owner = người dùng. Mặc định: không (xem Constraints).

## Danh sách người dùng cần duyệt

1. Văn bản câu hỏi, danh sách lựa chọn và thứ tự chuẩn (bảng yêu cầu theo trường), gồm việc giữ nguyên chữ nguồn (cả khoảng trắng trong "Anh/ chị").
2. Bố cục Sheet A:Q và giá trị ghi (nhãn nguyên văn, Q6 nối ";", ô rỗng cho đơn cũ và đơn chưa có khảo sát; lỗi đọc thì thử lại, không ghi trống).
3. 10 mặc định đã quyết ở mục Constraints (đặc biệt 3 chờ có giới hạn, 4, 5, 8, 10).
4. Thứ tự triển khai production và cách thử tay (AC18) cùng việc chủ dự án tự chạy migration, đặt biến môi trường, bật checkout; kèm ghi chú forward-fix.
5. Known-gap race khảo sát đến muộn (AC20) và cách bù thủ công; nhận gói bằng chứng rủi ro cao + đánh giá độc lập là điều kiện đóng.
6. Các câu hỏi mở 1-6 và mặc định đề xuất.

## Background / Research Findings

- Điểm chạm: `TicketRequestDialog.tsx` (form; đối tượng attendee cấp dữ liệu cho `payloadFingerprint` xoay khóa idempotency, nên trường khảo sát phải nằm trong đó và thứ tự Q6 phải ổn định; chưa có pattern checkbox/radio hay CSS; `required` gốc không dùng được cho nhóm checkbox), `validation.ts` (allowlist khóa, trả `null` trần, dùng chung client và server), route `ticket-orders` (lưu khảo sát có thể bắt đầu song song với khối PayOS sau khi đã có hàng đơn hợp lệ; Server-Timing dùng bộ 7 tên cố định; repo chưa dùng `after()`), `paid-orders.ts` (makeRow 14 chuỗi, mã đơn ở chỉ số 10, regex `^.{1,200}!A:N$`, range cập nhật cứng `A:N`), `outbox-worker.ts` (kiểu `OutboxAdmin` chỉ rpc; hàm `errorCode` ánh xạ lỗi sang mã sạch; mã lỗi DB phải khớp `^[a-z0-9_]{1,80}$`), `.env.example` và dòng range trong README, migration mới, `scripts/test-checkout-guard-db.mjs`, `supabase/tests`.
- Xác minh Revision 2: `scripts/test-checkout-guard-db.mjs` chạy cứng `supabase/tests/checkout-access-guard.sql` (dòng 163) và ghi artifact vào `process/general-plans/active/checkout-access-guard_14-11-26` (dòng 15, 455); benchmark route hiện khẳng định `rpcCounts` là `{"2": n}` cho candidate và `{"3": n}` cho baseline; không có test tự động nào đọc `.env.example`/README.
- Test cần cập nhật: `paid-orders.test.ts`, `outbox-worker.test.ts` (assert thứ tự gọi), route `route.test.ts` (validInput, mảng tên RPC, tên timing), `route.performance.test.ts` (baseline bất biến, vector digest, rpcCounts), `validation.test.ts`, `TicketRequestDialog.test.tsx`.
- Nhóm rủi ro cao: route thanh toán, migration, dữ liệu người dùng sang Sheet bên thứ ba; cần gói bằng chứng `harness/` và người đánh giá độc lập.
- Chưa kiểm chứng: `after()` trên Next 16.4.3; append/update 17 cột trên Sheets thật.
- Trạng thái production (theo context 17-11-26): checkout đang TẮT (`PAYOS_CHECKOUT_ENABLED` chặn route); migration `202611170001` chưa áp dụng trên DB thật; `202611170002` và `202611140007` đã áp dụng.
- Ý định người dùng (biểu mẫu gốc): thêm 3 câu khảo sát, Q7 gốc bỏ; người dùng đã tự chèn cột trên Sheet thật; trả lời "tiến hành" = nhận các mặc định (chữ nguồn, thử tay trên bản sao Sheet, race là known-gap).

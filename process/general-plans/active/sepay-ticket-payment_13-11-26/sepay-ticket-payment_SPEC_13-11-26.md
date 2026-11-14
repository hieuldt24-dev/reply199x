# Vé điện tử và thanh toán qua PayOS

**Tóm tắt:** Khách đăng nhập bằng Google, chọn số vé và một gói merch, thấy tổng tiền rõ ràng, thanh toán qua PayOS trong thời hạn link 5 phút, rồi nhận xác nhận sau khi webhook PayOS được xác minh. Đơn được lưu bền vững trong hệ thống và thông tin vận hành được đồng bộ sang Google Sheets; lỗi Sheet không làm mất đơn đã trả.

## Summary

Biến form yêu cầu vé thành luồng đăng nhập và mua vé: khách đăng nhập bằng Google, chọn số vé và một gói merch, biết số tiền phải trả trước khi thanh toán, thanh toán qua link PayOS có thời hạn 5 phút theo `expiredAt` và nhận xác nhận khi giao dịch được xác minh. Mỗi vé có giá 169.000 VND, gồm một phần đồ uống và một phần bánh. Đơn và lựa chọn đồ uống được lưu trong cơ sở dữ liệu; các thông tin cần thiết cho vận hành được đồng bộ sang Google Sheets. Khi Sheet lỗi, đơn đã trả vẫn được giữ và đồng bộ lại.

## User Stories / Jobs To Be Done

- Là khách tham dự, tôi muốn chọn số lượng vé và xem tổng tiền trước khi trả, để biết chính xác mình cần thanh toán bao nhiêu.
- Là khách tham dự, tôi muốn đăng nhập bằng Google và chọn một gói merch cho đơn, để thông tin của tôi và lựa chọn được gắn với đúng đơn.
- Là khách tham dự, tôi muốn thanh toán qua PayOS và nhận xác nhận đáng tin cậy, để biết vé đã được thanh toán.
- Là ban tổ chức, tôi muốn xem đơn, số lượng vé và trạng thái thanh toán trong Sheet, để theo dõi người mua.
- Là ban tổ chức, tôi muốn giao dịch thành công vẫn được lưu và tự đồng bộ lại nếu Sheet tạm lỗi, để không mất đơn đã trả tiền.

## What The User Wants (Behavioral Outcomes)

- Form cho khách chọn số vé từ 1 đến 4, theo giới hạn hiện có.
- Khách có thể đăng nhập bằng tài khoản Google trước khi đăng ký vé; lựa chọn merch của đơn được lưu cùng thông tin đơn.
- Giá được hiển thị là 169.000 VND mỗi vé; mỗi vé bao gồm một phần đồ uống; một lựa chọn merch áp dụng cho cả đơn. Tổng tiền bằng số vé × 169.000 VND cộng một lựa chọn merch (0, 99.000 hoặc 169.000 VND).
- Sau khi khách xác nhận đơn, website mở link thanh toán PayOS đúng số tiền và mã đơn; link thanh toán có hiệu lực 5 phút nếu được xác nhận trong sandbox và trạng thái ban đầu là đang chờ thanh toán.
- Chỉ khi webhook PayOS có chữ ký hợp lệ xác nhận giao dịch thành công thì đơn mới được ghi nhận đã chuyển khoản. Sheet hiển thị chính xác trạng thái “Đã chuyển khoản”. Việc khách quay lại trang web tự nó không được xem là bằng chứng trả tiền.
- Nếu khách hủy, trả thất bại hoặc giao dịch chưa xác định, đơn không bị ghi nhầm là đã thanh toán; khách thấy hướng dẫn phù hợp để tiếp tục hoặc thử lại.
- Nếu tiền đã được xác minh nhưng Sheet chưa cập nhật được, đơn được giữ lại, tự động thử đồng bộ lại và không yêu cầu khách thanh toán lần nữa.
- Một giao dịch được gửi lại nhiều lần cũng không tạo nhiều đơn hoặc ghi nhận thanh toán trùng.
- Nhiều yêu cầu đến cùng lúc không làm mất đơn, tạo đơn trùng cho cùng một lần gửi, hoặc ghi trùng thông tin thanh toán.
- Đơn và lựa chọn đồ uống được lưu trong cơ sở dữ liệu; thông tin vận hành cần thiết được đồng bộ vào Sheet mà không sao chép thông tin đăng nhập hay bí mật xác thực.

## Flow / State Diagram

```text
[Đăng nhập Google; chọn 1–4 vé và đồ uống; xem tổng tiền]
             |
             v
       [Tạo đơn chờ trả]
             |
             v
[Mở link thanh toán PayOS; hạn 5 phút]
       /       |        \
  thành công  thất bại   hủy/chưa rõ
      |          |          |
      v          v          v
[Xác minh giao dịch] [Hiện lỗi] [Giữ trạng thái chờ;
      |               thử lại]  cho kiểm tra/tiếp tục]
      v
 {Tiền đã xác minh?}
      | có
      v
[Đơn đã thanh toán] --> {Sheet ghi được?}
                            | có       | chưa
                            v          v
                    [Sheet: “Đã chuyển khoản”] [Giữ đơn; tự đồng bộ lại]
                                          |
                                          +--> [Sheet: đã trả]
```

## Acceptance Criteria (Testable Outcomes)

- **AC1:** Với số vé từ 1 đến 4, khách thấy đúng đơn giá 169.000 VND/vé, nội dung bao gồm một phần đồ uống và một phần bánh cho mỗi vé, cùng tổng tiền chính xác trước khi thanh toán.
  - `proven by:` ticket-price-and-quantity-total boundaries integration scenario
  - `strategy: Fully-Automated`
- **AC2:** Thay đổi số tiền gửi từ trình duyệt không làm thay đổi giá hoặc tổng tiền mà hệ thống chấp nhận cho đơn.
  - `proven by:` tampered-payment-amount rejection scenario
  - `strategy: Fully-Automated`
- **AC3:** Đơn mới ở trạng thái chờ trả; khách chỉ thấy xác nhận đã thanh toán sau khi có kết quả PayOS hợp lệ được xác minh.
  - `proven by:` checkout-pending-and-verified-payment lifecycle scenario
  - `strategy: Fully-Automated`
- **AC4:** Giao dịch bị từ chối, bị hủy hoặc chưa có kết quả không làm đơn chuyển sang đã thanh toán; khách được hướng dẫn thử lại hoặc kiểm tra trạng thái.
  - `proven by:` failed-canceled-and-pending-payment outcomes scenario
  - `strategy: Fully-Automated`
- **AC5:** Thông báo thanh toán được gửi lặp lại không tạo đơn trùng hoặc ghi nhận tiền trùng.
  - `proven by:` duplicate-payment-notification idempotency scenario
  - `strategy: Fully-Automated`
- **AC6:** Khi giao dịch đã được xác minh thành công nhưng Sheet tạm lỗi, đơn vẫn được giữ lại, hệ thống tự thử đồng bộ lại và Sheet cuối cùng phản ánh đã thanh toán mà khách không phải trả lần nữa.
  - `proven by:` payment-success-sheet-outage-retry-and-recovery integration scenario
  - `strategy: Fully-Automated`
- **AC7:** Mỗi đơn đã thanh toán trong Sheet có thể đối chiếu với mã đơn, số vé, tổng tiền và giao dịch PayOS tương ứng.
  - `proven by:` paid-order-sheet-reconciliation scenario
  - `strategy: Fully-Automated`
- **AC8:** Người vận hành có thể xác nhận bằng môi trường thử nghiệm rằng tiền đến đúng tài khoản và trạng thái đơn/Sheet khớp với giao dịch thực.
  - `proven by:` PayOS sandbox-to-sheet end-to-end operational walkthrough
  - `strategy: Hybrid` (tích hợp tự động trên sandbox và người vận hành kiểm tra cấu hình tài khoản/webhook trong môi trường được cấp quyền)
- **AC9:** Khách đăng nhập bằng Google thành công; đơn vé và lựa chọn đồ uống được lưu và chỉ gắn với đúng tài khoản đã đăng nhập.
  - `proven by:` Google OAuth sign-in and account-bound ticket-order integration scenario
  - `strategy: Hybrid`
- **AC10:** Với nhiều yêu cầu đồng thời, mỗi lần gửi hợp lệ chỉ tạo một đơn; webhook gửi lặp và Sheet retry không tạo thanh toán hoặc hàng Sheet trùng.
  - `proven by:` concurrent order, webhook idempotency, and Sheet synchronization recovery integration scenarios
  - `strategy: Fully-Automated`
- **AC11:** Link thanh toán được tạo với `expiredAt` sau 5 phút; sandbox xác nhận link hết hạn đúng hạn và giao dịch đến muộn được đưa vào đối soát, không bị bỏ mất hoặc tự động gán sai đơn. `strategy: Hybrid`.
  - `proven by:` payment QR expiry boundary and late-transfer reconciliation scenario
  - `strategy: Fully-Automated`
- **AC12:** Đồ uống được bao gồm trong giá vé; mỗi đơn có tối đa một lựa chọn merch từ danh sách đã chốt, được lưu cùng đơn và tính đúng vào tổng tiền.
  - `proven by:` order-level merch selection, persistence, and total calculation integration scenario
  - `strategy: Fully-Automated`

## Out Of Scope

- Hoàn tiền, hủy vé sau khi đã thanh toán, chuyển nhượng hoặc phân chỗ ngồi.
- Mua merch độc lập ngoài một lựa chọn merch gắn với đơn vé, nhiều loại vé hoặc chương trình giảm giá.
- Đăng nhập bằng phương thức khác ngoài Google.
- Dùng Sheet để xác thực thanh toán; Sheet là nơi theo dõi trạng thái đơn.

## Constraints

- Đơn giá: 169.000 VND mỗi vé, bao gồm một phần đồ uống và một phần bánh cho mỗi vé.
- Theo form hiện có, số lượng tối thiểu là 1 và tối đa là 4 vé mỗi đơn.
- Cổng thanh toán được người dùng chọn là PayOS.
- Người dùng yêu cầu Supabase Auth với Google OAuth và PostgreSQL được quản lý bởi Supabase; danh tính đăng nhập có thẩm quyền là tài khoản Auth, còn thông tin hồ sơ ứng dụng được lưu trong cơ sở dữ liệu.
- Link thanh toán PayOS có thời hạn 5 phút theo `expiredAt`, cần xác minh trong sandbox; trạng thái Sheet sau xác minh là “Đã chuyển khoản”.
- Ưu tiên an toàn khi có nhiều yêu cầu cùng lúc: không tạo/ghi nhận đơn trùng và phải giữ được đơn đã chuyển khoản khi Sheet lỗi.
- Kết quả quay về từ trình duyệt không đủ để xác nhận thanh toán; trạng thái đã thanh toán cần dựa trên giao dịch được xác minh đáng tin cậy.
- Nếu Sheets không khả dụng sau khi thanh toán thành công, đơn phải được giữ lại và tự đồng bộ lại.
- Thông tin bí mật và dữ liệu xác minh thanh toán không được lộ ra trình duyệt hoặc ghi vào file theo dõi mã nguồn.
- Các kịch bản kiểm thử phải bao phủ luồng hợp lệ và lỗi; lint/build đơn thuần không chứng minh giao dịch thật hoặc đồng bộ bền vững.

## Open Questions

Không còn câu hỏi sản phẩm chặn SPEC. Các mục dưới đây là điều kiện vận hành trước sandbox/live rollout:
- Chủ dự án: cung cấp tài khoản PayOS, môi trường, webhook HTTPS và thông tin kênh thanh toán qua secret manager; xác minh link expiry, webhook và xử lý giao dịch trễ qua sandbox.
- Ban tổ chức: cấu hình danh sách đồ uống được phép; tùy chọn merch được xác nhận: không chọn, Tuổi Xì Tin (99.000 VND), hoặc Tuổi Xì Lây (169.000 VND).
- Chủ dự án: cấu hình Supabase project cùng Google OAuth provider/redirect URLs; không đưa secret vào Sheet hoặc mã nguồn.
- Ban tổ chức: xác nhận tab/cột Google Sheets được phép đồng bộ và liệu merch có ngoài scope mua vé hay không.
- Ban tổ chức: xác nhận nội dung điều khoản hủy/hoàn tiền; tự động hoàn tiền vẫn ngoài scope lần đầu.

## Background / Research Findings

- Người dùng yêu cầu: “đăng kí vé -> tính tổng tiền rồi call cổng thanh toán rồi tiếp tục rồi về chuyển tình trạng sheet là đã thanh toán.”
- Người dùng đã chọn PayOS; giá vé 169.000 VND gồm một phần đồ uống và một phần bánh; nếu trả thành công mà Sheet ghi lỗi thì giữ đơn và tự thử đồng bộ lại.
- Người dùng cập nhật scope: Supabase/PostgreSQL làm nơi lưu đơn; Google OAuth qua Supabase Auth; đơn vé và lựa chọn đồ uống lưu trong database, thông tin vận hành cũng được đưa vào Sheet.
- Yêu cầu hiện hành: PayOS payment link có thời hạn 5 phút theo `expiredAt`, được xác minh qua sandbox; Sheet dùng trạng thái “Đã chuyển khoản”. Trước đó plan từng có SePay QR, nhưng lựa chọn PayOS mới nhất thay thế provider đó.
- Theo việc mỗi vé bao gồm một phần đồ uống, giả định rõ một lựa chọn đồ uống cho từng vé; danh sách do ban tổ chức cấu hình và cần được cung cấp trước khi rollout.
- Dự án hiện có form yêu cầu vé ghi thông tin vào Google Sheets, nhưng chưa có bán vé, xác thực thanh toán hoặc đơn hàng. Yêu cầu hiện tại cho phép tối đa 4 vé.
- Google Sheets là ranh giới tích hợp hiện có; kiểm thử hiện tại dùng mock cho Sheets. Các kiểm tra tự động cần chứng minh xử lý giá, trạng thái đơn, webhook/thông báo lặp, và khôi phục ghi Sheet; kiểm tra live cần thông tin cấu hình PayOS do chủ dự án cung cấp.

## User-confirmed pricing amendment (2026-11-13)

This amendment supersedes prior drink-selection and merch-exclusion requirements: each ticket costs 169,000 VND and includes a drink; customers do not choose a drink. One order-level merch option matches the existing single-select form: none (0 VND), Combo "Tuổi Xì Tin" (99,000 VND), or Combo "Tuổi Xì Lây" (169,000 VND). Total = quantity × 169,000 + one selected merch price. Quantity remains 1–4; server/database are authoritative and client amounts are rejected. No payment/provider behavior changes are authorized by this amendment.
## User provider change: PayOS (2026-11-13)

The user requests PayOS instead of SePay. Use PayOS payment-link creation, HMAC-SHA256 signatures, and verified PayOS webhook as the only authority for paid status. Return/cancel browser redirects are informational only. Preserve the confirmed pricing amendment: 169,000 VND per ticket including drink; one order-level merch selection at 0/99,000/169,000 VND. Validate five-minute link expiry support against PayOS sandbox; do not assume bank transfer expiry from a UI timer. Required credentials are server-only `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, and `PAYOS_CHECKSUM_KEY`. Update the payment-provider acceptance criteria, tests, additive DB provider constraint and operator setup. No live checkout before sandbox verification.
## User provider decision reverted to SePay (2026-11-13)

The user changed the provider choice back to SePay; this supersedes the PayOS amendment above. Preserve the confirmed ticket/merch pricing and order schema. Use a verified, authenticated and idempotent SePay notification as payment authority; browser redirects cannot mark paid. Confirm the connected bank product, webhook authentication/acknowledgement and five-minute expiry in sandbox before live checkout. No PayOS credentials are required.
## User provider decision changed to PayOS (2026-11-14)

This is the current provider decision and supersedes prior SePay wording and the earlier PayOS reversion history. Use the PayOS payment-link API with `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, and `PAYOS_CHECKSUM_KEY` kept server-side. Create-link and webhook signatures use HMAC-SHA256 per PayOS's documented field canonicalization. Only a verified webhook that matches `orderCode`, exact amount, VND currency, payment-link ID and success code can mark an order paid; `returnUrl`/`cancelUrl` cannot. PayOS documents `expiredAt` as a Unix timestamp, but five-minute expiry and late-payment handling require sandbox evidence. Retain historical SePay transaction records and update provider constraints additively. Live checkout remains disabled until sandbox and reconciliation gates pass. Official docs: https://payos.vn/docs/api/ ; https://payos.vn/docs/tich-hop-webhook/kiem-tra-du-lieu-voi-signature/ ; https://payos.vn/docs/du-lieu-tra-ve/webhook/ .
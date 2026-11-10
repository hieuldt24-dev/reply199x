---
name: spec:reply-199x-retro-redesign
description: "Yêu cầu nâng cấp giao diện REPLY 199X theo tinh thần tạp san âm nhạc và băng cassette."
date: 09-11-26
feature: general
metadata:
  node_type: memory
  type: spec
---

# REPLY 199X — Retro Redesign SPEC

**Trạng thái:** Requirements captured for the user's requested PLAN; implementation is not authorized by this document.

## Summary

Nâng cấp REPLY 199X thành một trải nghiệm có dấu ấn riêng, gợi tạp san âm nhạc, bìa cassette và vé giấy thập niên 90. Người xem nhận ra tinh thần chương trình ngay từ màn hình đầu, đọc thông tin sự kiện nhanh hơn và tìm được hành động tiếp theo trên cả điện thoại lẫn máy tính. Giữ nguyên nội dung, nhận diện màu sắc và các chức năng hiện có; thay đổi tập trung vào chất lượng trình bày.

## User Stories / Jobs To Be Done

- US1: Là người lần đầu ghé trang, tôi muốn nhìn thấy một hình ảnh chủ đạo và tên chương trình rõ ràng để cảm nhận được không khí hoài niệm.
- US2: Là người quan tâm sự kiện, tôi muốn tìm thấy ngày, địa điểm và thông tin tham gia dễ dàng để quyết định tìm hiểu tiếp.
- US3: Là người xem trên điện thoại, tôi muốn đọc chữ và thao tác thuận tiện để không phải phóng to hoặc cuộn qua quá nhiều trang trí.
- US4: Là người sử dụng bàn phím hoặc hạn chế chuyển động, tôi muốn truy cập đủ thông tin và điều khiển để sử dụng trang thoải mái.
- US5: Là người tìm vé, kỷ vật hoặc liên hệ, tôi muốn biết đúng tình trạng và bước tiếp theo để không hiểu nhầm rằng đã mua, đặt chỗ hay gửi tin thành công.

## What The User Wants (Behavioral Outcomes)

- Toàn trang có ngôn ngữ hình ảnh thống nhất: giấy ngà, xanh rêu, đỏ son, vàng nhấn; các chi tiết gợi cassette, dấu mực, poster và cuống vé được dùng có chủ đích.
- Màn hình đầu có điểm nhìn chính dễ nhớ, tiêu đề tiếng Việt rõ dấu, thông tin sự kiện và một hành động chính nổi bật. Trên màn hình lớn, hình ảnh và nội dung có sự phân vai; trên điện thoại, thông tin quan trọng xuất hiện trước trang trí phụ.
- Các cụm “DÒNG CHẢY” và “HOÀI NIỆM” được trình bày có chủ ý; không để một từ rơi lẻ làm giảm khả năng đọc.
- Các phần giới thiệu, lịch trình, sự kiện, vé, kỷ vật và liên hệ có nhịp trình bày riêng nhưng cùng một hệ căn lề, khoảng cách và kiểu chữ.
- Chữ nội dung dễ đọc; nền hạt và bóng chữ không che dấu tiếng Việt hoặc cạnh tranh với đoạn văn.
- Mọi điểm đến điều hướng cũ vẫn truy cập được. Hành động nổi bật dẫn tới sự kiện; liên kết hành trình nhẹ hơn nhưng vẫn rõ.
- Hình chính thức và thông tin sản phẩm được thể hiện trung thực. Khi ảnh không tải, người xem vẫn đọc được nhận diện và nội dung liên quan.
- Chuyển động nhẹ hỗ trợ phản hồi, không gây mất tập trung hoặc buộc người xem chờ.

## Flow / State Diagram

```text
[Mo trang]
     |
     v
[Nhan dien REPLY 199X + thong tin chinh]
     |                         |
     v                         v
[Xem su kien]             [Kham pha hanh trinh]
     |                         |
     v                         v
[Ngay / dia diem / ve]    [Gioi thieu / lich trinh / ky vat]
     |                         |
     +----------+--------------+
                |
                v
       [Chon buoc tiep theo]
          |          |           |
          v          v           v
 [Ve chua mo ban] [Mo form] [Xem truoc lien he]
          |                      |
          v                      v
 [Den lien he]            [Sua noi dung / mo email]

[Anh loi] --> [Noi dung thay the doc duoc, giu thong tin]
[Giam chuyen dong] --> [Thong tin va thao tac van day du]
```

## Acceptance Criteria (Testable Outcomes)

Các kịch bản dưới đây kế thừa phạm vi kiểm tra đã được nghiên cứu: nội dung/đường dẫn, điều hướng, năm chiều rộng màn hình, bàn phím, biểu mẫu xem trước, ảnh lỗi và giảm chuyển động. Kiểm tra cảm nhận thẩm mỹ cần người đánh giá; các hành vi có thể tự động hóa phải có kết quả tự động, không dùng ảnh chụp để thay thế.

- **AC1 — Nhận diện:** Trang thể hiện nhất quán hướng tạp san âm nhạc và băng ký ức, giữ bảng màu hiện có; mỗi khu vực có điểm nhìn chính và hiệu ứng trang trí không lấn nội dung.
  - proven by: So sánh ảnh toàn trang desktop/mobile và duyệt nghệ thuật theo hướng đã thống nhất.
  - strategy: Hybrid — ảnh có thể ghi tự động; chất lượng bố cục cần đánh giá trực quan.
- **AC2 — Màn hình đầu:** Tiêu đề rõ dấu, các cụm tên được ngắt hợp lý, hành động xem sự kiện nổi bật hơn hành động khám phá; trên điện thoại, tiêu đề và hành động chính không bị đẩy xuống sau trang trí phụ.
  - proven by: Kiểm tra nội dung/đích CTA tự động; ảnh hero ở 360, 390, 768, 1280 và 1440px.
  - strategy: Hybrid — kiểm tra hành vi tự động kết hợp duyệt phân cấp thị giác.
- **AC3 — Đọc và nhịp trang:** Nội dung dài dễ đọc, tiêu đề tiếng Việt không bị bóng/texture che dấu; các khu vực có bố cục phân biệt nhưng vẫn giữ thứ tự thông tin.
  - proven by: Kiểm tra thứ tự section tự động; duyệt chữ tiếng Việt, khoảng cách và texture qua ảnh desktop/mobile.
  - strategy: Hybrid.
- **AC4 — Responsive:** Không có cuộn ngang hoặc nội dung quan trọng bị cắt ở năm chiều rộng đã nêu; CTA và menu dễ thao tác, vùng chạm chính tối thiểu 44px, chữ nhập liệu tối thiểu 16px.
  - proven by: Kiểm tra hình học responsive, kích thước điều khiển và menu bằng trình duyệt tự động ở năm chiều rộng.
  - strategy: Fully-Automated.
- **AC5 — Điều hướng và khả năng tiếp cận:** Tất cả điểm đến hiện có vẫn dùng được bằng chuột, chạm và bàn phím; tiêu đề đích không bị header che; focus nhìn rõ, menu phản ánh đúng trạng thái đóng/mở.
  - proven by: Kiểm tra đích liên kết, menu, skip link và vị trí anchor tự động; duyệt focus bàn phím trực quan.
  - strategy: Hybrid.
- **AC6 — Trung thực nội dung:** Ngày, giờ, địa điểm, giá, quyền lợi, thứ tự khu vực và đường dẫn thương mại không bị thay đổi; vé vẫn chưa mở bán, Facebook vẫn chờ, merch mở form ngoài và liên hệ chỉ chuẩn bị xem trước/email.
  - proven by: Đối chiếu nội dung/đích liên kết tự động và kiểm tra biểu mẫu rỗng, email sai, xem trước, sửa lại cùng dữ liệu đã nhập.
  - strategy: Fully-Automated.
- **AC7 — Ảnh và chuyển động:** Ảnh lỗi vẫn có nội dung thay thế dễ hiểu; chế độ giảm chuyển động vẫn truy cập đủ nội dung và thao tác; không có âm thanh tự phát hoặc hiệu ứng rung/nhiễu liên tục.
  - proven by: Kịch bản chặn ảnh và bật giảm chuyển động tự động; duyệt trạng thái thay thế và cảm nhận chuyển động trực tiếp.
  - strategy: Hybrid.

## Out Of Scope

- Mở bán vé, thanh toán, xác nhận đơn hàng, lưu hoặc gửi tin nhắn từ trang.
- Thay đổi thông tin thương mại, sáng tác ảnh sản phẩm có thể gây hiểu nhầm hoặc thay poster chính thức.
- Tuyên bố phục dựng chính xác lịch sử, thêm trải nghiệm 3D hoặc âm thanh tự phát.
- Chuẩn hóa toàn bộ cấu trúc dự án, cấu hình công cụ, hệ thống agent hoặc thiết lập quản lý phiên bản.
- Xuất bản website; công việc này chỉ yêu cầu tài liệu kế hoạch cho đợt nâng cấp giao diện.

## Constraints

- Giữ nội dung tiếng Việt, các điểm đến và thứ tự khu vực hiện có. Có thể rút gọn phần dẫn ở màn hình đầu nếu toàn bộ nội dung gốc vẫn hiện diện tại khu vực phù hợp.
- Giữ vai trò kiểu chữ hiện tại; ưu tiên độ rõ của dấu tiếng Việt hơn hiệu ứng trang trí.
- Giữ logo và poster chính thức, không biến minh họa trang trí thành ảnh chụp vật phẩm được quảng cáo là có thật.
- Chưa có ảnh sản phẩm mới được cung cấp; bố cục vẫn phải hoàn chỉnh với thông tin và tài sản hiện có, không phụ thuộc tài sản chưa được duyệt.
- Không bổ sung dịch vụ bên ngoài hoặc thư viện mới cho đợt nâng cấp này.
- Phạm vi này cho phép thay đổi bố cục và hiệu ứng của bản chuyển đổi trước; các cam kết về nội dung và hành vi tiếp tục có hiệu lực.
- Tài liệu yêu cầu không chứng minh giao diện đã được thực hiện hoặc kiểm thử. Việc triển khai cần kế hoạch và bước kiểm tra tiếp theo.

## Open Questions

None. Phạm vi đã đủ để lập kế hoạch theo yêu cầu hiện tại. Duyệt thị giác của bản triển khai là tiêu chí nghiệm thu sau này, không phải đầu vào còn thiếu cho kế hoạch.

## Background / Research Findings

- Người dùng yêu cầu đề xuất cải thiện UI để đạt phong cách retro 199x, sau đó yêu cầu “thực hiện plan cho tôi”. Đây là yêu cầu lập kế hoạch cho hướng nâng cấp đã thảo luận.
- Đánh giá trước dựa trên ảnh desktop 1440px, mobile 390px và mã nguồn, không phải một lượt xác minh trình duyệt trực tiếp mới.
- Hiện hero thiên về chữ căn giữa; minh họa hai bên mờ, bóng chữ nhiều lớp làm dấu khó đọc, mobile kéo dài bởi mô tả và nhãn trang trí. Đây là các vấn đề ưu tiên của đợt nâng cấp.
- Ứng dụng đã tách khu vực nội dung và tương tác; không cần đổi kiến trúc để đáp ứng mục tiêu thị giác.
- Có sẵn kiểm tra lint, kiểu dữ liệu, bản dựng và công cụ trình duyệt bên ngoài. Chưa có bộ kiểm thử ứng dụng tích hợp; kế hoạch phải chỉ rõ cách ghi bằng chứng tự động và duyệt trực quan, không coi bản dựng thành công là bằng chứng UX.
- Lint toàn repository có lỗi sẵn trong thư mục công cụ agent; ghi riêng lỗi nền và kết quả kiểm tra ứng dụng, không mở rộng phạm vi thiết kế thành sửa harness.
- Các chức năng hiện tại là điều hướng, form đặt merch bên ngoài, vé chưa mở bán và liên hệ xem trước/email; không có cơ sở để tuyên bố giao dịch hoặc gửi tin thành công.

---
name: plan:reply-199x-retro-redesign
description: "Nâng cấp UI REPLY 199X thành tạp san âm nhạc và cuốn băng ký ức, giữ nguyên nội dung và hành vi."
date: 09-11-26
feature: general
metadata:
  node_type: memory
  type: plan
---
# REPLY 199X — Retro Redesign Plan

**Date**: 09-11-26  
**Complexity**: SIMPLE — một package, một luồng triển khai, một plan.  
**Status**: IMPLEMENTED - source, application gates, and task-local browser QA completed; user visual confirmation remains pending. Keep active; do not archive.

## Overview

Nâng cấp giao diện theo hướng **“Tạp san âm nhạc & cuốn băng ký ức”**: hero có cassette chủ đạo, chữ tiếng Việt rõ dấu, nền giấy tiết chế và nhịp section như một ấn phẩm. Yêu cầu khóa trong [SPEC](reply-199x-retro-redesign_SPEC_09-11-26.md). Người dùng yêu cầu lập plan; tài liệu này chưa cho phép triển khai.

Quick links: [thiết kế](#design-specification), [checklist](#implementation-checklist), [nghiệm thu](#acceptance-criteria), [bằng chứng](#verification-evidence), [handoff](#resume-and-execution-handoff).

## Context Envelope

| Field | Value |
|---|---|
| feature | general |
| phase | PLAN |
| session-goal | Lập kế hoạch nâng cấp UI retro 199x từ hướng đã thống nhất |
| branch | unavailable — workspace chưa có Git repository |
| worktree | D:/SE19C01-DE190318/7.FALL2026/EXE101 |
| context-group | uxui, planning, tests |
| blast-radius-packages | src/styles, src/components, src/app/(routes), task-local QA artifacts |
| active-plan | process/general-plans/active/reply-199x-retro-redesign_09-11-26/reply-199x-retro-redesign_PLAN_09-11-26.md |
| test-runner | npm lint/typecheck/build; task-local agent-browser assertions |
| validate-contract | written — outer-pvl PASS; implementation and UX evidence pending |

## Research and Decision Summary

**Chosen Approach:** Bố cục ấn phẩm âm nhạc Việt với cassette minh họa bằng CSS trong Server Component; tiếp tục bảng màu và font hiện có, dùng bố cục phân vai thay vì thêm thư viện hiệu ứng.

**Why This Over Alternatives:** Một hình chủ đạo và nhịp trang giải quyết hero thiên về chữ cùng các khung lặp. Chỉ chỉnh màu/bóng chưa đủ tạo điểm nhớ. CRT/VHS phủ toàn trang, 3D và chuyển động liên tục tăng nhiễu, công sức và rủi ro đọc trên mobile.

**Risk Predictions:** Dấu tiếng Việt bị cắt; hero/giá/URL gây tràn ngang; ảnh remote lỗi; menu rút gọn làm mất anchor; CSS chung ảnh hưởng trang lỗi và loading.

**Key Constraints Accepted:** Giữ nội dung thương mại và hành vi, logo/poster chính thức, section order/IDs; không thêm dependency/backend; section vẫn SSR, state chỉ tại client leaves; không tuyên bố phục dựng lịch sử chính xác.

Source hiện có chia ownership đúng; không cần di chuyển thư mục. Plan chuyển đổi cũ tại `../reply-199x_09-11-26/reply-199x_PLAN_09-11-26.md` có trạng thái CODE DONE và mục tiêu giữ giao diện nguồn. Đây là follow-up thiết kế riêng: thay thế ràng buộc giữ bố cục cũ, tiếp tục giữ các hợp đồng nội dung/hành vi.

Discovery: context script đã xác định uxui/tests/planning; đã đọc `process/context/all-context.md`, `process/context/uxui/all-uxui.md`, `component-contracts.md`, `process/context/planning/all-planning.md`, `process/context/tests/all-tests.md`. Tests router xác nhận không có doc kiểm thử sâu hơn hoặc test runner ứng dụng. Quét `src` không có test files; có QA script và assertions ở task chuyển đổi cũ.

Plan discovery script lỗi vì gọi Git trong workspace chưa khởi tạo; dùng inventory `rg --files` làm fallback. Situation scanner cũng không đọc được Git và bỏ sót active plans; inventory thực tế xác nhận plan chuyển đổi cũ và SPEC mới. Không suy luận workspace sạch hoặc detached HEAD từ output fallback.

## Goals and Scope

- Màn hình đầu có điểm nhớ cassette, tên chương trình, thông tin sự kiện và CTA rõ.
- Tạo nhịp đọc qua tạp san, lịch, poster, cuống vé, catalogue và phiếu thư.
- Nội dung chính đọc được ở 360/390/768/1280/1440px, bàn phím và reduced motion.
- Toàn bộ giá, ngày, địa điểm, quyền lợi, điều kiện và đích liên kết giữ nguyên.

Không gồm chuẩn hóa cấu trúc/config/harness, thêm ảnh sản phẩm chưa duyệt, backend, Git, deployment, thanh toán hay mở bán vé. Không thay font, thư viện hoặc remote asset URL.

## Design Specification

### Layout, color and typography

- Container chung tối đa 1200px; gutter 20px dưới 640px, 32px từ 640px, 48px từ 1024px. Section padding dọc 56px mobile và 88px desktop; khoảng cách nội bộ dùng bước 8px.
- Giữ token giấy `#FAF3E0`, xanh `#2F4B23`/`#1f3517`, đỏ `#A01300`, vàng `#FFB83F`, mực `#1E1C10` và các màu phụ hiện tại. Giấy là mặt đọc chính; xanh làm chương nhấn; đỏ cho CTA; vàng cho nhãn và chi tiết.
- Epilogue cho heading, Be Vietnam Pro cho body, Space Grotesk cho nhãn; giữ fallback hiện có. Body 16px mobile/18px desktop, line-height 1.6, cột văn bản không quá 65ch; chú thích 12–14px, không dùng chú thích thay nội dung quan trọng.
- Hero h1 36px ở 360–390px, 56px tablet, 64px desktop; line-height 1.18 và letter-spacing tối đa .01em. Hai cụm block cố định “DÒNG CHẢY” / “HOÀI NIỆM”; không đặt overflow hidden sát glyph.
- Chỉ h1 dùng một bóng đỏ lệch 3px; h2 28px mobile/40px desktop không bóng. Nhãn 12px, tracking .08em; không viết hoa paragraph dài.
- Nền body chữ đọc dùng giấy phẳng. Chấm/halftone chỉ trên phần minh họa và mép section, opacity không quá .08; lớp trang trí không nhận pointer events. Border thường 1px, góc 4–8px; offset shadow 3px chỉ CTA/hero art/ticket, không phủ mọi khối.
- CSS mới đặt dưới `.retro-home` hoặc class component rõ tên; thêm class này vào main hiện tại. Giữ token toàn cục và style state-page/Button/Card dùng ở các trang khác.

### Hero and navigation

- Từ 1024px: grid 3fr/2fr, gap 48px; chữ căn trái, cassette bên phải. Dưới 1024px: một cột, chữ/CTA trước hình; bỏ min-height 600/680px hiện có, dùng padding và nội dung tự nhiên.
- Thứ tự DOM: nhãn ngắn “REPLY 199X”, h1, slogan, mô tả ngắn, dải ngày/giờ/địa điểm, CTA chính, liên kết phụ, minh họa. Mô tả hero dùng câu đầu hiện có đến “90s – đầu 2000s”; chuyển nguyên đoạn giới thiệu đầy đủ hiện tại sang About để giữ toàn bộ thông điệp.
- Dải sự kiện đọc trực tiếp `events[1]`, không nhập thêm ngày/địa điểm mới. CTA chính “Xem sự kiện 22/11” → `#su-kien`; phụ “Khám phá hành trình” → `#gioi-thieu`, gạch chân thay nút nền.
- Cassette CSS trong `CassetteArtwork.tsx`: thân giấy ngà, khung xanh, nhãn đỏ “REPLY 199X”, hai cuộn băng, đường băng và nhãn SIDE A/SIDE B. Toàn bộ artwork `aria-hidden`; không mô phỏng audio player. Desktop ngang tối đa 420px, mobile tối đa 280px; không thêm ảnh/network hoặc state.
- Bốn nhãn kỷ vật cũ giữ ở cuối nội dung hero/đầu About, sau CTA; desktop một hàng, mobile wrap. Không dùng absolute art tràn viewport.
- Navbar desktop từ 1280px: logo, bốn link trực tiếp Giới thiệu/Lịch trình/Kỷ vật/Liên hệ, CTA sự kiện, nút “Mục lục”. Disclosure hiện có được dùng ở mọi kích thước và luôn chứa đủ tám `NAV_LINKS`; mobile chỉ logo/CTA/menu, không thêm bộ state thứ hai.
- Giữ ID `mobile-navigation`, aria-controls/expanded, Escape trả focus và chọn link đóng menu/chuyển focus. Header tổng cao 88px; anchor offset thống nhất 112px, menu giới hạn chiều cao viewport và cuộn bên trong.

### Section composition

| Owner | Trình bày khóa cho EXECUTE |
|---|---|
| About | Giấy ngà, grid 5/7 desktop; bên trái intro đầy đủ và khối cassette hiện có, bên phải ba track thành danh sách có đường phân cách, bỏ card viền riêng cho từng track |
| Channels | Khối thông tin kênh gọn trên giấy, hai hàng TikTok/Facebook có divider; giữ trạng thái Facebook chờ và URL TikTok |
| Timeline | Trang lịch: cột ngày nổi bật + cột venue/thông tin, hai hàng nối bằng rule; mobile ngày nằm trên nội dung từng hàng |
| Events | Poster chính thức bên trái, thông tin thời gian/địa điểm/quyền lợi bên phải trong bảng đọc phẳng; khung giấy 12px, không crop nội dung poster; Tickets vẫn nằm trong Events |
| Tickets | Một cuống vé giấy, thông tin và phần trạng thái ngăn bằng đường xé; mobile xếp dọc; “Chưa mở bán” đọc rõ, CTA giữ `#lien-he` |
| Merch | Nền xanh, hai combo như hai trang catalogue có số mục, giá rõ và list vật phẩm; phần sắp cập nhật thành danh sách hai cột desktop/một cột mobile; dùng ký hiệu đơn giản và chữ hiện có, không giả ảnh sản phẩm |
| Process | Ba bước thành danh sách đánh số với rule, desktop ba cột có thứ tự đọc tương ứng, mobile một cột; không đổi thời gian/điều kiện |
| Contact | Giấy phẳng như phiếu thư, thông tin bên trái và form bên phải; nhãn/input không texture, mô tả local preview luôn nằm trước submit |
| Footer | Xanh rừng, typography/spacing đồng bộ, giữ nguyên liên kết và nội dung |

### Interaction and mobile

- Main CTA/menu/form controls ít nhất 44×44px, input/textarea ít nhất 16px. Text link có vùng padding đủ chạm trong nav/list tương tác; focus ring 3px tương phản với nền.
- Mọi nội dung dài/giá/URL được wrap tự nhiên; grid/flex children cho phép co bằng min-width 0. Không che overflow toàn trang để giấu lỗi.
- Ở 360×844 và 390×844, toàn bộ CTA chính hero phải nằm trong viewport đầu khi ở đầu trang, trước artwork; không ép toàn bộ venue dài vào một dòng.
- Hover/press nút chỉ dịch tối đa 2px, transition 180ms; hero art xuất hiện một lần tối đa 300ms và vẫn hiện khi CSS animation không chạy. Không dùng scroll reveal ẩn nội dung, vòng quay băng vô hạn, pulse, âm thanh hoặc VHS noise.
- Giữ reduced-motion override hiện có: animation/transition tắt, scroll auto; nội dung và hành động đầy đủ khi không hydrate hoặc font/ảnh remote lỗi.

## Touchpoints

| Action | Exact paths |
|---|---|
| Modify theme/layout | `src/styles/globals.css`; `src/app/(routes)/page.tsx` |
| Modify shell | `src/components/Navbar.tsx`; `src/components/Footer.tsx` |
| Modify sections | `src/app/(routes)/_components/HeroSection.tsx`, `AboutSection.tsx`, `ChannelsSection.tsx`, `TimelineSection.tsx`, `EventsSection.tsx`, `TicketsSection.tsx`, `MerchSection.tsx`, `ProcessSection.tsx`, `ContactSection.tsx` |
| Modify presentation only | `src/app/(routes)/_components/ContactForm.tsx` — class/layout only; leave validation/state/mailto logic intact |
| Add artwork | `src/app/(routes)/_components/CassetteArtwork.tsx` — route-private Server Component |
| Read only | `_data/home.ts`, `_types/home.ts` under route; `src/lib/constants.ts`; `RemoteImage.tsx`; route/root layouts; Button/Card and loading/error/not-found pages; original reference HTML |
| Execution evidence | This task folder: `browser-qa.ps1`, `browser-content-assertions.js`, `browser-layout-assertions.js`, `browser-qa-results.json`, screenshots and `reply-199x-retro-redesign_REPORT_09-11-26.md` |

## Public Contracts

Không thêm API, props công khai, schema hoặc persistence. `page.tsx` tiếp tục một main `main-content`, một h1; route layout duy nhất sở hữu Navbar/Footer; section giữ server rendering. Data đi từ typed arrays hiện có tới section; hero đọc `events[1]`; phần minh họa chỉ trang trí. Client state còn ở Navbar, ContactForm và RemoteImage.

Giữ thứ tự: Hero → `gioi-thieu` → `kenh-truyen-thong` → `timeline` → `su-kien` chứa `ve` → `merch` → `quy-trinh` → `lien-he`. Giữ mọi ID và tám NAV_LINKS. Giữ Google Forms/TikTok/mailto, rel bảo vệ tab mới, Facebook pending, vé chưa bán, preview chưa gửi/lưu, edit giữ dữ liệu. Không thay giá combo 99.000/169.000, giá gốc, thời hạn ưu đãi, venue, quyền lợi hoặc các con số khác trong nội dung nguồn.

## Blast Radius

Một npm package; 15 source files: 14 sửa và 1 artwork mới, cộng task-local QA/evidence. Rủi ro trung bình về hồi quy giao diện; không thuộc auth/billing/schema/API/runtime/secrets high-risk classes. Config, package manifests, lockfile, dữ liệu và harness ngoài phạm vi. CSS shared cần kiểm tra các trang state mặc dù không sửa source của chúng.

## Implementation Checklist

Các bước dưới đây là trình tự của một delivery, không phải chương trình nhiều phase.

1. [x] Ghi baseline trước sửa vào REPORT: copy nội dung/thương mại/URLs và tám target; lưu ảnh 1440/390 cùng trạng thái ảnh hiện có; sao lưu đúng 14 file sẽ sửa trong vùng tạm ngoài source, ghi đường dẫn khôi phục.
2. [x] Tạo ba QA files trong task folder dựa script cũ; cập nhật output path và assertions theo thiết kế mới, giữ checks nội dung/menu/form/fallback. Ghi các assertion mới chưa đạt trên baseline; không dùng khác biệt pixel với giao diện cũ làm gate.
3. [x] Thêm `.retro-home` vào main trong `page.tsx`; chuẩn hóa CSS scoped trong `globals.css` theo font/spacing/texture/shadow/motion đã khóa; giữ base styles ngoài homepage. Chạy scoped lint/typecheck.
4. [x] Thêm `CassetteArtwork.tsx` theo cấu tạo CSS đã định, không state/assets mới; gắn vào Hero, kiểm tra art không tràn ở 360px.
5. [x] Sửa `HeroSection.tsx` theo split grid/DOM order/CTA/event strip; chuyển mô tả đầy đủ sang `AboutSection.tsx`, giữ toàn bộ nội dung. Kiểm tra CTA nằm trong màn hình đầu mobile.
6. [x] Sửa `Navbar.tsx` theo bốn link + full disclosure mọi breakpoint; giữ menu ID/state/Escape/anchor focus. Kiểm tra đủ tám link trong disclosure tại 390 và 1440.
7. [x] Sửa `AboutSection.tsx` và `ChannelsSection.tsx` thành tạp san/danh sách có divider; không đổi tracks và trạng thái kênh. Kiểm tra content assertions và chữ tiếng Việt.
8. [x] Sửa `TimelineSection.tsx` thành lịch, `EventsSection.tsx` thành poster/bảng thông tin; giữ source asset, ratio và fallback, giữ Tickets lồng trong Events.
9. [x] Sửa `TicketsSection.tsx` thành cuống vé co giãn; kiểm tra trạng thái chưa mở bán và notification anchor, không thêm hành vi mua vé.
10. [x] Sửa `MerchSection.tsx` thành catalogue với giá/vật phẩm/điều kiện và external CTAs nguyên vẹn; không dùng ảnh hàng hóa chưa có. Kiểm tra cả combo lẫn mục sắp cập nhật.
11. [x] Sửa `ProcessSection.tsx`, `ContactSection.tsx`, class trình bày `ContactForm.tsx` và `Footer.tsx`; giữ field names/labels/status/validation/preview/edit/mailto. Chạy form/menu regression ngay sau bước này.
12. [x] Chạy npm check, tách riêng lỗi harness nếu tồn tại; scoped lint + typecheck + build phải xanh. Chạy tuần tự các lệnh ghi `.next`; không build trong lúc dev/server cũ dùng chung output.
13. [x] Chạy QA năm chiều rộng, mobile hero 844px, keyboard/anchor/form, ảnh lỗi, reduced motion và state-page smoke; sửa mọi fail trong phạm vi rồi chạy lại gate bị ảnh hưởng.
14. [ ] Evidence and agent visual review are recorded for AC1-AC3/AC5/AC7; user visual confirmation remains pending. Keep active until that hybrid acceptance is complete; do not archive/commit/deploy.

## Acceptance Criteria

Các AC giữ nguyên nghĩa và ID trong SPEC. Các gate kết hợp được phân loại Hybrid theo SPEC; bảng Evidence tách phần tự động và phần cần judgment.

| Criterion | Điều kiện nghiệm thu của plan | proven by: | strategy: |
|---|---|---|---|
| AC1 | Ngôn ngữ tạp san/cassette, palette cũ, focal point rõ và trang trí tiết chế | G6 visual art review + screenshots G3 | Hybrid |
| AC2 | Hai cụm h1 rõ dấu, CTA/event strip có phân cấp; mobile CTA trước art và trong viewport đầu | G2 CTA/content + G3 hero geometry + G6 | Hybrid |
| AC3 | Heading/body dễ đọc; section có nhịp khác nhau, thứ tự giữ nguyên | G2 order + G6 typography/full-page review | Hybrid |
| AC4 | Năm chiều rộng không overflow/cắt; main targets 44px, inputs 16px, menu dùng được | G3 responsive geometry + G4 menu assertions | Fully-Automated |
| AC5 | Đủ destinations, header không che anchor, keyboard/focus và aria menu đúng | G2 links + G4 keyboard/anchor + G6 focus review | Hybrid |
| AC6 | Toàn bộ nội dung thương mại/URLs/trạng thái và preview/edit giữ nguyên | G2 immutable content + G4 form regression | Fully-Automated |
| AC7 | Official image fallback đọc được, reduced motion đủ nội dung, không autoplay/noise | G5 failure/motion assertions + G6 fallback/motion review | Hybrid |

## Verification Evidence

| Gate / Scenario | Strategy | Proves SPEC criterion |
|---|---|---|
| G1 — `npm.cmd run check`; nếu chỉ harness lỗi, ghi đầy đủ baseline rồi `npx.cmd eslint src --max-warnings=0`, `npm.cmd run typecheck`, `npm.cmd run build` tuần tự, tất cả application gates exit 0 | Fully-Automated | AC1–AC7: chất lượng kỹ thuật hỗ trợ, không tự chứng minh UX |
| G2 — task-local browser-content-assertions: 1 main/h1; ordered IDs; NAV targets; exact values/conditions/URLs/asset sources so với baseline/reference; hero links đúng và full intro vẫn hiện trong About | Fully-Automated | AC2, AC3, AC5, AC6 |
| G3 — task-local browser-layout-assertions: widths 360/390/768/1280/1440, document scrollWidth ≤ clientWidth+1; quan trọng không clipped; targets ≥44px, inputs ≥16px; hero CTA bottom ≤844 ở 360/390×844; screenshots mỗi width | Fully-Automated | AC2, AC4 |
| G4 — task-local QA: menu open/close/Escape focus/all 8 links desktop/mobile; từng anchor clear header; skip link; form empty/invalid/valid/edit, values retained, polite unsent status, encoded mailto | Fully-Automated | AC4, AC5, AC6 |
| G5 — task-local QA: kích hoạt image error cho logo/poster; fallback có text/ratio; emulate reduced motion rồi kiểm tra style/content/link accessibility; không audio/video autoplay/perpetual pulse | Fully-Automated | AC7 |
| G6 — xem screenshots hero/full-page tại năm widths, đọc dấu tiếng Việt và focus, xem motion thường/reduced và fallback; user duyệt nghệ thuật | Hybrid | AC1, AC2, AC3, AC5, AC7 |
| G7 — mở trang not-found và quan sát loading/error qua source owners và browser khi có thể kích hoạt an toàn; generic Button/Card/state typography không chịu CSS homepage | Agent-Probe | AC1, AC3, AC4: hồi quy vùng shared CSS |

Lệnh QA dự kiến sau khi có server đúng bản: `powershell -NoProfile -ExecutionPolicy Bypass -File process/general-plans/active/reply-199x-retro-redesign_09-11-26/browser-qa.ps1 -BaseUrl http://localhost:3001`. Script kế thừa runner agent-browser từ task cũ, chuẩn bị session/CDP và output trong task mới; kiểm tra exit/JSON pass của mọi assertion. Port/session là precondition cần xác minh ở EXECUTE, không giả định session cũ còn sống.

Baseline đã biết: port 3000 có production server của workspace. Không kill process theo port; xác minh ownership và dùng dev port 3001 nếu trống. Để build/typegen an toàn với `.next`, phối hợp dừng đúng server workspace trước khi thay output hoặc chạy QA production sau build; ghi actual URL/command vào REPORT.

## Test Coverage Plan

Đã load đầy đủ test router (không có downstream docs), khám phá src không có suite; runner khả dụng là npm gates và browser assertions cũ. Không thêm framework chỉ để test chỉnh UI.

| Area | Tier | Command / Steps | Proves | Does NOT prove |
|---|---|---|---|---|
| Source/styles | Fully-Automated | G1 commands, exit 0 | lint/type/build | cảm nhận retro |
| Content/nav/form/responsive | Fully-Automated | task-local QA command; G2–G5 JSON tất cả pass | hành vi quan sát được và geometry | giao dịch/mail delivery |
| Art/typography/imagery | Hybrid | G3 screenshots + G6 duyệt trực quan và user confirmation | hierarchy/legibility theo brief | lịch sử chính xác, asset rights |
| Shared state surfaces | Agent-Probe | G7 browser/source smoke có ghi kết quả và giới hạn | phát hiện style bleed | tất cả runtime error paths |

TDD scenario targets ở bước 2: hero CTA within first mobile viewport; all eight disclosure destinations accessible on desktop/mobile; immutable content survives layout; input and touch sizes; fallback/reduced-motion. Ghi kết quả baseline trước sửa, sau sửa chạy lại; không chèn failing test skeleton vào source hoặc plan.

Residual: chưa có CI browser runner. Giải pháp chọn là QA script trong task sử dụng công cụ đã có; nếu không khởi chạy được browser thì G2–G6 còn CONDITIONAL, không PASS nhờ build. Không có developed behavior nào được coi đạt bằng Known-Gap. Nếu cần infra ngoài scope, báo orchestrator để chọn setup hoặc follow-up thay vì bỏ gate. Fulfillment/email delivery/asset rights ngoài phạm vi, không phải tiêu chí giả định đã chứng minh.

## Dependencies, Risks and Rollback

- Trình tự: baseline/assertions → scoped theme/art → hero/nav → sections → quality gates → browser evidence → user review. Không có dependency package/asset mới; dùng CSS artwork và catalogue chữ khi chưa có ảnh.
- Dấu tiếng Việt: đủ line-height/overflow, giảm shadow; đọc cả font loaded và fallback. Mobile venue/price: wrap và min-width 0, không ép scale chữ quá nhỏ.
- Ảnh remote: giữ URL/dimensions/RemoteImage logic; kiểm tra cả successful load và lỗi. Không sửa poster chính thức để khớp khung.
- Content regression: baseline + reference và G2, không tin chỉ screenshot. Menu simplification: disclosure đủ tám links ở mọi width; không bỏ các mục phụ.
- CSS bleed: scope homepage, chỉ thay global token khi giữ giá trị, G7 kiểm tra state owners. Không đánh dấu G7 full runtime coverage nếu error state chưa kích hoạt.
- Rollback: workspace không Git; tạo backup trước sửa, ghi manifest chính xác trong REPORT. Khi cần khôi phục chỉ các file thay đổi bởi task từ backup, bỏ artwork mới sau xác minh không có sửa của người khác; không reset toàn workspace. Giữ evidence để so sánh.

## Phase Completion Rules

PLANNED → CODE DONE khi source xong → TESTING khi có checks → VERIFIED chỉ khi automated gates xanh, browser flows/failure cases được ghi, visual review hoàn tất và **user confirmed**. Không database/storage verification vì không thêm persistence. External order/mail delivery vẫn ngoài phạm vi.

Thiếu browser, ảnh lỗi chưa được kiểm tra hoặc chưa có User Confirmation giữ gate CONDITIONAL và task active. Mọi failure liên quan plan phải sửa/chạy lại trước khi báo DONE; lint harness có sẵn ghi riêng, không tính là đạt full-repo lint.

## Test Infra Improvement Notes

Không có app test runner/CI browser suite; dùng và mở rộng QA scripts task trước trong task mới. VALIDATE cần khóa preconditions browser, selectors và output assertions; chưa có infra improvement nào được triển khai. Không sửa harness ESLint trong scope này.

## Resume and Execution Handoff

- Selected plan: `process/general-plans/active/reply-199x-retro-redesign_09-11-26/reply-199x-retro-redesign_PLAN_09-11-26.md`.
- Locked SPEC: `reply-199x-retro-redesign_SPEC_09-11-26.md` cùng thư mục; AC1–AC7 là nguồn nghiệm thu.
- Last completed phase/step: VALIDATE completed; implementation checklist chưa bắt đầu.
- Validate-contract status: written, PASS; execution authorized by user “triễn khhai”.
- Supporting context loaded: all-context; uxui/all-uxui + component-contracts; planning/all-planning; tests/all-tests; plan-lifecycle; vc-generate-plan contract/examples; source/config và QA cũ.
- Next fresh-agent step: đọc plan/SPEC và contract, refresh source/runtime ownership, triển khai checklist từ baseline với đúng selected path. User execution approval already recorded; no repeat approval needed.
- Report destination: `reply-199x-retro-redesign_REPORT_09-11-26.md` cùng thư mục. Evidence: `app-{width}.png`, `app-full.png`, `hero-mobile-{width}.png`, `focus.png`, `image-fallback.png`, `browser-qa-results.json` và command logs, tất cả cùng task folder; không ghi đè evidence cũ.
- Cursor Plan mode dùng checklist này; bước tiếp theo là EXECUTE theo authorization hiện có. Không tự archive/commit/deploy.

## Validate Contract

Status: PASS
Date: 09-11-26
date: 2026-11-09
generated-by: outer-pvl
Parallel strategy: sequential
Rationale: One package and one implementation stream; independent validation roles ran in bounded parallel batches, source edits remain under one execution owner. No high-risk auth/schema/billing/API surface.

### Validation Scope and Authorization

Validated the selected redesign plan and sibling SPEC AC1–AC7. The user's “triễn khhai” authorizes implementation of this concrete plan and necessary preflight; the parent orchestrator instructed proceeding without another ceremonial confirmation. This contract validates feasibility and required proof, not that the unimplemented UI already passes.

Context: root router, uxui router/component contracts, planning router, tests router (no deeper testing docs), current source, earlier QA files, and current runtime probes. Context discovery matched uxui/tests. Plan discovery failed because no Git repository exists; `rg --files` verified the actual active inventory. Situation scanner's empty/clean/detached fallback is not Git evidence.

### Dimension Findings

- Infra setup-fit: PASS — Node 22.22.0, npm.cmd and agent-browser.cmd available; HTTP localhost:3000 returns 200, CDP9333 responds Chrome156. Agent-browser `--session reply-preflight --cdp 9333 --json open http://localhost:3000` succeeded with the REPLY 199X title. Independent elevated read-only CIM identifies PID12248 as this workspace's next start on port3000; recheck ownership before stopping anything.
- Test coverage: PASS — declared npm gates and reusable task-local browser scripts cover all ACs once execution implements the precise updates below. No new framework required. The browser checks have not been run against a redesign yet.
- Breaking changes: PASS — IDs, order, nested tickets, NAV_LINKS, immutable event/merch facts, external URLs, RemoteImage and local form semantics remain unchanged; CSS scope and focus behavior are explicit constraints.
- Security surface: PASS — bounded vc-security review found no critical/high issue in the touched flow; keep React escaping, native validity, encoded fixed-recipient mailto, noopener noreferrer, and no network/storage/API additions.
- Single-delivery section feasibility: PASS — all existing targets resolve, proposed CSS artwork/new QA files are intentional creates, cassette can SSR, typed concert facts exist. Hero/nav/section/theme changes are mechanically feasible with responsive measurements during execution.

All four independent role findings and the delivery-feasibility finding were supplied through the root orchestrator. Findings originally raised as concerns are resolved by the mandatory constraints below, rather than silently waived. No unresolved FAIL or CONCERN remains at pre-implementation feasibility level.

### Mandatory Execution Constraints

1. Runtime ownership: recheck PID/path before stopping the old workspace server. Never kill by port alone. Coordinate stopping that server before typegen/build writes its `.next`; run typegen and build sequentially. After build use an explicitly verified-free port (3001 if available) and record actual launch command/URL.
2. Content: retain the complete original hero description in About and all other commercial/source strings. Select concert by stable `id === "concert"` with an explicit invariant rather than silently relying on array position; keep data files read-only. Normalize heading whitespace in assertions because block spans may concatenate textContent.
3. Header: current height is 90px (6+80+4), not 88px. If adopting planned88px, coordinate actual header height/main top padding. Use one effective anchor offset; current scroll-padding and scroll-margin are both110px and must not accidentally double the intended112px. Verify actual anchor top against header bottom for every destination.
4. Disclosure: remove desktop-hiding rules from both menu button and disclosure; preserve one open state and `hidden` authority, aria-controls/expanded, Escape focus return and destination focus. Use a general accessible menu label. Header/footer are outside `.retro-home`; style them through explicit component-specific classes.
5. Preserve ContactForm validation/reset-on-input, names/IDs/descriptions/live status, preview heading focus, edit/name focus, retained values and encoded email action. Presentation-only changes cannot report sending or saving. Keep RemoteImage dimensions, source URLs, fallback aspect ratio and classes working on its span fallback too.
6. Layout: min-width0 for grid children, art max-width100%, natural content wrapping. Treat36px/64px title sizes as planned starting values; actual Vietnamese glyphs/fallback fonts and CTA geometry must pass at360/390×844 without hiding overflow or shrinking readable text.
7. QA adaptation: old first-header-nav eight-link assertion is obsolete for the new four-link direct nav. Assert all eight destinations in `#mobile-navigation`, open/visible/reachable at390 and1440. Add mobile primary CTA bottom≤844, artwork after CTA, primary targets≥44px, inputs≥16px, no important clipping and all anchor offsets.
8. Image failures: synthetic error events prove React fallback rendering only. Label that evidence truthfully; use aborted image requests plus reload if claiming network-failure coverage. Reduced-motion checks must verify actual computed styles/content, not just absence of old pulse classes.
9. Shared states: browser-test not-found; inspect error/loading owners and trigger only when safe. Report exact limits; source review alone is not full runtime proof. Preserve generic Button/Card/state typography by avoiding broad overrides.

### Test Gates

| criterion id | behavior | strategy | proving test | gap-resolution |
|---|---|---|---|---|
| AC1–AC7 support | App lint, types and production compilation | Fully-Automated | `npm.cmd run check`; record baseline harness-only errors separately, then `npx.cmd eslint src --max-warnings=0`, `npm.cmd run typecheck`, `npm.cmd run build`, sequential exit0 required | B — execution runs existing gates |
| AC2, AC3, AC5, AC6 | Content, ordered fragments, destinations and retained full intro | Fully-Automated | Task-local browser-content-assertions.js invoked by QA script, adapted for whitespace and exact immutable content | B — extend reusable assertions |
| AC2, AC4 | Responsive geometry, touch/input sizes and mobile CTA position | Fully-Automated | Task-local browser-layout-assertions.js at360/390/768/1280/1440; mobile360/390×844; command below | B — add specified geometry checks |
| AC4, AC5, AC6 | Desktop/mobile menu, keyboard/anchors, empty/invalid/valid/edit form | Fully-Automated | Task-local browser-qa.ps1 scenarios, all checks true and nonzero exit on failures | B — extend old runtime scenarios |
| AC7 | Fallback/reduced-motion content and style behavior | Fully-Automated | QA synthetic-error fallback or real request-abort scenario with truthful evidence label; emulate reduced motion and assert computed styles/readability | B — adapt old failure checks |
| AC1, AC2, AC3, AC5, AC7 | Art direction, Vietnamese legibility, focus and motion/fallback quality | Hybrid | Five-width screenshots plus direct visual inspection, normal/reduced-motion review and user visual confirmation after implementation | B — capture and review during execution |
| AC1, AC3, AC4 support | Shared CSS/state-page regression | Agent-Probe | Not-found browser smoke plus error/loading source/runtime review with exact limits recorded | B — perform scoped review |

gap-resolution legend: A proven now; B gate implemented/run in this plan; C deferred to named follow-up; D named backlog residual. No developed behavior is accepted on Known-Gap alone. No C/D behavior waiver applies here.

Automated scenario stubs below are documentation-only targets for the task-local runner, not a new test framework or passing evidence:

```js
test("app quality gates exit zero", () => { throw new Error("NOT IMPLEMENTED — TDD stub: run app lint/types/build") });
test("immutable content and fragments survive redesign", () => { throw new Error("NOT IMPLEMENTED — TDD stub: content assertions") });
test("five widths and first-screen mobile CTA fit", () => { throw new Error("NOT IMPLEMENTED — TDD stub: responsive geometry") });
test("desktop mobile menu and local form regressions pass", () => { throw new Error("NOT IMPLEMENTED — TDD stub: interaction assertions") });
test("fallback and reduced motion remain readable", () => { throw new Error("NOT IMPLEMENTED — TDD stub: failure preference assertions") });
```

Legacy line form:
- Application quality: Fully-automated: scoped lint, typecheck, build commands above.
- Browser behavior: Fully-automated: `powershell -NoProfile -ExecutionPolicy Bypass -File process/general-plans/active/reply-199x-retro-redesign_09-11-26/browser-qa.ps1 -BaseUrl http://localhost:3001` after task-local scripts exist and correct built server/CDP/session preconditions are confirmed.
- Visual design: hybrid: browser screenshots plus visual review; user confirmation remains outstanding until the actual UI is shown.
- Shared states: agent-probe: runtime not-found and scoped error/loading inspection.

### What This Coverage Does NOT Prove

- Lint/types/build do not prove visual design, runtime interactions, remote assets or external transactions.
- Browser content assertions do not prove current organizer facts, asset rights, external Google Form fulfillment or email delivery.
- Responsive geometry does not prove every device/font/browser or subjective art quality.
- Form/menu checks prove observed local behavior only, not persistence, sending, ticketing or purchasing.
- Synthetic image errors do not prove a real request outage; actual abort/reload must be recorded separately when performed. Motion preference checks do not replace direct inspection.
- Visual screenshots/review do not replace automated interactions; user aesthetic approval is still an execution acceptance item.
- Not-found/source smoke does not prove all error/loading runtime paths.

Open gaps: none at feasibility level; execution gates and user visual acceptance remain pending, not falsely marked proven.
Gate: PASS — no unresolved feasibility FAILs/CONCERNs; mandatory mitigations recorded.
Accepted by: user implementation instruction “triễn khhai”; parent orchestrator authorized necessary preflight and execution. No substantive missing-proof waiver was requested or assumed.

## Autonomous Goal Block

```text
SESSION GOAL: Implement the selected REPLY199X retro redesign plan and record honest quality/browser evidence.
Selected plan: process/general-plans/active/reply-199x-retro-redesign_09-11-26/reply-199x-retro-redesign_PLAN_09-11-26.md
Autonomy rules: User authorized implementation; complete reversible scoped edits and checks without repeated approval. Follow inline Validate Contract and preserve others' work.
Hard stops: No invented commercial facts, backend/dependencies, deployment, commits or unrelated destructive changes; do not waive failed application gates.
Next phase: EXECUTE, then scoped review and visual handoff; UPDATE PROCESS remains a separate requested phase.
Contract summary: Feasibility PASS; source/content/links/interaction contracts preserved; sequential .next writers, five-width browser QA and truthful fallback evidence required.
Execute start command: Resume the selected plan's Implementation Checklist from baseline using the inline contract.
```

This is a stored handoff block only; no active goal tool or autonomous scheduled task was created.

## Strategy Recommendation

Score 1/7: S1=0, S2=0, S3=0 (đã chọn một hướng), S4=0, S5=0, S6=0, S7=1 (15 source files). PLAN dùng một agent tuần tự để giữ ownership một artifact; không spawn thêm.

| Option | Agent math / cost guard | Fit for next VALIDATE |
|---|---|---|
| Sequential | 1 validator điều phối; fan-out bắt buộc của VALIDATE tính riêng | Recommended: một plan, một luồng phối hợp |
| Parallel subagents | 4 dimension agents + N section feasibility theo validator; không tự spawn tại PLAN | Chỉ dùng cho checks độc lập bắt buộc của VALIDATE |
| Workflow | P×A×I; không cần pipeline mới cho một artifact | Overhead không cần thiết |
| Agent team | M×R; chỉ cần nếu có nhiều workstreams cần trao đổi trực tiếp | Chưa có nhu cầu phối hợp live |

Không có cost guard >30 agents tại PLAN (1 agent); validator tính count thực tế trước fan-out. Giữ model session hiện hành. Artifact validator là gate tài liệu, không thay thế VALIDATE về tính khả thi hoặc kiểm thử UI.

---
name: plan:channels-radio-section
description: "Thiết kế lại mục 'Bắt sóng ký ức' (id kenh-truyen-thong) thành radio để bàn thập niên 90 với 4 kênh cộng đồng, một Client leaf tương tác, CSS tiền tố .radio-*, và mở rộng Footer với Facebook/Instagram/Zalo"
date: 18-11-26
feature: none
---

# PLAN — Mục "Bắt sóng ký ức" thành radio 4 kênh (kèm mở rộng Footer)

**BLUF:** COMPLEX-nhẹ (một lần EXECUTE tuần tự, opus, 13 bước). Vỏ section là Server Component; chỉ `ChannelsRadio.tsx` là Client leaf (state kênh đang chọn). Dữ liệu ở `_data/channels.ts`, kiểu ở `_types/channels.ts`, CSS tiền tố `.radio-*` thêm vào `globals.css` và xóa CSS thẻ kênh cũ. `src/components/Footer.tsx` được mở rộng thêm liên kết Facebook (bỏ khi null), Instagram, Zalo cạnh TikTok và Merch. Không đụng `src/lib`, `src/app/api`, `supabase`, `scripts`, `.env*`, file đặt phiếu nước. Không sửa `layout.tsx` (Lobster và Nunito đã tải cục bộ, xem D1).

Status: CODE DONE (EXECUTE 2026-11-18; chờ vc-tester EVL và chủ repo duyệt hình; KHÔNG phải VERIFIED)
Date: 18-11-26
Complexity: COMPLEX (nhiều file mới, CSS dày, bẫy đặc thù CSS toàn cục, Footer dùng chung mọi route; không cần phase program)
TL;DR: 12 file mới, 4 file nguồn sửa (`ChannelsSection.tsx`, `brief.ts`, `globals.css`, `Footer.tsx`) + 2 tài liệu; 9 gate (G1–G9, kể cả G1b); mọi quyết định của chủ repo đã chốt, không còn gì chặn EXECUTE.

## Current Execution State
- Last updated: 2026-11-18
- Bước hiện tại: EXECUTE xong checklist 1–13 (CODE DONE); tiếp theo: EVL (vc-tester chạy lại G1–G9), rồi chủ repo duyệt ảnh G7 trong thư mục task
- Validate-contract: written (2026-11-18, Gate: PASS)
- Report EXECUTE: `channels-radio-section_REPORT_18-11-26.md` (cùng thư mục)
- Quyết định chủ repo đã nhận (2026-11-18): (1) GIỮ `brief.channels/tiktok/facebook`; (2) MỞ RỘNG `Footer.tsx` thêm Facebook, Instagram, Zalo; (3) dùng lại font cục bộ Reply Lobster/Nunito, `layout.tsx` không đổi.
- Không có SPEC riêng: bản brief của chủ repo (trong tin nhắn giao việc) cùng các quyết định trên là yêu cầu khóa; các tiêu chí AC1–AC14 bên dưới là bản dịch có kiểm chứng của brief.

## Overview
Brief gốc viết cho một file HTML đơn; repo này là Next.js 16 App Router + Tailwind v4 + CSS tùy chỉnh trong `src/styles/globals.css`. Phần dịch:
- Server shell `ChannelsSection` giữ `<section id="kenh-truyen-thong">`, vị trí trong `page.tsx` (sau AboutSection, trước TimelineSection) và phần đầu mục (eyebrow, H2, đoạn dẫn).
- Client leaf `ChannelsRadio` nhận `channels` qua props (mảng thuần dữ liệu, không hàm, không component) nên test được ca "Facebook null".
- Icon thương hiệu là SVG inline một màu, tra theo `iconId` chuỗi trong `RadioBrandIcon` (Server không truyền component qua ranh giới client).
- Không ảnh, không dependency mới, CSS thuần cho hình radio.
- `Footer.tsx` (Server, dùng chung) thêm ba liên kết kênh từ cùng nguồn `projectLinks`.

Bối cảnh đã đọc: `all-context.md`, `uxui/all-uxui.md`, `uxui/component-contracts.md`, `tests/all-tests.md`, `plan-lifecycle.md`, `ChannelsSection.tsx`, `brief.ts`, `layout.tsx`, `Footer.tsx`, `page.tsx`, `globals.css` (dòng 1–60, 127–146, 138–265, 427–437, 740–881).

## Phát hiện nghiên cứu ảnh hưởng thiết kế (đã xác minh trong repo)
1. `globals.css` đã khai báo `@font-face` cục bộ "Reply Lobster" (`/fonts/Lobster-Regular.ttf`) và "Reply Nunito" (`/fonts/Nunito-Variable.ttf`, trọng số 200–1000), file có thật trong `public/fonts/`. Brief yêu cầu `next/font/google` nhưng hai font này đã được tải; thêm lần nữa sẽ tải trùng và có nguy cơ đổi font mục khác. Quyết định D1 (chủ repo xác nhận): dùng lại hai font cục bộ, không sửa `layout.tsx`.
2. CSS toàn cục thắng class đơn: `.reply-site h2` (lowercase, `letter-spacing:-.025em`, `::first-letter`), `.reply-site>section` (padding-block 88px, mobile 60px, `background-image:none`), `.reply-site :is(a,button){min-height:44px}`, `.reply-site :is(a,button):focus-visible` (outline đỏ, độ đặc hiệu 0,2,1), `.reply-site .font-space`, `.reply-site p{line-height:1.75}`. Vì vậy mọi luật radio phải đặt dưới `.reply-site>.radio-section` hoặc `.radio-section .radio-x`, và vòng focus vàng phải là `.radio-section .radio-key:focus-visible` (0,3,0) mới thắng.
3. CSS thẻ kênh cũ cần gỡ. Số dòng đã đọc lại và khớp trên bản `globals.css` 881 dòng ngày 2026-11-18; EXECUTE vẫn phải đọc lại số dòng thật trước khi sửa và sửa từ dưới lên trên (hoặc theo nội dung) để số dòng không trôi:
   - Dòng 140 là dòng DÙNG CHUNG: `#kenh-truyen-thong .items-start.justify-between,#kenh-truyen-thong .pt-4.border-t-2,#merch .items-start.justify-between,#merch .mt-8.pt-4,#ve .items-center.justify-between { flex-wrap:wrap; }`. Chỉ cắt hai selector `#kenh-truyen-thong` ở đầu, GIỮ `#merch .items-start.justify-between,#merch .mt-8.pt-4,#ve .items-center.justify-between { flex-wrap:wrap; }`. Dòng 141 (`#kenh-truyen-thong .pt-4.border-t-2>span {...}`) xóa hẳn.
   - Dòng 260–271: toàn bộ khối `.reply-channels*`/`.reply-channel*` cũ (12 dòng, không phải 260–263) xóa hẳn.
   - Dòng 747–793: khối "Social channels" (comment ở 747, kết thúc bằng `}` ở 793) xóa hẳn.
   - Dòng 834: chỉ cắt mảnh `.reply-channels h2 { font-size:36px; }` (cùng dòng với `.reply-section-heading` và `.reply-site h2`, giữ phần còn lại).
   - Dòng 836: bộ selector chung `.reply-channels>.reply-shell>div:first-child,.reply-merch>.reply-shell>div:first-child,.reply-process>.reply-shell>div:first-child`: chỉ cắt selector `.reply-channels>.reply-shell>div:first-child,` ở đầu, GIỮ hai selector merch/process và phần thân luật.
   - Dòng 837: toàn bộ dòng (`.reply-channels__grid`, `.reply-channel`, `.reply-channel--soon`, `.reply-channel h3`) xóa hẳn.
4. `brief.channels`, `brief.tiktok`, `brief.facebook` chỉ dùng trong `ChannelsSection.tsx` (grep xác nhận). Chủ repo quyết định GIỮ: plan không xóa khóa nào; sau khi radio dùng câu chữ mới, ba chuỗi này không còn được dùng nhưng nằm yên trong `brief.ts`. Câu chữ khác brief mới; brief mới thắng cho mục này.
5. `Footer.tsx` (Server, `src/components/`, không có test hiện có, `ls src/components/*.test.tsx` rỗng) hiện import `projectLinks.tiktok`/`merch` và có hàng nút `div.flex.items-center.gap-3` với hai liên kết (TikTok với glyph `▶`, Merch với glyph `♧`). Theo quyết định chủ repo, `Footer.tsx` ĐƯỢC SỬA (E6). `ContactSection.tsx` và `MerchSection.tsx` cũng đọc `projectLinks`: thêm khóa `zalo` không làm hỏng chúng nhưng phải giữ kiểu `Readonly<{...}>` khớp. Footer render qua `(routes)/layout.tsx` nên xuất hiện ở MỌI route trong nhóm `(routes)`, gồm trang chủ và `/payment/return`.
6. CSS Footer hiện có: `.reply-footer a { min-height:44px; display:inline-flex; font-size:11px; ... }` (dòng 432); vòng focus vàng `footer a:focus-visible { outline-color:#FFB83F; }` (dòng 29); luật `footer .flex.items-center.gap-3 { flex-wrap:wrap; justify-content:center; }` (dòng 146) chỉ nằm trong `@media(max-width:639px)` (dòng 137), tức chỉ wrap dưới 640px; từ 640px trở lên hàng nút không wrap. Với 5 liên kết, dải 640–1023px (đặc biệt 768–1023px nơi hàng này nằm cạnh khối tiêu đề trong `md:flex-row`) sẽ tràn, nên hàng phải tự wrap ở MỌI độ rộng bằng class Tailwind (`flex-wrap`, `min-w-0`), không dựa vào dòng 146.
7. Hạ tầng test sẵn: Vitest + jsdom (header `// @vitest-environment jsdom` theo `TicketRequestDialog.test.tsx`), `@testing-library/user-event ^14.6.10`. jsdom không có `matchMedia` ⇒ reduced-motion không test được bằng Vitest (xem chiến lược AC9). `brief.ts` là module hằng số, nên ca "Facebook null" của Footer phải dùng `vi.mock` với factory.
8. Quy tắc từ ngữ: repo dùng "phiếu nước", không bao giờ "vé" (`projectLinks.tickets`, id `#ve` là tên kỹ thuật cũ, không chạm). Văn bản radio và nhãn Footer không chứa từ "vé".
9. Không có liên kết nội bộ nào trỏ tới `#kenh-truyen-thong` hiện nay: `NAV_LINKS` (`src/lib/constants.ts`) không có mục này, `grep -rn "#kenh" src` rỗng ngoài `globals.css`. Anchor chỉ giữ cho liên kết sâu bên ngoài.

## Quyết định kỹ thuật (đã chốt, không để EXECUTE tự sáng tạo)
- D1 Font: dùng `"Reply Lobster"` (tiêu đề H2, bảng hiệu, tên kênh đang phát) và `"Reply Nunito"` (mọi thứ khác) đã có; không `next/font`, không sửa `layout.tsx`. Phạm vi font chỉ nằm trong `.radio-section`.
- D2 Một DOM, hai bố cục bằng CSS (breakpoint 768px). Không render hai bản ở JS (tránh trùng nút, trùng role, test sai). Phần chỉ-desktop (hàng tên kênh dưới dial, nhãn núm dài) ẩn bằng `display:none` ở mobile; phần chỉ-mobile (nhãn núm `VOL`/`TUNE`) ngược lại. Các phần trang trí đó đều `aria-hidden`.
- D3 Trạng thái: `useState<ChannelId>("tiktok")`. Mũi kim: `style={{ left: "{25*index}%" }}` (FM 199.1 → 25%, 199.2 → 50%, 199.3 → 75%, 199.4 → 100%; 199.0 ở 0%) với `data-testid="radio-needle"`; transition `left .5s ease-out` chỉ trong `@media (prefers-reduced-motion: no-preference)`.
- D4 Bàn phím: bốn nút là `<button type="button" aria-pressed>` trong nhóm `role="group"` có `aria-label`; cả bốn đều nằm trong thứ tự Tab. ArrowRight/ArrowLeft chuyển kích hoạt VÀ focus sang kênh kế (vòng quanh: TikTok ← → Zalo); Home/End nhảy đầu/cuối. `preventDefault` cho các phím này; không bắt phím khi có modifier Ctrl/Alt/Meta.
- D5 Đổi nội dung: khối "đang phát" gắn `key={channel.id}` và class `.radio-now` có animation fade ngắn chỉ khi `no-preference`; reduced-motion = đổi tức thì. Không dùng timer JS hay `matchMedia`.
- D6 CTA: có `href` → `<a target="_blank" rel="noopener noreferrer">`; `href` null → `<button type="button" disabled>` cùng nhãn (theo hành vi cũ của Facebook). CTA nằm NGOÀI nhóm `role="group"` của 4 nút phím, nên khi CTA là `<button disabled>` thì số nút trong nhóm vẫn là 4 (test AC2 đếm trong nhóm, xem AC2).
- D7 Zalo: tên nhóm do chủ repo đã xác nhận ngày 2026-11-18: `HỘI ĐỒNG NIÊN REPLY 199X TẠI ĐÀ NẴNG` (đúng hoa-thường như hiển thị trên nhóm). Một hằng có tên duy nhất `ZALO_GROUP_NAME` trong `_data/channels.ts`; dòng handle của kênh Zalo là `Nhóm ${ZALO_GROUP_NAME}` = "Nhóm HỘI ĐỒNG NIÊN REPLY 199X TẠI ĐÀ NẴNG". Tên dài nên CSS bắt buộc cho phép xuống dòng (`overflow-wrap:anywhere` trên handle, `min-width:0`, handle là `<span>` cho phép wrap) cả ở dòng đang phát desktop lẫn 390px. URL `https://zalo.me/g/fhjd7fuvlccje1jwxyvu` thêm vào `projectLinks.zalo` trong `brief.ts`, component không hardcode.
- D8 Mục tiêu chạm: nút phím ≥ 84px cao mobile, ~100px desktop; CTA ≥ 54px; mọi `<a>/<button>` ≥ 44px.
- D9 Footer (chủ repo chọn mở rộng): thêm ba liên kết ngay sau TikTok và Merch trong hàng `div.flex.items-center.gap-3`, thứ tự cuối cùng: TikTok, Facebook, Instagram, Zalo, Merch. Cùng nguồn `projectLinks` (`facebook`, `instagram`, `zalo`); mỗi liên kết `target="_blank" rel="noopener noreferrer"`. Lựa chọn null-safety đã chốt: khi `projectLinks.facebook` là `null` thì BỎ HẲN liên kết Facebook (không render nút tắt, không `href` rỗng). Nhãn cố định tiếng Việt/tên thương hiệu: "Facebook", "Instagram", "Zalo" (không chứa "vé"); không thêm glyph icon cho ba liên kết mới (TikTok và Merch giữ glyph hiện có), nên không cần `aria-hidden` mới. Dùng nguyên chuỗi class của liên kết TikTok hiện có (nền `bg-retro-forest`, viền vàng, `font-space text-xs font-bold uppercase`), nên hưởng sẵn `.reply-footer a` (min-height 44px, font 11px) và vòng focus vàng ở dòng 29. Hàng nút đổi thành `flex flex-wrap items-center gap-3 min-w-0` để wrap ở mọi độ rộng (xem Phát hiện 6); luật dòng 146 trong `@media(max-width:639px)` vẫn khớp (giữ `flex items-center gap-3`) và tiếp tục căn giữa ở mobile. Không sửa CSS Footer trong `globals.css`.

## Phase Completion Rules
- Trạng thái chỉ là `CODE DONE` khi code xong; `VERIFIED` chỉ khi G1–G9 xanh do vc-tester chạy (EVL) và agent-probe G7 đạt. Known-gap không bao giờ là bằng chứng PASS.

## Scope
Trong phạm vi: các file ở Touchpoints (gồm `Footer.tsx` và `Footer.test.tsx`). Ngoài phạm vi: `src/lib`, `src/app/api`, `supabase`, `scripts`, `.env*`, `TicketRequestDialog*`, `TicketSurveyFields`, `TicketOrder*`, `TicketStub`, `TicketsSection`, `layout.tsx`, `home.ts`, `page.tsx`, `Navbar.tsx`, `package.json`, `package-lock.json`.

## Touchpoints
Đường dẫn con của `src/app/(routes)/` viết tắt `R/`.

Mới:
| # | File | Loại | Nội dung |
|---|---|---|---|
| N1 | `R/_types/channels.ts` | types | `ChannelId`, `RadioChannel` (`id`, `order`, `frequency`, `name`, `handle`, `description`, `cta`, `href: string \| null`, `iconId`), `RadioHeaderCopy` |
| N2 | `R/_data/channels.ts` | data | `ZALO_GROUP_NAME`, `radioHeader` (eyebrow, H2, intro), `radioChannels` (4 mục, href lấy từ `projectLinks`), hằng nhãn khu vực (`PRESETS_LABEL`, `DIAL_LABEL`) |
| N3 | `R/_components/ChannelsRadio.tsx` | client | state, xử lý bàn phím, ghép các thành phần; `"use client"` duy nhất |
| N4 | `R/_components/RadioSpeaker.tsx` | pure | lưới loa chấm tròn + bảng hiệu "Radio 199X" |
| N5 | `R/_components/RadioDial.tsx` | pure | kính dial, 81 vạch (mỗi vạch thứ 5 cao hơn), số 199.0–199.4, hàng tên kênh, kim, nhãn "4 KÊNH · 1 TẦN SỐ THANH XUÂN", chấm + "ON AIR" |
| N6 | `R/_components/RadioKnobs.tsx` | pure | hai núm trang trí `aria-hidden`, nhãn dài/ngắn |
| N7 | `R/_components/RadioKeys.tsx` | pure | nhãn "KÊNH CÀI SẴN — BẤM ĐỂ BẮT SÓNG", 4 nút phím; nhận `activeId`, `onSelect`, ref callback; không giữ state |
| N8 | `R/_components/RadioNowPlaying.tsx` | pure | khối "đang phát" + CTA |
| N9 | `R/_components/RadioBrandIcon.tsx` | pure | SVG TikTok/Facebook/Instagram/Zalo một màu `currentColor`, `aria-hidden` |
| N10 | `R/_components/ChannelsRadio.test.tsx` | test | tương tác radio |
| N11 | `R/_components/ChannelsSection.test.tsx` | test | vỏ section, dữ liệu nguyên văn, không có từ "vé" (mẫu `new RegExp("(?<![\\p{L}\\p{N}])v\\u00e9(?![\\p{L}\\p{N}])","iu")` dựng từ escape, kèm đối chứng dương: khớp "mua v\u00e9 ngay", không khớp "v\u1ebb"/"ngh\u1ec1") |
| N12 | `src/components/Footer.test.tsx` | test | header `// @vitest-environment jsdom`; 5 liên kết đúng `href`/`rel`/`target`; ca Facebook null qua `vi.mock('@/app/(routes)/_data/brief', factory)` (dùng `vi.hoisted` giữ đối tượng `projectLinks` có thể đổi `facebook`); không có từ "vé" (mẫu `new RegExp("(?<![\\p{L}\\p{N}])v\\u00e9(?![\\p{L}\\p{N}])","iu")` dựng từ escape, kèm đối chứng dương: khớp "mua v\u00e9 ngay", không khớp "v\u1ebb"/"ngh\u1ec1") |

Sửa:
| # | File | Thay đổi |
|---|---|---|
| E1 | `R/_components/ChannelsSection.tsx` | viết lại: Server shell, phần tử gốc đúng là `<section className="radio-section" id="kenh-truyen-thong">` và KHÔNG có class `reply-channels` (chiến lược CSS `.reply-site>.radio-section`, độ đặc hiệu 0,2,0 thắng `.reply-site>section` 0,1,1, phụ thuộc vào điều này), header 2 cột, render `<ChannelsRadio channels={radioChannels} />`; bỏ 3 thẻ kênh cũ |
| E2 | `R/_data/brief.ts` | thêm `zalo: string` vào kiểu `projectLinks` và giá trị URL; KHÔNG xóa khóa nào (chủ repo quyết định GIỮ `brief.channels/tiktok/facebook`) |
| E3 | `src/styles/globals.css` | gỡ CSS thẻ kênh cũ theo Phát hiện 3 (giữ phần dùng chung merch/process/ve) và thêm khối `.radio-*` ở cuối file (~230 dòng; file lên ~1.100 dòng) |
| E4 | `process/context/uxui/component-contracts.md` | cập nhật hàng sở hữu `kenh-truyen-thong`, hợp đồng tương tác kênh, token radio, và HÀNG Footer (hiện: "Server; shared shell and real source links") thành mô tả có thêm Facebook (bỏ khi null)/Instagram/Zalo |
| E5 | `process/context/all-context.md` | cập nhật Product/Current State, Repository Structure, Open Questions |
| E6 | `src/components/Footer.tsx` | thêm liên kết Facebook (render có điều kiện khi `projectLinks.facebook` khác null), Instagram, Zalo theo D9; đổi lớp hàng nút thành `flex flex-wrap items-center gap-3 min-w-0` |

Chỉ đọc: `page.tsx`, `layout.tsx`, `(routes)/layout.tsx`, `home.ts`, `ContactSection.tsx`, `MerchSection.tsx`, `src/lib/constants.ts`.

## Public Contracts
- Anchor `#kenh-truyen-thong` và vị trí section không đổi. Hiện KHÔNG có liên kết nội bộ nào trỏ tới anchor này (nav, hero, Footer đều không có, xem Phát hiện 9); anchor được giữ nguyên để liên kết sâu bên ngoài vẫn hoạt động.
- `ChannelsRadio` props: `channels: readonly RadioChannel[]` (chỉ dữ liệu serializable). Không có callback prop từ Server.
- `RadioChannel`: `href` có thể `null` → CTA tắt. `iconId` là chuỗi `"tiktok" | "facebook" | "instagram" | "zalo"`.
- `projectLinks` mở rộng thêm `zalo: string`; các khóa hiện có giữ nguyên tên và kiểu, nên `ContactSection` và `MerchSection` không bị ảnh hưởng.
- `Footer` (export có tên `Footer`, không props) đổi hành vi hiển thị: từ 2 liên kết thành tối đa 5 (TikTok, Facebook nếu khác null, Instagram, Zalo, Merch), mỗi liên kết mở tab mới `rel="noopener noreferrer"`. Hiển thị trên mọi route dưới `(routes)/layout.tsx`, gồm `/payment/return`.
- Hành vi cho người dùng: 4 nút `aria-pressed` trong nhóm `role="group"` (đúng một nút `true`), 1 CTA liên kết ngoài mở tab mới `rel="noopener noreferrer"`; mặc định TikTok.
- Nội dung nguyên văn (kênh):

| # | Kênh | Tần số | Handle | Mô tả | CTA | Đích |
|---|---|---|---|---|---|---|
| 1 | TikTok | FM 199.1 | @loihoidap199x | Ký ức tái hiện qua video ngắn, nội dung tương tác và những câu chuyện gần gũi với thế hệ 8X, 9X. | Bắt sóng TikTok ↗ | `projectLinks.tiktok` |
| 2 | Facebook | FM 199.2 | @loihoidap199x | Cập nhật mới nhất về dự án, các hoạt động nổi bật và những dấu ấn trên hành trình REPLY 199X. | Bắt sóng Facebook ↗ | `projectLinks.facebook` (có thể null) |
| 3 | Instagram | FM 199.3 | @loihoidap199x | Hình ảnh và những khoảnh khắc đáng nhớ trên hành trình REPLY 199X, cập nhật qua từng sự kiện. | Bắt sóng Instagram ↗ | `projectLinks.instagram` |
| 4 | Zalo | FM 199.4 | Nhóm HỘI ĐỒNG NIÊN REPLY 199X TẠI ĐÀ NẴNG | Nhóm cộng đồng REPLY 199X trên Zalo: trò chuyện cùng những người chung ký ức và nhận thông tin sự kiện. | Vào nhóm Zalo ↗ | `projectLinks.zalo` = https://zalo.me/g/fhjd7fuvlccje1jwxyvu |

- Đầu mục: eyebrow "BẮT SÓNG KÝ ỨC"; H2 nguyên văn brief: "Theo dòng ký ức, kết nối mọi khoảnh khắc"; đoạn dẫn: "Dòng chảy hoài niệm của REPLY 199X không chỉ ở những trải nghiệm trực tiếp mà còn lan tỏa trên TikTok, Facebook, Instagram và cộng đồng Zalo, nơi dự án chia sẻ câu chuyện, hình ảnh và những nội dung gợi nhắc một thời thanh xuân."
- Nhãn cố định: "Radio 199X", "BẮT SÓNG KÝ ỨC" (bảng hiệu), "4 KÊNH · 1 TẦN SỐ THANH XUÂN", "ON AIR", "FM", "MHz", "KÊNH CÀI SẴN — BẤM ĐỂ BẮT SÓNG", "ĐANG PHÁT · FM 199.x", "ÂM LƯỢNG", "DÒ SÓNG" (mobile "VOL", "TUNE"). Nhãn Footer: "Facebook", "Instagram", "Zalo".

## Blast Radius
- Rủi ro: UI-only, mức TRUNG BÌNH do `globals.css` là CSS toàn cục dùng chung nhiều mục và `Footer.tsx` render trên mọi route `(routes)`. Không thuộc lớp high-risk (không auth, billing, schema, API, secret) ⇒ không cần evidence pack `harness/`.
- 4 file nguồn sửa (E1, E2, E3, E6) + 12 file mới (N1–N12: 9 component/data/types, 3 test) + 2 tài liệu (E4, E5). Không đổi dependency, route, API, schema.
- Bề mặt bị ảnh hưởng: trang chủ (mục radio; Footer) và `/payment/return` (chỉ Footer, vì dùng chung `(routes)/layout.tsx`). Trang `auth/sign-in` nằm ngoài nhóm `(routes)` nên không đổi.
- Rủi ro chính: (a) gỡ nhầm CSS dùng chung ở dòng 140/834/836 (Phát hiện 3); (b) luật radio bị CSS toàn cục đè (Phát hiện 2); (c) tràn ngang ở 360px do tên Zalo dài và số dial; (d) `.reply-channels` bị gỡ mà còn tham chiếu nơi khác (grep `reply-channel` toàn `src` trước và sau phải không còn kết quả ngoài file xóa); (e) Footer 5 liên kết tràn ngang ở 768–1023px nếu không wrap ở mọi độ rộng (D9, G7).
- Rollback: `git checkout -- <4 file nguồn: ChannelsSection.tsx, brief.ts, globals.css, Footer.tsx> + 2 doc` và xóa 12 file mới (gồm `Footer.test.tsx`). Không migration, không dữ liệu, không cờ.
- Ràng buộc cứng: không đụng `src/lib`, `src/app/api`, `supabase`, `scripts`, `.env*`, file hộp thoại đặt phiếu nước; từ "vé" cấm trong mọi văn bản mới; TypeScript strict; test hộp thoại đặt phiếu nước phải vẫn xanh.

## Test Coverage Plan (vc-test-coverage-plan)
Nguồn: `tests/all-tests.md` đã đọc; test hiện có trong blast radius: không có test cho `ChannelsSection` hay `Footer`; `TicketRequestDialog.test.tsx` (ngoài blast radius, dùng làm tripwire hồi quy); runner Vitest jsdom, không có runner e2e trình duyệt (dùng `agent-browser`).

| Tier | Kịch bản | Lệnh / Bước | Chứng minh | KHÔNG chứng minh |
|---|---|---|---|---|
| Fully-automated | Mặc định TikTok active, 4 nút trong nhóm | `npx.cmd vitest run ChannelsRadio` | AC2, AC3 | hình ảnh |
| Fully-automated | Bấm Instagram: aria-pressed, nội dung, href, kim 75% | cùng suite | AC4 | độ mượt chuyển động |
| Fully-automated | Phím mũi tên/Home/End, vòng quanh, focus theo | cùng suite | AC5 | vòng focus nhìn thấy |
| Fully-automated | Facebook href null → nút disabled, không có link | cùng suite | AC6 | |
| Fully-automated | Zalo: href đúng, handle dùng `ZALO_GROUP_NAME` | cùng suite | AC7 | link còn sống |
| Fully-automated | Vỏ section: id, H2, đoạn dẫn, 4 mô tả nguyên văn, không có "vé" | `npx.cmd vitest run ChannelsSection` | AC1, AC8 | |
| Fully-automated | Footer: 5 liên kết đúng href/rel/target; Facebook null → còn 4 liên kết; không có "vé" | `npx.cmd vitest run Footer` | AC13 | bố cục, hình ảnh |
| Fully-automated | Hồi quy hộp thoại đặt phiếu nước | `npx.cmd vitest run TicketRequestDialog` | AC12 | |
| Hybrid | Reduced-motion: mọi transition/animation radio nằm trong `@media (prefers-reduced-motion: no-preference)` | tiền điều kiện: có CSS đã sửa; `Select-String` kiểm khối + agent-browser bật reduced motion | AC9 | cảm nhận người dùng |
| Agent-probe | Quan sát 360/390/768/1280/1440, không cuộn ngang (kể cả Footer), tên Zalo xuống dòng, tương phản, focus vàng, Footer wrap và mục tiêu chạm ≥44px | `agent-browser` trên cổng trống | AC10, AC11, AC14 | thiết bị thật |
| Known-gap | Link Zalo/Facebook/TikTok/Instagram còn sống và đúng nhóm | — | — | Mạng ngoài, ngoài phạm vi; phần liên kết đúng chuỗi đã được AC7 và AC13 phủ |

Failing stubs (chỉ để vào validate-contract, KHÔNG ghi file ở PLAN):
- `test("should mark TikTok active by default", () => { throw new Error("NOT IMPLEMENTED — TDD stub for: default TikTok active") })`
- `test("should switch content and aria-pressed on click", ...)` (cùng khuôn)
- `test("should move active channel with arrow keys and wrap", ...)`
- `test("should render disabled button when Facebook href is null", ...)`
- `test("should link Zalo CTA to the group URL", ...)`
- `test("should render section anchor and verbatim copy without the word ve", ...)`
- `test("should render five footer links with correct href, rel and target", ...)`
- `test("should omit the Facebook footer link when projectLinks.facebook is null", ...)`
- `test("should not contain the word ve in footer text", ...)`

Gap resolution: Known-gap "liên kết ngoài còn sống": A) viết test mạng, không chấp nhận (không ổn định); B) không cần hạ tầng; C) chấp nhận làm known-gap, lý do: kiểm chứng phải gọi mạng ngoài, chuỗi URL đã được test; D) chủ repo mở 4 liên kết bằng tay sau deploy (ghi trong report). Known-gap KHÔNG phải trạng thái PASS cho hành vi đã phát triển: gate AC7/AC13 vẫn dựa vào test tự động chuỗi href, không dựa vào known-gap.

## Acceptance Criteria (REQ-TEST-LINK)
1. AC1 Section giữ `id="kenh-truyen-thong"`, vị trí giữa About và Timeline, H2 và đoạn dẫn nguyên văn. proven by: `ChannelsSection.test.tsx` (shell/verbatim) + G7 xem thứ tự; strategy: Fully-Automated.
2. AC2 Trong nhóm `role="group"` của bàn phím có đúng 4 nút phím (`<button>`, truy vấn `within(group).getAllByRole("button")` hoặc các nút có `aria-pressed`; CTA nằm ngoài nhóm nên không bị đếm, kể cả khi CTA là `<button disabled>` ở ca Facebook null), mặc định TikTok `aria-pressed="true"`, ba nút còn lại `"false"`. proven by: `ChannelsRadio.test.tsx` "default TikTok"; strategy: Fully-Automated.
3. AC3 Khối đang phát mặc định hiện "ĐANG PHÁT · FM 199.1", "TikTok", "@loihoidap199x", mô tả, CTA "Bắt sóng TikTok ↗" tới `projectLinks.tiktok`, `target=_blank`, `rel` có `noopener noreferrer`. proven by: `ChannelsRadio.test.tsx` "default TikTok"; strategy: Fully-Automated.
4. AC4 Bấm một phím đổi `aria-pressed`, nội dung (tên, handle, mô tả, CTA, href) và kim sang đúng vị trí. proven by: `ChannelsRadio.test.tsx` "click switches"; strategy: Fully-Automated (độ mượt: Agent-Probe ở G7).
5. AC5 Mũi tên Trái/Phải đổi kênh và focus (vòng quanh), Home/End nhảy đầu/cuối; focus nhìn thấy màu vàng. proven by: `ChannelsRadio.test.tsx` "arrow keys" (hành vi) + G7 (vòng focus); strategy: Fully-Automated + Agent-Probe.
6. AC6 Khi `href` Facebook null, CTA là `<button disabled>` cùng nhãn, không có liên kết. proven by: `ChannelsRadio.test.tsx` "Facebook null"; strategy: Fully-Automated.
7. AC7 CTA Zalo "Vào nhóm Zalo ↗" tới đúng https://zalo.me/g/fhjd7fuvlccje1jwxyvu (lấy từ `projectLinks.zalo`), handle "Nhóm HỘI ĐỒNG NIÊN REPLY 199X TẠI ĐÀ NẴNG" lấy từ `ZALO_GROUP_NAME`. proven by: `ChannelsRadio.test.tsx` "Zalo link"; strategy: Fully-Automated.
8. AC8 Mọi văn bản mới giữ tiếng Việt nguyên văn và không chứa từ "vé"; icon thương hiệu `aria-hidden`, không có ảnh bitmap, không dependency mới. proven by: `ChannelsSection.test.tsx` (khẳng định không-có-"vé" bằng mẫu Unicode-aware ở bước 4, CÓ đối chứng dương: khớp "mua v\u00e9 ngay", không khớp "v\u1ebb"/"ngh\u1ec1") + G6 grep; strategy: Fully-Automated.
9. AC9 Chuyển động (kim, fade, nhấn phím) chỉ tồn tại khi `prefers-reduced-motion: no-preference`; reduced = tức thì. proven by: G6 (kiểm khối CSS) + G7 (emulate reduced motion); strategy: Hybrid.
10. AC10 Không cuộn ngang ở 360/390/768/1280/1440; ≥768px: bố cục 3 hàng theo brief; <768px: loa+2 núm, dial gọn, phím 2×2, đang phát xếp dọc, CTA full width; tên Zalo dài xuống dòng gọn ở dòng đang phát (desktop) và 390px. proven by: G7; strategy: Agent-Probe.
11. AC11 Tương phản chữ ≥ 4.5:1 (đã tính trước: #CBBF9F/#12251A ≈ 8.8, #A6362B/#F2E3B6 ≈ 5.2, #4A554E/#E8DFC9 ≈ 5.8) và mục tiêu chạm ≥ 44px. proven by: G7 (đo bằng script trong trình duyệt); strategy: Agent-Probe.
12. AC12 Không file ngoài danh sách Touchpoints (gồm `Footer.tsx`, `Footer.test.tsx`) bị đổi, khi so sánh tập file đổi với Touchpoints LOẠI TRỪ `.claude/hooks/.logs/` (hook ghi lại) và `process/general-plans/active/channels-radio-section_18-11-26/` (plan, report, `results.tsv`, ảnh G7); test hộp thoại đặt phiếu nước vẫn xanh; full test chỉ lỗi đã biết; typecheck, lint scoped (gồm `Footer.tsx`, `Footer.test.tsx`), build đạt. proven by: G1b, G2, G3, G4, G5, G8; strategy: Fully-Automated.
13. AC13 Footer có liên kết TikTok, Facebook, Instagram, Zalo, Merch đúng `href` lấy từ `projectLinks`, mỗi liên kết `target="_blank"` và `rel` có `noopener noreferrer`; khi `projectLinks.facebook` là `null` thì không có liên kết Facebook và còn đúng 4 liên kết; không có từ "vé" trong văn bản Footer (mẫu Unicode-aware ở bước 4, CÓ đối chứng dương: khớp "mua v\u00e9 ngay", không khớp "v\u1ebb"/"ngh\u1ec1"). proven by: `Footer.test.tsx` (G1); strategy: Fully-Automated.
14. AC14 Footer không cuộn ngang ở 360/390/768/1280/1440, hàng liên kết wrap gọn ở mọi độ rộng (đặc biệt 768–1023px) và mọi liên kết Footer cao ≥ 44px. proven by: G7 (đo `scrollWidth <= innerWidth` và `getBoundingClientRect().height` của các liên kết Footer); strategy: Agent-Probe.

## Implementation Checklist
Thực thi tuần tự, mỗi bước kèm gate cục bộ của bước (per-section gate), test viết TRƯỚC (đỏ) rồi code.
1. Chuẩn bị: `git status --short` ghi lại cây làm việc; kiểm cổng 3000 trống (G5); `Get-ChildItem src -Recurse -File | Select-String -Pattern "reply-channel"` ghi hiện trạng (chỉ `globals.css` và `ChannelsSection.tsx`).
2. Tạo `R/_types/channels.ts` (N1). Chạy `npm.cmd run typecheck` sau bước 3.
3. Sửa `R/_data/brief.ts` (E2): thêm `zalo: string` vào kiểu và `zalo: "https://zalo.me/g/fhjd7fuvlccje1jwxyvu"`; không xóa khóa. Tạo `R/_data/channels.ts` (N2) với `ZALO_GROUP_NAME = "HỘI ĐỒNG NIÊN REPLY 199X TẠI ĐÀ NẴNG"`, `radioHeader`, `radioChannels` đúng bảng Public Contracts (tần số "FM 199.1"…, `order` 1–4).
4. Viết test đỏ N10, N11 và N12 từ failing stubs (đủ 6 kịch bản radio + ca Facebook null qua prop `channels` đã đổi `href`; ba kịch bản Footer: 5 liên kết đúng href/rel/target, Facebook null qua `vi.mock('@/app/(routes)/_data/brief', factory)` với `vi.hoisted`, không có "vé"). Mẫu "vé" trong test dựng từ escape, Unicode-aware (`\\b` của JS chỉ hiểu ASCII nên KHÔNG khớp "vé", cấm dùng): `new RegExp("(?<![\\p{L}\\p{N}])v\\u00e9(?![\\p{L}\\p{N}])","iu")` (không viết literal "vé"); đối chứng dương BẮT BUỘC trong từng file (`ChannelsSection.test.tsx` và `Footer.test.tsx`): khẳng định mẫu KHỚP chuỗi tổng hợp dựng từ escape (ví dụ `"mua v\u00e9 ngay"`) và KHÔNG khớp "v\u1ebb" hay "ngh\u1ec1" (cũng dựng từ escape); thiếu đối chứng này thì khẳng định không-có-"vé" xanh rỗng. Xác nhận đỏ: N10, N11 đỏ vì thiếu module; N12 đỏ vì Footer hiện chỉ có 2 liên kết và chưa có Facebook/Instagram/Zalo.
5. Tạo `RadioBrandIcon.tsx` (N9): 4 SVG `viewBox="0 0 24 24"`, `fill="currentColor"`, `aria-hidden="true"`, `focusable="false"`; Zalo vẽ chữ "Z" trong bong bóng thoại bằng path đơn giản (không logo bản quyền chi tiết).
6. Tạo `RadioSpeaker.tsx` (N4), `RadioKnobs.tsx` (N6), `RadioDial.tsx` (N5: tạo 81 vạch bằng `Array.from({length:81})`, key theo chỉ số, class `radio-tick--major` khi `i % 5 === 0`; hàng tên kênh `aria-hidden`; kim `data-testid="radio-needle"`).
7. Tạo `RadioKeys.tsx` (N7) và `RadioNowPlaying.tsx` (N8) theo D4–D6; nút phím hiển thị "1 · FM 199.1", icon bên phải, tên kênh dưới; khối đang phát `aria-live="polite"` KHÔNG dùng (tránh đọc lặp khi người dùng bấm); thay vào đó giữ nút `aria-pressed` làm tín hiệu trạng thái.
8. Tạo `ChannelsRadio.tsx` (N3, `"use client"`, ≤150 dòng): state, `onKeyDown` cho nhóm phím (D4), ref mảng nút để focus.
9. Viết lại `ChannelsSection.tsx` (E1): Server, không `"use client"`, phần tử gốc đúng là `<section className="radio-section" id="kenh-truyen-thong">` (KHÔNG có class `reply-channels`: CSS `.reply-site>.radio-section` 0,2,0 thắng `.reply-site>section` 0,1,1 nhờ class `radio-section`), header 2 cột (eyebrow chấm đỏ + H2 + đoạn dẫn), gọi `ChannelsRadio`.
10. Sửa `src/components/Footer.tsx` (E6) theo D9: thêm `<a>` Facebook (bọc `{projectLinks.facebook ? (...) : null}`), Instagram, Zalo giữa TikTok và Merch với nguyên chuỗi class của liên kết TikTok, `href` từ `projectLinks`, `rel="noopener noreferrer" target="_blank"`, nhãn cố định "Facebook"/"Instagram"/"Zalo"; đổi class hàng nút `flex items-center gap-3` thành `flex flex-wrap items-center gap-3 min-w-0`. Không sửa gì khác trong Footer. Chạy `npx.cmd vitest run Footer` đến khi xanh.
11. `globals.css` (E3): (a) gỡ CSS cũ theo Phát hiện 3: ĐỌC lại số dòng thật, rồi sửa từ dưới lên trên: dòng 837 xóa; dòng 836 chỉ cắt `.reply-channels>.reply-shell>div:first-child,`; dòng 834 chỉ cắt `.reply-channels h2 { font-size:36px; }`; khối 747–793 xóa; khối 260–271 xóa; dòng 141 xóa; dòng 140 chỉ cắt hai selector `#kenh-truyen-thong`, GIỮ `#merch .items-start.justify-between,#merch .mt-8.pt-4,#ve .items-center.justify-between { flex-wrap:wrap; }`. Chạy `Get-ChildItem src -Recurse -File | Select-String -Pattern "reply-channel|kenh-truyen-thong"` xác nhận chỉ còn `ChannelsSection.tsx` và `ChannelsSection.test.tsx` (đều chỉ anchor id) và không còn gì trong `globals.css`; 0 kết quả cho `reply-channel` ở mọi nơi. (b) thêm khối `.radio-*` ở cuối file: biến CSS khai báo trên `.radio-section` (`--radio-bg:#E8DFC9; --radio-wood:#6B4428; --radio-face:#1E3A26; --radio-deep:#12251A; --radio-trim:#0E1F14; --radio-gold:#E3B25A; --radio-red:#A6362B; --radio-cream:#F4ECDA; --radio-glass:#F2E3B6; --radio-muted:#CBBF9F`), vân gỗ bằng hai `repeating-linear-gradient` (đen 6–7%, trắng 4%), lưới loa bằng `radial-gradient` 12px, phím cơ có bóng đáy 7px (active: gold, `translateY(5px)`, bóng đáy ngắn + inset), CTA cao ≥54px bóng 3D; mọi selector dưới `.radio-section`/`.reply-site>.radio-section`; vòng focus vàng ở `.radio-section .radio-key:focus-visible, .radio-section .radio-cta:focus-visible`; media `max-width:767px` cho bố cục mobile (grid areas `"speaker knobs" "dial dial"`, phím 2×2, now-playing dọc, CTA 100% rộng, ẩn vạch không phải bội 5 và hàng tên kênh); khối chuyển động chỉ trong `@media (prefers-reduced-motion:no-preference)` (kim `transition:left .5s ease-out`, `.radio-now` fade ~.25s, nhấn phím `transition:transform .08s`); `.radio-handle{overflow-wrap:anywhere;min-width:0}` và phần chứa `min-width:0` để tên Zalo dài xuống dòng; H2 `.radio-title` ghi đè `text-transform:none; letter-spacing:0; font:400 clamp(36px,5vw,56px)/1.15 "Reply Lobster"`.
12. Chạy toàn bộ gate G1–G8; đối với G7 chụp ảnh và lưu vào thư mục task. Sửa tại chỗ nếu đỏ (vòng ≤10).
13. Cập nhật tài liệu E4 (gồm hàng Footer trong `component-contracts.md`) và E5; chạy gate tài liệu G9. Report EXECUTE ghi gate, ảnh, deviation; đặt `Status: CODE DONE` (không `VERIFIED` cho tới khi vc-tester chạy EVL và chủ repo duyệt hình).

## Ghi chú cho execute-agent
1. Viết test đỏ TRƯỚC (bước 4) với mẫu Unicode-aware `new RegExp("(?<![\\p{L}\\p{N}])v\\u00e9(?![\\p{L}\\p{N}])","iu")` cùng đối chứng dương (khớp "mua v\u00e9 ngay", không khớp "v\u1ebb"/"ngh\u1ec1") trong `ChannelsSection.test.tsx` và `Footer.test.tsx`; không dùng `\\b`.
2. Sửa `globals.css` từ dưới lên trên, ĐỌC lại số dòng thật trước mỗi lần sửa (số dòng trong Phát hiện 3 chỉ là hướng dẫn).
3. Trong mọi lệnh PowerShell lấy từ bảng Gates, đổi `\|` thành `|` thường trước khi chạy (xem ghi chú dưới bảng Gates).
4. `ChannelsSection` phải render đúng `<section className="radio-section" id="kenh-truyen-thong">`, không thêm class `reply-channels`.
5. `Status` giữ ở `CODE DONE`, KHÔNG BAO GIỜ ghi `VERIFIED`, cho tới khi vc-tester chạy EVL và chủ repo duyệt hình.

## Gates (PowerShell, chạy từ gốc repo; Vitest bắt buộc chạy PowerShell)
| Gate | Lệnh | Kỳ vọng |
|---|---|---|
| G1 | `npx.cmd vitest run ChannelsRadio ChannelsSection Footer` | tất cả xanh (gồm `Footer.test.tsx`) |
| G1b | `npx.cmd vitest run TicketRequestDialog` | tất cả xanh (hồi quy hộp thoại) |
| G2 | `npm.cmd test` | chỉ lỗi đã biết `src/lib/supabase/route-client.test.ts` (secure cookie); mọi test khác xanh; ghi số đếm thực |
| G3 | `npm.cmd run typecheck` | exit 0 (chạy riêng, không song song với build) |
| G4 | `npm.cmd run lint` rồi `npx.cmd eslint "src/app/(routes)/_components" "src/app/(routes)/_data" "src/app/(routes)/_types" "src/components/Footer.tsx" "src/components/Footer.test.tsx" --max-warnings=0` | lint toàn repo đúng baseline 461 vấn đề, tất cả ngoài `src/` (0 trong `src/`); lint scoped exit 0 |
| G5 | Kiểm `Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue` rỗng (dừng dev server nếu có) rồi `npm.cmd run build` | lần 1 có thể exit 1 do advisory Next 16.4.3 sau khi biên dịch thành công; thử lại exit 0; ghi cả hai mã thoát, không nâng cấp dependency |
| G6 | Kiểm tĩnh PowerShell (danh sách file quét nêu rõ ở dưới): (1) `\bvé\b` (`-CaseSensitive:$false`, `-Encoding utf8`) trong ĐÚNG 14 file nguồn: 12 file mới N1–N12, cộng `ChannelsSection.tsx` và `Footer.tsx`, cộng khối `.radio-*` của `globals.css` (trích riêng bằng `Select-String` từ dòng đầu khối): 0 kết quả (test dựng mẫu `new RegExp("(?<![\\p{L}\\p{N}])v\\u00e9(?![\\p{L}\\p{N}])","iu")` từ escape nên không tự khớp, và có đối chứng dương nên không xanh rỗng); (2) `fetch(`, `localStorage`, `dangerouslySetInnerHTML`, `<img`, `matchMedia`, `setTimeout` trong 9 file component/data/types radio (N1–N9) và `Footer.tsx`: 0; (3) `"use client"` chỉ ở `ChannelsRadio.tsx` (không có ở `Footer.tsx`, `ChannelsSection.tsx`); (4) `(Get-Content <file>).Count` ≤150 cho cả 12 file mới (CSS ngoại lệ); (5) mọi `transition`/`animation` của `.radio-*` nằm trong khối `prefers-reduced-motion: no-preference`; (6) quét `reply-channel`/`kenh-truyen-thong`: `Get-ChildItem src -Recurse -File \| Select-String -Pattern "reply-channel\|kenh-truyen-thong"` kết quả mong đợi đúng 2 file: `ChannelsSection.tsx` (anchor id) và `ChannelsSection.test.tsx` (chỉ anchor id, qua AC1); 0 kết quả trong `globals.css`; và quét riêng `reply-channel` (không kèm `kenh-truyen-thong`) trong toàn `src` phải 0 kết quả; (7) CSS dùng chung còn nguyên: `Select-String -Path src/styles/globals.css -Pattern "#merch .items-start.justify-between,#merch .mt-8.pt-4,#ve .items-center.justify-between"` đúng 1 dòng, và dòng `.reply-merch>.reply-shell>div:first-child,.reply-process>.reply-shell>div:first-child` còn đúng 1 dòng; (8) `git diff -U0 -- src/styles/globals.css` các dòng bị xóa (bắt đầu bằng `-`, bỏ dòng `---`) khớp `reply-merch\|reply-process\|#merch\|#ve ` đúng 2 dòng (hai dòng chung 140 và 836 đã được thay bằng bản rút gọn ở dòng `+`), và 0 dòng bị xóa nào thuộc thân luật `.reply-merch*`/`.reply-process*`/`#merch`/`#ve` khác | đạt từng mục |
| G7 | Agent-probe với `agent-browser`: build xong chạy `npx.cmd next start -p 3217` (cổng trống, kiểm trước; dừng server và xác nhận cổng đóng sau) hoặc dev trên cổng trống; mỗi viewport 360/390/768/1280/1440: `document.documentElement.scrollWidth <= innerWidth`, chụp ảnh, kiểm bố cục theo AC10, chữ Việt có dấu đủ, duyệt phím Tab + mũi tên + vòng focus vàng, đo tương phản và kích thước mục tiêu bằng `getComputedStyle`; ở 1280 và 390: chọn kênh Zalo và xác nhận tên "Nhóm HỘI ĐỒNG NIÊN REPLY 199X TẠI ĐÀ NẴNG" xuống dòng gọn, không tràn khung, không cuộn ngang; emulate `prefers-reduced-motion: reduce` xác nhận kim nhảy tức thì; kiểm Mục kế trước/sau (About, Timeline) không đổi layout. Footer (trên trang chủ và `/payment/return`): ở cả 5 viewport không tràn ngang, hàng 5 liên kết wrap gọn (đặc biệt 768 và 1023), mọi liên kết Footer cao ≥44px, vòng focus vàng; kiểm đích mở của Facebook, Instagram, Zalo (`href`, `target=_blank`, `rel`) khớp `projectLinks` và không có liên kết Facebook khi dữ liệu null chỉ qua test đơn vị (không thể mô phỏng ở trình duyệt) | đạt, ảnh lưu vào thư mục task |
| G8 | `git diff --name-only` và `git status --short`: tập file đổi = đúng danh sách Touchpoints (cho phép `Footer.tsx` và `Footer.test.tsx`), so sánh LOẠI TRỪ `.claude/hooks/.logs/` (`hook-log.jsonl` luôn bị hook ghi lại nên luôn có trong `git diff --name-only`) và `process/general-plans/active/channels-radio-section_18-11-26/` (thư mục task chưa theo dõi: plan, report, `results.tsv`, ảnh G7 hiện trong `git status`); 0 thay đổi trong `src/lib`, `src/app/api`, `supabase`, `scripts`, `.env*`, `TicketRequestDialog*`, `TicketSurveyFields`, `TicketOrder*`, `TicketStub`, `TicketsSection`, `layout.tsx`, `Navbar.tsx`, `package.json`, `package-lock.json` | đạt |
| G9 | `node .claude/skills/vc-context-discovery/scripts/discover-context.mjs --check-routing` ; `node .claude/skills/vc-generate-context/scripts/validate-all-context.mjs` ; `node .claude/skills/vc-audit-context/scripts/validate-protocol-discovery.mjs` | exit 0 (hai validator `validate-context-discovery`/`validate-skills` đã hỏng sẵn tại HEAD, không tính) |

**Ghi chú gate:** trong các ô bảng, `\|` là ký tự thoát của Markdown; trong lệnh PowerShell thật phải viết thành `|` thường (hợp biểu thức chính quy luân phiên). Sao chép nguyên văn `\|` sẽ không khớp gì và qua gate một cách rỗng; đặc biệt G6 mục 6 và mục 8 (`reply-channel|kenh-truyen-thong`, `reply-merch|reply-process|#merch|#ve `).

## Verification Evidence
| Gate / Scenario | Strategy | Proves SPEC criterion |
|---|---|---|
| G1 `ChannelsSection.test.tsx` (id, H2, đoạn dẫn, 4 mô tả, không có "vé") | Fully-Automated | AC1, AC8 |
| G1 `ChannelsRadio.test.tsx` mặc định TikTok (4 nút trong nhóm) | Fully-Automated | AC2, AC3 |
| G1 `ChannelsRadio.test.tsx` click đổi nội dung + kim | Fully-Automated | AC4 |
| G1 `ChannelsRadio.test.tsx` mũi tên/Home/End | Fully-Automated | AC5 |
| G1 `ChannelsRadio.test.tsx` Facebook null disabled | Fully-Automated | AC6 |
| G1 `ChannelsRadio.test.tsx` Zalo href + handle | Fully-Automated | AC7 |
| G1 `Footer.test.tsx` (5 liên kết, rel/target, Facebook null, không có "vé") | Fully-Automated | AC13 |
| G6 grep + khối reduced-motion; G7 emulate reduced | Hybrid | AC9 |
| G7 probe 5 viewport, tên Zalo xuống dòng, focus, tương phản | Agent-Probe | AC5 (vòng focus), AC10, AC11 |
| G7 probe Footer: 5 viewport, wrap 768–1023, mục tiêu chạm ≥44px | Agent-Probe | AC14 |
| G1b, G2, G3, G4, G5, G6, G8 | Fully-Automated | AC12 (G6 cũng phủ AC8) |
| Liên kết ngoài còn sống | Known-gap (phần dư, không phải bằng chứng PASS) | — (AC7 và AC13 vẫn do test tự động phủ) |

## Data Flow and Failure Modes
- Luồng: `brief.ts` (`projectLinks`) → `channels.ts` (`radioChannels`) → `ChannelsSection` (Server, serialize) → `ChannelsRadio` (state `activeId`) → `RadioDial` (kim), `RadioKeys` (aria-pressed), `RadioNowPlaying` (nội dung + CTA). Nhánh song song: `brief.ts` (`projectLinks`) → `Footer` (Server) → 3 liên kết mới.
- `href` null: radio: nút disabled (D6), không lỗi; Footer: bỏ liên kết Facebook (D9). `activeId` không tìm thấy: không xảy ra (id từ chính mảng); tra bằng `find` với phương án dự phòng kênh đầu để TypeScript strict không cần `!`.
- Hydration: nội dung mặc định (TikTok) render ở Server, đọc được trước hydrate; chưa hydrate thì phím chưa phản hồi nhưng nội dung và CTA TikTok vẫn dùng được. Footer là Server thuần, không hydrate.
- CSS: nếu khối `.radio-*` bị lỗi cú pháp, chỉ mục này hỏng (selector có tiền tố); gate G7 phát hiện. Nếu gỡ nhầm dòng chung 140/836, `#merch`/`#ve`/merch/process hỏng: G6 mục 7, 8 và G7 phát hiện.

## Risk Predictions (vc-predict rút gọn, 5 góc nhìn)
- Bảo mật: không có dữ liệu người dùng, secret hay `fetch`; link ngoài đã có `rel`. Rủi ro thấp; không cần STRIDE đầy đủ.
- Hiệu năng: 81 span vạch + SVG, không ảnh, không JS định thời; Client bundle chỉ gồm ~7 component nhỏ. Footer thêm 3 thẻ `<a>` Server. Rủi ro thấp.
- Hồi quy CSS (cao nhất): gỡ nhầm dòng chung 140/834/836 hoặc đặc hiệu thấp bị `.reply-site` ghi đè → G6 (mục 7, 8), G7 và so sánh ảnh các mục lân cận. Giảm thiểu: quy tắc scope ở Quyết định kỹ thuật và Phát hiện 2, 3.
- Footer dùng chung mọi route `(routes)`: 5 liên kết có thể tràn ở 768–1023px; giảm thiểu: `flex-wrap`/`min-w-0` ở mọi độ rộng (D9), G7 đo 5 viewport và `/payment/return`.
- A11y: nhóm phím hình radio nhưng dùng `aria-pressed` theo brief (không `role=radio`); giữ nhất quán và mô tả trong component-contracts.
- Nội dung: tên Zalo dài, chữ hoa Việt có dấu; kiểm tra wrap ở G7.
- Edge cases từ vc-scenario (3 mục rủi ro cao): (1) Facebook null + đang chọn rồi dữ liệu đổi: CTA đổi sang disabled, không `href` rỗng; Footer bỏ liên kết Facebook; (2) ArrowLeft ở TikTok vòng sang Zalo; Home/End; không bắt phím khi có modifier (Ctrl/Alt/Meta) để không phá phím tắt trình duyệt; (3) tên Zalo 41 ký tự ở 360px không đẩy `scrollWidth` vượt `innerWidth`.

## Test Infra Improvement Notes
(none identified yet) — ghi nhận: không có runner e2e/ảnh trong repo nên AC9/AC10/AC11/AC14 phụ thuộc agent-probe; jsdom không có `matchMedia` nên reduced-motion không có test đơn vị; `src/components/` chưa có test nào trước `Footer.test.tsx`.

## Quyết định của chủ repo (đã chốt 2026-11-18, không còn mở)
1. Giữ `brief.channels`, `brief.tiktok`, `brief.facebook` trong `brief.ts` (KHÔNG xóa, không thêm bước xóa).
2. Mở rộng `src/components/Footer.tsx` với Facebook, Instagram, Zalo cạnh TikTok và Merch (nay nằm trong phạm vi: E6, N12, AC13, AC14). Chọn null-safety: bỏ liên kết Facebook khi `projectLinks.facebook` là `null`.
3. Dùng lại font cục bộ "Reply Lobster/Nunito", `layout.tsx` không đổi (D1).
4. Tên nhóm Zalo = "HỘI ĐỒNG NIÊN REPLY 199X TẠI ĐÀ NẴNG" (D7).
Việc theo dõi sau deploy (không chặn EXECUTE): chủ repo tự mở các liên kết kênh (4 liên kết radio, 3 liên kết Footer mới) để kiểm tra còn sống (known-gap AC7/AC13, ghi trong report).

## Dependencies
Không dependency mới. Phụ thuộc: font cục bộ trong `public/fonts` (đã có), `@testing-library/user-event`, `jsdom` (đã có). Chuỗi tuần tự bắt buộc: typecheck rồi build (cùng ghi `.next`), không song song.

## Validate Contract

Status: PASS
Date: 18-11-26
date: 2026-11-18
generated-by: outer-pvl

Parallel strategy: sequential
Rationale: score 1/7 (only S7, 5+ files in blast radius; single package, no schema/API/auth/billing, no phase program). Dominant signal S7 but the 13 steps are strictly ordered (types, data, tests red, components, Footer, shared globals.css, docs), so ONE vc-execute-agent on opus runs checklist 1-13 sequentially, then ONE vc-tester on sonnet runs the EVL confirmation (G1-G9). All fan-out agents in validate ran sonnet-equivalent checks inline; no team needed.

Validation cycle: PVL cycle 3 (re-validate from V1 after two supplement cycles; results.tsv holds baseline + 2 cycle rows). Cycle-2 concerns re-verified against current plan text and real code: (1) vacuous Unicode test pattern: FIXED, verified in node (see E1); (2) G8/AC12 excludes: FIXED (`.claude/hooks/.logs/` and the task folder are excluded in G8 and AC12); (3) G6 item 6 expected matches: FIXED (exactly `ChannelsSection.tsx` and `ChannelsSection.test.tsx`, plus separate `reply-channel` scan = 0); (4) `\|` note and `radio-section` element: FIXED (Ghi chu gate, E1 row, checklist step 9, execute notes 3 and 4).

Test gates (5-column table; strategy carries ONLY the 3 proving strategies):

| criterion id | behavior | strategy | proving test | gap-resolution |
|---|---|---|---|---|
| AC1, AC8 | Section keeps id `kenh-truyen-thong`, H2 and intro verbatim, 4 descriptions verbatim, no word "ve" with accent, brand icons aria-hidden | Fully-Automated | `npx.cmd vitest run ChannelsSection` | A |
| AC2, AC3 | Default TikTok pressed; exactly 4 key buttons inside the role=group; now-playing shows FM 199.1, TikTok, handle, description, CTA link attrs | Fully-Automated | `npx.cmd vitest run ChannelsRadio` ("default TikTok") | B |
| AC4 | Click switches aria-pressed, content, href and needle left (Instagram = 75%) | Fully-Automated | `npx.cmd vitest run ChannelsRadio` ("click switches") | B |
| AC5 | ArrowLeft/ArrowRight wrap and move focus, Home/End, no capture with Ctrl/Alt/Meta | Fully-Automated | `npx.cmd vitest run ChannelsRadio` ("arrow keys") | B |
| AC6 | Facebook href null gives disabled button with same label and no link | Fully-Automated | `npx.cmd vitest run ChannelsRadio` ("Facebook null") | B |
| AC7 | Zalo CTA href equals https://zalo.me/g/fhjd7fuvlccje1jwxyvu and handle uses ZALO_GROUP_NAME | Fully-Automated | `npx.cmd vitest run ChannelsRadio` ("Zalo link") | B |
| AC13 | Footer has 5 links with exact href/rel/target; Facebook null leaves 4; no word "ve" with accent | Fully-Automated | `npx.cmd vitest run Footer` | B |
| AC12 | Dialog regression, repo tests, typecheck, scoped lint, build, static greps, file-scope diff | Fully-Automated | G1b `npx.cmd vitest run TicketRequestDialog`; G2 `npm.cmd test`; G3 `npm.cmd run typecheck`; G4 lint + scoped eslint; G5 build; G6; G8 | A |
| AC9 | All radio transition/animation inside `@media (prefers-reduced-motion: no-preference)`; reduced motion is instant | Hybrid | G6 item 5 static check on the `.radio-*` block (precondition: edited globals.css) + G7 `agent-browser` emulate reduce | B |
| AC5 (focus ring), AC10, AC11, AC14 | No horizontal scroll at 360/390/768/1280/1440 (Footer included), layouts per AC10, Zalo name wraps, contrast and 44px targets, yellow focus ring, Footer row wraps at 768-1023 | Agent-Probe | G7 `agent-browser` probe on a free port (build then `npx.cmd next start -p 3217`) | B |

Named residual (NOT a strategy, not PASS evidence): live-link liveness of the 4 radio links and 3 new Footer links. gap-resolution D: owner opens the links by hand after deploy, result written in the EXECUTE report; no automated network test is planned (unstable, rejected in the plan). The href strings themselves ARE proven by AC7 and AC13 automated tests.

Failing stubs (Fully-Automated rows only; execute-agent turns each into a red-first test, Mode A):
- `test("should mark TikTok active by default", () => { throw new Error("NOT IMPLEMENTED — TDD stub: default TikTok active, 4 buttons in group") })`
- `test("should switch content and aria-pressed on click", () => { throw new Error("NOT IMPLEMENTED — TDD stub: click switches content, href, needle 75%") })`
- `test("should move active channel with arrow keys and wrap", () => { throw new Error("NOT IMPLEMENTED — TDD stub: arrow keys, Home/End, wrap, focus follows") })`
- `test("should render disabled button when Facebook href is null", () => { throw new Error("NOT IMPLEMENTED — TDD stub: Facebook null disabled button, no link") })`
- `test("should link Zalo CTA to the group URL", () => { throw new Error("NOT IMPLEMENTED — TDD stub: Zalo href and ZALO_GROUP_NAME handle") })`
- `test("should render section anchor and verbatim copy without the word ve", () => { throw new Error("NOT IMPLEMENTED — TDD stub: anchor id, verbatim copy, Unicode-aware no-ve with positive control") })`
- `test("should render five footer links with correct href, rel and target", () => { throw new Error("NOT IMPLEMENTED — TDD stub: 5 footer links") })`
- `test("should omit the Facebook footer link when projectLinks.facebook is null", () => { throw new Error("NOT IMPLEMENTED — TDD stub: Facebook null leaves 4 links") })`
- `test("should not contain the word ve in footer text", () => { throw new Error("NOT IMPLEMENTED — TDD stub: Unicode-aware no-ve with positive control") })`

Legacy line form (retained so existing validate-contract consumers still parse):
- radio + section behavior (AC1-AC8): [Fully-automated: `npx.cmd vitest run ChannelsRadio ChannelsSection`]
- Footer (AC13): [Fully-automated: `npx.cmd vitest run Footer`]
- regression and scope (AC12): [Fully-automated: `npx.cmd vitest run TicketRequestDialog` + `npm.cmd test` + `npm.cmd run typecheck` + `npm.cmd run lint` + scoped eslint + `npm.cmd run build` + G6 + G8]
- reduced motion (AC9): [hybrid: G6 item 5 + `agent-browser` emulate reduce; precondition edited globals.css and a free port]
- visual, layout, contrast, focus, Footer wrap (AC5 ring, AC10, AC11, AC14): [agent-probe: G7 `agent-browser` at 360/390/768/1280/1440, free port 3217]
- live external links: [known-gap: documented, owner manual check after deploy]

Execute-agent instructions (written to the contract; follow in order):
- E1 (regex escapes, highest-value). In `ChannelsSection.test.tsx` and `Footer.test.tsx` the no-"ve" pattern string must contain a LITERAL DOUBLE backslash inside the JS string: `new RegExp("(?<![\\p{L}\\p{N}])v\\u00e9(?![\\p{L}\\p{N}])","iu")` (source after parsing: `(?<![\p{L}\p{N}])vé(?![\p{L}\p{N}])`). The positive-control strings use a SINGLE backslash escape: `"mua vé ngay"` (match), `"vẻ"` and `"nghề"` (no match). Never use `\b` (ASCII-only in JS, never matches the accented word, would be vacuous). Write these files ONLY with the file Write/Edit tool, never a shell heredoc or `echo`: during this validation a Bash heredoc silently halved `\\` to `\` in the written file. After writing, verify with `Select-String -SimpleMatch -Pattern '(?<![\\p{L}\\p{N}])v\\u00e9' <both test files>` (two matches, one per file) and that each file asserts the positive control. Validated in node on 2026-11-18 with this exact pattern: MATCH "mua vé ngay", "vé,", "có vé.", "VÉ"; NO MATCH "vẻ", "nghề", "véo".
- E2 (G6 item 1 encoding). Run the static scan with the escape form `\bvé\b` (.NET regex supports `\uXXXX`) instead of typing the accented letter in the terminal, so a console code-page problem cannot turn the gate vacuous; also confirm the scan works with a positive probe: `('mua v'+[char]0xE9+' ngay') -match '\bvé\b'` must print True.
- E3 (pipes). In every PowerShell command taken from the Gates table, change `\|` to a plain `|` before running (G6 items 6 and 8 especially); copying `\|` verbatim passes vacuously.
- E4 (globals.css, shared file). Read real line numbers first and edit bottom to top: 837 delete; 836 trim only the leading `.reply-channels>.reply-shell>div:first-child,`; 834 trim only `.reply-channels h2 { font-size:36px; }`; 747-793 delete (verified at validate time: 747 is the comment, 748-768 are top-level rules, 769 opens `@media(max-width:1023px)` closed at 774, 775 opens `@media(max-width:767px)` closed at 793; the range has 44 `{` and 44 `}`, so deleting it whole keeps braces balanced; 260-271 has 12 and 12); 260-271 delete (12 lines); 141 delete; 140 trim only the two leading `#kenh-truyen-thong` selectors and KEEP `#merch .items-start.justify-between,#merch .mt-8.pt-4,#ve .items-center.justify-between { flex-wrap:wrap; }`. After editing, count `{` and `}` in the file: they must be equal, then run G6 items 6, 7, 8. Append the `.radio-*` block at the end of the file; every selector scoped under `.radio-section` or `.reply-site>.radio-section`; focus ring selector `.radio-section .radio-key:focus-visible, .radio-section .radio-cta:focus-visible`.
- E5 (root element). `ChannelsSection` renders exactly `<section className="radio-section" id="kenh-truyen-thong">` with NO `reply-channels` class and no `"use client"`; `ChannelsRadio.tsx` is the only `"use client"` file. Verified: `main.reply-site` is the direct parent of the sections in `page.tsx`, and `.reply-site>section` (0,1,1) is beaten by `.reply-site>.radio-section` (0,2,0).
- E6 (port 3000 is occupied). At validate time `127.0.0.1:3000` is LISTENING (PID 28384, with an established connection), i.e. the owner appears to have a dev server running. Do NOT kill a process you did not start. For G5 report the occupied port to the orchestrator (G5 sub-result `NEEDS_OWNER_STOP`) and continue with G1-G4, G6, G8, G9; run G7 only on a port you verified free (3217) using your own `next start`, and stop only that server afterwards.
- E7 (Footer). Edit `Footer.tsx` minimally: add Facebook (wrapped in `{projectLinks.facebook ? (...) : null}`), Instagram, Zalo between TikTok and Merch with the exact class string of the existing TikTok link; change only the button-row class to `flex flex-wrap items-center gap-3 min-w-0` (rule at globals.css line 146 still matches `.flex.items-center.gap-3`). No glyph for the 3 new links. `Footer.test.tsx` starts with `// @vitest-environment jsdom`; the null case uses `vi.mock('@/app/(routes)/_data/brief', factory)` with `vi.hoisted` (Footer imports exactly that specifier).
- E8 (scope). Touch only the Touchpoints list (E1-E6 and N1-N12 of the plan). No commit, no dependency change, no `src/lib`, `src/app/api`, `supabase`, `scripts`, `.env*`, no ticket-dialog files, no `layout.tsx`. No production or hosted-database operation. Do not delete `brief.channels/tiktok/facebook`.
- E9 (artifacts and status). Write the EXECUTE report as `channels-radio-section_REPORT_18-11-26.md` and G7 screenshots inside the task folder `process/general-plans/active/channels-radio-section_18-11-26/`. Status stays `CODE DONE`, never `VERIFIED`, until vc-tester EVL passes and the owner approves visuals. Do not edit the `## Validate Contract` section.
- E10 (gate order). Red-first: write N10, N11, N12 from the stubs above and confirm RED (N10/N11 for missing module, N12 because Footer has only 2 links) before any component code. Run typecheck and build sequentially, never in parallel.

Known failures that are NOT regressions (record real counts, do not fix): `src/lib/supabase/route-client.test.ts` secure-cookie test in G2; 461 lint problems under `.agents/`, `.claude/`, `.codex/` (0 in `src/`) in G4; `validate-context-discovery`, `validate-skills`, `validate-guide-sync` fail at HEAD (not part of G9); Next 16.4.3 advisory can make the first `npm.cmd run build` exit 1 after a successful compile (retry, record both exit codes).

Dimension findings:
- Infra fit: PASS — single-package Next.js 16 App Router; all plan file paths resolve on disk; `@` alias, jsdom header, `src/**/*.test.tsx` include and `src/test/setup.ts` fit the planned tests; `main.reply-site > section` structure confirmed; fonts `Lobster-Regular.ttf` and `Nunito-Variable.ttf` exist in `public/fonts`; G9 validators exist and exit 0 at HEAD (check-routing, validate-all-context, validate-protocol-discovery).
- Test coverage: PASS — every developed behavior (AC1-AC9, AC12, AC13) has a Fully-Automated or Hybrid gate; AC5 ring, AC10, AC11, AC14 are Agent-Probe by necessity (no e2e runner); no vacuous green (Unicode-aware pattern verified in node, positive control mandatory); only named residual is live-link liveness (gap-resolution D), not developed behavior.
- Breaking changes: PASS — anchor `#kenh-truyen-thong` and position unchanged; `projectLinks` gains `zalo` only (ContactSection and MerchSection read other keys; `Readonly<{...}>` type updated in E2); Footer shown on `(routes)` pages only (home and `/payment/return`); `brief.channels/tiktok/facebook` kept; no inbound link to the anchor exists in `src`.
- Security surface: PASS — UI-only, no auth/billing/schema/API/secret/data collection; external links carry `rel="noopener noreferrer"`, no `fetch`, `dangerouslySetInnerHTML`, `localStorage`; no high-risk class, so no `harness/` evidence pack required.
- Section A (types, data, brief.ts): PASS — new `_types/channels.ts` and `_data/channels.ts` do not exist yet (no collision); `projectLinks` type edit is mechanically unique.
- Section B (radio components N3-N9, tests N10-N11): PASS — pure data in props, one Client leaf; highest-risk edit is the keyboard and focus logic (D4), mitigated by red-first tests.
- Section C (Footer E6, N12): PASS — edit target (TikTok `<a>` row `flex items-center gap-3`) present and unique; highest risk is 5-link overflow at 768-1023px, mitigated by `flex-wrap min-w-0` and AC14/G7.
- Section D (globals.css E3): PASS — every cited line (29, 137-146, 168, 260-271, 432, 747-793, 834, 836, 837) matches the 881-line file; shared lines 140 and 836 are the highest-risk edit, mitigated by E4 and G6 items 7-8.
- Section E (docs E4, E5): PASS — component-contracts rows (`kenh-truyen-thong` at line 23, Footer at line 31) exist; G9 validators run clean at baseline.
- Section F (gates G1-G9): PASS — every gate command resolves; pipe-escape note present; port 3000 occupancy handled by E6; G8 excludes hook log and task folder (`next-env.d.ts` and `*.tsbuildinfo` are git-ignored).

Open gaps: none blocking. Residual: live external links not verified (known-gap: documented, owner manual check after deploy; the href strings are test-proven).
What this coverage does NOT prove (What This Coverage Does NOT Prove):
- ChannelsSection/ChannelsRadio/Footer Vitest gates do NOT prove visual fidelity, layout, wrapping, contrast, focus-ring color, motion smoothness, or that a real browser keeps the needle and fade instant under reduced motion (jsdom has no `matchMedia`); those rest on G6 item 5 and the G7 agent-probe.
- Link assertions prove the href strings and `target`/`rel`, NOT that Zalo, Facebook, TikTok or Instagram destinations are alive or correct groups.
- G6 static greps prove absence of banned tokens in the named files, NOT behavior; G7 proves only the five tested viewports in one browser, not real devices.
- G1b/G2 prove the ticket dialog and repo tests are not regressed, NOT that globals.css edits leave `#merch`, `#ve`, `merch`, `process` sections visually unchanged beyond what G6 items 7-8 and the G7 neighbor-section check observe.
- The Facebook-null Footer and radio cases are proven by unit tests only; they cannot be reproduced in the browser because `projectLinks.facebook` is non-null in real data.
- Nothing here proves production deploy behavior; checkout stays off and no hosted operation is part of this plan.
Gate: PASS (no FAILs, no unresolved CONCERNs; execute-agent instructions E1-E10 recorded)
Accepted by: not applicable (Gate is PASS, no concerns accepted); owner already issued ENTER EXECUTE MODE in this session.

## Autonomous Goal Block

```
SESSION GOAL: Rebuild the "Bat song ky uc" section (id kenh-truyen-thong) as a 90s desk radio with 4 channels (TikTok, Facebook, Instagram, Zalo) and extend the shared Footer with Facebook, Instagram, Zalo links.
Charter + umbrella plan: N/A - single plan.
Autonomy: standing EXECUTE consent from the owner (ENTER EXECUTE MODE given). Self-decide reversible choices, no approval pauses; subagent delegation stays mandatory (vc-execute-agent opus, then vc-tester sonnet for EVL). See feedback_autonomous_phase_execution.md.
Hard stop conditions / safety constraints:
- Touch only the plan Touchpoints (4 source files, 12 new files, 2 docs). Never src/lib, src/app/api, supabase, scripts, .env*, ticket-dialog files, layout.tsx, package files.
- No production or hosted-database operation, no commit, no dependency change; checkout stays OFF.
- No word "ve" with accent in any new text (use "phieu nuoc"); verify with the Unicode-aware pattern in E1, never \b.
- Edit globals.css bottom to top; keep shared merch/process/ve CSS (lines 140 and 836 trimmed, not deleted).
- Do not kill the owner's dev server on port 3000; use free port 3217 for G7.
- Status stays CODE DONE, never VERIFIED, until vc-tester EVL passes and the owner approves visuals.
Next phase: EXECUTE: process/general-plans/active/channels-radio-section_18-11-26/channels-radio-section_PLAN_18-11-26.md (checklist 1-13, red tests first)
Validate contract: inline in the plan, section "## Validate Contract" (Gate: PASS, instructions E1-E10)
Execute start: npx.cmd vitest run ChannelsRadio ChannelsSection Footer | e2e: none (no browser runner) | probe: G7 agent-browser at 360/390/768/1280/1440 on port 3217 | high-risk pack: no
```

## Resume and Execution Handoff
1. Selected plan file path: `process/general-plans/active/channels-radio-section_18-11-26/channels-radio-section_PLAN_18-11-26.md`
2. Last completed phase or step: PLAN written và đã bổ sung PVL-supplement (Footer E6/N12, AC13–AC14, gate G6/G7/G8 cập nhật); chưa có code nào được sửa.
3. Validate-contract status: pending (cần validate lại sau supplement, rồi chủ repo ENTER EXECUTE MODE).
4. Supporting context files loaded: `process/context/all-context.md`, `uxui/all-uxui.md`, `uxui/component-contracts.md`, `tests/all-tests.md`, `process/development-protocols/plan-lifecycle.md`; nguồn: `ChannelsSection.tsx`, `brief.ts`, `layout.tsx`, `Footer.tsx`, `page.tsx`, `globals.css`.
5. Next step for a fresh agent: chạy VALIDATE (V1–V7); sau PASS, spawn vc-execute-agent (opus) với đường dẫn plan này, thực hiện checklist 1–13 theo thứ tự, test đỏ trước; sau đó spawn vc-tester chạy lại G1–G9 (EVL). Lệnh validator plan: `node .claude/skills/vc-generate-plan/scripts/validate-plan-artifact.mjs process/general-plans/active/channels-radio-section_18-11-26/channels-radio-section_PLAN_18-11-26.md`.

---
name: plan:navbar-google-form-popup
description: "Thêm mục 'Biểu mẫu' vào Navbar (desktop và menu mobile) mở một modal <dialog> nhúng Google Form bằng iframe (embedded=true), có nút đóng, Esc, bấm nền, link dự phòng 'Mở trong tab mới'; một Client leaf mới, dữ liệu URL ở _data, CSS tiền tố .form-popup-*"
date: 18-11-26
feature: none
---

# PLAN — Popup Google Form từ Navbar

**BLUF:** SIMPLE (một lần EXECUTE tuần tự, 10 bước). Navbar đã là Client Component (109 dòng), nên chỉ thêm 2 nút kích hoạt và một state `formOpen`; phần modal nằm ở leaf mới `src/components/FormPopup.tsx` dùng `<dialog>` + `showModal()` (đúng mẫu `LoginDialog`/`TicketRequestDialog`). URL form và nhãn nằm ở file dữ liệu mới `src/app/(routes)/_data/formPopup.ts`. Repo KHÔNG có CSP / X-Frame-Options / frame-src nào (đã đọc `next.config.ts`, `src/proxy.ts`), nên không header nào trong repo chặn iframe tới `docs.google.com`. Việc form THẬT SỰ hiện trong iframe trên site đã deploy là phần dư (residual) do chủ repo kiểm tra tay, không phải PASS.

Status: CODE DONE (2026-11-18; EXECUTE xong checklist 1–10; chờ EVL của vc-tester; KHÔNG phải VERIFIED). Báo cáo: `navbar-google-form-popup_REPORT_18-11-26.md`.
Owner change during EXECUTE (O1, 2026-11-18): Navbar label is now "Checkin popup" (`FORM_POPUP_LABEL`); modal title stays "Biểu mẫu REPLY 199X". Wherever this plan says the button label is "Biểu mẫu" (D1, D6, AC1, N1, O1), read "Checkin popup"; tests derive the label from the constant.
Date: 18-11-26
Complexity: SIMPLE (8 file: 3 mới nguồn/dữ liệu + 2 test mới + 3 sửa nguồn/CSS + 2 tài liệu; không schema/auth/API/billing)
TL;DR: 1 modal client mới, 2 nút trong Navbar, 1 file dữ liệu, CSS cuối `globals.css`, 2 file test; gate scoped + full vitest + typecheck + lint + build + probe trình duyệt 360/390/768/1024/1280/1440; 4 quyết định mở cho chủ repo (nhãn, URL dự phòng, chỗ đặt nút, đóng rồi mở lại có giữ câu trả lời hay không).

## Current Execution State
- Last updated: 2026-11-18
- Bước hiện tại: EXECUTE xong (CODE DONE, 2026-11-18); tiếp theo vc-tester (sonnet) EVL chạy lại G1–G9.
- Validate-contract: written (2026-11-18, outer-pvl, Gate: PASS)
- Không có SPEC riêng: yêu cầu khóa là tin nhắn giao việc của chủ repo (tiếng Việt, 2026-11-18); các AC1–AC11 bên dưới là bản dịch có kiểm chứng.
- Chiến lược (vc-agent-strategy-compare, Simple Mode): S7 (>=5 file trong blast radius) = 1, S1/S2/S3/S4/S5/S6 = 0, điểm 1/7 = LOW. Khuyến nghị: Sequential, 1 agent EXECUTE (opus), vc-tester EVL (sonnet) sau đó; không fan-out (file chồng lấn: Navbar + CSS + test cùng một thay đổi).

## Overview
Chủ repo muốn Google Form `https://forms.gle/W4rPWP6rckzRFPkH9` (đã xác minh trỏ tới `https://docs.google.com/forms/d/e/1FAIpQLSfkPApNK9sU_GIXVe5Mh4t2HYTEfwQwYHaHJCMmDjx9iETRtw/viewform?usp=send_form`, HTTP 200) mở như popup trong trang. Chọn của chủ repo: nút trong NAVBAR (desktop + menu mobile, mọi trang dưới layout `(routes)`), popup là modal trong trang NHÚNG form bằng iframe (URL dạng embed `viewform?embedded=true`), đóng được bằng nút, Esc, bấm nền, có link "Mở trong tab mới" (`target="_blank" rel="noopener noreferrer"`) phòng khi embed không render. Không dùng `window.open`. Không đụng link form merch hiện có.

Bối cảnh đã đọc: `process/context/all-context.md`, `uxui/all-uxui.md`, `uxui/component-contracts.md` (Interaction Contracts, Accessibility), `tests/all-tests.md`, `plan-lifecycle.md`, `Navbar.tsx`, `constants.ts`, `brief.ts`, `next.config.ts`, `proxy.ts`, `layout.tsx`, `TicketRequestDialog.tsx`, `LoginDialog.tsx`, `HeaderAuth.tsx`, `globals.css` (dòng 86–142, 535–546), và `LoginDialog.test.tsx` / `TicketRequestDialog.test.tsx` (mẫu polyfill `showModal`).

## Phát hiện nghiên cứu ảnh hưởng thiết kế (đã xác minh trong repo)
1. `Navbar` là Client Component (`"use client"`, 109 dòng) nhận prop `auth`; đã có state `open` (menu mobile), ref `menuButton`/`header`, và đã nhúng hai dialog (`TicketRequestDialog`, `LoginDialog` qua `HeaderAuth`). Chưa có test cho Navbar (`src/components/` chỉ có `Footer.test.tsx`; test dialog nằm ở `auth/` và `_components/`). Vì vậy "test Navbar hiện có phải xanh" thực tế = các test lân cận (`HeaderAuth`, `LoginDialog`, `TicketRequestDialog`, `Footer`) phải xanh, và test Navbar mới là file mới.
2. Mẫu dialog repo ưu tiên: `<dialog>` native + `showModal()`, đóng khi `event.target === dialog` (bấm nền), mở/đóng điều khiển bằng prop (`LoginDialog`: `open`, `onClose`, `onCancel` gọi `preventDefault()` rồi `onClose()`), khóa cuộn bằng `overflow:hidden !important` trên `body` và `html` rồi khôi phục giá trị cũ, lưu `document.activeElement` làm trigger để trả focus. Plan tái dùng mẫu này trong leaf mới, KHÔNG sửa `LoginDialog` (ngoài phạm vi; trùng lặp có chủ ý, ghi vào Test Infra Notes như đề xuất hook dùng chung sau này).
3. Bẫy kiến trúc: menu mobile là `<nav hidden={!open}>` (`display:none`). Một `<dialog>` đặt BÊN TRONG nav ẩn sẽ không hiển thị (subtree `display:none` không tạo box, kể cả top layer). Vì vậy chỉ có MỘT popup, điều khiển bằng prop, render trong `<header>` NGOÀI nav mobile; hai nút kích hoạt (desktop và mobile) cùng mở nó. Nút mobile phải đóng menu (giống điểm đến khác) và popup trả focus về nút `menuButton` (nút hamburger), vì nút kích hoạt mobile đã bị ẩn. Do đó Navbar truyền một ref `returnFocus` xác định rõ nơi trả focus: desktop = chính nút bấm (`event.currentTarget`), mobile = `menuButton.current`. Không suy từ `document.activeElement` (nút bị ẩn khiến activeElement thành `body` không đoán trước được).
4. `Navbar.closeOutside` (pointerdown ngoài `<header>` thì đóng menu) và `closeOnEscape` (Esc đóng menu + focus hamburger) không xung đột: popup nằm trong DOM của `<header>` nên pointerdown trong popup được tính là "trong header"; Esc đồng thời kích `cancel` của dialog (đóng popup) và đóng menu, cả hai đều đúng ý.
5. Header HTTP trong repo: `next.config.ts` chỉ có `reactStrictMode` và `poweredByHeader:false`; `src/proxy.ts` chỉ đặt `Cache-Control` (matcher `/` và `/auth/*`); không có `Content-Security-Policy`, `X-Frame-Options`, `frame-src`, `frame-ancestors`, `Permissions-Policy`. Kết luận phạm vi repo: không chặn iframe `docs.google.com`. Chưa xác minh được: header do hạ tầng hosting thêm sau này, và hành vi của Google (xem Residual R1–R3).
6. Sandbox/referrer: Google Forms cần chạy script và (với form yêu cầu đăng nhập hoặc tải file) cookie bên thứ ba; `sandbox` đủ chặt để có ý nghĩa bảo mật mà vẫn chạy được Forms gần như không tồn tại (cần ít nhất `allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox`, tức gần như vô hiệu hóa sandbox). Quyết định D5: KHÔNG đặt `sandbox`; đặt `referrerPolicy="strict-origin-when-cross-origin"` (giá trị mặc định của trình duyệt hiện đại, ghi tường minh) và không `allow=` quyền thiết bị nào. Phần này không kiểm chứng được trong jsdom: test chỉ khóa thuộc tính hiện diện/vắng mặt; hành vi thật là probe/residual.
7. `.reply-site` (reset `h2`, `a/button min-height`) nằm ở `<main>` của trang, KHÔNG phải tổ tiên của `<header>`; nên popup trong header không dính các luật `.reply-site …`. Nhưng `LoginDialog` vẫn dùng `!important` cho `h2`, cho thấy có luật `h2` toàn cục khác rò vào; EXECUTE phải dựa vào probe ảnh chụp để kiểm tra tiêu đề popup và xử lý bằng selector `.form-popup .form-popup__title` có độ đặc hiệu đủ (không `!important` trừ khi probe chứng minh cần).
8. `agent-browser` probe trên trang chủ: người dùng chưa đăng nhập thì `LoginDialog` TỰ MỞ khi tải trang (`useState(auth.status === "anonymous")`); probe phải đóng dialog đăng nhập (Esc) trước khi thao tác nút Biểu mẫu, nếu không nút bị inert.
9. jsdom không có `showModal`/`close` thật và `Esc` bằng bàn phím không sinh sự kiện `cancel`; test dùng polyfill như `LoginDialog.test.tsx` (`showModal` đặt thuộc tính `open`, `close` gỡ nó) và mô phỏng Esc bằng `fireEvent(dialog, new Event("cancel", { cancelable: true }))`. Esc thật và bấm nền thật chỉ kiểm chứng được bằng probe trình duyệt.
10. Quy tắc từ ngữ: repo dùng "phiếu nước", không bao giờ "vé". Mọi chuỗi mới (nhãn, tiêu đề, link dự phòng) không chứa từ đó; có test với positive control.

## Quyết định kỹ thuật (đã chốt, không để EXECUTE tự sáng tạo)
- D1 Nhãn (chủ repo xác nhận được): `FORM_POPUP_LABEL = "Biểu mẫu"` (chữ trên nút Navbar) và `FORM_POPUP_TITLE = "Biểu mẫu REPLY 199X"` (tiêu đề `h2`, `aria-labelledby`, `title` của iframe). Mục đích form chưa biết nên trung tính; đổi nhãn = sửa đúng 1 dòng ở `formPopup.ts`.
- D2 Vị trí dữ liệu: file mới `src/app/(routes)/_data/formPopup.ts` (cạnh `brief.ts`/`home.ts`), KHÔNG thêm khóa vào `projectLinks`. Lý do: `brief.ts` đang có thay đổi chưa commit của việc radio (khóa `zalo`) và có test `Footer.test.tsx` mock `projectLinks`; một file riêng không gây xung đột và không đụng link merch. Phương án thay thế (thêm `projectLinks.form`) là đổi 1 dòng nếu chủ repo muốn. Export: `FORM_POPUP_LABEL`, `FORM_POPUP_TITLE`, và `formPopupLinks: Readonly<{ embed: string; fallback: string }>`:
  - `embed` = `https://docs.google.com/forms/d/e/1FAIpQLSfkPApNK9sU_GIXVe5Mh4t2HYTEfwQwYHaHJCMmDjx9iETRtw/viewform?embedded=true` (bỏ `usp=send_form`, thêm `embedded=true`, tham số embed chính thức của Google).
  - `fallback` = cùng đường dẫn `viewform` KHÔNG kèm `embedded` (cùng đúng form, không qua bước chuyển hướng `forms.gle`, không phụ thuộc nếu chủ repo sau này trỏ lại link rút gọn). Link rút gọn `https://forms.gle/W4rPWP6rckzRFPkH9` chỉ ghi ở plan; chủ repo có thể chọn dùng nó thay cho `fallback`.
- D3 Cấu trúc component: `FormPopup` (named export, `"use client"`, <= ~110 dòng) nhận `open: boolean`, `onClose: () => void`, `returnFocus: RefObject<HTMLElement | null>`. Export thêm `FORM_POPUP_DIALOG_ID = "form-popup-dialog"` để nút Navbar đặt `aria-controls`. Không đặt state mở trong leaf (Navbar sở hữu `formOpen` vì hai nút ở hai nơi).
- D4 Hành vi `FormPopup`:
  1. `<dialog id=FORM_POPUP_DIALOG_ID className="form-popup" aria-labelledby={titleId} aria-modal="true">` (aria-modal dư thừa với `showModal` nhưng chủ repo yêu cầu rõ); `titleId` từ `useId()`.
  2. Effect theo `open`: `open && !el.open` thì `el.showModal()` rồi focus nút đóng; `!open && el.open` thì `el.close()` rồi `returnFocus.current?.focus()`.
  3. Khóa cuộn: effect theo `open` sao chép đúng mẫu `LoginDialog` (lưu giá trị + priority cũ của `overflow` trên `body` và `documentElement`, đặt `hidden !important`, khôi phục trong cleanup).
  4. `onCancel`: `event.preventDefault(); onClose()` (Esc). `onClick` trên dialog: `event.target === dialogRef.current` thì `onClose()` (nền). Dialog có `padding:0` và lớp con phủ kín nên chỉ bấm vào `::backdrop` mới có `target` là chính dialog.
  5. iframe chỉ được render sau lần mở đầu tiên: `const [armed, setArmed] = useState(false)` và dạng "dẫn xuất state trong lúc render" `if (open && !armed) setArmed(true)` (KHÔNG dùng `setState` trong `useEffect`: luật `react-hooks/set-state-in-effect` của eslint-config-next có thể báo lỗi; KHÔNG đọc `ref.current` trong lúc render). Sau lần mở đầu iframe GIỮ NGUYÊN trong DOM khi đóng (câu trả lời đang nhập không mất khi lỡ bấm Esc; trang không gọi Google trước khi người dùng mở lần đầu: lợi ích riêng tư và hiệu năng). Mở lại không tải lại form. Ghi là quyết định mở O4.
  6. iframe: `src={formPopupLinks.embed}`, `title={FORM_POPUP_TITLE}`, `loading="lazy"`, `referrerPolicy="strict-origin-when-cross-origin"`, không `sandbox`, không `allow`, `className="form-popup__frame"`.
  7. Cấu trúc DOM: lớp `.form-popup__layout` gồm `header.form-popup__bar` (`h2` tiêu đề + nút `button.form-popup__close` `type="button"` `aria-label="Đóng biểu mẫu"` hiển thị "×" `aria-hidden`), `div.form-popup__body` chứa iframe, `p.form-popup__fallback` "Không thấy biểu mẫu?" + `<a href={fallback} target="_blank" rel="noopener noreferrer">Mở trong tab mới ↗</a>` (nằm dưới iframe, không ở thanh tiêu đề, để thanh tiêu đề 360px không chật).
- D5 Sandbox/referrer: xem phát hiện 6 (không `sandbox`).
- D6 Navbar (chỉ thêm, không tái cấu trúc): import `FormPopup`, `FORM_POPUP_DIALOG_ID`, `FORM_POPUP_LABEL`; thêm `const [formOpen, setFormOpen] = useState(false)` và `const formReturn = useRef<HTMLElement | null>(null)`; nút desktop trong `<nav className="event-header__desktop">` SAU các `NAV_LINKS` và nút mobile trong `<nav id="mobile-navigation">` SAU các `NAV_LINKS`, cả hai là `<button type="button" className="event-header__link event-header__link--button" aria-haspopup="dialog" aria-controls={FORM_POPUP_DIALOG_ID}>`; handler desktop đặt `formReturn.current = event.currentTarget` rồi `setFormOpen(true)`; handler mobile đặt `formReturn.current = menuButton.current`, `setOpen(false)`, `setFormOpen(true)`; `<FormPopup open={formOpen} onClose={() => setFormOpen(false)} returnFocus={formReturn} />` đặt ngay trước `</header>` (ngoài nav mobile). `NAV_LINKS` và hiệu ứng active-section KHÔNG đổi (nút không phải điểm neo nên không có `aria-current`). Dòng Navbar dự kiến ~125 (<150).
- D7 CSS (thêm CUỐI `globals.css`, không chèn giữa file vì file đang bị việc radio sửa dở và số dòng trôi; EXECUTE phải đọc lại cuối file ngay trước khi thêm). Tiền tố `.form-popup*`, biến cục bộ trên `.form-popup`: `--fp-cream #fff8e8`, `--fp-ink #183b2b`, `--fp-line #243c2e40`, `--fp-red #a01300`, `--fp-focus #e6ac47` (cùng giá trị token của dialog đặt phiếu nước nhưng khai báo riêng, không tham chiếu `--tod-*`):
  - `.form-popup[open]` mới `display:flex; flex-direction:column` (KHÔNG đặt `display` trên `.form-popup` trần, sẽ phá `dialog:not([open]){display:none}`); `.form-popup`: `width:min(720px,calc(100vw - 32px)); height:min(860px,calc(100dvh - 32px)); max-width:none; max-height:none; margin:auto; padding:0; overflow:hidden; overscroll-behavior:contain; border:0; border-radius:14px; background:var(--fp-cream); color:var(--fp-ink); box-shadow:0 24px 80px #03181080`. Phải khai `max-width:none; max-height:none` vì UA stylesheet của dialog đặt `max-width/height: calc(100% - 6px - 2em)`.
  - `.form-popup::backdrop { background:#061f18cc; }` (không `backdrop-filter`: blur nền tốn GPU khi có iframe).
  - `.form-popup__layout { display:flex; flex-direction:column; flex:1; min-height:0; }`; `.form-popup__bar { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 12px 10px 20px; border-bottom:1px solid var(--fp-line); }`; `.form-popup__title { margin:0; font:800 18px/1.3 "Reply Nunito",sans-serif; min-width:0; overflow-wrap:anywhere; }`; `.form-popup__close` 44x44, tròn, viền `--fp-line`, nền trong suốt, `font:400 26px/1 sans-serif`, `cursor:pointer`; `.form-popup__body { flex:1; min-height:0; background:#fff; }`; `.form-popup__frame { display:block; width:100%; height:100%; border:0; }`; `.form-popup__fallback { margin:0; padding:10px 20px calc(10px + env(safe-area-inset-bottom)); border-top:1px solid var(--fp-line); font:600 14px/1.5 "Reply Nunito",sans-serif; text-align:center; }` với link `min-height:44px` hiển thị `inline-flex`, màu `--fp-red` gạch chân.
  - `:is(a,button):focus-visible` trong `.form-popup`: `outline:3px solid var(--fp-focus); outline-offset:2px`.
  - Mobile `@media(max-width:639px)`: `.form-popup { width:100vw; height:100dvh; border-radius:0; }` và `.form-popup__bar { padding-top:max(10px,env(safe-area-inset-top)); }` (env() = 0 nếu trang không có `viewport-fit=cover`; vô hại).
  - Nút Navbar: `.event-header__link--button { border:0; background:transparent; cursor:pointer; appearance:none; width:100%; }` (kế thừa font/padding/hover/focus từ `.event-header__link` và `.event-header :is(a,button):focus-visible`); trong nav desktop `width:auto`. Nếu probe 1024px cho thấy header tràn ngang (6 mục + nút phiếu nước + đăng nhập), được phép giảm `padding-inline` của `.event-header__link` chỉ trong khoảng 1024–1199px bằng một luật có tiền tố mới; không đổi giao diện các mục khác ngoài khoảng đó.
- D8 Không thêm dependency, không sửa `package.json`, không `window.open`, không script theo dõi của chúng ta.

## Phase Completion Rules
- Trạng thái chỉ là `CODE DONE` khi code xong; `VERIFIED` chỉ khi mọi gate Fully-Automated xanh do vc-tester chạy (EVL) và probe trình duyệt đạt. AC10 (form thật hiện trong iframe trên site deploy) là Known-gap: KHÔNG bao giờ tính là bằng chứng PASS; cổng của AC10 luôn CONDITIONAL cho tới khi chủ repo xác nhận tay.

## Scope
Trong phạm vi: file ở Touchpoints. Ngoài phạm vi (KHÔNG chạm): `src/lib`, `src/app/api`, `supabase`, `scripts`, `.env*`, `package.json`, `package-lock.json`, `TicketRequestDialog*`, `TicketSurveyFields`, `TicketOrder*`, `TicketStub`, `LoginDialog*`, `HeaderAuth*`, `Footer*`, các file mục radio (`ChannelsSection*`, `ChannelsRadio*`, `Radio*`, `_data/channels.ts`, `_types/channels.ts`), `brief.ts` (kể cả `projectLinks.merch`), `next.config.ts`, `src/proxy.ts`, `layout.tsx`.

## Touchpoints
| File | Hành động | Ghi chú |
|---|---|---|
| `src/app/(routes)/_data/formPopup.ts` | MỚI | nhãn, tiêu đề, `formPopupLinks` (D1, D2) |
| `src/components/FormPopup.tsx` | MỚI | Client leaf, <= ~110 dòng (D3, D4) |
| `src/components/Navbar.tsx` | SỬA (chỉ thêm) | state, 2 nút, 1 popup (D6) |
| `src/styles/globals.css` | SỬA (chỉ thêm cuối file) | khối `.form-popup*` và `.event-header__link--button` (D7) |
| `src/components/FormPopup.test.tsx` | MỚI | Vitest + Testing Library |
| `src/components/Navbar.test.tsx` | MỚI | nút ở desktop + mobile, mở popup, trả focus |
| `process/context/uxui/component-contracts.md` | SỬA nhỏ | thêm 1 hàng "Form popup" vào bảng Interaction Contracts; cập nhật "Source Paths" nếu cần |
| `process/context/all-context.md` | SỬA nhỏ | một dòng Open Questions: nhúng Google Form là bên thứ ba, cần chủ repo kiểm tra tay; dòng cấu trúc `_data/formPopup.ts`, `FormPopup.tsx` |
Chỉ ĐỌC (không sửa): `LoginDialog.tsx`, `TicketRequestDialog.tsx`, `HeaderAuth.tsx`, `constants.ts`, `next.config.ts`, `src/proxy.ts`, `brief.ts`.

## Public Contracts
- Hành vi hiển thị: nút "Biểu mẫu" trong Navbar (desktop từ 1024px; trong menu mobile dưới 1024px) trên MỌI trang dưới `(routes)` (Navbar nằm ở `layout.tsx` của nhóm). Bấm nút mở modal; modal chứa iframe tới URL embed; đóng bằng nút "×", Esc, bấm nền.
- API nội bộ mới: `FormPopup({ open, onClose, returnFocus })`, `FORM_POPUP_DIALOG_ID`, `FORM_POPUP_LABEL`, `FORM_POPUP_TITLE`, `formPopupLinks`. Không đổi chữ ký `Navbar({ auth })`, `NAV_LINKS`, `projectLinks`.
- Hợp đồng ngoài: tải `https://docs.google.com/forms/d/e/…/viewform?embedded=true` trong iframe (trình duyệt của khách gọi Google; xem Residual R4). Không thêm endpoint, không đổi `src/app/api`, không đổi header HTTP.
- Link merch `projectLinks.merch = https://forms.gle/tW1VU8vpASc53CJa8` GIỮ NGUYÊN, vẫn mở tab mới như cũ.

## Blast Radius
Rủi ro thấp: 8 file, một package, không dữ liệu, không auth/billing/schema/API công khai/runtime. Rủi ro giao diện thực: Navbar xuất hiện ở mọi route và là thanh cố định; thêm một mục có thể làm tràn ngang ở 1024–1199px (probe 1024); CSS thêm cuối `globals.css` không đổi luật cũ ngoài `.event-header__link--button`. Rủi ro tương tác: `TicketRequestDialog`/`LoginDialog` cùng là modal; chỉ một modal mở tại một thời điểm (native), nên không xung đột, nhưng test lân cận phải xanh. Rollback: xóa 4 file mới và hoàn tác 4 chỗ sửa (Navbar, CSS, 2 tài liệu); không migration, không dữ liệu.

## Test Coverage Plan (vc-test-coverage-plan)
Ngữ cảnh test đã nạp: `process/context/tests/all-tests.md` (router) và chuỗi xuống Commands, Quick Procedures (UI conversion, Source changes), Known Gaps; file test hiện có trong blast radius: `Footer.test.tsx`, `auth/HeaderAuth.test.tsx`, `auth/LoginDialog.test.tsx`, `_components/TicketRequestDialog.test.tsx` (mẫu polyfill `showModal`); không có test Navbar. Không phát hiện lớp rủi ro cao (auth/billing/schema/API/secret) trong blast radius; vì vậy không cần mức Hybrid tối thiểu.

**Area: `src/components/FormPopup.tsx` + `_data/formPopup.ts`**
| Tier | Scenario | Command / Steps | What it proves | What it does NOT prove |
|---|---|---|---|---|
| Fully-automated | T1 đóng: không có role dialog hiển thị và KHÔNG có iframe | `npx.cmd vitest run src/components/FormPopup.test.tsx` | không gọi Google trước lần mở đầu | tải mạng thật |
| Fully-automated | T2 mở: dialog có tên truy cập = `FORM_POPUP_TITLE`, `aria-modal="true"`, iframe `title` = tiêu đề, `src` đúng bằng `formPopupLinks.embed`, `loading="lazy"`, `referrerpolicy`, không `sandbox`, `window.open` không được gọi | cùng lệnh | cấu trúc, aria, URL embed, không dùng `window.open` | form hiện trong iframe |
| Fully-automated | T3 link dự phòng: tên "Mở trong tab mới", `href` = `formPopupLinks.fallback`, `target="_blank"`, `rel="noopener noreferrer"` | cùng lệnh | thuộc tính link | link mở đúng tab trong trình duyệt thật |
| Fully-automated | T4 đóng: bấm nút "Đóng biểu mẫu" gọi `onClose`; sự kiện `cancel` (mô phỏng Esc) gọi `onClose` và bị `preventDefault`; bấm vào chính dialog gọi `onClose`; bấm vào tiêu đề KHÔNG gọi | cùng lệnh | logic đóng 3 đường | Esc thật và bấm `::backdrop` thật |
| Fully-automated | T5 focus: harness có nút trigger + `FormPopup` điều khiển bằng state: mở thì focus vào nút đóng; đóng thì `document.activeElement` = trigger; ca ref trỏ phần tử khác (giả lập `menuButton`) thì focus về phần tử đó | cùng lệnh | trả focus xác định | thứ tự Tab thật qua iframe |
| Fully-automated | T6 khóa cuộn: khi mở `body` và `documentElement` có `overflow:hidden` (important); sau đóng khôi phục giá trị cũ (kể cả giá trị có sẵn) | cùng lệnh | khóa/khôi phục cuộn | cuộn thật trên iOS |
| Fully-automated | T7 giữ iframe: sau mở rồi đóng, iframe vẫn trong DOM (truy vấn `hidden:true`), mở lại dùng cùng phần tử | cùng lệnh | quyết định O4 | câu trả lời trong form còn nguyên (do Google) |
| Fully-automated | T8 từ ngữ: nhãn, tiêu đề, nút đóng, văn bản link dự phòng không khớp mẫu Unicode-an-toàn với positive control | cùng lệnh | không có từ "vé" | ngữ cảnh toàn site |
| Fully-automated | G-grep: URL form chỉ ở `formPopup.ts` (và test), merch còn nguyên | xem Gates | không hardcode, không đụng merch | — |
| Known-gap | Form THẬT hiện trong iframe trên site đã deploy; form yêu cầu đăng nhập Google; cookie bên thứ ba bị chặn | — | — | Bên thứ ba, ngoài kiểm soát repo; ghi Residual R1–R3, stub backlog, cổng AC10 CONDITIONAL |
Failing stub (TDD, đưa vào validate-contract, không ghi ra đĩa ở PLAN):
- `test("should render the iframe with the exact embed src when open", () => { throw new Error("NOT IMPLEMENTED — TDD stub for: iframe embed src") })`
- `test("should restore focus to the trigger on close", () => { throw new Error("NOT IMPLEMENTED — TDD stub for: focus restore") })`

**Area: `src/components/Navbar.tsx`**
| Tier | Scenario | Command / Steps | What it proves | What it does NOT prove |
|---|---|---|---|---|
| Fully-automated | N1 cả nav desktop và nav mobile đều có một nút tên `FORM_POPUP_LABEL`; năm liên kết `NAV_LINKS` vẫn có ở cả hai nav | `npx.cmd vitest run src/components/Navbar.test.tsx` (mock `HeaderAuth`, `TicketRequestDialog`, `RemoteImage`; stub `matchMedia`) | nút có mặt ở cả hai nơi; không hồi quy anchor | hiển thị theo breakpoint (CSS) |
| Fully-automated | N2 bấm nút desktop mở dialog có iframe | cùng lệnh | nối dây trigger→popup | — |
| Fully-automated | N3 mở menu mobile, bấm nút mobile: menu đóng (`hidden`), popup mở; đóng popup thì focus về nút hamburger | cùng lệnh | luồng mobile + trả focus | layout thật |
| Agent-probe | P1 trình duyệt: ở 1024/1280/1440 nút nằm trong nav desktop và không tràn ngang; ở 360/390/768 nằm trong menu mobile; bấm mở popup; kiểm tra hình | `agent-browser` ở cổng 3217 (xem Gates) | bố cục thật, focus thật | nội dung bên trong iframe (của Google) |
| Agent-probe | P2 Esc thật và bấm nền thật đóng popup, focus về trigger; cuộn nền bị khóa | cùng probe | hành vi native của `<dialog>` | iOS Safari |
| Known-gap | Esc/Tab/đọc màn hình qua ranh giới iframe | — | — | Do trình duyệt/Google; ghi trong Residual R5 |

## Acceptance Criteria (REQ-TEST-LINK)
Mỗi tiêu chí gắn `proven by:` và `strategy:` (Known-Gap không bao giờ là strategy).
- AC1 Nút "Biểu mẫu" có trong Navbar ở desktop và menu mobile trên mọi route dưới `(routes)`. proven by: `Navbar.test.tsx` N1 (cộng P1 ở `/` và `/payment/return`); strategy: Fully-Automated (+ Agent-Probe cho layout).
- AC2 Bấm nút mở modal có tiêu đề và iframe với `src` đúng URL embed (`…/viewform?embedded=true`), không `window.open`. proven by: `FormPopup.test.tsx` T2, `Navbar.test.tsx` N2; strategy: Fully-Automated.
- AC3 Đóng bằng nút, Esc (sự kiện `cancel`), bấm nền; trả focus về trigger (desktop) hoặc hamburger (mobile). proven by: T4, T5, N3 (logic) và P2 (native); strategy: Fully-Automated (logic) + Agent-Probe (native).
- AC4 Link "Mở trong tab mới" có `href` = `formPopupLinks.fallback`, `target="_blank"`, `rel="noopener noreferrer"`. proven by: T3; strategy: Fully-Automated.
- AC5 URL form chỉ nằm ở `_data/formPopup.ts`; không hardcode trong component; link merch không đổi. proven by: grep gate G8; strategy: Fully-Automated.
- AC6 Không cuộn ngang ở 360/390/768/1280/1440 (và 1024); popup mobile gần toàn màn hình, desktop tối đa ~720px; iframe lấp đầy và cuộn bên trong. proven by: probe P1 (đo `documentElement.scrollWidth <= clientWidth`, hộp dialog nằm trong viewport, ảnh chụp); strategy: Agent-Probe.
- AC7 Không có từ "vé" trong chuỗi mới. proven by: T8 (positive control kèm theo); strategy: Fully-Automated.
- AC8 Hỗ trợ truy cập: `aria-labelledby`, `aria-modal`, iframe có `title`, khóa cuộn, focus vào nút đóng khi mở. proven by: T2, T5, T6; strategy: Fully-Automated.
- AC9 Không hồi quy: test lân cận xanh; full vitest chỉ có lỗi đã biết; typecheck, lint scoped, lint toàn repo bằng baseline, build xanh. proven by: gates G2–G6; strategy: Fully-Automated.
- AC10 Form THẬT hiện trong iframe trên site đã deploy (kể cả với form yêu cầu đăng nhập). proven by: không có scenario tự động nào; được ghi là residual/kiểm tra tay của chủ repo (R1–R3); strategy: Agent-Probe chỉ như bằng chứng thử cục bộ (probe có thể không tới được Google); cổng AC10 luôn CONDITIONAL (xem Phase Completion Rules); stub backlog bắt buộc ở bước 10.
- AC11 Không header/CSP nào trong repo chặn iframe `docs.google.com`. proven by: gate G9 (grep không khớp trong `next.config.ts`, `src/proxy.ts`); strategy: Fully-Automated (chỉ trong phạm vi repo; header của hosting là residual R2).

## Implementation Checklist
Thứ tự tuần tự (một agent EXECUTE). Mỗi mục xong thì chạy gate liên quan (TDD: viết test trước).
1. Đọc lại `src/styles/globals.css` cuối file và `git status` (file đang có thay đổi chưa commit của việc radio); ghi nhận để chỉ thêm vào cuối. Tạo `src/app/(routes)/_data/formPopup.ts` theo D1/D2 (chỉ hằng số; không import).
2. Viết `src/components/FormPopup.test.tsx` TRƯỚC (T1–T8, polyfill `showModal`/`close` như `LoginDialog.test.tsx`; header `// @vitest-environment jsdom`; harness cho T5). Ghi file bằng công cụ Write/Edit, KHÔNG dùng heredoc shell. Mẫu chống "vé": `new RegExp("(?<![\\p{L}\\p{N}])v\\u00e9(?![\\p{L}\\p{N}])", "iu")` với dấu gạch chéo ngược KÉP trong chuỗi (một dấu sẽ bị TypeScript hiểu thành escape và mẫu hỏng); sau khi ghi, Grep file để chắc có đúng `\\p{L}` và `\\u00e9`; positive control: khớp "Mua vé ngay" và "vé", không khớp "véc-tơ". Chạy test: phải ĐỎ (chưa có component).
3. Viết `src/components/FormPopup.tsx` theo D3/D4 (named export, PascalCase, <= ~110 dòng; không đọc `ref.current` khi render; không `setState` trong effect). Chạy `npx.cmd vitest run src/components/FormPopup.test.tsx` đến xanh.
4. Viết `src/components/Navbar.test.tsx` (N1–N3) trước khi sửa Navbar: `vi.mock` cho `@/components/auth/HeaderAuth`, `@/app/(routes)/_components/TicketRequestDialog`, `@/app/(routes)/_components/RemoteImage`; stub `window.matchMedia` (Navbar gọi khi menu mở); polyfill dialog. Chạy: ĐỎ.
5. Sửa `src/components/Navbar.tsx` theo D6 (chỉ thêm). Chạy `npx.cmd vitest run src/components/Navbar.test.tsx src/components/FormPopup.test.tsx` đến xanh.
6. Thêm CSS cuối `src/styles/globals.css` theo D7 (không sửa luật cũ).
7. Chạy gate G1–G5 (vitest scoped, lân cận, typecheck, lint scoped) và sửa tại chỗ đến xanh.
8. Probe trình duyệt (G7) trên cổng 3217 sau build; chụp ảnh vào thư mục task; ghi số đo vào `navbar-google-form-popup_REPORT_18-11-26.md` cùng thư mục task. Nếu 1024px tràn ngang, áp dụng biện pháp D7 rồi probe lại.
9. Cập nhật tài liệu: hàng "Form popup" trong `component-contracts.md` (nút ở Navbar, popup một-instance điều khiển bằng prop, iframe nhúng lười, không sandbox, URL ở `_data/formPopup.ts`, residual bên thứ ba); `all-context.md` (cấu trúc + Open Questions); chạy `node .claude/skills/vc-context-discovery/scripts/discover-context.mjs --check-routing` và `node .claude/skills/vc-generate-context/scripts/validate-all-context.mjs`.
10. Ghi stub backlog `process/general-plans/backlog/form-popup-deployed-embed-check_NOTE_18-11-26.md` cho AC10/R1–R5 (kiểm tra tay trên site deploy, với trình duyệt có chặn cookie bên thứ ba, với form giới hạn đăng nhập); chạy full gates G6 (build) và G3 (full vitest); rồi báo cáo cho orchestrator (EVL do vc-tester chạy lại các gate).

## Gates (PowerShell, chạy từ gốc repo; Vitest bắt buộc chạy PowerShell)
| Id | Lệnh | Kỳ vọng |
|---|---|---|
| G1 | `npx.cmd vitest run src/components/FormPopup.test.tsx src/components/Navbar.test.tsx` | tất cả xanh |
| G2 | `npx.cmd vitest run src/components "src/app/(routes)/_components/TicketRequestDialog.test.tsx"` | xanh (gồm Footer, HeaderAuth, LoginDialog) |
| G3 | `npm.cmd test` | chỉ `src/lib/supabase/route-client.test.ts` đỏ (đã biết: kỳ vọng `secure:true`, nhận `false`); nếu `TicketRequestDialog.test.tsx` đỏ do timeout 5s hiếm gặp, chạy lại riêng file đó một lần và ghi cả hai kết quả; mọi lỗi khác là MỚI |
| G4 | `npm.cmd run typecheck` (KHÔNG chạy song song với build: cùng ghi `.next`) | exit 0 |
| G5 | `npx.cmd eslint src/components/Navbar.tsx src/components/FormPopup.tsx src/components/FormPopup.test.tsx src/components/Navbar.test.tsx "src/app/(routes)/_data/formPopup.ts" --max-warnings=0` | 0 vấn đề |
| G5b | `npm.cmd run lint` | 461 vấn đề (269 lỗi, 192 cảnh báo), tất cả dưới `.agents/ .claude/ .codex/`, KHÔNG có dưới `src/`; nhiều hơn hoặc có dòng dưới `src/` = MỚI |
| G6 | `npm.cmd run build` | lần đầu có thể exit 1 do cảnh báo lỗ hổng Next.js 16.4.3 sau khi biên dịch thành công; chạy lại, kỳ vọng exit 0; ghi cả hai mã thoát; KHÔNG nâng cấp dependency |
| G7 | `npx.cmd next start -p 3217` (sau build) rồi probe `agent-browser` ở 360, 390, 768, 1024, 1280, 1440; xong thì dừng đúng tiến trình đó, xác nhận cổng 3217 trống | xem AC6, P1, P2; KHÔNG dùng cổng 3000, KHÔNG kill server của chủ repo |
| G8 | `Select-String -Path (Get-ChildItem src -Recurse -Include *.ts,*.tsx -Exclude *.test.tsx).FullName -Pattern "docs.google.com/forms"`: mọi khớp chỉ ở `formPopup.ts` (có thể 2 dòng: embed và fallback); `Select-String "forms.gle/tW1VU8vpASc53CJa8" "src/app/(routes)/_data/brief.ts"` đúng 1 khớp (VALIDATE 2026-11-18: trước EXECUTE 0 khớp ngoài test, merch 1 khớp) | AC5 |
| G9 | `Select-String -Pattern "Content-Security-Policy","X-Frame-Options","frame-src","frame-ancestors" next.config.ts, src/proxy.ts` kèm positive control `Select-String -Pattern "poweredByHeader","reactStrictMode" next.config.ts, src/proxy.ts` | G9: 0 khớp (AC11); control: 2 khớp (nếu control không ra 2 thì gate vô nghĩa). Sửa tại VALIDATE 2026-11-18: lệnh cũ viết ký tự gạch đứng kèm gạch chéo ngược (escape của bảng Markdown) nên PowerShell khớp đúng ký tự đó và luôn trả 0 (đã chạy thử); dạng mảng `-Pattern` không có gạch đứng đã chạy thử: G9=0, control=2 |

Probe G7 chi tiết: ở mỗi độ rộng (a) đóng `LoginDialog` tự mở bằng Esc (xem phát hiện 8); (b) đo `document.documentElement.scrollWidth <= clientWidth` khi chưa mở và khi popup mở; (c) ở >=1024 bấm nút trong nav desktop; ở <1024 mở hamburger rồi bấm nút trong menu; (d) kiểm tra hộp dialog nằm trong viewport (mobile gần phủ kín, desktop rộng <= 720px, cao <= 100dvh - 32px), iframe cao đủ, có thanh cuộn bên trong chứ không cuộn nền; (e) tiêu đề `h2` đúng font/kiểu (kiểm tra rò luật `h2` toàn cục); (f) Esc đóng, focus về trigger/hamburger; mở lại, bấm nền đóng; (g) thử cả `/payment/return`; (h) chụp ảnh mỗi độ rộng. Nội dung iframe là của Google nên KHÔNG khẳng định; ghi chú iframe hiện gì (form, trang lỗi, hay trống) như quan sát, không như PASS.

## Verification Evidence
| Gate / Scenario | Strategy | Proves SPEC criterion |
|---|---|---|
| Navbar.test.tsx N1 (nút ở nav desktop và mobile, 5 NAV_LINKS còn nguyên) | Fully-Automated | AC1 |
| FormPopup.test.tsx T2 + Navbar.test.tsx N2 (iframe src embed, aria, không window.open) | Fully-Automated | AC2, AC8 |
| FormPopup.test.tsx T4, T5 + Navbar.test.tsx N3 (3 đường đóng, trả focus) | Fully-Automated | AC3 |
| Probe P2 (Esc thật, bấm nền thật, focus, khóa cuộn nền) | Agent-Probe | AC3 |
| FormPopup.test.tsx T3 (link dự phòng) | Fully-Automated | AC4 |
| G8 grep (URL chỉ ở formPopup.ts, merch nguyên) | Fully-Automated | AC5 |
| Probe P1 360/390/768/1024/1280/1440 (không tràn ngang, kích thước dialog) | Agent-Probe | AC6 |
| FormPopup.test.tsx T8 (không có từ "vé", positive control) | Fully-Automated | AC7 |
| FormPopup.test.tsx T6 (khóa cuộn), T5 (focus vào nút đóng) | Fully-Automated | AC8 |
| G2, G3, G4, G5, G5b, G6 (hồi quy) | Fully-Automated | AC9 |
| Form thật hiện trong iframe trên site deploy | Agent-Probe (thử cục bộ) + Known-gap (CONDITIONAL, stub backlog, kiểm tra tay) | AC10 |
| G9 grep header/CSP trong repo | Fully-Automated | AC11 |

## Data Flow and Failure Modes
Luồng: bấm nút (Navbar, Client) → `setFormOpen(true)` → `FormPopup` render dialog + (lần đầu) iframe → `showModal()` → trình duyệt của khách tải `docs.google.com` (bên thứ ba) → đóng (nút/Esc/nền) → `onClose` → `setFormOpen(false)` → `close()` + focus về `returnFocus`. Không có dữ liệu của chúng ta rời máy khách; câu trả lời gửi thẳng tới Google.
Chế độ lỗi: (1) iframe bị chặn hoặc trống (form yêu cầu đăng nhập/giới hạn tổ chức, cookie bên thứ ba bị chặn, mạng): link "Mở trong tab mới" luôn hiện dưới iframe; (2) JS tắt: nút không hoạt động (Navbar vốn Client); không có fallback no-JS cho nút này (chấp nhận, trùng hành vi các nút Navbar hiện có); (3) `showModal` ném lỗi nếu dialog đã mở: effect kiểm tra `el.open`; (4) Navbar đóng menu rồi popup trả focus về hamburger: ref `returnFocus` xác định, không phụ thuộc `activeElement`; (5) nút bị inert khi `LoginDialog` đang mở: đúng (chỉ một modal).

## Risk Predictions (vc-predict rút gọn, 5 góc nhìn)
| Góc nhìn | Rủi ro | Giảm thiểu |
|---|---|---|
| Kiến trúc | dialog đặt trong nav mobile ẩn thì không hiện | MỘT popup điều khiển bằng prop đặt ngoài nav (phát hiện 3), test N3 + probe |
| Bảo mật/riêng tư | nhúng bên thứ ba: trình duyệt khách gọi Google; sandbox không dùng được | chỉ tải iframe sau lần mở đầu; `referrerPolicy` tường minh; không mã theo dõi của chúng ta; ghi Residual R4 cho chủ repo |
| UX | thanh nav 1024–1199px tràn vì thêm mục; popup mobile bị thanh địa chỉ che | probe 1024; `100dvh` + safe-area; link dự phòng ở chân popup |
| Bảo trì/CSS | CSS cuối file bị thay đổi chồng bởi việc khác; luật `h2`/UA dialog rò | chỉ thêm cuối file, tiền tố `.form-popup*`, khai `max-width/height:none`, probe ảnh |
| Kiểm thử | jsdom không có Esc thật/`showModal`; lint `set-state-in-effect` | polyfill + mô phỏng `cancel`; render-phase derive; probe native; gate lint scoped |

## Test Infra Improvement Notes
- (none identified yet) lúc viết plan; ghi nhận ban đầu: ba nơi giờ lặp mẫu `<dialog>` + khóa cuộn + trả focus (`LoginDialog`, `TicketRequestDialog`, `FormPopup`); đề xuất tách hook `useModalDialog` dùng chung và một util test polyfill `HTMLDialogElement` dùng chung (`src/test/`) trong một task riêng, không làm trong task này.
- Chưa có test Navbar trước task này; N1–N3 là test Navbar đầu tiên.

## Residual cho chủ repo (không phải PASS)
- R1 Form có thật sự hiện trong iframe trên site deploy: cần kiểm tra tay (embed Google Forms được Google hỗ trợ qua `embedded=true`, nhưng chưa thử trong môi trường deploy).
- R2 Header do hosting thêm sau này (CSP/X-Frame-Options) có thể chặn; repo hiện không đặt bất kỳ header nào như vậy (G9).
- R3 Form giới hạn "chỉ người đăng nhập Google/một lần trả lời" hoặc cookie bên thứ ba bị chặn (Safari, Chrome chế độ chặn) có thể khiến trang đăng nhập không hiện trong iframe; link "Mở trong tab mới" là đường thoát.
- R4 Riêng tư/bên thứ ba: nhúng Google Form làm trình duyệt khách kết nối tới Google (và Google có thể đặt cookie/ghi nhận); chúng ta không thêm mã theo dõi nào; nếu cần đồng ý/cookie banner theo chính sách của ban tổ chức thì quyết định riêng.
- R5 Trải nghiệm bàn phím/đọc màn hình qua ranh giới iframe và iOS Safari không kiểm chứng được tự động.

## Quyết định mở cho chủ repo (nên xác nhận; plan đã chọn mặc định hợp lý)
- O1 Nhãn và tiêu đề: mặc định "Biểu mẫu" / "Biểu mẫu REPLY 199X" (mục đích form chưa biết). Đổi nhãn là sửa 1 dòng.
- O2 Link dự phòng: mặc định URL `viewform` (không qua `forms.gle`); có thể đổi sang link rút gọn `https://forms.gle/W4rPWP6rckzRFPkH9`.
- O3 Vị trí nút: mặc định cuối danh sách `NAV_LINKS` (sau "Liên hệ") ở cả desktop và mobile, kiểu liên kết thường; có thể đổi sang nút nổi bật cạnh nút "Đặt phiếu nước ngay".
- O4 Đóng rồi mở lại có giữ câu trả lời đang nhập hay không: mặc định GIỮ (iframe không bị gỡ sau lần mở đầu); nếu muốn form sạch mỗi lần mở thì gỡ iframe khi đóng (đổi 1 điều kiện).
- O5 Đồng ý riêng tư/cookie cho nội dung nhúng của Google (R4): chủ repo quyết định chính sách.

## Dependencies
Không dependency mới. Phụ thuộc môi trường: Node 22, `npm.cmd`/`npx.cmd` trên PowerShell, `agent-browser` đã có trong workspace, mạng tới Google chỉ cần cho phần quan sát tùy chọn của probe. Phụ thuộc quy trình: VALIDATE xong (contract `Gate: PASS`) và "ENTER EXECUTE MODE" của chủ repo trước khi EXECUTE.

## Validate Contract

Status: PASS
Date: 18-11-26
date: 2026-11-18
generated-by: outer-pvl

Parallel strategy: sequential
Rationale: score 1/7 (LOW; only S7, 8 file trong blast radius); file chong lan (Navbar + CSS + test cung mot thay doi) nen khong fan-out. Mot vc-execute-agent (opus, EXECUTE) thuc hien checklist 1-10 tuan tu, sau do vc-tester (sonnet) chay lai G1-G9 doc lap (EVL). Tong 2 agent (1 x 1 + 1 x 1), khong chay cost guard.

Test gates (C3 5-column table):

| criterion id | behavior | strategy | proving test | gap-resolution |
|---|---|---|---|---|
| AC1 | Nut "Bieu mau" co o nav desktop va nav mobile; 5 NAV_LINKS con nguyen | Fully-Automated | `npx.cmd vitest run src/components/Navbar.test.tsx` (N1) | B |
| AC1 | Bo cuc that: nut nam dung nav theo breakpoint tren `/` va `/payment/return`, khong tran ngang | Agent-Probe | G7 probe P1 (`agent-browser`, cong 3217, 360/390/768/1024/1280/1440) | B |
| AC2 | Bam nut mo modal co tieu de + iframe `src` = `formPopupLinks.embed`, khong `window.open` | Fully-Automated | `npx.cmd vitest run src/components/FormPopup.test.tsx src/components/Navbar.test.tsx` (T2, N2) | B |
| AC3 | Dong bang nut, `cancel` (Esc mo phong), bam nen; tra focus ve trigger/hamburger | Fully-Automated | `npx.cmd vitest run src/components/FormPopup.test.tsx src/components/Navbar.test.tsx` (T4, T5, N3) | B |
| AC3 | Esc that, bam `::backdrop` that, khoa cuon nen, focus tra ve | Agent-Probe | G7 probe P2 | B |
| AC4 | Link "Mo trong tab moi": `href` = `formPopupLinks.fallback`, `target="_blank"`, `rel="noopener noreferrer"` | Fully-Automated | `npx.cmd vitest run src/components/FormPopup.test.tsx` (T3) | B |
| AC5 | URL form chi o `_data/formPopup.ts`; link merch nguyen | Fully-Automated | G8 (PowerShell, lenh da sua trong bang Gates) | B |
| AC6 | Khong cuon ngang; popup mobile gan toan man hinh, desktop <= 720px; iframe lap day, cuon ben trong | Agent-Probe | G7 probe P1 (do `scrollWidth <= clientWidth`, hop dialog, anh chup) | B |
| AC7 | Khong co tu "ve" (co dau) trong chuoi moi | Fully-Automated | `npx.cmd vitest run src/components/FormPopup.test.tsx` (T8, positive control) | B |
| AC8 | `aria-labelledby`, `aria-modal`, iframe `title`, khoa cuon, focus vao nut dong | Fully-Automated | `npx.cmd vitest run src/components/FormPopup.test.tsx` (T2, T5, T6) | B |
| AC9 | Khong hoi quy: test lan can xanh; full vitest chi loi da biet; typecheck, lint, build | Fully-Automated | G2 `npx.cmd vitest run src/components "src/app/(routes)/_components/TicketRequestDialog.test.tsx"`, G3 `npm.cmd test`, G4 `npm.cmd run typecheck`, G5/G5b lint, G6 `npm.cmd run build` | A (G2 nen da xanh luc VALIDATE: 4 file, 41 test) / B |
| AC10 | Form THAT hien trong iframe tren site deploy (ke ca form yeu cau dang nhap) | Agent-Probe | chi quan sat cuc bo trong G7 (khong phai bang chung PASS); kiem tra tay cua chu repo tren site deploy | D |
| AC11 | Khong header/CSP nao trong repo chan iframe `docs.google.com` | Fully-Automated | G9 (lenh da sua, kem positive control) | B |

gap-resolution legend:
- A — proven now (gate passes in this cycle)
- B — fixed in this plan (gate added by this plan's checklist)
- C — deferred to a named later phase/plan
- D — backlog test-building stub (named residual; keep-active; continue)

C-4 reconciliation: the `strategy:` column carries ONLY the 3 proving strategies (Fully-Automated / Hybrid / Agent-Probe). Known-Gap is NEVER a `strategy:` value; AC10 is a named residual row carried via gap-resolution D, never claimed as proven.

Legacy line form (retained so existing validate-contract consumers still parse):
- Navbar + FormPopup logic: [Fully-automated: `npx.cmd vitest run src/components/FormPopup.test.tsx src/components/Navbar.test.tsx`]
- Regression: [Fully-automated: `npx.cmd vitest run src/components "src/app/(routes)/_components/TicketRequestDialog.test.tsx"`] | [Fully-automated: `npm.cmd test` (chi `src/lib/supabase/route-client.test.ts` do)] | [Fully-automated: `npm.cmd run typecheck`] | [Fully-automated: `npx.cmd eslint` scoped (G5) + `npm.cmd run lint` baseline 461 (G5b)] | [Fully-automated: `npm.cmd run build`]
- Static greps: [Fully-automated: G8, G9 (lenh da sua)]
- Layout/native dialog: [agent-probe: G7 P1/P2 tren cong 3217]
- Form that trong iframe tren site deploy: [known-gap: documented — residual R1-R5, backlog stub `form-popup-deployed-embed-check_NOTE_18-11-26.md`, chu repo kiem tra tay]

Failing stubs (Fully-Automated rows; red-first starting point for execute-agent; NOT written to disk at VALIDATE):

Failing stub (AC1 / Navbar N1):
```
test("should render a Bieu mau button in both desktop and mobile navs and keep the five NAV_LINKS", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub: Navbar form button in both navs")
})
```
Failing stub (AC2 / T2, N2):
```
test("should render the iframe with the exact embed src when open", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: iframe embed src")
})
```
Failing stub (AC3 / T4, T5, N3):
```
test("should restore focus to the trigger on close", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub for: focus restore")
})
test("should call onClose for the close button, cancel event and backdrop click", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub: three close paths")
})
```
Failing stub (AC4 / T3):
```
test("should render the open-in-new-tab fallback link with noopener noreferrer", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub: fallback link attributes")
})
```
Failing stub (AC7 / T8):
```
test("should not contain the word ve (accented) in any new string", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub: no-ve wording with positive control")
})
```
Failing stub (AC8 / T6):
```
test("should lock and restore background scrolling", () => {
  throw new Error("NOT IMPLEMENTED — TDD stub: scroll lock restore")
})
```

Dimension findings:
- Infra fit: PASS — `Navbar.tsx` thuc te la Client Component 109 dong, `menuButton`/`header` ref va `TicketRequestDialog` + `HeaderAuth` khop plan; menu mobile `hidden={!open}` nen mot popup dieu khien bang prop ngoai nav la dung; `next.config.ts` chi co `reactStrictMode` + `poweredByHeader`, `src/proxy.ts` chi dat `Cache-Control` (matcher `/` va `/auth/*`), khong CSP/XFO; `globals.css` (945 dong, LF, ket thuc bang khoi `@media(prefers-reduced-motion...)` da dong) an toan de them cuoi file, khong co `.form-popup*` hay `.event-header__link--button` nao san; `.next/dev` tach rieng khoi `.next` build nen build khong dam vao dev server cong 3000; cong 3217 trong luc VALIDATE.
- Test coverage: PASS — mau polyfill `showModal`/`close` co o `LoginDialog.test.tsx`, `HeaderAuth.test.tsx`, `TicketRequestDialog.test.tsx` nhung KHONG o `src/test/setup.ts` nen moi file test phai tu polyfill (plan da noi); G2 baseline xanh luc VALIDATE (4 file, 41 test); `npx.cmd eslint src --max-warnings=0` sach luc VALIDATE; moi hanh vi phat trien co cong Fully-Automated hoac Agent-Probe, AC10 la residual da dat ten (khong phai hanh vi do chung ta phat trien).
- Breaking changes: PASS — khong doi chu ky `Navbar({ auth })`, `NAV_LINKS`, `projectLinks`; `brief.ts`, `Footer*`, file muc radio, `LoginDialog*`, `HeaderAuth*` nam ngoai Touchpoints; link merch `https://forms.gle/tW1VU8vpASc53CJa8` con dung 1 khop o `brief.ts` dong 38.
- Security surface: PASS — khong auth/billing/schema/API/secret; nhung bên thu ba (Google Forms) qua iframe, khong `sandbox` co ly do (sandbox du chat khong chay duoc Forms), `referrerPolicy="strict-origin-when-cross-origin"`, link dich vu `target="_blank" rel="noopener noreferrer"`, iframe chi tai sau lan mo dau; rui ro rieng tu/ben thu ba ghi o R4/O5 de chu repo quyet dinh.
- Section 1 (_data/formPopup.ts + FormPopup.tsx): PASS — mau `<dialog>` + `showModal()` + khoa cuon + tra focus la mau co san; mau "derive in render" (`if (open && !armed) setArmed(true)`) va truyen `returnFocus` ref qua prop da duoc chay thu qua ESLint cua repo (stdin, khong ghi file): 0 van de, con positive control `setState` trong effect bi bao `react-hooks/set-state-in-effect`; `@types/react` 19.3.0 cho phep gan `ref.current`; highest-risk: dialog trong nav an (da tranh), khong doc `ref.current` luc render.
- Section 2 (Navbar.tsx): PASS — chi them; dialog ngoai `<nav hidden>`; pointerdown trong popup tinh la "trong header" nen `closeOutside` khong xung dot; highest-risk: tra focus ve hamburger sau khi menu dong (da co ref xac dinh + N3).
- Section 3 (globals.css): PASS — them cuoi file an toan, khong va cham ten lop; luat `.event-header__link:hover`/`[aria-current]` (do dac hieu cao hon) khong bi `.event-header__link--button` ghi de; highest-risk: file con dang thuoc ve cong viec radio chua commit (xem E3).
- Section 4 (test files + docs + backlog + gates): PASS sau khi sua tai VALIDATE — G9 cu dung `\|` (dau go bang Markdown) nen khi chay trong PowerShell la dau `|` nguyen van, luon tra 0 (vo nghia, da chay thu); da sua trong bang Gates thanh `-Pattern` dang mang khong co dau `|`, kem positive control; G8 viet lai thanh lenh PowerShell day du khong dung duong ong. Hai lenh moi da chay thu: G9=0, control=2, G8 ngoai test=0 (truoc EXECUTE), merch=1.

Open gaps:
- AC10 / R1-R5 form that hien trong iframe tren site deploy, header hosting, form yeu cau dang nhap/cookie ben thu ba, rieng tu, ban phim qua ranh gioi iframe/iOS: known-gap: documented as NEW PLAN REQUIRED — see backlog/form-popup-deployed-embed-check_NOTE_18-11-26.md (stub se duoc ghi o checklist buoc 10; chu repo kiem tra tay). Khong tinh la bang chung PASS.
- Quyet dinh mo O1-O5 cua chu repo (nhan, URL du phong, vi tri nut, giu cau tra loi khi dong, dong y rieng tu): da co mac dinh hop ly, khong chan EXECUTE.

What this coverage does NOT prove:
- Navbar.test.tsx N1-N3 / FormPopup.test.tsx T1-T8 (jsdom): KHONG chung minh hien thi theo breakpoint (CSS), Esc that / bam `::backdrop` that, thu tu Tab qua iframe, cuon that tren iOS, tai mang that cua iframe, noi dung form cua Google, hay link mo dung tab trong trinh duyet that.
- G2/G3 regression: khong chung minh hanh vi cua cac test khong chay (lib/api); G3 co loi da biet `route-client.test.ts` (secure cookie) va flake 5s hiem gap o `TicketRequestDialog.test.tsx`.
- G4/G5/G5b/G6 (typecheck, lint, build): khong chung minh tuong tac hay giao dien; G5b la baseline 461 van de duoi `.agents/ .claude/ .codex/` (khong duoi `src/`); build co the exit 1 lan dau vi canh bao lo hong Next.js 16.4.3.
- G8/G9 (grep): chi pham vi repo; header do hosting them sau nay (R2) khong duoc chung minh.
- G7 probe: khong chung minh noi dung iframe (cua Google), iOS Safari, hay hanh vi tren site deploy; chi quan sat cuc bo tren cong 3217 sau build.
- Khong co gate nao chung minh form that gui duoc tra loi toi Google.

Gate: PASS
Accepted by: not required for Gate: PASS; owner (chu repo) da noi "ENTER EXECUTE MODE" truoc VALIDATE; khong co CONCERN nao con ton tai (G8/G9 da sua trong plan). Residual AC10/R1-R5 la known-gap da dat ten (gap-resolution D), khong phai CONCERN chua xu ly.

### Plan updates applied at VALIDATE (P-items)
| # | What changed | Where in plan | Why |
|---|---|---|---|
| P1 | G9 viet lai: `-Pattern` dang mang (khong co ky tu gach dung) + positive control `-Pattern "poweredByHeader","reactStrictMode"` phai tra 2 khop | Gates, hang G9 | `\|` cu la escape cua bang Markdown, trong PowerShell khop dau `|` nguyen van nen luon 0 (vacuous green); da chay thu |
| P2 | G8 viet thanh lenh PowerShell day du (`Get-ChildItem ... -Exclude *.test.tsx` truyen vao `Select-String -Path`) | Gates, hang G8 | lenh cu chi la mo ta, thieu chinh xac |
| P3 | Cap nhat trang thai: Validate-contract written (2026-11-18, Gate: PASS) | Current Execution State, Resume (muc 3) | dong bo trang thai |

### Execute-Agent Instructions
| # | Instruction | Trigger condition |
|---|---|---|
| E1 | Ghi moi file test (`FormPopup.test.tsx`, `Navbar.test.tsx`) CHI bang cong cu Write/Edit, KHONG heredoc / here-string shell. Da kiem chung khi VALIDATE: heredoc Git Bash nuot dau `\\` thanh `\`, khien mau "ve" bien thanh `p{L}` + chu `é` truc tiep (khop sai, vo nghia). Mau dung: `new RegExp("(?<![\\p{L}\\p{N}])v\\u00e9(?![\\p{L}\\p{N}])", "iu")` (dau gach cheo nguoc KEP trong chuoi). Da chay thu bang Write: khop "mua vé ngay", "vé", "Mua vé ngay", "vé."; KHONG khop "véc-tơ", "vẻ", "nghề", "Biểu mẫu", "Biểu mẫu REPLY 199X", "Đóng biểu mẫu", "Mở trong tab mới ↗", "Không thấy biểu mẫu?". Sau khi ghi, Grep file de chac co `\\p{L}` va `\\u00e9`; test phai co positive control (khop "Mua vé ngay"). | Checklist buoc 2, 4 |
| E2 | Moi file test tu polyfill `HTMLDialogElement.prototype.showModal/close` (setup chung `src/test/setup.ts` KHONG co), header `// @vitest-environment jsdom`. Dialog dong khong co `open` nen jsdom an no: `queryByRole("dialog")` = null khi dong. iframe KHONG co ARIA role: truy van bang `getByTitle(FORM_POPUP_TITLE)` hoac `container.querySelector("iframe")` (T7: iframe van trong DOM sau dong). jsdom khong tai iframe nen khong co goi mang. | Checklist buoc 2, 4 |
| E3 | Navbar test: nav mobile co `hidden` nen truy van phai dung `{ hidden: true }` khi chua mo menu; stub `window.matchMedia` bang `vi.stubGlobal` trong `beforeEach` (tra ve `{ matches:false, addEventListener, removeEventListener }`; setup chung se `unstubAllGlobals` sau moi test); mock `@/components/auth/HeaderAuth`, `@/app/(routes)/_components/TicketRequestDialog`, `@/app/(routes)/_components/RemoteImage`; N3 khang dinh `document.activeElement` = nut hamburger sau khi dong popup. | Checklist buoc 4, 5 |
| E4 | `globals.css`: CHI them cuoi file bang cong cu Edit/Write phan duoi (KHONG ghi de ca file, KHONG sua luat radio hay luat cu). Doc lai phan cuoi file NGAY truoc khi them (luc VALIDATE: 945 dong, LF, ket thuc bang `@media(prefers-reduced-motion:no-preference){ ... }` da dong). Da kiem chung: khong co `.form-popup*` hay `.event-header__link--button` san; `.event-header__link:hover` va `[aria-current]` co do dac hieu cao hon `.event-header__link--button` nen van thang. Giu LF. | Checklist buoc 6 |
| E5 | Tai lieu: `process/context/all-context.md` va `process/context/uxui/component-contracts.md` dang co thay doi radio CHUA commit (xac nhan bang `git diff --stat`: 12 va 10 dong). Chi CHEN them (Edit), khong Write ca file, khong revert, khong lam mat noi dung radio. Sau do chay `node .claude/skills/vc-context-discovery/scripts/discover-context.mjs --check-routing` (luc VALIDATE: "routing block is in sync") va `node .claude/skills/vc-generate-context/scripts/validate-all-context.mjs` (luc VALIDATE: 0 failure, 0 warning). | Checklist buoc 9 |
| E6 | Chay G8/G9 theo lenh DA SUA trong bang Gates (khong dung ky tu gach dung trong -Pattern); kem positive control G9 (phai ra 2 khop). Neu G9 tra 0 ma control khong ra 2 thi gate vo nghia: sua lenh truoc khi tin ket qua. G8 sau EXECUTE: moi khop ngoai test deu o `formPopup.ts` (co the 2 dong: embed va fallback). | Checklist buoc 7, 10 |
| E7 | Lint: mau da chon (derive-in-render `if (open && !armed) setArmed(true)`, truyen `returnFocus` ref qua prop, `returnFocus` trong deps cua effect) da duoc ESLint cua repo chap nhan. Khong dung `setState` trong effect, khong doc `ref.current` luc render. Luc VALIDATE `npx.cmd eslint src --max-warnings=0` sach. | Checklist buoc 3, 5, 7 |
| E8 | Cong: 3000 la dev server cua chu repo (PID 14604 luc VALIDATE) — KHONG kill, KHONG dung. Truoc probe kiem tra 3217 trong (luc VALIDATE: trong); neu co tien trinh khac chiem (vd EVL cua viec radio), dung 3218 va ghi lai. Khoi dong bang `Start-Process -PassThru`, ghi PID, chi dung dung PID do roi xac nhan cong trong. Build dung `.next` goc, dev dung `.next/dev` nen build khong dam vao dev server; van KHONG chay `typecheck` va `build` song song. | Checklist buoc 8, 10; G4, G6, G7 |
| E9 | Pham vi: chay `git status --short` truoc va sau; tap file thay doi (ngoai thu muc task `process/general-plans/active/navbar-google-form-popup_18-11-26/` va backlog stub) phai bang dung Touchpoints: `_data/formPopup.ts`, `FormPopup.tsx`, `Navbar.tsx`, `globals.css`, `FormPopup.test.tsx`, `Navbar.test.tsx`, `component-contracts.md`, `all-context.md`. KHONG cham `brief.ts`, `Footer*`, file radio (`ChannelsSection*`, `ChannelsRadio*`, `Radio*`, `channels.ts`), `LoginDialog*`, `HeaderAuth*`, `TicketRequestDialog*`, `next.config.ts`, `src/proxy.ts`, `package*.json`. Link merch giu nguyen. | Moi buoc |
| E10 | Bao cao (`navbar-google-form-popup_REPORT_18-11-26.md` cung thu muc task) ghi ro: AC10 chi la quan sat (iframe hien form / trang loi / trong), KHONG tinh la PASS; ghi ca hai ma thoat cua build (G6) va ca hai ket qua neu phai chay lai `TicketRequestDialog.test.tsx`. Stub backlog buoc 10 ghi phang tai `process/general-plans/backlog/form-popup-deployed-embed-check_NOTE_18-11-26.md` (backlog la NOTE phang theo `plan-lifecycle.md`). | Checklist buoc 8, 10 |
| E11 | Loi da biet (khong phai MOI): `src/lib/supabase/route-client.test.ts` (secure cookie, G3); 461 van de lint duoi `.agents/ .claude/ .codex/` (G5b); `validate-context-discovery`, `validate-skills`, `validate-guide-sync`; flake timeout 5s hiem gap o `TicketRequestDialog.test.tsx` duoi tai full-suite (chay lai rieng file, ghi ca hai). Moi loi khac la MOI va phai sua. | G3, G5b, buoc 10 |

### Backlog Artifacts
| Artifact | Location | What it tracks |
|---|---|---|
| `form-popup-deployed-embed-check_NOTE_18-11-26.md` (se ghi o checklist buoc 10) | `process/general-plans/backlog/` | AC10 / R1-R5: kiem tra tay form hien trong iframe tren site deploy, voi trinh duyet chan cookie ben thu ba, voi form gioi han dang nhap, header hosting, ban phim/doc man hinh qua iframe |

## Autonomous Goal Block

```
SESSION GOAL: Popup Google Form tu Navbar — nut "Biểu mẫu" (desktop + menu mobile) mo modal <dialog> nhung iframe `viewform?embedded=true`; dong bang nut, Esc, bam nen; link du phong "Mở trong tab mới".
Charter + umbrella plan: N/A — single plan: process/general-plans/active/navbar-google-form-popup_18-11-26/navbar-google-form-popup_PLAN_18-11-26.md
Autonomy: chay checklist 1-10 tuan tu, test truoc (TDD), khong hoi lai giua cac buoc; chi dung o hard stop (xem feedback_autonomous_phase_execution.md). Moi EXECUTE do vc-execute-agent (opus) lam, EVL do vc-tester (sonnet) chay lai G1-G9; dieu phoi KHONG tu sua file hay tu chay gate.
Hard stops / safety constraints:
- KHONG kill hay dung cong 3000 (dev server cua chu repo); probe chi tren cong 3217 (neu bi chiem dung 3218), chi dung dung PID minh khoi dong.
- KHONG sua: brief.ts (ke ca link merch forms.gle/tW1VU8vpASc53CJa8), Footer*, file radio (Channels*, Radio*, channels.ts), LoginDialog*, HeaderAuth*, TicketRequestDialog*, next.config.ts, src/proxy.ts, package*.json, src/lib, src/app/api, supabase.
- globals.css, all-context.md, component-contracts.md dang co thay doi radio chua commit: chi CHEN them (Edit), khong ghi de ca file, khong revert.
- File test chi ghi bang Write/Edit (khong heredoc shell); mau "vé" dung `\\p{L}` va `\\u00e9` kem positive control.
- Khong them dependency, khong window.open, khong sandbox, khong ma theo doi; khong nang cap Next.js.
- AC10 (form that hien trong iframe tren site deploy) la residual: KHONG tinh la PASS; khong commit/push/deploy khi chua duoc yeu cau.
- Khong thao tac production, khong dung secret.
Next phase: EXECUTE: process/general-plans/active/navbar-google-form-popup_18-11-26/navbar-google-form-popup_PLAN_18-11-26.md (ENTER EXECUTE MODE da duoc chu repo cho phep)
Validate contract: inline in plan (## Validate Contract, Gate: PASS, 2026-11-18)
Execute start: fully-auto: `npx.cmd vitest run src/components/FormPopup.test.tsx src/components/Navbar.test.tsx` (G1), G2 `npx.cmd vitest run src/components "src/app/(routes)/_components/TicketRequestDialog.test.tsx"`, G3 `npm.cmd test` (chi route-client.test.ts do da biet), G4 `npm.cmd run typecheck`, G5 eslint scoped, G5b `npm.cmd run lint` (461 duoi .agents/.claude/.codex), G6 `npm.cmd run build`, G8/G9 grep (lenh da sua) | e2e spec: none | probe: agent-browser cong 3217 o 360/390/768/1024/1280/1440 (P1, P2) | high-risk pack: no
```

## Resume and Execution Handoff
1. Selected plan file path: `process/general-plans/active/navbar-google-form-popup_18-11-26/navbar-google-form-popup_PLAN_18-11-26.md`
2. Last completed phase/step: PLAN (chưa có code, chưa sửa file nguồn).
3. Validate-contract status: written (2026-11-18, generated-by: outer-pvl, Gate: PASS); cổng AC10 là residual đã đặt tên (known-gap, stub backlog ở checklist bước 10), không phải CONCERN chưa xử lý.
4. Supporting context files loaded: `process/context/all-context.md`, `process/context/uxui/all-uxui.md`, `process/context/uxui/component-contracts.md`, `process/context/tests/all-tests.md`, `process/development-protocols/plan-lifecycle.md`, `src/components/Navbar.tsx`, `src/lib/constants.ts`, `src/app/(routes)/_data/brief.ts`, `next.config.ts`, `src/proxy.ts`, `src/app/(routes)/layout.tsx`, `TicketRequestDialog.tsx`, `LoginDialog.tsx`, `HeaderAuth.tsx`, `src/styles/globals.css` (đoạn liên quan), các test dialog mẫu.
5. Next step cho agent mới: chạy VALIDATE trên plan này; sau khi chủ repo nói "ENTER EXECUTE MODE", spawn vc-execute-agent (opus) với đường dẫn plan này và thực hiện checklist 1–10 theo đúng thứ tự (test trước); vc-tester (sonnet) chạy lại G1–G9 độc lập (EVL); không chạm file ngoài Touchpoints; không kill server cổng 3000; dùng cổng 3217. Validator: `node .claude/skills/vc-generate-plan/scripts/validate-plan-artifact.mjs process/general-plans/active/navbar-google-form-popup_18-11-26/navbar-google-form-popup_PLAN_18-11-26.md`.

Next Step: EXECUTE (spawn vc-execute-agent, opus, với đường dẫn plan này; sau đó vc-tester EVL, sonnet); context test: `process/context/tests/all-tests.md`; ngữ cảnh gốc: `process/context/all-context.md`.

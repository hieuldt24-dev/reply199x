"use client";

import { useId, useRef, type FormEvent, type ReactNode } from "react";
import { assets, merchCombos } from "../_data/home";
import { RemoteImage } from "./RemoteImage";

type TicketRequestDialogProps = Readonly<{
  className: string;
  children: ReactNode;
}>;

const recipient = "loihoidap199x@gmail.com";

export function TicketRequestDialog({ className, children }: TicketRequestDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fieldId = useId();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const quantity = String(formData.get("quantity") ?? "1");
    const merch = String(formData.get("merch") ?? "Không kèm merch");
    const subject = `Đăng ký vé REPLY 199X — ${name}`;
    const body = [
      `Họ tên: ${name}`,
      `Email: ${email}`,
      `Số điện thoại: ${phone || "Chưa cung cấp"}`,
      `Số vé quan tâm: ${quantity}`,
      `Merch đính kèm: ${merch}`,
    ].join("\n");

    window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        type="button"
        className={className}
        aria-haspopup="dialog"
        aria-controls={`${fieldId}-dialog`}
        onClick={() => dialogRef.current?.showModal()}
      >
        {children}
      </button>
      <dialog
        ref={dialogRef}
        id={`${fieldId}-dialog`}
        className="ticket-request-dialog"
        aria-labelledby={`${fieldId}-title`}
        aria-describedby={`${fieldId}-notice`}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current.close();
        }}
      >
        <div className="ticket-request-dialog__layout">
          <button className="ticket-request-dialog__close" type="button" aria-label="Đóng biểu mẫu" onClick={() => dialogRef.current?.close()}>
            ×
          </button>
          <form className="ticket-request-dialog__form" onSubmit={handleSubmit}>
            <div className="ticket-request-dialog__masthead">
              <span className="ticket-request-dialog__brand">Reply 199x</span>
              <span className="ticket-request-dialog__edition">ĐĂNG KÝ QUAN TÂM</span>
            </div>
            <header className="ticket-request-dialog__intro">
              <span className="ticket-request-dialog__eyebrow">DÒNG CHẢY HOÀI NIỆM · 22.11.2026</span>
              <h2 id={`${fieldId}-title`}>Một vé về<br /><em>miền ký ức.</em></h2>
              <p id={`${fieldId}-notice`} className="ticket-request-dialog__notice">
                Để lại thông tin, hẹn nhau ở REPLY 199X. Vé chưa mở bán chính thức; ban tổ chức sẽ phản hồi qua email.
              </p>
            </header>

            <div className="ticket-request-dialog__fields">
              <label htmlFor={`${fieldId}-name`}>
                <span className="ticket-request-dialog__label">Họ và tên</span>
                <input id={`${fieldId}-name`} name="name" autoComplete="name" placeholder="Tên của bạn" required />
              </label>
              <label htmlFor={`${fieldId}-email`}>
                <span className="ticket-request-dialog__label">Email</span>
                <input id={`${fieldId}-email`} name="email" type="email" autoComplete="email" placeholder="ban@email.com" required />
              </label>
              <label htmlFor={`${fieldId}-phone`}>
                <span className="ticket-request-dialog__label">Số điện thoại <small>(tùy chọn)</small></span>
                <input id={`${fieldId}-phone`} name="phone" type="tel" autoComplete="tel" placeholder="Số liên lạc" />
              </label>
              <label htmlFor={`${fieldId}-quantity`}>
                <span className="ticket-request-dialog__label">Số vé quan tâm</span>
                <select id={`${fieldId}-quantity`} name="quantity" defaultValue="1">
                  {[1, 2, 3, 4].map((quantity) => <option key={quantity} value={quantity}>{quantity} vé</option>)}
                </select>
              </label>
              <label className="ticket-request-dialog__merch" htmlFor={`${fieldId}-merch`}>
                <span className="ticket-request-dialog__label">Kỷ vật đi cùng <small>(tùy chọn)</small></span>
                <select id={`${fieldId}-merch`} name="merch" defaultValue="Không kèm merch">
                  <option>Không kèm merch</option>
                  {merchCombos.map((combo) => <option key={combo.id}>{`${combo.title} · ${combo.price}đ`}</option>)}
                </select>
              </label>
            </div>

            <button className="ticket-request-dialog__submit" type="submit">Tạo email đăng ký <span aria-hidden="true">→</span></button>
            <p className="ticket-request-dialog__privacy">Mở email nháp để bạn kiểm tra và tự gửi thông tin.</p>
            <div className="ticket-request-dialog__stub" aria-hidden="true">
              <span>HẸN GẶP BẠN<br /><strong>Ở MỘT THỜI THƯƠNG NHỚ.</strong></span>
              <span className="ticket-request-dialog__barcode" />
            </div>
          </form>
          <figure className="ticket-request-dialog__poster">
            <div className="ticket-request-dialog__poster-heading"><span>REPLY 199X</span><span>LIVE EXPERIENCE</span></div>
            <RemoteImage src={assets.poster} alt="Poster sự kiện REPLY 199X · Dòng Chảy Hoài Niệm" width={2000} height={2500} className="ticket-request-dialog__poster-image" fallback="REPLY 199X · 22.11.2026" />
            <figcaption>
              <div className="ticket-request-dialog__date"><strong>22</strong><span>THÁNG 11<br />2026</span></div>
              <div className="ticket-request-dialog__venue"><strong>On The Radio</strong><span>15:00 · 19:00 · Đà Nẵng</span></div>
            </figcaption>
          </figure>
        </div>
      </dialog>
    </>
  );
}

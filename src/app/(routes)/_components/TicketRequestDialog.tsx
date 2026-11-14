"use client";

import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { merchCombos } from "../_data/home";
import { MERCH_OPTIONS, TICKET_UNIT_PRICE_VND, type MerchOption } from "@/lib/ticket-orders/validation";
import { RemoteImage } from "./RemoteImage";

type TicketRequestDialogProps = Readonly<{
  className: string;
  children: ReactNode;
}>;

type SubmissionStatus =
  | Readonly<{ kind: "pending"; message: string }>
  | Readonly<{ kind: "success"; message: string; orderId?: string; totalVnd?: number }>
  | Readonly<{ kind: "unauthorized"; message: string }>
  | Readonly<{ kind: "error"; message: string }>;

type CheckoutResponse = string;

function navigateToCheckout(checkoutUrl: CheckoutResponse) {
  const url = new URL(checkoutUrl);
  if (url.protocol !== "https:" || url.hostname !== "pay.payos.vn" || url.username || url.password) throw new Error("Unsupported checkout destination.");
  window.location.assign(url.toString());
}

export function TicketRequestDialog({ className, children }: TicketRequestDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const submittingRef = useRef(false);
  const fieldId = useId();
  const idempotencyKey = useRef<string | null>(null);
  const idempotencyPayload = useRef<string | null>(null);
  const [status, setStatus] = useState<SubmissionStatus | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [merchOption, setMerchOption] = useState<MerchOption>("none");

  function resetSuccessfulSubmission() {
    setFormKey((key) => key + 1);
    setStatus(null);
    setQuantity(1);
    setMerchOption("none");
    idempotencyKey.current = null;
    idempotencyPayload.current = null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    submittingRef.current = true;
    setStatus({ kind: "pending", message: "Đang gửi yêu cầu của bạn…" });
    const formData = new FormData(event.currentTarget);
    const selectedQuantity = Number(formData.get("quantity") ?? "1");
    const selectedMerch = String(formData.get("merch") ?? "none") as MerchOption;
    const birthYearInput = String(formData.get("birthYear") ?? "").trim();
    const attendee = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      gender: String(formData.get("gender") ?? ""),
      birthYear: birthYearInput === "" ? null : Number(birthYearInput),
      quantity: selectedQuantity,
      merch: selectedMerch,
    };
    const payloadFingerprint = JSON.stringify(attendee);
    if (idempotencyPayload.current !== payloadFingerprint) {
      idempotencyKey.current = crypto.randomUUID();
      idempotencyPayload.current = payloadFingerprint;
    }

    try {
      const response = await fetch("/api/ticket-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: idempotencyKey.current, ...attendee }),
      });
      const result = await response.json().catch(() => null) as {
        order?: { id: string; totalVnd: number; status: string };
        checkoutUrl?: CheckoutResponse;
        error?: { code?: string };
      } | null;

      if (response.status === 401) {
        setStatus({ kind: "unauthorized", message: "Vui lòng đăng nhập Google để tiếp tục đặt vé." });
        return;
      }
      if (result?.error?.code === "checkout_reconciliation_required") {
        setStatus({ kind: "error", message: "Đơn đang cần đối soát với PayOS sau lần tạo thanh toán trước. Vui lòng liên hệ ban tổ chức; chưa tạo đơn hoặc thanh toán lại." });
        return;
      }
      if (result?.error?.code === "order_not_payable") {
        setStatus({ kind: "error", message: "Đơn này không còn ở trạng thái chờ thanh toán. Vui lòng liên hệ ban tổ chức để kiểm tra trạng thái đơn." });
        return;
      }
      if (!response.ok || response.status !== 201 || !result?.order || !result.checkoutUrl) {
        throw new Error("Ticket request could not be confirmed");
      }

      navigateToCheckout(result.checkoutUrl);

      if (dialogRef.current?.open) {
        setStatus({
          kind: "success",
          orderId: result.order.id,
          totalVnd: result.order.totalVnd,
          message: "Đang chuyển bạn đến PayOS để thanh toán. Trạng thái vé chỉ cập nhật sau khi hệ thống xác nhận giao dịch.",
        });
      } else {
        resetSuccessfulSubmission();
      }
    } catch {
      setStatus({
        kind: "error",
        message: "Không thể xác nhận yêu cầu. Yêu cầu có thể đã được ghi nhận; vui lòng liên hệ ban tổ chức trước khi gửi lại.",
      });
    } finally {
      submittingRef.current = false;
    }
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
        onClose={() => {
          if (status?.kind !== "success") return;
          resetSuccessfulSubmission();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current.close();
        }}
      >
        <div className="ticket-request-dialog__layout">
          <button className="ticket-request-dialog__close" type="button" aria-label="Đóng biểu mẫu" onClick={() => dialogRef.current?.close()}>
            ×
          </button>
          <form key={formKey} className="ticket-request-dialog__form" onSubmit={handleSubmit}>
            <div className="ticket-request-dialog__masthead">
              <span className="ticket-request-dialog__brand">Reply 199x</span>
              <span className="ticket-request-dialog__edition">ĐĂNG KÝ QUAN TÂM</span>
            </div>
            <header className="ticket-request-dialog__intro">
              <span className="ticket-request-dialog__eyebrow">KHÔNG GIAN ÂM NHẠC HOÀI NIỆM REPLY 199X · 22.11.2026</span>
              <h2 id={`${fieldId}-title`}>Một vé về<br /><em>thanh xuân.</em></h2>
            </header>

            <div className="ticket-request-dialog__fields">
              <label htmlFor={`${fieldId}-name`}>
                <span className="ticket-request-dialog__label">Họ và tên <small>Bắt buộc</small></span>
                <input id={`${fieldId}-name`} name="name" type="text" autoComplete="name" maxLength={120} placeholder="Tên trên vé" required />
              </label>
              <label htmlFor={`${fieldId}-email`}>
                <span className="ticket-request-dialog__label">Email <small>Bắt buộc</small></span>
                <input id={`${fieldId}-email`} name="email" type="email" autoComplete="email" inputMode="email" maxLength={254} placeholder="ban@example.com" required />
              </label>
              <label htmlFor={`${fieldId}-phone`}>
                <span className="ticket-request-dialog__label">Số điện thoại <small>Tùy chọn</small></span>
                <input id={`${fieldId}-phone`} name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={40} placeholder="09xx xxx xxx" />
              </label>
              <label htmlFor={`${fieldId}-gender`}>
                <span className="ticket-request-dialog__label">Giới tính <small>Tùy chọn</small></span>
                <select id={`${fieldId}-gender`} name="gender" defaultValue="">
                  <option value="">Không cung cấp</option>
                  <option value="female">Nữ</option>
                  <option value="male">Nam</option>
                  <option value="other">Khác</option>
                  <option value="undisclosed">Không muốn tiết lộ</option>
                </select>
              </label>
              <label htmlFor={`${fieldId}-birth-year`}>
                <span className="ticket-request-dialog__label">Năm sinh <small>Tùy chọn</small></span>
                <input id={`${fieldId}-birth-year`} name="birthYear" type="number" inputMode="numeric" min={1900} max={new Date().getFullYear()} step={1} placeholder="2000" />
              </label>
              <label htmlFor={`${fieldId}-quantity`}>
                <span className="ticket-request-dialog__label">Số lượng vé · 169.000đ/vé</span>
                <select id={`${fieldId}-quantity`} name="quantity" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}>
                  {[1, 2, 3, 4].map((quantity) => <option key={quantity} value={quantity}>{quantity} vé</option>)}
                </select>
              </label>
              <label className="ticket-request-dialog__merch" htmlFor={`${fieldId}-merch`}>
                <span className="ticket-request-dialog__label">Merch · chọn một gói cho đơn</span>
                <select id={`${fieldId}-merch`} name="merch" value={merchOption} onChange={(event) => setMerchOption(event.target.value as MerchOption)}>
                  <option value="none">Không kèm merch · 0đ</option>
                  {merchCombos.map((combo) => <option key={combo.id} value={combo.id}>{combo.title} · {combo.price}đ</option>)}
                </select>
              </label>
            </div>

            <p className="ticket-request-dialog__notice">
              Tạm tính: <strong>{(quantity * TICKET_UNIT_PRICE_VND + MERCH_OPTIONS[merchOption].priceVnd).toLocaleString("vi-VN")}đ</strong>. Đơn sẽ chờ thanh toán; chưa có QR hoặc xác nhận vé.
            </p>
            <p className="ticket-request-dialog__privacy">Email nhập trên biểu mẫu sẽ được lưu cùng đơn hàng, kể cả khi khác email Google.</p>

            <button className="ticket-request-dialog__submit" type="submit" disabled={status?.kind === "pending" || status?.kind === "success"}>
              {status?.kind === "pending" ? "Đang tạo đơn…" : status?.kind === "success" ? "Đơn đã được tạo" : "Tiếp tục đặt vé"}
              <span aria-hidden="true">→</span>
            </button>
            <p
              className="ticket-request-dialog__notice"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              data-status={status?.kind ?? "idle"}
            >
              {status?.message ?? ""}
              {status?.kind === "unauthorized" && <> <a href="/auth/sign-in" className="underline">Đăng nhập bằng Google</a></>}
              {status?.kind === "success" && status.orderId && status.totalVnd !== undefined && (
                <span className="mt-2 block">Mã đơn: {status.orderId} · Tổng cộng: {status.totalVnd.toLocaleString("vi-VN")}đ</span>
              )}
            </p>
            <div className="ticket-request-dialog__stub" aria-hidden="true">
              <span>HẸN GẶP BẠN<br /><strong>Ở MỘT THỜI THƯƠNG NHỚ.</strong></span>
              <span className="ticket-request-dialog__barcode" />
            </div>
          </form>
          <figure className="ticket-request-dialog__poster">
            <div className="ticket-request-dialog__poster-heading"><span>REPLY 199X</span><span>KHÔNG GIAN ÂM NHẠC HOÀI NIỆM</span></div>
            <RemoteImage
              src="/images/1794567834681_48355094629491256_48355094629491256_d855c0c2ea10cd6a6d411ae92785f5d2.jpg"
              alt="Poster REPLY 199X · Không gian âm nhạc hoài niệm · 22.11.2026"
              width={2478}
              height={1770}
              className="ticket-request-dialog__poster-image"
              fallback="REPLY 199X · 22.11.2026"
            />
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

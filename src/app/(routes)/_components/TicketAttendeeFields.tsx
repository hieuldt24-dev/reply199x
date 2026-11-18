"use client";

import { useState } from "react";
import { MERCH_OPTIONS, TICKET_ORDER_LIMIT, TICKET_UNIT_PRICE_VND, type MerchOption } from "@/lib/ticket-orders/validation";
import { formatVnd } from "./TicketOrderSummary";

export type AttendeeField = "name" | "email" | "phone" | "birthYear";
export type AttendeeErrors = Partial<Record<AttendeeField, string>>;

/** Server-accepted gender values; labels follow the brief, "" is "Không nêu". */
export const GENDER_OPTIONS = [
  { value: "", label: "Không nêu" },
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
  { value: "other", label: "Khác" },
  { value: "undisclosed", label: "Không muốn tiết lộ" },
] as const;

const fieldOrder: readonly AttendeeField[] = ["name", "email", "phone", "birthYear"];
// Mirrors the server-side patterns in validation.ts, which are not exported. The server stays authoritative.
const clientEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const clientPhonePattern = /^[+().\-\d\s]*$/u;
const merchIds = Object.keys(MERCH_OPTIONS) as MerchOption[];

export const attendeeFieldId = (idPrefix: string, field: AttendeeField) => `${idPrefix}-${field === "birthYear" ? "birth-year" : field}`;
export const firstAttendeeError = (errors: AttendeeErrors) => fieldOrder.find((field) => errors[field]);

/** Step-1 checks that run before advancing and again before any request is sent. */
export function validateAttendeeStep(formData: FormData, currentYear = new Date().getFullYear()): AttendeeErrors {
  const read = (key: string) => String(formData.get(key) ?? "").trim();
  const [name, email, phone, birthYear] = [read("name"), read("email"), read("phone"), read("birthYear")];
  const errors: AttendeeErrors = {};
  if (!name) errors.name = "Vui lòng nhập họ và tên.";
  if (!email) errors.email = "Vui lòng nhập email.";
  else if (!clientEmailPattern.test(email)) errors.email = "Email chưa đúng định dạng, ví dụ ban@example.com.";
  if (!clientPhonePattern.test(phone)) errors.phone = "Số điện thoại chỉ gồm chữ số, dấu cách và các ký tự + ( ) . -";
  if (birthYear && (!/^\d{4}$/u.test(birthYear) || Number(birthYear) < 1900 || Number(birthYear) > currentYear)) {
    errors.birthYear = `Năm sinh cần trong khoảng 1900–${currentYear}.`;
  }
  return errors;
}

type TicketAttendeeFieldsProps = Readonly<{
  idPrefix: string;
  errors: AttendeeErrors;
  onEdit: (field: AttendeeField) => void;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  merch: MerchOption;
  onMerchChange: (merch: MerchOption) => void;
}>;

export function TicketAttendeeFields({ idPrefix, errors, onEdit, quantity, onQuantityChange, merch, onMerchChange }: TicketAttendeeFieldsProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const expanded = moreOpen || Boolean(errors.birthYear);
  const control = (field: AttendeeField) => ({
    id: attendeeFieldId(idPrefix, field),
    "aria-invalid": errors[field] ? ("true" as const) : undefined,
    "aria-describedby": errors[field] ? `${attendeeFieldId(idPrefix, field)}-error` : undefined,
    onChange: () => onEdit(field),
  });
  const error = (field: AttendeeField) => errors[field] && (
    <p id={`${attendeeFieldId(idPrefix, field)}-error`} className="ticket-request-dialog__field-error" role="alert">{errors[field]}</p>
  );

  return (
    <div className="ticket-request-dialog__fields">
      <div className="ticket-request-dialog__field ticket-request-dialog__field--wide">
        <label className="ticket-request-dialog__label" htmlFor={attendeeFieldId(idPrefix, "name")}>Họ và tên <span className="ticket-request-dialog__req" aria-hidden="true">*</span></label>
        <input {...control("name")} name="name" type="text" autoComplete="name" maxLength={120} placeholder="Tên trên phiếu nước" required />
        {error("name")}
      </div>
      <div className="ticket-request-dialog__field">
        <label className="ticket-request-dialog__label" htmlFor={attendeeFieldId(idPrefix, "email")}>Email <span className="ticket-request-dialog__req" aria-hidden="true">*</span></label>
        <input {...control("email")} name="email" type="email" autoComplete="email" inputMode="email" maxLength={254} placeholder="ban@example.com" required />
        {error("email")}
      </div>
      <div className="ticket-request-dialog__field">
        <label className="ticket-request-dialog__label" htmlFor={attendeeFieldId(idPrefix, "phone")}>Số điện thoại <small>Tùy chọn</small></label>
        <input {...control("phone")} name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={40} placeholder="09xx xxx xxx" />
        {error("phone")}
      </div>
      <button
        className="ticket-request-dialog__more"
        type="button"
        aria-expanded={expanded}
        aria-controls={`${idPrefix}-more`}
        onClick={() => setMoreOpen((open) => !open)}
      >
        {expanded ? "Ẩn năm sinh và giới tính" : "Thêm năm sinh và giới tính (tùy chọn)"}
        <span aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button>
      <div id={`${idPrefix}-more`} className="ticket-request-dialog__more-fields" data-expanded={expanded ? "true" : "false"}>
        <div className="ticket-request-dialog__field">
          <label className="ticket-request-dialog__label" htmlFor={attendeeFieldId(idPrefix, "birthYear")}>Năm sinh <small>Tùy chọn</small></label>
          <input {...control("birthYear")} name="birthYear" type="number" inputMode="numeric" min={1900} max={new Date().getFullYear()} step={1} placeholder="2000" />
          {error("birthYear")}
        </div>
        <div className="ticket-request-dialog__field">
          <label className="ticket-request-dialog__label" htmlFor={`${idPrefix}-gender`}>Giới tính <small>Tùy chọn</small></label>
          <select id={`${idPrefix}-gender`} name="gender" defaultValue="">
            {GENDER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </div>
      <fieldset className="ticket-request-dialog__quantity">
        <legend className="ticket-request-dialog__label">Số phiếu nước · {formatVnd(TICKET_UNIT_PRICE_VND)}/phiếu</legend>
        <div className="ticket-request-dialog__stepper">
          <button type="button" aria-label="Giảm số phiếu nước" disabled={quantity <= 1} onClick={() => onQuantityChange(Math.max(1, quantity - 1))}>
            <span aria-hidden="true">−</span>
          </button>
          <span className="ticket-request-dialog__stepper-value" aria-label="Số phiếu nước đã chọn" aria-live="polite">{quantity}</span>
          <button type="button" aria-label="Tăng số phiếu nước" disabled={quantity >= TICKET_ORDER_LIMIT} onClick={() => onQuantityChange(Math.min(TICKET_ORDER_LIMIT, quantity + 1))}>
            <span aria-hidden="true">+</span>
          </button>
        </div>
        <input type="hidden" name="quantity" value={quantity} />
        <p className="ticket-request-dialog__hint">Tối đa {TICKET_ORDER_LIMIT} phiếu nước mỗi đơn.</p>
      </fieldset>
      <div className="ticket-request-dialog__field">
        <label className="ticket-request-dialog__label" htmlFor={`${idPrefix}-merch`}>Merch · chọn một gói cho đơn</label>
        <select id={`${idPrefix}-merch`} name="merch" value={merch} onChange={(event) => onMerchChange(event.target.value as MerchOption)}>
          {merchIds.map((id) => <option key={id} value={id}>{MERCH_OPTIONS[id].label} · {formatVnd(MERCH_OPTIONS[id].priceVnd)}</option>)}
        </select>
      </div>
    </div>
  );
}

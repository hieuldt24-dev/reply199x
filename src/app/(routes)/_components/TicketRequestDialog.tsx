"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import type { MerchOption } from "@/lib/ticket-orders/validation";
import { TicketAttendeeFields, attendeeFieldId, firstAttendeeError, validateAttendeeStep, type AttendeeErrors } from "./TicketAttendeeFields";
import { TicketOrderReview, readReviewDetails, type ReviewDetails } from "./TicketOrderReview";
import { ORDER_STEP_TITLES, TicketOrderSteps, type OrderStep } from "./TicketOrderSteps";
import { TicketOrderSummary } from "./TicketOrderSummary";
import { TicketStub } from "./TicketStub";
import { TicketSurveyFields, useTicketSurvey } from "./TicketSurveyFields";

type TicketRequestDialogProps = Readonly<{
  className: string;
  children: ReactNode;
}>;

type SubmissionStatus =
  | Readonly<{ kind: "pending"; message: string }>
  | Readonly<{ kind: "success"; message: string; orderId?: string; totalVnd?: number }>
  | Readonly<{ kind: "unauthorized"; message: string }>
  | Readonly<{ kind: "restricted"; message: string }>
  | Readonly<{ kind: "error"; message: string }>;

type CheckoutResponse = string;

function navigateToCheckout(checkoutUrl: CheckoutResponse) {
  const url = new URL(checkoutUrl);
  if (url.protocol !== "https:" || url.hostname !== "pay.payos.vn" || url.username || url.password) throw new Error("Unsupported checkout destination.");
  window.location.assign(url.toString());
}

export function TicketRequestDialog({ className, children }: TicketRequestDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const focusStepHeading = useRef(false);
  const submittingRef = useRef(false);
  const fieldId = useId();
  const idempotencyKey = useRef<string | null>(null);
  const idempotencyPayload = useRef<string | null>(null);
  const [status, setStatus] = useState<SubmissionStatus | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [step, setStep] = useState<OrderStep>(1);
  const [attendeeErrors, setAttendeeErrors] = useState<AttendeeErrors>({});
  const [review, setReview] = useState<ReviewDetails | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [merchOption, setMerchOption] = useState<MerchOption>("none");
  const survey = useTicketSurvey(fieldId);
  const stepTitleId = (target: OrderStep) => `${fieldId}-step-${target}-title`;
  const busy = status?.kind === "pending";

  useEffect(() => {
    if (!focusStepHeading.current) return;
    focusStepHeading.current = false;
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    document.getElementById(`${fieldId}-step-${step}-title`)?.focus();
  }, [fieldId, step]);

  function goToStep(target: OrderStep) {
    focusStepHeading.current = true;
    setStep(target);
  }

  function resetSuccessfulSubmission() {
    setFormKey((key) => key + 1);
    setStatus(null);
    setStep(1);
    setAttendeeErrors({});
    setReview(null);
    setQuantity(1);
    setMerchOption("none");
    survey.reset();
    idempotencyKey.current = null;
    idempotencyPayload.current = null;
  }

  /** Shows step-1 errors; when any exist, returns to step 1, focuses the first invalid field and returns true. */
  function showAttendeeErrors(form: HTMLFormElement) {
    const errors = validateAttendeeStep(new FormData(form));
    const first = firstAttendeeError(errors);
    flushSync(() => {
      setAttendeeErrors(errors);
      if (first) setStep(1);
    });
    if (first) document.getElementById(attendeeFieldId(fieldId, first))?.focus();
    return Boolean(first);
  }

  function handleNext() {
    const form = formRef.current;
    if (!form) return;
    if (step === 1) {
      if (!showAttendeeErrors(form)) goToStep(2);
      return;
    }
    if (!survey.validate()) return;
    setReview(readReviewDetails(new FormData(form)));
    goToStep(3);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const form = event.currentTarget;
    if (showAttendeeErrors(form)) return;
    const surveyAnswers = survey.validate();
    if (!surveyAnswers) {
      flushSync(() => setStep(2));
      form.querySelector<HTMLElement>('[data-invalid="true"] :is(input, select)')?.focus();
      return;
    }

    submittingRef.current = true;
    setStatus({ kind: "pending", message: "Đang gửi yêu cầu của bạn…" });
    const formData = new FormData(form);
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
      survey: surveyAnswers,
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
        error?: { code?: string; retryAt?: unknown };
      } | null;

      if (response.status === 401) {
        setStatus({ kind: "unauthorized", message: "Vui lòng đăng nhập Google để tiếp tục đặt phiếu nước." });
        return;
      }
      if (response.status === 429 && result?.error?.code === "checkout_restricted") {
        const retryAt = result.error.retryAt;
        if (typeof retryAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u.test(retryAt) || !Number.isFinite(Date.parse(retryAt))) {
          throw new Error("Invalid checkout retry time");
        }
        setStatus({
          kind: "restricted",
          message: `Tài khoản tạm thời bị hạn chế tạo thanh toán vì có 3 đơn hết hạn trong 1 giờ. Bạn có thể đặt lại phiếu nước từ ${new Date(retryAt).toLocaleString("vi-VN")}.`,
        });
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
          message: "Đang chuyển bạn đến PayOS để thanh toán. Trạng thái phiếu nước chỉ cập nhật sau khi hệ thống xác nhận giao dịch.",
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
      <button type="button" className={className} aria-haspopup="dialog" aria-controls={`${fieldId}-dialog`} onClick={() => dialogRef.current?.showModal()}>
        {children}
      </button>
      <dialog
        ref={dialogRef}
        id={`${fieldId}-dialog`}
        className="ticket-request-dialog"
        aria-labelledby={`${fieldId}-title`}
        aria-describedby={`${fieldId}-notice`}
        onClose={() => status?.kind === "success" && resetSuccessfulSubmission()}
        onClick={(event) => event.target === dialogRef.current && dialogRef.current.close()}
      >
        <div className="ticket-request-dialog__layout">
          <form key={formKey} ref={formRef} className="ticket-request-dialog__form" noValidate onSubmit={handleSubmit}>
            <TicketOrderSteps step={step} onBack={() => goToStep((step - 1) as OrderStep)} onClose={() => dialogRef.current?.close()} />
            <div ref={bodyRef} className="ticket-request-dialog__body">
              <header className="ticket-request-dialog__intro">
                <span className="ticket-request-dialog__eyebrow">KHÔNG GIAN ÂM NHẠC HOÀI NIỆM REPLY 199X · 22.11.2026</span>
                <h2 id={`${fieldId}-title`}>Một phiếu nước về <em>thanh xuân.</em></h2>
              </header>
              {ORDER_STEP_TITLES.map((title, index) => {
                const position = (index + 1) as OrderStep;
                return (
                  <section key={title} className="ticket-request-dialog__step" aria-labelledby={stepTitleId(position)} hidden={step !== position}>
                    <h3 id={stepTitleId(position)} className="ticket-request-dialog__step-title" tabIndex={-1}>{title}</h3>
                    {position === 1 && <TicketOrderSummary quantity={quantity} merch={merchOption} variant="bar" label="Tóm tắt đơn" />}
                    {position === 1 && (
                      <TicketAttendeeFields
                        idPrefix={fieldId}
                        errors={attendeeErrors}
                        onEdit={(field) => setAttendeeErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))}
                        quantity={quantity} onQuantityChange={setQuantity} merch={merchOption} onMerchChange={setMerchOption}
                      />
                    )}
                    {position === 2 && <TicketSurveyFields idPrefix={fieldId} survey={survey} />}
                    {position === 3 && <TicketOrderReview details={review} quantity={quantity} merch={merchOption} survey={survey.answers} />}
                  </section>
                );
              })}
            </div>
            <div className="ticket-request-dialog__footer" role="group" aria-label="Thanh đặt phiếu nước">
              <TicketOrderSummary quantity={quantity} merch={merchOption} variant="total" label="Tổng tạm tính" />
              <p id={`${fieldId}-notice`} className="ticket-request-dialog__status" role="status" aria-live="polite" aria-atomic="true" data-status={status?.kind ?? "idle"}>
                {status?.message ?? ""}
                {status?.kind === "unauthorized" && <> <a href="/auth/sign-in" className="underline">Đăng nhập bằng Google</a></>}
                {status?.kind === "success" && status.orderId && status.totalVnd !== undefined && (
                  <span className="mt-2 block">Mã đơn: {status.orderId} · Tổng cộng: {status.totalVnd.toLocaleString("vi-VN")}đ</span>
                )}
              </p>
              <div className="ticket-request-dialog__actions">
                {step > 1 && (
                  <button className="ticket-request-dialog__secondary" type="button" disabled={busy} onClick={() => goToStep((step - 1) as OrderStep)}>
                    <span aria-hidden="true">←</span> Quay lại
                  </button>
                )}
                {step < 3 ? (
                  <button key="next" className="ticket-request-dialog__primary" type="button" onClick={handleNext}>
                    Tiếp tục <span aria-hidden="true">→</span>
                  </button>
                ) : (
                  <button key="submit" className="ticket-request-dialog__primary" type="submit" disabled={busy || status?.kind === "success"}>
                    {busy ? "Đang tạo đơn…" : status?.kind === "success" ? "Đơn đã được tạo" : "Tiếp tục đặt phiếu nước"}
                    <span aria-hidden="true">→</span>
                  </button>
                )}
              </div>
            </div>
          </form>
          <TicketStub quantity={quantity} merch={merchOption} />
        </div>
      </dialog>
    </>
  );
}

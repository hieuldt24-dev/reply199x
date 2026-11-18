export type OrderStep = 1 | 2 | 3;

export const ORDER_STEP_TITLES = ["Phiếu nước & thông tin", "Khảo sát nhanh", "Xác nhận"] as const;

type TicketOrderStepsProps = Readonly<{
  step: OrderStep;
  onBack: () => void;
  onClose: () => void;
}>;

/** Progress header: numbered circles on desktop, "Bước N/3" plus a 3-segment bar on mobile. */
export function TicketOrderSteps({ step, onBack, onClose }: TicketOrderStepsProps) {
  return (
    <div className="ticket-request-dialog__steps">
      <button className="ticket-request-dialog__icon ticket-request-dialog__back" type="button" aria-label="Về bước trước" hidden={step === 1} onClick={onBack}>
        <span aria-hidden="true">‹</span>
      </button>
      <p className="ticket-request-dialog__step-count">
        Bước {step}/3 <span aria-hidden="true">·</span> {ORDER_STEP_TITLES[step - 1]}
      </p>
      <ol className="ticket-request-dialog__progress" aria-label="Tiến độ đặt phiếu nước">
        {ORDER_STEP_TITLES.map((title, index) => {
          const position = index + 1;
          const state = position < step ? "done" : position === step ? "current" : "todo";
          return (
            <li key={title} data-state={state} aria-current={state === "current" ? "step" : undefined}>
              <span aria-hidden="true">{position}</span>
              <span className="ticket-request-dialog__sr">{title}</span>
            </li>
          );
        })}
      </ol>
      <button className="ticket-request-dialog__icon ticket-request-dialog__close" type="button" aria-label="Đóng biểu mẫu" onClick={onClose}>
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}

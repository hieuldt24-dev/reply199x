import { MERCH_OPTIONS, TICKET_UNIT_PRICE_VND, type MerchOption } from "@/lib/ticket-orders/validation";

/** Formats a whole-dong amount the way the existing dialog does, e.g. 169.000đ. */
export function formatVnd(amount: number) {
  return `${amount.toLocaleString("vi-VN")}đ`;
}

/** Client-side estimate only; the server total returned with the order is authoritative. */
export function orderTotalVnd(quantity: number, merch: MerchOption) {
  return quantity * TICKET_UNIT_PRICE_VND + MERCH_OPTIONS[merch].priceVnd;
}

type TicketOrderSummaryProps = Readonly<{
  quantity: number;
  merch: MerchOption;
  /** `stub`: full breakdown on the ticket stub; `bar`: mobile summary strip; `total`: sticky footer. */
  variant: "stub" | "bar" | "total";
  label: string;
}>;

export function TicketOrderSummary({ quantity, merch, variant, label }: TicketOrderSummaryProps) {
  const merchOption = MERCH_OPTIONS[merch];
  return (
    <div className={`ticket-request-dialog__summary ticket-request-dialog__summary--${variant}`} role="group" aria-label={label}>
      {variant === "bar" && <p className="ticket-request-dialog__summary-event">22.11.2026 · On The Radio · Đà Nẵng</p>}
      <dl>
        {variant === "stub" && (
          <>
            <div>
              <dt>Phiếu nước × {quantity}</dt>
              <dd>{formatVnd(quantity * TICKET_UNIT_PRICE_VND)}</dd>
            </div>
            <div>
              <dt>Merch · {merchOption.label}</dt>
              <dd>{formatVnd(merchOption.priceVnd)}</dd>
            </div>
          </>
        )}
        <div className="ticket-request-dialog__summary-total">
          <dt>Tạm tính</dt>
          <dd>{formatVnd(orderTotalVnd(quantity, merch))}</dd>
        </div>
      </dl>
    </div>
  );
}

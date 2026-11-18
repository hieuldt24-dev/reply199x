import type { MerchOption } from "@/lib/ticket-orders/validation";
import { RemoteImage } from "./RemoteImage";
import { TicketOrderSummary } from "./TicketOrderSummary";

type TicketStubProps = Readonly<{ quantity: number; merch: MerchOption }>;

/** Desktop ticket stub beside the form; hidden by CSS on mobile, where the summary bar replaces it. */
export function TicketStub({ quantity, merch }: TicketStubProps) {
  return (
    <aside className="ticket-request-dialog__stub" aria-label="Cuống phiếu nước">
      <div className="ticket-request-dialog__stub-heading" aria-hidden="true">
        <span>REPLY 199X</span>
        <span>KHÔNG GIAN ÂM NHẠC HOÀI NIỆM</span>
      </div>
      <RemoteImage
        src="/images/1794567834681_48355094629491256_48355094629491256_d855c0c2ea10cd6a6d411ae92785f5d2.jpg"
        alt="Poster REPLY 199X · Không gian âm nhạc hoài niệm · 22.11.2026"
        width={2478}
        height={1770}
        className="ticket-request-dialog__stub-image"
        fallback="REPLY 199X · 22.11.2026"
      />
      <div className="ticket-request-dialog__stub-meta">
        <p className="ticket-request-dialog__stub-date">
          <strong>22</strong>
          <span>THÁNG 11<br />2026</span>
        </p>
        <p className="ticket-request-dialog__stub-venue">
          <strong>On The Radio</strong>
          <span>15:00 – 19:00 · Đà Nẵng</span>
        </p>
      </div>
      <div className="ticket-request-dialog__perforation" aria-hidden="true" />
      <TicketOrderSummary quantity={quantity} merch={merch} variant="stub" label="Tóm tắt trên cuống phiếu" />
      <p className="ticket-request-dialog__stub-foot" aria-hidden="true">HẸN GẶP BẠN<br /><strong>Ở MỘT THỜI THƯƠNG NHỚ.</strong></p>
    </aside>
  );
}

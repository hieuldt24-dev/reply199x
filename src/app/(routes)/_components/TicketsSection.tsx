import Image from "next/image";
import { TicketSalesClosed } from "./TicketSalesClosed";

const voucherImage = "/images/1794567834681_48355094629491256_48355094629491256_d855c0c2ea10cd6a6d411ae92785f5d2.jpg";

export function TicketsSection() {
  return (
    <section className="reply-tickets max-w-6xl mx-auto pt-6" id="ve" aria-labelledby="ticket-section-title">
      <header className="reply-tickets__heading mb-6">
        <span className="font-space text-xs font-bold uppercase tracking-widest text-retro-red">CUỐNG PHIẾU NƯỚC ĐIỆN TỬ · ADMISSION PASS</span>
        <h3 id="ticket-section-title" className="font-epilogue font-bold text-2xl sm:text-3xl text-retro-dark uppercase tracking-tight mt-1">Khu vực phiếu nước tham gia đêm nhạc</h3>
      </header>

      <article className="reply-ticket reply-ticket--compact">
        <div className="reply-ticket__info">
          <div className="reply-ticket__header">
            <span>PHIẾU NƯỚC CHÍNH THỨC · REPLY 199X</span>
            <span>SERIES: #RP-2026-LIVE</span>
          </div>

          <div className="reply-ticket__event">
            <h4>Không gian âm nhạc hoài niệm REPLY 199X</h4>
            <p>On The Radio · 76 Thái Phiên, TP. Đà Nẵng</p>
          </div>

          <dl className="reply-ticket__details">
            <div>
              <dt>Ngày tổ chức</dt>
              <dd>22.11.2026</dd>
            </div>
            <div>
              <dt>Khung giờ</dt>
              <dd>15:00–19:00</dd>
            </div>
          </dl>

          <p className="reply-ticket__perk">Phiếu nước gồm 1 phần nước và 1 phần bánh xưa.</p>

          <div className="reply-ticket__actions">
            <TicketSalesClosed className="reply-ticket__contact" />
          </div>
        </div>

        <div className="reply-ticket__perforation" aria-hidden="true" />

        <figure className="reply-ticket__artwork">
          <Image
            src={voucherImage}
            alt="Phiếu nước REPLY 199X: một phần nước và một phần bánh xưa, sử dụng tại On The Radio trong ngày sự kiện 22.11.2026"
            fill
            priority={false}
            sizes="(max-width: 767px) 100vw, (max-width: 1279px) 42vw, 480px"
          />
        </figure>
      </article>
    </section>
  );
}

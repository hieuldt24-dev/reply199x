import { assets } from "../_data/home";
import { RemoteImage } from "./RemoteImage";
import { TicketSalesClosed } from "./TicketSalesClosed";

export function HeroSection() {
  return (
    <section className="reply-hero reply-hero--centered">
      <div className="reply-shell reply-hero__center">
        <div className="reply-hero__copy">
          <h1><span>DÒNG CHẢY</span>{" "}<span>HOÀI NIỆM</span></h1>
          <p className="reply-hero__quote">Xuôi dòng ký ức, đánh thức thanh xuân</p>
        </div>
        <div className="reply-hero__visual">
          <div className="reply-hero__logo">
            <RemoteImage src={assets.logo} alt="Logo REPLY 199X" width={2500} height={2500} className="reply-hero__logo-image" fallback="REPLY 199X" />
          </div>
        </div>
        <TicketSalesClosed className="reply-action reply-action--gold" />
      </div>
    </section>
  );
}

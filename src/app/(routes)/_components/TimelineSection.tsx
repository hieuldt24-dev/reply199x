import Image from "next/image";
import { brief } from "../_data/brief";
import { assets } from "../_data/home";
import { TicketSalesClosed } from "./TicketSalesClosed";

export function TimelineSection() {
  return (
    <section className="reply-timeline py-20 lg:py-28 bg-retro-dark text-retro-paper" id="timeline">
      <div className="reply-shell max-w-7xl mx-auto px-4 lg:px-8">
        <div className="reply-section-heading text-center max-w-2xl mx-auto mb-16">
          <div className="font-space text-xs uppercase font-extrabold tracking-widest">
            Cùng dò sóng để phát lại những ký ức hồi đó nhé!
          </div>
          <h2 className="font-epilogue font-black text-3xl sm:text-5xl">Dòng chảy tiếp nối, trải nghiệm đong đầy</h2>
          <p className="font-vietnam text-retro-paper/80 text-sm sm:text-base mt-3">{brief.timeline}</p>
        </div>
        <div className="reply-timeline__layout">
          <div className="reply-timeline__poster reply-timeline__poster--left" aria-hidden="true">
            <Image src={assets.popupPoster} alt="" width={1080} height={1350} sizes="(min-width: 1400px) 190px, 0px" />
          </div>
          <div className="reply-stops">
            <article id="pop-up-details" className="reply-stop" aria-labelledby="popup-title">
              <header className="reply-stop__header">
                <span className="reply-stop__badge">Trải nghiệm tự do</span>
                <div className="reply-stop__date-row">
                  <div>
                    <p className="reply-stop__eyebrow">MỐC 1 • KHÔNG GIAN HOÀI NIỆM</p>
                    <div className="reply-stop__date">20–21<span>.11.2026</span></div>
                    <p className="reply-stop__weekday">THỨ SÁU – THỨ BẢY</p>
                  </div>
                  <span className="reply-stop__icon" aria-hidden="true">✦</span>
                </div>
              </header>
              <div className="reply-stop__intro">
                <p className="reply-stop__venue">Địa điểm: Nhà hàng Cơm Bưng Nước Rót, 29 Mỹ Khê 6, Đà Nẵng</p>
                <h3 id="popup-title">POP-UP REPLY 199X: Hẹn nhau giữa miền ký ức</h3>
              </div>
              <div className="reply-stop__copy">
                {brief.popup.split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              <div className="reply-stop__activities">
                <h4>HOẠT ĐỘNG</h4>
                <ul>
                  <li><span aria-hidden="true">✓</span>Nhận ngay ưu đãi 5% trên tổng hóa đơn tại CƠM BƯNG NƯỚC RÓT khi check-in tại POP-UP</li>
                  <li><span aria-hidden="true">✓</span>Gửi lời hồi đáp tuổi Đôi mươi</li>
                  <li><span aria-hidden="true">✓</span>Gặp lại ngày xưa với các trò chơi bên hiên nhà</li>
                  <li><span aria-hidden="true">✓</span>Tay nào hay Tay nào trúng bảng Kẹo Độc Đắc</li>
                </ul>
              </div>
              <footer className="reply-stop__footer">
                <p className="reply-stop__meta">HÌNH THỨC: VÀO CỔNG TỰ DO</p>
                <div className="reply-stop__actions"><a className="reply-text-link" href="#su-kien">Xem đêm nhạc 22/11 ↗</a></div>
              </footer>
            </article>
            <article id="concert-details" className="reply-stop reply-stop--live" aria-labelledby="concert-title">
              <header className="reply-stop__header">
                <span className="reply-stop__badge">Sự kiện trọng tâm</span>
                <div className="reply-stop__date-row">
                  <div>
                    <p className="reply-stop__eyebrow">MỐC 2 • ĐÊM NHẠC LỚN CHÍNH THỨC</p>
                    <div className="reply-stop__date">22<span>.11.2026</span></div>
                    <p className="reply-stop__weekday">CHỦ NHẬT • 15:00 – 19:00</p>
                  </div>
                  <span className="reply-stop__icon" aria-hidden="true">✦</span>
                </div>
              </header>
              <div className="reply-stop__intro">
                <p className="reply-stop__venue">Địa điểm: On The Radio • 76 Thái Phiên, Đà Nẵng</p>
                <h3 id="concert-title">Đêm Nhạc: &quot;Không Gian Âm Nhạc Hoài Niệm – REPLY 199X&quot;</h3>
              </div>
              <div className="reply-stop__copy">
                {brief.concert.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              <div className="reply-stop__activities">
                <h4>HOẠT ĐỘNG</h4>
                <ul>
                  <li><span aria-hidden="true">♪</span>Trình diễn trực tiếp các bản hit thập niên 90 - 2000s</li>
                  <li><span aria-hidden="true">♫</span>Hoạt cảnh kịch tương tác đời sống học trò xưa</li>
                  <li><span aria-hidden="true">▣</span>Quà tặng kỷ vật đặc quyền cho khán giả tham dự</li>
                </ul>
              </div>
              <footer className="reply-stop__footer">
                <p className="reply-stop__meta">KHUNG GIỜ: 15:00 - 19:00</p>
                <div className="reply-stop__actions">
                  <a className="reply-text-link" href="#su-kien">Tìm hiểu sự kiện ↗</a>
                  <TicketSalesClosed className="reply-stop__ticket inline-flex items-center gap-2 bg-retro-gold hover:bg-retro-gold-light text-retro-dark font-bold px-4 py-2 rounded" />
                </div>
              </footer>
            </article>
          </div>
          <div className="reply-timeline__poster reply-timeline__poster--right" aria-hidden="true">
            <Image src={assets.poster} alt="" width={2000} height={2500} sizes="(min-width: 1400px) 190px, 0px" />
          </div>
        </div>
      </div>
    </section>
  );
}

import { CassetteArtwork } from "./CassetteArtwork";

export function HeroSection() {
  return (
    <section className="reply-hero">
      <div className="reply-shell reply-hero__grid">
        <div className="reply-hero__copy">
          <div className="reply-eyebrow reply-hero__eyebrow"><span aria-hidden="true" className="reply-rec" />Dự Án Nghệ Thuật &amp; Âm Nhạc Hoài Niệm</div>
          <h1><span>DÒNG CHẢY</span><span>HOÀI NIỆM</span></h1>
          <div className="reply-hero__quote">“Xuôi dòng ký ức, đánh thức thanh xuân”</div>
          <p>Không gian âm nhạc &amp; triển lãm thực cảnh hồi tưởng lại năm tháng rực rỡ thập niên 90s – đầu 2000s, nơi đài cát-sét phát giai điệu thanh xuân và điện thoại bàn lưu giữ bao hẹn ước.</p>
          <div className="reply-hero__actions">
            <a className="reply-action reply-action--gold" href="#su-kien">Xem sự kiện 22/11 <span aria-hidden="true">↗</span></a>
            <a className="reply-text-link" href="#gioi-thieu">Khám phá hành trình <span aria-hidden="true">↓</span></a>
          </div>
        </div>
        <div className="reply-hero__visual">
          <div className="reply-hero__note"><span>STEREO HI-FI 199X</span><span aria-hidden="true">✦</span></div>
          <CassetteArtwork />
          <div className="reply-hero__sticker" aria-hidden="true">199X<br /><span>REWIND &amp; REPLAY</span></div>
          <div className="reply-hero__art-caption"><span>TAPE CASSETTE REC</span><span>REC [●] 199X-2026 HI-FI STEREO 3.75 IPS</span></div>
        </div>
      </div>
      <div className="reply-hero__tape">
        <div className="reply-shell"><span>Băng Cassette</span><i aria-hidden="true">✳</i><span>TV CRT Cổ Điển</span><i aria-hidden="true">✳</i><span>Máy Game Bấm</span><i aria-hidden="true">✳</i><span>Điện Thoại Quay Số</span></div>
      </div>
    </section>
  );
}


import { events } from "../_data/home";
import { CassetteArtwork } from "./CassetteArtwork";

const keepsakes = ["Băng Cassette", "TV CRT Cổ Điển", "Máy Game Bấm", "Điện Thoại Quay Số"];

export function HeroSection() {
  const concert = events.find((event) => event.id === "concert");
  if (!concert) throw new Error('Missing required event with id "concert".');

  return (
    <section className="retro-hero relative border-b-4 border-retro-red bg-retro-dark py-10 sm:py-14 lg:py-20">
      <div className="retro-container mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-8 px-5 sm:px-8 lg:grid-cols-[3fr_2fr] lg:gap-12">
        <div className="retro-hero-copy min-w-0">
          <span className="retro-kicker inline-flex items-center gap-2 font-space text-xs font-bold uppercase tracking-[.12em] text-retro-gold">
            <span className="retro-live-dot" aria-hidden="true" /> Dự Án Nghệ Thuật &amp; Âm Nhạc Hoài Niệm
          </span>
          <h1 className="retro-display mt-4 font-epilogue text-4xl font-black uppercase leading-[1.18] tracking-[.01em] text-retro-paper sm:text-5xl lg:text-6xl">
            <span>DÒNG CHẢY</span>{" "}<span>HOÀI NIỆM</span>
          </h1>
          <p className="mt-3 font-vietnam text-lg font-medium italic leading-relaxed text-retro-gold sm:text-xl">“Xuôi dòng ký ức, đánh thức thanh xuân”</p>
          <p className="mt-4 max-w-[58ch] font-vietnam text-base leading-relaxed text-retro-paper sm:text-lg">Không gian âm nhạc &amp; triển lãm thực cảnh hồi tưởng lại năm tháng rực rỡ thập niên 90s – đầu 2000s.</p>
          <div className="retro-event-strip mt-6 grid max-w-2xl grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-y border-retro-gold/50 py-3 font-space text-xs text-retro-paper sm:grid-cols-[auto_1fr_auto] sm:items-center sm:text-sm">
            <span className="font-bold uppercase tracking-wider text-retro-gold">22.11.2026</span>
            <span>{concert.time}</span>
            <span className="col-span-2 sm:col-span-1 sm:text-right">{concert.venue}</span>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href="#su-kien" className="retro-primary-cta inline-flex min-h-11 items-center justify-center gap-2 rounded border-2 border-retro-gold bg-retro-red px-5 py-3 font-space text-xs font-bold uppercase tracking-wider text-retro-paper shadow-retro-solid transition-transform hover:-translate-y-0.5">Xem sự kiện 22/11</a>
            <a href="#gioi-thieu" className="retro-secondary-cta inline-flex min-h-11 items-center justify-center px-3 py-3 font-space text-xs font-bold uppercase tracking-wider text-retro-paper underline decoration-retro-gold decoration-2 underline-offset-4">Khám phá hành trình</a>
          </div>
          <ul className="retro-keepsakes mt-6 flex flex-wrap gap-x-4 gap-y-2 font-space text-[11px] font-semibold uppercase tracking-wide text-retro-gold" aria-label="Kỷ vật gợi nhớ">
            {keepsakes.map((keepsake) => <li key={keepsake}>{keepsake}</li>)}
          </ul>
        </div>
        <div className="retro-hero-art flex flex-col items-center justify-center lg:items-end">
          <CassetteArtwork />
          <p className="retro-cassette-caption mt-4 font-space text-[10px] font-bold uppercase tracking-widest text-retro-gold">REC [●] 199X-2026 HI-FI STEREO 3.75 IPS</p>
        </div>
      </div>
    </section>
  );
}

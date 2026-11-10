import { assets, events } from "../_data/home";
import { TicketsSection } from "./TicketsSection";
import { RemoteImage } from "./RemoteImage";

export function EventsSection() {
 return (
<section className="reply-events py-20 lg:py-28 bg-retro-paper paper-pattern relative" id="su-kien">
<div className="reply-shell max-w-7xl mx-auto px-4 lg:px-8">
<div className="reply-section-heading text-center max-w-3xl mx-auto mb-16">
<div className="inline-flex items-center gap-2 bg-retro-red text-retro-paper font-space text-xs uppercase font-extrabold tracking-widest px-3 py-1 rounded shadow-retro-solid mb-3">
 TÂM ĐIỂM CHƯƠNG TRÌNH • LIVE CONCERT 
</div>
<h2 className="font-epilogue font-black text-3xl sm:text-5xl uppercase tracking-tight text-retro-dark retro-gold-shadow"> ĐÊM NHẠC TRỌNG TÂM 22/11 </h2><p className="font-vietnam text-retro-ink-muted text-base sm:text-lg mt-3"> &quot;Không gian âm nhạc hoài niệm – REPLY 199X&quot; </p>
</div>
<div className="reply-events__grid grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16">
<div className="lg:col-span-6 flex justify-center">
<div className="reply-poster relative w-full max-w-md bg-retro-forest p-3 sm:p-4 rounded-2xl border-4 border-retro-dark shadow-retro-solid-lg">
<div className="bg-retro-paper px-3 py-1 rounded-t-lg border-b-2 border-retro-dark flex items-center justify-between mb-2">
<span className="font-space text-xs font-bold text-retro-red tracking-wider uppercase">POSTER CHÍNH THỨC</span><span className="font-space text-[10px] text-retro-forest font-bold">22.11.2026 • ĐÀ NẴNG</span>
</div>
<div className="overflow-hidden rounded-lg border-2 border-retro-dark bg-retro-dark">
<RemoteImage src={assets.poster} alt="Poster chính thức Đêm nhạc Không gian âm nhạc hoài niệm Reply 199X" width={2000} height={2500} className="w-full h-auto object-cover" fallback="REPLY 199X • Đêm nhạc 22.11.2026 • On The Radio" />
</div>
<div className="mt-2 text-center font-space text-xs text-retro-paper/90 font-semibold tracking-wider">
 ON THE RADIO • 76 THÁI PHIÊN, ĐÀ NẴNG 
</div>

</div>

</div>
<div className="lg:col-span-6 flex flex-col gap-6">
<div className="reply-event-details bg-retro-paper-card p-6 sm:p-8 rounded-xl border-3 border-retro-forest shadow-retro-solid flex flex-col gap-4">
<div className="border-b-2 border-dashed border-retro-dark/20 pb-4">
<span className="font-space text-xs uppercase tracking-widest text-retro-red font-bold">THÔNG TIN XÁC THỰC</span><h3 className="font-epilogue font-bold text-2xl text-retro-dark mt-1"> Đêm Nhạc Hoài Niệm – REPLY 199X </h3>
</div>
<div className="flex flex-col gap-4 py-2 font-vietnam">
<div className="flex items-start gap-3.5">
<div className="w-10 h-10 rounded-lg bg-retro-teal text-retro-paper flex items-center justify-center shrink-0 shadow-sm">
<span className="retro-icon text-xl" aria-hidden="true">◷</span>
</div>
<div>
<span className="font-space text-xs uppercase tracking-wider text-retro-ink-muted font-bold block">Thời gian diễn ra</span><strong className="text-base text-retro-dark font-bold">{events[1].time}</strong>
</div>

</div>
<div className="flex items-start gap-3.5">
<div className="w-10 h-10 rounded-lg bg-retro-red text-retro-paper flex items-center justify-center shrink-0 shadow-sm">
<span className="retro-icon text-xl" aria-hidden="true">⌖</span>
</div>
<div>
<span className="font-space text-xs uppercase tracking-wider text-retro-ink-muted font-bold block">Địa điểm tổ chức</span><strong className="text-base text-retro-dark font-bold">{events[1].venue}</strong>
</div>

</div>
<div className="flex items-start gap-3.5">
<div className="w-10 h-10 rounded-lg bg-retro-gold text-retro-dark flex items-center justify-center shrink-0 shadow-sm">
<span className="retro-icon text-xl" aria-hidden="true">◇</span>
</div>
<div>
<span className="font-space text-xs uppercase tracking-wider text-retro-ink-muted font-bold block">Trải nghiệm bao gồm</span><span className="text-sm text-retro-ink-muted">01 Thức uống xưa tự chọn + 01 Postcard tem thư kỷ niệm + Thưởng thức trọn vẹn set diễn acoustic</span>
</div>

</div>

</div>
<div className="p-3 bg-retro-paper rounded-lg border border-retro-teal/40 font-vietnam text-xs text-retro-ink-muted leading-relaxed">
 📌 Lưu ý: Số lượng chỗ ngồi tại On The Radio có giới hạn để đảm bảo không gian hoài niệm ấm cúng và chân thực nhất. 
</div>

</div>

</div>

</div>
<TicketsSection />
</div>

</section>

 );
}

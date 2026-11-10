import { tracks } from "../_data/home";

export function AboutSection() {
 return (
<section className="bg-retro-paper paper-pattern relative py-16 lg:py-20 retro-about" id="gioi-thieu">
<div className="max-w-7xl mx-auto px-4 lg:px-8">
<div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
<div className="lg:col-span-5 flex flex-col gap-5">
<div className="inline-flex items-center gap-2 self-start bg-retro-dark text-retro-gold px-3.5 py-1.5 rounded font-space text-xs uppercase tracking-widest font-bold">
<span className="retro-icon text-sm text-retro-red" aria-hidden="true">▣</span><span className="">Tập San Ký Ức • Giới Thiệu</span>
</div>
<div className="flex flex-col">
<h2 className="font-epilogue font-black text-3xl sm:text-4xl text-retro-dark uppercase tracking-tight retro-title-shadow leading-tight">VỀ DỰ ÁN<br /><span className="text-retro-red">REPLY 199X</span></h2><div className="h-1 w-20 bg-retro-gold mt-3 rounded-full">

</div>

</div>
<p className="font-vietnam text-base text-retro-ink-muted leading-relaxed">Lấy cảm hứng từ bức tranh văn hóa đại chúng Việt Nam cuối thập niên 90 và đầu những năm 2000, <strong className="text-retro-red font-bold">REPLY 199X</strong> mở ra hành trình cảm xúc chân thành, nơi ký ức tuổi trẻ mộc mạc giao hòa cùng nhịp sống người trẻ hôm nay.</p><p className="retro-intro-full font-vietnam text-base text-retro-ink-muted leading-relaxed">Không gian âm nhạc &amp; triển lãm thực cảnh hồi tưởng lại năm tháng rực rỡ thập niên 90s – đầu 2000s, nơi đài cát-sét phát giai điệu thanh xuân và điện thoại bàn lưu giữ bao hẹn ước.</p>
<div className="bg-retro-paper-card p-4 sm:p-5 rounded-xl border border-retro-dark/20 flex flex-col gap-2.5 mt-2">

<div className="flex items-center justify-between text-xs font-space text-retro-ink-muted pb-2 border-b border-dashed border-retro-dark/20">
<span className="font-bold uppercase tracking-wider text-retro-forest flex items-center gap-1.5"><span className="retro-icon text-sm text-retro-forest" aria-hidden="true">◉</span><span className="">Cuộn Băng Hoài Niệm</span></span><span className="font-mono font-bold text-retro-red">SIDE A • 45 MIN</span>
</div>
<div className="flex items-center gap-3 py-1.5">
<div className="w-8 h-8 rounded-full border-2 border-dashed border-retro-teal/60 flex items-center justify-center shrink-0">
<div className="w-2.5 h-2.5 rounded-full bg-retro-dark">

</div>

</div>
<div className="flex-1 h-1.5 bg-retro-paper-dark rounded-full overflow-hidden flex">
<div className="w-1/3 bg-retro-red">

</div>
<div className="w-1/3 bg-retro-gold">

</div>
<div className="w-1/3 bg-retro-teal">

</div>

</div>
<div className="w-8 h-8 rounded-full border-2 border-dashed border-retro-teal/60 flex items-center justify-center shrink-0">
<div className="w-2.5 h-2.5 rounded-full bg-retro-dark">

</div>

</div>

</div>
<div className="flex justify-between text-[11px] font-space text-retro-ink-muted/80">
<span className="font-semibold">ĐÀI RADIO FM 99.0</span><span className="font-bold text-retro-forest">STEREO HI-FI RECORDER</span>
</div>

</div>

</div>
<div className="lg:col-span-7 flex flex-col gap-4 relative">
<div className="absolute left-7 top-10 bottom-10 w-0.5 border-l-2 border-dashed border-retro-teal/40 hidden sm:block pointer-events-none">

</div>
{tracks.map((track) => (
<div key={track.id} className="bg-retro-paper-card p-6 rounded-xl border border-retro-dark/20 hover:border-retro-teal transition-colors relative flex flex-col sm:flex-row gap-5 items-start">
<div className="w-14 h-14 rounded-xl bg-retro-paper border-2 border-retro-dark text-retro-dark font-space font-black text-2xl flex items-center justify-center shrink-0 shadow-sm">{track.number}</div>
<div className="flex-1"><span className="font-space text-xs font-bold uppercase tracking-widest text-retro-forest">{track.label}</span><h3 className="font-epilogue font-bold text-xl text-retro-dark">{track.title}</h3><p className="font-vietnam text-sm text-retro-ink-muted mt-2 leading-relaxed">{track.description}</p></div>
</div>
))}
</div>

</div>

</div>

</section>

 );
}

import { brief, projectLinks } from "../_data/brief";

export function ChannelsSection() {
 return (
<section className="reply-channels py-16 lg:py-20 bg-retro-paper-dark border-y-4 border-retro-dark" id="kenh-truyen-thong">
<div className="reply-shell max-w-7xl mx-auto px-4 lg:px-8">
<div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
<div>
<span className="font-space text-xs font-bold uppercase tracking-widest text-retro-red flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-retro-red animate-pulse"></span><span className="">BẮT SÓNG KÝ ỨC</span></span><h2 className="font-epilogue font-black text-2xl sm:text-3xl text-retro-dark uppercase tracking-tight mt-1">Theo dòng ký ức, kết nối mọi khoảnh khắc</h2>
</div>
<p className="font-vietnam text-sm text-retro-ink-muted max-w-md">{brief.channels}</p>
</div>
<div className="reply-channels__grid grid grid-cols-1 md:grid-cols-2 gap-8">
<div className="reply-channel bg-retro-paper-card p-6 sm:p-7 rounded-xl border-2 border-retro-forest shadow-retro-solid flex flex-col justify-between">
<div>
<div className="flex items-start justify-between gap-4">
<div className="flex items-center gap-3.5">
<div className="w-12 h-12 rounded-xl bg-retro-dark text-retro-gold flex items-center justify-center border-2 border-retro-gold shadow-sm shrink-0">
<span className="retro-icon text-2xl" aria-hidden="true">▶</span>
</div>
<div>
<h3 className="font-epilogue font-bold text-lg sm:text-xl text-retro-dark">Kênh TikTok Chính Thức</h3><p className="font-space text-sm font-semibold text-retro-forest">@loihoidap199x</p>
</div>

</div>
<span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-space text-[11px] font-bold px-2.5 py-1 rounded uppercase tracking-wider flex items-center gap-1.5 shrink-0"><span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span><span className="">Đang phát sóng</span></span>
</div>
<p className="font-vietnam text-sm text-retro-ink-muted mt-4 mb-6 leading-relaxed">{brief.tiktok}</p>
</div>
<div className="pt-4 border-t-2 border-dashed border-retro-dark/20 flex items-center justify-between gap-4">
<span className="font-space text-xs text-retro-ink-muted/80 font-semibold">tiktok.com/@loihoidap199x</span><a className="inline-flex items-center gap-2 bg-retro-dark hover:bg-retro-forest text-retro-paper font-space text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-lg border border-retro-gold shadow-sm transition-all hover:-translate-y-0.5" href={projectLinks.tiktok} rel="noopener noreferrer" target="_blank"><span className="">Bắt sóng ngay</span><span className="retro-icon text-sm text-retro-gold" aria-hidden="true">↗</span></a>
</div>

</div>
<div className="reply-channel reply-channel--soon bg-retro-paper-card/75 p-6 sm:p-7 rounded-xl border-2 border-dashed border-retro-dark/30 flex flex-col justify-between">
<div>
<div className="flex items-start justify-between gap-4">
<div className="flex items-center gap-3.5">
<div className="w-12 h-12 rounded-xl bg-retro-paper border-2 border-retro-dark/40 text-retro-ink-muted flex items-center justify-center shrink-0">
<span className="retro-icon text-2xl" aria-hidden="true">◎</span>
</div>
<div>
<h3 className="font-epilogue font-bold text-lg sm:text-xl text-retro-dark">Facebook Fanpage</h3><p className="font-space text-sm font-semibold text-retro-ink-muted">REPLY 199X Official</p>
</div>

</div>
<span className="bg-amber-100 text-amber-900 border border-amber-300 font-space text-[11px] font-bold px-2.5 py-1 rounded uppercase tracking-wider shrink-0">Kênh chính thức</span>
</div>
<p className="font-vietnam text-sm text-retro-ink-muted mt-4 mb-6 leading-relaxed">{brief.facebook}</p>
</div>
<div className="pt-4 border-t-2 border-dashed border-retro-dark/20 flex items-center justify-between gap-4">
<span className="font-space text-xs text-retro-ink-muted italic">facebook.com/loihoidap199x</span><div className="font-space text-xs text-retro-ink-muted/60 font-bold uppercase tracking-wider flex items-center gap-1">
{projectLinks.facebook ? <a className="reply-action" href={projectLinks.facebook} target="_blank" rel="noopener noreferrer">Theo dõi fanpage</a> : <button type="button" className="reply-action reply-action--unavailable" disabled>Theo dõi fanpage</button>}
</div>

</div>

</div>

</div>

</div>

</section>

 );
}

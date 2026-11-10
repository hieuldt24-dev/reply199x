import { attendanceSteps } from "../_data/home";

export function ProcessSection() {
 return (
<section className="reply-process py-20 lg:py-24 bg-retro-paper-dark border-b-4 border-retro-dark" id="quy-trinh">
<div className="reply-shell max-w-7xl mx-auto px-4 lg:px-8">
<div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
<div>
<div className="flex items-center gap-2 mb-2">
<span className="bg-amber-100 text-amber-900 border border-amber-300 font-space text-xs font-bold px-3 py-1 rounded uppercase tracking-wider"> CHẾ ĐỘ DỰ KIẾN • SẮP CẬP NHẬT QUY TRÌNH </span>
</div>
<h2 className="font-epilogue font-black text-3xl sm:text-4xl text-retro-dark uppercase tracking-tight"> QUY TRÌNH THAM DỰ SỰ KIỆN </h2>
</div>
<p className="font-vietnam text-sm text-retro-ink-muted max-w-md"> Lộ trình 3 bước dự kiến giúp khán giả tận hưởng trọn vẹn hành trình hoài niệm trong ngày diễn ra sự kiện. </p>
</div>
<div className="reply-steps grid grid-cols-1 md:grid-cols-3 gap-8">
{attendanceSteps.map((step) => (
<div key={step.id} className="reply-step bg-retro-paper-card p-6 sm:p-7 rounded-xl border-3 border-retro-forest shadow-retro-solid relative flex flex-col justify-between"><div><div className="flex items-center justify-between pb-4 border-b-2 border-dashed border-retro-dark/20"><span className="font-space text-xs font-bold uppercase text-retro-forest">{step.label}</span><span className="w-8 h-8 rounded-full bg-retro-dark text-retro-paper font-space text-xs font-bold flex items-center justify-center">{step.number}</span></div><div className="py-5"><h3 className="font-epilogue font-bold text-xl text-retro-dark flex items-center gap-2"><span aria-hidden="true" className="retro-icon text-retro-red">{step.symbol}</span>{step.title}</h3><p className="font-vietnam text-sm text-retro-ink-muted mt-3 leading-relaxed">{step.description}</p></div></div><div className="bg-retro-paper p-3 rounded-lg border border-retro-dark/20 font-space text-xs text-retro-ink-muted italic">{step.note}</div></div>
))}
</div>

</div>

</section>

 );
}

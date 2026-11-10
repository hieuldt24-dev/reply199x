import { ContactForm } from "./ContactForm";

export function ContactSection() {
 return (
<section className="py-20 lg:py-28 bg-retro-paper paper-pattern relative retro-contact" id="lien-he">
<div className="max-w-7xl mx-auto px-4 lg:px-8">
<div className="bg-retro-paper-card p-6 sm:p-10 lg:p-12 rounded-3xl border-4 border-retro-forest shadow-retro-solid-lg relative">
<div className="flex flex-wrap items-center justify-between pb-8 mb-8 border-b-2 border-dashed border-retro-dark/30 gap-4">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full bg-retro-red text-retro-paper flex items-center justify-center font-bold shadow-md">
<span className="retro-icon text-xl" aria-hidden="true">✉</span>
</div>
<div>
<span className="font-space text-xs uppercase tracking-widest text-retro-red font-bold block"> PAR AVION • BƯU ĐIỆN KÝ ỨC 199X </span><span className="font-vietnam text-sm text-retro-ink-muted">Hòm thư tiếp nhận kỷ vật &amp; tâm tình</span>
</div>

</div>
<div className="bg-retro-paper px-4 py-2 rounded-lg border border-retro-forest font-space text-xs text-retro-forest font-bold shadow-sm">
 MÃ ĐIỆN BÁO: RP199X-DANANG 
</div>

</div>
<div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
<div className="lg:col-span-6 flex flex-col justify-between gap-8">
<div className="flex flex-col gap-6">
<div>
<h2 className="font-epilogue font-black text-2xl sm:text-3xl text-retro-dark uppercase tracking-tight"> BAN TỔ CHỨC &amp; BẢO TRỢ </h2><p className="font-vietnam text-sm text-retro-ink-muted mt-2 leading-relaxed"> Dự án văn hóa nghệ thuật hoài niệm được xây dựng bởi tập thể sinh viên và những người yêu mến giai điệu thập niên 90s: </p>
</div>
<div className="flex flex-col gap-3 font-vietnam text-sm">
<div className="bg-retro-paper p-4 rounded-xl border border-retro-dark/20">
<span className="font-space text-xs text-retro-red uppercase font-bold block">ĐƠN VỊ KHỞI XƯỚNG &amp; THỰC HIỆN</span><strong className="font-epilogue text-lg text-retro-dark">REPLY 199X Team</strong>
</div>
<div className="bg-retro-paper p-4 rounded-xl border border-retro-dark/20">
<span className="font-space text-xs text-retro-forest uppercase font-bold block">ĐƠN VỊ BẢO TRỢ</span><strong className="font-epilogue text-base text-retro-dark block mt-0.5">FPT University Đà Nẵng</strong><strong className="font-epilogue text-base text-retro-forest block">EVo – FUDA Event Club</strong>
</div>
<div className="bg-retro-paper p-4 rounded-xl border border-retro-dark/20">
<span className="font-space text-xs text-retro-forest uppercase font-bold block">ĐƠN VỊ ĐỒNG HÀNH &amp; ĐỊA ĐIỂM</span><div className="flex flex-wrap gap-2 mt-2">
<span className="bg-retro-paper-card px-2.5 py-1 rounded text-xs font-semibold text-retro-dark border border-retro-dark/20">On The Radio Đà Nẵng</span><span className="bg-retro-paper-card px-2.5 py-1 rounded text-xs font-semibold text-retro-dark border border-retro-dark/20">Cơm Bưng Nước Rót</span><span className="bg-retro-paper-card px-2.5 py-1 rounded text-xs font-semibold text-retro-dark border border-retro-dark/20">10 Thập</span>
</div>

</div>

</div>

</div>
<div className="pt-4 border-t-2 border-dashed border-retro-dark/20 flex flex-col gap-2.5 font-space text-xs text-retro-forest font-bold">
<div className="flex items-center gap-2">
<span className="retro-icon text-retro-red text-base" aria-hidden="true">✉</span><span className="">Email: loihoidap199x@gmail.com</span>
</div>
<div className="flex items-center gap-2">
<span className="retro-icon text-retro-forest text-base" aria-hidden="true">▶</span><span className="">TikTok: @loihoidap199x</span>
</div>

</div>

</div>
<ContactForm />
</div>

</div>

</div>

</section>

 );
}

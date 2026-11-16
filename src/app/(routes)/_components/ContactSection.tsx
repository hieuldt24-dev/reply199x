import { brief, projectLinks } from "../_data/brief";
import { ContactForm } from "./ContactForm";

export function ContactSection() {
 return (
<section className="reply-contact py-20 lg:py-28 bg-retro-paper paper-pattern relative" id="lien-he">
<div className="reply-shell max-w-7xl mx-auto px-4 lg:px-8">
<div className="reply-envelope bg-retro-paper-card p-6 sm:p-10 lg:p-12 rounded-3xl border-4 border-retro-forest shadow-retro-solid-lg relative">
<div className="flex flex-wrap items-center justify-between pb-8 mb-8 border-b-2 border-dashed border-retro-dark/30 gap-4">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full bg-retro-red text-retro-paper flex items-center justify-center font-bold shadow-md">
<span className="retro-icon text-xl" aria-hidden="true">✉</span>
</div>
<div>
<span className="font-space text-xs uppercase tracking-widest text-retro-red font-bold block"> PAR AVION • BƯU ĐIỆN KÝ ỨC 199X </span><span className="font-vietnam text-sm text-retro-ink-muted">Dòng chảy vẫn tiếp nối</span>
</div>

</div>
<div className="bg-retro-paper px-4 py-2 rounded-lg border border-retro-forest font-space text-xs text-retro-forest font-bold shadow-sm">
 MÃ ĐIỆN BÁO: RP199X-DANANG 
</div>

</div>
<div className="reply-contact__grid grid grid-cols-1 lg:grid-cols-12 gap-12">
<div className="lg:col-span-6 flex flex-col justify-between gap-8">
<div className="flex flex-col gap-6">
<div>
<h2 className="font-epilogue font-black text-2xl sm:text-3xl text-retro-dark uppercase tracking-tight">&#272;&#416;N V&#7882; TH&#431;C HI&#7878;N</h2><p className="font-vietnam text-sm text-retro-ink-muted mt-2 leading-relaxed"> {brief.contact} </p>
</div>
<div className="flex flex-col gap-3 font-vietnam text-sm">
<div className="bg-retro-paper p-4 rounded-xl border border-retro-dark/20">
<span className="font-space text-xs text-retro-red uppercase font-bold block">ĐƠN VỊ THỰC HIỆN</span>
<strong className="font-epilogue text-lg text-retro-dark block">REPLY 199X - &quot;Xu&#244;i d&#242;ng k&#253; &#7913;c, &#273;&#225;nh th&#7913;c thanh xu&#226;n&quot;</strong>
<p className="font-vietnam text-sm text-retro-ink-muted mt-1">Dự án truyền thông nhằm khơi gợi cảm xúc hoài niệm của thế hệ Millennials tại Đà Nẵng.</p>
<p className="font-vietnam text-sm text-retro-ink-muted mt-1">Do sinh viên Trường Đại học FPT Đà Nẵng thực hiện.</p>
</div>
</div><div className="pt-4 border-t-2 border-dashed border-retro-dark/20 flex flex-col gap-2.5 font-space text-xs text-retro-forest font-bold">
<div className="flex items-center gap-2">
<span className="retro-icon text-retro-red text-base" aria-hidden="true">✉</span><a href="mailto:loihoidap199x@gmail.com">Email: loihoidap199x@gmail.com</a>
</div>
<div className="flex items-center gap-2">
<span className="retro-icon text-retro-forest text-base" aria-hidden="true">▶</span><a href={projectLinks.tiktok} target="_blank" rel="noopener noreferrer">TikTok: @loihoidap199x</a>
</div>
<div className="flex items-center gap-2">
<span aria-hidden="true">◎</span><a href={projectLinks.instagram} target="_blank" rel="noopener noreferrer">Instagram: @loihoidap199x</a></div>
</div>
{projectLinks.facebook && <a className="reply-text-link" href={projectLinks.facebook} target="_blank" rel="noopener noreferrer">Facebook: REPLY 199X ↗</a>}
</div>

</div>
<ContactForm />
</div>

</div>

</div>

</section>

 );
}

import { projectLinks } from "@/app/(routes)/_data/brief";

export function Footer() {
 return (
<footer className="reply-footer w-full bg-retro-forest text-retro-paper border-t-8 border-retro-dark pt-12 pb-8">
<div className="reply-shell max-w-7xl mx-auto px-4 lg:px-8">
<div className="bg-retro-dark p-6 sm:p-8 rounded-2xl border-2 border-retro-teal/40 mb-10 flex flex-col md:flex-row items-center justify-between gap-6">
<div className="flex items-center gap-4">
<div className="w-12 h-12 rounded-full bg-retro-paper text-retro-dark flex items-center justify-center border-2 border-retro-gold shrink-0">
<span className="retro-icon text-2xl text-retro-red" aria-hidden="true">▣</span>
</div>
<div>
<div className="font-epilogue font-black text-xl text-retro-gold">
 REPLY 199X — DÒNG CHẢY HOÀI NIỆM 
</div>
<div className="font-space text-xs text-retro-teal-light mt-0.5">
 Email chính thức: loihoidap199x@gmail.com 
</div>

</div>

</div>
<div className="flex flex-wrap items-center gap-3 min-w-0">
<a className="bg-retro-forest hover:bg-retro-paper hover:text-retro-dark text-retro-gold px-4 py-2 rounded-lg border border-retro-gold font-space text-xs font-bold uppercase transition-colors flex items-center gap-1.5" href={projectLinks.tiktok} rel="noopener noreferrer" target="_blank"><span className="retro-icon text-sm" aria-hidden="true">▶</span> TikTok @loihoidap199x </a>{projectLinks.facebook ? (<a className="bg-retro-forest hover:bg-retro-paper hover:text-retro-dark text-retro-gold px-4 py-2 rounded-lg border border-retro-gold font-space text-xs font-bold uppercase transition-colors flex items-center gap-1.5" href={projectLinks.facebook} rel="noopener noreferrer" target="_blank">Facebook</a>) : null}<a className="bg-retro-forest hover:bg-retro-paper hover:text-retro-dark text-retro-gold px-4 py-2 rounded-lg border border-retro-gold font-space text-xs font-bold uppercase transition-colors flex items-center gap-1.5" href={projectLinks.instagram} rel="noopener noreferrer" target="_blank">Instagram</a><a className="bg-retro-forest hover:bg-retro-paper hover:text-retro-dark text-retro-gold px-4 py-2 rounded-lg border border-retro-gold font-space text-xs font-bold uppercase transition-colors flex items-center gap-1.5" href={projectLinks.zalo} rel="noopener noreferrer" target="_blank">Zalo</a><a className="bg-retro-red hover:bg-[#b81700] text-retro-paper px-4 py-2 rounded-lg border border-retro-gold font-space text-xs font-bold uppercase transition-colors flex items-center gap-1.5" href={projectLinks.merch} rel="noopener noreferrer" target="_blank"><span className="retro-icon text-sm" aria-hidden="true">♧</span> Đặt Merch </a>
</div>

</div>
<div className="grid grid-cols-1 gap-8 py-6 border-b border-retro-teal/20 text-xs font-vietnam">
<div>
<span className="font-space text-xs font-bold uppercase text-retro-gold block mb-2">&#272;&#416;N V&#7882; TH&#431;C HI&#7878;N</span>
<p className="text-retro-paper/90 leading-relaxed"><strong>REPLY 199X</strong> - &quot;Xu&#244;i d&#242;ng k&#253; &#7913;c, &#273;&#225;nh th&#7913;c thanh xu&#226;n&quot;<br />D&#7921; &#225;n truy&#7873;n th&#244;ng nh&#7857;m kh&#417;i g&#7907;i c&#7843;m x&#250;c ho&#224;i ni&#7879;m c&#7911;a th&#7871; h&#7879; Millennials t&#7841;i &#272;&#224; N&#7861;ng.<br />Do sinh vi&#234;n Tr&#432;&#7901;ng &#272;&#7841;i h&#7885;c FPT &#272;&#224; N&#7861;ng th&#7921;c hi&#7879;n.</p>
</div>
</div>
<div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-space text-xs text-retro-paper/60 text-center sm:text-left">
<div className="">
 © 2026 REPLY 199X. Tất cả quyền được bảo lưu. Dự án văn hóa hoài niệm Đà Nẵng. 
</div>
<div className="text-retro-gold">
 FM STEREO CASSETTE RECORDER • CHẾ TÁC VINTAGE 
</div>

</div>

</div>

</footer>

 );
}

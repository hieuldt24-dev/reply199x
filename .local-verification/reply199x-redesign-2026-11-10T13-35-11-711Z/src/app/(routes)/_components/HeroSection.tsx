
export function HeroSection() {
 return (
<section className="relative w-full min-h-[600px] lg:min-h-[680px] flex items-center justify-center overflow-hidden border-b-8 border-retro-red bg-[#2F4B23] halftone-dark py-16 lg:py-24">
<div className="absolute -left-12 top-1/2 -translate-y-1/2 hidden xl:flex flex-col items-center opacity-30 pointer-events-none select-none">
<div className="w-36 h-36 rounded-full border-4 border-dashed border-[#578E76] flex items-center justify-center">
<div className="w-16 h-16 rounded-full bg-[#1f3517] border-2 border-[#FFB83F] flex items-center justify-center">
<span className="retro-icon text-2xl text-[#FFB83F]" aria-hidden="true">◉</span>
</div>

</div>
<span className="font-space text-[10px] tracking-widest text-[#FFB83F] uppercase mt-2 font-bold">STEREO HI-FI 199X</span>
</div>
<div className="absolute -right-10 top-1/2 -translate-y-1/2 hidden xl:flex flex-col items-center opacity-30 pointer-events-none select-none">
<div className="w-32 h-20 rounded-xl border-2 border-dashed border-[#FFB83F] flex items-center justify-center gap-3 bg-[#1f3517]/50">
<div className="w-6 h-6 rounded-full border border-[#7ccfaa]">

</div>
<div className="w-6 h-6 rounded-full border border-[#7ccfaa]">

</div>

</div>
<span className="font-space text-[10px] tracking-widest text-[#7ccfaa] uppercase mt-2 font-bold">TAPE CASSETTE REC</span>
</div>
<div className="absolute bottom-3 left-6 flex items-center gap-2 opacity-50 pointer-events-none z-10 hidden sm:flex">
<span className="font-space text-xs tracking-widest uppercase text-[#FFB83F] font-bold">REC [●] 199X-2026 HI-FI STEREO 3.75 IPS</span>
</div>
<div className="relative z-10 max-w-4xl mx-auto px-4 text-center flex flex-col items-center">
<div className="inline-flex items-center gap-2 bg-[#1f3517] text-[#FFB83F] border-2 border-[#FFB83F] px-4 py-1.5 rounded-full shadow-retro-solid mb-6">
<span className="w-2.5 h-2.5 rounded-full bg-[#A01300] animate-pulse"></span><span className="font-space text-xs uppercase font-bold tracking-widest text-[#FFB83F]">Dự Án Nghệ Thuật &amp; Âm Nhạc Hoài Niệm</span>
</div>
<h1 className="font-epilogue font-black text-4xl sm:text-6xl md:text-7xl uppercase tracking-wider text-[#FAF3E0] leading-[1.1] mb-5" style={{"textShadow": "3px 3px 0px #A01300, 6px 6px 0px #FFB83F, 9px 9px 0px #13240d"}}>DÒNG CHẢY HOÀI NIỆM</h1><div className="font-vietnam font-medium italic text-xl sm:text-2xl text-[#FFB83F] tracking-wide mb-6" style={{"textShadow": "1px 1px 0px #13240d"}}>
“Xuôi dòng ký ức, đánh thức thanh xuân”
</div>
<p className="font-vietnam text-base sm:text-lg text-[#FAF3E0] leading-relaxed max-w-2xl mx-auto mb-8 font-normal opacity-95">Không gian âm nhạc &amp; triển lãm thực cảnh hồi tưởng lại năm tháng rực rỡ thập niên 90s – đầu 2000s, nơi đài cát-sét phát giai điệu thanh xuân và điện thoại bàn lưu giữ bao hẹn ước.</p><div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-8">
<a href="#gioi-thieu" className="inline-flex items-center gap-2.5 bg-[#578E76] hover:bg-[#43725e] text-[#1E1C10] hover:text-[#FAF3E0] font-space text-xs sm:text-sm font-bold uppercase tracking-wider px-6 py-3.5 rounded-lg border-2 border-[#FFB83F] shadow-retro-solid hover:-translate-y-0.5 active:translate-y-0.5 transition-all"><span className="retro-icon text-lg text-[#FFB83F]" aria-hidden="true">◈</span><span className="">Khám phá hành trình</span></a><a href="#su-kien" className="inline-flex items-center gap-2.5 bg-[#A01300] hover:bg-[#b81700] text-[#FAF3E0] font-space text-xs sm:text-sm font-bold uppercase tracking-wider px-6 py-3.5 rounded-lg border-2 border-[#FFB83F] shadow-[3px_3px_0px_#13240d] hover:-translate-y-0.5 active:translate-y-0.5 transition-all"><span className="retro-icon text-lg text-[#FFB83F]" aria-hidden="true">⚑</span><span className="">Xem sự kiện 22/11</span></a>
</div>
<div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
<span className="bg-[#1f3517]/80 border border-[#FFB83F]/50 px-3 py-1 rounded text-xs font-space text-[#ffcf70] flex items-center gap-1.5 shadow-sm"><span className="retro-icon text-xs text-[#FFB83F]" aria-hidden="true">◉</span> Băng Cassette</span><span className="bg-[#1f3517]/80 border border-[#FFB83F]/50 px-3 py-1 rounded text-xs font-space text-[#ffcf70] flex items-center gap-1.5 shadow-sm"><span className="retro-icon text-xs text-[#FFB83F]" aria-hidden="true">▣</span> TV CRT Cổ Điển</span><span className="bg-[#1f3517]/80 border border-[#FFB83F]/50 px-3 py-1 rounded text-xs font-space text-[#ffcf70] flex items-center gap-1.5 shadow-sm"><span className="retro-icon text-xs text-[#FFB83F]" aria-hidden="true">✥</span> Máy Game Bấm</span><span className="bg-[#1f3517]/80 border border-[#FFB83F]/50 px-3 py-1 rounded text-xs font-space text-[#ffcf70] flex items-center gap-1.5 shadow-sm"><span className="retro-icon text-xs text-[#FFB83F]" aria-hidden="true">☎</span> Điện Thoại Quay Số</span>
</div>

</div>

</section>

 );
}

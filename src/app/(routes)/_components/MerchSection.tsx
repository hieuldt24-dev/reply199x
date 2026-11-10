import { upcomingProducts, merchCombos } from "../_data/home";

export function MerchSection() {
 return (
<section className="reply-merch py-20 lg:py-28 bg-retro-dark text-retro-paper border-b-8 border-retro-gold halftone-dark relative" id="merch">
<div className="reply-shell max-w-7xl mx-auto px-4 lg:px-8">
<div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
<div>
<span className="font-space text-xs font-bold uppercase tracking-widest text-retro-gold flex items-center gap-1.5"><span className="retro-icon text-sm" aria-hidden="true">♧</span> VẬT PHẨM KỶ NIỆM • RETRO MERCHANDISE </span><h2 className="font-epilogue font-black text-3xl sm:text-5xl uppercase tracking-tight text-retro-paper retro-title-shadow mt-1"> KỶ VẬT THỜI GIAN – MERCH 199X </h2>
</div>
<p className="font-vietnam text-retro-paper/80 text-sm sm:text-base max-w-md"> Những vật phẩm thủ công đượm màu thời gian dành cho khán giả yêu mến hành trình Reply 199X. </p>
</div>
<div className="reply-combos grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
<div className="reply-combo bg-retro-forest p-7 sm:p-8 rounded-2xl border-4 border-retro-teal shadow-retro-solid-lg flex flex-col justify-between relative group hover:border-retro-gold transition-colors">
<div className="inline-flex items-center gap-2 self-start bg-retro-gold text-retro-dark font-space text-xs uppercase font-extrabold tracking-wider px-3 py-1 rounded shadow-sm mb-4">
 COMBO HOÀI NIỆM 01 
</div>
<div>
<div className="flex items-start justify-between gap-4">
<div>
<h3 className="font-epilogue font-black text-2xl sm:text-3xl text-retro-paper"> {merchCombos[0].title} </h3><p className="font-vietnam text-sm text-retro-teal-light mt-1"> Gói kỷ vật học trò: Túi tote vải canvas vintage + Sổ tay lưu bút </p>
</div>
<div className="text-right shrink-0">
<span className="font-space text-xs uppercase text-retro-paper/70 line-through block">{merchCombos[0].originalPrice}</span><div className="font-epilogue font-black text-3xl text-retro-gold">
 {merchCombos[0].price}<span className="text-base text-retro-paper">đ</span>
</div>

</div>

</div>
<div className="my-6 bg-retro-dark p-4 rounded-xl border-2 border-dashed border-retro-teal/50 flex flex-col items-center justify-center text-center">
<div className="flex items-center gap-6 py-4">
<div className="flex flex-col items-center">
<span className="retro-icon text-4xl text-retro-gold" aria-hidden="true">♧</span><span className="font-space text-xs text-retro-paper mt-1">Túi Tote 199X</span>
</div>
<span className="font-epilogue text-2xl text-retro-teal font-bold">+</span><div className="flex flex-col items-center">
<span className="retro-icon text-4xl text-retro-gold" aria-hidden="true">▤</span><span className="font-space text-xs text-retro-paper mt-1">Sổ Tay Lưu Bút</span>
</div>

</div>
<div className="font-space text-xs text-retro-teal-light font-bold bg-retro-forest px-3 py-1 rounded mt-2 border border-retro-teal/30">
 TEM SẢN PHẨM: BỘ ĐÔI HỌC TRÒ 90S 
</div>

</div>
<div className="bg-retro-red/80 border border-retro-gold text-retro-paper px-3 py-2 rounded-lg font-space text-xs font-bold flex items-center gap-2">
<span className="retro-icon text-sm text-retro-gold" aria-hidden="true">✦</span><span className="">GIÁ ƯU ĐÃI ÁP DỤNG: 06/11/2026 – 12/11/2026</span>
</div>

</div>
<div className="mt-8 pt-4 border-t border-retro-teal/30 flex items-center justify-between">
<span className="font-vietnam text-xs text-retro-paper/70">Số lượng ưu đãi có hạn</span><a className="inline-flex items-center gap-2 bg-retro-gold hover:bg-retro-gold-light text-retro-dark font-space text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-lg border-2 border-retro-dark shadow-retro-solid transition-all hover:-translate-y-0.5" href="https://forms.gle/tW1VU8vpASc53CJa8" rel="noopener noreferrer" target="_blank"><span className="">Đặt Combo Tuổi Xì Tin</span><span className="retro-icon text-sm" aria-hidden="true">↗</span></a>
</div>

</div>
<div className="reply-combo reply-combo--full bg-retro-forest p-7 sm:p-8 rounded-2xl border-4 border-retro-gold shadow-retro-solid-lg flex flex-col justify-between relative group">
<div className="inline-flex items-center gap-2 self-start bg-retro-red text-retro-paper font-space text-xs uppercase font-extrabold tracking-wider px-3 py-1 rounded shadow-sm mb-4">
 COMBO ĐẦY ĐỦ 02 • SIÊU ƯU ĐÃI 
</div>
<div>
<div className="flex items-start justify-between gap-4">
<div>
<h3 className="font-epilogue font-black text-2xl sm:text-3xl text-retro-paper"> {merchCombos[1].title} </h3><p className="font-vietnam text-sm text-retro-teal-light mt-1"> Trọn bộ ký ức: Túi tote + Sổ tay lưu bút + Ly kỷ niệm + Phiếu nước </p>
</div>
<div className="text-right shrink-0">
<span className="font-space text-xs uppercase text-retro-paper/70 line-through block">{merchCombos[1].originalPrice}</span><div className="font-epilogue font-black text-3xl text-retro-gold">
 {merchCombos[1].price}<span className="text-base text-retro-paper">đ</span>
</div>

</div>

</div>
<div className="my-6 bg-retro-dark p-4 rounded-xl border-2 border-dashed border-retro-gold/50 flex flex-col items-center justify-center text-center">
<div className="flex flex-wrap items-center justify-center gap-4 py-2">
<div className="flex flex-col items-center">
<span className="retro-icon text-3xl text-retro-gold" aria-hidden="true">♧</span><span className="font-space text-[11px] text-retro-paper mt-0.5">Túi Tote</span>
</div>
<span className="font-epilogue text-lg text-retro-teal">+</span><div className="flex flex-col items-center">
<span className="retro-icon text-3xl text-retro-gold" aria-hidden="true">▤</span><span className="font-space text-[11px] text-retro-paper mt-0.5">Sổ Tay</span>
</div>
<span className="font-epilogue text-lg text-retro-teal">+</span><div className="flex flex-col items-center">
<span className="retro-icon text-3xl text-retro-gold" aria-hidden="true">♨</span><span className="font-space text-[11px] text-retro-paper mt-0.5">Ly Kỷ Niệm</span>
</div>
<span className="font-epilogue text-lg text-retro-teal">+</span><div className="flex flex-col items-center">
<span className="retro-icon text-3xl text-retro-gold" aria-hidden="true">▣</span><span className="font-space text-[11px] text-retro-paper mt-0.5">Phiếu Nước</span>
</div>

</div>
<div className="font-space text-xs text-retro-gold font-bold bg-retro-forest px-3 py-1 rounded mt-2 border border-retro-gold/30">
 TEM SẢN PHẨM: FULL SET KỶ VẬT HOÀI NIỆM 
</div>

</div>
<div className="bg-retro-red/80 border border-retro-gold text-retro-paper px-3 py-2 rounded-lg font-space text-xs font-bold flex items-center gap-2">
<span className="retro-icon text-sm text-retro-gold" aria-hidden="true">✦</span><span className="">GIÁ ƯU ĐÃI ÁP DỤNG: 06/11/2026 – 12/11/2026</span>
</div>

</div>
<div className="mt-8 pt-4 border-t border-retro-teal/30 flex items-center justify-between">
<span className="font-vietnam text-xs text-retro-paper/70">Số lượng giới hạn</span><a className="inline-flex items-center gap-2 bg-retro-red hover:bg-[#b81700] text-retro-paper font-space text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-lg border-2 border-retro-gold shadow-retro-solid transition-all hover:-translate-y-0.5" href="https://forms.gle/tW1VU8vpASc53CJa8" rel="noopener noreferrer" target="_blank"><span className="">Đặt Combo Tuổi Xì Lây</span><span className="retro-icon text-sm" aria-hidden="true">↗</span></a>
</div>

</div>

</div>
<div className="reply-products grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
{upcomingProducts.map((product) => (
<div key={product.id} className="reply-product bg-retro-forest/90 p-5 rounded-xl border-2 border-retro-teal/40 flex flex-col justify-between"><div><div className="h-28 bg-retro-dark rounded-lg flex flex-col items-center justify-center text-retro-gold border border-retro-teal/30"><span aria-hidden="true" className="retro-icon text-4xl">{product.symbol}</span><span className="font-space text-[10px] text-retro-teal-light mt-1 font-bold">{product.stamp}</span></div><h4 className="font-epilogue font-bold text-base text-retro-paper mt-3">{product.title}</h4><p className="font-vietnam text-xs text-retro-paper/70 mt-1">{product.description}</p></div><div className="mt-4 pt-2 border-t border-retro-teal/20 flex items-center justify-between gap-2"><span className="font-space text-[11px] text-retro-gold font-bold">{product.material}</span><span className="font-space text-[11px] text-retro-paper/70">{product.status}</span></div></div>
))}
</div>

</div>

</section>

 );
}

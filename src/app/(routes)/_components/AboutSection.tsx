import { brief } from "../_data/brief";
import { assets, tracks } from "../_data/home";
import { RemoteImage } from "./RemoteImage";

export function AboutSection() {
 return (
<section className="reply-about bg-retro-paper paper-pattern relative py-16 lg:py-20" id="gioi-thieu">
<div className="reply-shell max-w-7xl mx-auto px-4 lg:px-8">
<div className="reply-about__grid grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-10 lg:gap-14 items-stretch">
<div className="reply-about__intro flex flex-col gap-5">
<div className="inline-flex items-center gap-2 self-start bg-retro-dark text-retro-gold px-3.5 py-1.5 rounded font-space text-xs uppercase tracking-widest font-bold">
<span className="retro-icon text-sm text-retro-red" aria-hidden="true">▣</span><span className="">Nơi ký ức bắt đầu</span>
</div>
<div className="flex flex-col">
<h2 className="font-epilogue font-black text-3xl sm:text-4xl text-retro-dark tracking-tight retro-title-shadow leading-tight">Reply 199X <span className="text-retro-red">— LỜI HỒI ĐÁP THANH XUÂN</span></h2><div className="h-1 w-20 bg-retro-gold mt-3 rounded-full">

</div>

</div>
<p className="reply-key-message">Theo dòng ký ức, ta trở lại những điều thân thuộc.</p>
<p className="reply-about__copy">{brief.about[0]}</p><p className="reply-about__copy">Không đơn thuần tái hiện quá khứ, REPLY 199X kết nối những ký ức riêng qua âm nhạc, truyền hình, trò chơi và truyện tranh để lan tỏa tinh thần ấy trong hiện tại.</p>
<div className="reply-about-cassette reply-about-cassette--art">
 <RemoteImage src={assets.cassette} alt="Cassette REPLY 199X màu kem, nhãn đỏ Thanh xuân vẫn ở đây" width={1554} height={1012} className="reply-about-cassette__image" fallback="Thanh xuân vẫn ở đây" />
</div>

</div>
<div className="reply-tracks flex flex-col gap-4 relative">
<div className="absolute left-7 top-10 bottom-10 w-0.5 border-l-2 border-dashed border-retro-teal/40 hidden sm:block pointer-events-none">

</div>
<div className="reply-eyebrow">Mục đích &amp; ý nghĩa</div>
{tracks.map((track, index) => (
<div key={track.id} className="reply-track bg-retro-paper-card p-6 rounded-xl border border-retro-dark/20 hover:border-retro-teal transition-colors relative flex flex-col sm:flex-row gap-5 items-start">
<div className="w-14 h-14 rounded-xl bg-retro-paper border-2 border-retro-dark text-retro-dark font-space font-black text-2xl flex items-center justify-center shrink-0 shadow-sm">{track.number}</div>
<div className="flex-1"><span className="font-space text-xs font-bold uppercase tracking-widest text-retro-forest">{track.label}</span><h3 className="font-epilogue font-bold text-xl text-retro-dark">{track.title}</h3><p className="font-vietnam text-sm text-retro-ink-muted mt-2 leading-relaxed">{brief.purposes[index]}</p></div>
</div>
))}
</div>

</div>

</div>

</section>

 );
}

import { brief, projectLinks } from "../_data/brief";

const channelCardClass = "reply-channel bg-retro-paper-card p-6 sm:p-7 rounded-xl border-2 border-retro-forest shadow-retro-solid flex flex-col justify-between";
const channelFooterClass = "pt-4 border-t-2 border-dashed border-retro-dark/20 flex items-center justify-between gap-4";

export function ChannelsSection() {
  return (
    <section className="reply-channels py-16 lg:py-20 bg-retro-paper-dark border-y-4 border-retro-dark" id="kenh-truyen-thong">
      <div className="reply-shell max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <span className="font-space text-xs font-bold uppercase tracking-widest text-retro-red flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-retro-red animate-pulse" />BẮT SÓNG KÝ ỨC
            </span>
            <h2 className="font-epilogue font-black text-2xl sm:text-3xl text-retro-dark uppercase tracking-tight mt-1">Theo dòng ký ức, kết nối mọi khoảnh khắc</h2>
          </div>
          <p className="font-vietnam text-sm text-retro-ink-muted max-w-md">{brief.channels}</p>
        </div>

        <div className="reply-channels__grid grid grid-cols-1 md:grid-cols-3 gap-8">
          <article className={channelCardClass}>
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-retro-dark text-retro-gold flex items-center justify-center border-2 border-retro-gold shadow-sm shrink-0" aria-hidden="true">
                    <svg className="h-7 w-7" viewBox="0 0 24 24">
                      <path fill="#25F4EE" d="M14.5 3h3c.25 2.05 1.4 3.3 3.5 3.8v3.1c-1.65-.05-3.2-.55-4.5-1.5v7a5.5 5.5 0 1 1-5.5-5.5c.35 0 .7.05 1 .1v3.3a2.2 2.2 0 1 0 1.5 2.1V3h1Z" transform="translate(-.6 -.2)" />
                      <path fill="#FE2C55" d="M14.5 3h3c.25 2.05 1.4 3.3 3.5 3.8v3.1c-1.65-.05-3.2-.55-4.5-1.5v7a5.5 5.5 0 1 1-5.5-5.5c.35 0 .7.05 1 .1v3.3a2.2 2.2 0 1 0 1.5 2.1V3h1Z" transform="translate(.45 .15)" />
                      <path fill="#fff" d="M14.5 3h3c.25 2.05 1.4 3.3 3.5 3.8v3.1c-1.65-.05-3.2-.55-4.5-1.5v7a5.5 5.5 0 1 1-5.5-5.5c.35 0 .7.05 1 .1v3.3a2.2 2.2 0 1 0 1.5 2.1V3h1Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-epilogue font-bold text-lg sm:text-xl text-retro-dark">Kênh TikTok Chính Thức</h3>
                    <p className="font-space text-sm font-semibold text-retro-forest">@loihoidap199x</p>
                  </div>
                </div>
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-space text-[11px] font-bold px-2.5 py-1 rounded uppercase tracking-wider shrink-0">Đang phát sóng</span>
              </div>
              <p className="font-vietnam text-sm text-retro-ink-muted mt-4 mb-6 leading-relaxed">{brief.tiktok}</p>
            </div>
            <div className={channelFooterClass}>
              <span className="font-space text-xs text-retro-ink-muted/80 font-semibold">tiktok.com/@loihoidap199x</span>
              <a className="reply-action" href={projectLinks.tiktok} rel="noopener noreferrer" target="_blank">Bắt sóng ngay ↗</a>
            </div>
          </article>

          <article className={channelCardClass}>
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-retro-paper border-2 border-retro-dark/40 text-[#1877F2] flex items-center justify-center shrink-0" aria-hidden="true">
                    <svg className="h-7 w-7" viewBox="0 0 24 24"><path fill="currentColor" d="M13.5 21v-8h2.8l.4-3.1h-3.2v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.3V13h2.8v8h3.4Z" /></svg>
                  </div>
                  <div>
                    <h3 className="font-epilogue font-bold text-lg sm:text-xl text-retro-dark">Facebook Fanpage</h3>
                    <p className="font-space text-sm font-semibold text-retro-forest">REPLY 199X Official</p>
                  </div>
                </div>
                <span className="bg-amber-100 text-amber-900 border border-amber-300 font-space text-[11px] font-bold px-2.5 py-1 rounded uppercase tracking-wider shrink-0">Kênh chính thức</span>
              </div>
              <p className="font-vietnam text-sm text-retro-ink-muted mt-4 mb-6 leading-relaxed">{brief.facebook}</p>
            </div>
            <div className={channelFooterClass}>
              <span className="font-space text-xs text-retro-ink-muted italic">facebook.com/loihoidap199x</span>
              {projectLinks.facebook ? <a className="reply-action" href={projectLinks.facebook} target="_blank" rel="noopener noreferrer">Theo dõi fanpage</a> : <button type="button" className="reply-action reply-action--unavailable" disabled>Theo dõi fanpage</button>}
            </div>
          </article>

          <article className={channelCardClass}>
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-retro-paper border-2 border-retro-dark/40 text-retro-red flex items-center justify-center shrink-0" aria-hidden="true">
                    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
                  </div>
                  <div>
                    <h3 className="font-epilogue font-bold text-lg sm:text-xl text-retro-dark">Instagram</h3>
                    <p className="font-space text-sm font-semibold text-retro-forest">@loihoidap199x</p>
                  </div>
                </div>
                <span className="bg-amber-100 text-amber-900 border border-amber-300 font-space text-[11px] font-bold px-2.5 py-1 rounded uppercase tracking-wider shrink-0">REPLY 199X</span>
              </div>
              <p className="font-vietnam text-sm text-retro-ink-muted mt-4 mb-6 leading-relaxed">Theo dõi Instagram chính thức của REPLY 199X để cập nhật hình ảnh và những khoảnh khắc của dự án.</p>
            </div>
            <div className={channelFooterClass}>
              <span className="font-space text-xs text-retro-ink-muted italic">instagram.com/loihoidap199x</span>
              <a className="reply-action" href={projectLinks.instagram} target="_blank" rel="noopener noreferrer">Theo dõi Instagram</a>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

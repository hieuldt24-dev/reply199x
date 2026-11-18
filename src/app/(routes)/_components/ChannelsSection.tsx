import { radioChannels, radioHeader } from "../_data/channels";
import { ChannelsRadio } from "./ChannelsRadio";

/** Server shell for the "Bắt sóng ký ức" section; only the radio itself is a client leaf. */
export function ChannelsSection() {
  return (
    <section className="radio-section" id="kenh-truyen-thong">
      <div className="radio-shell">
        <header className="radio-header">
          <div>
            <p className="radio-eyebrow">
              <span aria-hidden="true" className="radio-eyebrow__dot" />
              {radioHeader.eyebrow}
            </p>
            <h2 className="radio-title">{radioHeader.title}</h2>
          </div>
          <p className="radio-intro">{radioHeader.intro}</p>
        </header>
        <ChannelsRadio channels={radioChannels} />
      </div>
    </section>
  );
}

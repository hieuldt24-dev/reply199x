import type { RadioChannel } from "../_types/channels";
import { RadioBrandIcon } from "./RadioBrandIcon";

type RadioNowPlayingProps = Readonly<{ channel: RadioChannel }>;

/** "Now playing" panel and the external call to action for the active channel. */
export function RadioNowPlaying({ channel }: RadioNowPlayingProps) {
  return (
    <div className="radio-now" data-testid="radio-now">
      <div className="radio-now__info">
        <p className="radio-now__status">ĐANG PHÁT · {channel.frequency}</p>
        <div className="radio-now__title">
          <RadioBrandIcon className="radio-now__icon" iconId={channel.iconId} />
          <h3 className="radio-now__name">{channel.name}</h3>
        </div>
        <span className="radio-handle">{channel.handle}</span>
        <p className="radio-now__desc">{channel.description}</p>
      </div>
      {channel.href ? (
        <a className="radio-cta" href={channel.href} rel="noopener noreferrer" target="_blank">
          {channel.cta}
        </a>
      ) : (
        <button className="radio-cta radio-cta--disabled" disabled type="button">
          {channel.cta}
        </button>
      )}
    </div>
  );
}

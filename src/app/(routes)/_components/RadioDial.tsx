import { DIAL_LABEL } from "../_data/channels";
import type { RadioChannel } from "../_types/channels";

type RadioDialProps = Readonly<{
  channels: readonly RadioChannel[];
  activeOrder: number;
}>;

const TICK_COUNT = 81;
const SCALE = ["199.0", "199.1", "199.2", "199.3", "199.4"] as const;

/** Decorative tuning glass: 81 ticks, the 199.0-199.4 scale, channel names and the needle. */
export function RadioDial({ channels, activeOrder }: RadioDialProps) {
  return (
    <div aria-hidden="true" className="radio-dial">
      <div className="radio-dial__top">
        <span>FM</span>
        <span>MHz</span>
      </div>
      <div className="radio-dial__glass">
        <div className="radio-ticks">
          {Array.from({ length: TICK_COUNT }, (_, index) => (
            <span className={index % 5 === 0 ? "radio-tick radio-tick--major" : "radio-tick"} key={index} />
          ))}
        </div>
        <div className="radio-scale">
          {SCALE.map((value, index) => (
            <span key={value} style={{ left: `${index * 25}%` }}>
              {value}
            </span>
          ))}
        </div>
        <div className="radio-names">
          {channels.map((channel) => (
            <span
              className={channel.order === activeOrder ? "radio-name radio-name--active" : "radio-name"}
              key={channel.id}
              style={{ left: `${channel.order * 25}%` }}
            >
              {channel.name}
            </span>
          ))}
        </div>
        <span className="radio-needle" data-testid="radio-needle" style={{ left: `${activeOrder * 25}%` }} />
      </div>
      <div className="radio-dial__bottom">
        <span>{DIAL_LABEL}</span>
        <span className="radio-onair">
          <span className="radio-onair__dot" />
          ON AIR
        </span>
      </div>
    </div>
  );
}

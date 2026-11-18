import type { KeyboardEvent } from "react";
import { PRESETS_LABEL } from "../_data/channels";
import type { ChannelId, RadioChannel } from "../_types/channels";
import { RadioBrandIcon } from "./RadioBrandIcon";

type RadioKeysProps = Readonly<{
  channels: readonly RadioChannel[];
  activeId: ChannelId;
  onSelect: (id: ChannelId) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  keyRef: (index: number, element: HTMLButtonElement | null) => void;
}>;

const LABEL_ID = "radio-keys-label";

/** Four mechanical preset keys; stateless, the parent owns the active channel. */
export function RadioKeys({ channels, activeId, onSelect, onKeyDown, keyRef }: RadioKeysProps) {
  return (
    <div className="radio-keys-wrap">
      <p className="radio-keys__label" id={LABEL_ID}>
        {PRESETS_LABEL}
      </p>
      <div aria-labelledby={LABEL_ID} className="radio-keys" onKeyDown={onKeyDown} role="group">
        {channels.map((channel, index) => {
          const active = channel.id === activeId;
          return (
            <button
              aria-pressed={active}
              className={active ? "radio-key radio-key--active" : "radio-key"}
              key={channel.id}
              onClick={() => onSelect(channel.id)}
              ref={(element) => keyRef(index, element)}
              type="button"
            >
              <span className="radio-key__top">
                <span className="radio-key__freq">
                  {channel.order} · {channel.frequency}
                </span>
                <RadioBrandIcon className="radio-key__icon" iconId={channel.iconId} />
              </span>
              <span className="radio-key__name">{channel.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

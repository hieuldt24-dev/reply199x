"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import type { ChannelId, RadioChannel } from "../_types/channels";
import { RadioDial } from "./RadioDial";
import { RadioKeys } from "./RadioKeys";
import { RadioKnobs } from "./RadioKnobs";
import { RadioNowPlaying } from "./RadioNowPlaying";
import { RadioSpeaker } from "./RadioSpeaker";

type ChannelsRadioProps = Readonly<{ channels: readonly RadioChannel[] }>;

/** Returns the index to move to for a navigation key, or null when the key is not handled. */
function targetIndex(key: string, current: number, count: number): number | null {
  switch (key) {
    case "ArrowRight":
      return (current + 1) % count;
    case "ArrowLeft":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

/** Interactive vintage radio: four preset keys switch the channel shown on the dial and panel. */
export function ChannelsRadio({ channels }: ChannelsRadioProps) {
  const [activeId, setActiveId] = useState<ChannelId>(channels[0]?.id ?? "tiktok");
  const keyRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeIndex = Math.max(
    0,
    channels.findIndex((channel) => channel.id === activeId),
  );
  const active = channels[activeIndex];

  if (!active) {
    return null;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }
    const next = targetIndex(event.key, activeIndex, channels.length);
    const channel = next === null ? undefined : channels[next];
    if (next === null || !channel) {
      return;
    }
    event.preventDefault();
    setActiveId(channel.id);
    keyRefs.current[next]?.focus();
  }

  function setKeyRef(index: number, element: HTMLButtonElement | null) {
    keyRefs.current[index] = element;
  }

  return (
    <div className="radio-cabinet">
      <div className="radio-face">
        <RadioSpeaker />
        <RadioDial activeOrder={active.order} channels={channels} />
        <RadioKnobs />
      </div>
      <RadioKeys
        activeId={active.id}
        channels={channels}
        keyRef={setKeyRef}
        onKeyDown={handleKeyDown}
        onSelect={setActiveId}
      />
      <RadioNowPlaying channel={active} key={active.id} />
    </div>
  );
}

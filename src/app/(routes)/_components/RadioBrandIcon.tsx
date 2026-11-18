import type { ChannelId } from "../_types/channels";

type RadioBrandIconProps = Readonly<{ iconId: ChannelId; className?: string }>;

const iconPaths: Readonly<Record<ChannelId, string>> = {
  tiktok:
    "M14.5 3h3c.25 2.05 1.4 3.3 3.5 3.8v3.1c-1.65-.05-3.2-.55-4.5-1.5v7a5.5 5.5 0 1 1-5.5-5.5c.35 0 .7.05 1 .1v3.3a2.2 2.2 0 1 0 1.5 2.1V3h1Z",
  facebook:
    "M13.5 21v-8h2.8l.4-3.1h-3.2v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.3V13h2.8v8h3.4Z",
  instagram:
    "M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H8Zm4 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm5.5-4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z",
  zalo:
    "M12 3c5 0 9 3.4 9 7.6s-4 7.6-9 7.6c-.9 0-1.8-.1-2.6-.3L5 20l.9-3.6C4.1 15 3 12.9 3 10.6 3 6.4 7 3 12 3Zm-3.2 4.4v1.5h4.2l-4.4 5v1.1h6.6v-1.5h-4.3l4.4-5V7.4H8.8Z",
};

/** Single-colour brand mark; decorative because the channel name is always shown as text. */
export function RadioBrandIcon({ iconId, className }: RadioBrandIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <path d={iconPaths[iconId]} fillRule="evenodd" />
    </svg>
  );
}

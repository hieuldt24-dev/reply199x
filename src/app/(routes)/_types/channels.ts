export type ChannelId = "tiktok" | "facebook" | "instagram" | "zalo";

export type RadioChannel = Readonly<{
  id: ChannelId;
  order: number;
  frequency: string;
  name: string;
  handle: string;
  description: string;
  cta: string;
  href: string | null;
  iconId: ChannelId;
}>;

export type RadioHeaderCopy = Readonly<{
  eyebrow: string;
  title: string;
  intro: string;
}>;

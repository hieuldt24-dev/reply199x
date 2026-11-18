// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ChannelsRadio } from "./ChannelsRadio";
import { radioChannels, ZALO_GROUP_NAME } from "../_data/channels";

function keyGroup() {
  return screen.getByRole("group");
}

function keyFor(name: string) {
  return within(keyGroup()).getByRole("button", { name: new RegExp(name, "u") });
}

function nowPlaying() {
  return screen.getByTestId("radio-now");
}

describe("ChannelsRadio", () => {
  it("should mark TikTok active by default", () => {
    render(<ChannelsRadio channels={radioChannels} />);
    const buttons = within(keyGroup()).getAllByRole("button");
    expect(buttons).toHaveLength(4);
    expect(keyFor("TikTok")).toHaveAttribute("aria-pressed", "true");
    for (const name of ["Facebook", "Instagram", "Zalo"]) {
      expect(keyFor(name)).toHaveAttribute("aria-pressed", "false");
    }
    const now = within(nowPlaying());
    expect(now.getByText("ĐANG PHÁT · FM 199.1")).toBeInTheDocument();
    expect(now.getByText("TikTok")).toBeInTheDocument();
    expect(now.getByText("@loihoidap199x")).toBeInTheDocument();
    expect(now.getByText(radioChannels[0]!.description)).toBeInTheDocument();
    const cta = now.getByRole("link", { name: "Bắt sóng TikTok ↗" });
    expect(cta).toHaveAttribute("href", "https://www.tiktok.com/@loihoidap199x");
    expect(cta).toHaveAttribute("target", "_blank");
    expect(cta.getAttribute("rel")).toContain("noopener");
    expect(cta.getAttribute("rel")).toContain("noreferrer");
    expect(screen.getByTestId("radio-needle")).toHaveStyle({ left: "25%" });
  });

  it("should switch content and aria-pressed on click", async () => {
    const user = userEvent.setup();
    render(<ChannelsRadio channels={radioChannels} />);
    await user.click(keyFor("Instagram"));
    expect(keyFor("Instagram")).toHaveAttribute("aria-pressed", "true");
    expect(keyFor("TikTok")).toHaveAttribute("aria-pressed", "false");
    const now = within(nowPlaying());
    expect(now.getByText("ĐANG PHÁT · FM 199.3")).toBeInTheDocument();
    expect(now.getByText("Instagram")).toBeInTheDocument();
    expect(now.getByText(radioChannels[2]!.description)).toBeInTheDocument();
    expect(now.getByRole("link", { name: "Bắt sóng Instagram ↗" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/loihoidap199x/",
    );
    expect(screen.getByTestId("radio-needle")).toHaveStyle({ left: "75%" });
  });

  it("should move active channel with arrow keys and wrap", async () => {
    const user = userEvent.setup();
    render(<ChannelsRadio channels={radioChannels} />);
    keyFor("TikTok").focus();

    await user.keyboard("{ArrowRight}");
    expect(keyFor("Facebook")).toHaveAttribute("aria-pressed", "true");
    expect(keyFor("Facebook")).toHaveFocus();

    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(keyFor("Zalo")).toHaveAttribute("aria-pressed", "true");
    expect(keyFor("Zalo")).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(keyFor("TikTok")).toHaveAttribute("aria-pressed", "true");

    await user.keyboard("{End}");
    expect(keyFor("Zalo")).toHaveAttribute("aria-pressed", "true");
    expect(keyFor("Zalo")).toHaveFocus();

    await user.keyboard("{Home}");
    expect(keyFor("TikTok")).toHaveAttribute("aria-pressed", "true");
    expect(keyFor("TikTok")).toHaveFocus();

    await user.keyboard("{Control>}{ArrowRight}{/Control}");
    expect(keyFor("TikTok")).toHaveAttribute("aria-pressed", "true");
  });

  it("should render disabled button when Facebook href is null", async () => {
    const user = userEvent.setup();
    const channels = radioChannels.map((channel) =>
      channel.id === "facebook" ? { ...channel, href: null } : channel,
    );
    render(<ChannelsRadio channels={channels} />);
    await user.click(keyFor("Facebook"));
    const now = within(nowPlaying());
    const cta = now.getByRole("button", { name: "Bắt sóng Facebook ↗" });
    expect(cta).toBeDisabled();
    expect(now.queryByRole("link")).toBeNull();
    expect(within(keyGroup()).getAllByRole("button")).toHaveLength(4);
  });

  it("should link Zalo CTA to the group URL", async () => {
    const user = userEvent.setup();
    render(<ChannelsRadio channels={radioChannels} />);
    await user.click(keyFor("Zalo"));
    const now = within(nowPlaying());
    expect(now.getByText(`Nhóm ${ZALO_GROUP_NAME}`)).toBeInTheDocument();
    expect(now.getByText("Nhóm HỘI ĐỒNG NIÊN REPLY 199X TẠI ĐÀ NẴNG")).toBeInTheDocument();
    const cta = now.getByRole("link", { name: "Vào nhóm Zalo ↗" });
    expect(cta).toHaveAttribute("href", "https://zalo.me/g/fhjd7fuvlccje1jwxyvu");
    expect(cta).toHaveAttribute("target", "_blank");
    expect(screen.getByTestId("radio-needle")).toHaveStyle({ left: "100%" });
  });
});

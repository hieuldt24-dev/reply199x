// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChannelsSection } from "./ChannelsSection";
import { radioChannels, radioHeader } from "../_data/channels";

// Unicode-aware whole-word match for the banned word (JS \b is ASCII-only and would never match it).
const BANNED_WORD = new RegExp("(?<![\\p{L}\\p{N}])v\\u00e9(?![\\p{L}\\p{N}])", "iu");

const DESCRIPTIONS = [
  "Ký ức tái hiện qua video ngắn, nội dung tương tác và những câu chuyện gần gũi với thế hệ 8X, 9X.",
  "Cập nhật mới nhất về dự án, các hoạt động nổi bật và những dấu ấn trên hành trình REPLY 199X.",
  "Hình ảnh và những khoảnh khắc đáng nhớ trên hành trình REPLY 199X, cập nhật qua từng sự kiện.",
  "Nhóm cộng đồng REPLY 199X trên Zalo: trò chuyện cùng những người chung ký ức và nhận thông tin sự kiện.",
];

describe("ChannelsSection", () => {
  it("positive control: the banned-word pattern is not vacuous", () => {
    expect(BANNED_WORD.test(`mua v${String.fromCharCode(0xe9)} ngay`)).toBe(true);
    expect(BANNED_WORD.test(`v${String.fromCharCode(0x1ebb)}`)).toBe(false);
    expect(BANNED_WORD.test(`ngh${String.fromCharCode(0x1ec1)}`)).toBe(false);
  });

  it("should render section anchor and verbatim copy without the word ve", () => {
    const { container } = render(<ChannelsSection />);
    const section = container.querySelector("section");
    expect(section).not.toBeNull();
    expect(section).toHaveAttribute("id", "kenh-truyen-thong");
    expect(section!.className).toBe("radio-section");

    const heading = section!.querySelector("h2");
    expect(heading).toHaveTextContent("Theo dòng ký ức, kết nối mọi khoảnh khắc");
    expect(section).toHaveTextContent(
      "Dòng chảy hoài niệm của REPLY 199X không chỉ ở những trải nghiệm trực tiếp mà còn lan tỏa trên TikTok, Facebook, Instagram và cộng đồng Zalo, nơi dự án chia sẻ câu chuyện, hình ảnh và những nội dung gợi nhắc một thời thanh xuân.",
    );
    expect(section).toHaveTextContent("BẮT SÓNG KÝ ỨC");
    expect(section).toHaveTextContent(DESCRIPTIONS[0]!);

    expect(radioChannels.map((channel) => channel.description)).toEqual(DESCRIPTIONS);
    expect(radioChannels.map((channel) => channel.frequency)).toEqual([
      "FM 199.1",
      "FM 199.2",
      "FM 199.3",
      "FM 199.4",
    ]);

    for (const svg of section!.querySelectorAll("svg")) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    }
    expect(section!.querySelector("img")).toBeNull();

    const allText = [
      section!.textContent ?? "",
      radioHeader.eyebrow,
      radioHeader.title,
      radioHeader.intro,
      ...radioChannels.flatMap((channel) => [channel.name, channel.handle, channel.description, channel.cta]),
    ].join("\n");
    expect(BANNED_WORD.test(allText)).toBe(false);
  });
});

// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Footer } from "./Footer";

const FACEBOOK_URL = "https://www.facebook.com/loihoidap199x";

const mockLinks = vi.hoisted(() => ({ facebook: "https://www.facebook.com/loihoidap199x" as string | null }));

vi.mock("@/app/(routes)/_data/brief", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/(routes)/_data/brief")>();
  return {
    ...actual,
    projectLinks: {
      ...actual.projectLinks,
      get facebook() {
        return mockLinks.facebook;
      },
    },
  };
});

// Unicode-aware whole-word match for the banned word (JS \b is ASCII-only and would never match it).
const BANNED_WORD = new RegExp("(?<![\\p{L}\\p{N}])v\\u00e9(?![\\p{L}\\p{N}])", "iu");

afterEach(() => {
  mockLinks.facebook = FACEBOOK_URL;
});

function footerHrefs() {
  return screen.getAllByRole("link").map((link) => link.getAttribute("href"));
}

describe("Footer", () => {
  it("should render five footer links with correct href, rel and target", () => {
    render(<Footer />);
    expect(footerHrefs()).toEqual([
      "https://www.tiktok.com/@loihoidap199x",
      FACEBOOK_URL,
      "https://www.instagram.com/loihoidap199x/",
      "https://zalo.me/g/fhjd7fuvlccje1jwxyvu",
      "https://forms.gle/tW1VU8vpASc53CJa8",
    ]);
    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
      expect(link.getAttribute("rel")).toContain("noreferrer");
    }
    expect(screen.getByRole("link", { name: "Facebook" })).toHaveAttribute("href", FACEBOOK_URL);
    expect(screen.getByRole("link", { name: "Instagram" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zalo" })).toBeInTheDocument();
  });

  it("should omit the Facebook footer link when projectLinks.facebook is null", () => {
    mockLinks.facebook = null;
    render(<Footer />);
    expect(screen.getAllByRole("link")).toHaveLength(4);
    expect(screen.queryByRole("link", { name: "Facebook" })).toBeNull();
    expect(footerHrefs()).not.toContain("");
    expect(footerHrefs()).not.toContain(null);
  });

  it("should not contain the word ve in footer text", () => {
    expect(BANNED_WORD.test(`mua v${String.fromCharCode(0xe9)} ngay`)).toBe(true);
    expect(BANNED_WORD.test(`v${String.fromCharCode(0x1ebb)}`)).toBe(false);
    expect(BANNED_WORD.test(`ngh${String.fromCharCode(0x1ec1)}`)).toBe(false);

    const { container } = render(<Footer />);
    expect(BANNED_WORD.test(container.textContent ?? "")).toBe(false);
  });
});

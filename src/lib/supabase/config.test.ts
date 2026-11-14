import { describe, expect, it, vi } from "vitest";
import { getSiteOrigin, getSupabaseConfig } from "./config";

describe("Supabase configuration", () => {
  it("requires both public values", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(getSupabaseConfig).toThrow();
  });
  it.each(["http://example.com", "https://u:p@example.com", "https://example.com/path", "https://example.com?key=value"])("rejects malformed project URL %s", (url) => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    expect(getSupabaseConfig).toThrow();
  });
  it.each(["https://user:pass@example.com", "http://example.com", "https://example.com/path"])("rejects unsafe site URL %s", (url) => {
    vi.stubEnv("SITE_URL", url);
    expect(getSiteOrigin).toThrow();
  });
});

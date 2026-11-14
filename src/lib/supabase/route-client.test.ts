import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "./route-client";
import { proxy } from "@/proxy";
import type { CookieOptions } from "@supabase/ssr";

type CookieAdapter = {
  getAll: () => { name: string; value: string }[];
  setAll: (values: { name: string; value: string; options: CookieOptions }[], headers: Record<string, string>) => void;
};
const { createServerClient, getClaims } = vi.hoisted(() => ({ createServerClient: vi.fn(), getClaims: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient }));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  createServerClient.mockReset().mockReturnValue({ auth: { getClaims } });
  getClaims.mockReset().mockResolvedValue({ data: null, error: null });
});

describe("SSR cookie lifecycle", () => {
  it("reads the PKCE verifier and persists exchanged session cookies without caching", () => {
    const request = new NextRequest("http://localhost:3000/auth/callback", { headers: { cookie: "verifier=pkce" } });
    const response = NextResponse.redirect("http://localhost:3000/", 303);
    createRouteClient(request, response);
    const adapter = createServerClient.mock.calls[0][2].cookies as CookieAdapter;
    expect(adapter.getAll()).toContainEqual({ name: "verifier", value: "pkce" });
    adapter.setAll([{ name: "session", value: "signed-token", options: { sameSite: "lax", path: "/" } }], { "Cache-Control": "private, no-store" });
    expect(response.cookies.get("session")?.value).toBe("signed-token");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("refreshes the verified session in both request and response cookies", async () => {
    const request = new NextRequest("http://localhost:3000/auth/sign-in");
    getClaims.mockImplementation(async () => {
      const adapter = createServerClient.mock.calls[0][2].cookies as CookieAdapter;
      adapter.setAll([{ name: "session", value: "refreshed", options: { path: "/" } }], { "Cache-Control": "private, no-store" });
      return { data: { claims: { sub: "user-id" } }, error: null };
    });
    const response = await proxy(request);
    expect(getClaims).toHaveBeenCalledOnce();
    expect(request.cookies.get("session")?.value).toBe("refreshed");
    expect(response.cookies.get("session")?.value).toBe("refreshed");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("requires secure cookies in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    createRouteClient(new NextRequest("https://example.com/auth/callback"), NextResponse.next());
    expect(createServerClient.mock.calls[0][2].cookieOptions).toMatchObject({ secure: true, sameSite: "lax", path: "/" });
  });
});

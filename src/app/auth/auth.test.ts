import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as signIn } from "../api/auth/google/route";
import { GET as callback } from "../api/auth/callback/route";
import { POST as signOut } from "../api/auth/logout/route";

const { exchangeCodeForSession, signInWithOAuth, logout } = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(), signInWithOAuth: vi.fn(), logout: vi.fn(),
}));
vi.mock("@/lib/supabase/route-client", () => ({
  createRouteClient: () => ({ auth: { exchangeCodeForSession, signInWithOAuth, signOut: logout } }),
}));

beforeEach(() => {
  vi.stubEnv("SITE_URL", "http://localhost:3000");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ external: { google: true } })));
  exchangeCodeForSession.mockReset().mockResolvedValue({ error: null });
  signInWithOAuth.mockReset().mockResolvedValue({ data: { url: "https://project.supabase.co/auth/v1/authorize?provider=google" }, error: null });
  logout.mockReset().mockResolvedValue({ error: null });
});

function post(path: string, origin?: string) {
  return new NextRequest(`http://localhost:3000${path}`, { method: "POST", headers: origin ? { origin } : {} });
}

describe("Google OAuth/PKCE foundation", () => {
  it("starts Google PKCE with only the configured callback origin", async () => {
    const response = await signIn(post("/api/auth/google", "http://localhost:3000"));
    expect(response.status).toBe(303);
    expect(signInWithOAuth).toHaveBeenCalledWith({ provider: "google", options: { redirectTo: "http://localhost:3000/api/auth/callback", skipBrowserRedirect: true } });
    expect(response.headers.get("location")).toContain("supabase.co/auth/v1/authorize");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it.each([undefined, "https://attacker.test", "null"])("rejects sign-in and sign-out from origin %s", async (origin) => {
    expect((await signIn(post("/api/auth/google", origin))).status).toBe(403);
    expect((await signOut(post("/api/auth/logout", origin))).status).toBe(403);
    expect(signInWithOAuth).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
  });
  it("never accepts a next parameter as an external redirect", async () => {
    const response = await callback(new NextRequest("http://localhost:3000/api/auth/callback?code=valid-code&next=https://attacker.test"));
    expect(exchangeCodeForSession).toHaveBeenCalledWith("valid-code");
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });
  it.each(["", "?error=access_denied&code=abc", "?next=//attacker.test"])("does not exchange missing or provider-rejected codes %s", async (query) => {
    const response = await callback(new NextRequest(`http://localhost:3000/api/auth/callback${query}`));
    expect(response.headers.get("location")).toBe("http://localhost:3000/?auth_auth_error=callback");
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });
  it("rejects a callback on a mismatched host", async () => {
    await callback(new NextRequest("https://attacker.test/api/auth/callback?code=abc"));
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });
  it.each(["PKCE verifier missing", "expired code", "replayed code"])("fails closed when exchange rejects %s", async (message) => {
    exchangeCodeForSession.mockResolvedValue({ error: { message } });
    const response = await callback(new NextRequest("http://localhost:3000/api/auth/callback?code=abc"));
    expect(response.headers.get("location")).toContain("auth_error=callback");
    expect(await response.text()).not.toContain(message);
  });
  it("handles disabled Google without exposing provider details", async () => {
    signInWithOAuth.mockResolvedValue({ data: { url: null }, error: { message: "secret diagnostic" } });
    const response = await signIn(post("/api/auth/google", "http://localhost:3000"));
    expect(response.headers.get("location")).toContain("auth_error=unavailable");
    expect(await response.text()).not.toContain("secret diagnostic");
  });
  it("stays on the local error page when Google is disabled in remote settings", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ external: { google: false } })));
    const response = await signIn(post("/api/auth/google", "http://localhost:3000"));
    expect(response.headers.get("location")).toBe("http://localhost:3000/?auth_auth_error=unavailable");
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });
  it("signs out the current browser session", async () => {
    const response = await signOut(post("/api/auth/logout", "http://localhost:3000"));
    expect(logout).toHaveBeenCalledWith({ scope: "local" });
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });
  it("shows an explicit sign-out error on network failure", async () => {
    logout.mockRejectedValue(new Error("network"));
    expect((await signOut(post("/api/auth/logout", "http://localhost:3000"))).headers.get("location")).toContain("auth_error=signout");
  });
});

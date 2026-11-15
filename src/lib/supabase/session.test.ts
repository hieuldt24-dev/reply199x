import { AuthApiError, AuthRetryableFetchError, AuthSessionMissingError } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthView } from "./session";

const auth = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("./server", () => ({ createClient: async () => ({ auth }) }));

beforeEach(() => { auth.getUser.mockReset(); });

describe("getAuthView", () => {
  it.each([
    new AuthSessionMissingError(),
    new AuthApiError("Expired", 401, "session_expired"),
    new AuthApiError("Invalid JWT", 401, "bad_jwt"),
    new AuthApiError("Refresh gone", 400, "refresh_token_not_found"),
  ])("identifies a genuinely missing or invalid session: %s", async (error) => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error });
    expect(await getAuthView()).toEqual({ status: "anonymous" });
  });

  it.each([
    new AuthApiError("Unavailable", 503, "unexpected_failure"),
    new AuthApiError("Too many requests", 429, "over_request_rate_limit"),
    new AuthApiError("Upstream error takes precedence", 503, "bad_jwt"),
    new AuthApiError("Unexpected unauthorized response", 401, "unexpected_failure"),
    new AuthRetryableFetchError("Network unavailable", 0),
    new Error("Unknown auth error"),
  ])("keeps returned auth failures recoverable: %s", async (error) => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error });
    expect(await getAuthView()).toEqual({ status: "unavailable" });
  });

  it("keeps unexpected thrown failures recoverable", async () => {
    auth.getUser.mockRejectedValue(new Error("offline"));
    expect(await getAuthView()).toEqual({ status: "unavailable" });
  });

  it("recognizes a missing session even when the SDK throws it", async () => {
    auth.getUser.mockRejectedValue(new AuthSessionMissingError());
    expect(await getAuthView()).toEqual({ status: "anonymous" });
  });

  it("recognizes no user without error", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await getAuthView()).toEqual({ status: "anonymous" });
  });

  it("preserves the authenticated display name", async () => {
    auth.getUser.mockResolvedValue({ data: { user: { user_metadata: { full_name: "  Khách  " } } }, error: null });
    expect(await getAuthView()).toEqual({ status: "authenticated", displayName: "Khách" });
  });
});

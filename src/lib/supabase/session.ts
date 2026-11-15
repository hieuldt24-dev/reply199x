import { isAuthError, isAuthSessionMissingError } from "@supabase/supabase-js";
import { createClient } from "./server";

export type AuthView =
  | { status: "authenticated"; displayName: string }
  | { status: "anonymous" }
  | { status: "unavailable" };

const INVALID_SESSION_CODES = new Set([
  "bad_jwt", "session_not_found", "session_expired", "refresh_token_not_found",
  "refresh_token_already_used", "user_not_found",
]);

function isMissingSession(error: unknown): boolean {
  return isAuthSessionMissingError(error)
    || (isAuthError(error) && error.status !== undefined && error.status >= 400 && error.status < 500
      && error.code !== undefined && INVALID_SESSION_CODES.has(error.code));
}

export async function getAuthView(): Promise<AuthView> {
  try {
    const { data, error } = await (await createClient()).auth.getUser();
    if (error) {
      return { status: isMissingSession(error) ? "anonymous" : "unavailable" };
    }
    if (!data.user) return { status: "anonymous" };
    const metadataName = data.user.user_metadata?.full_name;
    const displayName = typeof metadataName === "string" && metadataName.trim()
      ? metadataName.trim().slice(0, 40)
      : "Bạn";
    return { status: "authenticated", displayName };
  } catch (error) {
    return { status: isMissingSession(error) ? "anonymous" : "unavailable" };
  }
}

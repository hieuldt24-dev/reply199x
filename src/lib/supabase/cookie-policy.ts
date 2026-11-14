import { clearAuthCookiesAtScopes } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

export function authCookieStorageKey(projectUrl: string) {
  return `sb-${new URL(projectUrl).hostname.split(".")[0]}-auth-token`;
}

export function enforceHttpOnlyCookieOptions<T extends { name: string; value: string; options?: CookieOptions }>(
  cookies: T[],
  storageKey: string,
  verifierKey: string,
): T[] {
  return cookies.map((cookie) => {
    const authCookie = [storageKey, verifierKey].some((key) => cookie.name === key || cookie.name.startsWith(`${key}.`));
    return authCookie ? { ...cookie, options: { ...cookie.options, ...AUTH_COOKIE_OPTIONS } } : cookie;
  });
}

export async function clearAuthSessionCookies(input: {
  getAll: (keyHints: string[]) => Array<{ name: string; value: string }>;
  setAll: (values: Array<{ name: string; value: string; options: CookieOptions }>, headers: Record<string, string>) => void;
  projectUrl: string;
}) {
  const storageKey = authCookieStorageKey(input.projectUrl);
  const verifierKey = `${storageKey}-code-verifier`;
  const setAll = (values: Array<{ name: string; value: string; options: CookieOptions }>, headers: Record<string, string>) => {
    input.setAll(enforceHttpOnlyCookieOptions(values, storageKey, verifierKey), headers);
  };
  await Promise.all([storageKey, verifierKey].map((key) => clearAuthCookiesAtScopes({
    getAll: input.getAll,
    setAll,
    storageKey: key,
    scopes: [AUTH_COOKIE_OPTIONS],
  })));
}

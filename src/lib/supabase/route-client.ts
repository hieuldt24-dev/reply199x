import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "./config";
import { AUTH_COOKIE_OPTIONS, authCookieStorageKey, enforceHttpOnlyCookieOptions } from "./cookie-policy";

export function createRouteClient(request: NextRequest, response: NextResponse) {
  const { url, key } = getSupabaseConfig();
  const storageKey = authCookieStorageKey(url);
  const verifierKey = `${storageKey}-code-verifier`;
  response.headers.set("Cache-Control", "private, no-store");
  return createServerClient(url, key, {
    cookieOptions: { ...AUTH_COOKIE_OPTIONS },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values, headers) => {
        enforceHttpOnlyCookieOptions(values, storageKey, verifierKey).forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });
}

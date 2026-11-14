import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { AUTH_COOKIE_OPTIONS, authCookieStorageKey, enforceHttpOnlyCookieOptions } from "@/lib/supabase/cookie-policy";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return response;
  let url: string;
  let key: string;
  try {
    ({ url, key } = getSupabaseConfig());
  } catch {
    return response;
  }
  const storageKey = authCookieStorageKey(url);
  const verifierKey = `${storageKey}-code-verifier`;
  const existingCookies = request.cookies.getAll();
  const deletedNames = new Set<string>();
  const pendingValues = new Map<string, { name: string; value: string; options?: Record<string, unknown> }>();
  const supabase = createServerClient(url, key, {
    cookieOptions: { ...AUTH_COOKIE_OPTIONS },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values, headers) => {
        for (const { name, value, options } of values) {
          if (options?.maxAge === 0) deletedNames.add(name);
          else pendingValues.set(name, { name, value, options });
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        response.headers.set("Cache-Control", "private, no-store");
        for (const cookie of pendingValues.values()) {
          response.cookies.set(cookie.name, cookie.value, enforceHttpOnlyCookieOptions([cookie], storageKey, verifierKey)[0].options);
        }
        for (const name of deletedNames) response.cookies.set(name, "", { ...AUTH_COOKIE_OPTIONS, maxAge: 0 });
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });
  // Upgrade existing canonical session/verifier cookies, including chunked
  // values, even when Supabase did not emit a refresh event on this request.
  for (const cookie of existingCookies) {
    const isAuthCookie = [storageKey, verifierKey].some((name) => cookie.name === name || cookie.name.startsWith(`${name}.`));
    if (isAuthCookie && !deletedNames.has(cookie.name) && !pendingValues.has(cookie.name)) {
      pendingValues.set(cookie.name, { name: cookie.name, value: cookie.value });
    }
  }
  for (const cookie of pendingValues.values()) {
    request.cookies.set(cookie.name, cookie.value);
    response.cookies.set(cookie.name, cookie.value, enforceHttpOnlyCookieOptions([cookie], storageKey, verifierKey)[0].options);
  }
  // An auth outage must not take down the public page. The layout will render
  // an unavailable state until it can verify the user.
  try {
    await supabase.auth.getClaims();
  } catch {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

export const config = { matcher: ["/", "/auth/:path*"] };

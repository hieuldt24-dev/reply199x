import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";
import { AUTH_COOKIE_OPTIONS, authCookieStorageKey, enforceHttpOnlyCookieOptions } from "./cookie-policy";

export async function getAuthView() {
  try {
    const { data, error } = await (await createClient()).auth.getUser();
    if (error) return { status: "anonymous" as const };
    return data.user ? { status: "authenticated" as const, displayName: data.user.user_metadata?.full_name ?? data.user.email ?? "" } : { status: "anonymous" as const };
  } catch {
    return { status: "unavailable" as const };
  }
}

export async function createClient() {
  const store = await cookies();
  const { url, key } = getSupabaseConfig();
  const storageKey = authCookieStorageKey(url);
  const verifierKey = `${storageKey}-code-verifier`;
  return createServerClient(url, key, {
    cookieOptions: { ...AUTH_COOKIE_OPTIONS },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => {
        // Server Components cannot write cookies; the proxy refreshes them first.
        try { enforceHttpOnlyCookieOptions(values, storageKey, verifierKey).forEach(({ name, value, options }) => store.set(name, value, options)); }
        catch { /* Read-only render; route handlers and proxy persist session changes. */ }
      },
    },
  });
}

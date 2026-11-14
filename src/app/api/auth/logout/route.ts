import { NextRequest, NextResponse } from "next/server";
import { getSiteOrigin, getSupabaseConfig } from "@/lib/supabase/config";
import { createRouteClient } from "@/lib/supabase/route-client";
import { clearAuthSessionCookies } from "@/lib/supabase/cookie-policy";

export async function POST(request: NextRequest) {
  const origin = getSiteOrigin();
  if (request.headers.get("origin") !== origin) return new NextResponse(null, { status: 403 });
  const response = NextResponse.redirect(new URL("/?auth_error=signout", origin), 303);
  response.headers.set("Cache-Control", "private, no-store");
  let revokeConfirmed = false;
  try {
    const { error } = await createRouteClient(request, response).auth.signOut({ scope: "local" });
    revokeConfirmed = !error;
  } catch { /* Local cookies must still be removed if remote revocation is unavailable. */ }
  try {
    const { url } = getSupabaseConfig();
    await clearAuthSessionCookies({
      projectUrl: url,
      getAll: (hints) => request.cookies.getAll().filter(({ name }) => hints.some((hint) => name === hint || name.startsWith(`${hint}.`))),
      setAll: (values, headers) => {
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    });
  } catch {
    revokeConfirmed = false;
  }
  if (revokeConfirmed) response.headers.set("Location", new URL("/", origin).href);
  else response.headers.set("Location", new URL("/?auth_error=signout", origin).href);
  return response;
}

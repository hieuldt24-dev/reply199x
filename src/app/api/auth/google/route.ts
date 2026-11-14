import { NextRequest, NextResponse } from "next/server";
import { getSiteOrigin, getSupabaseConfig } from "@/lib/supabase/config";
import { createRouteClient } from "@/lib/supabase/route-client";

export async function POST(request: NextRequest) {
  const origin = getSiteOrigin();
  if (request.headers.get("origin") !== origin) {
    return new NextResponse(null, { status: 403 });
  }
  const response = NextResponse.redirect(new URL("/?auth_error=unavailable", origin), 303);
  response.headers.set("Cache-Control", "private, no-store");
  try {
    const { url, key } = getSupabaseConfig();
    const settingsResponse = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key }, cache: "no-store", signal: AbortSignal.timeout(5000),
    });
    if (!settingsResponse.ok) return response;
    const settings: unknown = await settingsResponse.json();
    if (!settings || typeof settings !== "object" || !("external" in settings) ||
      !settings.external || typeof settings.external !== "object" ||
      !("google" in settings.external) || settings.external.google !== true) return response;
    const supabase = createRouteClient(request, response);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/api/auth/callback`, skipBrowserRedirect: true },
    });
    if (!error && data.url) response.headers.set("Location", data.url);
  } catch { /* Return the fixed, non-sensitive failure destination. */ }
  return response;
}

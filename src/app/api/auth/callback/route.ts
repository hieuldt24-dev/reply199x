import { NextRequest, NextResponse } from "next/server";
import { AUTH_DESTINATION, getSiteOrigin } from "@/lib/supabase/config";
import { createRouteClient } from "@/lib/supabase/route-client";

export async function GET(request: NextRequest) {
  const origin = getSiteOrigin();
  const response = NextResponse.redirect(new URL("/?auth_error=callback", origin), 303);
  response.headers.set("Cache-Control", "private, no-store");
  const code = request.nextUrl.searchParams.get("code");
  if (request.nextUrl.origin !== origin || request.nextUrl.searchParams.has("error") || !code || code.length > 2048) return response;
  try {
    const { error } = await createRouteClient(request, response).auth.exchangeCodeForSession(code);
    if (!error) response.headers.set("Location", new URL(AUTH_DESTINATION, origin).href);
  } catch { /* Missing verifier, expired/replayed code or network failure stays signed out. */ }
  return response;
}

import { NextResponse } from "next/server";
import { getAuthView } from "@/lib/supabase/session";

export async function GET() {
  const auth = await getAuthView();
  const body = auth.status === "authenticated"
    ? { authenticated: true, user: { displayName: auth.displayName } }
    : { authenticated: false };

  return NextResponse.json(body, {
    status: auth.status === "unavailable" ? 503 : 200,
    headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" },
  });
}

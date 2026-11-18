import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { parseCredentials } from "@/lib/auth/username";
import { getSiteOrigin, getSupabaseConfig } from "@/lib/supabase/config";
import { createRouteClient } from "@/lib/supabase/route-client";

const NO_STORE = "private, no-store";
const NIL_UUID = "00000000-0000-0000-0000-000000000000";
// Reserved .invalid TLD: never deliverable, never a real account.
const DUMMY_EMAIL = "no-such-user@username-login.invalid";
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const INVALID_CREDENTIALS = { error: { code: "invalid_credentials", message: "Tên đăng nhập hoặc mật khẩu không đúng." } };
const UNAVAILABLE = { error: { code: "temporarily_unavailable", message: "Chưa thể đăng nhập. Vui lòng thử lại sau." } };

type AuthErrorLike = { status?: number; code?: string } | null | undefined;

function json(body: unknown, status: number) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", NO_STORE);
  return response;
}

// Only a fixed reason code is ever logged: never the username, password, email or user id.
function unavailable(reason: string) {
  console.warn("password login unavailable", { reason });
  return json(UNAVAILABLE, 503);
}

const invalidCredentials = () => json(INVALID_CREDENTIALS, 401);

function isUserNotFound(error: AuthErrorLike) {
  return error?.status === 404 || error?.code === "user_not_found";
}

function isCredentialRejection(error: AuthErrorLike) {
  if (!error || error.code === "over_request_rate_limit" || error.status === 429) return false;
  if (error.code === "invalid_credentials" || error.code === "email_not_confirmed") return true;
  return error.status === 400 || error.status === 401;
}

export async function POST(request: NextRequest) {
  let origin: string;
  try {
    origin = getSiteOrigin();
  } catch {
    return unavailable("site_origin");
  }
  if (request.headers.get("origin") !== origin) {
    return new NextResponse(null, { status: 403, headers: { "Cache-Control": NO_STORE } });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: { code: "invalid_request" } }, 400);
  }
  const credentials = parseCredentials(body);
  if (!credentials) return json({ error: { code: "invalid_request" } }, 400);

  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey?.startsWith("sb_secret_")) return unavailable("secret_key");

  try {
    const { url, key } = getSupabaseConfig();
    const admin = createClient(url, secretKey, CLIENT_OPTIONS);
    const { data: row, error: lookupError } = await admin
      .from("usernames")
      .select("user_id")
      .eq("username", credentials.username)
      .maybeSingle();
    if (lookupError) return unavailable("lookup");

    let email: string | null = null;
    let userLookupDone = false;
    const userId = (row as { user_id?: unknown } | null)?.user_id;
    if (typeof userId === "string") {
      userLookupDone = true;
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error) {
        if (!isUserNotFound(error)) return unavailable("get_user");
      } else {
        email = data.user?.email || null;
      }
    }

    if (!email) {
      // Unmapped path mirrors the mapped one: exactly one getUserById and one sign-in
      // attempt, so an unknown username is not cheaper than a wrong password.
      if (!userLookupDone) {
        try { await admin.auth.admin.getUserById(NIL_UUID); } catch { /* result discarded */ }
      }
      try {
        // Plain cookie-less client: it can never write a session cookie.
        await createClient(url, key, CLIENT_OPTIONS).auth.signInWithPassword({ email: DUMMY_EMAIL, password: credentials.password });
      } catch { /* result discarded */ }
      return invalidCredentials();
    }

    const response = json({ ok: true }, 200);
    const { error: signInError } = await createRouteClient(request, response).auth.signInWithPassword({ email, password: credentials.password });
    if (signInError) {
      // Discard `response` (it may carry cookies) and return a fresh one.
      return isCredentialRejection(signInError) ? invalidCredentials() : unavailable("sign_in");
    }
    return response;
  } catch {
    return unavailable("unexpected");
  }
}

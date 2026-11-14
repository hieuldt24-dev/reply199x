import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient as createSessionClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  if (!uuidPattern.test(orderId)) return json({ error: { code: "not_found", message: "Order was not found." } }, 404);

  const { data: authData, error: authError } = await (await createSessionClient()).auth.getUser();
  if (authError || !authData.user) return json({ error: { code: "unauthorized", message: "Sign in to view this order." } }, 401);

  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey?.startsWith("sb_secret_")) {
    return json({ error: { code: "temporarily_unavailable", message: "Order status is not configured." } }, 503);
  }

  try {
    const { url } = getSupabaseConfig();
    const admin = createSupabaseClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await admin
      .from("orders")
      .select("id,status,total_vnd,payment_expires_at")
      .eq("id", orderId)
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (error) return json({ error: { code: "temporarily_unavailable", message: "Order status is unavailable." } }, 503);
    if (!data) return json({ error: { code: "not_found", message: "Order was not found." } }, 404);

    let status = data.status;
    if (status === "pending_payment" && Date.parse(data.payment_expires_at) <= Date.now()) {
      const { data: expiryData, error: expiryError } = await admin.rpc("expire_ticket_checkout", {
        p_order_id: orderId,
        p_user_id: authData.user.id,
      });
      if (expiryError) return json({ error: { code: "temporarily_unavailable", message: "Order status is unavailable." } }, 503);
      const expiry = Array.isArray(expiryData) ? expiryData[0] : null;
      if (expiry && typeof expiry.order_status === "string") status = expiry.order_status;
    }

    return json({
      order: {
        id: data.id,
        status,
        totalVnd: data.total_vnd,
        paymentExpiresAt: data.payment_expires_at,
      },
    }, 200);
  } catch {
    return json({ error: { code: "temporarily_unavailable", message: "Order status is unavailable." } }, 503);
  }
}

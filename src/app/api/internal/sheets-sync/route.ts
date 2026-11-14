import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createOutboxAdminClient, drainPaidTicketSheetOutbox } from "@/lib/ticket-registration/outbox-worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

function authorized(request: Request): boolean {
  const secret = process.env.SHEETS_SYNC_WORKER_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || secret.length < 32 || !authorization?.startsWith("Bearer ")) return false;
  const received = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(secret);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  const admin = createOutboxAdminClient();
  if (!admin) return NextResponse.json({ error: "temporarily_unavailable" }, { status: 503, headers });
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? "10");
  const limit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(10, requestedLimit)) : 10;
  try {
    const result = await drainPaidTicketSheetOutbox(admin, limit);
    return NextResponse.json(result, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "temporarily_unavailable" }, { status: 503, headers });
  }
}

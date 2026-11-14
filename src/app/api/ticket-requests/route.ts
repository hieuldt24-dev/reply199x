import { randomUUID } from "node:crypto";
import { appendTicketRequestRow } from "@/lib/ticket-registration/sheets";
import {
  mapTicketRequestToRow,
  validateTicketRequest,
  type TicketRegistrationRow,
} from "@/lib/ticket-registration/validation";

export const runtime = "nodejs";

const maxBodyBytes = 8 * 1024;
const genericFailure = {
  status: "error",
  code: "temporarily_unavailable",
  message: "We couldn't confirm your request. It may have been recorded; contact the organizers before trying again.",
} as const;

type Diagnostic = Readonly<{
  category: "append_failed";
  correlationId: string;
}>;

type HandlerDependencies = Readonly<{
  siteUrl: string | undefined;
  appendRow: (row: TicketRegistrationRow) => Promise<number>;
  log?: (diagnostic: Diagnostic) => void;
}>;

function jsonResponse(
  body: Readonly<Record<string, string>>,
  status: number,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isHttpOrigin(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:")
      || url.username
      || url.password
      || url.origin === "null"
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function hasExpectedOrigin(origin: string | null, siteUrl: string | undefined): boolean {
  const requestOrigin = isHttpOrigin(origin);
  const configuredOrigin = isHttpOrigin(siteUrl);
  return requestOrigin !== null && configuredOrigin !== null && requestOrigin === configuredOrigin;
}

async function readBodyWithinLimit(request: Request): Promise<
  | Readonly<{ ok: true; text: string }>
  | Readonly<{ ok: false; tooLarge: boolean }>
> {
  const reader = request.body?.getReader();
  if (!reader) return { ok: true, text: "" };

  let size = 0;
  let text = "";
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBodyBytes) {
        await reader.cancel();
        return { ok: false, tooLarge: true };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { ok: true, text };
  } catch {
    return { ok: false, tooLarge: false };
  } finally {
    reader.releaseLock();
  }
}

export function createTicketRequestHandler(dependencies: HandlerDependencies) {
  return async function handleTicketRequest(request: Request): Promise<Response> {
    const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    if (contentType !== "application/json") {
      return jsonResponse({
        status: "error",
        code: "unsupported_media_type",
        message: "Send a JSON request.",
      }, 415);
    }

    if (!hasExpectedOrigin(request.headers.get("origin"), dependencies.siteUrl)) {
      return jsonResponse({
        status: "error",
        code: "origin_rejected",
        message: "This request could not be accepted.",
      }, 403);
    }

    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
      return jsonResponse({
        status: "error",
        code: "payload_too_large",
        message: "The request is too large.",
      }, 413);
    }

    const body = await readBodyWithinLimit(request);
    if (!body.ok) {
      if (body.tooLarge) {
        return jsonResponse({
          status: "error",
          code: "payload_too_large",
          message: "The request is too large.",
        }, 413);
      }
      return jsonResponse({
        status: "error",
        code: "invalid_request",
        message: "Check the request details and try again.",
      }, 400);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(body.text);
    } catch {
      return jsonResponse({
        status: "error",
        code: "invalid_request",
        message: "Check the request details and try again.",
      }, 400);
    }

    const validation = validateTicketRequest(payload);
    if (!validation.valid) {
      return jsonResponse({
        status: "error",
        code: "invalid_request",
        message: "Check the request details and try again.",
      }, 400);
    }

    const row = mapTicketRequestToRow(validation.value);
    try {
      if (await dependencies.appendRow(row) !== 1) {
        throw new Error("Append confirmation was not exactly one row");
      }
      return jsonResponse({ status: "recorded" }, 201);
    } catch {
      const diagnostic = {
        category: "append_failed",
        correlationId: randomUUID(),
      } as const;
      (dependencies.log ?? ((event) => console.error("Ticket request append failed", event)))(diagnostic);
      return jsonResponse(genericFailure, 503);
    }
  };
}

export const POST = createTicketRequestHandler({
  siteUrl: process.env.SITE_URL,
  appendRow: appendTicketRequestRow,
});

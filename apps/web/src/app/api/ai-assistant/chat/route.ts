import { NextRequest, NextResponse } from "next/server";
import type {
  ChatRequest,
  WebhookPayload,
  UpstreamWebhookResponse,
  ChatResponse,
  ChatErrorResponse,
  ChatErrorCode,
} from "@/lib/ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Constants ───────────────────────────────────────────────
const MAX_MESSAGE_LENGTH = 4000;
const UPSTREAM_TIMEOUT_MS = 28_000;

// ─── Helpers ─────────────────────────────────────────────────
function errorJson(
  error: string,
  code: ChatErrorCode,
  status: number
): NextResponse<ChatErrorResponse> {
  return NextResponse.json({ error, code }, { status });
}

/**
 * Extract the reply text from a tolerant upstream response.
 * Checks: reply → message → text → output → response
 * Falls back to treating the entire body as plain text.
 */
function extractReply(body: unknown): string | null {
  if (typeof body === "string") {
    return body.trim() || null;
  }
  if (body && typeof body === "object") {
    const obj = body as UpstreamWebhookResponse;
    const candidate =
      obj.reply ?? obj.message ?? obj.text ?? obj.output ?? obj.response;
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
}

// ─── POST Handler ────────────────────────────────────────────
export async function POST(
  request: NextRequest
): Promise<NextResponse<ChatResponse | ChatErrorResponse>> {
  // 1. Check webhook URL is configured
  const webhookUrl = process.env.AI_WEBHOOK_URL;
  if (!webhookUrl) {
    return errorJson(
      "AI webhook is not configured. Set AI_WEBHOOK_URL in your environment.",
      "WEBHOOK_NOT_CONFIGURED",
      503
    );
  }

  // 2. Parse & validate JSON body
  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return errorJson("Invalid JSON body.", "INVALID_REQUEST", 400);
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const sessionId =
    typeof body.sessionId === "string" ? body.sessionId : "unknown";

  if (!message) {
    return errorJson("Message cannot be empty.", "MESSAGE_EMPTY", 400);
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return errorJson(
      `Message exceeds ${MAX_MESSAGE_LENGTH} characters.`,
      "MESSAGE_TOO_LONG",
      400
    );
  }

  // 3. Proxy to upstream webhook
  const payload: WebhookPayload = {
    message,
    sessionId,
    source: "ind-manager",
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!upstream.ok) {
      return errorJson(
        `Upstream webhook returned ${upstream.status}.`,
        "UPSTREAM_ERROR",
        502
      );
    }

    // Try to parse as JSON first, fall back to text
    let responseBody: unknown;
    const contentType = upstream.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      responseBody = await upstream.json();
    } else {
      responseBody = await upstream.text();
    }

    const reply = extractReply(responseBody);
    if (!reply) {
      return errorJson(
        "Upstream webhook returned an empty or unrecognized response.",
        "UPSTREAM_INVALID_RESPONSE",
        502
      );
    }

    return NextResponse.json({ reply } satisfies ChatResponse);
  } catch (err: unknown) {
    clearTimeout(timeout);

    if (err instanceof DOMException && err.name === "AbortError") {
      return errorJson(
        "Upstream webhook timed out after 28 seconds.",
        "UPSTREAM_TIMEOUT",
        504
      );
    }

    const errMessage =
      err instanceof Error ? err.message : "Unknown internal error";
    return errorJson(
      `Failed to reach upstream webhook: ${errMessage}`,
      "INTERNAL_ERROR",
      500
    );
  }
}

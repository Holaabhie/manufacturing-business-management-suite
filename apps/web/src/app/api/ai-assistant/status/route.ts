import { NextResponse } from "next/server";
import type { WebhookStatus } from "@/lib/ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mask the webhook URL for safe display:
 * strips query string and hash, keeps scheme + host + path.
 */
function maskUrl(raw: string): string {
  try {
    const u = new URL(raw);
    // Return scheme + host + pathname only
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    // If URL is malformed, show a safe fallback
    return "(invalid URL)";
  }
}

// ─── GET Handler ─────────────────────────────────────────────
export async function GET(): Promise<NextResponse<WebhookStatus>> {
  const raw = process.env.AI_WEBHOOK_URL;
  const configured = typeof raw === "string" && raw.trim().length > 0;

  return NextResponse.json({
    configured,
    url: configured ? maskUrl(raw as string) : null,
  });
}

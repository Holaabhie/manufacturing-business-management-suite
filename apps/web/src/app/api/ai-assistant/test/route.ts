import { NextResponse } from "next/server";
import type { WebhookTestResult } from "@/lib/ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEST_TIMEOUT_MS = 10_000;

// ─── POST Handler ────────────────────────────────────────────
export async function POST(): Promise<NextResponse<WebhookTestResult>> {
  const webhookUrl = process.env.AI_WEBHOOK_URL;

  if (!webhookUrl) {
    return NextResponse.json({
      ok: false,
      status: 0,
      latencyMs: 0,
      error: "AI_WEBHOOK_URL is not configured.",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);
  const start = Date.now();

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "__test_ping__",
        sessionId: "test",
        source: "ind-manager",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const latencyMs = Date.now() - start;

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      latencyMs,
    });
  } catch (err: unknown) {
    clearTimeout(timeout);
    const latencyMs = Date.now() - start;

    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json({
        ok: false,
        status: 0,
        latencyMs,
        error: `Webhook timed out after ${TEST_TIMEOUT_MS / 1000}s.`,
      });
    }

    return NextResponse.json({
      ok: false,
      status: 0,
      latencyMs,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

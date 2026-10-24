import { NextResponse } from "next/server";
import { requireStaffOrAdmin } from "@/lib/require-role";
import type { WebhookStatus } from "@/lib/ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── GET Handler ─────────────────────────────────────────────
export async function GET(): Promise<NextResponse<WebhookStatus | { error: string }>> {
  const authResult = await requireStaffOrAdmin();
  if (authResult.error) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const raw = process.env.AI_WEBHOOK_URL;
  const configured = typeof raw === "string" && raw.trim().length > 0;

  return NextResponse.json({
    configured,
    url: null, // Never expose raw or masked webhook URL or server config
  });
}


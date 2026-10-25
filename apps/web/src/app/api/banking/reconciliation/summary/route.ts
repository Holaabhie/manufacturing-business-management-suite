import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { getBankingService } from "@/modules/banking";
import { AppError } from "@/shared/lib/errors";

const ALLOWED_ROLES = ["Owner", "Admin", "Accountant"];

export async function GET(request: NextRequest) {
  try {
    const result = await requireRole(ALLOWED_ROLES);
    if (result.error || !result.user) {
      return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
    }

    const tenantId = getDataOwnerId(result.user);
    const { searchParams } = new URL(request.url);

    const accountId = searchParams.get("account_id") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    const service = getBankingService();
    const summary = await service.getReconciliationSummary(
      tenantId,
      accountId,
      from,
      to
    );

    return NextResponse.json({ summary });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Error fetching reconciliation summary:", error);
    return NextResponse.json({ error: "Failed to fetch reconciliation summary" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { getBankingService } from "@/modules/banking";

const ALLOWED_ROLES = ["Owner", "Admin", "Accountant"];

export async function GET(request: NextRequest) {
  try {
    const result = await requireRole(ALLOWED_ROLES);
    if (result.error || !result.user) {
      return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
    }

    const tenantId = getDataOwnerId(result.user);
    const { searchParams } = new URL(request.url);

    const account = searchParams.get("account") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const direction = (searchParams.get("direction") as "all" | "credit" | "debit") || undefined;
    const match_status = (searchParams.get("match_status") as "Unmatched" | "Partial" | "Matched" | "Excluded" | "all") || undefined;
    const needsReviewRaw = searchParams.get("needs_review");
    const needs_review = needsReviewRaw === "true" ? true : needsReviewRaw === "false" ? false : undefined;
    const search = searchParams.get("search") || undefined;
    const import_id = searchParams.get("import_id") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const service = getBankingService();
    const data = await service.listTransactions(tenantId, {
      account,
      from,
      to,
      direction,
      match_status,
      needs_review,
      search,
      import_id,
      page,
      limit,
    });

    return NextResponse.json({
      transactions: data.transactions,
      summary: data.summary,
      total: data.total,
      page,
      limit,
      totalPages: Math.ceil(data.total / limit) || 1,
    });
  } catch (error: unknown) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}

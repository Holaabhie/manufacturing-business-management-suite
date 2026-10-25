import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { getBankingService, candidateFilterSchema } from "@/modules/banking";
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

    const direction = searchParams.get("direction") || "credit";
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const minStr = searchParams.get("min");
    const maxStr = searchParams.get("max");
    const min = minStr ? parseFloat(minStr) : undefined;
    const max = maxStr ? parseFloat(maxStr) : undefined;
    const q = searchParams.get("q") || undefined;

    const parsedFilter = candidateFilterSchema.parse({
      direction,
      from,
      to,
      min,
      max,
      q,
    });

    const service = getBankingService();
    const candidates = await service.searchCandidates(tenantId, parsedFilter);

    return NextResponse.json({ candidates });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Error searching candidate payments:", error);
    return NextResponse.json({ error: "Failed to search candidate payments" }, { status: 500 });
  }
}

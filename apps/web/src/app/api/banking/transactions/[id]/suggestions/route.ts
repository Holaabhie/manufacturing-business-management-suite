import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { getBankingService } from "@/modules/banking";
import { AppError } from "@/shared/lib/errors";

const ALLOWED_ROLES = ["Owner", "Admin", "Accountant"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireRole(ALLOWED_ROLES);
    if (result.error || !result.user) {
      return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
    }

    const { id } = await params;
    const tenantId = getDataOwnerId(result.user);
    const service = getBankingService();

    const tx = await service.getTransactionById(id, tenantId);
    if (!tx) {
      return NextResponse.json({ error: "Bank transaction not found" }, { status: 404 });
    }

    const suggestions = await service.getSuggestions(id, tenantId);
    return NextResponse.json({ suggestions });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: (error as Error).message }, { status: error.statusCode });
    }
    console.error("Error fetching suggestions:", error);
    return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
  }
}

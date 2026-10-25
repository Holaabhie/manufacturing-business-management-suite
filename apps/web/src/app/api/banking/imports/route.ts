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
    const bankAccountId = searchParams.get("account") || undefined;

    const service = getBankingService();
    const imports = await service.listImports(tenantId, bankAccountId);

    return NextResponse.json({ imports });
  } catch (error: unknown) {
    console.error("Error listing statement imports:", error);
    return NextResponse.json({ error: "Failed to list statement imports" }, { status: 500 });
  }
}

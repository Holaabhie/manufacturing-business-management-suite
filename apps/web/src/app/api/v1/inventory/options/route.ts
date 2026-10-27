import { NextResponse, type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { escapeRegex } from "@/shared/lib/pagination";

export interface InventoryOption {
  id: string;
  name: string;
  sku?: string;
  quantity?: number;
  unit?: string;
  purchase_cost_per_unit?: number;
  tax_rate?: number;
}

export const GET = withRateLimit(
  withApiRoute(
    withAuth(async (req: NextRequest, user: AuthenticatedUser) => {
      const searchParams = req.nextUrl.searchParams;
      const rawQ = (searchParams.get("q") || "").trim().slice(0, 100);
      const ownerId = getDataOwnerId(user);
      const db = await getDb();

      const filter: Record<string, unknown> = { userId: ownerId };
      if (rawQ) {
        const safeQ = escapeRegex(rawQ);
        filter.$or = [
          { name: { $regex: safeQ, $options: "i" } },
          { sku: { $regex: safeQ, $options: "i" } },
        ];
      }

      const docs = await db
        .collection("inventory")
        .find(filter, {
          projection: {
            _id: 1,
            name: 1,
            sku: 1,
            quantity: 1,
            unit: 1,
            purchase_cost_per_unit: 1,
            costPerUnit: 1,
            tax_rate: 1,
          },
        })
        .sort({ name: 1 })
        .limit(50)
        .toArray();

      const options: InventoryOption[] = docs.map((d) => ({
        id: String(d._id),
        name: String(d.name || "Unnamed Item"),
        sku: d.sku ? String(d.sku) : undefined,
        quantity: typeof d.quantity === "number" ? d.quantity : 0,
        unit: d.unit ? String(d.unit) : "units",
        purchase_cost_per_unit: Number(d.purchase_cost_per_unit ?? d.costPerUnit ?? 0),
        tax_rate: typeof d.tax_rate === "number" ? d.tax_rate : undefined,
      }));

      return NextResponse.json({ success: true, data: options });
    })
  ),
  { tier: "read" }
);

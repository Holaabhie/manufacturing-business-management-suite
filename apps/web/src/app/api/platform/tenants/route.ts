import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { getDb } from "@/lib/mongodb";
import { getEffectiveTier } from "@/lib/entitlements";

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requirePlatformAdmin();
    if (adminCheck.error) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { searchParams } = new URL(req.url);
    const emailParam = searchParams.get("email");

    const db = await getDb();

    // Query for owners: no adminId, role in ['Admin', 'Owner']
    const filter: Record<string, any> = {
      $and: [
        {
          $or: [
            { adminId: { $exists: false } },
            { adminId: null },
            { adminId: "" },
          ],
        },
        {
          role: { $in: ["Admin", "Owner"] },
        },
      ],
    };

    if (emailParam && emailParam.trim()) {
      const escapedEmail = emailParam.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$and.push({ email: { $regex: escapedEmail, $options: "i" } });
    }

    const owners = await db
      .collection("users")
      .find(filter)
      .limit(20)
      .toArray();

    const data = await Promise.all(
      owners.map(async (doc) => {
        const ownerId = doc._id.toString();
        const effectiveTier = await getEffectiveTier(doc as any);

        const [inventoryCount, ordersCount, clientsCount, usersCount] = await Promise.all([
          db.collection("inventory").countDocuments({
            $or: [{ userId: ownerId }, { organizationId: ownerId }, { created_by: ownerId }],
            is_sample: { $ne: true },
          }),
          db.collection("orders").countDocuments({
            userId: ownerId,
            is_sample: { $ne: true },
          }),
          db.collection("clients").countDocuments({
            userId: ownerId,
            is_sample: { $ne: true },
          }),
          db.collection("users").countDocuments({
            $or: [{ adminId: ownerId }, { _id: doc._id }],
          }),
        ]);

        return {
          ownerId,
          email: doc.email,
          name: doc.full_name || doc.fullName || "",
          subscription_tier: doc.subscription_tier || "starter",
          effective_tier: effectiveTier,
          plan_override: doc.plan_override || null,
          counts: {
            inventory: inventoryCount,
            orders: ordersCount,
            clients: clientsCount,
            users: usersCount,
          },
        };
      })
    );

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error in GET /api/platform/tenants:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

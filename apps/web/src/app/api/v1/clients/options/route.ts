import { NextResponse, type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { escapeRegex } from "@/shared/lib/pagination";

export interface ClientOption {
  id: string;
  name: string;
  phone?: string;
  email?: string;
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
        filter.name = { $regex: escapeRegex(rawQ), $options: "i" };
      }

      const docs = await db
        .collection("clients")
        .find(filter, { projection: { _id: 1, name: 1, phone: 1, email: 1 } })
        .sort({ name: 1 })
        .limit(50)
        .toArray();

      const options: ClientOption[] = docs.map((d) => ({
        id: String(d._id),
        name: String(d.name || "Unnamed Client"),
        phone: d.phone ? String(d.phone) : undefined,
        email: d.email ? String(d.email) : undefined,
      }));

      return NextResponse.json({ success: true, data: options });
    })
  ),
  { tier: "read" }
);

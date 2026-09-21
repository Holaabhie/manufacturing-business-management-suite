import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

let indexEnsured = false;
async function ensureIndex(db: any) {
  if (indexEnsured) return;
  try {
    await db.collection("notification_reads").createIndex({ userId: 1 }, { unique: true });
    indexEnsured = true;
  } catch {
    // Ignore index creation error if already exists
  }
}

/**
 * GET /api/notifications/read
 * Returns the list of persisted read notification IDs for the authenticated session user.
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = String(user._id);
    const db = await getDb();
    await ensureIndex(db);
    const doc = await db.collection("notification_reads").findOne({ userId });

    return NextResponse.json({
      success: true,
      readIds: Array.isArray(doc?.readIds) ? doc.readIds : [],
    });
  } catch (error) {
    console.error("GET /api/notifications/read error:", error);
    return NextResponse.json(
      { error: "Failed to fetch read notifications" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/read
 * Marks one or more notification IDs as read for the authenticated session user.
 * 
 * Array cap & eviction policy:
 * - Application-level trim with FIFO eviction: capped at 1000 entries.
 * - New unique IDs are appended chronologically to the end.
 * - If total exceeds 1000, oldest entries are evicted from the front (`slice(-1000)`).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const rawIds = Array.isArray(body?.ids)
      ? body.ids
      : typeof body?.id === "string"
      ? [body.id]
      : [];

    const incomingIds: string[] = rawIds.filter(
      (id: unknown): id is string => typeof id === "string" && id.trim().length > 0
    );

    if (incomingIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No valid IDs provided",
        readIds: [],
      });
    }

    const userId = String(user._id);
    const db = await getDb();
    await ensureIndex(db);

    // Application-level trim with FIFO eviction (capped at 1000 entries)
    const doc = await db.collection("notification_reads").findOne({ userId });
    const existingIds: string[] = Array.isArray(doc?.readIds) ? doc.readIds : [];
    const existingSet = new Set(existingIds);

    // Deduplicate incoming IDs amongst themselves, then filter out existing ones
    const uniqueIncoming = Array.from(new Set(incomingIds));
    const newUniqueIds = uniqueIncoming.filter((id) => !existingSet.has(id));

    let updatedIds = existingIds;
    if (newUniqueIds.length > 0) {
      updatedIds = [...existingIds, ...newUniqueIds];
      if (updatedIds.length > 1000) {
        // FIFO eviction: drop oldest entries from front, keep the newest 1000
        updatedIds = updatedIds.slice(-1000);
      }

      await db.collection("notification_reads").updateOne(
        { userId },
        {
          $set: { readIds: updatedIds, updatedAt: new Date() },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
    }

    return NextResponse.json({
      success: true,
      readIds: updatedIds,
    });
  } catch (error) {
    console.error("POST /api/notifications/read error:", error);
    return NextResponse.json(
      { error: "Failed to save read notifications" },
      { status: 500 }
    );
  }
}

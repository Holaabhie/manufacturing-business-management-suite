import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

/**
 * GET /api/user/modules — Load module preferences for the current user.
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = String(user._id);
    const db = await getDb();

    const prefs = await db.collection("user_preferences").findOne({ userId });

    if (prefs?.modules) {
      return NextResponse.json({
        modules:
          typeof prefs.modules === "string"
            ? JSON.parse(prefs.modules)
            : prefs.modules,
      });
    }

    // No saved preferences — return null so client uses defaults
    return NextResponse.json({ modules: null });
  } catch (error: any) {
    console.error("[user/modules GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to load module preferences" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/modules — Save module preferences for the current user.
 * Body: ModuleConfig object (e.g. { production: true, machines: true, ... })
 */
export async function PUT(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = String(user._id);
    const modules = await req.json();

    if (!modules || typeof modules !== "object") {
      return NextResponse.json(
        { error: "Invalid modules data" },
        { status: 400 }
      );
    }

    const db = await getDb();

    await db.collection("user_preferences").updateOne(
      { userId },
      {
        $set: {
          userId,
          modules,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[user/modules PUT] Error:", error);
    return NextResponse.json(
      { error: "Failed to save module preferences" },
      { status: 500 }
    );
  }
}

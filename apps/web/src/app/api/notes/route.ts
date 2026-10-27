import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

// Color palette for note accent borders — auto-assigned based on index
const NOTE_COLORS = [
  "#007AFF", // blue
  "#34C759", // green
  "#AF52DE", // purple
  "#FF9500", // orange
  "#FF2D55", // pink
  "#5AC8FA", // teal
  "#5856D6", // indigo
  "#FF3B30", // red
  "#FFCC00", // yellow
  "#00C7BE", // mint
];

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const notes = await db
      .collection("notes")
      .find({ userId: getDataOwnerId(user) })
      .sort({ updatedAt: -1 })
      .toArray();

    const formatted = notes.map((n: { _id: { toString(): string }; [key: string]: unknown }, index: number) => ({
      id: n._id.toString(),
      title: n.title,
      body: n.body,
      color: n.color || NOTE_COLORS[index % NOTE_COLORS.length],
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    }));

    return NextResponse.json(formatted);
  } catch (error: unknown) {
    console.error("Error fetching notes:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const db = await getDb();

    // Count existing notes to assign color
    const count = await db
      .collection("notes")
      .countDocuments({ userId: getDataOwnerId(user) });
    const color = NOTE_COLORS[count % NOTE_COLORS.length];

    const now = new Date();
    const result = await db.collection("notes").insertOne({
      userId: getDataOwnerId(user),
      title: body.title || "Untitled",
      body: body.body || "",
      color,
      createdAt: now,
      updatedAt: now,
    });

    const note = await db
      .collection("notes")
      .findOne({ _id: result.insertedId });

    return NextResponse.json({
      id: note!._id.toString(),
      title: note!.title,
      body: note!.body,
      color: note!.color,
      createdAt: note!.createdAt,
      updatedAt: note!.updatedAt,
    });
  } catch (error: unknown) {
    console.error("Error creating note:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { requireRole } from "@/lib/require-role";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const expenses = await db
      .collection("expenses")
      .find({ userId: getDataOwnerId(user) })
      .sort({ date: -1, createdAt: -1 })
      .toArray();

    const formatted = expenses.map((e: { _id: { toString(): string }; [key: string]: unknown }) => ({
      id: e._id.toString(),
      date: e.date,
      category: e.category,
      amount: e.amount,
      description: e.description,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));

    return NextResponse.json(formatted);
  } catch (error: unknown) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireRole(["Owner", "Admin", "Staff"]);
    if (authResult.error || !authResult.user) {
      return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: authResult.status || 401 });
    }
    const user = authResult.user;

    const body = await request.json();
    const db = await getDb();

    const now = new Date();
    const result = await db.collection("expenses").insertOne({
      userId: getDataOwnerId(user),
      date: body.date || now.toISOString().split("T")[0],
      category: body.category || "Other",
      amount: Number(body.amount) || 0,
      description: body.description || "",
      createdAt: now,
      updatedAt: now,
    });

    const expense = await db
      .collection("expenses")
      .findOne({ _id: result.insertedId });

    return NextResponse.json({
      id: expense!._id.toString(),
      date: expense!.date,
      category: expense!.category,
      amount: expense!.amount,
      description: expense!.description,
      createdAt: expense!.createdAt,
      updatedAt: expense!.updatedAt,
    });
  } catch (error: unknown) {
    console.error("Error creating expense:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getDataOwnerId } from "@/lib/auth-session";
import { requireRole } from "@/lib/require-role";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(["Owner", "Admin", "Staff"]);
    if (authResult.error || !authResult.user) {
      return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: authResult.status || 401 });
    }
    const user = authResult.user;
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const body = await request.json();
    const db = await getDb();

    const result = await db.collection("expenses").updateOne(
      { _id: new ObjectId(id), userId: getDataOwnerId(user) },
      {
        $set: {
          date: body.date,
          category: body.category,
          amount: Number(body.amount),
          description: body.description || "",
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error updating expense:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(["Owner", "Admin", "Staff"]);
    if (authResult.error || !authResult.user) {
      return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: authResult.status || 401 });
    }
    const user = authResult.user;
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection("expenses").deleteOne({
      _id: new ObjectId(id),
      userId: getDataOwnerId(user),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Expense not found or already deleted" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting expense:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

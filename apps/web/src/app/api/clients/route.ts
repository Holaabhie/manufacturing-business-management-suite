import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const clients = await db
      .collection("clients")
      .find({ userId: getDataOwnerId(user) })
      .sort({ name: 1 })
      .toArray();

    const formatted = clients.map((c: any) => ({
      id: c._id.toString(),
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      createdAt: c.createdAt,
      created_at: c.createdAt,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Error fetching clients:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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

    const result = await db.collection("clients").insertOne({
      userId: getDataOwnerId(user),
      name: body.name,
      email: body.email || "",
      phone: body.phone || "",
      address: body.address || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const client = await db.collection("clients").findOne({ _id: result.insertedId });

    return NextResponse.json({
      id: client!._id.toString(),
      ...client,
    });
  } catch (error: any) {
    console.error("Error creating client:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

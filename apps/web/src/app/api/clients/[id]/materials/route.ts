import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const materials = await db
      .collection("client_materials")
      .find({
        client_id: id,
        userId: getDataOwnerId(user),
      })
      .sort({ createdAt: 1 })
      .toArray();

    const formatted = materials.map((m: any) => ({
      id: m._id.toString(),
      name: m.name,
      type: m.type,
      default_rate: m.default_rate,
      client_id: m.client_id,
      createdAt: m.createdAt,
      created_at: m.createdAt,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Error fetching client materials:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const db = await getDb();

    const result = await db.collection("client_materials").insertOne({
      userId: getDataOwnerId(user),
      client_id: id,
      name: body.name,
      type: body.type || "",
      default_rate: Number(body.default_rate) || 0,
      createdAt: new Date(),
    });

    const material = await db.collection("client_materials").findOne({ _id: result.insertedId });

    return NextResponse.json({
      id: material!._id.toString(),
      ...material,
    });
  } catch (error: any) {
    console.error("Error creating client material:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

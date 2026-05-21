import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

/**
 * GET  /api/production/templates  → List all saved material templates
 * POST /api/production/templates  → Create a new template
 */

export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const db = await getDb();
        const templates = await db
            .collection("material_templates")
            .find({ userId: getDataOwnerId(user) })
            .sort({ createdAt: -1 })
            .toArray();

        return NextResponse.json(
            templates.map((t: any) => ({
                id: t._id.toString(),
                name: t.name,
                productName: t.productName || "",
                items: t.items || [],
                createdAt: t.createdAt,
            }))
        );
    } catch (error: any) {
        console.error("Error fetching templates:", error);
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
        const { name, productName, items } = body;

        if (!name || typeof name !== "string" || !name.trim()) {
            return NextResponse.json(
                { error: "Template name is required" },
                { status: 400 }
            );
        }

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { error: "At least one material item is required" },
                { status: 400 }
            );
        }

        const db = await getDb();
        const userId = getDataOwnerId(user);

        const doc = {
            userId,
            name: name.trim(),
            productName: productName?.trim() || "",
            items: items.map((item: any) => ({
                inventoryItemId: item.inventoryItemId || "",
                itemName: item.itemName || "",
                quantity: Number(item.quantity) || 0,
                unit: item.unit || "",
            })),
            createdAt: new Date(),
        };

        const result = await db.collection("material_templates").insertOne(doc);

        return NextResponse.json({
            id: result.insertedId.toString(),
            ...doc,
        });
    } catch (error: any) {
        console.error("Error creating template:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

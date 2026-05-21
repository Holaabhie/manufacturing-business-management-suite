import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/**
 * DELETE /api/production/templates/[id]
 * Delete a material template by ID.
 */
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
        }

        const db = await getDb();
        const result = await db.collection("material_templates").deleteOne({
            _id: new ObjectId(id),
            userId: getDataOwnerId(user),
        });

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { error: "Template not found or already deleted" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting template:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

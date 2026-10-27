import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { resolvePermissions, hasPermission, isOwnerRole } from "@/lib/permissions";
import { tenantFilter } from "@/lib/tenant-filter";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const perms = resolvePermissions(user.role, user.customPermissions);
    if (!hasPermission(perms, "clients.edit", isOwnerRole(user.role))) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to edit clients" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const db = await getDb();

    const updateFields: Record<string, unknown> = {
          name: body.name,
          company: body.company || "",
          email: body.email,
          phone: body.phone,
          address: body.address,
          updatedAt: new Date(),
        };
        // Only update avatarUrl if explicitly provided (avoids clearing on regular edits)
        if (body.avatarUrl !== undefined) {
          updateFields.avatarUrl = body.avatarUrl;
        }

    const result = await db.collection("clients").updateOne(
      tenantFilter(getDataOwnerId(user), "clients", { _id: new ObjectId(id) }),
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error updating client:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const perms = resolvePermissions(user.role, user.customPermissions as Parameters<typeof resolvePermissions>[1]);
    if (!hasPermission(perms, "clients.delete", isOwnerRole(user.role))) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to delete clients" },
        { status: 403 }
      );
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection("clients").deleteOne(
      tenantFilter(getDataOwnerId(user), "clients", { _id: new ObjectId(id) })
    );

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Client not found or already deleted" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting client:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

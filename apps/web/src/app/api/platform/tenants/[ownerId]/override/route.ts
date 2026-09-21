import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { getDb } from "@/lib/mongodb";
import { logAudit } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ownerId: string }> | { ownerId: string } }
) {
  try {
    const adminCheck = await requirePlatformAdmin();
    if (adminCheck.error) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { ownerId } = await params;
    if (!ownerId || !ObjectId.isValid(ownerId)) {
      return NextResponse.json({ error: "Invalid owner ID" }, { status: 400 });
    }

    const body = await request.json();
    const { tier, expires_at, reason } = body || {};

    if (tier !== "starter" && tier !== "pro") {
      return NextResponse.json(
        { error: "Invalid tier. Must be 'starter' or 'pro'" },
        { status: 400 }
      );
    }

    if (typeof reason !== "string" || !reason.trim() || reason.trim().length > 500) {
      return NextResponse.json(
        { error: "Reason is required and must be at most 500 characters" },
        { status: 400 }
      );
    }

    let parsedExpiresAt: Date | null = null;
    if (expires_at !== undefined && expires_at !== null && expires_at !== "") {
      parsedExpiresAt = new Date(expires_at);
      if (isNaN(parsedExpiresAt.getTime()) || parsedExpiresAt.getTime() <= Date.now()) {
        return NextResponse.json(
          { error: "expires_at must be a valid future ISO date string" },
          { status: 400 }
        );
      }
    }

    const db = await getDb();
    const targetUser = await db.collection("users").findOne({
      _id: new ObjectId(ownerId),
    });

    // Target must exist, have role in ['Admin', 'Owner'], and have NO adminId
    if (
      !targetUser ||
      !["Admin", "Owner"].includes(targetUser.role) ||
      (targetUser.adminId !== undefined &&
        targetUser.adminId !== null &&
        String(targetUser.adminId).trim() !== "")
    ) {
      return NextResponse.json({ error: "Tenant owner not found" }, { status: 404 });
    }

    const overrideData = {
      tier,
      set_at: new Date(),
      expires_at: parsedExpiresAt,
      reason: reason.trim(),
    };

    await db.collection("users").updateOne(
      { _id: new ObjectId(ownerId) },
      { $set: { plan_override: overrideData } }
    );

    // Audit log without platform admin's identity or reason text
    await logAudit({
      organizationId: String(targetUser._id),
      userId: "platform-admin",
      userName: "Platform Admin",
      userRole: "Admin",
      action: `Plan override set to ${tier}`,
      actionType: "system",
      module: "settings",
      resourceId: String(targetUser._id),
      resourceType: "user",
    });

    return NextResponse.json({
      success: true,
      data: {
        plan_override: overrideData,
        effective_tier: tier,
      },
    });
  } catch (error: any) {
    console.error("Error in POST /api/platform/tenants/[ownerId]/override:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ ownerId: string }> | { ownerId: string } }
) {
  try {
    const adminCheck = await requirePlatformAdmin();
    if (adminCheck.error) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { ownerId } = await params;
    if (!ownerId || !ObjectId.isValid(ownerId)) {
      return NextResponse.json({ error: "Invalid owner ID" }, { status: 400 });
    }

    const db = await getDb();
    const targetUser = await db.collection("users").findOne({
      _id: new ObjectId(ownerId),
    });

    if (
      !targetUser ||
      !["Admin", "Owner"].includes(targetUser.role) ||
      (targetUser.adminId !== undefined &&
        targetUser.adminId !== null &&
        String(targetUser.adminId).trim() !== "")
    ) {
      return NextResponse.json({ error: "Tenant owner not found" }, { status: 404 });
    }

    await db.collection("users").updateOne(
      { _id: new ObjectId(ownerId) },
      { $unset: { plan_override: "" } }
    );

    // Audit log without platform admin's identity or reason text
    await logAudit({
      organizationId: String(targetUser._id),
      userId: "platform-admin",
      userName: "Platform Admin",
      userRole: "Admin",
      action: "Plan override removed",
      actionType: "system",
      module: "settings",
      resourceId: String(targetUser._id),
      resourceType: "user",
    });

    return NextResponse.json({
      success: true,
      message: "Plan override removed",
    });
  } catch (error: any) {
    console.error("Error in DELETE /api/platform/tenants/[ownerId]/override:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

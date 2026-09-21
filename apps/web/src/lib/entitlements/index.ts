import { NextResponse } from "next/server";
import { ObjectId, type WithId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getDataOwnerId, type UserDoc } from "@/lib/auth-session";
import { PLAN_LIMITS, type PlanLimits } from "./limits";

export { PLAN_LIMITS, STARTER_LIMIT, type PlanLimits } from "./limits";

/**
 * Resolves the tenant owner document for a given user.
 * - One hop only.
 * - If user has no adminId, user is the tenant owner.
 * - If user has adminId, looks up the owner doc matching adminId as String or ObjectId.
 * - If owner doc is missing or itself has an adminId (chained), returns null (fail closed) and warns.
 * - Never throws.
 */
export async function resolveTenantOwner(
    user: WithId<UserDoc> | UserDoc
): Promise<WithId<UserDoc> | UserDoc | null> {
    try {
        const rawAdminId = user.adminId;
        const hasAdminId =
            rawAdminId !== undefined &&
            rawAdminId !== null &&
            String(rawAdminId).trim() !== "";

        if (!hasAdminId) {
            return user;
        }

        const planOwnerId = String(rawAdminId).trim();
        const db = await getDb();

        const orConditions: any[] = [{ _id: planOwnerId }];
        if (ObjectId.isValid(planOwnerId)) {
            orConditions.push({ _id: new ObjectId(planOwnerId) });
        }

        const ownerDoc = await db
            .collection<UserDoc>("users")
            .findOne({ $or: orConditions });

        if (!ownerDoc) {
            console.warn(
                `[entitlements] Tenant owner doc not found for user ${user._id} (adminId: ${planOwnerId})`
            );
            return null;
        }

        if (
            ownerDoc.adminId !== undefined &&
            ownerDoc.adminId !== null &&
            String(ownerDoc.adminId).trim() !== ""
        ) {
            console.warn(
                `[entitlements] Chained adminId detected on owner doc ${ownerDoc._id} for user ${user._id}`
            );
            return null;
        }

        return ownerDoc;
    } catch (error) {
        console.warn("[entitlements] Error resolving tenant owner:", error);
        return null;
    }
}

/**
 * Resolves the effective plan tier for a user.
 * - Owner's plan_override takes precedence if active (expires_at is null or in future).
 * - Otherwise falls back to owner's subscription_tier (fallback 'starter').
 * - Fails closed to 'starter'.
 */
export async function getEffectiveTier(
    user: WithId<UserDoc> | UserDoc
): Promise<"starter" | "pro"> {
    try {
        const owner = await resolveTenantOwner(user);
        if (!owner) {
            return "starter";
        }

        const override = owner.plan_override;
        if (override && (override.tier === "starter" || override.tier === "pro")) {
            const expiresAt = override.expires_at;
            if (
                expiresAt === null ||
                expiresAt === undefined ||
                new Date(expiresAt).getTime() > Date.now()
            ) {
                return override.tier;
            }
        }

        return owner.subscription_tier === "pro" ? "pro" : "starter";
    } catch (error) {
        console.warn("[entitlements] Error determining effective tier:", error);
        return "starter";
    }
}

/**
 * Returns resource limits for the specified tier.
 */
export function getLimits(tier: "starter" | "pro"): PlanLimits {
    return PLAN_LIMITS[tier] || PLAN_LIMITS.starter;
}

/**
 * Asserts whether the given user can create incomingCount items for resource.
 * Usage count query matches the list GET filter for the user's dataOwnerId, excluding sample docs.
 * Returns null if creation is allowed.
 * Returns HTTP 403 JSON if limit is reached.
 */
export async function assertCanCreate(
    user: WithId<UserDoc> | UserDoc,
    resource: "inventory" | "orders" | "clients",
    incomingCount = 1
): Promise<NextResponse | null> {
    try {
        const rawDataOwnerId = getDataOwnerId(user);
        const ownerIdStr = String(rawDataOwnerId);
        const ownerIdOid = ObjectId.isValid(ownerIdStr) ? new ObjectId(ownerIdStr) : null;
        const userIds = ownerIdOid ? [ownerIdStr, ownerIdOid] : [ownerIdStr];
        const db = await getDb();

        let filter: Record<string, any>;
        if (resource === "inventory") {
            filter = {
                $or: [
                    { userId: { $in: userIds } },
                    { organizationId: { $in: userIds } },
                    { created_by: { $in: userIds } },
                ],
                is_sample: { $ne: true },
            };
        } else {
            filter = {
                userId: { $in: userIds },
                is_sample: { $ne: true },
            };
        }

        const current = await db.collection(resource).countDocuments(filter);
        const tier = await getEffectiveTier(user);
        const limit = getLimits(tier)[resource];

        if (limit !== null && current + incomingCount > limit) {
            return NextResponse.json(
                {
                    error: "Plan limit reached",
                    code: "PLAN_LIMIT_REACHED",
                    resource,
                    limit,
                    current,
                    tier,
                },
                { status: 403 }
            );
        }

        return null;
    } catch (error: any) {
        console.error(`[entitlements] Error checking limit for ${resource}:`, error);
        // Fail closed or propagate? In case of DB error, let the route handler handle it or return 500
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

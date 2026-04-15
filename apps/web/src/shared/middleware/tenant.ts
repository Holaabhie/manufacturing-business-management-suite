/**
 * Tenant Context Middleware
 * ─────────────────────────────────────────────────────────
 * Resolves tenant configuration from the authenticated user's
 * organizationId. In single-tenant mode, returns a default
 * tenant context.
 *
 * Usage:
 *   const tenant = await resolveTenant(organizationId);
 *   if (!tenant) throw new AuthenticationError("Invalid tenant");
 */

import type { Tenant, TenantPlan } from "@/modules/tenant/domain/types";

// ─── Tenant Context ─────────────────────────────────────────────

export interface TenantContext extends Tenant {
    // Extended at runtime with resolved configuration
}

// ─── Default tenant for single-tenant mode ──────────────────────

const DEFAULT_TENANT: TenantContext = {
    id: "default",
    slug: "default",
    name: "Manufacturing OS",
    plan: "starter",
    status: "active",
    settings: {
        timezone: "Asia/Kolkata",
        currency: "INR",
        locale: "en-IN",
        features: {},
    },
    limits: {
        maxUsers: 50,
        maxItems: 10_000,
        maxStorageBytes: 5 * 1024 * 1024 * 1024, // 5GB
        apiRateLimit: 100, // requests per minute
    },
    createdAt: new Date(),
};

// ─── Plan-based limits ──────────────────────────────────────────

const PLAN_LIMITS: Record<TenantPlan, TenantContext["limits"]> = {
    free: {
        maxUsers: 3,
        maxItems: 100,
        maxStorageBytes: 512 * 1024 * 1024, // 512MB
        apiRateLimit: 30,
    },
    starter: {
        maxUsers: 10,
        maxItems: 1_000,
        maxStorageBytes: 2 * 1024 * 1024 * 1024, // 2GB
        apiRateLimit: 60,
    },
    professional: {
        maxUsers: 50,
        maxItems: 10_000,
        maxStorageBytes: 10 * 1024 * 1024 * 1024, // 10GB
        apiRateLimit: 200,
    },
    enterprise: {
        maxUsers: 500,
        maxItems: 100_000,
        maxStorageBytes: 100 * 1024 * 1024 * 1024, // 100GB
        apiRateLimit: 1000,
    },
};

/**
 * Resolve tenant context from an organization ID.
 *
 * In single-tenant mode (default), returns the default tenant.
 * When multi-tenancy is enabled, loads from database/cache.
 */
export async function resolveTenant(
    tenantId: string,
): Promise<TenantContext | null> {
    // Single-tenant mode — always return default
    if (!process.env.ENABLE_MULTI_TENANT || process.env.ENABLE_MULTI_TENANT !== "true") {
        return {
            ...DEFAULT_TENANT,
            id: tenantId || "default",
        };
    }

    // Multi-tenant mode:
    // 1. Check cache (future: Redis)
    // 2. If miss, load from database
    // 3. Store in cache with TTL
    // 4. Return tenant context

    // Placeholder — implement based on your data layer
    // const tenant = await tenantRepository.findById(tenantId);
    // if (!tenant) return null;
    // return { ...tenant, limits: PLAN_LIMITS[tenant.plan] };

    return null;
}

/**
 * Get the limits for a given tenant plan.
 */
export function getLimitsForPlan(plan: TenantPlan): TenantContext["limits"] {
    return PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter;
}

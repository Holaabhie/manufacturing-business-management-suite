/**
 * Feature Flags
 * ─────────────────────────────────────────────────────────
 * Static feature flag definitions with environment overrides
 * and plan-based gating. No external dependency required.
 *
 * Usage:
 *   import { isFeatureEnabled } from "@/shared/config/features";
 *
 *   if (isFeatureEnabled("ai-predictions", { plan: "enterprise" })) {
 *     // Show AI predictions UI
 *   }
 */

// ─── Types ──────────────────────────────────────────────────────

export interface FeatureFlagContext {
    tenantId?: string;
    userId?: string;
    plan?: string;
    environment: string;
}

interface FeatureDefinition {
    description: string;
    defaultEnabled: boolean;
    envOverride?: string;
    plans?: readonly string[];
}

// ─── Feature Definitions ────────────────────────────────────────

const FEATURES = {
    "multi-tenant": {
        description: "Enable multi-tenant features",
        defaultEnabled: false,
        envOverride: "ENABLE_MULTI_TENANT",
    },
    "ai-predictions": {
        description: "AI-powered predictions",
        defaultEnabled: false,
        plans: ["professional", "enterprise"],
    },
    "advanced-analytics": {
        description: "Advanced analytics dashboard",
        defaultEnabled: false,
        plans: ["enterprise"],
    },
    "webhook-system": {
        description: "Webhook delivery system",
        defaultEnabled: true,
    },
    "batch-operations": {
        description: "Bulk import/export",
        defaultEnabled: true,
    },
    "audit-log": {
        description: "Audit trail for compliance",
        defaultEnabled: true,
    },
    "rate-limiting": {
        description: "API rate limiting per tenant",
        defaultEnabled: true,
    },
    // New ERP Features
    "new_onboarding": {
        description: "Enhanced 5-step company onboarding flow",
        defaultEnabled: false,
    },
    "new_payment_ui": {
        description: "Enhanced payment UI and transaction system",
        defaultEnabled: false,
    },
    "accounting_module": {
        description: "Full double-entry accounting with ledgers",
        defaultEnabled: false,
    },
    "gst_reports": {
        description: "GSTR-1, 3B, and tax compliance modules",
        defaultEnabled: false,
    },
    "inventory_module": {
        description: "Advanced inventory and warehouse management",
        defaultEnabled: false,
    },
    "advanced_reports": {
        description: "Advanced dashboards and reports",
        defaultEnabled: false,
    }
} as const satisfies Record<string, FeatureDefinition>;

export type FeatureFlag = keyof typeof FEATURES;

// ─── API ────────────────────────────────────────────────────────

/**
 * Check if a feature flag is enabled for the given context.
 */
export function isFeatureEnabled(
    flag: FeatureFlag,
    context?: Partial<FeatureFlagContext>,
): boolean {
    const feature = FEATURES[flag];
    if (!feature) return false;

    // Environment variable override (highest priority)
    if ("envOverride" in feature && feature.envOverride) {
        const envValue = process.env[feature.envOverride];
        if (envValue !== undefined) return envValue === "true";
    }

    // Plan-based gating
    if ("plans" in feature && feature.plans && context?.plan) {
        if (!feature.plans.includes(context.plan as never)) return false;
    }

    return feature.defaultEnabled;
}

/**
 * Get all feature flags and their status for a given context.
 * Useful for sending to the frontend or debugging.
 */
export function getAllFeatureFlags(
    context?: Partial<FeatureFlagContext>,
): Record<FeatureFlag, boolean> {
    const flags = {} as Record<FeatureFlag, boolean>;
    for (const key of Object.keys(FEATURES) as FeatureFlag[]) {
        flags[key] = isFeatureEnabled(key, context);
    }
    return flags;
}

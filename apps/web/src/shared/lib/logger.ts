/**
 * Structured Logger — Re-export
 * ─────────────────────────────────────────────────────────
 * This file re-exports from the canonical infrastructure logger
 * to maintain backward compatibility with existing imports.
 *
 * Canonical location: @/infrastructure/logging/logger
 * This file: @/shared/lib/logger (backward-compatible alias)
 */

export {
    logger,
    authLogger,
    inventoryLogger,
    ordersLogger,
    billingLogger,
    productionLogger,
    apiLogger,
    twilioLogger,
    lifecycleLogger,
} from "@/infrastructure/logging/logger";

export type { LogLevel } from "@/infrastructure/logging/logger";

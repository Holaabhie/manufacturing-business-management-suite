/**
 * Environment Configuration (Validated via Zod)
 * ─────────────────────────────────────────────────────────
 * Centralizes all environment variable access. Validates
 * at startup so that missing/invalid config fails FAST
 * instead of throwing cryptic errors at runtime.
 *
 * Usage:
 *   import { env } from "@/shared/config/env";
 *   const uri = env.MONGODB_URI; // typed + validated
 *
 * This file replaces scattered `process.env.X!` across the codebase.
 */

import { z } from "zod";

// ─── Schema ─────────────────────────────────────────────────────

const envSchema = z.object({
    // ── Node ──────────────────────────────────────────────
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),

    // ── Database ──────────────────────────────────────────
    MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
    MONGODB_DB: z.string().default("ind_manager"),

    // ── Auth ──────────────────────────────────────────────
    NEXTAUTH_URL: z.string().url().optional(),
    NEXTAUTH_SECRET: z.string().min(1).optional(),
    AUTH_SECRET: z.string().min(1).optional(),
    AUTH_TRUST_HOST: z
        .string()
        .transform((v) => v === "true")
        .optional(),

    // ── Google OAuth ──────────────────────────────────────
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),

    // ── Microsoft Entra ID ────────────────────────────────
    AZURE_AD_CLIENT_ID: z.string().min(1).optional(),
    AZURE_AD_CLIENT_SECRET: z.string().min(1).optional(),
    AZURE_AD_TENANT_ID: z.string().min(1).optional(),

    // ── Stripe ────────────────────────────────────────────
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_PRO_PRICE_ID: z.string().min(1).optional(),

    // ── Twilio ────────────────────────────────────────────
    TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
    TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
    TWILIO_VERIFY_SERVICE_SID: z.string().min(1).optional(),
    TWILIO_PHONE_NUMBER: z.string().min(1).optional(),
    TWILIO_MESSAGES_API: z.string().url().optional(),

    // ── Logging ───────────────────────────────────────────
    LOG_LEVEL: z
        .enum(["debug", "info", "warn", "error", "fatal"])
        .optional(),

    // ── Application ───────────────────────────────────────
    NEXT_PUBLIC_APP_NAME: z.string().default("Manufacturing OS"),
    NEXT_PUBLIC_SUPPORT_EMAIL: z.string().email().optional(),

    // ── Cron / Internal ───────────────────────────────────
    CRON_SECRET: z.string().min(1).optional(),
});

// ─── Derived Type ───────────────────────────────────────────────
export type Env = z.infer<typeof envSchema>;

// ─── Validated Instance ─────────────────────────────────────────
function validateEnv(): Env {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
        const formatted = parsed.error.issues
            .map((i) => `  ✗ ${i.path.join(".")}: ${i.message}`)
            .join("\n");

        console.error("═══════════════════════════════════════════");
        console.error("  ❌ Environment validation failed:");
        console.error(formatted);
        console.error("═══════════════════════════════════════════");

        // In development, log but don't crash (allow partial configs)
        if (process.env.NODE_ENV !== "production") {
            console.warn("⚠️  Running with invalid env vars (dev mode). Some features may fail.");
            // Return a partially-valid env by coercing what we can
            return envSchema.parse({
                ...process.env,
                // Provide fallback for required fields
                MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017",
            });
        }

        throw new Error(`Environment validation failed:\n${formatted}`);
    }

    return parsed.data;
}

/**
 * Validated environment variables.
 * Access this instead of `process.env` directly.
 */
export const env: Env = validateEnv();

// ─── Helpers ────────────────────────────────────────────────────

export function isProduction(): boolean {
    return env.NODE_ENV === "production";
}

export function isDevelopment(): boolean {
    return env.NODE_ENV === "development";
}

export function isTest(): boolean {
    return env.NODE_ENV === "test";
}

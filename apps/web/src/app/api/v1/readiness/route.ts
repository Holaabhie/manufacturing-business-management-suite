/**
 * Readiness Probe — /api/v1/readiness
 * ─────────────────────────────────────────────────────────
 * Returns whether the app is ready to accept traffic.
 * Unlike /health (which shows overall status), readiness
 * returns 200 only when ALL dependencies are operational.
 *
 * Used by: Kubernetes readiness probes, load balancers,
 * deployment gates.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ReadinessCheck {
    ready: boolean;
    timestamp: string;
    checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }>;
}

export async function GET(): Promise<NextResponse<ReadinessCheck>> {
    const checks: ReadinessCheck["checks"] = {};

    // ── MongoDB Check ────────────────────────────────────
    try {
        const { getDb } = await import("@/lib/mongodb");
        const db = await getDb();
        const start = Date.now();
        await db.command({ ping: 1 });
        checks.mongodb = { ok: true, latencyMs: Date.now() - start };
    } catch (err) {
        checks.mongodb = {
            ok: false,
            error: err instanceof Error ? err.message : "Connection failed",
        };
    }

    // ── Environment Check ────────────────────────────────
    const requiredEnvVars = ["MONGODB_URI"];
    const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
    checks.environment = {
        ok: missingVars.length === 0,
        ...(missingVars.length > 0 && {
            error: `Missing: ${missingVars.join(", ")}`,
        }),
    };

    // ── Overall Readiness ────────────────────────────────
    const ready = Object.values(checks).every((c) => c.ok);

    return NextResponse.json(
        { ready, timestamp: new Date().toISOString(), checks },
        {
            status: ready ? 200 : 503,
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        },
    );
}

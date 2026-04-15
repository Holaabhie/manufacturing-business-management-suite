/**
 * Health Check API — /api/v1/health
 * ─────────────────────────────────────────────────────────
 * Returns system health status. Used by load balancers,
 * orchestrators, and monitoring tools.
 *
 * Checks: MongoDB connectivity, memory usage, uptime.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface HealthCheck {
    status: "healthy" | "degraded" | "unhealthy";
    version: string;
    uptime: number;
    timestamp: string;
    checks: {
        database: { status: "up" | "down"; latencyMs?: number; error?: string };
        memory: { status: "ok" | "warning"; usedMB: number; totalMB: number; percentage: number };
    };
}

export async function GET(): Promise<NextResponse<HealthCheck>> {
    const startTime = Date.now();
    let dbStatus: HealthCheck["checks"]["database"] = { status: "down" };

    // ── Check MongoDB ────────────────────────────────────
    try {
        const { getDb } = await import("@/lib/mongodb");
        const db = await getDb();
        const dbStart = Date.now();
        await db.command({ ping: 1 });
        dbStatus = { status: "up", latencyMs: Date.now() - dbStart };
    } catch (err) {
        dbStatus = {
            status: "down",
            error: err instanceof Error ? err.message : "Unknown error",
        };
    }

    // ── Check Memory ─────────────────────────────────────
    const mem = process.memoryUsage();
    const usedMB = Math.round(mem.heapUsed / 1024 / 1024);
    const totalMB = Math.round(mem.heapTotal / 1024 / 1024);
    const percentage = Math.round((mem.heapUsed / mem.heapTotal) * 100);
    const memoryStatus = percentage > 90 ? "warning" : "ok";

    // ── Overall Status ───────────────────────────────────
    const isHealthy = dbStatus.status === "up";
    const overallStatus: HealthCheck["status"] = isHealthy
        ? memoryStatus === "warning"
            ? "degraded"
            : "healthy"
        : "unhealthy";

    const health: HealthCheck = {
        status: overallStatus,
        version: process.env.npm_package_version || "0.0.0",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        checks: {
            database: dbStatus,
            memory: { status: memoryStatus, usedMB, totalMB, percentage },
        },
    };

    return NextResponse.json(health, {
        status: overallStatus === "unhealthy" ? 503 : 200,
        headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
        },
    });
}

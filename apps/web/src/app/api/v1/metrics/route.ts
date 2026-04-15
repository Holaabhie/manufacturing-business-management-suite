/**
 * Metrics API — /api/v1/metrics
 * ─────────────────────────────────────────────────────────
 * Returns collected business metrics in JSON format.
 * Can be adapted to Prometheus exposition format later.
 *
 * Protected endpoint — should be admin-only in production.
 */

import { NextResponse } from "next/server";
import { metrics } from "@/infrastructure/monitoring/metrics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
    const collected = metrics.getMetrics();

    return NextResponse.json(
        {
            status: "ok",
            timestamp: new Date().toISOString(),
            metricsCount: collected.length,
            metrics: collected,
        },
        {
            headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate",
            },
        },
    );
}

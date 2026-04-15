/**
 * Business Metrics Collection
 * ─────────────────────────────────────────────────────────
 * In-memory metrics collector providing counter and gauge abstractions.
 * In production, replace with Prometheus client (`prom-client`)
 * or a custom metrics service.
 *
 * Usage:
 *   import { metrics } from "@/infrastructure/monitoring/metrics";
 *
 *   metrics.incrementCounter("orders_created", { tenant: "acme" });
 *   metrics.setGauge("active_connections", 42);
 */

interface MetricEntry {
    name: string;
    type: "counter" | "gauge" | "histogram";
    value: number;
    labels: Record<string, string>;
    timestamp: string;
}

class MetricsCollector {
    private counters = new Map<string, number>();
    private gauges = new Map<string, number>();

    incrementCounter(name: string, labels: Record<string, string> = {}, by = 1): void {
        const key = `${name}:${JSON.stringify(labels)}`;
        this.counters.set(key, (this.counters.get(key) ?? 0) + by);
    }

    setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
        const key = `${name}:${JSON.stringify(labels)}`;
        this.gauges.set(key, value);
    }

    getMetrics(): MetricEntry[] {
        const entries: MetricEntry[] = [];
        const now = new Date().toISOString();

        for (const [key, value] of this.counters) {
            const separatorIndex = key.indexOf(":");
            const name = key.substring(0, separatorIndex);
            const labelsJson = key.substring(separatorIndex + 1);
            entries.push({
                name,
                type: "counter",
                value,
                labels: JSON.parse(labelsJson || "{}"),
                timestamp: now,
            });
        }

        for (const [key, value] of this.gauges) {
            const separatorIndex = key.indexOf(":");
            const name = key.substring(0, separatorIndex);
            const labelsJson = key.substring(separatorIndex + 1);
            entries.push({
                name,
                type: "gauge",
                value,
                labels: JSON.parse(labelsJson || "{}"),
                timestamp: now,
            });
        }

        return entries;
    }

    reset(): void {
        this.counters.clear();
        this.gauges.clear();
    }
}

export const metrics = new MetricsCollector();

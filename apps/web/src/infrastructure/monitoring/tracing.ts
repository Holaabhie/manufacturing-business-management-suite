/**
 * OpenTelemetry Integration Point
 * ─────────────────────────────────────────────────────────
 * When OTEL_EXPORTER_ENDPOINT is configured, this activates tracing.
 * Otherwise, it provides a no-op implementation with zero overhead.
 *
 * Usage:
 *   import { tracer } from "@/infrastructure/monitoring/tracing";
 *
 *   const span = tracer.startSpan("processOrder", { orderId: "123" });
 *   try {
 *     // ... do work
 *     span.setStatus("ok");
 *   } catch (error) {
 *     span.setStatus("error", error.message);
 *     throw error;
 *   } finally {
 *     span.end();
 *   }
 */

export interface Span {
    setAttribute(key: string, value: string | number | boolean): void;
    setStatus(status: "ok" | "error", message?: string): void;
    end(): void;
}

export interface Tracer {
    startSpan(name: string, attributes?: Record<string, string>): Span;
}

class NoOpSpan implements Span {
    setAttribute(): void { }
    setStatus(): void { }
    end(): void { }
}

class NoOpTracer implements Tracer {
    startSpan(): Span {
        return new NoOpSpan();
    }
}

// Replace with real OpenTelemetry when ready:
// import { trace } from '@opentelemetry/api';
// export const tracer = trace.getTracer('manufacturing-os');

export const tracer: Tracer = new NoOpTracer();

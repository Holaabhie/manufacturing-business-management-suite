# ADR-004: Observability Strategy

## Status: Accepted
## Date: 2026-02-18

## Context

The platform requires a comprehensive observability strategy to support production operations,
debugging, incident response, and future scaling. Phase 0 reconnaissance identified:

1. 50+ raw `console.log/error/warn` calls scattered across the codebase
2. No structured logging format (text-based, unparseable by log aggregators)
3. No distributed tracing capability
4. No business metrics collection
5. Health endpoints exist but lack correlation ID propagation

## Decision

### 1. Structured JSON Logging

**Use structured JSON logging in production, human-readable format in development.**

- All log entries include: `level`, `message`, `timestamp`, `module`, `correlationId`
- Production output is single-line JSON (compatible with DataDog, CloudWatch, ELK, Loki)
- Development output uses colored, human-readable format
- Log level controlled via `LOG_LEVEL` environment variable
- Child loggers provide per-module context without boilerplate
- **All `console.*` calls replaced** with the structured logger

### 2. Tracing Approach (OpenTelemetry Readiness)

**Provide a no-op tracer interface that can be swapped for OpenTelemetry.**

- Define `Span` and `Tracer` interfaces matching OpenTelemetry's API shape
- Ship with `NoOpTracer` / `NoOpSpan` implementations (zero overhead)
- When `OTEL_EXPORTER_ENDPOINT` is configured, swap to real OpenTelemetry SDK
- This avoids adding OpenTelemetry as a dependency until needed while ensuring
  instrumentation points exist throughout the codebase

### 3. Metrics Collection

**In-memory metrics collector with JSON export, replaceable with Prometheus client.**

- Support counter and gauge metric types
- Labels for multi-dimensional metrics (tenant, module, operation)
- JSON export endpoint at `/api/v1/metrics` (admin-protected)
- Can be swapped for `prom-client` when Prometheus/Grafana is deployed

### 4. Health Check Strategy

- **Liveness** (`/api/v1/health`): Basic process health, memory, uptime
- **Readiness** (`/api/v1/readiness`): Dependency health (MongoDB, environment)
- Both endpoints already exist; enhanced with correlation ID headers
- Cache-Control: `no-store` to prevent stale results

## Consequences

### Positive
- Log aggregators can parse and index all fields automatically
- Correlation IDs enable request tracing across services
- Metrics provide visibility into business operations
- Zero-cost tracing abstraction avoids premature dependency

### Negative
- In-memory metrics are lost on process restart (acceptable until Prometheus)
- No-op tracing provides no actual distributed tracing until OpenTelemetry is enabled
- JSON logging is less readable in raw terminal output (mitigated by dev format)

### Alternatives Considered
- **Winston/Pino**: External logging libraries add dependency weight; our needs are simple enough for a custom implementation that can be swapped later
- **Immediate OpenTelemetry**: Adds significant dependency tree; deferred until production traffic justifies it
- **StatsD for metrics**: Requires running a StatsD daemon; JSON export is simpler for MVP

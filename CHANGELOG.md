# Changelog

All notable changes to Manufacturing OS are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased] — 2026-02-18

### Added — Phase 3: Observability & Operations
- ADR-004: Observability strategy
- Structured JSON logger (`src/infrastructure/logging/logger.ts`) with correlation IDs, child loggers, and LOG_LEVEL env var
- OpenTelemetry no-op tracer (`src/infrastructure/monitoring/tracing.ts`)
- In-memory metrics collector with counter/gauge (`src/infrastructure/monitoring/metrics.ts`)
- Metrics JSON endpoint at `/api/v1/metrics`
- LOG_LEVEL added to environment validation schema

### Changed — Phase 3
- Replaced ~50 `console.*` calls with structured logging across 6 files
- Shared logger re-exports from new canonical location

### Added — Phase 4: Resilience & Self-Healing
- Lifecycle manager with graceful shutdown (`src/infrastructure/lifecycle.ts`)
- Circuit breaker pattern (`src/infrastructure/resilience/circuit-breaker.ts`)
- Retry with exponential backoff (`src/infrastructure/resilience/retry.ts`)
- Timeout guard (`src/infrastructure/resilience/timeout.ts`)

### Added — Phase 5: Multi-Tenancy & Feature Management
- ADR-005: Multi-tenancy strategy
- Tenant domain types (`src/modules/tenant/domain/types.ts`)
- Tenant resolution middleware with plan-based limits (`src/shared/middleware/tenant.ts`)
- Feature flag system with 7 flags and plan-based gating (`src/shared/config/features.ts`)

### Added — Phase 6: Event System & Integration Readiness
- Domain event bus interface (`src/infrastructure/events/bus.ts`)
- In-memory event bus (`src/infrastructure/events/in-memory-bus.ts`)
- Background job queue abstraction (`src/infrastructure/queue/provider.ts`)
- Webhook and notification domain types (`src/modules/notifications/domain/types.ts`)

### Added — Phase 7: CI/CD & Quality Governance
- GitHub Actions CI pipeline (`.github/workflows/ci.yml`)
- Vitest configuration (`apps/web/vitest.config.ts`)
- Inventory domain unit tests
- Orders domain unit tests

### Added — Phase 8: Documentation & Operational Readiness
- Architecture overview (`docs/architecture/README.md`)
- SLO definitions (`docs/architecture/slos.md`)
- API versioning strategy (`docs/architecture/api-versioning.md`)
- Runbook template and database connection failure runbook
- Platform transformation final report

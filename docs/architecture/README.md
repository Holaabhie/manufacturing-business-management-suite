# Architecture Overview

## System Architecture

Manufacturing OS is a multi-tenant SaaS platform for small and medium manufacturing businesses. Built on **Next.js (App Router)** with **MongoDB** as the primary data store.

## Key Principles

1. **Domain-Driven Design**: Business logic is organized into domain modules under `src/modules/`
2. **Infrastructure Independence**: Domain types have zero framework dependencies
3. **Hexagonal Architecture**: Repositories defined as interfaces in the domain, implemented in infrastructure
4. **Observability-First**: Structured logging, metrics, and tracing built into the platform

## Directory Structure

```
apps/web/src/
├── app/                    # Next.js App Router (pages, API routes)
│   └── api/v1/             # Versioned REST API
├── infrastructure/         # Cross-cutting infrastructure
│   ├── logging/            # Structured JSON logger
│   ├── monitoring/         # Tracing, metrics
│   ├── resilience/         # Circuit breaker, retry, timeout
│   ├── events/             # Domain event bus
│   └── queue/              # Background job queue
├── modules/                # Business domain modules
│   ├── inventory/          # Inventory management
│   ├── orders/             # Order processing
│   ├── production/         # Production tracking
│   ├── billing/            # Invoicing & payments
│   ├── analytics/          # Business analytics
│   ├── notifications/      # Webhook & notification types
│   └── tenant/             # Multi-tenant management
├── shared/                 # Shared utilities
│   ├── config/             # Environment, feature flags
│   ├── lib/                # Logger re-export, Result monad, errors
│   ├── middleware/         # API route wrapper, tenant middleware
│   └── types/              # API envelope, shared types
└── services/               # External service integrations (Twilio, etc.)
```

## Data Flow

```
Client → Next.js API Route → withApiRoute middleware → Domain Service → Repository → MongoDB
                                  ↓
                          Structured Logging
                          Metrics Collection
                          Tenant Resolution
```

## Key Design Decisions

See the [ADR Directory](../adr/) for detailed architectural decision records:

| ADR | Title | Status |
|-----|-------|--------|
| [001](../adr/001-foundational-architecture.md) | Foundational Architecture | Accepted |
| [002](../adr/002-domain-driven-modules.md) | Domain-Driven Modules | Accepted |
| [003](../adr/003-security-hardening.md) | Security Hardening | Accepted |
| [004](../adr/004-observability-strategy.md) | Observability Strategy | Accepted |
| [005](../adr/005-multi-tenancy-strategy.md) | Multi-Tenancy Strategy | Accepted |

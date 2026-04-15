# ADR-001: Adopt Layered Clean Architecture with Feature Modules

## Status: Accepted
## Date: 2026-02-17

## Context

During Phase 0 reconnaissance, the following structural concerns were identified:

1. **Business logic mixed with infrastructure** — API routes directly access MongoDB collections, perform validation, handle auth, and format responses all in single route files (e.g., `api/orders/route.ts` is 147 lines of mixed concerns).

2. **No domain layer** — Business rules (e.g., "can an order be cancelled?", "is stock below threshold?") are embedded in API handlers rather than isolated as pure, testable functions.

3. **Inconsistent patterns** — Some routes use `requireAdmin()`, others use `getSessionUser()` directly. Some routes validate input, most don't. Error handling varies wildly between routes.

4. **Library directory overloaded** — `src/lib/` contains auth logic, RBAC, rate limiting, auditing, CSRF, session management, and business utilities all in one flat directory (18 files).

5. **No clear module boundaries** — Inventory, orders, billing, and production code can freely import from each other, creating hidden coupling.

6. **Testing impossible** — Without separated layers, unit testing domain logic requires mocking MongoDB, auth, and Next.js — making tests fragile and slow.

7. **Multi-tenancy data isolation gaps** — Queries use `userId` instead of `organizationId`, making tenant isolation incomplete.

## Decision

Adopt a **layered clean architecture with feature modules** adapted for the Next.js App Router monorepo structure. Each business domain becomes a self-contained module with four layers:

- **Domain** — Pure business types, rules, events, and errors. Zero framework dependencies.
- **Application** — Use cases/services that orchestrate domain + infrastructure. Depends on domain interfaces only.
- **Infrastructure** — Concrete implementations of domain interfaces (repositories, external adapters).
- **Presentation** — Request/response validation schemas, React components specific to the module.

The Next.js `app/` directory remains a thin routing layer that delegates to module application services.

## Architecture Principles

1. **Dependency Rule** — Dependencies point inward. Domain depends on nothing. Infrastructure implements domain interfaces.
2. **Module Isolation** — Modules communicate through application-layer services, never by importing each other's internals.
3. **Framework Independence** — Domain layer is pure TypeScript. No imports from Next.js, MongoDB, or React.
4. **Strangler Fig Migration** — New structure is built alongside the old. Features are migrated one at a time. Old code is removed only after the new code is validated.

## Target Directory Structure (Next.js App Router)

```
src/
├── app/                           # Next.js routes — thin delegation layer
│   ├── api/
│   │   ├── v1/                    # API versioning
│   │   │   ├── health/
│   │   │   ├── readiness/
│   │   │   └── [resource]/
│   │   └── (existing routes)      # Kept during migration, deprecated over time
│   └── dashboard/
│
├── modules/                       # Feature modules (bounded contexts)
│   ├── auth/
│   │   ├── domain/                # Types, rules, events, errors
│   │   ├── application/           # Services, commands, queries
│   │   ├── infrastructure/        # Repository, adapters, mappers
│   │   ├── presentation/          # Validators, components, hooks
│   │   └── __tests__/
│   ├── inventory/
│   ├── orders/
│   ├── production/
│   ├── billing/
│   ├── clients/
│   ├── machines/
│   ├── employees/
│   ├── notifications/
│   └── tenant/
│
├── shared/                        # Cross-cutting concerns
│   ├── lib/                       # Pure utilities
│   ├── types/                     # Shared types
│   ├── config/                    # Environment, features, constants
│   ├── middleware/                 # Request pipeline
│   └── hooks/                     # Shared React hooks
│
└── infrastructure/                # Global infrastructure
    ├── database/
    ├── cache/
    ├── events/
    ├── logging/
    ├── monitoring/
    ├── resilience/
    ├── queue/
    └── secrets/
```

## Consequences

### Positive
- **Enforced boundaries** — Domain logic is testable in isolation without framework mocks
- **Consistent patterns** — Every module follows the same structure, reducing cognitive load
- **Swappable infrastructure** — MongoDB could be replaced with PostgreSQL by implementing new repositories
- **Multi-tenancy ready** — Domain interfaces enforce tenantId in all operations
- **Gradual migration** — Strangler Fig approach means zero big-bang rewrites

### Negative
- **Initial migration effort** — ~52 API routes need to be refactored (can be done incrementally)
- **Learning curve** — Team needs to understand layer boundaries
- **More files** — Each module has 4+ directories (but cognitive complexity per file decreases)

### Risk Mitigation
- Migrate one module at a time, starting with the simplest (shared utilities)
- Keep old routes working during migration with deprecation warnings
- Validate build + tests after every module migration
- Document patterns with the first module as a reference implementation

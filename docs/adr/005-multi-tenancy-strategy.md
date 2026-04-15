# ADR-005: Multi-Tenancy Strategy

## Status: Accepted
## Date: 2026-02-18

## Context

The Manufacturing OS platform needs to support multiple organizations (tenants)
sharing a single deployment. Each organization should have isolated data while
sharing infrastructure to reduce operational costs.

The existing codebase already uses `organizationId` consistently across entities,
which provides a foundation for tenant isolation.

## Decision

### Approach: Shared Database, Tenant Column

**Use shared MongoDB database with `organizationId` as the tenant identifier
on all tenant-scoped collections.**

Alternatives considered:
- **Database per tenant**: Too complex for our scale, high operational overhead
- **Schema per tenant**: MongoDB doesn't have schemas in the RDBMS sense
- **Collection per tenant**: Complicates queries, indexing, and connection pooling

### Tenant Context Propagation

1. Tenant identity is derived from the authenticated user's `organizationId` (JWT claim)
2. A `resolveTenant()` middleware loads tenant configuration (plan, limits, settings)
3. Tenant context flows through the request lifecycle via function parameters
4. All data queries MUST include `organizationId` in their `where` clause

### Tenant Isolation Enforcement

- Repository methods require `organizationId` as a parameter
- Feature flags are tenant-scoped (per-plan gating)
- Rate limits can be configured per-tenant plan
- Audit logs include `organizationId` for compliance

### Feature Flag System

- Feature flags defined statically in code with metadata
- Flags support environment variable overrides
- Flags support plan-based gating (e.g., "enterprise" only)
- No external feature flag service dependency (can be added later)
- Single-tenant mode works as default (no tenant resolution needed)

## Consequences

### Positive
- Simple operational model — one database, one deployment
- `organizationId` already exists across the codebase
- Feature flags enable gradual rollout without deployment
- Plan-based gating enables monetization of advanced features

### Negative
- No physical data isolation (mitigated by query-level enforcement)
- Noisy neighbor risk (mitigated by per-tenant rate limiting)
- Schema migrations affect all tenants simultaneously
- Feature flags in code require redeployment to add new flags (acceptable trade-off)

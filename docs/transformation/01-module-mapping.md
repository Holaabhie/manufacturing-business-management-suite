# Module Mapping — Phase 1.3

## Migration Priority Order

Modules are migrated in dependency order — shared utilities first, then leaf modules,
then modules that depend on others.

### Tier 0 — Foundation (DONE ✅)
| Module | Location | Status |
|--------|----------|--------|
| Shared Errors | `src/shared/lib/errors.ts` | ✅ Created |
| Result Type | `src/shared/lib/result.ts` | ✅ Created |
| API Envelope | `src/shared/types/api.ts` | ✅ Created |
| Env Config | `src/shared/config/env.ts` | ✅ Created |
| API Route Wrapper | `src/shared/middleware/with-api-route.ts` | ✅ Created |
| Health Endpoint | `src/app/api/v1/health/route.ts` | ✅ Created |
| Barrel Export | `src/shared/index.ts` | ✅ Created |

### Tier 1 — Leaf Modules (No cross-module deps)
| Module | Old Location | New Location | Status | Routes |
|--------|-------------|-------------|--------|--------|
| **Inventory** | `app/api/inventory/` | `modules/inventory/` | ✅ Reference impl created | GET, POST, PUT, DELETE |
| **Machines** | `app/api/machines/` | `modules/machines/` | 🔲 Pending | GET, POST, PUT, DELETE |
| **Employees** | `app/api/employees/` | `modules/employees/` | 🔲 Pending | GET, POST, PUT, DELETE |

### Tier 2 — Core Business Modules
| Module | Old Location | New Location | Status | Dependencies |
|--------|-------------|-------------|--------|-------------|
| **Clients** | `app/api/clients/` | `modules/clients/` | 🔲 Pending | None |
| **Orders** | `app/api/orders/` | `modules/orders/` | 🔲 Pending | Clients, Inventory |
| **Production** | `app/api/production/` | `modules/production/` | 🔲 Pending | Orders, Machines |
| **Billing** | `app/api/billing/` | `modules/billing/` | 🔲 Pending | Clients, Orders |
| **Payments** | `app/api/payments/` | `modules/payments/` | 🔲 Pending | Billing |

### Tier 3 — Cross-Cutting Modules
| Module | Old Location | New Location | Status | Dependencies |
|--------|-------------|-------------|--------|-------------|
| **Auth** | `lib/auth-session.ts`, `auth.ts` | `modules/auth/` | 🔲 Pending | Users |
| **Tenant** | `models/Organization.ts` | `modules/tenant/` | 🔲 Pending | Auth |
| **Notifications** | `services/twilio.service.ts` | `modules/notifications/` | 🔲 Pending | Auth, Tenant |

---

## Module Structure Template

Each module follows this structure (Inventory is the reference implementation):

```
modules/<module>/
├── domain/
│   ├── types.ts          # Entity types, DTOs, repository interface
│   └── schemas.ts        # Zod validation schemas
├── application/
│   └── <module>.service.ts   # Use cases / business logic
├── infrastructure/
│   └── <module>.repository.ts  # MongoDB implementation
├── presentation/         # (optional) React hooks/components
│   ├── hooks/
│   └── components/
├── __tests__/            # Tests mirror the structure
│   ├── domain/
│   ├── application/
│   └── infrastructure/
└── index.ts              # Barrel export
```

## Key Architecture Rules

1. **Domain layer** has ZERO imports from Next.js, MongoDB, or React
2. **Application service** depends only on domain interfaces (IRepository)
3. **Infrastructure** implements domain interfaces with concrete tech
4. **API routes** are thin: auth → service.method() → envelope response
5. **v1 routes** live alongside old routes during migration
6. **Old routes are NOT deleted** until v1 is validated and clients are migrated

## File-to-Module Mapping (Existing → New)

| Existing File | Target Module | Layer |
|-------------|--------------|-------|
| `lib/mongodb.ts` | `infrastructure/database/` | Infrastructure |
| `lib/auth-session.ts` | `modules/auth/infrastructure/` | Infrastructure |
| `lib/permissions.ts` | `modules/auth/domain/` | Domain |
| `lib/require-role.ts` | `modules/auth/application/` | Application |
| `lib/rate-limit.ts` | `shared/middleware/` | Shared |
| `lib/audit.ts` | `shared/lib/` (cross-cutting) | Shared |
| `lib/suspicious-login.ts` | `modules/auth/application/` | Application |
| `lib/with-idempotency.ts` | `shared/middleware/` | Shared |
| `lib/csrf.ts` | `shared/middleware/` | Shared |
| `lib/stripe.ts` | `infrastructure/payment/` | Infrastructure |
| `services/twilio.service.ts` | `modules/notifications/infrastructure/` | Infrastructure |
| `models/User.ts` | `modules/auth/infrastructure/` | Infrastructure |
| `models/Organization.ts` | `modules/tenant/infrastructure/` | Infrastructure |
| `models/AuditLog.ts` | `shared/infrastructure/` | Shared |

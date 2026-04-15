# Baseline Report — 2026-02-17

## System Identity
- **Project name:** Manufacturing Business Management Suite (manufacturing-os)
- **Architecture:** Turborepo monorepo with 3 apps + shared packages
- **Runtime:** Node.js
- **Framework (web):** Next.js 16.1.4 (App Router, Turbopack dev)
- **Framework (api):** NestJS 11 (scaffold only — default boilerplate, unused)
- **Framework (auth-server):** Express 4.21 (EJS templates, Passport + JWT + sessions)
- **Database:** MongoDB (via Mongoose ODM + native MongoDB driver)
- **ORM/DB:** Mongoose models + direct MongoDB `getDb()` collection queries (NO Prisma used in web app despite Prisma package existing)
- **Auth:** Dual-auth — NextAuth v5 (Google/Microsoft OAuth + JWT) + custom session system (httpOnly cookies, refresh tokens, session rotation)
- **Deployment target:** Not configured (no CI/CD, no Dockerfile, no Vercel config)
- **Package manager:** npm 10.2.4
- **Prisma schema:** Exists in `packages/database` but is only a PostgreSQL scaffold with a single `User` model — **NOT USED** by the web app (web uses MongoDB)

## Architecture Overview

### Monorepo Structure
```
manufacturing-business-management-suite/
├── apps/
│   ├── web/              # Next.js 16 — Primary frontend + API routes (main app)
│   │   ├── src/
│   │   │   ├── app/      # Next.js App Router (routes + API)
│   │   │   ├── auth.ts   # NextAuth v5 configuration
│   │   │   ├── components/ # React components (11 custom + 54 ui/)
│   │   │   ├── hooks/    # 1 hook (use-mobile.ts)
│   │   │   ├── lib/      # Business logic, auth, utils (18 files)
│   │   │   ├── models/   # Mongoose models (6)
│   │   │   ├── services/ # Service layer (1 — Twilio)
│   │   │   └── utils/    # Utilities (1 — cn helper)
│   │   └── middleware.ts  # Auth middleware (NextAuth + custom session)
│   ├── auth-server/       # Express server — standalone auth (EJS templates)
│   │   ├── config/        # DB + Passport config
│   │   ├── controllers/   # Auth controller
│   │   ├── middleware/    # Session, CSRF, auth, idempotency
│   │   ├── models/        # Mongoose models (User, IdempotencyKey)
│   │   ├── routes/        # Express routes (5)
│   │   ├── views/         # EJS templates
│   │   └── server.js      # Entry point
│   └── api/               # NestJS — SCAFFOLD ONLY (default boilerplate)
│       └── src/           # 5 default NestJS files
├── packages/
│   ├── database/          # Prisma schema (PostgreSQL — NOT USED by web)
│   ├── tsconfig/          # Shared TypeScript configs
│   └── ui/                # Shared UI package (empty/minimal)
├── docker-compose.yml     # TimescaleDB (Postgres) + Redis
├── turbo.json             # Turborepo pipeline config
└── package.json           # Root workspace
```

### Apps Breakdown

| App | Framework | Purpose | Status | Files |
|-----|-----------|---------|--------|-------|
| web | Next.js 16 | Main dashboard, API routes, auth | **Active** | ~139 TS/TSX |
| auth-server | Express 4 | Standalone SSR auth server | **Active** | ~18 JS |
| api | NestJS 11 | REST API | **Unused scaffold** | 5 TS |

## Current Database Schema (MongoDB Collections — Inferred)

| Collection | Used By | Purpose |
|-----------|---------|---------|
| users | web + auth-server | User accounts with RBAC |
| sessions | web | Custom session management |
| orders | web | Order management |
| inventory | web | Inventory items |
| clients | web | Client/customer records |
| bills | web | Invoice/billing records |
| payments | web | Payment records |
| machines | web | Machine registry |
| employees | web | Employee records |
| activity | web | Activity log |
| audit_logs | web | Audit trail |
| order_inventory_items | web | Order-inventory deductions |
| client_materials | web | Client material assignments |
| organizations | web | Multi-tenant organizations |
| invitations | web | Staff invitations |
| otp_codes | web | OTP verification |
| idempotency_keys | web + auth-server | Idempotency tracking |
| permission_templates | web | RBAC permission templates |

## API Routes (52 total in web app)

### Auth (15 routes)
- `[...nextauth]/route.ts` — NextAuth catch-all
- `login`, `register`, `logout`, `me`, `refresh`
- `send-otp`, `verify-otp`, `csrf`
- `change-password`, `forgot-password`, `reset-password`
- `complete-setup`, `cleanup`, `sessions`

### Business Domain (37 routes)
- **Orders:** CRUD + client-materials + payment-status (4)
- **Inventory:** CRUD (2)
- **Clients:** CRUD + materials (3)
- **Billing:** CRUD (2)
- **Payments:** CRUD (2)
- **Production:** CRUD + progress update (3)
- **Machines:** CRUD (2)
- **Employees:** CRUD (2)
- **Dashboard:** stats, activity, low-stock, recent-orders, revenue-chart (5)
- **Invoice:** generate-pdf, preview (2)
- **Profile:** profile, company, password (3)
- **Stripe:** setup, create-subscription, cancel-subscription, subscription (4)
- **Users:** CRUD (2 routes)

## Mongoose Models (6 in web app)

| Model | File | Key Fields |
|-------|------|-----------|
| User | `models/User.ts` | email, phone, role (Admin/Staff), organizationId, permissions (RBAC PermissionMap), subscription_tier, company_details |
| Organization | `models/Organization.ts` | name, slug, masterKey, settings (security policies), subscriptionTier |
| AuditLog | `models/AuditLog.ts` | action, userId, module, severity, before/afterState |
| Invitation | `models/Invitation.ts` | Staff invitation workflow |
| Otp | `models/Otp.ts` | OTP verification |
| PermissionTemplate | `models/PermissionTemplate.ts` | Reusable permission sets |

## External Integrations

| Service | Package | Purpose | Status |
|---------|---------|---------|--------|
| Google OAuth | `next-auth` + `passport-google-oauth20` | SSO login | ✅ Integration active |
| Microsoft OAuth | `next-auth` (MicrosoftEntraID) | SSO login | ⚠️ Placeholder credentials |
| Stripe | `stripe` + `@stripe/react-stripe-js` | Payment / subscriptions | ✅ Test keys present |
| Twilio | `twilio` | SMS/WhatsApp OTP | ⚠️ Partial config |
| MongoDB | `mongoose` + `mongodb` | Primary database | ✅ Active |
| Redis | `ioredis` + `connect-redis` | Sessions (auth-server) | ⚠️ In docker-compose, partially used |

## Environment Variables Referenced

### Web App (.env.local — 15 vars)
```
MONGODB_URI, MONGODB_DB
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, STRIPE_PRO_PRICE_ID
NEXTAUTH_URL, NEXTAUTH_SECRET, AUTH_SECRET, AUTH_TRUST_HOST
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, AZURE_AD_TENANT_ID
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID, TWILIO_PHONE_NUMBER, TWILIO_MESSAGES_API
NEXT_PUBLIC_APP_NAME, NEXT_PUBLIC_SUPPORT_EMAIL
CRON_SECRET (referenced but not in .env)
NODE_ENV (implicit)
```

### Auth Server (.env — separate)
```
PORT, FRONTEND_URL
MONGO_URI, JWT_SECRET, SESSION_SECRET
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL
REDIS_URL
```

## Health Metrics

| Metric | Status | Notes |
|--------|--------|-------|
| Build | ⚠️ PASSES with `ignoreBuildErrors: true` | TypeScript errors are **suppressed** in next.config.ts |
| TypeScript errors | ❌ UNKNOWN (masked) | `ignoreBuildErrors: true` hides all TS errors |
| Lint | ⚠️ Unknown | No recent lint run data |
| Circular dependencies | ❓ Not tested | No madge or similar tool configured |
| Test count | **0 tests** (web) | No test framework configured in web app |
| Test framework | None (web), Jest (NestJS scaffold), e2e.js (auth-server) | Only NestJS has jest configured (but only default test) |
| Vulnerable dependencies | ❓ Not audited | No npm audit data |
| Outdated dependencies | ❓ Not checked | No npm outdated data |

## Existing Enterprise Features (What's Already Good)

### ✅ Already Implemented
1. **RBAC Permission System** — Granular module/action permissions (`permissions.ts` — 337 lines)
2. **Role Enforcement** — `requireRole()`, `requirePermission()`, `requireAccess()`, `requireOrganization()`
3. **Audit Logging** — Full audit trail with CRUD, auth, security events (`audit.ts` — 166 lines)
4. **Rate Limiting** — In-memory sliding window with per-type configs (`rate-limit.ts` — 139 lines)
5. **Session Management** — Custom sessions with rotation, refresh tokens, sliding window
6. **Idempotency Keys** — API route protection against duplicate submissions
7. **CSRF Protection** — Token-based CSRF for sensitive operations
8. **Suspicious Login Detection** — IP, device, timing, impossible travel analysis
9. **Password Policy** — Configurable per-organization
10. **Multi-tenancy Foundation** — organizationId on User model + `requireOrganization()` guard
11. **UI Component Library** — 54+ Radix UI-based components

### ⚠️ Partially Implemented
- **Structured Error Handling** — Some routes use it, many catch blocks just `console.error` + return 500
- **Input Validation** — Zod is installed but NOT applied to most API routes (raw `body.field` access)
- **Multi-tenancy Data Isolation** — organizationId exists but queries use `userId` not `organizationId`
- **Event-driven patterns** — Activity logging exists but no event bus / domain events

## Risk Assessment

### 🔴 CRITICAL
1. **TypeScript errors suppressed** — `ignoreBuildErrors: true` in next.config.ts masks type safety issues
2. **No input validation on most API routes** — Direct `body.name`, `body.quantity` access without schema validation (XSS, injection risk)
3. **Data queries scoped by userId, NOT organizationId** — Multi-tenancy claims but data isn't properly tenant-isolated
4. **Secrets in `.env.local` committed pattern** — Stripe test keys, Google client IDs visible in env file
5. **Zero test coverage** — No unit/integration tests in the web app
6. **No CI/CD pipeline** — No GitHub Actions, no deployment automation

### 🟡 HIGH
7. **Dual auth system confusion** — NextAuth v5 + custom session cookies creates maintenance burden and potential security gaps
8. **NestJS API app unused** — Dead code / scaffold should be removed or purposefully used
9. **Prisma schema disconnected** — PostgreSQL Prisma defined but app uses MongoDB (confusing new developers)
10. **Console.error scattered everywhere** — 20+ raw `console.error` calls instead of structured logging
11. **Error responses leak internal details** — `error.message` returned to client in production
12. **No database migrations strategy** — MongoDB schema evolves implicitly

### 🟠 MEDIUM
13. **No health check endpoints** — No `/health` or `/readiness` routes
14. **No API versioning** — Routes at `/api/` with no version prefix
15. **Heavy `any` type usage** — Multiple `as any` casts throughout lib files
16. **No graceful shutdown** — Server processes don't handle SIGTERM properly
17. **Large monolithic components** — Dashboard layout (692 lines), dashboard page (644 lines)

## Dependency Inventory

### Web App
- **Production dependencies:** 67
- **Dev dependencies:** 10
- **Notable heavyweights:** Three.js, React Three Fiber (3D rendering libs — unusual for ERP)
- **License concerns:** Not audited

### Auth Server
- **Production dependencies:** 11
- **Dev dependencies:** 1

## Entry Points

| Entry | File | Runtime |
|-------|------|---------|
| Web App | `apps/web/src/app/layout.tsx` → Next.js routes | Next.js dev server |
| Auth Server | `apps/auth-server/server.js` | Express on port 5000 |
| NestJS API | `apps/api/src/main.ts` | NestJS on port 3000 |

---

## GATE: ✅ Report complete. No changes made to codebase.

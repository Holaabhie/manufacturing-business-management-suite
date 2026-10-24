# System Baseline Metrics & API Audit Report (Phase 0)

**Date**: 2026-10-24  
**Branch**: `chore/stabilize`  
**Repository**: `manufacturing-business-management-suite` (Monorepo: apps/web, @repo/web Next.js 16.1.6, React 19.0.0, Mongoose 9.1.5)

---

## 1. Executive Summary & Baseline Numbers

| Category | Metric / Command | Baseline Result | Status / Notes |
| :--- | :--- | :--- | :--- |
| **TypeScript** | `npx tsc --noEmit` (in `apps/web`) | **111 errors** across 9 modules | ❌ Failing (Ignored in build via `typescript.ignoreBuildErrors: true`) |
| **ESLint / Lint** | `npm run lint` (`next lint`) | **Broken** (Exit code 1) | ❌ In Next.js 16, `next lint` is deprecated/removed from CLI; treats `lint` as directory argument |
| **ESLint (Direct)** | `npx eslint .` | **Broken** (Exit code 1) | ❌ ESLint 9 + `@eslint/eslintrc` FlatCompat circular structure crash with `eslint-config-next` |
| **Vitest Tests** | `npx vitest run` | **8 passed, 1 failed (9 test files)**<br>**69 passed, 1 failed (70 tests)** | ⚠️ 98.6% passing; 1 failure in `src/content/__tests__/modules.test.ts` |
| **Build (Turbopack)** | `npm run build` (`next build`) | **Crashed** at 2m 22s | ❌ Turbopack thread allocation panic (OS error 1450) + memory exhaustion |
| **Build (Webpack)** | `next build --webpack` (multi-worker) | **Crashed** at 3m 54s | ❌ Worker threads heap exhaustion (Fatal Error: Young object promotion failed) |
| **Build (Constrained)**| `NEXT_CPU_COUNT=1 NODE_OPTIONS="--max-old-space-size=8192" next build --webpack` | **Crashed** at 3m 48s | ❌ Page data collection workers (7 workers) hit V8 Zone Allocation out of memory |
| **API Inventory** | Total API Route Files (`apps/web/src/app/api`) | **201 routes** | ⚠️ Multiple unauthenticated / unvalidated routes identified (detailed below) |

---

## 2. TypeScript Error Breakdown (111 Errors)

### Errors Grouped by Module / Subdirectory

| Module / Directory | Error Count | Percentage |
| :--- | :--- | :--- |
| **`api`** (`src/app/api/**`) | 33 | 29.7% |
| **`pages/app`** (`src/app/dashboard/**`) | 29 | 26.1% |
| **`scripts`** (`src/scripts/**`) | 16 | 14.4% |
| **`components`** (`src/components/**`) | 15 | 13.5% |
| **`lib`** (`src/lib/**`) | 12 | 10.8% |
| **`modules`** (`src/modules/**`) | 2 | 1.8% |
| **`other`** | 2 | 1.8% |
| **`hooks`** (`src/hooks/**`) | 1 | 0.9% |
| **`shared`** (`src/shared/**`) | 1 | 0.9% |
| **TOTAL** | **111** | **100%** |

### Top 10 Files with the Most TypeScript Errors

1. **`src/lib/mongodb.ts`** (11 errors): All instances of `'cached' is possibly 'undefined'` (TypeScript strict null check).
2. **`src/app/dashboard/upgrade/page.tsx`** (9 errors): Pricing tier schema mismatches and missing properties.
3. **`src/scripts/tally-bridge-test.ts`** (8 errors): MongoDB `ObjectId` vs string `_id` type mismatches.
4. **`src/components/reports/VendorStatement.tsx`** (7 errors): Implicit `any` parameters and missing `MobileField` component identifier.
5. **`src/app/dashboard/production/[id]/page.tsx`** (5 errors): Parameter and state type mismatches.
6. **`src/components/ai/BentoWidgetGrid.tsx`** (5 errors): Framer Motion transition easing type incompatibility with Motion 12.
7. **`src/app/dashboard/analytics/page.tsx`** (4 errors): Chart and filter property type mismatches.
8. **`src/app/dashboard/reports/previous-years/page.tsx`** (4 errors): Date/financial year parameter types.
9. **`src/app/api/stripe/cancel-subscription/route.ts`** (3 errors): Stripe response object nullability/type inference.
10. **`src/scripts/tally-bridge-roundtrip-test.ts`** (3 errors): Nullable `ObjectId` array assignment.

---

## 3. Test Suite Status (Vitest)

- **Total Test Files**: 9
- **Passing Files**: 8
- **Failing Files**: 1 (`src/content/__tests__/modules.test.ts`)
- **Total Test Cases**: 70
- **Passed**: 69
- **Failed**: 1
- **Duration**: ~13.44s

### Details of Failing Test
```
FAIL  src/content/__tests__/modules.test.ts > Phase 1b - Tightened Module Content Source of Truth > should verify that every module has at least as many evidence rows as claims in modules.evidence.md
AssertionError: expected 17 to be +0 // Object.is equality
- Expected: 0
+ Received: 17
```
*Cause*: The test checks that every marketing claim in `modules.ts` has corresponding verifiable code evidence rows in `modules.evidence.md`. Currently 17 claims lack recorded evidence entries.

---

## 4. Linting Status

1. **`npm run lint` failure**:
   - In `apps/web/package.json`, script is defined as `"lint": "next lint"`.
   - In Next.js 16 (`16.1.4+`), the `next lint` command is not a recognized CLI subcommand and interprets `lint` as a directory name, throwing:
     `Invalid project directory provided, no such directory: ...\apps\web\lint`.
2. **Direct ESLint flat config crash**:
   - Executing `npx eslint .` using the current `eslint.config.mjs` (which relies on `@eslint/eslintrc` `FlatCompat` to wrap `eslint-config-next`) throws:
     `TypeError: Converting circular structure to JSON` during plugin normalization.

---

## 5. Build & Performance Observations

1. **Turbopack Memory & Thread Panic**:
   - The default Next 16 `next build` (which runs Turbopack) panics on Windows under high file count and heavy dependencies (`three`, `framer-motion`, Lucide icons, etc.), exhausting OS thread handles and heap space within 2m 22s.
2. **Webpack Multi-Worker OOM**:
   - Running `next build --webpack` with default concurrency spawns multiple worker processes that exceed V8 young object promotion heap limits, causing worker exit code 134.
3. **Root Causes**:
   - Giant monolithic page files like `src/app/dashboard/orders/page.tsx` (~116KB, 28 useState hooks) and heavy 3D / animation imports (`three`, `@react-three/fiber`, `@react-three/drei`, `cobe`, `tsparticles`) compiled eagerly without route-level isolation or dynamic imports.
   - Enormous translation files loaded across routes (`en.ts`, `hi.ts`, `gu.ts`, `mr.ts` totaling >700KB).

---

## 6. Complete API Routes Inventory (201 Routes)

Below is the complete audit of all 201 `route.ts` files under `apps/web/src/app/api`.

| Route | Methods | Auth Helper | Public Hona Chahiye? |
| :--- | :--- | :--- | :--- |
| `/api/ai-assistant/chat` | POST | Koi nahi (None) | NO (Audit: AI endpoint must require auth!) |
| `/api/ai-assistant/status` | GET | Koi nahi (None) | NO (Audit: Debug/Test route!) |
| `/api/ai-assistant/test` | POST | Koi nahi (None) | NO (Audit: Debug/Test route!) |
| `/api/assistant/chat` | POST | getSessionUser | No |
| `/api/audit` | GET | getSessionUser | No |
| `/api/auth/[...nextauth]` | GET | Koi nahi (None) | No |
| `/api/auth/change-password` | POST | getSessionUser | No |
| `/api/auth/cleanup` | GET, POST | CRON_SECRET; getSessionUser | No |
| `/api/auth/complete-setup` | POST | getSessionUser | No |
| `/api/auth/forgot-password` | POST | Koi nahi (None) | Yes (Auth flow) |
| `/api/auth/google-one-tap` | POST | Koi nahi (None) | Yes (Auth flow) |
| `/api/auth/linked-accounts` | GET, POST | getSessionUser | No |
| `/api/auth/login` | POST | Koi nahi (None) | Yes (Auth flow) |
| `/api/auth/logout` | POST | getSessionUser | No |
| `/api/auth/me` | GET | getSessionUser | No |
| `/api/auth/refresh` | POST | Koi nahi (None) | No |
| `/api/auth/register` | POST | Koi nahi (None) | Yes (Auth flow) |
| `/api/auth/reset-password` | POST | Koi nahi (None) | Yes (Auth flow) |
| `/api/auth/send-otp` | POST | Koi nahi (None) | Yes (Auth flow) |
| `/api/auth/sessions` | GET, DELETE | getSessionUser | No |
| `/api/auth/switch-account` | POST | getSessionUser | No |
| `/api/auth/verify-otp` | POST | Koi nahi (None) | Yes (Auth flow) |
| `/api/banking/accounts` | GET, POST | requireRole(READ_ROLES) | No |
| `/api/banking/accounts/[id]` | PATCH, DELETE | requireRole(WRITE_ROLES) | No |
| `/api/banking/candidates` | GET | requireRole(ALLOWED_ROLES) | No |
| `/api/banking/imports` | GET | requireRole(ALLOWED_ROLES) | No |
| `/api/banking/imports/[id]/revert` | POST | requireRole(ALLOWED_ROLES) | No |
| `/api/banking/imports/commit` | POST | requireRole(ALLOWED_ROLES) | No |
| `/api/banking/imports/preview` | POST | requireRole(ALLOWED_ROLES) | No |
| `/api/banking/links/[id]/unlink` | POST | requireRole(ALLOWED_ROLES) | No |
| `/api/banking/reconciliation/summary` | GET | requireRole(ALLOWED_ROLES) | No |
| `/api/banking/transactions` | GET | requireRole(ALLOWED_ROLES) | No |
| `/api/banking/transactions/[id]/accept-variance` | POST | requireRole(ALLOWED_ROLES) | No |
| `/api/banking/transactions/[id]/exclude` | POST | requireRole(ALLOWED_ROLES) | No |
| `/api/banking/transactions/[id]/links` | GET, POST | requireRole(ALLOWED_ROLES) | No |
| `/api/banking/transactions/[id]/suggestions` | GET | requireRole(ALLOWED_ROLES) | No |
| `/api/banking/transactions/[id]/unexclude` | POST | requireRole(ALLOWED_ROLES) | No |
| `/api/billing` | GET, POST | requireAdmin | No |
| `/api/billing/[id]` | GET, PUT, DELETE | getSessionUser | No |
| `/api/billing/share-log` | POST | requireAdmin | No |
| `/api/client-materials/[id]` | DELETE | getSessionUser | No |
| `/api/clients` | GET, POST | getSessionUser | No |
| `/api/clients/[id]` | PUT, DELETE | getSessionUser | No |
| `/api/clients/[id]/materials` | GET, POST | getSessionUser | No |
| `/api/create-order` | POST | getSessionUser | No |
| `/api/cron/payment-reminders` | POST, GET | CRON_SECRET | No |
| `/api/csrf` | GET | Koi nahi (None) | Yes (Auth flow) |
| `/api/dashboard/activity` | GET | getSessionUser | No |
| `/api/dashboard/analytics` | GET | getSessionUser | No |
| `/api/dashboard/analytics/materials` | GET | getSessionUser | No |
| `/api/dashboard/live-stats` | GET | getSessionUser | No |
| `/api/dashboard/low-stock` | GET | getSessionUser | No |
| `/api/dashboard/recent-orders` | GET | getSessionUser | No |
| `/api/dashboard/revenue-chart` | GET | getSessionUser | No |
| `/api/dashboard/stats` | GET | getSessionUser | No |
| `/api/dashboard/weekly-orders` | GET | getSessionUser | No |
| `/api/dashboard/widgets` | GET, POST | getSessionUser | No |
| `/api/delivery-challans` | GET, POST | requireRole(ALLOWED_ROLES) | No |
| `/api/delivery-challans/[id]` | GET, DELETE, PATCH | requireRole(ALLOWED_ROLES) | No |
| `/api/delivery-challans/[id]/duplicate` | POST | requireRole(ALLOWED_ROLES) | No |
| `/api/delivery-challans/[id]/generate-pdf` | POST, GET | requireRole(ALLOWED_ROLES) | No |
| `/api/delivery-challans/[id]/status` | POST | requireRole(ALLOWED_ROLES) | NO (Audit: Debug/Test route!) |
| `/api/delivery-challans/order-summary` | GET | requireRole(ALLOWED_ROLES) | No |
| `/api/employees` | GET, POST | requireAdmin | No |
| `/api/employees/[id]` | GET, PUT, DELETE | requireAdmin | No |
| `/api/employees/activity` | GET | getSessionUser | No |
| `/api/expenses` | GET, POST | requireRole(["Owner", "Admin", "Staff"]) | No |
| `/api/expenses/[id]` | PUT, DELETE | requireRole(["Owner", "Admin", "Staff"]) | No |
| `/api/features` | GET, POST, PUT, DELETE | requirePlatformAdmin | No |
| `/api/inventory` | GET, POST | getSessionUser | No |
| `/api/inventory/[id]` | PUT, DELETE | getSessionUser | No |
| `/api/inventory/[id]/stock` | PATCH | getSessionUser | No |
| `/api/invite/accept` | GET, POST | Koi nahi (None) | Yes (Invitation token verified) |
| `/api/invoice/generate-pdf` | POST | getSessionUser | No |
| `/api/invoice/preview` | GET, POST | Koi nahi (None) | No |
| `/api/invoices/auto-generate` | POST | getSessionUser | No |
| `/api/machines` | GET, POST | getSessionUser | No |
| `/api/machines/[id]` | PUT, DELETE | getSessionUser | No |
| `/api/machines/downtime` | GET, POST, PATCH | getSessionUser | No |
| `/api/machines/utilisation` | GET, POST | getSessionUser | No |
| `/api/notes` | GET, POST | getSessionUser | No |
| `/api/notes/[id]` | PUT, DELETE | getSessionUser | No |
| `/api/notifications/read` | GET, POST | getSessionUser | No |
| `/api/orders` | GET, POST | getSessionUser | No |
| `/api/orders/[id]` | PUT, DELETE | getSessionUser | No |
| `/api/orders/[id]/client-materials` | GET | getSessionUser | No |
| `/api/orders/[id]/payment-status` | PUT | getSessionUser | No |
| `/api/payments` | GET, POST | requireAdmin | No |
| `/api/payments/[id]` | DELETE | requireAdmin | No |
| `/api/platform/tenants` | GET | requirePlatformAdmin | No |
| `/api/platform/tenants/[ownerId]/override` | POST, DELETE | requirePlatformAdmin | No |
| `/api/production` | GET, POST | getSessionUser | No |
| `/api/production/[id]` | GET, PUT, DELETE | getSessionUser | No |
| `/api/production/[id]/assign-staff` | PATCH | getSessionUser | No |
| `/api/production/[id]/materials` | POST | getSessionUser | No |
| `/api/production/activity-feed` | GET | getSessionUser | No |
| `/api/production/delay-prediction` | GET | getSessionUser | No |
| `/api/production/materials/history` | GET | getSessionUser | No |
| `/api/production/materials/recent` | GET | getSessionUser | No |
| `/api/production/my-productions` | GET | getSessionUser | No |
| `/api/production/progress/update` | POST, GET | getSessionUser | No |
| `/api/production/templates` | GET, POST | getSessionUser | No |
| `/api/production/templates/[id]` | DELETE | getSessionUser | No |
| `/api/profile` | GET, PUT | getSessionUser | No |
| `/api/profile/company` | GET, PUT | getSessionUser | No |
| `/api/profile/password` | PUT | getSessionUser | No |
| `/api/profile/tax` | GET, PATCH | getSessionUser | No |
| `/api/purchasing` | GET, POST | requireRole(["Owner", "Admin", "Manager", "Accountant"]) | No |
| `/api/purchasing/[id]` | GET, PATCH, DELETE | requireRole(["Owner", "Admin", "Manager", "Accountant"]) | No |
| `/api/purchasing/stats` | GET | getSessionUser | No |
| `/api/purchasing/vendors` | GET, POST | requireRole(["Owner", "Admin", "Manager", "Accountant"]) | No |
| `/api/purchasing/vendors/[id]` | PUT, DELETE | requireRole(["Owner", "Admin", "Manager", "Accountant"]) | No |
| `/api/quotes` | GET, POST | requireRole(ALLOWED_ROLES) | No |
| `/api/quotes/[id]` | GET, DELETE, PATCH | requireRole(ALLOWED_ROLES) | No |
| `/api/quotes/[id]/duplicate` | POST | requireRole(ALLOWED_ROLES) | No |
| `/api/quotes/[id]/generate-pdf` | POST, GET | requireRole(ALLOWED_ROLES) | No |
| `/api/quotes/[id]/status` | POST | requireRole(ALLOWED_ROLES) | NO (Audit: Debug/Test route!) |
| `/api/razorpay/create-order` | GET | Koi nahi (None) | No |
| `/api/razorpay/verify-payment` | GET | Koi nahi (None) | Yes (Webhook HMAC verified) |
| `/api/reminders/logs` | GET | requireRole(ALLOWED_ROLES) | No |
| `/api/reminders/preview` | POST | requireRole(ALLOWED_ROLES) | No |
| `/api/reminders/rules` | GET, POST | requireRole(ALLOWED_ROLES) | No |
| `/api/reminders/rules/[id]` | PATCH, DELETE | requireRole(ALLOWED_ROLES) | No |
| `/api/reports/payables-aging` | GET | requireRole(ALLOWED_ROLES) | No |
| `/api/reports/receivables-aging` | GET | requireRole(ALLOWED_ROLES) | No |
| `/api/reports/statement` | GET | requireRole(ALLOWED_ROLES) | No |
| `/api/reports/vendor-statement` | GET | requireRole(ALLOWED_ROLES) | No |
| `/api/sample-data` | GET, POST, DELETE | getSessionUser | No |
| `/api/setup` | POST | getSessionUser | No |
| `/api/staff/accounts` | GET, POST, PATCH | getSessionUser | No |
| `/api/staff/work-panel` | GET | getSessionUser | No |
| `/api/stripe/cancel-subscription` | POST | getSessionUser | No |
| `/api/stripe/create-subscription` | POST | getSessionUser | No |
| `/api/stripe/setup` | POST, GET | Koi nahi (None) | No |
| `/api/stripe/subscription` | GET | getSessionUser | No |
| `/api/tally/bridge-health` | GET | withAuth(Admin) | No |
| `/api/tally/bridge/devices` | GET | withAuth(Admin) | No |
| `/api/tally/bridge/devices/[id]` | DELETE | withAuth(Admin) | No |
| `/api/tally/bridge/jobs/[id]/ack` | POST | Koi nahi (None) | No |
| `/api/tally/bridge/pair` | POST | Koi nahi (None) | No |
| `/api/tally/bridge/pairing-codes` | POST | withAuth(Admin) | No |
| `/api/tally/bridge/poll` | POST | Koi nahi (None) | No |
| `/api/tally/generate-xml` | POST | withAuth(Admin) | No |
| `/api/tally/sync-status` | PATCH | withAuth(Admin) | No |
| `/api/team` | GET | getSessionUser | No |
| `/api/team/[userId]` | PUT, DELETE | getSessionUser | No |
| `/api/team/[userId]/permissions` | PUT | getSessionUser | No |
| `/api/team/invite` | POST | getSessionUser | No |
| `/api/user/modules` | GET, PUT | getSessionUser | Yes (Public landing/info) |
| `/api/users` | GET | requireAdmin | No |
| `/api/users/[id]` | PUT | requireAdmin | No |
| `/api/v1/admin/backfill-production-status` | POST | getSessionUser | No |
| `/api/v1/ai-reports` | POST | getSessionUser | No |
| `/api/v1/billing` | GET, POST | withAuth(Admin) | No |
| `/api/v1/billing/[id]` | GET, PUT, DELETE | withAuth(Admin) | No |
| `/api/v1/clients` | GET, POST | withAuth(AuthenticatedUser) | No |
| `/api/v1/clients/[id]` | GET, PUT, PATCH, DELETE | withAuth(AuthenticatedUser) | No |
| `/api/v1/clients/[id]/products` | GET, POST | withAuth(Admin) | No |
| `/api/v1/clients/[id]/products/[productId]/materials` | GET, POST | withAuth(Admin) | No |
| `/api/v1/clients/materials/[id]` | DELETE | withAuth(Admin) | No |
| `/api/v1/clients/products/[id]` | DELETE | withAuth(Admin) | No |
| `/api/v1/company/setup` | POST | getSessionUser | No |
| `/api/v1/employees` | GET, POST | withAuth(Admin) | No |
| `/api/v1/employees/[id]` | GET, PUT, DELETE | withAuth(Admin) | No |
| `/api/v1/health` | GET | Koi nahi (None) | Yes (Health check) |
| `/api/v1/inventory` | GET, POST | withAuth(AuthenticatedUser) | No |
| `/api/v1/inventory/[id]` | GET, PUT, DELETE | withAuth(AuthenticatedUser) | No |
| `/api/v1/inventory/[id]/usage` | GET | withAuth(AuthenticatedUser) | No |
| `/api/v1/inventory/backfill-usage` | GET | withAuth(AuthenticatedUser) | No |
| `/api/v1/inventory/forecast` | GET | withAuth(AuthenticatedUser) | No |
| `/api/v1/machines` | GET, POST | getSessionUser | No |
| `/api/v1/machines/[id]` | GET, PUT, DELETE | getSessionUser | No |
| `/api/v1/metrics` | GET | Koi nahi (None) | No |
| `/api/v1/notifications/channels` | GET | withAuth(AuthenticatedUser) | No |
| `/api/v1/notifications/logs` | GET, PATCH | withAuth(AuthenticatedUser) | No |
| `/api/v1/notifications/send` | POST | withAuth(AuthenticatedUser); requireAdmin | No |
| `/api/v1/notifications/stats` | GET | withAuth(AuthenticatedUser) | No |
| `/api/v1/notifications/templates` | GET, POST, PATCH | withAuth(AuthenticatedUser); requireAdmin | No |
| `/api/v1/notifications/templates/[id]` | GET, PATCH, DELETE, POST | withAuth(AuthenticatedUser); requireAdmin | No |
| `/api/v1/orders` | GET, POST | withAuth(AuthenticatedUser) | No |
| `/api/v1/orders/[id]` | GET, PUT, DELETE | withAuth(AuthenticatedUser) | No |
| `/api/v1/orders/[id]/reconcile-payment` | POST | withAuth(Admin) | No |
| `/api/v1/orders/[id]/status` | PATCH | withAuth(AuthenticatedUser) | NO (Audit: Debug/Test route!) |
| `/api/v1/orders/profit-margins` | GET | withAuth(AuthenticatedUser) | No |
| `/api/v1/payments` | GET, POST | withAuth(Admin) | No |
| `/api/v1/payments/[id]` | GET, DELETE | withAuth(Admin) | No |
| `/api/v1/payments/record` | POST | requireRole(["Owner", "Admin", "Accountant"]) | No |
| `/api/v1/production` | GET, POST | withAuth(AuthenticatedUser) | No |
| `/api/v1/production/[id]` | GET, PUT, DELETE | withAuth(AuthenticatedUser) | No |
| `/api/v1/purchase-orders/[id]/record-payment` | POST | requireRole(["Owner", "Admin", "Manager", "Accountant"]) | No |
| `/api/v1/readiness` | GET | Koi nahi (None) | Yes (Health check) |
| `/api/v1/reports/financial-years` | GET | getSessionUser | No |
| `/api/v1/reports/previous-years` | GET | getSessionUser | No |
| `/api/vendor-bills` | GET, POST | requireRole(ALLOWED_ROLES) | No |
| `/api/vendor-bills/[id]` | GET, DELETE, PATCH | requireRole(ALLOWED_ROLES) | No |
| `/api/vendor-bills/[id]/duplicate` | POST | requireRole(ALLOWED_ROLES) | No |
| `/api/vendor-bills/[id]/payments` | GET, POST | requireRole(ALLOWED_ROLES) | No |
| `/api/vendor-bills/[id]/payments/[paymentId]/void` | POST | requireRole(ALLOWED_ROLES) | No |
| `/api/vendor-bills/[id]/status` | POST | requireRole(ALLOWED_ROLES) | NO (Audit: Debug/Test route!) |
| `/api/vendor-bills/po-summary` | GET | requireRole(ALLOWED_ROLES) | No |
| `/api/verify-payment` | POST | getSessionUser | Yes (Webhook HMAC verified) |


---

## 7. Security & Auth Safai Findings (Preparation for Phase 1)

1. **Critical Unauthenticated Endpoints (Must Protect or Deprecate)**:
   - `/api/ai-assistant/chat` (POST): Completely public; triggers upstream AI calls via `AI_WEBHOOK_URL` with no rate limiting or authentication.
   - `/api/ai-assistant/status` (GET): Publicly leaks whether upstream AI webhook is configured and exposes masked URL.
   - `/api/ai-assistant/test` (POST): Allows unauthenticated arbitrary trigger of upstream webhook test ping.
   - `/api/invoice/preview` (GET, POST): Generates invoice preview without session or ownership verification.
2. **Tally Bridge Endpoints**:
   - `/api/tally/bridge/pair` (POST), `/api/tally/bridge/poll` (POST), `/api/tally/bridge/jobs/[id]/ack` (POST) rely on pairing code or device token verification. Must ensure device token lookup strictly isolates tenant data.
3. **Middleware & Role Check Gap**:
   - `apps/web/middleware.ts` currently blocks staff from admin pages predominantly when NextAuth session (`hasNextAuth`) is detected, but custom token / cookie-based staff sessions may bypass edge middleware if not validated consistently.
4. **Tenant Isolation Gap**:
   - While `getDataOwnerId()` is used in several API endpoints, Mongoose schema models lack an enforced global pre-find/pre-update hook, allowing raw queries that forget `userId` / `ownerId` to leak data between tenants.

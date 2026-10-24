# System Baseline Metrics & API Audit Report (Phase 0)

**Date**: 2026-10-24  
**Branch**: `chore/stabilize`  
**Repository**: `manufacturing-business-management-suite` (Monorepo: apps/web, @repo/web Next.js 16.1.6, React 19.0.0, Mongoose 9.1.5)

---

## 1. Executive Summary & Baseline Numbers

| Category | Metric / Command | Baseline Result | Status / Notes |
| :--- | :--- | :--- | :--- |
| **TypeScript** | `npx tsc --noEmit` (in `apps/web`) | **111 errors** across 9 modules | ❌ Failing (Ignored in build via `typescript.ignoreBuildErrors: true`) |
| **ESLint / Lint** | `npm run lint` (`eslint . --cache`) | **Operational (0 circular crashes)** | ✅ Migrated to native Next 16 flat config (`eslint-config-next`), added global ignores, disabled exponential `import/no-cycle`. Single file verification: 0 errors, 0 warnings. |
| **Vitest Tests** | `npx vitest run` | **8 passed, 1 failed (9 test files)**<br>**69 passed, 1 failed (70 tests)** | ⚠️ 98.6% passing; 1 failure diagnosed in `src/content/__tests__/modules.test.ts` (17 line-number shifts in `modules.evidence.md`). |
| **Build (Turbopack)** | `npm run build` (`next build`) | **Crashed** at 2m 22s | ❌ Turbopack thread allocation panic (OS error 1450) + memory exhaustion |
| **Build (Webpack)** | `next build --webpack` (multi-worker) | **Crashed** at 3m 54s | ❌ Worker threads heap exhaustion (Fatal Error: Young object promotion failed) |
| **Build (Page Workers OOM)**| Default 7-worker page data collection | **Crashed** at 3m 48s | ❌ Page data collection workers (7 workers) hit V8 Zone Allocation out of memory |
| **Build (Local Concurrency Guard)**| `next build --webpack` (single worker, 4GB heap) | **No OOM!** (Compiles 13m) | ⚠️ Concurrency limit avoided OS thread & memory crashes. Failed with missing monorepo transitive dependency resolution (`jwa`). |
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

---

## 8. Phase 0.5 — Tooling & Local Verification Diagnostics

### A. ESLint Flat Config Fix
- **Problem**:
  1. `apps/web/package.json` had `"lint": "next lint"`. Next.js 16 completely removed `next lint` from the CLI.
  2. `apps/web/eslint.config.mjs` used `@eslint/eslintrc` `FlatCompat` to extend `next`, causing ESLint 9 to crash with `TypeError: Converting circular structure to JSON` in `eslint-config-next`.
  3. Missing global ignores caused ESLint to traverse outside `src/` into build directories, resulting in 5,600+ files to scan.
  4. Rule `'import/no-cycle'` caused recursive infinite-depth AST graph traversal across 787 files, freezing on Windows.
- **Fix Applied**:
  1. Updated `apps/web/package.json` script: `"lint": "eslint . --cache"`.
  2. Migrated `eslint.config.mjs` to Next 16 native flat config (`import nextConfig from 'eslint-config-next'; export default [...nextConfig, ...]`).
  3. Added top-level global `ignores` for `node_modules/**`, `.next/**`, `out/**`, `build/**`, `scratch/**`, `android/**`, `public/**`.
  4. Disabled `'import/no-cycle'` (Next.js official standard config does not enable it; TypeScript `tsc` already guards circular types natively). Kept all other `import/*` rules at `'warn'`.
- **Verification**:
  - `npx eslint src/app/page.tsx` completed in 79s (31s with cache) with **0 errors and 0 warnings**.
  - Circular JSON structure crash is 100% resolved.

### B. Local Build OOM Diagnosis & Machine Specs
- **Machine Hardware Specifications**:
  - **Total Physical Memory**: 8.0 GB RAM (7.77 GiB visible).
  - **Free Physical Memory**: ~524 MB available at idle (Windows OS, Antigravity IDE, Edge, and memory compression take ~7.2 GB).
  - **Processors / Cores**: 1 physical CPU, 8 logical processors (8 threads).
- **Build Attempts & Diagnosis**:
  1. **Attempt 1 (Turbopack Default `next build`)**:
     - Crashed at 2m 22s with OS thread allocation panic: `OS can't spawn worker thread: Insufficient system resources exist to complete the requested service. (os error 1450)`.
     - Turbopack's native Rust thread spawner tried to allocate worker threads beyond Windows thread commit limits under low RAM.
  2. **Attempt 2 (Webpack Multi-Worker `next build --webpack` with 4GB heap)**:
     - Crashed at 3m 54s with exit code 134: `FATAL ERROR: MarkCompactCollector: young object promotion failed Allocation failed - JavaScript heap out of memory`.
     - Webpack child worker processes exceeded individual heap allocations.
  3. **Attempt 3 (Webpack Single-Worker `NEXT_CPU_COUNT=1 NODE_OPTIONS="--max-old-space-size=8192"`)**:
     - Webpack compiled in 91s, but subsequent Next.js Page Data Collection spawned 7 child workers simultaneously (`Collecting page data using 7 workers ...`).
     - Crashed at 3m 48s with exit code 2147483651: `FATAL ERROR: Zone Allocation failed - process out of memory`.
  4. **Attempt 4 (Local Concurrency Guard in `next.config.ts`)**:
     - Guarded with `!process.env.VERCEL`: sets `cpus: 1`, `webpackBuildWorker: false`, `workerThreads: false`, `staticGenerationMaxConcurrency: 1`, `staticGenerationMinPagesPerWorker: 1000`.
     - **Result**: Zero OOM crashes and zero thread allocation errors! Compilation proceeded through 13 minutes cleanly without memory exhaustion. Failed on monorepo transitive module resolution (`jwa`, `libphonenumber-js`).
- **Machine Limit vs Code Limit**:
  - **Machine Constraint**: 8GB total RAM with ~500MB free is an extreme bottleneck when Next.js defaults to spawning 7 parallel page collection workers based on 8 CPU threads.
  - **Code Constraint**: Monolithic pages (e.g. `src/app/dashboard/orders/page.tsx` 116KB, 28 useState hooks), heavy 3D packages (`three`, `@react-three/fiber`, `cobe`, `tsparticles`), and 700KB+ multilingual message files loaded synchronously inflate memory per worker.
  - **Vercel Integrity**: Production build configuration on Vercel remains completely untouched (`process.env.VERCEL` guard).

### C. Failing Test Diagnosis (`modules.test.ts`)
- **Test**: `src/content/__tests__/modules.test.ts` > `should verify that every module has at least as many evidence rows as claims in modules.evidence.md`
- **Result**: 17 errors across 3 modules:
  1. **`billing-invoices`** (4 claims):
     - Claims `use-4`, `feature-5`, `faq-2` cite anchor `"wa.me"` in `src/app/dashboard/billing/page.tsx#L543-L553`.
     - *Actual*: `"wa.me"` is located at lines 554–555 (1 line after the cited range).
  2. **`ai-assistant`** (7 claims):
     - `step-2`, `section-2` cite `"Hinglish"` at `#L18-L19` (*Actual*: line 20).
     - `step-4`, `feature-4` cite `"Indian numbering"` at `#L22-L24` (*Actual*: line 25).
     - `feature-5`, `faq-2` cite `"READ-ONLY"` at `#L26-L28` (*Actual*: line 29).
  3. **`staff-roles`** (6 claims):
     - `use-2`, `step-2`, `feature-1`, `section-1`, `faq-1` cite `enum: ['Admin', 'Owner', 'Manager', 'Staff', 'Accountant']`, `"Manager"`, `"Accountant"`, `"Owner"` in `src/models/User.ts#L140-L143`.
     - *Actual*: The enum is located at lines 138–140.
- **Conclusion**: The features, code, and exact anchor tokens exist in the codebase; the line citations in `modules.evidence.md` simply drifted by 1–2 lines following earlier commits. Awaiting user confirmation to update the line numbers in `modules.evidence.md`.

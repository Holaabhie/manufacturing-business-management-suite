# Stabilization Changelog & Architectural Ledger

This document tracks all stabilization, modularization, performance, security, and cleanup initiatives completed from Phase 0 through Part C.6 of the manufacturing management platform.

---

## 1. Executive Summary & Core Milestones

| Milestone | Key Accomplishment | Verification & Proof |
| :--- | :--- | :--- |
| **Phase 0: Baseline & Audits** | Established build performance, bundle weight, and dependency metrics prior to refactors. | `npm run build` logs, bundle sizes, depcheck audit. |
| **Phase 1: Marketing Static Engine** | Converted marketing routes (`/`, `/about`, `/privacy`, `/terms`, `/refund`, `/contact`) to static (`○ Static`). Auth redirects shifted cleanly to Edge middleware. | Route table verification in build output; Vitest middleware cookie tests. |
| **Phase 2: Database Layer Unification** | Purged abandoned Prisma (`packages/database`), Drizzle-ORM, and LibSQL dependencies. Retained single MongoDB source of truth. | 0 references in `apps/web/src`; package removal via clean lockfile. |
| **Phase 3: Graphics & Animation Pruning** | Pruned unused 3D and canvas libraries (`three`, `@react-three/*`, `three-globe`, `@tsparticles/*`, `cobe`, `dotted-map`, `lottie-react`, `swiper`, `embla-carousel-react`). | Zero bundle weight from 3D shaders; clean test run. |
| **Phase 4: PWA Kill-Switch & Cache Safety** | Deployed passive unregistration service worker (`sw.js`) without disruptive `client.navigate()` to prevent active form reloads. | Production manual & automated tests; verified no infinite cache traps. |
| **Phase 5: Billing Modularization** | Decomposed monolithic 1,600+ line billing page into clean domain components (`components/billing/`). Full parity verified for 4 KPIs, long-press mobile sheets, PDFs, and Tally export. | `BillingParity.test.ts` (6 tests) and `BillingMobileCards.render.test.tsx` (5 jsdom tests). |
| **Phase 6: Purchasing Modularization** | Decomposed 1,874-line purchasing monolith into clean orchestrator (254 lines) and modular sub-components. Restored all 4 KPIs, actions trigger, filter states, and admin delete guards. | `PurchasingParity.test.ts` (7 tests) and `PurchasingUI.render.test.tsx` (5 jsdom tests). |
| **Phase 3b: Centralized Data Fetching** | Migrated raw `fetch()` calls in billing, purchasing, and vendor bills to `apiClient` with React Query cache invalidations. | Coordinated query key invalidations on invoices, bills, purchasing, and inventory. |
| **Auth & Permissions Alignment** | Replaced rigid string checks (`userRole === "Staff"`) with granular 36 dot-notation keys across 9 domains via `useRole().can(key)`. | Role permission matrix verified; Staff preset backward compatibility preserved. |

---

## 2. Granular Permissions Architecture

The application defines 36 discrete permissions across 9 business operational domains (`apps/web/src/lib/permissions.ts`):

- **Clients**: `clients.view`, `clients.create`, `clients.edit`, `clients.delete`
- **Orders**: `orders.view`, `orders.create`, `orders.edit`, `orders.delete`
- **Inventory**: `inventory.view`, `inventory.create`, `inventory.edit`, `inventory.delete`
- **Invoices**: `invoices.view`, `invoices.create`, `invoices.edit`, `invoices.delete`
- **Purchasing**: `purchasing.view`, `purchasing.create`, `purchasing.edit`, `purchasing.delete`
- **Production**: `production.view`, `production.create`, `production.edit`, `production.delete`
- **Delivery Challans**: `delivery_challans.view`, `delivery_challans.create`, `delivery_challans.edit`, `delivery_challans.delete`
- **Reports**: `reports.view`, `reports.export`
- **Settings**: `settings.view`, `settings.edit`, `users.manage`, `roles.manage`, `audit.view`, `backup.manage`

### Role Permission Mapping Matrix

| Role | Default Access | Invoices View (`invoices.view`) | Orders Delete (`orders.delete`) |
| :--- | :--- | :--- | :--- |
| **Owner / Admin** | Unrestricted bypass (`*`) | Granted (true) | Granted (true) |
| **Manager** | Operational domain access | Granted (true) | Denied (false) |
| **Staff** | Restricted task execution | Denied (false, identical to legacy) | Denied (false, identical to legacy) |
| **Accountant** | Financial oversight | Granted (true) | Denied (false) |

`useRole()` exports a memoized `can(permissionKey: string): boolean` helper that respects custom permission overrides while maintaining strict safety defaults.

---

## 3. Data Fetching & Query Invalidation Standards

All data fetching in money-handling modules (`billing`, `purchasing`, `vendor-bills`) has been upgraded from uncoordinated raw `fetch()` calls to centralized `apiClient` requests coupled with React Query cache invalidation (`queryKeys`):

1. **Billing Lifecycle**:
   - Status transitions (Draft -> Sent -> Paid) trigger invalidation of `queryKeys.invoices.all`, `queryKeys.billing.all`, and `queryKeys.stats.all`.
   - Creating or deleting invoices refreshes the list and summary metrics automatically.
2. **Purchasing Lifecycle**:
   - Marking purchase orders as "Received" triggers coordinated invalidation of `queryKeys.purchasing.all` and `queryKeys.inventory.all`.
   - Recording PO payments invalidates `queryKeys.purchasing.all` and `queryKeys.banking.all`.
3. **Vendor Bills Lifecycle**:
   - Bill creation, updates, and cancellations invalidate `queryKeys.vendorBills.all`.
   - Payment recordings use idempotent posting (`apiClient.postIdempotent`) and invalidate `queryKeys.vendorBills.all` and `queryKeys.banking.all`.

---

## 4. Purchasing Parity Re-Audit

Grep verification against original monolithic `purchasing/page.tsx` (`30c5980^`):
- **4 StatWidget KPI Cards**: Fully matched with exact translation keys (`kpi.ordersTotal`, `kpi.pendingDeliveries`, `kpi.activeVendors`, `kpi.monthlySpend`).
- **Tab Navigation**: Orders and Vendors sub-views preserved with animated badges.
- **Search & Filtering**: Search term debouncing and MonthYear filter preserved.
- **Mobile Cards & Desktop Tables**: `MobileTableCards` with `actionsTrigger` top-right button menu; desktop tables with fixed layout and responsive cells.
- **Actions**: "Mark as Received" transition, View Details drawer, Add Vendor dialog, Create PO modal, Record Payment modal.
- **Delete Guard**: `canDeleteOrders` check requires `orders.delete` or `isAdmin`.
- **Cached Page**: `useCachedPage` restoreState, persist, and scroll position retention intact.

---

## 5. Known Gaps & Recommended Owner Next Steps

1. **Tally Export Polling**:
   - `TallyExportButton` currently issues 8 sequential client-side `fetch()` calls to sync ledgers, vouchers, and inventory. Recommended to consolidate into a single asynchronous background export job (`POST /api/v1/tally/export-job`).
2. **Server-Side Rendered Dynamic Locale Cookies**:
   - Locale is read from cookies on client-mount. Full SSR i18n hydration can be introduced when Next.js middleware switches to subdomain or path-based locale routing.
3. **Database Performance Indexing**:
   - Multi-tenant indexes on `{ tenantId: 1, createdAt: -1 }` and `{ tenantId: 1, status: 1 }` should be formally monitored via MongoDB Atlas Index Advisor.

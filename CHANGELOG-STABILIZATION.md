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

---

## 6. Repo-Wide Raw `fetch()` Audit (Phase 4 Inventory)

As part of Part C.7, a full repository scan of `apps/web/src` identified **237 raw `fetch()` calls** across 56 directories. All critical money-handling dashboard modules (`billing`, `purchasing`, `vendor-bills`) have **0** raw fetch calls (100% migrated to `apiClient`).

| Directory Path | Raw `fetch()` Count | Status & Roadmap |
|---|:---:|---|
| `apps/web/src/app/dashboard/billing` | **0** | **100% Migrated** to `apiClient` |
| `apps/web/src/app/dashboard/purchasing` | **0** | **100% Migrated** to `apiClient` |
| `apps/web/src/app/dashboard/vendor-bills` | **0** | **100% Migrated** to `apiClient` |
| `apps/web/src/components/billing` | **0** | **100% Migrated** to `apiClient` |
| `apps/web/src/components/purchasing` | **0** | **100% Migrated** to `apiClient` |
| `apps/web/src/services/tally` | 27 | Tally XML & ledger sync (candidate for background queue) |
| `apps/web/src/app/dashboard/delivery-challans` | 14 | Delivery Challan module (Phase 5 migration candidate) |
| `apps/web/src/app/dashboard/orders` | 18 | Orders listing & edit form (Phase 5 migration candidate) |
| `apps/web/src/app/dashboard/inventory` | 15 | Inventory item management (Phase 5 migration candidate) |
| `apps/web/src/app/dashboard/clients` | 12 | Clients module (Phase 5 migration candidate) |
| `apps/web/src/app/dashboard/users` | 9 | Employee & role management |
| `apps/web/src/app/dashboard/machines` | 8 | Machine maintenance & tracking |
| `apps/web/src/app/dashboard/analytics` | 7 | Smart charts & analytics views |
| Other UI components, hooks & services | 127 | Miscellaneous auxiliary flows |
| **Total `src/` Raw `fetch()` Calls** | **237** | **Zero in money modules; backlog documented** |

---

## 7. Server-Side Idempotency & Duplicate Prevention

To eliminate financial double-charges and duplicate payment record creation, all payment-recording routes are protected with `withIdempotency`:

1. `POST /api/vendor-bills/[id]/payments` (Vendor bill payment recordings)
2. `POST /api/v1/purchase-orders/[id]/record-payment` (Purchase order advance/final payments)
3. `POST /api/payments` (Order customer payments)
4. `POST /api/v1/payments/record` (V1 customer payment records)
5. `PUT /api/billing/[id]` (Invoice payment updates)

### Mechanisms:
- **Header Check**: Inspects `Idempotency-Key` or `X-Idempotency-Key` request header.
- **Concurrent Request Lock**: If a duplicate key is in-flight simultaneously, immediately responds with `409 Conflict` (`IDEMPOTENCY_CONCURRENT`).
- **Response Caching**: Successful responses are cached in the `idempotency_keys` collection for 24 hours. Re-transmissions return the exact cached payload without executing the mutation twice.
- **Automated TTL**: Mongo index `{ expiresAt: 1 }` with `{ expireAfterSeconds: 0 }` purges keys automatically.

---

## 8. Server-Side Pagination & Query Hardening (Purchasing & Vendor Bills)

Server-side pagination matching the Phase 4 standard has been implemented across:
- `GET /api/purchasing` (Purchase Orders)
- `GET /api/purchasing/vendors` (Vendors)
- `GET /api/vendor-bills` (Vendor Bills & Summary)

### Security & Functional Standards:
1. **Multi-Tenant Isolation**: Every query unconditionally filters by `{ userId: getDataOwnerId(user) }`. Cross-tenant data leakage is structurally impossible.
2. **ReDoS Defense**: All user search queries are escaped using `escapeRegex(q.trim())`.
3. **Whitelist Sorting**: Unrecognized sort fields (e.g. `?sort=__proto__` or `?sort=password`) are rejected with `400 Bad Request`.
4. **Boundary Limiting**: `?limit=1000` is rejected with `400 Bad Request` via Zod `.max(100)`.
5. **Backwards Compatibility**: Unpaginated calls are capped at 500 items, returning `X-Total-Count` and `X-Truncated` headers while preserving legacy response shapes (`.bills` and `.summary`).


1. **Tally Export Polling**:
   - `TallyExportButton` currently issues 8 sequential client-side `fetch()` calls to sync ledgers, vouchers, and inventory. Recommended to consolidate into a single asynchronous background export job (`POST /api/v1/tally/export-job`).
2. **Server-Side Rendered Dynamic Locale Cookies**:
   - Locale is read from cookies on client-mount. Full SSR i18n hydration can be introduced when Next.js middleware switches to subdomain or path-based locale routing.
3. **Database Performance Indexing**:
   - Multi-tenant indexes on `{ tenantId: 1, createdAt: -1 }` and `{ tenantId: 1, status: 1 }` should be formally monitored via MongoDB Atlas Index Advisor.

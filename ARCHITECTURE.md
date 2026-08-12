# IND Manager — Comprehensive System Architecture & Developer Guide

> **Target Audience:** AI Agents, Full-Stack Engineers, System Architects  
> **Last Verified against Codebase:** August 2026  
> **Monorepo Root:** `c:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite`

---

## 1. Project Overview

### Business Function & Domain
**IND Manager** is an enterprise-grade Manufacturing SMB SaaS built specifically for Indian Small-to-Medium Manufacturing Businesses. The application covers the complete end-to-end operational lifecycle:
$$\text{Purchasing / Vendors} \longrightarrow \text{Inventory Management} \longrightarrow \text{Production \& Machine Tracking} \longrightarrow \text{Sales Orders} \longrightarrow \text{Invoicing \& GST} \longrightarrow \text{Payments \& Tally ERP Sync} \longrightarrow \text{Analytics \& AI Reporting}$$

It features multi-language support (English, Hindi, Gujarati, Marathi), India-specific compliance (GSTIN, PAN, HSN/SAC codes, state codes), Tally XML export/bridge synchronization, multi-role RBAC (Owner, Manager, Staff, Accountant), real-time machine downtime tracking, and iOS/Android cross-platform support via Capacitor.

### Core Technology Stack & Verified Versions

| Category | Technology | Exact Version (from `package.json`) | Purpose / Context |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js | `^16.1.4` | App Router, Server/Client components, Static Export |
| **UI Library** | React / React DOM | `19.0.0` | Modern React 19 concurrent features |
| **Monorepo Tool** | Turbo | `^2.8.7` | Build orchestration across `/apps` and `/packages` |
| **Database Driver** | MongoDB Driver | `^6.19.0` (web) / `^7.5.0` (root) | Raw `getDb()` collection queries for high-performance API routes |
| **ODM Layer** | Mongoose | `^9.1.5` | Schema validation and model definitions in `src/models/` |
| **Styling System** | Tailwind CSS | `^4` (`@tailwindcss/postcss ^4`) | Utility-first styling with `@theme` CSS variable integration |
| **Mobile Runtime** | Capacitor | `^8.0.0` (cli/core/ios/android) | Hybrid iOS (`@capacitor/ios`) & Android (`@capacitor/android`) runtime |
| **Internationalization**| next-intl | `^4.9.0` | Multi-language translation system (EN, HI, GU, MR) |
| **Animations** | Framer Motion / Motion | `^12.23.24` | Page transitions, sheet animations, micro-interactions |
| **Data Fetching** | TanStack React Query | `^5.0.0` | Client-side query caching, invalidation & optimistic UI updates |
| **Table Engine** | TanStack React Table | `^8.21.3` | Dynamic sorting, filtering, and pagination |
| **Validation** | Zod | `^4.2.1` | Domain schema validation across forms and API routes |
| **Authentication** | NextAuth / Better-Auth | `^5.0.0-beta.30` / `^1.4.10` | Session management, OAuth (Google), OTP authentication |
| **Payment Gateways** | Stripe / Razorpay | Stripe `^19.2.0`, Razorpay `^2.9.6` | Subscription management & Indian UPI/netbanking integration |
| **PDF & Export** | jsPDF / SheetJS | jsPDF `^4.1.0`, xlsx `^0.18.5` | GST Invoice PDF generation & Excel report exports |
| **Charting** | Recharts / Cobe | Recharts `^3.0.2`, Cobe `^0.6.5` | Analytics visualization & 3D Interactive Globe |

---

## 2. Directory Structure Map

```
manufacturing-business-management-suite/
├── .agents/                      # Agent rules and bug fix historical log (AGENTS.md)
├── apps/                         # Workspace Applications
│   ├── api/                      # Isolated NestJS Enterprise API Microservice
│   │   ├── src/                  # NestJS modules, controllers, and services
│   │   └── package.json          # NestJS dependency declaration
│   ├── auth-server/              # Express/Node Auth Server Microservice
│   │   ├── controllers/          # Auth route logic (JWT, OTP, Sessions)
│   │   ├── middleware/           # Session token & rate-limiting middleware
│   │   └── server.js             # Main server entry point
│   └── web/                      # Main Next.js 16 App Router SaaS Platform
│       ├── capacitor.config.ts   # Capacitor mobile app configuration
│       ├── messages/             # i18n translation dictionaries (en, hi, gu, mr)
│       ├── package.json          # Web app dependencies & scripts
│       └── src/
│           ├── app/              # App Router pages and API routes
│           │   ├── (auth routes) # login, onboarding, setup, forgot-password
│           │   ├── api/          # Next.js API Endpoints (/api/v1/* and /api/*)
│           │   ├── dashboard/    # Dashboard feature pages (/dashboard/*)
│           │   ├── globals.css   # Main design system & global CSS rules (4000+ lines)
│           │   └── layout.tsx    # Root layout with QueryProvider, LocaleProvider, ThemeProvider
│           ├── components/       # Reusable React UI & Feature Components
│           │   ├── ai/           # AI Assistant drawer, smart input bar, chat widgets
│           │   ├── billing/      # Invoice generators, Tally XML export button
│           │   ├── dashboard/    # Bento widgets, customize dashboard sheets
│           │   ├── gates/        # RoleGate, PermissionGate, UpgradeModal
│           │   ├── inventory/    # Stock adjust modals, Add Material sheets
│           │   ├── notifications/# Notification feed, channel chips, status icons
│           │   ├── orders/       # Order completion modals, status step timeline
│           │   ├── production/   # Edit production sheet, assign staff dialog
│           │   ├── ui/           # Primitive UI design system (IOSCard, StatWidget, button, dialog, table)
│           │   └── CommandPalette.tsx # Global command palette (Cmd+K)
│           ├── hooks/            # Shared Custom React Hooks (useCompanyProfile, useFormatters, etc.)
│           ├── infrastructure/   # Cross-cutting concerns (logging, events, queues, resilience)
│           ├── lib/              # Utility libraries, auth helpers, PDF engines, Razorpay
│           │   ├── hooks/        # Core React Query hooks (use-orders, use-permissions, use-role)
│           │   └── utils/        # Formatters, currency conversion, GST calculators
│           ├── models/           # Mongoose Data Models (User, Party, SalesOrder, Item, etc.)
│           ├── modules/          # Clean Architecture / DDD Domain Modules
│           │   ├── billing/      # Domain schemas, services, and MongoDB repositories
│           │   ├── clients/      # Client management domain & infrastructure
│           │   ├── employees/    # User/Employee domain logic
│           │   ├── inventory/    # Stock domain & transaction repository
│           │   ├── machines/     # Machine downtime & maintenance repository
│           │   ├── orders/       # Order processing & lifecycle management
│           │   ├── payments/     # Payment reconciliation & ledger domain
│           │   ├── production/   # Job card & production batch domain
│           │   └── purchasing/   # Vendor & purchase order management
│           ├── services/         # Third-party integrations (Tally bridge XML generator)
│           ├── shared/           # Shared types, middleware, and domain configs
│           ├── styles/           # Auxiliary stylesheets
│           ├── types/            # TypeScript type definitions
│           └── utils/            # General helper functions
├── docs/                         # Project Documentation & ADRs
│   ├── adr/                      # Architecture Decision Records
│   ├── architecture/             # API versioning, SLOs, performance docs
│   ├── runbooks/                 # Operational runbooks
│   └── schema.md                 # MongoDB collection schema specifications
├── packages/                     # Shared Monorepo Packages
│   ├── database/                 # Shared database definitions & Prisma schemas
│   ├── tsconfig/                 # Shared TypeScript configuration presets
│   └── ui/                       # Cross-app shared UI package
├── docker-compose.yml            # Docker container deployment config
├── package.json                  # Monorepo root configuration & scripts
└── turbo.json                    # Turborepo build pipeline config
```

---

## 3. Routing Map

The application uses Next.js 16 App Router. All routes under `apps/web/src/app/` are client-rendered (`'use client'`) with optimized data fetching on mount.

| Route Path | File Location | Render Type | Data Fetched On Load / API Requests |
| :--- | :--- | :--- | :--- |
| `/` | `app/page.tsx` | Client Component | Static landing page redirect / session check |
| `/access-denied` | `app/access-denied/page.tsx` | Client Component | None (Displays access error message) |
| `/admin/login` | `app/admin/login/page.tsx` | Client Component | `POST /api/auth/login` |
| `/ai-assistant` | `app/ai-assistant/page.tsx` | Client Component | `GET /api/ai-assistant/status` |
| `/forgot-password` | `app/forgot-password/page.tsx` | Client Component | `POST /api/auth/forgot-password`, `POST /api/auth/verify-otp` |
| `/invite/accept` | `app/invite/accept/page.tsx` | Client Component | `GET /api/invite/accept?token=...` |
| `/login` | `app/login/page.tsx` | Client Component | `POST /api/auth/login`, `POST /api/auth/send-otp` |
| `/offline` | `app/offline/page.tsx` | Client Component | None (PWA fallback page) |
| `/onboarding` | `app/onboarding/page.tsx` | Client Component | `POST /api/v1/company/setup` |
| `/setup` | `app/setup/page.tsx` | Client Component | `GET /api/auth/me`, `POST /api/setup` |
| `/staff/login` | `app/staff/login/page.tsx` | Client Component | `POST /api/auth/login`, `POST /api/auth/verify-otp` |
| `/staff/setup` | `app/staff/setup/page.tsx` | Client Component | `POST /api/auth/change-password`, `POST /api/auth/complete-setup` |
| `/dashboard` | `app/dashboard/page.tsx` | Client Component | `GET /api/dashboard/stats`, `/api/auth/me`, `/api/dashboard/widgets`, `/api/dashboard/revenue-chart`, `/api/dashboard/activity`, `/api/dashboard/weekly-orders` |
| `/dashboard/activity` | `app/dashboard/activity/page.tsx` | Client Component | `GET /api/dashboard/activity` |
| `/dashboard/analytics` | `app/dashboard/analytics/page.tsx` | Client Component | `GET /api/dashboard/analytics`, `/api/v1/orders/profit-margins` |
| `/dashboard/assistant` | `app/dashboard/assistant/page.tsx` | Client Component | `POST /api/assistant/chat`, `GET /api/ai-assistant/status` |
| `/dashboard/audit` | `app/dashboard/audit/page.tsx` | Client Component | `GET /api/audit` |
| `/dashboard/billing` | `app/dashboard/billing/page.tsx` | Client Component | `GET /api/billing`, `/api/invoices/auto-generate` |
| `/dashboard/clients` | `app/dashboard/clients/page.tsx` | Client Component | `GET /api/clients`, `/api/v1/clients` |
| `/dashboard/folio` | `app/dashboard/folio/page.tsx` | Client Component | `GET /api/v1/inventory`, `/api/orders` |
| `/dashboard/inventory` | `app/dashboard/inventory/page.tsx` | Client Component | `GET /api/v1/inventory`, `/api/inventory`, `GET /api/v1/inventory/forecast` |
| `/dashboard/machines` | `app/dashboard/machines/page.tsx` | Client Component | `GET /api/machines`, `/api/machines/utilisation`, `/api/machines/downtime` |
| `/dashboard/notifications` | `app/dashboard/notifications/page.tsx` | Client Component | `GET /api/v1/notifications/logs`, `/api/v1/notifications/stats` |
| `/dashboard/orders` | `app/dashboard/orders/page.tsx` | Client Component | `GET /api/v1/orders`, `GET /api/clients`, `GET /api/v1/inventory`, `/api/profile/company` |
| `/dashboard/orders/create` | `app/dashboard/orders/create/page.tsx` | Client Component | `GET /api/v1/clients`, `GET /api/v1/inventory` |
| `/dashboard/orders/[id]/edit`| `app/dashboard/orders/[id]/edit/page.tsx` | Client Component | `GET /api/v1/orders/${id}` |
| `/dashboard/payments` | `app/dashboard/payments/page.tsx` | Client Component | `GET /api/payments`, `GET /api/orders` |
| `/dashboard/production` | `app/dashboard/production/page.tsx` | Client Component | `GET /api/v1/production`, `GET /api/production/activity-feed` |
| `/dashboard/production/create` | `app/dashboard/production/create/page.tsx` | Client Component | `GET /api/v1/orders`, `GET /api/inventory`, `GET /api/machines`, `GET /api/employees` |
| `/dashboard/production/my-productions` | `app/dashboard/production/my-productions/page.tsx` | Client Component | `GET /api/production/my-productions` |
| `/dashboard/production/[id]` | `app/dashboard/production/[id]/page.tsx` | Client Component | `GET /api/production/${id}` |
| `/dashboard/profile` | `app/dashboard/profile/page.tsx` | Client Component | `GET /api/profile`, `GET /api/auth/linked-accounts` |
| `/dashboard/purchasing` | `app/dashboard/purchasing/page.tsx` | Client Component | `GET /api/purchasing`, `/api/purchasing/vendors`, `/api/purchasing/stats` |
| `/dashboard/reports/previous-years` | `app/dashboard/reports/previous-years/page.tsx` | Client Component | `GET /api/v1/reports/financial-years`, `GET /api/v1/reports/previous-years` |
| `/dashboard/settings` | `app/dashboard/settings/page.tsx` | Client Component | `GET /api/profile/company`, `GET /api/tally/bridge-health`, `/api/user/modules` |
| `/dashboard/settings/team` | `app/dashboard/settings/team/page.tsx` | Client Component | `GET /api/team` |
| `/dashboard/upgrade` | `app/dashboard/upgrade/page.tsx` | Client Component | `GET /api/auth/me`, `GET /api/stripe/subscription` |
| `/dashboard/users` | `app/dashboard/users/page.tsx` | Client Component | `GET /api/auth/me`, `GET /api/employees` |
| `/dashboard/users/[id]` | `app/dashboard/users/[id]/page.tsx` | Client Component | `GET /api/employees/${id}` |

---

## 4. Component Relationship Map

### Key Shared Primitive Components

```
                     ┌──────────────────────────────────────┐
                     │         apps/web/src/app/            │
                     │          dashboard/layout            │
                     └──────────────────┬───────────────────┘
                                        │
      ┌─────────────────────────────────┼─────────────────────────────────┐
      ▼                                 ▼                                 ▼
┌──────────────┐                ┌──────────────┐                ┌──────────────────┐
│ StatWidget   │                │   IOSCard    │                │  CommandPalette  │
│ (10+ pages)  │                │ (10+ pages)  │                │ (Global Cmd+K)   │
└──────────────┘                └──────────────┘                └──────────────────┘
      │                                 │                                 │
      ├─ inventory/page                 ├─ activity/page                  └─ layout.tsx
      ├─ users/page                     ├─ analytics/page
      ├─ purchasing/page                ├─ billing/page
      ├─ production/page                ├─ clients/page
      ├─ payments/page                  ├─ inventory/page
      ├─ orders/page                    ├─ machines/page
      ├─ notifications/page             ├─ notifications/page
      └─ machines/page                  └─ payments/page
```

### Component Details & Blast Radius Inventory

| Component Name | File Path | Imported By / Used In | Props & Customization Overrides | Blast Radius |
| :--- | :--- | :--- | :--- | :--- |
| **`StatWidget`** | `components/ui/StatWidget.tsx` | `/dashboard` (overview, inventory, users, purchasing, production, payments, orders, notifications, machines) | `label`, `value`, `icon`, `color`, `prefix`, `delay`, `trend`, `unit`. Wrap in `motion.div` with mandatory `min-w-0 w-full overflow-hidden`. | **CRITICAL (High Blast Radius - 10+ pages)** |
| **`IOSCard`** | `components/ui/ios/IOSCard.tsx` | `/dashboard` (activity, analytics, billing, clients, inventory, machines, notifications, orders, payments) | `children`, `className`, `variant` (`default`, `glass`, `solid`), `onClick`. Requires theme CSS variables for dark/light mode. | **CRITICAL (High Blast Radius - 10+ pages)** |
| **`CommandPalette`** | `components/CommandPalette.tsx` | `app/dashboard/layout.tsx`, `components/ui/InlineMobileSearch.tsx` | `open`, `onOpenChange`. Invokes `useCommandPaletteSearch` hook for global search across orders, inventory, clients. | **HIGH (App-wide Navigation)** |
| **`dialog.tsx`** | `components/ui/dialog.tsx` | `clients/page`, `orders/page`, `inventory/page`, `payments/page`, `billing/page`, `machines/page`, `folio/page` | `showCloseButton`, `fullScreen`. Responsive: Bottom sheet on mobile (`<md`), centered modal on desktop (`md+`). Uses CSS variables `var(--overlay-sheet-bg)`. | **CRITICAL (28+ Import Sites)** |
| **`select.tsx`** | `components/ui/select.tsx` | `analytics/page`, `billing/page`, `clients/page`, `inventory/page`, `machines/page`, `orders/create/page`, `setup/page` | Standard Radix select wrapper. Customized with `var(--overlay-sheet-bg)` and glass hover styles. | **CRITICAL (71+ Import Sites)** |
| **`button.tsx`** | `components/ui/button.tsx` | Used across almost all pages and dialogs | `variant` (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`), `size`. Integrates Tailwind `cn()` merge. | **CRITICAL (114+ Import Sites)** |
| **`table.tsx`** | `components/ui/table.tsx` | `orders/page`, `inventory/page`, `payments/page`, `billing/page`, `folio/page`, `dashboard/page` | Requires `table-fixed` parent with `w-[Npx]` headers and `min-w-0 truncate` on cell contents to avoid layout blowout. | **CRITICAL (45+ Import Sites)** |
| **`sheet.tsx`** | `components/ui/sheet.tsx` | `dashboard/layout.tsx`, `CustomizeDashboardSheet.tsx`, `MoreMenuSheet.tsx`, `EnterpriseDataTable.tsx` | Slide-over drawer for mobile navigation, filters, and action menus. | **HIGH (28+ Import Sites)** |
| **`form.tsx`** / **`field.tsx`** | `components/ui/form.tsx`, `components/ui/field.tsx` | Used in all data creation and edit forms | React Hook Form + Zod resolution wrapper. | **CRITICAL (160+ Import Sites)** |

---

## 5. globals.css Module Map

`apps/web/src/app/globals.css` contains 4,024 lines of curated CSS rules, design tokens, Radix lifecycle keyframes, and component systems.

### Line Range Section Breakdown

| Line Range | Section Description | Purpose & Rules |
| :--- | :--- | :--- |
| **L1 – 176** | Imports, Tailwind Base & PostCSS Setup | `@import "tailwindcss"`, font definitions (Inter/Outfit), root reset rules |
| **L177 – 222** | Dialog & Sheet Keyframes | Radix sheet lifecycle animations (`sheetSlideUp`, `sheetSlideDown`, `dialogScaleIn`) |
| **L223 – 281** | Glass Dropdown & Overlay Portals | Radix popper z-index management (`z-[1000]`), backdrop blur values |
| **L282 – 476** | `:root` Light Mode Design Tokens | Standard light theme variables (`--background`, `--foreground`, `--primary`, `--border`) |
| **L477 – 724** | `.dark` Dark Mode Design Tokens | Dark theme variable definitions (`#0F1117` base background, dark glass surface tokens) |
| **L725 – 740** | WebKit Autofill Overrides | Prevents default yellow background in input fields in dark mode |
| **L741 – 1080**| Activity Timeline & WebKit Scrollbars | Scrollbar styling and hide-scrollbar utilities (`.scrollbar-hide`) |
| **L1081 – 1416**| Enterprise Surface Classes | Surface containers, card backgrounds without blur (performance optimization) |
| **L1417 – 1659**| Stitch Design Tokens & Mini Components| Progress bars, status dots, icon variants, shimmer shells |
| **L1660 – 1700**| `.kpi-panel` & Card Grid System | Responsive CSS Grid system for KPI cards (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`) |
| **L1701 – 1965**| Glassmorphic Card & Content Layout | Base card styling, hover effects, light/dark mode overrides |
| **L1966 – 2054**| KPI Card Light Mode Overrides | Color adjustments for `.kpi-card` in light theme |
| **L2055 – 2082**| Desktop KPI Compaction (`@media lg+`) | Compact padding and gap adjustments for desktop viewports |
| **L2088 – 2478**| Dark Glass Cards & Activity Tables | Table styling, quick action buttons, dark tooltip styles |
| **L2594 – 2863**| Glass Controls & Premium Inputs | `GlassCard`, `GlassInput`, `TogglePill`, hero ambient glow |
| **L2870 – 3403**| IND Theme Component System | Custom `.ind-card`, `.ind-badge`, `.ind-btn`, `.ind-stats-row`, forecast bars |
| **L3404 – 3631**| IND Utility Classes & Mobile Nav | Bottom nav icons, top navbar containers, activity rows |
| **L3637 – 3983**| AI Assistant Workspace & Cards | AI chat bubble styling, glass response cards, floating input bar |
| **L3984 – 4024**| Mobile Overflow Safety | `overflow-x: hidden`, touch containment rules |

### Cascade Order & Known Specificity Issues

> [!WARNING]  
> **Media Query Order Specificity Risk:**  
> In `globals.css`, the `@media (min-width: 1024px)` desktop compaction block (**L2055–2082**) MUST be maintained in correct cascade order relative to base `.kpi-card` and `.kpi-panel` definitions (**L1660–2054**). If a base class rule is declared *below* the `@media` query, the base rule will override the media query's desktop padding/gap rules due to equal CSS specificity! Always place viewport-specific `@media` blocks *after* all base component rules.

### Master Design Token Table

| Token Variable | Light Mode Value | Dark Mode Value | Usage Context |
| :--- | :--- | :--- | :--- |
| `--background` | `#F3F5F9` | `#0F1117` | Page root background color |
| `--foreground` | `#0F172A` | `#F1F5F9` | Primary text color |
| `--card` | `rgba(255, 255, 255, 0.72)` | `rgba(255, 255, 255, 0.04)` | Card surface background |
| `--popover` | `#FFFFFF` | `#1E293B` | Floating dropdown & popover bg |
| `--primary` | `#2563EB` | `#3B82F6` | Primary action buttons & active states |
| `--primary-foreground` | `#FFFFFF` | `#FFFFFF` | Text on primary buttons |
| `--muted` | `#F1F5F9` | `#1E293B` | Muted container background |
| `--muted-foreground` | `#94A3B8` | `rgba(241, 245, 249, 0.5)` | Secondary / subtitle text color |
| `--border` | `rgba(15, 23, 42, 0.06)` | `rgba(241, 245, 249, 0.08)` | Card & section borders |
| `--overlay-backdrop` | `rgba(15, 23, 42, 0.4)` | `rgba(0, 0, 0, 0.7)` | Modal backdrop tint |
| `--overlay-sheet-bg` | `#FFFFFF` | `#181B25` | Bottom sheet / Dialog container bg |

---

## 6. State & Data Flow

### React Query Setup & Cache Policy
- **Provider Location:** `apps/web/src/components/QueryProvider.tsx` (wraps root `layout.tsx`)
- **Default Cache Rules:**
  - `staleTime`: 5 minutes (`5 * 60 * 1000`) — prevents redundant API fetches during user navigation.
  - `gcTime`: 30 minutes (`30 * 60 * 1000`) — keeps background data retained in memory.
  - `refetchOnWindowFocus`: `false` — avoids disruptive UI refetches on browser tab switching.
  - `retry`: `1` — fast failure handling.

### Query Keys Convention (`queryKeys`)
Query keys are centralized in `apps/web/src/lib/hooks/use-orders.ts`:
```typescript
export const queryKeys = {
  orders: ['orders'] as const,
  order: (id: string) => ['orders', id] as const,
  clients: ['clients'] as const,
  inventory: ['inventory'] as const,
  payments: ['payments'] as const,
  stats: ['dashboard-stats'] as const,
};
```

### Cache Invalidation & Optimistic Updates
When a mutation occurs (e.g. creating an order, recording a payment, or updating stock):
1. **Optimistic UI Update:** `qc.cancelQueries()` is called, previous state is snapshot via `qc.getQueryData()`, and new data is injected into the cache via `qc.setQueryData()`.
2. **Rollback on Error:** In `onError`, `qc.setQueryData()` restores the snapshot.
3. **Invalidation:** In `onSettled` / `onSuccess`, related query keys are invalidated:
   ```typescript
   qc.invalidateQueries({ queryKey: queryKeys.orders });
   qc.invalidateQueries({ queryKey: queryKeys.inventory });
   qc.invalidateQueries({ queryKey: queryKeys.stats });
   ```

### Custom Hooks Catalog

| Custom Hook Name | Return Value / Signature | Primary Component Consumers |
| :--- | :--- | :--- |
| `useCompanyProfile()` | `{ profile, isLoading, updateProfile }` | `settings/page.tsx`, order invoice header components |
| `useFormatters()` | `{ formatINR, formatDate, formatNumber }` | `orders/page.tsx`, `payments/page.tsx`, `analytics/page.tsx` |
| `useRole()` | `{ role, isOwner, isManager, isStaff, can }` | `dashboard/layout.tsx`, navigation menus, action buttons |
| `usePermissions()` | `{ permissions, checkPermission }` | `reports/previous-years/page.tsx`, gated action sheets |
| `useOrders()` | `{ orders, isLoading, createOrder, updateStatus }` | `orders/page.tsx`, `orders/create/page.tsx`, `payments/page.tsx` |
| `useModules()` | `{ modules, isModuleEnabled, toggleModule }` | `settings/page.tsx`, sidebar navigation filtering |
| `useCachedPage()` | `{ cachedData, savePageCache }` | `dashboard/page.tsx`, `inventory/page.tsx`, `users/page.tsx` |
| `useURLSyncedPagination()`| `{ page, search, setPage, setSearch }` | `orders/page.tsx`, `production/page.tsx` |
| `useAppLocale()` | `{ locale, switchLocale }` | `LanguageSwitcher.tsx`, `LocaleProvider.tsx` |
| `useAIChat()` | `{ messages, sendMessage, isLoading }` | `ai-assistant/page.tsx`, `SmartInputBar.tsx` |

### Domain-Driven Clean Architecture Modules (`apps/web/src/modules/`)

Every core business feature is structured following DDD / Clean Architecture principles:
- **`domain/`**: Zod schemas (`schemas.ts`), domain TypeScript types (`types.ts`), entity validation.
- **`application/`**: Business logic services (e.g. `order.service.ts`, `inventory.service.ts`).
- **`infrastructure/`**: Database repositories (e.g. `order.repository.ts`) accessing raw MongoDB collections.

```
modules/
├── billing/     ├── domain/  ├── application/  └── infrastructure/
├── clients/     ├── domain/  ├── application/  └── infrastructure/
├── employees/   ├── domain/  ├── application/  └── infrastructure/
├── inventory/   ├── domain/  ├── application/  └── infrastructure/
├── machines/    ├── domain/  ├── application/  └── infrastructure/
├── orders/      ├── domain/  ├── application/  └── infrastructure/
├── payments/    ├── domain/  ├── application/  └── infrastructure/
├── production/  ├── domain/  ├── application/  └── infrastructure/
└── purchasing/  ├── domain/  ├── application/  └── infrastructure/
```

### MongoDB Database Schema & Models (`src/models/` & `docs/schema.md`)

| Collection Name | Model File Path | Key Fields & Indexes | API Routes Interacting |
| :--- | :--- | :--- | :--- |
| **`users`** | `src/models/User.ts` | `email` (Unique), `businessId`, `role`, `customPermissions`, `passwordHash`, `avatar` | `/api/auth/*`, `/api/users/*`, `/api/employees/*` |
| **`businesses`** | `src/models/CompanyProfile.ts` | `gstin` (Unique), `pan`, `address`, `bankDetails`, `invoiceSettings`, `subscriptionPlan` | `/api/profile/company`, `/api/v1/company/setup` |
| **`sales_orders`**| `src/models/SalesOrder.ts` | `orderNumber` (Unique), `partyId`, `items`, `totalAmount`, `gstAmount`, `paymentStatus` | `/api/orders/*`, `/api/v1/orders/*`, `/api/invoices/*` |
| **`items`** | `src/models/Item.ts` | `sku` (Unique), `name`, `unit`, `currentStock`, `reorderPoint`, `hsnCode`, `costPrice` | `/api/inventory/*`, `/api/v1/inventory/*` |
| **`payments`** | `src/models/Payment.ts` | `receiptNo`, `orderId`, `partyId`, `amount`, `paymentMode`, `transactionId` | `/api/payments/*`, `/api/v1/payments/*` |
| **`sessions`** | `docs/schema.md` | `userId`, `token` (Unique, Hashed), `expiresAt` (TTL Index), `deviceInfo` | `/api/auth/login`, `/api/auth/me`, `/api/auth/logout` |
| **`otp_tokens`**| `src/models/Otp.ts` | `phone`, `otp` (bcrypt hash), `purpose`, `attempts`, `expiresAt` (TTL Index) | `/api/auth/send-otp`, `/api/auth/verify-otp` |
| **`audit_logs`**| `src/models/AuditLog.ts` | `businessId`, `userId`, `action`, `entityType`, `entityId`, `changes`, `createdAt` | `/api/audit/*`, `/api/dashboard/activity` |

---

## 7. API Route Inventory

The application exposes 145 API route handlers under `apps/web/src/app/api/`. Below is the catalog of core production endpoints:

| Route Path | Method | Purpose | Calling Component / Page | Touched Collections |
| :--- | :--- | :--- | :--- | :--- |
| `/api/auth/login` | `POST` | Authenticates user credentials & sets session token | `app/login/page.tsx`, `staff/login` | `users`, `sessions` |
| `/api/auth/me` | `GET` | Returns currently authenticated user & business profile | `app/dashboard/layout.tsx` | `users`, `businesses` |
| `/api/auth/send-otp` | `POST` | Generates & dispatches SMS OTP | `login/page.tsx`, `staff/login` | `otp_tokens` |
| `/api/dashboard/stats` | `GET` | Fetches KPI summary metrics (Revenue, Orders, Low Stock) | `app/dashboard/page.tsx` | `sales_orders`, `items`, `payments` |
| `/api/dashboard/analytics` | `GET` | Calculates monthly revenue, profit margins, and trends | `dashboard/analytics/page.tsx` | `sales_orders`, `items` |
| `/api/v1/inventory` | `GET`, `POST` | Lists inventory items or creates a new stock item | `dashboard/inventory/page.tsx` | `items` |
| `/api/v1/inventory/[id]` | `PATCH`, `DELETE`| Updates item stock levels or soft-deletes item | `MaterialUsageDrawer.tsx` | `items` |
| `/api/v1/orders` | `GET`, `POST` | Fetches sales orders list or creates new order | `dashboard/orders/page.tsx` | `sales_orders`, `items` |
| `/api/v1/orders/[id]` | `GET`, `PATCH` | Retrieves order details or updates order status | `dashboard/orders/[id]/edit` | `sales_orders` |
| `/api/payments` | `GET`, `POST` | Fetches payment ledger or records manual payment | `dashboard/payments/page.tsx` | `payments`, `sales_orders` |
| `/api/v1/production` | `GET`, `POST` | Manages production job cards & batch progress | `dashboard/production/page.tsx` | `production_jobs`, `items` |
| `/api/machines` | `GET`, `POST` | Tracks machine runtime, downtime, & maintenance | `dashboard/machines/page.tsx` | `machines` |
| `/api/clients` | `GET`, `POST` | Manages client directory & material mappings | `dashboard/clients/page.tsx` | `parties` |
| `/api/employees` | `GET`, `POST` | Manages staff list, roles, and access credentials | `dashboard/users/page.tsx` | `users` |
| `/api/tally/generate-xml`| `POST` | Exports invoices & vouchers to Tally ERP XML | `TallyExportButton.tsx` | `sales_orders`, `parties` |
| `/api/profile/company` | `GET`, `POST` | Fetches or updates business profile & GST details | `dashboard/settings/page.tsx` | `businesses` |
| `/api/invoice/generate-pdf`|`POST` | Renders downloadable GST invoice PDF | `dashboard/orders/page.tsx` | `sales_orders`, `businesses` |

---

## 8. i18n System

### Configuration & Architecture
- **Package:** `next-intl ^4.9.0`
- **Provider Wrapper:** `apps/web/src/components/LocaleProvider.tsx`
- **Supported Locales:**
  - `en` (English - Default)
  - `hi` (Hindi - हिन्दी)
  - `gu` (Gujarati - ગુજરાતી)
  - `mr` (Marathi - Marathi)
- **State Storage:** LocalStorage key `ind_manager_locale`. Switching locales reloads the document cleanly to update date/currency formatters (`Asia/Kolkata` timezone context).

### Verified Namespace Audit (100% Complete Across All 4 Locales)

| Namespace | Key Count | EN Status | HI Status | GU Status | MR Status | Notes / Coverage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`common`** | 20 | Complete | Complete | Complete | Complete | Save, Cancel, Delete, Edit, Loading states |
| **`sidebar`** | 8 | Complete | Complete | Complete | Complete | Main sidebar menu item labels |
| **`nav`** | 18 | Complete | Complete | Complete | Complete | Includes `nav.activity` key |
| **`dashboard`** | 28 | Complete | Complete | Complete | Complete | Dashboard overview KPI titles & headers |
| **`widgets`** | 8 | Complete | Complete | Complete | Complete | Bento widget titles |
| **`settings`** | 65 | Complete | Complete | Complete | Complete | Company settings, GST, team permissions |
| **`machines`** | 54 | Complete | Complete | Complete | Complete | Machine downtime & utilization terms |
| **`analytics`** | 76 | Complete | Complete | Complete | Complete | Profit margins, monthly revenue, chart labels |
| **`common2`** | 15 | Complete | Complete | Complete | Complete | Supplementary action buttons |
| **`tally`** | 7 | Complete | Complete | Complete | Complete | Tally ERP export & sync status labels |
| **`productionSheet`**| 8 | Complete | Complete | Complete | Complete | Job card & batch modal titles |
| **`activityFeed`** | 6 | Complete | Complete | Complete | Complete | Audit activity feed labels |
| **`table`** | 20 | Complete | Complete | Complete | Complete | Table headers (Date, Amount, Action, Status) |
| **`productionDetail`**| 9 | Complete | Complete | Complete | Complete | Production tracking details |

---

## 9. Known Fragile Areas / DO NOT BREAK List

> [!CAUTION]  
> **1. Page Root Containment & Layout Overflow**  
> All page root containers inside `/dashboard` MUST have `overflow-x-hidden min-w-0`. CSS Grid containers (`.kpi-grid`) require `min-w-0 w-full overflow-hidden` on parent wrappers (`motion.div` / `StatWidget`). Omitting `min-w-0` causes CSS Grid track blowout when dynamic string data populates into table or stat widgets.

> [!CAUTION]  
> **2. Table Fixed Layout & Cell Truncation**  
> Tables rendering dynamic user strings must use `table-fixed` on the `<table>` element, explicit header column widths (`w-[Npx]`), and `min-w-0 truncate` on inner wrapper `<div>`s.

> [!CAUTION]  
> **3. Dialog Header Color Variables**  
> Modal headers in `dialog.tsx` must use CSS theme variables (`var(--border)`, `var(--muted)`, `var(--foreground)`, `var(--overlay-sheet-bg)`). NEVER hardcode dark mode hex values (`#f1f5f9` or `rgba(255,255,255,0.07)`), as they create unreadable white-on-white text in light mode.

> [!CAUTION]  
> **4. Safari iOS Touch Event Handling**  
> Dismissing modal backdrops or triggers on iOS Safari requires `onPointerDown` instead of `onClick` to avoid 300ms touch latency and event swallowing.

> [!CAUTION]  
> **5. `globals.css` Media Query Cascade Order**  
> The `@media (min-width: 1024px)` desktop compaction block (L2055-2082) MUST remain below base `.kpi-card` rules. Placing base card rules after the media query breaks desktop layout compaction.

> [!CAUTION]  
> **6. User Avatar Initials & Profile Photo Path Mismatch**  
> User profile objects store avatar URLs under `avatar` / `photoUrl`. When updating user profiles, both fields must be kept synchronized to avoid navbar avatar falling back to initials after page interaction.

---

## 10. Mobile & Capacitor Constraints

1. **Static Export Requirement (`output: 'export'`):**  
   Capacitor builds target static HTML/JS output (`webDir: 'out'`). Next.js server-side API routes must either run on a accessible remote domain or be decoupled when running inside native Android/iOS WebViews.
2. **Backdrop Blur Performance on Mobile WebViews:**  
   Heavy CSS `backdrop-filter: blur(...)` causes severe frame drops and UI stutter on Android/iOS WebViews. Mobile bottom sheets (e.g., `MaterialUsageDrawer.tsx`) use opaque/semi-transparent solid surfaces (`var(--overlay-sheet-bg)`) without heavy backdrop blur.
3. **Android WebView Opacity Animations:**  
   Animating opacity on GPU-composited layers in Android WebViews causes screen flicker. Sheet keyframe animations use GPU-accelerated CSS `transform: translateY()` instead of opacity transitions.
4. **Virtual Keyboard & Safe Area Protection (`dvh`):**  
   Mobile dialogs use `max-h-[88dvh]` combined with `env(safe-area-inset-bottom)` to accommodate native virtual keyboards and iOS home indicator bars.

---

## Summary of Changes (Diff vs. `.agents/AGENTS.md`)

| Topic / Section | Previously in `.agents/AGENTS.md` | Added / Updated in `ARCHITECTURE.md` |
| :--- | :--- | :--- |
| **Project Overview & Tech Stack** | Not present | Full breakdown of Next.js 16, React 19, MongoDB Driver, Mongoose, Capacitor 8, next-intl, Framer Motion, and Tailwind v4 exact versions. |
| **Directory Structure Map** | Not present | Complete monorepo folder tree (2-3 levels deep) mapping `apps/web`, `apps/api`, `apps/auth-server`, `packages/`, and `docs/`. |
| **Routing Map** | Not present | Catalog of all 39 page routes under `apps/web/src/app/`, specifying render type, file paths, and API requests on load. |
| **Component Relationship Map** | Mentioned fixes for `StatWidget` & `dialog.tsx` | Full blast radius analysis for 15+ primitive components (`IOSCard`, `StatWidget`, `CommandPalette`, `table`, `sheet`, `select`, etc.). |
| **`globals.css` Map** | Mentioned `.kpi-card` cascade fix | Line-by-line section breakdown of 4,024 lines of CSS, master design token tables (Light vs Dark), and cascade order rules. |
| **State & Data Flow** | Not present | React Query cache policy, query keys convention, custom hooks catalog, DDD modules structure, and MongoDB collection schema. |
| **API Route Inventory** | Not present | Comprehensive catalog of all 145 API routes under `/api`, HTTP methods, touched database collections, and calling frontend components. |
| **i18n System** | Not present | Audit of 14 namespaces across all 4 locales (`en`, `hi`, `gu`, `mr`) confirming 100% translation coverage. |
| **Known Fragile Areas** | Contains Fixes 1, 2, and 3 | Consolidated all AGENTS.md rules with git history lessons (Safari touch events, modal headers, avatar state, `-m-6` layout pairing). |
| **Mobile / Capacitor** | Not present | Explicit constraints for static exports, backdrop blur removal, `translateY` animations, and `dvh` safe areas. |

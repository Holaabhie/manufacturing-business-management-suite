# Project Specific Agent Rules & Fix Log

## Layout Overflow & Containment Rules

- Always ensure page root containers in `/dashboard` have `overflow-x-hidden min-w-0` to prevent unconstrained flex/grid elements from forcing layout overflow.
- All grid items inside CSS grid containers (like `.kpi-grid`) must have `min-w-0 w-full overflow-hidden` on their parent wrapper elements (`motion.div` / `StatWidget`) to avoid grid track width blowout when rendering dynamic data.
- Table containers rendering dynamic text columns must use `table-fixed` with explicit widths (`w-[Npx]`) on headers and `min-w-0 truncate` on inner cell wrappers.
- Dialog and modal headers must use theme CSS variables (`var(--border)`, `var(--muted)`, `var(--foreground)`, `var(--muted-foreground)`) instead of hardcoded hex/rgba dark mode strings so they render properly in both light and dark mode.
- Use `.scrollbar-hide` on scrollable containers where visible scrollbar tracks should be hidden.
- **Any modal, sheet, or overlay rendered inside `PageTransition` (or any `motion.div` / transform-bearing ancestor) MUST use `createPortal(..., document.body)` for its `position: fixed` overlay to target the true viewport.** CSS `position: fixed` is scoped to the nearest ancestor with `transform`, `filter`, `perspective`, or `will-change: transform` — NOT the viewport — when such an ancestor exists. `PageTransition` uses Framer Motion's `motion.div` which applies `transform: translateY(0px)` even at rest, trapping all `fixed` descendants. Reference pattern: `MobileSheet.tsx`, `UpgradeModal.tsx`, `MoreMenuSheet.tsx` — all use `createPortal`. Guard with a `portalMounted` state (`useState(false)` + `useEffect(() => setPortalMounted(true), [])`) for SSR safety.

## Bug Fix Log

### Fix 1: Employee Management Page Post-Data Fetch Layout Overflow

- **Files Changed**:
  - `apps/web/src/app/dashboard/users/page.tsx`
  - `apps/web/src/components/ui/StatWidget.tsx`
- **Root Cause**: `StatWidget` (`motion.div`) grid items inside `.kpi-grid` lacked `min-w-0`, causing CSS Grid track expansion when real data populated. Additionally, the page container and table flex items lacked full overflow containment wrappers.
- **What Changed**: Added `min-w-0 w-full overflow-hidden` to `motion.div` in `StatWidget`, added `min-w-0 w-full overflow-hidden` to `.kpi-panel` and `.kpi-grid` in `page.tsx`, and ensured all dynamic text cells have `truncate` and `min-w-0`.

### Fix 2: Clients Page Add/Edit Dialog Dark Mode Colors in Light Mode

- **Files Changed**:
  - `apps/web/src/app/dashboard/clients/page.tsx`
- **Root Cause**: The Add New Client `DialogContent` header used hardcoded dark mode inline styles (`color: '#f1f5f9'`, `borderBottom: '1px solid rgba(255,255,255,0.07)'`, `background: 'linear-gradient(135deg, rgba(59,130,246,0.4), rgba(255,255,255,0.06))'`).
- **What Changed**: Replaced hardcoded dark mode inline styles with theme-aware CSS variables (`var(--border)`, `var(--muted)`, `var(--foreground)`, `var(--muted-foreground)`).

### Fix 3: Dashboard Unwanted Scrollbar / Scroll Line Removal

- **Files Changed**:
  - `apps/web/src/app/dashboard/users/page.tsx`
- **Root Cause**: Table wrapper `<div className="overflow-x-auto">` displayed a visible browser scrollbar line even when content fit within `table-fixed`.
- **What Changed**: Added the `.scrollbar-hide` utility class to `<div className="overflow-x-auto scrollbar-hide">`.

### Fix 4: Mobile Sheet Sizing & Flex Scroll Containment (Record Payment + Create Invoice)

- **Files Changed**:
  - `apps/web/src/app/dashboard/payments/page.tsx`
  - `apps/web/src/components/billing/CreateInvoiceModal.tsx`
- **Root Cause**:
  - Record Payment sheet used `maxHeight: 90dvh` and `z-50` without accounting for the app's fixed bottom navigation bar (~72px height, `z-50`), causing footer button overlap and height clipping on mobile viewports.
  - Create Invoice modal used `min-h-screen` (100vh) with unconditional `overflow-hidden` on mobile, preventing internal flex children from shrinking and activating `overflow-y-auto` scrolling. Its mobile save button was also buried inside the scroll div instead of being pinned.
- **What Changed**:
  - `payments/page.tsx`: Raised z-index to `z-[60]`, set mobile max height to `max-h-[calc(100dvh-72px)]` (`sm:max-h-[90vh]`), and changed sticky footer to a pinned `shrink-0` flex child.
  - `CreateInvoiceModal.tsx`: Changed mobile height to `h-[100dvh]` (`md:h-auto md:min-h-0 md:max-h-[92vh]`), made overflow clipping conditional (`md:overflow-hidden`), and extracted the mobile save button to a pinned `shrink-0` footer with bottom nav clearance (`calc(0.75rem + env(safe-area-inset-bottom) + 72px)`).

### Fix 4a: Full-Bleed Correction for Mobile Sheets (Record Payment + Create Invoice)

- **Files Changed**:
  - `apps/web/src/app/dashboard/payments/page.tsx`
  - `apps/web/src/components/billing/CreateInvoiceModal.tsx`
- **Root Cause** (missed pieces from Fix 4):
  - (a) Fixed pixel-width/height gaps (`calc(100vw-16px)`, `max-h-[calc(100dvh-72px)]`) instead of true `100dvh`/`w-full` — left 8px side gaps and a 72px bottom gap.
  - (b) `scale-95`/`scale-100` entrance animation on mobile caused sub-pixel rendering gaps at panel edges.
  - (c) Create Invoice had **no body scroll lock** — page behind the sheet remained scrollable.
  - (d) Insufficient z-index margin above bottom nav (`z-[60]` vs nav's `z-50`) — only 10 above, not definitive.
  - (e) `rounded-t-[24px]` on Record Payment gave floating-card appearance instead of full-screen page.
- **What Changed**:
  - `payments/page.tsx`: `z-[60]` → `z-[100]`, `rounded-t-[24px]` → `rounded-none sm:rounded-[20px]`, added `h-[100dvh] sm:h-auto`, `max-h-[100dvh] sm:max-h-[90vh]`, replaced `scale-95`/`scale-100` with `translate-y-full`/`translate-y-0` (mobile-only slide-up, no scale).
  - `CreateInvoiceModal.tsx`: Added body scroll lock `useEffect`, `w-[calc(100vw-16px)]` → `w-full`, outer container `items-center` → `items-end sm:items-center`, dropped `+72px` from mobile footer padding (no longer needed since sheet fully covers bottom nav at `z-[100]`).

## Full-Screen Mobile Sheet Pattern (Reference)

When building a full-screen mobile sheet that acts as a page:

- **Z-index**: Use `z-[100]` on the backdrop/outer container (bottom nav is `z-50`).
- **Panel sizing (mobile)**: `w-full h-[100dvh] max-h-[100dvh]` — no pixel offsets, no `calc()` subtractions.
- **Corners (mobile)**: `rounded-none` — full-screen sheets are pages, not floating cards. Use `sm:rounded-[Npx]` for desktop.
- **Animation (mobile)**: Translate-only (`translate-y-full` → `translate-y-0`). Never use `scale` transforms on mobile — they cause sub-pixel edge gaps.
- **Body scroll lock**: Always set `document.body.style.overflow = 'hidden'` when open, restore on close/unmount.
- **Footer padding**: Only `env(safe-area-inset-bottom)` needed. Do NOT add `+72px` nav clearance when the sheet's z-index fully covers the bottom nav.
- **Desktop**: Keep existing centered modal look (`sm:items-center`, `sm:max-w-[Npx]`, `sm:rounded-[Npx]`, `sm:max-h-[90vh]`).
- **For Radix `DialogContent`-based dialogs**: Use the built-in `fullScreenMobile` prop instead of custom overlay divs. This applies `fixed inset-0` full-bleed on mobile while preserving centered desktop behavior — no portal workarounds needed since Radix already portals via `DialogPrimitive.Portal`. Do NOT build custom inline overlay divs for sheets that could use `DialogContent` — that's what caused the Record Payment/Create Invoice portal bugs.
- **Rule for New Dialogs**: New sheets built on `DialogContent` MUST pass `fullScreenMobile` by default unless they are short confirm/action dialogs (≤3 fields, no scroll needed on mobile, e.g. delete confirmations or 1-button alerts). Check the master list below before adding a new dialog to avoid rediscovering this as a bug.

### Fix 5: fullScreenMobile Prop for Radix Dialog Sheets (Global Audit & Batch Fix)

- **Files Changed**:
  - `apps/web/src/components/ui/dialog.tsx`
  - `apps/web/src/app/dashboard/users/page.tsx`
  - `apps/web/src/app/dashboard/users/[id]/page.tsx`
  - `apps/web/src/app/dashboard/purchasing/page.tsx`
  - `apps/web/src/app/dashboard/profile/page.tsx`
  - `apps/web/src/app/dashboard/folio/page.tsx`
  - `apps/web/src/app/dashboard/clients/page.tsx`
  - `apps/web/src/app/dashboard/settings/page.tsx`
  - `apps/web/src/app/dashboard/machines/page.tsx`
  - `apps/web/src/app/dashboard/upgrade/page.tsx`
  - `apps/web/src/app/dashboard/orders/page.tsx`
  - `apps/web/src/app/dashboard/billing/page.tsx`
  - `apps/web/src/app/dashboard/page.tsx`
  - `apps/web/src/components/production/AssignStaffDialog.tsx`
  - `apps/web/src/components/dashboard/ActivityDetailPopup.tsx`
- **Root Cause**: Radix-portaled dialogs rendered as floating bottom-anchored cards on mobile (`max-w-[480px]`, `rounded-t-[32px]`, side margins) instead of full-bleed edge-to-edge sheets.
- **What Changed**:
  - `dialog.tsx`: Added `fullScreenMobile` prop — applies `fixed inset-0 z-[1001]` full-bleed on mobile, reverts to standard `md:top-1/2 md:-translate-y-1/2 md:rounded-[24px]` centered dialog on desktop. No drag handle on mobile when active. Existing `fullScreen` and default branches unchanged.
  - Applied `fullScreenMobile` across all 23 form, detail, and multi-field dialogs. Short 1-field/confirm dialogs (Pause Production, Complete Production, Employee Action Confirm) intentionally kept as small centered cards for optimal UX.

**Complete Master List of `DialogContent` Instances Using `fullScreenMobile`** (23 total):

1. Add Employee — `users/page.tsx`
2. Employee Credentials — `users/page.tsx`
3. Edit Employee — `users/page.tsx`
4. Staff Detail Edit — `users/[id]/page.tsx`
5. Staff Detail Reset Password — `users/[id]/page.tsx`
6. Add Vendor — `purchasing/page.tsx`
7. New Purchase Order — `purchasing/page.tsx`
8. Edit Vendor — `purchasing/page.tsx`
9. Add Account — `profile/page.tsx`
10. Switch Account — `profile/page.tsx`
11. Add Expense — `folio/page.tsx`
12. Add Notes — `folio/page.tsx`
13. Add New Client — `clients/page.tsx`
14. Client Profile / Details — `clients/page.tsx`
15. Assign Staff — `components/production/AssignStaffDialog.tsx`
16. Add Team Member — `settings/page.tsx`
17. Add/Edit Machine — `machines/page.tsx`
18. Upgrade Plan Contact Sales — `upgrade/page.tsx`
19. Upgrade Plan Checkout — `upgrade/page.tsx`
20. Order Status / Reconcile — `orders/page.tsx`
21. Activity Log Detail — `components/dashboard/ActivityDetailPopup.tsx`
22. Dashboard Widget Selector — `dashboard/page.tsx`
23. Share Payment Log — `billing/page.tsx`

### Fix 6: FY Year Archives Page — 3-Part Horizontal Overflow Fix

- **Files Changed**:
  - `apps/web/src/app/dashboard/reports/previous-years/page.tsx`
  - `apps/web/src/components/ui/MobileTableCards.tsx`
  - `apps/web/src/components/ui/ios/IOSBadge.tsx`
- **Root Cause (3 separate issues)**:
  1. Desktop tables (`min-w-[550px]`) and mobile cards (`MobileTableCards`) shared a single `overflow-x-auto` wrapper div. On mobile, the scroll container inherited the desktop table's intrinsic width, pushing mobile card content into a horizontal scroll box.
  2. Tab bar (`Orders / Production / Bills / Invoices / Inventory Usage`) had `[mask-image:linear-gradient(to_right,black_92%,transparent_100%)]` which faded/clipped the rightmost tab on mobile. Parent `motion.div` also lacked `min-w-0 w-full overflow-hidden` containment.
  3. `IOSBadge` applied `whitespace-nowrap` without truncation, causing long badge labels (e.g. "AWAITING PAYMENT") inside `MobileTableCards`' `grid-cols-2` to push sibling columns (Amount, Date) off-screen. Grid cell divs also lacked `overflow-hidden`.
- **What Changed**:
  1. Changed table wrapper from `overflow-x-auto` to `overflow-x-hidden md:overflow-x-auto` with `w-full min-w-0`, so mobile cards render at natural width and only desktop tables get horizontal scroll.
  2. Removed `[mask-image:...]` and `sm:[mask-image:none]` from tab bar. Added `min-w-0 w-full overflow-hidden` to parent `motion.div`.
  3. Added `overflow-hidden` to `MobileTableCards` grid cell divs (alongside existing `min-w-0`). Added `truncate max-w-full` to `IOSBadge` root span.

### Fix 7: FY Year Archives Page — Replaced Materials Used KPI with Payments to Collect

- **Files Changed**:
  - `apps/web/src/app/dashboard/reports/previous-years/page.tsx`
- **Root Cause**: The "Materials Used" KPI card showed a raw inventory deduction count (`totalMaterialDeducted`) which was less actionable than outstanding payment data already available in the summary.
- **What Changed**: Replaced the 4th KPI card label from "Materials Used" to "Payments to Collect", value from `totalMaterialDeducted.toLocaleString()` to `formatCurrency(Math.max(0, totalBilled - totalPaid))` (client-side computation, no new API call), icon from `Layers` to `Wallet` (lucide-react). Kept `color="purple"` (same design tokens: `rgba(175,82,222,0.1)` light bg, `var(--chart-4)` icon tint). Removed unused `Layers` import, added `Wallet` import.

### Fix 8: FY Year Archives Page — KPI Grid Containment, Tabs Grid Conversion, Formula Fix

- **Files Changed**:
  - `apps/web/src/app/dashboard/reports/previous-years/page.tsx`
- **Root Cause (3 issues)**:
  1. KPI grid `motion.div` container (line 296) lacked `min-w-0 w-full overflow-hidden`, causing grid tracks to expand past viewport and clipping the rightmost KPI cards.
  2. Tabs row used `flex` with `overflow-x-auto scrollbar-hide scroll-smooth` + `whitespace-nowrap` on buttons, requiring horizontal scroll to see all tabs on mobile.
  3. "Payments to Collect" formula used `totalBilled - totalPaid` (invoice-based), but `totalPaid` often exceeds `totalBilled` since payments are collected against orders regardless of invoice generation, yielding ₹0 via `Math.max(0,...)`.
- **What Changed**:
  1. Added `min-w-0 w-full overflow-hidden` to KPI grid `motion.div` container.
  2. Converted tabs container from `flex overflow-x-auto` to `grid grid-cols-3` (5 tabs → 3+2 wrapped layout). Removed `whitespace-nowrap` from tab buttons, added `min-w-0`. Added `flex-shrink-0` to tab icons, wrapped `{tab.label}` in `<span className="truncate">`.
  3. Changed formula from `totalBilled - totalPaid` to `totalRevenue - totalPaid` (order-based: reflects all pending payments regardless of invoice status).

**Correction**: Tabs row reverted from `grid-cols-3` back to scrollable `flex overflow-x-auto` — page has 5 tabs not 3; `grid-cols-3` caused an ugly 3+2 wrapped layout. Root cause of tab clipping was the KPI grid's missing `min-w-0` (Fix 1 above), not the tabs' own scroll behavior. Kept button-level improvements (`min-w-0`, `flex-shrink-0`, `<Icon flex-shrink-0>`, `<span truncate>` label wrapper) from the grid attempt since they improve resilience regardless of flex vs grid layout.

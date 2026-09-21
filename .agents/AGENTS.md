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

### Fix 9: Avatar Dropdown Menu forceMount Removal

- **Files Changed**:
  - `apps/web/src/app/dashboard/layout.tsx`
- **Root Cause**: Avatar dropdown menu had `forceMount` prop causing the dropdown's internal avatar to stay mounted in DOM permanently, overlapping with navbar trigger avatar.
- **What Changed**: Fixed: Avatar dropdown menu had `forceMount` prop causing the dropdown's internal avatar to stay mounted in DOM permanently, overlapping with navbar trigger avatar. Removed forceMount from DropdownMenuContent in dashboard/layout.tsx — Radix now unmounts content naturally on close.

## Notifications

### Fix 10: production_complete Notification Missing recipientContact & recipientName

- **Files Changed**:
  - `apps/web/src/app/api/production/[id]/route.ts`
- **Root Cause**: The `triggerNotification()` call for `eventType: "production_complete"` did not pass `recipientContact` (top-level on the event object) or `clientName` (inside `payload` for the dispatcher's `recipientName` fallback chain). This caused `notification_logs` entries to have an empty `recipientContact` field and a generic `recipientName` of `"Business Owner"`.
- **What Changed**: Added a two-hop client lookup before the `triggerNotification()` call: `updated.orderId` → `orders` collection → `order.client_id` → `clients` collection. Passes `recipientContact: client.phone` at the event top level and `clientName: client.name` inside `payload`. Both lookups are wrapped in a single `try/catch` so that malformed `ObjectId` strings, missing orders, or missing clients all gracefully fall back to `recipientContact: ""` and `recipientName: "Unknown Client"` — never throws. Pattern reused from `orders/[id]/route.ts` lines 80–86.

### Fix 11: Desktop Dialog Off-Center Alignment (dialogScale Keyframes Transform Override)

- **Files Changed**:
  - `apps/web/src/app/globals.css`
- **Root Cause**: `DialogContent` positions dialogs on desktop using `top: 50%; left: 50%; transform: translate(-50%, -50%)`. However, the `@keyframes dialogScaleIn` and `@keyframes dialogScaleOut` animations defined `transform: scale(...)` without `translate(-50%, -50%)`. The keyframe transform declarations wiped out the negative translate offsets during and after animation, causing the dialog's top-left corner to be placed at the screen center (50vw, 50vh) and pushing all desktop modals down and to the right.
- **What Changed**: Added `translate(-50%, -50%)` to all keyframe steps in `@keyframes dialogScaleIn` and `@keyframes dialogScaleOut` in `globals.css`. Mobile sheets are unaffected since they use `sheetSlideUp`/`sheetSlideDown`.

### Fix 12: Purchasing Dialogs Viewport Height Overflow & Flex Scroll Containment

- **Files Changed**:
  - `apps/web/src/app/dashboard/purchasing/page.tsx`
- **Root Cause**: The Add Vendor, New Purchase Order, and Order Detail modals had internal scroll areas without `min-h-0` flex bounds, and some inner `ScrollArea` elements had standalone `max-h-[90vh]` instead of parent-bounded flex layout. In flex containers, children expand to their natural height unless constrained with `min-h-0`, causing the rendered dialog height to exceed the viewport (`md:max-h-[85dvh]`) and spill equally off top and bottom edges.
- **What Changed**: Added `md:max-h-[85dvh] flex flex-col` to `DialogContent` wrappers and `flex-1 min-h-0` to all inner scroll regions (`ScrollArea` and `overflow-y-auto` divs). Removed unconstrained `max-h-[90vh]` on child scroll containers.

### Feature 1: Mobile PO Card Action Sheet

- **Files Changed**:
  - `apps/web/src/components/ui/MobileTableCards.tsx`
  - `apps/web/src/app/dashboard/purchasing/page.tsx`
- **What Changed**:
  - Added optional `actionsTrigger?: (row: T) => React.ReactNode` render-prop to `MobileTableCards` — fully backward-compatible; callers that don't pass it see byte-identical output (no `relative` class, no extra DOM nodes). When provided, renders the trigger absolute-positioned top-right of each card.
  - Purchasing page mobile PO cards now show a three-dot (`MoreVertical`) trigger button opening a `DropdownMenu` (same component as desktop) with **View Details** and **Delete** (admin-only, non-Received). Conditionally shown based on PO status and `isAdmin`, matching the desktop logic.
  - **"Mark as Received"** rendered inline in the STATUS field of each mobile card (and kept in the desktop `DropdownMenu`) — a tinted `motion.button` beside the status badge for Pending/Ordered POs.
  - **"Mark as Ordered"** action removed entirely from purchasing UI (desktop + mobile). `handleStatusChange` signature narrowed from `"Ordered" | "Received"` to `"Received"` only. The `"Ordered"` status value is still supported for display/legacy data in `STATUS_CONFIG` and type definitions — existing Ordered POs render correctly and can still transition to Received.
  - No new API routes created — reuses `PATCH /api/purchasing/[id]` and `DELETE /api/purchasing/[id]`.
  - Vendor cards' `MobileTableCards` usage and `reports/previous-years/page.tsx` untouched.
  - `MobileSheet.tsx` and `ConfirmDeleteSheet.tsx` not modified.

### Fix 13: Activity Log Tab Bar Mobile Congestion

- **Files Changed**:
  - `apps/web/src/app/dashboard/activity/page.tsx`
- **Root Cause**: Tab bar outer `motion.div` used `flex overflow-x-auto hide-scrollbar pb-2` — `hide-scrollbar` is a non-existent class (project uses `.scrollbar-hide` or inline `[scrollbar-width:none]`). Inner flex container lacked `w-max`, tab buttons lacked `shrink-0`, and there were zero responsive breakpoints (`sm:`, `md:`) for padding or font size, causing tabs to render congested/clipped on mobile viewports.
- **What Changed**: Brought in line with `previous-years/page.tsx` tab bar pattern: outer wrapper `w-full min-w-0`, scrollable inner with native scrollbar hiding (`[scrollbar-width:none] [&::-webkit-scrollbar]:hidden`), `w-max` flex track, `shrink-0 whitespace-nowrap` buttons with responsive padding (`px-2.5 sm:px-4`) and font (`text-[13px] sm:text-[14px]`).

### Fix 14: Activity Log Page Root Missing overflow-x-clip/min-w-0 Containment

- **Files Changed**:
  - `apps/web/src/app/dashboard/activity/page.tsx`
- **Root Cause**: Page root `motion.div` and loading skeleton wrapper used `className="space-y-6 hero-glow max-w-4xl mx-auto"` without `w-full min-w-0 overflow-x-clip`, violating the AGENTS.md rule that all `/dashboard` page roots must have these containment classes to prevent children from forcing horizontal scroll.
- **What Changed**: Added `w-full min-w-0 overflow-x-clip` to both the loading skeleton `<div>` (L106) and the main return `<motion.div>` (L119).

### Fix 15: Activity Log List Row Meta Block Mobile Overflow

- **Files Changed**:
  - `apps/web/src/app/dashboard/activity/page.tsx`
- **Root Cause**: The right-side meta block (amount + timestamp + chevron) in each activity list row used unconditional `flex-shrink-0`, `gap-6`, and displayed both relative time ("1d ago") and absolute date/time ("21 Aug, 02:45 pm") on all screen sizes. Combined with `ml-14` indent, the intrinsic content width (~303–325px) exceeded available mobile card width (~296–311px), forcing the row and page to overflow horizontally.
- **What Changed**: Changed `flex-shrink-0` → `flex-shrink sm:flex-shrink-0` (allows shrink on mobile only), `gap-6` → `gap-3 sm:gap-6`, `gap-3` → `gap-2 sm:gap-3` on inner timestamp container, added `min-w-0` at each nesting level, hid secondary date/time line on mobile via `hidden sm:block`, added `shrink-0` to amount text and chevron icon, added `whitespace-nowrap` to both timestamp spans.

### Fix 16: FY Archive Page Selector Row Mobile Overflow

- **Files Changed**:
  - `apps/web/src/app/dashboard/reports/previous-years/page.tsx`
- **Root Cause**: FY selector actions container (FY button + Export button) used `shrink-0` unconditionally, and the FY button had `min-w-[140px]` on all screen sizes. Combined intrinsic width (~314px) exceeded available content width on 360px-and-under mobile viewports, pushing the KPI grid past the right viewport edge.
- **What Changed**: Removed `shrink-0` from actions container (replaced with `min-w-0`), removed mobile `min-w-[140px]` floor from FY button (kept `sm:min-w-[160px]` only), added `shrink-0` to FY button itself so it stays inline but allows the container to compress. `flex-wrap` (already present) handles fallback wrapping.

### Fix 17: FY Archive Inventory Sub-Tab Bar Missing Scroll Containment

- **Files Changed**:
  - `apps/web/src/app/dashboard/reports/previous-years/page.tsx`
- **Root Cause**: The secondary sub-tab bar inside `InventoryUsageTable` ("Material Deductions" / "Batch Traceability") used a bare `flex gap-2 p-4` container with no `overflow-x-auto`, `shrink-0`, or `whitespace-nowrap` on buttons, causing horizontal overflow on screens ≤375px.
- **What Changed**: Added `overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden` to the container div, and `shrink-0 whitespace-nowrap` to both toggle buttons.

### Fix 18: FY Archive Page ~45px Horizontal Overflow from Framer Motion Ghost Node

- **Files Changed**:
  - `apps/web/src/app/dashboard/reports/previous-years/page.tsx`
- **Root Cause**: The ternary at L385-410 (`dataLoading` spinner / `!data` empty-state / data tables) rendered three mutually-exclusive branches inside the same `motion.div` parent without unique `key` props. Framer Motion retained the outgoing branch's DOM node during its 400ms stagger transition, and the empty-state `IOSCard` (unconstrained width, no `min-w-0`/`overflow-hidden`) caused ~45px page-level horizontal overflow when this ghost node briefly coexisted with real data.
- **What Changed**: Added unique `key` props to each ternary branch (`key="loading-state"`, `key="empty-state"`, `key="data-loaded"`) so React/Framer Motion treats them as genuinely different nodes and unmounts the outgoing one immediately. Added `min-w-0 w-full overflow-hidden` containment to the empty-state `IOSCard` as defense-in-depth. Parent `motion.div` already had `w-full min-w-0 overflow-x-clip` — no change needed there.

### Feature 2: Floating Bottom Navigation Dock with Raised Brand Badge

- **Files Changed**:
  - `apps/web/src/app/dashboard/layout.tsx`
- **What Changed**:
  - Restyled mobile bottom navigation from an edge-to-edge transparent gradient into a floating dock with `bottom-4 left-4 right-4` (`16px` inset), `rounded-[28px]`, `bg-card/90 dark:bg-card/95 backdrop-blur-xl`, `border border-border`, and `shadow-xl shadow-black/10 dark:shadow-black/40`.
  - Added a `56px` (`h-14 w-14`) raised circular badge (`bg-zinc-950 dark:bg-zinc-900 border border-white/15 dark:border-white/10 shadow-lg shadow-black/30`) over the Dashboard tab, overlapping the top edge by 50% (`-top-7`).
  - Centered brand icon `<Factory className="h-6 w-6 text-white" />` inside the circular badge with active indicator `ring-2 ring-primary/50` when on the Dashboard route.
  - Preserved existing active dot indicator and transitions for the remaining 4 tabs (Orders, Production, Inventory, More).
  - Kept safe-area-inset-bottom handling intact.

### Feature 3: Audio Feedback for Major Task Completions (Howler.js)

- **Files Changed / Added**:
  - `apps/web/package.json` (installed `howler` + `@types/howler`)
  - `apps/web/src/hooks/useCompletionSound.ts` (NEW)
  - `apps/web/src/app/dashboard/settings/page.tsx`
  - `apps/web/src/app/dashboard/orders/create/page.tsx`
  - `apps/web/src/lib/hooks/use-orders.ts`
  - `apps/web/src/components/billing/CreateInvoiceModal.tsx`
  - `apps/web/src/app/dashboard/purchasing/page.tsx`
  - `apps/web/src/app/dashboard/production/[id]/page.tsx`
- **What Changed**:
  - Added Howler.js integration for reliable mobile audio context unlock inside Capacitor WebViews.
  - Implemented `apps/web/src/hooks/useCompletionSound.ts` exporting `playCompletionSound(type: 'general' | 'payment')` and `useCompletionSound()` hook with:
    - Fixed volume: `0.35`
    - Debounce: 800ms window per sound type to suppress rapid repeats (e.g. bulk receipts)
    - Sound sources: `/sounds/success-general.mp3` and `/sounds/success-payment.mp3`
    - Global mute persistence: Reads and writes `localStorage.getItem("ind-manager-sound-enabled")` (default: `true`), with custom window event `ind-manager-sound-toggle` and storage listeners for instantaneous multi-tab and UI sync.
  - Added "Sound Effects" toggle card under the Notifications tab in `apps/web/src/app/dashboard/settings/page.tsx` using the project's standard `@/components/ui/switch` component.
  - Wired triggers exclusively to confirmed major task completions:
    1. **Order created**: `apps/web/src/app/dashboard/orders/create/page.tsx` (L380, `type: 'general'`).
    2. **Payment recorded / reconciled**: `apps/web/src/lib/hooks/use-orders.ts` in `useRecordPayment` (L220) and `useCreatePayment` (L407) (`type: 'payment'`).
    3. **Invoice created / saved**: `apps/web/src/components/billing/CreateInvoiceModal.tsx` (L479, `type: 'general'`).
    4. **Purchase order marked as received**: `apps/web/src/app/dashboard/purchasing/page.tsx` in `handleStatusChange` (L486, `type: 'general'`).
    5. **Production batch completed**: `apps/web/src/app/dashboard/production/[id]/page.tsx` for manual completion in `handleAction("complete")` (L254) and auto-completion in `handleUpdateProgress` (L304) with `!wasCompleted` prior-state transition guard (`type: 'general'`).

### Feature 4: Settings Master-Detail Routed Navigation & Tax & Compliance Section

- **Files Changed / Added**:
  - `apps/web/src/models/CompanyProfile.ts`
  - `apps/web/src/app/api/profile/tax/route.ts` (NEW)
  - `apps/web/src/app/api/profile/company/route.ts`
  - `apps/web/src/app/dashboard/settings/page.tsx`
  - `apps/web/src/app/dashboard/settings/SettingsHeader.tsx` (NEW)
  - `apps/web/src/app/dashboard/settings/company-info/page.tsx` (NEW)
  - `apps/web/src/app/dashboard/settings/tax/page.tsx` (NEW)
  - `apps/web/src/app/dashboard/settings/language/page.tsx` (NEW)
  - `apps/web/src/app/dashboard/settings/security/page.tsx` (NEW)
  - `apps/web/src/app/dashboard/settings/notifications/page.tsx` (NEW)
  - `apps/web/src/app/dashboard/settings/modules/page.tsx` (NEW)
  - `apps/web/src/app/dashboard/settings/team/page.tsx`
  - `apps/web/src/app/dashboard/settings/audit-trails/page.tsx` (NEW)
  - `apps/web/src/app/dashboard/settings/tally-integration/page.tsx` (NEW)
  - `apps/web/src/app/dashboard/settings/data/page.tsx` (NEW)
- **What Changed**:
  - Converted monolithic stacked accordion settings page (`/dashboard/settings`) into master-detail routed architecture:
    - Master list (`/dashboard/settings`): Clean list-only grouped iOS cards with badges, subtitles, and trailing `ChevronRight` drill-downs. No inline expansion.
    - 10 dedicated sub-routes: `company-info`, `tax`, `language`, `security`, `notifications`, `modules`, `team`, `audit-trails`, `tally-integration`, `data`.
    - `SettingsHeader`: Standardized sticky header with back button returning to `/dashboard/settings`, title, subtitle, and badge with complete overflow containment (`w-full min-w-0 overflow-hidden`).
  - Added new "Tax & Compliance" section (`/dashboard/settings/tax`):
    - Added `default_hsn_code` and `show_tax_breakdown` to `CompanyProfile` Mongoose model.
    - Added `GET` and `PATCH /api/profile/tax` endpoints supporting GSTIN/PAN regex validation, default rate, HSN, invoice tax breakdown toggle, and GST compliance fields (tax regime, TDS, TCS, RCM).
    - Surfaced GST Compliance fields in a separated card on the page: `tax_regime` dropdown, `tds_applicable` switch, `tcs_applicable` switch, and `reverse_charge_liable` switch.
    - Inline regex validation on blur for GSTIN (`/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/`) and PAN (`/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/`).
    - Dedicated iOS Teal token badge (`#00C7BE`) for Tax & Compliance to avoid orange collision.
    - Preserved 2FA disabled state as "Coming soon" without fake backend UI.

### Fix 19: Client Products & Materials 204 No Content Response Handling (page.tsx:362 404 Bug)

- **Files Changed**:
  - `apps/web/src/app/dashboard/clients/page.tsx`
  - `apps/web/src/modules/clients/infrastructure/client.repository.ts`
  - `apps/web/src/app/dashboard/billing/page.tsx`
- **Root Cause**:
  - The API v1 `DELETE /api/v1/clients/products/[id]` endpoint returns `envelope.noContent()` (HTTP 204 No Content with empty body).
  - In `page.tsx:362` and `page.tsx:401`, `handleDeleteProduct` and `handleDeleteMaterial` unconditionally called `const data = await res.json()`. Because HTTP 204 responses have no body, `res.json()` threw `SyntaxError: Unexpected end of JSON input`.
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

### Fix 9: Avatar Dropdown Menu forceMount Removal

- **Files Changed**:
  - `apps/web/src/app/dashboard/layout.tsx`
- **Root Cause**: Avatar dropdown menu had `forceMount` prop causing the dropdown's internal avatar to stay mounted in DOM permanently, overlapping with navbar trigger avatar.
- **What Changed**: Fixed: Avatar dropdown menu had `forceMount` prop causing the dropdown's internal avatar to stay mounted in DOM permanently, overlapping with navbar trigger avatar. Removed forceMount from DropdownMenuContent in dashboard/layout.tsx — Radix now unmounts content naturally on close.

## Notifications

### Fix 10: production_complete Notification Missing recipientContact & recipientName

- **Files Changed**:
  - `apps/web/src/app/api/production/[id]/route.ts`
- **Root Cause**: The `triggerNotification()` call for `eventType: "production_complete"` did not pass `recipientContact` (top-level on the event object) or `clientName` (inside `payload` for the dispatcher's `recipientName` fallback chain). This caused `notification_logs` entries to have an empty `recipientContact` field and a generic `recipientName` of `"Business Owner"`.
- **What Changed**: Added a two-hop client lookup before the `triggerNotification()` call: `updated.orderId` → `orders` collection → `order.client_id` → `clients` collection. Passes `recipientContact: client.phone` at the event top level and `clientName: client.name` inside `payload`. Both lookups are wrapped in a single `try/catch` so that malformed `ObjectId` strings, missing orders, or missing clients all gracefully fall back to `recipientContact: ""` and `recipientName: "Unknown Client"` — never throws. Pattern reused from `orders/[id]/route.ts` lines 80–86.

### Fix 11: Desktop Dialog Off-Center Alignment (dialogScale Keyframes Transform Override)

- **Files Changed**:
  - `apps/web/src/app/globals.css`
- **Root Cause**: `DialogContent` positions dialogs on desktop using `top: 50%; left: 50%; transform: translate(-50%, -50%)`. However, the `@keyframes dialogScaleIn` and `@keyframes dialogScaleOut` animations defined `transform: scale(...)` without `translate(-50%, -50%)`. The keyframe transform declarations wiped out the negative translate offsets during and after animation, causing the dialog's top-left corner to be placed at the screen center (50vw, 50vh) and pushing all desktop modals down and to the right.
- **What Changed**: Added `translate(-50%, -50%)` to all keyframe steps in `@keyframes dialogScaleIn` and `@keyframes dialogScaleOut` in `globals.css`. Mobile sheets are unaffected since they use `sheetSlideUp`/`sheetSlideDown`.

### Fix 12: Purchasing Dialogs Viewport Height Overflow & Flex Scroll Containment

- **Files Changed**:
  - `apps/web/src/app/dashboard/purchasing/page.tsx`
- **Root Cause**: The Add Vendor, New Purchase Order, and Order Detail modals had internal scroll areas without `min-h-0` flex bounds, and some inner `ScrollArea` elements had standalone `max-h-[90vh]` instead of parent-bounded flex layout. In flex containers, children expand to their natural height unless constrained with `min-h-0`, causing the rendered dialog height to exceed the viewport (`md:max-h-[85dvh]`) and spill equally off top and bottom edges.
- **What Changed**: Added `md:max-h-[85dvh] flex flex-col` to `DialogContent` wrappers and `flex-1 min-h-0` to all inner scroll regions (`ScrollArea` and `overflow-y-auto` divs). Removed unconstrained `max-h-[90vh]` on child scroll containers.

### Feature 1: Mobile PO Card Action Sheet

- **Files Changed**:
  - `apps/web/src/components/ui/MobileTableCards.tsx`
  - `apps/web/src/app/dashboard/purchasing/page.tsx`
- **What Changed**:
  - Added optional `actionsTrigger?: (row: T) => React.ReactNode` render-prop to `MobileTableCards` — fully backward-compatible; callers that don't pass it see byte-identical output (no `relative` class, no extra DOM nodes). When provided, renders the trigger absolute-positioned top-right of each card.
  - Purchasing page mobile PO cards now show a three-dot (`MoreVertical`) trigger button opening a `DropdownMenu` (same component as desktop) with **View Details** and **Delete** (admin-only, non-Received). Conditionally shown based on PO status and `isAdmin`, matching the desktop logic.
  - **"Mark as Received"** rendered inline in the STATUS field of each mobile card (and kept in the desktop `DropdownMenu`) — a tinted `motion.button` beside the status badge for Pending/Ordered POs.
  - **"Mark as Ordered"** action removed entirely from purchasing UI (desktop + mobile). `handleStatusChange` signature narrowed from `"Ordered" | "Received"` to `"Received"` only. The `"Ordered"` status value is still supported for display/legacy data in `STATUS_CONFIG` and type definitions — existing Ordered POs render correctly and can still transition to Received.
  - No new API routes created — reuses `PATCH /api/purchasing/[id]` and `DELETE /api/purchasing/[id]`.
  - Vendor cards' `MobileTableCards` usage and `reports/previous-years/page.tsx` untouched.
  - `MobileSheet.tsx` and `ConfirmDeleteSheet.tsx` not modified.

### Fix 13: Activity Log Tab Bar Mobile Congestion

- **Files Changed**:
  - `apps/web/src/app/dashboard/activity/page.tsx`
- **Root Cause**: Tab bar outer `motion.div` used `flex overflow-x-auto hide-scrollbar pb-2` — `hide-scrollbar` is a non-existent class (project uses `.scrollbar-hide` or inline `[scrollbar-width:none]`). Inner flex container lacked `w-max`, tab buttons lacked `shrink-0`, and there were zero responsive breakpoints (`sm:`, `md:`) for padding or font size, causing tabs to render congested/clipped on mobile viewports.
- **What Changed**: Brought in line with `previous-years/page.tsx` tab bar pattern: outer wrapper `w-full min-w-0`, scrollable inner with native scrollbar hiding (`[scrollbar-width:none] [&::-webkit-scrollbar]:hidden`), `w-max` flex track, `shrink-0 whitespace-nowrap` buttons with responsive padding (`px-2.5 sm:px-4`) and font (`text-[13px] sm:text-[14px]`).

### Fix 14: Activity Log Page Root Missing overflow-x-clip/min-w-0 Containment

- **Files Changed**:
  - `apps/web/src/app/dashboard/activity/page.tsx`
- **Root Cause**: Page root `motion.div` and loading skeleton wrapper used `className="space-y-6 hero-glow max-w-4xl mx-auto"` without `w-full min-w-0 overflow-x-clip`, violating the AGENTS.md rule that all `/dashboard` page roots must have these containment classes to prevent children from forcing horizontal scroll.
- **What Changed**: Added `w-full min-w-0 overflow-x-clip` to both the loading skeleton `<div>` (L106) and the main return `<motion.div>` (L119).

### Fix 15: Activity Log List Row Meta Block Mobile Overflow

- **Files Changed**:
  - `apps/web/src/app/dashboard/activity/page.tsx`
- **Root Cause**: The right-side meta block (amount + timestamp + chevron) in each activity list row used unconditional `flex-shrink-0`, `gap-6`, and displayed both relative time ("1d ago") and absolute date/time ("21 Aug, 02:45 pm") on all screen sizes. Combined with `ml-14` indent, the intrinsic content width (~303–325px) exceeded available mobile card width (~296–311px), forcing the row and page to overflow horizontally.
- **What Changed**: Changed `flex-shrink-0` → `flex-shrink sm:flex-shrink-0` (allows shrink on mobile only), `gap-6` → `gap-3 sm:gap-6`, `gap-3` → `gap-2 sm:gap-3` on inner timestamp container, added `min-w-0` at each nesting level, hid secondary date/time line on mobile via `hidden sm:block`, added `shrink-0` to amount text and chevron icon, added `whitespace-nowrap` to both timestamp spans.

### Fix 16: FY Archive Page Selector Row Mobile Overflow

- **Files Changed**:
  - `apps/web/src/app/dashboard/reports/previous-years/page.tsx`
- **Root Cause**: FY selector actions container (FY button + Export button) used `shrink-0` unconditionally, and the FY button had `min-w-[140px]` on all screen sizes. Combined intrinsic width (~314px) exceeded available content width on 360px-and-under mobile viewports, pushing the KPI grid past the right viewport edge.
- **What Changed**: Removed `shrink-0` from actions container (replaced with `min-w-0`), removed mobile `min-w-[140px]` floor from FY button (kept `sm:min-w-[160px]` only), added `shrink-0` to FY button itself so it stays inline but allows the container to compress. `flex-wrap` (already present) handles fallback wrapping.

### Fix 17: FY Archive Inventory Sub-Tab Bar Missing Scroll Containment

- **Files Changed**:
  - `apps/web/src/app/dashboard/reports/previous-years/page.tsx`
- **Root Cause**: The secondary sub-tab bar inside `InventoryUsageTable` ("Material Deductions" / "Batch Traceability") used a bare `flex gap-2 p-4` container with no `overflow-x-auto`, `shrink-0`, or `whitespace-nowrap` on buttons, causing horizontal overflow on screens ≤375px.
- **What Changed**: Added `overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden` to the container div, and `shrink-0 whitespace-nowrap` to both toggle buttons.

### Fix 18: FY Archive Page ~45px Horizontal Overflow from Framer Motion Ghost Node

- **Files Changed**:
  - `apps/web/src/app/dashboard/reports/previous-years/page.tsx`
- **Root Cause**: The ternary at L385-410 (`dataLoading` spinner / `!data` empty-state / data tables) rendered three mutually-exclusive branches inside the same `motion.div` parent without unique `key` props. Framer Motion retained the outgoing branch's DOM node during its 400ms stagger transition, and the empty-state `IOSCard` (unconstrained width, no `min-w-0`/`overflow-hidden`) caused ~45px page-level horizontal overflow when this ghost node briefly coexisted with real data.
- **What Changed**: Added unique `key` props to each ternary branch (`key="loading-state"`, `key="empty-state"`, `key="data-loaded"`) so React/Framer Motion treats them as genuinely different nodes and unmounts the outgoing one immediately. Added `min-w-0 w-full overflow-hidden` containment to the empty-state `IOSCard` as defense-in-depth. Parent `motion.div` already had `w-full min-w-0 overflow-x-clip` — no change needed there.

### Feature 2: Floating Bottom Navigation Dock with Raised Brand Badge

- **Files Changed**:
  - `apps/web/src/app/dashboard/layout.tsx`
- **What Changed**:
  - Restyled mobile bottom navigation from an edge-to-edge transparent gradient into a floating dock with `bottom-4 left-4 right-4` (`16px` inset), `rounded-[28px]`, `bg-card/90 dark:bg-card/95 backdrop-blur-xl`, `border border-border`, and `shadow-xl shadow-black/10 dark:shadow-black/40`.
  - Added a `56px` (`h-14 w-14`) raised circular badge (`bg-zinc-950 dark:bg-zinc-900 border border-white/15 dark:border-white/10 shadow-lg shadow-black/30`) over the Dashboard tab, overlapping the top edge by 50% (`-top-7`).
  - Centered brand icon `<Factory className="h-6 w-6 text-white" />` inside the circular badge with active indicator `ring-2 ring-primary/50` when on the Dashboard route.
  - Preserved existing active dot indicator and transitions for the remaining 4 tabs (Orders, Production, Inventory, More).
  - Kept safe-area-inset-bottom handling intact.

### Feature 3: Audio Feedback for Major Task Completions (Howler.js)

- **Files Changed / Added**:
  - `apps/web/package.json` (installed `howler` + `@types/howler`)
  - `apps/web/src/hooks/useCompletionSound.ts` (NEW)
  - `apps/web/src/app/dashboard/settings/page.tsx`
  - `apps/web/src/app/dashboard/orders/create/page.tsx`
  - `apps/web/src/lib/hooks/use-orders.ts`
  - `apps/web/src/components/billing/CreateInvoiceModal.tsx`
  - `apps/web/src/app/dashboard/purchasing/page.tsx`
  - `apps/web/src/app/dashboard/production/[id]/page.tsx`
- **What Changed**:
  - Added Howler.js integration for reliable mobile audio context unlock inside Capacitor WebViews.
  - Implemented `apps/web/src/hooks/useCompletionSound.ts` exporting `playCompletionSound(type: 'general' | 'payment')` and `useCompletionSound()` hook with:
    - Fixed volume: `0.35`
    - Debounce: 800ms window per sound type to suppress rapid repeats (e.g. bulk receipts)
    - Sound sources: `/sounds/success-general.mp3` and `/sounds/success-payment.mp3`
    - Global mute persistence: Reads and writes `localStorage.getItem("ind-manager-sound-enabled")` (default: `true`), with custom window event `ind-manager-sound-toggle` and storage listeners for instantaneous multi-tab and UI sync.
  - Added "Sound Effects" toggle card under the Notifications tab in `apps/web/src/app/dashboard/settings/page.tsx` using the project's standard `@/components/ui/switch` component.
  - Wired triggers exclusively to confirmed major task completions:
    1. **Order created**: `apps/web/src/app/dashboard/orders/create/page.tsx` (L380, `type: 'general'`).
    2. **Payment recorded / reconciled**: `apps/web/src/lib/hooks/use-orders.ts` in `useRecordPayment` (L220) and `useCreatePayment` (L407) (`type: 'payment'`).
    3. **Invoice created / saved**: `apps/web/src/components/billing/CreateInvoiceModal.tsx` (L479, `type: 'general'`).
    4. **Purchase order marked as received**: `apps/web/src/app/dashboard/purchasing/page.tsx` in `handleStatusChange` (L486, `type: 'general'`).
    5. **Production batch completed**: `apps/web/src/app/dashboard/production/[id]/page.tsx` for manual completion in `handleAction("complete")` (L254) and auto-completion in `handleUpdateProgress` (L304) with `!wasCompleted` prior-state transition guard (`type: 'general'`).

### Feature 4: Settings Master-Detail Routed Navigation & Tax & Compliance Section

- **Files Changed / Added**:
  - `apps/web/src/models/CompanyProfile.ts`
  - `apps/web/src/app/api/profile/tax/route.ts` (NEW)
  - `apps/web/src/app/api/profile/company/route.ts`
  - `apps/web/src/app/dashboard/settings/page.tsx`
  - `apps/web/src/app/dashboard/settings/SettingsHeader.tsx` (NEW)
  - `apps/web/src/app/dashboard/settings/company-info/page.tsx` (NEW)
  - `apps/web/src/app/dashboard/settings/tax/page.tsx` (NEW)
  - `apps/web/src/app/dashboard/settings/language/page.tsx` (NEW)
  - `apps/web/src/app/dashboard/settings/security/page.tsx` (NEW)
  - `apps/web/src/app/dashboard/settings/notifications/page.tsx` (NEW)
  - `apps/web/src/app/dashboard/settings/modules/page.tsx` (NEW)
  - `apps/web/src/app/dashboard/settings/team/page.tsx`
  - `apps/web/src/app/dashboard/settings/audit-trails/page.tsx` (NEW)
  - `apps/web/src/app/dashboard/settings/tally-integration/page.tsx` (NEW)
  - `apps/web/src/app/dashboard/settings/data/page.tsx` (NEW)
- **What Changed**:
  - Converted monolithic stacked accordion settings page (`/dashboard/settings`) into master-detail routed architecture:
    - Master list (`/dashboard/settings`): Clean list-only grouped iOS cards with badges, subtitles, and trailing `ChevronRight` drill-downs. No inline expansion.
    - 10 dedicated sub-routes: `company-info`, `tax`, `language`, `security`, `notifications`, `modules`, `team`, `audit-trails`, `tally-integration`, `data`.
    - `SettingsHeader`: Standardized sticky header with back button returning to `/dashboard/settings`, title, subtitle, and badge with complete overflow containment (`w-full min-w-0 overflow-hidden`).
  - Added new "Tax & Compliance" section (`/dashboard/settings/tax`):
    - Added `default_hsn_code` and `show_tax_breakdown` to `CompanyProfile` Mongoose model.
    - Added `GET` and `PATCH /api/profile/tax` endpoints supporting GSTIN/PAN regex validation, default rate, HSN, invoice tax breakdown toggle, and GST compliance fields (tax regime, TDS, TCS, RCM).
    - Surfaced GST Compliance fields in a separated card on the page: `tax_regime` dropdown, `tds_applicable` switch, `tcs_applicable` switch, and `reverse_charge_liable` switch.
    - Inline regex validation on blur for GSTIN (`/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/`) and PAN (`/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/`).
    - Dedicated iOS Teal token badge (`#00C7BE`) for Tax & Compliance to avoid orange collision.
    - Preserved 2FA disabled state as "Coming soon" without fake backend UI.

### Fix 19: Client Products & Materials 204 No Content Response Handling (page.tsx:362 404 Bug)

- **Files Changed**:
  - `apps/web/src/app/dashboard/clients/page.tsx`
  - `apps/web/src/modules/clients/infrastructure/client.repository.ts`
  - `apps/web/src/app/dashboard/billing/page.tsx`
- **Root Cause**:
  - The API v1 `DELETE /api/v1/clients/products/[id]` endpoint returns `envelope.noContent()` (HTTP 204 No Content with empty body).
  - In `page.tsx:362` and `page.tsx:401`, `handleDeleteProduct` and `handleDeleteMaterial` unconditionally called `const data = await res.json()`. Because HTTP 204 responses have no body, `res.json()` threw `SyntaxError: Unexpected end of JSON input`.
  - This exception skipped UI state cleanup and re-fetching, leaving the already-deleted product displayed in the client UI and showing a "Failed to delete product" toast.
  - When the user clicked the delete button again, the product was already deleted on the server, causing subsequent DELETE requests to fail with HTTP 404 (`NotFoundError`), repeatedly logging `DELETE ... 404 (Not Found)`.
- **What Changed**:
  - `clients/page.tsx`: Updated `handleDeleteProduct` and `handleDeleteMaterial` to check `res.ok || res.status === 404`. On success or 404, immediately removes the item from local state (`clientProducts` / `productMaterials`) and triggers a refresh without calling `res.json()`. Safe `res.json().catch(() => ({}))` only used on real errors (`!res.ok`).
  - `client.repository.ts`: Made `deleteProduct` and `deleteMaterial` ID filtering polymorphic (`$or: [{ _id: new ObjectId(id) }, { _id: id }]`) to reliably match documents whether `_id` is an `ObjectId` or string.
  - `billing/page.tsx`: Applied the same 204-safe response handling to `handleDelete` for bills.

### Feature 5: Production Setup Wizard State Persistence (useDraftPersistence)

- **Files Changed / Added**:
  - `apps/web/src/hooks/useDraftPersistence.ts` (NEW)
  - `apps/web/src/app/dashboard/production/create/page.tsx`
  - `apps/web/src/app/dashboard/layout.tsx`
  - `apps/web/src/app/dashboard/profile/page.tsx`
- **Root Cause / Problem**:
  - The Production Setup wizard held form state in unpersisted local `useState` within `CreateProductionPage`.
  - In Next.js App Router with Framer Motion `<PageTransition>`, navigating away (e.g. to Inventory) or reloading unmounts the page component, discarding in-progress order selections, machine assignments, operator assignments, and input configs.
- **What Changed**:
  - Created reusable hook `useDraftPersistence<T>(rawKey, initialState, options)` with:
    - Scope namespacing: `draft:<scopeId>:<wizardName>:<contextId>` resolving from user org/admin/user ID with synchronous hydration from `localStorage.getItem("ind:auth:scope")`.
    - Draft envelope: `{ data: T, savedAt: number, version: number }`.
    - Staleness check (24h TTL): If `Date.now() - savedAt > 24 * 60 * 60 * 1000`, the stale draft is discarded and default initial state is returned.
    - Debounced writes (300ms) with immediate `flush()` on component unmount, `beforeunload`, and `visibilitychange === 'hidden'`.
    - Clean helpers: `clearDraft()` for explicit discard/submit cleanup, `clearAllDrafts()` for session/logout scrubbing.
    - Multi-tab same-draft collision documented as accepted limitation.
  - Integrated into `CreateProductionPage`:
    - Connected draft persistence across all 4 steps and 15 state fields.
    - Fresh data reconciliation: When `Promise.all` for orders, inventory, machines, and employees resolves, restored draft IDs are cross-checked. If any machine, operator, or order ID is deleted/inactive in fresh data, clears only that specific field to unselected while keeping the row container and the rest of the draft completely intact.
    - Added `clearDraft()` on successful creation in `handleSubmit` and Cancel button in `handleCancel`.
  - Wired `clearAllDrafts()` into `handleLogout` in both `layout.tsx` and `profile/page.tsx` to scrub all `draft:` keys and auth scope fallback on logout.

### Fix 20: Desktop Dialog Off-Center Alignment (Tailwind v4 `translate` compounding with `transform`)

- **Files Changed**:
  - `apps/web/src/components/ui/dialog.tsx`
- **Root Cause**:
  - In Tailwind CSS v4, utility classes like `md:-translate-x-1/2 md:-translate-y-1/2` emit the modern CSS `translate: -50% -50%` property rather than `transform`.
  - Meanwhile, `glass.css` (`@media (min-width: 769px)`), `globals.css` (`[data-slot="dialog-content"]:not([data-fullscreen])`), and `@keyframes dialogScaleIn` set `transform: translate(-50%, -50%) !important`.
  - In modern Chromium and WebKit engines, `translate` and `transform` are independent CSS properties that compound. The dialog was translated by -50% from `translate` AND -50% from `transform` (-100% total in both axes), causing its bottom-right corner to touch the viewport center and pushing its top and left edges entirely off-screen.
- **What Changed**:
  - In `dialog.tsx`, replaced `md:-translate-x-1/2 md:-translate-y-1/2` (in both `fullScreenMobile` and default desktop branches) with `md:[translate:none]`.
  - This allows the explicit `transform: translate(-50%, -50%)` rules in `glass.css` and `globals.css` to center the dialog with exact sub-pixel precision across all 23 dialog instances on desktop.

### Fix 21: Desktop Sheet/Modal Centering Conflict with Framer Motion (MobileSheet.tsx & Settings Team Invite Modal)

- **Files Changed**:
  - `apps/web/src/components/ui/MobileSheet.tsx`
  - `apps/web/src/app/dashboard/settings/team/page.tsx`
- **Root Cause**:
  - `MobileSheet.tsx` (used by `CustomizeDashboardSheet` and adaptive sheets across the app) attempted to center `<motion.div>` on desktop viewports using inline styles `top: '50%', left: '50%', transform: 'translate(-50%, -50%)'`.
  - Framer Motion's `variantsModalScale` (`hidden: { opacity: 0, scale: 0.96, y: 8 }, visible: { opacity: 1, scale: 1, y: 0 }`) manages the `transform` property dynamically via its internal motion values. Framer Motion overrides and completely clobbers `transform: translate(-50%, -50%)` with its own `transform: translateY(0px) scale(1)`.
  - As a result, the modal remained positioned at `top: 50%, left: 50%` with its top-left corner at the screen center (50vw, 50vh), pushing the modal to the bottom-right and clipping the top header.
  - The same bug occurred in `settings/team/page.tsx` (`InviteModal`) where `<motion.div>` combined `animate={{ y: 0, scale: 1 }}` with `style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}`.
- **What Changed**:
  - Replaced `top: '50%', left: '50%', transform: 'translate(-50%, -50%)'` with `position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, margin: 'auto', height: 'fit-content'` in `MobileSheet.tsx` and `settings/team/page.tsx`.
  - This achieves true horizontal and vertical viewport centering purely via CSS layout constraints, completely removing any reliance on `transform`. Framer Motion's scale and y-axis spring animations now execute cleanly on top of the centered element with zero conflict.
  - Mobile bottom-sheet layout, touch drag gestures, and backdrop dismiss interactions remain completely untouched and verified intact.

### Fix 22: App-Wide Audit & Resolution of Desktop Modal / Dialog Centering (`AddMaterialModal.tsx`, `CreateOrderDialog.tsx`, `orders/[id]/edit/page.tsx`, and `dialog.tsx`)

- **Files Changed**:
  - `apps/web/src/components/ui/dialog.tsx`
  - `apps/web/src/components/inventory/AddMaterialModal.tsx`
  - `apps/web/src/app/dashboard/orders/CreateOrderDialog.tsx`
  - `apps/web/src/app/dashboard/orders/[id]/edit/page.tsx`
- **Root Cause & Comprehensive Audit**:
  - Following Fix 20 and Fix 21, a full-codebase audit was performed across all modal, dialog, sheet, and popup components in `apps/web` to eliminate all remaining desktop off-center positioning and clipping defects.
  - Components were categorized into three groups:
    1. **`MobileSheet.tsx`-backed sheets**: Inherited the Fix 21 `position: fixed; inset: 0; margin: auto; height: fit-content;` layout fix (`CustomizeDashboardSheet`, etc.).
    2. **Custom `<motion.div>` dialogs using `top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`**: `AddMaterialModal.tsx`, `CreateOrderDialog.tsx` (Discard Changes popup), and `orders/[id]/edit/page.tsx` (Discard Changes popup). Because Framer Motion dynamically manages inline `transform` for scale and fade entrance animations, it wiped out the CSS translate offset during render, shifting the modal's origin to screen center (50vw, 50vh) and throwing it to the bottom-right of desktop viewports.
    3. **Radix UI DialogContent (`dialog.tsx`)**: Replaced Tailwind v4 `md:-translate-x-1/2 md:-translate-y-1/2` with `md:[translate:none]` across both `fullScreenMobile` and default desktop branches to prevent modern CSS `translate: -50% -50%` from compounding with `globals.css` and `glass.css` `transform: translate(-50%, -50%) !important`.
- **What Changed**:
  - `AddMaterialModal.tsx`: Changed `<motion.div>` positioning from `left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2` to `fixed inset-0 m-auto h-fit w-[min(560px,calc(100vw-32px))] max-h-[90vh]`.
  - `CreateOrderDialog.tsx`: Changed Discard Changes `<motion.div>` from `fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(360px,90vw)]` to `fixed inset-0 m-auto h-fit w-[min(360px,calc(100vw-32px))]`.
  - `orders/[id]/edit/page.tsx`: Changed Discard Changes `<motion.div>` from `fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(380px,90vw)]` to `fixed inset-0 m-auto h-fit z-50 w-[min(380px,calc(100vw-32px))]`.
  - `dialog.tsx`: Replaced all desktop `translate` utilities with `md:[translate:none]`.
- **Visual Verification & Artifacts**:
  - `dialog.tsx` (Add Client):
    - Desktop 1440×900: `add_client_desktop_1440_1788861569232.png` (Bounding rect x=470, y=81, w=500, h=738; perfectly centered).
    - Mobile 375×812: `add_client_mobile_375_1788861597047.png` (Full-bleed mobile sheet intact, zero regression).
  - `AddMaterialModal.tsx`:
    - Desktop 1440×900: `add_material_desktop_1440_1788861737763.png` (Centered).
    - Desktop 1920×1080: `add_material_desktop_1920_1788948592730.png` (Centered at x=960, y=540).
    - Mobile 375×812: `add_material_mobile_375_1788861768881.png` (Centered with margin bounds, zero regression).
  - `orders/[id]/edit/page.tsx` & `CreateOrderDialog.tsx` (Discard Modal):
    - Desktop 1440×900: `edit_order_discard_desktop_1440_1788948242716.png` (Bounding rect x=506, y=354, w=428, h=192; perfectly centered at x=720, y=450).
    - Mobile 375×812: `edit_order_discard_mobile_375_1788948317275.png` (Bounding rect x=16, y=308, w=343, h=192; centered with 16px side margins, zero regression).

### Fix 23: Clients Page Desktop Multi-Column Card Grid Conversion

- **Files Changed**:
  - `apps/web/src/app/dashboard/clients/page.tsx`
- **Root Cause**:
  - The client list was trapped inside an artificial sidebar container with `w-full md:max-w-sm lg:max-w-md` inside a horizontal `flex` container (`flex h-[calc(100vh-120px)] gap-6`). Because the client details panel was built as a portaled Radix modal dialog (`<Dialog open={!!selectedClient}>`) rather than an inline right-side column, the client list was the sole child in normal page flow, leaving 60–70% empty dead space across desktop viewports.
  - Inside the card, clients were rendered as stacked rows with `divide-y divide-[var(--border)]`.
- **What Changed**:
  - Removed `md:max-w-sm lg:max-w-md` and converted outer layout to `flex flex-col h-[calc(100vh-120px)] gap-4 overflow-hidden max-w-7xl mx-auto w-full min-w-0`.
  - Replaced the single outer `<IOSCard>` with a scrollable container (`flex-1 overflow-y-auto min-h-0 pr-0.5 scrollbar-hide`) containing a responsive CSS Grid: `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 p-1`.
  - Converted each client item into an individual discrete card preserving exact design tokens (`rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm hover:shadow-md hover:border-[var(--primary)]/40 min-w-0 overflow-hidden`), typography, contact info, and three-dot action dropdown.
  - Retained header, New Client button, search bar, and client detail modal dialog interactions with zero regression.
- **Visual Verification & Artifacts**:
  - Desktop 1440×900 (3 columns): `clients_desktop_after_1440.png`
  - Desktop 1920×1080 (3 columns, 1280px centered grid): `clients_desktop_1920.png`
  - Tablet 1024×768 (2 columns): `clients_tablet_1024.png`
  - Mobile 375×812 (1 column, unchanged behavior): `clients_mobile_after_375.png`
  - Client detail dialog verification (desktop): `clients_dialog_opened_after_click.png`
  - Client detail sheet verification (mobile): `clients_mobile_dialog_opened.png`

### Fix 24: Desktop Dialog Frozen/Stuck Blue Bar Artifact & Content Clipping Resolution (`dialog.tsx` and `scroll-area.tsx`)

- **Files Changed**:
  - `apps/web/src/components/ui/dialog.tsx`
  - `apps/web/src/components/ui/scroll-area.tsx`
- **Root Cause**:
  - Desktop dialogs (such as "Upgrade to Pro (Annual)" and "New Vendor") displayed a thin horizontal blue bar near the bottom edge that appeared stuck or frozen.
  - The bar was **not** an animated loading bar or progress indicator, but the **primary action button** at the bottom of the modal (`bg-[var(--accent)]` / `.glow-btn`, `#2563EB` blue) being horizontally sliced by `overflow: hidden`.
  - In `dialog.tsx`, `DialogContent` with `fullScreenMobile` set `fixed inset-0 z-[1001] flex flex-col overflow-hidden` for mobile. On desktop (`md:`), it applied `md:max-h-[85dvh]` to constrain the dialog height to 85% of the viewport, but **failed to specify `md:overflow-y-auto`**, causing the dialog to inherit `overflow: hidden` on desktop. When dialog content exceeded `85dvh` (very common on laptop viewports ≤768px height or browser windows ≤600px), `DialogContent` hard-clamped at `85dvh` and clipped overflowing content. Because `overflow-y-auto` was omitted, the user could not scroll the dialog, leaving the top 5–20px slice of the blue button frozen at the bottom border.
  - In `scroll-area.tsx`, `ScrollAreaPrimitive.Root` was defined as `className={cn("relative", className)}`, omitting the standard `overflow-hidden`. Without `overflow-hidden`, `ScrollAreaPrimitive.Viewport` (`size-full`) did not respect flex container height bounds, expanding to full content height and spilling into `DialogContent`, where `DialogContent`'s outer `overflow: hidden` clipped the button.
- **What Changed**:
  - `dialog.tsx`: Added `md:overflow-y-auto` to desktop classes on `DialogContent` across both `fullScreenMobile` and default branches (`md:w-full md:max-h-[85dvh] md:overflow-y-auto`).
  - `scroll-area.tsx`: Added `overflow-hidden` to `ScrollAreaPrimitive.Root` (`className={cn("relative overflow-hidden", className)}`) conforming to Radix UI / shadcn specifications.
  - Mobile bottom-sheet layout, full-bleed mobile page styling (`fixed inset-0 flex flex-col overflow-hidden`), and the Upgrade modal's "Payment Gateway Notice" copy remain 100% untouched.
- **Visual Verification & Artifacts**:
  - "Upgrade to Pro (Annual)" modal (Desktop 1280×600):
    - Before: `before_upgrade_modal.png` (Horizontal blue bar artifact stuck at bottom edge).
    - After: `after_upgrade_modal.png` (Fully accessible, scrollable, complete "Got it" button).
  - "New Vendor" modal (Desktop 1280×600):
    - Before: `before_vendor_modal.png` (Horizontal blue strip artifact stuck at bottom edge).
    - After: `after_vendor_modal.png` (Fully accessible, smooth internal scroll, complete "Save Vendor" button).
  - "New Purchase Order" modal (Desktop 1280×600):
    - After: `after_po_modal.png` (Smooth scroll, complete "Create Purchase Order" button).
  - "Add New Client" modal (Desktop 1280×600):
    - Before: `before_client_modal.png` (Submit button clipped in half).
    - After: `after_client_modal.png` (Complete "Create Client Profile" button with full padding).
  - "Add New Employee" modal (Desktop 1280×600):
    - Before: `before_employee_modal.png` (Submit button and password fields clipped off).
    - After: `after_employee_modal.png` (Fully scrollable, all fields and buttons accessible).
  - Mobile Full-Bleed Regression Check (Mobile 390×844):
    - After: `after_upgrade_mobile.png` (Full-bleed edge-to-edge mobile sheet behavior 100% intact).

### Fix 25: Total Revenue KPI Card Desktop Overflow Resolution

- **Files Changed**:
  - `apps/web/src/lib/formatters.ts`
  - `apps/web/src/components/ui/StatWidget.tsx`
  - `apps/web/src/app/dashboard/page.tsx`
- **Root Cause**:
  - On desktop viewports (1200px–1280px), the 4-card KPI grid allocates ~146px–166px of content width per card.
  - Large currency figures formatted unabbreviated (e.g. ₹11,78,650) measure ~166px–171px at 32px font size, triggering `truncate` / `overflow: hidden` mid-number or with an ellipsis (`...`).
- **What Changed**:
  - `formatters.ts`: Added `formatIndianCurrencyCompact(val: number)` implementing Indian-style abbreviation:
    - `>= 1,00,00,000` (1 crore) → `₹X.XXCr` (2 decimals, e.g. `₹1.18Cr`)
    - `>= 1,00,000` (1 lakh) → `₹X.XXL` (2 decimals, e.g. `₹11.79L`)
    - `< 1,00,000` → full comma-grouped amount (e.g. `₹85,400`), no abbreviation
    - Returns `{ formatted, full }` with `full` used for tooltip/a11y.
  - `StatWidget.tsx`: Added `valueTitle?: string` prop. Bound native `title={valueTitle}` on the value container and child span, and updated `aria-label` to announce the full unabbreviated amount.
  - `dashboard/page.tsx`: Applied `formatIndianCurrencyCompact` exclusively to the "Total Revenue" card (`widgetMeta.id === "Total Revenue"`), passing `displayValue={compact.formatted}` and `valueTitle={compact.full}` while leaving all other KPI cards and all other pages untouched.
- **Visual Verification**:
  - Desktop 1280px: `dashboard_kpi_1280px.png` (displays `₹11.79L`, fits cleanly inside card with generous margins, native tooltip shows `₹11,78,650`).
  - Desktop 1440px: `dashboard_kpi_1440px.png` (displays `₹11.79L`, no clipping, other 3 cards unaffected).
  - Desktop 1920px: `dashboard_kpi_1920px.png` (displays `₹11.79L`, no clipping, other 3 cards unaffected).
  - Tablet 1024px: `dashboard_kpi_1024px.png` (displays `₹11.79L` in 2x2 grid with >150px clearance).

### Fix 26: Cross-Session Persisted In-App Notification Read State

- **Files Changed / Created**:
  - `apps/web/src/app/api/notifications/read/route.ts` (NEW)
  - `apps/web/src/lib/hooks/use-app-notifications.ts`
- **Root Cause**:
  - In-app notifications are dynamically derived on-the-fly from active business entities (overdue orders, stuck productions, low stock, pending payments) on every mount via `generateNotificationsFromData()`.
  - Previously, read IDs were persisted solely in client-side `localStorage` (`"ind_notification_read_ids"`). There was zero server-side persistence or database storage for in-app notification read state.
  - Whenever a user logged in on a fresh browser session, incognito window, or different device (or cleared cache), `localStorage` was empty, causing all notifications to revert to unread.
- **What Changed**:
  - **New API Route (`/api/notifications/read`)**:
    - `GET`: Authenticates session using server-side `getSessionUser()`. Rejects requests without valid session with HTTP 401. Fetches persisted `readIds: string[]` from MongoDB collection `notification_reads` for the authenticated `userId = String(user._id)`.
    - `POST`: Authenticates session using server-side `getSessionUser()`. Rejects unauthorized calls with HTTP 401. Validates and deduplicates incoming notification IDs.
    - **FIFO Array Cap Policy**: Implemented application-level trim with FIFO eviction capping `readIds` at 1000 entries. New unique IDs are appended chronologically, and if the total exceeds 1000, oldest entries are evicted from the front (`slice(-1000)`). Upserts document with `updatedAt: new Date()`.
  - **Hook Integration (`use-app-notifications.ts`)**:
    - In `refresh()`: In parallel with `/api/orders`, `/api/v1/inventory`, and `/api/payments`, fetches `GET /api/notifications/read`. Synchronizes persisted read IDs into `readIdsRef.current` and caches to `localStorage`.
    - In `markAsRead(id)`: Optimistically marks read in React state and fires `POST /api/notifications/read` with `{ ids: [id] }`.
    - In `markAllAsRead()`: Marks all in React state and fires `POST /api/notifications/read` with `{ ids: idsToMark }`.
    - `generateNotificationsFromData()` and dynamic business rules left 100% untouched.
- **Proof Bar & Verification**:
  - Logged in, verified initial unread notifications.
  - Marked one notification via individual click (`markAsRead`) and remaining via `markAllAsRead`. Verified MongoDB stored all read IDs.
  - Captured before screenshot (`notifications_read_before_fresh_session.png` / `media_1789065600000`) showing 0 unread badge and all items marked as read.
  - Executed `localStorage.clear()` (0 keys remaining).
  - Re-navigated to `/dashboard` on fresh session with clean client storage.
  - Verified `/api/notifications/read` returned all read IDs from MongoDB. Captured after screenshot (`notifications_read_after_fresh_session.png`) proving all notifications remain read across completely fresh client state.



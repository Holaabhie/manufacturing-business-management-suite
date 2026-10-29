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

### Fix 27: AI Assistant Page Mobile UX Refactoring & Icon Simplification (/dashboard/assistant)

- **Files Changed**:
  - `apps/web/src/app/dashboard/layout.tsx`
  - `apps/web/src/app/dashboard/assistant/page.tsx`
  - `apps/web/src/components/ai/SmartInputBar.tsx`
- **Root Cause**:
  - The `/dashboard/assistant` route had multiple layout and visual issues on mobile:
    1. Redundant AI icon boxes: multi-ring SVG `AIAssistantIcon` rendered in the top bar, in the in-page header, and inside the Welcome Card.
    2. Stale Chat/Reports tab row and reports sub-view from earlier prototypes were still present in DOM.
    3. Input bar was placed inline in document flow inside a flex column followed by `<aside>`, causing it to scroll up out of view when scrolling down to Quick Actions and Recent Insights.
    4. Quick Actions and Recent Insights cards were stacked vertically in the main scroll flow on mobile, crowding the page.
    5. Mobile input bar had no safe-area or floating bottom nav clearance.
- **What Changed**:
  - `layout.tsx`: Replaced complex multi-ring `AIAssistantIcon` with a minimal, clean `Bot` glyph from `lucide-react` in the mobile top bar (`w-[28px] h-[28px] rounded-[7px] bg-primary`) and desktop breadcrumb (`w-[20px] h-[20px] rounded-[5px] bg-primary`). Removed unused `AIAssistantIcon` import.
  - `page.tsx`:
    - Removed in-page header icon box entirely across all breakpoints. Exactly ONE AI bot icon now renders anywhere on the page (in the global top bar).
    - Simplified Welcome Card: removed the icon container and ✨ emoji per Sept 5 decision, leaving clean text-only greeting.
    - Completely removed the Chat/Reports tab row and the entire `viewMode === "reports"` block and its state.
    - Moved the "New Chat" reset action into a clean header button shown only when conversation is active (`userMessageCount > 0`).
    - Added an "Actions & Insights" header trigger on mobile (`lg:hidden`) that opens a `MobileSheet` containing Quick Actions (wired to `router.push`) and Recent Insights.
    - Preserved desktop two-column layout (`hidden lg:flex` aside).
    - Made chat thread the primary scrollable region with `pb-40` bottom padding on mobile.
    - Pinned input bar on mobile above the floating bottom nav (`fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-40 lg:sticky lg:bottom-0`), eliminating any overlap with bottom nav.
  - `SmartInputBar.tsx`: Cleaned up container padding/borders to integrate with pinned card, updated send button to single primary accent (`#2563EB`) removing multi-color gradient, hid desktop keyboard hints on mobile viewports.

### Fix 28: Input Focus-Ring Double Border & Missing --g-accent-blue Token Fix

- **Files Changed**:
  - `apps/web/src/styles/glass.css`
  - `apps/web/src/app/globals.css`
  - `apps/web/src/components/ui/command.tsx`
  - `apps/web/src/components/ui/input.tsx`
  - `apps/web/src/app/dashboard/orders/CreateOrderDialog.tsx`
  - `apps/web/src/components/ui/SearchBar.tsx`
  - `apps/web/src/components/ui/ios/IOSSearchBar.tsx`
  - `apps/web/src/components/ui/ios/IOSFormElements.tsx`
  - `apps/web/src/components/production/AssignStaffDialog.tsx`
  - `apps/web/src/app/dashboard/production/page.tsx`
  - `apps/web/src/app/dashboard/orders/page.tsx`
  - `apps/web/src/app/dashboard/purchasing/page.tsx`
  - `apps/web/src/app/dashboard/profile/page.tsx`
- **Root Cause**:
  1. In Command Palette, `CommandDialog` renders inside `<DialogContent data-slot="dialog-content">`. `glass.css` applied resting borders/shadows and a 4px focus box-shadow with `!important` to all dialog inputs, turning the inner search `<input>` into a boxed rectangle inside `command-input-wrapper` which already had `focus-within:ring-2`.
  2. In `glass.css`, `border-color: var(--g-accent-blue) !important;` was specified on focused dialog inputs, but `--g-accent-blue` was undeclared in CSS tokens. Under CSS Custom Properties specs, this declaration failed at computed-value time and fell back to `currentColor`, which resolved to `--g-text-primary` (`#0F172A`, dark navy text) instead of blue.
  3. App-wide form and search inputs used stacked 2px/3px rings.
- **What Changed**:
  1. Defined `--g-accent-blue: #2563EB;` and `--g-accent-blue-glow: rgba(37, 99, 235, 0.35);` in `:root` (and `rgba(99, 210, 255, 0.8)` in `.dark`) in both `glass.css` and `globals.css`. Dialog inputs now display genuine design token blue `#2563EB` upon focus.
  2. Added explicit exemption in `glass.css` for `[data-slot="command-input"]` (`border: none !important; box-shadow: none !important; background: transparent !important;`).
  3. Tightened `command-input-wrapper` to `focus-within:ring-1 focus-within:ring-[#2563EB]/20`.
  4. Reduced dialog input focus ring spread from 4px to 2px across light and dark modes in `glass.css`.
  5. Reduced `focus-visible:ring-[3px]` to `focus-visible:ring-1 focus-visible:ring-ring/40` in `components/ui/input.tsx`.
  6. Audited and tightened all stacked rings to 1px across `CreateOrderDialog.tsx`, `SearchBar.tsx`, `IOSSearchBar.tsx`, `IOSFormElements.tsx`, `AssignStaffDialog.tsx`, `orders/page.tsx`, `production/page.tsx`, `purchasing/page.tsx`, and `profile/page.tsx`.
### Fix 29: Mobile Bottom Navigation Overflow & Low-Stock Warning Card Reflow

- **Files Changed**:
  - `apps/web/src/app/dashboard/layout.tsx`
  - `apps/web/src/app/dashboard/page.tsx`
- **Root Cause**:
  1. **Bottom Nav Bar Overflow**: In `layout.tsx`, `<nav>` used `flex items-end justify-around px-2` with unconstrained `<Link>` and `<button>` children (no `flex-1`, `min-w-0`, or `w-full`), plus wide horizontal padding (`px-3`) on inner items. Because items sized to their intrinsic text widths (e.g. "Production" ~89px) without flex distribution, total content width (~394px) exceeded the floating dock's width on 360–390px viewports (328–358px), pushing the 5th item ("More") over the right and bottom edges of the bar.
  2. **Low-Stock Warning Card Wrapping & Button Sizing**: In `page.tsx`, the warning banner forced a horizontal single-row flex layout (`flex items-center gap-3`) on all viewports. On 390px phones, after card padding (40px) and the warning icon (56px) and "View Inventory" button (~130px), only ~132px remained for text, causing jagged word-by-word wrapping over 5–6 lines while cramping the button against the right edge.
- **What Changed**:
  1. `layout.tsx`: Updated `<nav>` to `relative flex items-center justify-between w-full px-1 pt-2.5 pb-2 overflow-hidden`. Applied `flex-1 min-w-0 flex flex-col items-center justify-center p-0 m-0 bg-transparent border-0 cursor-pointer select-none` to both `<Link>` and `<button>` item wrappers, and `w-full px-0.5 py-1` with `truncate max-w-full text-center text-[10px]` on inner content. Uniform icon size set to `size={20}`. Guarantees strictly equal width (e.g. 70px on 390px, 64px on 360px, 75px on 414px) and complete visual containment inside the rounded dock.
  2. `page.tsx`: Reflowed the alert card into a responsive column-to-row layout (`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 sm:gap-4`). On mobile, the top row gives the icon and text full card width (272px+), allowing the alert title ("{count} item(s) below minimum stock level") and description to read cleanly on natural single lines without awkward wrapping. The "View Inventory" button renders as a full-width (`w-full sm:w-auto`), comfortably-padded, beautifully-styled tinted iOS button (`h-[36px] px-4 rounded-[10px]`) below the text on mobile, transitioning smoothly to right-aligned on desktop.

### Fix 30: Orders Staff View Missing Next-Intl Translation Messages

- **Files Changed**:
  - `apps/web/src/messages/en.ts`
  - `apps/web/src/messages/hi.ts`
  - `apps/web/src/messages/mr.ts`
  - `apps/web/src/messages/gu.ts`
- **Root Cause**: In `apps/web/src/app/dashboard/orders/page.tsx`, the staff view (`isStaff`) references `t("staff.totalOrders")`, `t("staff.completedOrders")`, and `t("staff.production")`. While `orders.kpi` defined `totalOrders`, `orders.staff` in all dictionary files only defined `pending`, `inProgress`, `done`, `productionQueue`, etc., lacking `totalOrders`, `completedOrders`, and `production`. When viewing orders in Hindi (`hi`) or other locales as a staff user, Next-intl threw `MISSING_MESSAGE: Could not resolve orders.staff.totalOrders in messages for locale hi`.
- **What Changed**: Added `totalOrders`, `completedOrders`, and `production` with accurate translations under `orders.staff` across all 4 locales in TypeScript (`src/messages/*.ts`) dictionaries (legacy JSON dictionaries deleted):
  - English: `"totalOrders": "Total Orders"`, `"completedOrders": "Completed Orders"`, `"production": "Production"`
  - Hindi: `"totalOrders": "कुल ऑर्डर"`, `"completedOrders": "पूर्ण ऑर्डर"`, `"production": "उत्पादन"`
  - Marathi: `"totalOrders": "एकूण ऑर्डर्स"`, `"completedOrders": "पूर्ण ऑर्डर्स"`, `"production": "उत्पादन"`
  - Gujarati: `"totalOrders": "કુલ ઓર્ડર"`, `"completedOrders": "પૂર્ણ ઓર્ડર"`, `"production": "ઉત્પાદન"`
### Feature 2: Universal Month/Year Filter Component across Billing, Payments, Folio, and Purchasing

- **Files Changed / Created**:
  - `apps/web/src/components/ui/month-year-filter.tsx` (NEW)
  - `apps/web/src/hooks/useTenantCreationDate.ts` (NEW)
  - `apps/web/src/app/api/auth/me/route.ts`
  - `apps/web/src/app/dashboard/billing/page.tsx`
  - `apps/web/src/app/dashboard/payments/page.tsx`
  - `apps/web/src/app/dashboard/folio/page.tsx`
  - `apps/web/src/app/dashboard/purchasing/page.tsx`
- **What Changed**:
  - **Component (`month-year-filter.tsx`)**: Built a reusable, bounded Month/Year filter matching dark theme tokens (`#0F1117`, `#161B27`, `#1C2333`).
    - Year selector: Radix `Select` listing years from tenant creation date year up to the current year.
    - Month pills: Horizontal scrollable container with `.scrollbar-hide`, active pill `bg-[var(--primary)] text-white shadow-sm`, inactive `bg-muted/60 text-muted-foreground hover:bg-muted`, `h-8 px-3 rounded-full text-xs font-medium`. Includes an "All" pill for full-year view.
    - Strict boundary enforcement: Month pills are bounded so that for the earliest year, only months `>= earliestDate.month` are shown (e.g. signup in February omits January), and for the current year, only months `<= currentMonth` are shown (future months omitted).
    - Exported `matchesMonthYear()` helper supporting ISO strings, `YYYY-MM-DD`, Date instances, and timestamps via numeric substring slicing to prevent UTC timezone day/month rollover.
  - **Tenant Date Resolution**:
    - Updated `/api/auth/me` to resolve the root admin user's `createdAt` as `tenantCreatedAt` when logged in as a Staff account (`adminUser._id === user.businessOwnerId`).
    - Created `useTenantCreationDate()` hook to supply `earliestDate` seamlessly across dashboard pages.
  - **Module Integration**:
    - **Billing**: Filtered `filteredBills` by `billDate` across desktop Table and mobile cards.
    - **Payments**: Filtered `filteredHistory` by `paymentDate` on the Full History tab across desktop and mobile.
    - **Folio**: Filtered `filteredExpenses` by `date` and `filteredNotes` by `updatedAt` / `createdAt` across desktop and mobile.
    - **Purchasing**: Filtered `filteredOrders` by `orderedAt` (fallback `createdAt`) across desktop and mobile.
- **Visual Verification & Artifacts**:
  - `billing_populated_month.png` / `billing_empty_month.png` / `billing_mobile_view.png`
  - `payments_populated_month.png` / `payments_empty_month.png` / `payments_mobile_view.png`
  - `folio_populated_month.png` / `folio_empty_month.png` / `folio_mobile_view.png`
  - `purchasing_populated_month.png` / `purchasing_empty_month.png` / `purchasing_mobile_view.png`
  - `signup_month_and_year_selector.png` (demonstrating year dropdown open and signup month bounding).

### Fix 23: Staff Order/Task Allocation Scoping

- **Files Changed**:
  - `apps/web/src/app/api/staff/work-panel/route.ts`
  - `apps/web/src/app/api/v1/orders/route.ts`
  - `apps/web/src/modules/orders/infrastructure/order.repository.ts`
  - `apps/web/src/app/api/orders/route.ts`
- **Root Cause**:
  - Staff users logging in and viewing the Staff Dashboard ("Today's Tasks" / Work Panel) or Orders page were presented with company-wide orders and tasks rather than those assigned to their own staff account ID.
  - While `my-productions/route.ts` correctly scoped by `assignedStaff: String(user._id)`, `work-panel/route.ts`, `/api/v1/orders/route.ts`, and legacy `/api/orders/route.ts` lacked staff-scoping via the `productions` collection.
- **What Changed**:
  - `apps/web/src/app/api/staff/work-panel/route.ts`: When `user.role === "Staff"`, queries `productions` for `{ userId: getDataOwnerId(user), assignedStaff: String(user._id) }`, projects distinct `orderId`s, short-circuits to empty statistics and empty arrays if 0 assigned orders exist, and appends `_id: { $in: convertedOrderIds }` to `baseFilter` so both `assignedOrders` and `todaysTasks` are scoped to the logged-in staff member.
  - `apps/web/src/modules/orders/infrastructure/order.repository.ts`: Added optional `restrictToOrderIds?: string[]` to `findAll()` method; when supplied, adds `_id: { $in: convertedOrderIds }` to `matchStage` using polymorphic `ObjectId` and string conversion.
  - `apps/web/src/app/api/v1/orders/route.ts`: For `Staff` role, resolves assigned `orderId`s via `productions` lookup, short-circuits to `envelope.ok([])` if empty, and delegates to `repo.findAll(ownerId, filters, orderIds)`. Non-staff path remains 100% unchanged.
  - `apps/web/src/app/api/orders/route.ts`: For `Staff` role, resolves assigned `orderId`s via `productions` lookup, short-circuits to `NextResponse.json([])` if empty, and sets `$match._id = { $in: convertedOrderIds }` in aggregation pipeline. Non-staff path remains 100% unchanged.
- **Verification**:
  - Build succeeded with Turbopack with 0 type errors.
  - Verified live isolation: Staff A sees 3 assigned orders, Staff B sees 1 assigned order (zero overlap), Admin sees all 4 orders across staff, and Staff with 0 assigned productions cleanly renders empty states without errors or crashes.

### Fix 31: Staff Dashboard & Orders Page Cleanup (Fix B)

- **Files Changed**:
  - `apps/web/src/app/api/orders/route.ts`
  - `apps/web/src/app/api/v1/orders/route.ts`
  - `apps/web/src/components/StaffWorkPanel.tsx`
  - `apps/web/src/app/dashboard/orders/page.tsx`
- **Root Cause & Security Gaps**:
  1. Staff accounts on `/dashboard/orders` had access to "Add Order" and "Export" buttons in the page header.
  2. While the UI visually showed or hid controls, neither backend route handling order creation (`POST /api/orders` or `POST /api/v1/orders`) performed a server-side role check, leaving an API authorization vulnerability where a Staff session could post new orders.
  3. Several stat cards on both `StaffWorkPanel.tsx` ("Completed Tasks", "Pending Work", "Today's Tasks") and `orders/page.tsx` ("Total Orders", "Completed Orders") lacked interactive `href`s or `onClick` actions.
  4. The "Production Queue" status item on the Staff Work Panel was mistakenly bound to `stats.assignedOrders` (the total order count) rather than in-progress production/orders count (`orderStatusCounts.inProgress`).
  5. The Staff Work Panel displayed "Worker Status" (monitoring other workers, which is an Admin/Manager task) and "Machine Status" (for `/dashboard/machines`, which is in `ADMIN_ONLY_ROUTES`).
- **What Changed**:
  - **Backend Server-Side Role Enforcement (Security)**:
    - Added role check in `apps/web/src/app/api/orders/route.ts` (POST): rejects `user.role === "Staff"` with HTTP 403 Forbidden (`{ success: false, message: "Forbidden: Staff members cannot create orders" }`).
    - Added role check in `apps/web/src/app/api/v1/orders/route.ts` (POST): rejects `user.role === "Staff"` with HTTP 403 Forbidden via `envelope.error("Forbidden: Staff members cannot create orders", 403, "FORBIDDEN")`.
  - **Staff Action Buttons Gating**:
    - Wrapped "Add Order" and "Export" header actions on `/dashboard/orders` with `{!isStaff && ( ... )}` so neither button is rendered for Staff users. Verified client-side Excel export is also inaccessible.
    - Preserved full "Add Order" and "Export" buttons and entire desktop orders table for Admin users with zero change.
  - **Wired Stat Cards & List Items**:
    - `StaffWorkPanel.tsx`:
      - "Total Orders" card: links to `/dashboard/orders`.
      - "Completed Tasks" card: links to `/dashboard/orders?status=completed`.
      - "Pending Work" card: links to `/dashboard/orders?status=pending`.
      - "Today's Tasks" card: links to `/dashboard/orders`.
      - "Production Queue" StatusItem: bound to `orderStatusCounts.inProgress` (accurate scoped count).
      - "Recent Assigned" orders and "My Assigned Orders" list items: wrapped in Next.js `Link` pointing to `/dashboard/orders/${id}/edit`.
      - "Today's Tasks" list items: wrapped in Next.js `Link` pointing to `/dashboard/orders/${id}/edit`.
    - `orders/page.tsx` (Staff block only):
      - "Total Orders" card: `onClick={() => setStatusShortcut(null)}`.
      - "Completed Orders" card: `onClick={() => setStatusShortcut("completed")}`.
      - Status breakdown items (Pending, In Progress, Done): `onClick={() => setStatusShortcut(status)}`.
      - Recent Orders list items: wrapped in Next.js `Link` to `/dashboard/orders/${orderId}/edit`.
      - Production Queue items: wrapped in Next.js `Link` to `/dashboard/production`.
  - **Staff Role Permission Cleanup**:
    - Removed "Worker Status" StatusItem (staff members do not manage other workers).
    - Removed "Machine Status" StatusItem (verified `/dashboard/machines` is in `ADMIN_ONLY_ROUTES` in `middleware.ts`).
    - Retained "Material Status" StatusItem (verified `permissions.ts` grants `"inventory.view": true` to Staff).
- **Visual Verification & Artifacts**:
  - `staff_orders_after_fix_b.png`: Demonstrates "Add Order" and "Export" buttons completely removed for Staff; interactive status and order cards present.
  - `staff_work_panel_after_fix_b.png`: Demonstrates wired stat cards with link arrows, Production Queue = 1, Material Status = 0, Machine Status and Worker Status removed.
  - `admin_orders_after_fix_b.png`: Demonstrates Admin view 100% unchanged (Add Order and Export buttons present, full 4-order admin table with financials and actions).
  - Server-side authorization test: `scratch/test_post_auth.js` verified both `POST /api/orders` and `POST /api/v1/orders` return HTTP 403 Forbidden when called by a Staff account.

## Quotes / Estimates Module (Phase 1 — Zoho Books Parity)

- **Module Layer**: `apps/web/src/modules/quotes/`
  - Domain & Types: `domain/types.ts` (`Quotation`, `QuoteItem`, `QuoteCustomer`, `QuoteStatus` ["Draft", "Sent", "Accepted", "Rejected", "Expired"], DTOs, `IQuoteRepository`)
  - Schemas: `domain/schemas.ts` (`createQuoteSchema`, `updateQuoteSchema`, `quoteStatusTransitionSchema`)
  - Sequence Generator: `infrastructure/quote-sequence.ts` (race-safe tenant-scoped atomic counter in `quotation_counters` collection using `CompanyProfile.quotation_prefix` or `"QT-"`)
  - Repository: `infrastructure/quote.repository.ts` (MongoDB `quotations` collection with read-time `Expired` status calculation)
  - Application Service: `application/quote.service.ts` (CRUD, Draft→Sent→Accepted/Rejected transitions, duplicate quote to Draft)
  - Factory: `index.ts` (singleton export `getQuoteService()`)
- **API Layer**: `apps/web/src/app/api/quotes/`
  - `route.ts`: GET (tenant list/filter) & POST (create quote with idempotency & audit logging)
  - `[id]/route.ts`: GET (detail), PATCH (update with idempotency & audit logging), DELETE (delete with audit logging)
  - `[id]/status/route.ts`: POST (status transition with audit logging)
  - `[id]/duplicate/route.ts`: POST (duplicate quote to new Draft with audit logging)
  - `[id]/generate-pdf/route.ts`: GET/POST (PDF generation via Puppeteer with HTML fallback)
- **UI Components & Pages**:
  - `apps/web/src/app/dashboard/quotes/page.tsx`: Full responsive list page (`EnterpriseDataTable` + `MobileTableCards`, StatWidgets [Total, Sent, Accepted, Rejected], MonthYearFilter, status tabs, search, empty state)
  - `apps/web/src/components/quotes/CreateQuoteModal.tsx`: Create/Edit quote modal (`fullScreenMobile` sheet pattern, intra/inter GST auto-detection, line items table)
  - `apps/web/src/components/quotes/QuoteDetailModal.tsx`: Quote detail preview modal with status workflow actions (Mark Sent, Mark Accepted, Mark Rejected, Duplicate, Edit, Delete, PDF)
  - `apps/web/src/lib/quote/quote-pdf-template.ts`: Handlebars quotation template engine derived from invoice template (header "QUOTATION", "Valid Until", no payment/bank details or balance due section)
- **Navigation & Gating**:
  - `apps/web/src/hooks/useModules.ts`: `quotes` registered in `ModuleConfig`, `DEFAULT_MODULES` (`true`), `MODULE_META`
  - `apps/web/src/app/dashboard/layout.tsx`: `FileText` icon; `quotes` in `NAV_MODULE_MAP`; Quotes placed immediately AFTER Orders in desktop sidebar `OPERATIONS`; Quotes placed in mobile More sheet under `FINANCE`
  - `apps/web/src/components/MoreMenuSheet.tsx`: Quotes added to `STAFF_HIDDEN`
  - `apps/web/src/lib/role-permissions.ts`: `"/dashboard/quotes"` added to Manager and Accountant allowed routes; excluded from Staff
  - `apps/web/src/hooks/useCommandPaletteSearch.ts`: Added "Quotes" with shortcut "Q" in `navigationItems` after Orders; added "New Quote" quick action
- **Numbering Rule**:
  - Sequence generator: `generateSequentialQuotationNumber(userId)` in `quote-sequence.ts`
  - Prefix: read from `companyprofiles.quotation_prefix` (fallback to `"QT-"`)
  - Race-safe tenant counter: stored in `quotation_counters` collection via `$inc`
  - Format: `{PREFIX}{FY}-{4-digit-seq}` (e.g. `QT-2026-27-0001`)
- **Roles & Permissions**:
  - Allowed Roles: `Owner`, `Admin`, `Manager`, `Accountant` (mirroring Billing module access)
  - Staff role: strictly forbidden (HTTP 403 Forbidden enforced via `requireRole`)
  - Read-time Expired Calculation: Computed at read time when `status === "Sent"` and `valid_until < today` (no background cron jobs)

## Quote → Order Conversion (Phase 2)

- **Architecture & Pattern**: Option 2 with Server-Side Atomic Claim (`claimLine` → `attachOrder` → `releaseClaim` rollback).
- **Claim/Attach/Release Lifecycle**:
  - `claimLine(quoteId, ownerId, lineIndex)`: Performs an atomic `findOneAndUpdate` on `quotations` filtering `{ _id, userId: ownerId, status: { $in: ['Sent', 'Accepted'] }, 'converted_lines.line_index': { $ne: lineIndex } }` with `$push: { converted_lines: { line_index, order_id: null, converted_at: new Date() } }`. Also enforces eligibility: quotes with expired validity (`valid_until < today` when status was `Sent`) are computed as `Expired` and rejected (returns `null`).
  - `attachOrder(quoteId, ownerId, lineIndex, orderId)`: Sets `order_id` on the claimed line entry and transitions stored status to `'Accepted'` if it was `'Sent'`. Logs audit event if status changed.
  - `releaseClaim(quoteId, ownerId, lineIndex)`: If order creation, inventory stock deduction, or subsequent operations fail, rolls back by `$pull`-ing `{ line_index, order_id: null }`.
- **Eligibility Rules**:
  - Eligible only when raw stored status is `'Sent'` or `'Accepted'`, and quote is NOT expired (`valid_until >= today`).
  - `Draft`, `Rejected`, and `Expired`-computed quotes return `null` from `claimLine` and HTTP 409 from `POST /api/orders`.
  - Once any line is converted: `PATCH /api/quotes/[id]` returns HTTP 409 Conflict if items, customer, or financials are modified (notes/terms edits allowed). `DELETE /api/quotes/[id]` returns HTTP 409 Conflict.
  - Duplicating a quote (`POST /api/quotes/[id]/duplicate`) resets `converted_lines` to `[]` on the new Draft.
- **Order Creation Integration (`POST /api/orders`)**:
  - Accepts optional `quotation_id` and `quotation_line_index`. When omitted, normal order creation behavior is 100% byte-for-byte identical.
  - Pre-checks run FIRST: Authentication, Staff-403 check, entitlement limit (`assertCanCreate('orders')`), and stock availability pre-check all execute BEFORE any quote mutation.
  - `orders.quotation_id`: Stored as a string referencing the source quotation. Indexed via sparse non-unique index `{ quotation_id: 1 }` (`ensureQuoteOrderIndexes`).
  - Audit logging (`lib/audit.ts`): Emitted only for orders created from quotes (`order_created_from_quote`), logging order ID, quotation ID, and line index.
- **Fields Mapped from Quote Line to Order Wizard**:
  - `client`: `quote.clientId` if set; if `null`, prefill inline client creation form (`addingClient: true`) from `quote.customer` snapshot (`name`, `phone`, `email`).
  - `product_name`: `line.description`
  - `quantity`: `line.qty`
  - `unit`: `line.unit`
  - `rate` / `unit_rate`: Prefilled using effective rate: `(line.qty * line.rate - (line.discount || 0)) / line.qty`. The wizard's rate input (`NumericInput`) accepts full IEEE 754 float precision without truncation.
  - `order_value`: `qty * effectiveRate` (gross taxable value minus discount).
  - `gst_percent`: Line's `gst_rate` (mapped to existing single tax rate field in wizard).
  - `notes`: Prefilled with `"Created from Quote {quotation_number}, line {n}. Quote terms: {terms}"`. When `line.discount > 0`, appends: `". Quote rate {rate}, line discount {discount} applied → effective rate {effective}"`.
  - `Rounding Warning`: After mapping, if `|wizard_total - line.line_total| > 0.05`, displays an inline warning inside the existing "From Quote" banner: `"Total differs from quote by ₹{delta} due to rounding"`. Saving is never blocked.
  - `Zero Discount`: Lines with `discount = 0` behave identically to standard quotes without discount notes or warnings.
  - `Discount Exceeds/Equals Line Amount`: If `line.discount >= line.qty * line.rate`, the line is disabled in `ConvertLinePickerModal` with explanatory text `quotes.linePickerDiscountTooHigh`. Single-line quotes with `discount >= qty * rate` have Convert button disabled (`canConvert = false`). Direct wizard navigation is blocked with a toast error and redirects to `/dashboard/quotes`.
  - `Converted Quote Status Guard`: Once a quote has any `converted_lines`, `POST /api/quotes/[id]/status` returns HTTP 409 Conflict for ALL status transition attempts. Converted quotes permanently stay `Accepted`.
- **Intentionally Not Carried Over**:
  - `delivery_date`: Left blank for user to schedule.
  - `materials`: Left empty so production/materials flow can be configured explicitly.
  - `labour_cost`, `overhead_cost`: Left 0/empty.
  - `production setup`: Optional checkbox left unchecked.
  - `HSN/SAC`: Not supported on orders collection (orders store general item description; HSN remains in quotation line item).
  - `terms_and_conditions`: Stored as plain text appended into Order `notes` (orders schema lacks structured terms field).
- **UI & State Safety**:
  - Quote row & detail modal display "Converted" badge (all lines converted) or "Partially converted (x/n)" chip.
  - Line picker modal (`ConvertLinePickerModal.tsx`): Radix Dialog with `fullScreenMobile` prop, listing unconverted lines with description, qty, rate, amount; single-line quotes skip picker and navigate directly.
  - Wizard banner: Styled identically to "Template Loaded" clone banner (`border-blue-500/20 bg-blue-500/5`), displaying source quote #, hint to add materials, and optional rounding warning.
  - `useCachedPage`: Skipped when `source=quote` to prevent overwriting prefill with stale drafts or saving prefill into draft cache.

## Statement of Account & Receivables Aging (Phase 3a)

- **Architecture & Pattern**: Read-Only Financial Reports (zero writes across all endpoints, zero collection mutations).
- **Core Endpoints**:
  - `GET /api/reports/statement?client_id=<id>&from=<YYYY-MM-DD>&to=<YYYY-MM-DD>`: Returns opening balance, chronological statement lines (orders + allocated/unallocated payments), totals, and closing balance with "Cr" indicator for credit balances.
  - `GET /api/reports/receivables-aging?as_of=<YYYY-MM-DD>`: Returns days-past-due aging buckets (`notDue`, `days1_30`, `days31_60`, `days61_90`, `days90Plus`), total outstanding, unallocated credit, and net receivables per client (plus unassigned orders bucket), omitting clients with zero balance and zero credit.
- **Data Rules & Calculation Standards**:
  - **Receivable Documents**: Sourced from `orders` collection ONLY. Bills are strictly excluded from all money math in this phase.
  - **Tenant Filter**: Enforced via `getDataOwnerId(user)` matching `userId` on `orders`, `payments`, and `clients`.
  - **Orders Dual Key Shapes**: Reads both `total_amount ?? totalAmount` (skips and counts missing/non-finite amounts), `client_id ?? clientId`, and `order_date ?? createdAt ?? created_at`.
  - **Excluded / Sample Orders**: Excludes orders where status is `cancelled` or `canceled`. Excludes sample orders (`is_sample === true`) from both Statement (lines, opening balance) and Aging (rows, buckets, totals, KPIs), mirroring the Analytics and Dashboard API convention.
  - **Sample Payments & Clients Exclusion**: Payments where `is_sample === true` or referencing a sample order or sample client are strictly excluded. Clients where `is_sample === true` are completely omitted from aging rows so sample clients never appear in receivables aging. Both `/api/reports/statement` and `/api/reports/receivables-aging` report `excludedSampleCount` in their response `meta`.
  - **Order Particulars & Label Consistency**: Order line particulars in Client Statement must strictly match the label displayed in the Orders list (`orders/page.tsx` ~L1812-1828): `${product_name} (${badge})` where `badge = order.order_number ?? order.orderNumber ?? order._id.slice(0, 8).toUpperCase()`. Payment particulars for order-linked payments use `"Payment - " + same label`. For real wizard orders lacking `order_number`, the badge is the 8-character uppercase ID prefix, ensuring identical visual identity across the Orders list and Statement.
  - **Payments Complete Store**: Legacy `payments` collection ONLY (it holds every payment from both UI flows). NEVER read `paymenttransactions` (it is a subset and would cause double counting). Amount = gross `amount` (TDS is counted as settled at gross, consistent with `orders.total_paid`).
  - **Payment Allocation & Advance**: Payments with `order_id` apply to that specific order. Payments without `order_id` are unallocated on-account credits. If payments applied to an order exceed order amount, the excess is credited to the client's unallocated pool.
  - **Dates & Integer Money Math**: All dates parsed and normalized to calendar dates in `Asia/Kolkata`. All monetary math computed strictly in integer paise (`Math.round(x * 100)`) and converted back to rupees only at API response output.
  - **Due Date & Aging Buckets**: Order due date = `order.payment_due_date` if present, else fallback `order_date + 30 days` using global constant `DEFAULT_CREDIT_DAYS = 30`. (Wizard orders do not set due dates, so the 30-day default applies).
  - **Export Rows Completeness (Excel & PDF)**:
    - Statement Excel: Must include a first row for "Opening Balance" (`date = from`, `particulars = "Opening Balance"`, `runningBalance = openingBalance`) and a final block with a "Total" row (`particulars = "Total"`, `debit = totalDebit`, `credit = totalCredit`) and a "Closing Balance" row (`particulars = "Closing Balance"`, `runningBalance = closingBalance`). All money cells must remain strictly numeric.
    - Statement PDF: Table rows align with Excel: Row 1 = Opening Balance, followed by chronological transactions, followed by Total row and Closing Balance row.
    - Aging Excel: Must include a final `"TOTAL"` summary row appended from API totals with numeric values across all bucket and net receivable columns.
  - **Order Identifier Badge (Known Weakness)**:
    - For orders lacking `order_number` / `orderNumber` (standard wizard orders), the badge is generated from the first 8 characters of `order._id` uppercased (`order._id.slice(0, 8).toUpperCase()`).
    - *Known Weakness*: MongoDB `ObjectId` timestamps comprise the first 4 bytes (8 hex chars). Any batch of orders inserted within the same second share identical 8-character prefixes, leading to badge collisions across batch-inserted orders (e.g. 11 colliding prefixes account for all 64 real-dev orders). However, this rule is strictly required to maintain visual parity with the Orders list table (`orders/page.tsx` ~L1812-1828) without modifying writers or creating schema migrations.
  - **Draft / On Hold Orders Counted in Receivables**:
    - The receivables aging and statement report routes exclude ONLY orders with status `cancelled` or `canceled`. Orders with status `Draft`, `draft`, `Confirmed`, or `On Hold` that have valid monetary amounts are counted in receivables and aging buckets. (In the real-dev database, the count of orders with status `draft`/`Draft` is currently 0).
  - **Unassigned Orders (No Client)**:
    - An order with a valid monetary amount and NO client reference (absent `client_id`, `clientId`, and `customer_id`) must land in the `"No client assigned"` row (`clientId = "unassigned"`) in aging, and must NEVER appear on any client's statement of account.
- **Known Limitations**:
  - Bills are excluded from receivables and aging.
  - TDS is treated as settled at gross value.
  - `payments` collection is the complete store; `paymenttransactions` must NEVER be read for this reporting.
  - Wizard-created orders have no due date, so the 30-day default applies.
  - Raw `clients` collection has no `credit_days` field (Party model is not used here).
  - PDF Generation with Indian Scripts: Built-in `jsPDF` uses standard Helvetica (WinAnsi encoding) which lacks glyphs for Indic scripts (Devanagari, Gujarati, Marathi). English/Latin headers and alphanumeric text render properly, but non-Latin Indic script characters appear corrupted or missing unless custom embedded TTF fonts are registered.
- **Access Control & Permissions**:
  - API endpoints protected by `requireRole(["Owner", "Admin", "Accountant"])`. Manager and Staff receive HTTP 403 Forbidden.
  - Cross-tenant client lookups return HTTP 404 with no data leaked.
  - Frontend: Statement tab and menu actions conditionally hidden for Manager and Staff roles using `useRole()`.
- **i18n & Tokens**: Complete multilingual support under `statements` namespace in `en`, `hi`, `gu`, `mr` (JSON and TS mirrors). Roman terms (`GSTIN`, `PAN`, `HSN`, `GST`, `TDS`, `UPI`, `PDF`, `Excel`, `WhatsApp`, `INR`) preserved across all locales.


## Delivery Challans (Phase 4)

- **Architecture & Clean Layering**: Mirror of Quotes module structure (`apps/web/src/modules/delivery-challans/`):
  - `domain/types.ts`: `DeliveryChallan`, `ChallanStatus`, `ChallanPurpose`, `ChallanItem`, `ConsigneeSnapshot`, DTOs, `IDeliveryChallanRepository`.
  - `domain/schemas.ts`: Zod schemas for create, update, items, consignee snapshot, status transition.
  - `infrastructure/delivery-challan-sequence.ts`: Race-safe atomic sequential numbering via dedicated `delivery_challan_counters` collection (`DC-YYYY-YY-0001`).
  - `infrastructure/delivery-challan.repository.ts`: MongoDB CRUD and tenant-scoped query repository.
  - `application/delivery-challan.service.ts`: Business logic, state transitions, edit/delete restrictions, duplicate, cross-tenant verification, over-dispatch calculation, order summary.
  - `index.ts`: Barrel exports and singleton `getDeliveryChallanService()`.
- **Sequential Numbering**: Race-safe tenant-scoped `DC-YYYY-YY-0001` via dedicated `delivery_challan_counters` collection using atomic `findOneAndUpdate({ _id: `${tenantId}_${fy}` }, { $inc: { lastNumber: 1 } }, { upsert: true, returnDocument: 'after' })`.
- **Status State Machine & Transitions**:
  - `Draft` $\to$ `Dispatched` | `Cancelled`
  - `Dispatched` $\to$ `Delivered` | `Returned` | `Cancelled`
  - `Delivered` $\to$ `Returned`
  - `Returned` & `Cancelled` are terminal (outgoing transitions strictly rejected with HTTP 400).
  - Setting `Dispatched` strictly requires $\ge 1$ item (returns HTTP 400 if empty) and defaults `dispatch_date` to today (Asia/Kolkata) if empty.
  - Setting `Delivered` defaults `delivered_date` to today (Asia/Kolkata) if empty.
- **Edit Restrictions**:
  - Full edit permitted when status is `Draft`.
  - In `Dispatched`: only transport tracking fields (`transporter_name`, `vehicle_no`, `lr_number`, `eway_bill_no`, `expected_delivery_date`, `notes`) may be modified. Attempting to change items, consignee, or purpose returns HTTP 409 Conflict.
  - `Delivered`, `Returned`, `Cancelled`: permanently locked against all edits (returns HTTP 409 Conflict).
- **Delete Restrictions**:
  - Deletion allowed only when status is `Draft` or `Cancelled`.
  - Attempting to delete a challan in `Dispatched`, `Delivered`, or `Returned` status returns HTTP 409 Conflict.
- **Duplication Rules**:
  - Copies items, consignee snapshot, and optional `order_id` link.
  - Generates a fresh `Draft` with a new sequential number.
  - Transport and dispatch tracking fields (`transporter_name`, `vehicle_no`, `lr_number`, `eway_bill_no`, `dispatch_date`, `expected_delivery_date`, `delivered_date`, `notes`) are cleared.
- **Order Summary & Over-dispatch Handling**:
  - `GET /api/delivery-challans/order-summary?order_id=`: Read-only endpoint computing `dispatched_qty` (summing challans whose status is not Cancelled and not Returned; Draft, Dispatched, Delivered count toward dispatched; Returned and Cancelled do not count) and `remaining_qty`.
  - Over-dispatch is a WARNING, not a block: returned in API `warnings: [...]` and displayed inline in UI without blocking submission.
- **Tenancy & Cross-Tenant Security**:
  - Tenant scoping enforced via `getDataOwnerId(user)` across all queries, writes, and lookups.
  - Cross-tenant `client_id` or `order_id` references return HTTP 404 Not Found with zero data leakage.
- **Role Permissions & Visibility**:
  - Allowed roles: `Owner`, `Admin`, `Manager`, `Accountant`.
  - `Staff` receives HTTP 403 Forbidden on all API routes, and the module is completely hidden from `Staff` in sidebar navigation, mobile more sheet, and command palette.
- **Architectural Isolation (Zero Side Effects)**:
  - Challan never moves inventory or alters stock levels (strictly transport/delivery proof).
  - Zero modifications to orders collections/schemas, billing, payments, Tally, notifications, or entitlement limits.
  - No prices or currency on challans: strictly physical item descriptions, quantities, units, and remarks.
  - PDF template includes dual signature blocks ("Receiver's Acknowledgment" and "Authorized Signatory").
- **i18n & Translations**: Multilingual support under `challans` namespace in `en`, `hi`, `gu`, `mr` (JSON and TS mirrors).

## Phase 5: Vendor Bills Module (Purchase Invoices & Payments)

- **Domain Layering**: Follows standard DDD pattern (`modules/vendor-bills`):
  - `domain/types.ts`: VendorBill, VendorBillPayment, DTOs, repository interface.
  - `domain/schemas.ts`: Zod schemas with regex for GSTIN and YYYY-MM-DD.
  - `infrastructure/vendor-bill.repository.ts`: MongoVendorBillRepository with atomic overpay guard (`paid_total_paise + amountPaise <= payable_paise`) and atomic void decrement.
  - `infrastructure/vendor-bill-sequence.ts`: Sequential `VB-YYYY-YY-NNNN` generator using atomic counters in `vendor_bill_counters`.
  - `application/vendor-bill.service.ts`: Complete lifecycle, GST calculations in integer paise, odd-paise tax splitting, TDS deductions, read-only PO linkage, non-blocking PO over-billing warnings.
  - `lib/migrations/ensureVendorBillIndexes.ts`: Ensures query indexes and partial unique index on `{ userId: 1, dup_key: 1 }`.
- **Compound Sparse Index Gotcha & Fix**:
  - MongoDB compound sparse indexes index missing fields as `null` if any key in the compound index is present (`userId`).
  - To prevent duplicate key errors on bills without a `dup_key` (e.g. Draft duplicates, Void bills), the index must use `partialFilterExpression: { dup_key: { $type: "string" } }` instead of `sparse: true`.
- **Lifecycle & State Machine**:
  - `Draft` $\to$ `Open` $\to$ `Void`
  - `Void` is terminal (cannot be reopened, edited, or deleted).
  - Draft bills permit full edits and deletion (`DELETE /api/vendor-bills/[id]`).
  - Open bills lock items, vendor, PO, invoice number, and taxes; only `due_date` and `notes` are editable.
  - Voiding an Open bill strictly requires 0 active payments (returns HTTP 409 Conflict if active payments exist). Voiding unsets `dup_key` to allow re-entry of the invoice number if needed.
- **Payments & Atomic Overpay Guard**:
  - Payments can only be recorded against `Open` bills with non-future dates.
  - Overpay prevention is atomic at the database level via MongoDB conditional update query.
  - Payments can be voided with an atomic decrement of `paid_total` and balance restoration.
- **Role Permissions & Security**:
  - Allowed roles: `Owner`, `Admin`, `Accountant`.
  - `Manager` and `Staff` receive HTTP 403 Forbidden on all API endpoints.
  - Cross-tenant lookups (`vendor_id`, `purchase_order_id`, bill ID) return HTTP 404 Not Found with zero data leakage.
- **Zero Side Effects**:
  - Read-only queries against `vendors` and `purchase_orders`.
  - Zero modifications to inventory, sales invoices (`bills`), customer payments, expenses, Tally, or orders. All 8 collections verified 100% byte-identical via pre/post sha256 checksums.

### Phase 5 Close-Out Log: Vendor Bills Hardening & Audit Verification

- **Files Changed**:
  - `apps/web/src/modules/vendor-bills/tenant-scope.ts` (NEW)
  - `apps/web/src/app/api/vendor-bills/route.ts`
  - `apps/web/src/app/api/vendor-bills/[id]/route.ts`
  - `apps/web/src/app/api/vendor-bills/[id]/status/route.ts`
  - `apps/web/src/app/api/vendor-bills/[id]/duplicate/route.ts`
  - `apps/web/src/app/api/vendor-bills/[id]/payments/route.ts`
  - `apps/web/src/app/api/vendor-bills/[id]/payments/[paymentId]/void/route.ts`
  - `apps/web/src/app/dashboard/vendor-bills/page.tsx`
  - `apps/web/src/components/vendor-bills/CreateBillModal.tsx`
  - `apps/web/src/components/vendor-bills/BillDetailModal.tsx`
  - `apps/web/src/components/vendor-bills/RecordVendorBillPaymentModal.tsx`
  - `apps/web/src/messages/{en,hi,gu,mr}.ts`
- **Root Cause & Fixes Executed**:
  1. **Idempotency Scope Hardening**: Default `withIdempotency` derives user scope from individual session user ID, causing different sessions of the same tenant to have isolated idempotency caches. Created `getVendorBillTenantUserId` in `tenant-scope.ts` which extracts the tenant owner ID via `getDataOwnerId(user)` (with fallback session lookup) and wired it into all 6 vendor-bills write routes via `{ getUserId: getVendorBillTenantUserId }` without altering `with-idempotency.ts`. Verified same-key cross-session write returns cached 201 response.
  2. **TypeScript 82 Baseline**: Resolved `TS2769` in `tenant-scope.ts` by casting `collection<any>("sessions")` and `collection<any>("users")` in session cookie fallback. Verified `npx tsc --noEmit` returns raw count exactly 82 with 0 errors in `vendor-bills`.
  3. **Purchasing Endpoint Realignment in CreateBillModal**: Modal had initial reference data fetches targeting non-existent `/api/v1/vendors` and `/api/v1/purchase-orders`, yielding empty vendor/PO select lists. Aligned URLs to active endpoints `/api/purchasing/vendors` and `/api/purchasing` (`{ success: true, data: [...] }`).
  4. **Complete i18n Parity (160 keys across 4 locales)**: Added 20 missing validation and error toast translation keys (`errSelectSupplyType`, `errGrandTotalZero`, `errAtLeastOneItem`, `errVoidBillReason`, `errVoidPaymentReason`, `errPaymentAmountPositive`, `errPaymentExceedsBalance`, `errPaymentDateFuture`, `errPaymentDateBeforeBill`, `errVendorInvoiceRequired`, and CRUD error fallbacks) across all 8 message files (`en`, `hi`, `gu`, `mr` in both JSON and TS). Replaced all raw hardcoded strings in `CreateBillModal.tsx`, `BillDetailModal.tsx`, `RecordVendorBillPaymentModal.tsx`, and `page.tsx`. Verified 0 hardcoded strings and 100% key parity (160/160).
  5. **Horizontal Overflow Containment**: Verified with CDP script at 375px and 414px mobile viewports on both list page and create modal. Asserted `hasHorizontalOverflow === false` and `overflowCount === 0`.
  6. **Clean Next.js Build**: Cleared `.next` and ran clean production build (`npx next build`). Generated all 159/159 static and dynamic routes cleanly.


## Vendor reports (Phase 5b)

- **Domain Layering & Architecture Mirror**:
  - Mirrored Phase 3a Receivables Aging & Statement architecture (`src/lib/reports/receivables.ts`, `/api/reports/receivables-aging`, `/api/reports/statement`, `app/dashboard/reports/receivables/page.tsx`).
  - `src/lib/reports/payables.ts`: Domain types (`AgingBillDetail`, `AgingVendorRow`, `PayablesAgingResult`, `VendorStatementLine`, `VendorStatementResult`), re-exports bucket helpers and constants (`formatBucketLabel`, `getBucketIndex`, `getDaysBetween`, `getBucketRange`, `getBucketKey`, `formatISTDate`, `BUCKET_KEYS`) directly from `receivables.ts` without redefining.
- **Payables Aging Report (`GET /api/reports/payables-aging`)**:
  - Query parameter `asOf` (default current IST date `YYYY-MM-DD`).
  - Evaluates vendor bills with status `Open` and `bill_date <= asOf`.
  - Balance as of `asOf` computed strictly in integer paise: `payable_amount - sum(non-voided payments with payment_date <= asOf)`.
  - Excludes `Draft`, `Void`, and bills fully paid as of `asOf`.
  - Buckets by days past `due_date`: `Not due`, `1–30`, `31–60`, `61–90`, `90+`.
  - Returns per-vendor rows with bucket breakdown, overall totals row, and bill-level drilldown items.
  - Known limitation: historical asOf excludes bills/payments voided later.
- **Vendor Statement Report (`GET /api/reports/vendor-statement`)**:
  - Query parameters: `vendor_id`, `from`, `to` (IST dates).
  - Chronological transaction rows: bills (credit = `payable_amount`, includes `vendor_invoice_number`, `bill_number`, TDS note) and non-voided payments (debit).
  - Opening balance: all non-voided transactions before `from`.
  - Running balance calculated progressively for each row.
  - Closing balance: `opening_balance + total_credits - total_debits`.
  - Cross-tenant `vendor_id` strictly returns HTTP 404 Not Found.
- **Security & RBAC**:
  - Allowed roles: `Owner`, `Admin`, `Accountant` (HTTP 200).
  - Disallowed roles: `Manager` and `Staff` return HTTP 403 Forbidden.
  - Tenant isolation: `userId = getDataOwnerId(user)` with session fallback.
- **UI Components & Placement**:
  - `src/app/dashboard/reports/payables/page.tsx`: Full responsive page with KPI StatWidgets, `asOf` date picker, Excel export, desktop table, mobile card layout, drilldown dialog, and statement dialog.
  - `src/components/reports/VendorBillsDrilldownDialog.tsx`: Radix Dialog with `fullScreenMobile` and CSS theme variables. Displays open bill breakdown per vendor with bucket badges, days past due, payable amount, balance, and TDS notes.
  - `src/components/reports/VendorStatementDialog.tsx` & `src/components/reports/VendorStatement.tsx`: Statement drawer/dialog with FY date presets (This Month, Last Month, This FY, Last FY), date pickers, summary metrics, chronological statement table, mobile cards, and Excel/PDF export buttons.
- **Navigation & Permissions**:
  - `src/lib/role-permissions.ts`: Added `/dashboard/reports/payables` to `Accountant.allowedRoutes`.
  - `src/lib/permissions.ts`: Added to `MODULE_ROUTE_MAP.reports`.
  - `src/app/dashboard/layout.tsx`: Added `Payables` link to sidebar navigation under `INTELLIGENCE` and to `moreSheetSections.REPORTS`.
  - `src/hooks/useCommandPaletteSearch.ts`: Added `Payables` to command palette search navigation items.
- **Internationalization (i18n)**:
  - Added `payables` namespace across `src/messages/{en,hi,gu,mr}.ts` with 60 keys each (240 total).
  - Exact 100% key parity across all 4 locales.
  - Standard Roman terms preserved: `GSTIN`, `GST`, `TDS`, `PDF`, `UPI`.
  - Zero hardcoded UI strings.
- **Verification & Audit**:
  - 55 / 55 automated integration checks passed (`scratch/output/verify-phase5b-*.txt`).
  - Controlled fixtures with hand-computed expected aging per bucket and statement opening/closing balances.
  - Edge cases verified: partial payments, voided payment exclusion, payment dated after `asOf`, boundary bucket days (30/31, 60/61, 90/91), TDS notes, vendor with no bills, Void/Draft bill exclusion.
  - Sum of aging total equals sum of balances from vendor bills endpoint.
  - Zero side-effects: SHA256 checksums before and after verified identical on `vendor_bills`, `vendor_bill_payments`, `vendors`, `purchase_orders`, `payments`, `bills`, `expenses`.
  - TypeScript error count maintained at exactly 82 baseline (0 new errors introduced).
  - Horizontal overflow checks at 375px and 414px passed with zero overflow.

## Payment Reminders (Phase 6a)

- **Architecture & Layering**:
  - Follows modular architecture under `apps/web/src/modules/reminders`:
    - `domain/types.ts`: Domain models (`ReminderRule`, `ReminderLog`, `ReminderTriggerType`), DTOs, and repository interfaces.
    - `domain/schemas.ts`: Zod validation schemas enforcing email-only channel in Phase 6a (`channels: z.array(z.literal("email")).min(1)`), days non-negative integer, positive paise amounts.
    - `infrastructure/reminder.repository.ts`: MongoDB repository with compound unique index `{ userId, dedupe_key }` handling atomic duplicate prevention (catches E11000 and returns `{ inserted: false, isDuplicate: true }`).
    - `application/reminder.service.ts`: Core reminder calculation and orchestration engine. Implements `evaluateCandidateOrders`, `previewReminders`, and `runCron`.
    - `index.ts`: Factory singleton `getReminderService()`.
  - Migration: `apps/web/src/lib/migrations/ensureReminderIndexes.ts` ensures `{ userId: 1, dedupe_key: 1 }` (unique), `{ userId: 1, scheduled_date: 1 }`, `{ userId: 1, order_id: 1 }`, and `{ userId: 1, active: 1 }`.
- **Receivables & Due Date Logic**:
  - Reuses Phase 3a receivables logic directly from `@/lib/reports/receivables`: `toKolkataDateString`, `differenceInDays`, `DEFAULT_CREDIT_DAYS` (30).
  - All date calculations normalized to IST (Asia/Kolkata).
  - Exclusions: `cancelled`/`canceled` orders, `is_sample: true` orders and clients, non-numeric/NaN amounts, zero outstanding balance (`outstandingPaise <= 0`).
  - Payments joined from legacy `payments` collection (summed in paise and deducted from order total).
- **Scheduler & External Cron Configuration**:
  - **Endpoint**: `POST /api/cron/payment-reminders`
  - **Authentication**: Strict `Authorization: Bearer ${CRON_SECRET}` header using constant-time `crypto.timingSafeEqual`. Missing or invalid header returns HTTP 401 Unauthorized immediately. **NO session cookie fallback**.
  - **External Cron Setup**:
    - Configure an external cron runner (e.g. Vercel Cron, GitHub Actions, AWS EventBridge, or cron-job.org) to issue a daily POST request at 09:00 IST (03:30 UTC):
      ```bash
      curl -X POST https://your-domain.com/api/cron/payment-reminders \
        -H "Authorization: Bearer YOUR_CRON_SECRET"
      ```
    - Recommended schedule: Once daily at `0 9 * * *` (09:00 IST).
  - **Bounded Batches & Starvation Prevention**: Processes tenants in bounded chunks with configurable limit (default: 100 orders per run, queryable via `?limit=N`). Pre-fetches existing `dedupe_key`s for the tenant on `scheduled_date: todayIST`. Candidates whose dedupe key was already recorded today are counted under `already_sent` without consuming the new-work batch quota (`summary.evaluated`). Ensures subsequent capped calls make continuous progress across large backlogs without starving later orders. Returns `{ summary: { tenants, evaluated, queued, skipped, failed, already_sent, truncated: boolean } }`.
  - **Deduplication Guard**: Idempotent across multiple runs on the same day. `dedupe_key = `${userId}_${order_id}_${rule_id}_${scheduled_date}_${channel}`` is uniquely indexed; duplicate attempts count as `already_sent` without throwing errors or re-queueing.
  - **Missed-Day Limitation**: Reminder rules evaluate exact day equality (`daysPastDue === rule.days`). If the cron schedule does not fire on day D+7 (e.g. server downtime), the reminder for that rule is skipped on D+8 and subsequent days. Mitigation options for future phases include grace window matching or catch-up timestamp tracking.
  - **Read-Time Status Derivation**: `reminder_logs.status` is derived dynamically at read time inside `MongoReminderRepository` (`findLogs` and `findLastLogForOrder`) by joining `notification_job_id` against `notification_jobs` without writing to notification collections (maps `completed` -> `"sent"`, `failed`/`dead_letter` -> `"failed"`, and active queue states -> `"queued"`).
- **Notification Path & Preferences Check**:
  - Enqueues reminders through the existing notification path via `triggerNotification({ eventType: "payment_overdue", ... })`.
  - **User Notification Preferences Check**: Before sending, checks `user.notification_preferences.emailNotifications`. If disabled (`false`), the reminder is marked with status `"skipped"` and skip reason `"skipped: channel_disabled (email_notifications_off)"`.
  - **Template Active Check**: Checks `notification_templates` for `trigger: "payment_overdue"`. If inactive (`active === false`) or email channel disabled, status is `"skipped"` with reason `"skipped: channel_disabled (template_inactive)"`.
  - **Missing Client Email**: If `client.email` is empty/absent, status is `"skipped"` with reason `"missing_recipient_email"`. The run never fails.
  - **Notification Job ID**: Recorded in `reminder_logs.notification_job_id` upon successful enqueuing.
- **English-Only Template Limitation**:
  - In Phase 6a, payment reminder templates are loaded from the existing `payment_overdue` notification template in English only. Template localization into `hi`, `gu`, and `mr` is deferred to a future phase. The settings UI and app interface are fully localized across all 4 languages (en, hi, gu, mr).
- **API Routes & RBAC**:
  - `GET/POST /api/reminders/rules`: Rule listing and creation. Audited via `logAudit`.
  - `PATCH/DELETE /api/reminders/rules/[id]`: Rule updating and deletion. Tenant isolated (404 on cross-tenant). Audited via `logAudit`.
  - `GET /api/reminders/logs`: Audit trail and reminder history with query filters (`order_id`, `status`, `from`, `to`, `limit`, `offset`).
  - `POST /api/reminders/preview?asOf=`: Read-only dry run preview. Returns matching candidates with projected status (`would_queue` vs `would_skip`) and already sent indicator without modifying logs or sending notifications.
  - RBAC: Allowed roles `Owner`, `Admin`, `Accountant` (HTTP 200). Blocked roles `Manager` and `Staff` (HTTP 403 Forbidden). Writes audited with `actionType: 'create' | 'update' | 'delete'`.
- **UI Components & Settings**:
  - `src/app/dashboard/settings/reminders/page.tsx`:
    - Responsive settings page with Bento stat widgets (`StatWidget`), Rules tab, Reminder History tab (`EnterpriseDataTable` + `MobileTableCards`), and Dry Run Preview tab.
    - Rule Create/Edit Dialog built with `DialogContent fullScreenMobile` following the project mobile design pattern.
  - `src/app/dashboard/payments/page.tsx`: Replaced placeholder Send Reminder toast at line 1258 with a read-only fetch of the order's latest reminder from `reminder_logs` (`/api/reminders/logs?order_id=...&limit=1`).
  - `src/app/dashboard/settings/page.tsx`: Added "Payment Reminders" card under Business settings.
- **Internationalization (i18n)**:
  - Added `reminders` namespace across `src/messages/{en,hi,gu,mr}.ts` with 72 keys each (288 total).
  - Exact 100% key parity across all 4 locales.
  - Standard Roman terms preserved: `GST`, `GSTIN`, `UPI`, `PDF`.
  - Zero hardcoded UI strings.

## Security Ticket: Role checks on money-writing routes

- **Recon & Baseline Assessment**:
  - Audited all routes under `/api/purchasing`, `/api/vendors`, `/api/payments`, `/api/v1/payments` (incl. `/record`), and `/api/expenses`.
  - Directory `/api/vendors` does not exist; vendor routes live under `/api/purchasing/vendors`.
  - All purchasing and PO write routes (`POST /api/purchasing`, `PATCH /api/purchasing/[id]`, `DELETE /api/purchasing/[id]`, `POST /api/purchasing/vendors`, `PUT /api/purchasing/vendors/[id]`, `DELETE /api/purchasing/vendors/[id]`, `POST /api/v1/purchase-orders/[id]/record-payment`) enforced with `requireRole(["Owner", "Admin", "Manager", "Accountant"])`. Staff attempts strictly return HTTP 403 Forbidden.
  - `/api/v1/payments/record` aligns with legacy `/api/payments` POST gating: enforced with `requireRole(["Owner", "Admin"])`. Staff, Manager, and Accountant attempts return HTTP 403 Forbidden.
  - `POST /api/v1/purchase-orders/[id]/record-payment` enforces validation rejecting payment dates in the future (compared in IST `YYYY-MM-DD`), returning HTTP 400 with `"Payment date cannot be in the future"`.
  - Read routes (`GET /api/purchasing`, `GET /api/purchasing/vendors`, `GET /api/purchasing/stats`) mirror what the UI allows (Owner, Admin, Manager, Accountant, and Staff read access).
- **Out of Scope (Reported Only)**:
  - PO numbering `countDocuments + 1` concurrency collision risk under simultaneous PO creations.
  - PO payments have no dedicated ledger collection, idempotency guard, or void capability (stored as cumulative `paidAmount` on PO doc).
  - `/api/v1/payments/record` currently lacks `withIdempotency` wrapper.
- **Verification & Zero Side-Effects**:
  - 32 / 32 integration checks passed with live HTTP requests across all 5 user roles (`scratch/output/verify-security-routes-*.txt`).
  - Strict fixture cleanup by exact ObjectIds; 0 lingering test documents.
  - SHA256 checksums verified identical pre- and post-test across all 5 relevant collections (`purchase_orders`, `vendors`, `payments`, `paymenttransactions`, `orders`).
  - TypeScript error count maintained at baseline 82 (`npx tsc --noEmit`).

### Follow-Up: Remaining Money-Writing Routes & Orders UI Button Hide

- **Routes Gated**:
  - `DELETE /api/payments/[id]`: Protected with `requireAdmin()` (matches legacy `POST /api/payments`). Blocked: Staff (403), Manager (403), Accountant (403). Allowed: Owner (200), Admin (200).
  - `/api/expenses` POST, PUT, DELETE (`/api/expenses` and `/api/expenses/[id]`): Gated with `requireRole(["Owner", "Admin", "Staff"])` matching `allowedRoutes` in `role-permissions.ts`. Staff remains allowed by design for field/petty cash logging. Blocked: Manager (403), Accountant (403). Allowed: Staff (200/201), Admin (200), Owner (200).
  - `POST /api/v1/payments/record`: Expanded allowed roles to `requireRole(["Owner", "Admin", "Accountant"])`. Blocked: Staff (403), Manager (403). Allowed: Accountant (200), Admin (200), Owner (200).
- **Frontend Button Guard**:
  - `apps/web/src/app/dashboard/orders/page.tsx`: Row actions dropdown "Record Payment" button guarded by `canRecordPayment = ((role as string) === "Owner" || (role as string) === "Admin" || (role as string) === "Accountant") || isAdmin;`, cleanly hiding it for Manager and Staff while keeping it visible for Admin, Owner, and Accountant.
- **Verification & Parity**:
  - 26 / 26 live HTTP integration checks passed (`scratch/output/verify-security-followup-*.txt`).
  - Strict fixture cleanup by exact ObjectIds (orders, expenses, payment transactions, payments, sessions, users).
  - SHA256 content hashes verified identical pre- and post-test across all 4 target collections (`payments`, `paymenttransactions`, `orders`, `expenses`).
  - Regression screenshots captured for Admin, Accountant, and Manager in `scratch/output/screenshots/`.
  - TypeScript raw error count verified at baseline 82 (`npx tsc --noEmit`).
  - Production build verified with `npx next build` in `apps/web`.

## Build & Type Safety Baseline

- **tsc baseline**: `82 errors / 42 files, ignoreBuildErrors is ON — no prompt may increase the count`. Zero errors permitted in touched files. Always verify with `npx tsc --noEmit`.

## Banking import (Phase 7a)

### 1. Integer Paise Rules (No Floats)
- All monetary amounts across the banking module (`opening_balance_paise`, `debit_paise`, `credit_paise`, `balance_after_paise`, `total_credit_paise`, `total_debit_paise`) are stored as non-negative integer paise.
- Parsing strips all grouping commas (handles Indian numbering format like `4,87,500.00` as well as Western format `487,500.00`).
- Validates decimal precision: maximum 2 decimal places. A 3+ decimal string (e.g. `125.456`) triggers a row-level error and rejects that row.
- Zero amounts are parsed to `0`. A valid row must have either `debit_paise > 0` or `credit_paise > 0`, never both > 0 and never neither > 0.
- Running balance continuity check compares successive transaction delta against parsed `balance_after_paise`. If mismatches exceed 20%, a non-blocking warning ("sign convention may be wrong") is flagged.

### 2. row_hash and Ordinal Deduplication Rule
- Each transaction computes a cryptographic SHA-256 fingerprint:
  `row_hash = sha256("${value_date}|${debit_paise}|${credit_paise}|${balance_after_paise}|${normalized_narration}|${ordinal}")`
- `ordinal` represents the zero-based occurrence index of identical rows within the same imported statement file. Two identical same-day transactions in a single file (e.g. two separate ₹5,000 cash withdrawals) receive ordinals `0` and `1`, yielding distinct `row_hash` values, and are both legitimately inserted.
- Overlapping statements re-uploading previously imported transactions will produce identical `row_hash`es and are skipped during commit (`rows_skipped_duplicate` incremented).
- Upon statement revert (`POST /api/banking/imports/[id]/revert`), transactions are marked `reverted: true` and their `row_hash` field is removed via `$unset`. This immediately frees the unique index constraint, allowing the exact same statement file to be re-imported cleanly if needed.

### 3. No-XLSX-Parsing Rule & Security Rationale
- Under untrusted user input, arbitrary spreadsheet formats (`.xlsx`, `.xls`, `.xlsm`, `.xlsb`) MUST NOT be parsed using `xlsx` (SheetJS 0.18.5) on the server. Older SheetJS versions contain known prototype pollution, memory exhaustion, and command injection vulnerabilities.
- Banking statement imports strictly enforce CSV format only via a custom, RFC-4180 compliant streaming parser (`parseRFC4180Csv`) handling quoted fields, commas inside quotes, embedded newlines, UTF-8 BOM, and UTF-16LE BOM.
- Server-side payload limits: strictly enforces 5 MB file size limit and 20,000 max row count with HTTP 400 Bad Request responses before database execution.
- Excel exports (`exportWorkbook` using `xlsx`) are permitted strictly for client-side generation and download of structured data.

### 4. Partial Index Rule (Compound-Sparse Gotcha Avoidance)
- MongoDB compound sparse indexes do NOT index documents if ANY field in the index key pattern is missing. Therefore, sparse indexes must never be used for deduplication when any index field can be null or conditionally present.
- `bank_statement_imports`: Unique index `{ userId: 1, bank_account_id: 1, file_hash: 1 }` uses a partial filter:
  `partialFilterExpression: { status: "Committed", file_hash: { $type: "string" } }`
  This allows reverted imports to retain historical file hashes while preventing duplicate active files per account.
- `bank_transactions`: Unique index `{ userId: 1, bank_account_id: 1, row_hash: 1 }` uses a partial filter:
  `partialFilterExpression: { row_hash: { $type: "string" } }`
  Unsetting `row_hash` on revert immediately excludes the row from the uniqueness constraint.

### 5. Banking Matching Architecture & Rules (Phase 7b)

- **Linking Only (Zero Side-Effects)**:
  - Phase 7b implements bidirectional transaction-to-payment matching strictly via `bank_match_links`.
  - Zero writes are performed on existing financial collections (`payments`, `paymenttransactions`, `vendor_bill_payments`, `vendor_bills`, `purchase_orders`, `orders`, `bills`, `expenses`, `vendors`, `clients`).
  - Money-in (Credit transactions) links to customer payments in the legacy `payments` collection (`amount_paise = Math.round(payment.amount * 100)`).
  - Money-out (Debit transactions) links to vendor payments in `vendor_bill_payments` (`amount_paise = payment.amount_paise`, requiring `voided = false`).
  - Direction mismatch returns HTTP 400 Bad Request immediately.

- **Atomic Allocation Guard & Concurrency Control**:
  - `bank_transactions.allocated_paise` tracks the sum of active links.
  - When linking, `atomicAllocateAndCreateLinks` executes an atomic conditional update:
    `$inc: { allocated_paise: totalAllocatingPaise }` where `allocated_paise + totalAllocatingPaise <= totalTxPaise`.
  - If the transaction is concurrently matched or over-allocated, the update returns null, and the service throws HTTP 409 Conflict with remaining allowable paise.
  - Links are inserted with status `"Active"`. If inserting any link fails, the atomic allocation is rolled back via `$inc: { allocated_paise: -totalAllocatingPaise }`.
  - A partial unique index on `bank_match_links` (`{ userId: 1, entity_type: 1, entity_id: 1 }` with `partialFilterExpression: { status: "Active" }`) guarantees that no payment can ever be actively linked to two bank transactions simultaneously.
  - Concurrent linking races result in exactly one HTTP 201 Created and one HTTP 409 Conflict.

- **Revert Import Guard**:
  - Reverting a statement import (`POST /api/banking/imports/[id]/revert`) is strictly blocked (HTTP 409 Conflict) if any transaction in the import has active match links (`allocated_paise > 0` or active documents in `bank_match_links`).
  - All links must be explicitly unlinked before an import can be reverted.

- **Read-Time Stale Link Derivation (Needs Review)**:
  - Links never write back status or void state to original payment collections.
  - If a vendor payment is subsequently voided (`voided: true` in `vendor_bill_payments`) or a legacy client payment is deleted, the link's stale state is derived dynamically at read time:
    `needs_review: true` with a clear explanation (`"Payment voided or deleted. Needs review."`).
  - Transactions with any stale active link display an amber/red warning pill (`Needs review`) and allow one-click Unlink.

- **Suggestions Ranking & Cash Rules**:
  - Automated suggestions (`GET /api/banking/transactions/[id]/suggestions`) rank candidate payments within ±3 days:
    1. Exact amount match + UTR/Cheque/Reference present in narration (Score 100).
    2. Exact amount match without reference (Score 80).
    3. Candidates differing by even 1 paise are excluded from automatic suggestions.
  - Cash payments (`payment_method: "Cash"` or `payment_mode: "Cash"`) are excluded from automatic suggestions to prevent false positives, but can be manually searched and linked via the Manual Search tab.

- **What Phase 7c Will Add**:
  - Payment creation directly from unmatched bank transaction rows with dual-write to `bank_match_links` and `payments` / `vendor_bill_payments`.
  - Bank Reconciliation Statement (BRS) report with unpresented cheques, uncleared deposits, and balance reconciliation.
  - Tally XML voucher generation for bank receipts and bank payments.

### Feature 3: Linked Document Chips, Vendor iOS Bottom Sheet & Purchasing Header UX

- **Files Changed**:
  - `apps/web/src/lib/order-utils.ts`
  - `apps/web/src/components/ui/LinkedDocChip.tsx`
  - `apps/web/src/modules/delivery-challans/domain/types.ts`
  - `apps/web/src/modules/delivery-challans/application/delivery-challan.service.ts`
  - `apps/web/src/components/delivery-challans/ChallanDetailModal.tsx`
  - `apps/web/src/components/delivery-challans/CreateChallanModal.tsx`
  - `apps/web/src/modules/vendor-bills/application/vendor-bill.service.ts`
  - `apps/web/src/components/vendor-bills/BillDetailModal.tsx`
  - `apps/web/src/components/quotes/QuoteDetailModal.tsx`
  - `apps/web/src/app/dashboard/settings/reminders/page.tsx`
  - `apps/web/src/modules/purchasing/domain/schemas.ts`
  - `apps/web/src/messages/{en,hi,gu,mr}.ts`
  - `apps/web/src/app/dashboard/purchasing/page.tsx`
- **What Changed**:
  - **Delivery Challan & Vendor Bill Linked Identifiers**: Replaced raw 24-character Mongo ObjectIds with `<LinkedDocChip />` backed by single canonical helper `getOrderDisplayNumber(order)` (`ORD-C59BFC · cK`) and linked PO chips (`PO-0001 · saiv ram · ₹5,593`) with graceful fallback to `"PO not available"`. Zero raw ObjectIds exposed.
  - **New Vendor Sheet iOS UI Upgrade**: Upgraded Add Vendor modal to iOS bottom sheet using Radix `DialogContent` with `fullScreenMobile` (Fix 5 compliant), 48px touch inputs, grouped visual sections, fixed `+91` prefix, Roman script GSTIN across `en`, `hi`, `gu`, `mr`, and Zod validation (10-digit Indian phone `^[6-9]\d{9}$`, uppercase optional 15-char GSTIN `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`).
  - **Purchasing Page Header Buttons & KPIs**: Header buttons styled strictly via className (`!h-12 !rounded-xl !px-3 font-semibold`) without altering `IOSButton.tsx` global tokens ("Add Vendor" secondary gray, "New Purchase" primary blue). Converted mobile KPI grid to compact 2-column layout (`grid-cols-2 md:grid-cols-4 gap-3`) with Indian currency formatting (`₹...`).

### Fix 23: Mobile Layout Bleed Harmonization & Step 3 Multi-Viewport Verification Audit

- **Files Changed / Added**:
  - `apps/web/src/app/globals.css`
  - `apps/web/src/components/ui/PageBleed.tsx` (NEW)
  - `apps/web/src/app/dashboard/analytics/page.tsx`
  - `apps/web/src/app/dashboard/notifications/page.tsx`
  - `apps/web/src/app/dashboard/page.tsx`
  - `apps/web/src/app/dashboard/profile/page.tsx`
  - `apps/web/src/components/notifications/NotificationFeedItem.tsx`
  - `apps/web/src/app/dashboard/vendor-bills/page.tsx`
  - `apps/web/src/app/dashboard/orders/[id]/edit/page.tsx`
  - All 12 Settings sub-pages (`settings/page.tsx`, `settings/team`, `settings/tax`, `settings/tally-integration`, `settings/security`, `settings/reminders`, `settings/notifications`, `settings/modules`, `settings/language`, `settings/data`, `settings/company-info`, `settings/audit-trails`)
- **Root Cause**:
  - Shared layout `<main>` in `apps/web/src/app/dashboard/layout.tsx` applies responsive padding: `p-4` (mobile: 16px), `md:p-6` (tablet/desktop: 24px), and `lg:p-8` (large desktop: 32px).
  - Multiple dashboard pages applied nested `px-4` or `px-4 sm:px-0`, creating double horizontal padding (32px each side = 64px gutter on a 360px screen, occupying only 82.2% of viewport width).
  - Several pages applied `-m-6 p-6` (or `-mx-6`), which pulled negative 24px margins against the 16px mobile padding, pushing containers 8px past the left viewport edge (`left: -8px`), clipping page titles and content.
  - At `lg:` (1024px+), existing negative margins only countered up to `md:p-6` (24px) against `lg:p-8` (32px), creating an asymmetric 8px desktop gutter shift.
- **What Changed**:
  - **Shared Responsive Bleed Utility**: Added `.page-bleed` (`-m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8`) in `globals.css` and created `<PageBleed>` component in `apps/web/src/components/ui/PageBleed.tsx` countering `<main>` padding with sub-pixel precision across all three responsive tiers (0px net shift on mobile, tablet, and 1024px+ desktop).
  - **Analytics Page**: Migrated container to `.page-bleed`, added `activeChipRef` auto-scrolling active month chip into center view, matched month selector + Excel export buttons to `h-[38px]`, formatted zero KPI states to `"0"` with `"No activity"` caption instead of bare `"—"`, and applied `line-clamp-2 break-words` to KPI labels.
  - **Notifications Page**: Migrated to `.page-bleed`, structured channel cards as equal-height 2x2 grid with `min-w-0 flex-1 truncate` so badge rules never spill out, and added single-line scrollable tab bar with active tab centering.
  - **Profile Page**: Removed redundant `px-4 sm:px-6`, stacked avatar above user name on narrow viewports (`flex-col sm:flex-row`), and added `truncate break-all max-w-full min-w-0` to email address.
  - **NotificationFeedItem**: Added `line-clamp-2 break-words` to both notification title and body.
  - **Double-Padding Cleaned**: Removed redundant padding wrappers across Vendor Bills, Order Edit, and all 12 Settings pages.
  - **Step 3 Verification Proof**: Automated Chrome/Edge CDP audit across all 11 dashboard pages (Dashboard, Orders, Inventory, Production, Purchasing, Billing, Clients, Settings, Analytics, Profile, Notifications) at 360px, 390px, 412px, and 1280px+ (desktop), plus Hindi (`hi`) locale at 390px. Every single page verified `document.documentElement.scrollWidth === clientWidth` (`diff: 0px`, zero horizontal overflow), and desktop 1280px verified `headerLeft === 240px, mainLeft === 240px, firstChildLeft === 272px` (zero 8px shift). Total 94 screenshot artifacts captured.

### Fix 24: Receivables & Payables Aging Mobile Overhaul, Statement Sheet Redesign & WhatsApp Formatting

- **Files Changed**:
  - `apps/web/src/app/dashboard/reports/receivables/page.tsx`
  - `apps/web/src/app/dashboard/reports/payables/page.tsx`
  - `apps/web/src/components/reports/ClientStatement.tsx`
  - `apps/web/src/components/reports/VendorStatement.tsx`
  - `apps/web/src/components/reports/StatementDialog.tsx`
  - `apps/web/src/components/reports/VendorStatementDialog.tsx`
  - `apps/web/src/messages/{en,hi,gu,mr}.ts`
- **Root Cause**:
  1. **Blank Gap Void**: In `ClientStatement.tsx` and `VendorStatement.tsx`, `StatWidget` elements wrapped in `<motion.div variants={staggerItem}>` with initial `{ opacity: 0, y: 20 }` were rendered inside a static `div` with no motion orchestrator declaring `animate="animate"`, rendering the entire KPI section invisible at `opacity: 0` (~240px invisible void). In `receivables` and `payables` pages, the 4-card 2x2 `StatWidget` grid on mobile consumed ~230px height plus outer margins, pushing the party cards down the screen.
  2. **Controls Clutter**: As-of date picker and Export Excel were stacked or wrapped unevenly with mismatched heights and border radii.
  3. **Mobile Card Margins**: Nested `MobileTableCards` added internal padding on top of layout padding, reducing card content width on mobile. Buckets were incomplete (e.g. Payables lacked 1-30, 31-60, 61-90 and hardcoded "90+ d").
  4. **WhatsApp Suffix**: Direct WhatsApp statement API message appended accounting suffixes ("Cr" / "Dr") to closing balance, and date period was raw ISO strings instead of readable Indian dates.
- **What Changed**:
  - **Aging Controls**: Unified As-of date input and Export Excel button into 1 row (`h-11`, `rounded-xl`, wrapping only below 360px). Added missing `asOf` localization to `statements` namespace across English, Hindi, Gujarati, and Marathi.
  - **Mobile Summary Strip**: Replaced tall 2x2 `StatWidget` grid on mobile with a compact ~56px summary strip showing Total Outstanding (large) and Overdue amount in Indian currency format (`formatINR`). Desktop preserves full 4-card `StatWidget` grid (`hidden md:grid md:grid-cols-4`).
  - **Full-Width Party & Vendor Cards**: Replaced `MobileTableCards` with dedicated full-width cards matching page content. Header displays party name and "⋯" menu. Includes a full-width Total Outstanding bar and a 2-column bucket grid with all 5 buckets in fixed order (`notDue`, `days1_30`, `days31_60`, `days61_90`, `days90Plus` spanning 2 columns). Zeros display as "—", tinted by severity, with flexible multiline wrapping for Indic scripts.
  - **Statement of Account Sheet Redesign**: Added mobile drag handle, centered party title + "Statement of Account" subtitle, rounded top sheet layout (`max-h-[92dvh]`), segmented FY selector ("Current FY | Previous FY | Custom") with 2-column date fields, compact 2x2 summary card (Opening Balance, Total Debit, Total Credit, Closing Balance retaining "Cr"), month-grouped ledger cards with 3 equal columns (Debit, Credit, Balance), and a sticky 44px+ footer with Excel, PDF, and primary emerald green WhatsApp buttons.
  - **Direct WhatsApp Message Fix**: Plain closing balance format `₹${Math.abs(closingBalance).toLocaleString("en-IN")}` omitting "Cr"/"Dr" suffix (UI and PDF displays retain "Cr" for credit balance). Formats period dates as readable `"dd MMM yyyy to dd MMM yyyy"` (e.g. `"01 Apr 2026 to 31 Mar 2027"`).
  - **Verification**: Verified via Chrome DevTools MCP under mobile device emulation (360px & 412px viewports) across English and Hindi. Verified zero horizontal overflow (`scrollWidth === clientWidth: 360px`).

### Fix 25: Turbopack Workspace Root Inference & Favicon RGBA Decoding Error

- **Files Changed**:
  - `apps/web/next.config.ts`
  - `apps/web/src/app/favicon.ico`
  - `apps/web/public/favicon.ico`
  - `apps/web/public/brand/favicon.ico`
  - `apps/web/src/app/apple-icon.png`
- **Root Cause**:
  1. Next.js 16 with Turbopack failed to detect monorepo workspace root because `node_modules/next` is installed at the workspace root while `apps/web/next.config.ts` had `turbopack: { root }` commented out. Turbopack fell back to inferring `src/app` as project root and failed.
  2. Turbopack's Rust `ico` parser requires embedded PNGs inside `.ico` files to have 32-bit RGBA color format (`png::ColorType::Rgba`, type 6). The existing `favicon.ico` embedded 24-bit RGB PNG frames (`colorType: 2`, no alpha), causing Turbopack to crash with `Format error decoding Ico: The PNG is not in RGBA format!`. Additionally, `apple-icon.png` in `src/app` was a JPEG image mislabeled with a `.png` extension.
- **What Changed**:
  - Restored `turbopack: { root: path.resolve(__dirname, "../..") }` in `next.config.ts`.
  - Re-generated `favicon.ico` (16x16, 32x32, 48x48, 64x64) with true 32-bit RGBA PNG frames (`colorType: 6`) via `sharp`. Synchronized copies in `public/` and `public/brand/`.
  - Converted `src/app/apple-icon.png` from JPEG to a genuine RGBA PNG.

### Fix 26: AI Assistant Mobile Overhaul, Stable Minimal Header, Dynamic Composer Clearance & Retry System

- **Files Changed**:
  - `apps/web/src/app/dashboard/assistant/page.tsx`
  - `apps/web/src/components/ai/SmartInputBar.tsx`
  - `apps/web/src/components/ai/ResponseCard.tsx`
  - `apps/web/src/hooks/useAIChat.ts`
  - `apps/web/src/app/api/assistant/chat/route.ts`
  - `apps/web/src/messages/{en,hi,gu,mr}.ts`
- **Root Cause**:
  1. **Header Clutter & Collapse**: Variable button text ("New chat", "Actions & Insights") and loose flex containers caused header elements to collide, wrap, and truncate ("AI As...", "Y...") on mobile.
  2. **Bloated Empty State & Stored Welcome Message**: The live assistant page rendered a large welcome card, 5 bulky module cards, and injected a long bulleted welcome text into chat history and `localStorage` on `clearChat()`.
  3. **Input Bar Positioning & Clearance**: The chat input bar lacked dynamic height measurement, causing messages to hide behind the fixed bar and floating bottom nav dock on mobile viewports. Textarea with `<16px` font triggered iOS/Android browser auto-zoom. Non-functional Attach and Mic buttons cluttered the composer.
  4. **Error Handling & Upstream Fragility**: Raw provider errors were exposed without structured status mappings (503 / 429) or client-side retry workflows, and backend lacked safe retry guards around data-mutating tool calls.
- **What Changed**:
  - **Stable Minimal Header**: Single-row layout with bot icon tile, "AI Assistant" title (`whitespace-nowrap`), tiny "Live" pulse dot, and two permanent 40px icon-only buttons ("New chat" dimmed when empty, and "Actions & Insights" quick actions drawer trigger). Subtitle hidden on mobile (`hidden md:block`). Zero shifting or wrapping between empty and active chat states.
  - **Clean Empty State**: Compact bot icon tile, localized single-line heading ("How can I help?"), muted description, and 4 quick suggestion chips in a 2x2 grid ("Today's orders", "Low stock items", "Pending payments", "Production status"). Removed bulky welcome card and 5 module cards. Empty state is driven purely by "no user messages", filtering out legacy stored welcome messages on mount, with `clearChat()` resetting to `[]`.
  - **Fixed Measured Composer Dock**: Kept window-level scroll without layout fight. Measured input bar height using `ResizeObserver` and applied dynamic `paddingBottom` to message feed (`calc(${composerHeight}px + 4.5rem + env(safe-area-inset-bottom, 0px) + 16px)` on mobile) so the last message is always fully visible above the fixed composer dock and bottom nav.
  - **Clean SmartInputBar**: `16px` font size to eliminate mobile zoom, auto-resizing up to 4 lines, 40px circular send button, Enter-to-send on desktop (Enter-for-newline on mobile). Removed non-functional Attach and Mic buttons while preserving i18n keys.
  - **ResponseCard & Error Bubble**: Markdown list items wrapped with tight list spacing (`<ul><li>`) without extraneous `<br />` breaks. Standardized inline error bubble with icon, friendly localized message, and an inline "Retry" button that resends the failed prompt.
  - **Backend Retry Safety & Status Mapping**: Added retry safety loop around upstream Gemini calls (up to 2 retries with 800ms / 2000ms exponential backoff; total retry budget ~2.8s, well within route timeout). Tracked mutating tool operations so retry is aborted if a write operation occurred. Standardized error status (503 for `SERVICE_UNAVAILABLE`, 429 for `RATE_LIMIT`, 401 for `UNAUTHORIZED`, 400 for `VALIDATION_ERROR`, 500 for `SERVER_ERROR`) with sanitized `{ success: false, error: { code, message } }` output.
  - **Multi-Language Support**: Added `emptyHeading`, `emptySubheading`, `chipOrders`, `chipStock`, `chipPayments`, `chipProduction`, and `aiBusy` across English, Hindi, Gujarati, and Marathi.
  - **Untouched Orphaned Route**: `git diff --stat apps/web/src/app/ai-assistant apps/web/src/components/ai-assistant` is verified to be 100% clean and untouched.

### Fix 27: Theme-Aware Brand Logo & Container Removal (Dark/Light Seamless Transition)

- **Files Created / Changed**:
  - `apps/web/src/components/BrandLogo.tsx` (NEW reusable component)
  - `apps/web/public/brand/ind-manager-logo-full-light-theme.png` (NEW asset)
  - `apps/web/public/brand/ind-manager-icon-light-theme.png` (NEW asset)
  - `apps/web/public/brand/ind-manager-logo-full-dark-theme.png` (NEW asset)
  - `apps/web/public/brand/ind-manager-icon-dark-theme.png` (NEW asset)
  - `apps/web/src/components/landing/LandingNavbar.tsx`
  - `apps/web/src/app/dashboard/layout.tsx`
  - `apps/web/src/app/login/page.tsx`
  - `apps/web/src/app/admin/login/page.tsx`
  - `apps/web/src/app/forgot-password/page.tsx`
  - `apps/web/src/app/staff/login/page.tsx`
  - `apps/web/src/app/staff/setup/page.tsx`
  - `apps/web/src/app/setup/page.tsx`
  - `apps/web/src/app/page.tsx`
  - `apps/web/src/components/landing/LandingHero.tsx`
  - `apps/web/src/components/landing/LandingDemo.tsx`
  - `apps/web/src/lib/notifications/channels/email-adapter.ts`
  - `apps/web/src/app/api/team/invite/route.ts`
- **Root Cause**:
  - Previously, all UI locations rendered static `ind-manager-logo-full.png` or `ind-manager-icon.png` inside dark rounded wrappers (`bg-[#0B1018]`, `rounded-xl`, `border border-white/10`, dark circles) even in light mode.
  - In light mode, the black containers created visual clash and inconsistency against light backgrounds.
- **What Changed**:
  - Extracted 4 transparent PNG assets from `ind-manager-theme-logos.zip` to `apps/web/public/brand/` (light full, light icon, dark full, dark icon).
  - Created reusable `<BrandLogo variant="full" | "icon" />` component rendering both light-theme and dark-theme Next.js `<Image>` tags toggled via CSS classes `dark:hidden` and `hidden dark:block`. This eliminates flash-of-wrong-logo on initial page load and ensures instant, zero-hydration-mismatch theme transitions.
  - Stripped all black background pills/boxes (`#0B1018`, border wrappers, rounded pill containers) across all pages:
    - **Landing Navbar**: Logo sits directly on the transparent/blurred navbar in both light and dark modes.
    - **Dashboard Sidebar (Expanded & Collapsed)**: 34x34 icon sits directly on the sidebar background without circles or container boxes in both modes. Collapsed mode remains centered and seamless.
    - **Auth Pages (`/login`, `/admin/login`, `/staff/login`, `/forgot-password`, `/staff/setup`, `/setup`)**: Removed `#0B1018` container pills on both desktop panels and mobile headers; replaced with `<BrandLogo variant="full" />`.
    - **Landing Page & Mockups**: Updated About icon and Footer logo in `page.tsx`, and sidebar mockup icons in `LandingHero.tsx` and `LandingDemo.tsx` to `<BrandLogo variant="icon" />` without container boxes or borders.
    - **Email Templates**: Replaced dark pills in `email-adapter.ts` and `api/team/invite/route.ts` with transparent `ind-manager-logo-full-light-theme.png` directly on the white email body.
  - Kept favicon, manifest, Capacitor/Electron icons completely untouched.
  - Verified across light and dark modes via DevTools browser automation: Landing navbar, Dashboard sidebar (expanded + collapsed), and Login page.

### Fix 28: AI Assistant Modern UI Overhaul, AIMark Component & Header Logo Restoration

- **Files Created / Changed**:
  - `apps/web/src/components/ai/AIMark.tsx` (NEW modern AI brand mark component)
  - `apps/web/src/components/ai/ThinkingIndicator.tsx` (NEW thinking bubble component)
  - `apps/web/src/components/ai/UserMessageCard.tsx`
  - `apps/web/src/components/ai/ResponseCard.tsx`
  - `apps/web/src/components/ai/SmartInputBar.tsx`
  - `apps/web/src/app/dashboard/assistant/page.tsx`
  - `apps/web/src/app/dashboard/layout.tsx`
  - `apps/web/src/messages/en.ts`
  - `apps/web/src/messages/hi.ts`
  - `apps/web/src/messages/gu.ts`
  - `apps/web/src/messages/mr.ts`
- **Root Cause**:
  - Global dashboard layout had a route override replacing the app brand logo with a bot icon tile on `/dashboard/assistant`.
  - Assistant UI lacked a unified visual identity (used generic `Bot` icon and legacy orb loader).
  - User messages lacked status checkmarks and 12-hour locale-aware timestamps.
  - Composer was floating with inconsistent bottom nav clearance.
- **What Changed**:
  - **Header Logo Restoration**: Removed `pathname === "/dashboard/assistant"` icon override in `layout.tsx`; mobile header and desktop breadcrumb unconditionally render `<BrandLogo variant="icon" />`. Verified that Dashboard, Orders, and Purchasing headers remain identical.
  - **Modern AIMark Component**: Built `<AIMark size={number} thinking={boolean} />` with squircle SVG, diagonal gradient (`#4F8CFF` -> `#7C5CFF` -> `#22D3EE`), center 4-point sparkle star, soft drop-shadow glow (`rgba(124, 92, 255, 0.35)`), and secondary dot conditionally rendered only when `size >= 24`. Optional `thinking` prop enables pulse animation.
  - **User Message Cards**: Right-aligned primary blue bubble (`rounded-2xl rounded-br-[4px]`, max-width `85% sm:max-w-[80%]`), 12-hour localized time via `toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", hour12: true })`, and clean checkmarks (single check on send, double check once assistant replies for that turn, stays single on error, updates to double check after successful retry).
  - **Assistant Response Cards**: Left-aligned with `<AIMark size={28} />`, card background, 1px border, `rounded-2xl rounded-tl-[4px]`, max-width `88%`, 12-hour timestamp below bubble. Friendly error bubble with warning icon and outline Retry button.
  - **Thinking Bubble**: Built `<ThinkingIndicator />` featuring `<AIMark size={28} thinking={true} />`, animated bouncing dots (`transform`/`y` and `opacity` only), and localized `t("thinking")`.
  - **Actions & Insights Sheet**: Drawer header uses `Zap` for Quick Actions and `<AIMark size={18} />` (without secondary dot) for Recent Insights.
  - **Composer Clearance**: Flat full-width bar at bottom above mobile bottom nav (`fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border px-4 py-2 sm:px-6 lg:static lg:bg-transparent lg:border-t-0 lg:p-0 lg:z-10`) with dynamic clearance on container via `ResizeObserver`.
  - **Deferred Icons**: Sidebar (`Sparkles`), command palette (`Bot`), and `notificationIconMap` (`Bot`) intentionally kept unchanged in this phase.
  - **Unused Styles Preserved**: `AIThinkingLoader.tsx` and `.ai-thinking*` in `globals.css` kept untouched and marked for manual review.
  - **Untouched Orphaned Route**: Verified `git diff --stat apps/web/src/app/ai-assistant apps/web/src/components/ai-assistant` is completely empty.

### Fix 29: Dialog Viewport Height Scrolling (DialogBody Primitive), glass.css Resting Glow Removal & Client Profile Single-Border Unification

- **Files Changed**:
  - `apps/web/src/styles/glass.css`
  - `apps/web/src/components/ui/dialog.tsx`
  - `apps/web/src/app/globals.css`
  - `apps/web/src/app/dashboard/clients/page.tsx`
  - `apps/web/src/app/dashboard/users/page.tsx`
  - `apps/web/src/app/dashboard/machines/page.tsx`
- **Root Cause**:
  1. **Dialog Short Viewport Cutoff**: Dialogs like "Add New Client" lacked an internal scroll region (`overflow-y-auto min-h-0`) between fixed header and pinned footer. On laptop-size and short viewports (1366x768, 1366x600, 1280x720, 150% browser zoom), `DialogContent` desktop height was clamped to `md:max-h-[85dvh]` while form content was taller, cutting off the form at "Address" and making the footer unreachable.
  2. **glass.css Resting Input Glow**: `glass.css` applied `box-shadow: 0 0 0 3px rgba(99, 210, 255, 0.10) !important` to resting inputs inside `[data-slot="dialog-content"]`, creating an unwanted stuck blue glow even when inputs were unfocused. High-specificity selectors and `!important` clashed with input wrappers (`IOSInput`, `.client-profile-field`).
  3. **Client Profile Edit Mode Double Borders**: Form fields in Client Profile edit mode rendered nested double borders (outer wrapper border + inner input border) with displaced icons and resting glow.
- **What Changed**:
  1. **`glass.css` Input Styling De-escalation**:
     - Removed resting 3px box-shadow from dialog inputs. Resting state now has clean `border: 1px solid var(--glass-border)` with no shadow.
     - Moved 3px focus ring exclusively to `:focus-visible` (`box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16)` in light mode, `rgba(99, 210, 255, 0.20)` in dark mode).
     - Lowered rule specificity using `:where()` and added `input:not([type])` to selector list.
     - Added explicit opt-out: `:not([data-bare], .field-bare, [data-bare] *, .field-bare *)` allowing custom input wrappers to own their border and focus rings without CSS interference.
  2. **`components/ui/dialog.tsx` Primitives**:
     - Added and exported `DialogBody` (`flex-1 min-h-0 overflow-y-auto overscroll-contain`).
     - Enhanced `DialogFooter` with pinned `shrink-0`, subtle top border, card backdrop blur, and safe area padding (`shrink-0 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end border-t border-[var(--border)] bg-[var(--card)]/90 backdrop-blur pb-[max(env(safe-area-inset-bottom),14px)] pt-3 px-6`).
     - Increased desktop `DialogContent` max height from `md:max-h-[85dvh]` to `md:max-h-[calc(100dvh-2rem)]` for maximum accessible screen area on short viewports.
  3. **`globals.css` Single Border Tokens**:
     - Scoped `.field-bare` and `.client-profile-field-input` with transparent background, border-free, and shadow-free styling.
     - Applied unified single border to `.field-wrapper` and `.client-profile-field` with hover state and `:focus-within` accent glow (`border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent)`).
     - Ensured mobile font size (`16px`) prevents iOS/Android viewport zoom.
  4. **Component Migrations**:
     - **Add New Client (`clients/page.tsx`)**: Rebuilt inside `<form id="add-client-form">` with fixed `DialogHeader`, scrollable `DialogBody`, and pinned `DialogFooter` (Cancel + Create Client buttons). Replaced double-bordered inputs with single-border `.field-wrapper` + `.field-bare` (`data-bare`), display-only `+91` chip, and 3-row textarea for Address.
     - **Client Profile Modal (`clients/page.tsx`)**: Replaced hardcoded `maxHeight: '85vh'` with `DialogBody` (`flex-1 min-h-0`). Added `.field-bare` and `data-bare` to all inputs in edit mode, completely eliminating nested double borders.
     - **Add Employee (`users/page.tsx`)**: Migrated to `DialogHeader` (fixed), `DialogBody` (scrollable), and `DialogFooter` (pinned with Cancel + Save buttons).
     - **Add/Edit Machine (`machines/page.tsx`)**: Migrated to `DialogHeader` (fixed), `DialogBody` (scrollable), and `DialogFooter` (pinned with Cancel + Save buttons).
  5. **Verification & Regression Checks**:
     - Verified Add Client across 1366x768 (light & dark), 1366x600 / 150% zoom (height 502px, body scrolled to bottom, footer pinned), 1280x720, and mobile viewports (360px & 412px full-bleed sheet).
     - Verified end-to-end client creation ("Apex Precision Tools") and client profile edit mode.
     - Verified regression across Add Vendor, New PO, Add Bank Account, Import Statement, Add Employee, Machine dialog, and Settings forms (`IOSInput`). All confirmed zero resting glow, proper single borders, and smooth scrolling.

### Fix 30: Transparent Browser-Tab Favicon Replacement & prefers-color-scheme Wiring

- **Files Changed / Replaced / Deleted**:
  - `apps/web/public/brand/favicons/` (EXTRACTED transparent asset suite from `ind-manager-favicons.zip`)
  - `apps/web/src/app/layout.tsx` (UPDATED `metadata.icons` with light/dark media queries and fallback)
  - `apps/web/src/app/favicon.ico` (DELETED old dark-background icon to prevent competing unconditioned link injection)
  - `apps/web/public/favicon.ico` (REPLACED old dark-background icon with new transparent fallback ICO)
  - `apps/web/public/brand/favicon.ico` (REPLACED old dark-background icon with new transparent fallback ICO)
  - `apps/web/public/favicon-test.html` (NEW verification test harness)
- **Root Cause**:
  - The previous favicon displayed a dark rounded-corner bounding box behind the IND Manager logo.
  - In light browser themes (or light OS desktops), this black box created an ugly visual contrast in the tab strip.
  - Additionally, `layout.tsx` served generic dark-background PNG icons (`icon-32.png`, `icon-192.png`, `icon-512.png`) under `icons.icon` without `prefers-color-scheme` media conditions.
- **What Changed**:
  1. **Asset Deployment**:
     - Unzipped `ind-manager-favicons.zip` into `apps/web/public/brand/favicons/` containing transparent 16/32/48/64/96/180/192/512 PNGs and fallback `favicon.ico`.
  2. **Metadata Wiring (`layout.tsx`)**:
     - Configured `metadata.icons.icon` with:
       - Light tab: `/brand/favicons/favicon-light-32.png` (32x32) & `favicon-light-16.png` (16x16) with `media="(prefers-color-scheme: light)"`.
       - Dark tab: `/brand/favicons/favicon-dark-32.png` (32x32) & `favicon-dark-16.png` (16x16) with `media="(prefers-color-scheme: dark)"`.
       - Fallback: `/brand/favicons/favicon.ico` (no media attribute).
  3. **Preserved Solid Launcher Icons**:
     - Preserved `apple: [{ url: "/brand/icon-180.png", sizes: "180x180" }]` and `apps/web/src/app/apple-icon.png` with solid background for iOS touch icons.
     - Preserved `apps/web/public/manifest.json` pointing to solid-background launcher icons (`/brand/icon-192.png`, `/brand/icon-512.png`) so Android and PWA launchers avoid black/white fill artifacts.
  4. **Old Favicon Removal & Deletion Log**:
     - Deleted `apps/web/src/app/favicon.ico` (old 11,810 bytes dark box) so Next.js does not inject an unconditioned 64x64 link.
     - Replaced `apps/web/public/favicon.ico` (5,883 bytes, transparent RGBA).
     - Replaced `apps/web/public/brand/favicon.ico` (5,883 bytes, transparent RGBA).
  5. **Verification**:
     - Verified `GET /favicon.ico`, `GET /brand/favicons/favicon.ico`, `GET /brand/favicons/favicon-light-32.png`, `GET /brand/favicons/favicon-dark-32.png` all return HTTP 200 with correct MIME types and sizes.
     - Verified live media queries dynamically resolve light vs dark favicons under Chrome emulation.
     - Captured `screenshots/favicon_verification_full.png`, `screenshots/favicon_tab_light.png`, and `screenshots/favicon_tab_dark.png` verifying clean tab appearance with zero bounding box.
### Fix 31: Neutral Secondary IOSButton (variant="gray") & Scrollbar color-scheme Sync

- **Files Changed**:
  - `apps/web/src/components/ui/ios/IOSButton.tsx`
  - `apps/web/src/app/dashboard/users/page.tsx`
  - `apps/web/src/app/globals.css`
- **Root Cause**:
  1. `IOSButton variant="gray"` resolved to `--accent` (brand blue) in both light and dark modes, preventing secondary actions (Cancel, Export, etc.) from having a neutral appearance. Trigger buttons like Dashboard Export also suffered from dark/blue tints when active or open (`data-[state=open]`).
  2. The Export button at `users/page.tsx:513` used hardcoded dark/white classes instead of the shared `IOSButton variant="gray"`.
  3. The root browser scrollbar inherited the operating system's color scheme preference rather than the application's explicit light/dark theme class.
- **What Changed**:
  1. Updated `IOSButton variant="gray"` in `IOSButton.tsx`:
     - Light mode: Card/white surface (`bg-white`), neutral 1px border (`border-[var(--border)]`), text `[var(--foreground)]`, hover `bg-[var(--muted)]`, pressed `active:bg-slate-200/70`.
     - Dark mode: Subtle translucent surface (`dark:bg-white/[0.08]`), neutral border (`dark:border-white/[0.10]`), light text `[var(--foreground)]`, hover `dark:bg-white/[0.14]`, pressed `dark:bg-white/[0.18]`.
     - Focus ring: `focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2`.
     - Open state: `data-[state=open]:bg-[var(--muted)] dark:data-[state=open]:bg-white/[0.14]` ensuring Radix dropdown triggers maintain neutral contrast when menus are open.
  2. Standardized `users/page.tsx` line 511 to `IOSButton variant="gray" size="medium"`.
  3. Added explicit `html { color-scheme: light !important; }` and `html.dark { color-scheme: dark !important; }` in `globals.css` so browser scrollbars strictly track the app's theme class.

### Fix 32: MobileSheet Header Slot, Opaque Background & Drag Constraints Containment

- **Files Changed**:
  - `apps/web/src/components/ui/MobileSheet.tsx`
  - `apps/web/src/components/MoreMenuSheet.tsx`
  - `apps/web/src/app/globals.css`
- **Root Cause**:
  1. In `MoreMenuSheet.tsx`, the "More" + "Customise" header row resided inside the scroll container, causing it to scroll up and get clipped/overlapped by child menu cards.
  2. Translucent sheet background (`var(--overlay-sheet-bg, rgba(255,255,255,0.96))`) permitted background page artifacts to show through during scroll and drag interactions.
  3. Scroll-driven maxHeight toggle (`70dvh -> 92dvh`) induced layout shifts during touch flings.
  4. Missing top drag boundary allowed dragging sheets upward past their resting edge.
- **What Changed**:
  1. Added opt-in `header?: React.ReactNode` slot in `MobileSheet.tsx` rendered as a `flex-shrink-0 z-10` container between the drag handle and scroll container, with top rounded corners and bottom border.
  2. Added `solidBackground?: boolean` prop in `MobileSheet.tsx` utilizing `--overlay-sheet-solid-bg: #FFFFFF` in `:root` and `#0F172A` in `.dark`.
  3. Enforced `dragControls` on handle and header, bounded with `dragConstraints={{ top: 0 }}` and `dragElastic={{ top: 0, bottom: 0.2 }}` to completely prevent upward sheet overshoot.
  4. Migrated `MoreMenuSheet.tsx` to pass its title and Customise action into `header`, enabled `solidBackground={true}`, set fixed `maxHeight="88dvh"`, removed scroll-driven `70dvh -> 92dvh` resizing, and added `pb-[calc(72px+env(safe-area-inset-bottom,16px)+16px)]` bottom nav clearance.
  5. Kept default behavior 100% backward-compatible for all other callers (`CustomizeDashboardSheet`, `ConfirmDeleteSheet`, `NotificationDropdown`, `EditProductionSheet`, etc.).

### Fix 33: Authentication Suite Overhaul (Remember Me, End-to-End Forgot Password with Dual Provider, Mongo Rate Limiting, Professional Create Account)

- **Files Changed**:
  - `apps/web/src/lib/auth-session.ts`
  - `apps/web/src/app/api/auth/login/route.ts`
  - `apps/web/middleware.ts`
  - `apps/web/src/lib/rate-limit.ts`
  - `apps/web/src/lib/auth-schemas.ts`
  - `apps/web/src/services/verification.service.ts`
  - `apps/web/src/app/api/auth/forgot-password/route.ts`
  - `apps/web/src/app/api/auth/verify-otp/route.ts`
  - `apps/web/src/app/api/auth/reset-password/route.ts`
  - `apps/web/src/app/api/auth/register/route.ts`
  - `apps/web/src/components/auth/AuthField.tsx`
  - `apps/web/src/components/auth/PhoneField.tsx`
  - `apps/web/src/components/auth/PasswordField.tsx`
  - `apps/web/src/components/auth/OtpInput.tsx`
  - `apps/web/src/components/auth/index.ts`
  - `apps/web/src/app/login/page.tsx`
  - `apps/web/src/app/forgot-password/page.tsx`
- **What Changed**:
  1. **Remember Me Persistence**:
     - `rememberMe` flag persisted on the `sessions` document.
     - Cookie headers dynamically configured: persistent (`rememberMe: true` -> `session_id` 24h, `refresh_token` 30d with `Expires`/`Max-Age`) vs session-only (`rememberMe: false` -> no `Expires`, no `Max-Age`, cleared on browser close).
     - `rotateSession` & `refreshSession` strictly retain the session's persistence class.
     - Native Capacitor app detection (`Capacitor.isNativePlatform()`) forces persistent mode.
     - Logout explicitly destroys both cookies with `path: "/"`, `maxAge: 0`, `expires: new Date(0)`.
  2. **Forgot Password End-to-End & Dual Verification**:
     - Unified `IVerificationService` with two implementations: `TwilioVerifyService` (when real Twilio Verify SID is configured) and `LocalHmacVerificationService` (HMAC-SHA256, 10-minute expiry, 5 attempt limit, timingSafeEqual, console logs in dev mode only; fails closed in production without leaked OTPs).
     - Phone lookup queries candidate formats with `$in` (`+91XXXXXXXXXX`, `91XXXXXXXXXX`, `XXXXXXXXXX`) supporting legacy 10-digit users.
     - Multi-active phone collision detection: if >1 active user shares a phone, fails closed with generic response and server log warning.
     - Google OAuth-only accounts prevented from setting passwords unless `isPhoneVerified` is true.
     - Reset token: 32 cryptographically secure random bytes, SHA-256 stored in `password_resets` with 10-minute TTL, single-use, auto-deletes prior tokens.
     - On password reset: bcrypt hash with 12 rounds, `passwordChangedAt` timestamp recorded, all active user sessions wiped across devices, and audit log recorded.
     - Public middleware updated to explicitly whitelist `/forgot-password`.
  3. **MongoDB Rate Limiting**:
     - Implemented `checkRateLimitMongo` backed by `rate_limits` collection with `expiresAt` TTL index, atomic `findOneAndUpdate` + `$inc`.
     - Keys hashed with SHA-256 for privacy. Applied to `forgot-password`, `verify-otp`, `reset-password`, and `register`. Returns 429 with `Retry-After` header.
  4. **Create Account & Shared Auth Components**:
     - Built `AuthField`, `PhoneField` (+91 chip), `PasswordField` (strength meter & criteria check), and `OtpInput` (6-box auto-focus).
     - Refactored `register` API with Zod validation, E.164 phone normalization, uniqueness checks, and field error mapping (`PHONE_TAKEN`, `EMAIL_TAKEN`, `WEAK_PASSWORD`).
     - Preserved existing login behavior and styling.

### Fix 34: Transparent Material Search Dropdown in Add/New Order Wizard

- **Files Changed**:
  - `apps/web/src/app/dashboard/orders/create/steps.tsx`
- **Root Cause**: The material search dropdown container in `StepMaterials` used `bg-[var(--card)]`, which in dark mode resolves to `rgba(255, 255, 255, 0.04)` (only 4% opacity / 96% transparent) and in light mode resolves to `rgba(255, 255, 255, 0.72)`. When users searched for materials with existing items already selected, the selected material cards directly underneath bled through the dropdown, causing text overlap. The dropdown container also lacked a dedicated higher z-index stacking context on its parent wrapper (`searchRef`) and had a fixed `200px` height cap instead of viewport-relative scaling.
- **What Changed**:
  - Replaced semi-transparent `bg-[var(--card)]` with 100% opaque surface design tokens: `bg-white dark:bg-[#161B27]`.
  - Added elevated styling with `rounded-xl`, `border border-[var(--border)] dark:border-white/[0.14]`, `shadow-xl dark:shadow-[0_12px_36px_rgba(0,0,0,0.6)]`, and `.scrollbar-hide`.
  - Capped height to `max-h-[40vh]` with `overflow-y-auto` so it does not collide with mobile keyboards.
  - Positioned dropdown at `top-full mt-1.5 left-0 right-0` with `z-50` and added `relative z-30` to `searchRef` to isolate and raise its stacking context above the sibling selected material cards.
### Fix 35: Razorpay Payment SDK Load Failure & CSP Whitelisting

- **Files Changed**:
  - `apps/web/next.config.ts`
  - `apps/web/src/lib/razorpay/checkout.ts`
- **Root Cause**:
  1. Next.js strict Content-Security-Policy (CSP) in `next.config.ts` lacked whitelisting for Razorpay domains (`https://checkout.razorpay.com`, `https://*.razorpay.com`, `https://api.razorpay.com`). When the browser attempted to load `https://checkout.razorpay.com/v1/checkout.js`, the browser's CSP blocked the script tag, triggering `script.onerror`, which threw: `"Unable to load Razorpay payment SDK. Please check your internet connection."`
  2. Even if the script had loaded, `frame-src` and `connect-src` CSP directives lacked Razorpay domains (`https://api.razorpay.com`, `https://checkout.razorpay.com`), which would block the checkout modal iframe and backend API/telemetry requests.
  3. In `checkout.ts`, `loadRazorpayScript` lacked script deduplication and did not clean up failed/stale script DOM elements. If a script load errored or timed out, the dead script tag remained in `document.body`; subsequent retry clicks found the existing script tag and attached listeners to an already-errored node that would never fire events, hanging the UI indefinitely.
- **What Changed**:
  - `next.config.ts`: Added `https://checkout.razorpay.com https://*.razorpay.com` to `script-src`, `https://api.razorpay.com https://*.razorpay.com` to `connectSrc` (dev & prod), `https://api.razorpay.com https://checkout.razorpay.com https://*.razorpay.com` to `frame-src`, `data: https://*.razorpay.com` to `font-src`, and `https://api.razorpay.com` to `form-action`.
  - `checkout.ts`: Refactored `loadRazorpayScript` with an in-flight singleton promise (`scriptLoadingPromise`), automatic cleanup of stale/failed script tags (`existingScript.remove()`), a 10s safety timeout to prevent hanging, and cleaned error handling so retries work seamlessly without page refresh. Updated error message to also advise disabling ad-blockers if blocking occurs.

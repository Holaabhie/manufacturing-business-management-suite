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

### Fix 19: Notification Bell Numeric Badge Clipping & Dot Indicator Replacement

- **Files Changed**:
  - `apps/web/src/components/NotificationDropdown.tsx`
- **Root Cause**: The notification bell trigger had an 18px numeric badge with an aggressive `-top-[6px] -right-[6px]` offset. In the 44px mobile header (`(44 - 36) / 2 = 4px` top clearance), the badge extended above the viewport bounds and was clipped at the top screen edge, particularly during pulse animations.
- **What Changed**: Replaced the numeric badge with a compact `h-2.5 w-2.5 rounded-full` solid dot at `top-1.5 right-1.5`, retaining `bg-[var(--accent-red,#EF4444)]` and theme-aware separation borders (`border-2 border-[var(--bg-card,#fff)] dark:border-[var(--bg-page,#000)]`). Preserved conditional `unreadCount > 0` display, pulse animation, and screen-reader accessibility description (`<span className="sr-only">{unreadCount} unread notifications</span>`).



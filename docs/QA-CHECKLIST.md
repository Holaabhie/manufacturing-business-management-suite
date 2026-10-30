# Gate QA & Staging Verification Checklist

This manual and automated QA checklist defines the acceptance criteria for release gates prior to staging and production rollout.

---

## 1. Role × Module Permission Matrix

| Module | Action | Owner | Admin | Manager | Accountant | Staff | Custom Staff |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Dashboard** | View KPIs | ✅ | ✅ | ✅ | ✅ | ✅ (Restricted) | Per toggle |
| **Orders** | View List | ✅ | ✅ | ✅ | ✅ | ✅ | Per toggle |
| | Create / Edit | ✅ | ✅ | ✅ | ❌ | ❌ | Per toggle |
| | Delete Order | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Production** | View Work Orders | ✅ | ✅ | ✅ | ❌ | ✅ | Per toggle |
| | Update Status / Assign | ✅ | ✅ | ✅ | ❌ | ✅ | Per toggle |
| **Inventory** | View Items | ✅ | ✅ | ✅ | ✅ | ✅ | Per toggle |
| | Add / Adjust Stock | ✅ | ✅ | ✅ | ❌ | ❌ | Per toggle |
| **Billing (Invoices)** | View Invoices | ✅ | ✅ | ✅ (Restored) | ✅ | ❌ (Blocked) | Per toggle |
| | Create / Edit Invoice | ✅ | ✅ | ✅ | ✅ | ❌ | Per toggle |
| | Record Payment | ✅ | ✅ | ✅ | ✅ | ❌ | Per toggle |
| | Delete Invoice | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Purchasing (POs)** | View Purchase Orders| ✅ | ✅ | ✅ | ✅ | ❌ | Per toggle |
| | Create PO | ✅ | ✅ | ✅ | ❌ | ❌ | Per toggle |
| | Mark Received | ✅ | ✅ | ✅ | ❌ | ❌ | Per toggle |
| | Delete PO | ✅ | ✅ (Strict) | ❌ | ❌ | ❌ | ❌ |
| **Vendors** | View Vendors | ✅ | ✅ | ✅ | ✅ | ❌ | Per toggle |
| | Add / Edit Vendor | ✅ | ✅ | ✅ | ❌ | ❌ | Per toggle |
| | Delete Vendor | ✅ | ✅ (Strict) | ❌ | ❌ | ❌ | ❌ |
| **Vendor Bills** | View Bills & Summary| ✅ | ✅ | ✅ | ✅ | ❌ | Per toggle |
| | Record Payment / TDS | ✅ | ✅ | ✅ | ✅ | ❌ | Per toggle |
| **Settings & Users**| Manage Users & Roles| ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| | Delete Organization | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 2. Touch & Gesture Verification (Mobile Long-Press Sheets)

### Test 2.1: 500ms Long-Press Sheet Trigger
- [ ] On mobile viewport (<640px) or Chrome touch emulation, touch and hold a card in `/dashboard/billing` or `/dashboard/purchasing`.
- [ ] **Expected**: At 500ms, the device triggers haptic feedback (`vibrate(50)`), and the bottom action sheet smoothly slides up.

### Test 2.2: Scroll Motion Cancellation
- [ ] Place finger on card and scroll down vertically (>10px displacement).
- [ ] **Expected**: Action sheet timer is immediately cancelled; page scrolls normally; no sheet triggers upon finger release.

### Test 2.3: Ghost Click Suppression
- [ ] Trigger the long-press sheet, then immediately release finger.
- [ ] **Expected**: The underlying card's click/navigation event is suppressed for 350ms (`longPressTriggered` guard); user does NOT navigate to invoice detail by accident.

---

## 3. Idempotency & Financial Double-Click Protection

### Test 3.1: Rapid Double-Click on Payment Recording
- [ ] Open `/dashboard/billing` or `/dashboard/vendor-bills/[id]`.
- [ ] Enter a payment amount (e.g. ₹5,000) and click **"Record Payment"** 3 times in rapid succession.
- [ ] **Expected**:
  - Client-side submit button enters disabled loading state immediately.
  - Server catches simultaneous requests via `withIdempotency` and returns `409 IDEMPOTENCY_CONCURRENT` for the second thread.
  - Subsequent retries with the same `Idempotency-Key` return the cached 200 payload without double-deducting or creating duplicate payment log entries.

### Test 3.2: Network Retry with Existing Key
- [ ] Send two manual curl requests with the same `Idempotency-Key: test-uuid-001` to `POST /api/payments`.
- [ ] **Expected**: Second curl returns identical JSON response with same `_id` and zero duplicate entries in `payments` collection.

---

## 4. Language & Internationalization (i18n) Health

### Test 4.1: Seamless Language Switch
- [ ] From navbar language dropdown, switch from English (default) to Hindi (`hi`).
- [ ] **Expected**:
  - `LocaleLoadingFallback` spinner appears while chunk `hi.json` downloads (~280KB).
  - No flash of raw untranslated translation keys (e.g. `billing.cards.totalInvoiced`).
  - Text translates completely across KPI titles, action sheets, and status badges.

### Test 4.2: Reload Persistence
- [ ] Refresh the browser (`F5` / `Cmd+R`).
- [ ] **Expected**: Page reloads directly in Hindi; cookie `NEXT_LOCALE=hi` and `LOCALE_STORAGE_KEY=hi` are preserved.

### Test 4.3: Fallback & SSR Health
- [ ] Open incognito window and visit marketing landing page `/`.
- [ ] **Expected**: Instant server-side render in English; zero hydration mismatch warnings in browser console.

---

## 5. Session Clear & Auth Boundary Testing

### Test 5.1: Clean Logout
- [ ] Click user avatar → **Log Out**.
- [ ] Inspect browser cookies (`Application` tab in DevTools).
- [ ] **Expected**: `session_id`, `remember_me`, `authjs.session-token` are completely removed.

### Test 5.2: Stale Cookie Protection
- [ ] In DevTools, set an invalid/expired cookie: `session_id=expired_test_token_12345`.
- [ ] Navigate to `/dashboard`.
- [ ] **Expected**: Middleware cleanly redirects to `/login`; user is NOT trapped in an infinite `/` ↔ `/dashboard` redirect loop.
- [ ] Navigate to `/login`.
- [ ] **Expected**: `/login` page renders with login form; does not bounce back to `/dashboard`.

# IND Manager Video — Export Specs + Screenshots Audit Report

---

## PART D: EXPORT SPECIFICATIONS

### Master Cut (16:9)

| Property | Value | Notes |
|----------|-------|-------|
| **Resolution** | 3840 × 2160 px | 16:9 UHD 4K |
| **Frame Rate** | 30 fps | (60 optional for pro delivery; source comp is 30fps) |
| **Codec** | H.264 / AVC High@L5.2 | For social, web, client preview |
| **Profile** | yuv420p 8-bit | Maximum device compatibility (iOS/Android/Browsers) |
| **Bitrate (target)** | 40–55 Mbps (VBR) | CRF 16 → ~2GB final |
| **Container** | `.mp4` | H.264 video + AAC 320kbps audio |
| **Audio** | AAC-LC 320 kbps, 48kHz stereo | Mix: -14 LUFS integrated, peaks ≤ -1dBTP (YouTube/Twitter standard) |
| **Duration** | 72 s exactly (2160 frames) | 10 scenes (5+6+7+7+7+7+7+7+8+11) |
| **Color Space** | Rec. 709 | Gamma 2.4 primary, tag `bt709` |
| **Chroma location** | Left | Match broadcast/YouTube |
| **Safe area (action)** | 95% × 95% (3648 × 2052 px) | Title-safe 90% × 92% (3456 × 1987) |
| **Subtitles (optional export)** | Two sidecar `.srt` files (`master_hi.srt`, `master_en.srt`) | Line-max 42 chars, 2-line cap |
| **Thumbnail export** | 3 frames PNG: 3s, 36s (mid-feature), 68s (CTA) | Used in YouTube / landing page |

### Master — Pro / Broadcast Option (Add-on)

| Property | Value |
|----------|-------|
| Codec | Apple ProRes 4444 XQ (or DNxHR HQX) |
| Container | `.mov` with uncompressed PCM 24-bit audio stems |
| Stems (6 tracks) | Mix, Music-only, SFX-only, VO-Hindi, VO-English, Ambience |
| Alpha | Premultiplied (for logo reveal & transitions in post) |

---

### Reels Cut (9:16)

| Property | Value | Notes |
|----------|-------|-------|
| **Resolution** | 1080 × 1920 px | 9:16 Vertical Full HD |
| **Frame Rate** | 30 fps (→ 60 fps *optional* for IG/TikTok extra crisp) |
| **Codec** | H.264 High@L4 | yuv420p, 8-bit |
| **Bitrate** | 16–22 Mbps VBR | CRF 16 → ~350 MB |
| **Container** | `.mp4` (IG) + `.mov` (TikTok/YT Shorts) | TikTok prefers MOV for H.265 fallback |
| **Audio** | AAC-LC 256 kbps, 48kHz stereo | -16 LUFS integrated for IG algorithm (voice intelligibility optimized) |
| **Duration** | 30 s exact (900 frames) | IG Reels sweet spot; watch-time optimized |
| **Safe area (CRITICAL)** | Top 140 px (profile icon / clock), Bottom 220 px (CTA / scrubber), Sides 100 px | **Do NOT place key text / UI inside these regions** |
| **Captions (burn-in)** | Hindi + English big hard-captions on every scene (2 lines max 24 em) | REQUIRED: 85%+ Reels viewers watch silent |
| **Burn-in CTA strip** | `Bottom: 220-300px`: swipe / arrow + "👉 Profile link par click karein" | |
| **Hashtag overlay (hidden export copy)** | `#Manufacturing #SMBIndia #GST #Tally #Inventory #AIAssistant #INDManager` | Add to description, NOT frame burn |

### Reels — Additional Export Variants

| Variant | Resolution | Purpose |
|---------|------------|---------|
| **LinkedIn Feed** | 1080 × 1080 (1:1 square) | Reframe Reels scenes; keep CTA centered |
| **YouTube Shorts** | 1080 × 1920 (same as Reels) | `#Shorts` in title, longer hook (1s → show value fast) |
| **WhatsApp Status** | 1080 × 1920, H.265 at 10 Mbps | Smaller filesize, no audio track optional (mute default) |

---

### Export Commands (Remotion CLI)

```bash
# ───────── MASTER (4K H.264) ─────────
npx remotion render MasterCut out/INDManager_Master_4K_3840x2160_H264.mp4 \
  --codec h264 \
  --crf 16 \
  --pixel-format yuv420p \
  --frames-per-loudness 1 \
  --log verbose

# ───────── MASTER (ProRes 4444, for post) ─────────
npx remotion render MasterCut out/INDManager_Master_ProRes4444.mov \
  --codec prores --prores-profile 4444

# ───────── REELS (9:16 H.264) ─────────
npx remotion render ReelsCut out/INDManager_Reels_30s_1080x1920_H264.mp4 \
  --codec h264 \
  --crf 16 \
  --pixel-format yuv420p

# ───────── 1080p Preview (Fast review shares) ─────────
npx remotion render MasterCut out/INDManager_Preview_1920x1080.mp4 \
  --scale 0.5 --codec h264 --crf 20
```

---
---

## PART E: SCREENSHOTS AUDIT

### Inventory Summary (from initial recon)

**Total PNGs found across project:** 136 files in 8 directories

| Source Directory | Count | Quality | Coverage |
|------------------|-------|---------|----------|
| `apps/web/scratch/screenshots/` | 60 | ⭐⭐⭐⭐ | *BEST SOURCE* — dashboard, orders, quotes, billing, challans, aging, receivables, regression, wizard, dark/light, mobile 375px, Hindi locale, PDFs, empty states, sidebars |
| `apps/web/scratch/output/` | 3 | ⭐⭐⭐⭐ | PDFs (challans Latin / Indic + order prefill) |
| `apps/web/scratch/` | 13 | ⭐⭐⭐ | Billing, quotes, dashboard, mobile (overlaps with above, higher quality dpi in some) |
| `scratch/screenshots/` | 13 | ⭐⭐ | Quotes flow (duplicates of `apps/web/scratch/screenshots/`) |
| `screenshots/` | 22 | ⭐⭐⭐ | Login onboarding + command palette + vendor dialog + orders search (dark/light) |
| Project root (`*.png`) | 14 | ⭐⭐⭐⭐ | Staff role views A/B/C (orders + work panel), admin dashboard, mobile verification 360/390/414, clients sample |
| `apps/web/public/icons/` | 2 | — | PWA icons only (non-UI) |
| `tools/tally-bridge/...` | 6 | — | Tally status icons only (non-UI) |

---

### 🟢 EXISTING — Good-to-use (Strong Quality Screenshots)

These are solid. **Do NOT re-capture** — only crop/animate/frame per brief.

| Screenshot File | Use In Scene | Notes |
|-----------------|--------------|-------|
| `dashboard_desktop_light.png` | Sc4 Inv×Prod, Sc7 Tally, Sc9 Multilang | Clean KPI grid |
| `orders_list_desktop_light.png` | Sc3 Orders | Best desktop orders list |
| `regression_payments_desktop_light.png` | Sc5 Payments | Has good KPI + row structure |
| `billing_desktop_light.png` | Sc6 Invoices | Has invoice builder UI |
| `quote_b_review_desktop_light.png` | Sc6 Invoices (phone) | Good GST breakdown visual |
| `admin_dashboard.png` | Sc7 Tally (front layer) | Full dashboard overview |
| `challans_list_hi_locale.png` | Sc9 Multilang (Hindi) | *Perfect* Hindi locale proof |
| `aging_hi_locale.png` | Sc9 backup (Hindi) | Strong Devanagari rendering |
| `challans_list_desktop_light.png` | Sc3, Sc4 backup | Good table styling reference |
| `aging_desktop_light.png` | Sc9 backup | Receivables feature screenshot |
| `statement_tab_desktop_light.png` | Sc9 backup | Statement of a/c view |
| `dashboard_mobile_375_light.png` | Sc9 (English), Reels Sc3/4 | Hero mobile UI |
| `challans_list_mobile_375_light.png` | Sc4 (Production mock), Reels Sc5 | Good 375px mobile |
| `clients_starter_sample_unblocked_375px.png` | Sc9 (Gujarati) | Clean mobile view |
| `verification_390px.png` | Sc9 (Marathi) | Good crop for lang |
| `quote_b_review_mobile_375_dark.png` | Reels Sc5 (GST Invoice) | Great PDF-style |
| `sidebar_manager_view.png` | Sc7, Sc10 backup | Nav structure showcase |
| `quote_detail_with_convert_btn.png` | Sc6 backup | Convert-to-invoice flow |
| `regression_create_order_wizard.png` | Sc3 backup | Create order wizard |
| `staff_a_work_panel.png` / `staff_b_work_panel.png` | Sc3, Sc5 backup (staff role view) | Role-based access showcase |
| `regression_billing_mobile.png` / `regression_billing.png` | Sc6, Sc5 backup | Good alternate takes |
| `1-command-palette-dark.png` | Sc3 bonus feature moment | Cmd+K global search |
| `4-orders-search-dark.png` | Sc3 search highlight | Filtering UX |
| `statement_pdf_rendered.png` | Sc6 PDF curl | Document feel |

---

### 🟡 EXISTING — Weak / Need Retouch (Re-capture Recommended)

These exist but are **not video-grade**. Recapture for: clean data, full-width tables, no layout clipping, dark-mode cinematic look, realistic but presentable demo data.

| # | File / Concept | Priority | ❌ What's Weak | ✅ How to Re-capture (Exact Recipe) |
|---|----------------|----------|---------------|------------------------------------|
| **W1** | `regression_orders_desktop_light.png` | P0 | Data cells look randomized; some rows truncate; KPI widgets look squished | **Dashboard > Orders → Dark mode → Sort by Date DESC. Filter "This FY". Ensure row 3 = "Sharma Industries" with status DELIVERED. Set KPI cards: Revenue ₹24.8L, Orders 67, Delivered 45, Pending 22. Zoom 100%, Chrome DevTools device OFF, fullscreen capture. Data MUST be Indian customers with realistic ₹ amounts.** |
| **W2** | `regression_clients_desktop_light.png` | P0 | Empty columns; small; not suitable for close-up highlight | **Dashboard > Clients → Dark mode → Filter with top 5 populated: Sharma, Patel, Gupta, Reliable, Singh. Add Balance column values: ₹8.4L, ₹6.2L, ₹4.8L, ₹3.1L, ₹2.3L with heatmap colors (green→red). Export at 2x.** |
| **W3** | `payments` general | P0 | No clean "Success toast" + big ₹ amount visual together | **Record a payment for Reliable Mfg Co, ₹3,12,800 via UPI. Snap the EXACT moment toast slides in. Use dark mode. Record cursor position ON the "Record Payment" green button.** |
| **W4** | `billing_desktop_light.png` | P1 | Invoice builder modal not open; just list page | **Orders page → Click "Create Invoice". Fill 4 line items: (1) Steel Bracket 100 qty × ₹1240, (2) CNC Machined Part ×50 ×₹4820, (3) Powder Coating ×1 × ₹24,600, (4) Packaging ×1 × ₹3,800. Ensure GST 18% shown as separate column, HSN code visible on left: 8302, 8471, 8516, 4819. Capture modal at 960px width (no horizontal scroll), with "Generate PDF" button highlighted in blue.** |
| **W5** | `invoice / quote PDF rendered` | P1 | Only challan/statement PDFs; **no invoice PDF screenshot exists!** | Generate a GST Invoice (from W4 above) with company logo, GSTIN 24AAABC1234D1ZE, HSN summary table, "Taxable Amount ₹X + CGST ₹Y + SGST ₹Z = Total". Include Tally QR code in footer (mock). Export at 300 DPI with slight page curl shadow in Photoshop. |
| **W6** | `inventory forecast / stock` | P1 | Only dashboard widget close-up; no full inventory table | **Inventory page, Dark mode. Sort by Stock ASC to get low-stock at top. Row #1: "Aluminium Sheet 3mm" with Stock=12 UNITS, Reorder Point=50, LOW STOCK red badge + ⚠️ icon. Row 2-3 medium, 4-5 green healthy. Capture with forecast bar chart showing next 4 weeks dip.** |
| **W7** | `production job card` | P1 | Only challans; no Production-detail tracking screenshot | **Production > Batch #PB-425. Job card view. Show Progress bar 92%, Machine: CNC-03, Assigned staff "Ramesh & Suresh", Material deductions table, Start/End timestamps. Add "8 min remaining" ETA pill.** |
| **W8** | `machines downtime` | P2 | No machine-tracking screenshots (60% of value prop missing) | **Dashboard > Machines page → Dark mode. 4 cards: (1) CNC-01 Running 92% green, (2) CNC-02 Maintenance (amber, MTTF 4h 12m), (3) Press Brake Running 64%, (4) Laser Cutter Idle. Include Downtime bar chart: Mon-Thu loss hours.** |
| **W9** | `dashboard_mobile_375_light.png` | P1 | KPI numbers are weak/placeholder | **Dark mode, mobile 390px. 4 KPI cards: ₹24,80,400 Revenue (blue), 67 Orders (emerald), 8 Low Stock ⚠️ (amber), ₹8,10,320 Pending (red). 2 charts below: Revenue bars + Activity feed with 3 entries.** |
| **W10** | `aging_desktop_dark.png` | P2 | Empty state + small values | **Receivables Aging populated: 0-30d ₹12.4L, 31-60d ₹6.8L, 61-90d ₹2.9L, 90+d ₹8.4L red. Bar chart visible. "Statement of A/c" button next to client row. Use real Indian company names.** |

---

### 🔴 MISSING — Do NOT Exist Yet (Critical to Capture + Import)

These are **mandatory captures** before you render the final video. Missing these = scenes will show ugly striped fallback placeholders.

| # | Scene Depends | Concept / Page | Capture Recipe | Priority |
|---|---------------|----------------|----------------|----------|
| **M1** | **Scene 8 (AI)** | `AI Assistant chat screen — full chat + top 5 report` | **Dashboard → AI Assistant. Dark mode. User message: "Mere top 5 clients ka sales report banao" (Hindi). AI responds with vertical table + bar chart showing: 1. Sharma ₹8.4L 2. Patel ₹6.2L 3. Gupta ₹4.8L 4. Reliable ₹3.1L 5. Singh ₹2.3L. Chat bubbles rounded, purple AI accent glow, input bar at bottom with "Kuch puchhiye…". 1600×1000 capture area.** | 🔴 P0 BLOCKER |
| **M2** | **Scene 7 (Tally Sync)** | `Tally bridge sync status screen` | **Settings → Tally Integration. Status: "Connected" green, Last sync: 2 min ago, 24 vouchers synced (12 Sales, 8 Payment, 4 Purchase). "Sync Now" button, error count 0. Tally ERP version 9.6.3 badge. Also capture PAIR dialog with company name "BHARAT MANUFACTURING PVT LTD".** | 🔴 P0 BLOCKER |
| **M3** | **Scene 6 (Invoice builder)** | `Tax-compliance settings: GSTIN + HSN defaults` | **Settings → Tax & Compliance page (new module, recently added per AGENTS.md Feature 4). Enter valid fictional GSTIN: `24AAABC1234D1ZE`, PAN: `AAABC1234D`, Default HSN: `8471 90 00`, Tax regime Regular, TDS Applicable ON, TCS ON, RCM OFF. Use Dark mode.** | 🔴 P0 BLOCKER |
| **M4** | **Scene 9 (Gujarati)** | `Gujarati locale screenshot (not just clients sample — full dashboard)` | **Settings → Language → ગુજરાતી. Reload → Dashboard. Capture at 1440px width with KPI widget titles, Orders page showing tab labels, all menu sidebar items translated to Gujarati. Verify ₹ symbol intact.** | 🔴 P0 BLOCKER |
| **M5** | **Scene 9 (Marathi)** | `Marathi locale screenshot (any dashboard page)` | **Language → मराठी. → Dashboard KPI grid + Mobile 390px capture. Ensure Devanagari Marathi words: उत्पादन, मजकूर, भरणे, यशस्वी, जमा.** | 🔴 P0 BLOCKER |
| **M6** | **Scene 4 × Staff Work Panel** | `Staff role dashboard: My Productions work panel` | **Staff login (staff_b_work_panel.png is close but weak). Re-capture DARK MODE: Queue cards with (1) Assigned batch PB-425 "22 min left — Ramesh", (2) Pending PB-418, (3) Completed ✓ PB-411. Machine status strip. No KPI grid (staff can't see finance per AGENTS.md rule).** | 🟠 P1 HIGH |
| **M7** | **Scene 3 (Orders) × Mobile** | `Create Order wizard mobile flow with Client auto-prefill` | **Mobile 375px DARK. Create Order → Select "Sharma Industries" from dropdown → Banner "✅ Client details auto-filled (GSTIN: 24AAABC…)" appears. Items picker with 2 rows. Use `wizard_prefill_banner_mobile_dark.png` as reference but with REAL data.** | 🟠 P1 HIGH |
| **M8** | **Scene 5 (Payments)** | `Record Payment mobile sheet with full UPI + bank modes` | **Payment recording mobile sheet at 390px dark. Fields: Amount ₹3,12,800 filled, Mode selector (UPI selected + NEFT, Cash, Cheque, Bank Transfer chips visible), Client "Reliable Mfg Co" already tagged, Ref No: PAY-2024-00321, Note field "Full and final against Order #SO-1142". Buttons: Cancel / Save Payment.** | 🟠 P1 HIGH |
| **M9** | **Scene 7 Receivables** | `Statement of Account PDF export — full rendered doc` | **Clients → "Sharma Industries" → Statement button → Generate PDF. Multi-page: Opening Balance ₹4,20,000 Dr, then 12 invoice rows + payment rows with running balance. Total Due ₹8,40,000. Company letterhead with IND Manager branding + GSTIN. Export PNG at 1600 px wide.** | 🟠 P1 HIGH |
| **M10** | **Scene 10 (New Features added recently)** | `Floating bottom navigation dock + Raised factory badge` (per AGENTS.md **Feature 2**) | **Dashboard MOBILE. Capture dark mode with bottom floating dock: 5 tabs (Dashboard raised badge with Factory icon blue ring, Orders, Production, Inventory, More). Blurred background, rounded-28px dock. See AGENTS.md lines 250–258 for spec.** | 🟡 P2 MEDIUM |
| **M11** | **Scene 3 / Scene 5 Completion Audio** | `Settings → Notifications → Sound Effects toggle card` (AGENTS.md **Feature 3**) | **Settings → Notifications tab → "Sound Effects" toggle ON, description "Play chime on Order created / Payment received / Production completed". Verify toggle matches screenshot layout.** | 🟡 P2 MEDIUM |
| **M12** | **Scene 10 (closing)** | `Settings MASTER list view (10 sub-categories)` (AGENTS.md **Feature 4**) | **Settings master-detail list at 1440px dark: Company Info, Tax & Compliance (with TALLY green badge "Verified"), Language, Security, Notifications, Modules, Team, Audit Trails, Tally Integration (green SYNCED), Data. Each row with icon + subtitle + ChevronRight.** | 🟡 P2 MEDIUM |
| **M13** | **Reels CTA** | `QR code that redirects to https://indmanager.in` | Generate high-res 512×512 QR code with logo embedded (factory mark in center), light white on dark with rounded corners, drop shadow. Export PNG. Place as `qr_landing.png` into screenshots. | 🟠 P1 HIGH |

---

### 🆕 New Add-ons Screenshots — Recently Added Per AGENTS.md

Per AGENTS.md Fixes 1-19 + Features 1-4, these are **new UI not covered in any existing screenshots yet**. You must capture these BEFORE video render if you want to show them as "new features added":

| ID | AGENTS.md Reference | What to Capture | Recommended Scene Placement |
|----|---------------------|-----------------|-----------------------------|
| **NA1** | Fix 11 Dialog Off-Center | ANY Dialog — e.g., "Add New Client" on dark+light to confirm headers use CSS vars (NOT hard-coded `#f1f5f9`). Use `settings/tax` dialog to demo. | Reels Sc5 |
| **NA2** | Feature 1 Mobile PO Action Sheet | Purchasing page 375px, PO card top-right `⋮` trigger open with "View Details / Delete" dropdown + inline "Mark as Received" pill button. | Sc4, Reels Sc4 |
| **NA3** | Fix 16 FY Archive Mobile Overflow | Reports → Previous Years 360px. FY Selector + Export button inline; ensure no horizontal scroll bar. | Sc3 KPI moment |
| **NA4** | Fix 18 FY Archive Ghost Node | Same Reports→PY with data loaded (empty state → skeleton → loaded). Capture the 3 states in sequence. | Scene transition test |
| **NA5** | Fix 20 Bottom Nav Dock (same M10) | See M10 | Scene 9 / Scene 10 |
| **NA6** | Feature 4 Tax & Compliance (same M3 / M12) | See M3 + M12 | Scene 6 (Invoices GST) + Scene 10 |
| **NA7** | Master-detail Settings Subpage: Tax | `/dashboard/settings/tax` — the 4 compliance switches (TDS/TCS/RCM + tax regime dropdown), INLINE regex validation on GSTIN/PAN blur (show green ✓ tick). | Scene 6 |
| **NA8** | Activity Log full page | `/dashboard/activity` → mobile 390px. Tab bar 5 tabs, 10 rows with avatar, amount, timestamp, chevron. Verify row meta not overflowing (Fix 15 applied). | Sc9 backup |
| **NA9** | Purchasing → Staff View restrictions | Staff role login on Purchasing. Confirm "Delete" action is hidden. Shows only "View Details" + Mark as Received. Use Staff C login to prove. | Sc4 |

---

### Final Checklist Before Render

- [ ] All **P0** missing screenshots (M1–M5) recaptured in **dark mode** at **100% zoom, no devtools device frame**
- [ ] All **P0** Weak screenshots (W1–W3) re-captured with realistic Indian business demo data (names, ₹ amounts)
- [ ] Screenshots **TEXT AND LAYOUT NOT MODIFIED** (only crop/frame — per brief CONSTRAINTS)
- [ ] Copy all PNGs into single flat folder: `video/public/screenshots/`
- [ ] Run PowerShell copy script from `video/README.md`
- [ ] Open Remotion Studio, verify MasterCut and ReelsCut have **NO striped fallback placeholders** visible
- [ ] Confirm Language Switcher screenshots EN/HI/GU/MR each contain at LEAST 30% translated UI text (not just menu)
- [ ] Confirm AI chat screenshot uses HINDI user message, NOT English placeholder

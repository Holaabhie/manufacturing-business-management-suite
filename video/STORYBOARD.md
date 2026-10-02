# IND Manager — Master Demo Video Storyboard

> **Version:** 1.0 | **Total Duration:** 72s (16:9 Master) | 30s (9:16 Reels)
> **Aspect Ratio:** 3840×2160 (16:9) / 1080×1920 (9:16) | **FPS:** 30 | **Codec:** H.264
> **Accent Color:** #2563EB (Blue) | **BG:** #0F1117 | **Font:** Inter / Satoshi

---

## PART A: 16:9 MASTER CUT (72 SECONDS)

### Visual Style Reference
- Background: Deep charcoal (#0F1117) with radial gradient glow (center: rgba(37,99,235,0.12), edge: transparent)
- Film grain overlay (subtle, 2-3% opacity)
- Device mockups: 2024 MacBook Pro 16" (Space Black) + iPhone 16 Pro (Natural Titanium)
- Shadows: Soft 40px box-shadow rgba(0,0,0,0.5) + 20px rgba(37,99,235,0.15) glow beneath devices
- All easing: `cubic-bezier(0.22, 1, 0.36, 1)` — NO linear transitions
- Typography: Inter — Headlines 800 weight, subtitles 500 weight

---

| Scene | Duration | Start-End | Visuals | Camera / Animation | On-Screen Text | VO (Hindi) | VO (English) | SFX Cue |
|-------|----------|-----------|---------|--------------------|----------------|------------|--------------|---------|
| **1 — Hook** | 5s | 0:00–0:05 | **Pain-point montage (3 quick cuts, 1.2s each):**<br>① Close-up of cluttered Excel sheet — cells overflowing, red error triangles<br>② Hand-written paper register with pencil scratches, ₹ notes scribbled<br>③ WhatsApp chat screen — 3 unread vendor messages, order texts jumbled<br><br>All 3 images de-saturated, cool blue tint, soft vignette | Slow push-in (1.02× → 1.08× zoom) on each cut. Match-cut blur between frames. Final frame fades to black with grain | **[Bold, centered]**<br>Excel? Register? WhatsApp?<br>**[Subtitle, muted]**<br>Manufacturing ka business ab old-school nahi chalega | Aapka manufacturing business Excel, register, ya WhatsApp me chalta hai? | Is your manufacturing business still running on Excel, registers, and WhatsApp? | Deep sub-bass whoosh (×3), paper rustle SFX, typing tap |
| **2 — Reveal** | 6s | 0:05–0:11 | **Logo reveal on black:**<br>Circular factory icon (IND Manager mark) draws itself via SVG stroke animation (1.5s). Stroke width 3px, color #2563EB with outer glow. Full logo slides up as tagline fades in. Radial glow pulses behind logo. | Locked-off camera. Micro-parallax (logo translates -2px Y, glow +3px Y). Splash: ring of 8 light particles burst outward at 0:06. | **[Logo mark]**<br>**IND MANAGER**<br>`[Tagline, 70% size]`<br>Indian Manufacturing Ka Complete OS | Introducing… Ind Manager. | Introducing… Ind Manager. | Logo reveal chime (C4 sine + reverb), particle pop SFX × 8 |
| **3 — Orders** | 7s | 0:11–0:18 | **MacBook mockup, slight angle (12° tilt Y, -4° tilt X):**<br>Screen shows [orders_list_desktop_light.png] — Orders data table with KPI cards above. **Highlight:** Row #3 pulses with 2px #2563EB glow ring + soft scale. Cursor clicks it → status badge animates "Delivered" checkmark draw-on. KPI numbers count-up simultaneously: ₹12.4L → ₹24.8L, 34 → 67 Orders. | Slow cinematic push-in (1.00× → 1.06×) over 6s. Device slightly drifts +10px X, -6px Y. Depth-of-field: background soft blur (12px Gaussian), device sharp. | **[Bottom-left, stacked]**<br>ORDERS<br>**[48px, bold]**<br>Har order, ek click me track karein | Orders create karein, track karein, deliver karein — sab ek jagah. | Create, track, and deliver every order — all in one place. | Cursor click ripple SFX, KPI count-up soft ticker, badge checkmark pop |
| **4 — Inventory + Production** | 7s | 0:18–0:25 | **Split-screen device layout:**<br>LEFT: MacBook showing [dashboard_desktop_light.png] — Inventory widget with bar chart. Chart lines draw-on (0:19→0:21). Low-stock row (red) highlights with shake animation + warning triangle pulse.<br>RIGHT: iPhone mockup showing [production_desktop_light → mobile crop] — Production job card with progress bar filling from 40% → 92% | Parallax: MacBook drifts left 15px, iPhone drifts right 10px. Both push-in 1.05×. Rack-focus: alternates between left/right screens at 0:21 (200ms cross-blur) | **[Bottom-center]**<br>INVENTORY × PRODUCTION<br>**[42px]**<br>Stock aur production — real-time nazar rakhein | Stock kam hone se pehle alert payein. Production har batch ko live track karein. | Get alerts before stock runs low. Track every production batch live. | Progress bar soft fill hum, warning triangle beep (low, muted), chart draw-on whoosh |
| **5 — Payments** | 7s | 0:25–0:32 | **MacBook front-facing (0° tilt, floating 20px above reflection plane):**<br>Screen shows [regression_payments_desktop_light.png] — Payments dashboard with "Received" green badge. **Animation sequence (stagger 60ms):** ① 4 payment cards stagger-in (translate -20px Y → 0, opacity 0→1). ② ₹ amount line-items count-up: ₹52,400 → ₹86,750 → ₹1,24,300. ③ Success toast slides in top-right: "Payment Recorded ✓" | Slow push-in 1.00× → 1.04×. Reflection plane: device mirrored below at 40% opacity with 30px gradient fade. Subtle float: device bobs 4px sine wave over 7s loop | **[Bottom-left]**<br>PAYMENTS<br>**[44px]**<br>UPI, Netbanking, Cash — sab record karein | Payment receive karein, reconcile karein, aur balance sheet automatically update ho. | Receive payments, reconcile instantly, and watch your balance update automatically. | Toast slide-in whoosh, card stagger soft pop × 4, payment success chime |
| **6 — Invoice Builder** | 7s | 0:32–0:39 | **iPhone 16 Pro (left) + MacBook (right, larger):**<br>iPhone: [quote_b_review_desktop_light.png → mobile] — Invoice preview screen with GST breakdown. Highlight box: "GST ₹1,860" pulses gold.<br>MacBook: [billing_desktop_light.png] — Invoice builder modal open. "Generate PDF" button gets clicked (cursor ripple). Page curl animation at 0:36 suggests PDF ready. | Zoom-through transition: starts tight on iPhone GST amount, zooms through to MacBook modal (1.2× zoom over 0.6s, morph match-cut). iPhone fades to corner at scale 0.4 after zoom-through | **[Top-center]**<br>GST INVOICES<br>**[40px]**<br>HSN + tax breakdown — 100% compliant | GST-compliant invoices banaayein — HSN code, tax breakdown, PDF sab auto. | Build fully GST-compliant invoices with HSN codes, tax breakdown, and auto PDFs. | Button click ripple, page curl whoosh, PDF generate ding |
| **7 — Tally Sync** | 7s | 0:39–0:46 | **Floating 3D card stack (depth 200px between layers):**<br>BACK LAYER: Faded Tally ERP 9 UI screenshot (sepia tint)<br>MID LAYER: Arrow graphic flowing → (animated dashed line draws L→R, #2563EB stroke 3px, pulse)<br>FRONT LAYER: MacBook showing IND Manager dashboard. Sync icon (↻) spins at top-right — 3 complete rotations over 5s, then green checkmark pops | Parallax tilt: entire card stack tilts 0°→+6° Y axis, -2°→+3° X axis. Depth layers translate at different rates (BG slowest, FG fastest) for stereoscopic feel | **[Bottom-right]**<br>TALLY SYNC<br>**[36px]**<br>Ek click me Tally ERP me data jaye | Manual data entry ka tension khatam. Ek click me Tally ERP sync. | No more manual data entry. Sync to Tally ERP in one click. | Sync arrow draw-on zippy hum, checkmark pop ding, icon rotation soft whirr |
| **8 — AI Assistant** | 7s | 0:46–0:53 | **Close-up MacBook screen crop (punch-in from 1.0× → 1.15×):**<br>Shows [ai-assistant page concept — chat UI]. User types: "Mere top 5 clients ka sales report banao" → AI "typing" indicator pulses (3 dots). Then response card slides up with bar chart visualization. AI accent purple glow (#7C3AED) emanates from chat bubble. | Rack-focus blur on punch-in (0:46→0:47 sharpens). AI bubble glow pulses RGB 0.2s cycle on typing indicator. Chart bars stagger grow 0→100% (70ms gap each) | **[Top-left]**<br>AI ASSISTANT<br>**[40px]**<br>Hindi me boliye, report taiyaar hai | Bas Hindi me boli ye — report, chart, ya insights sab 2 second me. | Just ask in Hindi — reports, charts, insights in 2 seconds flat. | Typing indicator soft tick × 3, AI response slide-up whoosh, chart bars grow pop × 5 |
| **9 — Multi-language × Mobile** | 8s | 0:53–1:01 | **4-device rotating carousel (iPhone 16 Pro × 4, arranged in gentle arc, Z-depth 50px each):**<br>① EN (English) dashboard → ② HI (हिन्दी) orders list [challans_list_hi_locale.png] → ③ GU (ગુજરાતી) clients → ④ MR (Marathi) inventory<br><br>Each device shows different locale. Behind them: Cobe-style 3D globe (India highlighted) slowly rotates 15° | Carousel rotates gentle 30° Y-axis over 8s. Each device fades + highlights as it reaches front-center. Globe spins slow, India region has #2563EB glow pulse at 0:56 | **[Top-center]**<br>4 भाषाएँ × हर फोन<br>**[44px]**<br>English • Hindi • Gujarati • Marathi | Hindi, Gujarati, Marathi — apni bhasha me app chalayein. Har phone pe. | English, Hindi, Gujarati, Marathi — run the app in your language, on any phone. | Locale switch subtle click × 3, globe rotation ambient hum |
| **10 — Closing** | 11s | 1:01–1:12 | **[1:01–1:05]** Zoom-through from last device into logo. Entire UI mockups shrink + recede into background, grain intensifies, IND Manager logo re-appears large center-screen with strong radial glow.<br>**[1:05–1:12]** CTA section: Primary button morphs in (pill shape, #2563EB fill, white text "Free Trial Start Karein"). Below: URL "indmanager.in" in monospace, slowly types itself. Subtle particle drift upward in background (8–10 particles, 2px/s) | Slow push-in on logo 1.0× → 1.12× over 10s. Button has micro-hover state at 1:08 (scale 1.03). Particle float sine-wave wobble. Final frame: Hold 1.5s on full CTA with sharp logo | **[Center, stacked]**<br>**IND MANAGER**<br>Indian Manufacturing Ka Complete OS<br><br>`[CTA Button]`<br>👉 Free Trial Start Karein<br><br>`[Monospace, small]`<br>indmanager.in | Ab der mat kariye. Ind Manager ka free trial aaj hi shuru kariye — indmanager.in | Don't wait. Start your free trial of Ind Manager today at indmanager.in | CTA button morph-in soft thump, URL typewriter tick × 13, final logo chime reprise (lower pitch) |

---

## PART B: 9:16 INSTAGRAM REELS CUT (30 SECONDS)

> **Strategy:** Fast-paced hook → 3 feature montage → quick CTA. Text-heavy (Reels users watch silent 85%+).
> **Motion:** Every cut ≤ 4s. Jump cuts on beat (120 BPM). Snap-zooms on highlights.

| Scene | Duration | Start-End | Visuals | Text | Audio |
|-------|----------|-----------|---------|------|-------|
| **1 — Quick Hook** | 2s | 0:00–0:02 | Flash-cut: Excel error → WhatsApp spam → paper register. 0.6s each. Hard zoom-in on each | **[Huge, center, animated shake]**<br>YE CHALOGA NAHI ❌ | Upbeat electronic track drop on beat 1 |
| **2 — Logo Flash** | 1.5s | 0:02–0:03.5 | IND Manager logo slams in from top, bounce 1.2×→1.0×. Glow flash | **IND MANAGER** | Impact SFX (slam) |
| **3 — Orders** | 3.5s | 0:03.5–0:07 | Mobile crop: Orders list, row clicked, status checkmark draws. KPI ₹ counter scrolls fast | **ORDERS 1-CLICK ME**<br>`[Number overlay, BIG]`<br>₹24.8L | Beat 2–3 |
| **4 — Inventory** | 3.5s | 0:07–0:10.5 | Mobile: Inventory bar chart draw-on. Low-stock red pulse → green check after restock animation | **STOCK TRACK LIVE**<br>`[Badge]`<br>⚠️ → ✅ | Beat 4–5 |
| **5 — GST Invoices** | 3.5s | 0:10.5–0:14 | Mobile: Invoice preview, GST highlight box glow, PDF page flip animation | **GST COMPLIANT**<br>`[Sticker]`<br>AUTO HSN 📄 | Beat 6–7 |
| **6 — AI × Hindi** | 4s | 0:14–0:18 | Mobile: AI chat. User types "Top clients" → Hindi response + chart pops. Vertical text scroll | **HINDI ME BOLIYE**<br>`[Chat bubble]`<br>Report 2s me taiyaar 🤖 | Beat 8–9 (AI whoosh SFX) |
| **7 — 4 Languages** | 3s | 0:18–0:21 | Fast language flip animation (EN→HI→GU→MR). Text label changes with flag icons | **4 BHASHAEN**<br>🇮🇳 EN हिं ગુ मर | Beat 10–11 (tick × 3) |
| **8 — Tally × Payments** | 3s | 0:21–0:24 | Split screen top/bottom: Tally sync arrow + payment success toast both animate | **TALLY SYNC ✓**<br>**PAYMENT REC ✓** | Beat 12 (double chime) |
| **9 — CTA Hold** | 6s | 0:24–0:30 | Big logo + CTA button. Download arrow bounces. URL "indmanager.in" with QR code placeholder bottom | **[Huge]**<br>FREE ME TRY KARIYE<br>`[CTA]`<br>👉 Download Now<br>`[Bottom]`<br>indmanager.in | Final beat + rise. Voiceover: "Aaj hi shuru karein!" (Hindi) / "Start today!" (English) |

---

## VOICEOVER SCRIPTS (Separate Tracks)

### HINDI VOICEOVER (Male/Female, 28-35 age, Warm + Energetic)
```
[0:00-0:05] Aapka manufacturing business Excel, register, ya WhatsApp me chalta hai?
[0:05-0:11] (Pause 0.5s)…Ind Manager. Indian Manufacturing Ka Complete OS.
[0:11-0:18] Orders create karein, track karein, deliver karein — sab ek jagah.
[0:18-0:25] Stock kam hone se pehle alert payein. Production har batch ko live track karein.
[0:25-0:32] Payment receive karein, reconcile karein, balance automatically update ho.
[0:32-0:39] GST-compliant invoices banaayein — HSN code, tax breakdown, PDF sab auto.
[0:39-0:46] Manual data entry ka tension khatam. Ek click me Tally ERP sync.
[0:46-0:53] Bas Hindi me boli ye — report, chart, ya insights sab 2 second me.
[0:53-1:01] Hindi, Gujarati, Marathi — apni bhasha me app chalayein. Har phone pe.
[1:01-1:12] (Warm, closing tone) Ab der mat kariye. Ind Manager ka free trial aaj hi shuru kariye. indmanager.in
```

### ENGLISH VOICEOVER (Male/Female, Neutral Indian Accent, Confident + Approachable)
```
[0:00-0:05] Is your manufacturing business still running on Excel, registers, and WhatsApp?
[0:05-0:11] (Pause 0.5s)…Ind Manager. The Complete OS for Indian Manufacturing.
[0:11-0:18] Create, track, and deliver every order — all in one place.
[0:18-0:25] Get alerts before stock runs low. Track every production batch live.
[0:25-0:32] Receive payments, reconcile instantly, and watch your balance update automatically.
[0:32-0:39] Build fully GST-compliant invoices with HSN codes, tax breakdown, and auto PDFs.
[0:39-0:46] No more manual data entry. Sync to Tally ERP in one click.
[0:46-0:53] Just ask in Hindi — reports, charts, insights in 2 seconds flat.
[0:53-1:01] English, Hindi, Gujarati, Marathi — run the app in your language, on any phone.
[1:01-1:12] (Warm, closing tone) Don't wait. Start your free trial of Ind Manager today at indmanager.in
```

---

## AUDIO SPECIFICATION SHEET

### Background Track (Master: 72s | Reels: 30s)
- **Genre:** Minimal electronic / corporate tech
- **Tempo:** 120 BPM (Master) / 128 BPM (Reels, more energy)
- **Key:** C Major → A minor at scene 8 (AI) → C Major closing
- **Instruments:** Soft sub-bass (808), arpeggiated synth (pluck), muted piano mid-layer, subtle strings pad
- **Dynamics:** Starts piano (pp) on Hook → builds to mezzo-forte (mf) scene 4 → forte (f) at scene 9 → holds then gently fades on CTA
- **Royalty-Free Source Recommendations:**
  - Epidemic Sound: "Blueprint Dreams" (ID: es_8TZpzSYqg) OR "Forward Motion" (ID: es_4Y2aWq9L)
  - Artlist.io: "Elevate Tech" (ID: 110954) OR "Vision Forward" (ID: 167292)

### SFX Layering (Stereo, -18dBFS integrated, peaks ≤ -1dBTP)
| SFX | Source Recs | When Used |
|-----|-------------|-----------|
| Click / Ripple | Freesound #410409 (software-ui-click), pitched +2 st | All cursor interactions |
| Whoosh / Sweep | Freesound #584279 (sci-fi-sweep-2), low-pass 2kHz | Transitions, slide-ins |
| Chime / Ding | Freesound #337111 (notification-chime), reverb 1.2s | Success states, badges, CTAs |
| Pop / Snap | Freesound #268671 (pop), gate 0.01s attack | Card stagger, chart bars |
| Typing / Ticker | Freesound #496514 (computer-keyboard), reduced noise | KPIs count-up, URL type |
| Sub-bass thump | Freesound #614238 (bass-impact), EQ 60Hz boost | Slam cuts in Reels |

---

## MOTION TIMING REFERENCE (Easing Curves)
All transitions use `cubic-bezier(0.22, 1, 0.36, 1)` — implemented in Framer Motion as:
```tsx
const CURVE = { ease: [0.22, 1, 0.36, 1], duration: 0.6 }
const FAST = { ease: [0.22, 1, 0.36, 1], duration: 0.35 }
const SLOW = { ease: [0.22, 1, 0.36, 1], duration: 0.9 }
```

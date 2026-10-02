# IND Manager — Demo Video (Remotion)

> Premium Apple/Stripe-style product-launch demo (Master 16:9 4K + Reels 9:16)

---

## Setup

```bash
# 1. Go to video directory
cd video

# 2. Install dependencies
npm install
# OR pnpm install / yarn

# 3. Copy screenshots (one-time step):
#    Copy PNGs from these project folders into ./public/screenshots/
#    (required — Remotion staticFile() resolves to public/)
```

### Screenshots Source Folders → Copy to: `video/public/screenshots/`

From your project root, copy all PNGs from these 6 locations into the **single flat** `public/screenshots/` folder:

```powershell
# PowerShell (Windows) — run from project root:
$dests = @(
  "apps/web/scratch/output/*.png",
  "apps/web/scratch/screenshots/*.png",
  "apps/web/scratch/*.png",
  "scratch/screenshots/*.png",
  "screenshots/*.png",
  "*.png"
)
foreach ($d in $dests) {
  Copy-Item -Path $d -Destination "video/public/screenshots/" -Force
}
```

The **constants file** ([constants.ts](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/video/src/constants.ts#L117-L233)) maps `SHOTS.*` keys → filenames in `public/screenshots/`. Missing PNGs will render with a striped fallback pattern (safe).

---

## Run Studio (Preview)

```bash
npm start
# opens http://localhost:3000 with Remotion Studio
# Compositions available:
#   · MasterCut  (3840 × 2160 · 72s · 2160 frames)
#   · ReelsCut   (1080 × 1920 · 30s ·  900 frames)
```

## Render / Export

```bash
# ═══ MASTER — 4K 3840×2160 H.264 ═══
npm run build:master
# → out/master-4k.mp4  (≈ 1.8–2.5 GB, CRF 16, yuv420p, 30fps)

# ═══ REELS — 1080×1920 H.264 ═══
npm run build:reels
# → out/reels-1080x1920.mp4  (≈ 350–500 MB, CRF 16, yuv420p, 30fps)

# ═══ Quick 1080p preview (fast) ═══
npm run build:preview
# → out/preview-1080p.mp4  (scale 0.5, CRF 20, for review/shares)
```

### ProRes / Final Cut Masters (optional)

```bash
npx remotion render MasterCut out/master-prores4444.mov --codec prores --prores-profile 4444
npx remotion render ReelsCut  out/reels-prores4444.mov  --codec prores --prores-profile 4444
```

### Image Sequence / PNG Frames Stack

```bash
npx remotion render MasterCut out/frames/ --sequence
# → generates 2160 PNGs + audio.json (for After Effects/Premiere round-trip)
```

---

## File Map

| Path | Purpose |
|------|---------|
| `package.json` | Remotion + React 18 deps, build scripts |
| `remotion.config.ts` | Studio config, concurrency, codec defaults |
| `tsconfig.json` | TypeScript strict mode |
| `src/index.ts` | Entry — calls `registerRoot()` |
| `src/Root.tsx` | Registers 2x `<Composition>`: MasterCut + ReelsCut |
| `src/constants.ts` | FPS, scene timing, COLORS, easing, `SHOTS` filename map |
| `src/types.ts` | Shared TS types (DeviceMockup, Highlight, Cursor) |
| `src/MasterCut.tsx` | 72s 16:9 orchestrator with 10-scene cross-blend |
| `src/ReelsCut.tsx` | 30s 9:16 fast-cut Reels composition |
| `src/components/Background.tsx` | Cinematic BG: radial glow + grain + particles + vignette |
| `src/components/DeviceMockup.tsx` | MacBook/iPhone bezel, shadow, reflection, highlight dim-ring |
| `src/components/AnimatedNumber.tsx` | Count-up with Indian INR comma (lakh/crore) formatting |
| `src/components/CursorClick.tsx` | macOS cursor + 3 expanding ripple rings on click |
| `src/components/TextLayers.tsx` | `TextBlock`, `CTAButton`, `TypewriterText` (eyebrow + bar + headline + subhead) |
| `src/scenes/SceneHook.tsx` | S1 · Pain montage Excel/Register/WhatsApp |
| `src/scenes/SceneReveal.tsx` | S2 · Logo SVG stroke-draw + particle burst splash |
| `src/scenes/SceneOrders.tsx` | S3 · MacBook orders + KPI floaters + cursor click ripple |
| `src/scenes/SceneInventory.tsx` | S4 · Split MacBook×iPhone rack-focus blur swap, bar draw, low-stock pulse |
| `src/scenes/ScenePayments.tsx` | S5 · 4 cards stagger, ₹ count-up, success toast slide-in |
| `src/scenes/SceneInvoices.tsx` | S6 · Zoom-through iPhone GST → MacBook PDF + page curl |
| `src/scenes/SceneTally.tsx` | S7 · 3-layer parallax tilt: Tally→Arrows→IND Manager + sync spin ✓ |
| `src/scenes/SceneAI.tsx` | S8 · Punch-in to chat → typing → response card + stagger bar chart |
| `src/scenes/SceneMultilang.tsx` | S9 · 4-phone arc carousel + Cobe-style 3D globe India highlight |
| `src/scenes/SceneClosing.tsx` | S10 · UI tiles recede + LOGO spring + CTA morph + URL typewriter |

---

## Customization Hooks

### Want to change accent color?
Edit [constants.ts](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/video/src/constants.ts#L53-L82) → `COLORS.PRIMARY` (default `#2563EB`). Propagates automatically through all scenes, bars, text, CTAs.

### Replace factory logo with real brand mark?
Swap the inline `<svg>` blocks in these 3 files:
1. [SceneReveal.tsx](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/video/src/scenes/SceneReveal.tsx#L177-L224)
2. [SceneClosing.tsx](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/video/src/scenes/SceneClosing.tsx#L98-L124)
3. [ReelsCut.tsx](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/video/src/ReelsCut.tsx) — scenes 2 + 9

### Change duration per scene?
Edit the `SCENES_MASTER` / `SCENES_REELS` timing objects in [constants.ts](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/video/src/constants.ts#L10-L40). **Note**: update both the `dur` and ensure the `start` of the following scene equals `prev.start + prev.dur`.

### Add background music track?
Drop audio file (MP3/WAV) to `video/public/audio/master-track.mp3` and wrap each Composition content with:

```tsx
import { Audio, staticFile } from "remotion";
<Audio src={staticFile("audio/master-track.mp3")} volume={0.35} />
```

---

## Render-time Optimizations (Windows)

- In `remotion.config.ts` set `Config.setConcurrency(Math.max(2, os.cpus().length - 2))`
- Use `--gl angle` if GPU-bound: `npx remotion render MasterCut --gl angle`
- 4K H.264 on Ryzen 7 7700X / RTX 3060 ≈ 8–14 minutes (180–220% real-time factor is normal)

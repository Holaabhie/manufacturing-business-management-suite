# IND Manager Video — AI Image / Video Generator Prompts

> **Purpose:** Background plates, b-roll elements, device mockups, decorative assets, and supplementals.
> **Note:** UI screens (app screenshots) should NOT be regenerated. Use actual screenshots from the project directly and animate/crop only.
> **Style Base:** Apple / Linear / Stripe launch film aesthetic. Clean, high contrast, cinematic.

---

## SECTION 1: BACKGROUND PLATES (Per Scene, 3840×2160 @30fps, 16:9)

All backgrounds use: `--bg-base: #0F1117`, grain overlay 2%, no distracting elements.

### PROMPT 1A — Scene 1 Hook Background (Pain-point Dark)
```
STABLE VIDEO / IMG2IMG PROMPT:
"Cinematic dark tech background, deep charcoal #0F1117 base, very subtle radial gradient glow top-center with cool blue desaturated tint, 2% film grain overlay, soft vignette edges, ultra high contrast, 8K, photorealistic, no text, no logos, empty negative space, Apple product launch aesthetic, shallow depth of field bokeh 10px blur bottom third, animated slow 10s parallax drift, moody professional"

NEGATIVE PROMPT:
"text, logo, watermark, people, face, office, desk, laptop, furniture, windows, architecture, bright spots, neon, colorful, low quality, blurry, noisy, distorted"

GENERATE AS: Video (5s loop) OR 4 still frames 0°, 2°, 4°, 6° parallax angles
```

### PROMPT 1B — Scene 2 Logo Reveal Background
```
"Pure black #000000 background, center-positioned very subtle radial gradient glow #2563EB at exactly 12% opacity spread 40% of canvas, absolutely zero edge artifacts, 1.5% film grain, empty, minimalist, cinematic black for logo reveal animation, 8K"

NEGATIVE: "stars, dust, particles, texture, grid, lines"
```

### PROMPT 1C — Scene 3-8 Generic Feature Backgrounds (6 variants)
```
"Minimalist cinematic dark background, #0F1117 base, soft radial glow #2563EB 8% opacity positioned bottom-left for scene 3 / top-right for scene 4 / center for scene 5, 2% film grain, soft depth-of-field blur lower 30% of frame, no objects, no text, pure negative space for floating device mockups, Apple keynote aesthetic, 4K ultra detailed"

VARIANTS (change glow position):
- Scene 3 Orders: glow @ bottom-left
- Scene 4 Inv+Prod: glow @ top-right dual
- Scene 5 Payments: glow @ center
- Scene 6 Invoices: glow @ top-left warm tint #F59E0B 5% mix
- Scene 7 Tally: glow @ bottom-right
- Scene 8 AI: glow @ center purple #7C3AED 10% opacity (switch accent)
```

### PROMPT 1D — Scene 9 Multi-language Globe Background
```
"Ultra-premium dark space background, deep navy #070911, very faint nebula dust wisps purple #7C3AED + blue #2563EB only 3% opacity, tiny pinprick stars (50 total, not dense) 1px size, large empty center area for globe + devices, cinematic 2.35:1 letterbox feel inside 16:9 frame, 2% grain, Apple Vision Pro aesthetic, 8K"

NEGATIVE: "galaxy, milky way, bright stars, constellations, planets, earth, moon"
```

### PROMPT 1E — Scene 10 Closing CTA Background
```
"Cinematic premium dark background, #0A0C12 base, strong concentrated radial gradient glow center #2563EB 18% opacity falloff sharp, ascending tiny light particles (80 particles, 0.5-2px size) floating upward slowly with subtle sine wobble, 2.5% film grain, vignette 15% opacity, empty center 60% canvas for logo + CTA, high-end SaaS launch film feel, 8K photoreal"
```

---

## SECTION 2: B-ROLL ELEMENTS (Animated Clips, WebM/MP4 with Alpha)

### PROMPT 2A — Scene 1 Pain-point Elements (3 Separate Assets)
**Clip 1 — Excel Chaos Close-up (Use only if no screenshot available; prefer real screenshot animation)**
```
"Close-up macro shot of messy Excel spreadsheet screen, tiny illegible text cells overflowing, red error triangle icons, #DIV/0! errors visible, harsh cool blue monitor light reflection, very shallow DOF, desaturated color grade -50% saturation, 60fps, handheld micro shake 0.5px, cinematic 16:9, no camera focus hunting"
```

**Clip 2 — Paper Register**
```
"Top-down flat lay of hand-written Indian small-business cash register ledger book, pencil eraser smudges, rupee symbol ₹ scribbled multiple times, pencil lying diagonal, worn paper texture, warm tungsten desk lamp lighting from top-left, very shallow DOF edge blur, 2.5% film grain, de-saturated slightly, 4K"
```

**Clip 3 — WhatsApp Chaos Phone (Animate Text Bubble Pop-in)**
```
"Close-up macro of smartphone screen, WhatsApp chat interface showing stack of unread messages from Indian vendor contacts, message notification badges 3+, text bubbles overlapping slightly, harsh blue screen glow, slight screen glare reflection, 60fps, shallow depth of field"
```

### PROMPT 2B — Scene 7 Tally Sync Connection Visual
```
"Abstract 3D floating animated visualization, left side: faded translucent Tally-style window UI silhouette sepia #92400E tint, curved dashed data flow lines animated drawing left-to-right with particles traveling along path (20px gap), right side: clean modern IND Manager dashboard window silhouette blue #2563EB glow accent, connection line thickness 4px animated dash offset 100%/s, dark background matching scene 7 plate, alpha channel transparent, rendered Octane, 60fps, depth layers 3"
```

### PROMPT 2C — Scene 9 Animated Cobe-style Globe (India-focused)
```
"3D photorealistic wireframe globe rendered in Octane, 8K, rotating very slowly counter-clockwise 0.5°/s, India subcontinent landmass outlined with soft blue #2563EB glow stroke 2px, 10 floating connection arcs originating from Mumbai, Delhi, Bangalore, Chennai curving outward to other countries, arcs animated stroke dash draw-on loop, globe base color dark grey #1E293B wireframe 1px thin lines, dots at major city locations, empty space around, alpha channel background, cinematic, 60fps"
```

### PROMPT 2D — Scene 10 Floating Particle Rise
```
"Animated particle overlay loop, 100+ tiny circular soft particles sizes 1px-3px, colors white 40% #2563EB 60%, slow upward drift velocity 12px/s + subtle horizontal sine wave amplitude 4px frequency 0.5Hz, alpha fade in bottom 20% and fade out top 20%, transparent alpha background, 60fps loop 20s long, ADD blend mode compatible"
```

---

## SECTION 3: DEVICE MOCKUPS (3D Renders, 3840×2160, PNG with Alpha)

These are clean template mockups — insert actual UI screenshots into the screen areas via Remotion.

### PROMPT 3A — MacBook Pro 16" (Space Black) — Multiple Angles
```
"Ultra-photoreal Octane render of 2024 MacBook Pro 16 inch Space Black, perfectly clean unbranded lid removed concept, screen bezel only, 3 angles as separate renders:
ANGLE 1 (Front): Dead-on front view 0° tilt, slight floating 12mm above invisible reflection plane, screen area transparent PNG, soft shadow 40px blur 0.3 black underneath, blue #2563EB rim light 10% intensity back-left, 8K
ANGLE 2 (Hero -12°Y +4°X): Slightly angled view isometric feel, floating 20mm above plane, screen content area kept transparent ready for composite, depth shadow long 60px 0.2 opacity, glossy screen surface subtle specular highlight top-right 8% opacity
ANGLE 3 (Dual Angle for splits): Quarter turn -30°Y, floating perspective, ready to pair with iPhone mockup on same canvas"

OUTPUT: 3 separate PNG files 3840×2160 with transparent alpha screen cutout region (use screen area bounding box ~2900×1860 for ANGLE 1)
```

### PROMPT 3B — iPhone 16 Pro (Natural Titanium) — Multiple Poses
```
"Ultra-photoreal Octane render 2024 iPhone 16 Pro 6.9 inch Natural Titanium finish, unbranded clean body, dynamic island visible, 3 poses:
POSE 1 (Vertical portrait, hero): Floating -6° tilt Y, 3° tilt X, reflection plane below 30% opacity fade, screen area transparent alpha, blue rim light, 8K
POSE 2 (Flat, slight angle): Screen facing mostly forward, flat lay 5° tilt, shadow soft
POSE 3 (For language carousel): Perfect dead-on vertical portrait 0°, zero tilt, ready for fast rotation animation sequences, screen area perfectly rectangular alpha cutout ~1020×2080 equivalent inside 3840 frame"

NEGATIVE: "case, screen protector, scratches, smudges, fingerprints, text, icons on screen"
```

### PROMPT 3C — Reflection Plane Material (Overlay Asset)
```
"16:9 transparent overlay asset, linear gradient fade-out, top 0% opacity, from y=50% to y=100% opacity goes from 45% to 0%, pure multiplicative blend mode compatible, vertical only, no color, pure greyscale alpha gradient, intended for creating device reflection effects in post, 8K PNG"
```

---

## SECTION 4: DECORATIVE UI ELEMENTS (Animated SVG-style Assets)

### PROMPT 4A — Cursor Click Ripple Effect (Animated WebM with Alpha)
```
"Minimalist pure white cursor arrow pointer (macOS style, 24×24px), clicking down creates 3 concentric expanding ripple rings color #2563EB stroke 2px no fill, rings expand 0px→80px over 0.6s, opacity 1→0 each ring delayed 0, 0.08, 0.16s, single click event animation, alpha transparent background, ADD blend mode ready, 60fps"
```

### PROMPT 4B — Count-up Number Ticker (Use Remotion NumberFlow instead, fallback asset)
```
"Indian Rupee currency formatted number ticker visualizer, text white bold Inter 700, ₹ prefix, comma separators Indian system, animated digit flip mechanical style, numbers 0 to 99,99,999 range, pure alpha transparent, monospaced lining numerals, blue #2563EB accent on decimal if shown, render test numbers: ₹12,40,000 animating to ₹24,80,000 over 3 seconds"
```

### PROMPT 4C — Success Checkmark Draw-on
```
"Animated circular badge, white BG rounded pill, green #16A34A stroke 4px, checkmark path draw-on 0→1 SVG stroke-dasharray animation over 0.4s cubic-bezier(0.22,1,0.36,1), soft drop shadow, alpha transparent background, final frame held for 1.5s, size 96×96 px at 4K canvas scale"
```

### PROMPT 4D — Chart Line Draw-on (Recharts replacement for highlight)
```
"2D animated line chart, 6 data points, upward trend from left-bottom to right-top, line stroke width 3px color #2563EB, points with 6px radius circles, animated stroke-dashoffset draw-on 0→100% 1.2s, area fill underneath gradient #2563EB 15%→0%, alpha background, axis lines hidden (just curve + dots), Apple Health aesthetic"
```

---

## SECTION 5: REELS / 9:16 SPECIFIC PROMPTS (1080×1920, Portrait)

### PROMPT 5A — Reels Scene 1 Hook Background
```
"Portrait 9:16 vertical frame, dark cinematic #0A0C12 background, strong vignette edges, chaotic glitch overlay effect only on TOP 30% (RGB split 2px horizontal) for 0.6s loop, center area empty for text, very subtle radial gradient red #EF4444 10% opacity top, 2% grain, TikTok/Reels aesthetic"
```

### PROMPT 5B — Reels Language Flip Strips (EN/HI/GU/MR Label Badges)
```
"4 separate portrait-oriented badge PNG assets alpha transparent: English with UK+IN flag, Hindi हिन्दी with Devanagari, Gujarati ગુજરાતી, Marathi मराठी — each inside rounded pill 16px radius, white text on #0F172A navy BG, left-side small Indian flag 24×16px, Inter 600 28px font size, soft shadow, ready for flip animation 9:16 canvas"
```

### PROMPT 5C — Reels CTA QR Placeholder Area
```
"Portrait 9:16 bottom 25% area CTA background plate, dark #0F172A, rounded top-corners 32px, left 50% empty QR placeholder square outline 1px dashed #2563EB, right 50% text area, subtle blue glow from top edge, alpha channel for compositing over full video, 8K resized to 1080×1920"
```

---

## PROMPT USAGE GUIDELINES

1. **Never regenerate actual UI screenshots** — those must come directly from the app (`apps/web/scratch/screenshots/`, `apps/web/scratch/output/`, `scratch/screenshots/`, `screenshots/`, root level PNGs)
2. All generated assets are **background / decorative / mockup templates only**
3. For RunwayML / PikaLabs video: add ` --motion 1.2 --seed 42 --cfg 6.5 --aspect 16:9` (or `9:16`) suffix
4. For Midjourney images: add ` --ar 16:9 --v 6.0 --style raw --no text,watermark --s 250` suffix
5. For Stable Diffusion (Automatic1111 / ComfyUI): Use Euler a sampler, 28 steps, CFG 7, hires fix 1.5× 0.4 denoise, RealVisXL 5.0 or Juggernaut XL v9 checkpoint
6. **Seed locking:** Set fixed seed `42117` for all background plates to ensure visual continuity across scenes
7. **Color accuracy:** Ensure #2563EB blue accent matches by locking color palette reference image (the screenshot [orders_list_desktop_light.png] as controlnet reference with weight 0.35 color-only)

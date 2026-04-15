# IND Manager — Design System & Style Guide

> Baserow-inspired, clean SaaS aesthetic — Dark sidebar + Light gray page + White cards + Inter font + Purple accent

## Quick Reference

| Token | Value | Usage |
|-------|-------|-------|
| Sidebar BG | `#1A1A2E` | Navigation panel |
| Page BG | `#F7F7FA` | Behind all content |
| Card / Surface | `#FFFFFF` | Cards, panels, modals |
| Primary Accent | `#4A3AFF` | Buttons, links, active states |
| Primary Hover | `#3D2FD9` | Hover on primary elements |
| Heading Text | `#1A1A2E` | Titles, important labels |
| Body Text | `#3A3A50` | Regular body text |
| Secondary Text | `#6B6B80` | Subtitles, descriptions |
| Muted Text | `#9090A8` | Timestamps, placeholders |
| Card Border | `#EDEDF2` | Almost invisible borders |
| Input Border | `#E0E0EA` | Form field borders |

## Font

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

## Spacing (4px base grid)

| Token | Value |
|-------|-------|
| xs | 4px |
| sm | 8px |
| md | 12px |
| base | 16px |
| lg | 20px |
| xl | 24px |
| 2xl | 32px |

## Border Radius

| Size | Value | Use On |
|------|-------|--------|
| sm | 6px | Tags, badges |
| md | 8px | Inputs, buttons |
| lg | 12px | Cards, panels |
| xl | 16px | Hero sections |
| full | 9999px | Avatars |

## Shadows

| Level | Value |
|-------|-------|
| Rest | `0 1px 3px rgba(0,0,0,0.04)` |
| Hover | `0 4px 12px rgba(0,0,0,0.08)` |
| Elevated | `0 8px 24px rgba(0,0,0,0.12)` |

## Accent Colors (tags, indicators)

| Color | Hex |
|-------|-----|
| Teal | `#2DD4BF` |
| Purple | `#8B5CF6` |
| Blue | `#3B82F6` |
| Orange | `#F97316` |
| Pink | `#EC4899` |
| Green | `#22C55E` |
| Red | `#EF4444` |

## CSS Custom Properties

All tokens are available as CSS custom properties in `globals.css` with the `--` prefix. Use them directly:

```css
background: var(--bg-card);
color: var(--text-heading);
border: 1px solid var(--border-card);
box-shadow: var(--shadow-sm);
```

## Key Principles

1. **Extremely subtle shadows** — barely noticeable, rely on white-on-gray contrast
2. **Rounded everywhere** — 12px cards, 8px inputs, full-circle avatars
3. **Generous whitespace** — when in doubt, add more padding
4. **Muted text hierarchy** — only headings are dark, everything else gray
5. **Accent used sparingly** — only for CTAs, active states, links
6. **Outlined icons** — stroke-based, 1.5–2px, 20px default
7. **Consistent 4px spacing grid**

# Design System

Source of truth: the approved mockups (`docs/design/ChildShield-AI-Screens.dc.html`) and the brand logo. Implemented as tokens in `apps/mobile/src/theme/tokens.ts`.

## Colors

| Token | Hex | Use |
|---|---|---|
| Teal | `#009C9C` | Primary, links, live indicators |
| Ink | `#054240` | Headings, text on light — never pure black |
| Light teal | `#3CC0C0` | Highlights, pixel dots |
| Amber | `#FC9C24` | Primary CTAs, joy/action, selection |
| Warm bg | `#FBF6EE` | Child app background |
| Officer bg | `#F4F0E6` | Officer app background |
| Dark surface / card / accent | `#0E2B29` / `#163B38` / `#4FD1CB` | Dark theme (deep-teal anchored, never gray/black) |
| Muted / faint text | `#6B8B89` / `#9AA5A0` | Secondary copy |
| Teal tint / amber tint | `#EAF3F2` / `#FFF6E8` | Tinted surfaces, selected rows |

**Severity (officer views ONLY — never child-facing):** CRITICAL `#C23B3B` (bg `#FFE3E3`) · HIGH `#D9731C` (bg `#FCE7D3`, badge `#E8823C`) · MEDIUM `#A6801D` (bg `#F5EBC8`) · LOW `#5B8C86` (bg `#DEEAE9`).

## Typography

- **Baloo 2** 700/800 — headings, case codes, buttons (`@expo-google-fonts/baloo-2`)
- **Manrope** 400–800 — body, labels (`@expo-google-fonts/manrope`)
- Microcopy targets a 10-year-old reading level in child flows.

## Geometry

Generous radii everywhere — nothing is a hard rectangle: hero cards 26, cards 19–22, buttons 17 or full pill, icon tiles 12–16, inputs 15. Hairlines are `rgba(5,66,64,0.08–0.14)`.

## Asset inventory (`apps/mobile/assets/`, registry in `src/assets.ts`)

All transparent PNGs from the design handoff, optimized 15.6 MB → 1.4 MB (metadata stripped, resized to @3x render sizes). **Use as-is; never regenerate or recolor.**

- `logo.png`, `icon.png` (1024, iOS, flat warm bg), `adaptive-icon.png` (Android foreground), `empty-nest.png`
- `mascot-{welcome,listen,sad,celebrate,phone}.png` — mascots appear in **child flows only**; the officer area keeps palette + geometry, no mascot
- `icons/{grooming,sextortion,bullying,selfharm,coercion,exposure,other}.png` — report categories
- `icons/spot-{phone,plane,search,lifering,lock,bell}.png` — child spot icons
- `icons/nav-{home,status,help,shield,settings,exit}.png` — tabs + quick exit (inactive = 45 % opacity)
- `icons/st-{received,review,talking,sent,care,growth}.png` — status timeline steps
- `icons/of-{inbox,checklist,chart,scroll,chain,warning}.png`, `icons/officer-{queue,override,sla,timeline}.png` — officer app
- `icons/p-{child,friends,caregiver,doctor,officer,stophand}.png` — persona pickers + consent bullets
- `icons/tm-{moon,sun,sunmoon,bell,sliders,globe}.png` — settings/theme
- `icons/shape-{blob,blob2,brushcircle,confetti}.png`, `icons/texture-{dots,waves}.png` — background decoration at 0.15–0.25 opacity
- `shapes/{brush-teal,brush-amber,blob-lightteal,blob-amber,arch-teal,squiggle-teal}.png` — brush underlines (amber under "Hujambo", teal squiggle under "Msaada"/"Mipangilio")

Glyph-sized icons (carets, arrows, timer, eye…) come from the bundled Ionicons set (`src/components/icons.tsx`) mapped to the mockups' Phosphor glyphs.

## The pixel-dot motif

Rounded teal/amber squares in varying sizes (`PixelDots`) — the signature accent: under greetings, as success-screen floaters, as bullet markers. They alternate teal/amber; keep that rhythm.

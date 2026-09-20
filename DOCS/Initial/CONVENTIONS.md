# NAMING, CODING & FILE CONVENTIONS — INITIAL PHASE

## Project Name: Visual Motion & Frontend Design Studio
**Internal Codename:** "Unreal Engine for Animation & Frontend Design"
**Document Version:** 1.1.0
**Phase:** Initial Phase (Element Animation Studio)
**Status:** Production-Ready Specification
**File Location:** `DOCS/Initial/CONVENTIONS.md`

---

## 1. Purpose

This document defines the strict naming, coding, file, and organizational conventions for the Initial Phase engine and its exported code. Following these conventions ensures:
- A consistent engine codebase across all contributors (and across AI coding sessions building it).
- Predictable file locations for both humans and AI implementing `ROADMAP.md` sub-phases.
- Clean serialization/deserialization of `.motionproj` project data (`SCHEMA_REFERENCE.md`).
- Exported components that are indistinguishable, in style, from code a senior frontend engineer would hand-write.

All conventions below apply to **every element archetype** defined in `PRD.md` §5 (Interactive, Media, Structural, Text families) — no archetype is exempt from ID conventions, property-path conventions, or export hygiene rules.

---

## 2. File & Directory Naming Conventions

| Entity | Convention | Example |
| :--- | :--- | :--- |
| **React Component Files** | `PascalCase.tsx` | `CanvasViewport.tsx`, `MotionSequencer.tsx`, `ImageMediaSection.tsx` |
| **Hook Files** | `camelCase.ts` prefixed with `use` | `useProjectStore.ts`, `useTimelineStore.ts` |
| **Utility & Math Files** | `camelCase.ts` or `PascalCase.ts` | `CurveMath.ts`, `easingHelpers.ts` |
| **Stylesheet Files** | `kebab-case.css` | `tokens.css`, `outliner.css`, `sequencer.css` |
| **Directories** | `kebab-case` or lowercase | `src/editor/panels/sequencer/`, `src/core/motion/` |
| **JSON Schemas / Files** | `kebab-case.json` or `.ext.json` | `project.json`, `hover.timeline.json` |
| **C++ Header & Source** | `PascalCase.h` / `PascalCase.cpp` | `SplineSolver.h`, `SplineSolver.cpp` |
| **Test Files** | `*.test.ts` / `*.test.tsx` | `CurveMath.test.ts`, `ImageMediaSection.test.tsx` |

### 2.1 TypeScript / React Conventions
- Every exported component **must** export its own typed props interface, named `<ComponentName>Props` (e.g. `export interface ImageMediaSectionProps`).
- Components that render an archetype-specific inspector section live under `src/editor/panels/details/` and are named `<Archetype>Section.tsx` (e.g. `MediaSection.tsx` for Image, `DividerSection.tsx`, `BackgroundSection.tsx`) — see `FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md` §2.
- No default exports for components that are imported by more than one file; default exports are reserved for Next.js `page.tsx` route files only.
- Every new archetype added to the engine (per `PRD.md` §5) must ship with at least one `.test.ts` covering its property validator in `src/core/elements/`.

---

## 3. ID Generation Conventions

All entities inside the visual AST utilize standardized deterministic prefix-plus-hex identifiers. The `elem_` family below is organized by the four element families defined in `PRD.md` §5, so the prefix alone tells you which Details Inspector sections and which schema fragment apply.

| Entity Type | Prefix | Format | Example | Family |
| :--- | :--- | :--- | :--- | :--- |
| **Project** | `proj_` | `proj_<8hex>` | `proj_98a7df8a` | — |
| **Button** | `elem_btn_` | `elem_btn_<8hex>` | `elem_btn_3f8a109c` | A: Interactive |
| **Toggle Switch** | `elem_toggle_` | `elem_toggle_<8hex>` | `elem_toggle_7c21af09` | A: Interactive |
| **Badge / Chip** | `elem_badge_` | `elem_badge_<8hex>` | `elem_badge_50fbe912` | A: Interactive |
| **Floating Action Button** | `elem_fab_` | `elem_fab_<8hex>` | `elem_fab_ab120cd4` | A: Interactive |
| **Image** | `elem_img_` | `elem_img_<8hex>` | `elem_img_a71b290d` | B: Media |
| **Icon (SVG)** | `elem_icon_` | `elem_icon_<8hex>` | `elem_icon_8f0912ba` | B: Media |
| **Divider** | `elem_divider_` | `elem_divider_<8hex>` | `elem_divider_c40a19f2` | C: Structural |
| **Background Layer** | `elem_bg_` | `elem_bg_<8hex>` | `elem_bg_91af02cd` | C: Structural |
| **Container** | `elem_container_` | `elem_container_<8hex>` | `elem_container_0021ffab` | C: Structural |
| **Text / Label** | `elem_text_` | `elem_text_<8hex>` | `elem_text_5af09c11` | D: Text |
| **Animation Timeline** | `tl_` | `tl_<trigger>_<8hex>` | `tl_hover_9a87cd10`, `tl_scroll_48bf9012` | — |
| **Motion Track** | `trk_` | `trk_<prop>_<8hex>` | `trk_scale_1209af8b`, `trk_bgAngle_6541bc3a` | — |
| **Keyframe Marker** | `kf_` | `kf_<timeMs>_<8hex>` | `kf_400_34ab7891` | — |
| **Easing Curve** | `crv_` | `crv_<name>_<8hex>` | `crv_bounce_8910fedc` | — |
| **ScrollTrigger** | `st_` | `st_<8hex>` | `st_78a65f12` | — |

**Rule:** the archetype prefix is fixed at element-creation time and never changes. If a user swaps an element's archetype (e.g. Container ➔ Image), the engine must regenerate the ID with the new prefix rather than mutate the old one in place, so IDs remain a reliable, greppable signal of archetype across the whole project.

---

## 4. Standard Animation Property Paths

To guarantee compatibility across the AST, Sequencer, and Code Emitters, all animatable properties follow strict dot-notation paths. Paths are grouped by which element family(ies) can legally target them — this grouping is enforced at runtime by the Engine Animation Evaluator (`PANELS.md` §1.1).

### 4.1 Universal Paths (all families)
```text
transform.x                     # Offset X (px, rem, %)
transform.y                     # Offset Y (px, rem, %)
transform.z                     # 3D Depth translation (px)
transform.scale                 # Uniform scale (1.0 = 100%)
transform.scaleX                # Horizontal scale
transform.scaleY                # Vertical scale
transform.rotate                # 2D rotation (deg)
transform.rotateX               # 3D tilt X (deg)
transform.rotateY               # 3D tilt Y (deg)
appearance.opacity              # Alpha transparency (0.0 – 1.0)
appearance.border.color         # Border stroke color
appearance.border.width         # Border thickness (px)
appearance.radius               # Corner radius (px)
filter.blur                     # Gaussian blur (px)
```

### 4.2 Interactive & Text Family Paths (Families A, D)
```text
appearance.background.color     # Hex or rgba color string
typography.color                # Text color
typography.fontSize             # Text size (px/rem)
typography.letterSpacing        # Character tracking (px/em)
```

### 4.3 Media Family Paths (Family B — Image, Icon)
```text
media.src                       # Image asset reference (Image only)
media.objectFit                 # 'cover' | 'contain' | 'fill' | 'none' (Image only)
media.focalPoint.x              # Crop/zoom anchor X (0–100%) (Image only)
media.focalPoint.y              # Crop/zoom anchor Y (0–100%) (Image only)
media.filter.grayscale          # 0.0 – 1.0 (Image only)
media.filter.brightness         # 0.0 – 2.0 (Image only)
media.filter.contrast           # 0.0 – 2.0 (Image only)
media.filter.saturate           # 0.0 – 2.0 (Image only)
media.clipPath                  # Animatable CSS clip-path string (Image only)
media.overlay.color             # Tint overlay color (Image only)
media.overlay.opacity           # Tint overlay alpha (Image only)
svg.path                        # SVG "d" attribute path string (Icon only)
svg.strokeDashoffset            # Line drawing offset (Icon and Divider — see 4.4)
```

### 4.4 Structural Family Paths (Family C — Divider, Background, Container)
```text
divider.length                  # 0–100%, animatable draw-in (Divider only)
divider.thickness               # px (Divider only)
divider.strokeDashoffset        # Shares the SVG draw mechanism in 4.3 (Divider only)
divider.gradient.angle          # deg, for gradient-style dividers (Divider only)
background.color                # Solid background color (Background only)
background.gradient.angle       # deg, animatable gradient rotation (Background only)
background.gradient.stopOffset  # Per-stop offset, animatable for color travel (Background only)
background.parallax.speed       # Scroll-linked translateY multiplier (Background only)
background.blendMode            # CSS mix-blend-mode value (Background only)
background.noise.opacity        # 0.0 – 1.0 grain intensity (Background only)
```

**Compatibility rule:** the Engine Animation Evaluator rejects any track whose `property` path is not listed for the target element's family, and dispatches an `[ANIM_COMPAT]` diagnostic (`PANELS.md` §1.1) rather than silently ignoring it or crashing.

---

## 5. UI Architecture & Styling Isolation Rules

1. **The "One Element = One Styling Source" Principle:**
   Every UI element in the studio shell is styled by exactly ONE dedicated stylesheet. No conflicting global classes, no inline styles.
2. **Dynamic Values via CSS Variables:**
   Dynamic coordinates (pan offsets, timeline zoom levels, splitter widths) are passed via CSS custom properties on parent containers (e.g. `style={{ '--timeline-zoom': zoom } as React.CSSProperties}`).
3. **Mandatory File Header Comment:**
   Every UI component must begin with the standard documentation block:

```typescript
/**
 * ============================================================================
 * [COMPONENT NAME]
 * ============================================================================
 * UI Element: [Specific Element, e.g. Details Inspector — Background Section]
 * Screen / Scope: [Screen Name, e.g. Screen 03: Properties & Details Inspector]
 * Role: [What this component does and renders]
 * Styling Source: [Path to the ONLY stylesheet controlling this component]
 * ============================================================================
 */
```

---

## 6. Professional Code Export Conventions

The Code Emitter must output clean, human-readable code adhering to these rules:

1. **Zero Proprietary Imports:**
   Exported components must NEVER import from `@/core`, `@/editor`, or any internal engine module. They must ONLY import from standard public packages:
   ```typescript
   // ALLOWED:
   import React, { useRef } from "react";
   import gsap from "gsap";
   import { useGSAP } from "@gsap/react";
   import { motion } from "framer-motion";
   import Image from "next/image";
   import { ArrowRight } from "lucide-react";
   ```
2. **Explicit Props & TypeScript Interfaces:**
   Every exported component must export its own typed interface (e.g. `export interface AnimatedHeroImageProps`, `export interface SectionDividerProps`).
3. **Prettier Compliance:**
   All emitted code must pass standard Prettier formatting (2-space indent, semicolons, double quotes) without syntax warnings.
4. **Archetype-Correct Semantics:**
   The emitter must never emit a `<div>` where a semantic tag exists and is supported by the archetype (`<img>`/`next/image` for Image, `<hr>` or `<svg><line/></svg>` for Divider — see `PRD.md` §7.4). Background Layer is the one archetype that is legitimately always a non-semantic `<div>`, since it has no native HTML equivalent.
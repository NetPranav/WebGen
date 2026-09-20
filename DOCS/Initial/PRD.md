# PRODUCT REQUIREMENTS DOCUMENT (PRD) — INITIAL PHASE

## Project Name: Visual Motion & Frontend Design Studio
**Internal Codename:** "Unreal Engine for Animation & Frontend Design"
**Document Version:** 1.1.0
**Phase:** Initial Phase (Element Animation Studio)
**Status:** Approved for Architecture & Specification
**Target Platform:** Web Desktop (Chrome, Edge, Safari, Firefox)
**Primary Tech Baseline:** Next.js 15 / React 19 / TypeScript + C++ WebAssembly (Physics & Splines) + GSAP & Framer Motion
**File Location:** `DOCS/Initial/PRD.md`
**Supersedes:** v1.0.0 — scope narrowed from "3 Design Scopes" to **Element Design only**; see §3 and CHANGELOG.md.

---

## 1. Executive Summary & Core Philosophy

### 1.1 The Vision
The **Visual Motion & Frontend Design Studio** is a professional visual development tool that allows engineers, animators, and frontend designers to visually construct, choreograph, inspect, and export production-grade, **atomic, animated UI elements**.

It is **NOT** a template website builder, a page builder, or a vector drawing tool. For the Initial Phase, it is a **single-purpose Element Animation Engine**: one element on stage, fully animated, fully inspectable, exported as clean code.

### 1.2 Core Thesis
> *"If Unreal Engine's Sequencer and Blueprints allow a creator to choreograph cinematics, actors, and physical interactions with sub-millisecond precision, this studio allows a frontend engineer to visually orchestrate a single UI element's motion — its image, its dividing lines, its background — with GSAP timelines, Framer Motion springs, and SVG path morphs, and export pristine, human-readable, zero-dependency code that drops effortlessly into any existing React, Next.js, Vue, or Vanilla codebase."*

### 1.3 Initial Phase Scope Decision (Why Element-Only)
The full product vision includes three design scopes — **Element**, **Component**, and **Page/Section** (see `ROADMAP.md` §1 for the full multi-phase plan). The Initial Phase deliberately builds **only Scope 1: Element Design**, and builds it **completely**, before any Component or Page work begins.

"Completely" means every element archetype the studio ships with in this phase must have:
1. A full property schema (Transform, Layout, Appearance, and archetype-specific properties).
2. Full animation authoring across all four engines (GSAP, Framer Motion, SVG, native CSS) — see §4.
3. A working Sequencer + Curve Editor experience.
4. A working Play/Interaction Sandbox preview.
5. Clean, zero-dependency code export that builds and animates identically outside the studio.

Component Design and Page/Section Design are **explicitly out of scope** for the Initial Phase. They are not partially built, not stubbed with placeholder UI, and not selectable in the Home Screen (see §6). Building them is Phase 9+ work per `ROADMAP.md` and is out of scope for this document.

### 1.4 Target Audience & Problem Statement
Modern frontend animation is fragmented:
- Designers produce static Figma frames or After Effects motion videos that developers must spend days manually re-implementing with code.
- Traditional code libraries (GSAP, Framer Motion) offer immense power but lack real-time visual scrubbing, multi-track curve editing, and live element feedback.
- Existing visual builders lock code into monolithic proprietary runtimes or unmaintainable, bloated code blobs with zero flexibility.
- Even "simple" elements — a hero image, a section divider, an animated background — are routinely hand-coded from scratch on every project because no visual tool treats them as first-class animatable citizens.

The **Visual Motion & Frontend Design Studio** bridges this gap for single elements:
1. **Visual Timeline & Bezier Precision:** Multi-track keyframing with cubic bezier easing handles and state triggers (hover, tap, scroll-into-view, mount).
2. **Deterministic Frontend AST:** Visual adjustments map directly to an Abstract Syntax Tree (AST) representing one element's DOM structure, CSS layout tokens, and motion tracks.
3. **Production-Grade Code Export:** Emits modular, beautifully formatted, zero-bloat code (React + Tailwind, Framer Motion, GSAP, or Vanilla CSS) ready for immediate `git commit` and copy-paste into production repositories.
4. **Element-First Home Experience:** Instant entry into a single, focused element canvas paired with instant target technology selection — no scope-selection friction.

---

## 2. Unreal Engine to Motion Studio Mapping

| Unreal Engine Concept | Motion & Frontend Studio Equivalent | Function in Studio |
| :--- | :--- | :--- |
| **Project Hub / Launcher** | **Interactive Project Hub** | Name the element project and choose target technology (Next.js, React, Tailwind, GSAP, Framer Motion). |
| **Level Viewport** | **Element Stage Viewport** | Isolated, centered canvas with live hover/click/scroll-into-view previews of the single element being designed. |
| **Sequencer / Timeline** | **Motion Sequencer & Curve Editor** | Multi-track keyframe timeline, cubic bezier curves, and stagger managers scoped to one element's node tree. |
| **World Outliner (Simplified)** | **Element & Animation Outliner** | Streamlined hierarchy: Root Element ➔ Child Nodes (Image, Divider, Background Layer, Icon, Text) ➔ Attached Animation Stacks. |
| **Details Panel** | **Properties & Details Inspector** | Visual controls for Transforms, Layout, Appearance, Typography, Media (Image), Divider, Background, and Motion Bindings. |
| **Content Browser** | **Content & Motion Browser** | Reusable asset library for Animation Presets (Hover/Entrance/Scroll), Easing Curves, SVG Vectors, and raster Images. |
| **Play in Editor (PIE)** | **Play & Sandbox Mode** | Live simulation mode testing hover micro-interactions, scroll scrubbing, click triggers, and spring physics on the element. |
| **C++ Physics Kernel** | **Wasm Curve Physics** | 120 FPS Bezier curve solving and spline interpolation for the Curve Editor. |
| **Source Code Generator** | **Clean Code Emitter & Inspector** | Live split-screen syntax-highlighted code generator outputting React/Next.js/Tailwind/GSAP/Framer code for the single element. |

---

## 3. Design Scope: Element Design (The Only Scope in This Phase)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                  ELEMENT DESIGN — THE ONLY SCOPE IN THE INITIAL PHASE             │
│  Focused on atomic, self-contained animated UI elements. One element per project. │
├───────────────────────────┬───────────────────────────┬───────────────────────────┤
│ INTERACTIVE ELEMENTS      │ MEDIA ELEMENTS            │ STRUCTURAL ELEMENTS       │
│ • Magnetic Button         │ • Animated Image          │ • Animated Divider        │
│ • Animated Toggle Switch  │ • SVG Path Morph Icon     │ • Animated Background     │
│ • Animated Badge / Chip   │                           │   Layer                   │
│ • Floating Action Button  │                           │ • Text Label              │
└───────────────────────────┴───────────────────────────┴───────────────────────────┘
```

* **Focus:** Micro-interactions, spring physics, hover/tap/focus states, scroll-into-view entrances, SVG icon animation, image motion (reveal, parallax, ken burns, hover zoom), divider draw-in/sweep animation, and background motion (gradient shift, parallax, noise/pattern drift).
* **Canvas Environment:** Isolated centered stage with scale-to-fit zoom, contrast background toggles (Dark, Light, Transparent checkerboard), and state triggers (Default, Hover, Active, Focus, In-View).
* **Export Output:** A single, lightweight self-contained component file (e.g. `AnimatedHeroImage.tsx`, `SectionDivider.tsx`, `GradientBackdrop.tsx` + optional CSS module or Tailwind classes).
* **Definition of "Complete" for this Scope:** All four element families above (Interactive, Media, Structural, Text) are fully specified, fully animatable across all four animation engines where applicable, fully inspectable, and fully exportable — see §5.

**Deferred (explicitly not built in this phase):** Scope 2 (Component Design — navbars, pricing cards, carousels, modals) and Scope 3 (Page/Section Design — hero sections, feature grids, scroll narratives). Both are documented at the roadmap level only; see `ROADMAP.md` §1 for when they begin.

---

## 4. Multi-Engine Animation Pipeline

The studio provides first-class visual authoring for all leading web animation standards, applied to every element archetype in §5:

```
                               ┌────────────────────────────────┐
                               │     VISUAL MOTION STUDIO       │
                               │  - Sequencer Tracks            │
                               │  - Cubic Bezier Handles        │
                               │  - ScrollTrigger Scrubbers     │
                               └───────────────┬────────────────┘
                                               │
               ┌───────────────────────────────┼──────────────────────────────┐
               ▼                               ▼                              ▼
     ┌──────────────────┐            ┌──────────────────┐           ┌──────────────────┐
     │   GSAP ENGINE    │            │  FRAMER MOTION   │           │   SVG & CSS      │
     │ • TimelineMax    │            │ • Spring Physics │           │ • Path Morphing  │
     │ • ScrollTrigger  │            │ • AnimatePresence│           │ • Stroke Dashoff │
     │ • SplitText      │            │ • LayoutId Morphs│           │ • CSS Keyframes  │
     │ • Flip Plugin    │            │ • Gestures (Drag)│           │ • SVG Filters    │
     └─────────┬────────┘            └─────────┬────────┘           └─────────┬────────┘
               │                               │                              │
               └───────────────────────────────┼──────────────────────────────┘
                                               │
                                               ▼
                              ┌──────────────────────────────────┐
                              │    CLEAN CODE EMITTER ENGINE     │
                              │ • Next.js 15 / React 19 TSX      │
                              │ • Tailwind CSS / CSS Modules     │
                              │ • Fully typed props & interfaces │
                              │ • Zero lock-in, direct git copy  │
                              └──────────────────────────────────┘
```

### 4.1 GSAP (GreenSock) Integration
- Visual timeline with multi-channel keyframing (`x`, `y`, `scale`, `rotation`, `opacity`, `transformOrigin`, `filter`, and archetype-specific channels like `media.clipPath` or `background.gradientAngle`).
- Visual ScrollTrigger boundaries: Start trigger, End trigger, scrub duration, pin element, markers toggle — used for scroll-linked image reveals, background parallax, and divider draw-ins.
- Stagger controls: Direction (`start`, `end`, `center`, `random`), ease, and grid distribution — used when a Divider or Background has multiple sub-layers.

### 4.2 Framer Motion Integration
- Declarative motion props: `initial`, `animate`, `exit`, `whileHover`, `whileTap`, `whileInView`.
- Physical spring parameter sliders: `stiffness`, `damping`, `mass`, `restDelta`, `restSpeed`.
- Shared layout morphing: Visual `layoutId` linker for crossfading between two Image states (e.g. ken-burns loop).

### 4.3 SVG Vector & Path Animation
- Visual SVG path morphing (`d` attribute tweening with point-count alignment) — Icon archetype.
- Stroke dashoffset animation for drawing lines, logos, and vector illustrations — Icon and **Divider** archetypes both use this mechanism (a Divider is modeled internally as a straight or gradient SVG line so it can reuse the exact same draw-in math).
- Interactive SVG filter controls: Gaussian blur, color matrix, turbulence, and displacement maps — used by both Icon and Background (noise texture) archetypes.

### 4.4 CSS Native Animations & Springs
- Pure CSS keyframe generator for zero-bundle-overhead animations (background gradient position shifts, divider dash-offset loops, image filter transitions).
- Custom easing curve exporter using `cubic-bezier(x1, y1, x2, y2)`.

---

## 5. The Four Element Families (Full Specification)

Every element archetype below is a **first-class citizen**: it gets its own Details Inspector section (`PANELS.md` §3, Panel 03), its own JSON schema fragment (`SCHEMA_REFERENCE.md`), its own ID prefix (`CONVENTIONS.md` §2), and its own code emitter path (`FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md` §2).

### 5.1 Family A — Interactive Elements
| Archetype | ID Prefix | Examples |
| :--- | :--- | :--- |
| Button | `elem_btn_` | Magnetic Button, Primary CTA, Icon Button |
| Toggle Switch | `elem_toggle_` | Animated Toggle Switch |
| Badge / Chip | `elem_badge_` | Animated Badge, Notification Chip |
| Floating Action Button | `elem_fab_` | Floating Action Button |

**Animatable surface:** Transform, Appearance (background, border, radius, shadow), Typography (for label), Motion Triggers (`onHover`, `onClick`, `onFocus`).

### 5.2 Family B — Media Elements
| Archetype | ID Prefix | Examples |
| :--- | :--- | :--- |
| Image | `elem_img_` | Animated Hero Image, Ken-Burns Gallery Tile, Reveal Image |
| Icon (SVG) | `elem_icon_` | SVG Path Morph Icon, Animated Logo Mark |

**Image — full property surface:**
- `media.src` — image asset reference (URL or local import path).
- `media.objectFit` — `"cover" | "contain" | "fill" | "none"`.
- `media.focalPoint` — `{ x: 0–100%, y: 0–100% }`, drives crop/zoom anchor.
- `media.filter` — `{ grayscale, blur, brightness, contrast, saturate }`, each animatable independently.
- `media.clipPath` — animatable reveal mask (e.g. wipe-in from a polygon or inset clip path).
- `media.overlay` — `{ color, opacity, blendMode }`, an animatable tint layer above the image (for hover darken/lighten).
- `transform.scale` — drives Ken Burns slow-zoom and hover-zoom behaviors.
- `appearance.radius`, `appearance.border`, `appearance.shadows` — same as any element.

**Animation presets shipped for Image:** `Ken Burns Loop`, `Fade + Scale Reveal`, `Clip-Path Wipe In`, `Hover Zoom + Darken`, `Grayscale-to-Color on Hover`, `Scroll Parallax Depth`.

### 5.3 Family C — Structural Elements
| Archetype | ID Prefix | Examples |
| :--- | :--- | :--- |
| Divider | `elem_divider_` | Animated Section Divider, Gradient Rule |
| Background Layer | `elem_bg_` | Animated Gradient Backdrop, Parallax Background, Noise Texture Layer |
| Container | `elem_container_` | Wrapping layout frame for the above (used only to compose multi-node elements such as an image with a divider beneath it) |

**Divider — full property surface:**
- `divider.orientation` — `"horizontal" | "vertical"`.
- `divider.length` — `px | %`, animatable `0 → 100%` for a draw-in effect.
- `divider.thickness` — `px`.
- `divider.style` — `"solid" | "dashed" | "dotted" | "gradient"`.
- `divider.color` — hex/rgba, or `divider.gradient` — `{ stops: [{ offset, color }], angle }` when `style === "gradient"`.
- `divider.strokeDashoffset` — reuses the SVG stroke-draw mechanism from §4.3 for line "drawing" animations.
- `divider.capStyle` — `"butt" | "round" | "square"`.

**Animation presets shipped for Divider:** `Draw-In Left-to-Right`, `Draw-In Center-Out`, `Gradient Sweep Loop`, `Dash Offset Marquee`, `Scroll-Triggered Reveal`.

**Background Layer — full property surface:**
- `background.type` — `"solid" | "linear-gradient" | "radial-gradient" | "image" | "noise" | "pattern"`.
- `background.color` — used when `type === "solid"`.
- `background.gradient` — `{ stops: [{ offset, color }], angle }`, animatable stop offsets and angle for a shifting gradient.
- `background.image` — `{ src, position, size, repeat }` when `type === "image"`.
- `background.parallax` — `{ speed: number }`, a scroll-linked translateY multiplier (0 = static, 1 = scrolls at page speed, negative = reverse-parallax).
- `background.blendMode` — CSS `mix-blend-mode` value, animatable for crossfade-style transitions between two backgrounds.
- `background.noise` — `{ opacity, scale }`, an animatable SVG-filter-driven grain texture used for "film grain" ambient backdrops.

**Animation presets shipped for Background:** `Gradient Angle Drift`, `Parallax Scroll Depth`, `Noise Texture Pulse`, `Blend-Mode Crossfade`, `Color Morph Loop`.

### 5.4 Family D — Text Elements
| Archetype | ID Prefix | Examples |
| :--- | :--- | :--- |
| Text / Label | `elem_text_` | Button label, standalone animated heading fragment |

**Animatable surface:** Typography (font, weight, size, line height, letter spacing, color), `appearance.opacity`, `transform` (for entrance animation), GSAP SplitText-driven character/word stagger reveals.

---

## 6. Home Screen / Project Hub Workflow

When launching the application, the user arrives at the **Interactive Project Hub** (`Screen 00`):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ⚡ VISUAL MOTION & FRONTEND DESIGN STUDIO                         [Docs]  [GitHub]     │
├───────────────────────────────────────────────────┬────────────────────────────────────┤
│ STEP 1: NAME YOUR ELEMENT PROJECT                 │ STEP 2: CHOOSE YOUR TECH STACK     │
│                                                   │                                    │
│ ┌───────────────────────────────────────────────┐ │ ▾ Target Framework                │
│ │ [ Project Name: "AnimatedHeroImage"          ] │ │ [ Next.js 15 (App Router)        ] │
│ └───────────────────────────────────────────────┘ │                                    │
│                                                   │ ▾ Styling System                   │
│ ┌───────────────────────────────────────────────┐ │ [ Tailwind CSS                   ] │
│ │ [✨ ELEMENT DESIGN]              (Active)     │ │                                    │
│ │ Interactive, Media, Structural & Text          │ │ ▾ Animation Engine                 │
│ │ elements. Buttons, images, dividers,           │ │ [ GSAP 3.12 (GreenSock)          ] │
│ │ backgrounds, icons, badges & toggles.          │ │                                    │
│ └───────────────────────────────────────────────┘ │ ▾ Language                         │
│                                                   │ (•) TypeScript    ( ) JavaScript   │
│ ┌───────────────────────────────────────────────┐ │                                    │
│ │ [🧩 COMPONENT DESIGN]      (Coming in Phase 9) │ │ ┌────────────────────────────────┐ │
│ │ Disabled — see ROADMAP.md                      │ │ │ 🚀 LAUNCH DESIGN STUDIO        │ │
│ └───────────────────────────────────────────────┘ │ └────────────────────────────────┘ │
│                                                   │                                    │
│ ┌───────────────────────────────────────────────┐ │                                    │
│ │ [📄 PAGE / SECTION DESIGN] (Coming in Phase 9) │ │                                    │
│ │ Disabled — see ROADMAP.md                      │ │                                    │
│ └───────────────────────────────────────────────┘ │                                    │
└───────────────────────────────────────────────────┴────────────────────────────────────┘
```

**Behavioral requirements (not just visual):**
1. `Element Design` is the only selectable/enabled scope card. It is pre-selected by default; the user does not need to click it to proceed.
2. `Component Design` and `Page / Section Design` cards render in a visibly disabled state (reduced opacity, `cursor: not-allowed`, no hover elevation) with a tooltip: *"Coming in a later phase — see ROADMAP.md"*. They are visible for roadmap transparency but are not clickable.
3. After naming the project and choosing the tech stack, the user picks a **starting archetype** from Family A–D (§5) before "Launch Design Studio" is enabled — this determines the root node's archetype and pre-populates the Details Inspector with the correct property sections (e.g. picking `Image` shows the Media section; picking `Background Layer` shows the Background section).
4. Selecting the scope and tech stack immediately tailors the workspace presets, AST compiler, code inspector, and asset recommendations for the chosen archetype.

---

## 7. Professional Code Exporter Requirements

The exporter must adhere to the **Zero-Lock-In Code Quality Standards**:

1. **Standard, Idiomatic Code:** Emits standard TypeScript/TSX code formatted according to Prettier and ESLint best practices.
2. **Zero Engine Runtime Overhead:** The exported code requires ONLY the selected public npm packages (e.g. `gsap`, `framer-motion`, `lucide-react`, `tailwindcss`) and has zero dependencies on this engine.
3. **Modular File Structure:**
   - Single-file export: Clean, self-contained component with inline styles or Tailwind classes.
   - Multi-file export: Clean folder structure with `ComponentName.tsx`, `useAnimationTimeline.ts`, and `styles.module.css`.
4. **Archetype-Aware Emission:** The emitter must pick the correct DOM tag and prop surface per family:
   - Interactive elements emit `<button>`/`<div role="switch">` semantics.
   - Image emits `<Image />` (Next.js) or `<img>` with `loading="lazy"` and explicit `width`/`height` to avoid layout shift, wrapped in an animatable container when `clipPath` or `overlay` is used.
   - Divider emits either a styled `<hr>`/`<div>` (for solid/dashed/dotted, CSS-driven) or an inline `<svg><line/></svg>` (for gradient/draw-in styles that require `strokeDashoffset`).
   - Background emits a CSS-in-JS or Tailwind-arbitrary-value background on the wrapping element, or a dedicated absolutely-positioned `<div class="background-layer">` when parallax/noise/blend-mode requires an independent stacking context.
5. **Copy or Download:** One-click "Copy Code" button with toast notification, or "Download ZIP" package containing the fully functional component, TypeScript types, and setup instructions.

---

## 8. Definition of Done (Initial Phase)

The Initial Phase is verified complete when, for **every** archetype listed in §5 (Button, Toggle, Badge, FAB, Image, Icon, Divider, Background Layer, Container, Text):

1. A user can open the Home Screen, name a project, confirm **Element Design** (the only enabled scope), pick the archetype and **Next.js + Tailwind + GSAP**, and land in the tailored studio with the correct Details Inspector sections visible.
2. The user can attach at least the archetype's default animation presets (§5) using the visual Sequencer and Bezier curve editor, and every property listed in that archetype's property surface is editable from the Details Inspector.
3. The user can scrub the timeline in real time and test live interactions (hover / tap / scroll-into-view as applicable) in the Play Mode sandbox.
4. The user can inspect the generated TypeScript code in the Live Code Inspector and copy it directly into an external Next.js repository, where it builds and animates identically without warnings or errors.
5. Component Design and Page/Section Design remain fully disabled and out of scope, with no partial UI, dead code paths, or placeholder screens shipped for them in this phase.
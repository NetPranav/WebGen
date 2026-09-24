# UI & WORKSPACE ARCHITECTURE SPECIFICATION — INITIAL PHASE

> **⚠️ Pending v2 update:** This document still describes Initial Phase v1.1. Where it conflicts with `PRD.md` v2.0.0 or `ROADMAP.md` v2.0.0, those documents win. It will be rewritten in ROADMAP v2 Phase 6.3 (schema content in Phase 2). See `AUDIT.md` for known gaps between this spec and the code.

## Project Name: Visual Motion & Frontend Design Studio
**Internal Codename:** "Unreal Engine for Animation & Frontend Design"
**AI Assistant Codename:** MotionAI
**Document Version:** 1.1.0
**Phase:** Initial Phase (Element Animation Studio)
**Status:** Approved for Design & Interface Engineering
**File Location:** `DOCS/Initial/UI.md`

---

## 1. Executive Design Philosophy: "Confluence Canvas + Refined Unreal Shell"

The user interface of the Visual Motion & Frontend Design Studio synthesizes two paradigms:
1. **The Luminous, Infinite Whiteboard of Atlassian Confluence:** Clean, open, distraction-free creative workspace with an infinite dot-grid canvas (`#FCFDFD`), crisp typography, and floating frosted-glass tool docks.
2. **The Ergonomic Power of Unreal Engine:** Professional IDE panels, dockable window management, contextual inspectors, multi-track animation timelines, and high-frequency curve editing.

Instead of the dark, dense, 1990s CAD-like aesthetic typical of 3D software, the studio uses a **modern, refined light aesthetic** featuring soft rounded curves (`border-radius: 16px`), generous padding, subtle elevation shadows, and clean typography.

The layout below shows an **Image** archetype project (`AnimatedHeroImage`) — the layout is identical for every archetype; only the Details Panel's contextual sections (right column) and the Outliner's node list (left column) change per `PANELS.md` §3.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ⚡ MotionStudio  •  Saved just now  [Element: AnimatedHeroImage]  [▶ Play Mode]  [Export Code]  [MotionAI]│
├──────────────────────────┬──────────────────────────────────────────────────────────────┬───────────────┤
│ ELEMENT & ANIMATION      │                      STAGE VIEWPORT                          │ DETAILS PANEL │
│ OUTLINER                 │                                                              │ (Right Panel) │
│ (Simplified Left Panel)  │  ┌────────────────────────────────────────────────────────┐  │               │
│                          │  │  STAGE CANVAS (Centered Frame)                         │  │ ▾ Transform   │
│ ▾ Hero Image (Root)      │  │                                                        │  │   X: 0px      │
│   └── 🎬 Animation Stack │  │       ┌────────────────────────┐                       │  │   Y: 0px      │
│       ├── ⚡ Mount Reveal│  │       │    [ mountain photo ]   │ ◄── (Selected)        │  │   Scale: 1.0  │
│       ├── ⚡ Hover Zoom  │  │       └────────────────────────┘                       │  │               │
│       └── ⚡ Scroll Para │  │                                                        │  │ ▾ Media       │
│                          │  └────────────────────────────────────────────────────────┘  │   Fit: Cover  │
│ ▾ CONTENT BROWSER        │                                                              │   Focal: 50,40│
│   📁 Animation Presets   │  [ Undo / Redo ]                      [ Zoom: - 100% + ]     │   Filter: —   │
│   📁 Easing Curves       │                                                              │               │
│   📁 Images               │     ┌──────────────────────────────────────────────────┐     │ ▾ Appearance  │
├──────────────────────────┴─────│ FLOATING DOCK: Select | Pan | Focal Point | Motion│─────┴───────────────┤
│ EXPANDABLE BOTTOM DRAWER:       │ Preset | Code | +                                 │ [Curve Editor]      │
│ [Motion Sequencer]  [Curve Editor]  [Code Inspector]  [Console]  [MotionAI]         └───────────────────  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Visual Theme, Tokens & Styling Guidelines

### 2.1 Color Palette
* **Canvas Background:** `#FCFDFD` (Luminous Warm White)
* **Dot Grid Matrix:** `#E2E8F0` (Subtle Slate Dots, 24px spacing)
* **Panel Background:** `#FFFFFF` with `backdrop-filter: blur(20px)` and `rgba(255, 255, 255, 0.94)`
* **Active Surface / Hover:** `#F8FAFC` to `#F1F5F9` (Soft Slate)
* **Border Strokes:** `rgba(15, 23, 42, 0.08)` (Ultra-refined 1px micro-border)
* **Deep Text:** `#0F172A` (Slate 900)
* **Muted Text / Metadata:** `#64748B` (Slate 500)
* **Accent Primary:** `#206859` (Deep Pine Green - Brand & Active States)
* **Accent Success:** `#10B981` (Emerald - Live Playback & Active Loops)
* **Accent Warning:** `#F59E0B` (Amber - Dirty State & Animation Warnings)
* **Accent Error:** `#EF4444` (Rose - Curve & CSS Validation Errors)
* **Disabled Surface (Component/Page cards, Home Screen):** `#F1F5F9` background, `#94A3B8` text, `cursor: not-allowed`, no hover elevation.

### 2.2 Animation Track & Timeline Color Taxonomy
To ensure instant readability on the Sequencer timeline:

| Track Type | Hex Color | Visual Indicator | Meaning |
| :--- | :--- | :--- | :--- |
| **Position / Transform (X, Y, Z)** | `#06B6D4` | Cyan Dot / Bar | Translation, offsets, coordinates |
| **Scale & Dimension** | `#3B82F6` | Electric Blue | ScaleX, ScaleY, Width, Height |
| **Rotation & 3D Tilt** | `#8B5CF6` | Vibrant Violet | Rotation (deg), skew, perspective |
| **Opacity & Visibility** | `#E11D48` | Rose Magenta | Opacity (0–1), display, visibility |
| **Color & Background** | `#10B981` | Emerald Green | Background, text color, border color, `background.*` (Background archetype) |
| **SVG / Divider Path & Stroke** | `#F59E0B` | Amber Orange | `d` attribute tween, `strokeDashoffset`, `divider.length` |
| **Media Filters & Reveal** | `#0EA5E9` | Sky Blue | `media.filter.*`, `media.clipPath`, `media.overlay.*` |
| **Filter & Blur** | `#EC4899` | Pink Fuchsia | Gaussian blur, brightness, contrast |
| **Spring Physics** | `#14B8A6` | Mint Teal | Framer Motion stiffness/damping |
| **ScrollTrigger Region** | `#6366F1` | Indigo Blue | Scroll start/end markers & scrub, `background.parallax.speed` |

### 2.3 Curvature, Elevation & Glassmorphism
* **Corner Radius:**
  * Floating Docks & Modals: `border-radius: 20px`
  * Panels & Windows: `border-radius: 16px`
  * Cards & Inspector Sections: `border-radius: 12px`
  * Buttons & Inputs: `border-radius: 8px`
* **Elevation & Shadows:**
  * Floating Docks: `box-shadow: 0 12px 36px -4px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.04)`
  * Docked Panel Dividers: `box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.06)`
* **Typography:**
  * System Font Stack: `Inter`, `Geist Sans`, or `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`
  * Code & Monospace: `JetBrains Mono`, `Fira Code`, or `ui-monospace`

---

## 3. Technology Stack for the Initial Phase

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Core Framework** | **Next.js 15 / React 19** | High-performance component architecture, SSR/SSG, fast client reconciliation. |
| **High-Performance Math** | **C++ compiled to WebAssembly (Wasm)** | 120 FPS Hermite/Cubic Bezier curve solving, spline interpolation. |
| **Animation Engines** | **GSAP 3.12 + Framer Motion 11** | Timeline sequencing, SVG path morphing, ScrollTrigger, and physical springs. |
| **Graphics & Rendering** | **HTML5 Canvas + SVG** | Canvas for bezier curve rendering; SVG for path/divider manipulation and crisp vector exports. |
| **Image Handling** | **`next/image` + native `<img>` fallback** | Optimized image loading, explicit width/height to prevent layout shift, lazy loading. |
| **Styling Architecture** | **Vanilla CSS + Modern CSS Variables** | Bespoke design system avoiding utility lock-in with fluid curves and zero conflicts. |
| **Code Generation** | **Babel AST + Prettier Generator** | Deterministic compilation of visual AST into clean, human-readable React/Next.js/Tailwind code. |
| **State Management** | **Zustand + Immer** | Zero-latency reactive state store driving timeline scrubbing and undo/redo stacks. |

---

## 4. Comprehensive Screen Directory (Initial Phase)

The Initial Phase provides **10 dedicated screens/workspaces**, completely stripped of database, backend, cloud, Component, and Page/Section overhead.

---

### Screen 00: Interactive Project Hub & Design Launcher
* **Description:** The entry point where users name their element project, pick an archetype, and configure their target export technology.
* **Layout Structure:**
  * **Step 1 — Project Name:** Free-text field, defaults to a slugified archetype name (e.g. `AnimatedHeroImage`).
  * **Step 2 — Design Scope (Element Design is the only enabled option):**
    - **Element Design Card (Active, pre-selected):**
      - Tagline: *"Atomic micro-interactions, images, dividers, backgrounds, icons & buttons."*
      - Visual badge: `Atomic Unit`
    - **Component Design Card (Disabled):**
      - Tagline: *"Coming in a later phase — see ROADMAP.md"*
      - Rendered per §2.1 disabled-surface tokens; not clickable.
    - **Page / Section Design Card (Disabled):**
      - Tagline: *"Coming in a later phase — see ROADMAP.md"*
      - Rendered per §2.1 disabled-surface tokens; not clickable.
  * **Step 3 — Archetype Picker (required, gates the Launch button):**
    - **Interactive:** `Button`, `Toggle Switch`, `Badge / Chip`, `Floating Action Button`
    - **Media:** `Image`, `Icon (SVG)`
    - **Structural:** `Divider`, `Background Layer`, `Container`
    - **Text:** `Text / Label`
  * **Step 4 — Technology & Engine Configuration:**
    - **Target Framework Dropdown:** Next.js 15 (App Router - TypeScript), Next.js 15 (Pages Router - TypeScript), React 19 (Vite - TypeScript), Vue 3 (Composition API), Svelte 5 (Runes), Vanilla HTML5 / ES6 JavaScript.
    - **Styling System Dropdown:** Tailwind CSS (v4 / v3 Utility Classes), Vanilla CSS / Modern CSS Variables, CSS Modules (`*.module.css`), Styled Components / Emotion.
    - **Animation Engine Dropdown:** GSAP 3.12 (GreenSock Timeline & ScrollTrigger), Framer Motion 11 (Springs, Gestures & AnimatePresence), SVG Vector & Native CSS (Path/stroke morphing, keyframes, zero bundle size), Combined Hybrid.
    - **Language Toggle:** `[•] TypeScript` / `[ ] JavaScript`.
    - **Primary CTA Button:** `🚀 Launch Design Studio →` — disabled until an archetype (Step 3) is chosen.

---

### Screen 01: Element Stage Viewport
* **Description:** The central visual stage where developers design, arrange, and animate the single UI element.
* **Core Capabilities:**
  * **Isolated Element Framing (only framing mode in this phase):** Fixed centered bounding stage with contrast toggles (Dark, Light, Transparent checkerboard) and state simulator tabs (Default, Hover, Active, Focus, In-View).
  * **On-Canvas Visual Handles:** Direct dragging of padding, margin, rotation angle, scale handles, and transform origin dot; **Image** archetype additionally shows a draggable focal-point crosshair and clip-path reveal handles; **Divider** additionally shows draggable endpoint/length handles.
  * **Inline Text Editing:** Double-click any Text-family label to modify text with real-time typography preview.
  * **ScrollTrigger Scrub Simulator:** A virtual scrollbar overlays the viewport, letting the user scrub scroll position to preview scroll-linked animations in real time — used heavily by Image parallax, Background parallax, and Divider scroll-reveal.

---

### Screen 02: Simplified Element & Animation Outliner
* **Description:** The streamlined left-side hierarchy focused strictly on the element's node tree and its attached animations.
* **Core Capabilities:**
  * **Hierarchy Model (example — Interactive archetype with children):**
    ```text
    Button (Root Container)
    ├── Icon (SVG Path: LucideSparkles)
    │   └── 🎬 Spin Entrance (GSAP, 0.4s, Back.out)
    ├── Text Label ("Generate")
    │   └── 🎬 Shimmer Gradient (CSS Keyframes, Infinite)
    └── 🎬 Attached Animation Stacks
        ├── ⚡ Hover Timeline (GSAP: Scale 1.04, Glow Shadow)
        ├── ⚡ Active Tap (Framer: Scale 0.96, Stiffness 400)
        └── ⚡ In-View Entrance (ScrollTrigger: FadeIn + Stagger)
    ```
  * **Hierarchy Model (example — Media archetype, single node):**
    ```text
    Hero Image (Root)
    └── 🎬 Attached Animation Stacks
        ├── ⚡ Mount Reveal (Fade + Scale, GSAP)
        ├── ⚡ Hover Zoom + Darken (GSAP: scale 1.06, overlay.opacity 0.15)
        └── ⚡ Scroll Parallax (transform.y, ScrollTrigger scrub)
    ```
  * **Quick Animation Add (`+`):** Clicking `+` next to the root node opens a popup filtered to animation types valid for the current archetype's family (Hover, Tap, Scroll, Entrance, Exit, Loop — Tap/Hover hidden for non-interactive families where not meaningful, e.g. a Background Layer has no Tap state).
  * **Direct Content Browser Link:** Dragging an animation preset from the Content Browser directly onto the Outliner root binds it instantly.
  * **Visibility & Solo Toggles:** Mute or solo individual animation tracks to isolate specific motion choreographies.

---

### Screen 03: Properties & Details Inspector
* **Description:** Context-aware inspector adapting to the selected element's archetype.
* **Universal Sections (all archetypes):**
  * **Transform:** X, Y, Z coordinates, Width, Height, Z-Index, Aspect Ratio, Rotation (deg), Scale.
  * **Layout (Flex / Grid):** Direction, Justify, Align, Gap, Wrap, Padding, Margin.
  * **Motion Trigger Inspector:** Assign triggers (`onHover`, `onClick`, `onScrollIntoView`, `onMount`) and select the target timeline.
* **Archetype-Specific Sections:**
  * **Appearance** *(Interactive, Text, Container)*: Solid Color, Linear/Radial Gradients, Glassmorphism blur, Border, 4-corner independent Radius, Box Shadow.
  * **Typography** *(Interactive labels, Text)*: Font family, Weight slider, Size, Line height, Letter spacing, Alignment.
  * **SVG Vector Properties** *(Icon)*: Fill, Stroke, Stroke Width, Stroke Dasharray, Stroke Dashoffset, Path Data (`d`).
  * **Media Properties** *(Image)*: Source picker/uploader, Object Fit (Cover/Contain/Fill/None), Focal Point (X%, Y%), Filters (Grayscale, Blur, Brightness, Contrast, Saturate — each with an animatable toggle), Clip-Path reveal shape picker, Overlay Color/Opacity/Blend Mode.
  * **Divider Properties** *(Divider)*: Orientation (Horizontal/Vertical), Length (with "animate draw-in" checkbox), Thickness, Style (Solid/Dashed/Dotted/Gradient), Color or Gradient Stop editor, Cap Style.
  * **Background Properties** *(Background Layer)*: Type (Solid/Linear Gradient/Radial Gradient/Image/Noise/Pattern), Color or Gradient Stop + Angle editor, Image source (when Image), Parallax Speed slider (-1 to 1), Blend Mode dropdown, Noise Opacity/Scale sliders.

---

### Screen 04: Content & Motion Browser
* **Description:** Asset management panel containing reusable design building blocks and animation presets.
* **Core Directories:**
  * `Presets/Hover/` — Magnetic pulls, scale bounces, neon glows, border shines.
  * `Presets/Entrances/` — Fade up, staggered text reveal, elastic pop, 3D flip.
  * `Presets/Scroll/` — Parallax depth, horizontal scrub, pin container, progress fills.
  * `Presets/Image/` — Ken Burns Loop, Fade + Scale Reveal, Clip-Path Wipe In, Hover Zoom + Darken, Grayscale-to-Color, Scroll Parallax Depth.
  * `Presets/Divider/` — Draw-In Left-to-Right, Draw-In Center-Out, Gradient Sweep Loop, Dash Offset Marquee, Scroll-Triggered Reveal.
  * `Presets/Background/` — Gradient Angle Drift, Parallax Scroll Depth, Noise Texture Pulse, Blend-Mode Crossfade, Color Morph Loop.
  * `Curves/` — Curated bezier curves (EaseInOutCubic, Power4Out, ElasticEase, SpringSnappy).
  * `Vectors/` — Popular SVG shapes, icons, badges, and morph targets.
  * `Images/` — Sample raster images bundled for onboarding, plus the user's imported images for this project.

---

### Screen 05: Motion Sequencer & Bezier Curve Editor
* **Description:** Unreal Sequencer-inspired multi-track timeline for precision animation choreography.
* **Core Capabilities:**
  * **Multi-Track Stacking:** Add tracks for any property valid for the selected archetype (`opacity`, `transform.y`, `scale`, `filter.blur`, `svg.path`, `media.clipPath`, `divider.length`, `background.gradient.angle`, etc. — see `CONVENTIONS.md` §4).
  * **Diamond Keyframes:** Click timeline to drop keyframes, drag to retime, select multiple to stretch/compress duration.
  * **Interactive Bezier Curve Editor:** Full curve viewport powered by C++ Wasm. Drag tangent handles to shape custom easing curves.
  * **Playback Controls:** Play (▶), Pause (⏸), Loop (🔁), Reverse (◀), Scrub speed (0.5x, 1x, 2x), Current time readout (`00:01.250`).
  * **ScrollTrigger Track:** Set start/end scroll offsets and scrub smoothness directly on the timeline.
  * **Infinite Loop Toggle:** For ambient, trigger-less tracks (e.g. Background drift) — sets `iterationCount: -1`.

---

### Screen 06: Play & Interaction Sandbox
* **Description:** Zero-build sandbox to test micro-interactions exactly as they will feel in production.
* **Core Capabilities:**
  * **Real User Interactions:** Hover to feel spring resistance; scroll to observe parallax on Image/Background; click toggles to test layout morphing.
  * **Interactive Debug HUD:** Displays current FPS, active tween count, running GSAP timelines, and spring velocity.
  * **Slow-Motion Inspection:** Slider to slow down playback to 10% speed for frame-by-frame micro-interaction inspection.

---

### Screen 07: Live Code Inspector & Clean Exporter
* **Description:** Split-screen code viewer displaying the generated production code in real time.
* **Core Capabilities:**
  * **Syntax Highlighted Tabs:** `Component.tsx`, `useAnimation.ts`, `styles.css` / `tailwind.config.ts`.
  * **Instant Reactive Updates:** Moving a keyframe or editing a padding slider updates the code preview with zero lag.
  * **Zero Lock-In Guarantee:** Clean, readable code using standard imports (`import gsap from "gsap"`, `import { motion } from "framer-motion"`, `import Image from "next/image"`).
  * **1-Click Copy:** Copies the full component code directly to the clipboard with import instructions.
  * **Download ZIP Package:** Exports a complete npm-ready folder with component, styles, TypeScript declarations, and a `README.md` on how to install dependencies.

---

### Screen 08: Whiteboard Canvas & Moodboard
* **Description:** Atlassian Confluence-style infinite whiteboard for visual planning and moodboarding.
* **Core Capabilities:**
  * Paste inspiration screenshots, color palettes, and motion reference links.
  * Draw freehand arrows and sticky notes connecting ideas to the element on stage.

---

### Screen 09: MotionAI Co-Pilot Assistant
* **Description:** Intelligent animation assistant that crafts and tweaks animations from natural language prompts.
* **Core Capabilities:**
  * Prompts like: *"Make this button bounce like an elastic spring when hovered"*, *"Add a slow Ken Burns zoom to this image"*, or *"Make this divider draw in from the center when it scrolls into view."*
  * Generates visual keyframes and curves directly on the Sequencer timeline for human inspection.
  * No Silent Writes: Displays a visual diff of proposed tracks before applying.

---

### Screen 10: Design System & Token Manager
* **Description:** Centralized manager for global design and animation constants.
* **Core Capabilities:**
  * **Easing Tokens:** Standardize project easings (`--ease-snappy`, `--ease-smooth`, `--ease-bounce`).
  * **Duration Tokens:** Standardize animation durations (`--duration-fast: 150ms`, `--duration-normal: 300ms`).
  * **Color & Typography Tokens:** Brand colors, border radii, and font families.

---

## 5. Docking Mechanics & Workspace Layout Presets

Users can switch between tailored panel configurations using the top menu (`Window` ➔ `Workspaces`):

1. **Motion Choreography (Default):** Viewport centered above the multi-track Sequencer and Bezier Curve Editor; Outliner on the left, Details on the right.
2. **Media & Image Workshop:** Maximizes the Viewport, the Details Panel's Media section, and the Content Browser's `Images/` and `Presets/Image/` folders — for focal point framing, filters, and Ken Burns tuning.
3. **Structural & Background Workshop:** Focuses on the Divider/Background Details sections and the Sequencer — for draw-in choreography, gradient drift, and parallax tuning.
4. **Frontend Styling:** Maximizes the Details Inspector and Viewport for layout, flexbox, grid, and CSS styling.
5. **Code Export & Review:** Side-by-side Viewport and Live Code Inspector for immediate copy-paste workflow.
6. **Clean Presentation:** Collapses all sidebars and bottom drawers to provide a distraction-free stage for client reviews and screen recordings.
# COMPLETE PANEL & TAB REGISTRY — INITIAL PHASE

> **⚠️ Pending v2 update:** This document still describes Initial Phase v1.1. Where it conflicts with `PRD.md` v2.0.0 or `ROADMAP.md` v2.0.0, those documents win. It will be rewritten in ROADMAP v2 Phase 6.3 (schema content in Phase 2). See `AUDIT.md` for known gaps between this spec and the code.

## Project Name: LazyLayout
**Internal Codename:** "Unreal Engine for Animation & Frontend Design"
**Document Version:** 1.1.0
**Phase:** Initial Phase (Element Animation Studio)
**Status:** Production-Ready Specification
**File Location:** `DOCS/Initial/PANELS.md`

---

## 1. Overview

This document is the **single source of truth** for every dockable panel, floating window, and tabbed view in the Initial Phase of LazyLayout.

Every panel listed here can be:
- **Docked** to the left, right, bottom, or center dock zones
- **Stacked** as tabs within the same dock zone
- **Floated** as an independent window with soft elevation shadows (`border-radius: 16px`)
- **Collapsed** to a slim icon-only side strip (36px width)
- **Resized** via fluid 2D and 1D splitter drag handles
- **Opened / Closed** via the `Window` menu or keyboard shortcuts

The Initial Phase provides **12 core dockable panels** plus **1 standalone launcher page** (The Project Hub), all scoped to editing a **single element** (`PRD.md` §3). All database, SQL/Prisma, API endpoints, Auth RBAC, and cloud deployment panels from the full-stack engine have been completely eliminated, and no Component-tree or multi-element Page panels exist in this phase.

---

## 1.1 The Inside-Out Architecture Law: How Panels Connect to Elements

Every panel operates under the **Inside-Out Engine Law**:
UI surfaces (inspectors, viewports, timelines, curve editors) NEVER manipulate raw CSS or DOM state directly. Instead, all functionality is structured in 4 concentric tiers from the innermost core outward to the UI:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TIER 1: INNERMOST PROPERTY & MOTION CONTRACTS (`src/core/motion/types/`)     │
│ Declarative schemas: Track types, CSS properties, keyframe values, units.   │
├─────────────────────────────────────────────────────────────────────────────┤
│ TIER 2: ENGINE ANIMATION & STYLE EVALUATOR (`src/core/motion/engine/`)      │
│ Validates legality: Can archetype X accept property track Y or ease Z?      │
├─────────────────────────────────────────────────────────────────────────────┤
│ TIER 3: DIAGNOSTIC BUS & OUTPUT LOG (`Panel 08: Output Log & Diagnostics`)  │
│ Traps invalid connections, emitting structured `[ANIM_COMPAT]` diagnostics. │
├─────────────────────────────────────────────────────────────────────────────┤
│ TIER 4: UI PRESENTATION & VISUAL REFLECTION (`src/editor/panels/`)           │
│ Visual panels display and edit ONLY validated innermost properties.         │
└─────────────────────────────────────────────────────────────────────────────┘
```

When an animation track, easing curve, or styling rule is attached to an element:
1. It queries the **Innermost Property & Motion Contract** (`src/core/motion/types/`).
2. The **Engine Animation Evaluator** verifies that the target element's `archetype`/`family` (`CONVENTIONS.md` §3–§4) supports that property track (e.g. a `background.parallax.speed` track can only attach to `elem_bg_*` elements; `divider.strokeDashoffset` can only attach to `elem_divider_*` or `elem_icon_*`).
3. If incompatible, a diagnostic event `[ANIM_COMPAT]` is dispatched to the Output Log with exact remediation advice, and the UI displays an inline warning badge without crashing.
4. If compatible, the AST transaction commits and updates the visual Sequencer and Viewport smoothly.

---

## 2. Panel Registry Summary (Initial Phase)

| # | Panel Name | Category | Unreal Equivalent | Shortcut | Priority |
|---|-----------|----------|-------------------|----------|----------|
| 00 | Project Hub & Design Launcher | Launcher | Epic Games Launcher | — | MVP |
| 01 | Element Stage Viewport | Core Studio | Level Viewport | — | MVP |
| 02 | Element & Animation Outliner | Core Studio | World Outliner (Streamlined) | `Ctrl+Shift+O` | MVP |
| 03 | Properties & Details Inspector | Core Studio | Details Panel | `Ctrl+Shift+D` | MVP |
| 04 | Content & Motion Browser | Core Studio | Content Browser | `Ctrl+Shift+B` | MVP |
| 05 | Motion Sequencer & Timeline | Motion & Animation | Sequencer | `Ctrl+Shift+M` | MVP |
| 06 | Cubic Bezier & Spring Curve Editor | Motion & Animation | Curve Editor | `Ctrl+Shift+K` | MVP |
| 07 | Live Code Inspector & Clean Exporter | Code Generation | — (VS Code-inspired) | `Ctrl+Shift+G` | MVP |
| 08 | Output Log & Motion Diagnostics | Debug & Diagnostics | Output Log | `Ctrl+Shift+C` | MVP |
| 09 | Play & Interaction Sandbox | Simulation | Play in Editor (PIE) | `Ctrl+Enter` | MVP |
| 10 | Whiteboard Canvas & Moodboard | Visual Planning | — (Confluence-inspired) | — | Phase 2 |
| 11 | MotionAI Co-Pilot Assistant | AI & Intelligence | — (Our innovation) | `Ctrl+Shift+I` | Phase 2 |
| 12 | Design Tokens & Preset Manager | Design System | Material Instance Editor | — | Phase 2 |

---

## 3. Detailed Panel Specifications

---

### Panel 00: Project Hub & Design Launcher
* **Role:** Primary project setup page presented on app launch (`/`).
* **Category:** Launcher (Standalone Full-Screen View)
* **Unreal Equivalent:** Epic Games Launcher / Unreal Project Browser
* **Features:**
  * **Project Naming:** Free-text project name field, used as the default exported component name.
  * **Design Scope Selector:** Only **Element Design** is enabled and pre-selected. `Component Design` and `Page / Section Design` render visibly but disabled, with a `Coming in a later phase — see ROADMAP.md` tooltip (`PRD.md` §6).
  * **Archetype Picker (Element scope only):** A 4-family grid the user must choose from before Launch is enabled:
    - **Interactive:** Button, Toggle Switch, Badge/Chip, Floating Action Button.
    - **Media:** Image, Icon (SVG).
    - **Structural:** Divider, Background Layer, Container.
    - **Text:** Text / Label.
    The chosen archetype sets `rootArchetype` in `project.json` and determines which Details Inspector sections (Panel 03) are shown by default.
  * **Tech Stack Configurator:**
    - Framework dropdown: Next.js 16 (App/Pages), React 19 (Vite), Vue 3, Svelte 5, Vanilla HTML/JS.
    - Styling dropdown: Tailwind CSS (v4/v3), Vanilla CSS, CSS Modules, Styled Components.
    - Animation dropdown: GSAP 3.12, Framer Motion 11, SVG & Native CSS, Hybrid.
    - TypeScript vs JavaScript toggle.
    - Primary "Launch Studio" button leading to the tailored IDE, disabled until an archetype is chosen.

---

### Panel 01: Element Stage Viewport
* **Role:** Interactive canvas where the single element is styled, arranged, and animated.
* **Category:** Core Studio
* **Unreal Equivalent:** Level Viewport
* **Default Dock Position:** Center Canvas
* **Features:**
  * **Isolated Element Framing:** Fixed centered bounding stage — this is the only framing mode in the Initial Phase (there is no responsive multi-breakpoint stage; that belongs to Page/Section Design, out of scope). State tabs: Default, Hover, Active, Focus, In-View.
  * **Contrast Background Toggles:** Dark, Light, and Transparent-checkerboard backdrop behind the element, so Image and Background archetypes can be previewed against realistic contexts.
  * **On-Canvas Interaction Handles:** Direct manipulation of scale, rotation pivot, margin, and padding; for Image, a draggable focal-point crosshair; for Divider, draggable endpoint handles that write directly to `divider.length`.
  * **Live Scrub Overlay:** ScrollTrigger scrub simulator bar allowing live scrubbing of scroll-linked animations (Image parallax, Divider draw-in, Background parallax).
  * **Visual State Overlays:** Bounding box highlights, flexbox direction indicators, and CSS grid lines.

---

### Panel 02: Element & Animation Outliner (Simplified)
* **Role:** Hierarchical tree view representing the single element's node tree and attached animation tracks.
* **Category:** Core Studio
* **Unreal Equivalent:** World Outliner (Specialized for Frontend & Motion)
* **Default Dock Position:** Left Dock (Top Half)
* **Features:**
  * **Clean Hierarchy (example — Image archetype root):**
    ```text
    Hero Image (Root, Image)
    ├── 🎬 Animation Stack
    │   ├── ⚡ Mount Reveal (Fade + Scale, GSAP)
    │   ├── ⚡ Hover Zoom + Darken (GSAP: scale 1.06, overlay.opacity 0.15)
    │   └── ⚡ Scroll Parallax (transform.y, ScrollTrigger scrub)
    ```
  * **Clean Hierarchy (example — Background archetype root):**
    ```text
    Gradient Backdrop (Root, Background)
    └── 🎬 Animation Stack
        ├── ⚡ Ambient Gradient Drift (Infinite loop, background.gradient.angle)
        └── ⚡ Scroll Parallax (background.parallax.speed)
    ```
  * **Archetype Icon Badge:** Every node shows a small icon indicating its `family` (Interactive / Media / Structural / Text) so the user always knows which Details Inspector sections apply.
  * **Direct Content Browser Linkage:** Drag-and-drop animation presets from Content Browser directly onto the root element (Container/child nodes only exist when the archetype legitimately has children, e.g. a Button's icon + label).
  * **Quick Add (`+`):** One-click button to attach animation types valid for the selected archetype's family (`CONVENTIONS.md` §4) — invalid types are not shown, not shown-then-rejected.
  * **Track Controls:** Eye icon (mute animation track), lock icon, solo track playback.

---

### Panel 03: Properties & Details Inspector
* **Role:** Contextual inspector for configuring styles, layout, and motion triggers — the set of visible sections is driven by the selected element's `archetype`.
* **Category:** Core Studio
* **Unreal Equivalent:** Details Panel
* **Default Dock Position:** Right Dock
* **Universal Sections (shown for every archetype):**
  * **Transform Section:** X, Y, Z, Width, Height, Aspect Ratio, Rotation (deg), Scale, Transform Origin.
  * **Layout Section:** Display (Flex, Grid, Block), Direction, Justify, Align, Gap, Wrap, Padding, Margin.
  * **Appearance Section:** Border, 4-corner Radius, Box Shadows (background color/gradient shown here for Interactive/Text; Background archetype uses its own dedicated section instead, below).
  * **Motion Triggers Section:** Attach triggers (`onHover`, `onClick`, `onScroll`, `onMount`) and select timelines.
* **Archetype-Specific Sections (conditionally rendered):**
  * **Typography Section** *(Interactive labels, Text)*: Font family, Weight, Size, Line Height, Letter Spacing, Alignment, Color.
  * **SVG Vector Section** *(Icon)*: Fill, Stroke, Stroke Width, Dasharray, Dashoffset, Path Data (`d`).
  * **Media Section** *(Image)*: Source picker, Object Fit, Focal Point crosshair, Filters (Grayscale, Blur, Brightness, Contrast, Saturate), Clip-Path reveal shape, Overlay Color/Opacity/Blend Mode.
  * **Divider Section** *(Divider)*: Orientation, Length (with animatable draw-in toggle), Thickness, Style (Solid/Dashed/Dotted/Gradient), Color or Gradient Stops, Cap Style.
  * **Background Section** *(Background Layer)*: Type (Solid/Linear/Radial/Image/Noise/Pattern), Color or Gradient Stops + Angle, Image picker (when type = Image), Parallax Speed, Blend Mode, Noise Opacity/Scale.

---

### Panel 04: Content & Motion Browser
* **Role:** Central asset repository for animation presets, easing curves, vector shapes, and images.
* **Category:** Core Studio
* **Unreal Equivalent:** Content Browser
* **Default Dock Position:** Bottom Drawer (Left Tab)
* **Features:**
  * **Folder Navigation:** `Presets/Hover/`, `Presets/Entrances/`, `Presets/Scroll/`, `Presets/Image/`, `Presets/Divider/`, `Presets/Background/`, `Curves/`, `Vectors/`, `Images/`.
  * **Live Hover Previews:** Hovering over an animation preset plays a 1.5-second preview in the card thumbnail (for Image presets, the thumbnail plays the actual Ken Burns/reveal motion on a sample image).
  * **Drag-to-Stage & Drag-to-Outliner:** Instant binding of animation presets onto the selected element (only presets valid for the current archetype are enabled/draggable; others are dimmed).
  * **Asset Importer:** Drag-and-drop import of custom SVG files and raster images (`.jpg`, `.png`, `.webp`) for the Image archetype, and Google Fonts for Typography.

---

### Panel 05: Motion Sequencer & Timeline
* **Role:** Multi-track keyframe editor for choreographing complex time-based and scroll-based animations.
* **Category:** Motion & Animation
* **Unreal Equivalent:** Sequencer
* **Default Dock Position:** Bottom Drawer (Center Tab)
* **Shortcut:** `Ctrl+Shift+M`
* **Features:**
  * **Multi-Track Timeline:** Dedicated horizontal tracks for Transform, Opacity, Color, SVG Path, Blur, and — depending on archetype — Media (clip-path, overlay, filters), Divider (length, dashoffset, gradient angle), or Background (gradient stops/angle, parallax speed, blend mode, noise).
  * **Diamond Keyframes:** Add, delete, drag, snap, and box-select multiple keyframes.
  * **ScrollTrigger Scrub Track:** Define scroll start/end trigger lines and scrub smoothing.
  * **Playback Controls:** Play, Pause, Loop, Reverse, Scrub bar, speed toggles (0.25x, 0.5x, 1x, 2x).
  * **Infinite Loop Toggle:** For ambient tracks with no user trigger (e.g. Background gradient drift), sets `iterationCount: -1` (`SCHEMA_REFERENCE.md` §4.3).
  * **Stagger Manager:** Configure sequential delays across multiple child elements where the archetype has children (`start`, `center`, `random`).

---

### Panel 06: Cubic Bezier & Spring Curve Editor
* **Role:** Visual easing curve workstation powered by C++ WebAssembly for smooth interpolation.
* **Category:** Motion & Animation
* **Unreal Equivalent:** Curve Editor
* **Default Dock Position:** Bottom Drawer (Tab beside Sequencer)
* **Shortcut:** `Ctrl+Shift+K`
* **Features:**
  * **Interactive Bezier Handles:** Visual canvas with tangent handles to sculpt custom `cubic-bezier(x1, y1, x2, y2)` curves.
  * **C++ Wasm Math Kernel:** Solves cubic splines and arc-length parameterization at 120 FPS.
  * **Spring Dynamics Workspace:** Configure Framer Motion physics (`stiffness`, `damping`, `mass`) with live visual bounce graph.
  * **Preset Library:** 1-click apply for standard curves: `Power2Out`, `Power4InOut`, `ElasticOut`, `BounceOut`, `Anticipate`.

---

### Panel 07: Live Code Inspector & Clean Exporter
* **Role:** Real-time production code viewer and exporter.
* **Category:** Code Generation
* **Unreal Equivalent:** Source Code Generator
* **Default Dock Position:** Bottom Drawer or Floating Window
* **Shortcut:** `Ctrl+Shift+G`
* **Features:**
  * **Split Tabs:** `Component.tsx`, `useAnimation.ts`, `styles.css` / `tailwind.config.ts`.
  * **Archetype-Correct Tag Preview:** The emitted root tag shown in the tab matches `PRD.md` §7.4 (`<img>`/`<Image>` for Image, `<hr>`/`<svg><line/>` for Divider, `<div>` for Background).
  * **Zero Lock-In:** Emits clean, readable TypeScript using standard npm libraries (`gsap`, `framer-motion`, `next/image`).
  * **1-Click Copy:** Copies code formatted with Prettier directly to clipboard.
  * **Export ZIP Package:** Generates a ready-to-run folder with component, TypeScript types, and quickstart documentation.

---

### Panel 08: Output Log & Motion Diagnostics
* **Role:** Diagnostic event stream recording CSS evaluation, animation compatibility, and compiler warnings.
* **Category:** Debug & Diagnostics
* **Unreal Equivalent:** Output Log
* **Default Dock Position:** Bottom Drawer (Right Tab)
* **Shortcut:** `Ctrl+Shift+C`
* **Features:**
  * **Diagnostic Channels:** Filter by `All`, `[ANIM_COMPAT]`, `[CSS_ERR]`, `[SVG_WARN]`, `[MEDIA_WARN]` (e.g. missing image dimensions), `[EMITTER]`.
  * **One-Click Remediation:** Clicking an error jumps directly to the invalid keyframe or property input.
  * **Performance Counter:** Real-time FPS monitor, active tween count, and repaint frequency.

---

### Panel 09: Play & Interaction Sandbox
* **Role:** Interactive simulation mode allowing full user interaction with the designed element.
* **Category:** Simulation
* **Unreal Equivalent:** Play in Editor (PIE)
* **Default Dock Position:** Viewport Overlay
* **Shortcut:** `Ctrl+Enter`
* **Features:**
  * **Full Interaction:** Test hover, drag, tap, scroll, and focus states in an isolated sandbox.
  * **Slow-Motion Scrub:** 10% speed slider to verify micro-interactions frame-by-frame.
  * **State Toggle HUD:** Force states (e.g. permanently simulate `:hover` or `:active`; for scroll-driven Image/Background/Divider animations, force any scroll-progress percentage).

---

### Panel 10: Whiteboard Canvas & Moodboard
* **Role:** Confluence-style infinite canvas for visual planning, inspiration moodboards, and annotations.
* **Category:** Visual Planning
* **Default Dock Position:** Floating or Center Tab
* **Features:**
  * Infinite dot-grid workspace (`#FCFDFD`).
  * Sticky notes, freehand pen markup, and inspiration image pasting.
  * Relationship arrows connecting moodboard ideas to the element on stage.

---

### Panel 11: MotionAI Co-Pilot Assistant
* **Role:** Conversational AI assistant for generating, tuning, and debugging animation sequences.
* **Category:** AI & Intelligence
* **Default Dock Position:** Right Dock (Beside Details Inspector)
* **Shortcut:** `Ctrl+Shift+I`
* **Features:**
  * Natural language prompts: *"Add a subtle floating idle animation with a 3-second cycle"* or *"Make this background drift like a slow sunrise gradient."*
  * Visual Diff View: Translucent green ghost keyframes show proposed changes before the user commits them.
  * Diagnostic Assistant: Suggests performance optimizations for heavy SVG path morphs, large unoptimized images, or layout reflows.

---

### Panel 12: Design Tokens & Preset Manager
* **Role:** Centralized repository for project colors, typography, border radii, and easing tokens.
* **Category:** Design System
* **Unreal Equivalent:** Material Instance Editor
* **Default Dock Position:** Left Dock (Tab beside Outliner)
* **Features:**
  * Manage global CSS variables and Tailwind theme extensions.
  * Define shared animation tokens (`--duration-quick: 200ms`, `--ease-bounce: cubic-bezier(...)`).
  * Token changes update the element and its animations instantly without page reloads.

---

## 4. Workspace Layout Presets

| Workspace Preset | Primary Panels | Ideal For |
| :--- | :--- | :--- |
| **Motion Choreography (Default)** | Viewport + Outliner + Details + Sequencer + Curve Editor | Time-based and scroll-based animation work on any archetype |
| **Media & Image Workshop** | Viewport + Details (Media Section) + Content Browser (Images) + Curve Editor | Image filters, clip-path reveals, focal point framing, Ken Burns tuning |
| **Structural & Background Workshop** | Viewport + Details (Divider/Background Section) + Sequencer | Divider draw-in choreography and background gradient/parallax/noise tuning |
| **Frontend Styling** | Viewport + Outliner + Details Panel + Design Tokens | Layout (Flex/Grid), typography, and CSS styling |
| **Code Export & Review** | Viewport + Live Code Inspector + Output Log | Inspecting generated TypeScript/Tailwind and copying code |
| **Clean Presentation** | Fullscreen Viewport + Floating Play Controls | Client demonstrations, screen recordings, and user testing |
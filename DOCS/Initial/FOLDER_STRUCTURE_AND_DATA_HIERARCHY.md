# ENGINE FOLDER STRUCTURE & DATA HIERARCHY SPECIFICATION — INITIAL PHASE

> **⚠️ Pending v2 update:** This document still describes Initial Phase v1.1. Where it conflicts with `PRD.md` v2.0.0 or `ROADMAP.md` v2.0.0, those documents win. It will be rewritten in ROADMAP v2 Phase 6.3 (schema content in Phase 2). See `AUDIT.md` for known gaps between this spec and the code.

## Project Name: Visual Motion & Frontend Design Studio
**Internal Codename:** "Unreal Engine for Animation & Frontend Design"
**Document Version:** 1.1.0
**Phase:** Initial Phase (Element Animation Studio)
**Status:** Production-Ready Architectural Specification
**File Location:** `DOCS/Initial/FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md`

---

## 1. Overview & Architectural Philosophy

The Visual Motion & Frontend Design Studio separates its data and codebase architecture into two clearly defined hierarchies:
1. **HIERARCHY A: THE ENGINE CODEBASE STRUCTURE (`WebAPPBuilder/`):** The internal Next.js application housing the C++ WebAssembly spline kernel, motion runtime, dockable UI panels, and code emitters.
2. **HIERARCHY B: THE USER PROJECT & ASSET DATA HIERARCHY:** The portable declarative project format (`project.json` / `.motionproj`) representing one element, its node tree, animation tracks, and export manifest.

All database models, SQL/Prisma schemas, API endpoints, Auth RBAC, and cloud deployment directories from the full-stack architecture have been eliminated from this phase. Component-tree and Page-tree folders (multi-element composition) are likewise absent — they belong to Phase 9+ per `ROADMAP.md` and must not be pre-created as empty stubs.

---

## 2. Hierarchy A: The Engine Codebase Structure

```text
WebAPPBuilder/
│
├── DOCS/                                   # Architectural Specifications
│   ├── Initial/                            # INITIAL PHASE: Element Animation Studio
│   │   ├── PRD.md                          # Product Requirements Document
│   │   ├── UI.md                           # UI & Workspace Architecture
│   │   ├── PANELS.md                       # Complete Panel & Tab Registry
│   │   ├── ROADMAP.md                      # Phased Implementation Milestones
│   │   ├── FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md # This Document
│   │   ├── SCHEMA_REFERENCE.md             # JSON Schema Contracts
│   │   ├── CONVENTIONS.md                  # Coding & File Conventions
│   │   └── CHANGELOG.md                    # Changelog
│   └── After/                              # AFTER PHASE: Full-Stack Web App Engine (future vision, not built now)
│
├── wasm/                                   # C++ HIGH-PERFORMANCE WEBASSEMBLY KERNEL
│   ├── CMakeLists.txt                      # Emscripten build manifest
│   ├── include/
│   │   ├── SplineSolver.h                  # Hermite & Cubic Bezier curve math
│   │   ├── SpringPhysics.h                 # Verlet spring & cable tension solver
│   │   └── ArcLengthParameterizer.h        # 120 FPS curve sampling
│   └── src/
│       ├── SplineSolver.cpp                # Curve geometry & tangent computation
│       ├── SpringPhysics.cpp               # Physical spring bounce simulation
│       └── WasmBindings.cpp                # EMSCRIPTEN_BINDINGS exports
│
├── public/                                 # Static Assets & Icons
│   ├── wasm/                               # Compiled Wasm binaries (.wasm + .js)
│   ├── icons/                              # Lucide & engine vector icons
│   └── sample-assets/                      # Bundled sample images for the Image archetype's onboarding preset
│
└── src/                                    # CORE APPLICATION ENGINE
    │
    ├── core/                               # FOUNDATIONAL TYPES & LOGIC
    │   ├── motion/                         # Motion subsystem
    │   │   ├── types/                      # Declarative track & keyframe schemas
    │   │   │   ├── tracks.ts               # Property tracks (transform, opacity, media, divider, background, etc.)
    │   │   │   ├── keyframes.ts            # Keyframe definitions & diamond handles
    │   │   │   ├── easings.ts              # Bezier curves & spring parameter contracts
    │   │   │   └── triggers.ts             # Hover, click, scroll, mount triggers
    │   │   └── engine/                     # Motion compatibility & validation
    │   │       ├── MotionEvaluator.ts      # Checks archetype ↔ track compatibility (CONVENTIONS.md §4)
    │   │       ├── CurveMath.ts            # Fallback JS bezier solver
    │   │       └── Diagnostics.ts          # [ANIM_COMPAT] diagnostic dispatcher
    │   │
    │   ├── elements/                       # UI Element Archetype System
    │   │   ├── types.ts                    # Element AST node definitions (base + archetype union)
    │   │   ├── archetypes/                 # One file per archetype family (PRD.md §5)
    │   │   │   ├── interactive.ts          # Button, Toggle, Badge, FAB schemas + defaults
    │   │   │   ├── media.ts                # Image, Icon schemas + defaults
    │   │   │   ├── structural.ts           # Divider, Background Layer, Container schemas + defaults
    │   │   │   └── text.ts                 # Text/Label schema + defaults
    │   │   └── validators/                 # Zod runtime validators, one per archetype file above
    │   │       ├── interactive.test.ts
    │   │       ├── media.test.ts
    │   │       ├── structural.test.ts
    │   │       └── text.test.ts
    │   │
    │   ├── store/                          # Reactive Zustand Stores
    │   │   ├── useProjectStore.ts          # Root project AST state & undo/redo
    │   │   ├── useTimelineStore.ts         # Active playhead, zoom, tracks, selection
    │   │   ├── useSelectionStore.ts        # Active selected element & keyframe IDs
    │   │   └── useExportStore.ts           # Target framework & styling preferences
    │   │
    │   └── wasm/                           # Wasm Worker Bridge
    │       ├── WasmWorker.ts               # Web Worker wrapper for Wasm math
    │       └── WasmWorkerPool.ts           # Multi-threaded curve computation pool
    │
    ├── editor/                             # DOCKABLE STUDIO SHELL & PANELS
    │   ├── shell/                          # Layout and docking infrastructure
    │   │   ├── EditorShell.tsx             # Master viewport, docks & splitters
    │   │   ├── StudioHeader.tsx            # Top bar (Project name, Play, Export CTA)
    │   │   ├── DockSplitter.tsx            # 1D resizable splitter bars
    │   │   ├── DockCornerSplitter.tsx      # 2D simultaneous width/height drag handles
    │   │   └── FloatingDock.tsx            # Bottom floating pill toolbar
    │   │
    │   ├── panels/                         # Individual Dockable Panels
    │   │   ├── launcher/                   # Panel 00: Project Hub / Home Screen
    │   │   │   ├── ProjectHub.tsx          # Element-only scope card + disabled Component/Page cards
    │   │   │   ├── ScopeCard.tsx           # Renders enabled (Element) or disabled (Component/Page) state
    │   │   │   ├── ArchetypePicker.tsx     # Family A–D archetype grid (PRD.md §6)
    │   │   │   └── TechConfigurator.tsx    # Framework, CSS, and Animation pickers
    │   │   │
    │   │   ├── viewport/                   # Panel 01: Element Stage Viewport
    │   │   │   ├── CanvasViewport.tsx      # Confluence dot-grid stage
    │   │   │   ├── ElementStage.tsx        # Isolated centered frame + contrast toggles
    │   │   │   └── ScrollSimulator.tsx     # ScrollTrigger virtual scrub overlay
    │   │   │
    │   │   ├── outliner/                   # Panel 02: Element & Animation Outliner
    │   │   │   ├── ElementOutliner.tsx     # Tree view: Element ➔ Child ➔ Animation
    │   │   │   ├── TreeNode.tsx            # Node row with archetype icon + mute/solo/lock toggles
    │   │   │   └── QuickAddModal.tsx       # Popover to attach new animations
    │   │   │
    │   │   ├── details/                    # Panel 03: Details & Properties Inspector
    │   │   │   ├── DetailsInspector.tsx    # Master accordion inspector; renders sections by archetype
    │   │   │   ├── TransformSection.tsx    # X, Y, Z, Rotation, Scale, Origin (universal)
    │   │   │   ├── LayoutSection.tsx       # Flexbox, CSS Grid, Gap, Padding (universal)
    │   │   │   ├── AppearanceSection.tsx   # Colors, Gradients, Radius, Shadows (universal)
    │   │   │   ├── TypographySection.tsx   # Fonts, Weights, Sizes, Line heights (Interactive + Text)
    │   │   │   ├── SvgSection.tsx          # Fill, Stroke, Dashoffset, Path editor (Icon)
    │   │   │   ├── MediaSection.tsx        # src, objectFit, focalPoint, filters, clipPath, overlay (Image)
    │   │   │   ├── DividerSection.tsx      # orientation, length, thickness, style, gradient, dashoffset (Divider)
    │   │   │   └── BackgroundSection.tsx   # type, gradient, parallax, blendMode, noise (Background Layer)
    │   │   │
    │   │   ├── content/                    # Panel 04: Content & Motion Browser
    │   │   │   ├── ContentBrowser.tsx      # Asset drawer with live hover previews
    │   │   │   └── AssetCard.tsx           # Draggable cards for presets, curves, and images
    │   │   │
    │   │   ├── sequencer/                  # Panel 05: Motion Sequencer
    │   │   │   ├── MotionSequencer.tsx     # Multi-track keyframe timeline
    │   │   │   ├── TrackHeader.tsx         # Track label, color badge, mute/solo
    │   │   │   ├── KeyframeTrack.tsx       # Horizontal track with diamond markers
    │   │   │   └── PlayheadControls.tsx    # Play, Pause, Loop, Reverse, Scrub bar
    │   │   │
    │   │   ├── curves/                     # Panel 06: Curve Editor
    │   │   │   ├── CurveEditor.tsx         # Visual cubic bezier handle editor
    │   │   │   └── SpringEditor.tsx        # Framer Motion spring physics visualizer
    │   │   │
    │   │   ├── code/                       # Panel 07: Live Code Inspector
    │   │   │   ├── CodeInspector.tsx       # Split-tab syntax-highlighted viewer
    │   │   │   └── ExportDialog.tsx        # Copy code & Download ZIP package
    │   │   │
    │   │   ├── output/                     # Panel 08: Output Log & Diagnostics
    │   │   │   └── OutputLog.tsx           # Filterable diagnostic event stream
    │   │   │
    │   │   ├── sandbox/                    # Panel 09: Play & Interaction Sandbox
    │   │   │   └── InteractionSandbox.tsx  # Zero-build interactive testing stage
    │   │   │
    │   │   └── ai/                         # Panel 11: MotionAI Assistant
    │   │       ├── MotionAICoPilot.tsx     # Conversational prompt assistant
    │   │       └── DiffPreview.tsx         # Translucent ghost keyframe diff
    │   │
    │   └── styles/                         # Scoped Panel Stylesheets
    │       ├── tokens.css                  # Global design tokens & CSS variables
    │       ├── globals.css                 # CSS reset & custom scrollbars
    │       ├── animations.css              # Micro-interaction keyframes
    │       ├── launcher.css                # Scoped styles for Screen 00 Hub
    │       ├── viewport.css                # Scoped canvas styles
    │       ├── outliner.css                # Scoped outliner tree styles
    │       ├── details.css                 # Scoped inspector styles
    │       ├── sequencer.css               # Scoped timeline styles
    │       └── code.css                    # Scoped code viewer styles
    │
    ├── compiler/                           # CLEAN CODE EMITTER PIPELINE
    │   ├── ast/                            # AST Transformers & Normalizers
    │   ├── emitters/                       # Framework & library code generators
    │   │   ├── react/                      # React 19 / Next.js 15 TSX Emitter
    │   │   │   ├── InteractiveEmitter.ts   # Button/Toggle/Badge/FAB tag + prop emission
    │   │   │   ├── MediaEmitter.ts         # <Image>/<img> emission with objectFit, overlay, clipPath
    │   │   │   ├── StructuralEmitter.ts    # <hr>/<svg><line/> for Divider; <div> for Background
    │   │   │   └── TextEmitter.ts          # Text/label emission with SplitText stagger support
    │   │   ├── tailwind/                   # Tailwind CSS class synthesizer
    │   │   ├── css/                        # Scoped CSS modules & keyframe emitter
    │   │   ├── gsap/                       # GSAP useGSAP() hook emitter
    │   │   ├── framer/                     # Framer Motion motion.div emitter
    │   │   └── svg/                        # SVG vector, morph & stroke-draw emitter (Icon + Divider)
    │   └── bundler/                        # Standalone ZIP package generator
    │
    └── app/                                # NEXT.JS APP ROUTER
        ├── layout.tsx                      # Root layout with font imports
        ├── page.tsx                        # Screen 00: Interactive Project Hub
        └── editor/                         # Screen 01–12: Design Studio IDE
            └── page.tsx                    # Loads EditorShell with active project
```

---

## 3. Hierarchy B: The User Project & Asset Data Hierarchy

When a user saves or exports their work, it is represented as a clean, portable declarative structure. The example below is an **Image** archetype project; a Divider or Background project follows the identical shape with `elements/root.element.json` containing that archetype's fragment (`SCHEMA_REFERENCE.md` §3.1–3.3) instead.

```text
AnimatedHeroImage.motionproj/
│
├── project.json                            # Project manifest & metadata
│                                           # (Scope: Element, Archetype: Image, Framework: Next.js, Styling: Tailwind)
│
├── elements/                               # UI Element AST Definitions
│   └── root.element.json                   # Root node — here, the "image" archetype fragment
│
├── animations/                             # Choreographed Animation Timelines
│   ├── hover.timeline.json                 # Hover state timeline tracks & keyframes
│   ├── scroll.timeline.json                # ScrollTrigger parallax / reveal tracks
│   └── ambient.timeline.json               # Infinite-loop ambient tracks (e.g. background drift)
│
├── curves/                                 # Custom Easing Curves
│   └── custom-bounce.curve.json            # Cubic bezier tangent points
│
├── assets/                                 # Imported raw assets (present only for Image/Icon archetypes)
│   └── hero-mountain.jpg                   # Source raster image referenced by media.src
│
└── exported/                               # Generated Production Code (Ready to copy)
    ├── AnimatedHeroImage.tsx                # Standalone Next.js/React component
    ├── useImageMotion.ts                    # Clean GSAP / Framer Motion hook
    └── README.md                            # Copy-paste & install instructions
```

---

## 4. In-Memory AST Hierarchy

The reactive state store (`useProjectStore.ts`) manages the project as a structured in-memory AST. `ElementNodeAST` now explicitly carries a `family`-discriminating `archetype` field, and an optional archetype-specific data block (`media` | `divider` | `background`) alongside the universal `styles`.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MotionProjectAST (Root)                            │
│  - id: string                                                               │
│  - name: string                                                             │
│  - scope: 'element'                          // fixed value in this phase  │
│  - rootArchetype: ArchetypeId                                              │
│  - target: { framework: 'nextjs'|'react'|'vue', styling: 'tailwind'|'css' } │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
      ┌───────────────────────────┐         ┌───────────────────────────┐
      │      ElementNodeAST       │         │   AnimationTimelineAST    │
      │  - id: string             │         │  - id: string             │
      │  - archetype: ArchetypeId │         │  - trigger: TriggerConfig │
      │  - family: FamilyId       │         │  - duration: number (sec) │
      │  - styles: StyleProps     │         │  - tracks: MotionTrack[]  │
      │  - media?: MediaProps     │         └─────────────┬─────────────┘
      │  - divider?: DividerProps │                       │
      │  - background?: BgProps  │                       │
      │  - children: ElementNode[]│                       │
      └─────────────┬─────────────┘                       │
                    │ connects via track.elementId        │
                    └─────────────────────────────────────┘
                                                          │
                                         ┌────────────────┴────────────────┐
                                         ▼                                 ▼
                           ┌───────────────────────────┐     ┌───────────────────────────┐
                           │      MotionTrackAST       │     │       KeyframeAST         │
                           │  - property: PropertyPath │     │  - time: number (sec)     │
                           │  - engine: 'gsap'|'framer'│     │  - value: number | string │
                           │  - keyframes: Keyframe[]  │     │  - easing: BezierEasing   │
                           └───────────────────────────┘     └───────────────────────────┘
```

`ArchetypeId` = `'button' | 'toggle' | 'badge' | 'fab' | 'image' | 'icon' | 'divider' | 'background' | 'container' | 'text'`
`FamilyId` = `'interactive' | 'media' | 'structural' | 'text'`

---

## 5. Execution Lifecycle: From Visual Edit to Code Export

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ 1. VISUAL EDIT  │ ────> │ 2. AST MUTATION │ ────> │ 3. LIVE SANDBOX │
│ User drags a    │       │ Zustand store   │       │ GSAP/Framer     │
│ keyframe diamond│       │ updates with    │       │ runtime scrubs  │
│ or slider       │       │ undo/redo stack │       │ preview at 60fps│
└─────────────────┘       └─────────────────┘       └─────────────────┘
                                                              │
                                                              ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ 6. DROP INTO    │ <──── │ 5. 1-CLICK COPY │ <──── │ 4. CODE EMITTER │
│ EXTERNAL REPO   │       │ Formatted TSX   │       │ Archetype-aware │
│ Runs identically│       │ copied directly │       │ emitter picks   │
│ with zero setup │       │ to clipboard    │       │ tag per family  │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```
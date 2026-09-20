# CHANGELOG

## Project Name: Visual Web Application Engine
**Internal Codename:** "Unreal Engine for Web Applications"  
**File Location:** `DOCS/CHANGELOG.md`  

All notable changes to this project's specifications and implementation will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] — 2026-09-05

### Specification Documents Created

#### Added
- **PRD.md** (v1.0.0) — Master Product Requirements Document
  - Core philosophy: "Unreal Engine for Web Applications"
  - Unreal-to-Web conceptual mapping table
  - 3-layer technical architecture (Presentation, Wasm, Engine Core)
  - Subsystem specifications: Outliner, Blueprint, Database, Motion, Details, State, Compiler, Debugging
  - UI ergonomics: Confluence canvas + Modern Unreal shell
  - Project serialization format (`project.json`) with example
  - MVP milestones and 7 implementation phases

- **UI.md** (v1.0.0) → (v2.0.0) — UI & Workspace Architecture
  - Complete Confluence Whiteboard + Curved Unreal Shell design language
  - Color palette, wire/pin data-type color taxonomy (9 types)
  - Curvature, elevation, glassmorphism tokens
  - Technology stack: Next.js 15, React 19, C++ Wasm, GSAP, Vanilla CSS, Zustand
  - 17 screen specifications (9 Unreal-inspired + 8 Web-specific)
  - Docking mechanics and 6 workspace presets

- **FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md** (v1.0.0) → (v2.0.0) — Engine Architecture
  - Unreal Engine architecture analysis (4-layer separation, Content directory, .uproject)
  - Engine Codebase Structure (WebAPPBuilder/) with 32 panel directories
  - User Project Data Hierarchy (MyShop/) with complete file extension conventions
  - Enhanced In-Memory AST hierarchy with full type annotations
  - 21-step execution lifecycle walkthrough
  - Cross-system data flow map
  - Future scalability considerations (CRDTs, Custom Node SDK, Mobile generation)

- **PANELS.md** (v1.0.0) — Complete Panel & Tab Registry
  - 32 dockable panels + 1 standalone launcher page
  - 8 functional categories (Core, Data, Annotation, Code, AI, Operations, Debug, Design)
  - Every panel mapped to Unreal Engine equivalent (where applicable)
  - Keyboard shortcuts for all primary panels
  - Detailed feature lists for every panel
  - Command Palette specification
  - 7 workspace layout presets

- **CONVENTIONS.md** (v1.0.0) — Naming, Coding & File Conventions
  - File/directory naming rules (kebab-case dirs, PascalCase components)
  - TypeScript/React coding standards
  - CSS BEM-inspired naming with CSS variable tokens
  - Import path aliases (@/core, @/editor, etc.)
  - Conventional Commits format
  - User project file extension registry (12 file types)
  - ID generation convention (type prefixes + 8-char hex)
  - AST serialization rules (JSON formatting, null vs absent, schema versioning)
  - Error message convention with categories and examples
  - Git workflow and .gitignore specifications

- **ROADMAP.md** (v1.0.0) — Implementation Phases & Milestones
  - 7 MVP implementation phases with deliverable checklists
  - "Magic Moment Test" for each phase
  - Duration estimates per phase (19–26 weeks total)
  - Post-MVP phases (8–13) for collaboration, marketplace, mobile
  - Definition of Done criteria

- **SCHEMA_REFERENCE.md** (v1.0.0) — JSON Schema Contracts
  - Complete JSON examples for all 11 project file types
  - Project manifest, page layout, component definitions
  - Logic blueprint graphs with nodes, edges, pins, comment boxes
  - Database schemas with collections, fields, indexes, relations
  - Motion timelines with keyframes and easing curves
  - API integrations with auth config and endpoint definitions
  - State variables with computed/derived expressions
  - Theme tokens, auth configuration
  - Schema versioning and migration strategy

- **CHANGELOG.md** (v1.0.0) — This file

---

## [1.1.0] — 2026-09-05

### Phase 1.4 Implementation & Shell Ergonomics

#### Added
- **2D Corner Splitter Handles (`DockCornerSplitter.tsx`)**:
  - Interactive drag vertices at intersection points (bottom-left and bottom-right where side panel splitters meet the bottom drawer splitter).
  - Enables simultaneous 2D resizing of side panel width and bottom drawer height.
  - Hover indicator with glowing blue handle dot and diagonal resize cursors (`nesw-resize` / `nwse-resize`).
- **Floating Viewport History Actions (`EditorShell.tsx`)**:
  - Shifted Save, Undo, and Redo action buttons to the top-left corner inside the canvas viewport.
  - 100% transparent idle state with hover-reveal glassmorphic pill background.
- **Per-Frame Incremental Splitter Delta (`DockSplitter.tsx`)**:
  - Fixed cumulative position snapping issue by tracking incremental deltas (`currentPos - lastPos`).
  - Disabled transitions during active dragging via `body.is-resizing` for 1:1 real-time tracking.

---

## [1.2.0] — 2026-09-05

### Phase 1.5 Confluence Whiteboard Canvas (Center Viewport)

#### Added
- **Infinite Dot-Grid Canvas (`WhiteboardCanvas.tsx`)**:
  - Infinite 2D pan (Space+Drag, Middle-click drag, Pan tool).
  - Smooth zoom (Ctrl+Wheel / Pinch, 10% to 400%) with hardware-accelerated CSS custom properties.
  - Luminous `#FCFDFD` background with 24px scalable dot matrix.
- **Responsive Device Frames**:
  - Multi-device preview frames for Desktop (`1440 × 900`), Tablet (`768 × 1024`), and Mobile (`375 × 812` with phone notch).
  - Auto-fit centering with optimal scale calculation and responsive metadata header.
- **Atlassian Confluence Floating Dock (`FloatingDock.tsx`)**:
  - Frosted glassmorphism pill toolbar with tools: Select (`V`), Pan (`H`), Pencil (`P`), Text (`T`), Wire (`W`), Shapes (`S`), Components (`C`), Assets (`A`), and Quick Insert (`+`).
- **Interactive Component Selection & Overlay (`CanvasOverlay.tsx`)**:
  - Bounding box with 8 resize handles and dimension readout badge on selected elements.
- **Floating Zoom Controls Widget (`ZoomControls.tsx`)**:
  - Zoom in, Zoom out, percentage readout with click-to-reset, and Fit to Screen action.

---

## [1.3.0] — 2026-09-05

### Phase 1.6 Core Panel Shells (Outliner, Details, Content Browser, Console, Settings, Blueprint)

#### Added
- **Design System Form Controls (`forms.css`)**:
  - Form groups, number scrub inputs with axis badges (`X`, `Y`, `W`, `H`), segmented controls, dropdown selects, range sliders, and Unreal-style smooth pill toggle switches.
- **Core Panel Stylesheet (`panels.css`)**:
  - Master panel shell, collapsible accordion sections with chevron rotation, tree hierarchy node styling, asset card grid/list views, console log stream, and interactive CLI command row.
- **Application Outliner (`OutlinerTree.tsx`)**:
  - Full hierarchical tree view (`Pages > Home > Components`, `Blueprints`, `Database`).
  - Search filter bar, expand/collapse toggles, visibility (`Eye`/`EyeOff`), and lock (`Lock`/`Unlock`) state buttons.
- **Properties & Details Inspector (`DetailsInspector.tsx`)**:
  - Context-aware inspector with collapsible sections for Transform, Layout & Flexbox, Appearance, Typography, and Data Bindings & Events.
- **Content & Asset Browser (`ContentBrowser.tsx`)**:
  - Breadcrumb navigation, category filter pills (`All`, `Components`, `Blueprints`, `Database`, `Assets`, `Pages`), Grid View / List View toggle, and asset cards with drag-to-stage hints.
- **Output Log & Console (`OutputConsole.tsx`)**:
  - Monospace log stream with severity badges (`INFO`, `WARN`, `ERROR`, `INIT`, `EXEC`, `DB`, `API`), category filter tabs, copy, clear, and interactive CLI prompt (`> `).
- **Project Settings (`ProjectSettings.tsx`)**:
  - 4-category configuration dashboard: General, Build & Framework, Theme & Design Tokens, and Environment Secrets with password reveal toggles.
- **Logic Blueprint Editor Shell (`BlueprintCanvas.tsx`)**:
  - Event Graph stage with sample nodes (`OnMount`, `FetchUserSession`, `Branch`, `SetComponentState`) connected by curved Hermite SVG wires following data-type colors.
- **Full Shell Integration (`EditorShell.tsx` & `WindowMenu.tsx`)**:
  - All 6 panels registered and switchable across left, center, right, and bottom dock zones.
  - Window menu items and top header preferences gear directly activate their respective panels and tabs.

---

## [1.4.0] — 2026-09-17

### Phase 4: Motion Sequencer & Bezier Curve Editor

#### Added
- **Multi-Track Keyframe Timeline (`MotionSequencer.tsx`)**:
  - Dedicated horizontal tracks filtered strictly per element family (`CONVENTIONS.md` §4): Universal, Interactive/Text, Media (`media.*`, `svg.*`), and Structural (`divider.*`, `background.*`).
  - Interactive playhead with smooth scrubbing, timecode readout (`00:01.250`), 120 FPS frame snapping, and real-time DOM stage hot patching.
  - Diamond keyframe markers supporting selection, dragging/retiming, duplicating (`Ctrl+D`), deleting (`Del`/`Backspace`), and stretching/compressing duration (`0.9x`/`1.1x`).
  - Selected keyframe inspector bar for live value, time, and ease adjustments.
- **C++ WebAssembly Bezier Curve Editor (`CurveEditor.tsx`)**:
  - Interactive SVG visualizer with draggable tangent handles ($P_1, P_2$) powered by `SplineSolver.ts` for 120 FPS interpolation.
  - Standard easing presets: `Power2.out`, `Power4.inOut`, `Elastic.out`, `Bounce.out`, `Anticipate`, and Custom Bezier.
  - Real-time CSS `cubic-bezier()` timing function generator and direct application to active AST element.
- **Framer Motion Spring Dynamics Visualizer (`SpringEditor.tsx`)**:
  - Damped harmonic oscillator simulation for `stiffness`, `damping`, and `mass`.
  - SVG oscillation waveform graph and live interactive bounce test preview.
- **ScrollTrigger Threshold Visualizer & Simulator (`ScrollTriggerBar.tsx`)**:
  - Visual start/end threshold markers, scrub toggle, and container pin options.
  - Viewport scroll simulator slider enabling real-time preview of scroll-linked animations.
- **Stagger & Infinite-Loop Manager (`StaggerManager.tsx`)**:
  - Multi-child staggered entrance delay configuration (`start`, `center`, `end`, `random`).
  - Ambient infinite-loop toggle (`repeat: -1`) for ambient tracks (e.g., Background gradient drift).
- **Docking Integration (`EditorShell.tsx`)**:
  - Registered `Motion Sequencer` (`Ctrl+Shift+M`) and `Curve Editor` (`Ctrl+Shift+K`) in bottom drawer tabs and full-page panels.

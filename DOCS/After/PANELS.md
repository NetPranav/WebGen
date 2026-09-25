# COMPLETE PANEL & TAB REGISTRY

> **⚠️ Full-vision track. Not the active roadmap; see DOCS/Initial/ROADMAP.md.**

## Project Name: Visual Web Application Engine
**Internal Codename:** "Unreal Engine for Web Applications"  
**Document Version:** 1.0.0  
**Status:** Production-Ready Specification  
**File Location:** `DOCS/PANELS.md`  

---

## 1. Overview

This document is the **single source of truth** for every dockable panel, floating window, and tabbed view in the Visual Web Application Engine.

Every panel listed here can be:
- **Docked** to the left, right, bottom, or center dock zones
- **Stacked** as tabs within the same dock zone
- **Floated** as an independent window with soft elevation shadows
- **Collapsed** to a slim icon-only side strip
- **Resized** via splitter drag handles
- **Opened / Closed** via the `Window` menu or keyboard shortcut

The panels are organized into **8 functional categories** containing **32 panels** plus **1 standalone launcher page** (the Project Hub).

---

## 1.1 The Inside-Out Architecture Law: How Panels Connect to Elements

Every panel in the Visual Web Application Engine operates under the **Inside-Out Engine Law**:
UI surfaces (inspectors, viewports, timelines, node graphs) NEVER manipulate DOM or state ad-hoc. Instead, all functionality is structured in 4 concentric tiers from the innermost core outward to the UI:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TIER 1: INNERMOST CONNECTION SETTINGS & TYPE CONTRACTS (`src/core/types/`)   │
│ Pure declarative schemas: Property keys, units, track IDs, pin contracts.    │
├─────────────────────────────────────────────────────────────────────────────┤
│ TIER 2: ENGINE COMPATIBILITY EVALUATOR & WRAPPER (`src/core/engine/`)       │
│ Validates legality: Can archetype X accept property Y or animation track Z? │
├─────────────────────────────────────────────────────────────────────────────┤
│ TIER 3: DIAGNOSTIC LOG BUS & OUTPUT CHANNELS (`Panel 07: Output Log`)       │
│ Traps invalid connections, emitting structured `[CHANNEL_ERR]` diagnostics. │
├─────────────────────────────────────────────────────────────────────────────┤
│ TIER 4: UI CONNECTION & VISUAL REFLECTION (`src/editor/panels/`)             │
│ Visual panels surface and edit ONLY validated innermost properties.         │
└─────────────────────────────────────────────────────────────────────────────┘
```

When any panel attempts to connect a property, motion track, or data binding to an element:
1. It queries the **Innermost Connection Setting** (`src/core/types/`).
2. The **Engine Compatibility Evaluator** (`src/core/engine/`) verifies that the element archetype supports that property/track.
3. If incompatible, an error is immediately dispatched to **Panel 07 (Output Log)** with exact context and remediation advice, and the UI displays an error badge.
4. If compatible, the AST transaction commits and updates the UI connection smoothly.

---

## 2. Panel Registry Summary

| # | Panel Name | Category | Unreal Equivalent | Shortcut | Priority |
|---|-----------|----------|-------------------|----------|----------|
| 00 | Project Hub & Launcher | Launcher | Epic Games Launcher | — | MVP |
| 01 | Application Viewport | Core | Level Viewport | — | MVP |
| 02 | Application Outliner | Core | World Outliner | `Ctrl+Shift+O` | MVP |
| 03 | Properties & Details Inspector | Core | Details Panel | `Ctrl+Shift+D` | MVP |
| 04 | Content & Asset Browser | Core | Content Browser | `Ctrl+Shift+B` | MVP |
| 05 | Logic Blueprint Editor | Core | Blueprint Editor / Event Graph | `Ctrl+Shift+L` | MVP |
| 06 | Motion Blueprint & Sequencer | Core | Sequencer / Curve Editor | `Ctrl+Shift+M` | MVP |
| 07 | Output Log & Console | Core | Output Log | `Ctrl+Shift+C` | MVP |
| 08 | Play Mode / Preview Sandbox | Core | Play in Editor (PIE) | `Ctrl+Enter` | MVP |
| 09 | Project Settings | Core | Project Settings | `Ctrl+,` | MVP |
| 10 | Database Blueprint & ER Modeler | Data & Integration | — (Web-specific) | `Ctrl+Shift+E` | MVP |
| 11 | API Blueprint & Integration Studio | Data & Integration | — (Web-specific) | `Ctrl+Shift+A` | MVP |
| 12 | Authentication & RBAC Studio | Data & Integration | — (Web-specific) | — | MVP |
| 13 | State Management & Data Binding Matrix | Data & Integration | — (Web-specific) | — | MVP |
| 14 | Whiteboard & Annotation Canvas | Annotation | — (Confluence-inspired) | — | Phase 2 |
| 15 | Comments & Review Panel | Annotation | — (Figma-inspired) | — | Phase 3 |
| 16 | Live Code Inspector | Code & Development | — (VS Code-inspired) | `Ctrl+Shift+G` | Phase 2 |
| 17 | My Blueprint Panel | Code & Development | My Blueprint | — | MVP |
| 18 | AI Co-Pilot Assistant | AI & Intelligence | — (Our innovation) | `Ctrl+Shift+I` | MVP |
| 19 | Deployment & Cloud Studio | Operations | — (Vercel-inspired) | — | Phase 3 |
| 20 | Visual Execution Trace | Debug & Diagnostics | Blueprint Debugger | — | Phase 2 |
| 21 | Performance Profiler | Debug & Diagnostics | Profiler / Statistics | — | Phase 3 |
| 22 | Blueprint Validation & Errors | Debug & Diagnostics | Message Log / Map Check | — | MVP |
| 23 | Undo History | History & Versioning | Undo History | `Ctrl+Shift+H` | Phase 2 |
| 24 | Version Control & Snapshots | History & Versioning | Revision Control | — | Phase 2 |
| 25 | Global Search (Find in Blueprints) | Navigation & Search | Find in Blueprints | `Ctrl+Shift+F` | MVP |
| 26 | Reference Viewer & Dependency Graph | Navigation & Search | Reference Viewer | — | Phase 3 |
| 27 | Design System & Token Manager | Design System | Material Instance Editor | — | Phase 2 |
| 28 | Marketplace & Template Store | Marketplace & Plugins | Epic Marketplace | — | Phase 4 |
| 29 | Plugin Manager | Marketplace & Plugins | Edit > Plugins | — | Phase 4 |
| 30 | Pages & Routing Manager | Page & Routing | — (Web-specific) | — | MVP |
| 31 | Localization & i18n Manager | Specialized | Localization Dashboard | — | Phase 4 |
| 32 | Accessibility Audit Panel | Specialized | — (Web-specific) | — | Phase 4 |

---

## 3. Detailed Panel Specifications

### CATEGORY A: LAUNCHER

---

#### Panel 00: Project Hub & Launcher
**Unreal Equivalent:** Epic Games Launcher / Unreal Project Browser  
**Priority:** MVP  
**Location:** Standalone full-page route (`/` — the app landing page)

**Description:**  
The first screen the user sees. A clean, modern project management dashboard for creating, opening, and managing application projects. This is NOT a dockable panel — it is the entry point before the IDE studio loads.

**Core Features:**
- **Recent Projects Grid:** Cards showing project name, thumbnail, last-modified date, framework target, and deployment status
- **Create New Project:** Wizard with options for Blank App, Template Selection (E-commerce, SaaS, Portfolio, Blog, Dashboard), or AI-Generated Project
- **Open Project:** File system browser to open existing `.json` project files
- **Templates Gallery:** Curated starter templates with live previews
- **AI Project Generator:** Natural language prompt input (e.g., "Build a college management SaaS dashboard")
- **Engine Version Info:** Current engine version & update status

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Project manifest schema (`project.json`), schema version contract, and plugin registry declarations.
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[PROJECT_LOAD_ERR]`, `[SCHEMA_VERSION_MISMATCH]`. Validates project integrity, directory structure, and engine version compatibility upon project open.
- **UI Connection to Element Properties:** Project cards and templates instantiate new project trees with validated root page layouts and default design tokens.

---

### CATEGORY B: CORE PANELS

---

#### Panel 01: Application Viewport
**Unreal Equivalent:** Level Viewport  
**Priority:** MVP  
**Default Dock Zone:** Center (primary workspace area)

**Description:**  
The central visual stage where the user sees, selects, and manipulates the live application UI. The viewport renders the application inside a responsive device frame.

**Core Features:**
- **Responsive Device Frames:** Desktop (1440px), Tablet (768px), Mobile (375px), Custom Drag-Resize
- **Viewport Toolbar:** Responsive toggle buttons, zoom slider, grid toggle, guides toggle, rulers toggle
- **Direct On-Canvas Manipulation:** Click to select, drag to reorder, resize handles, rotation handles
- **Smart Snap Guides:** Alignment lines appear when components approach edges or centers of siblings
- **Inline Text Editing:** Double-click text elements to edit content directly with live font rendering
- **Layout Visualizers:** Hover over containers to see Flexbox direction arrows and Grid track outlines
- **Selection Handles:** Blue bounding box with 8 resize handles and rotation handle on selected elements
- **Multi-Select:** Shift+Click or rubber-band marquee selection
- **Ruler & Measurement:** Pixel rulers on edges, spacing measurements between elements on hover
- **Context Menu:** Right-click for Cut, Copy, Paste, Delete, Wrap in Container, Send to Back, Bring to Front
- **Zoom Controls:** `Ctrl+Scroll` zoom, zoom-to-fit button, percentage readout (10% - 400%)
- **Pan:** Middle-click drag or Space+Drag for canvas panning

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** AST element instance properties (`ElementInstance.properties`), computed CSS box metrics, and active GSAP interpolation matrices.
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[VIEWPORT_LAYOUT_ERR]`, `[CSS_CONSTRAINT_VIOLATION]`. Validates whether on-canvas drag, resize, or flex/grid reordering violates archetype layout constraints. If an active animation drives illegal non-interpolable values, the engine traps the frame error.
- **UI Connection to Element Properties:** Direct canvas handles (resize, rotate, margin/padding drag, inline text) directly mutate the validated AST properties through transactional commands with full undo/redo history.

---

#### Panel 02: Application Outliner
**Unreal Equivalent:** World Outliner  
**Priority:** MVP  
**Default Dock Zone:** Left sidebar  
**Shortcut:** `Ctrl+Shift+O`

**Description:**  
The master tree hierarchy representing the entire application structure: pages, components, layouts, logic blueprints, database schemas, API integrations, and motion assets.

**Core Features:**
- **Hierarchical Tree View:** Expandable/collapsible tree nodes with type-specific icons
- **Bidirectional Selection Sync:** Clicking a tree node selects it in the Viewport; clicking in the Viewport highlights the tree node
- **Visibility Toggle:** Eye icon per node — hides/shows in the Viewport without removing
- **Lock Toggle:** Lock icon per node — prevents accidental modifications
- **Drag-and-Drop Reparenting:** Drag nodes to restructure the component hierarchy
- **Inline Rename:** Double-click to rename
- **Context Menu:** Duplicate, Delete, Copy, Paste, Wrap in Container, Extract as Component
- **Search & Filter Bar:** Inline fuzzy search with type filter buttons (Pages only, Components only, Blueprints only)
- **Color Coding:** Different icon colors for pages (blue), components (green), blueprints (orange), database (emerald), APIs (purple), motion (violet)

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Hierarchical component tree (`PageLayout.componentTree`), archetype tags (`ArchetypeCategory`), slot definitions (`ComponentDefinition.slots`).
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[REPARENT_ERR]`, `[SLOT_VIOLATION]`. Evaluates whether a dragged child element archetype is permitted inside the target parent container. If illegal (e.g. attempting to drop a `cdef_table_row` into a `cdef_button`), the operation is rejected and logged to Output Log.
- **UI Connection to Element Properties:** The Outliner tree nodes directly bind to the element's identity and archetype properties, showing visibility toggles, lock states, and nesting depth.

---

#### Panel 03: Properties & Details Inspector
**Unreal Equivalent:** Details Panel  
**Priority:** MVP  
**Default Dock Zone:** Right sidebar  
**Shortcut:** `Ctrl+Shift+D`

**Description:**  
Context-aware inspector that dynamically adapts its sections based on what is currently selected — a UI component, a blueprint node, a database field, or an animation keyframe.

**Sections (for UI Component selection):**
- **Identity:** Component name, type badge, unique ID
- **Transform:** X, Y, Width, Height, Rotation, Z-Index, Aspect Ratio lock
- **Layout:** Display (Flex/Grid/Block/Absolute), Direction, Justify, Align, Gap, Wrap, Padding, Margin
- **Appearance:** Background (solid/gradient/image), Border (width/style/color), Corner Radius (4-corner independent), Box Shadow (presets + custom), Opacity, Overflow, Cursor
- **Typography:** Font family picker, Weight slider, Size, Line height, Letter spacing, Text align, Text transform, Text decoration
- **Effects:** Blur, Backdrop filter, Mix blend mode, CSS filters
- **Data Bindings:** Visual dropdown linking component props to State Variables, Database Query fields, or API Response paths
- **Events & Behavior:** List of attached event handlers with "Open Blueprint" quick-action buttons
- **Motion:** Attached animation summary with "Open Timeline" quick-action, hover/entrance/exit animation slots
- **Responsive Overrides:** Per-breakpoint (Desktop/Tablet/Mobile) override controls
- **Accessibility:** ARIA role, ARIA label, Tab index, Alt text
- **Advanced / Raw CSS:** Manual CSS property input for power users

**Sections (for Blueprint Node selection):**
- **Node Info:** Node type, category badge, description
- **Configuration:** Node-specific settings (e.g., API URL, collection name, HTTP method)
- **Input Pins:** List of input pins with current values and connected sources
- **Output Pins:** List of output pins with connected destinations
- **Debug:** Last execution result, breakpoint toggle

**Sections (for Database Field selection):**
- **Field Info:** Name, Type badge
- **Constraints:** Primary Key, Required, Unique, Default value
- **Validation:** Regex pattern, Min/Max values, Custom rules
- **Relations:** Connected foreign key relationships

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Strongly-typed property descriptor registries (`src/core/types/details.ts`, `element-sections.ts`), property keys, default values, min/max ranges, unit sets, and archetype section mappings.
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[PROP_ERR]`, `[PROP_TYPE_MISMATCH]`, `[ANIM_COMPAT]`, `[BIND_ERR]`. Validates input values against the property schema (e.g. regex patterns, numeric bounds, color formats). Attempting to apply invalid properties or inject unparseable CSS logs directly to `[PROP_ERR]`.
- **UI Connection to Element Properties:** The Details Inspector dynamically renders section accordions (Transform, Layout, Appearance, Typography, State Bindings, Events, Accessibility) based purely on the element's validated archetype schema.

---

#### Panel 04: Content & Asset Browser
**Unreal Equivalent:** Content Browser  
**Priority:** MVP  
**Default Dock Zone:** Bottom drawer (tabbed)  
**Shortcut:** `Ctrl+Shift+B`

**Description:**  
The central repository for all project assets. Supports folder-based navigation, asset previews, drag-to-stage, and import/export.

**Core Features:**
- **Folder Navigation:** Breadcrumb bar + folder tree sidebar showing `Components/`, `Blueprints/`, `Animations/`, `Images/`, `Vectors/`, `Fonts/`, `Templates/`
- **View Modes:** Grid view (with thumbnails) and List view (with metadata columns)
- **Live Asset Previews:** Hover over UI components to see rendered preview; hover over animations to see 2-second playback
- **Drag-to-Stage:** Drag any asset onto the Viewport or Blueprint canvas
- **Asset Import:** Drag-and-drop file import (SVG, PNG, WebP, JPG, Lottie JSON, TTF/WOFF fonts)
- **Context Menu:** Rename, Duplicate, Move to Folder, Delete, Show in Reference Viewer
- **Search Bar:** Instant filter by name, type, or tag
- **Sort Controls:** Sort by name, date modified, type, size
- **Tag System:** User-assignable tags for organization
- **Favorites:** Star assets for quick access in a "Favorites" virtual folder

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Asset metadata schemas (`.component.json`, `.motion.json`, `.bp.json`, images, fonts, icons), asset registry entries, and import contracts.
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[ASSET_COMPAT]`, `[ASSET_RESOLVE_ERR]`. When dragging an asset onto an element or canvas, verifies that the target element archetype can consume that asset type (e.g. dragging a video texture onto a text element is intercepted and rejected).
- **UI Connection to Element Properties:** Drag-to-stage and asset picker controls connect asset URLs and definitions directly into element properties (e.g. `backgroundImage`, `fontFamily`, `motionRefs`).

---

#### Panel 05: Logic Blueprint Editor
**Unreal Equivalent:** Blueprint Editor / Event Graph  
**Priority:** MVP  
**Default Dock Zone:** Center (replaces or tabs alongside Viewport)  
**Shortcut:** `Ctrl+Shift+L`

**Description:**  
The full-scale visual scripting workspace. An infinite node-and-wire canvas where application logic is constructed by connecting event triggers, control flow, data operations, and actions.

**Core Features:**
- **Infinite Node Canvas:** Pan (Middle-click or Space+Drag) and zoom (Ctrl+Scroll) with smooth inertia
- **C++ Wasm Cable Rendering:** Hermite/Bezier curves with spring tension physics at 120 FPS
- **Node Action Palette:** Summoned by right-click or `Tab` key; searchable, categorized node catalog
- **Pin Snapping:** Magnetic snap when hovering a dragged wire over a compatible pin
- **Type-Safe Wire Validation:** Incompatible connections show red wire and block attachment
- **Comment Boxes:** Resizable, colored, titled boxes to group related nodes
- **Reroute Nodes:** Small knots for clean wire routing around obstacles
- **Breakpoints:** Click on a node to set a debug breakpoint (red dot indicator)
- **Node Collapse:** Collapse complex nodes to show only title and primary pins
- **Variable Get/Set:** Drag a variable from My Blueprint panel → auto-creates Get or Set node
- **Copy/Paste Nodes:** Standard clipboard operations with wire preservation
- **Alignment Tools:** Align selected nodes horizontally, vertically, or distribute evenly
- **Minimap:** Optional small overview window showing full graph with visible area highlighted

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Graph schema (`GraphData`), node definitions (`NodeRegistry`), pin contracts (`execution`, `string`, `number`, `boolean`, `component`, `object`), and property getter/setter nodes.
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[PIN_TYPE_MISMATCH]`, `[GRAPH_CYCLE_ERR]`, `[UNCONNECTED_REQUIRED_PIN]`. When a wire is drawn between a node output pin and an element property input pin, the TypeChecker verifies type compatibility. Incompatible wires turn red, disallow connection, and log to `[PIN_TYPE_MISMATCH]`.
- **UI Connection to Element Properties:** Node property pins directly read and write to the element's innermost properties at runtime through reactive getters and setters.

---

#### Panel 06: Motion Blueprint & GSAP Sequencer
**Unreal Equivalent:** Sequencer / Animation Timeline / Curve Editor  
**Priority:** MVP  
**Default Dock Zone:** Bottom drawer (tabbed)  
**Shortcut:** `Ctrl+Shift+M`

**Description:**  
A dedicated keyframe animation timeline built on the GSAP engine. Separate from logic blueprints to maintain clear domain boundaries.

**Core Features:**
- **Multi-Track Timeline:** Individual horizontal tracks per animated property (Opacity, Transform X, Transform Y, Scale X, Scale Y, Rotation, Blur, Color)
- **Keyframe Placement:** Click on a track at a time position to insert a keyframe diamond
- **Keyframe Editing:** Drag keyframes to retime, Ctrl+Click to multi-select, Delete to remove
- **Cubic Bezier Easing Editor:** Visual curve editor with interactive control point handles; preset library (Power2, Power3, Power4, Elastic, Bounce, Back, Circ, Custom)
- **Playhead & Scrub Bar:** Draggable playhead with frame-accurate positioning
- **Playback Controls:** Play (▶), Pause (⏸), Stop (⏹), Loop (🔁), Reverse (◀), Speed selector (0.25x, 0.5x, 1x, 2x)
- **Duration Control:** Drag end marker or type exact duration in seconds
- **ScrollTrigger Configuration:** Visual start/end trigger threshold markers overlaid on the Viewport
- **Stagger Controls:** Define stagger delay between multiple elements sharing this animation
- **Animation Preview:** Live preview in the Viewport while scrubbing or playing
- **Export as Asset:** Save current timeline as a reusable Motion Asset in the Content Browser

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Animation track schema (`src/core/types/animations.ts`), keyframe point definitions, cubic-bezier curve parameters, and archetype track compatibility registries (`ArchetypeAnimationCompatibility`).
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[ANIM_COMPAT]`, `[KEYFRAME_RANGE_ERR]`. Evaluates whether target element archetype supports the requested track (e.g. `letterSpacing` on text/buttons vs `filter: blur` on images vs `transform` on containers). Incompatible track attachments log structured errors with element ID and archetype to `[ANIM_COMPAT]`.
- **UI Connection to Element Properties:** Multi-track timeline scrubbers, keyframe diamonds, and bezier curve handles directly command the element's animated style properties in real time.

---

#### Panel 07: Output Log & Console
**Unreal Equivalent:** Output Log  
**Priority:** MVP  
**Default Dock Zone:** Bottom drawer (tabbed)  
**Shortcut:** `Ctrl+Shift+C`

**Description:**  
Developer console showing all engine events, compilation output, runtime logs, and error streams.

**Core Features:**
- **Filter Tabs:** All, Blueprint Events, Database Queries, API Traffic, Compiler, Errors, Warnings, Compatibility Diagnostics
- **Log Entries:** Timestamped entries with severity icon (info: blue, warning: amber, error: red)
- **Engine Diagnostic Channels:**
  - `[ANIM_COMPAT]`: Property track incompatibilities when animations are bound to unsupported element archetypes.
  - `[BIND_ERR]`: Payload-to-property schema mismatches when connecting REST API responses or global state variables to component inputs.
  - `[PROP_ERR]`: Element constraint violations (e.g. invalid layout modes or illegal CSS overrides).
- **Clickable Error Links:** Clicking an error navigates to the failing Blueprint Node, Component, or Details Inspector section
- **Query Timing:** Database and API calls display execution duration (e.g., `DB: Query Products [12ms]`)
- **Clear Button:** Clear all log entries
- **Search:** Filter logs by keyword
- **Auto-Scroll:** Toggle auto-scroll to latest entries
- **Copy Log:** Copy selected entries to clipboard
- **Interactive Console Input:** Command line for executing engine commands or inspecting variables

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Diagnostic event schema (`DiagnosticEvent`), severity levels (`info`, `warning`, `error`), channel IDs (`[ANIM_COMPAT]`, `[BIND_ERR]`, `[PROP_ERR]`, `[PIN_TYPE_MISMATCH]`, `[A11Y_WARN]`), source entity IDs, and remediation suggestions.
- **Compatibility Evaluator & Output Log Diagnostic Channel:** The central receiver and router for all engine compatibility evaluators across the platform. Traps, categorizes, and timestamps every violation.
- **UI Connection to Element Properties:** Clickable error rows in the console link directly back to the offending element's property field in the Details Inspector or the invalid wire in the Blueprint canvas.

---

#### Panel 08: Play Mode / Preview Sandbox
**Unreal Equivalent:** Play in Editor (PIE)  
**Priority:** MVP  
**Default Dock Zone:** Center (replaces Viewport when active)  
**Shortcut:** `Ctrl+Enter`

**Description:**  
Instant, zero-build interactive simulation of the compiled application.

**Core Features:**
- **Sandboxed Iframe:** Application runs in an isolated iframe with its own DOM, preventing interference with the editor
- **Device Simulation:** Desktop, Tablet, Mobile frame sizing within the sandbox
- **Live Execution Trace:** Real-time wire pulses visible in the Logic Blueprint panel during interaction
- **Role Switcher:** Dropdown to simulate different user roles (Admin, Editor, Customer, Guest)
- **Network Throttle:** Simulate Slow 3G, Fast 3G, Offline, or No Throttle
- **Theme Toggle:** Switch between light/dark themes inside the preview
- **Mock Data Reset:** Button to reset the mock database to seed data
- **Hot Reload:** Changes in the editor automatically reflect in the sandbox without full restart
- **DevTools Toggle:** Open a mini browser DevTools (Console, Network, Elements) inside the preview panel
- **Exit Play Mode:** `Escape` key or "Stop" button returns to the editor

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Sandboxed virtual DOM state, compiled component tree, active event dispatchers, mock database state.
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[SANDBOX_RUNTIME_ERR]`, `[INFINITE_LOOP_DETECTED]`. Execution boundary catches runtime JavaScript exceptions and broken state bindings during live simulation and redirects them to Output Log.
- **UI Connection to Element Properties:** Live interactive stage reflecting evaluated element properties with responsive viewport sizing and user role context.

---

#### Panel 09: Project Settings
**Unreal Equivalent:** Project Settings  
**Priority:** MVP  
**Default Dock Zone:** Center (full-page modal or tabbed panel)  
**Shortcut:** `Ctrl+,`

**Description:**  
Global application configuration dashboard organized into settings categories.

**Settings Categories:**
- **General:** Application name, description, favicon, base URL, default language
- **SEO:** Title template, default meta description, OpenGraph defaults
- **Environment Variables:** Key-value store for API keys, secrets (masked), database URLs, with per-environment overrides (development, staging, production)
- **Theme & Design Tokens:** Global color palette, typography scale, default border-radius, shadow presets
- **Authentication:** Auth provider selection, OAuth config, session duration, MFA settings
- **Build & Framework:** Target framework (Next.js), optimization level, source map generation, bundle analysis
- **Keyboard Shortcuts:** Customizable shortcut editor
- **Editor Preferences:** Auto-save interval, grid snapping, default zoom level, panel collapse behavior

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Project manifest schema (`project.json`), environment variable dictionaries, framework compiler flags, design token root schemas.
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[CONFIG_SCHEMA_ERR]`, `[ENV_VAR_MISSING]`. Validates environment variable formats and compiler compatibility before saving.
- **UI Connection to Element Properties:** Form inputs and toggles that define root configuration affecting global cascading properties for all elements.

---

### CATEGORY C: DATA & INTEGRATION PANELS

---

#### Panel 10: Database Blueprint & Visual ER Modeler
**Unreal Equivalent:** — (Web-specific, no direct equivalent)  
**Priority:** MVP  
**Default Dock Zone:** Center (tabbed alongside Viewport and Blueprint)  
**Shortcut:** `Ctrl+Shift+E`

**Description:**  
A visual schema designer for modeling relational databases. Users create tables, define fields, and establish relationships by dragging wires between field ports.

**Core Features:**
- **Entity Table Cards:** Rounded cards representing each collection/table with title, field list, and connection ports
- **Field Editor:** Add/edit fields with type badge (String, Int, Float, Boolean, DateTime, JSON, Enum, Relation), constraints (PK, FK, Unique, Required, Default), and validation rules
- **Visual Relationship Wires:** Drag from a field port on one table to another to create FK relationships with cardinality badges (1:1, 1:N, N:M)
- **Migration Preview:** Tab showing the SQL migration that would be generated from the current schema
- **Mock Data Grid:** Spreadsheet-style tab to view, add, edit, and delete simulated records
- **Seed Data Import:** Import CSV or JSON as seed data
- **Index Manager:** Define compound indexes with visual drag-to-reorder
- **Schema Validation:** Real-time warnings for missing primary keys, orphaned relations, or type mismatches

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Relational schema contract (`database.ts`), collection definitions, field data types, primary/foreign key constraints, and relation cardinalities (1:1, 1:N, N:M).
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[DB_SCHEMA_ERR]`, `[CIRCULAR_RELATION_ERR]`, `[ORPHAN_FK_ERR]`. Evaluates foreign key integrity and field type compatibility.
- **UI Connection to Element Properties:** Database fields bind directly to UI component properties (e.g. connecting `Product.title` to a Text component's `text` property) via Data Binding Section.

---

#### Panel 11: API Blueprint & Integration Studio
**Unreal Equivalent:** — (Web-specific)  
**Priority:** MVP  
**Default Dock Zone:** Center or Bottom drawer (tabbed)  
**Shortcut:** `Ctrl+Shift+A`

**Description:**  
Visual workspace for configuring and testing external API integrations.

**Core Features:**
- **API Collection Cards:** Grouped by provider (Stripe, SendGrid, Custom) with provider logos
- **Endpoint Cards:** Per-route card showing HTTP method badge (GET/POST/PUT/PATCH/DELETE), URL, auth indicator
- **Request Builder:** Visual tree to construct headers, query parameters, path parameters, and JSON request bodies
- **Live Request Runner:** Execute API calls directly inside the editor; display formatted JSON response
- **Response Path Extractor:** Click any key in the JSON response tree to create an output pin on the API node
- **Environment Variable Binding:** Link API keys and base URLs to environment variables
- **Webhook Configuration:** Define incoming webhook endpoints and their expected payload shapes
- **Import from cURL / OpenAPI:** Paste a cURL command or upload an OpenAPI spec to auto-generate endpoint configurations

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** API endpoint contract (`api.ts`), HTTP method, request header/query/body schemas, and response payload JSON schemas.
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[API_SCHEMA_MISMATCH]`, `[ENDPOINT_TIMEOUT_ERR]`. Validates response schemas against connected element property expectations.
- **UI Connection to Element Properties:** Response payload path extractors map API output fields directly to component properties (e.g. `response.data.price` -> `ProductPrice.text`).

---

#### Panel 12: Authentication & RBAC Studio
**Unreal Equivalent:** — (Web-specific)  
**Priority:** MVP  
**Default Dock Zone:** Center or floating window

**Description:**  
Visual security architecture workspace for authentication flows and access control.

**Core Features:**
- **Auth Flow State Machine:** Visual diagram showing authentication states (Unauthenticated → Login → MFA Verify → Session Active → Dashboard)
- **Provider Configuration:** Visual setup for Credentials (email/password), OAuth (Google, GitHub, Discord), or Magic Link
- **Role Definition:** Create named roles (SuperAdmin, Editor, Customer, Guest) with descriptions
- **Permission Matrix:** Interactive grid mapping Roles × Permissions (e.g., Admin can "Delete Products", Customer cannot)
- **Route Gatekeeper:** Visual list of pages with drag-and-drop lock icons and required role assignment
- **Session Configuration:** Session duration, refresh token settings, "Remember Me" options

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Auth contract (`auth.ts`), role definitions, permission matrix, session tokens, and route guard rules.
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[AUTH_VIOLATION]`, `[ROUTE_GUARD_REJECT]`. Evaluates whether active user role satisfies required element visibility or page permissions.
- **UI Connection to Element Properties:** Security lock toggles directly control element conditional rendering properties (`isVisible`, `roleGuard`).

---

#### Panel 13: State Management & Data Binding Matrix
**Unreal Equivalent:** — (Web-specific)  
**Priority:** MVP  
**Default Dock Zone:** Right sidebar (tabbed with Details) or floating window

**Description:**  
Visual state variable manager and binding line visualizer.

**Core Features:**
- **Variable Manager:** Create, rename, and delete state variables with type badges; organized by scope (Global, Page, Component)
- **Default Value Editor:** Set initial values for each variable
- **Persistence Toggle:** Mark variables as persisted (localStorage/sessionStorage) or ephemeral
- **Binding Lines Visualizer:** Diagram showing data flow: State Variable → Computed Transform → Component Property
- **Two-Way Binding Toggle:** Enable bidirectional binding for form inputs
- **Computed Variables:** Define derived values computed from other variables (e.g., `cartTotal = sum(cartItems.price)`)
- **Usage Tracker:** Shows which components and blueprints reference each variable

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** State variable schema (`state.ts`), scope descriptors (Global, Page, Component), reactive atoms, computed variable expressions, and binding descriptors.
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[BIND_ERR]`, `[TYPE_COERCION_WARN]`. Evaluates type compatibility between state variables and target element properties (e.g. binding an array state to a boolean `disabled` property triggers an error).
- **UI Connection to Element Properties:** Visual matrix and dropdowns directly bind state atoms to component inputs with optional two-way binding.

---

### CATEGORY D: ANNOTATION & COLLABORATION PANELS

---

#### Panel 14: Whiteboard & Annotation Canvas
**Unreal Equivalent:** — (Atlassian Confluence Whiteboards inspired)  
**Priority:** Phase 2  
**Default Dock Zone:** Overlay on Viewport or floating window

**Description:**  
An infinite creative brainstorming surface for sketching ideas, planning features, and leaving visual notes directly on the application canvas.

**Core Features:**
- **Sticky Notes:** Color-coded digital sticky notes (yellow, blue, green, pink) with markdown text
- **Freehand Pencil:** Pressure-sensitive drawing for wireframe sketches and arrows
- **Text Annotations:** Rich text boxes with formatting
- **Shape Tool:** Rectangles, circles, rounded pills, arrows, lines
- **Wire Connectors:** Floating relationship arrows between annotations and components
- **Layer Toggle:** Show/hide annotation layer independently from application content
- **Export as Image:** Export annotation canvas as PNG/SVG for documentation

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Spatial annotation schema (sticky notes, vector strokes, markdown blocks, connector lines) anchored to canvas coordinates.
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[ANNOTATION_BOUNDS_ERR]`. Validates coordinate space transformations and serialization bounds.
- **UI Connection to Element Properties:** Floating relationship wires visually anchor notes and specs to specific UI element bounding boxes.

---

#### Panel 15: Comments & Review Panel
**Unreal Equivalent:** — (Figma Comments inspired)  
**Priority:** Phase 3  
**Default Dock Zone:** Right sidebar (tabbed) or floating window

**Description:**  
Team review and feedback system for commenting on specific UI components, blueprint nodes, or database fields.

**Core Features:**
- **Inline Comment Bubbles:** Pin comments directly to components in the Viewport or nodes in the Blueprint editor
- **Threaded Replies:** Each comment supports threaded conversation
- **Resolve/Reopen:** Mark comments as resolved; filter resolved vs. open
- **Comment List Panel:** Scrollable list of all comments across the project with navigation links
- **Mention System:** @mention team members for notification
- **Filter by Author:** Filter comments by who posted them

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Comment thread schema, author metadata, timestamp, resolved status, and anchor target IDs (`targetElementId`, `targetNodeId`).
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[COMMENT_ORPHAN_WARN]`. Evaluates whether target element still exists in the AST; if deleted, flags comment as orphaned and logs to Output Log.
- **UI Connection to Element Properties:** Canvas comment pins stay anchored to element bounding boxes and update position when element layout transforms change.

---

### CATEGORY E: CODE & DEVELOPMENT PANELS

---

#### Panel 16: Live Code Inspector
**Unreal Equivalent:** — (VS Code / Split Code View inspired)  
**Priority:** Phase 2  
**Default Dock Zone:** Center (tabbed alongside Viewport)  
**Shortcut:** `Ctrl+Shift+G`

**Description:**  
Read-only code viewer displaying the generated production source code. Supports bidirectional mapping between visual elements and code lines.

**Core Features:**
- **File Tabs:** Individual tabs for `page.tsx`, `route.ts`, `schema.prisma`, `styles.css`, `animation.ts`
- **Syntax Highlighting:** Full TypeScript/JSX/CSS/Prisma syntax highlighting
- **AST-to-Code Mapping:** Click a line of code → highlights corresponding Blueprint Node or Viewport component; click a node → highlights corresponding code
- **Read-Only with Copy:** Code is read-only to prevent Blueprint AST desync; copy button per block
- **Diff View:** Compare current generated code against last compiled version
- **Export as Repository:** One-click export of full project as a standalone Git repository
- **Line Numbers & Folding:** Standard code editor line numbers with section folding

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** AST code emitters (`ReactComponentEmitter`, `GSAPAnimationEmitter`, `StyleEmitter`, `PrismaSchemaEmitter`).
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[CODEGEN_INTEGRITY_ERR]`. Ensures generated TypeScript/CSS matches the validated AST contracts without syntax or semantic errors.
- **UI Connection to Element Properties:** Read-only syntax-highlighted code blocks with bidirectional AST cursor synchronization (clicking code highlights element properties, and vice-versa).

---

#### Panel 17: My Blueprint Panel
**Unreal Equivalent:** My Blueprint (inside the Blueprint Editor)  
**Priority:** MVP  
**Default Dock Zone:** Left sidebar (when Logic Blueprint is active)

**Description:**  
Dedicated sidebar showing all variables, functions, event dispatchers, and sub-graphs belonging to the currently open Blueprint graph. Mirrors Unreal's "My Blueprint" panel.

**Core Features:**
- **Variables Section:** List of all local variables with type badge, default value, and visibility (public/private)
- **Functions Section:** List of user-defined functions with input/output summary
- **Event Dispatchers Section:** List of custom events that other graphs can subscribe to
- **Graphs Section:** List of sub-graphs (event graph, construction/initialization, custom graphs)
- **Add New Buttons:** `+` button in each section to create new variables, functions, or dispatchers
- **Drag to Canvas:** Drag a variable from the list → auto-creates a Get or Set node on the Blueprint canvas
- **Inline Rename:** Double-click to rename
- **Context Menu:** Delete, Duplicate, Change Type, Toggle Visibility

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Local graph variable declarations, function definitions, event dispatchers, and sub-graph references.
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[SCOPE_SHADOW_WARN]`, `[UNUSED_VAR_WARN]`. Validates local variable scope and type uniqueness.
- **UI Connection to Element Properties:** Dragging variables onto canvas generates Get/Set nodes that directly read/write connected element properties.

---

### CATEGORY F: AI & INTELLIGENCE PANELS

---

#### Panel 18: AI Co-Pilot Assistant
**Unreal Equivalent:** — (Our core innovation)  
**Priority:** MVP  
**Default Dock Zone:** Right sidebar (tabbed) or floating window  
**Shortcut:** `Ctrl+Shift+I`

**Description:**  
Integrated intelligent assistant that generates, modifies, and diagnoses blueprints, components, and database schemas from natural language prompts.

**Core Features:**
- **Prompt Input Bar:** Floating conversational input with streaming response
- **Context Awareness:** AI automatically understands which panel is active, what is selected, and the current project state
- **Blueprint Generation:** Generates complete logic graph nodes and wires from prompts
- **UI Generation:** Creates component trees and page layouts from descriptions
- **Database Schema Generation:** Creates ER models from natural language
- **Motion Generation:** Creates GSAP timelines from descriptions ("make the hero fade in from below over 0.8 seconds")
- **Visual Blueprint Diff:** Proposed changes appear as translucent green (additions) and red (removals) on the canvas for approval
- **AI Diagnostic Mode:** When a runtime error occurs, "AI Diagnose" analyzes the error in context and suggests specific blueprint modifications
- **History Panel:** Log of all AI interactions and generations for reference
- **Approval Flow:** User must explicitly "Accept" or "Reject" AI-generated changes before they commit to the AST

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Prompt context assembler, AST mutation transaction commands, schema patch proposals.
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[AI_SCHEMA_VALIDATION_ERR]`, `[AI_DIFF_REJECTED]`. AI-proposed AST mutations are run through the Engine Compatibility Evaluator before committing; any illegal properties generated by AI are intercepted and logged.
- **UI Connection to Element Properties:** Translucent visual diffs on canvas and one-click "Apply to Selection" buttons modifying element properties safely.

---

### CATEGORY G: DEPLOYMENT & OPERATIONS PANELS

---

#### Panel 19: Deployment & Cloud Studio
**Unreal Equivalent:** — (Vercel Dashboard inspired)  
**Priority:** Phase 3  
**Default Dock Zone:** Center (full-page or tabbed)

**Description:**  
Production release dashboard for building, deploying, and managing hosted applications.

**Core Features:**
- **Build Pipeline Visualizer:** Step-by-step progress tracker: Validate AST → Compile Blueprints → Build React Bundle → Run DB Migrations → Deploy CDN → Update DNS
- **Provider Selector:** One-click target: Vercel, Docker Container, AWS ECS, Cloudflare Pages, Self-Hosted
- **Domain Manager:** Custom domain configuration, SSL certificate status, DNS records
- **Environment Selector:** Deploy to development, staging, or production
- **Deployment History:** List of all past deployments with status, timestamp, and 1-click rollback
- **Build Logs:** Real-time streaming build output
- **Health Dashboard:** After deployment, show uptime status, response time, and error rate

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Cloud provider manifests, build artifacts, environment secrets, and deployment configuration (`deploy.json`).
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[BUILD_COMPILE_ERR]`, `[DEPLOY_CONFIG_ERR]`. Pre-flight compiler pass checks that all element properties, bindings, and assets are valid and resolvable before initiating deployment.
- **UI Connection to Element Properties:** Build status indicators, live streaming deployment logs, and domain management.

---

### CATEGORY H: DEBUG & DIAGNOSTIC PANELS

---

#### Panel 20: Visual Execution Trace
**Unreal Equivalent:** Blueprint Debugger  
**Priority:** Phase 2  
**Default Dock Zone:** Bottom drawer (tabbed) or floating window

**Description:**  
Step-by-step visual execution trace of blueprint logic during Play Mode runtime.

**Core Features:**
- **Execution Timeline:** Chronological list of every node that executed during the last interaction
- **Status Badges:** ✓ (success, green), ✗ (error, red), ⏳ (pending/async, amber)
- **Payload Inspector:** Expand any executed node to inspect its input data, output data, and execution duration
- **Click-to-Navigate:** Click a trace entry to jump to and highlight the node in the Blueprint canvas
- **Wire Pulse Visualization:** Real-time animated pulses traveling along wires (powered by C++ Wasm PulseAnimator)
- **Breakpoint Support:** Pause execution at breakpoints and step forward node-by-node
- **Export Trace:** Save the full execution trace as JSON for debugging or sharing

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Real-time telemetry event stream, node execution timestamps, pin input/output data packets.
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[TRACE_OVERFLOW_WARN]`. Evaluates trace event buffer health and drops duplicate telemetry under heavy execution loads.
- **UI Connection to Element Properties:** Pulsing wires and step-by-step execution cards displaying how data flows into element properties during runtime.

---

#### Panel 21: Performance Profiler
**Unreal Equivalent:** Profiler / Statistics Panel  
**Priority:** Phase 3  
**Default Dock Zone:** Bottom drawer (tabbed)

**Description:**  
Performance analytics for the compiled application during Play Mode.

**Core Features:**
- **Render Time Chart:** Live chart of component render durations
- **Database Query Profiler:** List of all DB queries with execution time and query plan
- **API Latency Tracker:** Network request waterfall diagram
- **Bundle Size Analysis:** Treemap visualization of generated code bundle sizes
- **Memory Usage:** Live memory usage chart
- **Bottleneck Alerts:** Automatic warnings when queries exceed thresholds

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Frame render timings, layout reflow counters, CSS recalculation metrics, and GSAP tween execution costs.
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[PERF_BUDGET_EXCEEDED]`, `[LAYOUT_THRASH_WARN]`. Evaluates whether element animations or complex layouts cause frame drops (>16ms/frame).
- **UI Connection to Element Properties:** Performance charts highlighting which specific element properties or animation tracks are causing performance bottlenecks.

---

#### Panel 22: Blueprint Validation & Errors
**Unreal Equivalent:** Message Log / Map Check  
**Priority:** MVP  
**Default Dock Zone:** Bottom drawer (tabbed with Console)

**Description:**  
Real-time validation across all project blueprints, schemas, and configurations.

**Core Features:**
- **Issue List:** All validation issues across the entire project
- **Severity Levels:** Error (red, blocks compilation), Warning (amber, advisory), Info (blue, suggestion)
- **Issue Categories:** Missing Connections, Type Mismatches, Circular Dependencies, Missing DB Fields, Invalid API Config, Security Issues, Accessibility Issues
- **Click-to-Fix:** Clicking an issue navigates to the exact problematic element
- **Auto-Fix Suggestions:** Some issues include an "Auto-Fix" button (e.g., adding a missing default value)
- **Real-Time Updates:** Issues update live as the user edits blueprints and schemas

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Compile-time rule registry, AST graph integrity validator, circular reference detector, required property checker.
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[VALIDATION_FATAL]`, `[VALIDATION_WARNING]`. Central compiler check that scans all element properties, pins, and bindings across the entire project.
- **UI Connection to Element Properties:** Issue cards with severity badges and "Click-to-Fix" buttons that navigate directly to the invalid property in the Details Inspector.

---

### CATEGORY I: HISTORY & VERSIONING PANELS

---

#### Panel 23: Undo History
**Unreal Equivalent:** Undo History  
**Priority:** Phase 2  
**Default Dock Zone:** Left sidebar (tabbed with Outliner) or floating window  
**Shortcut:** `Ctrl+Shift+H`

**Description:**  
Chronological list of all editor actions with the ability to jump back to any point.

**Core Features:**
- **Action List:** Every edit (add component, move node, change property, wire connection, etc.) listed with timestamp
- **Jump to State:** Click any entry to restore the project to that exact point
- **Current Position Indicator:** Bold highlight showing which action state is currently active
- **Branching:** If the user undoes and then makes a new edit, the branched history is preserved
- **Action Grouping:** Rapid sequential edits to the same property are grouped as one entry

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Command pattern transaction log, immutable AST delta snapshots, reversible property mutation operations.
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[UNDO_STACK_CORRUPT]`. Validates snapshot consistency and rollback integrity.
- **UI Connection to Element Properties:** Chronological action list allowing instantaneous rollback of any element property modification.

---

#### Panel 24: Version Control & Snapshots
**Unreal Equivalent:** Revision Control / Source Control  
**Priority:** Phase 2  
**Default Dock Zone:** Floating window or tabbed panel

**Description:**  
Project versioning system for creating snapshots, comparing versions, and restoring previous states.

**Core Features:**
- **Manual Snapshots:** Create named snapshots (e.g., "Before checkout redesign")
- **Auto-Snapshots:** Automatic snapshots at configurable intervals (every 15 minutes by default)
- **Snapshot List:** Chronological list with name, timestamp, and size
- **Visual Diff:** Compare two snapshots side-by-side showing added/removed/modified components, nodes, fields
- **Restore:** Restore entire project to a previous snapshot
- **Branch Support:** Create named branches for experimental changes
- **Git Export:** Export snapshot as a Git commit to an external repository

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Project snapshot blobs, semantic AST diff models, Git tree commit representations.
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[SNAPSHOT_DIFF_ERR]`, `[BRANCH_MERGE_CONFLICT]`. Evaluates structural conflicts between snapshot versions.
- **UI Connection to Element Properties:** Side-by-side snapshot comparison highlighting added, deleted, or altered element properties with restore controls.

---

### CATEGORY J: NAVIGATION & SEARCH PANELS

---

#### Panel 25: Global Search (Find in Blueprints)
**Unreal Equivalent:** Find in Blueprints  
**Priority:** MVP  
**Default Dock Zone:** Floating modal (Command Palette style)  
**Shortcut:** `Ctrl+Shift+F`

**Description:**  
Search across every entity in the project: pages, components, blueprint nodes, variables, functions, database fields, API endpoints, state variables, and animation assets.

**Core Features:**
- **Fuzzy Search:** Type-ahead fuzzy matching with ranked results
- **Category Filters:** Filter by entity type (Pages, Components, Nodes, Variables, DB Fields, APIs)
- **Result Preview:** Each result shows type icon, parent context, and a 1-line preview
- **Click-to-Navigate:** Clicking a result opens the relevant panel and selects the entity
- **Replace (future):** Find-and-replace for variable names and string values
- **Recent Searches:** Quick access to last 10 search queries

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Inverted search index spanning all project entities, property names, variable IDs, and node titles.
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[SEARCH_INDEX_DESYNC]`. Ensures index is updated on every AST transaction.
- **UI Connection to Element Properties:** Type-ahead search bar with deep links jumping directly into the exact element property or blueprint pin.

---

#### Panel 26: Reference Viewer & Dependency Graph
**Unreal Equivalent:** Reference Viewer / Size Map  
**Priority:** Phase 3  
**Default Dock Zone:** Center (tabbed) or floating window

**Description:**  
Visual dependency graph showing how assets, components, blueprints, and database schemas reference each other.

**Core Features:**
- **Dependency Graph Canvas:** Interactive force-directed graph with nodes and edges
- **Forward References:** "This component uses: ProductCard, Button, CartState"
- **Backward References:** "This component is used by: Home Page, Product Page"
- **Highlight Chains:** Click a node to highlight all downstream dependencies
- **Orphan Detection:** Identify unused components, variables, or database fields
- **Size Map:** Visual treemap showing relative complexity/size of each asset

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Dependency graph registry mapping cross-references (Pages -> Components -> Blueprints -> Schemas -> Assets).
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[ORPHAN_ASSET_WARN]`, `[CIRCULAR_REF_ERR]`. Identifies unreferenced element properties, dead assets, and circular dependencies.
- **UI Connection to Element Properties:** Interactive node-link graph visualizing upstream and downstream connections for any selected element or asset.

---

### CATEGORY K: DESIGN SYSTEM PANELS

---

#### Panel 27: Design System & Token Manager
**Unreal Equivalent:** Material Instance Editor (conceptually)  
**Priority:** Phase 2  
**Default Dock Zone:** Right sidebar (tabbed) or floating window

**Description:**  
Central manager for the application's design tokens: colors, typography scale, spacing, shadows, and component variants.

**Core Features:**
- **Color Palette:** Named color tokens with swatches, hex values, and usage count
- **Typography Scale:** Font family assignments (heading, body, code), size scale, weight presets
- **Spacing Grid:** Named spacing values (xs, sm, md, lg, xl) with visual preview
- **Shadow Presets:** Named elevation levels with visual shadow preview
- **Border Radius Presets:** Named radius values with visual preview
- **Live Preview:** Changes to tokens instantly update all components using them
- **AI Theme Generator:** Describe a mood ("modern minimal fintech") and AI generates a complete token set
- **Export/Import:** Export tokens as CSS variables or JSON; import from Figma tokens

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Design token schema (`theme.ts`), color tokens, typography scales, spacing units, and CSS custom property bindings.
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[TOKEN_TYPE_MISMATCH]`, `[MISSING_TOKEN_REF]`. Ensures that tokens bound to element properties match expected types (e.g. color token to color property).
- **UI Connection to Element Properties:** Swatch palettes, typography controls, and token dropdown pickers embedded directly into Details Inspector sections.

---

### CATEGORY L: MARKETPLACE & PLUGINS

---

#### Panel 28: Marketplace & Template Store
**Unreal Equivalent:** Epic Games Marketplace  
**Priority:** Phase 4  
**Default Dock Zone:** Center (full-page)

**Description:**  
Community marketplace for browsing, purchasing, and installing shared assets.

**Core Features:**
- **Browse Categories:** Templates (Full Apps), Components (UI Kits), Blueprints (Logic Modules), Animations (Motion Presets), Integrations (API Connectors), Themes
- **Asset Cards:** Preview image, title, author, rating, download count, price (free/paid)
- **Search & Filter:** Full-text search with category, price range, and rating filters
- **Asset Detail Page:** Full description, screenshots, live demo, reviews, version history
- **1-Click Install:** Downloads asset and registers it in the project's Content Browser
- **Publisher Profile:** Developers can publish and manage their own assets

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Package manifest schema, component export packages, motion presets, and integration connector descriptors.
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[PACKAGE_COMPAT_ERR]`, `[ENGINE_VERSION_MISMATCH]`. Validates downloaded assets against current engine version and project schema.
- **UI Connection to Element Properties:** Storefront cards and one-click install that registers new component definitions with their associated property schemas into the project.

---

#### Panel 29: Plugin Manager
**Unreal Equivalent:** Edit > Plugins  
**Priority:** Phase 4  
**Default Dock Zone:** Floating window or Settings sub-panel

**Description:**  
Enable, disable, and configure installed plugins that extend the engine.

**Core Features:**
- **Plugin List:** All installed plugins with name, version, author, and description
- **Enable/Disable Toggle:** Per-plugin activation switch
- **Plugin Settings:** Per-plugin configuration panel (e.g., Stripe plugin: API key input)
- **Install from Marketplace:** Quick link to Marketplace for discovering new plugins
- **Plugin Dependency Graph:** Shows which plugins depend on other plugins

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Plugin manifest (`plug_*.json`), hook registrations, custom element archetype definitions, and extension points.
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[PLUGIN_SECURITY_VIOLATION]`, `[HOOK_EXEC_TIMEOUT]`. Sandboxes plugin execution and verifies custom property definitions.
- **UI Connection to Element Properties:** Plugin toggle switches and custom settings panels that inject new property fields into the Details Inspector.

---

### CATEGORY M: PAGE & ROUTING

---

#### Panel 30: Pages & Routing Manager
**Unreal Equivalent:** — (Web-specific, no game equivalent)  
**Priority:** MVP  
**Default Dock Zone:** Left sidebar (tabbed with Outliner) or floating window

**Description:**  
Visual page tree and routing configuration for the application's navigation structure.

**Core Features:**
- **Page Tree:** Hierarchical view of all pages with routes
- **Route Editor:** Edit path patterns (e.g., `/products/:id`), query params, and hash fragments
- **Navigation Flow Diagram:** Visual sitemap showing how pages link to each other
- **Route Guards:** Assign auth guards and role requirements per route
- **Redirect Rules:** Configure redirect mappings (e.g., `/old-path` → `/new-path`)
- **404 / Error Pages:** Configure custom error page assignments
- **Dynamic Routes:** Visual configuration for parameterized routes with path parameter extraction

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Route tree schema, URL path parameters, layout hierarchy, and page manifest contracts.
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[ROUTE_COLLISION]`, `[MISSING_LAYOUT_ERR]`. Validates path patterns against route collisions.
- **UI Connection to Element Properties:** Sitemap visualizer and route configuration forms that determine page-level root component properties.

---

### CATEGORY N: SPECIALIZED (OPTIONAL) PANELS

---

#### Panel 31: Localization & i18n Manager
**Unreal Equivalent:** Localization Dashboard  
**Priority:** Phase 4  
**Default Dock Zone:** Center (full-page) or floating window

**Description:**  
Internationalization management for multi-language applications.

**Core Features:**
- **Language Manager:** Add/remove supported languages
- **String Table:** Grid view of all translatable strings with columns per language
- **Auto-Detect Strings:** Scan all component text content and extract translatable strings
- **Translation Status:** Progress bars showing translation completeness per language
- **Import/Export:** Import/export translation files (JSON, CSV, XLIFF)
- **Preview in Language:** Switch the Viewport to render in a specific language

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** Translation dictionary schema, locale codes, text property keys, and interpolation variables.
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[I18N_MISSING_KEY]`, `[LOCALE_NOT_SUPPORTED]`. Detects untranslated text properties on element archetypes.
- **UI Connection to Element Properties:** Multi-column translation table where string values directly bind to element text properties in each locale.

---

#### Panel 32: Accessibility Audit Panel
**Unreal Equivalent:** — (Web-specific, no game equivalent)  
**Priority:** Phase 4  
**Default Dock Zone:** Bottom drawer (tabbed) or floating window

**Description:**  
Automated WCAG compliance checker that audits the application for accessibility issues.

**Core Features:**
- **WCAG Checklist:** Automated checks for WCAG 2.1 AA compliance
- **Issue Cards:** Each issue shows severity, affected component, rule violated, and remediation guidance
- **Contrast Checker:** Color contrast ratio calculator for text/background combinations
- **Screen Reader Simulation:** Preview how the page reads with ARIA attributes
- **Alt Text Audit:** Flag images missing alt text
- **Keyboard Navigation Test:** Verify tab order and focus management
- **Score Dashboard:** Overall accessibility score with category breakdowns

**Inside-Out Connection Architecture:**
- **Innermost Connection Settings & Contracts:** WCAG 2.1 AA ruleset, ARIA attribute specifications, color contrast mathematical formulas, and keyboard tab-index contracts.
- **Compatibility Evaluator & Output Log Diagnostic Channel:** `[A11Y_CONTRAST_FAIL]`, `[A11Y_MISSING_ALT]`, `[A11Y_INVALID_ARIA]`. Automatically evaluates element appearance and accessibility properties and logs violations to Output Log.
- **UI Connection to Element Properties:** Audit dashboard with compliance scores and "Auto-Fix" buttons that write recommended values directly into element accessibility properties.

---

## 4. Command Palette & Keyboard Shortcuts

In addition to panel-specific shortcuts, the platform provides:

### Command Palette (`Ctrl+P` or `Ctrl+Shift+P`)
A VS Code-style command palette that searches across:
- All panel toggle commands ("Toggle Outliner", "Open Blueprint Editor")
- All project entities (pages, components, variables)
- All editor actions ("Save Project", "Compile", "Deploy")
- All workspace presets ("Switch to Design Workspace")

### Global Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save Project |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+P` | Command Palette |
| `Ctrl+Shift+F` | Global Search |
| `Ctrl+Enter` | Toggle Play Mode |
| `Ctrl+B` | Compile / Build |
| `Delete` | Delete Selected |
| `Ctrl+D` | Duplicate Selected |
| `Ctrl+C` / `Ctrl+V` | Copy / Paste |
| `Ctrl+A` | Select All (context-dependent) |
| `Space` (held) | Pan Canvas |
| `Ctrl+Scroll` | Zoom Canvas |
| `Escape` | Deselect / Exit Play Mode |
| `Tab` | Open Action Palette (in Blueprint Editor) |
| `F2` | Rename Selected |
| `Ctrl+G` | Group Selected (in Blueprint Editor) |

---

## 5. Workspace Layout Presets

| Preset | Active Panels | Optimized For |
|--------|---------------|---------------|
| **Design** | Viewport, Outliner, Details, Content Browser | UI layout, styling, responsive design |
| **Logic** | Blueprint Editor, My Blueprint, Details, Console, Validation | Business logic, event wiring |
| **Data** | Database ER Modeler, API Studio, State Matrix, Console | Schema design, API integration, data binding |
| **Animation** | Viewport, Motion Sequencer, Details (Motion Section), Content Browser | Keyframe editing, GSAP timelines, ScrollTrigger |
| **Debug** | Viewport, Blueprint Editor, Execution Trace, Console, Validation | Runtime debugging, error tracing |
| **Deploy** | Deployment Dashboard, Console, Validation, Code Inspector | Build pipeline, deployment, code review |
| **Full Studio (Default)** | Viewport, Outliner, Details, Content Browser, Console | General-purpose balanced layout |

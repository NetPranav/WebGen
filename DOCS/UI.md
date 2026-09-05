# UI & WORKSPACE ARCHITECTURE SPECIFICATION

## Project Name: Visual Web Application Engine
**Internal Codename:** "Unreal Engine for Web Applications"  
**Document Version:** 1.0.0  
**Status:** Approved for Design & Interface Engineering  
**File Location:** `DOCS/UI.md`  

---

## 1. Executive Design Philosophy: "Confluence Canvas + Refined Unreal Shell"

The user interface of the Visual Web Application Engine synthesizes two paradigms:
1. **The Luminous, Infinite Whiteboard of Atlassian Confluence:** Clean, open, distraction-free creative workspace with an infinite dot-grid canvas and floating frosted-glass tool docks.
2. **The Ergonomic Power of Unreal Engine:** Professional IDE panels, dockable window management, hierarchical scene trees, contextual inspectors, multi-track animation timelines, and node-and-wire visual scripting.

Instead of the dark, dense, 1990s CAD-like aesthetic typical of traditional 3D game engines, our platform uses a **modern, refined light aesthetic** featuring soft rounded curves, generous padding, subtle elevation shadows, and clean typography.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🏗️ MyStore Application  •  Saved just now  [Avatars]  [▶ Play Mode]  [Compile / Build]  [Deploy] [Share] │
├──────────────────────────┬──────────────────────────────────────────────────────────────┬───────────────┤
│ APPLICATION OUTLINER     │                      APPLICATION VIEWPORT                    │ DETAILS PANEL │
│ (Collapsible Left Panel) │                                                              │ (Right Panel) │
│                          │  ┌────────────────────────────────────────────────────────┐  │               │
│ ├── Pages                │  │  DESKTOP FRAME (1440 x 900) - 100%                     │  │ ▾ Transform   │
│ │   ├── Home             │  │                                                        │  │   X: 120      │
│ │   └── Checkout         │  │   [ Hero Section ]                                     │  │   Y: 80       │
│ ├── Components           │  │   [ Product Grid ]                                     │  │   W: 320      │
│ │   ├── Button           │  │   [ Add to Cart ] ◄── (Selected Component)             │  │   H: 48       │
│ │   └── Card             │  │                                                        │  │               │
│ ├── Logic Blueprints     │  └────────────────────────────────────────────────────────┘  │ ▾ Layout      │
│ ├── Database Schemas     │                                                              │   Display:Flex│
│ └── API Endpoints        │  [ Undo / Redo ]                      [ Zoom: - 100% + ]     │   Gap: 16px   │
│                          │                                                              │               │
│                          │     ┌──────────────────────────────────────────────────┐     │ ▾ Styling     │
│                          │     │ FLOATING DOCK: Select | Pen | Text | Wire |      │     │   Bg: #3B82F6 │
│                          │     │ Shapes | Components | Assets | +                 │     │   Radius: 12px│
│                          │     └──────────────────────────────────────────────────┘     │ ▾ Bindings    │
├──────────────────────────┴──────────────────────────────────────────────────────────────┴───────────────┤
│ EXPANDABLE BOTTOM DRAWER:  [Content Browser]  [Logic Blueprint]  [GSAP Timeline]  [Console]  [AI Studio]│
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Visual Theme, Tokens & Styling Guidelines

### 2.1 Color Palette
* **Canvas Background:** `#FCFDFD` (Luminous Warm White)
* **Dot Grid Matrix:** `#E2E8F0` (Subtle Slate Dots, 24px spacing)
* **Panel Background:** `#FFFFFF` with `backdrop-filter: blur(20px)` and `rgba(255, 255, 255, 0.88)`
* **Active Surface / Hover:** `#F1F5F9` (Soft Slate)
* **Border Strokes:** `rgba(15, 23, 42, 0.08)` (Ultra-refined 1px micro-border)
* **Deep Text:** `#0F172A` (Slate 900)
* **Muted Text / Metadata:** `#64748B` (Slate 500)
* **Accent Primary:** `#3B82F6` (Electric Blue - Primary Actions & Active Pins)
* **Accent Success:** `#10B981` (Emerald - Live State & Database Links)
* **Accent Warning:** `#F59E0B` (Amber - Dirty State & Validation Notices)
* **Accent Error:** `#EF4444` (Rose - Failing Node & Debug Exceptions)

### 2.2 Wire & Pin Data-Type Color Taxonomy
To maintain instant readability across complex graphs, all connection wires and pins follow a strict color code:

| Data Type | Hex Color | Visual Appearance | Meaning |
| :--- | :--- | :--- | :--- |
| **Execution Flow** | `#0F172A` / `#FFFFFF` | Solid 3px with animated dash | Controls sequence/order of execution |
| **String** | `#E11D48` | Rose Magenta | Text, URLs, labels |
| **Number / Float** | `#06B6D4` | Cyan Blue | Quantities, prices, dimensions |
| **Boolean** | `#EA580C` | Coral Orange | True/False conditional gates |
| **Object / JSON** | `#F59E0B` | Warm Amber | Key-value payloads, config dictionaries |
| **Array / List** | `#EAB308` | Golden Yellow | Iterables, records lists, collections |
| **Database Record** | `#10B981` | Emerald Green | Live schema entities & query results |
| **Motion / Curve** | `#8B5CF6` | Vibrant Violet | Keyframes, easing curves, animations |
| **Event Trigger** | `#3B82F6` | Electric Blue | User clicks, hover, timers, webhooks |

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

## 3. Technology Stack for the UI Layer

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Core Framework** | **Next.js 15 / React 19** | High-performance component architecture, SSR/SSG, server actions, and fast client reconciliation. |
| **High-Performance Physics** | **C++ compiled to WebAssembly (Wasm)** | 120 FPS Hermite/Cubic Bezier curve solving, cable tension, Verlet spring physics, and pulse animation streams. |
| **Graphics & Rendering** | **HTML5 Canvas + WebGL + SVG** | Canvas/WebGL for C++ cable rendering; SVG and HTML DOM for crisp typography and accessible UI. |
| **Animation & Sequences** | **GSAP (GreenSock) + Flip Plugin** | Smooth timeline scrubbing, easing interpolation, and layout morphing during panel dock/undock. |
| **Styling Architecture** | **Vanilla CSS + Modern CSS Variables** | Bespoke design system avoiding rigid utility lock-in, with fluid curves, CSS grid layouts, and custom scrollbars. |
| **Icons & Assets** | **Lucide Icons + Custom Engine Vectors** | Minimalist 24px/16px vector icons for outliner items, tools, and node pins. |
| **State & AST Sync** | **Zustand + Immer** | Zero-latency reactive state store driving the project AST with full undo/redo history stacks. |

---

## 4. Comprehensive Screen Directory

The platform provides **17 dedicated screens/workspaces**, divided into:
1. **Unreal Engine Inspired Screens** (Adapted to full-stack web applications)
2. **Web Engine Specific Extra Screens** (Novel systems built specifically for web full-stack development)

---

### PART A: Unreal Engine Inspired Screens (Adapted to Web)

#### Screen 1: Application Viewport (Unreal "Level Viewport" Equivalent)
* **Description:** The central visual stage where developers view, select, and interact with the live application UI.
* **Core Capabilities:**
  * **Multi-Device Responsive Stage:** Instant toggle between Desktop (1440px), Tablet (768px), Mobile (375px), and Freeform Drag-Resize.
  * **Direct On-Canvas Manipulation:** Select components, drag-to-reorder, adjust padding/margin directly using on-canvas visual handles.
  * **Inline Content Editing:** Double-click any text element (e.g., headings, buttons) to edit content directly with live font rendering.
  * **Layout Visualizers:** Overlay bounding boxes, Flexbox flow direction arrows, and CSS Grid track outlines when hovering over parent containers.
  * **Responsive Breakpoint Inheritance:** Changes on Desktop cascade to Mobile unless explicitly overridden.

#### Screen 2: Application Outliner (Unreal "World Outliner" Equivalent)
* **Description:** The master tree hierarchy representing the entire application ecosystem.
* **Core Capabilities:**
  * **Unified Application Tree:** Displays Pages, Nested Components, Logic Blueprints, Database Collections, APIs, and Motion Assets.
  * **Visibility & Lock Toggles:** Eye icon to hide elements in the viewport; lock icon to prevent accidental modifications.
  * **Search & Type Filtering:** Instant fuzzy search filter (e.g., filter only Buttons, or only Database Collections).
  * **Drag-and-Drop Reparenting:** Drag a Card component into a Grid Container to immediately update DOM nesting.

#### Screen 3: Details & Properties Inspector (Unreal "Details Panel" Equivalent)
* **Description:** Context-aware inspector that dynamically updates based on the active selection (Component, Node, Database Field, or Animation Track).
* **Core Sections:**
  * **Transform:** X, Y coordinates, Width, Height, Aspect Ratio lock, Z-Index.
  * **Layout (Flex / Grid):** Direction (Row/Column), Justify Content, Align Items, Gap, Wrap, Padding, Margin.
  * **Appearance:** Solid Color, Linear/Radial Gradients, Glassmorphism blur slider, Border width/style/color, Corner radius (independent 4-corner controls), Box Shadow presets.
  * **Typography:** Font family selector, Font weight slider, Size, Line height, Letter spacing, Text alignment, Text transform.
  * **Data Bindings:** Connect component properties to State Variables, Database Query outputs, or API response values via a visual dropdown picker.
  * **Behavior & Event Triggers:** Visual list of bound events (`onClick`, `onHover`, `onFormSubmit`) with a "Open Blueprint" button.

#### Screen 4: Content & Asset Browser (Unreal "Content Browser" Equivalent)
* **Description:** The central repository for all project assets, modular components, and reusable templates.
* **Core Capabilities:**
  * **Folder-Based Navigation:** Structured directories for `UI/`, `Icons/`, `Images/`, `Blueprints/`, `Motion/`, `Database/`, and `Templates/`.
  * **Asset Cards with Live Previews:** Hovering over a UI component asset shows its rendered state; hovering over an animation asset plays a 2-second preview.
  * **Drag-to-Stage:** Drag any component or graphic asset directly from the Content Browser onto the Viewport or Blueprint canvas.
  * **Asset Importer:** Support for drag-and-drop import of SVGs, PNGs, WebP, Lottie JSON, and custom Google Font packages.

#### Screen 5: Logic Blueprint Editor (Unreal "Blueprint Visual Scripting" Equivalent)
* **Description:** The full-scale visual scripting workspace where application behavior, data manipulation, and workflows are wired together.
* **Core Capabilities:**
  * **Infinite Node Canvas:** High-performance panning and zooming with C++ Wasm-powered cable rendering.
  * **Node Action Palette:** Summoned by right-clicking or pressing `Tab`; searchable catalog of all events, branches, math, DB actions, and API calls.
  * **Pin Snapping & Cable Physics:** Dragging a pin simulates physical cable droop and spring tension; pins snap magnetically to compatible inputs.
  * **Type-Aware Wire Validation:** Wires turn red and disallow connection if types are incompatible (e.g., trying to plug a `String` into a `Boolean` port without a converter node).
  * **Comment Boxes:** Group related nodes inside resizable colored comment boxes (e.g., "Checkout Validation Flow").

#### Screen 6: Motion Blueprint & Sequencer (Unreal "Sequencer / Curve Editor" Equivalent)
* **Description:** Keyframe animation timeline built on the GSAP engine for choreographing micro-interactions and scroll experiences.
* **Core Capabilities:**
  * **Multi-Track Timeline:** Individual tracks for `Opacity`, `Transform X/Y`, `Scale`, `Rotation`, `Blur`, and `Color`.
  * **Keyframe Editor:** Click to place keyframes, drag to retime, and inspect easing curves.
  * **Cubic Bezier Easing Inspector:** Visual curve editor with interactive control handles (Power2, Power4, Elastic, Bounce, Custom Bezier).
  * **Playhead & Playback Controls:** Scrub bar with Play (▶), Pause (⏸), Loop (🔁), and Reverse (◀) buttons.
  * **ScrollTrigger Threshold Visualizer:** Mark Scroll start and end trigger points directly on the viewport canvas.

#### Screen 7: Output Log & Console (Unreal "Output Log" Equivalent)
* **Description:** Developer terminal and event stream recording engine compilation, network activity, and runtime diagnostics.
* **Core Capabilities:**
  * **Filter Channels:** Toggle logs by category: `All`, `Blueprint Events`, `Database Queries`, `API Traffic`, `Compiler`, `Errors`.
  * **Error Stack Traces:** Clicking an error jumps directly to the failing Blueprint Node or invalid component property.
  * **Query Timing Profiler:** Displays execution time for database queries and API calls (e.g., `DB: Query Products [12ms]`).

#### Screen 8: Play Mode / Preview Sandbox (Unreal "PIE - Play in Editor" Equivalent)
* **Description:** Instant zero-build interactive simulation of the application.
* **Core Capabilities:**
  * **Isolated Sandbox:** Runs the application in an interactive state where buttons click, forms submit, and data persists in local session storage.
  * **Live Execution Trace:** When an interaction happens in Play Mode, connection wires in the Logic Blueprint pulse with data packets in real time.
  * **Simulation Toolbar:** Switch user roles (Admin vs. Guest), trigger simulated network lag (Slow 3G, Offline), and toggle viewport dark/light themes.

#### Screen 9: Project Settings & Environment Studio (Unreal "Project Settings" Equivalent)
* **Description:** Global application configuration dashboard.
* **Core Capabilities:**
  * **General Settings:** Application name, favicon, base URL, default language, and SEO meta tags.
  * **Environment Variables & Secrets Vault:** Secure key-value store for API keys, Stripe secret keys, and database connection strings.
  * **Theme & Global Tokens:** Define global brand colors, default border radius, and base typography scale.

---

### PART B: Web Engine Specific Extra Screens (Beyond Unreal Engine)

#### Screen 10: Database Blueprint & Visual ER Modeler
* **Description:** A dedicated visual schema designer for modeling relational and document databases without writing SQL or migration scripts.
* **Core Capabilities:**
  * **Entity Cards:** Visual representation of tables/collections (`Users`, `Products`, `Orders`, `Reviews`).
  * **Field Manager:** Add fields with visual type badges (`String`, `Int`, `Float`, `DateTime`, `Boolean`, `JSON`, `Enum`).
  * **Constraint Toggles:** Set Primary Key (PK), Foreign Key (FK), Unique, Required, and Default values.
  * **Visual Relationship Cables:** Drag a wire from `Users.id` to `Orders.userId` to automatically establish a 1:N foreign key relationship.
  * **Mock Data Table Viewer:** Switch to "Data View" tab to inspect, add, edit, and delete simulated database records in a spreadsheet grid.

#### Screen 11: API Blueprint & Integration Studio
* **Description:** Visual workspace for configuring external third-party APIs (Stripe, Sendgrid, OpenAI, custom REST/GraphQL endpoints).
* **Core Capabilities:**
  * **Endpoint Node Cards:** Visual card per API route showing HTTP Method badge (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`), endpoint URL, and auth header.
  * **Parameter & Body Builder:** Visual tree to construct query params, route parameters, and JSON request bodies.
  * **Live Request Runner:** Test endpoints directly inside the editor and view formatted JSON response trees.
  * **Response Path Extractor:** Click any key in the JSON response (e.g., `data.customer.id`) to create an output pin on the API node for use in Logic Blueprints.

#### Screen 12: Atlassian-Style Whiteboard Canvas & Annotation Layer
* **Description:** The infinite creative brainstorming surface inspired directly by Confluence Whiteboards.
* **Core Capabilities:**
  * **Infinite Dot-Grid Stage:** Panning with zero boundary restrictions.
  * **Floating Confluence Pill Toolbar:**
    * **Pointer / Pan Hand:** Toggle between selection box and stage panning.
    * **Sticky Notes:** Place colorful digital sticky notes (`#FEF08A` Yellow, `#BFDBFE` Blue, `#BBF7D0` Green) for team tasks and specifications.
    * **Freehand Pencil:** Draw freehand sketches, wireframe outlines, and arrows directly on the canvas.
    * **Text Box (`Aa`):** Rich text annotations with markdown formatting.
    * **Wire Connectors:** Draw floating relationship arrows between blueprints, notes, and components.
    * **Shapes Tool:** Rectangles, rounded pills, circles, and containers.
    * **Components Drawer (`[]`):** Quick drop-in palette of UI building blocks.
    * **Asset Library (`+`):** Full asset browser drawer.
  * **Collaborator Presence:** Real-time colored user cursors with names.

#### Screen 13: Authentication & Role-Based Access Control (RBAC) Studio
* **Description:** Visual security architecture workspace to configure authentication flows and route protections.
* **Core Capabilities:**
  * **Auth Flow Diagram:** Visual state machine showing `Unauthenticated` ➔ `Login Screen` ➔ `MFA Verify` ➔ `Session Created` ➔ `Dashboard`.
  * **Role Permission Matrix:** Interactive table mapping User Roles (`SuperAdmin`, `Editor`, `Customer`, `Guest`) to permissions (`Create Product`, `Delete User`, `View Billing`).
  * **Route Gatekeeper:** Drag-and-drop lock icons onto pages in the Outliner to mark them as "Protected (Requires Role: Admin)".

#### Screen 14: Data-Binding & Reactive State Matrix
* **Description:** Visual mapping studio connecting state stores to UI component properties.
* **Core Capabilities:**
  * **State Variable Manager:** Define Global State (`currentUser`, `cartItemsCount`, `themeMode`), Page State, and Local Component State.
  * **Binding Lines Visualizer:** View a diagram of how state flows: `State Variable` ➔ `Computed Transform` ➔ `Component Property`.
  * **Two-Way Binding Toggles:** Enable two-way binding on form inputs (e.g., `Input Text` ⟷ `State.userEmail`).

#### Screen 15: Live Code Inspector & Diff Synchronizer
* **Description:** Side-by-side inspectable code view displaying the generated production code.
* **Core Capabilities:**
  * **Split-Pane Code Viewer:** Clean syntax-highlighted tabs for `page.tsx` (React Component), `route.ts` (Next.js API Handler), `schema.prisma` (Database Schema), and `styles.css`.
  * **Read-Only with Integrity Guards:** Prevents arbitrary text edits that would corrupt the Blueprint AST.
  * **Visual AST-to-Code Mapping:** Clicking a line of code highlights the corresponding Blueprint Node or Viewport Component, and vice-versa.
  * **Copy / Export:** One-click copy snippet or export as a full standalone Git repository.

#### Screen 16: AI Co-Pilot Assistant Studio
* **Description:** Integrated intelligent engine assistant that generates, modifies, and diagnoses blueprints visually.
* **Core Capabilities:**
  * **Floating Conversational Bar:** User prompts such as *"Build an order fulfillment workflow that verifies stock, charges Stripe, and sends an email."*
  * **Visual Blueprint Diff:** AI displays proposed changes as translucent green nodes (additions) and red nodes (removals) directly on the canvas for user approval.
  * **AI Diagnostic Drawer:** When an error occurs in Play Mode, clicking "AI Diagnose" highlights the broken node, explains the root cause in plain English, and offers a "Fix Blueprint" button.

#### Screen 17: Deployment & Cloud Infrastructure Studio
* **Description:** Production release dashboard.
* **Core Capabilities:**
  * **Pipeline Visualizer:** Step-by-step progress tracking: `Validate AST` ➔ `Compile Blueprints` ➔ `Build React Bundle` ➔ `Run Database Migrations` ➔ `Deploy CDN`.
  * **Target Deployment Providers:** One-click target selection: Vercel, Docker Container, AWS ECS, or Cloudflare Pages.
  * **Deployment History & Rollback:** List of historic builds with instant 1-click rollback.

---

## 5. Docking, Window Management & Workspace Presets

### 5.1 Docking Mechanics
* **Dock Zones:** Top, Left, Right, Bottom, and Center Tabbed Stacks.
* **Floating Windows:** Any panel can be undocked by dragging its header tab away from the dock boundary. Floating windows feature soft elevation shadows and 16px corner radiuses.
* **Collapsible Side Strips:** Clicking the collapse arrow (`<` or `>`) folds sidebars into a slim 36px icon strip, maximizing canvas workspace.
* **Resizable Splitters:** Splitter bars with subtle hover indicator lines allow fluid pixel-level resizing.

### 5.2 Workspace Layout Presets
Users can switch between tailored panel configurations using the top menu (`Window` ➔ `Workspaces`):

1. **Design Workspace:** Focus on Viewport, Outliner, and Details Panel (optimized for UI layout and styling).
2. **Logic Workspace:** Maximizes the Logic Blueprint Canvas with quick access to the Action Palette and Variable Store.
3. **Data Workspace:** Focus on Database ER Modeler, Schema Collections, and Mock Data Tables.
4. **Animation Workspace:** Viewport centered above the multi-track GSAP Sequencer and Easing Curve Editor.
5. **Debug Workspace:** Side-by-side Viewport and Logic Blueprint with the Output Console and Execution Trace profiler expanded.
6. **Full Studio (Default):** Balanced view with all panels docked in standard Unreal configuration.

---

## 6. Summary of Architectural Decisions

1. **Aesthetic Choice:** Confluence Whiteboard canvas paired with modern, curved Unreal dockable panels delivers a fresh, professional, and accessible user experience.
2. **Rendering Performance:** Critical wire curvature, cable physics, and execution pulses are driven by a **C++ WebAssembly Kernel** rendering to HTML5 Canvas/WebGL at 120 FPS.
3. **Application Shell:** Fully powered by **Next.js 15, React 19, and Vanilla CSS variables**, ensuring fast load times, modular component architecture, and native web platform integration.

---

## 7. CSS Modularity, Isolation & UI Swappability Architecture

### 7.1 The "One Element = One Styling Source" Principle
To prevent UI elements from getting "stuck" when styled by multiple conflicting sources (e.g. inline styles competing with global rules or cross-component class leaks):
1. **Single Styling Authority:** Every UI element in the engine is styled by exactly ONE stylesheet.
   - Global typography, resets, and custom scrollbars: `globals.css`
   - Reusable micro-animations: `animations.css`
   - All visual constants (colors, radii, shadows, fonts, transitions): `tokens.css`
   - Individual panels and screens: their own scoped stylesheet (e.g., `outliner.css`, `details.css`, `dock.css`).
2. **No Inline Styles:** Dynamic values (canvas panning X/Y, zoom ratio, splitter drag positions) are applied via CSS custom properties on the container element, NEVER hardcoded in `style="..."`.
3. **No Cross-Panel Style Leaks:** A stylesheet for the Outliner panel cannot style any element inside the Details panel or Toolbar.

### 7.2 Mandatory UI Code Commenting Standard
Every UI component file must begin with a standardized header block:
```typescript
/**
 * ============================================================================
 * [COMPONENT NAME]
 * ============================================================================
 * UI Element: [Specific UI element, e.g. Outliner Tree Node / Splitter Bar]
 * Screen / Scope: [Screen Name from PANELS.md, e.g. Panel 02: Application Outliner]
 * Role: [What this component does and renders]
 * Styling Source: [Path to the ONLY stylesheet controlling this component]
 * ============================================================================
 */
```

### 7.3 UI Swappability & Future Customization Protocol
Because the user may want to update the visual appearance, customize curves, tweak elevations, or switch themes:
1. **Zero Hardcoded Visuals:** No component or panel CSS file may use hardcoded hex codes, pixel border radii, or box shadows. All values must reference `var(--token-name)`.
2. **Global Visual Upgrades:** Any future visual change (changing the canvas tone, adjusting corner curvature from 16px to 24px, changing accent color) is performed **solely by updating `tokens.css`**.
3. **Panel Layout Upgrades:** If a specific panel's layout needs adjustment, only that panel's dedicated `.css` file is touched.
4. **Safety Verification:** When a token is updated in `tokens.css`, all 32 panels automatically reflect the change uniformly without CSS conflicts.


# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## Project Name: Visual Web Application Engine
**Internal Codename:** "Unreal Engine for Web Applications"  
**Document Version:** 1.0.0  
**Status:** Approved for Architecture & Specification  
**Target Platform:** Web Desktop (Chrome, Edge, Safari, Firefox)  
**Primary Tech Baseline:** Next.js / React / TypeScript + C++ WebAssembly (Physics & Splines)  

---

## 1. Executive Summary & Core Philosophy

### 1.1 The Vision
The **Visual Web Application Engine** is a professional development platform that allows engineers and creators to visually construct, animate, debug, and compile production-grade, full-stack web applications. 

It is **NOT** a simple drag-and-drop website builder (e.g., Wix, Squarespace, or basic visual page editors). It is an **Application Development Engine**.

### 1.2 Core Thesis
> *"If Unreal Engine allows a developer to visually construct a game through Actors, Components, Blueprints, Materials, Animation Timelines, Content Browser, World Outliner, Details panels, and visual workflows, this platform allows a user to visually construct a complete web application through UI Components, Logic Blueprints, Database Blueprints, API Blueprints, Motion Blueprints, Assets, Application Hierarchy, Properties, and visual workflows."*

### 1.3 Key Differentiators
1. **Application Architecture First:** The developer builds full-stack applications (Data Models, APIs, Logic Workflows, State, Authentication, Animations), not isolated web pages.
2. **Deterministic Blueprint AST as Single Source of Truth:** The visual node graph translates directly to a structured Abstract Syntax Tree (AST), which compiles into standard, clean, human-readable frontend and backend code.
3. **AI as an AST Co-Pilot (Not a Black Box):** AI does not generate unmaintainable, opaque blobs of code. AI generates and modifies structured Blueprint Nodes. The user visually inspects the generated wires, tweaks logic visually, and recompiles.
4. **Visual Execution Trace & Debugging:** Bugs, failing database constraints, and API errors light up directly on the node wires in real time with visual pulses, step-by-step traces, and AI diagnostics.
5. **Inside-Out Engine Construction (Core ➔ Compatibility ➔ Diagnostics ➔ UI):** Unlike fragile visual editors that build UI forms first and patch backend connections later, this engine enforces strict inside-out architecture. Foundational property schemas and track registries (`src/core/types/`) are established first; runtime compatibility evaluators (`src/core/engine/`) validate every connection; invalid attempts are routed as structured diagnostics to the Output Log (`[ANIM_COMPAT]`, `[BIND_ERR]`, `[PROP_ERR]`); and UI panels strictly reflect and command the validated core.

---

## 2. Unreal Engine to Web Application Engine Mapping

| Unreal Engine Concept | Web Application Engine Equivalent | Function in Platform |
| :--- | :--- | :--- |
| **Project (`.uproject`)** | **Application Project (`project.json`)** | Root container containing UI, logic graphs, database models, APIs, animations, assets, and deployment settings. |
| **Level Viewport** | **Application Viewport** | The live visual canvas where the application UI is placed, transformed, styled, and responsive breakpoints are previewed. |
| **World Outliner** | **Application Outliner** | Hierarchical tree representing the entire project structure: Pages, Components, Layouts, Database Collections, Logic Graphs, and APIs. |
| **Actor** | **Application Object** | A foundational entity with identity, properties, children, lifecycle hooks, local state, and event connectors. |
| **Actor Component** | **UI / Feature Component** | Reusable units adding behavior/styling (e.g., Auth Gate, Motion Trigger, Data Provider). |
| **Details Panel** | **Properties / Details Panel** | Contextual inspector for Transforms, CSS Layout (Flex/Grid), Visual Styling, Data Bindings, Events, and Animations. |
| **Blueprints (Visual Scripting)** | **Logic & API Blueprints** | Node-and-wire visual graphs executing business logic, branching, CRUD operations, and HTTP requests. |
| **Animation Sequencer / Timelines** | **Motion Blueprint (GSAP Engine)** | Keyframe timeline editor controlling transforms, opacity, easing curves, and scroll-triggers. |
| **Content Browser** | **Asset / Content Browser** | Asset management for UI components, logic functions, animations, graphics, DB models, and templates. |
| **Play in Editor (PIE)** | **Play / Preview Mode** | Sandboxed local runtime executing compiled blueprints with simulated local DB and mock API layers. |
| **Blueprint Debugger & Profiler** | **Execution Trace & Diagnostics** | Visual pulse on wires during execution showing data payloads, step-by-step traces, and error breakdowns. |

---

## 3. High-Level Technical Architecture

The architecture consists of three integrated layers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           1. PRESENTATION & IDE LAYER                       │
│  - Next.js / React UI Shell                                                 │
│  - Dockable Panel Manager (Outliner, Details, Content Browser, Console)     │
│  - Confluence-inspired Light Studio Whiteboard Canvas                       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 2. C++ WEBASSEMBLY (WASM) HIGH-PERFORMANCE CORE              │
│  - Hermite & Cubic Bezier Spline Solver (curved wire geometry)              │
│  - Cable Tension & Verlet Spring Physics (realistic wire dragging dynamics) │
│  - Wire Spatial Collision & Obstacle Routing                                │
│  - High-Frequency Wire Pulse Particle Animator (for Execution Tracing)      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 3. ENGINE CORE, AST COMPILER & RUNTIME LAYER                │
│  - Blueprint Graph Engine (DAG traversal, type checking, validation)        │
│  - Deterministic Compiler: AST ➔ React / Node / SQL / Prisma Code          │
│  - Live In-Memory Sandboxed Runtime (Play Mode)                             │
│  - AI Diagnostic & Generation Pipeline                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Detailed Subsystem Specifications

### 4.1 C++ WebAssembly (Wasm) Engine
* **Purpose:** Ensures the node connection wires, cable physics, bezier splines, and execution trace pulses render at 120 FPS without taxing the main JavaScript thread.
* **Core Responsibilities:**
  1. **Cubic Spline Mathematics:** Solves Hermite and Bezier spline control points, tangent vectors, and arc-length parameterization for all node connections.
  2. **Verlet Integration / Cable Physics:** Simulates real-world physical wire drape, elastic spring tension, and bounce when dragging connection pins between nodes.
  3. **Spatial Collision Routing:** Calculates routing trajectories to prevent wires from passing through unrelated node bodies.
  4. **Pulse Stream Buffer:** Calculates coordinate offsets for execution trace pulses traveling along wires during runtime debugging.

### 4.2 Application Outliner
* **Hierarchy:**
  ```text
  Application
  ├── Pages (Home, Product, Checkout, Dashboard)
  ├── Components (Button, Navbar, Modal, Card)
  ├── Logic Blueprints (AuthFlow, CartCalculation, StripeCheckout)
  ├── Database Schemas (Users, Products, Orders)
  ├── API Endpoints (StripePayment, SendgridMail)
  └── Motion Assets (HeroEntrance, CardHover, PageTransition)
  ```
* **Bidirectional Focus:** Clicking an element in the Outliner selects and focuses it in the Viewport or Blueprint canvas, and vice versa.

### 4.3 Logic Blueprint System
* **Wire Separation:**
  * **White Execution Wires:** Controls synchronous and asynchronous execution flow (`Exec In` ➔ `Exec Out`).
  * **Colored Data Wires:** Typed data flow (String = Magenta, Number = Cyan, Boolean = Maroon, DB Record = Emerald, Array = Yellow, Object = Orange).
* **Node Taxonomy:**
  * **Events:** `OnClick`, `OnHover`, `OnPageLoad`, `OnSubmit`, `OnTimer`.
  * **Control Flow:** `Branch (If/Else)`, `Switch`, `For Each Loop`, `Sequence`, `Delay`.
  * **Database CRUD:** `Create Record`, `Query Collection`, `Filter`, `Sort`, `Update Record`, `Delete Record`.
  * **APIs & Network:** `HTTP Request`, `Set Headers`, `Parse JSON`, `Catch Error`.
  * **State & Variables:** `Get Variable`, `Set Variable`, `Compute Expression`.
  * **Navigation & Feedback:** `Navigate To Page`, `Open Modal`, `Show Toast Notification`.

### 4.4 Database Blueprint & Data Modeler
* **Visual Entity-Relationship Modeling:**
  * Define collections/tables, fields, data types, primary keys, foreign keys, and indexes.
  * Define relationships (1:1, 1:N, N:M) visually by connecting collection ports.
* **Built-in Schema Validation:**
  * Required fields, regex patterns, minimum/maximum values, default values, and unique constraints.
* **Code Translation:** Compiles into standard Prisma schemas, SQL migrations, and TypeScript database client interfaces.

### 4.5 Motion Blueprint (GSAP Animation Engine)
* **Dedicated Animation Timeline:**
  * Keyframe track editor per component: `Position (X, Y)`, `Scale`, `Rotation`, `Opacity`, `Color`, `Blur`.
  * Visual Bezier curve editor for easing functions (`power2.out`, `elastic`, `bounce`, `back.out`).
  * ScrollTrigger visual controls: Start/End trigger thresholds, scrub duration, pin container, parallax multipliers.
* **Exportable Motion Assets:** Animations can be saved as reusable assets and dropped directly onto any component in the project.

### 4.6 Properties / Details Panel
Context-aware inspector that adapts to the currently selected object:
* **Transform:** X, Y, Width, Height, Z-Index, Constraints.
* **Layout:** Display mode (Flexbox, CSS Grid, Absolute), Gap, Padding, Margin, Alignment.
* **Appearance:** Background (Solid, Gradient, Glassmorphism), Border, Radius, Box Shadows.
* **Typography:** Font family, Weight, Size, Line height, Letter spacing, Text align.
* **Data Binding:** Direct visual link to State Variables, Database Queries, or API Response fields.
* **Event Handlers:** Quick links to open or create corresponding Logic Blueprints.

### 4.7 State Management & Data Binding
* **Reactive Variable Store:** Visual creation of Global, Page-level, and Component-level variables.
* **Direct UI Binding:** Dragging a data field (e.g., `Product.price`) onto a UI text component automatically generates the reactive binding without code.

### 4.8 Blueprint Compiler & Code Generation Pipeline
* **Compilation Pipeline:**
  $$\text{Visual AST} \xrightarrow{\text{Validation}} \text{Topological Sort} \xrightarrow{\text{Code Emitter}} \text{Production Bundle}$$
* **Clean Code Generation:**
  * **Frontend:** React 19 / Next.js with semantic HTML, Tailwind/Vanilla CSS, and GSAP.
  * **Backend:** Node.js API route handlers with request validation.
  * **Database:** Prisma ORM / SQL schema with type-safe queries.
* **Code View:** Developers can inspect generated code side-by-side with read-only integrity guards to prevent accidental out-of-sync edits.

### 4.9 Debugging & Visual Execution Trace
* **Real-Time Pulse Visualizer:** When an event fires, visual data pulses travel down the connection wires through each node.
* **Visual Node State Indicators:**
  * Green checkmark ($\checkmark$) = Node executed successfully with output payload displayed on hover.
  * Red cross ($\times$) = Node failed with exact exception, stack trace, and failing input.
* **AI Diagnostics:** One-click "AI Diagnose" button analyzes the failure in context and suggests direct wire/logic adjustments.

---

## 5. UI Ergonomics & Spatial Design Specification

*(Incorporating the Confluence Whiteboard canvas with the Modern Unreal Engine shell)*

### 5.1 The Canvas (Confluence Whiteboard Model)
* **Background:** Luminous crisp white (`#FCFDFD`) with subtle dot-grid matrix (`#E2E8F0`, 24px grid spacing).
* **Navigation:** Infinite pan (Middle-click or Space+Drag) and smooth zoom (10% to 300%).
* **Floating Atlassian-Style Bottom Dock:**
  * Center-bottom floating pill with frosted glass effect (`backdrop-filter: blur(16px)`).
  * Quick access tools: Pointer / Pan Hand, Annotation / Sticky Note, Pencil, Text (`Aa`), Spline Wire Tool, Shape Generator, Components Library, Asset Drawer, and New Asset (`+`).
* **Floating Canvas Utilities:**
  * Bottom-Left: Undo / Redo pill.
  * Bottom-Right: Zoom controls (`+`, percentage readout, `-`).
  * Top-Left: Project breadcrumb navigation (`🏗️ System Architecture` / Project Name), "Edited just now" status.
  * Top-Right: Collaborator presence, [▶ Play / Preview], [Build], [Share].

### 5.2 The Shell (Modernized Curved Unreal Layout)
* **Panel Design Language:**
  * Modern, soft curvatures (`border-radius: 16px` on floating windows and dock headers).
  * Refined 1px borders (`rgba(0, 0, 0, 0.07)`) with soft ambient occlusion shadows (`box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05)`).
* **Docking Mechanics:**
  * **Left Panel:** Collapsible Application Outliner.
  * **Right Panel:** Collapsible Details / Properties Inspector.
  * **Bottom Panel:** Expandable Drawer with tabbed views (Content Browser, Logic Blueprint, GSAP Timeline, Output Console).
  * All panels support docking, snapping, undocking to floating windows, and smooth collapse to edge tabs.

---

## 6. Project Serialization Specification (`project.json`)

Every application project is completely portable and represented as a declarative JSON file:

```json
{
  "$schema": "https://visual-engine.dev/schemas/project-v1.json",
  "id": "proj_98a7df8a",
  "name": "ECommerceStore",
  "version": "1.0.0",
  "settings": {
    "framework": "nextjs",
    "styling": "vanilla-css",
    "theme": "light"
  },
  "pages": [
    {
      "id": "page_home",
      "name": "Home",
      "route": "/",
      "rootComponentId": "comp_root_01"
    }
  ],
  "components": [
    {
      "id": "comp_btn_checkout",
      "name": "CheckoutButton",
      "type": "Button",
      "properties": {
        "text": "Complete Purchase",
        "variant": "primary",
        "disabled": false
      },
      "bindings": {
        "disabled": "state.isProcessing"
      },
      "events": {
        "onClick": "graph_checkout_flow"
      }
    }
  ],
  "graphs": [
    {
      "id": "graph_checkout_flow",
      "name": "Checkout Workflow",
      "type": "logic",
      "nodes": [
        {
          "id": "node_01",
          "type": "events/onClick",
          "position": { "x": 100, "y": 200 },
          "data": { "target": "comp_btn_checkout" }
        },
        {
          "id": "node_02",
          "type": "database/createRecord",
          "position": { "x": 420, "y": 200 },
          "data": { "collection": "Orders" }
        }
      ],
      "edges": [
        {
          "id": "edge_01",
          "fromNode": "node_01",
          "fromPort": "execOut",
          "toNode": "node_02",
          "toPort": "execIn",
          "type": "execution"
        }
      ]
    }
  ],
  "database": {
    "collections": [
      {
        "id": "col_orders",
        "name": "Orders",
        "fields": [
          { "name": "id", "type": "string", "primaryKey": true },
          { "name": "userId", "type": "string", "required": true },
          { "name": "amount", "type": "number", "required": true },
          { "name": "status", "type": "string", "default": "pending" }
        ]
      }
    ]
  }
}
```

---

## 7. MVP Milestones & The First "Magic Moment"

### The First Magic Moment Test
The MVP is complete when the following end-to-end user loop succeeds:
1. User creates a new project.
2. User visually constructs or prompts AI to generate a **Product Dashboard**.
3. UI (Product Table + "Add Product" Modal) is visually placed on the Viewport.
4. Database Schema (`Product`: `id`, `name`, `price`, `stock`) is visually created.
5. Logic Blueprint connects `Modal Submit` ➔ `Database Create Record` ➔ `Refresh Product List`.
6. User clicks **▶ Play / Preview**.
7. User fills out the modal, adds a product, and watches the product appear in the live table.
8. User inspects the visual execution trace, changes a node parameter, and observes the live runtime update instantly.

### Implementation Phases

* **Phase 1: Foundations & Shell**
  * Next.js application scaffold with Atlassian-style dot-grid canvas.
  * Dockable, curved panel layout (Outliner, Details, Bottom Drawer).
  * Project AST data store and serialization.
* **Phase 2: High-Performance C++ Wasm Kernel**
  * C++ spline solver and cable tension physics compiled to WebAssembly.
  * Canvas-based 120 FPS curved wire renderer with drag-and-drop pin snapping.
* **Phase 3: Logic Blueprint & Node Engine**
  * Interactive node canvas: Events, Control Flow, Variables, and Actions.
  * Wire connection validation and type safety.
* **Phase 4: Database Modeler & Data Binding**
  * Visual entity-relationship builder.
  * Drag-and-drop data binding from schemas to UI components.
* **Phase 5: Motion Blueprint & Timeline**
  * GSAP-driven keyframe editor and preview system.
* **Phase 6: Play Mode Runtime & Visual Trace**
  * In-browser live execution sandbox with animated wire execution pulses.
* **Phase 7: Blueprint Compiler & Code Generation**
  * Exportable Next.js + Node + Prisma code generation with side-by-side Code View.

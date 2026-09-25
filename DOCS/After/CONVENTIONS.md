# NAMING, CODING & FILE CONVENTIONS

> **⚠️ Full-vision track. Not the active roadmap; see DOCS/Initial/ROADMAP.md.**

## Project Name: Visual Web Application Engine
**Internal Codename:** "Unreal Engine for Web Applications"  
**Document Version:** 1.0.0  
**Status:** Production-Ready Reference  
**File Location:** `DOCS/CONVENTIONS.md`  

---

## 1. Purpose

This document defines the strict naming, coding, file, and organizational conventions for the entire project. Following these conventions ensures:
- Consistent codebase across all contributors
- Predictable file locations for both humans and AI
- Clean serialization and deserialization of user project data
- Reliable compilation from visual representations to generated code

---

## 2. Engine Codebase Conventions (Developer Code)

### 2.1 File & Directory Naming

| Entity | Convention | Example |
|--------|-----------|---------|
| **Directories** | `kebab-case` | `content-browser/`, `api-studio/`, `undo-history/` |
| **React Components** | `PascalCase.tsx` | `BlueprintCanvas.tsx`, `NodeCard.tsx`, `OutlinerTree.tsx` |
| **Hooks** | `camelCase` starting with `use` | `useProjectStore.ts`, `useEditorStore.ts` |
| **Utility/Service Files** | `PascalCase.ts` | `ASTManager.ts`, `BlueprintCompiler.ts`, `SearchIndexer.ts` |
| **Type/Schema Files** | `camelCase.ts` | `project.ts`, `graph.ts`, `component.ts`, `database.ts` |
| **CSS Files** | `kebab-case.css` | `globals.css`, `tokens.css`, `whiteboard.css`, `nodes.css` |
| **Test Files** | `*.test.ts` or `*.test.tsx` | `ASTManager.test.ts`, `TypeChecker.test.ts` |
| **C++ Headers** | `PascalCase.hpp` | `SplineSolver.hpp`, `CablePhysics.hpp` |
| **C++ Source** | `PascalCase.cpp` | `SplineSolver.cpp`, `CablePhysics.cpp` |
| **C++ Test Files** | `*.test.cpp` | `SplineSolver.test.cpp` |

### 2.2 TypeScript / React Conventions

```typescript
// Component file structure
// 1. Imports (external → internal → types → styles)
// 2. Types & Interfaces
// 3. Constants
// 4. Component definition (named export)
// 5. Helper functions (if any)

// Example:
import React, { useState, useCallback } from 'react';
import { useProjectStore } from '@/core/store/useProjectStore';
import type { ComponentInstance } from '@/core/types/component';
import './NodeCard.css';

interface NodeCardProps {
  nodeId: string;
  position: { x: number; y: number };
  onSelect: (nodeId: string) => void;
}

export const NodeCard: React.FC<NodeCardProps> = ({ nodeId, position, onSelect }) => {
  // Component implementation
};
```

**Rules:**
- All React components use **named exports**, never default exports
- All components use **function components** with `React.FC<Props>` typing
- State stores use **Zustand** with **Immer** middleware for immutable updates
- All IDs use **UUID v4** format (e.g., `comp_a8f7d3e1`)
- All timestamps use **ISO 8601** format (e.g., `2026-09-05T18:00:00Z`)
- Prefer `const` over `let`; never use `var`
- Use `async/await` over `.then()` chains

### 2.3 CSS Conventions

```css
/* Use CSS custom properties (variables) for ALL design tokens */
:root {
  --color-canvas-bg: #FCFDFD;
  --color-panel-bg: #FFFFFF;
  --color-border: rgba(15, 23, 42, 0.08);
  --color-text-primary: #0F172A;
  --color-text-muted: #64748B;
  --color-accent-primary: #3B82F6;
  
  --radius-panel: 16px;
  --radius-card: 12px;
  --radius-button: 8px;
  
  --shadow-float: 0 12px 36px -4px rgba(15, 23, 42, 0.08);
  --shadow-dock: 0 0 0 1px rgba(15, 23, 42, 0.06);
  
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
}

/* Component CSS uses BEM-inspired class naming */
.node-card { }
.node-card__header { }
.node-card__pin { }
.node-card__pin--input { }
.node-card__pin--output { }
.node-card--selected { }
.node-card--error { }
```

**Rules:**
- All colors, radii, shadows, fonts, and spacing values come from CSS variables
- Component-scoped styles use BEM naming: `.block__element--modifier`
- No inline styles except for dynamic values computed at runtime (positions, transforms)
- All animations use `transition` or `@keyframes` with CSS variables for timing
- Responsive breakpoints: `--bp-mobile: 375px`, `--bp-tablet: 768px`, `--bp-desktop: 1440px`

### 2.3.1 CSS Modularity & Isolation Rules (CRITICAL)

> **NOTE:** The UI design is subject to change during development. The user may update colors, curvatures, shadows, spacing, or entire visual themes at any time. The CSS architecture MUST support this without cascading breakage.

**One Element = One Styling Source:**
- Every UI element must receive its visual styles from **exactly one CSS class** (via BEM). Never apply multiple competing classes that set the same property on the same element.
- If two CSS rules could conflict on the same element, merge them into a single BEM class or use a modifier.
- **Bad:** `<div class="panel dock-left sidebar-wide">` where all three set `width` and `background`.
- **Good:** `<div class="dock-panel dock-panel--left dock-panel--wide">` where `dock-panel` is the base, and modifiers override specific props.

**File-Per-Component Isolation:**
- Each panel/component directory MAY contain its own `.css` file for styles specific to that panel.
- Panel-specific CSS files must only target classes prefixed with that panel's BEM block name.
- **Example:** `outliner/outliner.css` must only contain rules starting with `.outliner`, `.outliner__`, or `.outliner--`.
- Global token overrides (`--color-*`, `--radius-*`, etc.) should NEVER be redefined in panel CSS. Override only via CSS variable reassignment on a scoped parent.

**Token-Only Values (No Magic Numbers):**
- Every color value → must be a `var(--color-*)` reference
- Every radius value → must be a `var(--radius-*)` reference
- Every shadow value → must be a `var(--shadow-*)` reference
- Every spacing value → must be a `var(--space-*)` reference
- Every font family → must be a `var(--font-*)` reference
- **Exception:** Dynamic layout values (node X/Y positions, splitter pixel offsets) may use computed values.

**Swappable Theme Architecture:**
- All visual identity lives in `tokens.css`. To change the entire look-and-feel (e.g., switch from white theme to dark theme, or change the curve style from 16px to 8px radius), only `tokens.css` should need modification.
- No component CSS file should contain hardcoded hex colors, pixel radii, or font names.

### 2.3.2 Code Commenting Convention (MANDATORY)

Every `.tsx` component file MUST begin with a comment block identifying:
1. **Which panel/screen** this component belongs to (referencing PANELS.md panel number)
2. **What it does** in one sentence
3. **UI responsibility** — what visual element it renders

```tsx
/**
 * ============================================================
 * PANEL 02: Application Outliner
 * ============================================================
 * Renders the hierarchical tree view of all project entities
 * (pages, components, blueprints, database, APIs, animations).
 *
 * UI: Left sidebar tree with expand/collapse, icons, and search.
 * CSS: src/editor/panels/outliner/outliner.css
 * ============================================================
 */
```

Every `.css` file MUST begin with a comment block identifying:
1. **What component/panel** this stylesheet serves
2. **Which tokens** it depends on (color, radius, shadow categories)

```css
/**
 * ============================================================
 * STYLESHEET: Outliner Panel (Panel 02)
 * ============================================================
 * Styles for the Application Outliner tree view.
 * Depends on: --color-*, --radius-card, --font-sans, --space-*
 *
 * NOTE: Do NOT hardcode any colors or radii in this file.
 * All values must reference tokens.css variables.
 * ============================================================
 */
```

> **IMPORTANT NOTE FOR FUTURE UI CHANGES:**
> If the visual design needs to be updated (new color palette, different curvatures, alternative typography), the change process is:
> 1. Modify ONLY `tokens.css` for global changes
> 2. Modify the specific panel's `.css` file for panel-specific layout changes
> 3. Never modify multiple CSS files for a single visual property change
> 4. If a change requires touching more than 2 CSS files, it means the token system is incomplete — add the missing token to `tokens.css` first

### 2.4 Import Path Aliases

```json
// tsconfig.json paths
{
  "paths": {
    "@/core/*": ["src/core/*"],
    "@/editor/*": ["src/editor/*"],
    "@/compiler/*": ["src/compiler/*"],
    "@/runtime/*": ["src/runtime/*"],
    "@/ai/*": ["src/ai/*"],
    "@/wasm/*": ["wasm/dist/*"]
  }
}
```

### 2.5 Commit Message Convention

Follow **Conventional Commits** format:

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `refactor` — Code change that neither fixes a bug nor adds a feature
- `style` — CSS/visual changes
- `docs` — Documentation changes
- `test` — Adding or updating tests
- `chore` — Build, tooling, dependency updates
- `perf` — Performance improvement
- `wasm` — C++ WebAssembly changes

**Scopes:** `core`, `editor`, `compiler`, `runtime`, `ai`, `wasm`, `viewport`, `blueprint`, `database`, `motion`, `panels`, `docs`

**Examples:**
```
feat(blueprint): add wire reroute node for cleaner graph routing
fix(compiler): resolve circular dependency detection false positive
wasm(spline): optimize cubic Hermite tangent calculation
docs(panels): add Panel 27 Design System specification
```

---

## 3. User Project Data Conventions (Application Files)

### 3.1 File Extension Registry

| Extension | Purpose | Example |
|-----------|---------|---------|
| `project.json` | Root project manifest | `project.json` |
| `*.page.json` | Page layout tree | `home.page.json` |
| `*.component.json` | Reusable component definition | `Button.component.json` |
| `*.bp.json` | Logic blueprint graph | `CheckoutWorkflow.bp.json` |
| `*.motion.json` | Motion/animation timeline | `HeroEntrance.motion.json` |
| `*.api.json` | API integration configuration | `StripePayments.api.json` |
| `*.seed.json` | Database seed data | `users.seed.json` |
| `*.state.json` | State variable definitions | `global.state.json` |
| `*.responsive.json` | Per-breakpoint layout overrides | `home.responsive.json` |
| `schema.json` | Database schema definition | `database/schema.json` |
| `auth.json` | Authentication configuration | `config/auth.json` |
| `theme.json` | Design token definitions | `config/theme.json` |
| `env.json` | Environment variables | `config/env.json` |
| `routes.json` | Route definitions | `config/routes.json` |
| `*.snapshot.json` | Version snapshot | `2026-09-05T18-00-00.snapshot.json` |

### 3.2 ID Generation Convention

All entity IDs follow the pattern: `<type_prefix>_<8-char-hex>`

| Entity Type | Prefix | Example |
|-------------|--------|---------|
| Project | `proj_` | `proj_98a7df8a` |
| Page | `page_` | `page_f3d1a92b` |
| Component Instance | `comp_` | `comp_7e4b2c1d` |
| Component Definition | `cdef_` | `cdef_a1b2c3d4` |
| Graph | `graph_` | `graph_5a8c3e7f` |
| Node | `node_` | `node_2d4f6a8b` |
| Edge/Wire | `edge_` | `edge_1c3e5a7b` |
| Pin | `pin_` | `pin_9d2f4e6a` |
| Collection/Table | `col_` | `col_b4d6e8a1` |
| Field | `field_` | `field_3c5e7a9b` |
| Relation | `rel_` | `rel_8a6c4e2d` |
| API Integration | `api_` | `api_f1d3b5a7` |
| Endpoint | `ep_` | `ep_2e4c6a8d` |
| Motion Timeline | `motion_` | `motion_7b9d1f3a` |
| State Variable | `var_` | `var_4a6c8e2f` |
| Snapshot | `snap_` | `snap_d2e4f6a8` |
| Plugin | `plug_` | `plug_1a3c5e7d` |
| Comment | `cmt_` | `cmt_b4d6f8a2` |

### 3.3 Naming Guidelines for User-Created Entities

| Entity | Convention | Good Examples | Bad Examples |
|--------|-----------|---------------|-------------|
| Pages | `kebab-case` directory name | `product-details/`, `user-profile/` | `ProductDetails/`, `user profile/` |
| Components | `PascalCase` directory name | `Button/`, `ProductCard/`, `DataTable/` | `button/`, `product-card/` |
| Blueprints | `PascalCase` with descriptive name | `CheckoutWorkflow.bp.json` | `bp1.bp.json`, `logic.bp.json` |
| Motion Assets | `PascalCase` with descriptive name | `HeroEntrance.motion.json` | `anim1.motion.json` |
| State Variables | `camelCase` | `currentUser`, `cartTotal`, `isLoading` | `CurrentUser`, `cart_total` |
| Database Collections | `PascalCase` plural | `Users`, `Products`, `OrderItems` | `user`, `product_items` |
| Database Fields | `camelCase` | `firstName`, `createdAt`, `isActive` | `FirstName`, `created_at` |

---

## 4. AST Serialization Rules

### 4.1 JSON Formatting
- All project JSON files use **2-space indentation**
- All keys use **camelCase** (never snake_case or PascalCase)
- Arrays of objects are formatted with one object per line when objects are small; multi-line when objects have nested properties
- No trailing commas
- No comments in JSON (use adjacent `.md` documentation files for explanations)

### 4.2 Schema Versioning
Every project JSON file includes a `$schema` field pointing to the schema version:
```json
{
  "$schema": "https://visual-engine.dev/schemas/project-v1.json",
  "version": "1.0.0"
}
```

When breaking changes occur to the schema format, the version number increments and a migration script is provided.

### 4.3 Null vs. Absent
- Use `null` for explicitly empty optional fields that have semantic meaning (e.g., `"layoutRef": null` means "no shared layout")
- Omit the key entirely for truly optional fields that haven't been configured yet
- Required fields must always be present; the compiler rejects files with missing required fields

---

## 5. Error Message Convention

All error messages follow the pattern:
```
[CATEGORY] [CODE]: Human-readable description

  at <location>
  
  Suggestion: <actionable fix>
```

**Categories:** `COMPILE`, `VALIDATE`, `RUNTIME`, `TYPE`, `WIRE`, `DB`, `API`, `AUTH`, `MOTION`

**Examples:**
```
[TYPE] T001: Cannot connect String output to Number input
  at graph_checkout_flow → node_03 (Get Product) → pin "price"
  Suggestion: Add a "Parse Number" node between these pins

[DB] D003: Required field "amount" has no value or binding
  at col_orders → field "amount"
  Suggestion: Connect a data wire to the "amount" input pin on the Create Record node

[VALIDATE] V012: Circular dependency detected in logic graph
  at graph_checkout_flow → node_05 → node_02 → node_05
  Suggestion: Break the cycle by removing one of the connections
```

---

## 6. Git & Version Control Rules

### 6.1 `.gitignore` for User Projects
```gitignore
# Never commit these directories
saved/
generated/
node_modules/
.env.local

# Never commit compiled Wasm (rebuild from source)
wasm/dist/
```

### 6.2 `.gitignore` for Engine Codebase
```gitignore
node_modules/
.next/
out/
wasm/dist/
*.wasm
.env.local
.env.production
coverage/
```

### 6.3 Branch Strategy
- `main` — Stable, production-ready code
- `develop` — Active development integration branch
- `feature/<name>` — Individual feature branches
- `fix/<name>` — Bug fix branches
- `docs/<name>` — Documentation updates

---

## 7. Inside-Out Engine Development Law (Core → Compatibility → Diagnostics → UI)

### 7.1 The Axiom: Build From the Inside Out
Never build visual editor controls or UI panels before the underlying data contracts, connection settings, and runtime compatibility validators exist. Features MUST be constructed in strict inside-out order:

```
[Layer 1: Core Type Contracts & Schemas (Innermost)]
   └── Defines pure data models, property keys, animation track types, and connection interfaces in `src/core/types/`.
         │
         ▼
[Layer 2: Engine Runtime & Compatibility Validators (Middle Wrapper)]
   └── Evaluates whether property, animation, or data binding connections are valid for the given element archetype.
         │
         ▼
[Layer 3: Diagnostic Bus & Output Log Integration]
   └── If an element cannot accept a property, animation sample, or binding, emits a structured error/warning to the Output Log (`[ANIM_COMPAT]`, `[PROP_MISMATCH]`, `[BIND_ERR]`).
         │
         ▼
[Layer 4: UI Presentation & Details Inspector (Outermost)]
   └── Visual controls, sliders, keyframe timelines, and archetype badges that reflect and command Layers 1–3.
```

### 7.2 Incompatible Connection Handling
Whenever an animation sample, transition track, or data source is attached to an element:
1. **Compatibility Check**: The validator evaluates whether the target element's archetype supports that property track.
2. **Error Logging**: If incompatible, the engine MUST NOT silently fail or crash. It MUST emit an error directly to the **Output Log** with actionable context (element ID, archetype, requested track, suggestion).
3. **UI Reflection**: The UI highlights the incompatible connection with an error state badge.


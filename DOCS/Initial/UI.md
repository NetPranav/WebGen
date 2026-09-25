# UI & WORKSPACE ARCHITECTURE SPECIFICATION — INITIAL PHASE

> **⚠️ Pending v2 update:** This document still describes Initial Phase v1.1. Where it conflicts with `PRD.md` v2.0.0 or `ROADMAP.md` v2.0.0, those documents win. It will be rewritten in ROADMAP v2 Phase 6.3 (schema content in Phase 2). See `AUDIT.md` for known gaps between this spec and the code.
>
> **2026-09-25 — Off-roadmap shell UI bug pass (not a roadmap phase; no phase marked ✅, no CI gate claimed).** The editor shell (`EditorShell.tsx`) had accumulated real bugs independent of the v1.1→v2 content gap above. Fixed:
> - **Resize jank (§5.1):** `DockSplitter`/`DockCornerSplitter` used to call a React state setter on every `mousemove`, forcing a full shell re-render per pixel of drag; combined with `.dock-tabbar__tabs` missing `min-width: 0`, this let the tab-bar controls get pushed outside a narrowed panel instead of the tab strip scrolling. Splitters now write width/height directly to the target zone's DOM node (rAF-batched) while dragging and commit to state once on release; tab strips scroll instead of overflowing.
> - **LayoutAI Assistant panel:** `Window → LayoutAI Assistant` used to start a proximity-based drag-and-drop gesture with no visible feedback until the cursor entered a ~40px hit band — from the menu it looked like the click did nothing. It's now a direct one-click toggle (the existing drag-to-redock gesture on the panel's own grip handle is unchanged). Its tab bar also hardcoded a dark theme (`#0c1012` background, `#34d399` text) inside the otherwise all-light shell; it now uses the same `tokens.css` variables as the rest of the app. The panel's dock-column JSX, previously duplicated four times (once per full-page/normal × left/right combination), is now one shared function.
> - **Center viewport:** the canvas's empty-state used to show a permanent centered "Prompt AI to Create Component" card (`WhiteboardCanvas.tsx`). Removed — the canvas center is empty per §1's "distraction-free" intent; the same prompt is reachable via the small "+ Prompt Component" button (now always visible, not just once content exists) and via the LayoutAI panel.
> - **No mobile/narrow-viewport layout existed at all** (zero `@media` queries in `dock.css`/`whiteboard.css` outside the pre-editor launcher screen; fixed-px panels just got clipped). Added a `<= 860px` breakpoint: the right and LayoutAI docks become fixed-position overlay drawers over the canvas (rather than squeezing it) sized to `min(86vw, 340px)`, the bottom drawer caps at `60vh`, the header and floating tool dock scroll/shrink instead of clipping, and panels now default to collapsed on a narrow viewport on load (and whenever the viewport crosses into that range) so the canvas isn't hidden behind a full-screen panel on first paint.
> - Left as-is: the Outliner's left dock zone was already, intentionally, not rendered in the shell (an explicit code comment: "left dock is removed") — this predates this pass and wasn't reversed, since that's an architecture call for whoever picks up Phase 44, not a bug fix.
> - Verified with `tsc --noEmit` (0 errors), `npm run test:unit` (655/655), `npm run lint` (453/463, down from the Phase 6 baseline of 455 — no new warnings, some pre-existing unused-import warnings resolved incidentally), and a Playwright smoke pass against the running dev server (screenshots of each check, including at a 375×812 viewport).
>
> **2026-09-25 (same session) — Design-direction pass: Blender/Wix Studio elements grafted onto the Unreal-style shell (still off-roadmap; user explicitly chose which elements to adopt).** Two more real bugs found and fixed along the way, plus four adopted UI patterns:
> - **Content Browser hover-inspector overlaying everything:** `.cb-hover-inspector` (the 1s dwell-hover preview card) was `z-index: 9999` — the app's entire real z-scale in `tokens.css` tops out at `--z-toast: 90`. Clamped to `var(--z-tooltip)` (80), the correct existing token for exactly this kind of element.
> - **"Add Animation" preset picker rendering cramped:** `.eas-preset-picker-overlay` was `position: absolute` inside `.eas-content-area`, a ~180–480px scrollable sidebar — so the "modal" only ever filled that narrow box, not the viewport. Two other modals in this codebase (`QuickAddModal`, the viewport's prompt dialog) already do this correctly with `position: fixed; inset: 0` centered on the viewport; the preset picker now matches that existing convention. `QuickAddModal` itself also referenced a dead CSS class (`anim-scale-up`, defined nowhere) for its entrance animation — silently never animated; fixed to the real `anim-scale-in` utility class.
> - **Wix-Studio card-grid picker:** the "Add Animation" picker's two tabs (Grammar Offers, Curated Presets) now render as a responsive card grid (`.eas-preset-grid`) instead of a flat scrolling list — same data, same click handlers, just laid out as cards with room for the existing badges/description/property chips per item.
> - **Blender-style Details-panel section rail:** `DetailsInspector.tsx` and `EnvironmentInspector.tsx` (which share the same `.panel-shell`/`.panel-section` accordion structure) each got a new `SectionRail` component — a 32px vertical icon strip along the left edge of the scrollable body. Clicking an icon expands and scrolls to that section instead of requiring a full manual scroll through the accordion. Unlike Blender's Properties editor (which swaps to a single full-page section), this keeps the existing "everything visible, independently collapsible" accordion behavior and just adds a quick-jump affordance, since the panel here is wide enough that a jump rail is strictly additive.
> - **Wix-Studio panel micro-animations:** the LayoutAI dock column now slides in from whichever edge it's docked to (`anim-slide-left`/`anim-slide-right`, reusing the existing `animations.css` utilities — no new keyframes needed), and the preset-picker/QuickAddModal overlays fade+scale in. The dock-zone collapse/expand toggle (left/right/bottom strips) still snaps instantly — animating that properly would require restructuring `DockZone.tsx` so collapsed and expanded states are the same mounted element instead of two different JSX subtrees, which is out of scope for this pass.
> - **Blender-style persistent workspace tab strip:** a new `WorkspaceTabStrip` component renders the same five presets as `Window → Workspace Presets` (Full Studio / Design / Logic / Data / Debug) as an always-visible row directly under the header, instead of requiring the menu. Found and fixed in passing: the "Data" preset button in the Window menu called `handleSelectWorkspace("data")`, but that function had no `"data"` branch at all — clicking it did nothing. It now expands the bottom Content Browser drawer (the closest already-wired "data" surface); a real Database ER Modeler exists in code (`src/editor/panels/database/DatabaseStudio.tsx` and siblings) but is completely unwired into the shell (never imported anywhere) — that's a real feature gap, not something this pass invented or silently papered over, and wiring it in is its own scoped task for whoever picks up Screen 10 / the Data workspace properly.
> - `--header-height` (used by the mobile overlay positioning added in the prior pass) bumped from `42px` to `72px` to account for the new workspace-tab row.
> - Verified the same way as the prior pass: `tsc --noEmit` (0 errors), `npm run test:unit` (655/655), `npm run lint` (450/463, down again from 453 — the QuickAddModal dead-class fix and a couple of others removed warnings incidentally), and a Playwright pass against the running dev server confirming the card grid renders and centers correctly, the section rail scroll-jumps to the right section, and the Data workspace tab now actually does something.
>
> **2026-09-25 (same session, third pass) — User correction + 10 further fixes, based on real usage with screenshots.** Two of the prior pass's calls were wrong per the user's actual intent; both reverted/redone properly:
> - **"Add Animation" picker, redone:** the global centered modal from the second pass was the wrong shape — the user wants it inline. It now renders as the left half of a split `.cb-cards-pane` (the Content Browser's "Animation Library" area), with the pane's existing content staying visible on the right half. Implemented by lifting the picker's JSX out of `.eas-content-area` (where it was nested inside the narrow, unrelated outliner pane) into a `addPresetPickerContent` variable computed once per render, referenced only from the cards pane. The "Save as Reusable Preset" dialog, which shared the same CSS classes by coincidence, is untouched and still a small centered modal.
> - **LazyLayout AI docking, restored:** the second pass replaced the drag-to-dock gesture with a plain toggle, on the theory that "no visible feedback" was the bug. Wrong theory — the user wanted the gesture kept (it was fully intact in code, only its entry point had been disconnected) and just made more visible: highlight opacity raised `0.16 → 0.3`, and `WindowMenu`'s click now starts the drag again (`handleStartDragAI`, re-added) instead of toggling directly.
> - **One AI assistant, not two:** removed the MotionAI/LayoutAI mode-switcher tab bar entirely. `MotionAICoPilot.tsx` (fully hardcoded dark theme, ~700 lines, never tokenized) is no longer rendered anywhere — left on disk, not deleted, same as the already-unwired `DatabaseStudio.tsx`. The panel is now always `AiPromptBar` alone, which was already correctly light-themed; renamed throughout (title, placeholder, drag/close tooltips, drop-zone labels) from "LayoutAI (Assistant)" to **LazyLayout AI**.
> - **Viewport origin marker:** `.canvas-center-origin` / `.canvas-origin-reticle` / `.canvas-origin-icon` (in `whiteboard.css`) and the `Crosshair` icon import (in `WhiteboardCanvas.tsx`) already existed, fully styled — dead CSS and a dead import, never wired into JSX. Wired up: a small ringed crosshair now sits at the world origin, pinned to the same pan/zoom transform as the axis crosshair lines. Both are now shown whenever `World Axes & (0,0) Origin` is on, regardless of whether the canvas has any elements (previously gated behind `childCount > 0`, so an empty canvas — the one time you most need a reference point — never showed either).
> - **Details/Environment panel text wrapping:** `.form-label` rows (`forms.css`) had no `min-width: 0`/`white-space: nowrap` on their label text, so narrowing the panel (partly from the second pass's new rail eating 32px) wrapped labels into 2-3 lines that collided with their toggle switches. Fixed with ellipsis truncation on the label, handling both markup shapes in use (plain `<span>` and icon+`<span>` wrapper `<div>`). Same fix applied inline to the one hand-rolled row that doesn't use `.form-label` (the "Inspect Mode" hero card in `EnvironmentInspector.tsx`).
> - **"Live Code Inspector" panel (`CodeInspector.tsx`) was silently unstyled:** discovered while chasing a "coloring is wrong" report — this component is written entirely in Tailwind utility classes, but **Tailwind is not installed anywhere in this project** (confirmed: no package, no config, no `@tailwind` directive). Every `bg-[#...]`/`text-gray-*`/etc. class was inert dead weight; the panel rendered with zero applied styling. Rewritten onto a real stylesheet (`code-inspector.css`, new) using new `--surface-code`/`--text-code`/`--border-code` tokens in `tokens.css`. The same tokens were applied to `AnimationExportPreview.tsx`'s code block (previously hardcoded `#0F172A`/`#F8FAFC`, slightly different from `CodeInspector`'s now-fixed palette), so both code-viewing surfaces finally share one dark theme, same rationale as `--surface-tooltip`.
> - **Output Log drawer:** `.output-log-drawer`'s `bottom: var(--statusbar-height)` (28px) left a visible gap of bare canvas below it, since its positioning parent (`.dock-layout__body`) already excludes the status bar (a flex sibling, not a child). One-line fix: `bottom: 0`.
> - **Removed the "+ Prompt Component" viewport button** (added in the prior pass) per direct instruction — LazyLayout AI is now the one place to prompt for a new component. The button's only caller of `ComponentGenerator.generateComponent`/`insertGeneratedComponent` went with it; re-wiring "generate a component from a prompt" into the AI panel is follow-up work, not done in this pass since the AI panel's actual prompt-to-AST pipeline (`AiPromptBar`'s diff/approval flow) is a different, more deliberate mechanism than one-shot generation, and conflating them without the user's input felt like a bigger call than "remove this button."
> - **New "Animate" workspace preset:** UI.md §5.2 always specified six presets including "Animation Workspace: Viewport centered above the multi-track GSAP Sequencer and Easing Curve Editor" — only five were ever implemented (Full Studio/Design/Logic/Data/Debug; "Animate" was simply missing, not stubbed). Added for real: opens the bottom drawer to the Motion Sequencer (already a real, working panel) with Details open alongside. Added to both `WorkspaceTabStrip` and `WindowMenu`'s preset list.
> - **Motion Sequencer "nothing is draggable" and "on hover, details":** investigated and confirmed real — `TimelineSequencer.tsx` has exactly one drag handler in the whole file (the playhead scrubber); keyframe diamonds show a `cursor: grab` that promises drag interaction the code never implements, and no hover-triggered detail popover exists anywhere near them. Left alone, per explicit instruction to defer the "working" (functional) side of this to later — flagging here rather than guessing at a fix for the ambiguous "on hover we can see the details" half of the report, since no matching bug was found and inventing one seemed worse than asking.
> - Verified the same way as both prior passes: `tsc --noEmit` (0 errors), `npm run test:unit` (655/655), `npm run lint` (449/463, down again), and a Playwright pass against the running dev server — screenshots confirmed the split-pane picker (card grid on the left, original content intact on the right), the drag-to-dock gesture (ghost preview + 30%-opacity highlight + correct tuck-beside-Details docking), the single re-branded LazyLayout AI panel in the light theme, the origin marker on an empty canvas, all 6 workspace tabs (Animate opening the Sequencer with real keyframes), the Output Log flush against the bottom edge, `CodeInspector`'s now-real dark theme, and label ellipsis at the panel's minimum width (240px) instead of wrapped/overlapping text.
>
> **2026-09-25 (same session, fourth pass) — Whole-UI audit at 1440 / 1280 / 1024 / 768 / 390px.** Screenshotted every surface (menus, bottom tabs, popovers, settings, showcase demo) at each width and fixed what read as "off":
> - **Header** wrapped and pushed its right-side controls off-screen below ~1200px. Now sheds chrome by priority (engine badge ≤1360; branch badge, project-ID chip and the demo button's label ≤1200; device-switcher labels ≤1024; brand wordmark, project tag and Help icon ≤640) so File/Edit/View/Window/Help always fit on one line. The project-ID chip moved off hardcoded indigo onto the accent tokens. Also removed the second pass's `overflow-x: auto` on the header at ≤860px — it silently clipped every menu dropdown on small screens.
> - **Status bar** wrapped every label onto two lines at ≤1024px. Now single-line, shedding informational items first (AST badge, drawer subtitle ≤1280; FPS/memory and Target ≤1100; button labels become icon-only ≤860). The Execution Trace button's off-brand sky-blue inline styles were replaced with the same class the Output Log button uses.
> - **Menus**: dropdowns were 220px so long items wrapped to 3–4 lines; now 260px min, no wrapping, capped to the viewport height. Window-menu icons lost their per-item rainbow colors; "(UI.md §5.2)" and a few other spec references (`Panel 20`, `Grammar §6.1`) were removed from user-visible labels and tooltips.
> - **Canvas preview was off-center**: the device frame's top-left sat on world (0,0), which is exactly what "recenter" puts in the middle of the viewport — so a mounted page hung off into the bottom-right quarter. The frame is now centered on the origin, and the canvas auto-fits it when content appears or the device target changes (returning to 100% when it goes away). "Fit to screen" in the zoom pill now actually fits instead of just recentering.
> - **Origin marker / axes** now keep a constant on-screen size (counter-scaled by `--canvas-zoom`), like Blender's 3D cursor, instead of shrinking to nothing when zoomed out.
> - **Tool dock and zoom pill collided** whenever the stage got narrow. Fixed with a container query on the stage itself (its width depends on the side panel, not just the window): below 900px of stage width the zoom pill stacks above the dock.
> - **World Quick Controls popover** still had black segmented controls — they referenced `--surface-canvas`, a token that doesn't exist, so the hardcoded `#09090B` fallback won. Rewritten onto real tokens, and the popover now closes on outside click or Escape.
> - **Motion Sequencer**: lane rows stopped at a fixed 680px, leaving the rest of the panel blank; they now fill the timeline. Track names were crushed to 1–2 characters by two fixed badges; the render-tier badge (already in the row tooltip) was dropped so names get the space.
> - **Showcase demo** heading was white text on a white page. Now slate (`#0F172A`).
> - Updated the `run-editor` smoke skill for the consolidated LazyLayout AI panel (step 05 now checks the panel docks).
> - Verified: `tsc --noEmit` (0 errors), `npm run lint` (0 errors, 449/463 warnings), `npm run test:unit` (655/655), the `run-editor` smoke suite (all 8 steps pass), and a Playwright pass at all five widths with no horizontal page overflow and no console errors.
>
> **2026-09-25 (same session, fifth pass) — Top bar, workspace strip, status bar and LazyLayout AI docking.**
> - **AI left drop slot** was drawn at `leftWidth + 4` — the width of a left Outliner dock that isn't rendered — so it floated mid-canvas. Both slots are now measured from the live layout (`.dock-layout__body` and the Details dock's left edge). The pulsing keyframe animation had also been overriding the inline 30% fill; the tint now lives in the CSS.
> - **Left-docked AI panel couldn't be resized**: its splitter was always rendered *before* the panel with `invert`, i.e. at the window edge and dragging backwards. The splitter now sits on the canvas-facing edge for either side.
> - **AI panel ignored dock focus**: it had a fixed `zIndex: 25`, so it never took part in the click / 2s-hover-dwell layering the Details dock and bottom drawer use. It is now its own `"ai"` dock layer: focused on dock, on click, or after a 2s hover it goes full-height over the bottom drawer; clicking the drawer sends it back under. The drop-slot preview is full height to match.
> - **AI panel header** wrapped its title onto 2–3 lines (no `min-width: 0`/`nowrap` in the flex title group) and was crowded by Replace / Split Beside / Healthy controls. Those were removed; the header is a container query that drops the subtitle ≤300px and collapses to the logo mark ≤230px.
> - **Header** is now a three-column grid, so the device switcher is truly centred (Wix Studio style) at ≥1361px and sits after the menus below that. Project name + ID merged into one pill; the branch and "TypeScript 120 FPS" badges moved to the status bar (the latter duplicated, and contradicted, the status bar's FPS read-out). The brand wordmark stays until ≤860px.
> - **Workspace strip**: Blender-style raised active tab; a **Motion** tool shelf (Presets, Timeline, Easing, Export → the matching bottom-drawer tab, highlighted when open); and a command-palette search field (Ctrl K) on the right.
> - **Status bar**: one flat ghost-button style throughout. Left = panels toggle, save state ("All changes saved" / "Unsaved changes"), selection, Output Log, Execution Trace. Right = branch, FPS, memory, AST version. The duplicate zoom controls (whose "Fit to Stage" only reset zoom) were removed; the canvas zoom pill owns zoom.
> - e2e `focusApp` now clicks the brand mark instead of header coordinate (700, 10), which is the centred device switcher at 1280px.
> - Verified: tsc 0 errors, lint 0 errors (446 warnings), 655/655 unit, smoke 8/8, chromium e2e 14/14 against a production build, doc-links and bundle-scope clean, and a Playwright pass at 1920–390px with no header clipping or horizontal overflow.

## Project Name: LazyLayout
**Internal Codename:** "Unreal Engine for Animation & Frontend Design"
**AI Assistant Codename:** MotionAI
**Document Version:** 1.1.0
**Phase:** Initial Phase (Element Animation Studio)
**Status:** Approved for Design & Interface Engineering
**File Location:** `DOCS/Initial/UI.md`

---

## 1. Executive Design Philosophy: "Confluence Canvas + Refined Unreal Shell"

The user interface of LazyLayout synthesizes two paradigms:
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
| **Core Framework** | **Next.js 16 / React 19** | High-performance component architecture, SSR/SSG, fast client reconciliation. |
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
    - **Target Framework Dropdown:** Next.js 16 (App Router - TypeScript), Next.js 16 (Pages Router - TypeScript), React 19 (Vite - TypeScript), Vue 3 (Composition API), Svelte 5 (Runes), Vanilla HTML5 / ES6 JavaScript.
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
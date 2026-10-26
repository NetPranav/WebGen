# FigCraft Port Plan: Figma depth in our own engine

**Status:** Active, started 2026-10-26. Lane A (`DOCS/TEAM/COLLABORATION.md`), branch `a/figcraft-port`.
**Relationship to the roadmap:** a separate plan. It does not change `ROADMAP.md` (v4.0, 202 phases) or its phase numbers, order or gates. Stage 1 (Phases 13–52) built the Figma-style editor; this plan *deepens* it with the features FigCraft already has, ported into our engine. Where a feature belongs to a later roadmap phase it is listed under §6 and left to that phase.
**Source:** [`storytold/figcraft`](https://github.com/storytold/figcraft), pinned at commit `6ea44e936ff3da686ca69b9c14bdb6ff3804d2fc` (2026-10-26). Rust, ~95,000 lines of engine logic (`engine` 54k, `format` 17k, `doc` 10.5k, `text` 4.5k, `svg` 3.3k, `color` 1.6k, `layout` 1.6k, `pathops` 1.5k, `geom` 0.9k) plus ~62,000 lines of tests.
**Licence:** MIT OR Apache-2.0 at our option. We take it under **MIT**. Recorded in `LICENSES.md` ("What is not a gate"); the full MIT text and copyright line are in `THIRD_PARTY_NOTICES.md` at the repo root. The ArtCraft/FigCraft names and logos are trademarks and are **not** used anywhere in our product.

---

## 1. What "port" means here

FigCraft is a desktop app: a Rust document model, a command engine, a CPU pixel renderer (tiny-skia) and an egui interface. LazyLayout is a web editor whose canvas is a real web page (decision 0009) and whose exports must match it (Law 3, Law 11). So the port takes FigCraft's **data and behaviour**, not its way of showing it:

| FigCraft part | What we do with it |
|---|---|
| Data (what a fill, stroke, effect, vector network, variable, component property *is*) | **Port** into MDM properties (`src/core/document/properties.ts`) with validation, the same JSON-in-a-property style Phase 35 uses for `paint.fills` |
| Geometry and maths (corner smoothing, arcs, stroke outlines, vector faces, shape-builder regions, colour spaces) | **Port** to pure TypeScript functions, with their tests |
| Behaviour (the rules a command follows: auto layout rules, override rules, mode resolution) | **Port** the rules and their test cases into our commands and layout mapping |
| Pixels (tiny-skia renderer, effects drawn on the CPU) | **Not ported.** We output DOM, SVG and CSS through the Phase 17 render definitions; the browser draws. Effects CSS/SVG can't express are marked *approx* or *deferred* (to the GPU compositor, roadmap Phase 129, Law 13) |
| Interface (egui panels, dialogs, menus) | **Not ported.** Our React panels show the ported data our own way |
| Document model, persistent maps, command registry | **Not ported.** Behaviour is mapped onto MDM and our command bus (Phase 13) |

### 1.1 Rules every port follows

1. **Compute data, let the browser render.** A ported feature produces properties, CSS or an SVG `d` path that flows through the render definitions. The exporter then matches automatically, and the Phase 49 harness checks it.
2. **One document (Law 2).** No second model. New stored values are canonical property paths in `properties.ts`, registered with the rule table (`check:no-adhoc-compat`), so Lane B's kernel can classify how they interpolate.
3. **Tests come with the code.** Each ported module brings its `*_tests.rs` cases, translated to `node:test`. FigCraft is weeks old; its tests are the evidence, not its age.
4. **Attribution.** Every ported file starts with: the FigCraft source file(s), the pinned commit, and `MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors`.
5. **Dependencies.** FigCraft leans on Rust crates (`kurbo` for curves, `linesweeper` for booleans, `harfrust`/`skrifa` for text, `usvg` for SVG). Porting a wrapper doesn't port the algorithm, so each batch says which route it takes: an existing TS equivalent (e.g. keep `polygon-clipping`), a port of the needed subset of the permissive crate (with its own attribution), or WebAssembly (needs a new decision record: record 0001 said no to Wasm for the kernel).
6. **Schema.** Adding optional properties needs no migration. A batch that changes the meaning of stored data claims the next schema number in `DOCS/TEAM/CLAIMS.md` first, and says so in the PR (shared hot spot).
7. **No regressions in Stage 1.** Every batch runs the full gate set (§7) and compares it with the baseline taken before the first port.

---

## 2. Feature inventory and batches

Status: 📋 not started · 🚧 in progress · ✅ ported, tests green · ⏭ left to a roadmap phase (§6) · ✖ not ported (§5).
Port kind: **logic** (pure TS port with tests) · **render** (logic plus a render-definition change) · **behaviour** (rules ported into existing commands) · **approx** (CSS/SVG approximation of a CPU effect) · **data** (stored and edited, no drawing yet).

### F1 · Shape geometry

| Feature | FigCraft source | Our target | We have (phase) | Kind | Status |
|---|---|---|---|---|---|
| Rounded rectangle path with per-corner radii, clamped like Figma | `geom/src/lib.rs` | `src/core/geometry/shapes.ts` | Per-corner radius as CSS `border-radius` (34) | logic | ✅ |
| Corner smoothing (squircle, 0–100%) | `geom/src/lib.rs` | `shapes.ts`, rectangle render definition | — | render | ✅ |
| Polygon and star paths with corner radius | `geom/src/lib.rs` | `shapes.ts` | Polygon/star without corner radius (25, `shape.vertexRadius` stored) | render | ✅ |
| Arcs and rings: start angle, sweep, inner ratio | `geom/src/lib.rs`, `engine/src/arc_handles.rs` | `shapes.ts`, ellipse render definition, handles | — | render | ✅ (on-canvas arc handles: F12) |
| Affine transforms and measuring helpers | `geom/src/transform.rs`, `measure.rs` | `src/core/geometry/affine.ts` | `transform.ts` (27) | logic | ✅ |

### F2 · Colour and paint

| Feature | FigCraft source | Our target | We have (phase) | Kind | Status |
|---|---|---|---|---|---|
| HSB/HSL/RGB conversions, hex and CSS colour parsing, named colours | `color/src/hsx.rs`, `named.rs`, `lib.rs` | `src/core/paint/color.ts` | `colorMath.ts` hex/rgb (35) | logic | ✅ |
| Display P3 colours and profiles | `color/src/profile.rs`, `icc.rs` | `color.ts`, CSS `color(display-p3 …)` | — | render | ✅ conversion, gamut check and `color(display-p3 …)`; a per-document profile is 📋 |
| Blend modes (all 16 plus pass-through) per layer and per fill | `color/src/blend.rs` | `paints.ts` (`blendMode` on a paint), CSS `background-blend-mode` | Layer `appearance.blendMode` (34) | render | ✅ (boxes use `background-blend-mode`: blends fills with each other, not with what is behind — approx) |
| Angular and diamond gradients | `color/src/lib.rs` | `paints.ts` | Linear, radial, conic (35) | render (diamond: exact, four quadrant gradients) | ✅ |
| Image fill adjustments: exposure, contrast, saturation, temperature, tint, highlights, shadows | `doc/src/props.rs` | `paints.ts` image paint, SVG filter | Brightness, contrast, saturation (37) | render/approx | ✅ |
| Pattern fills | `doc/src/props.rs`, `color/src/pattern_tests.rs` | `paints.ts` | Image tile (37) | render | 🚧 cell maths ported; drawing a layer as a tile needs a renderer change |

### F3 · Strokes

| Feature | FigCraft source | Our target | We have (phase) | Kind | Status |
|---|---|---|---|---|---|
| Multiple strokes per layer (paints like fills) | `doc/src/props.rs` | `paint.strokes` property, render definitions | One border / `svg.stroke` (35) | render | ✅ shapes (`paint.strokes`, any paint type through a mask); frames keep one border colour |
| Stroke alignment inside / centre / outside | `pathops/src/lib.rs` | `src/core/render/strokePaint.tsx`, `Container.tsx` | — | render | ✅ shapes (clip/mask), frames (border / outline) |
| Per-side weights | `pathops/src/sides_tests.rs` | strokes render | — | render | ✅ rectangles (ring outline), frames (border widths; inside only) |
| Dashes, caps, joins, miter limit | `doc/src/props.rs` | strokes | `svg.strokeDasharray`, caps, joins (25, 39) | render | ✅ (`stroke.miterLimit` added) |
| Arrowheads (line, triangle, circle, diamond …) | `pathops/src/points.rs` | `src/core/paths/arrowheads.ts` | Arrow archetype (25) | logic | ✅ lines and pen paths |
| Variable-width strokes and width profiles | `pathops/src/width.rs` | `src/core/paths/strokeWidth.ts` | — | logic | ✅ model, outliner, presets; on-canvas width tool is F12 |
| Outline stroke (stroke → filled path) | `pathops/src/lib.rs` | `src/core/paths/outlineStroke.ts` + command | — | logic | 🚧 `strokeOutline` ported and tested; the command that replaces a layer's stroke with it lands with F4's vector layers |
| Brushes (stretch, scatter) | `pathops/src/brush.rs` | `src/core/paths/brush.ts` | — | logic | 📋 |

### F4 · Vector networks

| Feature | FigCraft source | Our target | We have (phase) | Kind | Status |
|---|---|---|---|---|---|
| Vector network model: vertices, segments with handles, regions with fill rules | `doc/src/vector.rs` | `src/core/paths/vectorNetwork.ts` | Subpaths of nodes, `svg.nodes` (39, 40) | logic | ✅ `paths/vectorNetwork.ts`; stored on path layers as `svg.network`, drawn by the stage |
| Faces of a network (closed areas found from segments) | `doc/src/vector_faces.rs` | `vectorNetwork.ts` | — | logic | ✅ |
| Regions and paint bucket (fill any closed area) | `doc/src/vector_regions.rs` | `vectorNetwork.ts`, vector edit tool | — | logic | ✅ Paint Bucket tool (B), command `vector.paintBucket` |
| Vector edit tools: bend, lasso, cut, join, split, heal on delete, per-point corner radius | `engine/src/vectoredit.rs`, `vectoredit/` | `src/core/paths/pathEdit.ts`, `useVectorEdit.ts` | Point editing (40) | behaviour | 🚧 per-point radius, mirroring, cap and join are stored and drawn (`vector.setPoint`); the Phase 40 editor still edits plain path data (an edit drops the network); network-aware editing tools are next |

### F5 · Booleans and the Shape Builder

| Feature | FigCraft source | Our target | We have (phase) | Kind | Status |
|---|---|---|---|---|---|
| Live boolean groups (operands stay editable; the result follows) | `engine/src/booleans.rs` | `src/core/editing/booleanGroups.ts`, a render definition for the group | Destructive booleans (40) | render | ✅ containers with `boolean.operation`; operands hidden but measured and pickable |
| Per-operand operation | `engine/src/booleans.rs` | `booleanGroups.ts` | — | behaviour | ✅ `boolean.operandOp`, `boolean.setOperation` |
| Shape Builder (click or drag across regions to merge, Alt to remove) | `engine/src/shapebuilder.rs` | `src/core/editing/shapeBuilder.ts` + tool | — | logic + tool | ✅ Shape Builder tool (Shift+M), commands `shapeBuilder.regions/merge/remove` |
| Flatten | `engine/src/booleans.rs` | existing vector ops | Partly (40) | behaviour | ✅ `boolean.flattenGroup` (and Phase 40's `vector.flatten` for shapes) |

Dependency route: keep `polygon-clipping` with curves flattened (what Phase 40 does); revisit `linesweeper` only if precision tests fail.

### F6 · Auto layout and constraints behaviour

FigCraft's layout solver is not ported: the browser lays out our frames as CSS flex and grid, and `stack.ts`/`grid.ts` are the oracle. What is ported is its **64-case behaviour suite** (`layout/src/behaviour_tests.rs`, `content_align_tests.rs`, `nested_tests.rs`, `engine/src/al_*_tests.rs`), mapped onto our properties and CSS.

| Feature | FigCraft source | Our target | We have (phase) | Kind | Status |
|---|---|---|---|---|---|
| Auto gap evenly / around | `layout/src/lib.rs` | `stack.ts`, CSS `space-evenly`/`space-around` | Between (41) | behaviour | ✅ |
| Auto gap never negative; padding floor | `layout/src/lib.rs` | `stack.ts` | — | behaviour | ✅ (CSS gives both; checked in the stack oracle) |
| Strokes included in layout (inside strokes only) | `layout/src/lib.rs` | `stack.ts`, render | — | behaviour | ✅ `layout.strokesIncluded` (off: an outline inset by its width) |
| Vertical wrap, wrapped-line alignment (`align-content`) | `layout/src/lib.rs` | `stack.ts`, CSS | Horizontal wrap (41) | behaviour | ✅ `layout.alignContent`; lines packed by the cross alignment (FigCraft's all-fill rows stretch = our Stretch alignment) |
| Text baseline alignment | `layout/src/lib.rs` | CSS `align-items: baseline` | — | behaviour | ✅ (CSS `baseline`; the oracle treats it as start) |
| Fill on a child turns a hugging parent Fixed | `engine/src/al_behaviour_tests.rs` | layout commands | — | behaviour | ✅ |
| Grid `fr` tracks never smaller than content; cell alignment | `layout/src/lib.rs` | `grid.ts` | `fr` tracks (42) | behaviour | ✅ cell alignment (`layout.justifySelf` + `alignSelf`); `fr` minimum kept as Phase 42 chose (`minmax(0, 1fr)`), a deliberate difference |
| Canvas stacking (first on top) | `layout/src/lib.rs` | render (`z-index`) | — | behaviour | ✅ `layout.reverseZ` |
| Layout grids (columns, rows, grid overlays) | `doc/src/props.rs`, `layout/src/lib.rs` | `src/core/layout/layoutGrids.ts`, overlay | — | data + overlay | ✅ `frame.layoutGrids`, canvas overlay, Layout grids panel, `layout.setLayoutGrids`; snap lines computed (`gridSnapLines`), not yet wired into snapping |
| Arrow keys move children through the flow | `engine/src/al_keys.rs` | editing commands | Drag reorder (41) | behaviour | ✅ along the stack's direction |

### F7 · Effects

| Feature | FigCraft source | Our target | We have (phase) | Kind | Status |
|---|---|---|---|---|---|
| Drop and inner shadows with spread | `doc/src/props.rs` | `paints.ts` shadows | Yes (35) | — | ✅ (already ours) |
| Layer blur, background blur | `doc/src/props.rs` | `paint.effects` | Background blur (35) | render | ✅ in the effect list, winning over the plain blurs |
| Progressive blur (radius ramps between two points) | `doc/src/blur_tests.rs` | layered `backdrop-filter` + mask | — | approx | ✅ five stepped backdrop layers inside a frame; elsewhere the uniform blur half way up the ramp |
| Noise (mono, duo, multi), grain, density | `doc/src/props.rs` | SVG `feTurbulence` | — | approx | ✅ one filter per layer, seeded by the layer id, clipped to its pixels, blend modes |
| Texture | `doc/src/props.rs` | SVG filter | — | approx | ✅ `feDisplacementMap`, clip to shape |
| Glass (refraction, dispersion, frost, light) | `doc/src/props.rs` | data now; drawing deferred to the GPU compositor (roadmap 129) | — | data | ✅ data and an approximation (frosted backdrop, light-angle highlights, colour fringes); true refraction stays with the GPU compositor (129) |
| Shadow blend mode and "show behind transparent areas" | `doc/src/props.rs` | — | Shadows (35) | render | 📋 CSS box-shadow has neither |

### F8 · Text

| Feature | FigCraft source | Our target | We have (phase) | Kind | Status |
|---|---|---|---|---|---|
| Text styles: OpenType features, case, decoration, paragraph spacing and indent, lists | `doc/src/text.rs` | typography properties, CSS | Styled runs, fonts, variable axes (31, 38) | render | 📋 |
| Truncation / max lines | `doc/src/text.rs` | CSS `line-clamp` | — | render | 📋 |
| Text on a path | `engine/src/textedit.rs`, `doc/src/text.rs` | SVG `<textPath>` | — | render | 📋 |
| Shaping, bidi, glyph outlines | `text/src/*` | the browser does this | — | ✖ | ✖ |

### F9 · Components, variants and instances

| Feature | FigCraft source | Our target | We have (phase) | Kind | Status |
|---|---|---|---|---|---|
| Overrides that survive main edits, per-layer | `engine/src/components.rs` | `src/core/components/instances.ts` | Instances with overrides (46) | behaviour | ✅ (46) |
| Nested instances (a component inside a component) and their overrides | `nested_override_tests.rs` | `instances.ts` | — (components don't nest, by design in 46) | behaviour | 📋 needs a model change |
| Push changes to main, Combine as variants, duplicate a main as an instance, descriptions, top-left default variant | `engine/src/components.rs`, `docs/components-parity.md` | `componentExtras.ts`, `componentCommands.ts`, Component panel | Swap, reset, detach, go to main (46) | behaviour | ✅ |
| Component properties: boolean, text, variant; slots | `engine/src/components.rs` | `variantOps.ts` | Variants, properties, slots (47) | behaviour | ✅ (47) |
| Instance-swap property | `engine/src/components.rs` | `variantOps.ts` | — | behaviour | 📋 needs nesting |
| Instance resizing rules: inner layers keep the main's place, rotation and constraints; their own size and resizing are overrides | `engine/src/instance_resizing_tests.rs` | `componentExtras.ts`, `updateProps` | Size overrides (46) | behaviour | ✅ |

### F10 · Styles and variables

| Feature | FigCraft source | Our target | We have (phase) | Kind | Status |
|---|---|---|---|---|---|
| Variable collections, types (colour, number, string, boolean), modes, aliases, scopes, descriptions, code syntax | `doc/src/styles.rs`, `engine/src/cmd/variables.rs` | `src/core/tokens/` | Tokens, modes, styles (45) | behaviour | ✅ collections with their own modes (add, duplicate, reorder, rename, remove), four types, aliases (32 steps, no cycles), scopes for pickers, descriptions, code syntax per platform, hidden flag |
| A frame choosing a collection's mode for everything inside it; instances taking their main's modes | `engine/src/cmd/variables.rs`, `instance_modes_tests.rs` | `tokens.ts` (`inheritedModes`), `instances.ts` | One view mode (45) | behaviour | ✅ `variableModes` on layers, an override inside an instance |
| Bindings: string to text and fonts, boolean to visibility | `engine/src/cmd/variables.rs` | `tokenOps.ts` | Colour and number (45) | behaviour | ✅ |
| Bindings to fills, strokes, effects, layout grids inside paint lists | `engine/src/style_vars.rs` | `tokenOps.ts` | Plain properties (45) | behaviour | 📋 bindings by list index (`fills/0/color`) on layers are not ported; inside styles they are |
| Paint, text, effect and grid styles; descriptions; variables bound inside styles | `doc/src/styles.rs`, `engine/src/style_vars.rs` | `tokens.ts` (slots), `tokenOps.ts` | Text and effect (45) | behaviour | ✅ fill, stroke and grid slots; `bound` resolved per layer's modes |
| Style folders and order; variables import/export JSON | `engine/src/cmd/styles.rs`, `variables_io_tests.rs` | — | — | behaviour | 📋 |
| Extended collections | `engine/src/library_variables_tests.rs` | `tokens.ts` | — | behaviour | ✖ needs team libraries (not in Stage 1) |
| Generated CSS using a variable's code syntax (`var(--x, 4px)`) | `engine/src/codegen` | export | — | behaviour | ⏭ F13 Dev Mode |

### F11 · Frames, sections, masks, slices, export settings

| Feature | FigCraft source | Our target | We have (phase) | Kind | Status |
|---|---|---|---|---|---|
| Masks (a layer clips the layers above it in a group) | `engine/src/mask_tests.rs`, `masks_behaviour_tests.rs` | ⏭ roadmap Phase 74 (Lane B, masks & mattes) | — | ⏭ | ⏭ |
| Sections (canvas organisers) | `engine/src/section_tests.rs` | `src/core/frames/` | Page sections (48) are different | data + render | 📋 |
| Slices and per-layer export settings | `doc/src/props.rs` | `src/core/export/` | Whole-site export (49) | data | 📋 |
| Frame/group convert in one step | `engine/src/convert_container_tests.rs` | editing commands | — | behaviour | 📋 |

### F12 · Editing behaviours

| Feature | FigCraft source | Our target | We have (phase) | Kind | Status |
|---|---|---|---|---|---|
| On-canvas shape handles (corner radius, star ratio, arc sweep) | `engine/src/shape_handles.rs`, `arc_handles.rs` | overlay handles | Some (27) | behaviour | 📋 |
| Rotation origin | `engine/src/rotation_origin.rs` | transform model | — | behaviour | 📋 |
| Scale tool (K): scale everything about an anchor | `engine/src/scale_tool_tests.rs` | tools | — | behaviour | 📋 |
| Measuring (Alt-hover distances, padding, gaps) | `engine/src/measure.rs`, `distance.rs` | `src/core/geometry/measure.ts` + overlay | Distance HUD while dragging (28) | logic | 📋 |
| Selection colours (edit every colour in a selection) | `engine/src/selection_colors.rs` | `src/core/paint/selectionColors.ts` | — | logic | 📋 |
| Selection spacing and reorder | `engine/src/selection_spacing.rs`, `selection_reorder.rs` | align commands | Align, distribute, tidy (30) | behaviour | 📋 |
| Batch rename, find and replace | `engine/src/rename.rs` | editing commands | — | logic | 📋 |
| Duplicate keeps spacing; Alt-drag duplicate | `engine/src/duplicate_spacing_tests.rs` | editing commands | Duplicate (29) | behaviour | 📋 |

### F13 · Dev Mode and inspect

| Feature | FigCraft source | Our target | We have (phase) | Kind | Status |
|---|---|---|---|---|---|
| Inspect: properties with their styles and variables, colour formats, rem | `engine/src/inspect.rs`, `devinspect.rs` | Code tab | Code tab shows export (49) | behaviour | 📋 |
| Dev measurements kept in the file | `engine/src/dev_measurements.rs` | data + overlay | — | data | 📋 |
| Annotations with categories | `engine/src/annotations.rs` | data + overlay | — | data | 📋 |
| Ready-for-dev status and Compare changes | `engine/src/devcompare.rs` | data | — | data | 📋 |
| Code generation ideas (React with typed props, Tailwind) | `engine/src/codegen.rs`, `component_codegen.rs`, `tailwind.rs` | `src/core/export/site/` | Export v1 (49) | behaviour (compare only) | 📋 |

### F14 · Import

| Feature | FigCraft source | Our target | We have (phase) | Kind | Status |
|---|---|---|---|---|---|
| SVG import into editable vectors | `svg/src/*` | `src/core/paths/pathData.ts` | Paths and basic shapes (40) | behaviour | 📋 |
| Figma REST file JSON import | `format/src/rest/` | ⏭ roadmap Phase 178 (Figma import) | — | ⏭ | ⏭ |
| `.fig` import | `format/src/fig*` | ⏭ roadmap Phase 178 | — | ⏭ | ⏭ |

---

## 3. Order

Batches run in this order because each needs the one before: **F1 → F2 → F3 → F4 → F5 → F6 → F9 → F10 → F7 → F8 → F12 → F11 → F13 → F14**. Inside a batch, the pure logic lands first (with its tests), then the render change, then the editor surface.

## 4. Where the editor shows it

The data is shown our way, in our existing panels: the Design inspector's Simple and Pro faces (Phases 33–34) get the new fields; on-canvas handles go through the overlay layer (Phase 23); new tools go through the tool state machine (Phase 24) and the command bus (Phase 13), so every new action also works from the keyboard, the palette and (later) MCP.

## 5. Not ported, and why

| FigCraft part | Why not |
|---|---|
| `ui-egui` (~32k lines) | Our interface is React; the data is shown our way (§4) |
| `render` (tiny-skia CPU renderer) | The browser draws our canvas and exports (decision 0009, Law 11) |
| `text` shaping, bidi, glyph outlines | The browser shapes text; we keep only the text *properties* (F8) |
| `collab`, `collab-net`, `figcraft-server` | Accounts and sharing are roadmap Stage 8 (192–194) |
| `plugin` (wasmi sandbox) | Untrusted code is roadmap Phase 140 |
| `mcp` | Our MCP bridge is roadmap Phase 50; FigCraft's command list is a reference for it |
| `pdf` export, desktop apps, localization | Not in Release 1's scope |
| Boards (whiteboarding: stickies, connectors, voting) | A different product; needs an owner decision before any work |

## 6. Left to roadmap phases (no duplication)

| FigCraft feature | Roadmap phase | Lane |
|---|---|---|
| Prototype interactions, transitions, Smart Animate | 78 States, 79 Transitions & smart animate, 80 Animated variants, 89 Page transitions | B |
| Prototype variables, conditionals and expressions (`doc/src/proto_expr*.rs`) | 77 Expressions, 113 State machines | B / later |
| Masks and mattes | 74 Blend modes, adjustment layers, masks & mattes | B |
| Comments, versions, branches | Stage 8 (192+) | later |
| Figma file import (`.fig`, REST JSON) | 178 Figma import | later |
| Plugins | 140 Sandbox boundaries, 141 Code components | later |
| MCP | 50 Agent bridge, 176 MCP v1 | A / later |

When those phases start, their FigCraft sources are listed here so they can be ported the same way.

## 7. Verification: nothing in Stage 1 breaks

**Baseline** (before the first port, on `a/figcraft-port` at the merge of `origin/main`): typecheck, unit tests in both editions, lint, `check:doc-links`, `check:roadmap-order`, `check:no-adhoc-compat`, `check:bundle-scope`, a production build, and the full Playwright suite in Chromium, Firefox and WebKit. The pass/fail list is recorded in the progress log below.

**Every batch** re-runs the same set. A batch is ✅ only when its own tests pass and nothing that passed in the baseline fails. New archetypes or render changes are added to the render gallery (Phase 17) and checked by the export harness (Phase 49).

---

## 8. Progress log

**2026-10-26: plan written.** Source pinned at `6ea44e9`.

**2026-10-26: baseline** (branch `a/figcraft-port` = `a/phase-49-export` + `origin/main`, before any ported code). `tsc` 0 errors; ESLint 0 errors, 28 warnings; unit tests 2,206 (2,203 pass, 0 fail, 3 skipped). Playwright, all three browsers, 4 workers on a shared laptop (load average ~40): **669 passed, 9 flaky (passed on retry), 5 failed, 4 skipped**. All 14 non-passes are frame-rate or timing tests known to fail under machine load (`breakpoint-canvas` and `layers` frame rate in Firefox; `breakpoint-canvas` frame rate, `hit-testing` locked/hidden, `vector` 500-node SVG frame rate in WebKit; flaky: overlay hover timing, incremental re-render, viewport fps, font timing, Alt distances, transform transaction). These are the comparison set: a later failure outside it is a regression until shown otherwise.

**2026-10-26: F1 and F2 ported.** Geometry (`bezpath.ts`, `shapes.ts`, `affine.ts`) with every FigCraft `geom` test (18 cases, all green); colour (`color.ts`) with FigCraft's colour, gradient, pattern, profile and named-colour tests (24 cases; one compares with a 1e-9 tolerance because FigCraft uses 32-bit floats). Render definitions draw per-corner radii, smoothing, rounded vertices, arcs, pies and rings; paints gain blend modes, the diamond gradient (checked point by point against FigCraft's |x|+|y| formula) and the seven image adjustments.

**2026-10-26: browser check after F3** (same machine, 4 workers): 657 passed, 14 flaky, 12 failed. Two were real regressions caught here, both F2's: the new image adjustment fields reused the accessible names "Fill 1 saturation" and "Fill 1 contrast" of the Phase 37 controls, so the Phase 37 image tests couldn't find their fields (all three browsers); fixed by naming them "… adjustment". The rest are the baseline's frame-rate and timing tests, plus Phase 63's keyboard journey in Chromium (re-run on its own below).

**2026-10-27: F7 effects.** `paint/effects.ts`: FigCraft's effect model (blurs uniform or progressive, noise mono/duo/multi, texture, glass) with its defaults, limits, names (camel and snake case, old files), reach and backdrop radius; the drawing as one seeded SVG filter per layer (noise, texture), stepped backdrop layers (progressive blur) and CSS (glass). `render/effectsRender.tsx` defines a frame's filters once as its last child, on the stage and in the export alike (found by the Phase 49 export-vs-stage comparison, which failed while the stage kept them beside the frame). Property `paint.effects`, command `paint.setEffects`, an effect list with per-kind settings in the Pro inspector, five render-gallery cases (`fx-*`, outside the screenshot goldens since grain differs by browser). Ported tests: FigCraft's blur and effect cases (13 with the drawing ones); Phase 35 paint, Phase 49 export and the stage suites pass.

**2026-10-27: F10 variables and styles.** Additive schema only (no version bump): `collections`, variables gain `string`/`boolean`, `{ alias }` values, `collection`, `description`, `scopes`, `codeSyntax`, `hidden`; styles gain `paint`/`grid`, `description`, `bound`; layers gain `styleRefs.fill/stroke/grid` and `variableModes`. `tokens.ts` resolves aliases across collections, the modes frames chose (nearest wins, instances take their main's, an inner choice is an override), and styles per slot with their bound variables; `tokenOps.ts` adds collections, mode duplicate/reorder/rename, aliases with cycle refusal, scope refusal, code syntax, paint/grid styles, and deleting a variable turning its aliases into values. Kept for Phase 45: a variable with no value is still refused unless starting values are asked for (the command and the Tokens tab ask). Commands `token.createCollection`/`renameCollection`/`deleteCollection`/`moveVariable`/`setLayerMode`/`setAlias`/`renameMode`/`moveMode`; the Tokens tab and the bindings panel show it all. Ported tests: FigCraft's variables behaviour cases (types, modes, aliases, scopes, inheritance, deleting, code syntax, collections), instance modes, paint/grid styles (15); the Phase 45 unit and browser suites still pass. Found and fixed on the way: eight canvas-lab browser specs clicked before React hydrated (a lost click left the lab empty until timeout under load) — they now wait for hydration.

**2026-10-26: F9 components (part).** `componentExtras.ts`: push changes (a selected instance or one of its layers; the instance's own place stays its own), Combine as variants (FigCraft's "Property 1" = "Default", "Variant2"…, or the `Property=Value` the names already say; layer order; instances re-pointed), duplicating a main inserts an instance (of that variant), component descriptions, the top-left variant as the default, and `updateProps` refusing position, rotation, constraint and grid-cell writes on layers inside an instance (so drags and the inspector can't move them), arrow keys not reordering them. Commands `component.pushChanges`, `component.combineAsVariants`, `component.setDescription`; Component panel buttons and a description box. Ported tests: the resizing and push cases; the Phase 46/47 unit and browser suites still pass. Left: nested instances and the instance-swap property, which need components to nest (Phase 46 refuses that by design) — a model change to `instances.ts` big enough to be its own step.

**2026-10-26: F6 auto layout behaviour.** `stack.ts` gains space-around/space-evenly (`mainOffsets`), baseline, wrapped-line alignment and a cross gap; `layoutGrids.ts` (FigCraft `grid_lines`) with an overlay, panel and command; strokes in or out of the layout, first child on top, grid cell alignment, Fill fixing a hugging parent, arrow keys reordering a stack. Ported tests: FigCraft's gap rules, wrapped-line cases (13) and layout-grid tests, all green; the Phase 41/42 browser specs (auto layout, grids, editing, inspectors, layers, breakpoints, export) pass in all three browsers. Not ported: FigCraft's own solver (the browser lays out), auto gaps ignoring the gap value (we keep CSS: gap plus shared space, which gives FigCraft's numbers in its cases), the `fr`-track minimum.

**2026-10-26: F4 vector networks and F5 booleans.** `paths/vectorNetwork.ts` (model, rounded points, fill and stroke paths, stroke runs, regions as areas, faces by a half-edge walk, the paint bucket, JSON storage) with every FigCraft `vector_regions_tests.rs` and `vector_faces.rs` case and the network cases of `doc/src/tests.rs` (23, all green on the first run). Path layers carry `svg.network`; the stage draws a network's fill by regions and stroke by runs; a Phase 40 path edit drops it. Paint Bucket tool (B) and commands `vector.makeNetwork`, `vector.paintBucket`, `vector.setPoint`. F5: `editing/layerOutline.ts` (a layer's fill outline and stroke band as paths), live boolean groups (`editing/booleanGroups.ts`: containers with `boolean.operation`, per-operand `boolean.operandOp`, flatten), and the Shape Builder (`editing/shapeBuilder.ts`, tool Shift+M), with the logic cases of FigCraft's `booleans_tests.rs` and `shapebuilder_tests.rs`. One difference from FigCraft: a shape that loses area to the Shape Builder becomes a new path layer (a new id) because a layer can't change kind in place; the result names the layer that now holds it. A boolean group's box doesn't refit to its operands as FigCraft's does (the result draws past it).

**2026-10-26: F3 strokes.** `geometry/measure.ts` (paths by length), `paths/pathOps.ts` (booleans between paths with fill rules, simplify, arrangement faces, union of faces: on `polygon-clipping`, flattened to 0.002 px, non-zero resolved face by face by winding), `paths/strokes.ts` (width profiles with presets, the variable-width outliner, dashes, arrowheads, aligned outlines, per-side rings), with FigCraft's width, side, rounded-side, measure and pathops tests (33 cases; tolerances that compared kurbo curves to 1e-6 are widened to what 0.002 px polygons allow, each noted). On the stage, `render/strokePaint.tsx` draws several stroke paints, alignment, per-side weights, widths and arrowheads through a mask; a layer without those settings draws exactly as before. Frames: inside is a border, centre and outside an outline. New typed commands `paint.setStrokes` and `stroke.set`; the Pro face gets a Stroke settings block. **Found while porting:** `paint.setFills`'s schema didn't know F2's diamond gradient and stripped blend modes and image adjustments, so the F2 controls couldn't save; fixed in the same change. Full unit suite: 2,302 tests, 0 failures (both editions).

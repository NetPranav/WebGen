# Decision 0003: Geometry (`frame`) vs Motion Transform (`transform.*`), and Canonical Property Names

**Status:** Decided. **Date:** 2026-09-25. **Owner:** ROADMAP Sub-Phases 42.1 and 42.4 (`DOCS/Initial/ROADMAP.md`); closes AUD-31 and AUD-32 when Phase 42's gate passes.

## 1. Layout is `frame`, motion is `transform`

Every visual layer gets two separate position-like groups:

| Group | Paths | What it means | Who writes it | Compositing |
|---|---|---|---|---|
| **Geometry (layout)** | `frame.x`, `frame.y`, `frame.width`, `frame.height`, `frame.rotation`, plus `sizing.horizontal/vertical` and `positioning` | Where the layer *is*, in its parent's space | The canvas: moving, resizing or rotating a layer with handles (Figma-style) | `layout` |
| **Motion offset** | `transform.x/y/z`, `transform.scale*`, `transform.rotate*`, `transform.skew*` | How far the layer is *displaced from* its frame at a moment in time | The timeline, presets, behaviours, state transitions | `gpu` |

The rendered position is `frame` composed with `transform`: the renderer places the layer by its frame, then applies the transform on top as a CSS `transform` (or the engine's equivalent). This is the web counterpart of After Effects' Position (with Anchor Point) versus an animated offset, and it is what Figma does: dragging a layer edits its frame, and a prototype animation never rewrites it.

**Why:**

- **Animation stays on the GPU by default.** `transform` and `opacity` are the only properties browsers composite without layout or paint. If the timeline animated `frame.*`, every frame would trigger layout. Keeping motion on `transform.*` makes the fast path the default path.
- **Editing and animating don't fight.** Moving a layer on the canvas changes its frame, and every keyframe (a relative offset) still means the same motion. If keyframes stored absolute positions, moving a layer would silently break its animations.
- **Export stays honest.** `frame` becomes layout CSS (or flex/grid placement when `positioning` is `flow`), and `transform` becomes animation code. The two never collide in one CSS property.

**Animating `frame.*` is allowed but not free.** The registry marks `frame.*` as `compositing: "layout"`. The Phase 8 rules engine decides when that cost is acceptable (for example, a layout transition on a small subtree) and emits a diagnostic otherwise. Nothing in the editor animates `frame.*` by default.

**`positioning: "flow"`** means the layer sits inside an auto-layout parent (Phase 50). Its `frame.x/y` are then *computed* by the layout and are read-only in the inspector. Its `frame.width/height` still apply when `sizing` is `fixed`.

## 2. One name per property; CONVENTIONS §4 is the naming source

The registry (`src/core/document/properties.ts`) is the single table of property names. Static props, state snapshots, tracks, links and the inspector all use its canonical dot-paths.

**Naming follows `CONVENTIONS.md` §4, not the ROADMAP's illustrative examples.** The ROADMAP's Phase 42 text uses `fill.color` and `corner.radius` as examples. CONVENTIONS §4 already defined the animatable catalogue as `appearance.background.color` and `appearance.radius`, and the runtime and engine adapters already speak it. So do 66 of the 81 preset tracks (37 of the 51 presets are fully canonical; the other 15 tracks use the `transform.translateX/Y` dialect). Adopting the ROADMAP's example names would have renamed paths that are already correct in stored data and code for no benefit. The registry therefore:

- keeps every CONVENTIONS §4 path unchanged (a unit test parses §4 and fails if any path is missing from the registry);
- extends the same grouping to paths §4 doesn't cover: `frame.*`, `sizing.*`, `layout.*`, `content.*`, `interaction.*`, `a11y.*`, `button.*`, `toggle.*`, `input.*`, `scene3d.*`;
- resolves every legacy name through an alias table: flat v2 keys (`backgroundColor → appearance.background.color`, `borderRadius → appearance.radius`) and the preset track dialect (`transform.translateY → transform.y`).

**Some legacy keys depend on the archetype.** `color` is text colour on a button, line colour on a divider, fill colour on a background layer and light colour on a 3D light. `size` is the FAB diameter, the toggle's size class, or the icon's pixel size. Aliases can therefore map per archetype, and the v2 → v3 migration (42.2) resolves every key with its layer's archetype.

**Value changes ride along with renames.** An image's legacy `opacity` was stored as 0–100, while `appearance.opacity` is 0–1 everywhere else. That alias carries a ×0.01 scale for images only. Legacy object props (`filter: { blur, … }`, `overlay`, `focalPoint`, 3D `material`) are split into leaf paths (`media.filter.blur`), so every animatable value has its own address.

## 3. Consequences

- **The §4.1 row 4 bug is closed by construction.** Scrubbing a preset that uses `transform.translateY` did nothing because the scrub hot-patch only knew `transform.y`. After migration, only `transform.y` exists.
- **Unknown paths are errors, with a suggestion.** `transfrom.y` fails validation with "Did you mean `transform.y`?" (Levenshtein distance over the registry).
- **The inspector, the rules engine (Phase 8) and the AI (Phase 30) all read the registry's metadata:** value type, unit, default, CSS mapping, compositing class, animatability and owning archetypes. The rules engine does not need a second property table.
- **Phase 7.1's animatable-property registry *is* this registry**, extended with animation metadata. There is no second registry.

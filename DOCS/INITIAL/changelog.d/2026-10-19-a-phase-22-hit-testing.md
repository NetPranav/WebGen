### Phase 22 (Hit-testing)

Clicking and hovering on the canvas now go through a spatial index of the frames' layers instead of the frames themselves.

#### Added
- `src/core/hit`: `HitIndex` (a quadtree of layer rectangles in canvas space; `pick` and `candidates`) and `CanvasHitTester` (builds it from each frame's measured layers and rebuilds it only when something moved). `SpatialIndex` gets a `layer` item type. `StageRenderer.layoutVersion`.
- Hovering shows an outline around the layer a click would select. A plain click selects the frame's direct child; Cmd/Ctrl-click selects the deepest layer; locked layers (and what is inside them) are skipped.
- `/editor/canvas-lab` has groups of layers and Lock / Hide buttons; `tests/e2e/hit-testing.spec.ts`.

#### Changed
- In Design mode the frames receive no pointer events; the canvas captures them all (decision record 0009 §2 amended).

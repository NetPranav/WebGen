### Phase 26 (Selection)

Click, Shift-click, marquee, select all / none / inverse, select children and parent, and deep select, on one selection store.

#### Added
- Shift-click toggles a layer in the selection; dragging on a frame's background or on bare canvas draws a marquee (the frame's direct children it touches, or the frames).
- Commands `selection.all` (Ctrl+A), `selection.none` (Escape), `selection.inverse` (Ctrl+Shift+A), `selection.children` (Enter), `selection.parent` (Shift+Enter) and `selection.set`. Hidden and locked layers are never selected.
- `selectionOps.ts` (pure) with unit tests; `tests/e2e/selection.spec.ts` (a 17-step journey and a sync test).

#### Changed
- The shell's selected element comes from `useSelectionStore` instead of its own state, so the canvas, the inspectors and the status bar can't disagree. The status bar says "N layers selected" for several.
- On the canvas Ctrl+A selects all; the +Add palette's Ctrl+A no longer applies while the canvas has focus.

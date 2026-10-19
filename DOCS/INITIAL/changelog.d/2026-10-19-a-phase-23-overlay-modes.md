### Phase 23 (Overlay layer & Design / Preview modes)

A single overlay layer above the frames draws the hover outline and the selection, and a Design / Preview switch makes the page clickable.

#### Added
- `OverlayController` / `OverlayLayer`: pooled DOM elements in canvas space, `pointer-events: none`, redrawn on the frame scheduler's `overlay` phase. The hover outline is there within a frame of the pointer event (1,055 layers); a selected layer gets an outline labelled with its name and size.
- Design / Preview switch in the frame bar (commands `view.designMode`, `view.previewMode`, `view.toggleMode`). In Preview the frames receive pointer events, so links and buttons work, and nothing is selected or outlined.
- `tests/e2e/overlay-modes.spec.ts`.

#### Changed
- Replaces the Phase 22 hover outline and the old selection box with the overlay layer.

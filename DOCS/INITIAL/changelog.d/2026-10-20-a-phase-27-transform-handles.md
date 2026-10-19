### Phase 27 (Transform handles)

Selected layers have handles: drag to move, resize from edges and corners, rotate, and change a shape's own parameters.

#### Added
- Move (drag the selection, or any layer, which selects it first; Shift locks an axis), resize with eight handles (Shift keeps the ratio, Alt resizes about the centre), rotate by dragging just outside a corner (Shift snaps to 15°), for one layer or several. Every gesture is one undo step and Escape cancels it.
- Parameter handles: a rectangle's corner radius, a star's inner radius and number of points, a polygon's sides.
- `src/core/geometry/transform.ts` (pure, 30 golden manipulations), `transformModel.ts`, and the overlay's frame and handles.
- `tests/e2e/transform.spec.ts`: 30 gestures are exactly 30 undo steps; Escape cancels.

#### Changed
- A moved or resized layer is positioned absolutely (`frame.x`, `frame.y`, `frame.width`, `frame.height`, `frame.rotation`).

### Phase 25 (Creation tools)

Frames, shapes and text boxes can be drawn where you drag, inside the frame under the pointer.

#### Added
- Arrow (Shift+L), Polygon (Y) and Star (Shift+Y) tools, next to Frame, Rectangle, Ellipse, Line and Text. Shift draws a square or snaps a line to 45°; Alt draws from the centre; a click places the default size.
- `dragBox` (`src/core/geometry/shapeDrag.ts`), the pure geometry of a drag, with golden tests.
- `tests/e2e/creation-tools.spec.ts`: geometry, parent, selection and undo for every tool in three browsers.

#### Changed
- A drawn layer is positioned where it was drawn (`absolute`, `frame.x` / `frame.y` relative to its parent) and parented to the container under the press. Over bare canvas only the Frame tool works, and it makes a new top-level frame.
- A frame's hit area is its whole artboard, not just the height its content takes.

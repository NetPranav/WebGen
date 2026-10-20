### Phase 30 (Align, distribute & tidy)

#### Added
- Align left, horizontal centres, right, top, vertical centres and bottom (Alt+A, H, D, W, V, S). One layer aligns to its parent, several to each other. Each is one undo step.
- Distribute horizontal and vertical spacing (Ctrl/Cmd+Alt+H, V) for three or more layers, keeping the outer two in place.
- Tidy up (Ctrl/Cmd+Alt+T): puts two or more layers on a grid using the gaps they already have.
- Spacing handles on the canvas between neighbouring selected layers; drag one to give every gap the same size.
- An align bar at the top of the inspector, entries in the Edit menu, and typed twins for agents (`layer.align`, `layer.distribute`).
- `src/core/geometry/align.ts` with 23 golden tests, `alignOps.test.ts`, and `tests/e2e/align.spec.ts`.

#### Fixed
- On macOS an Alt+letter shortcut never matched, because Option+letter types a different character; keybindings now read the physical key when Alt is held.

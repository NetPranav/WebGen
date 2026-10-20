### Phase 21 (Multi-frame canvas)

The canvas now shows every frame of the document side by side, each its own live stage. The header's Desktop / Tablet / Mobile switch focuses the frame of that size, or creates it.

#### Added
- Frames are the document's top-level layers (no schema change). Each has a title above it (double-click to rename), its size (editable), and buttons to move it left or right, duplicate it and delete it. The frame bar adds a frame from a device preset (Desktop, Laptop, Tablet, Mobile) or a custom size, and picks the backdrop: light, dark or checkerboard.
- `frame.*` commands with typed arguments: `frame.add`, `frame.focusPreset`, `frame.focus`, `frame.duplicate`, `frame.rename`, `frame.resize`, `frame.moveLeft`, `frame.moveRight`, `frame.delete`. Each change is one undo step.
- One `StageHost` and renderer per frame. `getStageRenderer()` answers for the active frame; `getStageRendererForLayer`, `getStageRendererForFrame` and `getFrameRenderers` reach the others (decision record 0009 §7).
- `/editor/canvas-lab` (5 frames × 200 layers) and `tests/e2e/frames.spec.ts`; the pan and zoom frame-rate gate in `viewport-camera.spec.ts`.

#### Changed
- A lone frame with nothing in it isn't drawn (as before); with two or more, all are.
- New shapes and text go into the active frame (the one last clicked or focused).

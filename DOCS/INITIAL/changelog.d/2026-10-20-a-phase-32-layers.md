### Phase 32 (Layers panel)

A Figma-like layer tree beside the stage.

#### Added
- The Layers panel in a new left dock: a tree of every layer, front-most first, in sync with the canvas (select on either side and the other follows, opening the layers above it). Shift selects a range, Cmd/Ctrl adds.
- Drag a row to reorder it, or onto a frame or group to move it in (it stays where it was on the canvas). A drop that isn't allowed is refused and says why: a layer can't go inside itself, a text or shape can't hold layers, a locked layer or frame can't be moved, only frames can sit on the canvas.
- Rename in place (double-click), lock and hide buttons on every row, search with highlighting, and the same right-click menu as the canvas.
- The list is virtualised: a document of 1,500 layers scrolls at 60 fps with about 40 rows drawn.
- Typed commands: `layer.move`, `layer.setVisible`, `layer.setLocked`. `canReparent` and `moveLayers` in `src/core/layers`.

#### Changed
- The stage is narrower with the panel open; the frame bar wraps instead of running off the edge.
- The canvas context menu no longer lists the align commands (they are in the Edit menu).

#### Removed
- The old outliner components (`ElementOutliner`, `OutlinerTree`, `TreeNode`, `QuickAddModal`).

### Phase 42 (Grid layout & constraints)

Grids with spans, and layers that follow their frame when it is resized.

#### Added
- Grid containers: columns and rows, gaps, written track lists (`100px 1fr 2fr`, `repeat(3, 1fr)`), and children that start in a cell and span several. Add grid reads the grid out of loose layers. The layout grid is drawn over a selected grid.
- Constraints for free layers: left, right, left & right, center or scale across, and the same down. Resizing a frame (by its handles, the inspector or a command) moves and stretches its pinned layers, in the same undo step, and passes the change on to frames inside it.
- Dragging a layer inside a grid moves it in the order with an insertion line.
- Commands `layout.addGrid`, `layout.removeGrid`, `layout.setGrid`, `layout.setGridCell`, `layout.setConstraints`; properties `constraints.horizontal`, `constraints.vertical`, `layout.gridColumnStart`, `layout.gridColumnSpan`, `layout.gridRowStart`, `layout.gridRowSpan`; `src/core/layout/{constraints,grid,constrainChildren}.ts`.

#### Changed
- `documentCommands.updateProps` applies constraints when a frame's `frame.width` or `frame.height` changes (nothing happens unless a child has a constraint other than left and top).
- Containers draw `display: grid` tracks.

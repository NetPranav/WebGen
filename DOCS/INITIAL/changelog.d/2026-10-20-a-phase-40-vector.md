### Phase 40 (Vector editing & boolean operations)

Reshape paths point by point, combine shapes, and bring SVGs in as vectors.

#### Added
- Path edit mode (Enter or double-click a path): move nodes, drag bezier handles (Alt breaks the pair), press a segment to add a node, double-click a node to make it smooth or sharp, click one end then the other to close, Delete removes nodes, Escape or Enter leaves. Each change is one undo step.
- Union, subtract, intersect and exclude of paths, rectangles and ellipses into one new path layer; Flatten turns a rectangle or ellipse into a path. Buttons in the inspector and the commands `boolean.*`, `vector.flatten`, `path.edit`.
- "Vectors" button on SVG assets: the picture's shapes become separate editable path layers (the sanitiser runs first).
- `svg.fillRule` property; `src/core/paths/{pathData,pathEdit,booleans}.ts`; the `polygon-clipping` dependency.

#### Fixed
- The pen kept its draft in each tool object, so a second tool object (a double render) could miss it.
